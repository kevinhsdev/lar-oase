// Financeiro (só a administração): receitas e despesas, mensalidades dos residentes, pagamentos, recibo e o resumo do mês.
// No Gerifácil: contas a pagar/receber, recibos, fluxo de caixa e relatórios (DRE). Boleto fica de fora (precisa de banco).
'use strict';

const CATEGORIAS = {
  receita: ['Mensalidade', 'Doação', 'Contribuição da OASE / igreja', 'Convênio / prefeitura', 'Bazar e eventos', 'Outra receita'],
  despesa: ['Salários e encargos', 'Alimentação', 'Remédios e material de saúde', 'Higiene e limpeza', 'Água, luz, gás e telefone',
    'Manutenção e consertos', 'Serviços (médico, fisioterapia…)', 'Impostos e taxas', 'Outra despesa'],
};
const FORMAS = ['Pix', 'Dinheiro', 'Transferência', 'Cartão', 'Boleto', 'Benefício (INSS)', 'Outra'];
const dataValida = (v) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v + 'T12:00:00'));
const mesValido = (v) => /^\d{4}-(0[1-9]|1[0-2])$/.test(v);
const dinheiro = (v) => { // "1.234,56", "1234,56" ou número
  if (typeof v === 'number') return v;
  const s = String(v || '').trim().replace(/\s|R\$/g, '');
  const n = Number(s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : NaN;
};
const ultimoDia = (mes) => { const [a, m] = mes.split('-').map(Number); return new Date(a, m, 0).getDate(); };
const somarMes = (mes, n) => { const [a, m] = mes.split('-').map(Number); const d = new Date(a, m - 1 + n, 1, 12); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };

module.exports = function financeiro(ctx) {
  const { rota, db, registrar, transacao, falha, conferirVersao, json, corpoJson, exigirAdmin, hoje, agoraIso } = ctx;
  const SELECT = 'SELECT l.*, r.nome residente_nome, r.apelido residente_apelido FROM lancamentos l LEFT JOIN residentes r ON r.id = l.residente_id';
  const situacao = (l) => (l.pago_em ? 'pago' : l.vencimento < hoje() ? 'atrasado' : 'aberto');
  const comSit = (l) => ({ ...l, situacao: situacao(l) });

  function limpar(b, parcial) {
    const reg = {};
    const txt = (v, max) => { const s = v == null ? null : String(v).trim() || null; if (s && s.length > max) falha(400, 'Texto longo demais'); return s; };
    if (!parcial || b.tipo !== undefined) { if (!CATEGORIAS[b.tipo]) falha(400, 'Escolha receita ou despesa'); reg.tipo = b.tipo; }
    if (!parcial || b.categoria !== undefined) { reg.categoria = txt(b.categoria, 60); if (!reg.categoria) falha(400, 'Escolha a categoria'); }
    if (!parcial || b.descricao !== undefined) { reg.descricao = txt(b.descricao, 200); if (!reg.descricao) falha(400, 'Escreva a descrição'); }
    if (!parcial || b.valor !== undefined) { reg.valor = dinheiro(b.valor); if (!(reg.valor > 0) || reg.valor > 10000000) falha(400, 'Valor inválido'); }
    if (!parcial || b.vencimento !== undefined) { if (!dataValida(b.vencimento || '')) falha(400, 'Vencimento inválido'); reg.vencimento = b.vencimento; }
    for (const k of ['pessoa', 'obs']) if (b[k] !== undefined) reg[k] = txt(b[k], k === 'obs' ? 1000 : 120);
    if (b.residente_id !== undefined) {
      reg.residente_id = b.residente_id === '' || b.residente_id == null ? null : Number(b.residente_id);
      if (reg.residente_id != null && !db.prepare('SELECT 1 FROM residentes WHERE id = ?').get(reg.residente_id)) falha(400, 'Residente não encontrado');
    }
    return reg;
  }

  // Resumo de um mês (?mes=AAAA-MM): o que entrou e saiu (pelo dia do pagamento), o que vence, atrasados e os últimos 6 meses
  rota('GET', '/api/financeiro/resumo', async (req, res, { u, url }) => {
    exigirAdmin(u);
    const mes = mesValido(url.searchParams.get('mes') || '') ? url.searchParams.get('mes') : hoje().slice(0, 7);
    const soma = (tipo, m) => db.prepare("SELECT COALESCE(SUM(COALESCE(valor_pago, valor)), 0) s FROM lancamentos WHERE tipo = ? AND pago_em LIKE ?").get(tipo, m + '%').s;
    const porCategoria = (tipo) => db.prepare("SELECT categoria, SUM(COALESCE(valor_pago, valor)) total FROM lancamentos WHERE tipo = ? AND pago_em LIKE ? GROUP BY categoria ORDER BY total DESC").all(tipo, mes + '%');
    const h = hoje();
    const em7 = (() => { const d = new Date(h + 'T12:00:00'); d.setDate(d.getDate() + 7); return d.toLocaleDateString('sv-SE'); })();
    const meses = Array.from({ length: 6 }, (_, i) => somarMes(mes, i - 5)).map((m) => ({ mes: m, receitas: soma('receita', m), despesas: soma('despesa', m) }));
    json(res, 200, {
      mes, receitas: soma('receita', mes), despesas: soma('despesa', mes),
      a_receber: db.prepare("SELECT COALESCE(SUM(valor), 0) s FROM lancamentos WHERE tipo = 'receita' AND pago_em IS NULL AND vencimento LIKE ?").get(mes + '%').s,
      a_pagar: db.prepare("SELECT COALESCE(SUM(valor), 0) s FROM lancamentos WHERE tipo = 'despesa' AND pago_em IS NULL AND vencimento LIKE ?").get(mes + '%').s,
      atrasados: db.prepare(`${SELECT} WHERE l.pago_em IS NULL AND l.vencimento < ? ORDER BY l.vencimento`).all(h).map(comSit),
      proximos: db.prepare(`${SELECT} WHERE l.pago_em IS NULL AND l.vencimento BETWEEN ? AND ? ORDER BY l.vencimento`).all(h, em7).map(comSit),
      categorias: { receita: porCategoria('receita'), despesa: porCategoria('despesa') }, meses,
    });
  });

  // Lista (?mes=AAAA-MM pelo vencimento; ?tipo=; ?situacao=aberto|atrasado|pago)
  rota('GET', '/api/lancamentos', async (req, res, { u, url }) => {
    exigirAdmin(u);
    const q = url.searchParams;
    const mes = mesValido(q.get('mes') || '') ? q.get('mes') : hoje().slice(0, 7);
    let itens = db.prepare(`${SELECT} WHERE l.vencimento LIKE ? ${CATEGORIAS[q.get('tipo')] ? 'AND l.tipo = ?' : ''} ORDER BY l.vencimento, l.id`)
      .all(...[mes + '%', ...(CATEGORIAS[q.get('tipo')] ? [q.get('tipo')] : [])]).map(comSit);
    if (['aberto', 'atrasado', 'pago'].includes(q.get('situacao'))) itens = itens.filter((l) => l.situacao === q.get('situacao'));
    json(res, 200, { mes, itens, categorias: CATEGORIAS, formas: FORMAS });
  });

  rota('GET', '/api/lancamentos/:id', async (req, res, { u, p }) => {
    exigirAdmin(u);
    const l = db.prepare(`${SELECT} WHERE l.id = ?`).get(+p.id) || falha(404, 'Lançamento não encontrado');
    json(res, 200, { lancamento: comSit(l), organizacao: db.prepare("SELECT valor FROM config WHERE chave = 'nome_organizacao'").get()?.valor });
  });

  // Novo lançamento. "repetir_meses" cria o mesmo lançamento nos meses seguintes (ex.: conta de luz, salários)
  rota('POST', '/api/lancamentos', async (req, res, { u }) => {
    exigirAdmin(u);
    const b = await corpoJson(req);
    const reg = limpar(b, false);
    const vezes = Math.min(24, Math.max(1, Number(b.repetir_meses) || 1));
    const agora = agoraIso();
    const ids = transacao(() => Array.from({ length: vezes }, (_, i) => {
      const m = somarMes(reg.vencimento.slice(0, 7), i);
      const dia = Math.min(Number(reg.vencimento.slice(8)), ultimoDia(m));
      const linha = { ...reg, vencimento: `${m}-${String(dia).padStart(2, '0')}`, criado_em: agora, criado_por: u.login, atualizado_em: agora, atualizado_por: u.login };
      const ks = Object.keys(linha);
      return Number(db.prepare(`INSERT INTO lancamentos (${ks.join(', ')}) VALUES (${ks.map(() => '?').join(', ')})`).run(...ks.map((k) => linha[k])).lastInsertRowid);
    }));
    registrar(u.login, `lançou ${reg.tipo}: ${reg.descricao}`, { valor: reg.valor, vezes });
    json(res, 201, { ids });
  });

  rota('PUT', '/api/lancamentos/:id', async (req, res, { u, p }) => {
    exigirAdmin(u);
    const b = await corpoJson(req);
    const atual = db.prepare('SELECT * FROM lancamentos WHERE id = ?').get(+p.id) || falha(404, 'Lançamento não encontrado');
    conferirVersao(atual, b, u);
    const reg = limpar(b, true);
    const mud = Object.keys(reg).filter((k) => String(atual[k] ?? '') !== String(reg[k] ?? ''));
    if (!mud.length) return json(res, 200, { ok: true });
    reg.atualizado_em = agoraIso(); reg.atualizado_por = u.login;
    const ks = Object.keys(reg);
    db.prepare(`UPDATE lancamentos SET ${ks.map((k) => k + ' = ?').join(', ')} WHERE id = ?`).run(...ks.map((k) => reg[k]), atual.id);
    registrar(u.login, 'editou lançamento', { descricao: atual.descricao, campos: mud });
    json(res, 200, { ok: true });
  });

  // Registrar pagamento (ou desfazer com { desfazer: true })
  rota('PUT', '/api/lancamentos/:id/pagar', async (req, res, { u, p }) => {
    exigirAdmin(u);
    const b = await corpoJson(req);
    const l = db.prepare('SELECT * FROM lancamentos WHERE id = ?').get(+p.id) || falha(404, 'Lançamento não encontrado');
    if (b.desfazer) {
      db.prepare('UPDATE lancamentos SET pago_em = NULL, valor_pago = NULL, forma = NULL, atualizado_em = ?, atualizado_por = ? WHERE id = ?').run(agoraIso(), u.login, l.id);
      registrar(u.login, 'desfez pagamento', { descricao: l.descricao });
      return json(res, 200, { ok: true });
    }
    const data = b.pago_em || hoje();
    if (!dataValida(data) || data > hoje()) falha(400, 'Data do pagamento inválida');
    const valor = b.valor_pago === undefined || b.valor_pago === '' ? l.valor : dinheiro(b.valor_pago);
    if (!(valor > 0)) falha(400, 'Valor pago inválido');
    const forma = FORMAS.includes(b.forma) ? b.forma : null;
    db.prepare('UPDATE lancamentos SET pago_em = ?, valor_pago = ?, forma = ?, atualizado_em = ?, atualizado_por = ? WHERE id = ?').run(data, valor, forma, agoraIso(), u.login, l.id);
    registrar(u.login, l.tipo === 'receita' ? 'registrou recebimento' : 'registrou pagamento', { descricao: l.descricao, valor, forma });
    json(res, 200, { ok: true });
  });

  rota('DELETE', '/api/lancamentos/:id', async (req, res, { u, p }) => {
    exigirAdmin(u);
    const l = db.prepare('SELECT * FROM lancamentos WHERE id = ?').get(+p.id) || falha(404, 'Lançamento não encontrado');
    db.prepare('DELETE FROM lancamentos WHERE id = ?').run(l.id);
    registrar(u.login, 'apagou lançamento', { descricao: l.descricao, valor: l.valor });
    json(res, 200, { ok: true });
  });

  // Mensalidades de um mês: cada residente com valor definido e a cobrança do mês (se já foi gerada)
  rota('GET', '/api/mensalidades', async (req, res, { u, url }) => {
    exigirAdmin(u);
    const mes = mesValido(url.searchParams.get('mes') || '') ? url.searchParams.get('mes') : hoje().slice(0, 7);
    const rs = db.prepare("SELECT id, nome, apelido, quarto, mensalidade, dia_vencimento, situacao FROM residentes WHERE situacao IN ('no_lar','hospitalizado') OR id IN (SELECT residente_id FROM lancamentos WHERE competencia = ?) ORDER BY nome COLLATE NOCASE").all(mes);
    const cob = db.prepare(`${SELECT} WHERE l.competencia = ?`).all(mes).map(comSit);
    const linhas = rs.map((r) => ({ ...r, cobranca: cob.find((c) => c.residente_id === r.id) || null }));
    json(res, 200, { mes, linhas, formas: FORMAS, sem_valor: linhas.filter((l) => !l.mensalidade).length, a_gerar: linhas.filter((l) => l.mensalidade && !l.cobranca && l.situacao !== 'saiu' && l.situacao !== 'faleceu').length });
  });

  // Valor e dia de vencimento da mensalidade de um residente
  rota('PUT', '/api/mensalidades/residente/:id', async (req, res, { u, p }) => {
    exigirAdmin(u);
    const b = await corpoJson(req);
    const r = db.prepare('SELECT id, nome FROM residentes WHERE id = ?').get(+p.id) || falha(404, 'Residente não encontrado');
    const valor = b.mensalidade === '' || b.mensalidade == null ? null : dinheiro(b.mensalidade);
    if (valor !== null && !(valor > 0)) falha(400, 'Valor inválido');
    const dia = b.dia_vencimento === '' || b.dia_vencimento == null ? null : Number(b.dia_vencimento);
    if (dia !== null && !(Number.isInteger(dia) && dia >= 1 && dia <= 31)) falha(400, 'Dia de vencimento inválido (1 a 31)');
    db.prepare('UPDATE residentes SET mensalidade = ?, dia_vencimento = ? WHERE id = ?').run(valor, dia, r.id);
    registrar(u.login, 'definiu a mensalidade', { residente_id: r.id, nome: r.nome, valor, dia });
    json(res, 200, { ok: true });
  });

  // Gerar as mensalidades do mês (quem tem valor e ainda não tem a cobrança do mês)
  rota('POST', '/api/mensalidades/gerar', async (req, res, { u }) => {
    exigirAdmin(u);
    const b = await corpoJson(req);
    const mes = mesValido(b.mes || '') ? b.mes : falha(400, 'Mês inválido');
    const rs = db.prepare(`SELECT id, nome, mensalidade, dia_vencimento, demo FROM residentes WHERE situacao IN ('no_lar','hospitalizado') AND mensalidade > 0
      AND id NOT IN (SELECT residente_id FROM lancamentos WHERE competencia = ? AND residente_id IS NOT NULL)`).all(mes);
    const agora = agoraIso();
    const nomeMes = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'][Number(mes.slice(5)) - 1];
    transacao(() => {
      for (const r of rs) {
        const dia = Math.min(r.dia_vencimento || 10, ultimoDia(mes));
        db.prepare(`INSERT INTO lancamentos (tipo, categoria, descricao, valor, vencimento, residente_id, competencia, criado_em, criado_por, atualizado_em, atualizado_por, demo)
          VALUES ('receita', 'Mensalidade', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(`Mensalidade de ${nomeMes}/${mes.slice(0, 4)} — ${r.nome}`, r.mensalidade, `${mes}-${String(dia).padStart(2, '0')}`, r.id, mes, agora, u.login, agora, u.login, r.demo);
      }
    });
    registrar(u.login, `gerou as mensalidades de ${mes}`, { quantidade: rs.length });
    json(res, 201, { geradas: rs.length });
  });
};

module.exports.CATEGORIAS = CATEGORIAS;
