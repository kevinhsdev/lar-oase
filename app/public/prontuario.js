// Prontuário completo: uma página por residente juntando tudo (ficha, PIA, remédios, avaliações, vacinas, sinais vitais,
// consultas e diário do período), pensada para imprimir ou levar a uma consulta. Não grava nada: só lê o que já existe.
// Rota: #/prontuario/ID
'use strict';

let periodoPront = 30;
// Média, menor e maior de cada medida no período
function resumoSinais(itens, medidas) {
  const linhas = [['PA máxima', 'pa_sist', 0], ['PA mínima', 'pa_diast', 0], ['Temperatura', 'temperatura', 1], ['Glicemia', 'glicemia', 0], ['Saturação', 'saturacao', 0], ['Batimentos', 'fc', 0], ['Peso', 'peso', 1], ['Dor', 'dor', 0]];
  return linhas.map(([nome, k, casas]) => {
    const vs = itens.map((l) => l[k]).filter((v) => v != null);
    if (!vs.length) return '';
    const med = vs.reduce((a, b) => a + b, 0) / vs.length;
    const fora = itens.filter((l) => l.fora.includes(k)).length;
    return `<tr><td>${esc(nome)}</td><td class="num">${esc(numBR(med, casas))}</td><td class="num">${esc(numBR(Math.min(...vs), casas))}</td><td class="num">${esc(numBR(Math.max(...vs), casas))}</td>
      <td class="num">${vs.length}</td><td>${fora ? `<span class="etiqueta perigo">${fora} fora do normal</span>` : '<span class="fraco">—</span>'}</td><td class="fraco">${esc((medidas[k] || {}).unidade || '')}</td></tr>`;
  }).join('');
}

TELAS.prontuario = async (c, id) => {
  if (!/^\d+$/.test(String(id || ''))) { location.replace('#/residentes'); return; }
  const desde = somarDiasIso(hojeIso(), -periodoPront + 1);
  const [f, pia, rx, avs, vac, sv, dia, ag] = await Promise.all([
    api('GET', `/api/residentes/${id}`), api('GET', `/api/pia?residente=${id}`), api('GET', `/api/prescricoes?residente=${id}`),
    api('GET', `/api/avaliacoes?residente=${id}`), api('GET', `/api/vacinas?residente=${id}`), api('GET', `/api/sinais?residente=${id}&dias=${periodoPront}`),
    api('GET', `/api/ocorrencias?residente=${id}&de=${desde}&limite=500`), api('GET', `/api/agenda?residente=${id}`),
  ]);
  const r = f.residente;
  const cs = f.contatos;
  const consultas = ag.itens.filter((a) => a.data >= desde && a.data <= hojeIso() && a.situacao !== 'cancelado');
  const ultimaAv = (k) => avs.itens.find((a) => a.escala === k);
  const secao = (titulo, corpo) => `<section class="cartao espaco" style="break-inside:avoid-page"><div class="cartao-topo"><h2>${titulo}</h2></div>${corpo}</section>`;
  c.innerHTML = `
    <a class="voltar" href="#/residente/${r.id}">${icone('voltar')}Ficha de ${esc(r.nome)}</a>
    <div class="so-impressao cabecalho-impressao"><b>${esc(EU.config.nome_organizacao || SUBTITULO_APP)} — Prontuário</b><span>Impresso em ${esc(dataHoraBR(new Date().toISOString()))} por ${esc(EU.nome)}</span></div>
    <div class="cabecalho"><div><h1>Prontuário</h1><p class="sub">${esc(r.nome)} · período: ${esc(dataBR(desde))} a ${esc(dataBR(hojeIso()))}</p></div>
      <div class="acoes nao-imprimir">${segmentado([{ v: '30', rotulo: '30 dias' }, { v: '90', rotulo: '90 dias' }, { v: '365', rotulo: '1 ano' }], String(periodoPront), { classe: 'periodoPront', rotulo: 'Período' })}
        <button type="button" class="btn primario" id="prImprimirTudo">${icone('impressora')}Imprimir o prontuário</button></div></div>
    ${r.alergias ? `<div class="alerta-alergia">${icone('alerta')}<div><b>Alergias:</b> ${esc(r.alergias)}</div></div>` : ''}
    ${secao('Identificação', `<dl class="dados">${ddRes('Nome', r.nome)}${ddRes('Nascimento', r.dt_nasc ? `${dataBR(r.dt_nasc)} (${r.idade} anos)` : '')}${ddRes('Sexo', r.sexo === 'F' ? 'Feminino' : r.sexo === 'M' ? 'Masculino' : '')}
      ${ddRes('CPF', r.cpf)}${ddRes('Cartão SUS', r.cartao_sus)}${ddRes('Convênio', [r.convenio, r.convenio_numero].filter(Boolean).join(' · '))}
      ${ddRes('Entrada no lar', r.dt_entrada ? dataBR(r.dt_entrada) : '')}${ddRes('Quarto', [r.quarto, r.leito].filter(Boolean).join(' · leito '))}${ddRes('Situação', rotuloSituacao(r.situacao))}
      ${ddRes('Grau de dependência', r.grau_dependencia ? 'Grau ' + r.grau_dependencia : '')}${ddRes('Mobilidade', r.mobilidade)}${ddRes('Tipo sanguíneo', r.tipo_sanguineo)}
      ${ddRes('Diagnósticos', r.diagnosticos, 'largo')}${ddRes('Dieta', r.dieta)}${ddRes('Médico(a)', [r.medico, r.medico_tel].filter(Boolean).join(' · '))}
      ${ddRes('Responsável', cs.filter((x) => x.responsavel).map((x) => `${x.nome} (${x.parentesco || '—'}) ${x.telefone || ''}`).join('; '), 'largo')}</dl>`)}
    ${secao('Remédios em uso', rx.itens.length ? `<table class="tabela"><thead><tr><th>Remédio</th><th>Dose</th><th>Via</th><th>Quando</th><th>Desde</th></tr></thead><tbody>
      ${rx.itens.map((p) => `<tr><td><b>${esc(p.medicamento)}</b>${p.obs ? `<br><small class="fraco">${esc(p.obs)}</small>` : ''}</td><td>${esc(p.dose)}</td><td>${esc(p.via)}</td>
        <td>${p.se_necessario ? 'Se necessário' + (p.condicao ? ': ' + esc(p.condicao) : '') : esc(String(p.horarios || '').replace(/,/g, ', '))}</td><td class="num">${esc(dataBR(p.inicio))}</td></tr>`).join('')}</tbody></table>` : '<p class="mudo">Nenhum remédio em uso.</p>')}
    ${secao('Avaliações (últimas)', `<div style="display:flex;flex-wrap:wrap;gap:8px">${['katz', 'braden', 'morse'].map((k) => { const a = ultimaAv(k);
      return `<span class="pilula">${esc(avs.escalas[k].titulo)}: ${a ? `<b>${a.pontuacao}</b> — ${esc(a.classificacao)} <span class="fraco">(${esc(dataBR(a.data))})</span>` : '<span class="fraco">não avaliado</span>'}</span>`; }).join('')}</div>`)}
    ${secao(`Sinais vitais no período (${plural(sv.itens.length, 'medida', 'medidas')})`, sv.itens.length ? `<table class="tabela"><thead><tr><th>Medida</th><th>Média</th><th>Menor</th><th>Maior</th><th>Nº</th><th>Avisos</th><th></th></tr></thead><tbody>${resumoSinais(sv.itens, sv.medidas)}</tbody></table>
      <p class="dica nao-imprimir" style="margin-top:8px"><a href="#/sinais/residente-${r.id}">Ver os gráficos</a></p>` : '<p class="mudo">Nenhuma medida no período.</p>')}
    ${pia.atual ? secao(`PIA — Plano Individual de Atenção (${esc(dataBR(pia.atual.data))})`, pia.areas.map(([k, nome]) => { const a = pia.atual.areas[k] || {}; if (!a.metas && !a.acoes) return '';
      return `<p style="margin-bottom:8px"><b>${esc(nome)}:</b> ${esc(a.metas || '')}${a.acoes ? ` — <i>${esc(a.acoes)}</i>` : ''}${a.responsavel ? ` <span class="fraco">(${esc(a.responsavel)})</span>` : ''}</p>`; }).join(''))
      : secao('PIA — Plano Individual de Atenção', '<p class="mudo">Ainda não há PIA.</p>')}
    ${secao('Consultas, exames e visitas no período', consultas.length ? `<ul class="limpa historico">${consultas.map((a) => `<li><time>${esc(dataBR(a.data))}</time><span><b>${esc(a.titulo)}</b>${a.local ? ' · ' + esc(a.local) : ''}
      ${a.situacao === 'feito' ? ` — <span class="etiqueta ok">Feito</span>${a.resultado ? ' ' + esc(a.resultado) : ''}` : ' — <span class="etiqueta neutro">Agendado</span>'}</span></li>`).join('')}</ul>` : '<p class="mudo">Nada no período.</p>')}
    ${secao('Vacinas', vac.itens.length ? `<ul class="limpa historico">${vac.itens.slice(0, 12).map((v) => `<li><time>${esc(dataBR(v.data))}</time><span><b>${esc(v.vacina)}</b>${v.dose ? ' · ' + esc(v.dose) : ''}${v.lote ? ' · lote ' + esc(v.lote) : ''}</span></li>`).join('')}</ul>` : '<p class="mudo">Nenhuma vacina registrada.</p>')}
    ${secao(`Diário no período (${plural(dia.itens.length, 'anotação', 'anotações')})`, dia.itens.length ? `<ul class="limpa historico">${dia.itens.map((o) => `<li><time>${esc(dataBR(o.data))} ${esc(o.hora)}</time><span>
      <b>${esc((TIPOS_DIA[o.tipo] || {}).nome || o.tipo)}</b>${o.gravidade !== 'normal' ? ` <span class="etiqueta ${o.gravidade === 'grave' ? 'perigo' : 'aviso'}">${o.gravidade === 'grave' ? 'Grave' : 'Atenção'}</span>` : ''} — ${esc(o.texto)}
      <span class="fraco">(${esc(nomeAutorDia(o))})</span></span></li>`).join('')}</ul>` : '<p class="mudo">Nada anotado no período.</p>')}`;
  $('#prImprimirTudo', c).onclick = () => window.print();
  ligarSegmentado($('.periodoPront', c), (v) => { periodoPront = Number(v); rotear(); });
};
