// Equipe: escala de turnos do mês (grade) e cadastro de profissionais (do lar e de fora — o "corpo clínico").
// Rotas: #/escala · #/escala/AAAA-MM · #/profissionais
'use strict';

const LETRA_DIA = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const somarMes = (mes, n) => { const [a, m] = mes.split('-').map(Number); const d = new Date(a, m - 1 + n, 1, 12); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };
const nomeMes = (mes) => { const [a, m] = mes.split('-').map(Number); return `${MESES[m - 1]} de ${a}`; };

TELAS.escala = async (c, arg) => {
  const mes = /^\d{4}-\d{2}$/.test(arg || '') ? arg : hojeIso().slice(0, 7);
  const d = await api('GET', `/api/escala?mes=${mes}`);
  const admin = EU.perfil === 'admin';
  const dias = [];
  for (let x = d.inicio; x <= d.fim; x = somarDiasIso(x, 1)) dias.push(x);
  const cod = new Map(d.dias.map((e) => [e.profissional_id + '|' + e.data, e.codigo]));
  const trabalha = (k) => d.codigos[k] && d.codigos[k].trabalha;
  // Contagem por dia: quantos de dia (M, T, D) e quantos de noite (N, NN)
  const conta = (iso, noite) => d.pessoas.filter((p) => { const k = cod.get(p.id + '|' + iso); return k && trabalha(k) && (noite ? ['N', 'NN'].includes(k) : !['N', 'NN'].includes(k)); }).length;
  c.innerHTML = `
    <div class="so-impressao cabecalho-impressao"><b>${esc(EU.config.nome_organizacao || SUBTITULO_APP)} — Escala de ${esc(nomeMes(mes))}</b><span>Impresso em ${esc(dataHoraBR(new Date().toISOString()))}</span></div>
    <div class="cabecalho"><div><h1>Escala</h1><p class="sub">${esc(nomeMes(mes)[0].toUpperCase() + nomeMes(mes).slice(1))} · ${plural(d.pessoas.length, 'pessoa', 'pessoas')} na escala${admin ? '' : ' · só a administração muda a escala'}</p></div>
      <div class="acoes"><button type="button" class="btn" id="escImprimir">${icone('impressora')}Imprimir</button>
        ${admin ? `<button type="button" class="btn primario" id="escPadrao">${icone('calendario')}Preencher com padrão</button>` : ''}</div></div>
    <div class="barra-ferramentas nao-imprimir">
      <div class="navegar-dia"><button type="button" class="btn-icone" id="escAntes" aria-label="Mês anterior" title="Mês anterior">${icone('voltar')}</button>
        <span style="padding:0 10px;font-weight:600">${esc(nomeMes(mes)[0].toUpperCase() + nomeMes(mes).slice(1))}</span>
        <button type="button" class="btn-icone" id="escDepois" aria-label="Próximo mês" title="Próximo mês">${icone('seta')}</button></div>
      ${mes !== hojeIso().slice(0, 7) ? '<a class="btn peq" href="#/escala">Este mês</a>' : ''}
      <a class="btn peq fantasma" href="#/profissionais">${icone('usuario')}Profissionais</a>
    </div>
    <div class="legenda-escala">${Object.entries(d.codigos).map(([k, x]) => `<span><span class="cel-escala" data-cod="${k}">${esc(k)}</span>${esc(x.nome)}${x.horas ? ' (' + esc(x.horas) + ')' : ''}</span>`).join('')}</div>
    ${d.pessoas.length ? `<div class="tabela-caixa"><table class="grade-escala"><thead><tr><th class="pessoa">Pessoa</th>
      ${dias.map((x) => { const dt = new Date(x + 'T12:00:00'); return `<th class="${x === hojeIso() ? 'hoje' : ''}${[0, 6].includes(dt.getDay()) ? ' fds' : ''}">${LETRA_DIA[dt.getDay()]}<b>${dt.getDate()}</b></th>`; }).join('')}</tr></thead>
      <tbody>${d.pessoas.map((p) => `<tr><td class="pessoa"><b>${esc(p.nome)}</b><small>${esc(p.funcao)}</small></td>
        ${dias.map((x) => { const k = cod.get(p.id + '|' + x); const tag = admin ? 'button' : 'span';
          return `<td class="${x === hojeIso() ? 'hoje' : ''}"><${tag} ${admin ? 'type="button" ' : ''}class="cel-escala${k ? '' : ' vazia'}"${k ? ` data-cod="${k}"` : ''} data-p="${p.id}" data-d="${x}"
            title="${esc(p.nome)} · ${esc(dataBR(x))}${k ? ' · ' + esc(d.codigos[k].nome) : ''}">${k ? esc(k) : '·'}</${tag}></td>`; }).join('')}</tr>`).join('')}</tbody>
      <tfoot><tr><td class="pessoa">De dia</td>${dias.map((x) => { const n = conta(x, false); return `<td class="${n ? '' : 'falta'}">${n}</td>`; }).join('')}</tr>
        <tr><td class="pessoa">De noite</td>${dias.map((x) => { const n = conta(x, true); return `<td class="${n ? '' : 'falta'}">${n}</td>`; }).join('')}</tr></tfoot>
    </table></div>
    <p class="dica" style="margin-top:10px">${admin ? 'Clique num dia para escolher o turno. ' : ''}As linhas de baixo contam quantas pessoas trabalham de dia e de noite; <b style="color:var(--perigo)">0 em vermelho</b> = ninguém escalado.</p>`
    : `<div class="cartao">${vazio('usuario', 'Ninguém na escala', 'Cadastre a equipe em Profissionais (com “Aparece na escala” ligado).', '<a class="btn primario" href="#/profissionais">Ir para Profissionais</a>')}</div>`}`;
  $('#escImprimir', c).onclick = () => window.print();
  // Papel: a grade do mês em paisagem, letras pequenas (31 dias cabem na largura)
  definirImpressao(() => ({
    titulo: 'Escala de trabalho', paisagem: true, sub: `${nomeMesFin(mes)} · ${plural(d.pessoas.length, 'pessoa', 'pessoas')}`,
    corpo: d.pessoas.length ? `<table class="doc-tabela grade doc-escala"><thead><tr><th class="pessoa">Profissional</th>${dias.map((x) => { const dt = new Date(x + 'T12:00:00');
        return `<th class="centro${[0, 6].includes(dt.getDay()) ? ' fds' : ''}">${LETRA_DIA[dt.getDay()]}<br>${dt.getDate()}</th>`; }).join('')}</tr></thead>
      <tbody>${d.pessoas.map((p) => `<tr><td class="pessoa"><b>${esc(p.nome)}</b><small>${esc(p.funcao)}</small></td>${dias.map((x) => { const k = cod.get(p.id + '|' + x);
        return `<td class="centro${[0, 6].includes(new Date(x + 'T12:00:00').getDay()) ? ' fds' : ''}">${k ? esc(k) : ''}</td>`; }).join('')}</tr>`).join('')}</tbody>
      <tfoot><tr><td class="pessoa">De dia</td>${dias.map((x) => `<td class="centro">${conta(x, false)}</td>`).join('')}</tr>
        <tr><td class="pessoa">De noite</td>${dias.map((x) => `<td class="centro">${conta(x, true)}</td>`).join('')}</tr></tfoot></table>
      ${docNota('<b>Legenda:</b> ' + Object.entries(d.codigos).map(([k, x]) => `<b>${esc(k)}</b> = ${esc(x.nome)}${x.horas ? ' (' + esc(x.horas) + ')' : ''}`).join(' · '))}
      ${docAssinaturas(['Responsável pela escala', 'Direção'])}` : '<p class="doc-nada">Ninguém na escala.</p>',
  }));
  $('#escAntes', c).onclick = () => { location.hash = `#/escala/${somarMes(mes, -1)}`; };
  $('#escDepois', c).onclick = () => { location.hash = `#/escala/${somarMes(mes, 1)}`; };
  if (!admin) return;
  if ($('#escPadrao', c)) $('#escPadrao', c).onclick = () => formPadraoEscala(d);
  c.addEventListener('click', (e) => {
    const b = e.target.closest('button.cel-escala');
    if (!b) return;
    const m = abrirMenu(b, `${Object.entries(d.codigos).map(([k, x]) => `<button class="menu-item" data-cod-escolha="${k}" role="menuitem"><span class="cel-escala" data-cod="${k}" style="width:30px;height:24px">${esc(k)}</span>${esc(x.nome)}</button>`).join('')}
      <div class="menu-sep"></div><button class="menu-item" data-cod-escolha="" role="menuitem">${icone('x')}Deixar em branco</button>`);
    if (!m) return;
    m.onclick = tentar(async (ev) => {
      const it = ev.target.closest('[data-cod-escolha]');
      if (!it) return;
      const codigo = it.dataset.codEscolha;
      await api('PUT', '/api/escala', { profissional_id: +b.dataset.p, data: b.dataset.d, codigo });
      // Atualiza só a célula (sem redesenhar a tela toda: a pessoa está montando a escala dia a dia)
      b.textContent = codigo || '·';
      b.classList.toggle('vazia', !codigo);
      if (codigo) b.dataset.cod = codigo; else delete b.dataset.cod;
    });
  });
};

function formPadraoEscala(d) {
  const j = modal('Preencher com padrão', `<p class="mudo" style="margin-bottom:14px">Preenche vários dias de uma vez (por cima do que já estiver lá). Depois dá para ajustar dia a dia, clicando na grade.</p>
    <div class="grade-campos">
      <label class="campo largo"><span class="obrig">Pessoa</span><select id="epPessoa"><option value="">— escolha —</option>${d.pessoas.map((p) => `<option value="${p.id}">${esc(p.nome)} (${esc(p.funcao)})</option>`).join('')}</select></label>
      <label class="campo largo"><span class="obrig">Padrão</span><select id="epPadrao">${Object.entries(d.padroes).map(([k, n]) => `<option value="${k}">${esc(n)}</option>`).join('')}</select></label>
      <label class="campo"><span class="obrig">Primeiro dia de trabalho</span><input type="date" id="epInicio" value="${d.inicio}"></label>
      <label class="campo"><span class="obrig">Até</span><input type="date" id="epFim" value="${d.fim}"></label>
    </div>`, {
    tamanho: 'estreito', rascunho: false,
    rodape: `<button type="button" class="btn" data-fechar>Cancelar</button><button type="button" class="btn primario" id="epOk">${icone('check')}Preencher</button>`,
  });
  $('#epOk', j.el).onclick = (e) => botaoOcupado(e.currentTarget, async () => {
    const corpo = { profissional_id: $('#epPessoa', j.el).value, padrao: $('#epPadrao', j.el).value, inicio: $('#epInicio', j.el).value, fim: $('#epFim', j.el).value };
    if (!corpo.profissional_id) throw new Error('Escolha a pessoa.');
    const r = await api('POST', '/api/escala/padrao', corpo);
    j.fechar(true); toast(`Escala preenchida: ${plural(r.dias, 'dia', 'dias')}.`); rotear();
  });
}

// ───────────── profissionais ─────────────
let buscaProf = '';
TELAS.profissionais = async (c, arg) => {
  const todos = arg === 'todos';
  const d = await api('GET', '/api/profissionais' + (todos ? '?todos=1' : ''));
  const admin = EU.perfil === 'admin';
  c.innerHTML = `
    <div class="so-impressao cabecalho-impressao"><b>${esc(EU.config.nome_organizacao || SUBTITULO_APP)} — Profissionais</b><span>Impresso em ${esc(dataHoraBR(new Date().toISOString()))}</span></div>
    <div class="cabecalho"><div><h1>Profissionais</h1><p class="sub">Equipe do lar e profissionais de fora (médicos, fisioterapia, nutrição…) · ${plural(d.itens.length, 'pessoa', 'pessoas')}</p></div>
      <div class="acoes"><button type="button" class="btn" id="prImprimir">${icone('impressora')}Imprimir</button>
        ${admin ? `<button type="button" class="btn primario" id="prNovo">${icone('usuarioMais')}Novo profissional</button>` : ''}</div></div>
    <div class="barra-ferramentas nao-imprimir"><label class="busca">${icone('busca')}<input type="search" id="prBusca" placeholder="Buscar por nome ou função" aria-label="Buscar"></label>
      <label class="interruptor"><input type="checkbox" id="prTodos"${todos ? ' checked' : ''}><span class="trilho-int"></span><span>Mostrar quem saiu</span></label></div>
    <div id="prLista"></div>`;
  const lista = $('#prLista', c), busca = $('#prBusca', c);
  busca.value = buscaProf;
  let visProf = d.itens;
  definirImpressao(() => {
    const grupos = {};
    for (const p of visProf) (grupos[p.funcao] ||= []).push(p);
    return {
      titulo: 'Quadro de profissionais', sub: `Equipe do lar e profissionais de fora · ${plural(visProf.length, 'pessoa', 'pessoas')}${todos ? ' · inclui quem saiu' : ''}`,
      corpo: docTabela([{ t: 'Nome', w: '27%' }, { t: 'Especialidade', w: '17%' }, { t: 'Registro', w: '14%' }, { t: 'Vínculo', w: '14%' }, { t: 'Telefone', w: '14%' }, { t: 'E-mail', w: '14%' }],
        Object.entries(grupos).sort(([a], [b]) => d.funcoes.indexOf(a) - d.funcoes.indexOf(b)).flatMap(([f, ps]) => [{ grupo: `${f} · ${ps.length}` },
          ...ps.map((p) => ({ classe: p.ativo ? '' : 'apagada', celulas: [`<b>${esc(p.nome)}</b>${p.ativo ? '' : '<small>Saiu</small>'}${p.na_escala ? '<small>Na escala de turnos</small>' : ''}`,
            esc(p.especialidade || ''), esc(p.registro || ''), esc(p.vinculo || ''), esc(p.telefone || ''), esc(p.email || '')] }))]),
        { vazio: 'Ninguém cadastrado.' }),
    };
  });
  const desenhar = () => {
    const q = norm(buscaProf.trim());
    const vis = d.itens.filter((p) => !q || norm([p.nome, p.funcao, p.especialidade, p.registro].join(' ')).includes(q));
    visProf = vis;
    const grupos = {};
    for (const p of vis) (grupos[p.funcao] ||= []).push(p);
    lista.innerHTML = vis.length ? Object.entries(grupos).sort(([a], [b]) => d.funcoes.indexOf(a) - d.funcoes.indexOf(b)).map(([f, ps]) => `<h2 class="turno-titulo">${esc(f)} · ${ps.length}</h2>
      <div class="cartao" style="padding:4px">${ps.map((p) => `<div class="linha" style="padding:12px">${avatar(p.nome, '', p.ativo ? '' : 'apagado')}
        <span class="meio"><b>${esc(p.nome)}${p.ativo ? '' : ' <span class="etiqueta neutro">Saiu</span>'}</b><small>${esc([p.especialidade, p.registro, p.vinculo].filter(Boolean).join(' · '))}</small></span>
        ${p.na_escala ? '<span class="etiqueta info">Na escala</span>' : ''}${foneLink(p.telefone)}
        ${admin ? `<button type="button" class="btn-icone nao-imprimir" data-editar-prof="${p.id}" title="Editar" aria-label="Editar ${esc(p.nome)}">${icone('editar')}</button>` : ''}</div>`).join('')}</div>`).join('')
      : `<div class="cartao">${vazio('usuario', q ? 'Ninguém encontrado' : 'Nenhum profissional cadastrado', q ? 'Tente outro nome.' : 'Cadastre a equipe do lar e os profissionais de fora que atendem os residentes.')}</div>`;
  };
  busca.addEventListener('input', () => { buscaProf = busca.value; desenhar(); });
  $('#prTodos', c).onchange = (e) => { location.hash = e.target.checked ? '#/profissionais/todos' : '#/profissionais'; };
  $('#prImprimir', c).onclick = () => window.print();
  if ($('#prNovo', c)) $('#prNovo', c).onclick = () => formProfissional(null, d);
  lista.addEventListener('click', (e) => { const b = e.target.closest('[data-editar-prof]'); if (b) formProfissional(d.itens.find((p) => p.id === +b.dataset.editarProf), d); });
  desenhar();
};

function formProfissional(p, d) {
  const novo = !p;
  const j = modal(novo ? 'Novo profissional' : `Editar — ${p.nome}`, `<div class="grade-campos">
      <label class="campo meio"><span class="obrig">Nome</span><input id="pfNome" maxlength="120"></label>
      <label class="campo"><span class="obrig">Função</span><input id="pfFuncao" maxlength="60" list="pfFuncoes"></label>
      <label class="campo"><span>Registro</span><input id="pfRegistro" maxlength="60" placeholder="Ex.: CRM, COREN, CREFITO"></label>
      <label class="campo"><span>Especialidade</span><input id="pfEsp" maxlength="80" placeholder="Ex.: Geriatria"></label>
      <label class="campo"><span>Vínculo</span><select id="pfVinculo">${d.vinculos.map((v) => `<option>${esc(v)}</option>`).join('')}</select></label>
      <label class="campo"><span>Telefone</span><input id="pfTel" type="tel" inputmode="tel" maxlength="16"></label>
      <label class="campo meio"><span>E-mail</span><input id="pfEmail" type="email" maxlength="120"></label>
      <div class="campo largo" style="gap:10px">
        <label class="interruptor"><input type="checkbox" id="pfEscala"><span class="trilho-int"></span><span>Aparece na escala de turnos</span></label>
        ${novo ? '' : '<label class="interruptor"><input type="checkbox" id="pfAtivo"><span class="trilho-int"></span><span>Ainda trabalha no lar (desligue quando sair)</span></label>'}
      </div>
      <label class="campo largo"><span>Observações</span><textarea id="pfObs" maxlength="1000" placeholder="Ex.: atende às terças; plantão por telefone"></textarea></label>
    </div>${datalist('pfFuncoes', d.funcoes)}`, {
    rodape: `${!novo ? `<button type="button" class="btn fantasma esq" id="pfApagar">${icone('lixo')}Apagar</button>` : ''}<button type="button" class="btn" data-fechar>Cancelar</button><button type="button" class="btn primario" id="pfSalvar">${icone('check')}${novo ? 'Cadastrar' : 'Salvar'}</button>`,
    onAbrir: (el) => {
      const x = p || { vinculo: 'Funcionário', na_escala: 1 };
      for (const [id, k] of [['pfNome', 'nome'], ['pfFuncao', 'funcao'], ['pfRegistro', 'registro'], ['pfEsp', 'especialidade'], ['pfVinculo', 'vinculo'], ['pfTel', 'telefone'], ['pfEmail', 'email'], ['pfObs', 'obs']]) $('#' + id, el).value = x[k] || '';
      $('#pfEscala', el).checked = !!x.na_escala;
      if (!novo) $('#pfAtivo', el).checked = !!p.ativo;
      mascararFone($('#pfTel', el));
      $('#pfVinculo', el).addEventListener('change', () => { if (novo) $('#pfEscala', el).checked = !['Prestador de serviço', 'SUS / UBS'].includes($('#pfVinculo', el).value); });
    },
  });
  $('#pfSalvar', j.el).onclick = (e) => botaoOcupado(e.currentTarget, async () => {
    const el = j.el;
    const corpo = { nome: $('#pfNome', el).value.trim(), funcao: $('#pfFuncao', el).value.trim(), registro: $('#pfRegistro', el).value.trim(), especialidade: $('#pfEsp', el).value.trim(),
      vinculo: $('#pfVinculo', el).value, telefone: $('#pfTel', el).value.trim(), email: $('#pfEmail', el).value.trim(), obs: $('#pfObs', el).value.trim(), na_escala: $('#pfEscala', el).checked ? 1 : 0 };
    if (!corpo.nome) throw new Error('Informe o nome.');
    if (!corpo.funcao) throw new Error('Informe a função.');
    if (novo) await api('POST', '/api/profissionais', corpo);
    else {
      corpo.ativo = $('#pfAtivo', el).checked ? 1 : 0;
      await salvarComVersao(`/api/profissionais/${p.id}`, corpo, { ...p, registro: p.registro || '', especialidade: p.especialidade || '', telefone: p.telefone || '', email: p.email || '', obs: p.obs || '' });
    }
    j.fechar(true); toast(novo ? `${corpo.nome} cadastrado(a).` : 'Salvo.'); rotear();
  });
  if ($('#pfApagar', j.el)) $('#pfApagar', j.el).onclick = async () => {
    if (!(await confirmar(`Apagar ${p.nome} e toda a escala dele(a)? Se a pessoa só saiu do lar, prefira desligar “Ainda trabalha no lar”.`, 'Apagar', { perigo: true }))) return;
    try { await api('DELETE', `/api/profissionais/${p.id}`); j.fechar(true); toast('Apagado.'); rotear(); } catch (er) { toast(er.message, true); }
  };
}
