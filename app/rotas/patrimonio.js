// Patrimônio: itens do lar (camas, cadeiras de rodas, eletrodomésticos, extintores, carro…), onde estão, estado,
// quem usa e o histórico de manutenções, com aviso de revisão vencendo. No Gerifácil é o "Inventário de itens da unidade".
'use strict';

const CATEGORIAS = ['Mobília e camas', 'Equipamento de saúde', 'Acessibilidade', 'Eletrodoméstico', 'Eletrônico', 'Cozinha', 'Lavanderia', 'Segurança', 'Veículo', 'Outro'];
const ESTADOS = { bom: 'Bom', regular: 'Regular', ruim: 'Ruim', manutencao: 'Em manutenção', baixado: 'Baixado (não se usa mais)' };
const TIPOS_MANUT = { revisao: 'Revisão / inspeção', conserto: 'Conserto', manutencao: 'Manutenção preventiva', outro: 'Outro' };
const ORIGENS = ['Compra', 'Doação', 'Empréstimo', 'Comodato', 'Outra'];
const dataValida = (v) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v + 'T12:00:00'));
const somarDias = (iso, n) => { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n); return d.toLocaleDateString('sv-SE'); };

module.exports = function patrimonio(ctx) {
  const { rota, db, registrar, falha, conferirVersao, json, corpoJson, exigirAdmin, hoje, agoraIso } = ctx;
  const SELECT = `SELECT p.*, r.nome residente_nome, r.apelido residente_apelido FROM patrimonio p LEFT JOIN residentes r ON r.id = p.residente_id`;
  const comAviso = (p) => {
    const h = hoje();
    const rev = p.proxima_revisao && p.estado !== 'baixado' ? (p.proxima_revisao < h ? 'vencida' : p.proxima_revisao <= somarDias(h, 30) ? 'vencendo' : null) : null;
    return { ...p, revisao: rev, alerta: !!rev || p.estado === 'manutencao' || p.estado === 'ruim' };
  };

  function limpar(b, parcial) {
    const reg = {};
    const txt = (v, max = 120) => { const s = v == null ? null : String(v).trim() || null; if (s && s.length > max) falha(400, 'Texto longo demais'); return s; };
    if (!parcial || b.nome !== undefined) { reg.nome = txt(b.nome); if (!reg.nome) falha(400, 'Informe o nome do item'); }
    if (!parcial || b.categoria !== undefined) { if (!CATEGORIAS.includes(b.categoria)) falha(400, 'Escolha a categoria'); reg.categoria = b.categoria; }
    if (!parcial || b.estado !== undefined) { const e = b.estado || 'bom'; if (!ESTADOS[e]) falha(400, 'Estado inválido'); reg.estado = e; }
    for (const k of ['codigo', 'local', 'obs']) if (b[k] !== undefined) reg[k] = txt(b[k], k === 'obs' ? 1000 : 80);
    if (b.origem !== undefined) reg.origem = ORIGENS.includes(b.origem) ? b.origem : null;
    for (const k of ['data_aquisicao', 'garantia_ate', 'proxima_revisao']) if (b[k] !== undefined) { reg[k] = b[k] || null; if (reg[k] && !dataValida(reg[k])) falha(400, 'Data inválida'); }
    if (b.valor !== undefined) {
      if (b.valor === '' || b.valor == null) reg.valor = null;
      else { const n = Number(String(b.valor).replace(/\./g, '').replace(',', '.')); if (!Number.isFinite(n) || n < 0) falha(400, 'Valor inválido'); reg.valor = Math.round(n * 100) / 100; }
    }
    if (b.residente_id !== undefined) {
      reg.residente_id = b.residente_id === '' || b.residente_id == null ? null : Number(b.residente_id);
      if (reg.residente_id != null && !db.prepare('SELECT 1 FROM residentes WHERE id = ?').get(reg.residente_id)) falha(400, 'Residente não encontrado');
    }
    return reg;
  }

  rota('GET', '/api/patrimonio', async (req, res, { url }) => {
    const itens = db.prepare(`${SELECT} ${url.searchParams.get('todos') === '1' ? '' : "WHERE p.estado <> 'baixado'"} ORDER BY p.local COLLATE NOCASE, p.nome COLLATE NOCASE`).all().map(comAviso);
    json(res, 200, { itens, categorias: CATEGORIAS, estados: ESTADOS, origens: ORIGENS, tipos: TIPOS_MANUT, avisos: itens.filter((i) => i.alerta).length });
  });

  rota('GET', '/api/patrimonio/:id', async (req, res, { p }) => {
    const item = db.prepare(`${SELECT} WHERE p.id = ?`).get(+p.id) || falha(404, 'Item não encontrado');
    const manutencoes = db.prepare('SELECT m.*, u.nome autor_nome FROM manutencoes m LEFT JOIN usuarios u ON u.login = m.criado_por WHERE m.patrimonio_id = ? ORDER BY m.data DESC, m.id DESC').all(item.id);
    json(res, 200, { item: comAviso(item), manutencoes, categorias: CATEGORIAS, estados: ESTADOS, origens: ORIGENS, tipos: TIPOS_MANUT });
  });

  rota('POST', '/api/patrimonio', async (req, res, { u }) => {
    const reg = limpar(await corpoJson(req), false);
    if (reg.codigo && db.prepare('SELECT 1 FROM patrimonio WHERE codigo = ?').get(reg.codigo)) falha(400, 'Já existe um item com esse número de patrimônio');
    const agora = agoraIso();
    Object.assign(reg, { criado_em: agora, criado_por: u.login, atualizado_em: agora, atualizado_por: u.login });
    const ks = Object.keys(reg);
    const id = Number(db.prepare(`INSERT INTO patrimonio (${ks.join(', ')}) VALUES (${ks.map(() => '?').join(', ')})`).run(...ks.map((k) => reg[k])).lastInsertRowid);
    registrar(u.login, 'cadastrou item do patrimônio', { item: reg.nome, codigo: reg.codigo });
    json(res, 201, { id });
  });

  rota('PUT', '/api/patrimonio/:id', async (req, res, { u, p }) => {
    const b = await corpoJson(req);
    const atual = db.prepare('SELECT * FROM patrimonio WHERE id = ?').get(+p.id) || falha(404, 'Item não encontrado');
    conferirVersao(atual, b, u);
    const reg = limpar(b, true);
    if (reg.codigo && db.prepare('SELECT 1 FROM patrimonio WHERE codigo = ? AND id <> ?').get(reg.codigo, atual.id)) falha(400, 'Já existe um item com esse número de patrimônio');
    const mud = Object.keys(reg).filter((k) => String(atual[k] ?? '') !== String(reg[k] ?? ''));
    if (!mud.length) return json(res, 200, { ok: true });
    reg.atualizado_em = agoraIso(); reg.atualizado_por = u.login;
    const ks = Object.keys(reg);
    db.prepare(`UPDATE patrimonio SET ${ks.map((k) => k + ' = ?').join(', ')} WHERE id = ?`).run(...ks.map((k) => reg[k]), atual.id);
    registrar(u.login, reg.estado === 'baixado' && atual.estado !== 'baixado' ? 'deu baixa em item do patrimônio' : 'editou item do patrimônio', { item: reg.nome || atual.nome, campos: mud });
    json(res, 200, { ok: true });
  });

  rota('DELETE', '/api/patrimonio/:id', async (req, res, { u, p }) => {
    exigirAdmin(u);
    const atual = db.prepare('SELECT * FROM patrimonio WHERE id = ?').get(+p.id) || falha(404, 'Item não encontrado');
    db.prepare('DELETE FROM patrimonio WHERE id = ?').run(atual.id);
    registrar(u.login, 'apagou item do patrimônio', { item: atual.nome });
    json(res, 200, { ok: true });
  });

  // Registrar manutenção/revisão/conserto. Pode já marcar a próxima revisão e o estado do item.
  rota('POST', '/api/patrimonio/:id/manutencoes', async (req, res, { u, p }) => {
    const b = await corpoJson(req);
    const item = db.prepare('SELECT * FROM patrimonio WHERE id = ?').get(+p.id) || falha(404, 'Item não encontrado');
    const data = b.data || hoje();
    if (!dataValida(data) || data > hoje()) falha(400, 'Data inválida');
    if (!TIPOS_MANUT[b.tipo]) falha(400, 'Escolha o tipo');
    const descricao = String(b.descricao || '').trim().slice(0, 1000);
    if (!descricao) falha(400, 'Descreva o que foi feito');
    let custo = null;
    if (b.custo !== undefined && b.custo !== '') { custo = Number(String(b.custo).replace(/\./g, '').replace(',', '.')); if (!Number.isFinite(custo) || custo < 0) falha(400, 'Custo inválido'); }
    db.prepare('INSERT INTO manutencoes (patrimonio_id, data, tipo, descricao, custo, responsavel, criado_em, criado_por, demo) VALUES (?,?,?,?,?,?,?,?,?)')
      .run(item.id, data, b.tipo, descricao, custo, String(b.responsavel || '').trim().slice(0, 120) || null, agoraIso(), u.login, item.demo);
    const muda = {};
    if (b.proxima_revisao !== undefined) { if (b.proxima_revisao && !dataValida(b.proxima_revisao)) falha(400, 'Data da próxima revisão inválida'); muda.proxima_revisao = b.proxima_revisao || null; }
    if (b.estado && ESTADOS[b.estado]) muda.estado = b.estado;
    if (Object.keys(muda).length) {
      const ks = Object.keys(muda);
      db.prepare(`UPDATE patrimonio SET ${ks.map((k) => k + ' = ?').join(', ')}, atualizado_em = ?, atualizado_por = ? WHERE id = ?`).run(...ks.map((k) => muda[k]), agoraIso(), u.login, item.id);
    }
    registrar(u.login, `registrou ${TIPOS_MANUT[b.tipo].toLowerCase()} no patrimônio`, { item: item.nome, custo });
    json(res, 201, { ok: true });
  });

  rota('DELETE', '/api/manutencoes/:id', async (req, res, { u, p }) => {
    exigirAdmin(u);
    const m = db.prepare('SELECT m.*, p.nome item FROM manutencoes m JOIN patrimonio p ON p.id = m.patrimonio_id WHERE m.id = ?').get(+p.id) || falha(404, 'Registro não encontrado');
    db.prepare('DELETE FROM manutencoes WHERE id = ?').run(m.id);
    registrar(u.login, 'apagou registro de manutenção', { item: m.item, data: m.data });
    json(res, 200, { ok: true });
  });
};
