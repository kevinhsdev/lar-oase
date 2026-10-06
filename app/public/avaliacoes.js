// Avaliações: Katz (independência), Braden (risco de ferida) e Morse (risco de queda). Painel de todos e o histórico de cada um.
// Rotas: #/avaliacoes · #/avaliacoes/pendentes · #/avaliacoes/residente-ID
'use strict';

const ORDEM_ESC = ['katz', 'braden', 'morse'];
function celulaAval(u, escalas, chave) {
  if (!u) return `<span class="etiqueta neutro">Não avaliado</span>`;
  return `<b class="num">${u.pontuacao}</b><span class="fraco">/${escalas[chave].maximo}</span><br><span class="etiqueta ${u.cor}">${esc(u.classificacao)}</span>
    <br><small class="${u.vencida ? '' : 'fraco'}" style="${u.vencida ? 'color:var(--aviso);font-weight:600' : ''}">${u.vencida ? 'Reavaliar · ' : ''}${esc(dataBR(u.data))}</small>`;
}

TELAS.avaliacoes = async (c, arg) => {
  if (/^residente-\d+$/.test(arg || '')) return historicoAvaliacoes(c, Number(arg.split('-')[1]));
  const d = await api('GET', '/api/avaliacoes/painel');
  let filtro = arg === 'pendentes' ? 'pendentes' : arg === 'risco' ? 'risco' : 'todos';
  c.innerHTML = `
    <div class="so-impressao cabecalho-impressao"><b>${esc(EU.config.nome_organizacao || SUBTITULO_APP)} — Avaliações</b><span>Impresso em ${esc(dataHoraBR(new Date().toISOString()))}</span></div>
    <div class="cabecalho"><div><h1>Avaliações</h1><p class="sub">Katz, Braden e Morse de cada residente · ${d.pendentes ? `<b>${plural(d.pendentes, 'para fazer ou reavaliar', 'para fazer ou reavaliar')}</b>` : 'tudo em dia'}${d.riscos ? ` · ${plural(d.riscos, 'risco alto', 'riscos altos')}` : ''}</p></div>
      <div class="acoes"><button type="button" class="btn" id="avImprimir">${icone('impressora')}Imprimir</button></div></div>
    <div class="grade-3" style="margin-bottom:18px">${ORDEM_ESC.map((k) => `<div class="cartao"><h3>${esc(d.escalas[k].titulo)}</h3><p class="mudo" style="margin-top:6px;font-size:13.5px">${esc(d.escalas[k].explica)} Reavaliar a cada ${d.escalas[k].reavaliar} dias.</p></div>`).join('')}</div>
    ${d.linhas.length ? `<div class="barra-ferramentas nao-imprimir">${segmentado([{ v: 'todos', rotulo: 'Todos', cont: d.linhas.length },
      { v: 'pendentes', rotulo: 'Fazer / reavaliar', cont: d.linhas.filter((l) => Object.values(l.ultimas).some((u) => !u || u.vencida)).length },
      { v: 'risco', rotulo: 'Risco alto', cont: d.linhas.filter((l) => Object.values(l.ultimas).some((u) => u && u.cor === 'perigo')).length }], filtro, { classe: 'filtroAv', rotulo: 'Filtrar' })}</div>
      <div id="avTabela"></div>` : `<div class="cartao">${vazio('saude', 'Ninguém no lar', 'Os residentes no lar aparecem aqui.')}</div>`}`;
  $('#avImprimir', c).onclick = () => window.print();
  if (!d.linhas.length) return;
  const area = $('#avTabela', c);
  let visAv = d.linhas;
  const celulaDocAv = (u, k) => (!u ? '<span class="doc-vazio">não avaliado</span>'
    : `<b>${u.pontuacao}</b>/${d.escalas[k].maximo} — ${esc(u.classificacao)}<small>${esc(dataBR(u.data))}${u.vencida ? ' · ' : ''}</small>${u.vencida ? docMarca('Reavaliar') : ''}`);
  definirImpressao(() => ({
    titulo: 'Quadro de avaliações geriátricas',
    sub: `${{ todos: 'Todos os residentes no lar', pendentes: 'Para fazer ou reavaliar', risco: 'Com risco alto' }[filtro]} · ${plural(visAv.length, 'residente', 'residentes')}`,
    corpo: docTabela([{ t: 'Residente', w: '25%' }, ...ORDEM_ESC.map((k) => ({ t: d.escalas[k].titulo, w: '25%' }))],
      visAv.map((l) => [`<b>${esc(l.nome)}</b>${l.grau_dependencia ? `<small>Grau ${esc(l.grau_dependencia)} de dependência</small>` : ''}`, ...ORDEM_ESC.map((k) => celulaDocAv(l.ultimas[k], k))]),
      { vazio: 'Nenhum residente neste filtro.' })
      + docNota(ORDEM_ESC.map((k) => `<b>${esc(d.escalas[k].nome)}</b>: ${esc(d.escalas[k].explica)} Reavaliar a cada ${d.escalas[k].reavaliar} dias.`).join('<br>')),
  }));
  const desenhar = () => {
    const vis = d.linhas.filter((l) => filtro === 'todos' || (filtro === 'pendentes' ? Object.values(l.ultimas).some((u) => !u || u.vencida) : Object.values(l.ultimas).some((u) => u && u.cor === 'perigo')));
    visAv = vis;
    area.innerHTML = vis.length ? `<div class="tabela-caixa"><table class="tabela"><thead><tr><th>Residente</th>${ORDEM_ESC.map((k) => `<th>${esc(d.escalas[k].nome)}</th>`).join('')}<th></th></tr></thead><tbody>
      ${vis.map((l) => `<tr><td><a href="#/avaliacoes/residente-${l.id}" style="display:flex;align-items:center;gap:10px;color:var(--texto);font-weight:600">${avatar(l.nome, 'p')}${esc(l.apelido || l.nome)}</a>
        ${l.grau_dependencia ? `<small class="fraco">Grau ${esc(l.grau_dependencia)}</small>` : ''}</td>
        ${ORDEM_ESC.map((k) => `<td>${celulaAval(l.ultimas[k], d.escalas, k)}<br><button type="button" class="btn peq fantasma nao-imprimir" data-avaliar="${l.id}" data-esc="${k}" style="margin-top:4px">${icone('editar')}${l.ultimas[k] ? 'Reavaliar' : 'Avaliar'}</button></td>`).join('')}
        <td class="acoes-td nao-imprimir"><a class="btn peq fantasma" href="#/avaliacoes/residente-${l.id}">Histórico</a></td></tr>`).join('')}</tbody></table></div>`
      : `<div class="cartao">${vazio('check', 'Nada por aqui', 'Nenhum residente neste filtro.')}</div>`;
  };
  ligarSegmentado($('.filtroAv', c), (v) => { filtro = v; desenhar(); });
  area.addEventListener('click', (e) => {
    const b = e.target.closest('[data-avaliar]');
    if (!b) return;
    const l = d.linhas.find((x) => x.id === +b.dataset.avaliar);
    formAvaliacao(l, b.dataset.esc, d.escalas, l.ultimas[b.dataset.esc]);
  });
  desenhar();
};

async function historicoAvaliacoes(c, rid) {
  const d = await api('GET', `/api/avaliacoes?residente=${rid}`);
  const r = d.residente;
  c.innerHTML = `
    <a class="voltar" href="#/residente/${r.id}">${icone('voltar')}Ficha de ${esc(r.nome)}</a>
    <div class="cabecalho"><div><h1>Avaliações</h1><p class="sub">${esc(r.nome)} · ${plural(d.itens.length, 'avaliação', 'avaliações')}</p></div>
      <div class="acoes"><a class="btn nao-imprimir" href="#/avaliacoes">${icone('saude')}Todas</a><button type="button" class="btn" id="haImprimir">${icone('impressora')}Imprimir</button></div></div>
    <div class="grade-3">${ORDEM_ESC.map((k) => {
      const lista = d.itens.filter((a) => a.escala === k);
      return `<section class="cartao"><div class="cartao-topo"><h2>${esc(d.escalas[k].nome)}</h2><button type="button" class="btn peq nao-imprimir" data-avaliar-h="${k}">${icone('mais')}${lista.length ? 'Reavaliar' : 'Avaliar'}</button></div>
        ${lista.length ? `<div class="linhas">${lista.map((a, i) => { const ant = lista[i + 1]; const seta = ant ? (a.pontuacao > ant.pontuacao ? '↑' : a.pontuacao < ant.pontuacao ? '↓' : '=') : '';
          return `<div class="linha"><span class="meio"><b>${a.pontuacao}/${d.escalas[k].maximo} ${seta ? `<span class="fraco">${seta}</span>` : ''}</b><small>${esc(dataBR(a.data))} · ${esc(nomeAutorDia({ autor_nome: a.autor_nome, criado_por: a.criado_por }))}${a.obs ? ' · ' + esc(a.obs) : ''}</small></span>
            <span class="etiqueta ${a.cor}">${esc(a.classificacao)}</span></div>`; }).join('')}</div>` : '<p class="mudo">Nenhuma avaliação ainda.</p>'}</section>`;
    }).join('')}</div>`;
  $('#haImprimir', c).onclick = () => window.print();
  definirImpressao(() => ({
    titulo: 'Histórico de avaliações', sub: `${r.nome} · ${plural(d.itens.length, 'avaliação', 'avaliações')}`,
    corpo: ORDEM_ESC.map((k) => { const lista = d.itens.filter((a) => a.escala === k);
      return docSecao(d.escalas[k].titulo, docTabela([{ t: 'Data', w: '13%' }, { t: 'Pontos', w: '11%', a: 'dir' }, { t: 'Resultado', w: '24%' }, { t: 'Observação / cuidados', w: '32%' }, { t: 'Avaliado por', w: '20%' }],
        lista.map((a, i) => { const ant = lista[i + 1];
          return [esc(dataBR(a.data)), `<b>${a.pontuacao}</b>/${d.escalas[k].maximo}${ant ? `<small>${a.pontuacao > ant.pontuacao ? 'subiu' : a.pontuacao < ant.pontuacao ? 'desceu' : 'igual'}</small>` : ''}`,
            esc(a.classificacao), esc(a.obs || ''), esc(nomeAutorDia({ autor_nome: a.autor_nome, criado_por: a.criado_por }))]; }),
        { vazio: 'Nenhuma avaliação ainda.' }) + docNota(esc(d.escalas[k].explica)), 'junta'); }).join(''),
  }));
  c.addEventListener('click', (e) => {
    const b = e.target.closest('[data-avaliar-h]');
    if (b) formAvaliacao(r, b.dataset.avaliarH, d.escalas, d.itens.find((a) => a.escala === b.dataset.avaliarH));
  });
}

// O questionário: um grupo de opções por item; a soma e a classificação aparecem enquanto marca
function formAvaliacao(r, esc_, escalas, anterior) {
  const e = escalas[esc_];
  // Mesmas faixas do servidor (rotas/avaliacoes.js), só para mostrar enquanto marca; quem grava é o servidor
  const classe = (p) => (esc_ === 'katz' ? (p >= 6 ? ['Independente', 'ok'] : p >= 3 ? ['Dependência moderada', 'aviso'] : ['Dependência importante', 'perigo'])
    : esc_ === 'braden' ? (p <= 9 ? ['Risco muito alto', 'perigo'] : p <= 12 ? ['Risco alto', 'perigo'] : p <= 14 ? ['Risco moderado', 'aviso'] : p <= 18 ? ['Risco baixo', 'info'] : ['Sem risco', 'ok'])
      : (p >= 45 ? ['Risco alto', 'perigo'] : p >= 25 ? ['Risco moderado', 'aviso'] : ['Risco baixo', 'ok']));
  const j = modal(`${e.titulo}`, `
    <p class="mudo" style="margin-bottom:14px">${esc(e.explica)}${anterior ? ' As respostas já vêm marcadas como na última avaliação: confira e mude o que mudou.' : ''}</p>
    ${e.itens.map(([k, rotulo, opcoes], i) => `<div class="campo" style="margin-bottom:14px"><span class="rotulo obrig">${i + 1}. ${esc(rotulo)}</span>
      <div class="opcoes-grau" role="radiogroup" aria-label="${esc(rotulo)}">${opcoes.map(([txt, v], n) => `<label class="opcao-grau"><input type="radio" name="av_${k}" id="av_${k}_${n}" value="${v}"><span><b>${esc(txt)}</b><small>${v} ${v === 1 ? 'ponto' : 'pontos'}</small></span></label>`).join('')}</div></div>`).join('')}
    <div class="grade-campos"><label class="campo"><span>Data</span><input type="date" id="avData" max="${hojeIso()}" value="${hojeIso()}"></label>
      <label class="campo meio"><span>Observação / cuidados combinados</span><input id="avObs" maxlength="500" placeholder="Ex.: mudança de posição de 2 em 2 horas"></label></div>`, {
    tamanho: 'largo', sub: esc(r.nome), rascunho: false,
    rodape: `<span class="esq" id="avSoma" aria-live="polite"></span><button type="button" class="btn" data-fechar>Cancelar</button><button type="button" class="btn primario" id="avSalvar">${icone('check')}Salvar avaliação</button>`,
    onAbrir: (el) => {
      if (anterior) for (const [k, , opcoes] of e.itens) { const n = opcoes.findIndex(([, v]) => v === anterior.respostas[k]); if (n >= 0) $(`#av_${k}_${n}`, el).checked = true; }
      const somar = () => {
        const marcados = e.itens.map(([k]) => $(`input[name="av_${k}"]:checked`, el));
        const faltam = marcados.filter((x) => !x).length;
        const total = marcados.reduce((s, x) => s + (x ? Number(x.value) : 0), 0);
        const [cl, cor] = classe(total);
        $('#avSoma', el).innerHTML = faltam ? `<span class="mudo">Faltam ${plural(faltam, 'resposta', 'respostas')}</span>` : `<b>${total}/${e.maximo}</b> <span class="etiqueta ${cor}">${esc(cl)}</span>`;
      };
      el.addEventListener('change', somar); somar();
    },
  });
  $('#avSalvar', j.el).onclick = (ev) => botaoOcupado(ev.currentTarget, async () => {
    const respostas = {};
    for (const [k, rotulo] of e.itens) { const x = $(`input[name="av_${k}"]:checked`, j.el); if (!x) throw new Error(`Responda: ${rotulo}`); respostas[k] = Number(x.value); }
    const res = await api('POST', '/api/avaliacoes', { residente_id: r.id, escala: esc_, data: $('#avData', j.el).value, obs: $('#avObs', j.el).value, respostas });
    j.fechar(true); toast(`${e.nome}: ${res.pontuacao} — ${res.classificacao}.`, res.cor === 'perigo'); rotear();
  });
}
