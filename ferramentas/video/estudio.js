// ESTÚDIO do vídeo de apresentação: desenha cada quadro (3840 x 2160) num canvas e codifica em H.264 (WebCodecs).
// As fotos das telas (quadros/*.png) e a posição dos botões (cenas.json) vêm da captura do gravar-video.mjs.
// Edição: abertura com a logo → entrada → painel → residentes → ficha → remédios → sinais → montagem dos módulos →
// documentos → modo escuro → celular → segurança → encerramento. Cada cena tem câmera, seta do mouse e legenda.
// ?previa=3,12.5,40 desenha só esses instantes (em segundos) e manda as imagens para conferir, sem gravar o vídeo.
'use strict';

const L = 3840, A = 2160, FPS = 30, TRANS = 0.7; // TRANS = tempo da transição entre cenas (s)
const COR = { laranja: '#ff7900', verde: '#28a809', marca: '#2c6b5e', fundo1: '#0a1411', fundo2: '#12292200' };
const tela = document.createElement('canvas'); tela.width = L; tela.height = A;
const ctx = tela.getContext('2d');
const apoio = document.createElement('canvas'); apoio.width = L; apoio.height = A; // a cena que está entrando, na transição
const actx = apoio.getContext('2d');
let CENAS = {};

// ───────────── matemática do movimento ─────────────
const cl = (x) => Math.max(0, Math.min(1, x));
const pr = (t, a, b) => cl((t - a) / (b - a));
const lerp = (a, b, k) => a + (b - a) * k;
const eIO = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2); // suave nos dois lados
const eO = (x) => 1 - Math.pow(1 - x, 3);
const eO5 = (x) => 1 - Math.pow(1 - x, 5); // chega devagar (entradas)
// Valor ao longo de quadros-chave: [[t, v], ...] (v número ou lista de números)
function kf(t, chaves, ease = eIO) {
  if (t <= chaves[0][0]) return chaves[0][1];
  for (let i = 0; i < chaves.length - 1; i++) {
    const [t0, v0] = chaves[i], [t1, v1] = chaves[i + 1];
    if (t <= t1) { const k = ease(pr(t, t0, t1)); return Array.isArray(v0) ? v0.map((x, j) => lerp(x, v1[j], k)) : lerp(v0, v1, k); }
  }
  return chaves[chaves.length - 1][1];
}
const centro = (r) => (r ? [r[0] + r[2] / 2, r[1] + r[3] / 2] : null);
const alvo = (cena, nome) => (CENAS[cena] && CENAS[cena].alvos[nome]) || null;

// ───────────── imagens (carrega sob demanda e solta da memória quando não precisa mais) ─────────────
const imagens = new Map(), carregando = new Map();
async function carregar(nome) {
  if (imagens.has(nome)) return imagens.get(nome);
  if (!carregando.has(nome)) {
    carregando.set(nome, (async () => {
      const blob = await (await fetch('/quadros/' + CENAS[nome].arq)).blob();
      const bmp = await createImageBitmap(blob);
      imagens.set(nome, bmp); carregando.delete(nome);
      return bmp;
    })());
  }
  return carregando.get(nome);
}
const I = (nome) => imagens.get(nome);
function soltar(manter) { for (const [n, b] of imagens) if (!manter.has(n)) { b.close(); imagens.delete(n); } }
async function svgImagem(url, largura) {
  let txt = await (await fetch(url)).text();
  const vb = txt.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
  const [vw, vh] = [Number(vb[1]), Number(vb[2])];
  txt = txt.replace('<svg ', `<svg width="${largura}" height="${Math.round((largura * vh) / vw)}" `);
  const img = new Image(); img.src = URL.createObjectURL(new Blob([txt], { type: 'image/svg+xml' })); await img.decode();
  return img;
}
let CASA = null; // a logo do lar só com o desenho (a palavra OASE é escrita à parte, com a fonte do sistema)

// ───────────── peças de desenho ─────────────
function fundo(c, t) {
  const g = c.createLinearGradient(0, 0, L, A);
  g.addColorStop(0, '#08110e'); g.addColorStop(0.55, '#0d1f1a'); g.addColorStop(1, '#13302a');
  c.fillStyle = g; c.fillRect(0, 0, L, A);
  brilho(c, 2950 + 260 * Math.sin(t * 0.21), 260 + 140 * Math.cos(t * 0.17), 1700, 'rgba(255,121,0,0.17)');
  brilho(c, 640 + 200 * Math.cos(t * 0.19), 1950 + 90 * Math.sin(t * 0.23), 1800, 'rgba(40,168,9,0.13)');
  brilho(c, 1920, 1080, 2600, 'rgba(44,107,94,0.10)');
  const v = c.createRadialGradient(L / 2, A / 2, A * 0.45, L / 2, A / 2, A * 1.25); // vinheta
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.55)');
  c.fillStyle = v; c.fillRect(0, 0, L, A);
}
function brilho(c, x, y, r, cor) {
  const g = c.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, cor); g.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2);
}
function rr(c, x, y, w, h, r) { c.beginPath(); c.roundRect(x, y, w, h, r); }
function texto(c, s, x, y, { tam = 60, peso = 400, fonte = 'Onest', cor = '#fff', alinhar = 'left', espaco = 0, alpha = 1 } = {}) {
  c.save(); c.globalAlpha *= alpha; c.font = `${peso} ${tam}px "${fonte}"`; c.fillStyle = cor; c.textAlign = alinhar; c.textBaseline = 'alphabetic';
  c.letterSpacing = espaco + 'px'; c.fillText(s, x, y); c.restore();
}
function medida(c, s, tam, peso, fonte, espaco = 0) { c.save(); c.font = `${peso} ${tam}px "${fonte}"`; c.letterSpacing = espaco + 'px'; const w = c.measureText(s).width; c.restore(); return w; }

// Janela do navegador onde o sistema aparece. Devolve o mapa "ponto da foto → ponto da tela".
const J = { w: 3240, barra: 74 };
J.s = J.w / L; J.h = J.barra + A * J.s; J.x = (L - J.w) / 2; J.y = (A - J.h) / 2 + 8;
function janela(c, desenharConteudo, { escuro = false } = {}) {
  c.save();
  c.shadowColor = 'rgba(0,0,0,0.6)'; c.shadowBlur = 140; c.shadowOffsetY = 60;
  rr(c, J.x, J.y, J.w, J.h, 30); c.fillStyle = escuro ? '#1a1f1d' : '#ece8e1'; c.fill();
  c.restore();
  c.save(); rr(c, J.x, J.y, J.w, J.h, 30); c.clip();
  c.fillStyle = escuro ? '#202624' : '#e7e2d9'; c.fillRect(J.x, J.y, J.w, J.barra);
  ['#ff5f57', '#febc2e', '#28c840'].forEach((cor, i) => { c.beginPath(); c.arc(J.x + 46 + i * 40, J.y + J.barra / 2, 12, 0, Math.PI * 2); c.fillStyle = cor; c.fill(); });
  rr(c, J.x + J.w / 2 - 470, J.y + 15, 940, J.barra - 30, 22); c.fillStyle = escuro ? '#141816' : '#f7f4ee'; c.fill();
  cadeado(c, J.x + J.w / 2 - 200, J.y + J.barra / 2, escuro ? '#8d958f' : '#7b817c');
  texto(c, 'localhost:3001', J.x + J.w / 2 - 170, J.y + J.barra / 2 + 11, { tam: 30, cor: escuro ? '#a7ada9' : '#5d635f' });
  texto(c, '·  OASE · Lar', J.x + J.w / 2 + 50, J.y + J.barra / 2 + 11, { tam: 30, cor: escuro ? '#6f7671' : '#9a9f9b' });
  c.translate(J.x, J.y + J.barra); c.scale(J.s, J.s);
  c.beginPath(); c.rect(0, 0, L, A); c.clip();
  desenharConteudo(c);
  c.restore();
}
function cadeado(c, x, y, cor) {
  c.save(); c.strokeStyle = cor; c.fillStyle = cor; c.lineWidth = 3.5;
  c.beginPath(); c.arc(x, y - 6, 8, Math.PI, 0); c.stroke(); rr(c, x - 11, y - 6, 22, 17, 3); c.fill(); c.restore();
}
const naJanela = ([px, py]) => [J.x + px * J.s, J.y + J.barra + py * J.s];
// Câmera: { z, cx, cy } — o ponto (cx, cy) da tela fica no centro, ampliado z vezes
const CAM0 = { z: 1, cx: L / 2, cy: A / 2 };
const camEm = (ponto, z) => { const [x, y] = naJanela(ponto); return { z, cx: x, cy: y }; };
function camKf(t, chaves) { const v = kf(t, chaves.map(([tt, cam]) => [tt, [cam.z, cam.cx, cam.cy]])); return { z: v[0], cx: v[1], cy: v[2] }; }
function aplicarCam(c, cam) { c.translate(L / 2, A / 2); c.scale(cam.z, cam.z); c.translate(-cam.cx, -cam.cy); }
const naTela = (ponto, cam) => { const [x, y] = naJanela(ponto); return [(x - cam.cx) * cam.z + L / 2, (y - cam.cy) * cam.z + A / 2]; };

// Seta do mouse (tamanho fixo na tela) e o "clique"
function seta(c, x, y, aperto = 0, alpha = 1) {
  if (alpha <= 0) return;
  c.save(); c.globalAlpha = alpha; c.translate(x, y); const k = 2.5 * (1 - 0.14 * aperto); c.scale(k, k);
  c.shadowColor = 'rgba(0,0,0,0.38)'; c.shadowBlur = 9; c.shadowOffsetY = 3;
  c.beginPath(); c.moveTo(0, 0); c.lineTo(0, 31); c.lineTo(7.6, 24.2); c.lineTo(12.8, 36.2); c.lineTo(18, 34); c.lineTo(12.9, 22.3); c.lineTo(22.6, 22.3); c.closePath();
  c.fillStyle = '#ffffff'; c.fill(); c.shadowColor = 'transparent';
  c.lineWidth = 1.7; c.strokeStyle = '#111'; c.lineJoin = 'round'; c.stroke(); c.restore();
}
function onda(c, x, y, k) {
  if (k <= 0 || k >= 1) return;
  c.save();
  c.globalAlpha = (1 - k) * 0.85; c.strokeStyle = COR.laranja; c.lineWidth = 9 * (1 - k) + 2;
  c.beginPath(); c.arc(x, y, lerp(14, 120, eO(k)), 0, Math.PI * 2); c.stroke();
  c.globalAlpha = (1 - k) * 0.22; c.fillStyle = COR.laranja; c.beginPath(); c.arc(x, y, lerp(10, 80, eO(k)), 0, Math.PI * 2); c.fill();
  c.restore();
}
// Caminho da seta: [[t, x, y], ...] em pixels da foto; anda em arco leve, como a mão de verdade
function posSeta(t, chaves) {
  if (t <= chaves[0][0]) return [chaves[0][1], chaves[0][2]];
  for (let i = 0; i < chaves.length - 1; i++) {
    const [t0, x0, y0] = chaves[i], [t1, x1, y1] = chaves[i + 1];
    if (t <= t1) {
      const k = eIO(pr(t, t0, t1)), dx = x1 - x0, dy = y1 - y0, curva = Math.sin(Math.PI * k) * 0.12;
      return [lerp(x0, x1, k) - dy * curva, lerp(y0, y1, k) + dx * curva];
    }
  }
  const u = chaves[chaves.length - 1]; return [u[1], u[2]];
}
// Seta + cliques dentro de uma cena com janela
function desenharSeta(c, t, cam, { chaves, cliques = [], aparece = [0, 0.4], some = null }) {
  if (!chaves) return;
  const [x, y] = naTela(posSeta(t, chaves), cam);
  let alpha = pr(t, aparece[0], aparece[1]); if (some) alpha *= 1 - pr(t, some[0], some[1]);
  let aperto = 0;
  for (const tc of cliques) { onda(c, x, y, pr(t, tc, tc + 0.6)); aperto = Math.max(aperto, t >= tc - 0.08 && t < tc + 0.18 ? Math.sin(pr(t, tc - 0.08, tc + 0.18) * Math.PI) : 0); }
  seta(c, x, y, aperto, alpha);
}

// Legenda de marketing: rótulo pequeno + título + frase, entra deslizando e sai suave
function legenda(c, t, a, b, rotulo, titulo, frase) {
  const kin = eO5(pr(t, a, a + 0.7)), kout = 1 - eIO(pr(t, b - 0.45, b));
  const al = Math.min(kin, kout); if (al <= 0.001) return;
  const x = 230, pad = 56;
  const wT = medida(c, titulo, 96, 700, 'Bricolage Grotesque'), wF = medida(c, frase, 48, 400, 'Onest'), wR = medida(c, rotulo, 30, 700, 'Onest', 7);
  const w = Math.max(wT, wF, wR) + pad * 2 + 22, h = 312;
  const y = A - 150 - h + (1 - kin) * 70;
  c.save(); c.globalAlpha = al;
  c.shadowColor = 'rgba(0,0,0,0.5)'; c.shadowBlur = 80; c.shadowOffsetY = 30;
  rr(c, x, y, w, h, 34); c.fillStyle = 'rgba(8,15,13,0.9)'; c.fill(); c.shadowColor = 'transparent';
  c.lineWidth = 2; c.strokeStyle = 'rgba(255,255,255,0.08)'; c.stroke();
  rr(c, x + 34, y + 52, 10, h - 104, 5); const g = c.createLinearGradient(0, y + 52, 0, y + h - 52); g.addColorStop(0, COR.laranja); g.addColorStop(1, COR.verde); c.fillStyle = g; c.fill();
  // o texto entra um pouco depois do painel
  const kt = eO5(pr(t, a + 0.12, a + 0.85));
  texto(c, rotulo, x + pad + 22, y + 96, { tam: 30, peso: 700, cor: COR.laranja, espaco: 7, alpha: kt });
  texto(c, titulo, x + pad + 22 - (1 - kt) * 30, y + 196, { tam: 96, peso: 700, fonte: 'Bricolage Grotesque', alpha: kt });
  texto(c, frase, x + pad + 22 - (1 - kt) * 18, y + 262, { tam: 48, cor: 'rgba(255,255,255,0.78)', alpha: eO5(pr(t, a + 0.22, a + 0.95)) });
  c.restore();
}

// Celular desenhado (corpo, tela com a foto, ilha no topo)
function celular(c, img, cx, cy, h, rot = 0) {
  const borda = h * 0.022, telaH = h - borda * 2, telaW = telaH * (img.width / img.height), w = telaW + borda * 2;
  c.save(); c.translate(cx, cy); c.rotate(rot);
  c.shadowColor = 'rgba(0,0,0,0.6)'; c.shadowBlur = 120; c.shadowOffsetY = 60;
  rr(c, -w / 2, -h / 2, w, h, w * 0.15); c.fillStyle = '#0c0d0e'; c.fill(); c.shadowColor = 'transparent';
  c.lineWidth = 5; c.strokeStyle = 'rgba(255,255,255,0.16)'; c.stroke();
  c.save(); rr(c, -telaW / 2, -telaH / 2, telaW, telaH, telaW * 0.13); c.clip(); c.drawImage(img, -telaW / 2, -telaH / 2, telaW, telaH); c.restore();
  c.restore();
}
// Folha de papel (documento impresso) com sombra
function folha(c, img, cx, cy, largura, rot, alpha) {
  const h = largura * (img.height / img.width);
  c.save(); c.globalAlpha = alpha; c.translate(cx, cy); c.rotate(rot);
  c.shadowColor = 'rgba(0,0,0,0.55)'; c.shadowBlur = 110; c.shadowOffsetY = 50;
  c.fillStyle = '#fff'; c.fillRect(-largura / 2, -h / 2, largura, h); c.shadowColor = 'transparent';
  c.drawImage(img, -largura / 2, -h / 2, largura, h);
  c.restore();
}
function selo(c, txt, x, y, k) { // "pílula" com visto, usada na cena de segurança
  if (k <= 0) return;
  const w = medida(c, txt, 46, 600, 'Onest') + 150, h = 96;
  c.save(); c.globalAlpha = k; c.translate((1 - k) * 60, 0);
  c.shadowColor = 'rgba(0,0,0,0.45)'; c.shadowBlur = 60; c.shadowOffsetY = 20;
  rr(c, x - w, y, w, h, 48); c.fillStyle = 'rgba(8,15,13,0.92)'; c.fill(); c.shadowColor = 'transparent';
  c.beginPath(); c.arc(x - w + 52, y + h / 2, 26, 0, Math.PI * 2); c.fillStyle = COR.verde; c.fill();
  c.strokeStyle = '#fff'; c.lineWidth = 7; c.lineCap = 'round'; c.lineJoin = 'round';
  c.beginPath(); c.moveTo(x - w + 40, y + h / 2); c.lineTo(x - w + 49, y + h / 2 + 10); c.lineTo(x - w + 65, y + h / 2 - 10); c.stroke();
  texto(c, txt, x - w + 98, y + h / 2 + 16, { tam: 46, peso: 600 });
  c.restore();
}

// "OASE" escrito com a fonte do sistema: letras largas em degradê laranja, entrando uma a uma
function nomeOase(c, cx, y, tam, t, ini, cor = null) {
  const letras = 'OASE'.split(''), esp = tam * 0.22;
  c.save(); c.font = `800 ${tam}px "Bricolage Grotesque"`; c.letterSpacing = '0px';
  const larg = letras.map((l) => c.measureText(l).width), total = larg.reduce((a, b) => a + b, 0) + esp * (letras.length - 1);
  let x = cx - total / 2;
  letras.forEach((l, i) => {
    const k = eO5(pr(t, ini + i * 0.12, ini + i * 0.12 + 0.8));
    if (k > 0) {
      const g = c.createLinearGradient(0, y - tam * 0.8, 0, y);
      if (cor) { g.addColorStop(0, cor); g.addColorStop(1, cor); } else { g.addColorStop(0, '#ffb15c'); g.addColorStop(1, '#ff7900'); }
      c.save(); c.globalAlpha = k; c.fillStyle = g; c.shadowColor = 'rgba(255,121,0,0.35)'; c.shadowBlur = 50 * k;
      c.fillText(l, x, y + (1 - k) * tam * 0.35); c.restore();
    }
    x += larg[i] + esp;
  });
  c.restore();
}

// Símbolo institucional da OASE (torre, cruz e globo — a logo da igreja), desenhado em vetor e "traçado" aos poucos
const TORRE = new Path2D('M50 5 C47 40 29 88 5 101 C30 103 45 108 50 117 C55 108 70 103 95 101 C71 88 53 40 50 5 Z');
function simboloOase(c, cx, cy, altura, t, ini) {
  const s = altura / 122, vinho = '#8e1b2f';
  const kT = eIO(pr(t, ini, ini + 1.8)), kG = eIO(pr(t, ini + 0.9, ini + 2.0)), kC = eO5(pr(t, ini + 1.6, ini + 2.5));
  c.save(); c.translate(cx - 50 * s, cy - 61 * s); c.scale(s, s);
  c.lineJoin = 'round'; c.lineCap = 'round'; c.strokeStyle = vinho;
  c.lineWidth = 4.5; c.setLineDash([420, 420]); c.lineDashOffset = 420 * (1 - kT); c.stroke(TORRE); // a torre se desenha
  c.setLineDash([]);
  if (kG > 0) {
    c.globalAlpha = kG; c.beginPath(); c.ellipse(50, 88, 22, 10, 0, 0, Math.PI * 2); c.fillStyle = '#e8c9ce'; c.fill(); c.stroke();
    c.lineWidth = 2.5; c.beginPath(); c.moveTo(29, 88); c.lineTo(71, 88); c.stroke(); c.globalAlpha = 1;
  }
  if (kC > 0) { // a cruz sobe
    c.save(); c.globalAlpha = kC; c.translate(0, (1 - kC) * 10); c.fillStyle = vinho;
    c.beginPath(); c.rect(46.5, 38, 7, 58); c.rect(39, 49, 22, 7); c.fill(); c.restore();
  }
  c.restore();
}

// ───────────── as cenas ─────────────
// Página comprida rolada até "rol", com o menu lateral e a barra do topo parados (como no sistema de verdade)
function pagina(cc, nome, rol) {
  const img = I(nome); if (!img) return;
  const tr = alvo(nome, 'trilho') || [0, 0, 176, A], to = alvo(nome, 'topo') || [176, 0, L - 176, 116];
  cc.drawImage(img, 0, rol, L, A, 0, 0, L, A);
  if (rol > 0) {
    cc.drawImage(img, tr[0], 0, tr[2], A, tr[0], 0, tr[2], A);
    cc.drawImage(img, to[0], 0, to[2], to[3], to[0], 0, to[2], to[3]);
  }
}
// Cena com o sistema na janela: foto, câmera, seta e legenda
function cenaJanela(c, t, { foto, cam, seta: s, leg, escuro, conteudo }) {
  fundo(c, t);
  c.save(); aplicarCam(c, cam);
  janela(c, conteudo || ((cc) => cc.drawImage(I(foto), 0, 0)), { escuro });
  c.restore();
  if (s) desenharSeta(c, t, cam, s);
  if (leg) for (const l of (Array.isArray(leg[0]) ? leg : [leg])) legenda(c, t, ...l);
}

function montarCenas() {
  const cenas = [];
  const add = (nome, dur, fotos, desenhar) => cenas.push({ nome, dur, fotos, desenhar });

  // 1. Abertura: a logo aparece, sobe, e o nome do sistema entra
  // 1. Abertura: a casa aparece, sobe, e "OASE" é escrito letra por letra numa fonte bonita (no lugar das letras da imagem)
  add('abertura', 8, [], (c, t) => {
    fundo(c, t);
    const k = eO5(pr(t, 0.2, 1.8)), sobe = eIO(pr(t, 2.0, 3.2));
    const h = lerp(980, 600, sobe), w = h * (CASA.width / CASA.height);
    c.save(); c.globalAlpha = k; c.translate(L / 2, lerp(1040, 560, sobe)); c.scale(lerp(0.86, 1, k), lerp(0.86, 1, k));
    c.drawImage(CASA, -w / 2, -h / 2, w, h); c.restore();
    nomeOase(c, L / 2, 1130, 210, t, 2.5);
    const k1 = eO5(pr(t, 3.5, 4.5)), k2 = eO5(pr(t, 4.0, 5.0)), k3 = eO5(pr(t, 4.5, 5.5));
    texto(c, 'Sistema do Lar', L / 2, 1395 + (1 - k1) * 60, { tam: 150, peso: 700, fonte: 'Bricolage Grotesque', alinhar: 'center', alpha: k1 });
    texto(c, 'O cuidado de cada residente, organizado num só lugar.', L / 2, 1510 + (1 - k2) * 40, { tam: 62, cor: 'rgba(255,255,255,0.8)', alinhar: 'center', alpha: k2 });
    texto(c, 'ORDEM AUXILIADORA DE SENHORAS EVANGÉLICAS', L / 2, 1650 + (1 - k3) * 30, { tam: 34, peso: 700, cor: 'rgba(255,255,255,0.55)', alinhar: 'center', espaco: 10, alpha: k3 });
  });

  // 2. Entrada: a seta vai até "Entrar"
  add('entrada', 7.5, ['entrada'], (c, t) => {
    const ent = centro(alvo('entrada', 'entrar')) || [2900, 1100], usu = centro(alvo('entrada', 'usuario')) || ent;
    const foco = [(ent[0] + usu[0]) / 2, (ent[1] + usu[1]) / 2];
    const cam = camKf(t, [[0.3, CAM0], [4.0, camEm(foco, 1.28)], [7.5, camEm(foco, 1.34)]]);
    cenaJanela(c, t, { foto: 'entrada', cam, seta: { chaves: [[0.8, usu[0] + 700, usu[1] + 300], [2.4, usu[0] + 200, usu[1] + 8], [3.4, usu[0] + 200, usu[1] + 8], [4.4, ent[0] - 20, ent[1] + 4]], cliques: [4.9], aparece: [0.7, 1.2] },
      leg: [1.0, 7.2, 'ACESSO', 'Cada pessoa com o seu login', 'Senha própria, bloqueio automático e registro de tudo o que foi feito.'] });
  });

  // 3. Painel do Início: passeia pelos números
  add('inicio', 11, ['inicio'], (c, t) => {
    const n = ['n1', 'n2', 'n3', 'n4'].map((k) => centro(alvo('inicio', k)) || [1500, 700]);
    const meio = centro(alvo('inicio', 'numeros')) || [2200, 700];
    // números, depois desce para "Precisa de atenção" e "No plantão hoje"
    const cam = camKf(t, [[1.0, CAM0], [3.0, camEm(meio, 1.42)], [6.2, camEm([meio[0] + 120, meio[1]], 1.46)], [8.2, camEm([meio[0], meio[1] + 620], 1.3)], [10.6, { z: 1.03, cx: L / 2, cy: A / 2 }]]);
    cenaJanela(c, t, { foto: 'inicio', cam, seta: { chaves: [[0.8, 2700, 1500], [2.4, n[0][0], n[0][1]], [3.4, n[1][0], n[1][1]], [4.4, n[2][0], n[2][1]], [5.4, n[3][0], n[3][1]], [7.6, n[1][0], n[1][1] + 600], [9.4, n[3][0], n[3][1] + 700]], aparece: [0.6, 1.1] },
      leg: [[0.9, 6.0, 'PAINEL', 'Tudo o que importa hoje, num olhar', 'Quem está no lar, hospitalizados, aniversários e fichas.'],
        [6.3, 10.6, 'ATENÇÃO', 'Nada passa despercebido', 'Ocorrências graves, remédios do dia e quem está de plantão.']] });
  });

  // 4. Residentes: clica num cartão e a câmera "entra" nele
  add('residentes', 8, ['residentes'], (c, t) => {
    const cart = centro(alvo('residentes', 'cartao')) || [2000, 1100];
    const cam = camKf(t, [[0, CAM0], [5.2, { z: 1.07, cx: L / 2, cy: A / 2 }], [8, camEm(cart, 2.7)]]);
    cenaJanela(c, t, { foto: 'residentes', cam, seta: { chaves: [[0.6, 2300, 1700], [2.2, 1200, 900], [3.4, 2600, 1300], [4.6, cart[0] - 120, cart[1] - 20]], cliques: [5.15], aparece: [0.5, 1.0], some: [5.6, 6.1] },
      leg: [0.8, 5.6, 'RESIDENTES', 'A ficha de cada pessoa', 'Busca, filtros e o familiar responsável a um clique.'] });
  });

  // 5. Ficha: a página "rola" com o menu e o topo parados
  add('ficha', 13, ['ficha'], (c, t) => {
    const img = I('ficha'), sobra = Math.max(0, img.height - A);
    // para no começo (alergias e contatos), rola até o meio, para, e desce até o fim
    const rol = kf(t, [[3.2, 0], [6.4, sobra * 0.45], [7.6, sobra * 0.45], [11.6, sobra]]);
    const cam = camKf(t, [[0, { z: 1.2, cx: L / 2, cy: A / 2 }], [1.4, CAM0], [13, { z: 1.03, cx: L / 2, cy: A / 2 }]], eO);
    cenaJanela(c, t, {
      cam, conteudo: (cc) => pagina(cc, 'ficha', rol),
      seta: { chaves: [[0, 3150, 1250], [13, 3180, 1300]], aparece: [0.8, 1.3] },
      leg: [[0.9, 6.0, 'FICHA DO RESIDENTE', 'Alergias sempre à vista', 'Saúde e contatos de emergência com o botão para ligar.'],
        [6.3, 12.8, 'TUDO NUMA PÁGINA', 'Remédios, sinais vitais, vacinas e diário', 'O histórico completo de cada pessoa, sem papel perdido.']],
    });
  });

  // 6. Remédios: clica em "Dei" e a marcação aparece
  add('remedios', 11, ['remedios-antes', 'remedios-depois'], (c, t) => {
    const dei = centro(alvo('remedios-antes', 'dei')), linha = centro(alvo('remedios-antes', 'linha')) || [L / 2, A / 2];
    const temDepois = !!CENAS['remedios-depois'];
    const cam = camKf(t, [[1.0, CAM0], [3.4, camEm(linha, 1.5)], [7.6, camEm(linha, 1.56)], [10.2, CAM0]]);
    const troca = eIO(pr(t, 4.75, 5.05));
    cenaJanela(c, t, {
      cam, conteudo: (cc) => { cc.drawImage(I('remedios-antes'), 0, 0); if (temDepois && troca > 0) { cc.globalAlpha = troca; cc.drawImage(I('remedios-depois'), 0, 0); cc.globalAlpha = 1; } },
      seta: dei ? { chaves: [[0.8, dei[0] - 900, dei[1] + 500], [2.6, dei[0] - 900, dei[1] - 20], [4.0, dei[0], dei[1] + 6], [7.0, dei[0] + 10, dei[1] + 8], [9.0, dei[0] + 260, dei[1] + 360]], cliques: [4.6], aparece: [0.7, 1.2] } : null,
      leg: [[0.9, 6.4, 'REMÉDIOS', 'A folha de remédios do dia', 'Cada horário, cada residente, com aviso de alergia.'],
        [6.7, 10.7, 'UM TOQUE', 'Clicou em “Dei”, ficou registrado', 'Quem deu e a que horas — e o estoque pode dar baixa sozinho.']],
    });
  });

  // 7. Sinais vitais: a câmera passa pelos gráficos
  add('sinais', 9, ['sinais'], (c, t) => {
    const g1 = alvo('sinais', 'grafico1'), g2 = alvo('sinais', 'grafico2');
    const c1 = centro(g1) || [1400, 1100], c2 = centro(g2) || [2600, 1100];
    const cam = camKf(t, [[0.8, CAM0], [2.6, camEm(c1, 1.55)], [5.0, camEm(c1, 1.6)], [6.4, camEm(c2, 1.55)], [8.4, camEm(c2, 1.4)]]);
    const ini = g1 ? [g1[0] + 120, g1[1] + g1[3] * 0.6] : c1, fim = g1 ? [g1[0] + g1[2] - 140, g1[1] + g1[3] * 0.5] : c1;
    cenaJanela(c, t, { foto: 'sinais', cam, seta: { chaves: [[2.0, ini[0], ini[1]], [4.9, fim[0], fim[1]], [6.4, c2[0], c2[1]], [8.4, c2[0] + 300, c2[1] + 80]], aparece: [1.8, 2.3] },
      leg: [0.9, 8.7, 'SAÚDE', 'Sinais vitais com gráficos', 'Pressão, glicemia e temperatura: o que sai do normal aparece na hora.'] });
  });

  // 8. Montagem: os outros módulos passando, um empurrando o outro
  const MOD = [
    ['diario', 'DIÁRIO', 'O caderno da equipe, no computador', 'Ocorrências por turno, com gravidade e quem resolveu.'],
    ['agenda', 'AGENDA', 'Consultas, exames e visitas', 'A semana do lar e de cada residente.'],
    ['tarefas', 'TAREFAS', 'O que a equipe precisa fazer', 'Responsável, prazo, prioridade e o que se repete.'],
    ['prescricoes', 'PRESCRIÇÕES', 'O que cada residente toma', 'Dose, via e horários, com aviso de alergia.'],
    ['vacinas', 'VACINAS', 'O cartão de vacina de todos', 'Aviso de dose atrasada ou vencendo.'],
    ['avaliacoes', 'AVALIAÇÕES', 'Katz, Braden e Morse', 'Pontuação automática e lembrete de reavaliar.'],
    ['pia', 'PIA', 'O Plano Individual de Atenção', 'Metas e cuidados combinados por área, como pede a Anvisa.'],
    ['estoque', 'ESTOQUE', 'Fraldas, remédios e alimentos', 'Avisa quando está acabando ou perto de vencer.'],
    ['patrimonio', 'PATRIMÔNIO', 'Os bens do lar sob controle', 'Local, estado, quem usa e a próxima revisão.'],
    ['escala', 'ESCALA', 'A escala do mês numa grade só', 'Plantões, folgas e quem está de serviço hoje.'],
    ['profissionais', 'EQUIPE', 'Equipe e corpo clínico', 'O contato de quem cuida, do lar e de fora.'],
    ['financeiro', 'FINANCEIRO', 'O resultado do mês', 'Receitas, despesas e contas a vencer.'],
    ['mensalidades', 'MENSALIDADES', 'As mensalidades em dia', 'Quem pagou, quem falta e o recibo na hora.'],
    ['prontuario', 'PRONTUÁRIO', 'Tudo de uma pessoa numa página', 'Pronto para levar à consulta.'],
  ];
  const PASSO = 4.6, DESLIZA = 0.7;
  add('montagem', MOD.length * PASSO + 0.5, MOD.map((m) => m[0]), (c, t) => {
    const i = Math.min(MOD.length - 1, Math.floor(t / PASSO)), tl = t - i * PASSO;
    // cada página: entra, espera um pouco, rola devagar até o fim (se for comprida) e se aproxima de leve
    const ken = (j, tt) => { const z = 1 + 0.03 * eIO(cl(tt / (PASSO + DESLIZA))); const ox = j % 2 ? L * 0.62 : L * 0.38; return { z, ox, oy: A * 0.45 }; };
    const rolar = (j, tt) => { const img = I(MOD[j][0]); const sobra = img ? Math.max(0, img.height - A) : 0; return sobra * eIO(pr(tt, 1.1, PASSO - 0.2)); };
    const pinta = (cc, j, tt, dx) => { const k = ken(j, tt); cc.save(); cc.translate(dx, 0); cc.translate(k.ox, k.oy); cc.scale(k.z, k.z); cc.translate(-k.ox, -k.oy); pagina(cc, MOD[j][0], rolar(j, tt)); cc.restore(); };
    const kd = i > 0 ? eIO(pr(tl, 0, DESLIZA)) : 1;
    cenaJanela(c, t, {
      cam: { z: 1.0 + 0.01 * Math.sin(t * 0.4), cx: L / 2, cy: A / 2 },
      conteudo: (cc) => { if (kd < 1) pinta(cc, i - 1, tl + PASSO, -kd * L * 0.35); cc.save(); if (kd < 1) { cc.globalAlpha = kd; } pinta(cc, i, tl, (1 - kd) * L * 0.5); cc.restore(); },
      leg: MOD.map((m, j) => [j * PASSO + (j ? 0.15 : 0.2), j === MOD.length - 1 ? MOD.length * PASSO + 0.5 : (j + 1) * PASSO + 0.1, m[1], m[2], m[3]]),
    });
  });

  // 9. Documentos: três folhas impressas chegam e se abrem em leque
  add('documentos', 10, ['doc-ficha', 'doc-remedios', 'doc-recibo'], (c, t) => {
    fundo(c, t);
    const zoom = lerp(1, 1.04, eIO(pr(t, 0, 10)));
    c.save(); c.translate(L / 2, A / 2); c.scale(zoom, zoom); c.translate(-L / 2, -A / 2);
    const itens = [['doc-ficha', 1090, 960, 1060, -0.11, 0.3], ['doc-recibo', 2750, 960, 1060, 0.09, 0.55], ['doc-remedios', 1920, 1040, 1800, -0.01, 0.8]];
    itens.forEach(([nome, x, y, w, rot, ini], j) => {
      if (!I(nome)) return;
      const k = eO5(pr(t, ini, ini + 1.3));
      folha(c, I(nome), x, y + (1 - k) * 1100 + Math.sin(t * 1.1 + j) * 7, w, rot * (1 + (1 - k) * 1.5), cl(k * 1.4));
    });
    c.restore();
    legenda(c, t, 1.6, 9.7, 'IMPRESSÃO', 'Documentos prontos para imprimir', 'Cabeçalho com logo e CNPJ, tabelas e campos para assinar.');
  });

  // 10. Modo escuro: clica no botão do tema e a tela escurece num "corte" diagonal
  add('escuro', 8, ['inicio', 'inicio-escuro'], (c, t) => {
    const tema = centro(alvo('inicio', 'tema')) || [80, 1700];
    const p = kf(t, [[1.5, -900], [3.4, L + 900]]);
    const cam = camKf(t, [[0, CAM0], [8, { z: 1.04, cx: L / 2, cy: A / 2 }]]);
    cenaJanela(c, t, {
      cam, escuro: p > L / 2,
      conteudo: (cc) => {
        cc.drawImage(I('inicio'), 0, 0);
        cc.save(); cc.beginPath(); cc.moveTo(-10, -10); cc.lineTo(p + 450, -10); cc.lineTo(p - 450, A + 10); cc.lineTo(-10, A + 10); cc.closePath(); cc.clip();
        cc.drawImage(I('inicio-escuro'), 0, 0); cc.restore();
        if (p > -800 && p < L + 800) { cc.save(); cc.strokeStyle = 'rgba(255,170,90,0.85)'; cc.lineWidth = 10; cc.shadowColor = COR.laranja; cc.shadowBlur = 60; cc.beginPath(); cc.moveTo(p + 450, -10); cc.lineTo(p - 450, A + 10); cc.stroke(); cc.restore(); }
      },
      seta: { chaves: [[0.3, 700, 1500], [1.2, tema[0] + 4, tema[1] + 4], [3.8, tema[0] + 300, tema[1] - 200]], cliques: [1.4], aparece: [0.2, 0.6], some: [4.0, 4.6] },
      leg: [0.8, 7.7, 'MODO ESCURO', 'Confortável para o plantão da noite', 'Claro ou escuro, com um clique.'],
    });
  });

  // 11. Celular: três aparelhos sobem com o sistema
  add('celular', 10, ['cel-inicio', 'cel-remedios', 'cel-ficha'], (c, t) => {
    fundo(c, t);
    const itens = [['cel-remedios', 1180, 1500, -0.07, 0.45], ['cel-ficha', 2660, 1500, 0.07, 0.7], ['cel-inicio', 1920, 1720, 0, 0.2]];
    for (const [nome, x, h, rot, ini] of itens) {
      const k = eO5(pr(t, ini, ini + 1.4));
      c.save(); c.globalAlpha = cl(k * 1.5); celular(c, I(nome), x, 960 + (1 - k) * 1300 + Math.sin(t * 1.2 + x) * 8, h, rot * (1 + (1 - k))); c.restore();
    }
    legenda(c, t, 1.8, 9.7, 'CELULAR', 'No celular também', 'Pelo Wi‑Fi do lar, sem instalar nada: é só ler o QR Code.');
  });

  // 12. Segurança
  add('seguranca', 8.5, ['backups'], (c, t) => {
    const cam = camKf(t, [[0, CAM0], [8.5, { z: 1.07, cx: L / 2 - 120, cy: A / 2 }]]);
    cenaJanela(c, t, { foto: 'backups', cam, leg: [0.6, 8.2, 'SEGURANÇA', 'Os dados ficam no lar', 'Funciona sem internet, com cópia de segurança automática.'] });
    ['Funciona sem internet', 'Cópia de segurança automática', 'Cópia cifrada com senha', 'Registro de quem fez o quê (LGPD)'].forEach((s, j) => selo(c, s, L - 230, 1180 + j * 132, eO5(pr(t, 1.0 + j * 0.3, 1.8 + j * 0.3)) * (1 - pr(t, 8.0, 8.5))));
  });

  // 13. Encerramento
  // 13. Encerramento: a logo da igreja (símbolo institucional da OASE) num medalhão, se desenhando, e a organização
  add('fim', 10, [], (c, t) => {
    fundo(c, t);
    const km = eO5(pr(t, 0.2, 1.5)), r = 400, cy = 760;
    c.save(); c.globalAlpha = km; c.translate(L / 2, cy); c.scale(lerp(0.8, 1, km), lerp(0.8, 1, km));
    brilho(c, 0, 0, r * 2.1, 'rgba(142,27,47,0.30)');
    c.shadowColor = 'rgba(0,0,0,0.5)'; c.shadowBlur = 90; c.shadowOffsetY = 30;
    c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.fillStyle = '#fbf7f2'; c.fill(); c.shadowColor = 'transparent';
    c.lineWidth = 10; c.strokeStyle = 'rgba(142,27,47,0.25)'; c.beginPath(); c.arc(0, 0, r - 26, 0, Math.PI * 2); c.stroke();
    c.restore();
    if (km > 0.3) { c.save(); c.globalAlpha = km; simboloOase(c, L / 2, cy + 10, 560, t, 0.7); c.restore(); }
    nomeOase(c, L / 2, 1460, 190, t, 3.0, '#ffffff');
    const k2 = eO5(pr(t, 3.8, 4.8)), k3 = eO5(pr(t, 4.5, 5.5));
    texto(c, 'Ordem Auxiliadora de Senhoras Evangélicas', L / 2, 1590 + (1 - k2) * 30, { tam: 64, peso: 500, cor: 'rgba(255,255,255,0.85)', alinhar: 'center', alpha: k2 });
    // o sistema do lar, pequeno, como parte da obra
    if (k3 > 0) {
      const h = 96, w = h * (CASA.width / CASA.height), txt = 'Lar OASE  ·  Cuidado que fica registrado.';
      const tw = medida(c, txt, 46, 500, 'Onest'), x0 = L / 2 - (w + 30 + tw) / 2, y = 1700 + (1 - k3) * 20;
      c.save(); c.globalAlpha = k3; c.drawImage(CASA, x0, y, w, h); c.restore();
      texto(c, txt, x0 + w + 30, y + h / 2 + 16, { tam: 46, peso: 500, cor: 'rgba(255,255,255,0.6)', alpha: k3 });
    }
    const kp = pr(t, 8.6, 10); if (kp > 0) { c.fillStyle = `rgba(0,0,0,${eIO(kp)})`; c.fillRect(0, 0, L, A); }
  });

  cenas.find((c) => c.nome === 'ficha').entrada = 'clarao';
  // linha do tempo (cada cena começa antes de a anterior acabar: é a transição)
  let ini = 0;
  for (const c of cenas) { c.ini = ini; ini += c.dur - TRANS; }
  return { cenas, total: ini + TRANS };
}

// ───────────── um quadro ─────────────
async function desenharQuadro(LT, t) {
  const ativas = LT.cenas.filter((c) => t >= c.ini && t < c.ini + c.dur);
  if (!ativas.length) ativas.push(LT.cenas[LT.cenas.length - 1]);
  const precisa = new Set();
  for (const c of LT.cenas) if (t + 1.2 >= c.ini && t < c.ini + c.dur) c.fotos.forEach((f) => CENAS[f] && precisa.add(f));
  await Promise.all([...precisa].map(carregar));
  soltar(precisa);
  const [a, b] = ativas;
  if (b && b.entrada === 'clarao') { // "clarão" na cor de fundo do sistema, como uma página abrindo (sem misturar as duas telas)
    const k = pr(t, b.ini, b.ini + TRANS), cena = k < 0.5 ? a : b;
    ctx.save(); cena.desenhar(ctx, t - cena.ini); ctx.restore();
    ctx.fillStyle = `rgba(245,243,238,${eIO(k < 0.5 ? k * 2 : (1 - k) * 2)})`; ctx.fillRect(0, 0, L, A);
    return;
  }
  ctx.save(); a.desenhar(ctx, t - a.ini); ctx.restore();
  if (b) { // transição: a cena nova entra por cima, aparecendo e "assentando" (de 104% para 100%)
    actx.save(); b.desenhar(actx, t - b.ini); actx.restore();
    const k = eIO(pr(t, b.ini, b.ini + TRANS)), z = lerp(1.04, 1, k);
    ctx.save(); ctx.globalAlpha = k; ctx.translate(L / 2, A / 2); ctx.scale(z, z); ctx.translate(-L / 2, -A / 2); ctx.drawImage(apoio, 0, 0); ctx.restore();
  }
}

// ───────────── principal ─────────────
// Envia ao gravador; se a conexão cair no meio, tenta de novo (o gravador ignora pedaço repetido pelo número ?n=)
async function postar(url, corpo) {
  for (let i = 0; ; i++) {
    try { return await fetch(url, { method: 'POST', body: corpo }); }
    catch (e) { if (i >= 5) throw new Error(`${url.split('?')[0]}: ${e.message} (tentei ${i + 1} vezes)`); await new Promise((r) => setTimeout(r, 400 * (i + 1))); }
  }
}
let numPedaco = 0;
async function principal() {
  CENAS = await (await fetch('/cenas.json')).json();
  for (const [familia, arq, peso] of [['Onest', 'onest.woff2', '100 900'], ['Bricolage Grotesque', 'bricolage-grotesque.woff2', '200 800']]) {
    const f = new FontFace(familia, `url(/fontes/${arq})`, { weight: peso }); await f.load(); document.fonts.add(f);
  }
  CASA = await svgImagem('/logo-casa.svg', 2400);
  const LT = montarCenas();
  const N = Math.round(LT.total * FPS);

  const previa = new URLSearchParams(location.search).get('previa');
  if (previa) { // só alguns quadros, reduzidos, para conferir
    const peq = document.createElement('canvas'); peq.width = 1920; peq.height = 1080;
    for (const s of previa.split(',').map(Number)) {
      await desenharQuadro(LT, s);
      peq.getContext('2d').drawImage(tela, 0, 0, 1920, 1080);
      await postar(`/previa?t=${s}`, await new Promise((r) => peq.toBlob(r, 'image/png')));
    }
    await postar('/fim', ''); return;
  }

  let cadeia = Promise.resolve(), configMandada = false, erroCod = null;
  const enc = new VideoEncoder({
    output: (pedaco, meta) => {
      if (!configMandada && meta && meta.decoderConfig && meta.decoderConfig.description) {
        const d = meta.decoderConfig.description; const bytes = d instanceof ArrayBuffer ? new Uint8Array(d) : new Uint8Array(d.buffer, d.byteOffset, d.byteLength);
        const copia = bytes.slice(); cadeia = cadeia.then(() => postar('/config', copia)); configMandada = true;
      }
      const buf = new Uint8Array(pedaco.byteLength); pedaco.copyTo(buf);
      const n = numPedaco++; cadeia = cadeia.then(() => postar(`/pedaco?n=${n}&k=${pedaco.type === 'key' ? 1 : 0}`, buf));
    },
    error: (e) => { erroCod = e; },
  });
  // ?saida=1080 → Full HD para redes sociais: cada quadro é desenhado em 4K e reduzido (fica mais nítido que desenhar direto em 1080p)
  const fullHD = new URLSearchParams(location.search).get('saida') === '1080';
  const quadro = fullHD ? Object.assign(document.createElement('canvas'), { width: 1920, height: 1080 }) : tela;
  const qctx = quadro.getContext('2d'); qctx.imageSmoothingQuality = 'high';
  if (fullHD) { // capa (miniatura) para escolher no LinkedIn: a abertura já completa
    await desenharQuadro(LT, 6.8); qctx.drawImage(tela, 0, 0, 1920, 1080);
    await postar('/capa', await new Promise((r) => quadro.toBlob(r, 'image/png')));
  }
  enc.configure(fullHD ? { codec: 'avc1.640028', width: 1920, height: 1080, bitrate: 14_000_000, framerate: FPS, latencyMode: 'quality', avc: { format: 'avc' } }
    : { codec: 'avc1.640033', width: L, height: A, bitrate: 24_000_000, framerate: FPS, latencyMode: 'quality', avc: { format: 'avc' } });
  const t0 = performance.now();
  for (let f = 0; f < N; f++) {
    if (erroCod) throw erroCod;
    await desenharQuadro(LT, f / FPS);
    if (fullHD) qctx.drawImage(tela, 0, 0, 1920, 1080);
    const vf = new VideoFrame(quadro, { timestamp: Math.round((f * 1e6) / FPS), duration: Math.round(1e6 / FPS) });
    enc.encode(vf, { keyFrame: f % (FPS * 2) === 0 });
    vf.close();
    while (enc.encodeQueueSize > 2) await new Promise((r) => setTimeout(r, 2));
    if (f % 15 === 0) {
      await cadeia; // não deixa acumular pedaços na memória
      const seg = (performance.now() - t0) / 1000, falta = ((N - f - 1) * seg) / (f + 1);
      postar('/progresso', `quadro ${f + 1} de ${N} (${Math.round(((f + 1) / N) * 100)}%) · faltam ~${Math.ceil(falta / 60)} min`);
    }
  }
  await enc.flush(); enc.close();
  await cadeia;
  await postar('/fim', '');
}
principal().catch((e) => postar('/erro', String(e && e.stack || e)));
