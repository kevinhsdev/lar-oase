// OASE - Lar — servidor do sistema do lar de idosos da OASE. Roda num PC do lar; os outros PCs e celulares entram pelo navegador.
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { db, inicializar, cfg, cfgPublica, gravarCfg, registrar, registrarAcesso, transacao, hashSenha, conferirSenha, SENHA_INICIAL, PASTA_DADOS, restauracao } = require('./lib/db');
const copias = require('./lib/backup');
const { VERSAO } = require('./lib/versao');
const { gerarDemo } = require('./lib/demo');

inicializar();

const PORTA = Number(process.env.APP_PORTA || 3000);
// Por padrão só este PC acessa. A rede (outros PCs e celulares no mesmo Wi-Fi) é liberada em Configurações › Celular e rede
// (vale depois de reiniciar) ou à força com APP_REDE=1.
const REDE_FORCADA = process.env.APP_REDE === '1';
const HOST = REDE_FORCADA || cfg().rede_liberada === '1' ? '0.0.0.0' : '127.0.0.1';
const PUBLICO = path.join(__dirname, 'public');
const COOKIE = 'lar';

// ───────────────────────── sessões ─────────────────────────
// Ficam na memória e também no banco (só o hash do token, nunca o token): se o servidor reiniciar
// (atualização, restauração), ninguém é jogado para a tela de entrada e perde o que estava digitando.
const DOZE_HORAS = 12 * 3600 * 1000;
const sessoes = {
  mem: new Map(),
  hash: (tok) => crypto.createHash('sha256').update(String(tok)).digest('hex'),
  get(tok) {
    let s = this.mem.get(tok);
    if (!s) {
      const r = db.prepare('SELECT uid, expira, bloqueada FROM sessoes WHERE hash = ?').get(this.hash(tok));
      if (r) { s = { uid: r.uid, expira: r.expira, bloqueada: !!r.bloqueada, gravado: r.expira }; this.mem.set(tok, s); }
    }
    return s;
  },
  set(tok, s) {
    this.mem.set(tok, { ...s, gravado: s.expira });
    db.prepare('INSERT OR REPLACE INTO sessoes (hash, uid, expira, bloqueada) VALUES (?, ?, ?, ?)').run(this.hash(tok), s.uid, s.expira, s.bloqueada ? 1 : 0);
  },
  gravar(tok) {
    const s = this.mem.get(tok);
    if (!s) return;
    db.prepare('UPDATE sessoes SET expira = ?, bloqueada = ? WHERE hash = ?').run(s.expira, s.bloqueada ? 1 : 0, this.hash(tok));
    s.gravado = s.expira;
  },
  delete(tok) { this.mem.delete(tok); db.prepare('DELETE FROM sessoes WHERE hash = ?').run(this.hash(tok)); },
  // Senha redefinida ou pessoa desativada: quem estava dentro com ela sai
  derrubar(uid) {
    db.prepare('DELETE FROM sessoes WHERE uid = ?').run(uid);
    for (const [tok, s] of this.mem) if (s.uid === uid) this.mem.delete(tok);
  },
};
db.prepare('DELETE FROM sessoes WHERE expira < ?').run(Date.now());

function sessaoDe(req) {
  const tok = (req.headers.cookie || '').split(/;\s*/).find((c) => c.startsWith(COOKIE + '='))?.slice(COOKIE.length + 1);
  const s = tok && sessoes.get(tok);
  if (!s || s.expira < Date.now()) { if (tok) sessoes.delete(tok); return null; }
  s.expira = Date.now() + DOZE_HORAS;
  if (s.expira - s.gravado > 10 * 60 * 1000) sessoes.gravar(tok); // não escreve no banco a cada clique
  const u = db.prepare('SELECT id, login, nome, funcao, perfil, trocar_senha, ativo FROM usuarios WHERE id = ?').get(s.uid);
  return u && u.ativo ? { token: tok, usuario: u, bloqueada: !!s.bloqueada } : null;
}

// ───────────────────────── utilitários HTTP ─────────────────────────
class ErroHttp extends Error { constructor(status, msg, extra) { super(msg); this.status = status; this.extra = extra; } }
const falha = (status, msg, extra) => { throw new ErroHttp(status, msg, extra); };

// Duas pessoas editando a mesma ficha: quem salva por último não passa por cima em silêncio.
// A tela manda _versao (o atualizado_em que ela carregou). Se outra pessoa gravou depois, devolve 409 com quem e quando,
// e a tela pergunta se quer salvar mesmo assim (_forcar). Tira _versao e _forcar do corpo antes de gravar.
function conferirVersao(atual, b, u) {
  const versao = b._versao, forcar = b._forcar;
  delete b._versao; delete b._forcar;
  if (versao === undefined || forcar) return;
  if ((atual.atualizado_em || null) === (versao || null)) return;
  if (!atual.atualizado_por || atual.atualizado_por === u.login) return;
  const nome = db.prepare('SELECT nome FROM usuarios WHERE login = ?').get(atual.atualizado_por)?.nome || atual.atualizado_por;
  falha(409, `${nome} alterou isto enquanto você editava.`, { conflito: { por: nome, em: atual.atualizado_em } });
}

function json(res, status, dados, extras = {}) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...extras });
  res.end(JSON.stringify(dados));
}

function lerCorpo(req, limite = 25 * 1024 * 1024) {
  return new Promise((ok, erro) => {
    const partes = []; let tam = 0;
    req.on('data', (c) => { tam += c.length; if (tam > limite) { erro(new ErroHttp(413, 'Arquivo grande demais')); req.destroy(); } else partes.push(c); });
    req.on('end', () => ok(Buffer.concat(partes)));
    req.on('error', erro);
  });
}
async function corpoJson(req) {
  const b = await lerCorpo(req, 1024 * 1024);
  if (!b.length) return {};
  try { return JSON.parse(b.toString('utf8')); } catch { falha(400, 'JSON inválido'); }
}

const TIPOS = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.png': 'image/png',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json' };
function servirEstatico(req, res, url) {
  let rel;
  try { rel = decodeURIComponent(url.pathname); } catch { return json(res, 400, { erro: 'Endereço inválido' }); }
  if (rel === '/') rel = '/index.html';
  const arq = path.normalize(path.join(PUBLICO, rel));
  if (!arq.startsWith(PUBLICO + path.sep)) return json(res, 403, { erro: 'Proibido' });
  fs.readFile(arq, (e, dados) => {
    if (e) { // qualquer endereço desconhecido volta para a tela principal
      return fs.readFile(path.join(PUBLICO, 'index.html'), (e2, idx) => {
        res.writeHead(e2 ? 404 : 200, { 'Content-Type': TIPOS['.html'] }); res.end(e2 ? 'Não encontrado' : idx);
      });
    }
    const ext = path.extname(arq).toLowerCase();
    res.writeHead(200, { 'Content-Type': TIPOS[ext] || 'application/octet-stream', 'Cache-Control': ext === '.woff2' ? 'max-age=604800' : 'no-cache' });
    res.end(dados);
  });
}

// ───────────────────────── regras gerais ─────────────────────────
const hoje = () => new Date().toLocaleDateString('sv-SE'); // AAAA-MM-DD no fuso local
const agoraIso = () => new Date().toISOString();
function exigirAdmin(u) { if (u.perfil !== 'admin') falha(403, 'Somente a administração pode fazer isso'); }

// ───────────────────────── rotas ─────────────────────────
const rotas = [];
const rota = (metodo, padrao, fn, publica = false) => {
  const chaves = [];
  const re = new RegExp('^' + padrao.replace(/:(\w+)/g, (_, k) => { chaves.push(k); return '([^/]+)'; }) + '$');
  rotas.push({ metodo, re, chaves, fn, publica });
};

// Tentativas de entrada (proteção simples contra quem fica chutando senha)
const tentativas = new Map();
rota('POST', '/api/login', async (req, res) => {
  const { login, senha } = await corpoJson(req);
  const chave = String(login || '').toLowerCase().trim();
  const t = tentativas.get(chave) || { n: 0, ate: 0 };
  if (t.ate > Date.now()) falha(429, 'Muitas tentativas erradas. Aguarde 1 minuto e tente de novo.');
  const u = db.prepare('SELECT * FROM usuarios WHERE login = ? AND ativo = 1').get(chave);
  if (!u || !conferirSenha(String(senha || ''), u.senha_hash)) {
    t.n++; if (t.n >= 5) { t.ate = Date.now() + 60_000; t.n = 0; } tentativas.set(chave, t);
    falha(401, 'Usuário ou senha incorretos');
  }
  tentativas.delete(chave);
  const token = crypto.randomBytes(32).toString('hex');
  sessoes.set(token, { uid: u.id, expira: Date.now() + DOZE_HORAS });
  registrar(u.login, 'entrou no sistema', '');
  json(res, 200, { ok: true }, { 'Set-Cookie': `${COOKIE}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=43200` });
}, true);

rota('POST', '/api/logout', async (req, res, { sessao, u }) => {
  sessoes.delete(sessao.token);
  registrar(u.login, 'saiu do sistema', '');
  json(res, 200, { ok: true }, { 'Set-Cookie': `${COOKIE}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0` });
});

// Pública e sem dado nenhum: a tela usa para saber se o servidor voltou depois de cair
rota('GET', '/api/versao', async (req, res) => json(res, 200, { versao: VERSAO }), true);
rota('GET', '/api/eu', async (req, res, { u, sessao }) => json(res, 200, { ...u, versao: VERSAO, bloqueada: !!sessao.bloqueada, config: cfgPublica() }));

// ── Bloqueio de tela (computador sem ninguém por perto) ──
rota('POST', '/api/bloquear', async (req, res, { u, sessao }) => {
  const s = sessoes.get(sessao.token);
  if (s) { s.bloqueada = true; sessoes.gravar(sessao.token); }
  registrar(u.login, 'bloqueou a tela', '');
  json(res, 200, { ok: true });
});
rota('POST', '/api/desbloquear', async (req, res, { u, sessao }) => {
  const { senha } = await corpoJson(req);
  const reg = db.prepare('SELECT senha_hash FROM usuarios WHERE id = ?').get(u.id);
  if (!conferirSenha(String(senha || ''), reg.senha_hash)) {
    registrar(u.login, 'errou a senha ao desbloquear a tela', '');
    falha(403, 'Senha incorreta'); // 403 e não 401: a sessão continua valendo, só a tela está bloqueada
  }
  const s = sessoes.get(sessao.token);
  if (s) { s.bloqueada = false; sessoes.gravar(sessao.token); }
  json(res, 200, { ok: true });
});

const SENHAS_FRACAS = [SENHA_INICIAL, '12345678', '123456789', '1234567890', 'senha123', 'password', 'oase1234', 'lar12345', 'laroase1', 'abcd1234', 'qwerty12'];
rota('POST', '/api/trocar-senha', async (req, res, { u }) => {
  const { atual, nova } = await corpoJson(req);
  const reg = db.prepare('SELECT senha_hash FROM usuarios WHERE id = ?').get(u.id);
  if (!conferirSenha(String(atual || ''), reg.senha_hash)) falha(400, 'A senha atual está incorreta');
  const nv = String(nova || '');
  if (nv.length < 8) falha(400, 'A nova senha precisa ter pelo menos 8 caracteres');
  if (SENHAS_FRACAS.includes(nv.toLowerCase()) || nv.toLowerCase().includes(u.login)) falha(400, 'Essa senha é fácil demais de adivinhar. Escolha outra.');
  db.prepare('UPDATE usuarios SET senha_hash = ?, trocar_senha = 0 WHERE id = ?').run(hashSenha(nv), u.id);
  registrar(u.login, 'trocou a própria senha', '');
  json(res, 200, { ok: true });
});

// ── Início: um resumo de cada módulo ──
rota('GET', '/api/inicio', async (req, res) => {
  const porSituacao = Object.fromEntries(db.prepare('SELECT situacao, COUNT(*) n FROM residentes GROUP BY situacao').all().map((r) => [r.situacao, r.n]));
  // Aniversariantes dos próximos 30 dias (ignora o ano; 29/02 conta como 28/02 nos anos comuns)
  const vivos = db.prepare("SELECT id, nome, apelido, dt_nasc, quarto FROM residentes WHERE situacao IN ('no_lar','hospitalizado') AND dt_nasc IS NOT NULL").all();
  const h = new Date(hoje() + 'T12:00:00');
  const aniversarios = vivos.map((r) => {
    const [a, m, d] = r.dt_nasc.split('-').map(Number);
    let prox = new Date(h.getFullYear(), m - 1, d, 12);
    if (prox.getMonth() !== m - 1) prox = new Date(h.getFullYear(), m - 1, d - 1, 12);
    if (prox < h) prox = new Date(h.getFullYear() + 1, m - 1, d, 12);
    const dias = Math.round((prox - h) / 86400000);
    return { ...r, dias, faz: prox.getFullYear() - a, data: prox.toLocaleDateString('sv-SE') };
  }).filter((r) => r.dias <= 30).sort((a, b) => a.dias - b.dias);
  const e = copias.estado(cfg(), PASTA_DADOS);
  json(res, 200, {
    porSituacao, aniversarios,
    hospitalizados: db.prepare("SELECT id, nome, apelido, situacao_desde, situacao_obs FROM residentes WHERE situacao = 'hospitalizado' ORDER BY situacao_desde").all(),
    recentes: db.prepare("SELECT id, nome, apelido, dt_entrada, quarto FROM residentes WHERE situacao = 'no_lar' AND dt_entrada IS NOT NULL ORDER BY dt_entrada DESC LIMIT 4").all(),
    // Diário: o que precisa de atenção (atenção/grave ainda não resolvido) e quantos registros hoje
    atencao: db.prepare(`SELECT o.id, o.data, o.hora, o.tipo, o.gravidade, o.texto, o.residente_id, r.nome residente_nome
      FROM ocorrencias o LEFT JOIN residentes r ON r.id = o.residente_id WHERE o.gravidade <> 'normal' AND o.resolvida = 0
      ORDER BY o.gravidade = 'grave' DESC, o.data DESC, o.hora DESC LIMIT 6`).all(),
    atencao_total: db.prepare("SELECT COUNT(*) n FROM ocorrencias WHERE gravidade <> 'normal' AND resolvida = 0").get().n,
    diario_hoje: db.prepare('SELECT COUNT(*) n FROM ocorrencias WHERE data = ?').get(hoje()).n,
    // Agenda de hoje e amanhã (só o que ainda está agendado)
    agenda: db.prepare(`SELECT a.id, a.data, a.hora, a.tipo, a.titulo, a.local, a.residente_id, r.nome residente_nome, r.apelido residente_apelido
      FROM agenda a LEFT JOIN residentes r ON r.id = a.residente_id WHERE a.situacao = 'agendado' AND a.data BETWEEN ? AND ?
      ORDER BY a.data, COALESCE(a.hora, '00:00') LIMIT 12`).all(hoje(), (() => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toLocaleDateString('sv-SE'); })()),
    backup: { atrasado: e.atrasado, nunca: e.nunca, idade_horas: e.idade_horas },
    demo: !!db.prepare('SELECT 1 FROM residentes WHERE demo = 1 LIMIT 1').get(),
  });
});

// ── Administração ──
rota('GET', '/api/admin', async (req, res, { u }) => {
  exigirAdmin(u);
  json(res, 200, {
    config: cfgPublica(),
    usuarios: db.prepare('SELECT id, login, nome, funcao, perfil, trocar_senha, ativo FROM usuarios ORDER BY ativo DESC, nome').all(),
    demo: !!db.prepare('SELECT 1 FROM residentes WHERE demo = 1 LIMIT 1').get(),
    reais: db.prepare('SELECT COUNT(*) n FROM residentes WHERE demo = 0').get().n,
    senha_inicial: SENHA_INICIAL,
  });
});
rota('PUT', '/api/admin/config', async (req, res, { u }) => {
  exigirAdmin(u);
  const b = await corpoJson(req);
  // Só estas chaves podem vir da tela (a senha do backup tem rota própria e nunca volta para a tela)
  const permitidas = ['nome_organizacao', 'bloqueio_minutos', 'backup_pasta', 'backup_horas', 'backup_manter', 'backup_avisar_dias'];
  const numericas = { bloqueio_minutos: [0, 240], backup_horas: [1, 168], backup_manter: [3, 500], backup_avisar_dias: [1, 60] };
  const mudou = {};
  for (const k of permitidas) {
    if (b[k] === undefined) continue;
    let v = String(b[k]).trim();
    if (numericas[k]) {
      const n = Number(v);
      if (!Number.isInteger(n) || n < numericas[k][0] || n > numericas[k][1]) falha(400, `Valor inválido em ${k}: use um número de ${numericas[k][0]} a ${numericas[k][1]}`);
      v = String(n);
    }
    if (k === 'nome_organizacao' && !v) falha(400, 'Informe o nome da organização');
    if (k === 'backup_pasta' && v) {
      try { fs.mkdirSync(v, { recursive: true }); fs.accessSync(v, fs.constants.W_OK); }
      catch { falha(400, 'Não consegui usar essa pasta para os backups. Confira se o caminho existe e se o pen drive está conectado.'); }
    }
    gravarCfg(k, v); mudou[k] = v;
  }
  registrar(u.login, 'alterou configurações', mudou);
  json(res, 200, { ok: true });
});

// Celular e rede: endereços deste PC na rede local (para o QR Code) e a chave que libera o acesso de fora
function enderecosDaRede() {
  const virtual = /vethernet|virtualbox|vmware|hyper-v|wsl|loopback|bluetooth|docker|tailscale|zerotier|vpn/i;
  const semFio = (n) => /wi-?fi|wlan|sem fio|wireless/i.test(n);
  const lista = [];
  for (const [nome, ifs] of Object.entries(os.networkInterfaces())) {
    for (const i of ifs || []) {
      if (i.family !== 'IPv4' && i.family !== 4) continue;
      if (i.internal || i.address.startsWith('169.254.')) continue;
      lista.push({ nome, ip: i.address, provavel: !virtual.test(nome) });
    }
  }
  return lista.sort((a, b) => b.provavel - a.provavel || semFio(b.nome) - semFio(a.nome));
}
rota('GET', '/api/admin/rede', async (req, res, { u }) => {
  exigirAdmin(u);
  json(res, 200, { liberada: cfg().rede_liberada === '1', ativa: HOST === '0.0.0.0', forcada: REDE_FORCADA, porta: PORTA, enderecos: enderecosDaRede() });
});
rota('PUT', '/api/admin/rede', async (req, res, { u }) => {
  exigirAdmin(u);
  const b = await corpoJson(req);
  const liberar = !!b.liberada;
  gravarCfg('rede_liberada', liberar ? '1' : '0');
  registrar(u.login, liberar ? 'liberou o acesso pela rede (celular e outros PCs)' : 'fechou o acesso pela rede', '');
  json(res, 200, { ok: true, precisa_reiniciar: liberar !== (HOST === '0.0.0.0') && !REDE_FORCADA });
});

// Usuários: cada pessoa entra com o próprio login (a auditoria mostra quem fez o quê)
rota('POST', '/api/admin/usuarios', async (req, res, { u }) => {
  exigirAdmin(u);
  const b = await corpoJson(req);
  const login = String(b.login || '').toLowerCase().trim();
  if (!/^[a-z0-9._]{3,30}$/.test(login)) falha(400, 'Login inválido: de 3 a 30 letras ou números, sem espaço e sem acento');
  const nome = String(b.nome || '').trim();
  if (!nome) falha(400, 'Informe o nome da pessoa');
  if (db.prepare('SELECT 1 FROM usuarios WHERE login = ?').get(login)) falha(400, 'Esse login já existe');
  db.prepare('INSERT INTO usuarios (login, nome, funcao, perfil, senha_hash) VALUES (?, ?, ?, ?, ?)')
    .run(login, nome, String(b.funcao || '').trim() || null, b.perfil === 'admin' ? 'admin' : 'usuario', hashSenha(SENHA_INICIAL));
  registrar(u.login, 'criou usuário', { login, perfil: b.perfil === 'admin' ? 'admin' : 'usuario' });
  json(res, 201, { ok: true, senha_inicial: SENHA_INICIAL });
});
rota('PUT', '/api/admin/usuarios/:id', async (req, res, { u, p }) => {
  exigirAdmin(u);
  const b = await corpoJson(req);
  const alvo = db.prepare('SELECT * FROM usuarios WHERE id = ?').get(+p.id) || falha(404, 'Usuário não encontrado');
  if (alvo.id === u.id && (b.ativo === false || b.perfil === 'usuario')) falha(400, 'Você não pode desativar nem tirar a administração de si mesmo');
  if (alvo.perfil === 'admin' && (b.ativo === false || b.perfil === 'usuario')
    && db.prepare("SELECT COUNT(*) n FROM usuarios WHERE perfil = 'admin' AND ativo = 1").get().n <= 1) falha(400, 'Precisa sobrar pelo menos uma pessoa na administração');
  const mud = {};
  if (b.resetar_senha) {
    db.prepare('UPDATE usuarios SET senha_hash = ?, trocar_senha = 1 WHERE id = ?').run(hashSenha(SENHA_INICIAL), alvo.id);
    sessoes.derrubar(alvo.id);
    mud.senha = 'redefinida';
  }
  if (b.perfil) { const pf = b.perfil === 'admin' ? 'admin' : 'usuario'; db.prepare('UPDATE usuarios SET perfil = ? WHERE id = ?').run(pf, alvo.id); mud.perfil = pf; }
  if (b.ativo != null) { db.prepare('UPDATE usuarios SET ativo = ? WHERE id = ?').run(b.ativo ? 1 : 0, alvo.id); if (!b.ativo) sessoes.derrubar(alvo.id); mud.ativo = !!b.ativo; }
  if (b.nome !== undefined) { const n = String(b.nome).trim(); if (!n) falha(400, 'Informe o nome'); db.prepare('UPDATE usuarios SET nome = ? WHERE id = ?').run(n, alvo.id); mud.nome = n; }
  if (b.funcao !== undefined) { db.prepare('UPDATE usuarios SET funcao = ? WHERE id = ?').run(String(b.funcao).trim() || null, alvo.id); mud.funcao = b.funcao; }
  registrar(u.login, 'alterou usuário', { login: alvo.login, ...mud });
  json(res, 200, { ok: true, senha_inicial: b.resetar_senha ? SENHA_INICIAL : undefined });
});

// Demonstração: dados FICTÍCIOS para mostrar e treinar (nunca se misturam com dados reais)
rota('POST', '/api/admin/demo', async (req, res, { u }) => {
  exigirAdmin(u);
  if (db.prepare('SELECT 1 FROM residentes WHERE demo = 0 LIMIT 1').get()) falha(400, 'Já existem residentes reais cadastrados: a demonstração não pode ser misturada a eles.');
  if (db.prepare('SELECT 1 FROM residentes WHERE demo = 1 LIMIT 1').get()) falha(400, 'A demonstração já está carregada.');
  const n = gerarDemo(db, transacao);
  registrar(u.login, 'carregou a demonstração', { residentes: n });
  json(res, 200, { residentes: n });
});
rota('DELETE', '/api/admin/demo', async (req, res, { u }) => {
  exigirAdmin(u);
  transacao(() => {
    db.prepare("DELETE FROM acessos WHERE tipo = 'residente' AND ref_id IN (SELECT id FROM residentes WHERE demo = 1)").run();
    db.prepare('DELETE FROM residentes WHERE demo = 1').run(); // os contatos saem junto (ON DELETE CASCADE)
    db.prepare('DELETE FROM contatos WHERE demo = 1').run();
    db.prepare('DELETE FROM ocorrencias WHERE demo = 1').run(); // os recados gerais fictícios (sem residente)
    db.prepare('DELETE FROM agenda WHERE demo = 1').run(); // idem para os compromissos do lar
    db.prepare('DELETE FROM produtos WHERE demo = 1').run(); // as movimentações saem junto (ON DELETE CASCADE)
  });
  registrar(u.login, 'apagou a demonstração', '');
  json(res, 200, { ok: true });
});

rota('GET', '/api/admin/log', async (req, res, { u, url }) => {
  exigirAdmin(u);
  const q = String(url.searchParams.get('q') || '').trim();
  const lim = Math.min(1000, Math.max(50, Number(url.searchParams.get('limite')) || 300));
  const nomes = Object.fromEntries(db.prepare('SELECT login, nome FROM usuarios').all().map((r) => [r.login, r.nome]));
  const linhas = q
    ? db.prepare('SELECT * FROM log WHERE usuario LIKE ? OR acao LIKE ? OR detalhe LIKE ? ORDER BY id DESC LIMIT ?').all(`%${q}%`, `%${q}%`, `%${q}%`, lim)
    : db.prepare('SELECT * FROM log ORDER BY id DESC LIMIT ?').all(lim);
  json(res, 200, linhas.map((l) => ({ ...l, nome: nomes[l.usuario] || l.usuario })));
});

// ── Módulos ──
const ctx = { rota, db, cfg, cfgPublica, gravarCfg, registrar, registrarAcesso, transacao, falha, conferirVersao, json, corpoJson, lerCorpo, exigirAdmin, hoje, agoraIso, PASTA_DADOS, sessoes };
require('./rotas/residentes')(ctx);
require('./rotas/diario')(ctx);
require('./rotas/agenda')(ctx);
require('./rotas/estoque')(ctx);
require('./rotas/remedios')(ctx);
require('./rotas/backup')(ctx);
require('./rotas/atualizacao')(ctx);

// ───────────────────────── servidor ─────────────────────────
const servidor = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  // O app não carrega nada de fora: trancar isso impede que um script estranho rode aqui dentro
  res.setHeader('Content-Security-Policy', "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; " +
    "script-src 'self'; connect-src 'self'; font-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'");
  if (!url.pathname.startsWith('/api/')) return servirEstatico(req, res, url);
  try {
    // Pedidos que alteram dados precisam vir do próprio app (o cabeçalho próprio bloqueia CSRF)
    if (req.method !== 'GET' && req.headers['x-app'] !== '1') falha(403, 'Requisição bloqueada');
    for (const r of rotas) {
      if (r.metodo !== req.method) continue;
      const m = url.pathname.match(r.re);
      if (!m) continue;
      let p;
      try { p = Object.fromEntries(r.chaves.map((k, i) => [k, decodeURIComponent(m[i + 1])])); } catch { falha(400, 'Endereço inválido'); }
      if (r.publica) return await r.fn(req, res, { url, p });
      const sessao = sessaoDe(req);
      if (!sessao) falha(401, 'Faça login novamente');
      const u = sessao.usuario;
      if (u.trocar_senha && !['/api/trocar-senha', '/api/eu', '/api/logout'].includes(url.pathname)) falha(428, 'Troque sua senha antes de continuar');
      // Tela bloqueada: nada passa até digitar a senha de novo
      if (sessao.bloqueada && !['/api/desbloquear', '/api/eu', '/api/logout'].includes(url.pathname)) falha(423, 'Tela bloqueada');
      return await r.fn(req, res, { url, p, u, sessao });
    }
    falha(404, 'Rota não encontrada');
  } catch (e) {
    const status = e.status || 500;
    if (status === 500) console.error(new Date().toISOString(), req.method, url.pathname, e);
    if (!res.headersSent) json(res, status, { erro: status === 500 ? 'Erro interno: ' + e.message : e.message, ...(e.extra || {}) });
  }
});

// ───────────────────────── cópias de segurança automáticas ─────────────────────────
function copiaAutomatica(motivo) {
  try {
    const r = copias.fazerBackup(db, cfg(), PASTA_DADOS, motivo);
    console.log(`  Cópia de segurança gravada: ${r.arquivo}${r.cifrado ? ' (cifrada)' : ''}`);
    registrar('sistema', 'cópia de segurança automática', { arquivo: r.arquivo, cifrado: r.cifrado });
  } catch (e) {
    console.error('  ATENÇÃO: não consegui gravar a cópia de segurança —', e.message);
    registrar('sistema', 'FALHA na cópia de segurança', e.message);
  }
}
if (restauracao) {
  if (restauracao.erro) { console.error('  A restauração do backup falhou:', restauracao.erro); registrar('sistema', 'FALHA ao restaurar backup', restauracao); }
  else { console.log('  Backup restaurado:', restauracao.restaurado); registrar('sistema', 'backup restaurado', restauracao.restaurado); }
}
if (copias.naHora(cfg(), PASTA_DADOS)) copiaAutomatica('inicio');
setInterval(() => { if (copias.naHora(cfg(), PASTA_DADOS)) copiaAutomatica('automatico'); }, 30 * 60 * 1000).unref();

servidor.on('error', (e) => {
  if (e.code === 'EADDRINUSE') console.error(`\n  A porta ${PORTA} já está em uso: o sistema provavelmente já está aberto em outra janela preta.\n`);
  else console.error(e);
  process.exit(1);
});
servidor.listen(PORTA, HOST, () => {
  console.log('');
  console.log(`  OASE - Lar (versão ${VERSAO}) rodando! — ${cfg().nome_organizacao}`);
  console.log(`  Abra no navegador:  http://localhost:${PORTA}`);
  if (HOST === '0.0.0.0') {
    console.log('  (liberado para celulares e outros PCs da rede)');
    for (const e of enderecosDaRede().filter((x) => x.provavel)) console.log(`  No celular:        http://${e.ip}:${PORTA}`);
  }
  console.log('  Não feche esta janela enquanto estiver usando o sistema.');
  console.log('');
});
