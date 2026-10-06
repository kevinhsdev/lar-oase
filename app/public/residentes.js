// Residentes: lista (cartões ou lista), ficha em estilo perfil, familiares/contatos, situação e impressão.
// Modelo de "lista → ficha com sub-lista" para os próximos módulos (ROTA_PAI.residente acende o grupo certo no menu).
'use strict';

const SITUACOES_RES = { no_lar: 'No lar', hospitalizado: 'Hospitalizado(a)', saiu: 'Saiu do lar', faleceu: 'Faleceu' };
const CLASSE_SITUACAO = { no_lar: 'ok', hospitalizado: 'aviso', saiu: 'neutro', faleceu: 'luto' };
const rotuloSituacao = (s) => SITUACOES_RES[s] || s;
const etiquetaSituacao = (s) => `<span class="etiqueta ${CLASSE_SITUACAO[s] || ''}">${esc(rotuloSituacao(s))}</span>`;
// Graus de dependência da RDC 502/2021 da Anvisa (norma das instituições de longa permanência para idosos)
const GRAUS_RES = {
  I: 'Independente, mesmo que use bengala, andador ou cadeira de rodas.',
  II: 'Precisa de ajuda em até três atividades do dia a dia (comer, se locomover, higiene…), sem problema de memória ou com alteração controlada.',
  III: 'Precisa de ajuda em todas as atividades do dia a dia e/ou tem comprometimento cognitivo (memória, orientação).',
};
const MOBILIDADES = ['Independente', 'Bengala', 'Andador', 'Cadeira de rodas', 'Acamado(a)'];
const TIPOS_SANGUE_RES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const ESTADOS_CIVIS = ['Solteira(o)', 'Casada(o)', 'União estável', 'Divorciada(o)', 'Viúva(o)'];
const DIETAS = ['Livre', 'Hipossódica', 'Para diabético', 'Pastosa', 'Líquida', 'Enteral (sonda)', 'Sem lactose', 'Sem glúten', 'Renal'];
const CONVENIOS = ['SUS', 'Particular', 'Unimed', 'Amil', 'Bradesco Saúde', 'SulAmérica', 'Hapvida NotreDame', 'Prevent Senior'];
const RELIGIOES = ['Luterana', 'Católica', 'Evangélica', 'Espírita', 'Sem religião'];
const PARENTESCOS_RES = ['Filha', 'Filho', 'Neta', 'Neto', 'Sobrinha', 'Sobrinho', 'Irmã', 'Irmão', 'Nora', 'Genro', 'Esposa', 'Marido', 'Amiga(o)', 'Curador(a)', 'Assistente social'];
const FILTROS_RES = ['atuais', 'no_lar', 'hospitalizado', 'historico', 'todos'];

// Lista guardada por 30 s (a busca rápida do topo usa a mesma)
let cacheResidentes = null, cacheResidentesEm = 0;
async function residentesParaBusca() {
  if (!cacheResidentes || Date.now() - cacheResidentesEm > 30000) { cacheResidentes = await api('GET', '/api/residentes'); cacheResidentesEm = Date.now(); }
  return cacheResidentes;
}
const esquecerResidentes = () => { cacheResidentes = null; };
// Avatar com a foto, se tiver; sem foto, as iniciais coloridas de sempre.
// O ?v= muda a cada foto nova: o navegador guarda a imagem e só baixa de novo quando ela for trocada.
const avatarRes = (r, tam = '', extra = '') => (r.foto_em
  ? `<span class="avatar com-foto ${tam} ${extra}" aria-hidden="true"><img src="/api/residentes/${r.id}/foto?v=${encodeURIComponent(r.foto_em)}" alt="" loading="lazy" decoding="async"></span>`
  : avatar(r.nome, tam, extra));
const inativoRes = (r) => r.situacao === 'saiu' || r.situacao === 'faleceu';
// No papel, sem o "(a)": usa o sexo da ficha quando houver
const situacaoNoPapel = (r) => (r.situacao === 'hospitalizado' && r.sexo ? (r.sexo === 'F' ? 'Hospitalizada' : 'Hospitalizado') : rotuloSituacao(r.situacao));
const passaFiltroRes = (r, f) => (f === 'todos' ? true : f === 'atuais' ? !inativoRes(r) : f === 'historico' ? inativoRes(r) : r.situacao === f);
let vistaRes = (() => { try { return localStorage.getItem('lar-vista-res') === 'lista' ? 'lista' : 'cartoes'; } catch { return 'cartoes'; } })();
let buscaRes = '';

// ───────────── lista ─────────────
function cartaoResidente(r) {
  const inativo = inativoRes(r);
  const sub = [r.apelido, inativo && r.situacao_desde ? `${rotuloSituacao(r.situacao)} em ${dataBR(r.situacao_desde)}` : ''].filter(Boolean).join(' · ');
  return `<article class="res-cartao${inativo ? ' inativo' : ''}">
    ${r.situacao !== 'no_lar' ? `<span class="situ">${etiquetaSituacao(r.situacao)}</span>` : ''}
    <div class="cab">${avatarRes(r, 'g', inativo ? 'apagado' : '')}<div class="nome"><a href="#/residente/${r.id}">${esc(r.nome)}</a>${sub ? `<small>${esc(sub)}</small>` : ''}</div></div>
    <div class="pilulas">${r.idade != null ? `<span class="pilula">${r.idade} anos</span>` : ''}${r.quarto ? `<span class="pilula">${icone('cama')}Quarto ${esc(r.quarto)}${r.leito ? ' · ' + esc(r.leito) : ''}</span>` : ''}${
      r.grau_dependencia ? `<span class="pilula">Grau ${esc(r.grau_dependencia)}</span>` : ''}${r.alergias ? `<span class="etiqueta perigo" title="Alergia: ${esc(r.alergias)}">${icone('alerta')}Alergia</span>` : ''}</div>
    <div class="resp">${r.resp_nome ? `<span class="meio"><b>${esc(r.resp_nome)}</b>${r.resp_parentesco ? ' · ' + esc(r.resp_parentesco) : ''}</span>${foneLink(r.resp_telefone)}`
      : '<span class="meio fraco">Nenhum familiar cadastrado</span>'}</div>
  </article>`;
}
function linhaResidente(r) {
  const inativo = inativoRes(r);
  return `<div class="linha">${avatarRes(r, 'p', inativo ? 'apagado' : '')}
    <span class="meio"><a class="nome-link" href="#/residente/${r.id}">${esc(r.nome)}</a><small>${esc(r.apelido || '')}${r.alergias ? ' · alergia' : ''}</small></span>
    <span class="col sempre">${r.idade != null ? r.idade + ' anos' : '—'}</span>
    <span class="col">${r.quarto ? 'Quarto ' + esc(r.quarto) + (r.leito ? ' · ' + esc(r.leito) : '') : '—'}</span>
    <span class="col">${r.grau_dependencia ? 'Grau ' + esc(r.grau_dependencia) : '—'}</span>
    <span class="col larga">${r.resp_nome ? esc(r.resp_nome) + (r.resp_telefone ? ' · ' + foneLink(r.resp_telefone, false) : '') : '<span class="fraco">sem familiar</span>'}</span>
    ${r.situacao !== 'no_lar' ? etiquetaSituacao(r.situacao) : ''}</div>`;
}

TELAS.residentes = async (c, arg) => {
  esquecerResidentes();
  const lista = await residentesParaBusca();
  let filtro = FILTROS_RES.includes(arg) ? arg : 'atuais';
  const conta = (f) => lista.filter((r) => passaFiltroRes(r, f)).length;
  const n = Object.fromEntries(FILTROS_RES.map((f) => [f, conta(f)]));
  definirBadge('residentes', n.hospitalizado);
  c.innerHTML = `
    <div class="so-impressao cabecalho-impressao"><b>${esc(EU.config.nome_organizacao || SUBTITULO_APP)} — Residentes</b><span>Impresso em ${esc(dataHoraBR(new Date().toISOString()))}</span></div>
    <div class="cabecalho"><div><h1>Residentes</h1>
      <p class="sub">${plural(n.no_lar, 'pessoa no lar', 'pessoas no lar')}${n.hospitalizado ? ` · ${n.hospitalizado} hospitalizado(s)` : ''}${n.historico ? ` · ${n.historico} no histórico` : ''}</p></div>
      <div class="acoes"><button type="button" class="btn" id="resImprimir">${icone('impressora')}Imprimir lista</button>
      <button type="button" class="btn primario" id="resNovo">${icone('mais')}Novo residente</button></div></div>
    ${lista.length ? `<div class="barra-ferramentas">
      <label class="busca">${icone('busca')}<input type="search" id="resBusca" placeholder="Buscar por nome, apelido, quarto ou familiar" autocomplete="off" aria-label="Buscar residentes"></label>
      ${segmentado([
        { v: 'atuais', rotulo: 'Atuais', cont: n.atuais }, { v: 'no_lar', rotulo: 'No lar', cont: n.no_lar },
        { v: 'hospitalizado', rotulo: 'Hospitalizados', cont: n.hospitalizado }, { v: 'historico', rotulo: 'Histórico', cont: n.historico }, { v: 'todos', rotulo: 'Todos', cont: n.todos },
      ], filtro, { rotulo: 'Filtrar residentes', classe: 'filtroRes' })}
      ${segmentado([{ v: 'cartoes', icone: 'grade', titulo: 'Ver em cartões' }, { v: 'lista', icone: 'lista', titulo: 'Ver em lista' }], vistaRes, { classe: 'so-icones vistaRes', rotulo: 'Modo de ver' })}
    </div><div id="resArea"></div>`
    : `<section class="cartao">${vazio('residentes', 'Nenhum residente cadastrado ainda', 'Comece pela ficha de cada pessoa que mora no lar. Dá para completar os dados aos poucos: só o nome é obrigatório.',
      `<button type="button" class="btn primario" data-novo>${icone('mais')}Cadastrar residente</button>`)}</section>`}`;
  $('#resNovo', c).onclick = () => formResidente(null);
  $('#resImprimir', c).onclick = () => window.print();
  for (const b of $$('[data-novo]', c)) b.onclick = () => formResidente(null);
  if (!lista.length) return;

  const area = $('#resArea', c), busca = $('#resBusca', c);
  busca.value = buscaRes;
  let visiveis = lista;
  // Papel: a relação de quem está na tela agora (mesmo filtro e busca), em tabela
  const ROTULO_FILTRO = { atuais: 'Residentes atuais (no lar e hospitalizados)', no_lar: 'No lar', hospitalizado: 'Hospitalizados', historico: 'Histórico (saíram ou faleceram)', todos: 'Todos os cadastrados' };
  definirImpressao(() => ({
    titulo: 'Relação de residentes',
    sub: `${ROTULO_FILTRO[filtro]} · ${plural(visiveis.length, 'pessoa', 'pessoas')}${busca.value.trim() ? ` · busca: “${busca.value.trim()}”` : ''}`,
    corpo: docTabela([{ t: 'Nº', w: '4%', a: 'dir' }, { t: 'Residente', w: '25%' }, { t: 'Nascimento', w: '12%' }, { t: 'Quarto', w: '8%' }, { t: 'Grau', w: '6%', a: 'centro' },
      { t: 'Entrada', w: '11%' }, { t: 'Responsável', w: '21%' }, { t: 'Situação', w: '13%' }],
    visiveis.map((r, i) => [String(i + 1), `<b>${esc(r.nome)}</b>${r.apelido ? `<small>“${esc(r.apelido)}”</small>` : ''}${r.alergias ? `<small>Alergia: ${esc(r.alergias)}</small>` : ''}`,
      r.dt_nasc ? `${esc(dataBR(r.dt_nasc))}<small>${r.idade} anos</small>` : '', esc([r.quarto, r.leito].filter(Boolean).join(' · ')), esc(r.grau_dependencia || ''),
      esc(r.dt_entrada ? dataBR(r.dt_entrada) : ''), r.resp_nome ? `${esc(r.resp_nome)}${r.resp_parentesco ? ` <span class="doc-vazio">(${esc(r.resp_parentesco)})</span>` : ''}<small>${esc(r.resp_telefone || '')}</small>` : '',
      `<span class="doc-nw">${esc(situacaoNoPapel(r))}</span>` + (r.situacao !== 'no_lar' && r.situacao_desde ? `<small>desde ${esc(dataBR(r.situacao_desde))}</small>` : '')]),
    { vazio: 'Nenhum residente neste filtro.' }),
  }));
  const desenhar = (animar) => {
    const q = norm(busca.value.trim());
    const vis = lista.filter((r) => passaFiltroRes(r, filtro) && (!q || norm([r.nome, r.apelido, r.quarto ? 'quarto ' + r.quarto : '', r.resp_nome, r.cpf].join(' ')).includes(q)));
    visiveis = vis;
    if (!vis.length) {
      area.innerHTML = `<div class="cartao">${q ? vazio('busca', 'Ninguém encontrado', `Nenhum residente combina com “${esc(busca.value.trim())}” neste filtro.`, '<button type="button" class="btn" data-limpar>Limpar a busca</button>')
        : vazio('residentes', 'Nada por aqui', filtro === 'hospitalizado' ? 'Ninguém hospitalizado no momento.' : filtro === 'historico' ? 'Quem sair do lar ou falecer continua com a ficha guardada aqui.' : 'Nenhum residente neste filtro.')}</div>`;
      const l = $('[data-limpar]', area); if (l) l.onclick = () => { busca.value = ''; buscaRes = ''; desenhar(false); busca.focus(); };
      return;
    }
    area.innerHTML = vistaRes === 'lista' ? `<div class="cartao res-lista" style="padding:6px">${vis.map(linhaResidente).join('')}</div>` : `<div class="res-grade">${vis.map(cartaoResidente).join('')}</div>`;
    if (animar && !q) cascata(area.firstElementChild);
  };
  busca.addEventListener('input', () => { buscaRes = busca.value; desenhar(false); }); // digitação: sem animação
  ligarSegmentado($('.filtroRes', c), (v) => { filtro = v; history.replaceState(null, '', `#/residentes/${v}`); desenhar(false); });
  ligarSegmentado($('.vistaRes', c), (v) => { vistaRes = v; try { localStorage.setItem('lar-vista-res', v); } catch { /* ignora */ } desenhar(false); });
  desenhar(true);
};

// ───────────── ficha ─────────────
const ddRes = (rotulo, valor, classe = '') => `<div class="${classe}"><dt>${esc(rotulo)}</dt><dd class="${valor ? '' : 'vazio-dd'}">${valor ? esc(valor) : 'não informado'}</dd></div>`;
const ddResHtml = (rotulo, html, classe = '') => `<div class="${classe}"><dt>${esc(rotulo)}</dt><dd class="${html ? '' : 'vazio-dd'}">${html || 'não informado'}</dd></div>`;

function caixaContato(tipo, ct, classe = '') {
  if (!ct) {
    return `<div class="caixa-contato falta ${classe}"><div class="meio"><div class="tipo">${esc(tipo)}</div>
      <small>${tipo === 'Responsável' ? 'Nenhum responsável marcado.' : 'Nenhum contato de emergência marcado.'} Edite um familiar abaixo e marque a opção.</small></div></div>`;
  }
  return `<div class="caixa-contato ${classe}">${avatar(ct.nome, 'g')}<div class="meio"><div class="tipo">${esc(tipo)}</div><b>${esc(ct.nome)}</b>
    <small>${[ct.parentesco, ct.telefone].filter(Boolean).map((x) => `<span class="nowrap">${esc(x)}</span>`).join(' · ') || 'sem telefone'}</small></div>
    ${ct.telefone ? `<a class="btn ${classe.includes('emergencia') ? 'perigo' : 'primario'} nao-imprimir" href="tel:+55${esc(soDigitos(ct.telefone))}">${icone('telefone')}Ligar</a>` : ''}</div>`;
}

function itemContato(ct) {
  return `<div class="contato">${avatar(ct.nome, 'p')}<div class="meio"><b>${esc(ct.nome)}</b><span class="etqs">${ct.parentesco ? `<span class="etiqueta neutro">${esc(ct.parentesco)}</span>` : ''}${
    ct.responsavel ? '<span class="etiqueta marca">Responsável</span>' : ''}${ct.emergencia ? '<span class="etiqueta perigo">Emergência</span>' : ''}</span>
    <div class="det">${foneLink(ct.telefone)}${foneLink(ct.telefone2)}${ct.email ? `<a href="mailto:${esc(ct.email)}">${esc(ct.email)}</a>` : ''}${ct.endereco ? `<span>${esc(ct.endereco)}</span>` : ''}${ct.obs ? `<span class="fraco">${esc(ct.obs)}</span>` : ''}</div></div>
    <div class="acoes nao-imprimir"><button type="button" class="btn-icone" data-editar-contato="${ct.id}" title="Editar" aria-label="Editar ${esc(ct.nome)}">${icone('editar')}</button>
    <button type="button" class="btn-icone" data-remover-contato="${ct.id}" title="Remover" aria-label="Remover ${esc(ct.nome)}">${icone('lixo')}</button></div></div>`;
}

TELAS.residente = async (c, id) => {
  if (!/^\d+$/.test(String(id || ''))) { location.replace('#/residentes'); return; }
  const [d, dia, ag, rx] = await Promise.all([api('GET', `/api/residentes/${id}`), api('GET', `/api/ocorrencias?residente=${id}&limite=5`),
    api('GET', `/api/agenda?residente=${id}&proximos=1&limite=6`), api('GET', `/api/prescricoes?residente=${id}`)]);
  const [vac, sv, avs] = await Promise.all([api('GET', `/api/vacinas?residente=${id}`), api('GET', `/api/sinais?residente=${id}&dias=30`), api('GET', `/api/avaliacoes?residente=${id}`)]);
  const ultimaAv = (k) => avs.itens.find((a) => a.escala === k);
  const ultimaSv = sv.itens[sv.itens.length - 1];
  const r = d.residente, cs = d.contatos;
  const inativo = inativoRes(r);
  const resp = cs.find((x) => x.responsavel);
  const emerg = cs.find((x) => x.emergencia && !x.responsavel) || cs.find((x) => x.emergencia);
  const admin = EU.perfil === 'admin';
  const pilulas = [
    r.idade != null ? `<span class="pilula">${icone('calendario')}${r.idade} anos · ${esc(dataBR(r.dt_nasc))}</span>` : '',
    r.quarto ? `<span class="pilula">${icone('cama')}Quarto ${esc(r.quarto)}${r.leito ? ' · leito ' + esc(r.leito) : ''}</span>` : '',
    r.dt_entrada ? `<span class="pilula">${icone('pessoaCasa')}${inativo ? `Chegou em ${esc(dataBR(r.dt_entrada))}` : `No lar há ${esc(tempoDesde(r.dt_entrada))}`}</span>` : '',
    r.convenio ? `<span class="pilula">${icone('saude')}${esc(r.convenio)}</span>` : '',
    r.grau_dependencia ? `<span class="pilula" title="${esc(GRAUS_RES[r.grau_dependencia] || '')}">Grau ${esc(r.grau_dependencia)} de dependência</span>` : '',
  ].join('');
  const nota = r.situacao !== 'no_lar' && r.situacao_desde ? `${rotuloSituacao(r.situacao)} desde ${dataBR(r.situacao_desde)}${r.situacao_obs ? ' — ' + r.situacao_obs : ''}` : '';

  c.innerHTML = `
    <a class="voltar" href="#/residentes">${icone('voltar')}Residentes</a>
    <div class="so-impressao cabecalho-impressao"><b>${esc(EU.config.nome_organizacao || SUBTITULO_APP)} — Ficha do residente</b><span>Impresso em ${esc(dataHoraBR(new Date().toISOString()))} por ${esc(EU.nome)}</span></div>
    <section class="cartao perfil">
      <div class="quem"><button type="button" class="foto-perfil" id="resFoto" title="${r.foto_em ? 'Trocar a foto' : 'Pôr uma foto'}" aria-label="Foto de ${esc(r.nome)}">${
        avatarRes(r, 'xg', inativo ? 'apagado' : '')}<span class="selo-foto nao-imprimir" aria-hidden="true">${icone('camera')}</span></button><div style="min-width:0"><h1>${esc(r.nome)}</h1>${r.apelido ? `<p class="apelido">“${esc(r.apelido)}”</p>` : ''}
        <div class="pilulas">${pilulas}</div>${nota ? `<p class="so-impressao" style="margin-top:8px"><b>${esc(nota)}</b></p>` : ''}</div></div>
      <div class="lado nao-imprimir">
        ${segmentado(Object.entries(d.situacoes).map(([v, rot]) => ({ v, rotulo: v === 'hospitalizado' ? 'Hospitalizado' : rot })), r.situacao, { classe: 'situacao', rotulo: 'Situação do residente' })}
        ${nota ? `<small class="mudo" style="max-width:420px;text-align:right">${esc(nota)}</small>` : ''}
        <div class="acoes"><button type="button" class="btn" id="resEditar">${icone('editar')}Editar ficha</button>
          <a class="btn" href="#/prontuario/${r.id}" title="Tudo desta pessoa numa página, pronto para imprimir">${icone('documento')}Prontuário</a>
          <button type="button" class="btn" id="resImprimirFicha">${icone('impressora')}Imprimir</button>
          ${admin ? `<button type="button" class="btn-icone" id="resMais" aria-haspopup="menu" aria-expanded="false" title="Mais opções" aria-label="Mais opções">${icone('pontos')}</button>` : ''}</div>
      </div>
    </section>
    ${r.alergias ? `<div class="alerta-alergia" role="note">${icone('alerta')}<div><b>Alergias:</b> ${esc(r.alergias)}</div></div>` : ''}
    <div class="caixas-contato">${resp && resp === emerg ? caixaContato('Responsável · emergência', resp, 'dupla')
      : caixaContato('Responsável', resp) + caixaContato('Emergência', emerg, 'emergencia')}</div>
    <div class="grade-2">
      <section class="cartao"><div class="cartao-topo"><h2>${icone('saude')}Saúde</h2></div><dl class="dados">
        ${ddResHtml('Grau de dependência', r.grau_dependencia ? `Grau ${esc(r.grau_dependencia)}<br><span class="fraco" style="font-weight:400;font-size:13px">${esc(GRAUS_RES[r.grau_dependencia] || '')}</span>` : '', 'largo')}
        ${ddRes('Mobilidade', r.mobilidade)}${ddRes('Tipo sanguíneo', r.tipo_sanguineo)}${ddRes('Dieta', r.dieta)}
        ${ddRes('Diagnósticos e doenças', r.diagnosticos, 'largo')}
        ${ddRes('Médico(a) de referência', r.medico)}${ddResHtml('Telefone do médico', foneLink(r.medico_tel, false))}
      </dl></section>
      <section class="cartao"><div class="cartao-topo"><h2>${icone('documento')}Dados pessoais</h2></div><dl class="dados">
        ${ddRes('Nascimento', r.dt_nasc ? `${dataBR(r.dt_nasc)}${r.idade != null ? ` (${r.idade} anos)` : ''}` : '')}${ddRes('Sexo', r.sexo === 'F' ? 'Feminino' : r.sexo === 'M' ? 'Masculino' : '')}
        ${ddRes('Estado civil', r.estado_civil)}${ddRes('Religião', r.religiao)}${ddRes('Naturalidade', r.naturalidade)}
        ${ddRes('CPF', r.cpf)}${ddRes('RG', r.rg)}${ddRes('Cartão SUS', r.cartao_sus)}
        ${ddRes('Convênio', r.convenio)}${ddRes('Nº do convênio', r.convenio_numero)}${ddRes('Entrada no lar', r.dt_entrada ? dataBR(r.dt_entrada) : '')}
      </dl></section>
    </div>
    ${r.obs ? `<section class="cartao espaco"><div class="cartao-topo"><h2>${icone('editar')}Observações</h2></div><p style="white-space:pre-line">${esc(r.obs)}</p></section>` : ''}
    <section class="cartao espaco"><div class="cartao-topo"><h2>${icone('residentes')}Familiares e contatos</h2>
      <button type="button" class="btn peq nao-imprimir" id="contatoNovo">${icone('mais')}Acrescentar</button></div>
      ${cs.length ? cs.map(itemContato).join('') : vazio('residentes', 'Nenhum familiar ou contato', 'Cadastre quem responde pelo residente e quem chamar numa emergência.')}
    </section>
    <section class="cartao espaco" id="fichaRemedios"><div class="cartao-topo"><h2>${icone('pilula')}Remédios em uso</h2>
      <div class="acoes nao-imprimir"><a class="btn peq fantasma" href="#/prescricoes/residente-${r.id}">Ver tudo</a>
      ${inativo ? '' : `<button type="button" class="btn peq" id="fichaPrescrever">${icone('mais')}Nova prescrição</button>`}</div></div>
      ${rx.itens.length ? rx.itens.map(receitaItem).join('') : '<p class="mudo">Nenhum remédio cadastrado.</p>'}
    </section>
    <section class="cartao espaco"><div class="cartao-topo"><h2>${icone('saude')}Sinais vitais</h2>
      <div class="acoes nao-imprimir"><a class="btn peq fantasma" href="#/sinais/residente-${r.id}">Ver gráficos</a></div></div>
      ${ultimaSv ? `<p><b>Última medida:</b> ${esc(dataBR(ultimaSv.data))} às ${esc(ultimaSv.hora)} — ${esc(resumoLeitura(ultimaSv))}
        ${ultimaSv.fora.length ? `<span class="etiqueta perigo">${icone('alerta')}${esc(nomesFora(ultimaSv.fora, sv.medidas))} fora do normal</span>` : ''}</p>
        <p class="dica" style="margin-top:6px">${plural(sv.itens.length, 'medida', 'medidas')} nos últimos 30 dias.</p>`
        : '<p class="mudo">Nenhuma medida nos últimos 30 dias.</p>'}
    </section>
    <section class="cartao espaco"><div class="cartao-topo"><h2>${icone('documento')}PIA — Plano Individual de Atenção</h2>
      <div class="acoes nao-imprimir"><a class="btn peq" href="#/pia/residente-${r.id}">Abrir o plano</a></div></div>
      <p class="mudo">O plano de cuidado desta pessoa, por área, revisado a cada 6 meses.</p></section>
    <section class="cartao espaco"><div class="cartao-topo"><h2>${icone('contar')}Avaliações</h2>
      <div class="acoes nao-imprimir"><a class="btn peq fantasma" href="#/avaliacoes/residente-${r.id}">Histórico</a></div></div>
      <div style="display:flex;flex-wrap:wrap;gap:8px">${['katz', 'braden', 'morse'].map((k) => { const a = ultimaAv(k);
        return a ? `<span class="pilula">${esc(avs.escalas[k].nome)}: <b>${a.pontuacao}</b> <span class="etiqueta ${a.cor}">${esc(a.classificacao)}</span> <span class="fraco">${esc(dataBR(a.data))}</span></span>`
          : `<span class="pilula">${esc(avs.escalas[k].nome)}: <span class="fraco">não avaliado</span></span>`; }).join('')}</div>
    </section>
    <section class="cartao espaco"><div class="cartao-topo"><h2>${icone('escudo')}Vacinas</h2>
      <div class="acoes nao-imprimir"><a class="btn peq fantasma" href="#/vacinas/residente-${r.id}">Cartão de vacina</a></div></div>
      ${Object.keys(vac.situacao).length ? `<div class="pilulas" style="display:flex;flex-wrap:wrap;gap:6px">${Object.entries(vac.situacao).map(([nome, s]) => {
        const ult = vac.itens.find((x) => x.vacina === nome);
        return s.estado === 'em_dia' ? `<span class="pilula">${icone('check')}${esc(NOMES_CURTOS_VAC[nome] || nome)} · ${esc(dataCurta(ult && ult.data))}</span>`
          : `<span class="etiqueta ${s.estado === 'atrasada' ? 'perigo' : 'aviso'}">${esc(NOMES_CURTOS_VAC[nome] || nome)}: ${s.estado === 'atrasada' ? 'atrasada' : 'vence ' + esc(dataCurta(s.vence))}</span>`;
      }).join('')}</div>` : '<p class="mudo">Nenhuma vacina registrada. Copie da caderneta de vacinação.</p>'}
    </section>
    <section class="cartao espaco" id="fichaAgenda"><div class="cartao-topo"><h2>${icone('calendario')}Próximos compromissos</h2>
      <div class="acoes nao-imprimir"><a class="btn peq fantasma" href="#/agenda/residente-${r.id}">Ver tudo</a>
      ${inativo ? '' : `<button type="button" class="btn peq" id="fichaAgendar">${icone('mais')}Agendar</button>`}</div></div>
      ${ag.itens.length ? `<div class="lista-dias"><div class="compromissos">${ag.itens.map((a) => itemCompromisso(a, { mostrarResidente: false, mostrarData: true })).join('')}</div></div>`
        : '<p class="mudo">Nenhuma consulta, exame ou visita marcada.</p>'}
    </section>
    <section class="cartao espaco" id="fichaDiario"><div class="cartao-topo"><h2>${icone('caderno')}Diário</h2>
      <div class="acoes nao-imprimir">${dia.itens.length ? `<a class="btn peq fantasma" href="#/diario/residente-${r.id}">Ver tudo</a>` : ''}
      ${inativo ? '' : `<button type="button" class="btn peq" id="fichaAnotar">${icone('mais')}Anotar</button>`}</div></div>
      ${dia.itens.length ? `<div class="linha-tempo">${dia.itens.map((o) => itemDiario(o, { mostrarData: true, mostrarResidente: false })).join('')}</div>`
        : '<p class="mudo">Nada anotado no diário sobre esta pessoa ainda.</p>'}
    </section>
    <section class="cartao espaco nao-imprimir"><div class="cartao-topo"><h2>${icone('relogio')}Histórico desta ficha</h2></div>
      ${d.historico.length ? `<ul class="limpa historico">${d.historico.map((h) => `<li><time>${esc(dataHoraBR(h.quando))}</time><span><b>${esc(h.nome)}</b> ${esc(h.acao)}</span></li>`).join('')}</ul>`
        : '<p class="mudo">Nada registrado ainda.</p>'}
      <p class="dica" style="margin-top:12px">Por segurança (LGPD), o sistema também anota quem abriu esta ficha.</p>
    </section>`;

  $('#resEditar', c).onclick = () => formResidente(r);
  $('#resFoto', c).onclick = () => janelaFoto(r);
  definirImpressao(() => docFichaResidente(r, cs, { rx: rx.itens, vac, sv, avs, ag: ag.itens, dia: dia.itens }));
  $('#resImprimirFicha', c).onclick = () => window.print();
  if ($('#resMais', c)) {
    $('#resMais', c).onclick = (e) => {
      const m = abrirMenu(e.currentTarget, `<button class="menu-item" data-a="imprimir" role="menuitem">${icone('impressora')}Imprimir a ficha</button>
        <div class="menu-sep"></div><button class="menu-item perigo" data-a="excluir" role="menuitem">${icone('lixo')}Excluir a ficha…</button>`);
      if (!m) return;
      m.onclick = (ev) => {
        const a = ev.target.closest('[data-a]')?.dataset.a;
        if (a === 'imprimir') window.print();
        if (a === 'excluir') excluirResidente(r);
      };
    };
  }
  const seg = ligarSegmentado($('.segmentado.situacao', c), async (novo, antes) => {
    if (!(await janelaSituacao(r, novo))) seg.definir(antes);
  });
  $('#contatoNovo', c).onclick = () => formContato(r, null, !cs.length);
  if ($('#fichaAnotar', c)) $('#fichaAnotar', c).onclick = () => formRegistro(null, { residente_id: r.id });
  ligarItensDiario($('#fichaDiario', c), dia.itens);
  ligarCompromissos($('#fichaAgenda', c), ag.itens);
  ligarReceitas($('#fichaRemedios', c), rx.itens);
  if ($('#fichaPrescrever', c)) $('#fichaPrescrever', c).onclick = () => formPrescricao(null, { residente_id: r.id });
  if ($('#fichaAgendar', c)) $('#fichaAgendar', c).onclick = () => formCompromisso(null, { residente_id: r.id });
  c.addEventListener('click', (e) => {
    const ed = e.target.closest('[data-editar-contato]');
    if (ed) formContato(r, cs.find((x) => x.id === +ed.dataset.editarContato));
    const rm = e.target.closest('[data-remover-contato]');
    if (rm) removerContato(cs.find((x) => x.id === +rm.dataset.removerContato));
  });
};

// ───────────── ficha impressa ─────────────
const sexoRes = (s) => (s === 'F' ? 'Feminino' : s === 'M' ? 'Masculino' : '');
// Identificação (foto + campos) — também usada no prontuário
function docIdentResidente(r) {
  return `<div class="doc-ident">${r.foto_em ? `<img class="doc-foto" src="/api/residentes/${r.id}/foto?v=${encodeURIComponent(r.foto_em)}" alt="">` : ''}
    ${docCampos([['Nome completo', r.nome, 2], ['Como é chamado(a)', r.apelido],
      ['Nascimento', r.dt_nasc ? `${dataBR(r.dt_nasc)} (${r.idade} anos)` : ''], ['Sexo', sexoRes(r.sexo)], ['Estado civil', r.estado_civil],
      ['CPF', r.cpf], ['RG', r.rg], ['Cartão SUS', r.cartao_sus],
      ['Naturalidade', r.naturalidade], ['Religião', r.religiao], ['Situação', situacaoNoPapel(r) + (r.situacao !== 'no_lar' && r.situacao_desde ? ` desde ${dataBR(r.situacao_desde)}` : '')]], 3)}</div>`;
}
// Familiares e contatos em tabela
const docTabelaContatos = (cs) => docTabela([{ t: 'Nome', w: '26%' }, { t: 'Parentesco', w: '13%' }, { t: 'Telefones', w: '19%' }, { t: 'E-mail / endereço', w: '28%' }, { t: 'Papel', w: '14%' }],
  cs.map((x) => [`<b>${esc(x.nome)}</b>${x.obs ? `<small>${esc(x.obs)}</small>` : ''}`, esc(x.parentesco || ''), [x.telefone, x.telefone2].filter(Boolean).map((t) => `<span class="doc-nw">${esc(t)}</span>`).join('<br>'),
    esc([x.email, x.endereco].filter(Boolean).join(' · ')), [x.responsavel ? 'Responsável' : '', x.emergencia ? 'Emergência' : ''].filter(Boolean).join('<br>')]),
  { vazio: 'Nenhum familiar ou contato cadastrado.' });

function docFichaResidente(r, cs, { rx, vac, sv, avs, ag, dia }) {
  const ultimaSv = sv.itens[sv.itens.length - 1];
  const nomeAv = (k) => avs.escalas[k].nome;
  return {
    titulo: 'Ficha do residente', sub: r.nome,
    corpo: `${docIdentResidente(r)}
      ${r.alergias ? docAlerta(`<b>Alergias:</b> ${esc(r.alergias)}`) : ''}
      ${docSecao('Acolhimento', docCampos([['Entrada no lar', r.dt_entrada ? dataBR(r.dt_entrada) : ''], ['Tempo no lar', r.dt_entrada ? tempoDesde(r.dt_entrada) : ''],
        ['Quarto', r.quarto], ['Leito', r.leito]], 4))}
      ${docSecao('Saúde', docCampos([['Grau de dependência', r.grau_dependencia ? `Grau ${r.grau_dependencia} — ${GRAUS_RES[r.grau_dependencia] || ''}` : '', 3],
        ['Mobilidade', r.mobilidade], ['Tipo sanguíneo', r.tipo_sanguineo], ['Dieta', r.dieta],
        ['Diagnósticos e doenças', r.diagnosticos, 3],
        ['Convênio', r.convenio], ['Nº do convênio', r.convenio_numero], ['Médico(a) de referência', [r.medico, r.medico_tel].filter(Boolean).join(' · ')]], 3))}
      ${docSecao('Familiares e contatos', docTabelaContatos(cs))}
      ${docSecao('Remédios em uso', docTabelaRemedios(rx))}
      ${docSecao('Avaliações (as mais recentes)', docTabela([{ t: 'Escala', w: '30%' }, { t: 'Pontos', w: '12%', a: 'dir' }, { t: 'Resultado', w: '38%' }, { t: 'Data', w: '20%' }],
        ['katz', 'braden', 'morse'].map((k) => { const a = avs.itens.find((x) => x.escala === k);
          return [esc(avs.escalas[k].titulo || nomeAv(k)), a ? String(a.pontuacao) : '', a ? esc(a.classificacao) : '<span class="doc-vazio">não avaliado</span>', a ? esc(dataBR(a.data)) : '']; })), 'junta')}
      ${docSecao('Sinais vitais', ultimaSv ? `<p style="margin:0">Última medida: <b>${esc(dataBR(ultimaSv.data))} às ${esc(ultimaSv.hora)}</b> — ${esc(resumoLeitura(ultimaSv))}${ultimaSv.fora.length ? ' ' + docMarca(nomesFora(ultimaSv.fora, sv.medidas) + ' fora do normal') : ''}.
        ${plural(sv.itens.length, 'medida', 'medidas')} nos últimos 30 dias.</p>` : '<p class="doc-nada">Nenhuma medida nos últimos 30 dias.</p>', 'junta')}
      ${docSecao('Vacinas', docTabela([{ t: 'Vacina', w: '40%' }, { t: 'Última dose', w: '20%' }, { t: 'Situação', w: '40%' }],
        Object.entries(vac.situacao).map(([nome, s]) => { const u = vac.itens.find((x) => x.vacina === nome);
          return [esc(nome), esc(u ? dataBR(u.data) : ''), s.estado === 'em_dia' ? `Em dia${s.vence ? ' até ' + esc(dataBR(s.vence)) : ''}` : docMarca(s.estado === 'atrasada' ? 'Atrasada' : 'Vence ' + dataBR(s.vence))]; }),
        { vazio: 'Nenhuma vacina registrada.' }), 'junta')}
      ${docSecao('Próximos compromissos', docTabela([{ t: 'Data', w: '24%' }, { t: 'Tipo', w: '14%' }, { t: 'Compromisso', w: '36%' }, { t: 'Local', w: '26%' }],
        ag.map((a) => [`${esc(dataBR(a.data))}<small>${esc(horarioAg(a))}</small>`, esc((TIPOS_AG[a.tipo] || TIPOS_AG.outro).nome), esc(a.titulo), esc(a.local || '')]),
        { vazio: 'Nenhum compromisso marcado.' }))}
      ${docSecao('Últimas anotações do diário', docTabelaDiario(dia, { comResidente: false }))}
      ${r.obs ? docSecao('Observações', `<p style="margin:0" class="doc-quebras">${esc(r.obs)}</p>`) : ''}`,
  };
}

async function excluirResidente(r) {
  const ok = await confirmar(`Excluir apaga de vez a ficha de ${r.nome} e todos os familiares dela. Não dá para desfazer. `
    + 'Se a pessoa saiu do lar ou faleceu, o certo é mudar a situação: a ficha fica guardada como histórico.', 'Excluir de vez', { perigo: true, titulo: 'Excluir a ficha?' });
  if (!ok) return;
  try {
    await api('DELETE', `/api/residentes/${r.id}`);
    esquecerResidentes();
    toast(`A ficha de ${r.nome} foi excluída.`);
    location.hash = '#/residentes';
  } catch (e) { toast(e.message, true); }
}

// ───────────── foto ─────────────
// Recorta um quadrado do meio, diminui para no máximo 512 px e transforma em JPEG:
// a foto do celular (3 a 5 MB) vira uns 40 KB e o banco não incha. Lê como data: porque a regra de segurança da página só aceita imagem assim.
function prepararFoto(arquivo) {
  return new Promise((ok, erro) => {
    if (!/^image\//.test(arquivo.type || 'image/')) { erro(new Error('Escolha um arquivo de imagem (foto JPG ou PNG).')); return; }
    if (arquivo.size > 30 * 1024 * 1024) { erro(new Error('Essa imagem é grande demais (mais de 30 MB).')); return; }
    const leitor = new FileReader();
    leitor.onerror = () => erro(new Error('Não consegui ler esse arquivo.'));
    leitor.onload = () => {
      const img = new Image();
      img.onerror = () => erro(new Error('O navegador não consegue abrir esse tipo de imagem. Use uma foto JPG ou PNG.'));
      img.onload = () => {
        const lado = Math.min(img.naturalWidth, img.naturalHeight);
        const tam = Math.min(512, lado);
        const tela = document.createElement('canvas');
        tela.width = tela.height = tam;
        const g = tela.getContext('2d');
        g.fillStyle = '#fff'; // PNG com fundo transparente ficaria preto no JPEG (é cor da imagem, não da interface)
        g.fillRect(0, 0, tam, tam);
        g.imageSmoothingQuality = 'high';
        g.drawImage(img, (img.naturalWidth - lado) / 2, (img.naturalHeight - lado) / 2, lado, lado, 0, 0, tam, tam);
        tela.toBlob((b) => (b ? ok(b) : erro(new Error('Não consegui preparar a foto.'))), 'image/jpeg', 0.85);
      };
      img.src = leitor.result;
    };
    leitor.readAsDataURL(arquivo);
  });
}

function janelaFoto(r) {
  const tem = !!r.foto_em;
  const j = modal(`Foto — ${r.apelido || r.nome}`, `<div class="janela-foto">${avatarRes(r, 'xg', inativoRes(r) ? 'apagado' : '')}
      <input type="file" id="fotoArquivo" accept="image/*" hidden>
      <p class="dica">${tem ? 'Para trocar, escolha outra foto.' : 'Escolha uma foto do computador ou, no celular, tire na hora.'}
        O sistema recorta o meio da foto e diminui sozinho. Prefira uma foto de rosto, de frente e com boa luz.</p></div>`, {
    tamanho: 'estreito', rascunho: false,
    rodape: `${tem ? `<button type="button" class="btn" id="fotoRemover">${icone('lixo')}Remover</button>` : ''}<button type="button" class="btn" data-fechar>Fechar</button>
      <button type="button" class="btn primario" id="fotoEscolher">${icone('camera')}${tem ? 'Trocar a foto' : 'Escolher foto'}</button>`,
  });
  const arquivo = $('#fotoArquivo', j.el), escolher = $('#fotoEscolher', j.el);
  escolher.onclick = () => arquivo.click();
  arquivo.onchange = () => {
    const f = arquivo.files[0];
    arquivo.value = ''; // deixa escolher a mesma foto de novo, se der erro
    if (!f) return;
    botaoOcupado(escolher, async () => {
      const blob = await prepararFoto(f);
      await api('PUT', `/api/residentes/${r.id}/foto`, undefined, blob);
      esquecerResidentes();
      j.fechar(true);
      toast(tem ? 'Foto trocada.' : 'Foto colocada.');
      rotear();
    });
  };
  if ($('#fotoRemover', j.el)) {
    $('#fotoRemover', j.el).onclick = async (e) => {
      const btn = e.currentTarget;
      if (!(await confirmar(`Tirar a foto de ${r.nome}? Volta a aparecer só as iniciais.`, 'Remover', { perigo: true, titulo: 'Remover a foto?' }))) return;
      botaoOcupado(btn, async () => {
        await api('DELETE', `/api/residentes/${r.id}/foto`);
        esquecerResidentes();
        j.fechar(true);
        toast('Foto removida.');
        rotear();
      });
    };
  }
}

// Mudar a situação: pede a data (e o motivo). Devolve true se gravou.
function janelaSituacao(r, nova) {
  const textos = {
    no_lar: { titulo: 'Voltou para o lar', data: 'Voltou em', obs: 'Observação (opcional)', dica: 'Por exemplo: teve alta do hospital.' },
    hospitalizado: { titulo: 'Hospitalizado(a)', data: 'Internado(a) desde', obs: 'Hospital e motivo', dica: 'Ex.: Hospital Regional — pneumonia. Ajuda quem for visitar ou ligar.' },
    saiu: { titulo: 'Saiu do lar', data: 'Data da saída', obs: 'Motivo / para onde foi', dica: 'A ficha continua guardada, no filtro Histórico.' },
    faleceu: { titulo: 'Registrar falecimento', data: 'Data do falecimento', obs: 'Observação (opcional)', dica: 'A ficha continua guardada, no filtro Histórico.' },
  }[nova];
  return new Promise((ok) => {
    let gravou = false;
    const j = modal(textos.titulo, `<div class="previa">${avatar(r.nome, 'g')}<div><b>${esc(r.nome)}</b><small>Agora: ${esc(rotuloSituacao(r.situacao))} → ${esc(rotuloSituacao(nova))}</small></div></div>
      <div class="grade-campos"><label class="campo"><span class="obrig">${esc(textos.data)}</span><input type="date" id="sitData" max="${hojeIso()}" value="${hojeIso()}" required></label>
      <label class="campo largo"><span>${esc(textos.obs)}</span><textarea id="sitObs" maxlength="2000"></textarea><span class="dica">${esc(textos.dica)}</span></label></div>`, {
      tamanho: 'estreito', rascunho: false,
      rodape: `<button type="button" class="btn" data-fechar>Cancelar</button><button type="button" class="btn primario" id="sitSalvar">${icone('check')}Confirmar</button>`,
      aoFechar: () => ok(gravou),
    });
    $('#sitSalvar', j.el).onclick = (e) => botaoOcupado(e.currentTarget, async () => {
      const desde = $('#sitData', j.el).value;
      if (!desde) throw new Error('Informe a data.');
      await api('PUT', `/api/residentes/${r.id}/situacao`, { situacao: nova, desde, obs: $('#sitObs', j.el).value });
      gravou = true;
      esquecerResidentes();
      j.fechar(true);
      toast(`${r.apelido || r.nome}: ${rotuloSituacao(nova).toLowerCase()}.`);
      rotear();
    });
  });
}

// ───────────── cadastro / edição do residente ─────────────
const opcoesSelect = (lista, vazio = '—') => `<option value="">${esc(vazio)}</option>` + lista.map((v) => `<option value="${esc(v)}">${esc(v)}</option>`).join('');
const datalist = (id, lista) => `<datalist id="${id}">${lista.map((v) => `<option value="${esc(v)}"></option>`).join('')}</datalist>`;
// Campo da tela → coluna do banco
const CAMPOS_FORM_RES = {
  rNome: 'nome', rApelido: 'apelido', rSexo: 'sexo', rNasc: 'dt_nasc', rCpf: 'cpf', rRg: 'rg', rSus: 'cartao_sus', rCivil: 'estado_civil',
  rReligiao: 'religiao', rNatural: 'naturalidade', rEntrada: 'dt_entrada', rQuarto: 'quarto', rLeito: 'leito', rMob: 'mobilidade',
  rSangue: 'tipo_sanguineo', rDieta: 'dieta', rAlergias: 'alergias', rDiag: 'diagnosticos', rConvenio: 'convenio', rConvNum: 'convenio_numero',
  rMedico: 'medico', rMedicoTel: 'medico_tel', rObs: 'obs',
};

function formResidente(r) {
  const novo = !r;
  const titulo = novo ? 'Novo residente' : `Editar — ${r.nome}`;
  const campo = (id, rotulo, extra = '', classe = '') => `<label class="campo ${classe}"><span>${rotulo}</span><input id="${id}" ${extra}></label>`;
  const j = modal(titulo, `
    <div class="previa"><span id="previaAv">${r ? avatarRes(r, 'g') : avatar('?', 'g')}</span><div><b id="previaNome">${esc(r ? r.nome : 'Novo residente')}</b><small id="previaInfo">Só o nome é obrigatório: o resto pode ser completado depois.</small></div></div>
    <fieldset><legend>${icone('usuario')}Identificação</legend><div class="grade-campos">
      <label class="campo meio"><span class="obrig">Nome completo</span><input id="rNome" maxlength="120" autocomplete="off" required></label>
      ${campo('rApelido', 'Como gosta de ser chamado(a)', 'maxlength="60" placeholder="Ex.: Dona Aurora"')}
      <label class="campo"><span>Sexo</span><select id="rSexo"><option value="">—</option><option value="F">Feminino</option><option value="M">Masculino</option></select></label>
      ${campo('rNasc', 'Data de nascimento', `type="date" max="${hojeIso()}" min="1900-01-01"`)}
      ${campo('rCpf', 'CPF', 'inputmode="numeric" placeholder="000.000.000-00" maxlength="14"')}
      ${campo('rRg', 'RG', 'maxlength="20"')}
      ${campo('rSus', 'Cartão SUS', 'inputmode="numeric" maxlength="20"')}
      <label class="campo"><span>Estado civil</span><select id="rCivil">${opcoesSelect(ESTADOS_CIVIS)}</select></label>
      ${campo('rReligiao', 'Religião', 'list="listaReligioes" maxlength="40"')}
      ${campo('rNatural', 'Naturalidade', 'placeholder="Cidade/UF" maxlength="60"')}
    </div></fieldset>
    <fieldset><legend>${icone('cama')}No lar</legend><div class="grade-campos">
      ${campo('rEntrada', 'Data de entrada', `type="date" max="${hojeIso()}" min="1950-01-01"`)}
      ${campo('rQuarto', 'Quarto', 'maxlength="10" placeholder="Ex.: 4"')}
      ${campo('rLeito', 'Leito', 'maxlength="10" placeholder="Ex.: A"')}
    </div></fieldset>
    <fieldset><legend>${icone('saude')}Saúde</legend>
      <div class="campo" style="margin-bottom:16px"><span class="rotulo">Grau de dependência</span><div class="opcoes-grau" role="radiogroup">
        <label class="opcao-grau"><input type="radio" name="rGrau" id="rGrau0" value=""><span><b>Ainda não avaliado</b></span></label>
        ${Object.entries(GRAUS_RES).map(([g, t]) => `<label class="opcao-grau"><input type="radio" name="rGrau" id="rGrau${g}" value="${g}"><span><b>Grau ${g}</b><small>${esc(t)}</small></span></label>`).join('')}
      </div></div>
      <div class="grade-campos">
        <label class="campo"><span>Mobilidade</span><select id="rMob">${opcoesSelect(MOBILIDADES)}</select></label>
        <label class="campo"><span>Tipo sanguíneo</span><select id="rSangue">${opcoesSelect(TIPOS_SANGUE_RES, 'Não sei')}</select></label>
        ${campo('rDieta', 'Dieta', 'list="listaDietas" maxlength="60"')}
        <label class="campo largo"><span>Alergias</span><textarea id="rAlergias" maxlength="1000" placeholder="Remédios, alimentos, materiais…" style="min-height:60px"></textarea>
          <span class="dica">Aparece em destaque vermelho no alto da ficha. Deixe em branco se não tiver.</span></label>
        <label class="campo largo"><span>Diagnósticos e doenças</span><textarea id="rDiag" maxlength="2000" placeholder="Ex.: Hipertensão; Diabetes tipo 2"></textarea></label>
        ${campo('rConvenio', 'Convênio', 'list="listaConvenios" maxlength="60"')}
        ${campo('rConvNum', 'Nº do convênio', 'maxlength="40"')}
        ${campo('rMedico', 'Médico(a) de referência', 'maxlength="80"')}
        ${campo('rMedicoTel', 'Telefone do médico', 'type="tel" inputmode="tel" maxlength="16"')}
      </div>
    </fieldset>
    <fieldset><legend>${icone('editar')}Observações</legend>
      <label class="campo"><span class="so-leitor">Observações</span><textarea id="rObs" maxlength="4000" placeholder="Gostos, rotina, cuidados especiais, do que tem medo, o que acalma…"></textarea></label>
    </fieldset>
    ${datalist('listaReligioes', RELIGIOES)}${datalist('listaDietas', DIETAS)}${datalist('listaConvenios', CONVENIOS)}`, {
    tamanho: 'largo',
    rodape: `<button type="button" class="btn" data-fechar>Cancelar</button><button type="button" class="btn primario" id="rSalvar">${icone('check')}${novo ? 'Cadastrar' : 'Salvar'}</button>`,
    onAbrir: (el) => {
      for (const [id, col] of Object.entries(CAMPOS_FORM_RES)) $('#' + id, el).value = (r && r[col]) || '';
      $('#rGrau' + ((r && r.grau_dependencia) || '0'), el).checked = true;
      mascararCpf($('#rCpf', el)); mascararFone($('#rMedicoTel', el));
      const previa = () => {
        const nome = $('#rNome', el).value.trim();
        const apel = $('#rApelido', el).value.trim();
        const nasc = $('#rNasc', el).value;
        const q = $('#rQuarto', el).value.trim();
        let idade = null;
        if (nasc) { const [a, m, d] = nasc.split('-').map(Number); const h = new Date(); idade = h.getFullYear() - a - (h.getMonth() + 1 < m || (h.getMonth() + 1 === m && h.getDate() < d) ? 1 : 0); }
        if (!(r && r.foto_em)) $('#previaAv', el).innerHTML = avatar(nome || '?', 'g'); // com foto, a foto fica
        $('#previaNome', el).textContent = nome || (novo ? 'Novo residente' : '—');
        const info = [apel && `“${apel}”`, idade != null && idade >= 0 && idade < 130 && `${idade} anos`, q && `quarto ${q}`].filter(Boolean).join(' · ');
        $('#previaInfo', el).textContent = info || (nome ? 'Complete o que souber. O resto pode ficar para depois.' : 'Só o nome é obrigatório: o resto pode ser completado depois.');
      };
      for (const id of ['rNome', 'rApelido', 'rNasc', 'rQuarto']) $('#' + id, el).addEventListener('input', previa);
      previa();
    },
  });
  const salvar = async () => {
    const el = j.el;
    const corpo = {};
    for (const [id, col] of Object.entries(CAMPOS_FORM_RES)) corpo[col] = $('#' + id, el).value.trim();
    corpo.grau_dependencia = ($('input[name="rGrau"]:checked', el) || {}).value || '';
    if (!corpo.nome) { $('#rNome', el).setAttribute('aria-invalid', 'true'); $('#rNome', el).focus(); throw new Error('Informe o nome do residente.'); }
    if (corpo.cpf && soDigitos(corpo.cpf).length !== 11) { $('#rCpf', el).focus(); throw new Error('O CPF precisa ter 11 números (ou deixe em branco).'); }
    if (novo) {
      const res = await api('POST', '/api/residentes', corpo);
      j.fechar(true);
      esquecerResidentes();
      toast(`${corpo.nome} foi cadastrado(a). Agora acrescente os familiares.`);
      location.hash = `#/residente/${res.id}`;
    } else {
      const res = await salvarComVersao(`/api/residentes/${r.id}`, corpo, r);
      j.fechar(true);
      esquecerResidentes();
      toast(res.nada ? 'Nada foi alterado.' : 'Ficha salva.');
      rotear();
    }
  };
  $('#rSalvar', j.el).onclick = (e) => botaoOcupado(e.currentTarget, salvar);
}

// ───────────── familiares e contatos ─────────────
function formContato(r, ct, primeiro = false) {
  const novo = !ct;
  const titulo = novo ? `Novo contato de ${r.apelido || r.nome}` : `Editar contato — ${ct.nome}`;
  const j = modal(titulo, `<div class="grade-campos">
      <label class="campo meio"><span class="obrig">Nome</span><input id="cNome" maxlength="120" autocomplete="off" required></label>
      <label class="campo"><span>Parentesco</span><input id="cParentesco" list="listaParentescos" maxlength="40" placeholder="Ex.: Filha"></label>
      <label class="campo"><span>Telefone</span><input id="cTel" type="tel" inputmode="tel" maxlength="16" placeholder="(11) 90000-0000"></label>
      <label class="campo"><span>Outro telefone</span><input id="cTel2" type="tel" inputmode="tel" maxlength="16"></label>
      <label class="campo meio"><span>E-mail</span><input id="cEmail" type="email" maxlength="120" autocomplete="off"></label>
      <label class="campo largo"><span>Endereço</span><input id="cEndereco" maxlength="200"></label>
      <div class="campo largo" style="gap:10px">
        <label class="interruptor"><input type="checkbox" id="cResp"><span class="trilho-int"></span><span>É o(a) <b>responsável</b> pelo residente</span></label>
        <label class="interruptor"><input type="checkbox" id="cEmerg"><span class="trilho-int"></span><span>Chamar numa <b>emergência</b></span></label>
        <span class="dica">Só existe um responsável: marcar aqui desmarca o anterior.</span>
      </div>
      <label class="campo largo"><span>Observação</span><textarea id="cObs" maxlength="1000" placeholder="Ex.: visita aos domingos; ligar só depois das 18h"></textarea></label>
    </div>${datalist('listaParentescos', PARENTESCOS_RES)}`, {
    sub: novo ? '' : `Contato de ${esc(r.nome)}`,
    rodape: `<button type="button" class="btn" data-fechar>Cancelar</button><button type="button" class="btn primario" id="cSalvar">${icone('check')}${novo ? 'Acrescentar' : 'Salvar'}</button>`,
    onAbrir: (el) => {
      const v = ct || {};
      $('#cNome', el).value = v.nome || ''; $('#cParentesco', el).value = v.parentesco || '';
      $('#cTel', el).value = v.telefone || ''; $('#cTel2', el).value = v.telefone2 || '';
      $('#cEmail', el).value = v.email || ''; $('#cEndereco', el).value = v.endereco || ''; $('#cObs', el).value = v.obs || '';
      // O primeiro familiar cadastrado já vem como responsável e contato de emergência (dá para desmarcar)
      $('#cResp', el).checked = novo ? primeiro : !!v.responsavel;
      $('#cEmerg', el).checked = novo ? primeiro : !!v.emergencia;
      mascararFone($('#cTel', el)); mascararFone($('#cTel2', el));
    },
  });
  $('#cSalvar', j.el).onclick = (e) => botaoOcupado(e.currentTarget, async () => {
    const el = j.el;
    const corpo = {
      nome: $('#cNome', el).value.trim(), parentesco: $('#cParentesco', el).value.trim(), telefone: $('#cTel', el).value.trim(),
      telefone2: $('#cTel2', el).value.trim(), email: $('#cEmail', el).value.trim(), endereco: $('#cEndereco', el).value.trim(),
      responsavel: $('#cResp', el).checked ? 1 : 0, emergencia: $('#cEmerg', el).checked ? 1 : 0, obs: $('#cObs', el).value.trim(),
    };
    if (!corpo.nome) { $('#cNome', el).focus(); throw new Error('Informe o nome do contato.'); }
    if (novo) await api('POST', `/api/residentes/${r.id}/contatos`, corpo);
    else await salvarComVersao(`/api/contatos/${ct.id}`, corpo, ct);
    j.fechar(true);
    esquecerResidentes();
    toast(novo ? `${corpo.nome} foi acrescentado(a).` : 'Contato salvo.');
    rotear();
  });
}

async function removerContato(ct) {
  if (!ct) return;
  if (!(await confirmar(`Remover ${ct.nome} dos contatos deste residente?`, 'Remover', { perigo: true, titulo: 'Remover contato?' }))) return;
  try {
    await api('DELETE', `/api/contatos/${ct.id}`);
    esquecerResidentes();
    toast(`${ct.nome} foi removido(a).`);
    rotear();
  } catch (e) { toast(e.message, true); }
}
