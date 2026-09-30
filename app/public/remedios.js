// Remédios: a folha do dia (marcar "dei o remédio", com quem e quando) e as prescrições de cada residente.
// Rotas: #/medicacao (hoje) · #/medicacao/AAAA-MM-DD · #/prescricoes · #/prescricoes/residente-ID
// ATENÇÃO: regras provisórias — validar com a enfermagem do Lar (HANDOFF §7.1).
'use strict';

const VIAS_REM = ['Oral', 'Sublingual', 'Sonda', 'Tópica (pele)', 'Ocular (colírio)', 'Nasal', 'Inalatória', 'Subcutânea', 'Intramuscular', 'Retal', 'Outra'];
const HORARIOS_COMUNS = ['06:00', '07:00', '08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '19:00', '20:00', '21:00', '22:00'];
const REMEDIOS_COMUNS = ['Losartana 50 mg', 'Anlodipino 5 mg', 'Hidroclorotiazida 25 mg', 'Metformina 850 mg', 'Insulina NPH', 'Levotiroxina 50 mcg', 'Omeprazol 20 mg',
  'Sinvastatina 20 mg', 'AAS 100 mg', 'Furosemida 40 mg', 'Donepezila 10 mg', 'Memantina 10 mg', 'Quetiapina 25 mg', 'Sertralina 50 mg', 'Paracetamol 750 mg', 'Dipirona 500 mg'];
const SIT_DOSE = { dado: 'Dado', recusado: 'Recusou', nao_dado: 'Não foi dado' };
let buscaRem = '', soFalta = false;

// Mesma ideia do servidor (rotas/remedios.js): avisa se o nome do remédio bate com uma alergia da ficha. Não substitui a conferência.
function alergiaRem(medicamento, alergias) {
  if (!alergias || !medicamento) return null;
  const palavras = norm(medicamento).split(/[^a-z0-9]+/).filter((p) => p.length >= 3);
  for (const termo of String(alergias).split(/[;,/\n]| e /)) {
    const t = norm(termo).trim();
    if (!t) continue;
    const chaves = [t.replace(/\(.*?\)/g, '').trim(), ...[...t.matchAll(/\((.*?)\)/g)].map((m) => m[1].trim())].filter((c) => c.length >= 3);
    for (const c of chaves) {
      const pal = c.split(/[^a-z0-9]+/).filter((p) => p.length >= 3);
      if (norm(medicamento).includes(c) || pal.some((p) => palavras.includes(p) && p.length >= 4) || (c.length <= 5 && palavras.includes(c))) return termo.trim();
    }
  }
  return null;
}
const avisoAlergia = (termo) => (termo ? `<span class="aviso-alergia">${icone('alerta')}Alergia registrada: ${esc(termo)}</span>` : '');
const descRem = (p) => `<strong>${esc(p.medicamento)}</strong> · ${esc(p.dose)} · ${esc(p.via)}`;

// ───────────── folha do dia ─────────────
function linhaDose(i, podeMarcar) {
  const a = i.adm;
  const nome = i.residente_apelido || i.residente_nome;
  let direita;
  if (a) {
    const podeDesfazer = EU.perfil === 'admin' || (a.criado_por === EU.login && new Date(a.criado_em).toLocaleDateString('sv-SE') === hojeIso());
    direita = `<span class="feito-por">${icone(a.situacao === 'dado' ? 'check' : 'alerta')}${esc(SIT_DOSE[a.situacao])}${a.hora_real ? ' às ' + esc(a.hora_real) : ''} · ${esc(nomeAutorDia({ autor_nome: a.autor_nome, criado_por: a.criado_por }))}</span>
      ${podeDesfazer ? `<button type="button" class="btn-icone nao-imprimir" data-desfazer-dose="${a.id}" title="Desfazer" aria-label="Desfazer marcação">${icone('restaurar')}</button>` : ''}`;
  } else if (podeMarcar) {
    direita = `${i.estado === 'atrasado' ? '<span class="etiqueta aviso">Atrasado</span>' : i.estado === 'sem_registro' ? '<span class="etiqueta perigo">Sem registro</span>' : ''}
      <button type="button" class="btn peq fantasma" data-marcar="nao_dado">Não dei</button><button type="button" class="btn peq" data-marcar="recusado">Recusou</button>
      <button type="button" class="btn peq primario" data-marcar="dado">${icone('check')}Dei</button>`;
  } else direita = '<span class="fraco">ainda não é hora</span>';
  return `<div class="dose ${a ? a.situacao : i.estado}" data-pres="${i.id}" data-horario="${esc(i.horario)}">
    <div class="quem-dose">${avatar(i.residente_nome, 'p')}<span class="meio"><b><a href="#/residente/${i.residente_id}" style="color:inherit">${esc(nome)}</a>${i.residente_quarto ? ` <span class="fraco" style="font-weight:400">· quarto ${esc(i.residente_quarto)}</span>` : ''}</b>
      <span class="rem">${descRem(i)}</span>${i.obs ? `<small>${esc(i.obs)}</small>` : ''}${a && a.motivo ? `<small>Motivo: ${esc(a.motivo)}</small>` : ''}${avisoAlergia(i.alergia)}</span></div>
    <div class="acoes">${direita}</div></div>`;
}

TELAS.medicacao = async (c, arg) => {
  const dia = /^\d{4}-\d{2}-\d{2}$/.test(arg || '') && arg <= hojeIso() ? arg : hojeIso();
  const d = await api('GET', `/api/medicacao?data=${dia}`);
  const r = d.resumo;
  if (dia === hojeIso()) definirBadge('remedios', r.atrasado);
  const marcados = r.dado + r.recusado + r.nao_dado;
  const org = EU.config.nome_organizacao || SUBTITULO_APP;
  const agoraMin = (() => { const x = new Date(); return x.getHours() * 60 + x.getMinutes(); })();
  const podeMarcar = (h) => dia < hojeIso() || Number(h.slice(0, 2)) * 60 + Number(h.slice(3)) - agoraMin <= 120;
  let turno = 'todos';
  c.innerHTML = `
    <div class="so-impressao cabecalho-impressao"><b>${esc(org)} — Folha de remédios · ${esc(dataBR(dia))}</b><span>Impresso em ${esc(dataHoraBR(new Date().toISOString()))} por ${esc(EU.nome)}</span></div>
    <div class="cabecalho"><div><h1>${dia === hojeIso() ? 'Remédios de hoje' : 'Remédios de ' + esc(dataBR(dia))}</h1>
      <p class="sub">${esc(nomeDia(dia))} · ${r.total ? `${marcados} de ${r.total} marcados` : 'nenhum remédio com horário'}</p></div>
      <div class="acoes"><button type="button" class="btn" id="remImprimir">${icone('impressora')}Imprimir a folha</button>
        <a class="btn" href="#/prescricoes">${icone('pilula')}Prescrições</a></div></div>
    ${r.atrasado ? `<div class="faixa aviso">${icone('relogio')}<span><b>${plural(r.atrasado, 'remédio atrasado', 'remédios atrasados')}</b> (passou mais de 1 hora do horário e ninguém marcou). Confira se foi dado.</span></div>` : ''}
    ${r.sem_registro ? `<div class="faixa perigo">${icone('alerta')}<span><b>${plural(r.sem_registro, 'horário ficou', 'horários ficaram')} sem registro</b> neste dia.</span></div>` : ''}
    ${r.total ? `<div class="barra-ferramentas nao-imprimir">
      <div class="navegar-dia"><button type="button" class="btn-icone" id="remAntes" title="Dia anterior" aria-label="Dia anterior">${icone('voltar')}</button>
        <input type="date" id="remData" value="${dia}" max="${hojeIso()}" aria-label="Escolher o dia">
        <button type="button" class="btn-icone" id="remDepois" title="Próximo dia" aria-label="Próximo dia"${dia >= hojeIso() ? ' disabled' : ''}>${icone('seta')}</button></div>
      ${dia !== hojeIso() ? '<a class="btn peq" href="#/medicacao">Hoje</a>' : ''}
      ${segmentado([{ v: 'todos', rotulo: 'Todos' }, ...Object.entries(TURNOS_DIA).map(([v, rotulo]) => ({ v, rotulo, cont: d.itens.filter((i) => i.turno === v).length }))], 'todos', { classe: 'filtroTurnoRem', rotulo: 'Turno' })}
      <label class="interruptor"><input type="checkbox" id="remFalta"${soFalta ? ' checked' : ''}><span class="trilho-int"></span><span>Só o que falta</span></label>
      <label class="busca">${icone('busca')}<input type="search" id="remBusca" placeholder="Buscar residente ou remédio" aria-label="Buscar"></label>
    </div>
    <div class="progresso-dia nao-imprimir" style="margin-bottom:16px">${barraEst({ saldo: marcados, estoque_minimo: r.total / 2.5, zerado: false, acabando: false, unidade: 'un' })}
      <span class="mudo"><b>${r.dado}</b> dados${r.recusado ? ` · <b>${r.recusado}</b> recusados` : ''}${r.nao_dado ? ` · <b>${r.nao_dado}</b> não dados` : ''} · <b>${r.pendente + r.atrasado + r.sem_registro}</b> faltam</span></div>
    <div id="remLista"></div>` : `<section class="cartao">${vazio('pilula', 'Nenhum remédio com horário', 'Cadastre as prescrições de cada residente (remédio, dose, via e horários). Depois disso, a folha do dia aparece aqui.',
      `<a class="btn primario" href="#/prescricoes">${icone('mais')}Ir para as prescrições</a>`)}</section>`}
    ${d.sos.length ? `<section class="cartao espaco"><div class="cartao-topo"><h2>${icone('pilula')}Se necessário</h2></div>
      <p class="dica" style="margin-bottom:10px">Remédios sem horário fixo. Só dê quando a condição acontecer, e anote o motivo.</p>
      ${d.sos.map((p) => `<div class="dose" data-sos="${p.id}"><div class="quem-dose">${avatar(p.residente_nome, 'p')}<span class="meio"><b>${esc(p.residente_apelido || p.residente_nome)}</b>
        <span class="rem">${descRem(p)}</span><small>${esc(p.condicao || '')}</small>${avisoAlergia(p.alergia)}
        ${p.dadas.map((a) => `<small>${icone('check')} Dado às ${esc(a.hora_real || '—')} por ${esc(nomeAutorDia({ autor_nome: a.autor_nome, criado_por: a.criado_por }))}${a.motivo ? ' — ' + esc(a.motivo) : ''}</small>`).join('')}</span></div>
        <div class="acoes nao-imprimir"><button type="button" class="btn peq" data-dar-sos="${p.id}">${icone('check')}Dar agora</button></div></div>`).join('')}</section>` : ''}`;

  $('#remImprimir', c).onclick = () => window.print();
  if (!r.total && !d.sos.length) return;
  const lista = $('#remLista', c);
  const desenhar = () => {
    if (!lista) return;
    const q = norm(buscaRem.trim());
    const vis = d.itens.filter((i) => (turno === 'todos' || i.turno === turno) && (!soFalta || !i.adm)
      && (!q || norm([i.residente_nome, i.residente_apelido, i.medicamento, i.residente_quarto ? 'quarto ' + i.residente_quarto : ''].join(' ')).includes(q)));
    const horarios = [...new Set(vis.map((i) => i.horario))];
    lista.innerHTML = vis.length ? horarios.map((h) => {
      const os = vis.filter((i) => i.horario === h);
      const faltam = os.filter((i) => !i.adm).length;
      return `<div class="horario-bloco"><h2 class="turno-titulo">${esc(h)} · ${plural(os.length, 'remédio', 'remédios')}${faltam ? ` · ${faltam} ${faltam === 1 ? 'falta' : 'faltam'}` : ' · tudo marcado'}</h2>
        <div class="cartao" style="padding:4px">${os.map((i) => linhaDose(i, podeMarcar(h))).join('')}</div></div>`;
    }).join('') : `<div class="cartao">${vazio('check', soFalta ? 'Nada faltando' : 'Nada encontrado', soFalta ? 'Todos os remédios deste filtro já foram marcados.' : 'Nenhum remédio neste filtro.')}</div>`;
  };
  if ($('#remData', c)) {
    const ir = (iso) => { if (iso && iso <= hojeIso()) location.hash = iso === hojeIso() ? '#/medicacao' : `#/medicacao/${iso}`; };
    $('#remData', c).onchange = (e) => ir(e.target.value);
    $('#remAntes', c).onclick = () => ir(somarDiasIso(dia, -1));
    $('#remDepois', c).onclick = () => ir(somarDiasIso(dia, 1));
    ligarSegmentado($('.filtroTurnoRem', c), (v) => { turno = v; desenhar(); });
    $('#remFalta', c).onchange = (e) => { soFalta = e.target.checked; desenhar(); };
    const busca = $('#remBusca', c); busca.value = buscaRem;
    busca.addEventListener('input', () => { buscaRem = busca.value; desenhar(); });
    // Ao abrir hoje, já mostra o turno de agora
    const tAgora = turnoDaHoraDia(horaAgora());
    if (dia === hojeIso() && d.itens.some((i) => i.turno === tAgora && !i.adm)) { $(`.filtroTurnoRem button[data-v="${tAgora}"]`, c).click(); }
  }
  desenhar();
  c.addEventListener('click', async (e) => {
    const bm = e.target.closest('[data-marcar]');
    if (bm) {
      const linha = bm.closest('.dose');
      const item = d.itens.find((i) => i.id === +linha.dataset.pres && i.horario === linha.dataset.horario);
      if (bm.dataset.marcar === 'dado') {
        // "Dei": um toque só (é a ação mais repetida do dia)
        await botaoOcupado(bm, async () => {
          await api('POST', '/api/medicacao', { prescricao_id: item.id, data: dia, horario: item.horario, situacao: 'dado' });
          toast(`${item.medicamento}: dado para ${item.residente_apelido || item.residente_nome}.`);
          rotear();
        });
      } else janelaMotivoDose(item, dia, bm.dataset.marcar);
      return;
    }
    const bs = e.target.closest('[data-dar-sos]');
    if (bs) return janelaMotivoDose(d.sos.find((p) => p.id === +bs.dataset.darSos), dia, 'dado');
    const bd = e.target.closest('[data-desfazer-dose]');
    if (bd) {
      if (!(await confirmar('Desfazer esta marcação? O remédio volta a aparecer como não marcado.', 'Desfazer'))) return;
      await botaoOcupado(bd, async () => { await api('DELETE', `/api/medicacao/${bd.dataset.desfazerDose}`); toast('Marcação desfeita.'); rotear(); });
    }
  });
};

// Recusou / Não dei (motivo obrigatório) e "se necessário" (por que precisou)
function janelaMotivoDose(item, dia, situacao) {
  const sos = !!item.se_necessario;
  const titulo = sos ? 'Dar remédio "se necessário"' : situacao === 'recusado' ? 'Recusou o remédio' : 'Remédio não foi dado';
  const j = modal(titulo, `<div class="previa">${avatar(item.residente_nome, 'g')}<div><b>${esc(item.residente_apelido || item.residente_nome)}</b>
      <small>${esc(item.medicamento)} · ${esc(item.dose)}${item.horario ? ' · ' + esc(item.horario) : ''}</small></div></div>
    ${item.alergia ? `<div class="faixa perigo">${icone('alerta')}<span><b>Atenção:</b> a ficha registra alergia a <b>${esc(item.alergia)}</b>. Confira com a enfermagem antes de dar.</span></div>` : ''}
    ${sos && item.condicao ? `<p class="mudo" style="margin-bottom:12px">Quando dar: <b>${esc(item.condicao)}</b></p>` : ''}
    <div class="grade-campos">
      <label class="campo largo"><span class="obrig">${sos ? 'Por que precisou?' : 'Motivo'}</span><textarea id="doseMotivo" maxlength="500"
        placeholder="${sos ? 'Ex.: dor de cabeça; febre de 38 °C' : situacao === 'recusado' ? 'Ex.: recusou; ofereci de novo e recusou. Enfermagem avisada.' : 'Ex.: estava dormindo; vomitou; está no hospital; remédio acabou'}"></textarea></label>
      <label class="campo"><span>Hora</span><input type="time" id="doseHora" value="${dia === hojeIso() ? horaAgora() : esc(item.horario || '12:00')}"></label>
    </div>
    ${situacao !== 'dado' ? '<p class="dica" style="margin-top:10px">Se for algo de saúde (recusa repetida, vômito), anote também no Diário.</p>' : ''}`, {
    tamanho: 'estreito', rascunho: false,
    rodape: `<button type="button" class="btn" data-fechar>Cancelar</button><button type="button" class="btn ${situacao === 'dado' ? 'primario' : 'perigo'}" id="doseOk">${icone('check')}${sos ? 'Dei agora' : 'Salvar'}</button>`,
  });
  $('#doseOk', j.el).onclick = (e) => botaoOcupado(e.currentTarget, async () => {
    const motivo = $('#doseMotivo', j.el).value.trim();
    if (!motivo) { $('#doseMotivo', j.el).focus(); throw new Error(sos ? 'Diga por que precisou.' : 'Diga o motivo.'); }
    await api('POST', '/api/medicacao', { prescricao_id: item.id, data: dia, horario: item.horario || null, situacao, motivo, hora_real: $('#doseHora', j.el).value });
    j.fechar(true);
    toast(sos ? 'Anotado: remédio dado.' : 'Anotado.');
    rotear();
  });
}

// ───────────── prescrições ─────────────
function receitaItem(p) {
  const suspensa = !p.ativa || (p.fim && p.fim < hojeIso());
  return `<div class="receita${suspensa ? ' suspensa' : ''}" data-receita="${p.id}">
    <div class="med">${descRem(p).replace(/ · /g, ' <span class="fraco">·</span> ')}
      ${p.se_necessario ? '<span class="etiqueta info">Se necessário</span>' : `<span class="horarios-pilulas">${String(p.horarios || '').split(',').filter(Boolean).map((h) => `<span class="pilula">${esc(h)}</span>`).join('')}</span>`}
      ${!p.ativa ? '<span class="etiqueta neutro">Suspensa</span>' : p.fim && p.fim < hojeIso() ? '<span class="etiqueta neutro">Terminou</span>' : ''}
      <button type="button" class="btn-icone nao-imprimir" data-mais-receita="${p.id}" style="margin-left:auto;width:32px;height:32px" aria-haspopup="menu" aria-expanded="false" title="Opções" aria-label="Opções">${icone('pontos')}</button></div>
    ${p.se_necessario && p.condicao ? `<small>Quando: ${esc(p.condicao)}</small>` : ''}
    ${p.obs ? `<small>${esc(p.obs)}</small>` : ''}
    <small class="fraco">${p.prescritor ? esc(p.prescritor) + ' · ' : ''}desde ${esc(dataBR(p.inicio))}${p.fim ? ' até ' + esc(dataBR(p.fim)) : ' (uso contínuo)'}${!p.ativa && p.motivo_suspensao ? ' · suspensa: ' + esc(p.motivo_suspensao) : ''}</small>
    ${avisoAlergia(p.alergia)}
  </div>`;
}
function ligarReceitas(raiz, itens) {
  raiz.addEventListener('click', (e) => {
    const b = e.target.closest('[data-mais-receita]');
    if (!b) return;
    const p = itens.find((x) => x.id === +b.dataset.maisReceita);
    const m = abrirMenu(b, `<button class="menu-item" data-a="editar" role="menuitem">${icone('editar')}Editar</button>
      ${p.ativa ? `<button class="menu-item" data-a="suspender" role="menuitem">${icone('x')}Suspender (médico mandou parar)</button>` : `<button class="menu-item" data-a="reativar" role="menuitem">${icone('restaurar')}Reativar</button>`}
      ${EU.perfil === 'admin' ? `<div class="menu-sep"></div><button class="menu-item perigo" data-a="apagar" role="menuitem">${icone('lixo')}Apagar (cadastrada por engano)…</button>` : ''}`);
    if (!m) return;
    m.onclick = tentar(async (ev) => {
      const a = ev.target.closest('[data-a]')?.dataset.a;
      if (a === 'editar') formPrescricao(p);
      if (a === 'suspender') janelaSuspender(p);
      if (a === 'reativar') { await api('PUT', `/api/prescricoes/${p.id}/suspender`, { reativar: true }); toast('Prescrição reativada.'); rotear(); }
      if (a === 'apagar') {
        if (!(await confirmar(`Apagar a prescrição de ${p.medicamento} e todas as marcações dela? Use só para prescrição cadastrada por engano. Para o médico mandar parar, use "Suspender".`, 'Apagar', { perigo: true, titulo: 'Apagar prescrição?' }))) return;
        await api('DELETE', `/api/prescricoes/${p.id}`); toast('Prescrição apagada.'); rotear();
      }
    });
  });
}

TELAS.prescricoes = async (c, arg) => {
  const modoResidente = /^residente-\d+$/.test(arg || '') ? Number(arg.split('-')[1]) : null;
  const todas = arg === 'todas';
  const d = await api('GET', '/api/prescricoes?' + (modoResidente ? `residente=${modoResidente}&todas=1` : todas ? 'todas=1' : ''));
  const grupos = new Map();
  for (const p of d.itens) { if (!grupos.has(p.residente_id)) grupos.set(p.residente_id, []); grupos.get(p.residente_id).push(p); }
  const nomeRes = modoResidente && d.itens[0] ? d.itens[0].residente_nome : null;
  c.innerHTML = `
    ${modoResidente ? `<a class="voltar" href="#/residente/${modoResidente}">${icone('voltar')}Ficha${nomeRes ? ' de ' + esc(nomeRes) : ''}</a>` : ''}
    <div class="so-impressao cabecalho-impressao"><b>${esc(EU.config.nome_organizacao || SUBTITULO_APP)} — Prescrições</b><span>Impresso em ${esc(dataHoraBR(new Date().toISOString()))}</span></div>
    <div class="cabecalho"><div><h1>${modoResidente ? 'Prescrições' + (nomeRes ? ' de ' + esc(nomeRes.split(' ')[0]) : '') : 'Prescrições'}</h1>
      <p class="sub">${modoResidente ? 'Todas, inclusive as suspensas' : `${plural(d.itens.length, 'remédio', 'remédios')} em uso, de ${plural(grupos.size, 'residente', 'residentes')}`}</p></div>
      <div class="acoes"><button type="button" class="btn" id="preImprimir">${icone('impressora')}Imprimir</button>
        <button type="button" class="btn primario" id="preNova">${icone('mais')}Nova prescrição</button></div></div>
    ${modoResidente ? '' : `<div class="barra-ferramentas nao-imprimir"><label class="busca">${icone('busca')}<input type="search" id="preBusca" placeholder="Buscar residente ou remédio" aria-label="Buscar"></label>
      <label class="interruptor"><input type="checkbox" id="preTodas"${todas ? ' checked' : ''}><span class="trilho-int"></span><span>Mostrar suspensas e terminadas</span></label></div>`}
    <div class="faixa nao-imprimir">${icone('info')}<span>Cadastre exatamente como está na receita do médico. Para <b>mudar dose ou horário</b>, suspenda a prescrição antiga e cadastre uma nova: assim o histórico fica certo.</span></div>
    <div id="preLista"></div>`;
  const lista = $('#preLista', c);
  const desenhar = (q = '') => {
    const nq = norm(q.trim());
    const blocos = [...grupos.entries()].filter(([, ps]) => !nq || norm([ps[0].residente_nome, ps[0].residente_apelido, ...ps.map((p) => p.medicamento)].join(' ')).includes(nq));
    lista.innerHTML = blocos.length ? blocos.map(([rid, ps]) => `<section class="cartao espaco"><div class="cartao-topo"><h2>${avatar(ps[0].residente_nome, 'p')}<a href="#/residente/${rid}" style="color:inherit">${esc(ps[0].residente_nome)}</a></h2>
        ${ps[0].residente_alergias ? `<span class="etiqueta perigo">${icone('alerta')}Alergia: ${esc(ps[0].residente_alergias)}</span>` : ''}</div>
        ${ps.map(receitaItem).join('')}
        <div class="rodape-cartao nao-imprimir"><button type="button" class="btn peq" data-nova-para="${rid}">${icone('mais')}Nova prescrição para ${esc(ps[0].residente_apelido || ps[0].residente_nome.split(' ')[0])}</button></div></section>`).join('')
      : `<div class="cartao espaco">${vazio('pilula', nq ? 'Nada encontrado' : 'Nenhuma prescrição cadastrada', nq ? 'Nenhum residente ou remédio com esse nome.' : 'Cadastre o que cada residente toma, copiando da receita do médico.',
        nq ? '' : `<button type="button" class="btn primario" data-nova-para="${modoResidente || ''}">${icone('mais')}Nova prescrição</button>`)}</div>`;
  };
  ligarReceitas(lista, d.itens);
  lista.addEventListener('click', (e) => { const b = e.target.closest('[data-nova-para]'); if (b) formPrescricao(null, { residente_id: b.dataset.novaPara }); });
  $('#preNova', c).onclick = () => formPrescricao(null, { residente_id: modoResidente || '' });
  $('#preImprimir', c).onclick = () => window.print();
  if ($('#preBusca', c)) {
    $('#preBusca', c).addEventListener('input', (e) => desenhar(e.target.value));
    $('#preTodas', c).onchange = (e) => { location.hash = e.target.checked ? '#/prescricoes/todas' : '#/prescricoes'; };
  }
  desenhar();
};

function janelaSuspender(p) {
  const j = modal('Suspender prescrição', `<p class="texto-confirmar"><b>${esc(p.medicamento)}</b> de ${esc(p.residente_nome)} sai da folha a partir de agora. O histórico continua guardado.</p>
    <label class="campo" style="margin-top:14px"><span class="obrig">Motivo</span><textarea id="susMotivo" maxlength="500" placeholder="Ex.: médico suspendeu na consulta de hoje"></textarea></label>`, {
    tamanho: 'estreito', rascunho: false,
    rodape: `<button type="button" class="btn" data-fechar>Cancelar</button><button type="button" class="btn perigo" id="susOk">Suspender</button>`,
  });
  $('#susOk', j.el).onclick = (e) => botaoOcupado(e.currentTarget, async () => {
    const motivo = $('#susMotivo', j.el).value.trim();
    if (!motivo) throw new Error('Diga o motivo.');
    await api('PUT', `/api/prescricoes/${p.id}/suspender`, { motivo });
    j.fechar(true); toast('Prescrição suspensa.'); rotear();
  });
}

async function formPrescricao(p, pre = {}) {
  const novo = !p;
  let residentes;
  try { residentes = (await residentesParaBusca()).filter((r) => !inativoRes(r) || (p && r.id === p.residente_id)); } catch (e) { toast(e.message, true); return; }
  const v = p || { residente_id: pre.residente_id || '', medicamento: '', dose: '', via: 'Oral', horarios: '', se_necessario: 0, condicao: '', inicio: hojeIso(), fim: '', prescritor: '', obs: '' };
  const hs = String(v.horarios || '').split(',').filter(Boolean);
  const outros = hs.filter((h) => !HORARIOS_COMUNS.includes(h));
  const j = modal(novo ? 'Nova prescrição' : `Editar — ${p.medicamento}`, `
    <div class="grade-campos">
      <label class="campo largo"><span class="obrig">Residente</span><select id="rxRes"${novo ? '' : ' disabled'}><option value="">— escolha —</option>
        ${residentes.map((r) => `<option value="${r.id}">${esc(r.nome)}${r.quarto ? ' · quarto ' + esc(r.quarto) : ''}</option>`).join('')}</select></label>
      <div class="campo largo" id="rxAlergiaRes"></div>
      <label class="campo meio"><span class="obrig">Remédio e concentração</span><input id="rxMed" maxlength="120" list="rxMeds" placeholder="Ex.: Losartana 50 mg"><span id="rxAviso"></span></label>
      <label class="campo"><span class="obrig">Dose</span><input id="rxDose" maxlength="80" placeholder="Ex.: 1 comprimido, 10 gotas"></label>
      <label class="campo"><span class="obrig">Via</span><select id="rxVia">${VIAS_REM.map((x) => `<option>${esc(x)}</option>`).join('')}</select></label>
    </div>
    <div class="campo" style="margin-top:16px"><span class="rotulo">Quando dar</span>
      <div class="opcoes-linha" style="grid-template-columns:repeat(2,minmax(0,1fr))">
        <label class="opcao-grau"><input type="radio" name="rxTipo" id="rxFixo" value="0"><span><b>Horários fixos</b><small>Todo dia nos horários escolhidos</small></span></label>
        <label class="opcao-grau"><input type="radio" name="rxTipo" id="rxSos" value="1"><span><b>Se necessário</b><small>Só quando precisar (dor, febre…)</small></span></label>
      </div></div>
    <div id="rxHorariosCaixa" class="campo" style="margin-top:14px"><span class="rotulo obrig">Horários</span>
      <div class="chips-radio">${HORARIOS_COMUNS.map((h) => `<label><input type="checkbox" id="rxH_${h.replace(':', '')}" value="${h}"${hs.includes(h) ? ' checked' : ''}><span>${h}</span></label>`).join('')}</div>
      <input id="rxOutros" placeholder="Outros horários (ex.: 09:30, 15:00)" style="margin-top:10px;max-width:320px" value="${esc(outros.join(', '))}"></div>
    <label id="rxCondCaixa" class="campo" style="margin-top:14px"><span>Quando dar (condição)</span><input id="rxCond" maxlength="200" placeholder="Ex.: se dor ou febre acima de 37,8 °C, no máximo de 6 em 6 horas"></label>
    <div class="grade-campos" style="margin-top:16px">
      <label class="campo"><span>Começa em</span><input type="date" id="rxInicio"></label>
      <label class="campo"><span>Termina em</span><input type="date" id="rxFim"><span class="dica">Em branco = uso contínuo</span></label>
      <label class="campo"><span>Médico(a)</span><input id="rxMedico" maxlength="80"></label>
      <label class="campo largo"><span>Observações</span><input id="rxObs" maxlength="300" placeholder="Ex.: em jejum; depois do almoço; triturar para a sonda"></label>
    </div>${datalist('rxMeds', REMEDIOS_COMUNS)}`, {
    tamanho: 'largo', sub: 'Copie exatamente como está na receita do médico.',
    rodape: `<button type="button" class="btn" data-fechar>Cancelar</button><button type="button" class="btn primario" id="rxSalvar">${icone('check')}${novo ? 'Cadastrar' : 'Salvar'}</button>`,
    onAbrir: (el) => {
      $('#rxRes', el).value = v.residente_id || '';
      $('#rxMed', el).value = v.medicamento; $('#rxDose', el).value = v.dose; $('#rxVia', el).value = v.via;
      $(v.se_necessario ? '#rxSos' : '#rxFixo', el).checked = true;
      $('#rxCond', el).value = v.condicao || ''; $('#rxInicio', el).value = v.inicio || hojeIso(); $('#rxFim', el).value = v.fim || '';
      $('#rxMedico', el).value = v.prescritor || ''; $('#rxObs', el).value = v.obs || '';
      const atualizar = () => {
        const sos = $('#rxSos', el).checked;
        $('#rxHorariosCaixa', el).hidden = sos; $('#rxCondCaixa', el).hidden = !sos;
        const r = residentes.find((x) => x.id === +$('#rxRes', el).value);
        $('#rxAlergiaRes', el).innerHTML = r && r.alergias ? `<span class="aviso-alergia">${icone('alerta')}${esc(r.apelido || r.nome)} tem alergia a: ${esc(r.alergias)}</span>` : '';
        $('#rxAviso', el).innerHTML = r ? avisoAlergia(alergiaRem($('#rxMed', el).value, r.alergias)) : '';
      };
      el.addEventListener('change', atualizar);
      $('#rxMed', el).addEventListener('input', atualizar);
      atualizar();
    },
  });
  $('#rxSalvar', j.el).onclick = (e) => botaoOcupado(e.currentTarget, async () => {
    const el = j.el;
    const sos = $('#rxSos', el).checked;
    const horarios = [...$$('#rxHorariosCaixa input[type="checkbox"]:checked', el).map((x) => x.value), ...$('#rxOutros', el).value.split(/[,;\s]+/).filter(Boolean).map((h) => (/^\d{1,2}$/.test(h) ? h.padStart(2, '0') + ':00' : h.padStart(5, '0')))];
    const corpo = {
      residente_id: $('#rxRes', el).value, medicamento: $('#rxMed', el).value.trim(), dose: $('#rxDose', el).value.trim(), via: $('#rxVia', el).value,
      se_necessario: sos ? 1 : 0, horarios: sos ? '' : [...new Set(horarios)].sort().join(','), condicao: sos ? $('#rxCond', el).value.trim() : '',
      inicio: $('#rxInicio', el).value, fim: $('#rxFim', el).value, prescritor: $('#rxMedico', el).value.trim(), obs: $('#rxObs', el).value.trim(),
    };
    if (!corpo.residente_id) throw new Error('Escolha o residente.');
    if (!corpo.medicamento) { $('#rxMed', el).focus(); throw new Error('Escreva o nome do remédio.'); }
    if (!corpo.dose) { $('#rxDose', el).focus(); throw new Error('Escreva a dose.'); }
    if (!sos && !corpo.horarios) throw new Error('Escolha pelo menos um horário (ou marque "Se necessário").');
    const r = residentes.find((x) => x.id === +corpo.residente_id);
    const conflito = r && alergiaRem(corpo.medicamento, r.alergias);
    if (conflito && !(await confirmar(`A ficha de ${r.nome} registra ALERGIA a "${conflito}". Tem certeza de que o médico receitou ${corpo.medicamento}? Confira com a enfermagem antes de salvar.`,
      'Salvar mesmo assim', { perigo: true, titulo: 'Atenção: alergia' }))) return;
    if (novo) {
      await api('POST', '/api/prescricoes', corpo);
      j.fechar(true); toast(`${corpo.medicamento} cadastrado para ${r ? r.apelido || r.nome : 'o residente'}.`);
    } else {
      delete corpo.residente_id;
      await salvarComVersao(`/api/prescricoes/${p.id}`, corpo, { ...p, fim: p.fim || '', condicao: p.condicao || '', prescritor: p.prescritor || '', obs: p.obs || '', horarios: p.horarios || '' });
      j.fechar(true); toast('Prescrição salva.');
    }
    if (/^#\/(prescricoes|residente\/|medicacao)/.test(location.hash)) rotear(); else location.hash = '#/prescricoes';
  });
}
