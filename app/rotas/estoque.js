// Estoque: itens (fraldas, remédios, material de enfermagem, alimentos, limpeza) com entradas, saídas e contagem.
// Avisa o que está acabando (saldo no mínimo) e o que está vencendo. No Gerifácil é o "Controle de estoque e produtos".
'use strict';

const CATEGORIAS = { higiene: 'Higiene e fraldas', remedio: 'Remédios', enfermagem: 'Material de enfermagem', alimento: 'Alimentos', limpeza: 'Limpeza', outro: 'Outros' };
const UNIDADES = { un: 'unidade', cx: 'caixa', pct: 'pacote', fr: 'frasco', lata: 'lata', kg: 'kg', L: 'litro', par: 'par', rolo: 'rolo' };
const ORIGENS = ['Compra', 'Doação', 'Família do residente', 'SUS / Farmácia Popular', 'Outra'];
const DIAS_AVISO_VALIDADE = 30;
const dataValida = (v) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v + 'T12:00:00'));
const arred = (n) => Math.round(n * 1000) / 1000; // evita 0.30000000000000004

module.exports = function estoque(ctx) {
  const { rota, db, registrar, transacao, falha, conferirVersao, json, corpoJson, exigirAdmin, hoje, agoraIso } = ctx;

  // Saldo e lotes de um item, na ordem do tempo: cada saída (ou contagem para menos) gasta só o que já existia
  // naquele momento, começando pelo que vence antes (o que não tem validade vai por último).
  function calcular(movs) {
    let saldo = 0;
    const lotes = [];
    const gastar = (q) => {
      lotes.sort((a, b) => (a.validade || '9999').localeCompare(b.validade || '9999') || a.data.localeCompare(b.data));
      for (const l of lotes) { if (q <= 0) break; const usa = Math.min(l.resta, q); l.resta = arred(l.resta - usa); q -= usa; }
    };
    for (const m of movs) { // já vêm ordenados por data e id
      if (m.tipo === 'entrada' || (m.tipo === 'ajuste' && m.quantidade > 0)) {
        saldo += m.quantidade;
        lotes.push({ validade: m.tipo === 'entrada' ? m.validade : null, quantidade: m.quantidade, resta: m.quantidade, data: m.data });
      } else {
        const q = m.tipo === 'saida' ? m.quantidade : -m.quantidade;
        saldo -= q;
        gastar(q);
      }
    }
    const abertos = lotes.filter((l) => l.resta > 0)
      .sort((a, b) => (a.validade || '9999').localeCompare(b.validade || '9999') || a.data.localeCompare(b.data));
    const h = hoje();
    const limite = new Date(h + 'T12:00:00'); limite.setDate(limite.getDate() + DIAS_AVISO_VALIDADE);
    const lim = limite.toLocaleDateString('sv-SE');
    const comValidade = abertos.filter((l) => l.validade);
    return {
      saldo: arred(saldo), lotes: abertos,
      proxima_validade: comValidade.length ? comValidade[0].validade : null,
      vencido: comValidade.filter((l) => l.validade < h).reduce((s, l) => s + l.resta, 0),
      vencendo: comValidade.filter((l) => l.validade >= h && l.validade <= lim).reduce((s, l) => s + l.resta, 0),
    };
  }
  const movimentosDe = (id) => db.prepare('SELECT * FROM movimentos WHERE produto_id = ? ORDER BY data, id').all(id);

  function comSituacao(p) {
    const c = calcular(movimentosDe(p.id));
    // Remédios ligados a prescrições: quanto sai por dia e para quantos dias ainda dá
    const consumo = consumoDiario(p.id);
    const dias = consumo > 0 ? Math.floor(c.saldo / consumo) : null;
    const acabando = (p.estoque_minimo != null && c.saldo <= p.estoque_minimo) || (dias != null && dias < 7);
    return { ...p, ...c, consumo_dia: consumo || null, dias_restantes: dias, acabando, zerado: c.saldo <= 0, alerta: c.vencido > 0 || c.vencendo > 0 || acabando };
  }
  function consumoDiario(produtoId) {
    return db.prepare(`SELECT p.qtd_por_dose, p.horarios FROM prescricoes p JOIN residentes r ON r.id = p.residente_id
      WHERE p.produto_id = ? AND p.ativa = 1 AND p.se_necessario = 0 AND (p.fim IS NULL OR p.fim >= ?) AND r.situacao = 'no_lar'`).all(produtoId, hoje())
      .reduce((s, x) => s + (x.qtd_por_dose || 0) * String(x.horarios || '').split(',').filter(Boolean).length, 0);
  }
  const listar = (onde = 'p.ativo = 1') => db.prepare(`SELECT p.*, r.nome residente_nome, r.apelido residente_apelido FROM produtos p
      LEFT JOIN residentes r ON r.id = p.residente_id WHERE ${onde} ORDER BY p.nome COLLATE NOCASE`).all().map(comSituacao);

  function limparProduto(b, parcial) {
    const reg = {};
    const txt = (v) => (v == null ? null : String(v).trim() || null);
    if (!parcial || b.nome !== undefined) { reg.nome = txt(b.nome); if (!reg.nome) falha(400, 'Informe o nome do item'); if (reg.nome.length > 120) falha(400, 'Nome longo demais'); }
    if (!parcial || b.categoria !== undefined) { if (!CATEGORIAS[b.categoria]) falha(400, 'Escolha a categoria'); reg.categoria = b.categoria; }
    if (!parcial || b.unidade !== undefined) { const u = b.unidade || 'un'; if (!UNIDADES[u]) falha(400, 'Unidade inválida'); reg.unidade = u; }
    if (b.estoque_minimo !== undefined) {
      if (b.estoque_minimo === '' || b.estoque_minimo == null) reg.estoque_minimo = null;
      else { const n = Number(String(b.estoque_minimo).replace(',', '.')); if (!Number.isFinite(n) || n < 0 || n > 100000) falha(400, 'Estoque mínimo inválido'); reg.estoque_minimo = n; }
    }
    for (const k of ['local', 'obs']) if (b[k] !== undefined) { reg[k] = txt(b[k]); if (reg[k] && reg[k].length > 1000) falha(400, 'Texto longo demais'); }
    if (b.residente_id !== undefined) {
      reg.residente_id = b.residente_id === '' || b.residente_id == null ? null : Number(b.residente_id);
      if (reg.residente_id != null && !db.prepare('SELECT 1 FROM residentes WHERE id = ?').get(reg.residente_id)) falha(400, 'Residente não encontrado');
    }
    if (b.ativo !== undefined) reg.ativo = b.ativo ? 1 : 0;
    return reg;
  }

  // Lista com saldo e avisos (?todos=1 inclui os arquivados)
  rota('GET', '/api/produtos', async (req, res, { url }) => {
    const itens = listar(url.searchParams.get('todos') === '1' ? '1 = 1' : 'p.ativo = 1');
    json(res, 200, { itens, categorias: CATEGORIAS, unidades: UNIDADES, origens: ORIGENS, dias_aviso: DIAS_AVISO_VALIDADE });
  });

  // Avisos para o Início e o contador do menu
  rota('GET', '/api/estoque/alertas', async (req, res) => {
    const itens = listar().filter((p) => p.alerta);
    json(res, 200, { total: itens.length, itens: itens.slice(0, 8).map((p) => ({ id: p.id, nome: p.nome, unidade: p.unidade, saldo: p.saldo, acabando: p.acabando, zerado: p.zerado, vencido: p.vencido, vencendo: p.vencendo, proxima_validade: p.proxima_validade })) });
  });

  rota('GET', '/api/produtos/:id', async (req, res, { p }) => {
    const prod = listar('p.id = ' + Number(p.id))[0] || falha(404, 'Item não encontrado');
    const movimentos = db.prepare(`SELECT m.*, r.nome residente_nome, u.nome autor_nome FROM movimentos m LEFT JOIN residentes r ON r.id = m.residente_id
      LEFT JOIN usuarios u ON u.login = m.criado_por WHERE m.produto_id = ? ORDER BY m.data DESC, m.id DESC LIMIT 200`).all(prod.id);
    json(res, 200, { produto: prod, movimentos, categorias: CATEGORIAS, unidades: UNIDADES, origens: ORIGENS });
  });

  rota('POST', '/api/produtos', async (req, res, { u }) => {
    const b = await corpoJson(req);
    const reg = limparProduto(b, false);
    if (db.prepare('SELECT 1 FROM produtos WHERE nome = ? COLLATE NOCASE AND ativo = 1 AND COALESCE(residente_id, 0) = ?').get(reg.nome, reg.residente_id || 0)) falha(400, 'Já existe um item com esse nome');
    const agora = agoraIso();
    Object.assign(reg, { criado_em: agora, criado_por: u.login, atualizado_em: agora, atualizado_por: u.login });
    const ks = Object.keys(reg);
    const id = transacao(() => {
      const novo = Number(db.prepare(`INSERT INTO produtos (${ks.join(', ')}) VALUES (${ks.map(() => '?').join(', ')})`).run(...ks.map((k) => reg[k])).lastInsertRowid);
      // Quantidade que já existe hoje (opcional): entra como a primeira contagem
      const q = Number(String(b.quantidade_inicial ?? '').replace(',', '.'));
      if (b.quantidade_inicial !== undefined && b.quantidade_inicial !== '' && Number.isFinite(q) && q > 0) {
        if (b.validade && !dataValida(b.validade)) falha(400, 'Validade inválida');
        db.prepare("INSERT INTO movimentos (produto_id, data, tipo, quantidade, validade, origem, obs, criado_em, criado_por) VALUES (?, ?, 'entrada', ?, ?, NULL, 'Quantidade inicial (contagem)', ?, ?)")
          .run(novo, hoje(), q, b.validade || null, agora, u.login);
      }
      return novo;
    });
    registrar(u.login, 'cadastrou item no estoque', { item: reg.nome, produto: id });
    json(res, 201, { id });
  });

  rota('PUT', '/api/produtos/:id', async (req, res, { u, p }) => {
    const b = await corpoJson(req);
    const atual = db.prepare('SELECT * FROM produtos WHERE id = ?').get(+p.id) || falha(404, 'Item não encontrado');
    conferirVersao(atual, b, u);
    const reg = limparProduto(b, true);
    const mud = Object.keys(reg).filter((k) => String(atual[k] ?? '') !== String(reg[k] ?? ''));
    if (!mud.length) return json(res, 200, { ok: true });
    reg.atualizado_em = agoraIso(); reg.atualizado_por = u.login;
    const ks = Object.keys(reg);
    db.prepare(`UPDATE produtos SET ${ks.map((k) => k + ' = ?').join(', ')} WHERE id = ?`).run(...ks.map((k) => reg[k]), atual.id);
    registrar(u.login, reg.ativo === 0 ? 'arquivou item do estoque' : reg.ativo === 1 && !atual.ativo ? 'reativou item do estoque' : 'editou item do estoque', { item: reg.nome || atual.nome, produto: atual.id, campos: mud });
    json(res, 200, { ok: true });
  });

  // Apagar de vez (com o histórico): só a administração. O normal é "arquivar".
  rota('DELETE', '/api/produtos/:id', async (req, res, { u, p }) => {
    exigirAdmin(u);
    const prod = db.prepare('SELECT id, nome FROM produtos WHERE id = ?').get(+p.id) || falha(404, 'Item não encontrado');
    db.prepare('DELETE FROM produtos WHERE id = ?').run(prod.id);
    registrar(u.login, 'apagou item do estoque', { item: prod.nome, produto: prod.id });
    json(res, 200, { ok: true });
  });

  // Movimentar: entrada (compra, doação…), saída (uso) ou contagem (diz quanto tem de verdade e o sistema ajusta)
  rota('POST', '/api/produtos/:id/movimentos', async (req, res, { u, p }) => {
    const b = await corpoJson(req);
    const prod = db.prepare('SELECT * FROM produtos WHERE id = ?').get(+p.id) || falha(404, 'Item não encontrado');
    const data = b.data || hoje();
    if (!dataValida(data)) falha(400, 'Data inválida');
    if (data > hoje()) falha(400, 'A data não pode estar no futuro');
    const q = Number(String(b.quantidade ?? '').replace(',', '.'));
    if (!Number.isFinite(q) || q < 0 || q > 1000000 || (b.tipo !== 'contagem' && q === 0)) falha(400, 'Quantidade inválida');
    const obs = String(b.obs || '').trim().slice(0, 1000) || null;
    const residente = b.residente_id ? Number(b.residente_id) : null;
    if (residente && !db.prepare('SELECT 1 FROM residentes WHERE id = ?').get(residente)) falha(400, 'Residente não encontrado');
    const { saldo } = calcular(movimentosDe(prod.id));
    let tipo, quantidade, validade = null, origem = null;
    if (b.tipo === 'entrada') {
      tipo = 'entrada'; quantidade = q;
      if (b.validade) { if (!dataValida(b.validade)) falha(400, 'Validade inválida'); validade = b.validade; }
      origem = ORIGENS.includes(b.origem) ? b.origem : null;
    } else if (b.tipo === 'saida') {
      tipo = 'saida'; quantidade = q;
      if (q > saldo + 1e-9) falha(400, `Só há ${saldo} ${UNIDADES[prod.unidade]}(s) no estoque. Confira a quantidade — ou faça uma contagem se o sistema estiver errado.`);
    } else if (b.tipo === 'contagem') {
      tipo = 'ajuste'; quantidade = arred(q - saldo);
      if (quantidade === 0) return json(res, 200, { ok: true, sem_diferenca: true });
    } else falha(400, 'Tipo de movimentação inválido');
    const id = Number(db.prepare(`INSERT INTO movimentos (produto_id, data, tipo, quantidade, validade, origem, residente_id, obs, criado_em, criado_por, demo)
      VALUES (?,?,?,?,?,?,?,?,?,?,?)`).run(prod.id, data, tipo, quantidade, validade, origem, residente, obs, agoraIso(), u.login, prod.demo).lastInsertRowid);
    const acao = tipo === 'entrada' ? `entrada no estoque: +${quantidade}` : tipo === 'saida' ? `saída do estoque: -${quantidade}` : `contagem do estoque (ajuste ${quantidade > 0 ? '+' : ''}${quantidade})`;
    registrar(u.login, acao, { item: prod.nome, produto: prod.id, movimento: id, origem, validade });
    json(res, 201, { id, diferenca: tipo === 'ajuste' ? quantidade : undefined });
  });

  // Desfazer um lançamento errado: quem lançou (no mesmo dia) ou a administração
  rota('DELETE', '/api/movimentos/:id', async (req, res, { u, p }) => {
    const m = db.prepare('SELECT m.*, p.nome produto_nome FROM movimentos m JOIN produtos p ON p.id = m.produto_id WHERE m.id = ?').get(+p.id) || falha(404, 'Lançamento não encontrado');
    const mesmoDia = m.criado_em && new Date(m.criado_em).toLocaleDateString('sv-SE') === hoje();
    if (u.perfil !== 'admin' && !(m.criado_por === u.login && mesmoDia)) falha(403, 'Só quem lançou (no mesmo dia) ou a administração pode desfazer');
    const restante = calcular(movimentosDe(m.produto_id).filter((x) => x.id !== m.id)).saldo;
    if (restante < -1e-9) falha(400, 'Desfazer esta entrada deixaria o estoque negativo (já houve saídas depois dela).');
    db.prepare('DELETE FROM movimentos WHERE id = ?').run(m.id);
    registrar(u.login, 'desfez lançamento do estoque', { item: m.produto_nome, produto: m.produto_id, tipo: m.tipo, quantidade: m.quantidade });
    json(res, 200, { ok: true });
  });
};
