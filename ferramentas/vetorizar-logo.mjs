// Transforma a logo (PNG em alta, de 2 cores sobre fundo branco) em SVG, sem programa nenhum de fora.
// Uso (na pasta do projeto):  node ferramentas\vetorizar-logo.mjs "Logo em alta.png"
//
// Como funciona: lê o PNG (zlib do próprio Node), mede em cada pixel "quanto" ele é laranja e "quanto" é verde
// (a borda suavizada da imagem vira meio-termo), contorna cada forma com "marching squares" no meio-termo (0,5),
// tira os pontos desnecessários (Ramer–Douglas–Peucker) e grava:
//   app/public/logo-oase.svg   → logo completa (casa, árvore, casal e o nome OASE)
//   app/public/logo-casa.svg   → só o desenho, sem o nome (menu lateral, tela de entrada, cabeçalho dos documentos)
//   app/public/icone.svg       → o desenho num azulejo branco (aba do navegador; depois rode gerar-icone.mjs para o atalho)
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ORIGEM = path.resolve(RAIZ, process.argv[2] || 'Logo em alta.png');

// ───────────── 1. ler o PNG (8 bits, RGB ou RGBA, sem entrelaçamento) ─────────────
function lerPng(arq) {
  const b = fs.readFileSync(arq);
  let pos = 8, w = 0, h = 0, tipo = 0;
  const dados = [];
  while (pos < b.length) {
    const tam = b.readUInt32BE(pos), nome = b.toString('latin1', pos + 4, pos + 8), corpo = b.subarray(pos + 8, pos + 8 + tam);
    if (nome === 'IHDR') { w = corpo.readUInt32BE(0); h = corpo.readUInt32BE(4); tipo = corpo[9]; if (corpo[8] !== 8 || corpo[12]) throw new Error('PNG precisa ser 8 bits e sem entrelaçamento'); }
    if (nome === 'IDAT') dados.push(corpo);
    pos += 12 + tam;
  }
  const bpp = { 2: 3, 6: 4 }[tipo];
  if (!bpp) throw new Error('PNG precisa ser RGB ou RGBA');
  const cru = zlib.inflateSync(Buffer.concat(dados));
  const linha = w * bpp, px = Buffer.alloc(h * linha);
  for (let y = 0; y < h; y++) {
    const f = cru[y * (linha + 1)], src = y * (linha + 1) + 1, dst = y * linha;
    for (let i = 0; i < linha; i++) {
      const a = i >= bpp ? px[dst + i - bpp] : 0, c = y ? px[dst - linha + i] : 0, d = i >= bpp && y ? px[dst - linha + i - bpp] : 0;
      let v = cru[src + i];
      if (f === 1) v += a; else if (f === 2) v += c; else if (f === 3) v += (a + c) >> 1;
      else if (f === 4) { const p = a + c - d, pa = Math.abs(p - a), pb = Math.abs(p - c), pc = Math.abs(p - d); v += pa <= pb && pa <= pc ? a : pb <= pc ? c : d; }
      px[dst + i] = v & 255;
    }
  }
  // RGBA sobre branco → RGB
  const rgb = new Float32Array(w * h * 3);
  for (let i = 0; i < w * h; i++) {
    const al = bpp === 4 ? px[i * 4 + 3] / 255 : 1;
    for (let k = 0; k < 3; k++) rgb[i * 3 + k] = px[i * bpp + k] * al + 255 * (1 - al);
  }
  return { w, h, rgb };
}

// ───────────── 2. as duas cores da logo ─────────────
const { w, h, rgb } = lerPng(ORIGEM);
const BRANCO = [255, 255, 255];
const dist2 = (p, c) => (p[0] - c[0]) ** 2 + (p[1] - c[1]) ** 2 + (p[2] - c[2]) ** 2;
// Cor média dos pixels bem "cheios" de cada família (laranja: vermelho alto e azul baixo; verde: verde maior que o vermelho)
function corMedia(teste) {
  const s = [0, 0, 0]; let n = 0;
  for (let i = 0; i < w * h; i++) { const p = [rgb[i * 3], rgb[i * 3 + 1], rgb[i * 3 + 2]]; if (teste(p)) { s[0] += p[0]; s[1] += p[1]; s[2] += p[2]; n++; } }
  return s.map((x) => Math.round(x / n));
}
const LARANJA = corMedia(([r, g, b]) => r > 230 && g > 90 && g < 150 && b < 40);
const VERDE = corMedia(([r, g, b]) => g > 140 && r < 80 && b < 40);
const CORES = [LARANJA, VERDE];
const hex = (c) => '#' + c.map((x) => x.toString(16).padStart(2, '0')).join('');
console.log('Cores encontradas:', hex(LARANJA), hex(VERDE));

// "Quanto" o pixel é da cor c: 0 = branco, 1 = cor cheia (a borda suavizada fica no meio). Pixel mais perto da outra cor = 0.
function campo(ci) {
  const c = CORES[ci], outra = CORES[1 - ci];
  const d = [c[0] - 255, c[1] - 255, c[2] - 255], n2 = d[0] ** 2 + d[1] ** 2 + d[2] ** 2;
  const f = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const p = [rgb[i * 3], rgb[i * 3 + 1], rgb[i * 3 + 2]];
    if (dist2(p, outra) < Math.min(dist2(p, c), dist2(p, BRANCO))) continue;
    f[i] = Math.max(0, Math.min(1, ((p[0] - 255) * d[0] + (p[1] - 255) * d[1] + (p[2] - 255) * d[2]) / n2));
  }
  return f;
}

// ───────────── 3. contornos (marching squares com interpolação) ─────────────
function contornos(f) {
  // grade com 1 pixel de folga em volta (assim todo contorno fecha). Amostra (i,j) = centro do pixel (i-1, j-1).
  const W = w + 2, H = h + 2;
  const v = (i, j) => (i <= 0 || j <= 0 || i > w || j > h ? 0 : f[(j - 1) * w + (i - 1)]);
  const ISO = 0.5;
  const pontoDaAresta = (id) => {
    const cel = id >> 1, i = cel % W, j = (cel / W) | 0;
    if ((id & 1) === 0) { const a = v(i, j), b = v(i + 1, j); return [i + (ISO - a) / (b - a) - 0.5, j - 0.5]; } // horizontal
    const a = v(i, j), b = v(i, j + 1); return [i - 0.5, j + (ISO - a) / (b - a) - 0.5]; // vertical
  };
  const vizinhos = new Map();
  const ligar = (a, b) => { (vizinhos.get(a) || vizinhos.set(a, []).get(a)).push(b); (vizinhos.get(b) || vizinhos.set(b, []).get(b)).push(a); };
  for (let j = 0; j < H - 1; j++) {
    for (let i = 0; i < W - 1; i++) {
      const tl = v(i, j), tr = v(i + 1, j), br = v(i + 1, j + 1), bl = v(i, j + 1);
      const caso = (tl >= ISO) * 8 + (tr >= ISO) * 4 + (br >= ISO) * 2 + (bl >= ISO);
      if (caso === 0 || caso === 15) continue;
      const T = (j * W + i) * 2, B = ((j + 1) * W + i) * 2, L = (j * W + i) * 2 + 1, R = (j * W + i + 1) * 2 + 1;
      const meio = (tl + tr + br + bl) / 4 >= ISO;
      switch (caso) {
        case 1: case 14: ligar(L, B); break;
        case 2: case 13: ligar(B, R); break;
        case 3: case 12: ligar(L, R); break;
        case 4: case 11: ligar(T, R); break;
        case 6: case 9: ligar(T, B); break;
        case 7: case 8: ligar(T, L); break;
        case 5: if (meio) { ligar(L, T); ligar(B, R); } else { ligar(T, R); ligar(L, B); } break;
        case 10: if (meio) { ligar(T, R); ligar(L, B); } else { ligar(T, L); ligar(R, B); } break;
      }
    }
  }
  // Encadeia as arestas em voltas fechadas
  const visto = new Set(), voltas = [];
  for (const inicio of vizinhos.keys()) {
    if (visto.has(inicio)) continue;
    const volta = []; let ant = -1, atual = inicio;
    while (!visto.has(atual)) {
      visto.add(atual); volta.push(pontoDaAresta(atual));
      const vz = vizinhos.get(atual), prox = vz[0] !== ant ? vz[0] : vz[1];
      ant = atual; atual = prox;
    }
    if (volta.length > 2) voltas.push(volta);
  }
  return voltas;
}

// ───────────── 4. simplificar e escrever ─────────────
function rdp(pts, eps) {
  if (pts.length < 3) return pts;
  const [ax, ay] = pts[0], [bx, by] = pts[pts.length - 1];
  const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy) || 1;
  let maior = -1, idx = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const d = Math.abs(dy * pts[i][0] - dx * pts[i][1] + bx * ay - by * ax) / L;
    if (d > maior) { maior = d; idx = i; }
  }
  if (maior <= eps) return [pts[0], pts[pts.length - 1]];
  return [...rdp(pts.slice(0, idx + 1), eps).slice(0, -1), ...rdp(pts.slice(idx), eps)];
}
const area = (p) => Math.abs(p.reduce((s, [x, y], i) => { const [x2, y2] = p[(i + 1) % p.length]; return s + x * y2 - x2 * y; }, 0) / 2);
function simplificar(volta) {
  // fecha a volta começando no ponto mais longe do primeiro, para o RDP não "cortar" um canto
  let k = 0, m = 0;
  for (let i = 0; i < volta.length; i++) { const d = (volta[i][0] - volta[0][0]) ** 2 + (volta[i][1] - volta[0][1]) ** 2; if (d > m) { m = d; k = i; } }
  const a = rdp(volta.slice(0, k + 1), 0.45), b = rdp([...volta.slice(k), volta[0]], 0.45);
  return [...a.slice(0, -1), ...b.slice(0, -1)];
}

const camadas = CORES.map((cor, ci) => ({ cor, voltas: contornos(campo(ci)).filter((p) => area(p) > 6).map(simplificar) }));
// Onde termina o desenho e começa o nome "OASE": a maior faixa horizontal sem nada entre a casa e as letras
const todos = camadas.flatMap((c) => c.voltas.flat());
const minX = Math.min(...todos.map((p) => p[0])), maxX = Math.max(...todos.map((p) => p[0]));
const minY = Math.min(...todos.map((p) => p[1])), maxY = Math.max(...todos.map((p) => p[1]));
const ocupado = new Uint8Array(Math.ceil(maxY) + 2);
for (const c of camadas) for (const v of c.voltas) { const ys = v.map((p) => p[1]); for (let y = Math.floor(Math.min(...ys)); y <= Math.ceil(Math.max(...ys)); y++) ocupado[y] = 1; }
let corte = maxY, maiorVao = 0;
for (let y = Math.round(minY + (maxY - minY) * 0.6), ini = -1; y <= maxY; y++) {
  if (!ocupado[y]) { if (ini < 0) ini = y; if (y - ini > maiorVao) { maiorVao = y - ini; corte = (ini + y) / 2; } } else ini = -1;
}

function svg(soDesenho, comoIcone = false) {
  const voltasDe = (c) => c.voltas.filter((v) => !soDesenho || Math.max(...v.map((p) => p[1])) < corte);
  const pts = camadas.flatMap((c) => voltasDe(c).flat());
  const x0 = Math.min(...pts.map((p) => p[0])), x1 = Math.max(...pts.map((p) => p[0])), y0 = Math.min(...pts.map((p) => p[1])), y1 = Math.max(...pts.map((p) => p[1]));
  const folga = 4, vx = Math.floor(x0 - folga), vy = Math.floor(y0 - folga), vw = Math.ceil(x1 - x0 + folga * 2), vh = Math.ceil(y1 - y0 + folga * 2);
  const n = (x) => String(Math.round(x * 10) / 10);
  // Curvas suaves (Catmull-Rom → Bézier) passando pelos pontos; onde a linha dobra forte (ponta de folha, canto da casa) fica pontudo
  const caminho = (v) => {
    const N = v.length, P = (i) => v[(i + N) % N];
    const canto = v.map((_, i) => {
      const [ax, ay] = P(i - 1), [bx, by] = P(i), [cx, cy] = P(i + 1);
      const a1 = Math.atan2(by - ay, bx - ax), a2 = Math.atan2(cy - by, cx - bx);
      let d = Math.abs(a2 - a1); if (d > Math.PI) d = 2 * Math.PI - d;
      return d > 0.75; // ~43°
    });
    let s = `M${n(v[0][0] - vx)} ${n(v[0][1] - vy)}`;
    for (let i = 0; i < N; i++) {
      const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
      const c1 = canto[i] ? p1 : [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
      const c2 = canto[(i + 1) % N] ? p2 : [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
      s += canto[i] && canto[(i + 1) % N] ? `L${n(p2[0] - vx)} ${n(p2[1] - vy)}`
        : `C${n(c1[0] - vx)} ${n(c1[1] - vy)} ${n(c2[0] - vx)} ${n(c2[1] - vy)} ${n(p2[0] - vx)} ${n(p2[1] - vy)}`;
    }
    return s + 'Z';
  };
  const caminhos = camadas.map((c) => `<path fill="${hex(c.cor)}" fill-rule="evenodd" d="${voltasDe(c).map(caminho).join('')}"/>`).join('\n');
  // Ícone (aba do navegador e atalho): o desenho sobre um azulejo branco de cantos redondos, 64 x 64
  if (comoIcone) return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
<!-- Gerado por ferramentas/vetorizar-logo.mjs. Depois rode: node ferramentas/gerar-icone.mjs (gera o icone.ico do atalho). -->
<rect width="64" height="64" rx="14" fill="#ffffff"/>
<svg x="4" y="5" width="56" height="54" viewBox="0 0 ${vw} ${vh}">
${caminhos}
</svg>
</svg>
`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${vw} ${vh}" role="img" aria-label="OASE">
<title>OASE</title>
${caminhos}
</svg>
`;
}
const PUB = path.join(RAIZ, 'app', 'public');
fs.writeFileSync(path.join(PUB, 'logo-oase.svg'), svg(false));
fs.writeFileSync(path.join(PUB, 'logo-casa.svg'), svg(true));
fs.writeFileSync(path.join(PUB, 'icone.svg'), svg(true, true));
for (const f of ['logo-oase.svg', 'logo-casa.svg', 'icone.svg']) console.log(`  ${f}: ${(fs.statSync(path.join(PUB, f)).size / 1024).toFixed(1)} KB`);
console.log(`  ${camadas.map((c) => `${hex(c.cor)}: ${c.voltas.length} formas`).join(' · ')} · nome separado na altura ${Math.round(corte)} px`);
