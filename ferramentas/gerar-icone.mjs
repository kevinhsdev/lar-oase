// Gera o ícone do atalho (app/public/icone.ico) a partir do símbolo da OASE em app/public/icone.svg,
// e a logo do menu lateral em PNG de fundo transparente (logo.png no tema claro, logo-escuro.png no escuro).
// Desenha o SVG num canvas do Edge escondido em vários tamanhos (16 a 256 px) e junta tudo num .ico.
// Uso (na pasta do projeto):  node ferramentas/gerar-icone.mjs   (depois: ferramentas\criar-atalho.ps1)
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUBLICO = path.join(RAIZ, 'app', 'public');
const TAMANHOS = [16, 24, 32, 48, 64, 128, 256];
const PASTA = fs.mkdtempSync(path.join(os.tmpdir(), 'lar-icone-'));
const url = (p) => 'file:///' + p.split(path.sep).join('/');
const EDGE = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find((p) => fs.existsSync(p));
if (!EDGE) { console.error('Não achei o Microsoft Edge.'); process.exit(1); }

const pagina = `<!doctype html><meta charset="utf-8"><body><script>
async function gerar(tamanhos) {
  const img = new Image(); img.src = ${JSON.stringify(url(path.join(PUBLICO, 'icone.svg')))}; await img.decode();
  const saida = {};
  for (const n of tamanhos) {
    // Desenha grande e reduz em etapas: fica nítido até em 16 px
    let t = 1024, c = new OffscreenCanvas(t, t); c.getContext('2d').drawImage(img, 0, 0, t, t);
    while (t / 2 >= n) { t = Math.round(t / 2); const d = new OffscreenCanvas(t, t), x = d.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(c, 0, 0, t, t); c = d; }
    const f = new OffscreenCanvas(n, n), xf = f.getContext('2d'); xf.imageSmoothingQuality = 'high'; xf.drawImage(c, 0, 0, n, n);
    const blob = await f.convertToBlob({ type: 'image/png' });
    saida[n] = btoa(String.fromCharCode(...new Uint8Array(await blob.arrayBuffer())));
  }
  return JSON.stringify(saida);
}
// Logo do menu lateral: só o símbolo, fundo TRANSPARENTE (PNG), uma cor para cada tema
async function logos(variantes) {
  const saida = {};
  for (const [nome, svg] of Object.entries(variantes)) {
    const img = new Image(); img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg); await img.decode();
    const L = 150, A = 183; // 3x o tamanho do menu (50 x 61): fica nítido em tela de alta resolução
    const c = new OffscreenCanvas(L, A), x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(img, 0, 0, L, A);
    const blob = await c.convertToBlob({ type: 'image/png' });
    saida[nome] = btoa(String.fromCharCode(...new Uint8Array(await blob.arrayBuffer())));
  }
  return JSON.stringify(saida);
}
</script>`;
// Mesmo desenho do icone.svg, sem o azulejo: [cor do traço, cor do globo]
const simbolo = (traco, globo) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 122" width="500" height="610">
  <path d="M50 5 C47 40 29 88 5 101 C30 103 45 108 50 117 C55 108 70 103 95 101 C71 88 53 40 50 5 Z" fill="none" stroke="${traco}" stroke-width="4.5" stroke-linejoin="round"/>
  <ellipse cx="50" cy="88" rx="22" ry="10" fill="${globo}" stroke="${traco}" stroke-width="4.5"/>
  <path d="M29 88h42" stroke="${traco}" stroke-width="2.5"/>
  <rect x="46.5" y="40" width="7" height="56" fill="${traco}"/><rect x="39" y="50" width="22" height="7" fill="${traco}"/></svg>`;
const LOGOS = { 'logo.png': simbolo('#8e1b2f', '#e8c9ce'), 'logo-escuro.png': simbolo('#e8909e', '#5a2630') };

const edge = spawn(EDGE, ['--headless=new', '--disable-gpu', '--remote-debugging-port=9343', `--user-data-dir=${PASTA}/perfil`, '--allow-file-access-from-files', 'about:blank'], { stdio: 'ignore' });
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
try {
  let alvo;
  for (let i = 0; i < 40 && !alvo; i++) { await espera(250); try { alvo = (await (await fetch('http://127.0.0.1:9343/json')).json()).find((t) => t.type === 'page'); } catch { /* subindo */ } }
  if (!alvo) throw new Error('o Edge escondido não abriu');
  const ws = new WebSocket(alvo.webSocketDebuggerUrl); await new Promise((r) => (ws.onopen = r));
  let id = 0; const pend = new Map();
  ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); } };
  const cdp = (method, params = {}) => new Promise((r) => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  const arq = path.join(PASTA, 'icone.html');
  fs.writeFileSync(arq, pagina);
  await cdp('Page.enable');
  await cdp('Page.navigate', { url: url(arq) }); await espera(800);
  const r = await cdp('Runtime.evaluate', { expression: `gerar(${JSON.stringify(TAMANHOS)})`, awaitPromise: true, returnByValue: true });
  if (r.result.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 400));
  const saida = JSON.parse(r.result.result.value);
  const pngs = TAMANHOS.map((n) => [n, Buffer.from(saida[n], 'base64')]);
  // .ico com as imagens em PNG (Windows Vista em diante)
  const cab = Buffer.alloc(6); cab.writeUInt16LE(0, 0); cab.writeUInt16LE(1, 2); cab.writeUInt16LE(pngs.length, 4);
  const dir = Buffer.alloc(16 * pngs.length);
  let off = 6 + dir.length;
  pngs.forEach(([n, png], i) => {
    const o = i * 16;
    dir.writeUInt8(n >= 256 ? 0 : n, o); dir.writeUInt8(n >= 256 ? 0 : n, o + 1); dir.writeUInt8(0, o + 2); dir.writeUInt8(0, o + 3);
    dir.writeUInt16LE(1, o + 4); dir.writeUInt16LE(32, o + 6); dir.writeUInt32LE(png.length, o + 8); dir.writeUInt32LE(off, o + 12);
    off += png.length;
  });
  fs.writeFileSync(path.join(PUBLICO, 'icone.ico'), Buffer.concat([cab, dir, ...pngs.map(([, p]) => p)]));
  fs.writeFileSync(path.join(PUBLICO, 'icone-256.png'), pngs.find(([n]) => n === 256)[1]);
  console.log('Ícone gerado em app/public/icone.ico (' + TAMANHOS.join(', ') + ' px) e app/public/icone-256.png');
  const rl = await cdp('Runtime.evaluate', { expression: `logos(${JSON.stringify(LOGOS)})`, awaitPromise: true, returnByValue: true });
  if (rl.result.exceptionDetails) throw new Error(JSON.stringify(rl.result.exceptionDetails).slice(0, 400));
  for (const [nome, b64] of Object.entries(JSON.parse(rl.result.result.value))) fs.writeFileSync(path.join(PUBLICO, nome), Buffer.from(b64, 'base64'));
  console.log('Logo do menu (fundo transparente) em app/public/logo.png e logo-escuro.png');
  ws.close();
} finally {
  edge.kill(); await espera(800);
  try { fs.rmSync(PASTA, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 }); } catch { console.log('(a pasta temporária ' + PASTA + ' não pôde ser apagada agora; o Windows limpa depois)'); }
}
