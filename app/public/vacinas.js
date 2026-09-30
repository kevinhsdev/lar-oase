// Vacinas: painel de todos os residentes (última dose de cada vacina), cartão de vacina de cada um e campanha (vários de uma vez).
// Rotas: #/vacinas · #/vacinas/avisos · #/vacinas/residente-ID
'use strict';

const NOMES_CURTOS_VAC = { 'Influenza (gripe)': 'Gripe', 'Covid-19': 'Covid', 'Pneumocócica 23 (pneumonia)': 'Pneumonia', 'Dupla adulto dT (difteria e tétano)': 'dT (tétano)', 'Hepatite B': 'Hepatite B' };
const LOCAIS_VAC = ['No lar — campanha', 'UBS', 'Clínica particular', 'Hospital'];
const dataCurta = (iso) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(2, 4)}` : '—');
function etiquetaVac(s) {
  if (!s || s.estado === 'em_dia') return '';
  return s.estado === 'atrasada' ? `<span class="etiqueta perigo">Atrasada desde ${esc(dataCurta(s.vence))}</span>` : `<span class="etiqueta aviso">Vence ${esc(dataCurta(s.vence))}</span>`;
}

TELAS.vacinas = async (c, arg) => {
  if (/^residente-\d+$/.test(arg || '')) return cartaoVacina(c, Number(arg.split('-')[1]));
  const d = await api('GET', '/api/vacinas/painel');
  let filtro = arg === 'avisos' ? 'avisos' : 'todos';
  const atrasadas = d.linhas.reduce((s, l) => s + l.avisos.filter((a) => a.estado === 'atrasada').length, 0);
  const vencendo = d.avisos - atrasadas;
  const pct = d.campanha.total ? Math.round((d.campanha.vacinados / d.campanha.total) * 100) : 0;
  c.innerHTML = `
    <div class="so-impressao cabecalho-impressao"><b>${esc(EU.config.nome_organizacao || SUBTITULO_APP)} — Vacinas</b><span>Impresso em ${esc(dataHoraBR(new Date().toISOString()))}</span></div>
    <div class="cabecalho"><div><h1>Vacinas</h1><p class="sub">Cartão de vacina dos ${plural(d.linhas.length, 'residente', 'residentes')} · ${d.avisos ? `<b>${plural(d.avisos, 'dose precisa', 'doses precisam')} de atenção</b>` : 'tudo em dia'}</p></div>
      <div class="acoes"><button type="button" class="btn" id="vacImprimir">${icone('impressora')}Imprimir</button>
        <button type="button" class="btn" id="vacCampanha">${icone('residentes')}Campanha (vários)</button>
        <button type="button" class="btn primario" id="vacNova">${icone('mais')}Registrar vacina</button></div></div>
    <div class="numeros" style="grid-template-columns:repeat(3,minmax(0,1fr))">
      <div class="numero"><span class="ic-caixa">${icone('escudo')}</span><b>${pct}%</b><span>Gripe ${esc(d.campanha.ano)}: ${d.campanha.vacinados} de ${d.campanha.total} vacinados</span>
        ${barraEst({ saldo: d.campanha.vacinados, estoque_minimo: d.campanha.total / 2.5, zerado: false, acabando: false, unidade: 'un' })}</div>
      <a class="numero${atrasadas ? ' aviso' : ' neutro'}" href="#/vacinas/avisos"><span class="ic-caixa">${icone('alerta')}</span><b>${atrasadas}</b><span>${atrasadas === 1 ? 'Dose atrasada' : 'Doses atrasadas'}</span></a>
      <a class="numero acento" href="#/vacinas/avisos"><span class="ic-caixa">${icone('calendario')}</span><b>${vencendo}</b><span>Vencem nos próximos 30 dias</span></a>
    </div>
    ${d.linhas.length ? `<div class="barra-ferramentas nao-imprimir">${segmentado([{ v: 'todos', rotulo: 'Todos', cont: d.linhas.length }, { v: 'avisos', rotulo: 'Com aviso', cont: d.linhas.filter((l) => l.avisos.length).length }], filtro, { classe: 'filtroVac', rotulo: 'Filtrar' })}
      <label class="busca">${icone('busca')}<input type="search" id="vacBusca" placeholder="Buscar residente" aria-label="Buscar residente"></label></div>
      <div id="vacTabela"></div>` : `<div class="cartao">${vazio('escudo', 'Nenhum residente no lar', 'Cadastre os residentes primeiro.')}</div>`}`;
  $('#vacNova', c).onclick = () => formVacina(null);
  $('#vacCampanha', c).onclick = () => formCampanhaVac(d);
  $('#vacImprimir', c).onclick = () => window.print();
  if (!d.linhas.length) return;
  const area = $('#vacTabela', c), busca = $('#vacBusca', c);
  const desenhar = () => {
    const q = norm(busca.value.trim());
    const vis = d.linhas.filter((l) => (filtro === 'todos' || l.avisos.length) && (!q || norm(l.nome + ' ' + (l.apelido || '')).includes(q)));
    area.innerHTML = vis.length ? `<div class="tabela-caixa"><table class="tabela tabela-vac"><thead><tr><th>Residente</th>${d.principais.map((v) => `<th>${esc(NOMES_CURTOS_VAC[v] || v)}</th>`).join('')}<th></th></tr></thead><tbody>
      ${vis.map((l) => `<tr data-res="${l.id}"><td><a class="nome-link" href="#/vacinas/residente-${l.id}" style="display:flex;align-items:center;gap:10px;color:var(--texto);font-weight:600">${avatar(l.nome, 'p')}${esc(l.apelido || l.nome)}</a></td>
        ${d.principais.map((v) => { const u = l.ultimas[v]; return `<td class="num">${u ? `${esc(dataCurta(u.data))}${u.estado !== 'em_dia' ? '<br>' + etiquetaVac(u) : ''}` : '<span class="fraco">—</span>'}</td>`; }).join('')}
        <td class="acoes-td nao-imprimir"><a class="btn peq fantasma" href="#/vacinas/residente-${l.id}">Cartão</a></td></tr>`).join('')}</tbody></table></div>
      <p class="dica" style="margin-top:10px">A data é a última dose de cada vacina. Prazos: gripe todo ano, Covid a cada 6 meses, dT a cada 10 anos; as outras seguem a “próxima dose” anotada.</p>`
      : `<div class="cartao">${vazio('check', 'Nada por aqui', filtro === 'avisos' ? 'Nenhuma dose atrasada ou vencendo.' : 'Ninguém encontrado.')}</div>`;
  };
  ligarSegmentado($('.filtroVac', c), (v) => { filtro = v; history.replaceState(null, '', v === 'todos' ? '#/vacinas' : '#/vacinas/avisos'); desenhar(); });
  busca.addEventListener('input', desenhar);
  desenhar();
};

// Cartão de vacina de um residente
async function cartaoVacina(c, rid) {
  const d = await api('GET', `/api/vacinas?residente=${rid}`);
  const r = d.residente;
  const podeApagar = (v) => EU.perfil === 'admin' || v.criado_por === EU.login;
  c.innerHTML = `
    <a class="voltar" href="#/residente/${r.id}">${icone('voltar')}Ficha de ${esc(r.nome)}</a>
    <div class="so-impressao cabecalho-impressao"><b>${esc(EU.config.nome_organizacao || SUBTITULO_APP)} — Cartão de vacina</b><span>Impresso em ${esc(dataHoraBR(new Date().toISOString()))}</span></div>
    <div class="cabecalho"><div><h1>Cartão de vacina</h1><p class="sub">${esc(r.nome)}${r.apelido ? ' · “' + esc(r.apelido) + '”' : ''}</p></div>
      <div class="acoes"><a class="btn nao-imprimir" href="#/vacinas">${icone('escudo')}Todas as vacinas</a><button type="button" class="btn" id="cvImprimir">${icone('impressora')}Imprimir</button>
        <button type="button" class="btn primario" id="cvNova">${icone('mais')}Registrar vacina</button></div></div>
    ${Object.keys(d.situacao).length ? `<section class="cartao"><div class="cartao-topo"><h2>${icone('escudo')}Situação</h2></div><div class="linhas">
      ${Object.entries(d.situacao).map(([vac, s]) => `<div class="linha"><span class="meio"><b>${esc(vac)}</b><small>${esc((d.vacinas[vac] || {}).dica || '')}</small></span>
        ${etiquetaVac(s) || `<span class="etiqueta ok">Em dia${s.vence ? ' até ' + esc(dataCurta(s.vence)) : ''}</span>`}</div>`).join('')}</div></section>` : ''}
    <section class="cartao espaco" style="padding:0;overflow:hidden"><div class="cartao-topo" style="padding:18px 20px 0"><h2>${icone('relogio')}Doses aplicadas</h2></div>
      ${d.itens.length ? `<div style="overflow-x:auto"><table class="tabela" style="margin-top:12px"><thead><tr><th>Data</th><th>Vacina</th><th>Dose</th><th>Lote</th><th>Onde</th><th>Próxima dose</th><th></th></tr></thead><tbody>
        ${d.itens.map((v) => `<tr><td class="num">${esc(dataBR(v.data))}</td><td>${esc(v.vacina)}</td><td>${esc(v.dose || '—')}</td><td class="mono">${esc(v.lote || '—')}</td>
          <td>${esc(v.local || '—')}</td><td class="num">${v.proxima_dose ? esc(dataBR(v.proxima_dose)) : '—'}</td>
          <td class="acoes-td nao-imprimir"><button type="button" class="btn-icone" data-editar-vac="${v.id}" title="Corrigir" aria-label="Corrigir">${icone('editar')}</button>
          ${podeApagar(v) ? `<button type="button" class="btn-icone" data-apagar-vac="${v.id}" title="Apagar" aria-label="Apagar">${icone('lixo')}</button>` : ''}</td></tr>`).join('')}
      </tbody></table></div>` : `<div style="padding:0 20px 20px">${vazio('escudo', 'Nenhuma vacina registrada', 'Copie do cartão de vacina (caderneta) as doses que a pessoa já tomou.')}</div>`}
    </section>`;
  $('#cvNova', c).onclick = () => formVacina(null, { residente_id: r.id });
  $('#cvImprimir', c).onclick = () => window.print();
  c.addEventListener('click', async (e) => {
    const ed = e.target.closest('[data-editar-vac]');
    if (ed) formVacina(d.itens.find((v) => v.id === +ed.dataset.editarVac));
    const ap = e.target.closest('[data-apagar-vac]');
    if (ap) {
      if (!(await confirmar('Apagar este registro de vacina? Use só se foi lançado por engano.', 'Apagar', { perigo: true }))) return;
      await botaoOcupado(ap, async () => { await api('DELETE', `/api/vacinas/${ap.dataset.apagarVac}`); toast('Registro apagado.'); rotear(); });
    }
  });
}

// Campos em comum (vacina, dose, data, lote, onde, próxima dose)
const camposVacina = (vacinas, doses) => `
  <div class="grade-campos">
    <label class="campo meio"><span class="obrig">Vacina</span><input id="vcVacina" list="vcLista" maxlength="80" placeholder="Escolha ou escreva"><span class="dica" id="vcDica"></span></label>
    <label class="campo"><span>Dose</span><select id="vcDose"><option value="">—</option>${doses.map((x) => `<option>${esc(x)}</option>`).join('')}</select></label>
    <label class="campo"><span class="obrig">Data da aplicação</span><input type="date" id="vcData" max="${hojeIso()}"></label>
    <label class="campo"><span>Lote</span><input id="vcLote" maxlength="40"></label>
    <label class="campo"><span>Onde</span><input id="vcLocal" maxlength="120" list="vcLocais"></label>
    <label class="campo"><span>Quem aplicou</span><input id="vcAplicador" maxlength="120" placeholder="Ex.: equipe da UBS"></label>
    <label class="campo"><span>Próxima dose</span><input type="date" id="vcProxima"><span class="dica">Se o posto marcou no cartão.</span></label>
    <label class="campo largo"><span>Observação</span><input id="vcObs" maxlength="300"></label>
  </div>${datalist('vcLista', Object.keys(vacinas))}${datalist('vcLocais', LOCAIS_VAC)}`;
function ligarDicaVacina(el, vacinas) {
  const f = () => { $('#vcDica', el).textContent = (vacinas[$('#vcVacina', el).value] || {}).dica || ''; };
  $('#vcVacina', el).addEventListener('input', f); f();
}
const corpoVacina = (el) => ({
  vacina: $('#vcVacina', el).value.trim(), dose: $('#vcDose', el).value, data: $('#vcData', el).value, lote: $('#vcLote', el).value.trim(),
  local: $('#vcLocal', el).value.trim(), aplicador: $('#vcAplicador', el).value.trim(), proxima_dose: $('#vcProxima', el).value, obs: $('#vcObs', el).value.trim(),
});

async function formVacina(v, pre = {}) {
  const novo = !v;
  let info, residentes;
  try { [info, residentes] = await Promise.all([api('GET', '/api/vacinas/painel'), residentesParaBusca()]); } catch (e) { toast(e.message, true); return; }
  residentes = residentes.filter((r) => !inativoRes(r));
  const j = modal(novo ? 'Registrar vacina' : `Corrigir — ${v.vacina}`, `
    ${novo ? `<div class="grade-campos" style="margin-bottom:14px"><label class="campo largo"><span class="obrig">Residente</span><select id="vcRes"><option value="">— escolha —</option>
      ${residentes.map((r) => `<option value="${r.id}">${esc(r.nome)}</option>`).join('')}</select></label></div>` : ''}
    ${camposVacina(info.vacinas, info.doses)}`, {
    rodape: `<button type="button" class="btn" data-fechar>Cancelar</button><button type="button" class="btn primario" id="vcSalvar">${icone('check')}${novo ? 'Registrar' : 'Salvar'}</button>`,
    onAbrir: (el) => {
      if (novo) $('#vcRes', el).value = pre.residente_id || '';
      const x = v || { data: hojeIso() };
      for (const [id, k] of [['vcVacina', 'vacina'], ['vcDose', 'dose'], ['vcData', 'data'], ['vcLote', 'lote'], ['vcLocal', 'local'], ['vcAplicador', 'aplicador'], ['vcProxima', 'proxima_dose'], ['vcObs', 'obs']]) $('#' + id, el).value = x[k] || '';
      ligarDicaVacina(el, info.vacinas);
    },
  });
  $('#vcSalvar', j.el).onclick = (e) => botaoOcupado(e.currentTarget, async () => {
    const corpo = corpoVacina(j.el);
    if (!corpo.vacina) throw new Error('Escolha a vacina.');
    if (!corpo.data) throw new Error('Informe a data da aplicação.');
    if (novo) {
      corpo.residente_id = $('#vcRes', j.el).value;
      if (!corpo.residente_id) throw new Error('Escolha o residente.');
      await api('POST', '/api/vacinas', corpo);
    } else await salvarComVersao(`/api/vacinas/${v.id}`, corpo, { ...v, dose: v.dose || '', lote: v.lote || '', local: v.local || '', aplicador: v.aplicador || '', proxima_dose: v.proxima_dose || '', obs: v.obs || '' });
    j.fechar(true); toast(novo ? 'Vacina registrada.' : 'Registro corrigido.'); rotear();
  });
}

// Campanha: a mesma vacina para vários residentes (ex.: a UBS veio vacinar todo mundo contra a gripe)
function formCampanhaVac(d) {
  const j = modal('Campanha de vacinação', `
    <p class="mudo" style="margin-bottom:14px">Registre de uma vez a mesma vacina para vários residentes — por exemplo, quando a UBS vem vacinar no lar.</p>
    ${camposVacina(d.vacinas, d.doses)}
    <div class="campo" style="margin-top:16px"><span class="rotulo obrig">Quem tomou</span>
      <div class="acoes" style="margin-bottom:8px"><button type="button" class="btn peq" id="cpTodos">Marcar todos</button><button type="button" class="btn peq fantasma" id="cpNenhum">Desmarcar todos</button><span class="mudo" id="cpConta"></span></div>
      <div class="grade-campos" style="grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:4px 16px">
        ${d.linhas.map((l) => `<label class="marcar"><input type="checkbox" id="cpR${l.id}" value="${l.id}">${esc(l.nome)}</label>`).join('')}</div></div>`, {
    tamanho: 'largo',
    rodape: `<button type="button" class="btn" data-fechar>Cancelar</button><button type="button" class="btn primario" id="cpSalvar">${icone('check')}Registrar para os marcados</button>`,
    onAbrir: (el) => {
      $('#vcVacina', el).value = 'Influenza (gripe)'; $('#vcDose', el).value = 'Dose anual'; $('#vcData', el).value = hojeIso(); $('#vcLocal', el).value = 'No lar — campanha';
      ligarDicaVacina(el, d.vacinas);
      const caixas = () => $$('input[id^="cpR"]', el);
      const contar = () => { $('#cpConta', el).textContent = `${caixas().filter((x) => x.checked).length} de ${caixas().length} marcados`; };
      // Já vem marcado quem ainda não tomou a vacina escolhida neste ano
      const preMarcar = () => { const vac = $('#vcVacina', el).value; const ano = hojeIso().slice(0, 4);
        for (const cx of caixas()) { const u = d.linhas.find((l) => l.id === +cx.value).ultimas[vac]; cx.checked = !(u && u.data.startsWith(ano)); } contar(); };
      $('#vcVacina', el).addEventListener('change', preMarcar);
      $('#cpTodos', el).onclick = () => { caixas().forEach((x) => { x.checked = true; }); contar(); };
      $('#cpNenhum', el).onclick = () => { caixas().forEach((x) => { x.checked = false; }); contar(); };
      el.addEventListener('change', (e) => { if (e.target.id && e.target.id.startsWith('cpR')) contar(); });
      preMarcar();
    },
  });
  $('#cpSalvar', j.el).onclick = (e) => botaoOcupado(e.currentTarget, async () => {
    const corpo = corpoVacina(j.el);
    corpo.residentes = $$('input[id^="cpR"]:checked', j.el).map((x) => Number(x.value));
    if (!corpo.vacina) throw new Error('Escolha a vacina.');
    if (!corpo.data) throw new Error('Informe a data.');
    if (!corpo.residentes.length) throw new Error('Marque quem tomou a vacina.');
    await api('POST', '/api/vacinas', corpo);
    j.fechar(true); toast(`${corpo.vacina}: registrada para ${plural(corpo.residentes.length, 'residente', 'residentes')}.`); rotear();
  });
}
