// Equipe: profissionais (do lar e de fora — o "corpo clínico" do Gerifácil) e a escala de turnos do mês.
// Qualquer pessoa vê; só a administração monta a escala e mexe no cadastro.
'use strict';

const FUNCOES = ['Médico(a)', 'Enfermeiro(a)', 'Técnico(a) de enfermagem', 'Cuidador(a)', 'Fisioterapeuta', 'Nutricionista', 'Psicólogo(a)',
  'Assistente social', 'Terapeuta ocupacional', 'Fonoaudiólogo(a)', 'Cozinha', 'Limpeza', 'Lavanderia', 'Administração', 'Voluntário(a)', 'Outro'];
const VINCULOS = ['Funcionário', 'Voluntário', 'Prestador de serviço', 'SUS / UBS', 'Outro'];
// Códigos da escala (provisórios — confirmar como são os plantões do Lar)
const CODIGOS = {
  M: { nome: 'Manhã', horas: '7h–13h', trabalha: true }, T: { nome: 'Tarde', horas: '13h–19h', trabalha: true }, N: { nome: 'Noite', horas: '19h–7h', trabalha: true },
  D: { nome: 'Plantão dia (12 h)', horas: '7h–19h', trabalha: true }, NN: { nome: 'Plantão noite (12 h)', horas: '19h–7h', trabalha: true },
  F: { nome: 'Folga', trabalha: false }, FE: { nome: 'Férias', trabalha: false }, AT: { nome: 'Atestado', trabalha: false },
};
// Padrões para preencher vários dias de uma vez
const PADROES = {
  '12x36_dia': { nome: '12x36 de dia (trabalha um dia, folga no outro)', ciclo: ['D', 'F'] },
  '12x36_noite': { nome: '12x36 de noite', ciclo: ['NN', 'F'] },
  '6x1_manha': { nome: 'Manhã, 6 dias e 1 de folga', ciclo: ['M', 'M', 'M', 'M', 'M', 'M', 'F'] },
  '6x1_tarde': { nome: 'Tarde, 6 dias e 1 de folga', ciclo: ['T', 'T', 'T', 'T', 'T', 'T', 'F'] },
  '5x2_manha': { nome: 'Manhã, segunda a sexta', semana: { 1: 'M', 2: 'M', 3: 'M', 4: 'M', 5: 'M', 6: 'F', 0: 'F' } },
};
const dataValida = (v) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v + 'T12:00:00'));
const somarDias = (iso, n) => { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n); return d.toLocaleDateString('sv-SE'); };

module.exports = function equipe(ctx) {
  const { rota, db, registrar, transacao, falha, conferirVersao, json, corpoJson, exigirAdmin, hoje, agoraIso } = ctx;

  function limpar(b, parcial) {
    const reg = {};
    const txt = (v, max = 120) => { const s = v == null ? null : String(v).trim() || null; if (s && s.length > max) falha(400, 'Texto longo demais'); return s; };
    if (!parcial || b.nome !== undefined) { reg.nome = txt(b.nome); if (!reg.nome) falha(400, 'Informe o nome'); }
    if (!parcial || b.funcao !== undefined) { reg.funcao = txt(b.funcao, 60); if (!reg.funcao) falha(400, 'Informe a função'); }
    if (!parcial || b.vinculo !== undefined) { const v = b.vinculo || 'Funcionário'; if (!VINCULOS.includes(v)) falha(400, 'Vínculo inválido'); reg.vinculo = v; }
    for (const k of ['registro', 'especialidade', 'telefone', 'email', 'obs']) if (b[k] !== undefined) reg[k] = txt(b[k], k === 'obs' ? 1000 : 120);
    if (reg.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(reg.email)) falha(400, 'E-mail inválido');
    for (const k of ['na_escala', 'ativo']) if (b[k] !== undefined) reg[k] = b[k] ? 1 : 0;
    return reg;
  }

  // Lista (?todos=1 inclui quem saiu; ?funcao=Médico para listas de escolha)
  rota('GET', '/api/profissionais', async (req, res, { url }) => {
    const q = url.searchParams;
    const onde = [], p = [];
    if (q.get('todos') !== '1') onde.push('ativo = 1');
    if (q.get('funcao')) { onde.push('funcao LIKE ?'); p.push(q.get('funcao') + '%'); }
    const itens = db.prepare(`SELECT * FROM profissionais ${onde.length ? 'WHERE ' + onde.join(' AND ') : ''} ORDER BY nome COLLATE NOCASE`).all(...p);
    json(res, 200, { itens, funcoes: FUNCOES, vinculos: VINCULOS });
  });

  rota('POST', '/api/profissionais', async (req, res, { u }) => {
    exigirAdmin(u);
    const reg = limpar(await corpoJson(req), false);
    if (reg.na_escala === undefined) reg.na_escala = ['Prestador de serviço', 'SUS / UBS'].includes(reg.vinculo) ? 0 : 1;
    const agora = agoraIso();
    Object.assign(reg, { criado_em: agora, criado_por: u.login, atualizado_em: agora, atualizado_por: u.login });
    const ks = Object.keys(reg);
    const id = Number(db.prepare(`INSERT INTO profissionais (${ks.join(', ')}) VALUES (${ks.map(() => '?').join(', ')})`).run(...ks.map((k) => reg[k])).lastInsertRowid);
    registrar(u.login, 'cadastrou profissional', { nome: reg.nome, funcao: reg.funcao });
    json(res, 201, { id });
  });

  rota('PUT', '/api/profissionais/:id', async (req, res, { u, p }) => {
    exigirAdmin(u);
    const b = await corpoJson(req);
    const atual = db.prepare('SELECT * FROM profissionais WHERE id = ?').get(+p.id) || falha(404, 'Profissional não encontrado');
    conferirVersao(atual, b, u);
    const reg = limpar(b, true);
    const mud = Object.keys(reg).filter((k) => String(atual[k] ?? '') !== String(reg[k] ?? ''));
    if (!mud.length) return json(res, 200, { ok: true });
    reg.atualizado_em = agoraIso(); reg.atualizado_por = u.login;
    const ks = Object.keys(reg);
    db.prepare(`UPDATE profissionais SET ${ks.map((k) => k + ' = ?').join(', ')} WHERE id = ?`).run(...ks.map((k) => reg[k]), atual.id);
    registrar(u.login, 'editou profissional', { nome: reg.nome || atual.nome, campos: mud });
    json(res, 200, { ok: true });
  });

  rota('DELETE', '/api/profissionais/:id', async (req, res, { u, p }) => {
    exigirAdmin(u);
    const atual = db.prepare('SELECT * FROM profissionais WHERE id = ?').get(+p.id) || falha(404, 'Profissional não encontrado');
    db.prepare('DELETE FROM profissionais WHERE id = ?').run(atual.id);
    registrar(u.login, 'apagou profissional (e a escala dele)', { nome: atual.nome });
    json(res, 200, { ok: true });
  });

  // Escala de um mês (?mes=AAAA-MM): quem está na escala e o código de cada dia
  rota('GET', '/api/escala', async (req, res, { url }) => {
    const mes = /^\d{4}-\d{2}$/.test(url.searchParams.get('mes') || '') ? url.searchParams.get('mes') : hoje().slice(0, 7);
    const ini = mes + '-01';
    const fim = somarDias(somarDias(ini, 32).slice(0, 7) + '-01', -1);
    // Enfermagem e cuidado primeiro (na ordem da lista FUNCOES), depois apoio
    const ordem = (f) => { const i = FUNCOES.indexOf(f); return i < 0 ? 99 : i; };
    const pessoas = db.prepare('SELECT id, nome, funcao, vinculo FROM profissionais WHERE ativo = 1 AND na_escala = 1').all()
      .sort((a, b) => ordem(a.funcao) - ordem(b.funcao) || a.nome.localeCompare(b.nome, 'pt-BR'));
    const dias = db.prepare('SELECT profissional_id, data, codigo, obs FROM escala WHERE data BETWEEN ? AND ?').all(ini, fim);
    json(res, 200, { mes, inicio: ini, fim, pessoas, dias, codigos: CODIGOS, padroes: Object.fromEntries(Object.entries(PADROES).map(([k, v]) => [k, v.nome])) });
  });

  // Quem trabalha hoje (para o Início)
  rota('GET', '/api/escala/hoje', async (req, res) => {
    const itens = db.prepare(`SELECT e.codigo, p.nome, p.funcao, p.telefone FROM escala e JOIN profissionais p ON p.id = e.profissional_id
      WHERE e.data = ? AND p.ativo = 1 ORDER BY p.funcao, p.nome`).all(hoje()).filter((i) => CODIGOS[i.codigo] && CODIGOS[i.codigo].trabalha);
    json(res, 200, { itens, codigos: CODIGOS });
  });

  // Um dia de uma pessoa (codigo vazio = apaga)
  rota('PUT', '/api/escala', async (req, res, { u }) => {
    exigirAdmin(u);
    const b = await corpoJson(req);
    const pr = db.prepare('SELECT id, nome, demo FROM profissionais WHERE id = ?').get(Number(b.profissional_id)) || falha(404, 'Profissional não encontrado');
    if (!dataValida(b.data || '')) falha(400, 'Data inválida');
    if (b.codigo && !CODIGOS[b.codigo]) falha(400, 'Código inválido');
    if (!b.codigo) db.prepare('DELETE FROM escala WHERE profissional_id = ? AND data = ?').run(pr.id, b.data);
    else db.prepare(`INSERT INTO escala (profissional_id, data, codigo, obs, criado_em, criado_por, demo) VALUES (?,?,?,?,?,?,?)
      ON CONFLICT(profissional_id, data) DO UPDATE SET codigo = excluded.codigo, obs = excluded.obs, criado_em = excluded.criado_em, criado_por = excluded.criado_por`)
      .run(pr.id, b.data, b.codigo, String(b.obs || '').trim().slice(0, 200) || null, agoraIso(), u.login, pr.demo);
    registrar(u.login, 'mudou a escala', { nome: pr.nome, data: b.data, codigo: b.codigo || 'apagado' });
    json(res, 200, { ok: true });
  });

  // Preencher vários dias com um padrão (12x36, 6x1…), a partir de uma data
  rota('POST', '/api/escala/padrao', async (req, res, { u }) => {
    exigirAdmin(u);
    const b = await corpoJson(req);
    const pr = db.prepare('SELECT id, nome, demo FROM profissionais WHERE id = ?').get(Number(b.profissional_id)) || falha(404, 'Profissional não encontrado');
    const padrao = PADROES[b.padrao] || falha(400, 'Escolha o padrão');
    if (!dataValida(b.inicio || '') || !dataValida(b.fim || '') || b.fim < b.inicio) falha(400, 'Período inválido');
    if ((Date.parse(b.fim) - Date.parse(b.inicio)) / 86400000 > 93) falha(400, 'No máximo 3 meses de uma vez');
    const ins = db.prepare(`INSERT INTO escala (profissional_id, data, codigo, criado_em, criado_por, demo) VALUES (?,?,?,?,?,?)
      ON CONFLICT(profissional_id, data) DO UPDATE SET codigo = excluded.codigo, criado_em = excluded.criado_em, criado_por = excluded.criado_por`);
    const agora = agoraIso();
    let n = 0;
    transacao(() => {
      for (let d = b.inicio, i = 0; d <= b.fim; d = somarDias(d, 1), i++) {
        const codigo = padrao.ciclo ? padrao.ciclo[i % padrao.ciclo.length] : padrao.semana[new Date(d + 'T12:00:00').getDay()];
        ins.run(pr.id, d, codigo, agora, u.login, pr.demo); n++;
      }
    });
    registrar(u.login, 'preencheu a escala com um padrão', { nome: pr.nome, padrao: padrao.nome, de: b.inicio, ate: b.fim });
    json(res, 200, { dias: n });
  });
};
