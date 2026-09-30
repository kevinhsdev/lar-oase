// PIA — Plano Individual de Atenção: painel (quem tem, quem precisa revisar), o documento de cada residente e a revisão.
// Rotas: #/pia · #/pia/residente-ID · #/pia/residente-ID-vVERSAO
'use strict';

const RESP_PIA = ['Enfermagem', 'Técnicos de enfermagem', 'Cuidadoras', 'Médico(a)', 'Fisioterapia', 'Nutricionista', 'Assistente social', 'Psicologia', 'Voluntários', 'Família'];
const ROTULOS_PIA = { situacao: 'Situação atual', metas: 'Metas (o que queremos)', acoes: 'Cuidados combinados (o que fazer)', responsavel: 'Responsável' };

TELAS.pia = async (c, arg) => {
  const m = /^residente-(\d+)(?:-v(\d+))?$/.exec(arg || '');
  if (m) return documentoPia(c, Number(m[1]), m[2] ? Number(m[2]) : null);
  const d = await api('GET', '/api/pia/painel');
  c.innerHTML = `
    <div class="cabecalho"><div><h1>PIA — Plano Individual de Atenção</h1><p class="sub">Um plano de cuidado por residente, revisado a cada 6 meses · ${d.pendentes ? `<b>${plural(d.pendentes, 'precisa', 'precisam')} fazer ou revisar</b>` : 'todos em dia'}</p></div></div>
    <div class="faixa">${icone('info')}<span>A norma da Anvisa para lares de idosos (RDC 502/2021) pede um plano de atenção para cada residente, feito pela equipe com a pessoa e a família. O sistema ajuda sugerindo a situação atual com o que já está cadastrado.</span></div>
    ${d.linhas.length ? `<div class="tabela-caixa"><table class="tabela"><thead><tr><th>Residente</th><th>Último plano</th><th>Próxima revisão</th><th></th></tr></thead><tbody>
      ${d.linhas.map((l) => `<tr><td><a href="#/pia/residente-${l.id}" style="display:flex;align-items:center;gap:10px;color:var(--texto);font-weight:600">${avatar(l.nome, 'p')}${esc(l.apelido || l.nome)}</a></td>
        <td class="num">${l.ultimo ? esc(dataBR(l.ultimo)) : '<span class="etiqueta neutro">Sem PIA</span>'}</td>
        <td>${l.proxima_revisao ? `<span class="etiqueta ${l.vencido ? 'perigo' : 'ok'}">${l.vencido ? 'Vencida em ' : ''}${esc(dataBR(l.proxima_revisao))}</span>` : '—'}</td>
        <td class="acoes-td"><a class="btn peq${l.ultimo ? '' : ' primario'}" href="#/pia/residente-${l.id}">${l.ultimo ? 'Ver o plano' : 'Fazer o PIA'}</a></td></tr>`).join('')}</tbody></table></div>`
      : `<div class="cartao">${vazio('documento', 'Ninguém no lar', 'Os residentes no lar aparecem aqui.')}</div>`}`;
};

async function documentoPia(c, rid, versao) {
  const d = await api('GET', `/api/pia?residente=${rid}${versao ? '&id=' + versao : ''}`);
  const r = d.residente, p = d.atual;
  const ehAtual = p && d.versoes[0] && p.id === d.versoes[0].id;
  const vencido = p && p.proxima_revisao && p.proxima_revisao < hojeIso();
  c.innerHTML = `
    <a class="voltar" href="#/residente/${r.id}">${icone('voltar')}Ficha de ${esc(r.nome)}</a>
    <div class="so-impressao cabecalho-impressao"><b>${esc(EU.config.nome_organizacao || SUBTITULO_APP)} — Plano Individual de Atenção</b><span>Impresso em ${esc(dataHoraBR(new Date().toISOString()))}</span></div>
    <div class="cabecalho"><div><h1>Plano Individual de Atenção</h1><p class="sub">${esc(r.nome)}${r.dt_nasc ? ' · nasc. ' + esc(dataBR(r.dt_nasc)) : ''}${r.quarto ? ' · quarto ' + esc(r.quarto) : ''}${r.grau_dependencia ? ' · grau ' + esc(r.grau_dependencia) : ''}</p></div>
      <div class="acoes"><a class="btn nao-imprimir" href="#/pia">${icone('documento')}Todos</a>${p ? `<button type="button" class="btn" id="piaImprimir">${icone('impressora')}Imprimir</button>` : ''}
        <button type="button" class="btn primario" id="piaRevisar">${icone('editar')}${p ? 'Revisar (nova versão)' : 'Fazer o PIA'}</button></div></div>
    ${!p ? `<section class="cartao">${vazio('documento', 'Ainda não há PIA', 'Clique em “Fazer o PIA”. O sistema já preenche a situação atual de cada área com o que está cadastrado — é só conferir e escrever as metas e os cuidados.')}</section>`
      : `${!ehAtual ? `<div class="faixa aviso">${icone('relogio')}<span>Você está vendo uma <b>versão antiga</b> (${esc(dataBR(p.data))}). <a href="#/pia/residente-${r.id}">Ver a atual</a>.</span></div>` : ''}
      ${vencido && ehAtual ? `<div class="faixa perigo">${icone('alerta')}<span><b>Revisão vencida</b> desde ${esc(dataBR(p.proxima_revisao))}. Reúna a equipe e clique em “Revisar”.</span></div>` : ''}
      <section class="cartao"><dl class="dados">${ddRes('Data do plano', dataBR(p.data))}${ddRes('Próxima revisão', p.proxima_revisao ? dataBR(p.proxima_revisao) : '')}
        ${ddRes('Feito por', nomeAutorDia({ autor_nome: p.autor_nome, criado_por: p.criado_por }))}${ddRes('Participaram', p.participantes, 'largo')}</dl></section>
      ${d.areas.map(([k, nome]) => { const a = p.areas[k] || {}; if (!a.situacao && !a.metas && !a.acoes) return '';
        return `<section class="cartao espaco"><div class="cartao-topo"><h2>${esc(nome)}</h2>${a.responsavel ? `<span class="pilula">${icone('usuario')}${esc(a.responsavel)}</span>` : ''}</div>
          <dl class="dados">${['situacao', 'metas', 'acoes'].map((cp) => ddRes(ROTULOS_PIA[cp], a[cp], 'largo')).join('')}</dl></section>`; }).join('')}
      ${p.obs ? `<section class="cartao espaco"><div class="cartao-topo"><h2>Observações</h2></div><p style="white-space:pre-line">${esc(p.obs)}</p></section>` : ''}
      <p class="so-impressao" style="margin-top:30px">_______________________________ Responsável técnico(a) &nbsp;&nbsp;&nbsp; _______________________________ Residente / família</p>`}
    ${d.versoes.length > 1 ? `<section class="cartao espaco nao-imprimir"><div class="cartao-topo"><h2>${icone('relogio')}Versões</h2></div><div class="linhas">
      ${d.versoes.map((v) => `<a class="linha" href="#/pia/residente-${r.id}-v${v.id}"><span class="meio"><b>${esc(dataBR(v.data))}${v.id === d.versoes[0].id ? ' (atual)' : ''}</b>
        <small>por ${esc(nomeAutorDia({ autor_nome: v.autor_nome, criado_por: v.criado_por }))}</small></span>${v.id === (p && p.id) ? '<span class="etiqueta marca">Aberta</span>' : icone('seta')}</a>`).join('')}</div></section>` : ''}`;
  if ($('#piaImprimir', c)) $('#piaImprimir', c).onclick = () => window.print();
  $('#piaRevisar', c).onclick = () => formPia(d);
}

// Revisar = salvar uma versão nova. Já vem preenchido com a versão atual (ou com a sugestão do sistema, se for a primeira)
function formPia(d) {
  const r = d.residente, base = d.versoes.length ? (d.atual && d.atual.id === d.versoes[0].id ? d.atual : null) : null;
  const j = modal(base ? 'Revisar o PIA' : 'Fazer o PIA', `
    <p class="mudo" style="margin-bottom:14px">${base ? 'Já vem com o plano atual: atualize o que mudou. Ao salvar, vira uma versão nova (a anterior fica guardada).' : 'A “situação atual” já vem sugerida com o que está cadastrado. Confira, e escreva as metas e os cuidados de cada área.'}</p>
    <div class="grade-campos">
      <label class="campo"><span>Data do plano</span><input type="date" id="piaData" max="${hojeIso()}"></label>
      <label class="campo"><span>Próxima revisão</span><input type="date" id="piaProx"></label>
      <label class="campo largo"><span>Quem participou</span><input id="piaPart" maxlength="500" placeholder="Ex.: enfermeira, fisioterapeuta, assistente social, a residente e a filha"></label>
    </div>
    ${d.areas.map(([k, nome, dica]) => `<fieldset style="margin-top:20px"><legend>${esc(nome)}</legend><p class="dica" style="margin:-8px 0 10px">${esc(dica)}</p><div class="grade-campos">
      <label class="campo largo"><span>${ROTULOS_PIA.situacao} <button type="button" class="btn peq fantasma" data-sugerir="${k}" style="margin-left:6px">${icone('estrela')}Usar a sugestão do sistema</button></span><textarea id="pia_${k}_situacao" maxlength="3000"></textarea></label>
      <label class="campo largo"><span>${ROTULOS_PIA.metas}</span><textarea id="pia_${k}_metas" maxlength="3000"></textarea></label>
      <label class="campo largo"><span>${ROTULOS_PIA.acoes}</span><textarea id="pia_${k}_acoes" maxlength="3000"></textarea></label>
      <label class="campo"><span>${ROTULOS_PIA.responsavel}</span><input id="pia_${k}_responsavel" maxlength="120" list="piaResp"></label>
    </div></fieldset>`).join('')}
    <label class="campo" style="margin-top:20px"><span>Observações gerais</span><textarea id="piaObs" maxlength="2000"></textarea></label>
    ${datalist('piaResp', RESP_PIA)}`, {
    tamanho: 'largo', sub: esc(r.nome),
    rodape: `<button type="button" class="btn" data-fechar>Cancelar</button><button type="button" class="btn primario" id="piaSalvar">${icone('check')}Salvar ${base ? 'nova versão' : 'o PIA'}</button>`,
    onAbrir: (el) => {
      $('#piaData', el).value = hojeIso();
      $('#piaProx', el).value = somarDiasIso(hojeIso(), d.revisar_dias);
      $('#piaPart', el).value = base ? base.participantes || '' : '';
      $('#piaObs', el).value = base ? base.obs || '' : '';
      for (const [k] of d.areas) for (const cp of ['situacao', 'metas', 'acoes', 'responsavel']) {
        $(`#pia_${k}_${cp}`, el).value = base ? (base.areas[k] || {})[cp] || '' : cp === 'situacao' ? (d.sugestao[k] || {}).situacao || '' : '';
      }
      el.addEventListener('click', (e) => { const b = e.target.closest('[data-sugerir]'); if (b) { e.preventDefault(); $(`#pia_${b.dataset.sugerir}_situacao`, el).value = (d.sugestao[b.dataset.sugerir] || {}).situacao || ''; } });
    },
  });
  $('#piaSalvar', j.el).onclick = (e) => botaoOcupado(e.currentTarget, async () => {
    const el = j.el;
    const areas = Object.fromEntries(d.areas.map(([k]) => [k, Object.fromEntries(['situacao', 'metas', 'acoes', 'responsavel'].map((cp) => [cp, $(`#pia_${k}_${cp}`, el).value.trim()]))]));
    if (!Object.values(areas).some((a) => a.metas || a.acoes)) throw new Error('Escreva as metas ou os cuidados de pelo menos uma área.');
    await api('POST', '/api/pia', { residente_id: r.id, data: $('#piaData', el).value, proxima_revisao: $('#piaProx', el).value, participantes: $('#piaPart', el).value, obs: $('#piaObs', el).value, areas });
    j.fechar(true); toast('PIA salvo.'); location.hash = `#/pia/residente-${r.id}`; rotear();
  });
}
