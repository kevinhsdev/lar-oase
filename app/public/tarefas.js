// Tarefas: a lista de afazeres da equipe (responsável, prazo, prioridade, repetição). Aba do grupo Agenda.
// Rotas: #/tarefas · #/tarefas/minhas
'use strict';

function linhaTarefa(t, repetir) {
  const h = hojeIso();
  const atrasada = !t.feita && t.prazo && t.prazo < h;
  const prazoTxt = !t.prazo ? '' : t.prazo === h ? 'hoje' : t.prazo === somarDiasIso(h, 1) ? 'amanhã' : t.prazo === somarDiasIso(h, -1) ? 'ontem' : dataBR(t.prazo);
  return `<div class="tarefa${t.feita ? ' feita' : ''}${atrasada ? ' atrasada' : ''}" data-tarefa="${t.id}">
    <button type="button" class="check-tarefa" data-feita="${t.id}" aria-pressed="${!!t.feita}" aria-label="${t.feita ? 'Reabrir' : 'Marcar como feita'}: ${esc(t.titulo)}" title="${t.feita ? 'Reabrir' : 'Marcar como feita'}">${icone('check')}</button>
    <div class="meio"><b>${esc(t.titulo)}</b>${t.detalhe ? `<small>${esc(t.detalhe)}</small>` : ''}
      <div class="det">${t.prioridade === 'alta' && !t.feita ? '<span class="etiqueta perigo">Urgente</span>' : ''}
        ${t.prazo ? `<span class="etiqueta ${atrasada ? 'perigo' : t.prazo === h ? 'aviso' : 'neutro'}">${icone('calendario')}${atrasada ? 'Atrasada · ' : ''}${esc(prazoTxt)}</span>` : ''}
        ${t.repetir ? `<span class="etiqueta info">${icone('atualizar')}${esc(repetir[t.repetir])}</span>` : ''}
        ${t.responsavel ? `<span class="pilula">${icone('usuario')}${esc(t.responsavel_nome || t.responsavel)}</span>` : '<span class="pilula">Equipe toda</span>'}
        ${t.residente_id ? `<a class="pilula" href="#/residente/${t.residente_id}">${esc(t.residente_apelido || t.residente_nome)}</a>` : ''}
        ${t.feita ? `<span class="fraco" style="font-size:12.5px">feita por ${esc(nomeAutorDia({ autor_nome: t.feita_por_nome, criado_por: t.feita_por }))} em ${esc(dataHoraBR(t.feita_em))}</span>` : ''}</div></div>
    <div class="acoes nao-imprimir"><button type="button" class="btn-icone" data-editar-tarefa="${t.id}" title="Editar" aria-label="Editar tarefa">${icone('editar')}</button></div></div>`;
}

TELAS.tarefas = async (c, arg) => {
  const minhas = arg === 'minhas';
  const d = await api('GET', '/api/tarefas' + (minhas ? '?minhas=1' : ''));
  const h = hojeIso();
  const abertas = d.itens.filter((t) => !t.feita);
  const grupos = [
    ['Atrasadas', abertas.filter((t) => t.prazo && t.prazo < h)],
    ['Hoje', abertas.filter((t) => t.prazo === h)],
    ['Próximos dias', abertas.filter((t) => t.prazo && t.prazo > h)],
    ['Sem prazo', abertas.filter((t) => !t.prazo)],
    ['Feitas nos últimos 7 dias', d.itens.filter((t) => t.feita)],
  ].filter(([, ts]) => ts.length);
  c.innerHTML = `
    <div class="so-impressao cabecalho-impressao"><b>${esc(EU.config.nome_organizacao || SUBTITULO_APP)} — Tarefas</b><span>Impresso em ${esc(dataHoraBR(new Date().toISOString()))}</span></div>
    <div class="cabecalho"><div><h1>Tarefas</h1><p class="sub">${plural(abertas.length, 'tarefa aberta', 'tarefas abertas')}${d.resumo.atrasadas ? ` · <b style="color:var(--perigo)">${plural(d.resumo.atrasadas, 'atrasada', 'atrasadas')}</b>` : ''}${d.resumo.hoje ? ` · ${d.resumo.hoje} para hoje` : ''}</p></div>
      <div class="acoes"><button type="button" class="btn" id="tfImprimir">${icone('impressora')}Imprimir</button><button type="button" class="btn primario" id="tfNova">${icone('mais')}Nova tarefa</button></div></div>
    <div class="barra-ferramentas nao-imprimir">${segmentado([{ v: 'todas', rotulo: 'Todas' }, { v: 'minhas', rotulo: 'Minhas' }], minhas ? 'minhas' : 'todas', { classe: 'filtroTf', rotulo: 'Filtrar' })}</div>
    <div id="tfLista">${grupos.length ? grupos.map(([nome, ts]) => `<h2 class="turno-titulo">${esc(nome)} · ${ts.length}</h2><div class="cartao" style="padding:4px">${ts.map((t) => linhaTarefa(t, d.repetir)).join('')}</div>`).join('')
      : `<div class="cartao">${vazio('check', 'Nenhuma tarefa', minhas ? 'Nada com você por enquanto.' : 'Anote aqui o que a equipe precisa fazer: ligar para família, comprar algo, consertar, organizar.', `<button type="button" class="btn primario" data-nova-tf>${icone('mais')}Nova tarefa</button>`)}</div>`}</div>`;
  $('#tfNova', c).onclick = () => formTarefa(null, d);
  $('#tfImprimir', c).onclick = () => window.print();
  definirImpressao(() => ({
    titulo: minhas ? 'Minhas tarefas' : 'Tarefas da equipe',
    sub: `${plural(abertas.length, 'tarefa aberta', 'tarefas abertas')}${d.resumo.atrasadas ? ` · ${plural(d.resumo.atrasadas, 'atrasada', 'atrasadas')}` : ''}`,
    corpo: docTabela([{ t: 'Feita', w: '7%', a: 'centro' }, { t: 'Tarefa', w: '37%' }, { t: 'Prazo', w: '12%' }, { t: 'Responsável', w: '17%' }, { t: 'Residente', w: '15%' }, { t: 'Repete', w: '12%' }],
      grupos.flatMap(([nome, ts]) => [{ grupo: `${nome} · ${ts.length}` }, ...ts.map((t) => [t.feita ? '✓' : '<span class="doc-quadro"></span>',
        `<b>${esc(t.titulo)}</b>${t.prioridade === 'alta' && !t.feita ? ' ' + docMarca('Urgente') : ''}${t.detalhe ? `<small>${esc(t.detalhe)}</small>` : ''}${t.feita ? `<small>feita por ${esc(nomeAutorDia({ autor_nome: t.feita_por_nome, criado_por: t.feita_por }))} em ${esc(dataHoraBR(t.feita_em))}</small>` : ''}`,
        esc(t.prazo ? dataBR(t.prazo) : ''), esc(t.responsavel ? t.responsavel_nome || t.responsavel : 'Equipe toda'), esc(t.residente_id ? t.residente_nome || '' : ''), esc(t.repetir ? d.repetir[t.repetir] : '')])]),
      { vazio: 'Nenhuma tarefa.' }),
  }));
  ligarSegmentado($('.filtroTf', c), (v) => { location.hash = v === 'minhas' ? '#/tarefas/minhas' : '#/tarefas'; });
  c.addEventListener('click', async (e) => {
    if (e.target.closest('[data-nova-tf]')) return formTarefa(null, d);
    const ed = e.target.closest('[data-editar-tarefa]');
    if (ed) return formTarefa(d.itens.find((t) => t.id === +ed.dataset.editarTarefa), d);
    const ck = e.target.closest('[data-feita]');
    if (!ck) return;
    const t = d.itens.find((x) => x.id === +ck.dataset.feita);
    const linha = ck.closest('.tarefa');
    linha.classList.toggle('feita', !t.feita); // resposta na hora; a lista se reorganiza logo em seguida
    try {
      const r = await api('PUT', `/api/tarefas/${t.id}/feita`, { feita: !t.feita });
      toast(t.feita ? 'Tarefa reaberta.' : r.proxima ? 'Feita! A próxima já foi criada.' : 'Tarefa feita.');
      setTimeout(rotear, semMovimento() ? 0 : 280);
    } catch (er) { linha.classList.toggle('feita', !!t.feita); toast(er.message, true); }
  });
};

async function formTarefa(t, d) {
  const novo = !t;
  let residentes = [];
  try { residentes = (await residentesParaBusca()).filter((r) => !inativoRes(r) || (t && r.id === t.residente_id)); } catch { /* segue */ }
  const podeApagar = t && (EU.perfil === 'admin' || t.criado_por === EU.login);
  const j = modal(novo ? 'Nova tarefa' : 'Editar tarefa', `<div class="grade-campos">
      <label class="campo largo"><span class="obrig">O que precisa ser feito</span><input id="tfTitulo" maxlength="160" placeholder="Ex.: Ligar para a família do Seu Dito"></label>
      <label class="campo largo"><span>Detalhes</span><textarea id="tfDetalhe" maxlength="1000"></textarea></label>
      <label class="campo"><span>Responsável</span><select id="tfResp"><option value="">Equipe toda</option>${d.usuarios.map((u) => `<option value="${esc(u.login)}">${esc(u.nome)}</option>`).join('')}</select></label>
      <label class="campo"><span>Prazo</span><input type="date" id="tfPrazo"></label>
      <label class="campo"><span>Repetir</span><select id="tfRepetir"><option value="">Não repete</option>${Object.entries(d.repetir).map(([k, n]) => `<option value="${k}">${esc(n)}</option>`).join('')}</select></label>
      <label class="campo meio"><span>Sobre um residente? (opcional)</span><select id="tfRes"><option value="">—</option>${residentes.map((r) => `<option value="${r.id}">${esc(r.nome)}</option>`).join('')}</select></label>
      <div class="campo"><label class="interruptor"><input type="checkbox" id="tfUrgente"><span class="trilho-int"></span><span>Urgente</span></label></div>
    </div>`, {
    rodape: `${podeApagar ? `<button type="button" class="btn fantasma esq" id="tfApagar">${icone('lixo')}Apagar</button>` : ''}<button type="button" class="btn" data-fechar>Cancelar</button><button type="button" class="btn primario" id="tfSalvar">${icone('check')}${novo ? 'Criar' : 'Salvar'}</button>`,
    onAbrir: (el) => {
      const x = t || { prazo: hojeIso() };
      $('#tfTitulo', el).value = x.titulo || ''; $('#tfDetalhe', el).value = x.detalhe || ''; $('#tfResp', el).value = x.responsavel || '';
      $('#tfPrazo', el).value = x.prazo || ''; $('#tfRepetir', el).value = x.repetir || ''; $('#tfRes', el).value = x.residente_id || '';
      $('#tfUrgente', el).checked = x.prioridade === 'alta';
    },
  });
  $('#tfSalvar', j.el).onclick = (e) => botaoOcupado(e.currentTarget, async () => {
    const el = j.el;
    const corpo = { titulo: $('#tfTitulo', el).value.trim(), detalhe: $('#tfDetalhe', el).value.trim(), responsavel: $('#tfResp', el).value, prazo: $('#tfPrazo', el).value,
      repetir: $('#tfRepetir', el).value, residente_id: $('#tfRes', el).value, prioridade: $('#tfUrgente', el).checked ? 'alta' : 'normal' };
    if (!corpo.titulo) { $('#tfTitulo', el).focus(); throw new Error('Escreva a tarefa.'); }
    if (corpo.repetir && !corpo.prazo) throw new Error('Tarefa que se repete precisa de um prazo (o primeiro dia).');
    if (novo) await api('POST', '/api/tarefas', corpo);
    else await salvarComVersao(`/api/tarefas/${t.id}`, corpo, { ...t, detalhe: t.detalhe || '', responsavel: t.responsavel || '', prazo: t.prazo || '', repetir: t.repetir || '', residente_id: t.residente_id ?? '' });
    j.fechar(true); toast(novo ? 'Tarefa criada.' : 'Tarefa salva.');
    if (location.hash.startsWith('#/tarefas') || location.hash.startsWith('#/inicio')) rotear(); else location.hash = '#/tarefas';
  });
  if ($('#tfApagar', j.el)) $('#tfApagar', j.el).onclick = async () => {
    if (!(await confirmar('Apagar esta tarefa?', 'Apagar', { perigo: true }))) return;
    try { await api('DELETE', `/api/tarefas/${t.id}`); j.fechar(true); toast('Tarefa apagada.'); rotear(); } catch (er) { toast(er.message, true); }
  };
}
