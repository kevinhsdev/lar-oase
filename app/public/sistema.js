// Sistema: bloqueio de tela, reinício e a tela de Configurações (geral, usuários, cópias, rede, atualizações, auditoria).
'use strict';

// ───────────── bloqueio de tela ─────────────
// Depois de N minutos parado (Configurações › Geral) ou pelo menu da conta. O servidor também sabe que a
// sessão está bloqueada: nada passa até digitar a senha de novo, nem se alguém recarregar a página.
let ultimoMovimento = Date.now(), vigiaBloqueio = null, relogioBloqueio = null;
function vigiarInatividade() {
  if (vigiaBloqueio) return;
  const mexeu = () => { ultimoMovimento = Date.now(); };
  for (const ev of ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart']) addEventListener(ev, mexeu, { passive: true });
  vigiaBloqueio = setInterval(() => {
    const min = Number(EU && EU.config && EU.config.bloqueio_minutos) || 0;
    if (EU && min > 0 && !$('.bloqueio') && Date.now() - ultimoMovimento > min * 60000) bloquearTela();
  }, 15000);
}
async function bloquearTela() {
  try { await api('POST', '/api/bloquear'); } catch { /* mostra o bloqueio mesmo assim */ }
  mostrarBloqueio();
}
function mostrarBloqueio() {
  if (!EU || $('.bloqueio')) return;
  fecharMenu();
  const b = document.createElement('div');
  b.className = 'bloqueio';
  b.setAttribute('role', 'dialog'); b.setAttribute('aria-modal', 'true'); b.setAttribute('aria-label', 'Tela bloqueada');
  b.innerHTML = `<div class="bloqueio-caixa"><div class="hora" id="bqHora"></div><div class="dia" id="bqDia"></div>
    ${avatar(EU.nome, 'xg')}<div><h2>${esc(EU.nome)}</h2><p class="mudo" style="margin-top:4px">A tela está bloqueada. Digite a sua senha para continuar.</p></div>
    <form id="bqForm" novalidate>${campoSenha('bqSenha', 'Senha', 'current-password')}<div class="erro-form" id="bqErro" role="alert"></div>
      <button class="btn primario grande bloco" type="submit">${icone('cadeado')}Desbloquear</button>
      <button type="button" class="btn fantasma bloco" id="bqSair">Sair e entrar com outra pessoa</button></form></div>`;
  document.body.appendChild(b);
  const relogio = () => {
    const d = new Date();
    $('#bqHora', b).textContent = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    $('#bqDia', b).textContent = `${DIAS_SEMANA[d.getDay()]}, ${dataExtenso(hojeIso())}`;
  };
  relogio();
  clearInterval(relogioBloqueio); relogioBloqueio = setInterval(relogio, 10000);
  botaoVerSenha(b);
  requestAnimationFrame(() => requestAnimationFrame(() => b.classList.add('aberto')));
  setTimeout(() => $('#bqSenha', b).focus(), 60);
  $('#bqSair', b).onclick = () => { clearInterval(relogioBloqueio); b.remove(); sair(); };
  const f = $('#bqForm', b);
  f.onsubmit = async (e) => {
    e.preventDefault();
    const senha = $('#bqSenha', b).value;
    if (!senha) return;
    await botaoOcupado($('button[type="submit"]', f), async () => {
      try { await api('POST', '/api/desbloquear', { senha }); } catch (err) {
        $('#bqErro', b).textContent = err.message;
        f.classList.remove('tremer'); void f.offsetWidth; if (!semMovimento()) f.classList.add('tremer');
        $('#bqSenha', b).select();
        return;
      }
      ultimoMovimento = Date.now();
      clearInterval(relogioBloqueio);
      b.classList.remove('aberto'); b.classList.add('saindo');
      setTimeout(() => b.remove(), 220);
    });
  };
}

// ───────────── reiniciar (o "Iniciar Sistema.bat" sobe de novo sozinho) ─────────────
async function reiniciarSistema(msg = 'Reiniciando o sistema…') {
  await api('POST', '/api/admin/reiniciar');
  const j = modal('Reiniciando', `<div class="vazio" style="padding:18px 0"><span class="spinner" aria-hidden="true"></span><p>${esc(msg)} Leva alguns segundos; a página recarrega sozinha.</p></div>`, { tamanho: 'estreito', rascunho: false });
  await new Promise((r) => setTimeout(r, 1800));
  const inicio = Date.now();
  while (Date.now() - inicio < 90000) {
    try { const r = await fetch('/api/versao', { cache: 'no-store' }); if (r.ok) { location.reload(); return; } } catch { /* ainda subindo */ }
    await new Promise((r) => setTimeout(r, 1500));
  }
  j.fechar();
  toast('O sistema não voltou sozinho. Confira a janela preta do "Iniciar Sistema" (ou abra de novo pelo atalho).', true);
}

// ───────────── Configurações ─────────────
const cabecalhoConfig = (titulo, sub) => `<div class="cabecalho"><div><h1>${esc(titulo)}</h1><p class="sub">${sub}</p></div></div>`;
const horasAtras = (h) => (h == null ? '' : h < 1 ? 'há menos de 1 hora' : h < 48 ? `há ${plural(Math.round(h), 'hora', 'horas')}` : `há ${plural(Math.round(h / 24), 'dia', 'dias')}`);

TELAS.config = async (c, arg) => {
  if (EU.perfil !== 'admin') { location.replace('#/inicio'); return; }
  const abas = { geral: configGeral, usuarios: configUsuarios, backups: configBackups, rede: configRede, atualizacoes: configAtualizacoes, auditoria: configAuditoria };
  await (abas[arg] || configGeral)(c);
};

async function salvarConfig(corpo, btn, msg = 'Configuração salva.') {
  await botaoOcupado(btn, async () => {
    await api('PUT', '/api/admin/config', corpo);
    EU = await api('GET', '/api/eu');
    toast(msg);
  });
}

async function configGeral(c) {
  const d = await api('GET', '/api/admin');
  const cf = d.config;
  c.innerHTML = `${cabecalhoConfig('Configurações', 'Ajustes gerais do sistema. Só a administração vê esta área.')}
    <div class="config-grade">
      <section class="cartao"><div class="cartao-topo"><h2>${icone('pessoaCasa')}Organização</h2></div>
        <label class="campo"><span>Nome que aparece no sistema e nas impressões</span><input id="cfgNome" maxlength="80"></label>
        <label class="campo" style="margin-top:12px"><span>CNPJ (sai no cabeçalho de todos os documentos impressos)</span><input id="cfgCnpj" maxlength="18" inputmode="numeric" placeholder="00.000.000/0000-00"></label>
        <div class="rodape-cartao acoes"><button type="button" class="btn primario" id="cfgNomeSalvar">Salvar</button></div></section>
      <section class="cartao"><div class="cartao-topo"><h2>${icone('cadeado')}Bloqueio de tela</h2></div>
        <label class="campo"><span>Bloquear depois de quantos minutos sem uso</span><input id="cfgBloqueio" type="number" min="0" max="240" inputmode="numeric">
          <span class="dica">Protege os dados quando alguém sai de perto do computador. Use 0 para nunca bloquear sozinho.</span></label>
        <div class="rodape-cartao acoes"><button type="button" class="btn primario" id="cfgBloqueioSalvar">Salvar</button></div></section>
      <section class="cartao largo"><div class="cartao-topo"><h2>${icone('estrela')}Demonstração</h2></div>
        ${d.demo ? `<div class="estado-grande"><span class="ic-caixa">${icone('check')}</span><div><b>A demonstração está carregada</b><span class="mudo">Os residentes que aparecem são fictícios. Apague antes de começar a usar de verdade.</span></div></div>
          <div class="rodape-cartao acoes"><button type="button" class="btn" id="demoCompletar">${icone('estrela')}Completar a demonstração</button>
            <button type="button" class="btn perigo" id="demoApagar">${icone('lixo')}Apagar a demonstração</button></div>
          <p class="dica" style="margin-top:8px">“Completar” acrescenta os dados fictícios dos módulos que ainda estiverem vazios (Diário, Remédios, Vacinas, Equipe…).</p>`
        : d.reais ? `<p class="mudo">Já existem ${plural(d.reais, 'residente real', 'residentes reais')} cadastrados, então a demonstração não pode ser carregada (os dados fictícios não se misturam com os de verdade).</p>`
          : `<p class="mudo">Carrega residentes e familiares <b>fictícios</b> para conhecer o sistema e treinar a equipe sem medo de errar. Depois é só apagar.</p>
          <div class="rodape-cartao acoes"><button type="button" class="btn primario" id="demoCarregar">${icone('estrela')}Carregar a demonstração</button></div>`}
      </section>
      <section class="cartao largo"><div class="cartao-topo"><h2>${icone('info')}Sobre</h2></div>
        <dl class="dados">${ddRes('Sistema', `${NOME_APP} — ${SUBTITULO_APP}`)}${ddRes('Versão', VERSAO)}${ddRes('Funciona sem internet', 'Sim: os dados ficam neste computador')}
          ${ddResHtml('Atalhos', '<kbd class="tecla">/</kbd> buscar residente · <kbd class="tecla">?</kbd> ajuda')}</dl></section>
    </div>`;
  $('#cfgNome', c).value = cf.nome_organizacao || '';
  $('#cfgBloqueio', c).value = cf.bloqueio_minutos || '0';
  $('#cfgCnpj', c).value = cf.cnpj || '';
  $('#cfgNomeSalvar', c).onclick = (e) => salvarConfig({ nome_organizacao: $('#cfgNome', c).value, cnpj: $('#cfgCnpj', c).value }, e.currentTarget, 'Dados da organização salvos.');
  $('#cfgBloqueioSalvar', c).onclick = (e) => salvarConfig({ bloqueio_minutos: $('#cfgBloqueio', c).value }, e.currentTarget, 'Tempo de bloqueio salvo.');
  if ($('#demoCarregar', c)) $('#demoCarregar', c).onclick = (e) => botaoOcupado(e.currentTarget, async () => {
    const r = await api('POST', '/api/admin/demo');
    esquecerResidentes();
    toast(`Demonstração carregada: ${r.residentes} residentes fictícios.`);
    location.hash = '#/residentes';
  });
  if ($('#demoCompletar', c)) $('#demoCompletar', c).onclick = (e) => botaoOcupado(e.currentTarget, async () => {
    const r = await api('POST', '/api/admin/demo');
    toast(r.completados && r.completados.length ? `Demonstração completada: ${r.completados.join(', ')}.` : 'A demonstração já estava completa.');
  });
  if ($('#demoApagar', c)) $('#demoApagar', c).onclick = async (e) => {
    if (!(await confirmar('Apagar todos os residentes e familiares fictícios da demonstração? Os dados reais (se houver) não são tocados.', 'Apagar demonstração', { perigo: true }))) return;
    await botaoOcupado(e.currentTarget, async () => { await api('DELETE', '/api/admin/demo'); esquecerResidentes(); toast('Demonstração apagada.'); rotear(); });
  };
}

// ── Usuários ──
const FUNCOES = ['Administração', 'Coordenação', 'Enfermeiro(a)', 'Técnico(a) de enfermagem', 'Cuidador(a)', 'Cozinha', 'Limpeza', 'Assistente social', 'Voluntário(a)'];
async function configUsuarios(c) {
  const d = await api('GET', '/api/admin');
  const us = d.usuarios;
  c.innerHTML = `<div class="cabecalho"><div><h1>Usuários</h1><p class="sub">Cada pessoa entra com o próprio usuário: a auditoria mostra quem fez o quê.</p></div>
    <div class="acoes"><button type="button" class="btn primario" id="usuNovo">${icone('usuarioMais')}Nova pessoa</button></div></div>
    <div class="tabela-caixa"><table class="tabela"><thead><tr><th>Pessoa</th><th>Função</th><th>Perfil</th><th>Situação</th><th></th></tr></thead><tbody>
    ${us.map((u) => `<tr class="${u.ativo ? '' : 'inativo'}"><td><div style="display:flex;align-items:center;gap:12px">${avatar(u.nome, 'p', u.ativo ? '' : 'apagado')}<div><b>${esc(u.nome)}</b>${u.id === EU.id ? ' <span class="fraco">(você)</span>' : ''}<br><span class="fraco mono">${esc(u.login)}</span></div></div></td>
      <td>${esc(u.funcao || '—')}</td>
      <td>${u.perfil === 'admin' ? '<span class="etiqueta marca">Administração</span>' : '<span class="etiqueta neutro">Equipe</span>'}</td>
      <td>${!u.ativo ? '<span class="etiqueta neutro">Desativado</span>' : u.trocar_senha ? '<span class="etiqueta aviso">Ainda não criou a senha</span>' : '<span class="etiqueta ok">Ativo</span>'}</td>
      <td class="acoes-td"><button type="button" class="btn peq" data-editar="${u.id}">${icone('editar')}Editar</button>
        <button type="button" class="btn peq fantasma" data-senha="${u.id}" title="Volta para a senha inicial">${icone('chave')}Redefinir senha</button></td></tr>`).join('')}
    </tbody></table></div>
    <p class="dica" style="margin-top:12px">A senha inicial de toda conta nova é <b class="mono">${esc(d.senha_inicial)}</b>. No primeiro acesso a pessoa é obrigada a criar uma senha só dela.</p>`;
  $('#usuNovo', c).onclick = () => formUsuario(null, d.senha_inicial);
  c.addEventListener('click', async (e) => {
    const ed = e.target.closest('[data-editar]');
    if (ed) formUsuario(us.find((u) => u.id === +ed.dataset.editar), d.senha_inicial);
    const se = e.target.closest('[data-senha]');
    if (se) {
      const u = us.find((x) => x.id === +se.dataset.senha);
      if (!(await confirmar(`A senha de ${u.nome} volta a ser "${d.senha_inicial}" e ${u.nome} vai precisar criar outra ao entrar. Quem estiver usando o sistema com essa conta sai na hora.`, 'Redefinir senha'))) return;
      await botaoOcupado(se, async () => { await api('PUT', `/api/admin/usuarios/${u.id}`, { resetar_senha: true }); toast(`Senha de ${u.nome} redefinida para ${d.senha_inicial}.`); rotear(); });
    }
  });
}
function formUsuario(u, senhaInicial) {
  const novo = !u;
  const j = modal(novo ? 'Nova pessoa' : `Editar — ${u.nome}`, `<div class="grade-campos">
      <label class="campo meio"><span class="obrig">Nome</span><input id="uNome" maxlength="80" autocomplete="off"></label>
      <label class="campo"><span class="${novo ? 'obrig' : ''}">Usuário (para entrar)</span><input id="uLogin" maxlength="30" autocapitalize="none" spellcheck="false" autocomplete="off" ${novo ? '' : 'disabled'}>
        <span class="dica">${novo ? 'Sem espaço e sem acento. Ex.: maria.silva' : 'O usuário não muda.'}</span></label>
      <label class="campo"><span>Função</span><input id="uFuncao" list="listaFuncoes" maxlength="60" placeholder="Ex.: Cuidador(a)"></label>
      <div class="campo largo"><span class="rotulo">Perfil</span><div class="opcoes-grau" role="radiogroup">
        <label class="opcao-grau"><input type="radio" name="uPerfil" id="uPerfilUsuario" value="usuario"><span><b>Equipe</b><small>Usa o dia a dia do sistema (residentes e os próximos módulos).</small></span></label>
        <label class="opcao-grau"><input type="radio" name="uPerfil" id="uPerfilAdmin" value="admin"><span><b>Administração</b><small>Também mexe em Configurações: usuários, cópias de segurança, rede, atualizações e auditoria. Pode excluir fichas.</small></span></label>
      </div></div>
      ${novo ? '' : '<div class="campo largo"><label class="interruptor"><input type="checkbox" id="uAtivo"><span class="trilho-int"></span><span>Conta ativa (desligue quando a pessoa sair da equipe)</span></label></div>'}
    </div>${datalist('listaFuncoes', FUNCOES)}${novo ? `<p class="dica" style="margin-top:14px">A senha inicial será <b class="mono">${esc(senhaInicial)}</b>. A pessoa cria a própria senha no primeiro acesso.</p>` : ''}`, {
    rodape: `<button type="button" class="btn" data-fechar>Cancelar</button><button type="button" class="btn primario" id="uSalvar">${icone('check')}${novo ? 'Criar conta' : 'Salvar'}</button>`,
    onAbrir: (el) => {
      $('#uNome', el).value = u ? u.nome : ''; $('#uLogin', el).value = u ? u.login : ''; $('#uFuncao', el).value = u ? u.funcao || '' : '';
      $(u && u.perfil === 'admin' ? '#uPerfilAdmin' : '#uPerfilUsuario', el).checked = true;
      if (!novo) $('#uAtivo', el).checked = !!u.ativo;
      if (novo) $('#uNome', el).addEventListener('input', () => { // sugere o usuário a partir do nome
        const p = norm($('#uNome', el).value).replace(/[^a-z ]/g, '').trim().split(/\s+/).filter((x) => !/^(de|da|do|dos|das|e)$/.test(x));
        if (!$('#uLogin', el).dataset.mexeu) $('#uLogin', el).value = p.length > 1 ? `${p[0]}.${p[p.length - 1]}` : p[0] || '';
      });
      if (novo) $('#uLogin', el).addEventListener('input', () => { $('#uLogin', el).dataset.mexeu = '1'; });
    },
  });
  $('#uSalvar', j.el).onclick = (e) => botaoOcupado(e.currentTarget, async () => {
    const el = j.el;
    const corpo = { nome: $('#uNome', el).value.trim(), funcao: $('#uFuncao', el).value.trim(), perfil: $('#uPerfilAdmin', el).checked ? 'admin' : 'usuario' };
    if (!corpo.nome) throw new Error('Informe o nome.');
    if (novo) {
      corpo.login = $('#uLogin', el).value.trim().toLowerCase();
      await api('POST', '/api/admin/usuarios', corpo);
      j.fechar(true);
      toast(`Conta criada. Usuário: ${corpo.login} · senha inicial: ${senhaInicial}`);
    } else {
      corpo.ativo = $('#uAtivo', el).checked;
      await api('PUT', `/api/admin/usuarios/${u.id}`, corpo);
      j.fechar(true);
      toast('Conta salva.');
      if (u.id === EU.id) EU = await api('GET', '/api/eu');
    }
    rotear();
  });
}

// ── Cópias de segurança ──
async function configBackups(c) {
  const d = await api('GET', '/api/backups');
  const e = d.estado;
  const cf = (await api('GET', '/api/admin')).config;
  c.innerHTML = `<div class="cabecalho"><div><h1>Cópias de segurança</h1><p class="sub">Se o computador estragar, é daqui que os dados voltam. O sistema copia sozinho a cada ${plural(e.intervalo_horas, 'hora', 'horas')}.</p></div>
    <div class="acoes"><button type="button" class="btn primario" id="bkAgora">${icone('disco')}Fazer uma cópia agora</button></div></div>
    ${d.pendente ? `<div class="faixa aviso">${icone('restaurar')}<span><b>Restauração agendada:</b> ${esc(d.pendente)}. Ela acontece quando o sistema reiniciar.</span>
      <div class="acoes"><button type="button" class="btn peq primario" id="bkReiniciar">Reiniciar agora</button><button type="button" class="btn peq" id="bkCancelar">Cancelar</button></div></div>` : ''}
    <div class="config-grade">
      <section class="cartao"><div class="estado-grande ${e.atrasado ? 'aviso' : ''}"><span class="ic-caixa">${icone(e.atrasado ? 'alerta' : 'check')}</span><div>
        <b>${e.nunca ? 'Nenhuma cópia feita ainda' : `Última cópia ${horasAtras(e.idade_horas)}`}</b>
        <span class="mudo">${e.atrasado ? 'Faça uma cópia agora e confira a pasta abaixo.' : 'Tudo em dia.'}</span></div></div>
        <dl class="dados" style="margin-top:18px">${ddRes('Pasta', e.pasta, 'largo')}${ddRes('Cópias guardadas', `${e.total} (até ${e.manter})`)}${ddRes('Espaço usado', formatarBytes(e.espaco))}
          ${ddRes('Cifradas com senha', e.cifrado ? 'Sim' : 'Não')}</dl></section>
      <section class="cartao"><div class="cartao-topo"><h2>${icone('config')}Onde e quando</h2></div><div class="grade-campos">
        <label class="campo largo"><span>Pasta das cópias</span><input id="bkPasta" placeholder="${esc(d.pasta_padrao)}">
          <span class="dica">Deixe em branco para usar a pasta padrão. O ideal é um pen drive ou uma pasta do OneDrive (fora deste computador).</span></label>
        <label class="campo"><span>Copiar a cada (horas)</span><input id="bkHoras" type="number" min="1" max="168"></label>
        <label class="campo"><span>Guardar quantas cópias</span><input id="bkManter" type="number" min="3" max="500"></label>
        <label class="campo"><span>Avisar se passar de (dias)</span><input id="bkAvisar" type="number" min="1" max="60"></label>
      </div><div class="rodape-cartao acoes"><button type="button" class="btn primario" id="bkSalvar">Salvar</button></div></section>
      <section class="cartao largo"><div class="cartao-topo"><h2>${icone('cadeado')}Senha das cópias</h2>${e.cifrado ? '<span class="etiqueta ok">Definida</span>' : '<span class="etiqueta aviso">Sem senha</span>'}</div>
        <p class="mudo" style="margin-bottom:14px">Com senha, o arquivo da cópia sai embaralhado (AES-256): se o pen drive for perdido, ninguém consegue abrir os dados dos residentes.
          <b>Anote a senha num lugar seguro</b>: sem ela, a cópia não pode ser restaurada.</p>
        <div class="acoes"><div class="campo-senha" style="flex:1 1 240px;max-width:340px"><input id="bkSenha" type="password" autocomplete="new-password" placeholder="${e.cifrado ? 'Nova senha (mín. 8 caracteres)' : 'Senha (mín. 8 caracteres)'}" aria-label="Senha das cópias">
          <button type="button" class="btn-icone" data-ver-senha aria-label="Mostrar senha">${icone('olho')}</button></div>
          <button type="button" class="btn" id="bkSenhaSalvar">${e.cifrado ? 'Trocar a senha' : 'Definir a senha'}</button>
          ${e.cifrado ? '<button type="button" class="btn fantasma" id="bkSenhaTirar">Tirar a senha</button>' : ''}</div></section>
      <section class="cartao largo" style="padding:0;overflow:hidden"><div class="cartao-topo" style="padding:18px 20px 0"><h2>${icone('relogio')}Cópias guardadas</h2></div>
        ${d.lista.length ? `<div style="overflow-x:auto"><table class="tabela" style="margin-top:12px"><thead><tr><th>Quando</th><th>Tipo</th><th>Tamanho</th><th>Senha</th><th></th></tr></thead><tbody>
          ${d.lista.map((b) => `<tr><td class="num">${esc(b.data ? `${dataBR(b.data)} ${b.hora}` : dataHoraBR(b.quando))}</td><td>${esc(b.motivo_rotulo || '—')}</td><td class="num">${esc(formatarBytes(b.tamanho))}</td>
            <td>${b.cifrado ? `<span class="etiqueta ok">${icone('cadeado')}Sim</span>` : '<span class="fraco">Não</span>'}</td>
            <td class="acoes-td"><button type="button" class="btn peq" data-restaurar="${esc(b.arquivo)}" data-cifrado="${b.cifrado ? 1 : 0}">${icone('restaurar')}Restaurar</button>
            <button type="button" class="btn-icone" data-apagar="${esc(b.arquivo)}" title="Apagar esta cópia" aria-label="Apagar esta cópia">${icone('lixo')}</button></td></tr>`).join('')}
          </tbody></table></div>` : `<div style="padding:0 20px 20px">${vazio('disco', 'Nenhuma cópia ainda', 'Clique em “Fazer uma cópia agora”.')}</div>`}
      </section>
    </div>`;
  $('#bkPasta', c).value = cf.backup_pasta || '';
  $('#bkHoras', c).value = cf.backup_horas; $('#bkManter', c).value = cf.backup_manter; $('#bkAvisar', c).value = cf.backup_avisar_dias;
  botaoVerSenha(c);
  $('#bkAgora', c).onclick = (ev) => botaoOcupado(ev.currentTarget, async () => { const r = await api('POST', '/api/backups'); toast(`Cópia gravada${r.cifrado ? ' (com senha)' : ''}.`); rotear(); });
  $('#bkSalvar', c).onclick = (ev) => botaoOcupado(ev.currentTarget, async () => {
    await api('PUT', '/api/admin/config', { backup_pasta: $('#bkPasta', c).value, backup_horas: $('#bkHoras', c).value, backup_manter: $('#bkManter', c).value, backup_avisar_dias: $('#bkAvisar', c).value });
    toast('Configuração das cópias salva.'); rotear();
  });
  $('#bkSenhaSalvar', c).onclick = (ev) => botaoOcupado(ev.currentTarget, async () => {
    const s = $('#bkSenha', c).value;
    if (s.length < 8) throw new Error('A senha das cópias precisa ter pelo menos 8 caracteres.');
    await api('PUT', '/api/backups/senha', { senha: s });
    toast('Senha definida. Já foi feita uma cópia com ela: anote a senha num lugar seguro!'); rotear();
  });
  if ($('#bkSenhaTirar', c)) $('#bkSenhaTirar', c).onclick = async (ev) => {
    if (!(await confirmar('As próximas cópias vão sair sem senha (qualquer pessoa com o arquivo consegue abrir). Continuar?', 'Tirar a senha', { perigo: true }))) return;
    await botaoOcupado(ev.currentTarget, async () => { await api('PUT', '/api/backups/senha', { senha: '' }); toast('As cópias agora saem sem senha.'); rotear(); });
  };
  if ($('#bkReiniciar', c)) $('#bkReiniciar', c).onclick = () => reiniciarSistema('Restaurando a cópia…').catch((er) => toast(er.message, true));
  if ($('#bkCancelar', c)) $('#bkCancelar', c).onclick = (ev) => botaoOcupado(ev.currentTarget, async () => { await api('DELETE', '/api/backups/restaurar'); toast('Restauração cancelada.'); rotear(); });
  c.addEventListener('click', async (ev) => {
    const ap = ev.target.closest('[data-apagar]');
    if (ap) {
      if (!(await confirmar(`Apagar a cópia ${ap.dataset.apagar}? Não dá para desfazer.`, 'Apagar', { perigo: true }))) return;
      await botaoOcupado(ap, async () => { await api('DELETE', `/api/backups/${encodeURIComponent(ap.dataset.apagar)}`); toast('Cópia apagada.'); rotear(); });
    }
    const rs = ev.target.closest('[data-restaurar]');
    if (rs) janelaRestaurar(rs.dataset.restaurar, rs.dataset.cifrado === '1');
  });
}
function janelaRestaurar(arquivo, cifrado) {
  const j = modal('Restaurar uma cópia', `<p class="texto-confirmar">Os dados vão voltar a ser <b>exatamente</b> como estavam nesta cópia: <span class="mono">${esc(arquivo)}</span>.
    Tudo o que foi feito depois dela some. Antes de trocar, o sistema guarda uma cópia de como está agora (dá para voltar atrás).</p>
    ${cifrado ? `<label class="campo" style="margin-top:16px"><span class="obrig">Senha desta cópia</span><div class="campo-senha"><input id="rsSenha" type="password" autocomplete="off"><button type="button" class="btn-icone" data-ver-senha aria-label="Mostrar senha">${icone('olho')}</button></div></label>` : ''}
    <p class="dica" style="margin-top:14px">Depois o sistema precisa reiniciar. Avise quem estiver usando.</p>`, {
    tamanho: 'estreito', rascunho: false,
    rodape: `<button type="button" class="btn" data-fechar>Cancelar</button><button type="button" class="btn perigo" id="rsOk">${icone('restaurar')}Restaurar e reiniciar</button>`,
    onAbrir: (el) => botaoVerSenha(el),
  });
  $('#rsOk', j.el).onclick = (e) => botaoOcupado(e.currentTarget, async () => {
    await api('POST', '/api/backups/restaurar', { arquivo, senha: cifrado ? $('#rsSenha', j.el).value : undefined });
    j.fechar(true);
    await reiniciarSistema('Restaurando a cópia…');
  });
}

// ── Celular e rede ──
async function configRede(c) {
  const d = await api('GET', '/api/admin/rede');
  const prov = d.enderecos.filter((x) => x.provavel);
  const principal = (prov[0] || d.enderecos[0] || {}).ip;
  const url = principal ? `http://${principal}:${d.porta}` : '';
  const pendente = d.liberada !== d.ativa && !d.forcada;
  c.innerHTML = `${cabecalhoConfig('Celular e rede', 'Deixe a equipe usar o sistema pelo celular ou por outro computador do lar.')}
    ${pendente ? `<div class="faixa aviso">${icone('atualizar')}<span>A mudança vale depois de reiniciar o sistema.</span><div class="acoes"><button type="button" class="btn peq primario" id="redeReiniciar">Reiniciar agora</button></div></div>` : ''}
    <div class="config-grade">
      <section class="cartao"><div class="cartao-topo"><h2>${icone('rede')}Acesso pela rede</h2></div>
        <label class="interruptor"><input type="checkbox" id="redeLiberar"${d.liberada || d.forcada ? ' checked' : ''}${d.forcada ? ' disabled' : ''}><span class="trilho-int"></span><span>Liberar para celulares e outros computadores</span></label>
        <p class="mudo" style="margin-top:14px">Funciona só com os aparelhos no <b>mesmo Wi-Fi</b> deste computador. Use o Wi-Fi interno do lar — <b>nunca</b> o Wi-Fi de visitantes.
          Cada pessoa continua entrando com o próprio usuário e senha.</p>
        ${d.forcada ? '<p class="dica" style="margin-top:10px">Está liberado à força pela janela preta (APP_REDE=1).</p>' : ''}
        <ol class="passos" style="margin-top:16px"><li>Ligue a opção acima e reinicie o sistema.</li><li>No celular, conecte no Wi-Fi do lar.</li><li>Aponte a câmera para o QR Code ao lado (ou digite o endereço).</li><li>Entre com o seu usuário e senha.</li></ol>
      </section>
      <section class="cartao"><div class="cartao-topo"><h2>${icone('celular')}Entrar pelo celular</h2></div>
        ${d.ativa && url ? `<div class="qr" aria-label="QR Code para ${esc(url)}">${gerarQR(url)}</div><p class="endereco-grande">${esc(url)}</p>
          ${d.enderecos.length > 1 ? `<p class="dica" style="text-align:center;margin-top:8px">Se não abrir, tente: ${d.enderecos.slice(1).map((x) => `<span class="mono">http://${esc(x.ip)}:${d.porta}</span>`).join(', ')}</p>` : ''}`
        : vazio('celular', d.ativa ? 'Não achei este computador na rede' : 'O acesso pela rede está fechado', d.ativa ? 'Confira se o computador está conectado ao Wi-Fi ou ao cabo de rede.' : 'Ligue a opção ao lado e reinicie para aparecer o QR Code.')}
      </section>
    </div>`;
  const chave = $('#redeLiberar', c);
  chave.onchange = tentar(async () => {
    const r = await api('PUT', '/api/admin/rede', { liberada: chave.checked });
    toast(chave.checked ? 'Acesso pela rede liberado.' : 'Acesso pela rede fechado.');
    if (r.precisa_reiniciar) rotear();
  });
  if ($('#redeReiniciar', c)) $('#redeReiniciar', c).onclick = () => reiniciarSistema().catch((e) => toast(e.message, true));
}

// ── Atualizações ──
async function configAtualizacoes(c) {
  const d = await api('GET', '/api/admin/atualizacao');
  c.innerHTML = `${cabecalhoConfig('Atualizações', 'Traz a versão mais nova do sistema pelo GitHub. Antes de atualizar, o sistema faz uma cópia de segurança sozinho.')}
    <div class="config-grade">
      <section class="cartao"><div class="estado-grande"><span class="ic-caixa">${icone('check')}</span><div><b>Versão ${esc(d.versao)}</b>
        <span class="mudo">${d.atual ? `Instalada em ${esc(dataBR(d.atual.data))}: ${esc(d.atual.assunto)}` : 'Instalada neste computador'}</span></div></div>
        ${d.aviso ? `<div class="faixa aviso" style="margin:16px 0 0">${icone('info')}<span>${esc(d.aviso)}</span></div>` : ''}
        ${d.repositorio && !d.limpo ? `<div class="faixa aviso" style="margin:16px 0 0">${icone('alerta')}<span>Há arquivos alterados nesta pasta; a atualização automática fica bloqueada para não perder esse trabalho.</span></div>` : ''}
        <div class="rodape-cartao acoes"><button type="button" class="btn primario" id="atuVerificar"${d.repositorio ? '' : ' disabled'}>${icone('atualizar')}Procurar atualização</button></div></section>
      <section class="cartao" id="atuResultado"><div class="cartao-topo"><h2>${icone('baixar')}Novidades</h2></div><p class="mudo">Clique em “Procurar atualização” (precisa de internet).</p></section>
    </div>`;
  const res = $('#atuResultado', c);
  $('#atuVerificar', c).onclick = (e) => botaoOcupado(e.currentTarget, async () => {
    const v = await api('POST', '/api/admin/atualizacao/verificar');
    if (!v.verificado) { res.innerHTML = `<div class="cartao-topo"><h2>${icone('baixar')}Novidades</h2></div><div class="faixa aviso" style="margin:0">${icone('alerta')}<span>${esc(v.aviso || 'Não consegui verificar.')}</span></div>`; return; }
    if (!v.disponivel) { res.innerHTML = `<div class="cartao-topo"><h2>${icone('baixar')}Novidades</h2></div>${vazio('check', 'Você já está na versão mais nova', 'Nada para atualizar agora.')}`; return; }
    res.innerHTML = `<div class="cartao-topo"><h2>${icone('baixar')}${plural(v.novidades.length, 'novidade', 'novidades')}</h2></div>
      <ul class="limpa historico">${v.novidades.map((n) => `<li><time>${esc(dataBR(n.data))}</time><span>${esc(n.assunto)}</span></li>`).join('')}</ul>
      <div class="rodape-cartao acoes"><button type="button" class="btn primario" id="atuAplicar">${icone('baixar')}Atualizar agora</button></div>`;
    $('#atuAplicar', res).onclick = async (ev) => {
      if (!(await confirmar('O sistema vai fazer uma cópia de segurança, baixar a versão nova e reiniciar. Avise quem estiver usando. Continuar?', 'Atualizar'))) return;
      await botaoOcupado(ev.currentTarget, async () => {
        const a = await api('POST', '/api/admin/atualizacao/aplicar');
        if (!a.ok) throw new Error(a.aviso || 'A atualização não foi aplicada.');
        if (a.precisa_reiniciar) await reiniciarSistema('Aplicando a versão nova…');
        else toast('Nada mudou: já estava atualizado.');
      });
    };
  });
}

// ── Auditoria ──
function detalheLog(txt) {
  let d;
  try { d = JSON.parse(txt); } catch { return txt || ''; }
  if (!d || typeof d !== 'object') return String(d ?? '');
  const partes = [d.nome, d.item, d.titulo, d.contato, d.login, d.arquivo, d.campos && d.campos.length ? 'campos: ' + d.campos.join(', ') : '', d.obs].filter(Boolean);
  return partes.length ? partes.join(' · ') : Object.entries(d).map(([k, v]) => `${k}: ${v}`).join(' · ');
}
async function configAuditoria(c) {
  c.innerHTML = `${cabecalhoConfig('Auditoria', 'Tudo o que cada pessoa fez no sistema, do mais novo para o mais antigo.')}
    <div class="barra-ferramentas"><label class="busca">${icone('busca')}<input type="search" id="audBusca" placeholder="Filtrar por pessoa, ação ou nome do residente" aria-label="Filtrar auditoria"></label></div>
    <div id="audLista"></div>`;
  const lista = $('#audLista', c), busca = $('#audBusca', c);
  let espera = null, pedido = 0;
  const carregar = async () => {
    const n = ++pedido;
    const q = busca.value.trim();
    const linhas = await api('GET', '/api/admin/log' + (q ? '?q=' + encodeURIComponent(q) : ''));
    if (n !== pedido) return;
    lista.innerHTML = linhas.length ? `<div class="tabela-caixa"><table class="tabela"><thead><tr><th>Quando</th><th>Quem</th><th>O que fez</th><th>Detalhe</th></tr></thead><tbody>
      ${linhas.map((l) => `<tr><td class="num" style="white-space:nowrap">${esc(dataHoraBR(l.quando))}</td><td style="white-space:nowrap">${l.usuario === 'sistema' ? '<span class="fraco">sistema</span>' : esc(l.nome)}</td>
        <td>${esc(l.acao)}</td><td><div class="detalhe-log" title="${esc(detalheLog(l.detalhe))}">${esc(detalheLog(l.detalhe))}</div></td></tr>`).join('')}</tbody></table></div>
      <p class="dica" style="margin-top:10px">Mostrando ${plural(linhas.length, 'registro', 'registros')}${linhas.length >= 300 ? ' (os 300 mais recentes)' : ''}.</p>`
      : `<div class="cartao">${vazio('relogio', 'Nada encontrado', q ? `Nenhum registro com “${esc(q)}”.` : 'Ainda não há registros.')}</div>`;
  };
  busca.addEventListener('input', () => { clearTimeout(espera); espera = setTimeout(() => carregar().catch((e) => toast(e.message, true)), 300); });
  await carregar();
}
