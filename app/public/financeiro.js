// Financeiro (só a administração): resumo do mês, contas (receitas e despesas), mensalidades dos residentes e recibo.
// Rotas: #/financeiro[/AAAA-MM] · #/lancamentos[/AAAA-MM] · #/mensalidades[/AAAA-MM] · #/recibo/ID
'use strict';

const FORMAS_FIN = ['Pix', 'Dinheiro', 'Transferência', 'Cartão', 'Boleto', 'Benefício (INSS)', 'Outra'];
const nomeMesFin = (mes) => { const [a, m] = mes.split('-').map(Number); const t = `${MESES[m - 1]} de ${a}`; return t[0].toUpperCase() + t.slice(1); };
const mesDaRota = (arg) => (/^\d{4}-(0[1-9]|1[0-2])$/.test(arg || '') ? arg : hojeIso().slice(0, 7));
const etiquetaSitFin = (l) => (l.situacao === 'pago' ? `<span class="etiqueta ok">${l.tipo === 'receita' ? 'Recebido' : 'Pago'} ${esc(dataBR(l.pago_em).slice(0, 5))}</span>`
  : l.situacao === 'atrasado' ? '<span class="etiqueta perigo">Atrasado</span>' : '<span class="etiqueta neutro">Em aberto</span>');
function navMes(mes, rota) {
  return `<div class="navegar-dia"><a class="btn-icone" href="#/${rota}/${somarMes(mes, -1)}" aria-label="Mês anterior" title="Mês anterior">${icone('voltar')}</a>
    <span style="padding:0 10px;font-weight:600">${esc(nomeMesFin(mes))}</span><a class="btn-icone" href="#/${rota}/${somarMes(mes, 1)}" aria-label="Próximo mês" title="Próximo mês">${icone('seta')}</a></div>
    ${mes !== hojeIso().slice(0, 7) ? `<a class="btn peq" href="#/${rota}">Este mês</a>` : ''}`;
}

// Valor por extenso (para o recibo): 1234,56 → "mil, duzentos e trinta e quatro reais e cinquenta e seis centavos"
function porExtenso(valor) {
  const un = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
  const dez = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
  const cen = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];
  const ate999 = (n) => {
    if (n === 100) return 'cem';
    const c = Math.floor(n / 100), r = n % 100, p = [];
    if (c) p.push(cen[c]);
    if (r) p.push(r < 20 ? un[r] : dez[Math.floor(r / 10)] + (r % 10 ? ' e ' + un[r % 10] : ''));
    return p.join(' e ');
  };
  const inteiro = Math.floor(valor + 1e-9), cent = Math.round((valor - inteiro) * 100);
  const milhoes = Math.floor(inteiro / 1e6), milhares = Math.floor((inteiro % 1e6) / 1000), resto = inteiro % 1000;
  const partes = [];
  if (milhoes) partes.push(milhoes === 1 ? 'um milhão' : ate999(milhoes) + ' milhões');
  if (milhares) partes.push(milhares === 1 ? 'mil' : ate999(milhares) + ' mil');
  if (resto) partes.push(ate999(resto));
  let txt = partes.length > 1 && resto && (resto < 100 || resto % 100 === 0) ? partes.slice(0, -1).join(', ') + ' e ' + partes[partes.length - 1] : partes.join(', ');
  if (inteiro) txt += (milhoes && !milhares && !resto ? ' de' : '') + (inteiro === 1 ? ' real' : ' reais');
  if (cent) txt += (inteiro ? ' e ' : '') + ate999(cent) + (cent === 1 ? ' centavo' : ' centavos');
  return txt || 'zero real';
}

// Barras de 6 meses: receitas × despesas (mesma escala; cores validadas pela skill dataviz)
function graficoBarrasFin(meses, mesAtual) {
  const W = 640, H = 230, ML = 52, MR = 10, MT = 12, MB = 28;
  const max = Math.max(1, ...meses.flatMap((m) => [m.receitas, m.despesas]));
  const passo = [1000, 2000, 5000, 10000, 20000, 25000, 50000].find((s) => max / s <= 5) || 100000;
  const topo = Math.ceil(max / passo) * passo;
  const Y = (v) => MT + (1 - v / topo) * (H - MT - MB);
  const larg = (W - ML - MR) / meses.length, barra = Math.min(34, larg / 2 - 6);
  const ticks = []; for (let v = 0; v <= topo; v += passo) ticks.push(v);
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Receitas e despesas dos últimos 6 meses">
    ${ticks.map((v) => `<line class="grade" x1="${ML}" x2="${W - MR}" y1="${Y(v).toFixed(1)}" y2="${Y(v).toFixed(1)}"/><text class="eixo" x="${ML - 6}" y="${(Y(v) + 4).toFixed(1)}" text-anchor="end">${v ? esc(numBR(v / 1000, 0)) + ' mil' : '0'}</text>`).join('')}
    ${meses.map((m, i) => { const cx = ML + larg * i + larg / 2;
      const b = (v, cls, x) => `<rect class="${cls}" x="${x.toFixed(1)}" y="${Y(v).toFixed(1)}" width="${barra.toFixed(1)}" height="${Math.max(0, H - MB - Y(v)).toFixed(1)}" rx="4"
        data-dica="${esc(nomeMesFin(m.mes))}|${cls === 'b1' ? 'Receitas' : 'Despesas'}|${esc(reais(v))}"/>`;
      return `${b(m.receitas, 'b1', cx - barra - 1)}${b(m.despesas, 'b2', cx + 1)}
        <text class="eixo${m.mes === mesAtual ? ' mes-atual' : ''}" x="${cx.toFixed(1)}" y="${H - 8}" text-anchor="middle">${esc(MESES[Number(m.mes.slice(5)) - 1].slice(0, 3))}</text>`; }).join('')}
  </svg>`;
}
function ligarDicasBarras(raiz) {
  for (const g of $$('.grafico-barras', raiz)) {
    const dica = document.createElement('div'); dica.className = 'dica-graf'; dica.hidden = true; g.appendChild(dica);
    g.addEventListener('pointermove', (e) => {
      const r = e.target.closest('rect[data-dica]');
      if (!r) { dica.hidden = true; return; }
      const [mes, serie, valor] = r.dataset.dica.split('|');
      dica.innerHTML = `<b>${esc(mes)}</b><br>${esc(serie)}: <b>${esc(valor)}</b>`;
      const gr = g.getBoundingClientRect(), rr = r.getBoundingClientRect();
      dica.style.left = `${rr.left - gr.left + rr.width / 2}px`; dica.style.top = `${Math.max(0, rr.top - gr.top - 58)}px`; dica.hidden = false;
    });
    g.addEventListener('pointerleave', () => { dica.hidden = true; });
  }
}

// ───────────── resumo do mês ─────────────
TELAS.financeiro = async (c, arg) => {
  const mes = mesDaRota(arg);
  const d = await api('GET', `/api/financeiro/resumo?mes=${mes}`);
  const saldo = d.receitas - d.despesas;
  const totalCat = (lista) => lista.reduce((s, x) => s + x.total, 0);
  const linhaConta = (l) => `<div class="linha"><span class="meio"><b>${esc(l.descricao)}</b><small>${esc(dataBR(l.vencimento))} · ${esc(l.categoria)}</small></span>
    <span class="${l.tipo === 'receita' ? 'valor-rec' : 'valor-desp'}">${l.tipo === 'receita' ? '+' : '−'} ${esc(reais(l.valor))}</span>
    <button type="button" class="btn peq" data-pagar="${l.id}">${l.tipo === 'receita' ? 'Receber' : 'Pagar'}</button></div>`;
  c.innerHTML = `
    <div class="so-impressao cabecalho-impressao"><b>${esc(EU.config.nome_organizacao || SUBTITULO_APP)} — Financeiro · ${esc(nomeMesFin(mes))}</b><span>Impresso em ${esc(dataHoraBR(new Date().toISOString()))}</span></div>
    <div class="cabecalho"><div><h1>Financeiro</h1><p class="sub">${esc(nomeMesFin(mes))} · o que entrou e saiu pela data do pagamento</p></div>
      <div class="acoes"><button type="button" class="btn" id="finImprimir">${icone('impressora')}Imprimir</button><button type="button" class="btn primario" id="finNovo">${icone('mais')}Lançar conta</button></div></div>
    <div class="barra-ferramentas nao-imprimir">${navMes(mes, 'financeiro')}</div>
    <div class="numeros">
      <div class="numero"><span class="ic-caixa">${icone('baixar')}</span><b>${esc(reais(d.receitas))}</b><span>Entrou no mês</span></div>
      <div class="numero neutro"><span class="ic-caixa">${icone('dinheiro')}</span><b>${esc(reais(d.despesas))}</b><span>Saiu no mês</span></div>
      <div class="numero ${saldo < 0 ? 'aviso saldo-neg' : 'acento'}"><span class="ic-caixa">${icone(saldo < 0 ? 'alerta' : 'check')}</span><b>${esc(reais(saldo))}</b><span>Saldo do mês</span></div>
      <a class="numero${d.atrasados.length ? ' aviso' : ' neutro'}" href="#/lancamentos/${mes}"><span class="ic-caixa">${icone('relogio')}</span><b>${esc(reais(d.a_receber))}</b><span>A receber · ${esc(reais(d.a_pagar))} a pagar</span></a>
    </div>
    <div class="grade-2">
      <section class="cartao"><div class="cartao-topo"><h2>${icone('grade')}Últimos 6 meses</h2></div>
        <div class="legenda-graf"><span><i class="s1"></i>Receitas</span><span><i class="s2"></i>Despesas</span></div>
        <div class="grafico-barras">${graficoBarrasFin(d.meses, mes)}</div></section>
      <div class="pilha">
        ${d.atrasados.length ? `<section class="cartao" style="border-color:var(--perigo-borda)"><div class="cartao-topo"><h2>${icone('alerta')}Atrasados (${d.atrasados.length})</h2></div>
          <div class="linhas">${d.atrasados.slice(0, 8).map(linhaConta).join('')}</div></section>` : ''}
        <section class="cartao"><div class="cartao-topo"><h2>${icone('calendario')}Vencem nos próximos 7 dias</h2></div>
          ${d.proximos.length ? `<div class="linhas">${d.proximos.map(linhaConta).join('')}</div>` : '<p class="mudo">Nada vencendo nos próximos dias.</p>'}</section>
      </div>
    </div>
    <section class="cartao espaco"><div class="cartao-topo"><h2>${icone('documento')}Resultado do mês por categoria</h2></div>
      ${d.categorias.receita.length || d.categorias.despesa.length ? `<table class="tabela dre"><tbody>
        <tr><th>Receitas</th><th></th></tr>${d.categorias.receita.map((x) => `<tr><td>${esc(x.categoria)}</td><td class="num">${esc(reais(x.total))}</td></tr>`).join('')}
        <tr class="total"><td>Total de receitas</td><td class="num">${esc(reais(totalCat(d.categorias.receita)))}</td></tr>
        <tr><th>Despesas</th><th></th></tr>${d.categorias.despesa.map((x) => `<tr><td>${esc(x.categoria)}</td><td class="num">${esc(reais(x.total))}</td></tr>`).join('')}
        <tr class="total"><td>Total de despesas</td><td class="num">${esc(reais(totalCat(d.categorias.despesa)))}</td></tr>
        <tr class="total"><td>Resultado (receitas − despesas)</td><td class="num" style="color:${saldo < 0 ? 'var(--perigo)' : 'var(--ok)'}">${esc(reais(saldo))}</td></tr>
      </tbody></table>` : '<p class="mudo">Nenhum pagamento registrado neste mês.</p>'}</section>`;
  $('#finImprimir', c).onclick = () => window.print();
  $('#finNovo', c).onclick = () => formLancamento(null);
  ligarDicasBarras(c);
  c.addEventListener('click', (e) => { const b = e.target.closest('[data-pagar]'); if (b) janelaPagar(+b.dataset.pagar); });
};

// ───────────── contas (lançamentos) ─────────────
let filtroTipoFin = 'todos', filtroSitFin = 'todos';
TELAS.lancamentos = async (c, arg) => {
  const mes = mesDaRota(arg);
  const d = await api('GET', `/api/lancamentos?mes=${mes}`);
  const vis = () => d.itens.filter((l) => (filtroTipoFin === 'todos' || l.tipo === filtroTipoFin) && (filtroSitFin === 'todos' || l.situacao === filtroSitFin));
  c.innerHTML = `
    <div class="so-impressao cabecalho-impressao"><b>${esc(EU.config.nome_organizacao || SUBTITULO_APP)} — Contas · ${esc(nomeMesFin(mes))}</b><span>Impresso em ${esc(dataHoraBR(new Date().toISOString()))}</span></div>
    <div class="cabecalho"><div><h1>Contas</h1><p class="sub">Receitas e despesas com vencimento em ${esc(nomeMesFin(mes).toLowerCase())}</p></div>
      <div class="acoes"><button type="button" class="btn" id="lcImprimir">${icone('impressora')}Imprimir</button><button type="button" class="btn primario" id="lcNovo">${icone('mais')}Lançar conta</button></div></div>
    <div class="barra-ferramentas nao-imprimir">${navMes(mes, 'lancamentos')}
      ${segmentado([{ v: 'todos', rotulo: 'Tudo' }, { v: 'receita', rotulo: 'Receitas' }, { v: 'despesa', rotulo: 'Despesas' }], filtroTipoFin, { classe: 'fTipo', rotulo: 'Tipo' })}
      ${segmentado([{ v: 'todos', rotulo: 'Todas' }, { v: 'aberto', rotulo: 'Em aberto' }, { v: 'atrasado', rotulo: 'Atrasadas' }, { v: 'pago', rotulo: 'Pagas' }], filtroSitFin, { classe: 'fSit', rotulo: 'Situação' })}</div>
    <div id="lcLista"></div>`;
  const lista = $('#lcLista', c);
  const desenhar = () => {
    const v = vis();
    const tot = (t) => v.filter((l) => l.tipo === t).reduce((s, l) => s + l.valor, 0);
    lista.innerHTML = v.length ? `<div class="tabela-caixa"><table class="tabela"><thead><tr><th>Vencimento</th><th>Descrição</th><th>Categoria</th><th>Valor</th><th>Situação</th><th></th></tr></thead><tbody>
      ${v.map((l) => `<tr><td class="num">${esc(dataBR(l.vencimento))}</td><td><b>${esc(l.descricao)}</b>${l.pessoa || l.residente_nome ? `<br><small class="fraco">${esc(l.pessoa || l.residente_nome)}</small>` : ''}</td>
        <td>${esc(l.categoria)}</td><td class="num ${l.tipo === 'receita' ? 'valor-rec' : 'valor-desp'}" style="white-space:nowrap">${l.tipo === 'receita' ? '+' : '−'} ${esc(reais(l.valor))}</td><td>${etiquetaSitFin(l)}</td>
        <td class="acoes-td nao-imprimir">${l.situacao !== 'pago' ? `<button type="button" class="btn peq" data-pagar="${l.id}">${l.tipo === 'receita' ? 'Receber' : 'Pagar'}</button>` : l.tipo === 'receita' ? `<a class="btn peq fantasma" href="#/recibo/${l.id}">Recibo</a>` : ''}
          <button type="button" class="btn-icone" data-mais-lc="${l.id}" aria-haspopup="menu" aria-expanded="false" title="Mais opções" aria-label="Mais opções">${icone('pontos')}</button></td></tr>`).join('')}
      </tbody><tfoot><tr><td colspan="3" style="font-weight:600">Total deste filtro</td><td class="num" colspan="3"><span class="valor-rec">+ ${esc(reais(tot('receita')))}</span> &nbsp; <span class="valor-desp">− ${esc(reais(tot('despesa')))}</span></td></tr></tfoot></table></div>`
      : `<div class="cartao">${vazio('dinheiro', 'Nada por aqui', 'Nenhuma conta neste mês com esse filtro. Use “Lançar conta” para registrar receitas e despesas.')}</div>`;
  };
  ligarSegmentado($('.fTipo', c), (v) => { filtroTipoFin = v; desenhar(); });
  ligarSegmentado($('.fSit', c), (v) => { filtroSitFin = v; desenhar(); });
  $('#lcNovo', c).onclick = () => formLancamento(null);
  $('#lcImprimir', c).onclick = () => window.print();
  lista.addEventListener('click', (e) => {
    const b = e.target.closest('[data-pagar]');
    if (b) return janelaPagar(+b.dataset.pagar);
    const m = e.target.closest('[data-mais-lc]');
    if (!m) return;
    const l = d.itens.find((x) => x.id === +m.dataset.maisLc);
    const menu = abrirMenu(m, `<button class="menu-item" data-a="editar" role="menuitem">${icone('editar')}Editar</button>
      ${l.situacao === 'pago' ? `<button class="menu-item" data-a="desfazer" role="menuitem">${icone('restaurar')}Desfazer o pagamento</button>` : ''}
      ${l.situacao === 'pago' && l.tipo === 'receita' ? `<a class="menu-item" href="#/recibo/${l.id}" role="menuitem">${icone('documento')}Recibo</a>` : ''}
      <div class="menu-sep"></div><button class="menu-item perigo" data-a="apagar" role="menuitem">${icone('lixo')}Apagar…</button>`);
    if (!menu) return;
    menu.onclick = tentar(async (ev) => {
      const a = ev.target.closest('[data-a]')?.dataset.a;
      if (a === 'editar') formLancamento(l);
      if (a === 'desfazer') { await api('PUT', `/api/lancamentos/${l.id}/pagar`, { desfazer: true }); toast('Pagamento desfeito.'); rotear(); }
      if (a === 'apagar') { if (!(await confirmar(`Apagar "${l.descricao}"?`, 'Apagar', { perigo: true }))) return; await api('DELETE', `/api/lancamentos/${l.id}`); toast('Apagado.'); rotear(); }
    });
  });
  desenhar();
};

async function formLancamento(l, pre = {}) {
  const novo = !l;
  let residentes = [], cats;
  try { residentes = (await residentesParaBusca()).filter((r) => !inativoRes(r) || (l && r.id === l.residente_id)); cats = (await api('GET', '/api/lancamentos')).categorias; } catch (e) { toast(e.message, true); return; }
  const v = l || { tipo: pre.tipo || 'despesa', vencimento: hojeIso() };
  const j = modal(novo ? 'Lançar conta' : 'Editar conta', `
    <div class="campo"><span class="rotulo">É</span><div class="opcoes-linha" style="grid-template-columns:1fr 1fr">
      <label class="opcao-grau"><input type="radio" name="lcTipo" id="lcTipoR" value="receita"><span><b>Receita</b><small>Entra dinheiro (mensalidade, doação…)</small></span></label>
      <label class="opcao-grau"><input type="radio" name="lcTipo" id="lcTipoD" value="despesa"><span><b>Despesa</b><small>Sai dinheiro (salários, contas, compras…)</small></span></label></div></div>
    <div class="grade-campos" style="margin-top:16px">
      <label class="campo meio"><span class="obrig">Descrição</span><input id="lcDesc" maxlength="200" placeholder="Ex.: Conta de luz de outubro"></label>
      <label class="campo"><span class="obrig">Categoria</span><select id="lcCat"></select></label>
      <label class="campo"><span class="obrig">Valor (R$)</span><input id="lcValor" inputmode="decimal" placeholder="Ex.: 1.250,00"></label>
      <label class="campo"><span class="obrig">Vencimento</span><input type="date" id="lcVenc"></label>
      <label class="campo"><span>De quem / para quem</span><input id="lcPessoa" maxlength="120" placeholder="Ex.: fornecedor, doador"></label>
      <label class="campo"><span>Residente (se for dele)</span><select id="lcRes"><option value="">—</option>${residentes.map((r) => `<option value="${r.id}">${esc(r.nome)}</option>`).join('')}</select></label>
      ${novo ? '<label class="campo"><span>Repetir por</span><select id="lcRepetir"><option value="1">Só este mês</option><option value="3">3 meses</option><option value="6">6 meses</option><option value="12">12 meses</option></select><span class="dica">Para contas fixas (luz, salários).</span></label>' : ''}
      <label class="campo largo"><span>Observação</span><input id="lcObs" maxlength="500"></label>
    </div>`, {
    rodape: `<button type="button" class="btn" data-fechar>Cancelar</button><button type="button" class="btn primario" id="lcSalvar">${icone('check')}${novo ? 'Lançar' : 'Salvar'}</button>`,
    onAbrir: (el) => {
      const preencherCats = () => { const t = $('#lcTipoR', el).checked ? 'receita' : 'despesa'; const atual = $('#lcCat', el).value;
        $('#lcCat', el).innerHTML = cats[t].map((x) => `<option>${esc(x)}</option>`).join(''); if (cats[t].includes(atual)) $('#lcCat', el).value = atual; };
      $(v.tipo === 'receita' ? '#lcTipoR' : '#lcTipoD', el).checked = true;
      preencherCats();
      $('#lcCat', el).value = v.categoria || cats[v.tipo][0];
      $('#lcDesc', el).value = v.descricao || ''; $('#lcValor', el).value = v.valor ? Number(v.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '';
      $('#lcVenc', el).value = v.vencimento; $('#lcPessoa', el).value = v.pessoa || ''; $('#lcRes', el).value = v.residente_id || ''; $('#lcObs', el).value = v.obs || '';
      el.addEventListener('change', (e) => { if (e.target.name === 'lcTipo') preencherCats(); });
    },
  });
  $('#lcSalvar', j.el).onclick = (e) => botaoOcupado(e.currentTarget, async () => {
    const el = j.el;
    const corpo = { tipo: $('#lcTipoR', el).checked ? 'receita' : 'despesa', categoria: $('#lcCat', el).value, descricao: $('#lcDesc', el).value.trim(), valor: $('#lcValor', el).value.trim(),
      vencimento: $('#lcVenc', el).value, pessoa: $('#lcPessoa', el).value.trim(), residente_id: $('#lcRes', el).value, obs: $('#lcObs', el).value.trim() };
    if (!corpo.descricao) throw new Error('Escreva a descrição.');
    if (!corpo.valor) throw new Error('Informe o valor.');
    if (novo) { corpo.repetir_meses = $('#lcRepetir', el).value; await api('POST', '/api/lancamentos', corpo); }
    else await salvarComVersao(`/api/lancamentos/${l.id}`, corpo, { ...l, valor: Number(l.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 }), pessoa: l.pessoa || '', residente_id: l.residente_id ?? '', obs: l.obs || '' });
    j.fechar(true); toast(novo ? 'Conta lançada.' : 'Conta salva.'); rotear();
  });
}

// Receber / pagar: data, valor e forma
async function janelaPagar(id) {
  let l;
  try { l = (await api('GET', `/api/lancamentos/${id}`)).lancamento; } catch (e) { toast(e.message, true); return; }
  const rec = l.tipo === 'receita';
  const j = modal(rec ? 'Registrar recebimento' : 'Registrar pagamento', `<p class="mudo" style="margin-bottom:14px"><b>${esc(l.descricao)}</b> · vence ${esc(dataBR(l.vencimento))} · ${esc(reais(l.valor))}</p>
    <div class="grade-campos"><label class="campo"><span>Data</span><input type="date" id="pgData" max="${hojeIso()}" value="${hojeIso()}"></label>
      <label class="campo"><span>Valor ${rec ? 'recebido' : 'pago'} (R$)</span><input id="pgValor" inputmode="decimal" value="${esc(Number(l.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 }))}"></label>
      <label class="campo"><span>Forma</span><select id="pgForma">${FORMAS_FIN.map((f) => `<option>${esc(f)}</option>`).join('')}</select></label></div>`, {
    tamanho: 'estreito', rascunho: false,
    rodape: `<button type="button" class="btn" data-fechar>Cancelar</button><button type="button" class="btn primario" id="pgOk">${icone('check')}${rec ? 'Recebido' : 'Pago'}</button>`,
  });
  $('#pgOk', j.el).onclick = (e) => botaoOcupado(e.currentTarget, async () => {
    await api('PUT', `/api/lancamentos/${id}/pagar`, { pago_em: $('#pgData', j.el).value, valor_pago: $('#pgValor', j.el).value, forma: $('#pgForma', j.el).value });
    j.fechar(true);
    toast(rec ? 'Recebimento registrado.' : 'Pagamento registrado.');
    if (rec && (await confirmar('Quer abrir o recibo para imprimir?', 'Abrir o recibo', { titulo: 'Recibo', cancelar: 'Agora não' }))) location.hash = `#/recibo/${id}`;
    else rotear();
  });
}

// ───────────── mensalidades ─────────────
TELAS.mensalidades = async (c, arg) => {
  const mes = mesDaRota(arg);
  const d = await api('GET', `/api/mensalidades?mes=${mes}`);
  const cobrancas = d.linhas.filter((l) => l.cobranca);
  const recebido = cobrancas.filter((l) => l.cobranca.situacao === 'pago').reduce((s, l) => s + (l.cobranca.valor_pago || l.cobranca.valor), 0);
  const previsto = cobrancas.reduce((s, l) => s + l.cobranca.valor, 0);
  c.innerHTML = `
    <div class="so-impressao cabecalho-impressao"><b>${esc(EU.config.nome_organizacao || SUBTITULO_APP)} — Mensalidades · ${esc(nomeMesFin(mes))}</b><span>Impresso em ${esc(dataHoraBR(new Date().toISOString()))}</span></div>
    <div class="cabecalho"><div><h1>Mensalidades</h1><p class="sub">${esc(nomeMesFin(mes))} · recebido ${esc(reais(recebido))} de ${esc(reais(previsto))}</p></div>
      <div class="acoes"><button type="button" class="btn" id="mnImprimir">${icone('impressora')}Imprimir</button>
        ${d.a_gerar ? `<button type="button" class="btn primario" id="mnGerar">${icone('mais')}Gerar as mensalidades do mês (${d.a_gerar})</button>` : ''}</div></div>
    <div class="barra-ferramentas nao-imprimir">${navMes(mes, 'mensalidades')}</div>
    ${d.sem_valor ? `<div class="faixa">${icone('info')}<span>${plural(d.sem_valor, 'residente está', 'residentes estão')} sem valor de mensalidade. Clique em <b>Definir valor</b> na linha.</span></div>` : ''}
    <div class="tabela-caixa"><table class="tabela"><thead><tr><th>Residente</th><th>Mensalidade</th><th>Vence dia</th><th>Neste mês</th><th></th></tr></thead><tbody>
      ${d.linhas.map((l) => `<tr><td style="display:flex;align-items:center;gap:10px">${avatar(l.nome, 'p')}<b>${esc(l.apelido || l.nome)}</b></td>
        <td class="num">${l.mensalidade ? esc(reais(l.mensalidade)) : '<span class="fraco">—</span>'}</td><td class="num">${l.dia_vencimento || '—'}</td>
        <td>${l.cobranca ? etiquetaSitFin(l.cobranca) : l.mensalidade ? '<span class="etiqueta neutro">Não gerada</span>' : '—'}</td>
        <td class="acoes-td nao-imprimir">${l.cobranca && l.cobranca.situacao !== 'pago' ? `<button type="button" class="btn peq primario" data-pagar="${l.cobranca.id}">Receber</button>` : ''}
          ${l.cobranca && l.cobranca.situacao === 'pago' ? `<a class="btn peq fantasma" href="#/recibo/${l.cobranca.id}">Recibo</a>` : ''}
          <button type="button" class="btn peq fantasma" data-valor="${l.id}">${l.mensalidade ? 'Mudar valor' : 'Definir valor'}</button></td></tr>`).join('')}
    </tbody></table></div>`;
  $('#mnImprimir', c).onclick = () => window.print();
  if ($('#mnGerar', c)) $('#mnGerar', c).onclick = (e) => botaoOcupado(e.currentTarget, async () => { const r = await api('POST', '/api/mensalidades/gerar', { mes }); toast(`${plural(r.geradas, 'mensalidade gerada', 'mensalidades geradas')}.`); rotear(); });
  c.addEventListener('click', (e) => {
    const b = e.target.closest('[data-pagar]');
    if (b) return janelaPagar(+b.dataset.pagar);
    const v = e.target.closest('[data-valor]');
    if (!v) return;
    const l = d.linhas.find((x) => x.id === +v.dataset.valor);
    const j = modal(`Mensalidade — ${l.nome}`, `<div class="grade-campos"><label class="campo"><span>Valor mensal (R$)</span><input id="mvValor" inputmode="decimal" value="${l.mensalidade ? esc(Number(l.mensalidade).toLocaleString('pt-BR', { minimumFractionDigits: 2 })) : ''}"></label>
      <label class="campo"><span>Dia do vencimento</span><input id="mvDia" type="number" min="1" max="31" value="${l.dia_vencimento || 10}"></label></div>
      <p class="dica" style="margin-top:10px">Vale a partir das próximas mensalidades geradas.</p>`, {
      tamanho: 'estreito', rascunho: false,
      rodape: '<button type="button" class="btn" data-fechar>Cancelar</button><button type="button" class="btn primario" id="mvOk">Salvar</button>',
    });
    $('#mvOk', j.el).onclick = (ev) => botaoOcupado(ev.currentTarget, async () => {
      await api('PUT', `/api/mensalidades/residente/${l.id}`, { mensalidade: $('#mvValor', j.el).value, dia_vencimento: $('#mvDia', j.el).value });
      j.fechar(true); toast('Mensalidade definida.'); rotear();
    });
  });
};

// ───────────── recibo ─────────────
TELAS.recibo = async (c, id) => {
  const d = await api('GET', `/api/lancamentos/${Number(id)}`);
  const l = d.lancamento;
  if (l.tipo !== 'receita' || !l.pago_em) { c.innerHTML = `<div class="cartao">${vazio('documento', 'Sem recibo', 'O recibo existe só para receitas já recebidas.')}</div>`; return; }
  const valor = l.valor_pago || l.valor;
  const quem = l.pessoa || (l.residente_nome ? `família de ${l.residente_nome}` : '________________________________');
  const org = d.organizacao || SUBTITULO_APP;
  c.innerHTML = `
    <a class="voltar nao-imprimir" href="#/lancamentos/${esc(l.vencimento.slice(0, 7))}">${icone('voltar')}Contas</a>
    <div class="acoes nao-imprimir" style="justify-content:flex-end;margin-bottom:14px"><button type="button" class="btn primario" id="rcImprimir">${icone('impressora')}Imprimir o recibo</button></div>
    <section class="cartao recibo">
      <div class="cab-recibo"><div class="selo-recibo">${MARCA_SVG}<div><b>${esc(org)}</b><br><small class="fraco">${esc(DESCRICAO_APP)}</small></div></div>
        <div style="text-align:right"><h2>RECIBO</h2><small class="fraco">Nº ${String(l.id).padStart(6, '0')}</small></div></div>
      <div style="display:flex;justify-content:flex-end;margin-bottom:18px"><span class="valor-grande">${esc(reais(valor))}</span></div>
      <p>Recebemos de <b>${esc(quem)}</b> a importância de <b>${esc(reais(valor))}</b> (${esc(porExtenso(valor))}), referente a <b>${esc(l.descricao)}</b>${l.forma ? `, paga em <b>${esc(l.forma.toLowerCase())}</b>` : ''}.</p>
      <p>Para clareza, firmamos o presente recibo.</p>
      <p style="margin-top:22px">${esc(dataExtenso(l.pago_em, true))}.</p>
      <div class="assinatura"><span>${esc(org)}</span></div>
    </section>`;
  $('#rcImprimir', c).onclick = () => window.print();
};
