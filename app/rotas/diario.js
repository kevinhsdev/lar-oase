// Diário: ocorrências e evolução do dia (troca o caderno). Inspirado no "Diário de Equipe" + "Alertas" do Gerifácil.
'use strict';

const TIPOS = {
  evolucao: 'Evolução do dia', queda: 'Queda', saude: 'Saúde (febre, dor, mal-estar)', alimentacao: 'Alimentação',
  comportamento: 'Comportamento', visita: 'Visita', recado: 'Recado para a equipe', outro: 'Outro',
};
const GRAVIDADES = { normal: 'Normal', atencao: 'Atenção', grave: 'Grave' };
const TURNOS = { manha: 'Manhã', tarde: 'Tarde', noite: 'Noite' };
// Turno pela hora (provisório — confirmar com a chefe como são os plantões do Lar)
const turnoDaHora = (h) => { const n = Number(String(h).slice(0, 2)); return n >= 6 && n < 13 ? 'manha' : n >= 13 && n < 19 ? 'tarde' : 'noite'; };
const dataValida = (v) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v + 'T12:00:00'));
const horaValida = (v) => /^([01]\d|2[0-3]):[0-5]\d$/.test(v);

module.exports = function diario(ctx) {
  const { rota, db, registrar, falha, conferirVersao, json, corpoJson, exigirAdmin, hoje, agoraIso } = ctx;

  const SELECT = `SELECT o.*, r.nome residente_nome, r.apelido residente_apelido, r.quarto residente_quarto,
      ua.nome autor_nome, ur.nome resolvida_por_nome
    FROM ocorrencias o LEFT JOIN residentes r ON r.id = o.residente_id
    LEFT JOIN usuarios ua ON ua.login = o.criado_por LEFT JOIN usuarios ur ON ur.login = o.resolvida_por`;

  // Confere e limpa o que veio da tela (só estes campos entram)
  function limpar(b, parcial) {
    const reg = {};
    const txt = (v) => (v == null ? null : String(v).trim() || null);
    if (!parcial || b.residente_id !== undefined) {
      const id = b.residente_id === '' || b.residente_id == null ? null : Number(b.residente_id);
      if (id != null && !db.prepare('SELECT 1 FROM residentes WHERE id = ?').get(id)) falha(400, 'Residente não encontrado');
      reg.residente_id = id;
    }
    if (!parcial || b.data !== undefined) { if (!dataValida(b.data)) falha(400, 'Data inválida'); if (b.data > hoje()) falha(400, 'A data não pode estar no futuro'); reg.data = b.data; }
    if (!parcial || b.hora !== undefined) { if (!horaValida(b.hora)) falha(400, 'Hora inválida (use HH:MM)'); reg.hora = b.hora; }
    if (!parcial || b.turno !== undefined || reg.hora) {
      const t = b.turno || turnoDaHora(reg.hora);
      if (!TURNOS[t]) falha(400, 'Turno inválido');
      reg.turno = t;
    }
    if (!parcial || b.tipo !== undefined) { if (!TIPOS[b.tipo]) falha(400, 'Escolha o tipo do registro'); reg.tipo = b.tipo; }
    if (!parcial || b.gravidade !== undefined) { const g = b.gravidade || 'normal'; if (!GRAVIDADES[g]) falha(400, 'Gravidade inválida'); reg.gravidade = g; }
    if (!parcial || b.texto !== undefined) {
      reg.texto = txt(b.texto);
      if (!reg.texto) falha(400, 'Escreva o que aconteceu');
      if (reg.texto.length > 5000) falha(400, 'Texto longo demais');
    }
    // Sinais vitais (opcionais): números dentro de faixas possíveis, para pegar erro de digitação
    const num = (k, min, max, nome, inteiro) => {
      if (b[k] === undefined) return;
      if (b[k] === '' || b[k] == null) { reg[k] = null; return; }
      const n = Number(String(b[k]).replace(',', '.'));
      if (!Number.isFinite(n) || n < min || n > max) falha(400, `${nome} fora do normal possível (${min} a ${max}). Confira o número.`);
      reg[k] = inteiro ? Math.round(n) : Math.round(n * 10) / 10;
    };
    num('temperatura', 30, 45, 'Temperatura');
    num('glicemia', 10, 900, 'Glicemia', true);
    num('saturacao', 50, 100, 'Saturação', true);
    num('freq_cardiaca', 20, 250, 'Frequência cardíaca', true);
    if (b.pa !== undefined) {
      const pa = txt(b.pa);
      if (pa && !/^\d{2,3}\s*[x/]\s*\d{2,3}$/i.test(pa)) falha(400, 'Pressão: escreva como 120x80');
      reg.pa = pa ? pa.replace(/\s*[x/]\s*/i, 'x') : null;
    }
    return reg;
  }

  const podeEditar = (o, u) => u.perfil === 'admin' || o.criado_por === u.login;
  const detalhe = (o, extra = {}) => (o.residente_id ? { residente_id: o.residente_id, nome: o.residente_nome, tipo: TIPOS[o.tipo], ...extra } : { tipo: TIPOS[o.tipo], geral: true, ...extra });

  // Lista: por dia (?data=), por período (?de=&ate=), de um residente (?residente=) ou só as pendentes (?pendentes=1)
  rota('GET', '/api/ocorrencias', async (req, res, { url }) => {
    const q = url.searchParams;
    const onde = [], p = [];
    if (q.get('data')) { onde.push('o.data = ?'); p.push(q.get('data')); }
    if (q.get('de')) { onde.push('o.data >= ?'); p.push(q.get('de')); }
    if (q.get('ate')) { onde.push('o.data <= ?'); p.push(q.get('ate')); }
    if (q.get('residente')) { onde.push('o.residente_id = ?'); p.push(Number(q.get('residente'))); }
    if (q.get('pendentes') === '1') onde.push("o.gravidade <> 'normal' AND o.resolvida = 0");
    const lim = Math.min(1000, Number(q.get('limite')) || 500);
    const lin = db.prepare(`${SELECT} ${onde.length ? 'WHERE ' + onde.join(' AND ') : ''} ORDER BY o.data DESC, o.hora DESC, o.id DESC LIMIT ?`).all(...p, lim);
    json(res, 200, { itens: lin, tipos: TIPOS, gravidades: GRAVIDADES, turnos: TURNOS });
  });

  // Números para o menu e o Início
  rota('GET', '/api/ocorrencias/resumo', async (req, res) => {
    json(res, 200, {
      pendentes: db.prepare("SELECT COUNT(*) n FROM ocorrencias WHERE gravidade <> 'normal' AND resolvida = 0").get().n,
      hoje: db.prepare('SELECT COUNT(*) n FROM ocorrencias WHERE data = ?').get(hoje()).n,
    });
  });

  rota('POST', '/api/ocorrencias', async (req, res, { u }) => {
    const reg = limpar(await corpoJson(req), false);
    const agora = agoraIso();
    const demo = reg.residente_id ? db.prepare('SELECT demo FROM residentes WHERE id = ?').get(reg.residente_id).demo : 0;
    Object.assign(reg, { criado_em: agora, criado_por: u.login, atualizado_em: agora, atualizado_por: u.login, demo });
    const ks = Object.keys(reg);
    const id = Number(db.prepare(`INSERT INTO ocorrencias (${ks.join(', ')}) VALUES (${ks.map(() => '?').join(', ')})`).run(...ks.map((k) => reg[k])).lastInsertRowid);
    const o = db.prepare(`${SELECT} WHERE o.id = ?`).get(id);
    registrar(u.login, `anotou no diário: ${TIPOS[o.tipo]}${o.gravidade !== 'normal' ? ' (' + GRAVIDADES[o.gravidade] + ')' : ''}`, detalhe(o, { ocorrencia: id }));
    json(res, 201, { id });
  });

  // Editar: quem escreveu ou a administração (o histórico guarda quem mudou)
  rota('PUT', '/api/ocorrencias/:id', async (req, res, { u, p }) => {
    const b = await corpoJson(req);
    const atual = db.prepare(`${SELECT} WHERE o.id = ?`).get(+p.id) || falha(404, 'Registro não encontrado');
    if (!podeEditar(atual, u)) falha(403, 'Só quem escreveu (ou a administração) pode editar este registro');
    conferirVersao(atual, b, u);
    const reg = limpar(b, true);
    const mud = Object.keys(reg).filter((k) => String(atual[k] ?? '') !== String(reg[k] ?? ''));
    if (!mud.length) return json(res, 200, { ok: true });
    reg.atualizado_em = agoraIso(); reg.atualizado_por = u.login;
    const ks = Object.keys(reg);
    db.prepare(`UPDATE ocorrencias SET ${ks.map((k) => k + ' = ?').join(', ')} WHERE id = ?`).run(...ks.map((k) => reg[k]), atual.id);
    registrar(u.login, 'editou registro do diário', detalhe(atual, { ocorrencia: atual.id, campos: mud }));
    json(res, 200, { ok: true });
  });

  // Resolver (ou reabrir) uma ocorrência de atenção/grave — qualquer pessoa da equipe
  rota('PUT', '/api/ocorrencias/:id/resolver', async (req, res, { u, p }) => {
    const b = await corpoJson(req);
    const o = db.prepare(`${SELECT} WHERE o.id = ?`).get(+p.id) || falha(404, 'Registro não encontrado');
    if (b.reabrir) {
      db.prepare('UPDATE ocorrencias SET resolvida = 0, resolvida_em = NULL, resolvida_por = NULL, resolucao = NULL WHERE id = ?').run(o.id);
      registrar(u.login, 'reabriu ocorrência do diário', detalhe(o, { ocorrencia: o.id }));
    } else {
      const obs = String(b.resolucao || '').trim().slice(0, 2000) || null;
      db.prepare('UPDATE ocorrencias SET resolvida = 1, resolvida_em = ?, resolvida_por = ?, resolucao = ? WHERE id = ?').run(agoraIso(), u.login, obs, o.id);
      registrar(u.login, 'marcou ocorrência como resolvida', detalhe(o, { ocorrencia: o.id, obs }));
    }
    json(res, 200, { ok: true });
  });

  // Apagar: só a administração (registro de cuidado é documento; o normal é corrigir, não apagar)
  rota('DELETE', '/api/ocorrencias/:id', async (req, res, { u, p }) => {
    exigirAdmin(u);
    const o = db.prepare(`${SELECT} WHERE o.id = ?`).get(+p.id) || falha(404, 'Registro não encontrado');
    db.prepare('DELETE FROM ocorrencias WHERE id = ?').run(o.id);
    registrar(u.login, 'apagou registro do diário', detalhe(o, { ocorrencia: o.id, texto: o.texto.slice(0, 200) }));
    json(res, 200, { ok: true });
  });
};

module.exports.TIPOS = TIPOS;
module.exports.turnoDaHora = turnoDaHora;
