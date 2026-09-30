// Sinais vitais: a ronda do dia (vários residentes de uma vez), avisos de valor fora do normal e o histórico para os gráficos.
// Junta também os sinais anotados no Diário. Faixas de referência PROVISÓRIAS para idosos — validar com a enfermagem.
'use strict';

// [mínimo, máximo] possível (para pegar erro de digitação) e a faixa "normal" (fora dela = aviso)
const MEDIDAS = {
  pa_sist: { nome: 'Pressão (máxima)', unidade: 'mmHg', possivel: [60, 260], normal: [90, 150] },
  pa_diast: { nome: 'Pressão (mínima)', unidade: 'mmHg', possivel: [30, 160], normal: [60, 95] },
  temperatura: { nome: 'Temperatura', unidade: '°C', possivel: [30, 45], normal: [35.5, 37.7], decimal: true },
  glicemia: { nome: 'Glicemia', unidade: 'mg/dL', possivel: [10, 900], normal: [70, 250] },
  saturacao: { nome: 'Saturação', unidade: '%', possivel: [50, 100], normal: [92, 100] },
  fc: { nome: 'Batimentos', unidade: 'bpm', possivel: [20, 250], normal: [50, 110] },
  peso: { nome: 'Peso', unidade: 'kg', possivel: [20, 250], normal: null, decimal: true },
  dor: { nome: 'Dor (0 a 10)', unidade: '', possivel: [0, 10], normal: [0, 3] },
};
const dataValida = (v) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v + 'T12:00:00'));
const horaValida = (v) => /^([01]\d|2[0-3]):[0-5]\d$/.test(v);
const somarDias = (iso, n) => { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n); return d.toLocaleDateString('sv-SE'); };
// Quais medidas de uma leitura estão fora do normal
const foraDoNormal = (s) => Object.entries(MEDIDAS).filter(([k, m]) => m.normal && s[k] != null && (s[k] < m.normal[0] || s[k] > m.normal[1])).map(([k]) => k);

module.exports = function sinais(ctx) {
  const { rota, db, registrar, transacao, falha, json, corpoJson, hoje, agoraIso } = ctx;

  function limpar(b) {
    const reg = {};
    if (b.pa !== undefined && String(b.pa).trim()) { // "120x80" também vale
      const m = String(b.pa).trim().match(/^(\d{2,3})\s*[x/]\s*(\d{2,3})$/i);
      if (!m) falha(400, 'Pressão: escreva como 120x80');
      b.pa_sist = m[1]; b.pa_diast = m[2];
    }
    for (const [k, m] of Object.entries(MEDIDAS)) {
      if (b[k] === undefined || b[k] === '' || b[k] == null) continue;
      const n = Number(String(b[k]).replace(',', '.'));
      if (!Number.isFinite(n) || n < m.possivel[0] || n > m.possivel[1]) falha(400, `${m.nome}: ${b[k]} parece errado (o possível é de ${m.possivel[0]} a ${m.possivel[1]}). Confira o número.`);
      reg[k] = m.decimal ? Math.round(n * 10) / 10 : Math.round(n);
    }
    if ((reg.pa_sist == null) !== (reg.pa_diast == null)) falha(400, 'Pressão: informe a máxima e a mínima (ex.: 120x80)');
    if (reg.pa_sist != null && reg.pa_diast >= reg.pa_sist) falha(400, 'Pressão: a mínima precisa ser menor que a máxima');
    if (!Object.keys(reg).length) falha(400, 'Preencha pelo menos uma medida');
    return reg;
  }

  // Histórico de um residente (?residente=&dias=30): leituras da ronda + sinais anotados no Diário
  rota('GET', '/api/sinais', async (req, res, { url }) => {
    const rid = Number(url.searchParams.get('residente'));
    const r = db.prepare('SELECT id, nome, apelido FROM residentes WHERE id = ?').get(rid) || falha(404, 'Residente não encontrado');
    const dias = Math.min(365, Math.max(1, Number(url.searchParams.get('dias')) || 30));
    const desde = somarDias(hoje(), -dias + 1);
    const ronda = db.prepare(`SELECT s.*, u.nome autor_nome, 'ronda' origem FROM sinais s LEFT JOIN usuarios u ON u.login = s.criado_por
      WHERE s.residente_id = ? AND s.data >= ? ORDER BY s.data, s.hora`).all(r.id, desde);
    const diario = db.prepare(`SELECT o.id, o.data, o.hora, o.pa, o.temperatura, o.glicemia, o.saturacao, o.freq_cardiaca fc, u.nome autor_nome, o.criado_por, 'diario' origem
      FROM ocorrencias o LEFT JOIN usuarios u ON u.login = o.criado_por WHERE o.residente_id = ? AND o.data >= ?
      AND (o.pa IS NOT NULL OR o.temperatura IS NOT NULL OR o.glicemia IS NOT NULL OR o.saturacao IS NOT NULL OR o.freq_cardiaca IS NOT NULL)`).all(r.id, desde)
      .map((o) => { const [s, d] = String(o.pa || '').split('x').map(Number); return { ...o, pa_sist: s || null, pa_diast: d || null }; });
    const itens = [...ronda, ...diario].sort((a, b) => (a.data + a.hora).localeCompare(b.data + b.hora)).map((s) => ({ ...s, fora: foraDoNormal(s) }));
    json(res, 200, { residente: r, dias, desde, itens, medidas: MEDIDAS });
  });

  // A ronda de um dia: cada residente no lar com o que já foi medido naquele dia
  rota('GET', '/api/sinais/ronda', async (req, res, { url }) => {
    const data = dataValida(url.searchParams.get('data') || '') ? url.searchParams.get('data') : hoje();
    const residentes = db.prepare("SELECT id, nome, apelido, quarto FROM residentes WHERE situacao = 'no_lar' ORDER BY CAST(quarto AS INTEGER), quarto, nome COLLATE NOCASE").all();
    const leituras = db.prepare('SELECT s.*, u.nome autor_nome FROM sinais s LEFT JOIN usuarios u ON u.login = s.criado_por WHERE s.data = ? ORDER BY s.hora').all(data);
    const linhas = residentes.map((r) => {
      const ls = leituras.filter((l) => l.residente_id === r.id).map((l) => ({ ...l, fora: foraDoNormal(l) }));
      return { ...r, leituras: ls };
    });
    const alertas = linhas.flatMap((l) => l.leituras.filter((x) => x.fora.length).map((x) => ({ residente_id: l.id, nome: l.apelido || l.nome, hora: x.hora, fora: x.fora, leitura: x })));
    json(res, 200, { data, linhas, medidas: MEDIDAS, medidos: linhas.filter((l) => l.leituras.length).length, alertas });
  });

  // Salvar: uma leitura ou a ronda inteira ({ leituras: [...] }) de uma vez
  rota('POST', '/api/sinais', async (req, res, { u }) => {
    const b = await corpoJson(req);
    const lista = Array.isArray(b.leituras) ? b.leituras : [b];
    if (!lista.length || lista.length > 200) falha(400, 'Nada para salvar');
    const data = b.data || hoje();
    if (!dataValida(data) || data > hoje()) falha(400, 'Data inválida');
    const hora = b.hora || new Date().toTimeString().slice(0, 5);
    if (!horaValida(hora)) falha(400, 'Hora inválida');
    const prontas = lista.map((l) => {
      const r = db.prepare('SELECT id, nome, demo FROM residentes WHERE id = ?').get(Number(l.residente_id)) || falha(400, 'Residente não encontrado');
      let reg;
      try { reg = limpar({ ...l }); } catch (e) { e.message = `${r.nome}: ${e.message}`; throw e; }
      return { r, reg, obs: String(l.obs || '').trim().slice(0, 300) || null };
    });
    const agora = agoraIso();
    const ids = transacao(() => prontas.map(({ r, reg, obs }) => {
      const linha = { residente_id: r.id, data, hora: l0(lista, r.id, hora), ...reg, obs, criado_em: agora, criado_por: u.login, demo: r.demo };
      const ks = Object.keys(linha);
      return Number(db.prepare(`INSERT INTO sinais (${ks.join(', ')}) VALUES (${ks.map(() => '?').join(', ')})`).run(...ks.map((k) => linha[k])).lastInsertRowid);
    }));
    const alertas = prontas.filter(({ reg }) => foraDoNormal(reg).length).map(({ r, reg }) => ({ nome: r.nome, fora: foraDoNormal(reg) }));
    for (const { r, reg } of prontas) registrar(u.login, 'anotou sinais vitais', { residente_id: r.id, nome: r.nome, ...reg });
    json(res, 201, { ids, alertas });
  });
  // Hora de cada leitura: a da linha (se veio) ou a da ronda
  const l0 = (lista, rid, hora) => { const l = lista.find((x) => Number(x.residente_id) === rid); return l && horaValida(l.hora || '') ? l.hora : hora; };

  // Apagar leitura errada: quem anotou (no mesmo dia) ou a administração
  rota('DELETE', '/api/sinais/:id', async (req, res, { u, p }) => {
    const s = db.prepare('SELECT s.*, r.nome FROM sinais s JOIN residentes r ON r.id = s.residente_id WHERE s.id = ?').get(+p.id) || falha(404, 'Leitura não encontrada');
    const mesmoDia = s.criado_em && new Date(s.criado_em).toLocaleDateString('sv-SE') === hoje();
    if (u.perfil !== 'admin' && !(s.criado_por === u.login && mesmoDia)) falha(403, 'Só quem anotou (no mesmo dia) ou a administração pode apagar');
    db.prepare('DELETE FROM sinais WHERE id = ?').run(s.id);
    registrar(u.login, 'apagou leitura de sinais vitais', { residente_id: s.residente_id, nome: s.nome, data: s.data, hora: s.hora });
    json(res, 200, { ok: true });
  });
};

module.exports.MEDIDAS = MEDIDAS;
