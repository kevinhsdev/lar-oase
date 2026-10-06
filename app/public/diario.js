// Diário: ocorrências e evolução do dia, numa linha do tempo por turno. Troca o caderno da equipe.
// Rotas: #/diario (hoje) · #/diario/AAAA-MM-DD (um dia) · #/diario/residente-ID (tudo de uma pessoa) · #/diario/atencao (pendentes)
'use strict';

const TIPOS_DIA = {
  evolucao: { nome: 'Evolução do dia', icone: 'caderno', dica: 'Como a pessoa passou: sono, alimentação, higiene, humor, atividades…' },
  queda: { nome: 'Queda', icone: 'queda', dica: 'Onde e como foi, se machucou, quem ajudou, quem foi avisado (enfermagem, família).' },
  saude: { nome: 'Saúde', icone: 'saude', dica: 'Febre, dor, pressão, mal-estar: o que sentiu, o que foi feito e quem foi avisado.' },
  alimentacao: { nome: 'Alimentação', icone: 'dieta', dica: 'Recusou refeição, engasgou, comeu pouco ou muito…' },
  comportamento: { nome: 'Comportamento', icone: 'humor', dica: 'Agitação, confusão, tristeza, briga… e o que ajudou a acalmar.' },
  visita: { nome: 'Visita', icone: 'residentes', dica: 'Quem visitou, horário e como foi.' },
  recado: { nome: 'Recado', icone: 'mensagem', dica: 'Aviso para a equipe do próximo turno.' },
  outro: { nome: 'Outro', icone: 'pontos', dica: 'Descreva o que aconteceu.' },
};
const GRAV_DIA = {
  normal: { nome: 'Normal', classe: 'neutro', texto: 'Só registrar.' },
  atencao: { nome: 'Atenção', classe: 'aviso', texto: 'Fica em destaque até alguém resolver.' },
  grave: { nome: 'Grave', classe: 'perigo', texto: 'Precisa de ação agora. Avise a enfermagem.' },
};
const TURNOS_DIA = { manha: 'Manhã', tarde: 'Tarde', noite: 'Noite' };
// Provisório: confirmar com a chefe como são os plantões do Lar (o servidor usa a mesma regra)
const turnoDaHoraDia = (h) => { const n = Number(String(h).slice(0, 2)); return n >= 6 && n < 13 ? 'manha' : n >= 13 && n < 19 ? 'tarde' : 'noite'; };
const horaAgora = () => new Date().toTimeString().slice(0, 5);
const somarDiasIso = (iso, n) => { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n); return d.toLocaleDateString('sv-SE'); };
const nomeDia = (iso) => {
  const d = new Date(iso + 'T12:00:00');
  const rel = iso === hojeIso() ? 'Hoje' : iso === somarDiasIso(hojeIso(), -1) ? 'Ontem' : '';
  const semana = DIAS_SEMANA[d.getDay()];
  return `${rel ? rel + ', ' : semana[0].toUpperCase() + semana.slice(1) + ', '}${dataExtenso(iso)}`;
};
let buscaDia = '';
// Nome de quem anotou. Na demonstração os autores não são usuários de verdade: "joana.demo" vira "Joana (demonstração)".
const nomeAutorDia = (o) => o.autor_nome || String(o.criado_por || '—').replace(/^(\w)(\w*)\.demo$/, (_, a, b) => `${a.toUpperCase()}${b} (demonstração)`);

// Uma anotação na linha do tempo
function itemDiario(o, { mostrarData = false, mostrarResidente = true } = {}) {
  const tipo = TIPOS_DIA[o.tipo] || TIPOS_DIA.outro;
  const pend = o.gravidade !== 'normal' && !o.resolvida;
  const podeEditar = EU.perfil === 'admin' || o.criado_por === EU.login;
  const vitais = [
    o.pa && `PA ${o.pa}`, o.temperatura != null && `${String(o.temperatura).replace('.', ',')} °C`, o.glicemia != null && `Glicemia ${o.glicemia}`,
    o.saturacao != null && `Sat. ${o.saturacao}%`, o.freq_cardiaca != null && `FC ${o.freq_cardiaca} bpm`,
  ].filter(Boolean);
  const editado = o.atualizado_em && o.criado_em && o.atualizado_em.slice(0, 16) !== o.criado_em.slice(0, 16);
  return `<article class="reg grav-${o.gravidade}${o.resolvida ? ' resolvida' : ''}" data-id="${o.id}">
    <div class="reg-hora">${esc(o.hora)}${mostrarData ? `<small>${esc(dataBR(o.data).slice(0, 5))}</small>` : ''}</div>
    <div class="reg-corpo">
      <div class="reg-cab">
        ${mostrarResidente ? (o.residente_id ? `<a class="quem" href="#/residente/${o.residente_id}">${avatar(o.residente_nome || '?', 'p')}${esc(o.residente_apelido || o.residente_nome || '')}</a>`
          : `<span class="quem">${icone('mensagem')}Equipe</span>`) : ''}
        <span class="etiqueta ${o.tipo === 'queda' ? 'aviso' : o.tipo === 'recado' ? 'info' : 'marca'}">${icone(tipo.icone)}${esc(tipo.nome)}</span>
        ${o.gravidade !== 'normal' ? `<span class="etiqueta ${GRAV_DIA[o.gravidade].classe}">${o.resolvida ? 'Era ' + GRAV_DIA[o.gravidade].nome.toLowerCase() : GRAV_DIA[o.gravidade].nome}</span>` : ''}
      </div>
      <p class="reg-texto">${esc(o.texto)}</p>
      ${vitais.length ? `<div class="reg-vitais">${vitais.map((v) => `<span class="pilula">${icone('termometro')}${esc(v)}</span>`).join('')}</div>` : ''}
      ${o.resolvida ? `<div class="reg-resolvida">${icone('check')}<span><b>Resolvida</b> por ${esc(nomeAutorDia({ autor_nome: o.resolvida_por_nome, criado_por: o.resolvida_por }))} em ${esc(dataHoraBR(o.resolvida_em))}${o.resolucao ? ` — ${esc(o.resolucao)}` : ''}</span></div>` : ''}
      <div class="reg-rodape"><span>por ${esc(nomeAutorDia(o))}${editado ? ' · editado' : ''}</span>
        <div class="acoes nao-imprimir">
          ${pend ? `<button type="button" class="btn peq suave" data-resolver="${o.id}">${icone('check')}Resolver</button>` : ''}
          ${podeEditar ? `<button type="button" class="btn-icone" data-editar-reg="${o.id}" title="Editar" aria-label="Editar registro">${icone('editar')}</button>` : ''}
          ${o.resolvida || EU.perfil === 'admin' ? `<button type="button" class="btn-icone" data-mais-reg="${o.id}" title="Mais opções" aria-label="Mais opções" aria-haspopup="menu" aria-expanded="false">${icone('pontos')}</button>` : ''}
        </div></div>
    </div></article>`;
}

// Liga os botões das anotações (serve para a tela do Diário, a ficha do residente e o Início)
function ligarItensDiario(raiz, itens) {
  raiz.addEventListener('click', (e) => {
    const achar = (attr) => { const b = e.target.closest(`[${attr}]`); return b ? [b, itens.find((x) => x.id === +b.getAttribute(attr))] : [null, null]; };
    const [, or] = achar('data-resolver');
    if (or) return janelaResolver(or);
    const [, oe] = achar('data-editar-reg');
    if (oe) return formRegistro(oe);
    const [bm, om] = achar('data-mais-reg');
    if (om) {
      const m = abrirMenu(bm, `${om.resolvida ? `<button class="menu-item" data-a="reabrir" role="menuitem">${icone('restaurar')}Reabrir (voltar a pendente)</button>` : ''}
        ${EU.perfil === 'admin' ? `<button class="menu-item perigo" data-a="apagar" role="menuitem">${icone('lixo')}Apagar registro…</button>` : ''}`);
      if (!m) return;
      m.onclick = tentar(async (ev) => {
        const a = ev.target.closest('[data-a]')?.dataset.a;
        if (a === 'reabrir') { await api('PUT', `/api/ocorrencias/${om.id}/resolver`, { reabrir: true }); toast('Voltou a ficar pendente.'); rotear(); }
        if (a === 'apagar') {
          if (!(await confirmar('Apagar este registro do diário? O normal é corrigir (Editar), porque o diário é o histórico do cuidado. A auditoria guarda que ele foi apagado.', 'Apagar', { perigo: true, titulo: 'Apagar registro?' }))) return;
          await api('DELETE', `/api/ocorrencias/${om.id}`); toast('Registro apagado.'); rotear();
        }
      });
    }
  });
}

// Diário no papel: uma linha por anotação. grupos = [[título do grupo, anotações]] (turno ou dia); sem grupos, lista simples com a data.
function docTabelaDiario(itens, { comResidente = true, grupos = null } = {}) {
  const linha = (o, comData) => {
    const tipo = (TIPOS_DIA[o.tipo] || TIPOS_DIA.outro).nome;
    const vitais = [o.pa && `PA ${o.pa}`, o.temperatura != null && `${String(o.temperatura).replace('.', ',')} °C`, o.glicemia != null && `glicemia ${o.glicemia}`,
      o.saturacao != null && `sat. ${o.saturacao}%`, o.freq_cardiaca != null && `${o.freq_cardiaca} bpm`].filter(Boolean).join(' · ');
    const cel = [comData ? `<span class="doc-nw">${esc(dataBR(o.data))}</span><small>${esc(o.hora)}</small>` : esc(o.hora)];
    if (comResidente) cel.push(o.residente_id ? esc(o.residente_nome || '') : '<i>Equipe (recado geral)</i>');
    cel.push(`${esc(tipo)}${o.gravidade !== 'normal' ? `<br>${docMarca(o.resolvida ? 'Era ' + GRAV_DIA[o.gravidade].nome.toLowerCase() : GRAV_DIA[o.gravidade].nome)}` : ''}`);
    cel.push(`<span class="doc-quebras">${esc(o.texto)}</span>${vitais ? `<small>${esc(vitais)}</small>` : ''}${o.resolvida
      ? `<small>Resolvida por ${esc(nomeAutorDia({ autor_nome: o.resolvida_por_nome, criado_por: o.resolvida_por }))} em ${esc(dataHoraBR(o.resolvida_em))}${o.resolucao ? ' — ' + esc(o.resolucao) : ''}</small>` : ''}`);
    cel.push(esc(nomeAutorDia(o)));
    return cel;
  };
  const colunas = [{ t: grupos ? 'Hora' : 'Data', w: grupos ? '7%' : '10%' }, ...(comResidente ? [{ t: 'Residente', w: '18%' }] : []), { t: 'Tipo', w: '12%' },
    { t: 'Registro', w: comResidente ? (grupos ? '48%' : '45%') : '63%' }, { t: 'Anotado por', w: '15%' }];
  const linhas = grupos ? grupos.flatMap(([titulo, os]) => [{ grupo: titulo }, ...os.map((o) => linha(o, false))])
    : itens.map((o) => linha(o, true));
  return docTabela(colunas, linhas, { vazio: 'Nada anotado.' });
}

TELAS.diario = async (c, arg) => {
  const modoResidente = /^residente-\d+$/.test(arg || '') ? Number(arg.split('-')[1]) : null;
  const modoAtencao = arg === 'atencao';
  const dia = /^\d{4}-\d{2}-\d{2}$/.test(arg || '') ? arg : hojeIso();
  const params = modoResidente ? `residente=${modoResidente}&limite=500` : modoAtencao ? 'pendentes=1' : `data=${dia}`;
  const [d, pend, resid] = await Promise.all([
    api('GET', '/api/ocorrencias?' + params),
    modoAtencao || modoResidente ? null : api('GET', '/api/ocorrencias?pendentes=1&limite=50'),
    modoResidente ? api('GET', `/api/residentes/${modoResidente}`) : null,
  ]);
  const itens = d.itens;
  if (pend) definirBadge('diario', pend.itens.length);
  const org = EU.config.nome_organizacao || SUBTITULO_APP;
  const titulo = modoResidente ? `Diário de ${resid.residente.apelido || resid.residente.nome}` : modoAtencao ? 'Precisa de atenção' : 'Diário';
  const sub = modoResidente ? `${plural(itens.length, 'registro', 'registros')}, do mais novo para o mais antigo`
    : modoAtencao ? 'Ocorrências de atenção ou graves que ainda não foram resolvidas'
      : `${nomeDia(dia)} · ${plural(itens.length, 'registro', 'registros')}`;
  const contar = (t) => itens.filter((o) => o.turno === t).length;
  const turnoAgora = turnoDaHoraDia(horaAgora());
  let turno = 'todos';

  c.innerHTML = `
    ${modoResidente ? `<a class="voltar" href="#/residente/${modoResidente}">${icone('voltar')}Ficha de ${esc(resid.residente.nome)}</a>` : modoAtencao ? `<a class="voltar" href="#/diario">${icone('voltar')}Diário</a>` : ''}
    <div class="so-impressao cabecalho-impressao"><b>${esc(org)} — ${esc(titulo)}${modoResidente || modoAtencao ? '' : ' · ' + esc(dataBR(dia))}</b><span>Impresso em ${esc(dataHoraBR(new Date().toISOString()))} por ${esc(EU.nome)}</span></div>
    <div class="cabecalho"><div><h1>${esc(titulo)}</h1><p class="sub">${esc(sub)}</p></div>
      <div class="acoes"><button type="button" class="btn" id="diaImprimir">${icone('impressora')}Imprimir</button>
        <button type="button" class="btn primario" id="diaNovo">${icone('mais')}Anotar</button></div></div>
    ${pend && pend.itens.length ? `<section class="faixa aviso nao-imprimir" style="align-items:center">${icone('alerta')}<span><b>${plural(pend.itens.length, 'ocorrência precisa', 'ocorrências precisam')} de atenção</b>
      ${pend.itens.some((o) => o.gravidade === 'grave') ? ' — há registro <b>grave</b>' : ''}.</span><div class="acoes"><a class="btn peq" href="#/diario/atencao">Ver e resolver</a></div></section>` : ''}
    ${modoResidente || modoAtencao ? '' : `<div class="barra-ferramentas nao-imprimir">
      <div class="navegar-dia"><button type="button" class="btn-icone" id="diaAntes" title="Dia anterior" aria-label="Dia anterior">${icone('voltar')}</button>
        <input type="date" id="diaData" value="${dia}" max="${hojeIso()}" aria-label="Escolher o dia">
        <button type="button" class="btn-icone" id="diaDepois" title="Próximo dia" aria-label="Próximo dia"${dia >= hojeIso() ? ' disabled' : ''}>${icone('seta')}</button></div>
      ${dia !== hojeIso() ? '<a class="btn peq" href="#/diario">Ir para hoje</a>' : ''}
      ${segmentado([{ v: 'todos', rotulo: 'Todos', cont: itens.length }, ...Object.entries(TURNOS_DIA).map(([v, rotulo]) => ({ v, rotulo, cont: contar(v) }))], 'todos', { rotulo: 'Filtrar por turno', classe: 'filtroTurno' })}
      <label class="busca">${icone('busca')}<input type="search" id="diaBusca" placeholder="Buscar nos registros (nome, palavra…)" aria-label="Buscar nos registros"></label>
    </div>`}
    <div id="diaLista"></div>`;

  const lista = $('#diaLista', c);
  let visDia = itens;
  definirImpressao(() => {
    const filtros = [turno !== 'todos' ? 'turno da ' + TURNOS_DIA[turno].toLowerCase() : '', buscaDia.trim() ? `busca: “${buscaDia.trim()}”` : ''].filter(Boolean).join(' · ');
    let corpo;
    if (modoResidente || modoAtencao) {
      const porDia = {};
      for (const o of visDia) (porDia[o.data] ||= []).push(o);
      corpo = docTabelaDiario(visDia, { comResidente: !modoResidente, grupos: Object.entries(porDia).map(([data, os]) => [nomeDia(data), os]) });
    } else {
      corpo = docTabelaDiario(visDia, { grupos: Object.entries(TURNOS_DIA).map(([t, nome]) => [`Turno da ${nome.toLowerCase()}`, visDia.filter((o) => o.turno === t).sort((a, b) => a.hora.localeCompare(b.hora) || a.id - b.id)]).filter(([, os]) => os.length) });
    }
    return {
      titulo: modoResidente ? 'Diário do residente' : modoAtencao ? 'Ocorrências pendentes' : 'Diário — livro de ocorrências',
      sub: [modoResidente ? resid.residente.nome : modoAtencao ? 'atenção ou graves, ainda não resolvidas' : nomeDia(dia) + ' de ' + dia.slice(0, 4), plural(visDia.length, 'registro', 'registros'), filtros].filter(Boolean).join(' · '),
      corpo: corpo + (modoResidente || modoAtencao ? '' : docAssinaturas(['Responsável pelo turno da manhã', 'Responsável pelo turno da tarde', 'Responsável pelo turno da noite'])),
    };
  });
  const desenhar = () => {
    const q = norm(buscaDia.trim());
    const vis = itens.filter((o) => (turno === 'todos' || o.turno === turno) && (!q || norm([o.texto, o.residente_nome, o.residente_apelido, o.autor_nome, TIPOS_DIA[o.tipo]?.nome].join(' ')).includes(q)));
    visDia = vis;
    if (!vis.length) {
      lista.innerHTML = `<div class="cartao dia-vazio">${q ? vazio('busca', 'Nada encontrado', `Nenhum registro com “${esc(buscaDia.trim())}”.`)
        : modoAtencao ? vazio('check', 'Tudo resolvido', 'Não há ocorrência de atenção ou grave pendente.')
          : vazio('caderno', modoResidente ? 'Nada anotado ainda' : dia === hojeIso() ? 'Nada anotado hoje ainda' : 'Nada anotado neste dia',
            'Anote a evolução de cada residente e tudo o que fugir da rotina: quedas, febre, recusa de comida, visitas, recados para o próximo turno.',
            `<button type="button" class="btn primario" data-anotar>${icone('mais')}Anotar agora</button>`)}</div>`;
      const b = $('[data-anotar]', lista); if (b) b.onclick = () => formRegistro(null, { residente_id: modoResidente, data: dia });
      return;
    }
    if (modoResidente || modoAtencao) {
      // Agrupa por dia
      const grupos = {};
      for (const o of vis) (grupos[o.data] ||= []).push(o);
      lista.innerHTML = Object.entries(grupos).map(([data, os]) => `<h2 class="turno-titulo">${esc(nomeDia(data))}</h2><div class="linha-tempo">${
        os.map((o) => itemDiario(o, { mostrarResidente: !modoResidente })).join('')}</div>`).join('');
    } else {
      // Um dia: por turno, na ordem do relógio
      lista.innerHTML = Object.entries(TURNOS_DIA).map(([t, nome]) => {
        const os = vis.filter((o) => o.turno === t).sort((a, b) => a.hora.localeCompare(b.hora) || a.id - b.id);
        if (!os.length) return '';
        return `<h2 class="turno-titulo">${esc(nome)}${dia === hojeIso() && t === turnoAgora ? ' · turno atual' : ''} · ${plural(os.length, 'registro', 'registros')}</h2>
          <div class="linha-tempo">${os.map((o) => itemDiario(o)).join('')}</div>`;
      }).join('');
    }
  };
  ligarItensDiario(lista, itens);
  $('#diaNovo', c).onclick = () => formRegistro(null, { residente_id: modoResidente, data: dia });
  $('#diaImprimir', c).onclick = () => window.print();
  if ($('#diaData', c)) {
    const ir = (iso) => { if (iso && iso <= hojeIso()) location.hash = iso === hojeIso() ? '#/diario' : `#/diario/${iso}`; };
    $('#diaData', c).onchange = (e) => ir(e.target.value);
    $('#diaAntes', c).onclick = () => ir(somarDiasIso(dia, -1));
    $('#diaDepois', c).onclick = () => ir(somarDiasIso(dia, 1));
    ligarSegmentado($('.filtroTurno', c), (v) => { turno = v; desenhar(); });
    const busca = $('#diaBusca', c);
    busca.value = buscaDia;
    busca.addEventListener('input', () => { buscaDia = busca.value; desenhar(); });
  }
  desenhar();
};

// Resolver uma ocorrência: o que foi feito (opcional)
function janelaResolver(o) {
  const j = modal('Marcar como resolvida', `<div class="previa">${o.residente_id ? avatar(o.residente_nome || '?', 'g') : `<span class="avatar g">${icone('mensagem')}</span>`}
      <div><b>${esc(o.residente_nome || 'Recado da equipe')}</b><small>${esc(TIPOS_DIA[o.tipo]?.nome || '')} · ${esc(dataBR(o.data))} às ${esc(o.hora)}</small></div></div>
    <p class="mudo" style="margin-bottom:14px;white-space:pre-line">${esc(o.texto.length > 280 ? o.texto.slice(0, 280) + '…' : o.texto)}</p>
    <label class="campo"><span>O que foi feito? (opcional)</span><textarea id="resObs" maxlength="2000" placeholder="Ex.: avaliada pela enfermagem, sem lesões; família avisada."></textarea></label>`, {
    tamanho: 'estreito',
    rodape: `<button type="button" class="btn" data-fechar>Cancelar</button><button type="button" class="btn primario" id="resOk">${icone('check')}Resolvida</button>`,
  });
  $('#resOk', j.el).onclick = (e) => botaoOcupado(e.currentTarget, async () => {
    await api('PUT', `/api/ocorrencias/${o.id}/resolver`, { resolucao: $('#resObs', j.el).value });
    j.fechar(true);
    toast('Marcada como resolvida.');
    rotear();
  });
}

// Anotar (ou editar) no diário. "pre" traz o residente e o dia já escolhidos quando vem de outra tela.
async function formRegistro(o, pre = {}) {
  const novo = !o;
  let residentes;
  try { residentes = (await residentesParaBusca()).filter((r) => !inativoRes(r) || (o && r.id === o.residente_id)); } catch (e) { toast(e.message, true); return; }
  const v = o || { residente_id: pre.residente_id || '', data: pre.data && pre.data <= hojeIso() ? pre.data : hojeIso(), hora: horaAgora(), tipo: pre.residente_id ? 'evolucao' : '', gravidade: 'normal', texto: '' };
  if (!o && v.data !== hojeIso()) v.hora = '12:00';
  const temVitais = o && [o.pa, o.temperatura, o.glicemia, o.saturacao, o.freq_cardiaca].some((x) => x != null && x !== '');
  const j = modal(novo ? 'Anotar no diário' : 'Editar registro', `
    <div class="grade-campos">
      <label class="campo largo"><span>Sobre quem?</span><select id="oRes">
        <option value="">— Recado geral da equipe (sem residente)</option>
        ${residentes.map((r) => `<option value="${r.id}">${esc(r.nome)}${r.apelido ? ' (' + esc(r.apelido) + ')' : ''}${r.quarto ? ' · quarto ' + esc(r.quarto) : ''}</option>`).join('')}
      </select></label>
    </div>
    <div class="campo" style="margin-top:16px"><span class="rotulo obrig">O que é?</span>
      <div class="chips-radio" role="radiogroup" aria-label="Tipo do registro">${Object.entries(TIPOS_DIA).map(([k, t]) => `<label><input type="radio" name="oTipo" id="oTipo_${k}" value="${k}"><span>${icone(t.icone)}${esc(t.nome)}</span></label>`).join('')}</div></div>
    <div class="campo" style="margin-top:16px"><span class="rotulo">Gravidade</span>
      <div class="opcoes-linha" role="radiogroup" aria-label="Gravidade">${Object.entries(GRAV_DIA).map(([k, g]) => `<label class="opcao-grau ${g.classe}"><input type="radio" name="oGrav" id="oGrav_${k}" value="${k}"><span><b>${esc(g.nome)}</b><small>${esc(g.texto)}</small></span></label>`).join('')}</div></div>
    <label class="campo" style="margin-top:16px"><span class="obrig">O que aconteceu</span><textarea id="oTexto" maxlength="5000" style="min-height:120px"></textarea><span class="dica" id="oDica"></span></label>
    <div class="grade-campos" style="margin-top:16px">
      <label class="campo"><span>Dia</span><input type="date" id="oData" max="${hojeIso()}"></label>
      <label class="campo"><span>Hora</span><input type="time" id="oHora"></label>
      <label class="campo"><span>Turno</span><select id="oTurno">${Object.entries(TURNOS_DIA).map(([k, t]) => `<option value="${k}">${esc(t)}</option>`).join('')}</select></label>
    </div>
    <details class="vitais" id="oVitais"${temVitais ? ' open' : ''}><summary>${icone('termometro')}Sinais vitais <span class="fraco">(opcional)</span></summary>
      <div class="grade-campos">
        <label class="campo"><span>Pressão (PA)</span><input id="oPa" placeholder="120x80" maxlength="9" inputmode="numeric"></label>
        <label class="campo"><span>Temperatura °C</span><input id="oTemp" placeholder="36,5" maxlength="4" inputmode="decimal"></label>
        <label class="campo"><span>Glicemia</span><input id="oGlic" placeholder="mg/dL" maxlength="3" inputmode="numeric"></label>
        <label class="campo"><span>Saturação %</span><input id="oSat" placeholder="97" maxlength="3" inputmode="numeric"></label>
        <label class="campo"><span>Batimentos (FC)</span><input id="oFc" placeholder="bpm" maxlength="3" inputmode="numeric"></label>
      </div></details>`, {
    tamanho: 'largo',
    sub: novo ? 'Escreva do jeito que contaria para a colega do próximo turno.' : `Anotado por ${esc(nomeAutorDia(o))} em${esc(dataHoraBR(o.criado_em))}`,
    rodape: `<button type="button" class="btn" data-fechar>Cancelar</button><button type="button" class="btn primario" id="oSalvar">${icone('check')}${novo ? 'Anotar' : 'Salvar'}</button>`,
    onAbrir: (el) => {
      $('#oRes', el).value = v.residente_id || '';
      if (v.tipo) $('#oTipo_' + v.tipo, el).checked = true;
      $('#oGrav_' + (v.gravidade || 'normal'), el).checked = true;
      $('#oTexto', el).value = v.texto || '';
      $('#oData', el).value = v.data; $('#oHora', el).value = v.hora;
      $('#oTurno', el).value = v.turno || turnoDaHoraDia(v.hora);
      const num = (x) => (x == null ? '' : String(x).replace('.', ','));
      $('#oPa', el).value = v.pa || ''; $('#oTemp', el).value = num(v.temperatura); $('#oGlic', el).value = num(v.glicemia);
      $('#oSat', el).value = num(v.saturacao); $('#oFc', el).value = num(v.freq_cardiaca);
      // A dica e o exemplo mudam conforme o tipo; "Saúde" abre os sinais vitais
      const dica = () => {
        const t = ($('input[name="oTipo"]:checked', el) || {}).value;
        $('#oDica', el).textContent = t ? TIPOS_DIA[t].dica : 'Escolha acima o que é, e conte aqui o que aconteceu.';
        if (t === 'saude') $('#oVitais', el).open = true;
        if (t === 'queda' && $('#oGrav_normal', el).checked && novo) $('#oGrav_atencao', el).checked = true; // queda sempre merece atenção
        if (t === 'recado' && novo && !$('#oRes', el).dataset.mexeu) $('#oRes', el).value = '';
      };
      el.addEventListener('change', (e) => { if (e.target.name === 'oTipo') dica(); });
      $('#oRes', el).addEventListener('change', () => { $('#oRes', el).dataset.mexeu = '1'; });
      // Turno segue a hora, a não ser que a pessoa escolha outro
      $('#oHora', el).addEventListener('input', () => { if (!$('#oTurno', el).dataset.mexeu && $('#oHora', el).value) $('#oTurno', el).value = turnoDaHoraDia($('#oHora', el).value); });
      $('#oTurno', el).addEventListener('change', () => { $('#oTurno', el).dataset.mexeu = '1'; });
      dica();
    },
  });
  $('#oSalvar', j.el).onclick = (e) => botaoOcupado(e.currentTarget, async () => {
    const el = j.el;
    const corpo = {
      residente_id: $('#oRes', el).value, tipo: ($('input[name="oTipo"]:checked', el) || {}).value || '',
      gravidade: ($('input[name="oGrav"]:checked', el) || {}).value || 'normal', texto: $('#oTexto', el).value.trim(),
      data: $('#oData', el).value, hora: $('#oHora', el).value, turno: $('#oTurno', el).value,
      pa: $('#oPa', el).value.trim(), temperatura: $('#oTemp', el).value.trim(), glicemia: $('#oGlic', el).value.trim(),
      saturacao: $('#oSat', el).value.trim(), freq_cardiaca: $('#oFc', el).value.trim(),
    };
    if (!corpo.tipo) throw new Error('Escolha o que é (evolução, queda, saúde…).');
    if (!corpo.texto) { $('#oTexto', el).focus(); throw new Error('Escreva o que aconteceu.'); }
    if (!corpo.data || !corpo.hora) throw new Error('Informe o dia e a hora.');
    if (novo) await api('POST', '/api/ocorrencias', corpo);
    else {
      // Compara com o que a tela carregou (números vêm do banco como número; aqui tudo vira texto igual)
      const original = { ...o, residente_id: o.residente_id ?? '', pa: o.pa ?? '' };
      for (const k of ['temperatura', 'glicemia', 'saturacao', 'freq_cardiaca']) original[k] = o[k] == null ? '' : String(o[k]).replace('.', ',');
      await salvarComVersao(`/api/ocorrencias/${o.id}`, corpo, original);
    }
    j.fechar(true);
    toast(novo ? (corpo.gravidade === 'grave' ? 'Anotado como GRAVE. Avise a enfermagem agora.' : 'Anotado no diário.') : 'Registro salvo.');
    if (location.hash.startsWith('#/diario') || location.hash.startsWith('#/residente/') || location.hash.startsWith('#/inicio')) rotear();
    else location.hash = '#/diario';
  });
}
