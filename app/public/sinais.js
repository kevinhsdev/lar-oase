// Sinais vitais: a ronda do dia (vários residentes de uma vez) e os gráficos de cada residente.
// Rotas: #/sinais (ronda de hoje) · #/sinais/AAAA-MM-DD · #/sinais/residente-ID
// Gráficos em SVG puro, seguindo a skill dataviz: um gráfico por medida (nunca dois eixos), linha de 2px, pontos com anel,
// faixa do normal ao fundo, legenda quando há 2 séries, dica ao passar o mouse e a tabela com os números.
'use strict';

const numBR = (n, casas = 0) => (n == null ? '—' : Number(n).toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas }));
function resumoLeitura(l) {
  const p = [];
  if (l.pa_sist != null) p.push(`PA ${l.pa_sist}x${l.pa_diast}`);
  if (l.temperatura != null) p.push(`${numBR(l.temperatura, 1)} °C`);
  if (l.glicemia != null) p.push(`glic. ${l.glicemia}`);
  if (l.saturacao != null) p.push(`sat. ${l.saturacao}%`);
  if (l.fc != null) p.push(`${l.fc} bpm`);
  if (l.peso != null) p.push(`${numBR(l.peso, 1)} kg`);
  if (l.dor != null) p.push(`dor ${l.dor}`);
  return p.join(' · ');
}
const nomesFora = (fora, medidas) => [...new Set(fora.map((k) => (k.startsWith('pa_') ? 'pressão' : medidas[k].nome.toLowerCase())))].join(', ');

// ───────────── ronda ─────────────
TELAS.sinais = async (c, arg) => {
  if (/^residente-\d+$/.test(arg || '')) return graficosResidente(c, Number(arg.split('-')[1]));
  const dia = /^\d{4}-\d{2}-\d{2}$/.test(arg || '') && arg <= hojeIso() ? arg : hojeIso();
  const d = await api('GET', `/api/sinais/ronda?data=${dia}`);
  const m = d.medidas;
  c.innerHTML = `
    <div class="so-impressao cabecalho-impressao"><b>${esc(EU.config.nome_organizacao || SUBTITULO_APP)} — Sinais vitais · ${esc(dataBR(dia))}</b><span>Impresso em ${esc(dataHoraBR(new Date().toISOString()))}</span></div>
    <div class="cabecalho"><div><h1>Sinais vitais</h1><p class="sub">${esc(nomeDia(dia))} · ${d.medidos} de ${d.linhas.length} residentes medidos</p></div>
      <div class="acoes"><button type="button" class="btn" id="svImprimir">${icone('impressora')}Imprimir</button></div></div>
    ${d.alertas.length ? `<div class="faixa perigo">${icone('alerta')}<span><b>Fora do normal ${dia === hojeIso() ? 'hoje' : 'neste dia'}:</b> ${d.alertas.map((a) => `<a href="#/sinais/residente-${a.residente_id}">${esc(a.nome)}</a> (${esc(nomesFora(a.fora, m))} às ${esc(a.hora)})`).join('; ')}.
      Avise a enfermagem e anote no Diário se precisar.</span></div>` : ''}
    <div class="barra-ferramentas nao-imprimir">
      <div class="navegar-dia"><button type="button" class="btn-icone" id="svAntes" aria-label="Dia anterior" title="Dia anterior">${icone('voltar')}</button>
        <input type="date" id="svData" value="${dia}" max="${hojeIso()}" aria-label="Escolher o dia">
        <button type="button" class="btn-icone" id="svDepois" aria-label="Próximo dia" title="Próximo dia"${dia >= hojeIso() ? ' disabled' : ''}>${icone('seta')}</button></div>
      ${dia !== hojeIso() ? '<a class="btn peq" href="#/sinais">Hoje</a>' : ''}
      <label class="campo" style="flex-direction:row;align-items:center;gap:8px"><span>Hora da ronda</span><input type="time" id="svHora" value="${dia === hojeIso() ? horaAgora() : '08:00'}" style="width:auto"></label>
    </div>
    ${d.linhas.length ? `<div class="tabela-caixa"><table class="tabela ronda"><thead><tr><th>Residente</th><th>Pressão</th><th>Temp. °C</th><th>Glicemia</th><th>Saturação %</th><th>Batimentos</th><th>Dor 0–10</th><th>Já medido ${dia === hojeIso() ? 'hoje' : 'no dia'}</th></tr></thead><tbody>
      ${d.linhas.map((l, i) => `<tr class="${l.leituras.length ? 'medido' : ''}" data-rid="${l.id}">
        <td><a href="#/sinais/residente-${l.id}" style="display:flex;align-items:center;gap:10px;color:var(--texto);font-weight:600" title="Ver os gráficos">${avatar(l.nome, 'p')}<span>${esc(l.apelido || l.nome)}${l.quarto ? `<br><small class="fraco" style="font-weight:400">quarto ${esc(l.quarto)}</small>` : ''}</span></a></td>
        <td class="c-pa"><input data-k="pa"${i === 0 ? ' placeholder="ex.: 120x80"' : ''} inputmode="numeric" maxlength="7" aria-label="Pressão de ${esc(l.nome)}"></td>
        <td class="c-num"><input data-k="temperatura"${i === 0 ? ' placeholder="36,5"' : ''} inputmode="decimal" maxlength="4" aria-label="Temperatura de ${esc(l.nome)}"></td>
        <td class="c-num"><input data-k="glicemia" inputmode="numeric" maxlength="3" aria-label="Glicemia de ${esc(l.nome)}"></td>
        <td class="c-num"><input data-k="saturacao" inputmode="numeric" maxlength="3" aria-label="Saturação de ${esc(l.nome)}"></td>
        <td class="c-num"><input data-k="fc" inputmode="numeric" maxlength="3" aria-label="Batimentos de ${esc(l.nome)}"></td>
        <td class="c-num"><input data-k="dor" inputmode="numeric" maxlength="2" aria-label="Dor de ${esc(l.nome)}"></td>
        <td class="ultima">${l.leituras.length ? l.leituras.map((x) => `<div>${esc(x.hora)} · ${esc(resumoLeitura(x))}${x.fora.length ? ` <span class="etiqueta perigo">${icone('alerta')}${esc(nomesFora(x.fora, m))}</span>` : ''}</div>`).join('') : '<span class="fraco">—</span>'}</td>
      </tr>`).join('')}</tbody></table></div>
      <div class="acoes nao-imprimir" style="margin-top:14px;justify-content:flex-end"><span class="mudo" id="svConta"></span><button type="button" class="btn primario grande" id="svSalvar">${icone('check')}Salvar a ronda</button></div>
      <p class="dica">Preencha só o que mediu. Pressão como <b>120x80</b>; temperatura com vírgula (<b>36,5</b>). Valores fora do normal ficam em vermelho. Clique no nome para ver os gráficos.</p>`
    : `<div class="cartao">${vazio('saude', 'Ninguém no lar', 'Os residentes no lar aparecem aqui para a ronda.')}</div>`}`;
  $('#svImprimir', c).onclick = () => window.print();
  // Papel: a folha da ronda. Quem já foi medido sai com os valores; quem falta sai com as casas em branco para anotar à mão.
  definirImpressao(() => ({
    titulo: 'Ronda de sinais vitais', paisagem: true,
    sub: `${nomeDia(dia)} de ${dia.slice(0, 4)} · ${d.medidos} de ${plural(d.linhas.length, 'residente medido', 'residentes medidos')}`,
    corpo: (d.alertas.length ? docAlerta(`<b>Fora do normal:</b> ${d.alertas.map((a) => `${esc(a.nome)} (${esc(nomesFora(a.fora, m))} às ${esc(a.hora)})`).join('; ')}.`) : '')
      + docTabela([{ t: 'Residente', w: '20%' }, { t: 'Quarto', w: '6%' }, { t: 'Hora', w: '6%' }, { t: 'Pressão', w: '9%', a: 'centro' }, { t: 'Temp. °C', w: '7%', a: 'centro' },
        { t: 'Glicemia', w: '7%', a: 'centro' }, { t: 'Sat. %', w: '7%', a: 'centro' }, { t: 'Batim.', w: '7%', a: 'centro' }, { t: 'Dor 0–10', w: '7%', a: 'centro' },
        { t: 'Observação', w: '12%' }, { t: 'Medido por / rubrica', w: '12%' }],
      d.linhas.flatMap((l) => {
        const leituras = l.leituras.length ? l.leituras : [null];
        return leituras.map((x, n) => {
          const v = (k, txt) => (!x || x[k] == null ? '' : x.fora.includes(k) ? `<b>${esc(txt)} *</b>` : esc(txt));
          return [n ? '' : `<b>${esc(l.nome)}</b>`, n ? '' : esc(l.quarto || ''), x ? esc(x.hora) : '',
            x && x.pa_sist != null ? (x.fora.includes('pa_sist') || x.fora.includes('pa_diast') ? `<b>${x.pa_sist}x${x.pa_diast} *</b>` : `${x.pa_sist}x${x.pa_diast}`) : '',
            v('temperatura', x && x.temperatura != null ? numBR(x.temperatura, 1) : ''), v('glicemia', x ? x.glicemia : ''), v('saturacao', x ? x.saturacao : ''),
            v('fc', x ? x.fc : ''), v('dor', x ? x.dor : ''), x ? esc(x.obs || '') : '', x ? esc(nomeAutorDia({ autor_nome: x.autor_nome, criado_por: x.criado_por })) : ''];
        });
      }), { classe: 'grade', vazio: 'Nenhum residente no lar.' })
      + docNota('* fora da faixa normal (provisória, definida com a enfermagem). Pressão como 120x80; temperatura com vírgula (36,5). Avise a enfermagem e anote no Diário quando houver valor fora do normal.')
      + docAssinaturas(['Responsável pela ronda', 'Enfermagem — conferência']),
  }));
  const ir = (iso) => { if (iso && iso <= hojeIso()) location.hash = iso === hojeIso() ? '#/sinais' : `#/sinais/${iso}`; };
  $('#svData', c).onchange = (e) => ir(e.target.value);
  $('#svAntes', c).onclick = () => ir(somarDiasIso(dia, -1));
  $('#svDepois', c).onclick = () => ir(somarDiasIso(dia, 1));
  if (!d.linhas.length) return;
  // Marca em vermelho enquanto digita o que está fora do normal
  const fora = (k, v) => {
    if (!v) return false;
    if (k === 'pa') { const x = v.match(/^(\d{2,3})\s*[x/]\s*(\d{2,3})$/i); return x ? (+x[1] < m.pa_sist.normal[0] || +x[1] > m.pa_sist.normal[1] || +x[2] < m.pa_diast.normal[0] || +x[2] > m.pa_diast.normal[1]) : false; }
    const n = Number(v.replace(',', '.'));
    return Number.isFinite(n) && m[k].normal && (n < m[k].normal[0] || n > m[k].normal[1]);
  };
  const contar = () => { const n = $$('tbody tr', c).filter((tr) => $$('input', tr).some((i) => i.value.trim())).length; $('#svConta', c).textContent = n ? `${plural(n, 'residente preenchido', 'residentes preenchidos')}` : ''; };
  c.addEventListener('input', (e) => { const i = e.target.closest('input[data-k]'); if (!i) return; i.classList.toggle('fora', fora(i.dataset.k, i.value.trim())); contar(); });
  $('#svSalvar', c).onclick = (e) => botaoOcupado(e.currentTarget, async () => {
    const leituras = $$('tbody tr', c).map((tr) => {
      const l = { residente_id: +tr.dataset.rid };
      let algo = false;
      for (const i of $$('input[data-k]', tr)) if (i.value.trim()) { l[i.dataset.k] = i.value.trim(); algo = true; }
      return algo ? l : null;
    }).filter(Boolean);
    if (!leituras.length) throw new Error('Nada preenchido ainda.');
    const r = await api('POST', '/api/sinais', { data: dia, hora: $('#svHora', c).value, leituras });
    toast(r.alertas.length ? `Ronda salva. Atenção: ${r.alertas.map((a) => a.nome.split(' ')[0]).join(', ')} com valor fora do normal.` : `Ronda salva: ${plural(leituras.length, 'residente', 'residentes')}.`, r.alertas.length > 0);
    rotear();
  });
};

// ───────────── no papel ─────────────
// Média, menor e maior de cada medida (gráficos de cada residente e prontuário)
function docResumoSinais(itens, medidas) {
  const linhas = [['Pressão máxima', 'pa_sist', 0], ['Pressão mínima', 'pa_diast', 0], ['Temperatura', 'temperatura', 1], ['Glicemia', 'glicemia', 0], ['Saturação', 'saturacao', 0],
    ['Batimentos', 'fc', 0], ['Peso', 'peso', 1], ['Dor (0 a 10)', 'dor', 0]];
  return docTabela([{ t: 'Medida', w: '24%' }, { t: 'Unidade', w: '12%' }, { t: 'Média', w: '12%', a: 'dir' }, { t: 'Menor', w: '12%', a: 'dir' }, { t: 'Maior', w: '12%', a: 'dir' },
    { t: 'Medidas', w: '12%', a: 'dir' }, { t: 'Fora do normal', w: '16%', a: 'dir' }],
  linhas.map(([nome, k, casas]) => {
    const vs = itens.map((l) => l[k]).filter((v) => v != null);
    if (!vs.length) return null;
    const fora = itens.filter((l) => l.fora.includes(k)).length;
    return [esc(nome), esc((medidas[k] || {}).unidade || ''), esc(numBR(vs.reduce((a, b) => a + b, 0) / vs.length, casas)), esc(numBR(Math.min(...vs), casas)),
      esc(numBR(Math.max(...vs), casas)), String(vs.length), fora ? `<b>${fora}</b>` : '0'];
  }).filter(Boolean), { vazio: 'Nenhuma medida no período.' });
}
// Uma linha por leitura (o mais novo primeiro)
function docTabelaLeituras(itens) {
  return docTabela([{ t: 'Data e hora', w: '15%' }, { t: 'Pressão', w: '10%', a: 'centro' }, { t: 'Temp.', w: '8%', a: 'centro' }, { t: 'Glicemia', w: '9%', a: 'centro' },
    { t: 'Sat. %', w: '8%', a: 'centro' }, { t: 'Batim.', w: '8%', a: 'centro' }, { t: 'Peso', w: '8%', a: 'centro' }, { t: 'Dor', w: '7%', a: 'centro' }, { t: 'Anotado por', w: '27%' }],
  itens.map((l) => { const f = (k, txt) => (txt === '' || txt == null ? '' : l.fora.includes(k) ? `<b>${esc(txt)} *</b>` : esc(txt));
    return [`${esc(dataBR(l.data))} ${esc(l.hora)}${l.origem === 'diario' ? '<small>Diário</small>' : ''}`,
      l.pa_sist != null ? (l.fora.includes('pa_sist') || l.fora.includes('pa_diast') ? `<b>${l.pa_sist}x${l.pa_diast} *</b>` : `${l.pa_sist}x${l.pa_diast}`) : '',
      f('temperatura', l.temperatura != null ? numBR(l.temperatura, 1) : ''), f('glicemia', l.glicemia), f('saturacao', l.saturacao), f('fc', l.fc),
      l.peso != null ? esc(numBR(l.peso, 1)) : '', f('dor', l.dor), esc(nomeAutorDia({ autor_nome: l.autor_nome, criado_por: l.criado_por }))]; }),
  { classe: 'compacta', vazio: 'Nenhuma medida no período.' });
}

// ───────────── gráfico de uma medida (SVG) ─────────────
// pontos: [{ t (ms), v: [valor1, valor2?], quando (texto), fora (bool) }]; faixa = [mín, máx] do normal
function graficoSinal({ pontos, series, faixa, unidade, casas = 0, de, ate }) {
  const W = 640, H = 210, ML = 40, MR = 44, MT = 12, MB = 26;
  const vals = pontos.flatMap((p) => p.v.filter((x) => x != null));
  let min = Math.min(...vals, ...(faixa ? faixa : [])), max = Math.max(...vals, ...(faixa ? faixa : []));
  if (min === max) { min -= 1; max += 1; }
  const folga = (max - min) * 0.1; min -= folga; max += folga;
  // Marcas redondas no eixo (4 a 5)
  const passoBruto = (max - min) / 4, pot = 10 ** Math.floor(Math.log10(passoBruto));
  const passo = [1, 2, 2.5, 5, 10].map((f) => f * pot).find((s) => s >= passoBruto);
  const ticks = []; for (let y = Math.ceil(min / passo) * passo; y <= max; y += passo) ticks.push(Math.round(y * 100) / 100);
  const X = (t) => ML + ((t - de) / Math.max(1, ate - de)) * (W - ML - MR);
  const Y = (v) => MT + (1 - (v - min) / (max - min)) * (H - MT - MB);
  const dias = Math.round((ate - de) / 86400000);
  const nx = Math.min(6, dias + 1);
  const marcasX = Array.from({ length: nx }, (_, i) => de + ((ate - de) * i) / Math.max(1, nx - 1));
  const caminho = (s) => pontos.filter((p) => p.v[s] != null).map((p, i) => `${i ? 'L' : 'M'}${X(p.t).toFixed(1)},${Y(p.v[s]).toFixed(1)}`).join(' ');
  const ult = (s) => [...pontos].reverse().find((p) => p.v[s] != null);
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Gráfico de ${esc(series.join(' e '))}">
    ${faixa ? `<rect class="faixa" x="${ML}" y="${Y(faixa[1]).toFixed(1)}" width="${W - ML - MR}" height="${(Y(faixa[0]) - Y(faixa[1])).toFixed(1)}" rx="3"/>` : ''}
    ${ticks.map((v) => `<line class="grade" x1="${ML}" x2="${W - MR}" y1="${Y(v).toFixed(1)}" y2="${Y(v).toFixed(1)}"/><text class="eixo" x="${ML - 6}" y="${(Y(v) + 4).toFixed(1)}" text-anchor="end">${esc(numBR(v, casas && passo < 1 ? 1 : 0))}</text>`).join('')}
    ${marcasX.map((t) => { const d = new Date(t); return `<text class="eixo" x="${X(t).toFixed(1)}" y="${H - 6}" text-anchor="middle">${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}</text>`; }).join('')}
    ${series.map((_, s) => `<path class="linha-s${s + 1}" d="${caminho(s)}"/>`).join('')}
    ${pontos.length <= 120 ? series.map((_, s) => pontos.filter((p) => p.v[s] != null).map((p) => `<circle class="ponto-s${s + 1}${p.fora ? ' fora' : ''}" cx="${X(p.t).toFixed(1)}" cy="${Y(p.v[s]).toFixed(1)}" r="4"/>`).join('')).join('') : ''}
    ${series.map((nome, s) => { const u = ult(s); return u ? `<text class="rotulo-fim" x="${(X(u.t) + 8).toFixed(1)}" y="${(Y(u.v[s]) + 4).toFixed(1)}">${esc(numBR(u.v[s], casas))}</text>` : ''; }).join('')}
    <line class="mira" x1="0" x2="0" y1="${MT}" y2="${H - MB}" visibility="hidden"/>
    <rect class="captura" x="${ML}" y="0" width="${W - ML - MR}" height="${H}" fill="transparent"/>
  </svg>`;
}
// Dica ao passar o mouse/dedo: linha vertical no ponto mais perto e os valores dele
function ligarGraficosSinais(raiz) {
  for (const g of $$('.grafico-sinal', raiz)) {
    const dados = JSON.parse(g.dataset.pontos);
    const svg = $('svg', g), mira = $('.mira', svg), dica = document.createElement('div');
    dica.className = 'dica-graf'; dica.hidden = true; g.appendChild(dica);
    const W = 640, ML = 40, MR = 44;
    const mover = (ev) => {
      const r = svg.getBoundingClientRect();
      const x = ((ev.clientX - r.left) / r.width) * W;
      const t = dados.de + ((x - ML) / (W - ML - MR)) * (dados.ate - dados.de);
      let perto = null;
      for (const p of dados.pontos) if (!perto || Math.abs(p.t - t) < Math.abs(perto.t - t)) perto = p;
      if (!perto) return;
      const px = ML + ((perto.t - dados.de) / Math.max(1, dados.ate - dados.de)) * (W - ML - MR);
      mira.setAttribute('x1', px); mira.setAttribute('x2', px); mira.setAttribute('visibility', 'visible');
      dica.innerHTML = `<b>${esc(perto.quando)}</b><br>${dados.series.map((nome, s) => (perto.v[s] != null ? `${esc(nome)}: <b>${esc(numBR(perto.v[s], dados.casas))}</b> ${esc(dados.unidade)}` : '')).filter(Boolean).join('<br>')}${perto.fora ? '<br>⚠ fora do normal' : ''}${perto.origem === 'diario' ? '<br><i>anotado no Diário</i>' : ''}`;
      dica.hidden = false;
      dica.style.left = `${Math.min(Math.max((px / W) * r.width, 70), r.width - 70)}px`;
    };
    svg.addEventListener('pointermove', mover);
    svg.addEventListener('pointerdown', mover);
    svg.addEventListener('pointerleave', () => { dica.hidden = true; mira.setAttribute('visibility', 'hidden'); });
  }
}

// ───────────── gráficos de um residente ─────────────
let periodoSinais = 30, vistaSinais = 'graficos';
async function graficosResidente(c, rid) {
  const d = await api('GET', `/api/sinais?residente=${rid}&dias=${periodoSinais}`);
  const r = d.residente, m = d.medidas, itens = d.itens;
  const de = new Date(d.desde + 'T00:00:00').getTime(), ate = Date.now();
  const tempo = (l) => new Date(`${l.data}T${l.hora}:00`).getTime();
  const quando = (l) => `${dataBR(l.data).slice(0, 5)} às ${l.hora}`;
  // Uma medida = um gráfico (a pressão tem duas linhas: máxima e mínima, na mesma escala)
  const grupos = [
    { titulo: 'Pressão', chaves: ['pa_sist', 'pa_diast'], series: ['Máxima', 'Mínima'], unidade: 'mmHg', faixa: null },
    { titulo: 'Temperatura', chaves: ['temperatura'], series: ['Temperatura'], unidade: '°C', faixa: m.temperatura.normal, casas: 1 },
    { titulo: 'Glicemia', chaves: ['glicemia'], series: ['Glicemia'], unidade: 'mg/dL', faixa: m.glicemia.normal },
    { titulo: 'Saturação', chaves: ['saturacao'], series: ['Saturação'], unidade: '%', faixa: m.saturacao.normal },
    { titulo: 'Batimentos', chaves: ['fc'], series: ['Batimentos'], unidade: 'bpm', faixa: m.fc.normal },
    { titulo: 'Peso', chaves: ['peso'], series: ['Peso'], unidade: 'kg', faixa: null, casas: 1 },
    { titulo: 'Dor (0 a 10)', chaves: ['dor'], series: ['Dor'], unidade: '', faixa: m.dor.normal },
  ];
  const cartoes = grupos.map((g) => {
    const pts = itens.filter((l) => g.chaves.some((k) => l[k] != null)).map((l) => ({ t: tempo(l), v: g.chaves.map((k) => l[k] ?? null), quando: quando(l), fora: g.chaves.some((k) => l.fora.includes(k)), origem: l.origem }));
    if (!pts.length) return '';
    const u = pts[pts.length - 1];
    // Pressão: sem faixa de fundo (máxima e mínima têm "normais" diferentes; uma faixa só enganaria). Os pontos fora do normal têm anel vermelho.
    const faixa = g.faixa;
    const dados = { pontos: pts, series: g.series, unidade: g.unidade, casas: g.casas || 0, de, ate };
    return `<section class="cartao grafico-cartao"><div class="cab-graf"><div><h3>${esc(g.titulo)}</h3>
        ${g.series.length > 1 ? `<div class="legenda-graf"><span><i class="s1"></i>${esc(g.series[0])}</span><span><i class="s2"></i>${esc(g.series[1])}</span>${faixa ? '<span><i class="fx"></i>normal</span>' : ''}</div>`
          : faixa ? '<div class="legenda-graf"><span><i class="fx"></i>faixa normal</span></div>' : ''}</div>
      <div class="ultimo"><b>${esc(u.v.filter((x) => x != null).map((x) => numBR(x, g.casas || 0)).join('x'))}</b><small>${esc([g.unidade, u.quando].filter(Boolean).join(' · '))}</small>${u.fora ? `<br><span class="etiqueta perigo">${icone('alerta')}fora do normal</span>` : ''}</div></div>
      <div class="grafico-sinal" data-pontos="${esc(JSON.stringify(dados))}">${graficoSinal({ ...dados, faixa })}</div></section>`;
  }).join('');
  c.innerHTML = `
    <a class="voltar" href="#/residente/${r.id}">${icone('voltar')}Ficha de ${esc(r.nome)}</a>
    <div class="so-impressao cabecalho-impressao"><b>${esc(EU.config.nome_organizacao || SUBTITULO_APP)} — Sinais vitais de ${esc(r.nome)}</b><span>Impresso em ${esc(dataHoraBR(new Date().toISOString()))}</span></div>
    <div class="cabecalho"><div><h1>Sinais vitais</h1><p class="sub">${esc(r.nome)} · últimos ${periodoSinais} dias · ${plural(itens.length, 'leitura', 'leituras')}</p></div>
      <div class="acoes"><a class="btn nao-imprimir" href="#/sinais">${icone('saude')}Ronda do dia</a><button type="button" class="btn" id="grImprimir">${icone('impressora')}Imprimir</button></div></div>
    <div class="barra-ferramentas nao-imprimir">
      ${segmentado([{ v: '7', rotulo: '7 dias' }, { v: '30', rotulo: '30 dias' }, { v: '90', rotulo: '90 dias' }], String(periodoSinais), { classe: 'periodoSv', rotulo: 'Período' })}
      ${segmentado([{ v: 'graficos', rotulo: 'Gráficos', icone: 'grade' }, { v: 'tabela', rotulo: 'Tabela', icone: 'lista' }], vistaSinais, { classe: 'vistaSv', rotulo: 'Modo de ver' })}
    </div>
    <div id="svArea">${!itens.length ? `<div class="cartao">${vazio('saude', 'Nenhuma medida neste período', 'Anote na ronda do dia (Saúde › Sinais vitais) ou no Diário.')}</div>`
      : vistaSinais === 'tabela' ? `<div class="tabela-caixa"><table class="tabela"><thead><tr><th>Quando</th><th>Pressão</th><th>Temp.</th><th>Glicemia</th><th>Sat.</th><th>Batim.</th><th>Peso</th><th>Dor</th><th>Quem</th></tr></thead><tbody>
        ${[...itens].reverse().map((l) => { const f = (k, txt) => (l.fora.includes(k) ? `<b style="color:var(--perigo)">${txt} ⚠</b>` : txt);
          return `<tr><td class="num" style="white-space:nowrap">${esc(dataBR(l.data))} ${esc(l.hora)}${l.origem === 'diario' ? ' <span class="etiqueta neutro">Diário</span>' : ''}</td>
          <td class="num">${l.pa_sist != null ? f(l.fora.includes('pa_sist') ? 'pa_sist' : 'pa_diast', `${l.pa_sist}x${l.pa_diast}`) : '—'}</td><td class="num">${l.temperatura != null ? f('temperatura', numBR(l.temperatura, 1)) : '—'}</td>
          <td class="num">${l.glicemia != null ? f('glicemia', l.glicemia) : '—'}</td><td class="num">${l.saturacao != null ? f('saturacao', l.saturacao) : '—'}</td>
          <td class="num">${l.fc != null ? f('fc', l.fc) : '—'}</td><td class="num">${l.peso != null ? numBR(l.peso, 1) : '—'}</td><td class="num">${l.dor != null ? f('dor', l.dor) : '—'}</td>
          <td>${esc(nomeAutorDia({ autor_nome: l.autor_nome, criado_por: l.criado_por }))}</td></tr>`; }).join('')}</tbody></table></div>`
        : `<div class="graficos">${cartoes}</div><p class="dica" style="margin-top:10px">Passe o mouse (ou o dedo) no gráfico para ver cada medida. A faixa clara é o “normal” para idosos (provisório — a enfermagem pode ajustar). Pontos com anel vermelho = fora do normal.</p>`}</div>`;
  $('#grImprimir', c).onclick = () => window.print();
  definirImpressao(() => ({
    titulo: 'Sinais vitais do residente', sub: `${r.nome} · últimos ${periodoSinais} dias (${dataBR(d.desde)} a ${dataBR(hojeIso())}) · ${plural(itens.length, 'leitura', 'leituras')}`,
    corpo: docSecao('Resumo do período', docResumoSinais(itens, m), 'junta')
      + docSecao('Todas as medidas', docTabelaLeituras([...itens].reverse()))
      + docNota('* fora da faixa normal para idosos (provisória — a enfermagem pode ajustar). “Diário” = anotado junto com uma ocorrência do diário.'),
  }));
  ligarSegmentado($('.periodoSv', c), (v) => { periodoSinais = Number(v); rotear(); });
  ligarSegmentado($('.vistaSv', c), (v) => { vistaSinais = v; rotear(); });
  ligarGraficosSinais(c);
}
