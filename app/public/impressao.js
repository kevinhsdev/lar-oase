// Impressão: cada tela que tem "Imprimir" monta um DOCUMENTO próprio para o papel (A4), separado da tela.
// A tela é feita para o mouse e o dedo (cartões, cores, botões); o papel precisa de outra coisa: cabeçalho timbrado,
// tabelas com linhas finas, tudo cabendo na largura da folha, numeração de páginas e linhas de assinatura.
//
// Como usar numa tela:  definirImpressao(() => ({ titulo, sub, paisagem, corpo }))
//   - a função roda na hora de imprimir (botão Imprimir OU Ctrl+P), então pega os filtros e a busca do momento;
//   - corpo = HTML montado com os ajudantes abaixo (docSecao, docTabela, docCampos, docAssinaturas…), sempre com esc().
// Trocar de tela apaga o documento (rotear chama definirImpressao(null)); tela sem documento imprime a própria tela.
// Teste visual: node ferramentas\imprimir-telas.mjs (gera um PDF de cada documento em ferramentas\prints\pdf).
'use strict';

let docDaTela = null;
function definirImpressao(fn) { docDaTela = fn || null; }

// ───────────── ajudantes para montar o corpo ─────────────
// Seção com título (o título não fica sozinho no pé da página)
const docSecao = (titulo, corpo, classe = '') => `<section class="doc-secao ${classe}"><h2>${esc(titulo)}</h2>${corpo}</section>`;

// Campos de formulário preenchido: [rótulo, valor (texto), quantas colunas ocupa?]. Valor vazio vira "—".
function docCampos(pares, colunas = 3) {
  return `<dl class="doc-campos c${colunas}">${pares.filter(Boolean).map(([rotulo, valor, ocupa]) => `<div${ocupa ? ` style="grid-column:span ${ocupa}"` : ''}>
    <dt>${esc(rotulo)}</dt><dd>${valor == null || valor === '' ? '<span class="doc-vazio">—</span>' : esc(valor)}</dd></div>`).join('')}</dl>`;
}

// Tabela. colunas: [{ t: 'Título', w: '30%', a: 'dir'|'centro' }]
// linhas: arrays de HTML (já com esc), { celulas, classe } ou { grupo: 'texto' } (faixa que ocupa a largura toda: turno, horário, dia…)
function docTabela(colunas, linhas, { vazio = 'Nada a listar.', classe = '', rodape = '' } = {}) {
  if (!linhas.length) return `<p class="doc-nada">${esc(vazio)}</p>`;
  // Tabela para preencher à mão: casa vazia fica em branco (o "—" atrapalharia quem vai escrever)
  const semValor = /\bgrade\b/.test(classe) ? '' : '<span class="doc-vazio">—</span>';
  const alinhar = (c) => (c.a === 'dir' ? ' class="dir"' : c.a === 'centro' ? ' class="centro"' : '');
  return `<table class="doc-tabela ${classe}"><colgroup>${colunas.map((c) => `<col${c.w ? ` style="width:${c.w}"` : ''}>`).join('')}</colgroup>
    <thead><tr>${colunas.map((c) => `<th${alinhar(c)}>${esc(c.t)}</th>`).join('')}</tr></thead>
    <tbody>${linhas.map((l) => { if (l.grupo != null) return `<tr class="grupo"><td colspan="${colunas.length}">${esc(l.grupo)}</td></tr>`;
      const cel = Array.isArray(l) ? l : l.celulas;
      return `<tr${l.classe ? ` class="${l.classe}"` : ''}>${cel.map((v, i) => `<td${alinhar(colunas[i] || {})}>${v == null || v === '' ? semValor : semQuebrarData(v)}</td>`).join('')}</tr>`; }).join('')}</tbody>
    ${rodape ? `<tfoot>${rodape}</tfoot>` : ''}</table>`;
}

// Data (00/00/0000) nunca quebra no meio da linha da tabela
const semQuebrarData = (html) => String(html).replace(/\b\d{2}\/\d{2}\/\d{4}\b/g, (d) => `<span class="doc-nw">${d}</span>`);

// Linhas para assinar (nome embaixo da linha)
const docAssinaturas = (nomes) => `<div class="doc-assinaturas">${nomes.map((n) => `<div><span></span><small>${esc(n)}</small></div>`).join('')}</div>`;
// Caixa de destaque (alergias, avisos importantes): borda grossa, legível em impressora preto e branco
const docAlerta = (html) => `<div class="doc-alerta">${html}</div>`;
// Nota pequena (legendas, observações do documento)
const docNota = (html) => `<p class="doc-nota">${html}</p>`;
// Resumo com números grandes (financeiro, contagens): [[rótulo, valor]]
const docNumeros = (itens) => `<div class="doc-numeros">${itens.map(([r, v]) => `<div><small>${esc(r)}</small><b>${esc(v)}</b></div>`).join('')}</div>`;
// Texto corrido que respeita as quebras de linha
const docTexto = (t) => (t ? `<span class="doc-quebras">${esc(t)}</span>` : '');
// Marca de "fora do normal"/"atenção" sem depender de cor
const docMarca = (txt) => `<span class="doc-marca">${esc(txt)}</span>`;

// ───────────── o documento inteiro ─────────────
// Cabeçalho timbrado: selo da OASE e nome do lar à esquerda; quando e por quem foi emitido à direita
// A logo vai DENTRO do HTML (e não como <img>): o documento é montado no instante da impressão e uma imagem
// que ainda estivesse carregando sairia em branco. Ela é buscada uma vez, quando o sistema abre.
let logoDoc = '';
fetch('logo-casa.svg').then((r) => (r.ok ? r.text() : '')).then((t) => { logoDoc = t.replace(/<\?xml[^>]*>|<title>.*?<\/title>/g, ''); }).catch(() => {});
function docTimbre() {
  const cfg = (EU && EU.config) || {};
  const org = cfg.nome_organizacao || SUBTITULO_APP;
  return `<header class="doc-cab">
      <div class="doc-timbre"><span class="doc-logo">${logoDoc || '<img src="logo-casa.svg" alt="">'}</span>
        <div><b>${esc(org)}</b><small>${esc(DESCRICAO_APP)}</small>${cfg.cnpj ? `<small class="doc-cnpj">CNPJ ${esc(cfg.cnpj)}</small>` : ''}</div></div>
      <div class="doc-emissao"><small>Emitido em</small><b>${esc(dataHoraBR(new Date().toISOString()))}</b>${EU ? `<small>por ${esc(EU.nome)}</small>` : ''}</div>
    </header>`;
}
// semCabecalho: o próprio corpo já traz o timbre (ex.: recibo em duas vias, cada uma com o seu)
function montarDocumento(d) {
  return `<article class="doc${d.paisagem ? ' paisagem' : ''}">
    ${d.semCabecalho ? '' : `${docTimbre()}<div class="doc-titulo"><h1>${esc(d.titulo)}</h1>${d.sub ? `<p>${esc(d.sub)}</p>` : ''}</div>`}
    ${d.corpo}
  </article>`;
}

function prepararImpressao() {
  let alvo = document.getElementById('impressao');
  if (!alvo) { alvo = document.createElement('div'); alvo.id = 'impressao'; document.body.appendChild(alvo); }
  const raiz = document.documentElement;
  if (!docDaTela || !EU) { alvo.innerHTML = ''; raiz.classList.remove('com-documento'); return; }
  const d = docDaTela();
  if (!d) { alvo.innerHTML = ''; raiz.classList.remove('com-documento'); return; }
  alvo.innerHTML = montarDocumento(d);
  raiz.classList.add('com-documento');
  // Rodapé de todas as páginas (o @page do app.css lê esta variável): nome do lar e do documento
  const org = (EU.config && EU.config.nome_organizacao) || SUBTITULO_APP;
  raiz.style.setProperty('--doc-rodape', JSON.stringify(`${org} · ${d.titulo}${d.sub ? ' · ' + d.sub : ''}`.slice(0, 140)));
  document.title = d.titulo + (d.sub ? ' — ' + d.sub : ''); // vira o nome sugerido do arquivo ao "Salvar como PDF"
}
function limparImpressao() {
  const alvo = document.getElementById('impressao');
  if (alvo) alvo.innerHTML = '';
  document.documentElement.classList.remove('com-documento');
  const h1 = document.querySelector('#conteudo h1');
  if (h1) document.title = `${h1.textContent.trim()} · ${NOME_APP}`;
}
addEventListener('beforeprint', prepararImpressao);
addEventListener('afterprint', limparImpressao);
