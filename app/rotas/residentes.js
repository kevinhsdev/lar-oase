// Residentes: a ficha de cada idoso (dados pessoais, saúde, quarto) e os familiares/contatos.
'use strict';

const SITUACOES = { no_lar: 'No lar', hospitalizado: 'Hospitalizado(a)', saiu: 'Saiu do lar', faleceu: 'Faleceu' };
const GRAUS = ['I', 'II', 'III']; // grau de dependência (RDC 502/2021 da Anvisa)
const SEXOS = ['F', 'M'];
const TIPOS_SANGUE = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

// Só estes campos podem vir da tela. Situação tem rota própria (guarda data e motivo).
const CAMPOS = ['nome', 'apelido', 'sexo', 'dt_nasc', 'cpf', 'rg', 'cartao_sus', 'estado_civil', 'religiao', 'naturalidade',
  'dt_entrada', 'quarto', 'leito', 'grau_dependencia', 'mobilidade', 'tipo_sanguineo', 'alergias', 'diagnosticos', 'dieta',
  'convenio', 'convenio_numero', 'medico', 'medico_tel', 'obs'];
const CAMPOS_CONTATO = ['nome', 'parentesco', 'telefone', 'telefone2', 'email', 'endereco', 'responsavel', 'emergencia', 'obs'];

// CPF: confere os dois dígitos verificadores e devolve formatado (000.000.000-00)
function cpfValido(txt) {
  const d = String(txt || '').replace(/\D/g, '');
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return null;
  for (const t of [9, 10]) {
    let s = 0;
    for (let i = 0; i < t; i++) s += Number(d[i]) * (t + 1 - i);
    if (((s * 10) % 11) % 10 !== Number(d[t])) return null;
  }
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}
const dataValida = (v) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v + 'T12:00:00'));

module.exports = function residentes(ctx) {
  const { rota, db, registrar, registrarAcesso, transacao, falha, conferirVersao, json, corpoJson, lerCorpo, exigirAdmin, hoje, agoraIso } = ctx;

  // Limpa e confere o que veio da tela. Devolve só os campos permitidos (texto vazio vira null).
  function limpar(b, campos) {
    const reg = {};
    for (const k of campos) {
      if (b[k] === undefined) continue;
      let v = b[k];
      if (typeof v === 'string') v = v.trim();
      reg[k] = v === '' || v == null ? null : v;
    }
    return reg;
  }
  function validar(reg, idAtual) {
    if ('nome' in reg && !reg.nome) falha(400, 'Informe o nome do residente');
    if (reg.nome && reg.nome.length > 120) falha(400, 'Nome longo demais');
    for (const k of ['dt_nasc', 'dt_entrada']) if (reg[k] && !dataValida(reg[k])) falha(400, 'Data inválida');
    if (reg.dt_nasc && reg.dt_nasc > hoje()) falha(400, 'A data de nascimento está no futuro');
    if (reg.dt_entrada && reg.dt_entrada > hoje()) falha(400, 'A data de entrada está no futuro');
    if (reg.sexo && !SEXOS.includes(reg.sexo)) falha(400, 'Sexo inválido');
    if (reg.grau_dependencia && !GRAUS.includes(reg.grau_dependencia)) falha(400, 'Grau de dependência inválido');
    if (reg.tipo_sanguineo && !TIPOS_SANGUE.includes(reg.tipo_sanguineo)) falha(400, 'Tipo sanguíneo inválido');
    if (reg.cpf) {
      const c = cpfValido(reg.cpf) || falha(400, 'CPF inválido: confira os números');
      reg.cpf = c;
      const outro = db.prepare('SELECT id, nome FROM residentes WHERE cpf = ? AND id <> ?').get(c, idAtual || 0);
      if (outro) falha(400, `Esse CPF já está na ficha de ${outro.nome}`);
    }
    for (const [k, v] of Object.entries(reg)) if (typeof v === 'string' && v.length > 4000) falha(400, `Texto longo demais em ${k}`);
  }

  const idade = (nasc) => {
    if (!nasc) return null;
    const [a, m, d] = nasc.split('-').map(Number);
    const h = new Date();
    return h.getFullYear() - a - (h.getMonth() + 1 < m || (h.getMonth() + 1 === m && h.getDate() < d) ? 1 : 0);
  };

  // Lista (leve): a tela filtra e busca sem voltar ao servidor
  rota('GET', '/api/residentes', async (req, res) => {
    const lin = db.prepare(`SELECT r.id, r.nome, r.apelido, r.sexo, r.dt_nasc, r.cpf, r.quarto, r.leito, r.dt_entrada, r.situacao, r.situacao_desde,
        r.grau_dependencia, r.alergias, r.convenio, r.demo, (SELECT atualizado_em FROM fotos WHERE residente_id = r.id) foto_em,
        c.nome resp_nome, c.parentesco resp_parentesco, c.telefone resp_telefone,
        (SELECT COUNT(*) FROM contatos x WHERE x.residente_id = r.id) n_contatos
      FROM residentes r LEFT JOIN contatos c ON c.id = (SELECT id FROM contatos WHERE residente_id = r.id ORDER BY responsavel DESC, emergencia DESC, id LIMIT 1)
      ORDER BY r.nome COLLATE NOCASE`).all();
    json(res, 200, lin.map((r) => ({ ...r, idade: idade(r.dt_nasc) })));
  });

  // Ficha completa
  rota('GET', '/api/residentes/:id', async (req, res, { p, u }) => {
    const r = db.prepare('SELECT * FROM residentes WHERE id = ?').get(+p.id) || falha(404, 'Residente não encontrado');
    registrarAcesso(u.login, 'residente', r.id); // LGPD: fica registrado quem abriu a ficha de quem
    const nomes = Object.fromEntries(db.prepare('SELECT login, nome FROM usuarios').all().map((x) => [x.login, x.nome]));
    json(res, 200, {
      residente: { ...r, idade: idade(r.dt_nasc), foto_em: db.prepare('SELECT atualizado_em FROM fotos WHERE residente_id = ?').get(r.id)?.atualizado_em || null },
      contatos: db.prepare('SELECT * FROM contatos WHERE residente_id = ? ORDER BY responsavel DESC, emergencia DESC, nome COLLATE NOCASE').all(r.id),
      historico: db.prepare('SELECT quando, usuario, acao FROM log WHERE detalhe LIKE ? ORDER BY id DESC LIMIT 20').all(`%"residente_id":${r.id},%`)
        .map((h) => ({ ...h, nome: nomes[h.usuario] || h.usuario })),
      situacoes: SITUACOES,
    });
  });

  rota('POST', '/api/residentes', async (req, res, { u }) => {
    const b = await corpoJson(req);
    const reg = limpar(b, CAMPOS);
    if (!reg.nome) falha(400, 'Informe o nome do residente');
    validar(reg, 0);
    if (!reg.dt_entrada) reg.dt_entrada = hoje();
    const agora = agoraIso();
    Object.assign(reg, { situacao: 'no_lar', situacao_desde: reg.dt_entrada, criado_em: agora, criado_por: u.login, atualizado_em: agora, atualizado_por: u.login });
    const ks = Object.keys(reg);
    const r = db.prepare(`INSERT INTO residentes (${ks.join(', ')}) VALUES (${ks.map(() => '?').join(', ')})`).run(...ks.map((k) => reg[k]));
    const id = Number(r.lastInsertRowid);
    registrar(u.login, 'cadastrou residente', { residente_id: id, nome: reg.nome });
    json(res, 201, { id });
  });

  rota('PUT', '/api/residentes/:id', async (req, res, { u, p }) => {
    const b = await corpoJson(req);
    const atual = db.prepare('SELECT * FROM residentes WHERE id = ?').get(+p.id) || falha(404, 'Residente não encontrado');
    conferirVersao(atual, b, u);
    const reg = limpar(b, CAMPOS);
    validar(reg, atual.id);
    const mud = Object.keys(reg).filter((k) => String(atual[k] ?? '') !== String(reg[k] ?? ''));
    if (!mud.length) return json(res, 200, { ok: true });
    reg.atualizado_em = agoraIso(); reg.atualizado_por = u.login;
    const ks = Object.keys(reg);
    db.prepare(`UPDATE residentes SET ${ks.map((k) => k + ' = ?').join(', ')} WHERE id = ?`).run(...ks.map((k) => reg[k]), atual.id);
    registrar(u.login, 'editou a ficha do residente', { residente_id: atual.id, nome: reg.nome || atual.nome, campos: mud });
    json(res, 200, { ok: true });
  });

  // Mudança de situação: no lar, hospitalizado, saiu, faleceu — sempre com a data (e o motivo, se houver)
  rota('PUT', '/api/residentes/:id/situacao', async (req, res, { u, p }) => {
    const b = await corpoJson(req);
    const atual = db.prepare('SELECT id, nome, situacao FROM residentes WHERE id = ?').get(+p.id) || falha(404, 'Residente não encontrado');
    if (!SITUACOES[b.situacao]) falha(400, 'Situação inválida');
    const desde = b.desde || hoje();
    if (!dataValida(desde)) falha(400, 'Data inválida');
    if (desde > hoje()) falha(400, 'A data não pode estar no futuro');
    const obs = String(b.obs || '').trim().slice(0, 2000) || null;
    db.prepare('UPDATE residentes SET situacao = ?, situacao_desde = ?, situacao_obs = ?, atualizado_em = ?, atualizado_por = ? WHERE id = ?')
      .run(b.situacao, desde, obs, agoraIso(), u.login, atual.id);
    registrar(u.login, `situação: ${SITUACOES[atual.situacao]} → ${SITUACOES[b.situacao]}`, { residente_id: atual.id, nome: atual.nome, desde, obs });
    json(res, 200, { ok: true });
  });

  // Excluir apaga de vez (com os contatos). Só a administração, e a tela pede confirmação digitando o nome.
  // Para quem saiu ou faleceu, o certo é mudar a situação: a ficha continua como histórico.
  rota('DELETE', '/api/residentes/:id', async (req, res, { u, p }) => {
    exigirAdmin(u);
    const r = db.prepare('SELECT id, nome FROM residentes WHERE id = ?').get(+p.id) || falha(404, 'Residente não encontrado');
    transacao(() => {
      db.prepare("DELETE FROM acessos WHERE tipo = 'residente' AND ref_id = ?").run(r.id);
      db.prepare('DELETE FROM residentes WHERE id = ?').run(r.id);
    });
    registrar(u.login, 'excluiu residente', { residente_id: r.id, nome: r.nome });
    json(res, 200, { ok: true });
  });

  // ── Foto ──
  // A tela recorta e diminui a foto antes de mandar (JPEG quadrado). Aqui só confere se é JPEG mesmo e se é pequena.
  rota('GET', '/api/residentes/:id/foto', async (req, res, { p }) => {
    const f = db.prepare('SELECT imagem FROM fotos WHERE residente_id = ?').get(+p.id) || falha(404, 'Sem foto');
    // O endereço muda a cada foto nova (?v=data), então o navegador pode guardar a imagem sem perguntar de novo.
    // "private": só o navegador de quem entrou guarda; nada no meio do caminho.
    res.writeHead(200, { 'Content-Type': 'image/jpeg', 'Cache-Control': 'private, max-age=31536000, immutable' });
    res.end(Buffer.from(f.imagem));
  });

  rota('PUT', '/api/residentes/:id/foto', async (req, res, { u, p }) => {
    const r = db.prepare('SELECT id, nome FROM residentes WHERE id = ?').get(+p.id) || falha(404, 'Residente não encontrado');
    const img = await lerCorpo(req, 2 * 1024 * 1024);
    if (img.length < 100 || img[0] !== 0xff || img[1] !== 0xd8 || img[2] !== 0xff) falha(400, 'A foto não chegou direito. Tente de novo.');
    const agora = agoraIso();
    db.prepare(`INSERT INTO fotos (residente_id, imagem, atualizado_em, atualizado_por) VALUES (?, ?, ?, ?)
      ON CONFLICT(residente_id) DO UPDATE SET imagem = excluded.imagem, atualizado_em = excluded.atualizado_em, atualizado_por = excluded.atualizado_por`)
      .run(r.id, img, agora, u.login);
    registrar(u.login, 'trocou a foto do residente', { residente_id: r.id, nome: r.nome });
    json(res, 200, { ok: true, foto_em: agora });
  });

  rota('DELETE', '/api/residentes/:id/foto', async (req, res, { u, p }) => {
    const r = db.prepare('SELECT id, nome FROM residentes WHERE id = ?').get(+p.id) || falha(404, 'Residente não encontrado');
    db.prepare('DELETE FROM fotos WHERE residente_id = ?').run(r.id);
    registrar(u.login, 'removeu a foto do residente', { residente_id: r.id, nome: r.nome });
    json(res, 200, { ok: true });
  });

  // ── Familiares e contatos ──
  function validarContato(reg) {
    if ('nome' in reg && !reg.nome) falha(400, 'Informe o nome do contato');
    for (const k of ['responsavel', 'emergencia']) if (k in reg) reg[k] = reg[k] ? 1 : 0;
    if (reg.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(reg.email)) falha(400, 'E-mail inválido');
    for (const [k, v] of Object.entries(reg)) if (typeof v === 'string' && v.length > 2000) falha(400, `Texto longo demais em ${k}`);
  }
  // Responsável é um só por residente: marcar um desmarca o anterior
  const umResponsavel = (residenteId, contatoId) =>
    db.prepare('UPDATE contatos SET responsavel = 0 WHERE residente_id = ? AND id <> ?').run(residenteId, contatoId);

  rota('POST', '/api/residentes/:id/contatos', async (req, res, { u, p }) => {
    const r = db.prepare('SELECT id, nome, demo FROM residentes WHERE id = ?').get(+p.id) || falha(404, 'Residente não encontrado');
    const reg = limpar(await corpoJson(req), CAMPOS_CONTATO);
    if (!reg.nome) falha(400, 'Informe o nome do contato');
    validarContato(reg);
    const agora = agoraIso();
    Object.assign(reg, { residente_id: r.id, criado_em: agora, criado_por: u.login, atualizado_em: agora, atualizado_por: u.login, demo: r.demo });
    const ks = Object.keys(reg);
    const id = transacao(() => {
      const novo = Number(db.prepare(`INSERT INTO contatos (${ks.join(', ')}) VALUES (${ks.map(() => '?').join(', ')})`).run(...ks.map((k) => reg[k])).lastInsertRowid);
      if (reg.responsavel) umResponsavel(r.id, novo);
      return novo;
    });
    registrar(u.login, 'acrescentou contato', { residente_id: r.id, nome: r.nome, contato: reg.nome });
    json(res, 201, { id });
  });

  rota('PUT', '/api/contatos/:id', async (req, res, { u, p }) => {
    const b = await corpoJson(req);
    const atual = db.prepare('SELECT c.*, r.nome residente_nome FROM contatos c JOIN residentes r ON r.id = c.residente_id WHERE c.id = ?').get(+p.id)
      || falha(404, 'Contato não encontrado');
    conferirVersao(atual, b, u);
    const reg = limpar(b, CAMPOS_CONTATO);
    validarContato(reg);
    if (!Object.keys(reg).length) return json(res, 200, { ok: true });
    reg.atualizado_em = agoraIso(); reg.atualizado_por = u.login;
    const ks = Object.keys(reg);
    transacao(() => {
      db.prepare(`UPDATE contatos SET ${ks.map((k) => k + ' = ?').join(', ')} WHERE id = ?`).run(...ks.map((k) => reg[k]), atual.id);
      if (reg.responsavel) umResponsavel(atual.residente_id, atual.id);
    });
    registrar(u.login, 'editou contato', { residente_id: atual.residente_id, nome: atual.residente_nome, contato: reg.nome || atual.nome });
    json(res, 200, { ok: true });
  });

  rota('DELETE', '/api/contatos/:id', async (req, res, { u, p }) => {
    const c = db.prepare('SELECT c.id, c.nome, c.residente_id, r.nome residente_nome FROM contatos c JOIN residentes r ON r.id = c.residente_id WHERE c.id = ?').get(+p.id)
      || falha(404, 'Contato não encontrado');
    db.prepare('DELETE FROM contatos WHERE id = ?').run(c.id);
    registrar(u.login, 'removeu contato', { residente_id: c.residente_id, nome: c.residente_nome, contato: c.nome });
    json(res, 200, { ok: true });
  });
};

module.exports.cpfValido = cpfValido;
