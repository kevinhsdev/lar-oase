// Remédios: prescrição de cada residente (remédio, dose, via, horários) e a folha do dia ("dei o remédio": quem e quando).
// No Gerifácil é a "Prescrição médica". ATENÇÃO: regras provisórias — validar com a enfermagem do Lar (ver HANDOFF §7.1).
'use strict';

const VIAS = ['Oral', 'Sublingual', 'Sonda', 'Tópica (pele)', 'Ocular (colírio)', 'Nasal', 'Inalatória', 'Subcutânea', 'Intramuscular', 'Retal', 'Outra'];
const SITUACOES = { dado: 'Dado', recusado: 'Recusou', nao_dado: 'Não foi dado' };
const MIN_ATRASO = 60;        // passou 1 hora do horário e não foi marcado = atrasado
const MIN_ANTECIPA = 120;     // dá para marcar até 2 horas antes do horário
const dataValida = (v) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v + 'T12:00:00'));
const horaValida = (v) => /^([01]\d|2[0-3]):[0-5]\d$/.test(v);
const minutos = (h) => Number(h.slice(0, 2)) * 60 + Number(h.slice(3, 5));
const horaAgora = () => { const d = new Date(); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
const turnoDe = (h) => { const n = Number(String(h).slice(0, 2)); return n >= 6 && n < 13 ? 'manha' : n >= 13 && n < 19 ? 'tarde' : 'noite'; };
const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// Ajuda (não substitui a conferência!): o nome do remédio bate com alguma alergia da ficha?
// "Dipirona" x "Dipirona 500 mg"; "Ácido acetilsalicílico (AAS)" x "AAS 100 mg".
function conflitoAlergia(medicamento, alergias) {
  if (!alergias) return null;
  const palavrasRemedio = norm(medicamento).split(/[^a-z0-9]+/).filter((p) => p.length >= 3);
  for (const termo of String(alergias).split(/[;,/\n]| e /)) {
    const t = norm(termo).trim();
    if (!t) continue;
    const chaves = [t.replace(/\(.*?\)/g, '').trim(), ...[...t.matchAll(/\((.*?)\)/g)].map((m) => m[1].trim())].filter((c) => c.length >= 3);
    for (const c of chaves) {
      const pal = c.split(/[^a-z0-9]+/).filter((p) => p.length >= 3);
      if (norm(medicamento).includes(c) || pal.some((p) => palavrasRemedio.includes(p) && p.length >= 4) || (c.length <= 5 && palavrasRemedio.includes(c))) return termo.trim();
    }
  }
  return null;
}

module.exports = function remedios(ctx) {
  const { rota, db, registrar, falha, conferirVersao, json, corpoJson, exigirAdmin, hoje, agoraIso } = ctx;

  const SELECT = `SELECT p.*, r.nome residente_nome, r.apelido residente_apelido, r.quarto residente_quarto, r.alergias residente_alergias,
      r.situacao residente_situacao, u.nome autor_nome FROM prescricoes p JOIN residentes r ON r.id = p.residente_id LEFT JOIN usuarios u ON u.login = p.criado_por`;
  const comAviso = (p) => ({ ...p, alergia: conflitoAlergia(p.medicamento, p.residente_alergias) });

  function limpar(b, parcial) {
    const reg = {};
    const txt = (v, max = 500) => { const s = v == null ? null : String(v).trim() || null; if (s && s.length > max) falha(400, 'Texto longo demais'); return s; };
    if (!parcial || b.residente_id !== undefined) {
      reg.residente_id = Number(b.residente_id);
      if (!db.prepare('SELECT 1 FROM residentes WHERE id = ?').get(reg.residente_id)) falha(400, 'Escolha o residente');
    }
    if (!parcial || b.medicamento !== undefined) { reg.medicamento = txt(b.medicamento, 120); if (!reg.medicamento) falha(400, 'Escreva o nome do remédio e a concentração (ex.: Losartana 50 mg)'); }
    if (!parcial || b.dose !== undefined) { reg.dose = txt(b.dose, 80); if (!reg.dose) falha(400, 'Escreva a dose (ex.: 1 comprimido, 10 gotas)'); }
    if (!parcial || b.via !== undefined) { if (!VIAS.includes(b.via)) falha(400, 'Escolha a via'); reg.via = b.via; }
    if (!parcial || b.se_necessario !== undefined) reg.se_necessario = b.se_necessario ? 1 : 0;
    if (!parcial || b.horarios !== undefined) {
      const hs = [...new Set(String(b.horarios || '').split(/[,;\s]+/).filter(Boolean))].sort();
      for (const h of hs) if (!horaValida(h)) falha(400, `Horário inválido: ${h} (use HH:MM)`);
      if (hs.length > 12) falha(400, 'Horários demais');
      reg.horarios = hs.join(',') || null;
    }
    const sos = 'se_necessario' in reg ? reg.se_necessario : undefined;
    if (sos === 1) reg.horarios = null;
    if (sos === 0 && 'horarios' in reg && !reg.horarios) falha(400, 'Informe pelo menos um horário (ou marque "se necessário")');
    for (const k of ['condicao', 'prescritor', 'obs']) if (b[k] !== undefined) reg[k] = txt(b[k]);
    if (!parcial || b.inicio !== undefined) { const i = b.inicio || hoje(); if (!dataValida(i)) falha(400, 'Data de início inválida'); reg.inicio = i; }
    if (b.fim !== undefined) { reg.fim = b.fim || null; if (reg.fim && !dataValida(reg.fim)) falha(400, 'Data de fim inválida'); }
    if (reg.fim && reg.inicio && reg.fim < reg.inicio) falha(400, 'O fim precisa ser depois do início');
    return reg;
  }

  // Prescrições (?residente=, ?todas=1 inclui as suspensas e encerradas)
  rota('GET', '/api/prescricoes', async (req, res, { url }) => {
    const q = url.searchParams;
    const onde = [], p = [];
    if (q.get('residente')) { onde.push('p.residente_id = ?'); p.push(Number(q.get('residente'))); }
    if (q.get('todas') !== '1') { onde.push('p.ativa = 1 AND (p.fim IS NULL OR p.fim >= ?)'); p.push(hoje()); }
    const itens = db.prepare(`${SELECT} ${onde.length ? 'WHERE ' + onde.join(' AND ') : ''} ORDER BY r.nome COLLATE NOCASE, p.se_necessario, p.horarios, p.medicamento`).all(...p).map(comAviso);
    json(res, 200, { itens, vias: VIAS });
  });

  rota('POST', '/api/prescricoes', async (req, res, { u }) => {
    const reg = limpar(await corpoJson(req), false);
    const r = db.prepare('SELECT nome, alergias, demo FROM residentes WHERE id = ?').get(reg.residente_id);
    const agora = agoraIso();
    Object.assign(reg, { criado_em: agora, criado_por: u.login, atualizado_em: agora, atualizado_por: u.login, demo: r.demo });
    const ks = Object.keys(reg);
    const id = Number(db.prepare(`INSERT INTO prescricoes (${ks.join(', ')}) VALUES (${ks.map(() => '?').join(', ')})`).run(...ks.map((k) => reg[k])).lastInsertRowid);
    const alergia = conflitoAlergia(reg.medicamento, r.alergias);
    registrar(u.login, `cadastrou prescrição: ${reg.medicamento}`, { residente_id: reg.residente_id, nome: r.nome, prescricao: id, dose: reg.dose, horarios: reg.horarios, alergia });
    json(res, 201, { id, alergia });
  });

  // Editar. Mudar remédio, dose, via ou horários de uma prescrição que já foi usada é recusado:
  // o certo é suspender e criar outra (assim a folha dos dias passados continua mostrando o que valia naquele dia).
  rota('PUT', '/api/prescricoes/:id', async (req, res, { u, p }) => {
    const b = await corpoJson(req);
    const atual = db.prepare(`${SELECT} WHERE p.id = ?`).get(+p.id) || falha(404, 'Prescrição não encontrada');
    conferirVersao(atual, b, u);
    const reg = limpar(b, true);
    delete reg.residente_id;
    const mud = Object.keys(reg).filter((k) => String(atual[k] ?? '') !== String(reg[k] ?? ''));
    if (!mud.length) return json(res, 200, { ok: true });
    const essenciais = mud.filter((k) => ['medicamento', 'dose', 'via', 'horarios', 'se_necessario', 'inicio'].includes(k));
    if (essenciais.length && db.prepare('SELECT 1 FROM administracoes WHERE prescricao_id = ? LIMIT 1').get(atual.id)) {
      falha(400, 'Esta prescrição já foi usada na folha. Para mudar remédio, dose, via ou horário: suspenda esta e cadastre uma nova (o histórico fica certo).');
    }
    reg.atualizado_em = agoraIso(); reg.atualizado_por = u.login;
    const ks = Object.keys(reg);
    db.prepare(`UPDATE prescricoes SET ${ks.map((k) => k + ' = ?').join(', ')} WHERE id = ?`).run(...ks.map((k) => reg[k]), atual.id);
    registrar(u.login, `editou prescrição: ${atual.medicamento}`, { residente_id: atual.residente_id, nome: atual.residente_nome, prescricao: atual.id, campos: mud });
    json(res, 200, { ok: true });
  });

  // Suspender (médico mandou parar) ou reativar
  rota('PUT', '/api/prescricoes/:id/suspender', async (req, res, { u, p }) => {
    const b = await corpoJson(req);
    const atual = db.prepare(`${SELECT} WHERE p.id = ?`).get(+p.id) || falha(404, 'Prescrição não encontrada');
    if (b.reativar) {
      db.prepare('UPDATE prescricoes SET ativa = 1, suspensa_em = NULL, suspensa_por = NULL, motivo_suspensao = NULL, atualizado_em = ?, atualizado_por = ? WHERE id = ?').run(agoraIso(), u.login, atual.id);
      registrar(u.login, `reativou prescrição: ${atual.medicamento}`, { residente_id: atual.residente_id, nome: atual.residente_nome, prescricao: atual.id });
    } else {
      const motivo = String(b.motivo || '').trim().slice(0, 500);
      if (!motivo) falha(400, 'Diga o motivo (ex.: médico suspendeu na consulta de 30/09)');
      db.prepare('UPDATE prescricoes SET ativa = 0, suspensa_em = ?, suspensa_por = ?, motivo_suspensao = ?, atualizado_em = ?, atualizado_por = ? WHERE id = ?')
        .run(agoraIso(), u.login, motivo, agoraIso(), u.login, atual.id);
      registrar(u.login, `suspendeu prescrição: ${atual.medicamento}`, { residente_id: atual.residente_id, nome: atual.residente_nome, prescricao: atual.id, motivo });
    }
    json(res, 200, { ok: true });
  });

  // Apagar de vez (com a folha dela): só a administração, para prescrição cadastrada por engano
  rota('DELETE', '/api/prescricoes/:id', async (req, res, { u, p }) => {
    exigirAdmin(u);
    const atual = db.prepare(`${SELECT} WHERE p.id = ?`).get(+p.id) || falha(404, 'Prescrição não encontrada');
    db.prepare('DELETE FROM prescricoes WHERE id = ?').run(atual.id);
    registrar(u.login, `apagou prescrição: ${atual.medicamento}`, { residente_id: atual.residente_id, nome: atual.residente_nome, prescricao: atual.id });
    json(res, 200, { ok: true });
  });

  // A folha de um dia: cada remédio em cada horário, com o que já foi marcado
  function folha(data) {
    const pres = db.prepare(`${SELECT} WHERE r.situacao = 'no_lar' AND p.inicio <= ? AND (p.fim IS NULL OR p.fim >= ?)
        AND (p.ativa = 1 OR substr(p.suspensa_em, 1, 10) > ?)`).all(data, data, data).map(comAviso);
    const adms = db.prepare(`SELECT a.*, u.nome autor_nome FROM administracoes a LEFT JOIN usuarios u ON u.login = a.criado_por WHERE a.data = ? ORDER BY a.hora_real, a.id`).all(data);
    const marcada = new Map(adms.filter((a) => a.horario).map((a) => [a.prescricao_id + '|' + a.horario, a]));
    const h = hoje(), agora = minutos(horaAgora());
    const itens = [];
    for (const p of pres.filter((x) => !x.se_necessario)) {
      for (const horario of String(p.horarios || '').split(',').filter(Boolean)) {
        const adm = marcada.get(p.id + '|' + horario) || null;
        let estado = adm ? adm.situacao : 'pendente';
        if (!adm && (data < h || (data === h && agora - minutos(horario) > MIN_ATRASO))) estado = data < h ? 'sem_registro' : 'atrasado';
        itens.push({ ...p, horario, turno: turnoDe(horario), adm, estado });
      }
    }
    itens.sort((a, b) => a.horario.localeCompare(b.horario) || a.residente_nome.localeCompare(b.residente_nome, 'pt-BR'));
    const sos = pres.filter((x) => x.se_necessario).map((p) => ({ ...p, dadas: adms.filter((a) => a.prescricao_id === p.id) }));
    const conta = (e) => itens.filter((i) => i.estado === e).length;
    return { data, itens, sos, resumo: { total: itens.length, dado: conta('dado'), recusado: conta('recusado'), nao_dado: conta('nao_dado'), pendente: conta('pendente'), atrasado: conta('atrasado'), sem_registro: conta('sem_registro') } };
  }

  rota('GET', '/api/medicacao', async (req, res, { url }) => {
    const data = url.searchParams.get('data') || hoje();
    if (!dataValida(data)) falha(400, 'Data inválida');
    json(res, 200, { ...folha(data), situacoes: SITUACOES, min_atraso: MIN_ATRASO });
  });
  rota('GET', '/api/medicacao/resumo', async (req, res) => json(res, 200, folha(hoje()).resumo));

  // Marcar: dado, recusou ou não foi dado. Um horário só pode ser marcado uma vez (evita dar em dobro).
  rota('POST', '/api/medicacao', async (req, res, { u }) => {
    const b = await corpoJson(req);
    const p = db.prepare(`${SELECT} WHERE p.id = ?`).get(Number(b.prescricao_id)) || falha(404, 'Prescrição não encontrada');
    const data = b.data || hoje();
    if (!dataValida(data)) falha(400, 'Data inválida');
    if (data > hoje()) falha(400, 'Não dá para marcar um dia que ainda não chegou');
    if (!SITUACOES[b.situacao]) falha(400, 'Situação inválida');
    const horario = p.se_necessario ? null : b.horario;
    if (!p.se_necessario) {
      if (!String(p.horarios || '').split(',').includes(horario)) falha(400, 'Esse horário não está na prescrição');
      if (data === hoje() && minutos(horario) - minutos(horaAgora()) > MIN_ANTECIPA) falha(400, `Ainda não é hora: este remédio é das ${horario}.`);
      const ja = db.prepare('SELECT a.*, u.nome autor_nome FROM administracoes a LEFT JOIN usuarios u ON u.login = a.criado_por WHERE a.prescricao_id = ? AND a.data = ? AND a.horario = ?').get(p.id, data, horario);
      if (ja) falha(409, `Já foi marcado: ${SITUACOES[ja.situacao].toLowerCase()} por ${ja.autor_nome || ja.criado_por}${ja.hora_real ? ' às ' + ja.hora_real : ''}. Confira antes de dar de novo.`);
    }
    if (p.inicio > data || (p.fim && p.fim < data)) falha(400, 'A prescrição não vale neste dia');
    const motivo = String(b.motivo || '').trim().slice(0, 500) || null;
    if (b.situacao !== 'dado' && !motivo) falha(400, 'Diga o motivo (ex.: recusou, estava dormindo, vomitou, está no hospital)');
    if (p.se_necessario && b.situacao === 'dado' && !motivo) falha(400, 'Diga por que precisou (ex.: dor de cabeça, febre de 38 °C)');
    const hora = b.hora_real || (data === hoje() ? horaAgora() : horario);
    if (hora && !horaValida(hora)) falha(400, 'Hora inválida');
    const id = Number(db.prepare(`INSERT INTO administracoes (prescricao_id, data, horario, situacao, hora_real, motivo, criado_em, criado_por, demo) VALUES (?,?,?,?,?,?,?,?,?)`)
      .run(p.id, data, horario, b.situacao, hora || null, motivo, agoraIso(), u.login, p.demo).lastInsertRowid);
    registrar(u.login, `remédio ${SITUACOES[b.situacao].toLowerCase()}: ${p.medicamento}${horario ? ' das ' + horario : ' (se necessário)'}`,
      { residente_id: p.residente_id, nome: p.residente_nome, prescricao: p.id, administracao: id, data, motivo });
    json(res, 201, { id });
  });

  // Desfazer uma marcação errada: quem marcou (no mesmo dia) ou a administração
  rota('DELETE', '/api/medicacao/:id', async (req, res, { u, p }) => {
    const a = db.prepare(`SELECT a.*, p.medicamento, p.residente_id, r.nome residente_nome FROM administracoes a JOIN prescricoes p ON p.id = a.prescricao_id
      JOIN residentes r ON r.id = p.residente_id WHERE a.id = ?`).get(+p.id) || falha(404, 'Marcação não encontrada');
    const mesmoDia = a.criado_em && new Date(a.criado_em).toLocaleDateString('sv-SE') === hoje();
    if (u.perfil !== 'admin' && !(a.criado_por === u.login && mesmoDia)) falha(403, 'Só quem marcou (no mesmo dia) ou a administração pode desfazer');
    db.prepare('DELETE FROM administracoes WHERE id = ?').run(a.id);
    registrar(u.login, `desfez marcação de remédio: ${a.medicamento}${a.horario ? ' das ' + a.horario : ''}`, { residente_id: a.residente_id, nome: a.residente_nome, data: a.data, situacao: a.situacao });
    json(res, 200, { ok: true });
  });
};

module.exports.conflitoAlergia = conflitoAlergia;
