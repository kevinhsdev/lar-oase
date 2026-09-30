// Patrimônio: itens do lar por local, estado, quem usa, revisões vencendo e o histórico de manutenções.
// Rotas: #/patrimonio · #/patrimonio/avisos · #/patrimonio/item-ID
'use strict';

const CLASSE_ESTADO_PAT = { bom: 'ok', regular: 'neutro', ruim: 'perigo', manutencao: 'aviso', baixado: 'neutro' };
const reais = (n) => (n == null ? '—' : Number(n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));
let buscaPat = '';
function etiquetasPat(p, estados) {
  const e = [];
  if (p.estado !== 'bom') e.push(`<span class="etiqueta ${CLASSE_ESTADO_PAT[p.estado]}">${esc(estados[p.estado])}</span>`);
  if (p.revisao === 'vencida') e.push(`<span class="etiqueta perigo">Revisão vencida (${esc(dataBR(p.proxima_revisao))})</span>`);
  else if (p.revisao === 'vencendo') e.push(`<span class="etiqueta aviso">Revisão em ${esc(dataBR(p.proxima_revisao))}</span>`);
  return e.join('');
}

TELAS.patrimonio = async (c, arg) => {
  if (/^item-\d+$/.test(arg || '')) return itemPatrimonio(c, Number(arg.slice(5)));
  const todos = arg === 'todos';
  const d = await api('GET', '/api/patrimonio' + (todos ? '?todos=1' : ''));
  let filtro = arg === 'avisos' ? 'avisos' : 'todos';
  const total = d.itens.reduce((s, p) => s + (p.valor || 0), 0);
  c.innerHTML = `
    <div class="so-impressao cabecalho-impressao"><b>${esc(EU.config.nome_organizacao || SUBTITULO_APP)} — Patrimônio</b><span>Impresso em ${esc(dataHoraBR(new Date().toISOString()))}</span></div>
    <div class="cabecalho"><div><h1>Patrimônio</h1><p class="sub">${plural(d.itens.length, 'item', 'itens')}${total ? ` · valor estimado ${esc(reais(total))}` : ''}${d.avisos ? ` · <b>${plural(d.avisos, 'precisa', 'precisam')} de atenção</b>` : ''}</p></div>
      <div class="acoes"><button type="button" class="btn" id="patImprimir">${icone('impressora')}Imprimir</button>
        <button type="button" class="btn primario" id="patNovo">${icone('mais')}Novo item</button></div></div>
    ${d.itens.length || todos ? `<div class="barra-ferramentas nao-imprimir">
      <label class="busca">${icone('busca')}<input type="search" id="patBusca" placeholder="Buscar por nome, número ou local" aria-label="Buscar no patrimônio"></label>
      ${segmentado([{ v: 'todos', rotulo: 'Todos', cont: d.itens.length }, { v: 'avisos', rotulo: 'Atenção', cont: d.avisos }], filtro, { classe: 'filtroPat', rotulo: 'Filtrar' })}
      <label class="interruptor"><input type="checkbox" id="patTodos"${todos ? ' checked' : ''}><span class="trilho-int"></span><span>Mostrar baixados</span></label>
    </div><div id="patLista"></div>`
    : `<section class="cartao">${vazio('pacote', 'Nenhum item cadastrado', 'Cadastre o que o lar tem: camas, cadeiras de rodas, eletrodomésticos, extintores, o carro… Com a data da próxima revisão, o sistema avisa antes de vencer.',
      `<button type="button" class="btn primario" data-novo-pat>${icone('mais')}Cadastrar o primeiro item</button>`)}</section>`}`;
  $('#patNovo', c).onclick = () => formPatrimonio(null, d);
  $('#patImprimir', c).onclick = () => window.print();
  const b0 = $('[data-novo-pat]', c); if (b0) b0.onclick = () => formPatrimonio(null, d);
  const lista = $('#patLista', c);
  if (!lista) return;
  const busca = $('#patBusca', c);
  busca.value = buscaPat;
  const desenhar = () => {
    const q = norm(buscaPat.trim());
    const vis = d.itens.filter((p) => (filtro === 'todos' || p.alerta) && (!q || norm([p.nome, p.codigo, p.local, p.categoria, p.residente_nome].join(' ')).includes(q)));
    const grupos = {};
    for (const p of vis) (grupos[p.local || 'Sem local definido'] ||= []).push(p);
    const semLocal = (l) => (l === 'Sem local definido' ? 1 : 0);
    lista.innerHTML = vis.length ? Object.entries(grupos).sort(([a], [b]) => semLocal(a) - semLocal(b) || a.localeCompare(b, 'pt-BR')).map(([local, ps]) => `<h2 class="turno-titulo">${esc(local)} · ${ps.length}</h2>
      <div class="cartao" style="padding:4px">${ps.map((p) => `<div class="linha" style="padding:12px;position:relative">
        <span class="meio"><a href="#/patrimonio/item-${p.id}" style="color:var(--texto);font-weight:600">${esc(p.nome)}</a>
          <small>${esc([p.codigo, p.categoria, p.residente_nome ? 'em uso por ' + (p.residente_apelido || p.residente_nome) : ''].filter(Boolean).join(' · '))}</small></span>
        <span class="est-etqs">${etiquetasPat(p, d.estados)}</span></div>`).join('')}</div>`).join('')
      : `<div class="cartao">${vazio(q ? 'busca' : 'check', q ? 'Nada encontrado' : 'Tudo em ordem', q ? 'Nenhum item com esse nome, número ou local.' : 'Nenhum item quebrado, em manutenção ou com revisão vencendo.')}</div>`;
  };
  busca.addEventListener('input', () => { buscaPat = busca.value; desenhar(); });
  ligarSegmentado($('.filtroPat', c), (v) => { filtro = v; desenhar(); });
  $('#patTodos', c).onchange = (e) => { location.hash = e.target.checked ? '#/patrimonio/todos' : '#/patrimonio'; };
  desenhar();
};

async function itemPatrimonio(c, id) {
  const d = await api('GET', `/api/patrimonio/${id}`);
  const p = d.item, admin = EU.perfil === 'admin';
  const custo = d.manutencoes.reduce((s, m) => s + (m.custo || 0), 0);
  c.innerHTML = `
    <a class="voltar" href="#/patrimonio">${icone('voltar')}Patrimônio</a>
    <section class="cartao perfil"><div class="quem"><span class="est-ic" data-cat="outro" style="width:64px;height:64px;border-radius:20px">${icone('pacote')}</span>
      <div style="min-width:0"><h1>${esc(p.nome)}</h1><div class="pilulas">${p.codigo ? `<span class="pilula">${esc(p.codigo)}</span>` : ''}<span class="pilula">${esc(p.categoria)}</span>
        ${p.local ? `<span class="pilula">${icone('local')}${esc(p.local)}</span>` : ''}${p.residente_nome ? `<a class="pilula" href="#/residente/${p.residente_id}">${icone('usuario')}Em uso por ${esc(p.residente_apelido || p.residente_nome)}</a>` : ''}
        ${etiquetasPat(p, d.estados) || '<span class="etiqueta ok">Bom</span>'}</div></div></div>
      <div class="lado nao-imprimir"><div class="acoes"><button type="button" class="btn" id="piEditar">${icone('editar')}Editar</button>
        <button type="button" class="btn primario" id="piManut">${icone('contar')}Registrar manutenção</button>
        ${admin ? `<button type="button" class="btn-icone" id="piApagar" title="Apagar" aria-label="Apagar">${icone('lixo')}</button>` : ''}</div></div></section>
    <div class="grade-2"><section class="cartao"><div class="cartao-topo"><h2>${icone('documento')}Dados</h2></div><dl class="dados">
      ${ddRes('Origem', p.origem)}${ddRes('Aquisição', p.data_aquisicao ? dataBR(p.data_aquisicao) : '')}${ddRes('Valor', p.valor != null ? reais(p.valor) : '')}
      ${ddRes('Garantia até', p.garantia_ate ? dataBR(p.garantia_ate) : '')}${ddRes('Próxima revisão', p.proxima_revisao ? dataBR(p.proxima_revisao) : '')}${ddRes('Observações', p.obs, 'largo')}</dl></section>
      <section class="cartao"><div class="cartao-topo"><h2>${icone('relogio')}Manutenções</h2>${custo ? `<span class="pilula">Total gasto: ${esc(reais(custo))}</span>` : ''}</div>
        ${d.manutencoes.length ? `<ul class="limpa historico">${d.manutencoes.map((m) => `<li><time>${esc(dataBR(m.data))}</time><span><b>${esc(d.tipos[m.tipo] || m.tipo)}</b> — ${esc(m.descricao)}
          ${m.custo != null ? ' · ' + esc(reais(m.custo)) : ''}${m.responsavel ? ' · ' + esc(m.responsavel) : ''}</span>
          ${admin ? `<button type="button" class="btn-icone nao-imprimir" data-apagar-manut="${m.id}" title="Apagar registro" aria-label="Apagar registro" style="margin-left:auto">${icone('lixo')}</button>` : ''}</li>`).join('')}</ul>`
          : '<p class="mudo">Nenhuma manutenção registrada.</p>'}</section></div>`;
  $('#piEditar', c).onclick = () => formPatrimonio(p, d);
  $('#piManut', c).onclick = () => janelaManutencao(p, d);
  if ($('#piApagar', c)) $('#piApagar', c).onclick = async () => {
    if (!(await confirmar(`Apagar "${p.nome}" e o histórico dele? Se o item só deixou de ser usado, prefira mudar o estado para "Baixado".`, 'Apagar', { perigo: true }))) return;
    try { await api('DELETE', `/api/patrimonio/${p.id}`); toast('Item apagado.'); location.hash = '#/patrimonio'; } catch (e) { toast(e.message, true); }
  };
  c.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-apagar-manut]');
    if (!b || !(await confirmar('Apagar este registro de manutenção?', 'Apagar', { perigo: true }))) return;
    await botaoOcupado(b, async () => { await api('DELETE', `/api/manutencoes/${b.dataset.apagarManut}`); toast('Registro apagado.'); rotear(); });
  });
}

async function formPatrimonio(p, d) {
  const novo = !p;
  let residentes = [];
  try { residentes = (await residentesParaBusca()).filter((r) => !inativoRes(r) || (p && r.id === p.residente_id)); } catch { /* segue */ }
  const j = modal(novo ? 'Novo item do patrimônio' : `Editar — ${p.nome}`, `<div class="grade-campos">
      <label class="campo meio"><span class="obrig">Nome</span><input id="ptNome" maxlength="120" placeholder="Ex.: Cadeira de rodas, Extintor"></label>
      <label class="campo"><span class="obrig">Categoria</span><select id="ptCat"><option value="">— escolha —</option>${d.categorias.map((x) => `<option>${esc(x)}</option>`).join('')}</select></label>
      <label class="campo"><span>Nº de patrimônio</span><input id="ptCodigo" maxlength="40" placeholder="Ex.: PAT-001"></label>
      <label class="campo"><span>Onde está</span><input id="ptLocal" maxlength="80" placeholder="Ex.: Quarto 4, Cozinha"></label>
      <label class="campo"><span>Estado</span><select id="ptEstado">${Object.entries(d.estados).map(([k, n]) => `<option value="${k}">${esc(n)}</option>`).join('')}</select></label>
      <label class="campo meio"><span>Em uso por (residente)</span><select id="ptRes"><option value="">— uso geral —</option>${residentes.map((r) => `<option value="${r.id}">${esc(r.nome)}</option>`).join('')}</select></label>
      <label class="campo"><span>Origem</span><select id="ptOrigem"><option value="">—</option>${d.origens.map((x) => `<option>${esc(x)}</option>`).join('')}</select></label>
      <label class="campo"><span>Data de aquisição</span><input type="date" id="ptAquis"></label>
      <label class="campo"><span>Valor (R$)</span><input id="ptValor" inputmode="decimal" placeholder="Ex.: 1.500,00"></label>
      <label class="campo"><span>Garantia até</span><input type="date" id="ptGarantia"></label>
      <label class="campo"><span>Próxima revisão</span><input type="date" id="ptRevisao"><span class="dica">Extintor, oxigênio, aparelho de pressão, carro…</span></label>
      <label class="campo largo"><span>Observações</span><textarea id="ptObs" maxlength="1000"></textarea></label>
    </div>`, {
    tamanho: 'largo',
    rodape: `<button type="button" class="btn" data-fechar>Cancelar</button><button type="button" class="btn primario" id="ptSalvar">${icone('check')}${novo ? 'Cadastrar' : 'Salvar'}</button>`,
    onAbrir: (el) => {
      const x = p || { estado: 'bom' };
      for (const [id, k] of [['ptNome', 'nome'], ['ptCat', 'categoria'], ['ptCodigo', 'codigo'], ['ptLocal', 'local'], ['ptEstado', 'estado'], ['ptRes', 'residente_id'], ['ptOrigem', 'origem'],
        ['ptAquis', 'data_aquisicao'], ['ptGarantia', 'garantia_ate'], ['ptRevisao', 'proxima_revisao'], ['ptObs', 'obs']]) $('#' + id, el).value = x[k] ?? '';
      $('#ptValor', el).value = x.valor != null ? Number(x.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '';
    },
  });
  $('#ptSalvar', j.el).onclick = (e) => botaoOcupado(e.currentTarget, async () => {
    const el = j.el;
    const corpo = { nome: $('#ptNome', el).value.trim(), categoria: $('#ptCat', el).value, codigo: $('#ptCodigo', el).value.trim(), local: $('#ptLocal', el).value.trim(),
      estado: $('#ptEstado', el).value, residente_id: $('#ptRes', el).value, origem: $('#ptOrigem', el).value, data_aquisicao: $('#ptAquis', el).value,
      valor: $('#ptValor', el).value.trim(), garantia_ate: $('#ptGarantia', el).value, proxima_revisao: $('#ptRevisao', el).value, obs: $('#ptObs', el).value.trim() };
    if (!corpo.nome) throw new Error('Informe o nome.');
    if (!corpo.categoria) throw new Error('Escolha a categoria.');
    if (novo) { const r = await api('POST', '/api/patrimonio', corpo); j.fechar(true); toast('Item cadastrado.'); location.hash = `#/patrimonio/item-${r.id}`; return; }
    const original = { ...p };
    for (const k of Object.keys(corpo)) if (original[k] == null) original[k] = '';
    original.valor = p.valor != null ? Number(p.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '';
    await salvarComVersao(`/api/patrimonio/${p.id}`, corpo, original);
    j.fechar(true); toast('Item salvo.'); rotear();
  });
}

function janelaManutencao(p, d) {
  const j = modal(`Manutenção — ${p.nome}`, `<div class="grade-campos">
      <label class="campo"><span class="obrig">Tipo</span><select id="mnTipo">${Object.entries(d.tipos).map(([k, n]) => `<option value="${k}">${esc(n)}</option>`).join('')}</select></label>
      <label class="campo"><span>Dia</span><input type="date" id="mnData" max="${hojeIso()}" value="${hojeIso()}"></label>
      <label class="campo"><span>Custo (R$)</span><input id="mnCusto" inputmode="decimal" placeholder="Ex.: 150,00"></label>
      <label class="campo largo"><span class="obrig">O que foi feito</span><textarea id="mnDesc" maxlength="1000" placeholder="Ex.: recarga e inspeção anual; troca da roda dianteira"></textarea></label>
      <label class="campo meio"><span>Quem fez</span><input id="mnResp" maxlength="120" placeholder="Ex.: empresa de extintores, técnico"></label>
      <label class="campo"><span>Estado depois</span><select id="mnEstado"><option value="">(não mudar)</option>${Object.entries(d.estados).map(([k, n]) => `<option value="${k}">${esc(n)}</option>`).join('')}</select></label>
      <label class="campo"><span>Próxima revisão</span><input type="date" id="mnRevisao" value="${esc(p.proxima_revisao || '')}"></label>
    </div>`, {
    rodape: `<button type="button" class="btn" data-fechar>Cancelar</button><button type="button" class="btn primario" id="mnOk">${icone('check')}Registrar</button>`,
  });
  $('#mnOk', j.el).onclick = (e) => botaoOcupado(e.currentTarget, async () => {
    const el = j.el;
    const corpo = { tipo: $('#mnTipo', el).value, data: $('#mnData', el).value, custo: $('#mnCusto', el).value.trim(), descricao: $('#mnDesc', el).value.trim(),
      responsavel: $('#mnResp', el).value.trim(), estado: $('#mnEstado', el).value, proxima_revisao: $('#mnRevisao', el).value };
    if (!corpo.descricao) throw new Error('Descreva o que foi feito.');
    await api('POST', `/api/patrimonio/${p.id}/manutencoes`, corpo);
    j.fechar(true); toast('Manutenção registrada.'); rotear();
  });
}
