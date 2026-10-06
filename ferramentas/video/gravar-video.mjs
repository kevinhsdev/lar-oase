// VÍDEO DE APRESENTAÇÃO do OASE - Lar, em 4K (3840 x 2160, 30 quadros/s, H.264 em .mp4) — sem programa nenhum de fora.
// Uso (na pasta do projeto):  node ferramentas\video\gravar-video.mjs
//
// 1. CAPTURA: sobe um servidor de teste numa PASTA TEMPORÁRIA (porta 3996) só com a DEMONSTRAÇÃO FICTÍCIA (LGPD), abre o sistema
//    no Edge escondido e fotografa cada tela em 4K (computador, celular, modo escuro e os documentos impressos), anotando onde
//    ficam os botões que a seta do mouse vai "clicar".
// 2. ESTÚDIO: abre ferramentas\video\estudio.html no mesmo Edge, que monta a edição quadro a quadro (abertura com a logo, movimento
//    de câmera, seta do mouse, legendas, transições, celular, documentos, encerramento) e codifica em H.264 com o codificador do
//    próprio Edge (WebCodecs). Os pedaços do vídeo voltam para cá e viram o .mp4.
// Resultado: ferramentas\prints\video\OASE-Lar-apresentacao-4K.mp4 (pasta ignorada pelo Git). A pasta temporária é apagada no fim.
// Leva uns 15 a 30 minutos (cada quadro 4K é desenhado e codificado). Use pouca memória: nada mais aberto durante a gravação.
import { spawn, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(AQUI, '..', '..');
const APP = path.join(RAIZ, 'app');
const PUB = path.join(APP, 'public');
const SAIDA = path.join(RAIZ, 'ferramentas', 'prints', 'video');
// --1080p → versão Full HD para redes sociais (LinkedIn converte tudo para 1080p): desenhada em 4K e reduzida, com bitrate alto
const FULLHD = process.argv.includes('--1080p');
const ARQ_VIDEO = path.join(SAIDA, FULLHD ? 'OASE-Lar-apresentacao-1080p-LinkedIn.mp4' : 'OASE-Lar-apresentacao-4K.mp4');
const PORTA_APP = 3996, PORTA_ESTUDIO = 3995, PORTA_EDGE = 9352;
const BASE = `http://127.0.0.1:${PORTA_APP}`;
const LARG = FULLHD ? 1920 : 3840, ALT = FULLHD ? 1080 : 2160, FPS = 30; // tamanho do vídeo gravado (o estúdio sempre desenha em 4K)
const SO_CAPTURA = process.argv.includes('--so-captura'); // para conferir as fotos sem gravar o vídeo
// --previa=3,12.5,40 → desenha só esses instantes (segundos) e salva PNGs em ferramentas\prints\video\previa, para conferir a edição
const PREVIA = (process.argv.find((a) => a.startsWith('--previa=')) || '').slice(9);

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'lar-video-'));
const QUADROS = path.join(TMP, 'quadros');
fs.mkdirSync(QUADROS, { recursive: true });
fs.mkdirSync(SAIDA, { recursive: true });

let servidorApp = null, edge = null, estudio = null;
async function limpar() {
  if (edge && edge.pid) { try { execFileSync('taskkill', ['/PID', String(edge.pid), '/T', '/F'], { stdio: 'ignore' }); } catch { /* já saiu */ } }
  if (servidorApp && servidorApp.exitCode == null) servidorApp.kill();
  if (estudio) estudio.close();
  for (let i = 0; i < 10; i++) { try { fs.rmSync(TMP, { recursive: true, force: true }); break; } catch { await esperar(500); } }
}

// ───────────── API do sistema (guarda o cookie) ─────────────
let cookie = '';
async function api(metodo, url, corpo) {
  const r = await fetch(BASE + url, { method: metodo, headers: { 'X-APP': '1', ...(corpo ? { 'Content-Type': 'application/json' } : {}), ...(cookie ? { Cookie: cookie } : {}) }, body: corpo ? JSON.stringify(corpo) : undefined });
  const sc = r.headers.get('set-cookie'); if (sc) cookie = sc.split(';')[0];
  return r.json().catch(() => ({}));
}

// ───────────── Edge pelo protocolo de depuração ─────────────
function conectar(url) {
  return new Promise((ok, erro) => {
    const ws = new WebSocket(url);
    let id = 0; const pend = new Map(), ouvintes = [];
    ws.onopen = () => ok({
      enviar: (method, params = {}) => new Promise((res, rej) => { const i = ++id; pend.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); }),
      ouvir: (f) => ouvintes.push(f),
    });
    ws.onerror = () => erro(new Error('não conectei no Edge'));
    ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); m.error ? p.rej(new Error(m.error.message)) : p.res(m.result); } else ouvintes.forEach((f) => f(m)); };
  });
}

async function principal() {
  // ── servidor de teste com a demonstração ──
  servidorApp = spawn(process.execPath, ['--no-warnings', 'server.js'], { cwd: APP, env: { ...process.env, APP_DADOS: path.join(TMP, 'dados'), APP_PORTA: String(PORTA_APP), APP_RAIZ: TMP }, stdio: 'ignore' });
  let subiu = false;
  for (let i = 0; i < 60 && !subiu; i++) { try { subiu = (await fetch(BASE + '/api/versao')).ok; } catch { await esperar(250); } }
  if (!subiu) throw new Error('o servidor de teste não subiu');
  await api('POST', '/api/login', { login: 'kevin', senha: 'trocar123' });
  await api('POST', '/api/trocar-senha', { atual: 'trocar123', nova: 'video-demo-9x' });
  await api('POST', '/api/admin/demo');
  const res = await api('GET', '/api/residentes');
  const noLar = res.filter((r) => r.situacao === 'no_lar');
  const idRes = [...noLar].sort((a, b) => b.n_contatos - a.n_contatos || (b.alergias ? 1 : 0) - (a.alergias ? 1 : 0))[0].id;
  const lanc = await api('GET', `/api/lancamentos?mes=${new Date().toLocaleDateString('sv-SE').slice(0, 7)}`);
  const idRec = (lanc.itens || []).find((l) => l.tipo === 'receita' && l.pago_em)?.id;
  // Uma dose FICTÍCIA no horário de agora, para a cena do "Dei" ter o que marcar (fica só no banco temporário)
  const agora = new Date(), hora = `${String(agora.getHours()).padStart(2, '0')}:00`;
  const outro = noLar.find((r) => r.id !== idRes && !r.alergias) || noLar[0];
  await api('POST', '/api/prescricoes', { residente_id: outro.id, medicamento: 'Vitamina D3 2.000 UI', dose: '1 cápsula', via: 'Oral', se_necessario: 0, horarios: hora,
    inicio: agora.toLocaleDateString('sv-SE'), prescritor: 'Dra. Helena Siqueira (demonstração)', obs: 'Junto com o lanche' });

  // ── Edge ──
  const exe = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find((p) => fs.existsSync(p));
  if (!exe) throw new Error('não achei o Microsoft Edge');
  edge = spawn(exe, ['--headless=new', `--remote-debugging-port=${PORTA_EDGE}`, `--user-data-dir=${path.join(TMP, 'edge')}`, '--no-first-run', '--no-default-browser-check',
    '--disable-extensions', '--hide-scrollbars', '--lang=pt-BR', '--window-size=1920,1080', 'about:blank'], { stdio: 'ignore' });
  let alvo = null;
  for (let i = 0; i < 60 && !alvo; i++) { try { alvo = (await (await fetch(`http://127.0.0.1:${PORTA_EDGE}/json/list`)).json()).find((t) => t.type === 'page'); } catch { /* subindo */ } if (!alvo) await esperar(250); }
  if (!alvo) throw new Error('o Edge escondido não abriu');
  const cdp = await conectar(alvo.webSocketDebuggerUrl);
  await cdp.enviar('Page.enable'); await cdp.enviar('Runtime.enable'); await cdp.enviar('Network.enable');
  const avaliar = async (expr) => {
    const r = await cdp.enviar('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
    return r.result.value;
  };
  const aguardar = async (expr, ms = 10000) => { const fim = Date.now() + ms; while (Date.now() < fim) { try { if (await avaliar(expr)) return true; } catch { /* trocando */ } await esperar(100); } return false; };

  // ═════════════ 1. CAPTURA ═════════════
  console.log('\n1. Fotografando as telas em 4K (demonstração fictícia)…');
  let dpr = 2;
  const tela = async (w, h, escala, celular = false) => {
    dpr = escala;
    await cdp.enviar('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: escala, mobile: celular });
    await cdp.enviar('Emulation.setTouchEmulationEnabled', { enabled: celular });
  };
  await tela(1920, 1080, 2);
  await cdp.enviar('Emulation.setEmulatedMedia', { media: '', features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] });
  const cenas = {};
  // Retângulos (em pixels da foto) dos elementos que a seta do mouse vai visitar — relativos à parte visível da tela,
  // porque a foto é da parte visível (a ficha comprida é fotografada com a página no topo)
  const medir = async (alvos) => {
    const r = {};
    for (const [nome, sel] of Object.entries(alvos)) {
      const b = await avaliar(`(() => { const e = ${sel.startsWith('(') ? sel : `document.querySelector(${JSON.stringify(sel)})`}; if (!e) return null; const r = e.getBoundingClientRect(); return [r.x, r.y, r.width, r.height]; })()`);
      if (b) r[nome] = b.map((v) => Math.round(v * dpr));
    }
    return r;
  };
  const foto = async (nome, { alvos = {}, alturaMax = 0, formato = 'png', clip = null } = {}) => {
    await esperar(900); // animações de entrada terminam
    const medidas = await medir(alvos);
    let params = { format: formato, ...(formato === 'jpeg' ? { quality: 92 } : {}) };
    if (alturaMax) {
      const h = Math.min(alturaMax, await avaliar('document.documentElement.scrollHeight'));
      params = { ...params, captureBeyondViewport: true, clip: { x: 0, y: 0, width: await avaliar('innerWidth'), height: h, scale: 1 } };
    } else if (clip) params = { ...params, clip: { ...clip, scale: 1 } };
    const r = await cdp.enviar('Page.captureScreenshot', params);
    const arq = `${nome}.${formato === 'jpeg' ? 'jpg' : 'png'}`;
    const buf = Buffer.from(r.data, 'base64');
    fs.writeFileSync(path.join(QUADROS, arq), buf);
    cenas[nome] = { arq, w: buf.readUInt32BE(16) || 0, h: buf.readUInt32BE(20) || 0, alvos: medidas };
    if (formato === 'jpeg') { const tam = jpegTamanho(buf); cenas[nome].w = tam[0]; cenas[nome].h = tam[1]; }
    console.log(`  ok  ${nome} (${cenas[nome].w}x${cenas[nome].h})${Object.keys(medidas).length ? ' · alvos: ' + Object.keys(medidas).join(', ') : ''}`);
  };
  const abrir = async (hash) => {
    await cdp.enviar('Page.navigate', { url: `${BASE}/?v=${Date.now()}${hash}` });
    await aguardar(`(() => { const c = document.querySelector('#conteudo'); return !!(c && c.querySelector('h1, .vazio') && !c.querySelector('.carregando')); })()`);
    await avaliar('scrollTo(0, 0)');
  };
  const tema = async (t) => { await avaliar(`localStorage.setItem('lar-tema', '${t}')`); };

  // Tela de entrada (antes de ter sessão), já com o usuário digitado
  await cdp.enviar('Page.navigate', { url: `${BASE}/` });
  await aguardar(`!!document.querySelector('#formEntrada')`);
  await tema('claro');
  await cdp.enviar('Page.navigate', { url: `${BASE}/?v=1` });
  await aguardar(`!!document.querySelector('#formEntrada')`);
  await avaliar(`(() => { document.querySelector('#login').value = 'kevin'; const s = document.querySelector('#formEntrada input[type=password]'); if (s) s.value = 'senha-demo'; document.activeElement.blur(); })()`);
  await foto('entrada', { alvos: { entrar: '#formEntrada button[type=submit]', usuario: '#login' } });

  // Entra (cookie da API) e passa pelas telas
  const [nomeCookie, valorCookie] = cookie.split('=');
  await cdp.enviar('Network.setCookie', { name: nomeCookie, value: valorCookie, domain: '127.0.0.1', path: '/', httpOnly: true });
  await abrir('#/inicio');
  await foto('inicio', { alvos: { numeros: '#numerosInicio', n1: '#numerosInicio .numero:nth-child(1)', n2: '#numerosInicio .numero:nth-child(2)', n3: '#numerosInicio .numero:nth-child(3)', n4: '#numerosInicio .numero:nth-child(4)', tema: '#btnTema' } });
  await abrir('#/residentes');
  await foto('residentes', { alvos: { cartao: `(document.querySelector('a[href="#/residente/${idRes}"]') || {}).closest?.('.res-cartao')` } });
  await abrir(`#/residente/${idRes}`);
  await foto('ficha', { formato: 'jpeg', alturaMax: 2300, alvos: { alergia: '.alerta-alergia', perfil: '.perfil', trilho: '.trilho', topo: '.topo' } });

  // Remédios: o primeiro "Dei" disponível (hoje; se ainda não for hora de nenhum, a folha de ontem)
  await abrir('#/medicacao');
  let temDei = await avaliar(`!!document.querySelector('[data-marcar="dado"]')`);
  if (!temDei) { await abrir(`#/medicacao/${new Date(Date.now() - 86400000).toLocaleDateString('sv-SE')}`); temDei = await avaliar(`!!document.querySelector('[data-marcar="dado"]')`); }
  if (temDei) {
    // "Todos" os turnos nas duas fotos (a tela troca o turno sozinha) e a mesma linha na mesma altura: a troca fica limpa
    const todos = `document.querySelector('.filtroTurnoRem button[data-v="todos"]')?.click()`;
    await avaliar(todos); await esperar(300);
    const chave = await avaliar(`(() => { const b = document.querySelector('[data-marcar="dado"]'); const l = b.closest('.dose'); const y = l.getBoundingClientRect().top + scrollY; scrollTo(0, Math.max(0, y - 560)); return [l.dataset.pres, l.dataset.horario]; })()`);
    const linhaSel = `.dose[data-pres="${chave[0]}"][data-horario="${chave[1]}"]`;
    await foto('remedios-antes', { alvos: { dei: `${linhaSel} [data-marcar="dado"]`, linha: linhaSel } });
    const topoAntes = await avaliar(`document.querySelector('${linhaSel}').getBoundingClientRect().top`);
    await avaliar(`document.querySelector('${linhaSel} [data-marcar="dado"]').click()`);
    await aguardar(`!!document.querySelector('.toast.visivel')`, 6000);
    await esperar(500); await avaliar(todos); await esperar(500);
    await avaliar(`(() => { const l = document.querySelector('${linhaSel}'); scrollTo(0, l.getBoundingClientRect().top + scrollY - ${topoAntes}); })()`);
    await foto('remedios-depois', { alvos: { linha: linhaSel } });
  } else await foto('remedios-antes', {});

  await abrir(`#/sinais/residente-${idRes}`);
  await foto('sinais', { alvos: { grafico1: '.grafico-cartao:nth-child(1)', grafico2: '.grafico-cartao:nth-child(2)' } });
  // Páginas da montagem: fotografadas INTEIRAS (até 1300 px de altura na tela), para a câmera rolar e mostrar tudo
  for (const [hash, nome] of [['#/diario', 'diario'], ['#/agenda', 'agenda'], ['#/tarefas', 'tarefas'], ['#/prescricoes', 'prescricoes'], ['#/vacinas', 'vacinas'],
    ['#/avaliacoes', 'avaliacoes'], [`#/pia/residente-${idRes}`, 'pia'], ['#/estoque', 'estoque'], ['#/patrimonio', 'patrimonio'], ['#/escala', 'escala'],
    ['#/profissionais', 'profissionais'], ['#/financeiro', 'financeiro'], ['#/mensalidades', 'mensalidades'], [`#/prontuario/${idRes}`, 'prontuario']]) {
    await abrir(hash);
    await foto(nome, { formato: 'jpeg', alturaMax: 2600, alvos: { trilho: '.trilho', topo: '.topo' } });
  }
  for (const [hash, nome] of [['#/config/backups', 'backups']]) {
    await abrir(hash);
    // Cópias: a pasta de verdade é a temporária deste teste (mostra o usuário do Windows); na foto vira um pen drive
    if (nome === 'backups') await esperar(800);
    if (nome === 'backups') await avaliar(`(() => { const tmp = ${JSON.stringify(TMP)}; const novo = 'E:\\\\Cópias do Lar';
      const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); for (let n; (n = w.nextNode());) if (n.nodeValue.includes(tmp)) n.nodeValue = n.nodeValue.split(tmp + '\\\\dados\\\\backups').join(novo).split(tmp).join(novo);
      for (const i of document.querySelectorAll('input')) { if (i.value.includes(tmp)) i.value = novo; if ((i.placeholder || '').includes(tmp)) i.placeholder = novo; } })()`);
    await foto(nome);
  }

  // Modo escuro
  await tema('escuro');
  await abrir('#/inicio'); await foto('inicio-escuro');
  await tema('claro');

  // Documentos impressos: a 1ª página de cada um, como sai no papel (A4 a 96 dpi, ampliado 3x)
  const documento = async (hash, nome, paisagem) => {
    await tela(1920, 1080, 2);
    await abrir(hash);
    const [w, h] = paisagem ? [1123, 794] : [794, 1123];
    await tela(w, h, 3);
    await avaliar(`(() => { prepararImpressao(); const s = document.createElement('style'); s.id = 'papelVideo';
      s.textContent = '#impressao { padding: ${paisagem ? '11mm 12mm' : '14mm 13mm'}; background: #fff; } html, body { background: #fff !important; }'; document.head.appendChild(s); scrollTo(0, 0); })()`);
    await cdp.enviar('Emulation.setEmulatedMedia', { media: 'print' });
    await foto(nome, { clip: { x: 0, y: 0, width: w, height: h } });
    await cdp.enviar('Emulation.setEmulatedMedia', { media: '' });
    await avaliar(`(() => { limparImpressao(); document.getElementById('papelVideo')?.remove(); })()`);
  };
  await documento(`#/residente/${idRes}`, 'doc-ficha', false);
  await documento('#/medicacao', 'doc-remedios', true);
  if (idRec) await documento(`#/recibo/${idRec}`, 'doc-recibo', false);

  // Celular (390 x 844, 3x)
  await tela(390, 844, 3, true);
  for (const [hash, nome] of [['#/inicio', 'cel-inicio'], ['#/medicacao', 'cel-remedios'], [`#/residente/${idRes}`, 'cel-ficha']]) { await abrir(hash); await foto(nome); }
  await tela(1920, 1080, 2);

  fs.writeFileSync(path.join(TMP, 'cenas.json'), JSON.stringify(cenas));
  // O app de teste não é mais necessário: libera memória antes de gravar
  servidorApp.kill(); servidorApp = null;
  if (SO_CAPTURA) {
    const destino = path.join(SAIDA, 'capturas'); fs.mkdirSync(destino, { recursive: true });
    for (const f of fs.readdirSync(QUADROS)) fs.copyFileSync(path.join(QUADROS, f), path.join(destino, f));
    fs.writeFileSync(path.join(destino, 'cenas.json'), JSON.stringify(cenas, null, 1));
    console.log(`\nSó a captura: fotos em ${destino}`);
    return;
  }

  // ═════════════ 2. ESTÚDIO ═════════════
  console.log('\n2. Montando e gravando o vídeo (4K, 30 quadros/s)…');
  const ARQ_DADOS = path.join(TMP, 'video.h264');
  const dados = fs.openSync(ARQ_DADOS, 'w');
  const amostras = []; // { tam, chave }
  let descricao = null, fimOk, fimErro, progresso = '';
  const terminou = new Promise((ok, erro) => { fimOk = ok; fimErro = erro; });
  const ARQUIVOS = {
    '/estudio.html': path.join(AQUI, 'estudio.html'), '/estudio.js': path.join(AQUI, 'estudio.js'), '/cenas.json': path.join(TMP, 'cenas.json'),
    '/logo-oase.svg': path.join(PUB, 'logo-oase.svg'), '/logo-casa.svg': path.join(PUB, 'logo-casa.svg'),
    '/fontes/onest.woff2': path.join(PUB, 'fontes', 'onest.woff2'), '/fontes/bricolage-grotesque.woff2': path.join(PUB, 'fontes', 'bricolage-grotesque.woff2'),
  };
  const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.png': 'image/png', '.jpg': 'image/jpeg' };
  estudio = http.createServer((req, resp) => {
    const u = new URL(req.url, 'http://x');
    if (req.method === 'POST') {
      const partes = []; req.on('data', (c) => partes.push(c));
      req.on('end', () => {
        const corpo = Buffer.concat(partes);
        if (u.pathname === '/config') descricao = corpo;
        else if (u.pathname === '/pedaco') { if (Number(u.searchParams.get('n')) === amostras.length) { fs.writeSync(dados, corpo); amostras.push({ tam: corpo.length, chave: u.searchParams.get('k') === '1' }); } } // repetido (nova tentativa): ignora
        else if (u.pathname === '/progresso') progresso = corpo.toString();
        else if (u.pathname === '/capa') fs.writeFileSync(ARQ_VIDEO.replace(/\.mp4$/, '-capa.png'), corpo);
        else if (u.pathname === '/previa') { const d = path.join(SAIDA, 'previa'); fs.mkdirSync(d, { recursive: true }); fs.writeFileSync(path.join(d, `quadro-${u.searchParams.get('t')}s.png`), corpo); }
        else if (u.pathname === '/fim') fimOk();
        else if (u.pathname === '/erro') fimErro(new Error('estúdio: ' + corpo.toString()));
        resp.writeHead(204); resp.end();
      });
      return;
    }
    const arq = ARQUIVOS[u.pathname] || (u.pathname.startsWith('/quadros/') ? path.join(QUADROS, path.basename(u.pathname)) : null);
    if (!arq || !fs.existsSync(arq)) { resp.writeHead(404); resp.end(); return; }
    resp.writeHead(200, { 'Content-Type': TIPOS[path.extname(arq)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    fs.createReadStream(arq).pipe(resp);
  }).listen(PORTA_ESTUDIO, '127.0.0.1');
  estudio.keepAliveTimeout = 120000; // a conexão parada não é fechada no meio de um envio (era a causa do "Failed to fetch")
  cdp.ouvir((m) => { if (m.method === 'Runtime.exceptionThrown') fimErro(new Error(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text)); });
  await cdp.enviar('Emulation.clearDeviceMetricsOverride');
  await cdp.enviar('Page.navigate', { url: `http://127.0.0.1:${PORTA_ESTUDIO}/estudio.html${PREVIA ? '?previa=' + PREVIA : FULLHD ? '?saida=1080' : ''}` });
  const inicio = Date.now();
  const vigia = setInterval(() => { if (progresso) process.stdout.write(`\r  ${progresso} · ${Math.round((Date.now() - inicio) / 1000)} s     `); }, 2000);
  try { await terminou; } finally { clearInterval(vigia); }
  fs.closeSync(dados);
  if (PREVIA) { console.log(`\nPrévia salva em ${path.join(SAIDA, 'previa')}`); return; }
  console.log(`\n  ${amostras.length} quadros codificados em ${Math.round((Date.now() - inicio) / 1000)} s`);
  if (!descricao) throw new Error('o codificador não mandou a configuração do H.264');
  escreverMp4(ARQ_VIDEO, ARQ_DADOS, amostras, descricao);
  console.log(`\nVídeo pronto: ${ARQ_VIDEO} (${(fs.statSync(ARQ_VIDEO).size / 1048576).toFixed(0)} MB, ${(amostras.length / FPS).toFixed(1)} s)`);
}

// Tamanho de um JPEG (marcador SOF)
function jpegTamanho(b) {
  let i = 2;
  while (i < b.length) {
    const m = b[i + 1], tam = b.readUInt16BE(i + 2);
    if (m >= 0xc0 && m <= 0xc3) return [b.readUInt16BE(i + 7), b.readUInt16BE(i + 5)];
    i += 2 + tam;
  }
  return [0, 0];
}

// ───────────── MP4 (uma faixa de vídeo H.264, "faststart": o índice vem antes dos dados) ─────────────
function escreverMp4(destino, arqDados, amostras, avcC) {
  const u32 = (n) => { const b = Buffer.alloc(4); b.writeUInt32BE(n >>> 0); return b; };
  const u16 = (n) => { const b = Buffer.alloc(2); b.writeUInt16BE(n); return b; };
  const caixa = (tipo, ...p) => { const corpo = Buffer.concat(p); return Buffer.concat([u32(8 + corpo.length), Buffer.from(tipo, 'latin1'), corpo]); };
  const caixaV = (tipo, versao, flags, ...p) => caixa(tipo, u32((versao << 24) | flags), ...p);
  const MATRIZ = Buffer.concat([u32(0x10000), u32(0), u32(0), u32(0), u32(0x10000), u32(0), u32(0), u32(0), u32(0x40000000)]);
  const n = amostras.length, ESCALA = FPS * 1000, DELTA = 1000, durMs = Math.round((n / FPS) * 1000);
  const ftyp = caixa('ftyp', Buffer.from('isom', 'latin1'), u32(512), Buffer.from('isomiso2avc1mp41', 'latin1'));
  const moov = (offset) => caixa('moov',
    caixaV('mvhd', 0, 0, u32(0), u32(0), u32(1000), u32(durMs), u32(0x10000), u16(0x100), Buffer.alloc(10), MATRIZ, Buffer.alloc(24), u32(2)),
    caixa('trak',
      caixaV('tkhd', 0, 3, u32(0), u32(0), u32(1), u32(0), u32(durMs), Buffer.alloc(8), u16(0), u16(0), u16(0), u16(0), MATRIZ, u32(LARG << 16), u32(ALT << 16)),
      caixa('mdia',
        caixaV('mdhd', 0, 0, u32(0), u32(0), u32(ESCALA), u32(n * DELTA), u16(0x55c4), u16(0)),
        caixaV('hdlr', 0, 0, u32(0), Buffer.from('vide', 'latin1'), Buffer.alloc(12), Buffer.from('OASE Lar\0', 'latin1')),
        caixa('minf',
          caixaV('vmhd', 0, 1, Buffer.alloc(8)),
          caixa('dinf', caixaV('dref', 0, 0, u32(1), caixaV('url ', 0, 1))),
          caixa('stbl',
            caixaV('stsd', 0, 0, u32(1), caixa('avc1', Buffer.alloc(6), u16(1), Buffer.alloc(16), u16(LARG), u16(ALT), u32(0x480000), u32(0x480000), u32(0), u16(1),
              Buffer.alloc(32), u16(0x18), u16(0xffff), caixa('avcC', avcC))),
            caixaV('stts', 0, 0, u32(1), u32(n), u32(DELTA)),
            caixaV('stss', 0, 0, u32(amostras.filter((a) => a.chave).length), ...amostras.map((a, i) => (a.chave ? u32(i + 1) : null)).filter(Boolean)),
            caixaV('stsc', 0, 0, u32(1), u32(1), u32(n), u32(1)),
            caixaV('stsz', 0, 0, u32(0), u32(n), ...amostras.map((a) => u32(a.tam))),
            caixaV('stco', 0, 0, u32(1), u32(offset)))))));
  const totalDados = amostras.reduce((s, a) => s + a.tam, 0);
  const tamMoov = moov(0).length;
  const cabecalho = Buffer.concat([ftyp, moov(ftyp.length + tamMoov + 8), u32(8 + totalDados), Buffer.from('mdat', 'latin1')]);
  const fd = fs.openSync(destino, 'w');
  fs.writeSync(fd, cabecalho);
  const ent = fs.openSync(arqDados, 'r'), buf = Buffer.alloc(8 * 1048576);
  for (let lidos; (lidos = fs.readSync(ent, buf, 0, buf.length, null)) > 0;) fs.writeSync(fd, buf, 0, lidos);
  fs.closeSync(ent); fs.closeSync(fd);
}

principal()
  .catch((e) => { console.error('\nERRO:', e.message); process.exitCode = 1; })
  .finally(limpar);
