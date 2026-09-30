// OASE - Lar — o "casco" do sistema: utilitários, conversa com o servidor, janelas, avisos, menu, entrada e Início.
// Sem bibliotecas externas: funciona sem internet. Todos os scripts dividem o mesmo escopo global
// (nunca repita o nome de uma const/function em outro arquivo).
'use strict';

// Precisa ser igual ao VERSAO de app/lib/versao.js. Se o navegador carregar telas novas
// enquanto a janela preta ainda roda o servidor antigo, o app avisa em vez de dar erro feio.
const VERSAO = '0.16.1';
// Nome do sistema ("OASE - Lar", pedido do Kevin em 30/09/2026). Para trocar: aqui, no <title> do index.html e no title do "Iniciar Sistema.bat".
const NOME_APP = 'OASE';
const SUBTITULO_APP = 'Lar';
const DESCRICAO_APP = 'Ordem Auxiliadora de Senhoras Evangélicas';

// ───────────── utilitários ─────────────
const $ = (sel, el = document) => el.querySelector(sel);
const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const dataBR = (iso) => (iso ? String(iso).slice(0, 10).split('-').reverse().join('/') : '—');
const dataHoraBR = (iso) => (iso ? new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—');
const hojeIso = () => new Date().toLocaleDateString('sv-SE');
const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;
const soDigitos = (s) => String(s || '').replace(/\D/g, '');
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const DIAS_SEMANA = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
const dataExtenso = (iso, comAno = false) => {
  if (!iso) return '—';
  const [a, m, d] = String(iso).slice(0, 10).split('-').map(Number);
  return `${d} de ${MESES[m - 1]}${comAno ? ' de ' + a : ''}`;
};
// "6 anos e 2 meses", "3 meses", "12 dias", "hoje"
function tempoDesde(iso) {
  if (!iso) return '';
  const [a, m, d] = String(iso).slice(0, 10).split('-').map(Number);
  const h = new Date();
  let meses = (h.getFullYear() - a) * 12 + (h.getMonth() + 1 - m) - (h.getDate() < d ? 1 : 0);
  if (meses < 1) {
    const dias = Math.round((new Date(hojeIso() + 'T12:00:00') - new Date(String(iso).slice(0, 10) + 'T12:00:00')) / 86400000);
    return dias <= 0 ? 'hoje' : plural(dias, 'dia', 'dias');
  }
  const anos = Math.floor(meses / 12); meses %= 12;
  if (!anos) return plural(meses, 'mês', 'meses');
  return plural(anos, 'ano', 'anos') + (meses ? ` e ${plural(meses, 'mês', 'meses')}` : '');
}
const diasDesde = (iso) => (iso ? Math.round((new Date(hojeIso() + 'T12:00:00') - new Date(String(iso).slice(0, 10) + 'T12:00:00')) / 86400000) : null);
const formatarBytes = (n) => (n < 1024 ? n + ' B' : n < 1048576 ? (n / 1024).toFixed(0) + ' KB' : (n / 1048576).toFixed(1).replace('.', ',') + ' MB');

// Iniciais e cor fixa de cada pessoa (a mesma pessoa tem sempre a mesma cor)
function iniciais(nome) {
  const p = String(nome || '').trim().split(/\s+/).filter((x) => !/^(de|da|do|dos|das|e)$/i.test(x));
  if (!p.length) return '?';
  return (p[0][0] + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase();
}
function corAvatar(nome) {
  let h = 0;
  for (const ch of norm(nome)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h % 8;
}
const avatar = (nome, tam = '', extra = '') => `<span class="avatar ${tam} av${corAvatar(nome)} ${extra}" aria-hidden="true">${esc(iniciais(nome))}</span>`;

// Telefone clicável (no celular já liga)
function foneLink(tel, comIcone = true) {
  if (!tel) return '';
  let d = soDigitos(tel);
  if (d.length >= 10 && !d.startsWith('55')) d = '55' + d;
  return `<a class="fone" href="tel:+${esc(d)}">${comIcone ? icone('telefone') : ''}${esc(tel)}</a>`;
}
// Máscaras enquanto digita
function mascararFone(inp) {
  inp.addEventListener('input', () => {
    const d = soDigitos(inp.value).slice(0, 11);
    if (d.length < 3) return;
    inp.value = d.length <= 10 ? `(${d.slice(0, 2)}) ${d.slice(2, 6)}${d.length > 6 ? '-' + d.slice(6) : ''}` : `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  });
}
function mascararCpf(inp) {
  inp.addEventListener('input', () => {
    const d = soDigitos(inp.value).slice(0, 11);
    inp.value = d.length > 9 ? `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}` : d.length > 6 ? `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}` : d.length > 3 ? `${d.slice(0, 3)}.${d.slice(3)}` : d;
  });
}
const semMovimento = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
// Cascata de entrada: numera os filhos para o CSS atrasar cada um um pouquinho
function cascata(el) { [...el.children].forEach((f, i) => f.style.setProperty('--i', i)); el.classList.add('cascata'); return el; }

let EU = null;

// ───────────── conversa com o servidor ─────────────
async function api(metodo, url, corpo, bruto) {
  const op = { method: metodo, headers: { 'X-APP': '1' } };
  if (bruto) op.body = bruto;
  else if (corpo !== undefined) { op.headers['Content-Type'] = 'application/json'; op.body = JSON.stringify(corpo); }
  let r;
  try { r = await fetch(url, op); } catch {
    // O servidor (a janela preta) não respondeu: a janela aberta continua com tudo o que foi digitado
    semConexao();
    throw new Error('O computador do sistema não respondeu. O que você digitou continua aqui: espere a faixa vermelha sumir e tente de novo.');
  }
  conexaoVoltou();
  const dados = await r.json().catch(() => ({}));
  if (r.status === 401 && url !== '/api/login') { EU = null; telaEntrada(); throw new Error(dados.erro || 'Sessão expirada'); }
  if (r.status === 428) { telaTrocarSenha(true); throw new Error(dados.erro); }
  if (r.status === 423 && url !== '/api/desbloquear') { mostrarBloqueio(); throw new Error(dados.erro || 'Tela bloqueada'); }
  if (r.status === 404 && /rota não encontrada/i.test(dados.erro || '')) {
    throw new Error('Esta tela é mais nova que o sistema que está aberto. Feche a janela preta do "Iniciar Sistema" e abra de novo.');
  }
  if (!r.ok) { const e = new Error(dados.erro || 'Erro ' + r.status); e.status = r.status; e.dados = dados; throw e; }
  return dados;
}

// Salva mandando a versão que a tela carregou (atualizado_em). Se outra pessoa salvou no meio do caminho,
// o servidor recusa e aqui a pessoa decide: passar por cima ou desistir (a janela continua aberta com o que ela digitou).
// Só vão os campos que a pessoa mudou: se duas pessoas mexeram em campos diferentes, o trabalho das duas fica.
async function salvarComVersao(url, corpoTodo, original) {
  const corpo = Object.fromEntries(Object.entries(corpoTodo).filter(([k, v]) => !(k in original) || String(v ?? '') !== String(original[k] ?? '')));
  if (!Object.keys(corpo).length) return { ok: true, nada: true };
  try { return await api('PUT', url, { ...corpo, _versao: original.atualizado_em ?? null }); } catch (e) {
    const c = e.dados && e.dados.conflito;
    if (!c) throw e;
    const quando = new Date(c.em);
    const min = Math.max(0, Math.round((Date.now() - quando) / 60000));
    const ha = min < 1 ? 'agora há pouco' : min < 60 ? `há ${plural(min, 'minuto', 'minutos')}` : 'às ' + quando.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const n = Object.keys(corpo).length;
    const sim = await confirmar(`${c.por} alterou este registro ${ha}, enquanto você estava com ele aberto. Se você salvar agora, só `
      + `${n === 1 ? 'o campo que você mudou será gravado' : `os ${n} campos que você mudou serão gravados`}; o resto do que ${c.por} fez fica como está. Salvar mesmo assim?`,
    'Salvar mesmo assim', { titulo: 'Outra pessoa mexeu nisto' });
    if (sim) return api('PUT', url, { ...corpo, _forcar: true });
    throw new Error(`Nada foi salvo. Para ver o que ${c.por} mudou, feche esta janela e abra de novo.`);
  }
}

// Botão que mostra "trabalhando…" enquanto espera o servidor e avisa se der erro
async function botaoOcupado(btn, fn) {
  if (!btn || btn.disabled) return;
  const antes = btn.innerHTML;
  btn.disabled = true;
  const tempo = setTimeout(() => { btn.innerHTML = `<span class="rodando" aria-hidden="true"></span>${antes.replace(/<svg[\s\S]*?<\/svg>/, '')}`; }, 180);
  try { return await fn(); } catch (e) { toast(e.message, true); } finally { clearTimeout(tempo); if (btn.isConnected) { btn.disabled = false; btn.innerHTML = antes; } }
}
const tentar = (fn) => async (...a) => { try { await fn(...a); } catch (e) { toast(e.message, true); } };

// ───────────── quando o servidor cai ─────────────
let vigiaConexao = null;
function semConexao() {
  if (!$('#semConexao')) {
    const f = document.createElement('div');
    f.id = 'semConexao'; f.className = 'faixa-topo'; f.setAttribute('role', 'alert');
    f.innerHTML = `${icone('alerta')}<span><b>Sem conexão com o computador do sistema.</b> Confira se a janela preta do "Iniciar Sistema" está aberta. Nada do que você digitou foi perdido — tentando de novo…</span>`;
    document.body.prepend(f);
  }
  if (!vigiaConexao) vigiaConexao = setInterval(async () => {
    try { const r = await fetch('/api/versao', { cache: 'no-store' }); if (r.status < 500) conexaoVoltou(true); } catch { /* ainda fora */ }
  }, 4000);
}
function conexaoVoltou(avisar) {
  const f = $('#semConexao');
  if (vigiaConexao) { clearInterval(vigiaConexao); vigiaConexao = null; }
  if (f) { f.remove(); if (avisar) toast('A conexão voltou. Pode salvar de novo.'); }
}

// ───────────── rascunho das janelas ─────────────
// O que é digitado numa janela fica guardado nesta aba do navegador (sessionStorage, some ao fechar o navegador).
// Se a janela fecha normalmente (salvou ou cancelou), o rascunho é apagado. Se o sistema cai ou a página recarrega,
// na próxima vez que a mesma janela abrir aparece "Recuperar".
const RASCUNHO = 'lar-rascunho:';
const camposDaJanela = (el) => $$('input[id], select[id], textarea[id]', el).filter((i) => !['password', 'file', 'hidden', 'search'].includes(i.type));
const valorCampo = (i) => (i.type === 'checkbox' || i.type === 'radio' ? i.checked : i.value);
function guardarRascunho(tituloTxt, el, inicial) {
  const campos = Object.fromEntries(camposDaJanela(el).map((i) => [i.id, valorCampo(i)]));
  try {
    if (JSON.stringify(campos) !== inicial) sessionStorage.setItem(RASCUNHO + tituloTxt, JSON.stringify({ quando: Date.now(), tela: location.hash, campos }));
    else sessionStorage.removeItem(RASCUNHO + tituloTxt);
  } catch { /* navegador sem armazenamento */ }
}
function lerRascunho(tituloTxt) {
  try {
    const r = JSON.parse(sessionStorage.getItem(RASCUNHO + tituloTxt) || 'null');
    if (r && Date.now() - r.quando < 12 * 3600000) return r;
    sessionStorage.removeItem(RASCUNHO + tituloTxt);
  } catch { /* ignora */ }
  return null;
}
const apagarRascunho = (tituloTxt) => { try { sessionStorage.removeItem(RASCUNHO + tituloTxt); } catch { /* ignora */ } };
function rascunhosPendentes() {
  try { return Object.keys(sessionStorage).filter((k) => k.startsWith(RASCUNHO)).map((k) => k.slice(RASCUNHO.length)).filter(lerRascunho); } catch { return []; }
}
// Faixa em qualquer tela: "ficou uma janela sem salvar", com o caminho de volta
function mostrarRascunhos() {
  const caixa = $('#rascunhos');
  if (!caixa) return;
  const abertas = $$('.modal h2 span').map((s) => s.textContent);
  const lista = rascunhosPendentes().filter((t) => !abertas.includes(t));
  caixa.innerHTML = lista.length ? `<div class="conteudo" style="padding-bottom:0"><div class="faixa aviso" style="margin:0">${icone('editar')}<span><b>Ficou sem salvar:</b> ${lista.map((t) => `“${esc(t)}”`).join(', ')}.
    Abra a mesma janela de novo e clique em <b>Recuperar</b>.</span><div class="acoes">${lista.length === 1 ? `<a class="btn peq" href="${esc(lerRascunho(lista[0]).tela || '#/')}">Ir para a tela</a>` : ''}
    <button class="btn peq fantasma" id="rascDescartar">Descartar</button></div></div></div>` : '';
  if ($('#rascDescartar')) $('#rascDescartar').onclick = () => { lista.forEach(apagarRascunho); mostrarRascunhos(); };
}
function ligarRascunho(tituloTxt, el, inicial) {
  const r = lerRascunho(tituloTxt);
  if (r && JSON.stringify(r.campos) !== inicial) {
    const faixa = document.createElement('div');
    faixa.className = 'faixa-rascunho';
    faixa.innerHTML = `${icone('editar')}<span>Você tinha começado a preencher isto às ${new Date(r.quando).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} e não salvou.</span>
      <div class="acoes"><button type="button" class="btn peq primario" data-recuperar>Recuperar</button><button type="button" class="btn peq fantasma" data-descartar>Descartar</button></div>`;
    $('.modal-corpo', el).prepend(faixa);
    $('[data-recuperar]', faixa).onclick = () => {
      for (const i of camposDaJanela(el)) {
        if (!(i.id in r.campos)) continue;
        if (i.type === 'checkbox' || i.type === 'radio') i.checked = r.campos[i.id]; else i.value = r.campos[i.id];
        i.dispatchEvent(new Event('input', { bubbles: true })); i.dispatchEvent(new Event('change', { bubbles: true }));
      }
      faixa.remove(); toast('O que você tinha digitado voltou. Confira e salve.');
    };
    $('[data-descartar]', faixa).onclick = () => { apagarRascunho(tituloTxt); faixa.remove(); };
  }
  el.addEventListener('input', () => guardarRascunho(tituloTxt, el, inicial));
  el.addEventListener('change', () => guardarRascunho(tituloTxt, el, inicial));
}

// ───────────── avisos flutuantes (toast) ─────────────
// Entram e saem pelo mesmo caminho (de baixo), pausam com o mouse em cima e quando a aba fica escondida.
function toast(msg, erro) {
  let pilha = $('#toasts');
  if (!pilha) { pilha = document.createElement('div'); pilha.id = 'toasts'; pilha.className = 'toasts'; document.body.appendChild(pilha); }
  const t = document.createElement('div');
  t.className = 'toast' + (erro ? ' erro' : '');
  t.setAttribute('role', erro ? 'alert' : 'status');
  t.innerHTML = `${icone(erro ? 'alerta' : 'check')}<span>${esc(msg)}</span><button type="button" class="btn-icone" aria-label="Fechar aviso">${icone('x')}</button>`;
  pilha.appendChild(t);
  while (pilha.children.length > 3) pilha.firstElementChild.remove();
  requestAnimationFrame(() => requestAnimationFrame(() => t.classList.add('visivel')));
  let resta = erro ? 7000 : 4000, inicio = Date.now(), timer = null;
  const sair = () => { clearTimeout(timer); t.classList.remove('visivel'); t.classList.add('saindo'); setTimeout(() => t.remove(), 200); };
  const correr = () => { inicio = Date.now(); timer = setTimeout(sair, resta); };
  const pausar = () => { clearTimeout(timer); resta -= Date.now() - inicio; };
  t.addEventListener('pointerenter', pausar); t.addEventListener('pointerleave', correr);
  $('button', t).onclick = sair;
  correr();
}
document.addEventListener('visibilitychange', () => { /* os avisos esperam quem saiu da aba voltar */
  for (const t of $$('.toast.visivel')) t.dispatchEvent(new Event(document.hidden ? 'pointerenter' : 'pointerleave'));
});

// ───────────── janelas (modal) ─────────────
// No computador aparece no centro; no celular vira uma folha que sobe de baixo e pode ser arrastada para fechar.
// Fechar com coisas digitadas pergunta antes (o "desfazer" de quem clicou fora sem querer).
function modal(tituloTxt, corpoHtml, { onAbrir, rodape = '', sub = '', tamanho = '', rascunho = true, aoFechar } = {}) {
  const anterior = document.activeElement;
  const fundo = document.createElement('div');
  fundo.className = 'modal-fundo';
  const idT = 'jt' + Math.random().toString(36).slice(2, 8);
  fundo.innerHTML = `<div class="modal ${tamanho}" role="dialog" aria-modal="true" aria-labelledby="${idT}" tabindex="-1">
    <div class="modal-alca" aria-hidden="true"></div>
    <header class="modal-topo"><div class="titulos"><h2 id="${idT}"><span>${esc(tituloTxt)}</span></h2>${sub ? `<p class="modal-sub">${sub}</p>` : ''}</div>
      <button type="button" class="btn-icone" data-fechar aria-label="Fechar">${icone('x')}</button></header>
    <div class="modal-corpo">${corpoHtml}</div>${rodape ? `<footer class="modal-rodape">${rodape}</footer>` : ''}</div>`;
  document.body.appendChild(fundo);
  document.documentElement.style.overflow = 'hidden';
  const el = $('.modal', fundo);
  let fechado = false, estadoInicial;
  const fotografia = () => JSON.stringify(Object.fromEntries(camposDaJanela(el).map((i) => [i.id, valorCampo(i)])));
  const sujo = () => estadoInicial !== undefined && fotografia() !== estadoInicial;
  const teclas = (e) => {
    if (fundo !== $$('.modal-fundo:not(.fechando)').at(-1) || $('.bloqueio')) return;
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); pedirFechar(); return; }
    if (e.key === 'Tab') { // o foco não escapa da janela
      const f = $$('a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]', el).filter((x) => x.offsetParent !== null);
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f.at(-1).focus(); } else if (!e.shiftKey && document.activeElement === f.at(-1)) { e.preventDefault(); f[0].focus(); }
    }
  };
  const fechar = (salvo) => {
    if (fechado) return;
    fechado = true;
    if (rascunho) apagarRascunho(tituloTxt);
    document.removeEventListener('keydown', teclas, true);
    fundo.classList.remove('aberto'); fundo.classList.add('fechando');
    setTimeout(() => {
      fundo.remove();
      if (!$('.modal-fundo')) document.documentElement.style.overflow = '';
      if (anterior && anterior.isConnected) anterior.focus({ preventScroll: true });
      mostrarRascunhos();
    }, semMovimento() ? 0 : 230);
    if (aoFechar) aoFechar(salvo);
  };
  const pedirFechar = async () => {
    if (sujo() && !(await confirmar('Você digitou coisas que ainda não foram salvas. Quer mesmo fechar e descartar?', 'Descartar', { perigo: true, titulo: 'Descartar alterações?' }))) return;
    fechar(false);
  };
  fundo.addEventListener('pointerdown', (e) => { fundo.alvoToque = e.target; });
  fundo.addEventListener('click', (e) => {
    if (e.target === fundo && fundo.alvoToque === fundo) pedirFechar();
    else if (e.target.closest('[data-fechar]')) pedirFechar();
  });
  document.addEventListener('keydown', teclas, true);
  ligarArrastarFolha(el, pedirFechar);
  requestAnimationFrame(() => requestAnimationFrame(() => fundo.classList.add('aberto')));
  const janela = { el, fechar, pedirFechar };
  if (onAbrir) onAbrir(el, janela);
  estadoInicial = fotografia();
  if (rascunho && camposDaJanela(el).length) ligarRascunho(tituloTxt, el, estadoInicial);
  const toque = matchMedia('(pointer: coarse)').matches; // no celular, não abre o teclado sozinho
  const alvo = $('[autofocus]', el) || (!toque && $('.modal-corpo input:not([type="hidden"]):not([disabled]):not([type="checkbox"]):not([type="radio"]), .modal-corpo select, .modal-corpo textarea', el)) || el;
  setTimeout(() => alvo.focus({ preventScroll: true }), 30);
  return janela;
}

// Arrastar a folha para baixo (celular): segue o dedo 1:1, resiste para cima, e um "peteleco" rápido já fecha.
function ligarArrastarFolha(el, pedirFechar) {
  const alca = $('.modal-alca', el);
  let y0 = null, t0 = 0, dy = 0, hist = [];
  alca.addEventListener('pointerdown', (e) => {
    if (!matchMedia('(max-width: 640px)').matches) return;
    y0 = e.clientY; t0 = performance.now(); dy = 0; hist = [[t0, 0]];
    alca.setPointerCapture(e.pointerId);
    el.style.transition = 'none';
  });
  alca.addEventListener('pointermove', (e) => {
    if (y0 == null) return;
    dy = e.clientY - y0;
    const agora = performance.now();
    hist.push([agora, dy]); if (hist.length > 5) hist.shift();
    const d = dy < 0 ? -8 * Math.log1p(-dy / 8) : dy; // para cima: elástico
    el.style.transform = `translateY(${d}px)`;
  });
  const soltar = () => {
    if (y0 == null) return;
    y0 = null;
    const [ta, ya] = hist[0], [tb, yb] = hist.at(-1);
    const vel = tb > ta ? (yb - ya) / (tb - ta) : 0; // px por ms, dos últimos movimentos
    el.style.transition = '';
    el.style.transform = '';
    if (dy > 140 || (vel > 0.45 && dy > 24)) pedirFechar();
  };
  alca.addEventListener('pointerup', soltar);
  alca.addEventListener('pointercancel', soltar);
}

function confirmar(msg, textoBtn = 'Confirmar', { perigo = false, titulo = 'Confirme', cancelar = 'Cancelar' } = {}) {
  return new Promise((ok) => {
    let resposta = false;
    const j = modal(titulo, `<p class="texto-confirmar">${esc(msg)}</p>`, {
      tamanho: 'estreito', rascunho: false,
      rodape: `<button type="button" class="btn" data-fechar>${esc(cancelar)}</button><button type="button" class="btn ${perigo ? 'perigo' : 'primario'}" data-sim autofocus>${esc(textoBtn)}</button>`,
      aoFechar: () => ok(resposta),
    });
    $('[data-sim]', j.el).onclick = () => { resposta = true; j.fechar(true); };
  });
}

// ───────────── menu flutuante (conta, "mais opções") ─────────────
// Nasce do botão que o abriu (transform-origin no canto do botão), não do meio da tela.
let menuAberto = null;
function abrirMenu(botao, html, { lado = 'baixo' } = {}) {
  if (menuAberto && menuAberto.botao === botao) { fecharMenu(); return null; }
  fecharMenu();
  const m = document.createElement('div');
  m.className = 'menu-flutuante'; m.setAttribute('role', 'menu'); m.innerHTML = html;
  document.body.appendChild(m);
  const r = botao.getBoundingClientRect(), w = m.offsetWidth, h = m.offsetHeight;
  let left, top, ox, oy;
  if (lado === 'direita' && innerWidth > 760) { left = r.right + 10; top = r.bottom - h; ox = 'left'; oy = 'bottom'; }
  else { left = r.right - w; top = r.bottom + 8; ox = 'right'; oy = 'top'; }
  if (top + h > innerHeight - 8) { top = r.top - h - 8; oy = 'bottom'; }
  left = Math.max(8, Math.min(left, innerWidth - w - 8)); top = Math.max(8, top);
  Object.assign(m.style, { left: left + 'px', top: top + 'px', transformOrigin: `${ox} ${oy}` });
  botao.setAttribute('aria-expanded', 'true');
  const fora = (e) => { if (!m.contains(e.target) && !botao.contains(e.target)) fecharMenu(); };
  const tecla = (e) => { if (e.key === 'Escape') { fecharMenu(); botao.focus(); } };
  menuAberto = { m, botao, fora, tecla };
  document.addEventListener('pointerdown', fora, true);
  document.addEventListener('keydown', tecla);
  m.addEventListener('click', (e) => { if (e.target.closest('.menu-item')) fecharMenu(); });
  requestAnimationFrame(() => requestAnimationFrame(() => m.classList.add('aberto')));
  const primeiro = $('.menu-item', m); if (primeiro) primeiro.focus({ preventScroll: true });
  return m;
}
function fecharMenu() {
  if (!menuAberto) return;
  const { m, botao, fora, tecla } = menuAberto;
  menuAberto = null;
  document.removeEventListener('pointerdown', fora, true);
  document.removeEventListener('keydown', tecla);
  botao.setAttribute('aria-expanded', 'false');
  m.classList.remove('aberto');
  setTimeout(() => m.remove(), 160);
}

// ───────────── controle segmentado (marcador que desliza até a opção escolhida) ─────────────
function segmentado(opcoes, valor, { classe = '', rotulo = '' } = {}) {
  return `<div class="segmentado ${classe}" role="group" aria-label="${esc(rotulo)}" data-v="${esc(valor)}"><span class="seg-marcador" aria-hidden="true"></span>${
    opcoes.map((o) => `<button type="button" data-v="${esc(o.v)}" aria-pressed="${o.v === valor}"${o.titulo ? ` title="${esc(o.titulo)}" aria-label="${esc(o.titulo)}"` : ''}>${
      o.icone ? icone(o.icone) : ''}${o.rotulo ? esc(o.rotulo) : ''}${o.cont != null ? `<span class="cont">${o.cont}</span>` : ''}</button>`).join('')}</div>`;
}
function ligarSegmentado(el, aoMudar) {
  const marcador = $('.seg-marcador', el);
  const mover = (animar) => {
    const b = $('button[aria-pressed="true"]', el);
    if (!b) return;
    if (!animar) marcador.style.transition = 'none';
    marcador.style.width = b.offsetWidth + 'px';
    marcador.style.height = b.offsetHeight + 'px';
    marcador.style.transform = `translate(${b.offsetLeft}px, ${b.offsetTop}px)`;
    if (!animar) { void marcador.offsetWidth; marcador.style.transition = ''; }
  };
  const definir = (v, animar = true) => {
    $$('button[data-v]', el).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === v)));
    el.dataset.v = v; mover(animar);
  };
  mover(false);
  if (document.fonts) document.fonts.ready.then(() => mover(false));
  if (window.ResizeObserver) new ResizeObserver(() => mover(false)).observe(el);
  el.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-v]');
    if (!b || b.getAttribute('aria-pressed') === 'true') return;
    const antes = el.dataset.v;
    definir(b.dataset.v);
    if (aoMudar) aoMudar(b.dataset.v, antes);
  });
  return { definir };
}

// ───────────── tema e densidade ─────────────
function temaAtual() { return document.documentElement.dataset.tema === 'escuro' ? 'escuro' : 'claro'; }
function aplicarTema(tema) {
  const html = document.documentElement;
  if (!semMovimento()) { html.classList.add('trocando-tema'); setTimeout(() => html.classList.remove('trocando-tema'), 300); }
  html.dataset.tema = tema;
  try { localStorage.setItem('lar-tema', tema); } catch { /* ignora */ }
  const b = $('#btnTema');
  if (b) { b.innerHTML = icone(tema === 'escuro' ? 'sol' : 'lua'); b.title = tema === 'escuro' ? 'Usar tema claro' : 'Usar tema escuro'; }
}
function aplicarDensidade(compacta) {
  if (compacta) document.documentElement.dataset.densidade = 'compacta'; else delete document.documentElement.dataset.densidade;
  try { localStorage.setItem('lar-compacto', compacta ? '1' : '0'); } catch { /* ignora */ }
}

// ───────────── ícones (traço, 24×24) ─────────────
const ICONES = {
  inicio: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5"/>',
  residentes: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  config: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
  ajuda: '<circle cx="12" cy="12" r="10"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>',
  sair: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>',
  lua: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
  sol: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>',
  cadeado: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  chave: '<circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6M15.5 7.5l3 3L22 7l-3-3"/>',
  busca: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  mais: '<path d="M12 5v14M5 12h14"/>',
  editar: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
  lixo: '<path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>',
  telefone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92Z"/>',
  alerta: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17h.01"/>',
  info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  voltar: '<path d="m15 18-6-6 6-6"/>',
  seta: '<path d="m9 18 6-6-6-6"/>',
  impressora: '<path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>',
  coracao: '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>',
  saude: '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/><path d="M3.22 12H9.5l.5-1 2 4.5 2-7 1.5 3.5h5.27"/>',
  cama: '<path d="M2 4v16M2 8h18a2 2 0 0 1 2 2v10M2 17h20M6 8v9"/>',
  calendario: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  bolo: '<path d="M20 21v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8"/><path d="M4 16s.5-1 2-1 2.5 2 4 2 2.5-2 4-2 2.5 2 4 2 2-1 2-1"/><path d="M2 21h20M7 8v3M12 8v3M17 8v3M7 4h.01M12 4h.01M17 4h.01"/>',
  usuario: '<circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 0 0-16 0"/>',
  usuarioMais: '<circle cx="9" cy="8" r="4"/><path d="M15 21a6 6 0 0 0-12 0"/><path d="M19 8v6M22 11h-6"/>',
  escudo: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/>',
  disco: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/><path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3"/>',
  celular: '<rect x="5" y="2" width="14" height="20" rx="2"/><path d="M12 18h.01"/>',
  atualizar: '<path d="M21 12a9 9 0 1 1-2.64-6.36L21 8"/><path d="M21 3v5h-5"/>',
  lista: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  grade: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  hospital: '<path d="M12 6v4M14 8h-4"/><path d="M18 22V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v18"/><path d="M2 22h20M10 22v-4h4v4"/>',
  relogio: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  pontos: '<circle cx="12" cy="12" r="1.2"/><circle cx="19" cy="12" r="1.2"/><circle cx="5" cy="12" r="1.2"/>',
  olho: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
  olhoFechado: '<path d="M9.9 4.24A9 9 0 0 1 12 4c6.5 0 10 8 10 8a18 18 0 0 1-2.16 3.19M14.12 14.12a3 3 0 1 1-4.24-4.24"/><path d="M17.94 17.94A10 10 0 0 1 12 20c-6.5 0-10-8-10-8a18 18 0 0 1 5.06-5.94M2 2l20 20"/>',
  dieta: '<path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2M7 2v20M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/>',
  documento: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/>',
  rede: '<path d="M5 12.55a11 11 0 0 1 14.08 0M1.42 9a16 16 0 0 1 21.16 0M8.53 16.11a6 6 0 0 1 6.95 0M12 20h.01"/>',
  baixar: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
  restaurar: '<path d="M3 12a9 9 0 1 0 2.64-6.36L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l3 2"/>',
  pessoaCasa: '<path d="M3 11 12 4l9 7"/><path d="M5.5 9.5V20h13V9.5"/><path d="M12 18.5s-4-2.4-4-5.1A2.2 2.2 0 0 1 12 12a2.2 2.2 0 0 1 4 1.4c0 2.7-4 5.1-4 5.1Z"/>',
  compacto: '<path d="M4 6h16M4 10h16M4 14h16M4 18h16"/>',
  estrela: '<path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01Z"/>',
  caderno: '<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/><path d="M9 7h7M9 11h5"/>',
  mensagem: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z"/>',
  termometro: '<path d="M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z"/>',
  humor: '<circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01"/>',
  dinheiro: '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 12h.01M18 12h.01"/>',
  cracha: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M15 8h2M15 12h2M6 16c.5-1.5 1.7-2 3-2s2.5.5 3 2"/>',
  pacote: '<path d="M21 8 12 3 3 8v8l9 5 9-5Z"/><path d="m3 8 9 5 9-5M12 13v8"/>',
  pilula: '<path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"/><path d="m8.5 8.5 7 7"/>',
  gota: '<path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7Z"/>',
  menos: '<path d="M5 12h14"/>',
  contar: '<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
  local: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
  queda: '<path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4"/><circle cx="12" cy="12" r="3"/>',
};
const icone = (nome, classe = 'ic') => `<svg class="${classe}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONES[nome] || ''}</svg>`;
// Selo do sistema: símbolo da OASE (torre, cruz e globo), redesenhado em vetor a partir do logo da OASE (30/09/2026).
// Versão compacta (traço grosso) para ficar legível pequena. As cores vêm do CSS (.logo-oase), igual ao icone.svg.
const MARCA_SVG = `<svg class="logo-oase" viewBox="0 0 100 122" aria-hidden="true">
  <path class="lo-torre" d="M50 5 C47 40 29 88 5 101 C30 103 45 108 50 117 C55 108 70 103 95 101 C71 88 53 40 50 5 Z"/>
  <ellipse class="lo-globo" cx="50" cy="88" rx="22" ry="10"/><path class="lo-linha" d="M29 88h42"/>
  <rect class="lo-cruz" x="46.5" y="38" width="7" height="58"/><rect class="lo-braco" x="39" y="49" width="22" height="7"/></svg>`;

function vazio(nomeIcone, titulo2, texto, acaoHtml = '') {
  return `<div class="vazio"><span class="ic-caixa">${icone(nomeIcone)}</span><h3>${esc(titulo2)}</h3><p>${texto}</p>${acaoHtml ? `<div class="acoes">${acaoHtml}</div>` : ''}</div>`;
}

// ───────────── entrada (login) e troca de senha ─────────────
const ARTE_ENTRADA = () => `<section class="entrada-arte" aria-hidden="true">
  <div class="selo-grande"><span class="selo">${MARCA_SVG}</span><div><b>${esc(NOME_APP)}</b><small>${esc(SUBTITULO_APP)}</small></div></div>
  <div><h1>Cuidado que fica registrado.</h1><p>A ficha de cada residente, os familiares e o dia a dia do lar num lugar só — sem papel perdido e sem precisar de internet.</p></div>
  <div class="rodape-arte">${esc(DESCRICAO_APP)} · versão ${esc(VERSAO)}</div></section>`;

function botaoVerSenha(raiz) {
  for (const b of $$('[data-ver-senha]', raiz)) {
    b.onclick = () => {
      const i = b.parentElement.querySelector('input');
      const ver = i.type === 'password';
      i.type = ver ? 'text' : 'password';
      b.innerHTML = icone(ver ? 'olhoFechado' : 'olho');
      b.setAttribute('aria-label', ver ? 'Esconder senha' : 'Mostrar senha');
    };
  }
}
const campoSenha = (id, rotulo, auto) => `<label class="campo"><span>${esc(rotulo)}</span><div class="campo-senha"><input id="${id}" type="password" autocomplete="${auto}" required>
  <button type="button" class="btn-icone" data-ver-senha aria-label="Mostrar senha">${icone('olho')}</button></div></label>`;

function telaEntrada() {
  fecharMenu();
  $$('.modal-fundo, .bloqueio').forEach((m) => m.remove());
  document.documentElement.style.overflow = '';
  document.title = `Entrar · ${NOME_APP}`;
  $('#app').innerHTML = `<div class="entrada">${ARTE_ENTRADA()}
    <section class="entrada-form"><form id="formEntrada" novalidate>
      <div><h2>Entrar</h2></div><p class="sub">Use o seu usuário e a sua senha.</p>
      <label class="campo"><span>Usuário</span><input id="login" autocomplete="username" autocapitalize="none" spellcheck="false" required></label>
      ${campoSenha('senha', 'Senha', 'current-password')}
      <div class="erro-form" id="erroEntrada" role="alert"></div>
      <button class="btn primario grande bloco" type="submit">Entrar</button>
      <p class="dica">Esqueceu a senha? Peça para a administração redefinir em Configurações › Usuários.</p>
    </form></section></div>`;
  const f = $('#formEntrada');
  botaoVerSenha(f);
  setTimeout(() => $('#login').focus(), 50);
  f.onsubmit = async (e) => {
    e.preventDefault();
    const login = $('#login').value.trim(), senha = $('#senha').value;
    if (!login || !senha) { $('#erroEntrada').textContent = 'Preencha o usuário e a senha.'; return; }
    await botaoOcupado($('button[type="submit"]', f), async () => {
      try { await api('POST', '/api/login', { login, senha }); } catch (err) {
        $('#erroEntrada').textContent = err.message;
        f.classList.remove('tremer'); void f.offsetWidth; if (!semMovimento()) f.classList.add('tremer');
        $('#senha').select();
        return;
      }
      await iniciar();
    });
  };
}

// Força da senha (só uma dica visual; quem decide é o servidor)
function forcaSenha(s) {
  let p = 0;
  if (s.length >= 8) p++;
  if (s.length >= 12) p++;
  if (/\d/.test(s) && /[a-z]/i.test(s)) p++;
  if (/[A-Z]/.test(s) && /[a-z]/.test(s)) p++;
  if (/[^a-z0-9]/i.test(s)) p++;
  return Math.min(4, p);
}
function ligarForca(inp, barra) {
  inp.addEventListener('input', () => {
    const p = inp.value ? forcaSenha(inp.value) : 0;
    const i = $('i', barra);
    i.style.width = (inp.value ? Math.max(12, p * 25) : 0) + '%';
    i.style.background = p <= 1 ? 'var(--perigo)' : p === 2 ? 'var(--aviso)' : 'var(--ok)';
  });
}

function telaTrocarSenha(obrigatoria) {
  const formHtml = `<form id="formSenha" class="${obrigatoria ? '' : 'grade-campos'}" novalidate style="display:grid;gap:16px">
    ${obrigatoria ? `<div><h2>Crie a sua senha</h2></div><p class="sub">Olá, ${esc(EU ? EU.nome : '')}! No primeiro acesso a senha inicial precisa ser trocada por uma só sua.</p>` : ''}
    ${campoSenha('senhaAtual', obrigatoria ? 'Senha que você recebeu' : 'Senha atual', 'current-password')}
    ${campoSenha('senhaNova', 'Nova senha', 'new-password')}
    <div class="forca" id="forcaSenha"><i></i></div>
    ${campoSenha('senhaNova2', 'Repita a nova senha', 'new-password')}
    <p class="dica">Pelo menos 8 caracteres. Uma frase curta que só você conhece é ótima, por exemplo: <i>cafe com bolo 7h</i>.</p>
    <div class="erro-form" id="erroSenha" role="alert" style="color:var(--perigo);min-height:20px;font-size:14px"></div>
    ${obrigatoria ? '<button class="btn primario grande bloco" type="submit">Salvar e entrar</button><button type="button" class="btn fantasma bloco" id="senhaSair">Sair</button>' : ''}
  </form>`;
  const enviar = async (form, btn, depois) => {
    const atual = $('#senhaAtual', form).value, nova = $('#senhaNova', form).value, nova2 = $('#senhaNova2', form).value;
    const erro = (m) => { $('#erroSenha', form).textContent = m; };
    if (!atual || !nova) return erro('Preencha as senhas.');
    if (nova !== nova2) return erro('A nova senha e a repetição estão diferentes.');
    if (nova.length < 8) return erro('A nova senha precisa ter pelo menos 8 caracteres.');
    await botaoOcupado(btn, async () => {
      try { await api('POST', '/api/trocar-senha', { atual, nova }); } catch (e) { erro(e.message); return; }
      depois();
    });
  };
  if (obrigatoria) {
    fecharMenu();
    $$('.modal-fundo').forEach((m) => m.remove());
    $('#app').innerHTML = `<div class="entrada">${ARTE_ENTRADA()}<section class="entrada-form">${formHtml}</section></div>`;
    const f = $('#formSenha');
    botaoVerSenha(f); ligarForca($('#senhaNova', f), $('#forcaSenha', f));
    setTimeout(() => $('#senhaAtual').focus(), 50);
    $('#senhaSair').onclick = sair;
    f.onsubmit = (e) => { e.preventDefault(); enviar(f, $('button[type="submit"]', f), async () => { toast('Senha criada. Bem-vindo(a)!'); await iniciar(); }); };
    return;
  }
  const j = modal('Trocar minha senha', formHtml, {
    tamanho: 'estreito', rascunho: false,
    rodape: '<button type="button" class="btn" data-fechar>Cancelar</button><button type="button" class="btn primario" id="senhaSalvar">Trocar senha</button>',
    onAbrir: (el) => { botaoVerSenha(el); ligarForca($('#senhaNova', el), $('#forcaSenha', el)); },
  });
  const f = $('#formSenha', j.el);
  const ir = () => enviar(f, $('#senhaSalvar', j.el), () => { j.fechar(true); toast('Senha trocada.'); });
  f.onsubmit = (e) => { e.preventDefault(); ir(); };
  $('#senhaSalvar', j.el).onclick = ir;
}

async function sair() {
  try { await api('POST', '/api/logout'); } catch { /* sai mesmo assim */ }
  EU = null;
  telaEntrada();
}

// ───────────── menu (grupos no trilho, abas no topo) ─────────────
// Para um módulo novo: acrescente a tela aqui (num grupo existente ou num grupo novo com um ícone de ICONES).
const GRUPOS = [
  { id: 'inicio', nome: 'Início', icone: 'inicio', telas: [{ rota: 'inicio', nome: 'Início' }] },
  { id: 'residentes', nome: 'Residentes', icone: 'residentes', telas: [{ rota: 'residentes', nome: 'Residentes' }, { rota: 'pia', nome: 'PIA' }] },
  { id: 'diario', nome: 'Diário', icone: 'caderno', telas: [{ rota: 'diario', nome: 'Diário' }] },
  // A ordem importa no celular: os 4 primeiros ficam na barra de baixo, o resto vai para "Mais"
  { id: 'saude', nome: 'Saúde', icone: 'saude', telas: [{ rota: 'medicacao', nome: 'Remédios de hoje' }, { rota: 'prescricoes', nome: 'Prescrições' }, { rota: 'sinais', nome: 'Sinais vitais' }, { rota: 'avaliacoes', nome: 'Avaliações' }, { rota: 'vacinas', nome: 'Vacinas' }] },
  { id: 'agenda', nome: 'Agenda', icone: 'calendario', telas: [{ rota: 'agenda', nome: 'Agenda' }, { rota: 'tarefas', nome: 'Tarefas' }] },
  { id: 'estoque', nome: 'Estoque', icone: 'pacote', telas: [{ rota: 'estoque', nome: 'Estoque' }, { rota: 'patrimonio', nome: 'Patrimônio' }] },
  { id: 'equipe', nome: 'Equipe', icone: 'cracha', telas: [{ rota: 'escala', nome: 'Escala' }, { rota: 'profissionais', nome: 'Profissionais' }] },
  // Financeiro: só a administração vê (e o servidor também só responde para a administração)
  { id: 'financeiro', nome: 'Financeiro', icone: 'dinheiro', admin: true, telas: [{ rota: 'financeiro', nome: 'Resumo' }, { rota: 'lancamentos', nome: 'Contas' }, { rota: 'mensalidades', nome: 'Mensalidades' }] },
  {
    id: 'config', nome: 'Configurações', icone: 'config', admin: true, telas: [
      { rota: 'config', arg: 'geral', nome: 'Geral' },
      { rota: 'config', arg: 'usuarios', nome: 'Usuários' },
      { rota: 'config', arg: 'backups', nome: 'Cópias de segurança' },
      { rota: 'config', arg: 'rede', nome: 'Celular e rede' },
      { rota: 'config', arg: 'atualizacoes', nome: 'Atualizações' },
      { rota: 'config', arg: 'auditoria', nome: 'Auditoria' },
    ],
  },
];
// Telas "filhas" (a ficha de um residente acende o grupo Residentes)
const ROTA_PAI = { residente: 'residentes', prontuario: 'residentes', recibo: 'financeiro' };
// (Remédios tem duas abas: "medicacao" = folha do dia, "prescricoes" = o que cada um toma)
const gruposVisiveis = () => GRUPOS.filter((g) => !g.admin || (EU && EU.perfil === 'admin'));
const grupoDaRota = (rota) => { const r = ROTA_PAI[rota] || rota; return gruposVisiveis().find((g) => g.telas.some((t) => t.rota === r)); };
const hrefTela = (t) => `#/${t.rota}${t.arg ? '/' + t.arg : ''}`;
const BADGES = {};
function definirBadge(grupoId, n) {
  BADGES[grupoId] = n;
  const mais = $('#navGrupos .mais-grupos');
  if (mais && $(`.trilho-item.so-trilho[data-grupo="${grupoId}"]`)) { // o grupo está dentro do "Mais" no celular
    let bm = $('.badge', mais);
    const algum = [...$$('.trilho-item.so-trilho')].some((i) => BADGES[i.dataset.grupo]);
    if (!algum && bm) bm.remove();
    if (algum && !bm) { bm = document.createElement('span'); bm.className = 'badge'; bm.textContent = '!'; mais.appendChild(bm); }
  }
  const item = $(`.trilho-item[data-grupo="${grupoId}"]`);
  if (!item) return;
  let b = $('.badge', item);
  if (!n) { if (b) b.remove(); return; }
  if (!b) { b = document.createElement('span'); b.className = 'badge'; item.appendChild(b); }
  b.textContent = n > 99 ? '99+' : n;
}

function montarCasca() {
  $('#app').innerHTML = `<div class="casca">
    <aside class="trilho" aria-label="Menu principal">
      <a class="marca-app" href="#/inicio" title="${esc(NOME_APP)} — ${esc(SUBTITULO_APP)}"><span class="selo-png"><img class="logo-claro" src="logo.png" alt="" width="50" height="61"><img class="logo-escuro" src="logo-escuro.png" alt="" width="50" height="61"></span><b>${esc(NOME_APP)}</b></a>
      <nav id="navGrupos"></nav>
      <div class="trilho-fim">
        <button type="button" class="btn-icone" id="btnTema"></button>
        <button type="button" class="botao-conta" id="btnConta" aria-haspopup="menu" aria-expanded="false" title="Sua conta">${avatar(EU.nome, 'p')}</button>
      </div>
    </aside>
    <div class="principal">
      <header class="topo" id="topo">
        <span class="topo-titulo" id="topoTitulo"></span>
        <nav class="abas" id="abas" aria-label="Abas desta área"></nav>
        <div class="topo-dir">
          <div class="busca busca-rapida">${icone('busca')}<input id="buscaRapida" type="search" placeholder="Buscar residente" autocomplete="off" spellcheck="false"
            aria-label="Buscar residente" aria-controls="resultadosBusca" aria-expanded="false"><kbd>/</kbd>
            <div class="resultados" id="resultadosBusca" role="listbox" hidden></div></div>
          <button type="button" class="btn-icone" id="btnAjuda" title="Ajuda desta tela (tecla ?)" aria-label="Ajuda desta tela">${icone('ajuda')}</button>
        </div>
      </header>
      <div id="rascunhos"></div>
      <main class="conteudo" id="conteudo" tabindex="-1"></main>
    </div></div>`;
  aplicarTema(temaAtual());
  $('#btnTema').onclick = () => aplicarTema(temaAtual() === 'escuro' ? 'claro' : 'escuro');
  $('#btnConta').onclick = () => abrirMenuConta($('#btnConta'));
  $('#btnAjuda').onclick = () => abrirAjuda(rotaAtual().rota);
  ligarBuscaRapida();
  // Linha sob o topo só quando o conteúdo passa por baixo dele (em vez de um divisor fixo)
  addEventListener('scroll', () => { const t = $('#topo'); if (t) t.classList.toggle('rolou', scrollY > 4); }, { passive: true });
}

function abrirMenuConta(botao) {
  const compacta = document.documentElement.dataset.densidade === 'compacta';
  const m = abrirMenu(botao, `<div class="cabeca">${avatar(EU.nome)}<div><b>${esc(EU.nome)}</b><small>${esc(EU.funcao || (EU.perfil === 'admin' ? 'Administração' : 'Equipe'))} · ${esc(EU.login)}</small></div></div>
    <button class="menu-item" data-a="tema" role="menuitem">${icone(temaAtual() === 'escuro' ? 'sol' : 'lua')}Tema ${temaAtual() === 'escuro' ? 'claro' : 'escuro'}</button>
    <button class="menu-item" data-a="densidade" role="menuitem">${icone('compacto')}Modo compacto<span class="dir">${compacta ? 'ligado' : 'desligado'}</span></button>
    <div class="menu-sep"></div>
    <button class="menu-item" data-a="bloquear" role="menuitem">${icone('cadeado')}Bloquear a tela<span class="dir">agora</span></button>
    <button class="menu-item" data-a="senha" role="menuitem">${icone('chave')}Trocar minha senha</button>
    <button class="menu-item" data-a="ajuda" role="menuitem">${icone('ajuda')}Ajuda desta tela<span class="dir"><kbd class="tecla">?</kbd></span></button>
    <div class="menu-sep"></div>
    <button class="menu-item perigo" data-a="sair" role="menuitem">${icone('sair')}Sair</button>`, { lado: 'direita' });
  if (!m) return;
  m.onclick = (e) => {
    const a = e.target.closest('[data-a]')?.dataset.a;
    if (a === 'tema') aplicarTema(temaAtual() === 'escuro' ? 'claro' : 'escuro');
    if (a === 'densidade') aplicarDensidade(!compacta);
    if (a === 'bloquear') bloquearTela();
    if (a === 'senha') telaTrocarSenha(false);
    if (a === 'ajuda') abrirAjuda(rotaAtual().rota);
    if (a === 'sair') sair();
  };
}

function rotaAtual() {
  const [r, ...resto] = location.hash.replace(/^#\/?/, '').split('/');
  let arg;
  try { arg = resto.length ? decodeURIComponent(resto.join('/')) : undefined; } catch { arg = undefined; }
  return { rota: r || 'inicio', arg };
}

function desenharNavegacao(rota, arg) {
  const g = grupoDaRota(rota);
  // No celular a barra de baixo tem espaço para 4 grupos: o resto vai para o botão "Mais" (no computador o trilho mostra todos)
  const grupos = gruposVisiveis();
  const extras = grupos.length > 5 ? grupos.slice(4) : [];
  $('#navGrupos').innerHTML = grupos.map((x) => `<a class="trilho-item${extras.includes(x) ? ' so-trilho' : ''}" data-grupo="${x.id}" href="${hrefTela(x.telas[0])}"${x === g ? ' aria-current="page"' : ''}>
    <span class="ic-caixa">${icone(x.icone)}</span>${esc(x.nome)}${BADGES[x.id] ? `<span class="badge">${BADGES[x.id]}</span>` : ''}</a>`).join('')
    + (extras.length ? `<button type="button" class="trilho-item mais-grupos" aria-haspopup="menu" aria-expanded="false"${extras.includes(g) ? ' aria-current="page"' : ''}>
      <span class="ic-caixa">${icone('pontos')}</span>Mais${extras.some((x) => BADGES[x.id]) ? '<span class="badge">!</span>' : ''}</button>` : '');
  const mais = $('#navGrupos .mais-grupos');
  if (mais) mais.onclick = () => abrirMenu(mais, extras.map((x) => `<a class="menu-item" role="menuitem" href="${hrefTela(x.telas[0])}">${icone(x.icone)}${esc(x.nome)}${
    BADGES[x.id] ? `<span class="dir"><span class="etiqueta aviso">${BADGES[x.id]}</span></span>` : ''}</a>`).join(''));
  $('#topoTitulo').textContent = g ? g.nome : '';
  const abas = g && g.telas.length > 1 ? g.telas : [];
  $('#abas').innerHTML = abas.map((t) => `<a class="aba" href="${hrefTela(t)}"${t.rota === rota && (!t.arg || t.arg === (arg || abas[0].arg)) ? ' aria-current="page"' : ''}>${esc(t.nome)}</a>`).join('');
  const atual = $('#abas .aba[aria-current]');
  if (atual) atual.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}

// ───────────── roteamento: #/rota/argumento ─────────────
const TELAS = {};
let seqRota = 0;
async function rotear() {
  if (!EU || !$('#conteudo')) return;
  fecharMenu();
  let { rota, arg } = rotaAtual();
  if (!TELAS[rota] || !grupoDaRota(rota)) { location.replace('#/inicio'); rota = 'inicio'; arg = undefined; }
  const seq = ++seqRota;
  desenharNavegacao(rota, arg);
  const alvo = $('#conteudo');
  const nova = document.createElement('div');
  const espera = setTimeout(() => { if (seq === seqRota) alvo.innerHTML = '<div class="carregando"><span class="spinner" aria-label="Carregando"></span></div>'; }, 200);
  try {
    await TELAS[rota](nova, arg);
  } catch (e) {
    if (e.status === 401 || e.status === 423 || e.status === 428) { clearTimeout(espera); return; }
    nova.innerHTML = `<div class="cartao">${vazio('alerta', 'Não consegui abrir esta tela', esc(e.message), '<button type="button" class="btn" data-tentar>Tentar de novo</button>')}</div>`;
    $('[data-tentar]', nova).addEventListener('click', () => rotear());
  }
  clearTimeout(espera);
  if (seq !== seqRota) return; // a pessoa já foi para outra tela
  alvo.replaceChildren(nova); // a tela entra inteira (com os eventos que ela ligou em si mesma)
  alvo.classList.remove('entrando'); void alvo.offsetWidth; alvo.classList.add('entrando');
  const g = grupoDaRota(rota);
  const h1 = $('h1', alvo);
  document.title = `${h1 ? h1.textContent.trim() : g ? g.nome : ''} · ${NOME_APP}`;
  scrollTo({ top: 0 });
  mostrarRascunhos();
}
addEventListener('hashchange', rotear);

// ───────────── busca rápida de residente (tecla /) ─────────────
function ligarBuscaRapida() {
  const inp = $('#buscaRapida'), caixa = $('#resultadosBusca');
  let itens = [], sel = 0, pedido = 0;
  const marcar = () => $$('.resultado', caixa).forEach((a, i) => a.setAttribute('aria-selected', String(i === sel)));
  const fechar = () => { caixa.hidden = true; inp.setAttribute('aria-expanded', 'false'); };
  const desenhar = async () => {
    const q = norm(inp.value.trim());
    if (!q) return fechar();
    const n = ++pedido;
    let lista;
    try { lista = await residentesParaBusca(); } catch { return; }
    if (n !== pedido) return;
    itens = lista.filter((r) => norm([r.nome, r.apelido, r.quarto ? 'quarto ' + r.quarto : '', r.resp_nome].join(' ')).includes(q)).slice(0, 7);
    sel = 0;
    caixa.innerHTML = itens.length ? itens.map((r, i) => `<a class="resultado" href="#/residente/${r.id}" role="option" aria-selected="${i === sel}">${avatar(r.nome, 'p', ['saiu', 'faleceu'].includes(r.situacao) ? 'apagado' : '')}
      <span><b>${esc(r.nome)}</b><small>${esc([r.apelido, r.quarto ? 'Quarto ' + r.quarto : '', r.situacao !== 'no_lar' ? rotuloSituacao(r.situacao) : ''].filter(Boolean).join(' · ') || '—')}</small></span></a>`).join('')
      : `<div class="nada">Nenhum residente encontrado para “${esc(inp.value.trim())}”.</div>`;
    caixa.hidden = false; inp.setAttribute('aria-expanded', 'true');
  };
  inp.addEventListener('input', desenhar);
  inp.addEventListener('focus', () => { if (inp.value.trim()) desenhar(); });
  inp.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); if (!itens.length) return; sel = (sel + (e.key === 'ArrowDown' ? 1 : itens.length - 1)) % itens.length; marcar(); }
    else if (e.key === 'Enter') { e.preventDefault(); if (itens[sel]) { location.hash = `#/residente/${itens[sel].id}`; inp.value = ''; fechar(); inp.blur(); } }
    else if (e.key === 'Escape') { inp.value = ''; fechar(); inp.blur(); }
  });
  caixa.addEventListener('click', (e) => { if (e.target.closest('.resultado')) { inp.value = ''; fechar(); } });
  document.addEventListener('pointerdown', (e) => { if (!e.target.closest('.busca-rapida')) fechar(); });
}

// ───────────── atalhos de teclado ─────────────
function ligarAtalhos() {
  document.addEventListener('keydown', (e) => {
    if (!EU || e.ctrlKey || e.metaKey || e.altKey) return;
    const alvo = e.target instanceof Element ? e.target : null; // a tecla pode vir do documento inteiro
    if ((alvo && alvo.closest('input, textarea, select, [contenteditable]')) || $('.modal-fundo') || $('.bloqueio')) return;
    if (e.key === '/') { const b = $('#buscaRapida'); if (b && b.offsetParent) { e.preventDefault(); b.focus(); } }
    else if (e.key === '?') { e.preventDefault(); abrirAjuda(rotaAtual().rota); }
  });
}

// ───────────── aviso de versão (servidor e telas diferentes) ─────────────
function avisarVersao() {
  if (!EU || EU.versao === VERSAO || $('#avisoVersao')) return;
  const f = document.createElement('div');
  f.id = 'avisoVersao'; f.className = 'faixa-topo info'; f.setAttribute('role', 'status');
  const servidorNovo = EU.versao.localeCompare(VERSAO, undefined, { numeric: true }) > 0;
  f.innerHTML = servidorNovo
    ? `${icone('atualizar')}<span>O sistema foi atualizado para a versão ${esc(EU.versao)}.</span><button class="btn peq" id="versaoRecarregar">Recarregar agora</button>`
    : `${icone('alerta')}<span>Estas telas (versão ${esc(VERSAO)}) são mais novas que o sistema aberto (${esc(EU.versao)}). Feche a janela preta do "Iniciar Sistema" e abra de novo.</span>`;
  document.body.prepend(f);
  if ($('#versaoRecarregar')) $('#versaoRecarregar').onclick = () => location.reload();
}

// ───────────── início ─────────────
async function iniciar() {
  try { EU = await api('GET', '/api/eu'); } catch (e) {
    if (!EU && e.status !== 401 && !$('#formEntrada')) $('#app').innerHTML = `<div class="conteudo">${vazio('alerta', 'Não consegui falar com o sistema', esc(e.message))}</div>`;
    return;
  }
  if (EU.trocar_senha) return telaTrocarSenha(true);
  montarCasca();
  avisarVersao();
  // Contador amarelo do Diário: ocorrências de atenção/grave ainda não resolvidas
  api('GET', '/api/ocorrencias/resumo').then((r) => definirBadge('diario', r.pendentes)).catch(() => { /* só o contador */ });
  api('GET', '/api/estoque/alertas').then((r) => definirBadge('estoque', r.total)).catch(() => { /* só o contador */ });
  api('GET', '/api/medicacao/resumo').then((r) => definirBadge('saude', r.atrasado)).catch(() => { /* só o contador */ });
  if (!location.hash || location.hash === '#' || location.hash === '#/') location.replace('#/inicio');
  await rotear();
  if (EU.bloqueada) mostrarBloqueio();
  vigiarInatividade();
}

const saudacao = () => { const h = new Date().getHours(); return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'; };
const primeiroNome = (n) => String(n || '').trim().split(/\s+/)[0];

TELAS.inicio = async (c) => {
  const [d, est, med, vacs, plantao, tfs] = await Promise.all([api('GET', '/api/inicio'), api('GET', '/api/estoque/alertas'), api('GET', '/api/medicacao/resumo'),
    api('GET', '/api/vacinas/painel'), api('GET', '/api/escala/hoje'), api('GET', '/api/tarefas?minhas=1')]);
  const tarefasHoje = tfs.itens.filter((t) => !t.feita && t.prazo && t.prazo <= hojeIso());
  const s = d.porSituacao;
  definirBadge('estoque', est.total);
  definirBadge('saude', med.atrasado);
  const medFeitos = med.dado + med.recusado + med.nao_dado;
  const atuais = (s.no_lar || 0) + (s.hospitalizado || 0);
  const total = Object.values(s).reduce((a, b) => a + b, 0);
  definirBadge('residentes', s.hospitalizado || 0);
  const hoje = new Date();
  const admin = EU.perfil === 'admin';
  const ANIV_NO_INICIO = 4; // só os mais próximos: a lista completa fica na ficha de cada um
  const quando = (r) => (r.dias === 0 ? 'Hoje!' : r.dias === 1 ? 'Amanhã' : `Em ${r.dias} dias`);
  c.innerHTML = `
    <div class="cabecalho"><div>
      <h1>${saudacao()}, ${esc(primeiroNome(EU.nome))}</h1>
      <p class="sub">${esc(DIAS_SEMANA[hoje.getDay()])}, ${esc(dataExtenso(hojeIso(), true))} · ${esc(EU.config.nome_organizacao || SUBTITULO_APP)}</p>
    </div><div class="acoes">${total ? `<button type="button" class="btn" id="inicioAnotar">${icone('caderno')}Anotar no diário</button>` : ''}<a class="btn primario" href="#/residentes" data-novo>${icone('mais')}Novo residente</a></div></div>
    ${d.demo ? `<div class="faixa demo">${icone('info')}<span><b>Modo demonstração:</b> os residentes mostrados são fictícios, para treinar à vontade.${admin ? ' Para começar a usar de verdade, apague a demonstração em Configurações › Geral.' : ''}</span></div>` : ''}
    ${admin && d.backup.atrasado ? `<div class="faixa aviso">${icone('disco')}<span>${d.backup.nunca ? '<b>Ainda não existe nenhuma cópia de segurança.</b>' : `<b>A última cópia de segurança tem ${Math.round(d.backup.idade_horas / 24)} dias.</b>`} Sem cópia, um defeito no computador apaga tudo.</span><div class="acoes"><a class="btn peq" href="#/config/backups">Ver cópias</a></div></div>` : ''}
    ${total ? `
    <div class="numeros" id="numerosInicio">
      <a class="numero" href="#/residentes/no_lar"><span class="ic-caixa">${icone('pessoaCasa')}</span><b>${s.no_lar || 0}</b><span>No lar agora</span></a>
      <a class="numero aviso" href="#/residentes/hospitalizado"><span class="ic-caixa">${icone('hospital')}</span><b>${s.hospitalizado || 0}</b><span>${(s.hospitalizado || 0) === 1 ? 'Hospitalizado(a)' : 'Hospitalizados'}</span></a>
      <div class="numero acento"><span class="ic-caixa">${icone('bolo')}</span><b>${d.aniversarios.length}</b><span>Aniversários em 30 dias</span></div>
      <a class="numero neutro" href="#/residentes/todos"><span class="ic-caixa">${icone('documento')}</span><b>${total}</b><span>Fichas no sistema</span></a>
    </div>
    <div class="grade-2">
      <div class="pilha">
        ${d.atencao_total ? `<section class="cartao" style="border-color:var(--aviso-suave)"><div class="cartao-topo"><h2>${icone('alerta')}Precisa de atenção</h2>
          <a class="btn peq fantasma" href="#/diario/atencao">Ver ${d.atencao_total > d.atencao.length ? `as ${d.atencao_total}` : 'e resolver'}</a></div>
          <div class="linhas">${d.atencao.map((o) => `<a class="linha" href="#/diario/atencao">${o.residente_id ? avatar(o.residente_nome || '?', 'p') : `<span class="avatar p">${icone('mensagem')}</span>`}
            <span class="meio"><b>${esc(o.residente_nome || 'Recado da equipe')} <span class="etiqueta ${o.gravidade === 'grave' ? 'perigo' : 'aviso'}">${o.gravidade === 'grave' ? 'Grave' : 'Atenção'}</span></b>
            <small>${esc(dataBR(o.data).slice(0, 5))} ${esc(o.hora)} · ${esc(o.texto)}</small></span>${icone('seta')}</a>`).join('')}</div></section>` : ''}
        ${med.total ? `<section class="cartao"${med.atrasado ? ' style="border-color:var(--aviso-suave)"' : ''}><div class="cartao-topo"><h2>${icone('pilula')}Remédios de hoje</h2><a class="btn peq fantasma" href="#/medicacao">Abrir a folha</a></div>
          <div class="progresso-dia">${barraEst({ saldo: medFeitos, estoque_minimo: med.total / 2.5, zerado: false, acabando: false, unidade: 'un' })}
            <span class="mudo"><b>${medFeitos}</b> de <b>${med.total}</b> marcados${med.atrasado ? ` · <b style="color:var(--aviso)">${plural(med.atrasado, 'atrasado', 'atrasados')}</b>` : ''}</span></div></section>` : ''}
        ${vacs.avisos ? `<section class="cartao"><div class="cartao-topo"><h2>${icone('escudo')}Vacinas</h2><a class="btn peq fantasma" href="#/vacinas/avisos">Ver</a></div>
          <p class="mudo"><b>${plural(vacs.avisos, 'dose atrasada ou vencendo', 'doses atrasadas ou vencendo')}</b> · gripe ${esc(vacs.campanha.ano)}: ${vacs.campanha.vacinados} de ${vacs.campanha.total} vacinados.</p></section>` : ''}
        ${tarefasHoje.length ? `<section class="cartao"><div class="cartao-topo"><h2>${icone('check')}Minhas tarefas de hoje</h2><a class="btn peq fantasma" href="#/tarefas/minhas">Abrir</a></div>
          <div class="linhas">${tarefasHoje.slice(0, 5).map((t) => `<a class="linha" href="#/tarefas/minhas"><span class="meio"><b>${esc(t.titulo)}</b><small>${t.prazo < hojeIso() ? 'Atrasada desde ' + esc(dataBR(t.prazo)) : 'Hoje'}${t.responsavel ? '' : ' · equipe toda'}</small></span>
            ${t.prioridade === 'alta' ? '<span class="etiqueta perigo">Urgente</span>' : ''}</a>`).join('')}</div></section>` : ''}
        <section class="cartao"><div class="cartao-topo"><h2>${icone('caderno')}Diário de hoje</h2><a class="btn peq fantasma" href="#/diario">Abrir</a></div>
          <p class="mudo">${d.diario_hoje ? `${plural(d.diario_hoje, 'anotação', 'anotações')} até agora.` : 'Nada anotado hoje ainda.'} Anote a evolução e tudo o que fugir da rotina.</p></section>
        <section class="cartao"><div class="cartao-topo"><h2>${icone('hospital')}Hospitalizados agora</h2></div>
          ${d.hospitalizados.length ? `<div class="linhas">${d.hospitalizados.map((r) => `<a class="linha" href="#/residente/${r.id}">${avatar(r.nome, 'p')}<span class="meio"><b>${esc(r.nome)}</b>
            <small>${r.situacao_desde ? `desde ${esc(dataBR(r.situacao_desde))} (${esc(tempoDesde(r.situacao_desde))})` : ''}${r.situacao_obs ? ' · ' + esc(r.situacao_obs) : ''}</small></span>${icone('seta')}</a>`).join('')}</div>`
            : `<p class="mudo">Ninguém hospitalizado no momento.</p>`}
        </section>
      </div>
      <div class="pilha">
        ${plantao.itens.length ? `<section class="cartao"><div class="cartao-topo"><h2>${icone('cracha')}No plantão hoje</h2><a class="btn peq fantasma" href="#/escala">Escala</a></div>
          <div class="linhas">${plantao.itens.map((p) => `<div class="linha">${avatar(p.nome, 'p')}<span class="meio"><b>${esc(p.nome)}</b><small>${esc(p.funcao)}</small></span>
            <span class="etiqueta" data-cod="${esc(p.codigo)}">${esc(plantao.codigos[p.codigo].nome)}</span></div>`).join('')}</div></section>` : ''}
        <section class="cartao"><div class="cartao-topo"><h2>${icone('calendario')}Agenda de hoje e amanhã</h2><a class="btn peq fantasma" href="#/agenda">Abrir</a></div>
          ${d.agenda.length ? `<div class="linhas">${d.agenda.map((a) => `<a class="linha" href="#/agenda">${a.residente_id ? avatar(a.residente_nome || '?', 'p') : `<span class="avatar p">${icone('pessoaCasa')}</span>`}
            <span class="meio"><b>${esc(a.titulo)}</b><small>${a.data === hojeIso() ? 'Hoje' : 'Amanhã'}${a.hora ? ' às ' + esc(a.hora) : ''} · ${esc(a.residente_apelido || a.residente_nome || 'Todo o lar')}${a.local ? ' · ' + esc(a.local) : ''}</small></span>${icone('seta')}</a>`).join('')}</div>`
            : '<p class="mudo">Nada marcado para hoje nem amanhã.</p>'}</section>
        ${est.total ? `<section class="cartao"><div class="cartao-topo"><h2>${icone('pacote')}Estoque</h2><a class="btn peq fantasma" href="#/estoque/avisos">Ver ${est.total > est.itens.length ? `os ${est.total}` : 'tudo'}</a></div>
          <div class="linhas">${est.itens.map((p) => `<a class="linha" href="#/estoque/item-${p.id}"><span class="meio"><b>${esc(p.nome)}</b>
            <small>${p.zerado ? 'Acabou' : p.acabando ? `Acabando: sobra${p.saldo === 1 ? '' : 'm'} ${esc(String(p.saldo).replace('.', ','))}` : `Tem ${esc(String(p.saldo).replace('.', ','))}`}${
            p.vencido > 0 ? ' · tem item vencido' : p.vencendo > 0 && p.proxima_validade ? ` · vence em ${esc(dataBR(p.proxima_validade))}` : ''}</small></span>
            <span class="etiqueta ${p.zerado || p.vencido > 0 ? 'perigo' : 'aviso'}">${p.zerado ? 'Acabou' : p.vencido > 0 ? 'Vencido' : p.acabando ? 'Acabando' : 'Vencendo'}</span></a>`).join('')}</div></section>` : ''}
        ${d.aniversarios.length ? `<section class="cartao"><div class="cartao-topo"><h2>${icone('bolo')}Próximos aniversários</h2></div>
          <div class="linhas" id="anivInicio">${d.aniversarios.slice(0, ANIV_NO_INICIO).map((r) => `<a class="linha" href="#/residente/${r.id}">${avatar(r.nome, 'p')}
            <span class="meio"><b>${esc(r.apelido || r.nome)}</b><small>faz ${r.faz} anos · ${esc(dataExtenso(r.data))}</small></span>
            <span class="etiqueta${r.dias <= 1 ? ' acento' : ''}">${quando(r)}</span></a>`).join('')}</div>
          ${d.aniversarios.length > ANIV_NO_INICIO ? `<p class="mudo" style="margin-top:10px;font-size:13px">E mais ${d.aniversarios.length - ANIV_NO_INICIO} nos próximos 30 dias.</p>` : ''}</section>` : ''}
        <section class="cartao"><div class="cartao-topo"><h2>${icone('pessoaCasa')}Chegaram por último</h2><a class="btn peq fantasma" href="#/residentes">Ver todos</a></div>
          ${d.recentes.length ? `<div class="linhas">${d.recentes.map((r) => `<a class="linha" href="#/residente/${r.id}">${avatar(r.nome, 'p')}<span class="meio"><b>${esc(r.nome)}</b>
            <small>chegou em ${esc(dataBR(r.dt_entrada))} · ${esc(tempoDesde(r.dt_entrada))}${r.quarto ? ' · quarto ' + esc(r.quarto) : ''}</small></span>${icone('seta')}</a>`).join('')}</div>`
            : '<p class="mudo">—</p>'}
        </section>
      </div>
    </div>` : `<section class="cartao">${vazio('pessoaCasa', 'Vamos começar pelos residentes',
      'Cadastre a ficha de cada pessoa que mora no lar: dados, saúde, quarto e familiares. Depois disso o Início mostra aniversários, hospitalizados e mais.',
      `<a class="btn primario" href="#/residentes" data-novo>${icone('mais')}Cadastrar o primeiro residente</a>${admin ? '<a class="btn" href="#/config/geral">Ver com dados fictícios</a>' : ''}`)}</section>`}`;
  for (const b of $$('[data-novo]', c)) b.onclick = (e) => { e.preventDefault(); formResidente(null); };
  if ($('#inicioAnotar', c)) $('#inicioAnotar', c).onclick = () => formRegistro(null);
  definirBadge('diario', d.atencao_total);
  if ($('#numerosInicio', c)) cascata($('#numerosInicio', c));
};

document.addEventListener('DOMContentLoaded', () => { ligarAtalhos(); iniciar(); });
