// Agenda: consultas, exames, visitas, atividades e outros compromissos (de um residente ou do lar todo).
// No Gerifácil é a "Agenda de atividades e tarefas".
'use strict';

const TIPOS = { consulta: 'Consulta', exame: 'Exame', vacina: 'Vacina', visita: 'Visita', atividade: 'Atividade', outro: 'Outro' };
const SITUACOES = { agendado: 'Agendado', feito: 'Feito', cancelado: 'Cancelado' };
const CAMPOS = ['residente_id', 'data', 'hora', 'hora_fim', 'tipo', 'titulo', 'local', 'acompanhante', 'transporte', 'obs'];
const dataValida = (v) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v + 'T12:00:00'));
const horaValida = (v) => /^([01]\d|2[0-3]):[0-5]\d$/.test(v);

module.exports = function agenda(ctx) {
  const { rota, db, registrar, falha, conferirVersao, json, corpoJson, agoraIso } = ctx;

  const SELECT = `SELECT a.*, r.nome residente_nome, r.apelido residente_apelido, r.quarto residente_quarto, r.situacao residente_situacao, u.nome autor_nome
    FROM agenda a LEFT JOIN residentes r ON r.id = a.residente_id LEFT JOIN usuarios u ON u.login = a.criado_por`;

  function limpar(b, parcial) {
    const reg = {};
    for (const k of CAMPOS) {
      if (b[k] === undefined) { if (!parcial && ['data', 'tipo', 'titulo'].includes(k)) falha(400, 'Preencha o dia, o tipo e o título'); continue; }
      let v = b[k];
      if (typeof v === 'string') v = v.trim();
      reg[k] = v === '' || v == null ? null : v;
    }
    if ('residente_id' in reg && reg.residente_id != null) {
      reg.residente_id = Number(reg.residente_id);
      if (!db.prepare('SELECT 1 FROM residentes WHERE id = ?').get(reg.residente_id)) falha(400, 'Residente não encontrado');
    }
    if ('data' in reg && !dataValida(reg.data || '')) falha(400, 'Data inválida');
    for (const k of ['hora', 'hora_fim']) if (reg[k] && !horaValida(reg[k])) falha(400, 'Hora inválida (use HH:MM)');
    if (reg.hora_fim && !reg.hora && !parcial) falha(400, 'Informe a hora de início');
    if (reg.hora && reg.hora_fim && reg.hora_fim <= reg.hora) falha(400, 'A hora de fim precisa ser depois da hora de início');
    if ('tipo' in reg && !TIPOS[reg.tipo]) falha(400, 'Escolha o tipo do compromisso');
    if ('titulo' in reg && !reg.titulo) falha(400, 'Escreva o que é (ex.: Consulta com cardiologista)');
    for (const [k, v] of Object.entries(reg)) if (typeof v === 'string' && v.length > 2000) falha(400, `Texto longo demais em ${k}`);
    return reg;
  }
  const detalhe = (a, extra = {}) => (a.residente_id ? { residente_id: a.residente_id, nome: a.residente_nome, titulo: a.titulo, data: a.data, ...extra } : { titulo: a.titulo, data: a.data, ...extra });

  // ?de=&ate= (período) · ?residente= · ?proximos=1 (de hoje em diante)
  rota('GET', '/api/agenda', async (req, res, { url }) => {
    const q = url.searchParams;
    const onde = [], p = [];
    if (q.get('de')) { onde.push('a.data >= ?'); p.push(q.get('de')); }
    if (q.get('ate')) { onde.push('a.data <= ?'); p.push(q.get('ate')); }
    if (q.get('residente')) { onde.push('a.residente_id = ?'); p.push(Number(q.get('residente'))); }
    if (q.get('proximos') === '1') { onde.push("a.data >= ? AND a.situacao = 'agendado'"); p.push(new Date().toLocaleDateString('sv-SE')); }
    const lim = Math.min(2000, Number(q.get('limite')) || 1000);
    const ordem = q.get('proximos') === '1' ? 'ASC' : q.get('residente') ? 'DESC' : 'ASC';
    const itens = db.prepare(`${SELECT} ${onde.length ? 'WHERE ' + onde.join(' AND ') : ''}
      ORDER BY a.data ${ordem}, COALESCE(a.hora, '00:00') ${ordem}, a.id LIMIT ?`).all(...p, lim);
    json(res, 200, { itens, tipos: TIPOS, situacoes: SITUACOES });
  });

  rota('POST', '/api/agenda', async (req, res, { u }) => {
    const reg = limpar(await corpoJson(req), false);
    const agora = agoraIso();
    const demo = reg.residente_id ? db.prepare('SELECT demo FROM residentes WHERE id = ?').get(reg.residente_id).demo : 0;
    Object.assign(reg, { situacao: 'agendado', criado_em: agora, criado_por: u.login, atualizado_em: agora, atualizado_por: u.login, demo });
    const ks = Object.keys(reg);
    const id = Number(db.prepare(`INSERT INTO agenda (${ks.join(', ')}) VALUES (${ks.map(() => '?').join(', ')})`).run(...ks.map((k) => reg[k])).lastInsertRowid);
    const a = db.prepare(`${SELECT} WHERE a.id = ?`).get(id);
    registrar(u.login, `agendou: ${TIPOS[a.tipo]}`, detalhe(a, { compromisso: id }));
    json(res, 201, { id });
  });

  // Qualquer pessoa da equipe edita (a agenda é de todos); o histórico e a auditoria guardam quem mudou
  rota('PUT', '/api/agenda/:id', async (req, res, { u, p }) => {
    const b = await corpoJson(req);
    const atual = db.prepare(`${SELECT} WHERE a.id = ?`).get(+p.id) || falha(404, 'Compromisso não encontrado');
    conferirVersao(atual, b, u);
    const reg = limpar(b, true);
    const hIni = 'hora' in reg ? reg.hora : atual.hora, hFim = 'hora_fim' in reg ? reg.hora_fim : atual.hora_fim;
    if (hFim && (!hIni || hFim <= hIni)) falha(400, 'A hora de fim precisa ser depois da hora de início');
    const mud = Object.keys(reg).filter((k) => String(atual[k] ?? '') !== String(reg[k] ?? ''));
    if (!mud.length) return json(res, 200, { ok: true });
    reg.atualizado_em = agoraIso(); reg.atualizado_por = u.login;
    const ks = Object.keys(reg);
    db.prepare(`UPDATE agenda SET ${ks.map((k) => k + ' = ?').join(', ')} WHERE id = ?`).run(...ks.map((k) => reg[k]), atual.id);
    registrar(u.login, 'editou compromisso da agenda', detalhe(atual, { compromisso: atual.id, campos: mud }));
    json(res, 200, { ok: true });
  });

  // Marcar como feito (com o resultado, ex.: "médico pediu retorno em 30 dias"), cancelado ou voltar para agendado
  rota('PUT', '/api/agenda/:id/situacao', async (req, res, { u, p }) => {
    const b = await corpoJson(req);
    const a = db.prepare(`${SELECT} WHERE a.id = ?`).get(+p.id) || falha(404, 'Compromisso não encontrado');
    if (!SITUACOES[b.situacao]) falha(400, 'Situação inválida');
    const resultado = b.situacao === 'agendado' ? null : String(b.resultado || '').trim().slice(0, 2000) || null;
    db.prepare('UPDATE agenda SET situacao = ?, resultado = ?, atualizado_em = ?, atualizado_por = ? WHERE id = ?').run(b.situacao, resultado, agoraIso(), u.login, a.id);
    registrar(u.login, `compromisso: ${SITUACOES[a.situacao]} → ${SITUACOES[b.situacao]}`, detalhe(a, { compromisso: a.id, resultado }));
    json(res, 200, { ok: true });
  });

  // Apagar: quem criou ou a administração (para desmarcar, o certo é "Cancelado", que fica no histórico)
  rota('DELETE', '/api/agenda/:id', async (req, res, { u, p }) => {
    const a = db.prepare(`${SELECT} WHERE a.id = ?`).get(+p.id) || falha(404, 'Compromisso não encontrado');
    if (u.perfil !== 'admin' && a.criado_por !== u.login) falha(403, 'Só quem criou (ou a administração) pode apagar. Para desmarcar, use "Cancelado".');
    db.prepare('DELETE FROM agenda WHERE id = ?').run(a.id);
    registrar(u.login, 'apagou compromisso da agenda', detalhe(a, { compromisso: a.id }));
    json(res, 200, { ok: true });
  });
};
