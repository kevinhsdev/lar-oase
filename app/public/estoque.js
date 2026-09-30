// Estoque: lista com saldo e avisos (acabando, vencendo), entrada (compra/doação), saída, contagem e a página de cada item.
// Rotas: #/estoque (lista) · #/estoque/avisos · #/estoque/<categoria> · #/estoque/item-ID (um item)
'use strict';

const CATS_EST = {
  higiene: { nome: 'Higiene e fraldas', icone: 'pacote' }, remedio: { nome: 'Remédios', icone: 'pilula' },
  enfermagem: { nome: 'Enfermagem', icone: 'saude' }, alimento: { nome: 'Alimentos', icone: 'dieta' },
  limpeza: { nome: 'Limpeza', icone: 'gota' }, outro: { nome: 'Outros', icone: 'pontos' },
};
const UNIDADES_EST = { un: ['unidade', 'unidades'], cx: ['caixa', 'caixas'], pct: ['pacote', 'pacotes'], fr: ['frasco', 'frascos'], lata: ['lata', 'latas'],
  kg: ['kg', 'kg'], L: ['litro', 'litros'], par: ['par', 'pares'], rolo: ['rolo', 'rolos'] };
const ORIGENS_EST = ['Compra', 'Doação', 'Família do residente', 'SUS / Farmácia Popular', 'Outra'];
const LOCAIS_EST = ['Almoxarifado', 'Posto de enfermagem', 'Armário de remédios', 'Despensa', 'Geladeira', 'Lavanderia'];
let buscaEst = '';

// 12 / 2,5 com a unidade no singular ou plural
const numEst = (n) => String(Math.round(n * 100) / 100).replace('.', ',');
const qtdEst = (n, u) => `${numEst(n)} ${(UNIDADES_EST[u] || [u, u])[Math.abs(n) === 1 ? 0 : 1]}`;
const lerNumEst = (v) => Number(String(v || '').replace(',', '.'));
function etiquetasEst(p) {
  const e = [];
  if (p.zerado) e.push(`<span class="etiqueta perigo">${icone('alerta')}Acabou</span>`);
  else if (p.acabando) e.push(`<span class="etiqueta aviso">${icone('alerta')}Acabando</span>`);
  if (p.vencido > 0) e.push(`<span class="etiqueta perigo">Vencido: ${esc(qtdEst(p.vencido, p.unidade))}</span>`);
  else if (p.vencendo > 0 && p.proxima_validade) {
    const d = -diasDesde(p.proxima_validade);
    e.push(`<span class="etiqueta aviso">Vence ${d === 0 ? 'hoje' : d === 1 ? 'amanhã' : `em ${d} dias`}</span>`);
  } else if (p.proxima_validade) e.push(`<span class="etiqueta neutro">Validade ${esc(dataBR(p.proxima_validade))}</span>`);
  return e.join('');
}
// Barrinha do saldo: cheia = 2,5× o mínimo (sem mínimo, fica cheia)
function barraEst(p) {
  const ref = p.estoque_minimo ? p.estoque_minimo * 2.5 : Math.max(p.saldo, 1);
  const pct = Math.max(p.saldo > 0 ? 4 : 0, Math.min(100, (p.saldo / ref) * 100));
  return `<div class="barra-saldo${p.zerado ? ' zero' : p.acabando ? ' baixa' : ''}" role="img" aria-label="${esc(qtdEst(p.saldo, p.unidade))}${p.estoque_minimo != null ? ', mínimo ' + numEst(p.estoque_minimo) : ''}"><i style="width:${pct.toFixed(0)}%"></i></div>`;
}
function linhaEst(p) {
  const cat = CATS_EST[p.categoria] || CATS_EST.outro;
  return `<div class="est-item" data-cat="${esc(p.categoria)}">
    <span class="est-ic">${icone(cat.icone)}</span>
    <div class="meio"><a href="#/estoque/item-${p.id}">${esc(p.nome)}</a><small>${esc([p.local, p.residente_nome ? 'de ' + (p.residente_apelido || p.residente_nome) : ''].filter(Boolean).join(' · ') || cat.nome)}</small></div>
    <div class="est-saldo"><span class="num-saldo">${esc(numEst(p.saldo))}<small>${esc((UNIDADES_EST[p.unidade] || [p.unidade, p.unidade])[p.saldo === 1 ? 0 : 1])}</small></span>${barraEst(p)}</div>
    <div class="est-etqs">${etiquetasEst(p)}</div>
    <div class="acoes nao-imprimir"><button type="button" class="btn peq" data-mov="saida" data-id="${p.id}"${p.saldo <= 0 ? ' disabled' : ''}>${icone('menos')}Saída</button>
      <button type="button" class="btn peq suave" data-mov="entrada" data-id="${p.id}">${icone('mais')}Entrada</button></div>
  </div>`;
}

TELAS.estoque = async (c, arg) => {
  if (/^item-\d+$/.test(arg || '')) return telaItemEstoque(c, Number(arg.slice(5)));
  const d = await api('GET', '/api/produtos');
  const itens = d.itens;
  let filtro = arg === 'avisos' || CATS_EST[arg] ? arg : 'todos';
  const avisos = itens.filter((p) => p.alerta);
  definirBadge('estoque', avisos.length);
  const org = EU.config.nome_organizacao || SUBTITULO_APP;
  const conta = (f) => (f === 'todos' ? itens.length : f === 'avisos' ? avisos.length : itens.filter((p) => p.categoria === f).length);
  c.innerHTML = `
    <div class="so-impressao cabecalho-impressao"><b>${esc(org)} — Estoque</b><span>Impresso em ${esc(dataHoraBR(new Date().toISOString()))}</span></div>
    <div class="cabecalho"><div><h1>Estoque</h1><p class="sub">${plural(itens.length, 'item', 'itens')}${avisos.length ? ` · <b>${plural(avisos.length, 'precisa', 'precisam')} de atenção</b>` : ' · tudo em dia'}</p></div>
      <div class="acoes"><button type="button" class="btn" id="estImprimir">${icone('impressora')}Imprimir</button>
        <button type="button" class="btn primario" id="estNovo">${icone('mais')}Novo item</button></div></div>
    ${itens.length ? `<div class="barra-ferramentas nao-imprimir">
      <label class="busca">${icone('busca')}<input type="search" id="estBusca" placeholder="Buscar item (fralda, dipirona, café…)" aria-label="Buscar no estoque"></label>
      ${segmentado([{ v: 'todos', rotulo: 'Todos', cont: conta('todos') }, { v: 'avisos', rotulo: 'Atenção', cont: conta('avisos') },
        ...Object.entries(CATS_EST).filter(([k]) => conta(k)).map(([k, cat]) => ({ v: k, rotulo: cat.nome.split(' ')[0], cont: conta(k) }))], filtro, { rotulo: 'Filtrar estoque', classe: 'filtroEst' })}
    </div><div id="estArea"></div>`
    : `<section class="cartao">${vazio('pacote', 'Nenhum item no estoque ainda', 'Cadastre o que o lar guarda: fraldas, remédios, material de enfermagem, alimentos, limpeza. Informe o estoque mínimo e o sistema avisa quando estiver acabando.',
      `<button type="button" class="btn primario" data-novo-item>${icone('mais')}Cadastrar o primeiro item</button>`)}</section>`}`;
  $('#estNovo', c).onclick = () => formProduto(null);
  $('#estImprimir', c).onclick = () => window.print();
  const b0 = $('[data-novo-item]', c); if (b0) b0.onclick = () => formProduto(null);
  if (!itens.length) return;
  const area = $('#estArea', c), busca = $('#estBusca', c);
  busca.value = buscaEst;
  const desenhar = () => {
    const q = norm(buscaEst.trim());
    const vis = itens.filter((p) => (filtro === 'todos' || (filtro === 'avisos' ? p.alerta : p.categoria === filtro)) && (!q || norm([p.nome, p.local, p.residente_nome].join(' ')).includes(q)))
      // o que precisa de atenção primeiro
      .sort((a, b) => (filtro === 'avisos' ? 0 : b.alerta - a.alerta) || (b.zerado - a.zerado) || a.nome.localeCompare(b.nome, 'pt-BR'));
    area.innerHTML = vis.length ? `<div class="cartao est-lista">${vis.map(linhaEst).join('')}</div>`
      : `<div class="cartao">${q ? vazio('busca', 'Nada encontrado', `Nenhum item com “${esc(buscaEst.trim())}”.`) : vazio('check', 'Tudo em dia', 'Nenhum item acabando ou vencendo.')}</div>`;
  };
  busca.addEventListener('input', () => { buscaEst = busca.value; desenhar(); });
  ligarSegmentado($('.filtroEst', c), (v) => { filtro = v; history.replaceState(null, '', v === 'todos' ? '#/estoque' : `#/estoque/${v}`); desenhar(); });
  area.addEventListener('click', (e) => {
    const b = e.target.closest('[data-mov]');
    if (b) janelaMovimento(itens.find((p) => p.id === +b.dataset.id), b.dataset.mov);
  });
  desenhar();
};

// Página de um item: saldo, lotes (validade), histórico e ações
async function telaItemEstoque(c, id) {
  const d = await api('GET', `/api/produtos/${id}`);
  const p = d.produto, cat = CATS_EST[p.categoria] || CATS_EST.outro;
  const admin = EU.perfil === 'admin';
  const tipoMov = { entrada: ['Entrada', 'ok'], saida: ['Saída', 'neutro'], ajuste: ['Contagem', 'info'] };
  c.innerHTML = `
    <a class="voltar" href="#/estoque">${icone('voltar')}Estoque</a>
    <section class="cartao perfil" data-cat="${esc(p.categoria)}">
      <div class="quem"><span class="est-ic" style="width:64px;height:64px;border-radius:20px">${icone(cat.icone)}</span><div style="min-width:0"><h1>${esc(p.nome)}</h1>
        <div class="pilulas"><span class="pilula">${esc(cat.nome)}</span>${p.local ? `<span class="pilula">${icone('local')}${esc(p.local)}</span>` : ''}
          ${p.residente_nome ? `<a class="pilula" href="#/residente/${p.residente_id}">${icone('usuario')}Item pessoal de ${esc(p.residente_apelido || p.residente_nome)}</a>` : ''}
          ${p.estoque_minimo != null ? `<span class="pilula">Mínimo: ${esc(qtdEst(p.estoque_minimo, p.unidade))}</span>` : ''}${p.ativo ? '' : '<span class="etiqueta neutro">Arquivado</span>'}</div></div></div>
      <div class="lado nao-imprimir"><div class="acoes">
        <button type="button" class="btn" id="itSaida"${p.saldo <= 0 ? ' disabled' : ''}>${icone('menos')}Saída</button>
        <button type="button" class="btn suave" id="itEntrada">${icone('mais')}Entrada</button>
        <button type="button" class="btn" id="itContar">${icone('contar')}Contar</button>
        <button type="button" class="btn-icone" id="itMais" aria-haspopup="menu" aria-expanded="false" title="Mais opções" aria-label="Mais opções">${icone('pontos')}</button></div></div>
    </section>
    <div class="grade-2">
      <section class="cartao"><div class="cartao-topo"><h2>${icone('pacote')}Quanto tem</h2></div>
        <div class="saldo-grande"><div><span class="num-saldo">${esc(numEst(p.saldo))}<small>${esc((UNIDADES_EST[p.unidade] || [p.unidade, p.unidade])[p.saldo === 1 ? 0 : 1])}</small></span>${barraEst(p)}</div>
          <div class="est-etqs">${etiquetasEst(p) || '<span class="etiqueta ok">Em dia</span>'}</div></div>
        ${p.estoque_minimo == null ? '<p class="dica" style="margin-top:14px">Sem estoque mínimo: o sistema não avisa quando estiver acabando. Defina em “Editar”.</p>' : ''}
      </section>
      <section class="cartao"><div class="cartao-topo"><h2>${icone('calendario')}Validades</h2></div>
        ${p.lotes.some((l) => l.validade) ? `<div class="linhas">${p.lotes.filter((l) => l.validade).map((l) => {
          const dias = -diasDesde(l.validade);
          return `<div class="linha"><span class="meio"><b>${esc(qtdEst(l.resta, p.unidade))}</b><small>entrada de ${esc(dataBR(l.data))}</small></span>
            <span class="etiqueta ${dias < 0 ? 'perigo' : dias <= 30 ? 'aviso' : 'neutro'}">${dias < 0 ? 'Venceu em ' + esc(dataBR(l.validade)) : 'Vence em ' + esc(dataBR(l.validade))}</span></div>`;
        }).join('')}</div><p class="dica" style="margin-top:10px">Use primeiro o que vence antes. O sistema já desconta as saídas dos lotes mais antigos.</p>`
          : '<p class="mudo">Nenhuma validade registrada. Ao dar entrada, anote a validade da embalagem (principalmente de remédios e alimentos).</p>'}
      </section>
    </div>
    ${p.obs ? `<section class="cartao espaco"><div class="cartao-topo"><h2>${icone('editar')}Observações</h2></div><p style="white-space:pre-line">${esc(p.obs)}</p></section>` : ''}
    <section class="cartao espaco" style="padding:0;overflow:hidden"><div class="cartao-topo" style="padding:18px 20px 0"><h2>${icone('relogio')}Movimentações</h2></div>
      ${d.movimentos.length ? `<div style="overflow-x:auto"><table class="tabela" style="margin-top:12px"><thead><tr><th>Dia</th><th>O quê</th><th>Quantidade</th><th>Detalhe</th><th>Quem</th><th></th></tr></thead><tbody>
        ${d.movimentos.map((m) => {
          const podeDesfazer = admin || (m.criado_por === EU.login && new Date(m.criado_em).toLocaleDateString('sv-SE') === hojeIso());
          const q = m.tipo === 'saida' ? -m.quantidade : m.quantidade;
          return `<tr><td class="num" style="white-space:nowrap">${esc(dataBR(m.data))}</td><td><span class="etiqueta ${tipoMov[m.tipo][1]}">${tipoMov[m.tipo][0]}</span></td>
            <td class="num" style="white-space:nowrap;font-weight:600">${q > 0 ? '+' : ''}${esc(numEst(q))}</td>
            <td>${esc([m.origem, m.validade ? 'validade ' + dataBR(m.validade) : '', m.residente_nome ? 'para ' + m.residente_nome : '', m.obs].filter(Boolean).join(' · ') || '—')}</td>
            <td style="white-space:nowrap">${esc(nomeAutorDia({ autor_nome: m.autor_nome, criado_por: m.criado_por }))}</td>
            <td class="acoes-td">${podeDesfazer ? `<button type="button" class="btn-icone nao-imprimir" data-desfazer="${m.id}" title="Desfazer este lançamento" aria-label="Desfazer este lançamento">${icone('restaurar')}</button>` : ''}</td></tr>`;
        }).join('')}</tbody></table></div>` : `<div style="padding:0 20px 20px"><p class="mudo">Nenhuma movimentação ainda.</p></div>`}
    </section>`;
  $('#itEntrada', c).onclick = () => janelaMovimento(p, 'entrada');
  $('#itSaida', c).onclick = () => janelaMovimento(p, 'saida');
  $('#itContar', c).onclick = () => janelaMovimento(p, 'contagem');
  $('#itMais', c).onclick = (e) => {
    const m = abrirMenu(e.currentTarget, `<button class="menu-item" data-a="editar" role="menuitem">${icone('editar')}Editar item</button>
      <button class="menu-item" data-a="imprimir" role="menuitem">${icone('impressora')}Imprimir</button>
      <button class="menu-item" data-a="arquivar" role="menuitem">${icone('pacote')}${p.ativo ? 'Arquivar (não uso mais)' : 'Reativar'}</button>
      ${admin ? `<div class="menu-sep"></div><button class="menu-item perigo" data-a="apagar" role="menuitem">${icone('lixo')}Apagar de vez…</button>` : ''}`);
    if (!m) return;
    m.onclick = tentar(async (ev) => {
      const a = ev.target.closest('[data-a]')?.dataset.a;
      if (a === 'editar') formProduto(p);
      if (a === 'imprimir') window.print();
      if (a === 'arquivar') { await api('PUT', `/api/produtos/${p.id}`, { ativo: !p.ativo }); toast(p.ativo ? 'Item arquivado: some da lista, mas o histórico fica.' : 'Item reativado.'); p.ativo ? (location.hash = '#/estoque') : rotear(); }
      if (a === 'apagar') {
        if (!(await confirmar(`Apagar "${p.nome}" e todo o histórico dele? Não dá para desfazer. Se só não usa mais, prefira “Arquivar”.`, 'Apagar de vez', { perigo: true, titulo: 'Apagar item?' }))) return;
        await api('DELETE', `/api/produtos/${p.id}`); toast('Item apagado.'); location.hash = '#/estoque';
      }
    });
  };
  c.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-desfazer]');
    if (!b) return;
    if (!(await confirmar('Desfazer este lançamento? O saldo volta a ser como era antes dele.', 'Desfazer'))) return;
    await botaoOcupado(b, async () => { await api('DELETE', `/api/movimentos/${b.dataset.desfazer}`); toast('Lançamento desfeito.'); rotear(); });
  });
}

// Entrada, saída ou contagem. Quantidade com botões − e + grandes.
async function janelaMovimento(p, tipo) {
  if (!p) return;
  const nomes = { entrada: ['Entrada', 'Chegou (compra, doação…)'], saida: ['Saída', 'Foi usado'], contagem: ['Contar o estoque', 'Conte na prateleira e diga quanto tem'] };
  let residentes = [];
  if (tipo === 'saida') { try { residentes = (await residentesParaBusca()).filter((r) => !inativoRes(r)); } catch { /* segue sem a lista */ } }
  const un = (UNIDADES_EST[p.unidade] || [p.unidade, p.unidade])[1];
  const j = modal(`${nomes[tipo][0]} — ${p.nome}`, `
    <p class="mudo" style="margin-bottom:16px">${esc(nomes[tipo][1])}. Hoje tem <b>${esc(qtdEst(p.saldo, p.unidade))}</b>.</p>
    <div class="campo"><span class="rotulo obrig">${tipo === 'contagem' ? `Quantos ${esc(un)} tem agora?` : `Quantos ${esc(un)}?`}</span>
      <div class="passo-linha"><div class="passo"><button type="button" data-passo="-1" aria-label="Menos um">${icone('menos')}</button>
        <input id="mvQtd" inputmode="decimal" autocomplete="off" aria-label="Quantidade">
        <button type="button" data-passo="1" aria-label="Mais um">${icone('mais')}</button></div><span class="mudo" id="mvResumo"></span></div></div>
    <div class="grade-campos" style="margin-top:16px">
      ${tipo === 'entrada' ? `<div class="campo largo"><span class="rotulo">De onde veio?</span><div class="chips-radio" role="radiogroup" aria-label="Origem">${ORIGENS_EST.map((o, i) => `<label><input type="radio" name="mvOrigem" id="mvOrigem${i}" value="${esc(o)}"><span>${esc(o)}</span></label>`).join('')}</div></div>
        <label class="campo"><span>Validade</span><input type="date" id="mvValidade"><span class="dica">Da embalagem. Remédios e alimentos: sempre preencha.</span></label>` : ''}
      ${tipo === 'saida' ? `<label class="campo meio"><span>Para quem? (opcional)</span><select id="mvRes"><option value="">— Uso geral do lar</option>${residentes.map((r) => `<option value="${r.id}">${esc(r.nome)}</option>`).join('')}</select></label>` : ''}
      <label class="campo"><span>Dia</span><input type="date" id="mvData" max="${hojeIso()}" value="${hojeIso()}"></label>
      <label class="campo largo"><span>Observação</span><input id="mvObs" maxlength="300" placeholder="${tipo === 'entrada' ? 'Ex.: doação da comunidade da igreja' : tipo === 'saida' ? 'Ex.: troca da noite' : 'Ex.: contagem do fim do mês'}"></label>
    </div>`, {
    tamanho: tipo === 'entrada' ? '' : 'estreito', rascunho: false,
    rodape: `<button type="button" class="btn" data-fechar>Cancelar</button><button type="button" class="btn primario" id="mvOk">${icone('check')}${tipo === 'contagem' ? 'Salvar contagem' : 'Registrar ' + nomes[tipo][0].toLowerCase()}</button>`,
    onAbrir: (el) => {
      const inp = $('#mvQtd', el);
      inp.value = tipo === 'contagem' ? numEst(Math.max(0, p.saldo)) : '1';
      if (tipo === 'entrada') $('#mvOrigem0', el).checked = true;
      const resumo = () => {
        const q = lerNumEst(inp.value);
        const r = $('#mvResumo', el);
        if (!Number.isFinite(q) || inp.value.trim() === '') { r.textContent = ''; return; }
        const depois = tipo === 'entrada' ? p.saldo + q : tipo === 'saida' ? p.saldo - q : q;
        r.innerHTML = tipo === 'contagem' ? (q === p.saldo ? 'Igual ao sistema' : `Diferença: <b>${q > p.saldo ? '+' : ''}${esc(numEst(q - p.saldo))}</b>`)
          : `Fica com <b>${esc(qtdEst(Math.round(depois * 100) / 100, p.unidade))}</b>${depois < 0 ? ' — <b style="color:var(--perigo)">mais do que tem</b>' : ''}`;
      };
      inp.addEventListener('input', resumo);
      for (const b of $$('[data-passo]', el)) b.onclick = () => { const q = lerNumEst(inp.value) || 0; inp.value = numEst(Math.max(0, q + Number(b.dataset.passo))); resumo(); };
      resumo();
    },
  });
  $('#mvOk', j.el).onclick = (e) => botaoOcupado(e.currentTarget, async () => {
    const el = j.el;
    const q = lerNumEst($('#mvQtd', el).value);
    if (!Number.isFinite(q) || q < 0 || (tipo !== 'contagem' && q === 0)) throw new Error('Informe uma quantidade válida.');
    const corpo = { tipo, quantidade: q, data: $('#mvData', el).value, obs: $('#mvObs', el).value };
    if (tipo === 'entrada') { corpo.origem = ($('input[name="mvOrigem"]:checked', el) || {}).value; corpo.validade = $('#mvValidade', el).value; }
    if (tipo === 'saida') corpo.residente_id = $('#mvRes', el).value;
    const r = await api('POST', `/api/produtos/${p.id}/movimentos`, corpo);
    j.fechar(true);
    toast(tipo === 'contagem' ? (r.sem_diferenca ? 'Contagem confere com o sistema.' : `Estoque corrigido (${r.diferenca > 0 ? '+' : ''}${numEst(r.diferenca)}).`)
      : `${nomes[tipo][0]} registrada: ${qtdEst(q, p.unidade)}.`);
    rotear();
  });
}

// Cadastrar ou editar um item
async function formProduto(p) {
  const novo = !p;
  let residentes = [];
  try { residentes = (await residentesParaBusca()).filter((r) => !inativoRes(r) || (p && r.id === p.residente_id)); } catch { /* segue */ }
  const j = modal(novo ? 'Novo item no estoque' : `Editar — ${p.nome}`, `
    <div class="grade-campos"><label class="campo largo"><span class="obrig">Nome do item</span><input id="pNome" maxlength="120" placeholder="Ex.: Fralda geriátrica G, Dipirona 500 mg, Café 500 g"></label></div>
    <div class="campo" style="margin-top:16px"><span class="rotulo obrig">Categoria</span><div class="chips-radio" role="radiogroup" aria-label="Categoria">${Object.entries(CATS_EST).map(([k, cat]) => `<label><input type="radio" name="pCat" id="pCat_${k}" value="${k}"><span>${icone(cat.icone)}${esc(cat.nome)}</span></label>`).join('')}</div></div>
    <div class="grade-campos" style="margin-top:16px">
      <label class="campo"><span>Contado em</span><select id="pUnidade">${Object.entries(UNIDADES_EST).map(([k, u]) => `<option value="${k}">${esc(u[1])}</option>`).join('')}</select></label>
      <label class="campo"><span>Estoque mínimo</span><input id="pMinimo" inputmode="decimal" placeholder="Ex.: 10"><span class="dica">Quando chegar nisso, o sistema avisa que está acabando.</span></label>
      <label class="campo"><span>Onde fica</span><input id="pLocal" maxlength="60" list="pLocais"></label>
      <label class="campo meio"><span>Item pessoal de um residente? (opcional)</span><select id="pRes"><option value="">— Não, é do lar</option>${residentes.map((r) => `<option value="${r.id}">${esc(r.nome)}</option>`).join('')}</select>
        <span class="dica">Ex.: remédio ou fralda que a família traz só para ele(a).</span></label>
      ${novo ? `<label class="campo"><span>Quanto tem hoje</span><input id="pInicial" inputmode="decimal" placeholder="Ex.: 12"><span class="dica">Conte na prateleira. Pode deixar em branco.</span></label>
        <label class="campo"><span>Validade (se tiver)</span><input type="date" id="pValidade"></label>` : ''}
      <label class="campo largo"><span>Observações</span><textarea id="pObs" maxlength="1000" placeholder="Ex.: comprar na farmácia X; preferir a marca Y"></textarea></label>
    </div>${datalist('pLocais', LOCAIS_EST)}`, {
    tamanho: 'largo',
    rodape: `<button type="button" class="btn" data-fechar>Cancelar</button><button type="button" class="btn primario" id="pSalvar">${icone('check')}${novo ? 'Cadastrar' : 'Salvar'}</button>`,
    onAbrir: (el) => {
      $('#pNome', el).value = p ? p.nome : '';
      $('#pCat_' + (p ? p.categoria : 'higiene'), el).checked = !!p;
      $('#pUnidade', el).value = p ? p.unidade : 'un';
      $('#pMinimo', el).value = p && p.estoque_minimo != null ? numEst(p.estoque_minimo) : '';
      $('#pLocal', el).value = p ? p.local || '' : '';
      $('#pRes', el).value = p && p.residente_id ? p.residente_id : '';
      $('#pObs', el).value = p ? p.obs || '' : '';
    },
  });
  $('#pSalvar', j.el).onclick = (e) => botaoOcupado(e.currentTarget, async () => {
    const el = j.el;
    const corpo = {
      nome: $('#pNome', el).value.trim(), categoria: ($('input[name="pCat"]:checked', el) || {}).value || '', unidade: $('#pUnidade', el).value,
      estoque_minimo: $('#pMinimo', el).value.trim(), local: $('#pLocal', el).value.trim(), residente_id: $('#pRes', el).value, obs: $('#pObs', el).value.trim(),
    };
    if (!corpo.nome) { $('#pNome', el).focus(); throw new Error('Informe o nome do item.'); }
    if (!corpo.categoria) throw new Error('Escolha a categoria.');
    if (novo) {
      corpo.quantidade_inicial = $('#pInicial', el).value.trim(); corpo.validade = $('#pValidade', el).value;
      const r = await api('POST', '/api/produtos', corpo);
      j.fechar(true); toast(`${corpo.nome} cadastrado.`); location.hash = `#/estoque/item-${r.id}`;
    } else {
      const original = { ...p, residente_id: p.residente_id ?? '', estoque_minimo: p.estoque_minimo != null ? numEst(p.estoque_minimo) : '', local: p.local || '', obs: p.obs || '' };
      await salvarComVersao(`/api/produtos/${p.id}`, corpo, original);
      j.fechar(true); toast('Item salvo.'); rotear();
    }
  });
}
