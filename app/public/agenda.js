// Agenda: consultas, exames, vacinas, visitas e atividades. Semana em colunas ou lista dos próximos dias.
// Rotas: #/agenda (esta semana) · #/agenda/AAAA-MM-DD (a semana desse dia) · #/agenda/residente-ID (tudo de uma pessoa)
'use strict';

const TIPOS_AG = {
  consulta: { nome: 'Consulta', icone: 'saude', exemplos: ['Geriatra', 'Cardiologista', 'Clínico geral', 'Oftalmologista', 'Dentista', 'Retorno'] },
  exame: { nome: 'Exame', icone: 'documento', exemplos: ['Exame de sangue', 'Raio-X', 'Ultrassom', 'Eletrocardiograma'] },
  vacina: { nome: 'Vacina', icone: 'escudo', exemplos: ['Vacina da gripe', 'Covid-19 (reforço)', 'Pneumocócica', 'Tétano (dT)'] },
  visita: { nome: 'Visita', icone: 'residentes', exemplos: ['Visita da família', 'Visita da assistente social'] },
  atividade: { nome: 'Atividade', icone: 'estrela', exemplos: ['Culto', 'Oficina de música', 'Festa dos aniversariantes', 'Passeio', 'Fisioterapia em grupo'] },
  outro: { nome: 'Outro', icone: 'pontos', exemplos: [] },
};
const SIT_AG = { agendado: 'Agendado', feito: 'Feito', cancelado: 'Cancelado' };
const TRANSPORTES_AG = ['Carro do lar', 'Família leva', 'Táxi (conveniado)', 'Ambulância', 'Transporte da prefeitura', 'No próprio lar'];
const DIAS_CURTOS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
let vistaAg = (() => { try { return localStorage.getItem('lar-vista-agenda') === 'lista' ? 'lista' : 'semana'; } catch { return 'semana'; } })();

// Segunda-feira da semana de um dia
const inicioSemana = (iso) => { const d = new Date(iso + 'T12:00:00'); return somarDiasIso(iso, -((d.getDay() + 6) % 7)); };
const horarioAg = (a) => (a.hora ? a.hora + (a.hora_fim ? '–' + a.hora_fim : '') : 'Dia todo');

function itemCompromisso(a, { mostrarResidente = true, mostrarData = false } = {}) {
  const t = TIPOS_AG[a.tipo] || TIPOS_AG.outro;
  return `<button type="button" class="compromisso ${a.situacao !== 'agendado' ? a.situacao : ''}" data-tipo="${esc(a.tipo)}" data-comp="${a.id}"
      title="${esc(`${t.nome}: ${a.titulo}${a.situacao !== 'agendado' ? ' (' + SIT_AG[a.situacao].toLowerCase() + ')' : ''}`)}">
    <span class="ch">${mostrarData ? esc(nomeDia(a.data)) + ' · ' : ''}${esc(horarioAg(a))} · ${esc(t.nome)}</span><span class="ct">${esc(a.titulo)}</span>
    ${mostrarResidente ? `<span class="cq">${a.residente_id ? `${avatar(a.residente_nome || '?', 'p')}<span>${esc(a.residente_apelido || a.residente_nome || '')}</span>` : `${icone('pessoaCasa')}<span>Todo o lar</span>`}</span>` : ''}
    ${a.local ? `<span class="cq">${icone('local')}<span>${esc(a.local)}</span></span>` : ''}
  </button>`;
}

// Clique num compromisso abre os detalhes (vale para a Agenda, a ficha do residente e o Início)
function ligarCompromissos(raiz, itens) {
  raiz.addEventListener('click', (e) => {
    const b = e.target.closest('[data-comp]');
    if (!b) return;
    const a = itens.find((x) => x.id === +b.dataset.comp);
    if (a) abrirCompromisso(a);
  });
}

TELAS.agenda = async (c, arg) => {
  const modoResidente = /^residente-\d+$/.test(arg || '') ? Number(arg.split('-')[1]) : null;
  const ref = /^\d{4}-\d{2}-\d{2}$/.test(arg || '') ? arg : hojeIso();
  const ini = inicioSemana(ref);
  const de = vistaAg === 'lista' ? ref : ini, ate = vistaAg === 'lista' ? somarDiasIso(ref, 30) : somarDiasIso(ini, 6);
  const [d, resid] = await Promise.all([
    api('GET', '/api/agenda?' + (modoResidente ? `residente=${modoResidente}` : `de=${de}&ate=${ate}`)),
    modoResidente ? api('GET', `/api/residentes/${modoResidente}`) : null,
  ]);
  const itens = d.itens;
  const org = EU.config.nome_organizacao || SUBTITULO_APP;
  const periodo = vistaAg === 'lista' ? `de ${dataBR(de).slice(0, 5)} a ${dataBR(ate).slice(0, 5)}` : `semana de ${dataBR(ini).slice(0, 5)} a ${dataBR(ate).slice(0, 5)}`;
  const titulo = modoResidente ? `Agenda de ${resid.residente.apelido || resid.residente.nome}` : 'Agenda';
  const pendentes = itens.filter((a) => a.situacao === 'agendado').length;
  const legenda = `<div class="legenda">${Object.entries(TIPOS_AG).filter(([k]) => k !== 'outro').map(([k, t]) => `<span><i class="cor-tipo" data-tipo="${k}"></i>${esc(t.nome)}</span>`).join('')}</div>`;

  c.innerHTML = `
    ${modoResidente ? `<a class="voltar" href="#/residente/${modoResidente}">${icone('voltar')}Ficha de ${esc(resid.residente.nome)}</a>` : ''}
    <div class="so-impressao cabecalho-impressao"><b>${esc(org)} — ${esc(titulo)}${modoResidente ? '' : ' · ' + esc(periodo)}</b><span>Impresso em ${esc(dataHoraBR(new Date().toISOString()))}</span></div>
    <div class="cabecalho"><div><h1>${esc(titulo)}</h1><p class="sub">${modoResidente ? `${plural(itens.length, 'compromisso', 'compromissos')} (os mais novos primeiro)`
      : `${periodo[0].toUpperCase() + periodo.slice(1)} · ${plural(pendentes, 'compromisso agendado', 'compromissos agendados')}`}</p></div>
      <div class="acoes"><button type="button" class="btn" id="agImprimir">${icone('impressora')}Imprimir</button>
        <button type="button" class="btn primario" id="agNovo">${icone('mais')}Agendar</button></div></div>
    ${modoResidente ? '' : `<div class="barra-ferramentas nao-imprimir">
      <div class="navegar-dia"><button type="button" class="btn-icone" id="agAntes" title="${vistaAg === 'lista' ? 'Voltar 30 dias' : 'Semana anterior'}" aria-label="Anterior">${icone('voltar')}</button>
        <input type="date" id="agData" value="${ref}" aria-label="Ir para o dia">
        <button type="button" class="btn-icone" id="agDepois" title="${vistaAg === 'lista' ? 'Avançar 30 dias' : 'Próxima semana'}" aria-label="Próximo">${icone('seta')}</button></div>
      ${ref !== hojeIso() ? '<a class="btn peq" href="#/agenda">Hoje</a>' : ''}
      ${segmentado([{ v: 'semana', rotulo: 'Semana', icone: 'grade' }, { v: 'lista', rotulo: 'Próximos 30 dias', icone: 'lista' }], vistaAg, { rotulo: 'Modo de ver', classe: 'vistaAg' })}
      <span style="margin-left:auto">${legenda}</span>
    </div>`}
    <div id="agArea"></div>`;

  const area = $('#agArea', c);
  const blocoDia = (iso, os) => `<div class="dia-bloco"><h2 class="turno-titulo">${esc(nomeDia(iso))}</h2><div class="compromissos">${os.map((a) => itemCompromisso(a, { mostrarResidente: !modoResidente })).join('')}</div></div>`;
  if (modoResidente || vistaAg === 'lista') {
    const grupos = {};
    for (const a of itens) (grupos[a.data] ||= []).push(a);
    area.innerHTML = itens.length ? `<div class="lista-dias">${Object.entries(grupos).map(([iso, os]) => blocoDia(iso, os)).join('')}</div>`
      : `<div class="cartao">${vazio('calendario', 'Nada na agenda', modoResidente ? 'Nenhum compromisso marcado para esta pessoa.' : 'Nenhum compromisso nos próximos 30 dias.',
        `<button type="button" class="btn primario" data-agendar>${icone('mais')}Agendar</button>`)}</div>`;
  } else {
    // Semana em 7 colunas (no celular vira lista, mostrando só os dias com compromisso e o dia de hoje)
    area.innerHTML = `<div class="semana">${[0, 1, 2, 3, 4, 5, 6].map((i) => {
      const iso = somarDiasIso(ini, i);
      const os = itens.filter((a) => a.data === iso);
      const dt = new Date(iso + 'T12:00:00');
      return `<section class="dia-col${iso === hojeIso() ? ' hoje' : ''}${iso < hojeIso() ? ' passado' : ''}${os.length || iso === hojeIso() ? '' : ' vazio-dia'}" aria-label="${esc(nomeDia(iso))}">
        <div class="dia-cab"><span>${iso === hojeIso() ? 'hoje' : DIAS_CURTOS[dt.getDay()]}</span><b>${dt.getDate()}</b></div>
        ${os.map((a) => itemCompromisso(a)).join('')}
        <button type="button" class="btn peq fantasma mais-dia nao-imprimir" data-agendar="${iso}" title="Agendar neste dia">${icone('mais')}Agendar</button></section>`;
    }).join('')}</div>`;
  }
  ligarCompromissos(area, itens);
  area.addEventListener('click', (e) => { const b = e.target.closest('[data-agendar]'); if (b) formCompromisso(null, { data: b.dataset.agendar || (ref >= hojeIso() ? ref : hojeIso()), residente_id: modoResidente }); });
  $('#agNovo', c).onclick = () => formCompromisso(null, { data: ref >= hojeIso() ? ref : hojeIso(), residente_id: modoResidente });
  $('#agImprimir', c).onclick = () => window.print();
  if (!modoResidente) {
    const passo = vistaAg === 'lista' ? 30 : 7;
    const ir = (iso) => { if (iso) location.hash = iso === hojeIso() ? '#/agenda' : `#/agenda/${iso}`; };
    $('#agData', c).onchange = (e) => ir(e.target.value);
    $('#agAntes', c).onclick = () => ir(somarDiasIso(ref, -passo));
    $('#agDepois', c).onclick = () => ir(somarDiasIso(ref, passo));
    ligarSegmentado($('.vistaAg', c), (v) => { vistaAg = v; try { localStorage.setItem('lar-vista-agenda', v); } catch { /* ignora */ } rotear(); });
  }
};

// Detalhes de um compromisso, com as ações (feito, cancelar, editar, apagar)
function abrirCompromisso(a) {
  const t = TIPOS_AG[a.tipo] || TIPOS_AG.outro;
  const podeApagar = EU.perfil === 'admin' || a.criado_por === EU.login;
  const linha = (rot, v) => (v ? ddResHtml(rot, v) : '');
  const j = modal(a.titulo, `
    <div class="previa">${a.residente_id ? avatar(a.residente_nome || '?', 'g') : `<span class="avatar g">${icone('pessoaCasa')}</span>`}
      <div><b>${a.residente_id ? `<a href="#/residente/${a.residente_id}" data-fechar-ir>${esc(a.residente_nome)}</a>` : 'Todo o lar'}</b>
      <small>${esc(t.nome)} · ${esc(nomeDia(a.data))} · ${esc(horarioAg(a))}</small></div></div>
    ${a.situacao !== 'agendado' ? `<div class="faixa ${a.situacao === 'feito' ? 'ok' : 'aviso'}">${icone(a.situacao === 'feito' ? 'check' : 'x')}<span><b>${esc(SIT_AG[a.situacao])}</b>${a.resultado ? ' — ' + esc(a.resultado) : ''}</span></div>` : ''}
    <dl class="dados">${linha('Local', esc(a.local))}${linha('Quem acompanha', esc(a.acompanhante))}${linha('Transporte', esc(a.transporte))}${linha('Observações', esc(a.obs))}
      ${ddRes('Marcado por', `${nomeAutorDia({ autor_nome: a.autor_nome, criado_por: a.criado_por })} em ${dataHoraBR(a.criado_em)}`)}</dl>`, {
    rascunho: false,
    rodape: `${podeApagar ? `<button type="button" class="btn fantasma esq" id="cpApagar">${icone('lixo')}Apagar</button>` : ''}
      ${a.situacao === 'agendado' ? `<button type="button" class="btn" id="cpCancelar">Desmarcar</button><button type="button" class="btn" id="cpEditar">${icone('editar')}Editar</button>
        <button type="button" class="btn primario" id="cpFeito">${icone('check')}Foi feito</button>`
        : `<button type="button" class="btn" id="cpReabrir">${icone('restaurar')}Voltar para agendado</button><button type="button" class="btn" id="cpEditar">${icone('editar')}Editar</button>`}`,
  });
  const link = $('[data-fechar-ir]', j.el); if (link) link.addEventListener('click', () => j.fechar(true));
  $('#cpEditar', j.el).onclick = () => { j.fechar(true); formCompromisso(a); };
  const mudar = async (situacao, resultado) => { await api('PUT', `/api/agenda/${a.id}/situacao`, { situacao, resultado }); j.fechar(true); rotear(); };
  if ($('#cpFeito', j.el)) $('#cpFeito', j.el).onclick = () => { j.fechar(true); janelaFeitoAg(a, 'feito'); };
  if ($('#cpCancelar', j.el)) $('#cpCancelar', j.el).onclick = () => { j.fechar(true); janelaFeitoAg(a, 'cancelado'); };
  if ($('#cpReabrir', j.el)) $('#cpReabrir', j.el).onclick = (e) => botaoOcupado(e.currentTarget, async () => { await mudar('agendado'); toast('Voltou para agendado.'); });
  if ($('#cpApagar', j.el)) $('#cpApagar', j.el).onclick = async () => {
    if (!(await confirmar('Apagar este compromisso de vez? Se ele só foi desmarcado, prefira “Desmarcar”: fica no histórico.', 'Apagar', { perigo: true, titulo: 'Apagar compromisso?' }))) return;
    try { await api('DELETE', `/api/agenda/${a.id}`); j.fechar(true); toast('Compromisso apagado.'); rotear(); } catch (e) { toast(e.message, true); }
  };
}

// "Foi feito" (com o resultado) ou "Desmarcar" (com o motivo)
function janelaFeitoAg(a, situacao) {
  const feito = situacao === 'feito';
  const j = modal(feito ? 'Como foi?' : 'Desmarcar compromisso', `<div class="previa">${a.residente_id ? avatar(a.residente_nome || '?', 'g') : `<span class="avatar g">${icone('pessoaCasa')}</span>`}
      <div><b>${esc(a.titulo)}</b><small>${esc(a.residente_nome || 'Todo o lar')} · ${esc(dataBR(a.data))}</small></div></div>
    <label class="campo"><span>${feito ? 'Resultado / orientação (opcional)' : 'Motivo (opcional)'}</span><textarea id="agResultado" maxlength="2000"
      placeholder="${feito ? 'Ex.: médico trocou a dose do remédio; retorno em 30 dias.' : 'Ex.: médico remarcou; residente estava gripado.'}"></textarea></label>
    ${feito ? '<p class="dica" style="margin-top:10px">Se houver retorno, depois de salvar é só clicar em “Agendar” de novo.</p>' : ''}`, {
    tamanho: 'estreito', rascunho: false,
    rodape: `<button type="button" class="btn" data-fechar>Voltar</button><button type="button" class="btn ${feito ? 'primario' : 'perigo'}" id="agSit">${feito ? icone('check') + 'Foi feito' : 'Desmarcar'}</button>`,
  });
  $('#agSit', j.el).onclick = (e) => botaoOcupado(e.currentTarget, async () => {
    await api('PUT', `/api/agenda/${a.id}/situacao`, { situacao, resultado: $('#agResultado', j.el).value });
    j.fechar(true);
    toast(feito ? 'Marcado como feito.' : 'Compromisso desmarcado.');
    rotear();
  });
}

// Agendar (ou editar). "pre" traz o dia e o residente já escolhidos quando vem de outra tela.
async function formCompromisso(a, pre = {}) {
  const novo = !a;
  let residentes;
  try { residentes = (await residentesParaBusca()).filter((r) => !inativoRes(r) || (a && r.id === a.residente_id)); } catch (e) { toast(e.message, true); return; }
  const v = a || { residente_id: pre.residente_id || '', data: pre.data || hojeIso(), hora: '', hora_fim: '', tipo: '', titulo: '', local: '', acompanhante: '', transporte: '', obs: '' };
  const j = modal(novo ? 'Agendar' : 'Editar compromisso', `
    <div class="grade-campos"><label class="campo largo"><span>Para quem?</span><select id="aRes">
      <option value="">— Todo o lar (culto, festa, atividade…)</option>
      ${residentes.map((r) => `<option value="${r.id}">${esc(r.nome)}${r.apelido ? ' (' + esc(r.apelido) + ')' : ''}</option>`).join('')}</select></label></div>
    <div class="campo" style="margin-top:16px"><span class="rotulo obrig">O que é?</span>
      <div class="chips-radio" role="radiogroup" aria-label="Tipo">${Object.entries(TIPOS_AG).map(([k, t]) => `<label><input type="radio" name="aTipo" id="aTipo_${k}" value="${k}"><span>${icone(t.icone)}${esc(t.nome)}</span></label>`).join('')}</div></div>
    <div class="grade-campos" style="margin-top:16px">
      <label class="campo largo"><span class="obrig">Título</span><input id="aTitulo" maxlength="120" list="aSugestoes" placeholder="Ex.: Consulta com cardiologista"><datalist id="aSugestoes"></datalist></label>
      <label class="campo"><span class="obrig">Dia</span><input type="date" id="aData"></label>
      <label class="campo"><span>Hora</span><input type="time" id="aHora"><span class="dica">Em branco = dia todo</span></label>
      <label class="campo"><span>Até</span><input type="time" id="aFim"></label>
      <label class="campo largo"><span>Local</span><input id="aLocal" maxlength="160" placeholder="Ex.: UBS Centro — sala 3"></label>
      <label class="campo"><span>Quem acompanha</span><input id="aAcomp" maxlength="80" placeholder="Ex.: Cuidadora Ana / a filha"></label>
      <label class="campo"><span>Transporte</span><input id="aTransp" maxlength="60" list="aTransportes"></label>
      <label class="campo largo"><span>Observações</span><textarea id="aObs" maxlength="2000" placeholder="Levar exames, jejum, documentos, cartão do convênio…"></textarea></label>
    </div>${datalist('aTransportes', TRANSPORTES_AG)}`, {
    tamanho: 'largo',
    rodape: `<button type="button" class="btn" data-fechar>Cancelar</button><button type="button" class="btn primario" id="aSalvar">${icone('check')}${novo ? 'Agendar' : 'Salvar'}</button>`,
    onAbrir: (el) => {
      $('#aRes', el).value = v.residente_id || '';
      if (v.tipo) $('#aTipo_' + v.tipo, el).checked = true;
      for (const [id, k] of [['aTitulo', 'titulo'], ['aData', 'data'], ['aHora', 'hora'], ['aFim', 'hora_fim'], ['aLocal', 'local'], ['aAcomp', 'acompanhante'], ['aTransp', 'transporte'], ['aObs', 'obs']]) $('#' + id, el).value = v[k] || '';
      // Sugestões de título conforme o tipo
      const sugerir = () => {
        const t = ($('input[name="aTipo"]:checked', el) || {}).value;
        $('#aSugestoes', el).innerHTML = (t ? TIPOS_AG[t].exemplos : []).map((x) => `<option value="${esc(x)}"></option>`).join('');
      };
      el.addEventListener('change', (e) => { if (e.target.name === 'aTipo') sugerir(); });
      sugerir();
    },
  });
  $('#aSalvar', j.el).onclick = (e) => botaoOcupado(e.currentTarget, async () => {
    const el = j.el;
    const corpo = {
      residente_id: $('#aRes', el).value, tipo: ($('input[name="aTipo"]:checked', el) || {}).value || '', titulo: $('#aTitulo', el).value.trim(),
      data: $('#aData', el).value, hora: $('#aHora', el).value, hora_fim: $('#aFim', el).value, local: $('#aLocal', el).value.trim(),
      acompanhante: $('#aAcomp', el).value.trim(), transporte: $('#aTransp', el).value.trim(), obs: $('#aObs', el).value.trim(),
    };
    if (!corpo.tipo) throw new Error('Escolha o que é (consulta, exame, visita…).');
    if (!corpo.titulo) { $('#aTitulo', el).focus(); throw new Error('Escreva o título.'); }
    if (!corpo.data) throw new Error('Escolha o dia.');
    if (corpo.hora_fim && !corpo.hora) throw new Error('Informe a hora de início.');
    if (corpo.hora && corpo.hora_fim && corpo.hora_fim <= corpo.hora) throw new Error('A hora de fim precisa ser depois da de início.');
    if (novo) await api('POST', '/api/agenda', corpo);
    else await salvarComVersao(`/api/agenda/${a.id}`, corpo, { ...a, residente_id: a.residente_id ?? '' });
    j.fechar(true);
    toast(novo ? `Agendado para ${nomeDia(corpo.data).toLowerCase()}.` : 'Compromisso salvo.');
    if (/^#\/(agenda|residente\/|inicio)/.test(location.hash)) rotear(); else location.hash = '#/agenda/' + corpo.data;
  });
}
