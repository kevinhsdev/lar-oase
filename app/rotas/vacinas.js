// Vacinas: o cartão de vacina de cada residente, campanhas (vacinar vários de uma vez) e aviso de dose atrasada.
// No Gerifácil é a "Gestão de imunizações". Prazos pelo calendário do idoso do Ministério da Saúde (conferir a cada campanha).
'use strict';

// Vacinas mais comuns para idosos. "a cada" = de quantos em quantos dias repetir (null = segue a "próxima dose" que o posto anotar).
const VACINAS = {
  'Influenza (gripe)': { cada: 365, dica: 'Uma dose por ano, na campanha (abril a junho).' },
  'Covid-19': { cada: 180, dica: 'Idosos: reforço a cada 6 meses (conferir a orientação atual do posto).' },
  'Pneumocócica 23 (pneumonia)': { cada: null, dica: 'Dose única com reforço após 5 anos, conforme indicação.' },
  'Dupla adulto dT (difteria e tétano)': { cada: 3650, dica: 'Reforço a cada 10 anos.' },
  'Hepatite B': { cada: null, dica: '3 doses (0, 1 e 6 meses) se nunca tomou.' },
  'Febre amarela': { cada: null, dica: 'Conforme avaliação médica.' },
  'Herpes zóster': { cada: null, dica: 'Rede particular; 2 doses.' },
  'VSR (vírus sincicial respiratório)': { cada: null, dica: 'Conforme indicação.' },
};
const PRINCIPAIS = ['Influenza (gripe)', 'Covid-19', 'Pneumocócica 23 (pneumonia)', 'Dupla adulto dT (difteria e tétano)', 'Hepatite B'];
const DOSES = ['Dose única', '1ª dose', '2ª dose', '3ª dose', 'Reforço', 'Dose anual'];
const DIAS_AVISO = 30;
const dataValida = (v) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v + 'T12:00:00'));
const somarDias = (iso, n) => { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n); return d.toLocaleDateString('sv-SE'); };

module.exports = function vacinas(ctx) {
  const { rota, db, registrar, transacao, falha, conferirVersao, json, corpoJson, hoje, agoraIso } = ctx;

  // Quando vence a próxima dose de uma vacina: o que o posto anotou, senão a regra do calendário
  function situacao(ultima) {
    const regra = VACINAS[ultima.vacina];
    const vence = ultima.proxima_dose || (regra && regra.cada ? somarDias(ultima.data, regra.cada) : null);
    if (!vence) return { vence: null, estado: 'em_dia' };
    const h = hoje();
    return { vence, estado: vence < h ? 'atrasada' : vence <= somarDias(h, DIAS_AVISO) ? 'vencendo' : 'em_dia' };
  }

  function limpar(b, parcial) {
    const reg = {};
    const txt = (v, max = 200) => { const s = v == null ? null : String(v).trim() || null; if (s && s.length > max) falha(400, 'Texto longo demais'); return s; };
    if (!parcial || b.vacina !== undefined) { reg.vacina = txt(b.vacina, 80); if (!reg.vacina) falha(400, 'Escolha a vacina'); }
    if (b.dose !== undefined) reg.dose = txt(b.dose, 40);
    if (!parcial || b.data !== undefined) {
      if (!dataValida(b.data || '')) falha(400, 'Data da aplicação inválida');
      if (b.data > hoje()) falha(400, 'A data da aplicação não pode estar no futuro');
      reg.data = b.data;
    }
    for (const k of ['lote', 'local', 'aplicador', 'obs']) if (b[k] !== undefined) reg[k] = txt(b[k], k === 'obs' ? 1000 : 120);
    if (b.proxima_dose !== undefined) {
      reg.proxima_dose = b.proxima_dose || null;
      if (reg.proxima_dose && !dataValida(reg.proxima_dose)) falha(400, 'Data da próxima dose inválida');
      if (reg.proxima_dose && reg.data && reg.proxima_dose <= reg.data) falha(400, 'A próxima dose precisa ser depois da aplicação');
    }
    return reg;
  }

  // Painel: cada residente no lar com a última dose de cada vacina e os avisos; mais a campanha da gripe do ano
  rota('GET', '/api/vacinas/painel', async (req, res) => {
    const residentes = db.prepare("SELECT id, nome, apelido, quarto FROM residentes WHERE situacao IN ('no_lar','hospitalizado') ORDER BY nome COLLATE NOCASE").all();
    const todas = db.prepare(`SELECT v.* FROM vacinas v JOIN residentes r ON r.id = v.residente_id WHERE r.situacao IN ('no_lar','hospitalizado') ORDER BY v.data, v.id`).all();
    const ano = hoje().slice(0, 4);
    const linhas = residentes.map((r) => {
      const ultimas = {};
      for (const v of todas.filter((x) => x.residente_id === r.id)) ultimas[v.vacina] = v; // fica a mais recente
      const avisos = Object.values(ultimas).map((u) => ({ vacina: u.vacina, ...situacao(u) })).filter((a) => a.estado !== 'em_dia');
      return { ...r, ultimas: Object.fromEntries(Object.entries(ultimas).map(([k, u]) => [k, { data: u.data, dose: u.dose, ...situacao(u) }])), avisos };
    });
    const gripe = todas.filter((v) => v.vacina === 'Influenza (gripe)' && v.data.startsWith(ano));
    json(res, 200, {
      linhas, principais: PRINCIPAIS, vacinas: VACINAS, doses: DOSES,
      campanha: { ano, vacinados: new Set(gripe.map((v) => v.residente_id)).size, total: residentes.length },
      avisos: linhas.reduce((s, l) => s + l.avisos.length, 0),
    });
  });

  // Cartão de vacina de um residente (todas as doses)
  rota('GET', '/api/vacinas', async (req, res, { url }) => {
    const rid = Number(url.searchParams.get('residente'));
    const r = db.prepare('SELECT id, nome, apelido FROM residentes WHERE id = ?').get(rid) || falha(404, 'Residente não encontrado');
    const itens = db.prepare('SELECT v.*, u.nome autor_nome FROM vacinas v LEFT JOIN usuarios u ON u.login = v.criado_por WHERE v.residente_id = ? ORDER BY v.data DESC, v.id DESC').all(r.id);
    const ultimas = {};
    for (const v of [...itens].reverse()) ultimas[v.vacina] = v;
    json(res, 200, { residente: r, itens, situacao: Object.fromEntries(Object.entries(ultimas).map(([k, u]) => [k, situacao(u)])), vacinas: VACINAS, doses: DOSES });
  });

  rota('POST', '/api/vacinas', async (req, res, { u }) => {
    const b = await corpoJson(req);
    const reg = limpar(b, false);
    // Campanha: a mesma vacina para vários residentes de uma vez
    const ids = Array.isArray(b.residentes) ? b.residentes.map(Number) : [Number(b.residente_id)];
    if (!ids.length || ids.some((i) => !i)) falha(400, 'Escolha o(s) residente(s)');
    const rs = ids.map((i) => db.prepare('SELECT id, nome, demo FROM residentes WHERE id = ?').get(i) || falha(400, 'Residente não encontrado'));
    const agora = agoraIso();
    const criados = transacao(() => rs.map((r) => {
      const linha = { ...reg, residente_id: r.id, criado_em: agora, criado_por: u.login, atualizado_em: agora, atualizado_por: u.login, demo: r.demo };
      const ks = Object.keys(linha);
      return Number(db.prepare(`INSERT INTO vacinas (${ks.join(', ')}) VALUES (${ks.map(() => '?').join(', ')})`).run(...ks.map((k) => linha[k])).lastInsertRowid);
    }));
    for (const r of rs) registrar(u.login, `registrou vacina: ${reg.vacina}`, { residente_id: r.id, nome: r.nome, data: reg.data, dose: reg.dose });
    json(res, 201, { ids: criados });
  });

  rota('PUT', '/api/vacinas/:id', async (req, res, { u, p }) => {
    const b = await corpoJson(req);
    const atual = db.prepare('SELECT v.*, r.nome residente_nome FROM vacinas v JOIN residentes r ON r.id = v.residente_id WHERE v.id = ?').get(+p.id) || falha(404, 'Registro não encontrado');
    conferirVersao(atual, b, u);
    const reg = limpar({ ...b, data: b.data ?? atual.data }, true);
    const mud = Object.keys(reg).filter((k) => String(atual[k] ?? '') !== String(reg[k] ?? ''));
    if (!mud.length) return json(res, 200, { ok: true });
    reg.atualizado_em = agoraIso(); reg.atualizado_por = u.login;
    const ks = Object.keys(reg);
    db.prepare(`UPDATE vacinas SET ${ks.map((k) => k + ' = ?').join(', ')} WHERE id = ?`).run(...ks.map((k) => reg[k]), atual.id);
    registrar(u.login, `corrigiu vacina: ${atual.vacina}`, { residente_id: atual.residente_id, nome: atual.residente_nome, campos: mud });
    json(res, 200, { ok: true });
  });

  // Apagar (registro errado): quem registrou ou a administração
  rota('DELETE', '/api/vacinas/:id', async (req, res, { u, p }) => {
    const v = db.prepare('SELECT v.*, r.nome residente_nome FROM vacinas v JOIN residentes r ON r.id = v.residente_id WHERE v.id = ?').get(+p.id) || falha(404, 'Registro não encontrado');
    if (u.perfil !== 'admin' && v.criado_por !== u.login) falha(403, 'Só quem registrou (ou a administração) pode apagar');
    db.prepare('DELETE FROM vacinas WHERE id = ?').run(v.id);
    registrar(u.login, `apagou registro de vacina: ${v.vacina}`, { residente_id: v.residente_id, nome: v.residente_nome, data: v.data });
    json(res, 200, { ok: true });
  });
};
