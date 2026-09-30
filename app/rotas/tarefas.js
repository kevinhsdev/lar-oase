// Tarefas: a lista de afazeres da equipe (com responsável, prazo, prioridade e repetição).
// Tarefa que se repete: ao marcar como feita, a próxima é criada sozinha. No Gerifácil é a parte "tarefas" da agenda.
'use strict';

const REPETIR = { diaria: 'Todo dia', semanal: 'Toda semana', mensal: 'Todo mês' };
const dataValida = (v) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v + 'T12:00:00'));
function proximaData(iso, rep) {
  const d = new Date(iso + 'T12:00:00');
  if (rep === 'diaria') d.setDate(d.getDate() + 1); else if (rep === 'semanal') d.setDate(d.getDate() + 7); else d.setMonth(d.getMonth() + 1);
  return d.toLocaleDateString('sv-SE');
}

module.exports = function tarefas(ctx) {
  const { rota, db, registrar, transacao, falha, conferirVersao, json, corpoJson, hoje, agoraIso } = ctx;
  const SELECT = `SELECT t.*, r.nome residente_nome, r.apelido residente_apelido, u.nome responsavel_nome, f.nome feita_por_nome
    FROM tarefas t LEFT JOIN residentes r ON r.id = t.residente_id LEFT JOIN usuarios u ON u.login = t.responsavel LEFT JOIN usuarios f ON f.login = t.feita_por`;

  function limpar(b, parcial) {
    const reg = {};
    const txt = (v, max) => { const s = v == null ? null : String(v).trim() || null; if (s && s.length > max) falha(400, 'Texto longo demais'); return s; };
    if (!parcial || b.titulo !== undefined) { reg.titulo = txt(b.titulo, 160); if (!reg.titulo) falha(400, 'Escreva a tarefa'); }
    if (b.detalhe !== undefined) reg.detalhe = txt(b.detalhe, 1000);
    if (b.responsavel !== undefined) {
      reg.responsavel = txt(b.responsavel, 40);
      if (reg.responsavel && !db.prepare('SELECT 1 FROM usuarios WHERE login = ? AND ativo = 1').get(reg.responsavel)) falha(400, 'Responsável não encontrado');
    }
    if (b.prazo !== undefined) { reg.prazo = b.prazo || null; if (reg.prazo && !dataValida(reg.prazo)) falha(400, 'Prazo inválido'); }
    if (b.prioridade !== undefined) reg.prioridade = b.prioridade === 'alta' ? 'alta' : 'normal';
    if (b.repetir !== undefined) { reg.repetir = b.repetir || null; if (reg.repetir && !REPETIR[reg.repetir]) falha(400, 'Repetição inválida'); }
    if (reg.repetir && !reg.prazo && !parcial) falha(400, 'Tarefa que se repete precisa de um prazo (o primeiro dia)');
    if (b.residente_id !== undefined) {
      reg.residente_id = b.residente_id === '' || b.residente_id == null ? null : Number(b.residente_id);
      if (reg.residente_id != null && !db.prepare('SELECT 1 FROM residentes WHERE id = ?').get(reg.residente_id)) falha(400, 'Residente não encontrado');
    }
    return reg;
  }

  // Abertas (todas) + feitas nos últimos 7 dias; ?minhas=1 só as do usuário (e as sem responsável)
  rota('GET', '/api/tarefas', async (req, res, { u, url }) => {
    const minhas = url.searchParams.get('minhas') === '1';
    const semana = (() => { const d = new Date(); d.setDate(d.getDate() - 7); return d.toISOString(); })();
    const itens = db.prepare(`${SELECT} WHERE (t.feita = 0 OR t.feita_em >= ?) ${minhas ? 'AND (t.responsavel = ? OR t.responsavel IS NULL)' : ''}
      ORDER BY t.feita, t.prazo IS NULL, t.prazo, t.prioridade = 'alta' DESC, t.id`).all(...(minhas ? [semana, u.login] : [semana]));
    const usuarios = db.prepare('SELECT login, nome FROM usuarios WHERE ativo = 1 ORDER BY nome').all();
    const h = hoje();
    json(res, 200, { itens, usuarios, repetir: REPETIR, resumo: { atrasadas: itens.filter((t) => !t.feita && t.prazo && t.prazo < h).length, hoje: itens.filter((t) => !t.feita && t.prazo === h).length } });
  });

  rota('POST', '/api/tarefas', async (req, res, { u }) => {
    const reg = limpar(await corpoJson(req), false);
    const agora = agoraIso();
    Object.assign(reg, { criado_em: agora, criado_por: u.login, atualizado_em: agora, atualizado_por: u.login });
    const ks = Object.keys(reg);
    const id = Number(db.prepare(`INSERT INTO tarefas (${ks.join(', ')}) VALUES (${ks.map(() => '?').join(', ')})`).run(...ks.map((k) => reg[k])).lastInsertRowid);
    registrar(u.login, 'criou tarefa', { titulo: reg.titulo, responsavel: reg.responsavel, prazo: reg.prazo });
    json(res, 201, { id });
  });

  rota('PUT', '/api/tarefas/:id', async (req, res, { u, p }) => {
    const b = await corpoJson(req);
    const atual = db.prepare('SELECT * FROM tarefas WHERE id = ?').get(+p.id) || falha(404, 'Tarefa não encontrada');
    conferirVersao(atual, b, u);
    const reg = limpar(b, true);
    const mud = Object.keys(reg).filter((k) => String(atual[k] ?? '') !== String(reg[k] ?? ''));
    if (!mud.length) return json(res, 200, { ok: true });
    reg.atualizado_em = agoraIso(); reg.atualizado_por = u.login;
    const ks = Object.keys(reg);
    db.prepare(`UPDATE tarefas SET ${ks.map((k) => k + ' = ?').join(', ')} WHERE id = ?`).run(...ks.map((k) => reg[k]), atual.id);
    registrar(u.login, 'editou tarefa', { titulo: reg.titulo || atual.titulo, campos: mud });
    json(res, 200, { ok: true });
  });

  // Marcar feita (ou desfazer). Se a tarefa se repete, cria a próxima (a partir do prazo dela, ou de hoje se já passou)
  rota('PUT', '/api/tarefas/:id/feita', async (req, res, { u, p }) => {
    const b = await corpoJson(req);
    const t = db.prepare('SELECT * FROM tarefas WHERE id = ?').get(+p.id) || falha(404, 'Tarefa não encontrada');
    let proxima = null;
    transacao(() => {
      if (b.feita === false) {
        db.prepare('UPDATE tarefas SET feita = 0, feita_em = NULL, feita_por = NULL WHERE id = ?').run(t.id);
        return;
      }
      if (t.feita) return;
      db.prepare('UPDATE tarefas SET feita = 1, feita_em = ?, feita_por = ? WHERE id = ?').run(agoraIso(), u.login, t.id);
      if (t.repetir && t.prazo) {
        let d = proximaData(t.prazo, t.repetir);
        while (d < hoje()) d = proximaData(d, t.repetir);
        proxima = Number(db.prepare(`INSERT INTO tarefas (titulo, detalhe, responsavel, prazo, prioridade, repetir, residente_id, criado_em, criado_por, atualizado_em, atualizado_por, demo)
          VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`).run(t.titulo, t.detalhe, t.responsavel, d, t.prioridade, t.repetir, t.residente_id, agoraIso(), u.login, agoraIso(), u.login, t.demo).lastInsertRowid);
      }
    });
    registrar(u.login, b.feita === false ? 'reabriu tarefa' : 'concluiu tarefa', { titulo: t.titulo });
    json(res, 200, { ok: true, proxima });
  });

  // Apagar: quem criou ou a administração
  rota('DELETE', '/api/tarefas/:id', async (req, res, { u, p }) => {
    const t = db.prepare('SELECT * FROM tarefas WHERE id = ?').get(+p.id) || falha(404, 'Tarefa não encontrada');
    if (u.perfil !== 'admin' && t.criado_por !== u.login) falha(403, 'Só quem criou (ou a administração) pode apagar');
    db.prepare('DELETE FROM tarefas WHERE id = ?').run(t.id);
    registrar(u.login, 'apagou tarefa', { titulo: t.titulo });
    json(res, 200, { ok: true });
  });
};
