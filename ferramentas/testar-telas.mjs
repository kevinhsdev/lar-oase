// TESTE AUTOMÁTICO do OASE - Lar — a rede de proteção antes de cada entrega.
// Uso (na pasta do projeto):  node ferramentas\testar-telas.mjs
//
// O que faz: sobe um servidor de teste com banco numa PASTA TEMPORÁRIA (porta 3998, nunca toca em dados/),
// confere as regras do servidor pela API, carrega a demonstração fictícia, abre TODAS as telas no Edge escondido
// (computador, celular e modo escuro), acusa qualquer erro de JavaScript e tira fotos em ferramentas\prints.
// No fim desliga tudo e apaga a pasta temporária. Sai com código 1 se algo falhar.
//
// Tela nova? Acrescente na lista TELAS abaixo.
import { spawn, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const APP = path.join(RAIZ, 'app');
const PRINTS = path.join(RAIZ, 'ferramentas', 'prints');
const PORTA = 3998, PORTA_EDGE = 9333;
const BASE = `http://127.0.0.1:${PORTA}`;
const SENHA_TESTE = 'teste-senha-9x';

// [endereço, nome da foto, precisa de dado?]
const TELAS = [
  ['#/inicio', 'inicio'],
  ['#/residentes', 'residentes'],
  ['#/residentes/hospitalizado', 'residentes-hospitalizados'],
  ['#/residentes/historico', 'residentes-historico'],
  ['#/residente/{id}', 'ficha'],
  ['#/prontuario/{id}', 'prontuario'],
  ['#/pia', 'pia'],
  ['#/pia/residente-{id}', 'pia-residente'],
  ['#/diario', 'diario'],
  ['#/diario/{ontem}', 'diario-ontem'],
  ['#/diario/atencao', 'diario-atencao'],
  ['#/diario/residente-{id}', 'diario-residente'],
  ['#/medicacao', 'remedios-hoje'],
  ['#/medicacao/{ontem}', 'remedios-ontem'],
  ['#/prescricoes', 'prescricoes'],
  ['#/prescricoes/residente-{id}', 'prescricoes-residente'],
  ['#/sinais', 'sinais-ronda'],
  ['#/sinais/residente-{id}', 'sinais-graficos'],
  ['#/avaliacoes', 'avaliacoes'],
  ['#/avaliacoes/residente-{id}', 'avaliacoes-residente'],
  ['#/vacinas', 'vacinas'],
  ['#/vacinas/avisos', 'vacinas-avisos'],
  ['#/vacinas/residente-{id}', 'vacinas-cartao'],
  ['#/agenda', 'agenda'],
  ['#/agenda/residente-{id}', 'agenda-residente'],
  ['#/tarefas', 'tarefas'],
  ['#/tarefas/minhas', 'tarefas-minhas'],
  ['#/estoque', 'estoque'],
  ['#/estoque/avisos', 'estoque-avisos'],
  ['#/estoque/item-{prod}', 'estoque-item'],
  ['#/patrimonio', 'patrimonio'],
  ['#/patrimonio/avisos', 'patrimonio-avisos'],
  ['#/escala', 'escala'],
  ['#/profissionais', 'profissionais'],
  ['#/financeiro', 'financeiro'],
  ['#/lancamentos', 'financeiro-contas'],
  ['#/mensalidades', 'financeiro-mensalidades'],
  ['#/config/geral', 'config-geral'],
  ['#/config/usuarios', 'config-usuarios'],
  ['#/config/backups', 'config-backups'],
  ['#/config/rede', 'config-rede'],
  ['#/config/atualizacoes', 'config-atualizacoes'],
  ['#/config/auditoria', 'config-auditoria'],
];

let ok = 0, falhas = 0;
const errosJs = [];
const passou = (msg) => { ok++; console.log('  ok     ' + msg); };
const falhou = (msg) => { falhas++; console.log('  FALHOU ' + msg); };
const conferir = (cond, msg) => (cond ? passou(msg) : falhou(msg));
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

// ───────────── 1. conferências sem servidor ─────────────
console.log('\n1. Conferências dos arquivos');
{
  const vServ = fs.readFileSync(path.join(APP, 'lib', 'versao.js'), 'utf8').match(/VERSAO:\s*'([^']+)'/)?.[1];
  const vTela = fs.readFileSync(path.join(APP, 'public', 'app.js'), 'utf8').match(/const VERSAO = '([^']+)'/)?.[1];
  conferir(vServ && vServ === vTela, `versão igual nos dois lugares (${vServ} / ${vTela})`);
  const nomes = {};
  for (const f of fs.readdirSync(path.join(APP, 'public')).filter((x) => x.endsWith('.js'))) {
    for (const m of fs.readFileSync(path.join(APP, 'public', f), 'utf8').matchAll(/^(?:const|let|function|async function)\s+(\w+)/gm)) (nomes[m[1]] ||= []).push(f);
  }
  const rep = Object.entries(nomes).filter(([, fs2]) => fs2.length > 1);
  conferir(!rep.length, 'nenhum nome global repetido entre os scripts' + (rep.length ? ': ' + rep.map(([n, a]) => `${n} (${a.join(', ')})`).join('; ') : ''));
  const html = fs.readFileSync(path.join(APP, 'public', 'index.html'), 'utf8');
  const faltando = fs.readdirSync(path.join(APP, 'public')).filter((x) => x.endsWith('.js') && !html.includes(`src="${x}"`));
  conferir(!faltando.length, 'todo script da pasta public está no index.html' + (faltando.length ? ': faltam ' + faltando.join(', ') : ''));
  const js = fs.readdirSync(path.join(APP, 'public')).filter((x) => x.endsWith('.js')).map((f) => fs.readFileSync(path.join(APP, 'public', f), 'utf8')).join('\n');
  conferir(!/\balert\(|\bconfirm\(|\bprompt\(/.test(js.replace(/\/\/.*$/gm, '')), 'sem alert/confirm/prompt do navegador');
  conferir(!/on(click|input|change|submit)="/.test(js), 'sem onclick="" escrito no HTML (a segurança bloqueia)');
}

// ───────────── 2. servidor temporário ─────────────
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'lar-teste-'));
const servidor = spawn(process.execPath, ['--no-warnings', 'server.js'], {
  cwd: APP, env: { ...process.env, APP_DADOS: path.join(TMP, 'dados'), APP_PORTA: String(PORTA), APP_RAIZ: TMP }, stdio: ['ignore', 'pipe', 'pipe'],
});
let saidaServidor = '';
servidor.stdout.on('data', (d) => { saidaServidor += d; });
servidor.stderr.on('data', (d) => { saidaServidor += d; });
let edge = null;

async function limpar() {
  if (edge && edge.pid) { try { execFileSync('taskkill', ['/PID', String(edge.pid), '/T', '/F'], { stdio: 'ignore' }); } catch { /* já saiu */ } }
  if (servidor.exitCode == null) servidor.kill();
  for (let i = 0; i < 10; i++) {
    try { fs.rmSync(TMP, { recursive: true, force: true }); break; } catch { await esperar(500); }
  }
}

// Conversa com a API guardando o cookie da sessão
let cookie = '';
async function api(metodo, url, corpo, { semCabecalho = false } = {}) {
  const r = await fetch(BASE + url, {
    method: metodo,
    headers: { ...(semCabecalho ? {} : { 'X-APP': '1' }), ...(corpo ? { 'Content-Type': 'application/json' } : {}), ...(cookie ? { Cookie: cookie } : {}) },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  const sc = r.headers.get('set-cookie');
  if (sc) cookie = sc.split(';')[0];
  return { status: r.status, dados: await r.json().catch(() => ({})) };
}

// ───────────── Edge escondido pelo protocolo de depuração (sem biblioteca) ─────────────
function acharEdge() {
  const c = [process.env.EDGE, 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Google/Chrome/Application/chrome.exe'].filter(Boolean);
  return c.find((p) => fs.existsSync(p));
}
function conectar(url) {
  return new Promise((ok2, erro) => {
    const ws = new WebSocket(url);
    let id = 0;
    const pend = new Map(), ouvintes = [];
    ws.onopen = () => ok2({
      enviar: (method, params = {}) => new Promise((res, rej) => { const i = ++id; pend.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); }),
      ouvir: (fn) => ouvintes.push(fn),
      fechar: () => ws.close(),
    });
    ws.onerror = () => erro(new Error('não conectei no Edge'));
    ws.onmessage = (ev) => {
      const m = JSON.parse(ev.data);
      if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); if (m.error) p.rej(new Error(m.error.message)); else p.res(m.result); } else ouvintes.forEach((f) => f(m));
    };
  });
}

async function principal() {
  // espera o servidor subir
  let subiu = false;
  for (let i = 0; i < 60 && !subiu; i++) { try { subiu = (await fetch(BASE + '/api/versao')).ok; } catch { await esperar(250); } }
  if (!subiu) { console.log(saidaServidor); throw new Error('o servidor de teste não subiu'); }

  console.log('\n2. Regras do servidor (API)');
  conferir((await api('GET', '/api/residentes')).status === 401, 'sem entrar, não vê residentes (401)');
  conferir((await api('POST', '/api/login', { login: 'kevin', senha: 'errada' })).status === 401, 'senha errada é recusada');
  conferir((await api('POST', '/api/login', { login: 'kevin', senha: 'trocar123' })).status === 200, 'entra com a senha inicial');
  conferir((await api('GET', '/api/residentes')).status === 428, 'senha inicial obriga a trocar antes de usar (428)');
  conferir((await api('POST', '/api/trocar-senha', { atual: 'trocar123', nova: '12345678' })).status === 400, 'recusa senha fraca');
  conferir((await api('POST', '/api/trocar-senha', { atual: 'trocar123', nova: SENHA_TESTE })).status === 200, 'troca a senha');
  conferir((await api('POST', '/api/residentes', { nome: 'X' }, { semCabecalho: true })).status === 403, 'pedido sem o cabeçalho do app é bloqueado (CSRF)');
  conferir((await api('POST', '/api/residentes', { nome: '' })).status === 400, 'residente sem nome é recusado');
  conferir((await api('POST', '/api/residentes', { nome: 'Teste CPF', cpf: '111.111.111-11' })).status === 400, 'CPF inválido é recusado');
  conferir((await api('POST', '/api/residentes', { nome: 'Teste Futuro', dt_nasc: '2999-01-01' })).status === 400, 'nascimento no futuro é recusado');
  const novo = await api('POST', '/api/residentes', { nome: 'Pessoa de Teste', cpf: '529.982.247-25', quarto: '12', coluna_estranha: 'x' });
  conferir(novo.status === 201, 'cadastra residente (campo desconhecido é ignorado)');
  const idTeste = novo.dados.id;
  conferir((await api('POST', '/api/residentes', { nome: 'Outra', cpf: '52998224725' })).status === 400, 'CPF repetido é recusado');
  const ficha = await api('GET', `/api/residentes/${idTeste}`);
  conferir(ficha.dados.residente?.cpf === '529.982.247-25' && ficha.dados.residente.situacao === 'no_lar', 'CPF sai formatado e a situação começa "no lar"');
  const c1 = await api('POST', `/api/residentes/${idTeste}/contatos`, { nome: 'Filha Um', responsavel: 1 });
  const c2 = await api('POST', `/api/residentes/${idTeste}/contatos`, { nome: 'Filho Dois', responsavel: 1 });
  const contatos = (await api('GET', `/api/residentes/${idTeste}`)).dados.contatos;
  conferir(c1.status === 201 && c2.status === 201 && contatos.filter((x) => x.responsavel).length === 1 && contatos.find((x) => x.responsavel).nome === 'Filho Dois', 'só existe um responsável por residente');
  conferir((await api('PUT', `/api/residentes/${idTeste}/situacao`, { situacao: 'hospitalizado', desde: new Date().toLocaleDateString('sv-SE'), obs: 'teste' })).status === 200, 'muda a situação para hospitalizado');
  conferir((await api('PUT', `/api/residentes/${idTeste}/situacao`, { situacao: 'inventada' })).status === 400, 'situação inventada é recusada');
  // aviso de edição simultânea: outra pessoa grava depois que eu abri
  await api('POST', '/api/admin/usuarios', { login: 'maria.teste', nome: 'Maria Teste', perfil: 'usuario' });
  const versaoAberta = (await api('GET', `/api/residentes/${idTeste}`)).dados.residente.atualizado_em;
  const meuCookie = cookie;
  cookie = '';
  await api('POST', '/api/login', { login: 'maria.teste', senha: 'trocar123' });
  await api('POST', '/api/trocar-senha', { atual: 'trocar123', nova: 'outra-senha-7y' });
  await esperar(5);
  conferir((await api('PUT', `/api/residentes/${idTeste}`, { quarto: '13' })).status === 200, 'pessoa da equipe edita a ficha');
  conferir((await api('DELETE', `/api/residentes/${idTeste}`)).status === 403, 'pessoa da equipe NÃO pode excluir ficha');
  conferir((await api('GET', '/api/admin')).status === 403, 'pessoa da equipe NÃO entra em Configurações');
  const cookieMaria = cookie;
  cookie = meuCookie;
  const conflito = await api('PUT', `/api/residentes/${idTeste}`, { quarto: '14', _versao: versaoAberta });
  conferir(conflito.status === 409 && conflito.dados.conflito?.por === 'Maria Teste', 'avisa quando outra pessoa salvou antes (409)');
  conferir((await api('PUT', `/api/residentes/${idTeste}`, { quarto: '14', _versao: versaoAberta, _forcar: true })).status === 200, 'salva mesmo assim quando a pessoa confirma');
  // Diário
  const hojeT = new Date().toLocaleDateString('sv-SE');
  const base = { residente_id: idTeste, data: hojeT, hora: '10:30', tipo: 'saude', texto: 'Febre à tarde' };
  conferir((await api('POST', '/api/ocorrencias', { ...base, texto: '' })).status === 400, 'diário: registro sem texto é recusado');
  conferir((await api('POST', '/api/ocorrencias', { ...base, data: '2999-01-01' })).status === 400, 'diário: data no futuro é recusada');
  conferir((await api('POST', '/api/ocorrencias', { ...base, temperatura: '60' })).status === 400, 'diário: temperatura impossível é recusada');
  conferir((await api('POST', '/api/ocorrencias', { ...base, tipo: 'inventado' })).status === 400, 'diário: tipo inventado é recusado');
  const oc = await api('POST', '/api/ocorrencias', { ...base, gravidade: 'atencao', temperatura: '37,9', pa: '130 x 80' });
  const ocLida = (await api('GET', `/api/ocorrencias?residente=${idTeste}`)).dados.itens.find((x) => x.id === oc.dados.id);
  conferir(oc.status === 201 && ocLida?.turno === 'manha' && ocLida.temperatura === 37.9 && ocLida.pa === '130x80', 'diário: anota com turno automático e sinais vitais');
  conferir((await api('GET', '/api/ocorrencias/resumo')).dados.pendentes === 1, 'diário: "atenção" fica pendente');
  conferir((await api('POST', '/api/ocorrencias', { data: hojeT, hora: '20:00', tipo: 'recado', texto: 'Recado geral' })).status === 201, 'diário: recado geral sem residente');
  cookie = cookieMaria;
  conferir((await api('PUT', `/api/ocorrencias/${oc.dados.id}`, { texto: 'mudei' })).status === 403, 'diário: equipe não edita o registro de outra pessoa');
  conferir((await api('DELETE', `/api/ocorrencias/${oc.dados.id}`)).status === 403, 'diário: equipe não apaga registro');
  conferir((await api('PUT', `/api/ocorrencias/${oc.dados.id}/resolver`, { resolucao: 'Enfermagem avaliou' })).status === 200, 'diário: qualquer pessoa da equipe resolve');
  cookie = meuCookie;
  conferir((await api('GET', '/api/ocorrencias/resumo')).dados.pendentes === 0, 'diário: resolvida sai das pendentes');
  conferir((await api('PUT', `/api/ocorrencias/${oc.dados.id}`, { texto: 'Febre à tarde, 37,9' })).status === 200, 'diário: quem escreveu corrige o texto');
  // Agenda
  const amanhaT = new Date(Date.now() + 86400000).toLocaleDateString('sv-SE');
  const comp = { residente_id: idTeste, data: amanhaT, hora: '09:00', tipo: 'consulta', titulo: 'Cardiologista' };
  conferir((await api('POST', '/api/agenda', { ...comp, titulo: '' })).status === 400, 'agenda: sem título é recusado');
  conferir((await api('POST', '/api/agenda', { ...comp, tipo: 'festa' })).status === 400, 'agenda: tipo inventado é recusado');
  conferir((await api('POST', '/api/agenda', { ...comp, hora_fim: '08:00' })).status === 400, 'agenda: fim antes do início é recusado');
  const ag = await api('POST', '/api/agenda', { ...comp, local: 'UBS', acompanhante: 'Ana' });
  conferir(ag.status === 201, 'agenda: agenda uma consulta');
  conferir((await api('POST', '/api/agenda', { data: amanhaT, tipo: 'atividade', titulo: 'Culto' })).status === 201, 'agenda: compromisso do lar todo (sem residente, dia todo)');
  const prox = (await api('GET', `/api/agenda?residente=${idTeste}&proximos=1`)).dados.itens;
  conferir(prox.length === 1 && prox[0].titulo === 'Cardiologista', 'agenda: próximos compromissos do residente');
  cookie = cookieMaria;
  conferir((await api('PUT', `/api/agenda/${ag.dados.id}`, { local: 'UBS Centro' })).status === 200, 'agenda: equipe edita compromisso');
  conferir((await api('DELETE', `/api/agenda/${ag.dados.id}`)).status === 403, 'agenda: equipe não apaga o que outra pessoa marcou');
  cookie = meuCookie;
  conferir((await api('PUT', `/api/agenda/${ag.dados.id}/situacao`, { situacao: 'feito', resultado: 'Retorno em 30 dias' })).status === 200, 'agenda: marca como feito com resultado');
  conferir((await api('GET', `/api/agenda?residente=${idTeste}&proximos=1`)).dados.itens.length === 0, 'agenda: feito sai dos próximos');
  // Agenda que se repete
  const ate4 = new Date(Date.now() + 28 * 86400000).toLocaleDateString('sv-SE');
  conferir((await api('POST', '/api/agenda', { data: amanhaT, tipo: 'atividade', titulo: 'Culto', repetir: 'semanal', repetir_ate: '2000-01-01' })).status === 400, 'agenda: repetição com "até" antes do início é recusada');
  const serieAg = await api('POST', '/api/agenda', { data: amanhaT, hora: '15:00', tipo: 'atividade', titulo: 'Culto da semana (teste)', repetir: 'semanal', repetir_ate: ate4 });
  conferir(serieAg.status === 201 && serieAg.dados.vezes >= 4, `agenda: "toda semana" cria ${serieAg.dados.vezes} compromissos`);
  const parar = await api('POST', `/api/agenda/${serieAg.dados.id}/serie`, {});
  conferir(parar.status === 200 && parar.dados.vezes === serieAg.dados.vezes, 'agenda: "parar a repetição" desmarca todos os próximos');

  // Avaliações (Katz, Braden, Morse)
  const katzTudo1 = { banho: 1, vestir: 1, banheiro: 1, transferencia: 1, continencia: 1, alimentacao: 1 };
  conferir((await api('POST', '/api/avaliacoes', { residente_id: idTeste, escala: 'katz', respostas: { banho: 1 } })).status === 400, 'avaliações: faltando resposta é recusado');
  conferir((await api('POST', '/api/avaliacoes', { residente_id: idTeste, escala: 'katz', respostas: { ...katzTudo1, banho: 7 } })).status === 400, 'avaliações: resposta inventada é recusada');
  const katz = await api('POST', '/api/avaliacoes', { residente_id: idTeste, escala: 'katz', respostas: katzTudo1 });
  conferir(katz.status === 201 && katz.dados.pontuacao === 6 && katz.dados.classificacao === 'Independente', 'avaliações: Katz 6 = independente');
  const brad = await api('POST', '/api/avaliacoes', { residente_id: idTeste, escala: 'braden', respostas: { percepcao: 2, umidade: 2, atividade: 1, mobilidade: 2, nutricao: 2, friccao: 1 } });
  conferir(brad.dados.pontuacao === 10 && brad.dados.classificacao === 'Risco alto', 'avaliações: Braden 10 = risco alto de ferida');
  const mor = await api('POST', '/api/avaliacoes', { residente_id: idTeste, escala: 'morse', respostas: { quedas: 25, diagnosticos: 15, apoio: 15, soro: 0, marcha: 10, mental: 0 } });
  conferir(mor.dados.pontuacao === 65 && mor.dados.classificacao === 'Risco alto', 'avaliações: Morse 65 = risco alto de queda');
  cookie = cookieMaria;
  conferir((await api('DELETE', `/api/avaliacoes/${katz.dados.id}`)).status === 403, 'avaliações: equipe não apaga avaliação de outra pessoa');
  cookie = meuCookie;

  // Financeiro (só a administração)
  cookie = cookieMaria;
  conferir((await api('GET', '/api/financeiro/resumo')).status === 403 && (await api('GET', '/api/lancamentos')).status === 403, 'financeiro: a equipe não vê o financeiro');
  cookie = meuCookie;
  const hojeF = new Date().toLocaleDateString('sv-SE');
  conferir((await api('POST', '/api/lancamentos', { tipo: 'despesa', categoria: 'Alimentação', descricao: 'X', valor: '0', vencimento: hojeF })).status === 400, 'financeiro: valor zero é recusado');
  const luz = await api('POST', '/api/lancamentos', { tipo: 'despesa', categoria: 'Água, luz, gás e telefone', descricao: 'Luz (teste)', valor: '1.234,56', vencimento: hojeF, repetir_meses: 3 });
  conferir(luz.status === 201 && luz.dados.ids.length === 3, 'financeiro: conta fixa repetida por 3 meses');
  const doa = await api('POST', '/api/lancamentos', { tipo: 'receita', categoria: 'Doação', descricao: 'Doação (teste)', valor: '500', vencimento: hojeF, pessoa: 'Doador' });
  await api('PUT', `/api/lancamentos/${doa.dados.ids[0]}/pagar`, { forma: 'Pix' });
  const lcs = (await api('GET', `/api/lancamentos?mes=${hojeF.slice(0, 7)}`)).dados.itens;
  conferir(lcs.find((x) => x.id === luz.dados.ids[0]).valor === 1234.56 && lcs.find((x) => x.id === doa.dados.ids[0]).situacao === 'pago', 'financeiro: valor com vírgula e recebimento registrado');
  await api('PUT', `/api/mensalidades/residente/${idTeste}`, { mensalidade: '3.000,00', dia_vencimento: 10 });
  const ger = await api('POST', '/api/mensalidades/gerar', { mes: hojeF.slice(0, 7) });
  const ger2 = await api('POST', '/api/mensalidades/gerar', { mes: hojeF.slice(0, 7) });
  conferir(ger.dados.geradas === 1 && ger2.dados.geradas === 0, 'financeiro: gera a mensalidade do mês uma vez só');

  // PIA
  const piaT = (await api('GET', `/api/pia?residente=${idTeste}`)).dados;
  conferir(!piaT.atual && /Filho Dois/.test(piaT.sugestao.social.situacao) && piaT.sugestao.saude.situacao.length > 10, 'PIA: a sugestão traz os dados da pessoa (familiares, saúde)');
  conferir((await api('POST', '/api/pia', { residente_id: idTeste, areas: { saude: { situacao: 'x' } } })).status === 400, 'PIA: sem metas nem cuidados é recusado');
  const pia1 = await api('POST', '/api/pia', { residente_id: idTeste, participantes: 'Equipe', areas: { saude: { situacao: 'Hipertensa', metas: 'Pressão controlada', acoes: 'Aferir toda manhã', responsavel: 'Enfermagem' } } });
  const pia2 = await api('POST', '/api/pia', { residente_id: idTeste, areas: { saude: { metas: 'Pressão controlada', acoes: 'Aferir 2x por dia' } } });
  const piaV = (await api('GET', `/api/pia?residente=${idTeste}`)).dados;
  conferir(pia1.status === 201 && pia2.status === 201 && piaV.versoes.length === 2 && piaV.atual.areas.saude.acoes === 'Aferir 2x por dia', 'PIA: cada revisão vira uma versão nova (a última vale)');

  // Tarefas
  conferir((await api('POST', '/api/tarefas', { titulo: '' })).status === 400, 'tarefas: sem título é recusada');
  conferir((await api('POST', '/api/tarefas', { titulo: 'X', repetir: 'semanal' })).status === 400, 'tarefas: repetir sem prazo é recusado');
  const tf = await api('POST', '/api/tarefas', { titulo: 'Trocar roupa de cama (teste)', prazo: new Date().toLocaleDateString('sv-SE'), repetir: 'semanal' });
  const feitaTf = await api('PUT', `/api/tarefas/${tf.dados.id}/feita`, { feita: true });
  conferir(feitaTf.status === 200 && feitaTf.dados.proxima, 'tarefas: marcar feita cria a próxima (repetição)');
  cookie = cookieMaria;
  conferir((await api('DELETE', `/api/tarefas/${tf.dados.id}`)).status === 403, 'tarefas: equipe não apaga tarefa de outra pessoa');
  cookie = meuCookie;

  // Estoque
  conferir((await api('POST', '/api/produtos', { nome: '', categoria: 'higiene' })).status === 400, 'estoque: item sem nome é recusado');
  conferir((await api('POST', '/api/produtos', { nome: 'X', categoria: 'inventada' })).status === 400, 'estoque: categoria inventada é recusada');
  const prod = await api('POST', '/api/produtos', { nome: 'Fralda de teste', categoria: 'higiene', unidade: 'pct', estoque_minimo: '5', quantidade_inicial: '10' });
  conferir(prod.status === 201, 'estoque: cadastra item com quantidade inicial');
  const saldoDe = async () => (await api('GET', `/api/produtos/${prod.dados.id}`)).dados.produto;
  conferir((await api('POST', `/api/produtos/${prod.dados.id}/movimentos`, { tipo: 'saida', quantidade: 20 })).status === 400, 'estoque: não deixa sair mais do que tem');
  await api('POST', `/api/produtos/${prod.dados.id}/movimentos`, { tipo: 'saida', quantidade: '6' });
  let pr = await saldoDe();
  conferir(pr.saldo === 4 && pr.acabando, 'estoque: saída desconta e avisa que está acabando');
  const cont = await api('POST', `/api/produtos/${prod.dados.id}/movimentos`, { tipo: 'contagem', quantidade: '7' });
  pr = await saldoDe();
  conferir(cont.dados.diferenca === 3 && pr.saldo === 7 && !pr.acabando, 'estoque: contagem corrige o saldo (+3)');
  const ontemT = new Date(Date.now() - 86400000).toLocaleDateString('sv-SE');
  const ent = await api('POST', `/api/produtos/${prod.dados.id}/movimentos`, { tipo: 'entrada', quantidade: '2,5', origem: 'Doação', validade: ontemT });
  pr = await saldoDe();
  conferir(ent.status === 201 && pr.saldo === 9.5 && pr.vencido === 2.5, 'estoque: entrada com vírgula e aviso de vencido');
  conferir((await api('GET', '/api/estoque/alertas')).dados.itens.some((x) => x.id === prod.dados.id), 'estoque: item vencido aparece nos avisos');
  cookie = cookieMaria;
  conferir((await api('DELETE', `/api/movimentos/${ent.dados.id}`)).status === 403, 'estoque: equipe não desfaz lançamento de outra pessoa');
  conferir((await api('DELETE', `/api/produtos/${prod.dados.id}`)).status === 403, 'estoque: equipe não apaga item');
  cookie = meuCookie;
  conferir((await api('DELETE', `/api/movimentos/${ent.dados.id}`)).status === 200 && (await saldoDe()).saldo === 7, 'estoque: desfazer lançamento volta o saldo');
  // Remédios
  const agoraHM = new Date().toTimeString().slice(0, 5);
  const rx = { residente_id: idTeste, medicamento: 'Losartana 50 mg', dose: '1 comprimido', via: 'Oral', horarios: agoraHM, se_necessario: 0 };
  conferir((await api('POST', '/api/prescricoes', { ...rx, medicamento: '' })).status === 400, 'remédios: prescrição sem remédio é recusada');
  conferir((await api('POST', '/api/prescricoes', { ...rx, via: 'Pelo ouvido' })).status === 400, 'remédios: via inventada é recusada');
  conferir((await api('POST', '/api/prescricoes', { ...rx, horarios: '25:00' })).status === 400, 'remédios: horário inválido é recusado');
  conferir((await api('POST', '/api/prescricoes', { ...rx, horarios: '' })).status === 400, 'remédios: sem horário (e sem "se necessário") é recusado');
  const pr1 = await api('POST', '/api/prescricoes', rx);
  conferir(pr1.status === 201, 'remédios: cadastra prescrição com horário');
  const marca = { prescricao_id: pr1.dados.id, horario: agoraHM };
  conferir((await api('POST', '/api/medicacao', { ...marca, situacao: 'recusado' })).status === 400, 'remédios: "recusou" sem motivo é recusado');
  const dose1 = await api('POST', '/api/medicacao', { ...marca, situacao: 'dado' });
  conferir(dose1.status === 201, 'remédios: marca "dei o remédio"');
  const dose2 = await api('POST', '/api/medicacao', { ...marca, situacao: 'dado' });
  conferir(dose2.status === 409 && /Kevin/.test(dose2.dados.erro || ''), 'remédios: não deixa marcar o mesmo horário duas vezes (evita dose dupla)');
  conferir((await api('PUT', `/api/prescricoes/${pr1.dados.id}`, { dose: '2 comprimidos' })).status === 400, 'remédios: prescrição já usada não muda a dose (suspender e criar outra)');
  conferir((await api('PUT', `/api/prescricoes/${pr1.dados.id}`, { obs: 'Em jejum' })).status === 200, 'remédios: observação pode ser mudada');
  cookie = cookieMaria;
  conferir((await api('DELETE', `/api/medicacao/${dose1.dados.id}`)).status === 403, 'remédios: equipe não desfaz marcação de outra pessoa');
  conferir((await api('DELETE', `/api/prescricoes/${pr1.dados.id}`)).status === 403, 'remédios: equipe não apaga prescrição');
  cookie = meuCookie;
  await api('PUT', `/api/residentes/${idTeste}`, { alergias: 'Dipirona; Frutos do mar' });
  const sos = await api('POST', '/api/prescricoes', { ...rx, medicamento: 'Dipirona 500 mg', se_necessario: 1, horarios: '', condicao: 'Se febre' });
  conferir(sos.status === 201 && sos.dados.alergia === 'Dipirona', 'remédios: avisa quando o remédio bate com uma alergia da ficha');
  conferir((await api('POST', '/api/medicacao', { prescricao_id: sos.dados.id, situacao: 'dado' })).status === 400, 'remédios: "se necessário" pede o motivo');
  conferir((await api('POST', '/api/medicacao', { prescricao_id: sos.dados.id, situacao: 'dado', motivo: 'Febre 38 °C' })).status === 201
    && (await api('POST', '/api/medicacao', { prescricao_id: sos.dados.id, situacao: 'dado', motivo: 'Febre de novo' })).status === 201, 'remédios: "se necessário" pode ser dado mais de uma vez');
  conferir((await api('PUT', `/api/prescricoes/${pr1.dados.id}/suspender`, {})).status === 400, 'remédios: suspender pede o motivo');
  conferir((await api('PUT', `/api/prescricoes/${pr1.dados.id}/suspender`, { motivo: 'Médico suspendeu' })).status === 200
    && !(await api('GET', `/api/prescricoes?residente=${idTeste}`)).dados.itens.some((x) => x.id === pr1.dados.id), 'remédios: suspensa sai da lista de remédios em uso');
  // Remédios dando baixa no estoque
  const prodRx = await api('POST', '/api/produtos', { nome: 'Comprimido de teste', categoria: 'remedio', unidade: 'un', quantidade_inicial: '2' });
  const rxEst = await api('POST', '/api/prescricoes', { ...rx, medicamento: 'Comprimido de teste 5 mg', produto_id: prodRx.dados.id, qtd_por_dose: '1' });
  const darEst = await api('POST', '/api/medicacao', { prescricao_id: rxEst.dados.id, horario: agoraHM, situacao: 'dado' });
  const saldoRx = async () => (await api('GET', `/api/produtos/${prodRx.dados.id}`)).dados.produto.saldo;
  conferir(darEst.status === 201 && darEst.dados.baixa && (await saldoRx()) === 1, 'remédios: "Dei" dá baixa no estoque sozinho');
  await api('DELETE', `/api/medicacao/${darEst.dados.id}`);
  conferir((await saldoRx()) === 2, 'remédios: desfazer a marcação devolve ao estoque');

  // Vacinas
  const hojeV = new Date().toLocaleDateString('sv-SE');
  conferir((await api('POST', '/api/vacinas', { residente_id: idTeste, vacina: '', data: hojeV })).status === 400, 'vacinas: sem vacina é recusado');
  conferir((await api('POST', '/api/vacinas', { residente_id: idTeste, vacina: 'Covid-19', data: '2999-01-01' })).status === 400, 'vacinas: data no futuro é recusada');
  const dtVelha = (() => { const d = new Date(); d.setFullYear(d.getFullYear() - 11); return d.toLocaleDateString('sv-SE'); })();
  const vac1 = await api('POST', '/api/vacinas', { residente_id: idTeste, vacina: 'Dupla adulto dT (difteria e tétano)', dose: 'Reforço', data: dtVelha });
  const cartaoT = (await api('GET', `/api/vacinas?residente=${idTeste}`)).dados;
  conferir(vac1.status === 201 && cartaoT.situacao['Dupla adulto dT (difteria e tétano)'].estado === 'atrasada', 'vacinas: dT com mais de 10 anos aparece atrasada');
  const camp = await api('POST', '/api/vacinas', { residentes: [idTeste], vacina: 'Influenza (gripe)', dose: 'Dose anual', data: hojeV, local: 'No lar — campanha' });
  conferir(camp.status === 201 && camp.dados.ids.length === 1, 'vacinas: campanha registra para vários de uma vez');
  cookie = cookieMaria;
  const apagaVac = await api('DELETE', `/api/vacinas/${vac1.dados.ids[0]}`);
  conferir(apagaVac.status === 403, `vacinas: equipe não apaga registro de outra pessoa${apagaVac.status === 403 ? '' : ` (veio ${apagaVac.status}: ${apagaVac.dados.erro || ''})`}`);
  cookie = meuCookie;
  // Equipe
  cookie = cookieMaria;
  conferir((await api('POST', '/api/profissionais', { nome: 'X', funcao: 'Cuidador(a)' })).status === 403, 'equipe: só a administração cadastra profissional');
  cookie = meuCookie;
  conferir((await api('POST', '/api/profissionais', { nome: '', funcao: 'Cuidador(a)' })).status === 400, 'equipe: profissional sem nome é recusado');
  const prof = await api('POST', '/api/profissionais', { nome: 'Cuidadora de Teste', funcao: 'Cuidador(a)', vinculo: 'Funcionário' });
  const med = await api('POST', '/api/profissionais', { nome: 'Dr. Teste', funcao: 'Médico(a)', vinculo: 'Prestador de serviço', registro: 'CRM 0' });
  conferir(prof.status === 201 && med.status === 201, 'equipe: cadastra profissionais');
  const hojeE = new Date().toLocaleDateString('sv-SE');
  conferir((await api('PUT', '/api/escala', { profissional_id: prof.dados.id, data: hojeE, codigo: 'XX' })).status === 400, 'equipe: código de escala inventado é recusado');
  const fimE = new Date(Date.now() + 9 * 86400000).toLocaleDateString('sv-SE');
  const padr = await api('POST', '/api/escala/padrao', { profissional_id: prof.dados.id, padrao: '12x36_dia', inicio: hojeE, fim: fimE });
  const hojeEsc = (await api('GET', '/api/escala/hoje')).dados.itens;
  conferir(padr.dados.dias === 10 && hojeEsc.some((i) => i.nome === 'Cuidadora de Teste' && i.codigo === 'D'), 'equipe: padrão 12x36 preenche e aparece "no plantão hoje"');
  const escMes = (await api('GET', `/api/escala?mes=${hojeE.slice(0, 7)}`)).dados;
  conferir(escMes.pessoas.some((p) => p.id === prof.dados.id) && !escMes.pessoas.some((p) => p.id === med.dados.id), 'equipe: médico de fora não entra na escala');
  // Patrimônio
  conferir((await api('POST', '/api/patrimonio', { nome: 'X', categoria: 'Inventada' })).status === 400, 'patrimônio: categoria inventada é recusada');
  const ontemP = new Date(Date.now() - 86400000).toLocaleDateString('sv-SE');
  const pat = await api('POST', '/api/patrimonio', { nome: 'Extintor de teste', categoria: 'Segurança', codigo: 'T-1', valor: '1.234,50', proxima_revisao: ontemP });
  conferir(pat.status === 201, 'patrimônio: cadastra item (valor com ponto e vírgula)');
  conferir((await api('POST', '/api/patrimonio', { nome: 'Outro', categoria: 'Segurança', codigo: 'T-1' })).status === 400, 'patrimônio: número de patrimônio repetido é recusado');
  let patLido = (await api('GET', `/api/patrimonio/${pat.dados.id}`)).dados.item;
  conferir(patLido.valor === 1234.5 && patLido.revisao === 'vencida' && patLido.alerta, 'patrimônio: revisão vencida vira aviso');
  const proxAno = new Date(Date.now() + 365 * 86400000).toLocaleDateString('sv-SE');
  conferir((await api('POST', `/api/patrimonio/${pat.dados.id}/manutencoes`, { tipo: 'revisao', descricao: '', custo: '60' })).status === 400, 'patrimônio: manutenção sem descrição é recusada');
  await api('POST', `/api/patrimonio/${pat.dados.id}/manutencoes`, { tipo: 'revisao', descricao: 'Recarga anual', custo: '60,00', proxima_revisao: proxAno });
  patLido = (await api('GET', `/api/patrimonio/${pat.dados.id}`)).dados;
  conferir(patLido.manutencoes.length === 1 && !patLido.item.alerta, 'patrimônio: registrar a revisão tira o aviso');
  cookie = cookieMaria;
  conferir((await api('DELETE', `/api/patrimonio/${pat.dados.id}`)).status === 403, 'patrimônio: equipe não apaga item');
  cookie = meuCookie;
  // Sinais vitais
  conferir((await api('POST', '/api/sinais', { leituras: [{ residente_id: idTeste, pa: '12x8' }] })).status === 400, 'sinais: pressão escrita errado é recusada');
  conferir((await api('POST', '/api/sinais', { leituras: [{ residente_id: idTeste, temperatura: '63' }] })).status === 400, 'sinais: temperatura impossível é recusada');
  conferir((await api('POST', '/api/sinais', { leituras: [{ residente_id: idTeste, pa: '80x120' }] })).status === 400, 'sinais: mínima maior que a máxima é recusada');
  conferir((await api('POST', '/api/sinais', { leituras: [{ residente_id: idTeste }] })).status === 400, 'sinais: linha vazia é recusada');
  const ronda = await api('POST', '/api/sinais', { hora: '08:00', leituras: [{ residente_id: idTeste, pa: '180x110', temperatura: '36,4', saturacao: '97' }] });
  conferir(ronda.status === 201 && ronda.dados.alertas.length === 1, 'sinais: salva a ronda e avisa pressão fora do normal');
  const histSv = (await api('GET', `/api/sinais?residente=${idTeste}&dias=7`)).dados.itens;
  conferir(histSv.some((l) => l.origem === 'ronda' && l.pa_sist === 180) && histSv.some((l) => l.origem === 'diario'), 'sinais: o histórico junta a ronda e os sinais do Diário');
  cookie = cookieMaria;
  conferir((await api('DELETE', `/api/sinais/${ronda.dados.ids[0]}`)).status === 403, 'sinais: equipe não apaga leitura de outra pessoa');
  cookie = meuCookie;
  conferir((await api('POST', '/api/admin/demo')).status === 400, 'demonstração não se mistura com residente real');
  conferir((await api('DELETE', `/api/residentes/${idTeste}`)).status === 200, 'administração exclui a ficha');
  const acessos = (await api('GET', '/api/admin/log?q=residente')).dados;
  conferir(Array.isArray(acessos) && acessos.some((l) => l.acao === 'cadastrou residente'), 'auditoria registra o cadastro');
  const demo = await api('POST', '/api/admin/demo');
  conferir(demo.status === 200 && demo.dados.residentes > 10, `carrega a demonstração (${demo.dados.residentes} residentes fictícios)`);
  const lista = (await api('GET', '/api/residentes')).dados;
  const idFicha = (lista.find((r) => r.situacao === 'no_lar' && r.alergias) || lista[0]).id;
  const produtosDemo = (await api('GET', '/api/produtos')).dados.itens;
  const idProd = (produtosDemo.find((p) => p.nome.startsWith('Fralda geriátrica G')) || produtosDemo[0]).id;
  conferir(produtosDemo.filter((p) => p.alerta).length >= 2, `demonstração traz estoque com avisos (${produtosDemo.length} itens)`);
  const metf = produtosDemo.find((p) => p.nome.startsWith('Metformina'));
  conferir(metf && metf.dias_restantes != null && metf.dias_restantes < 7 && metf.acabando, `estoque: remédio ligado à prescrição mostra "dá para ${metf && metf.dias_restantes} dias" e avisa`);
  const ini = (await api('GET', '/api/inicio')).dados;
  conferir(ini.demo && ini.porSituacao.no_lar > 0 && Array.isArray(ini.aniversarios), 'Início resume a demonstração');
  conferir(ini.atencao_total >= 2 && ini.diario_hoje >= 1, `demonstração traz diário (${ini.diario_hoje} hoje, ${ini.atencao_total} pendentes)`);
  const denovo = await api('POST', '/api/admin/demo');
  conferir(denovo.status === 200 && Array.isArray(denovo.dados.completados) && !denovo.dados.completados.length, 'demonstração: "completar" com tudo já carregado não duplica nada');
  // o recado geral real (sem residente) criado acima continua; apagar a demonstração não pode levá-lo
  const bk = await api('POST', '/api/backups');
  conferir(bk.status === 201 && /^lar-.*\.db$/.test(bk.dados.arquivo || ''), 'faz cópia de segurança');
  conferir((await api('GET', '/api/admin/rede')).status === 200, 'lê a situação da rede');

  // ───────────── 3. telas no Edge ─────────────
  console.log('\n3. Telas no navegador (Edge escondido)');
  const exe = acharEdge();
  if (!exe) { falhou('não achei o Microsoft Edge neste computador (defina a variável EDGE com o caminho)'); return; }
  fs.mkdirSync(PRINTS, { recursive: true });
  for (const f of fs.readdirSync(PRINTS)) if (f.endsWith('.png')) fs.rmSync(path.join(PRINTS, f));
  edge = spawn(exe, ['--headless=new', `--remote-debugging-port=${PORTA_EDGE}`, `--user-data-dir=${path.join(TMP, 'edge')}`, '--no-first-run', '--no-default-browser-check',
    '--disable-extensions', '--disable-gpu', '--window-size=1366,900', '--lang=pt-BR', 'about:blank'], { stdio: 'ignore' });
  let alvo = null;
  for (let i = 0; i < 60 && !alvo; i++) {
    try { alvo = (await (await fetch(`http://127.0.0.1:${PORTA_EDGE}/json/list`)).json()).find((t) => t.type === 'page'); } catch { /* subindo */ }
    if (!alvo) await esperar(250);
  }
  if (!alvo) { falhou('o Edge escondido não abriu'); return; }
  const cdp = await conectar(alvo.webSocketDebuggerUrl);
  let telaAtual = '';
  cdp.ouvir((m) => {
    if (m.method === 'Runtime.exceptionThrown') errosJs.push(`[${telaAtual}] ${m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text}`);
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errosJs.push(`[${telaAtual}] console.error: ${m.params.args.map((a) => a.value ?? a.description).join(' ')}`);
    if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error' && !/favicon|401|Unauthorized/i.test(m.params.entry.text + (m.params.entry.url || ''))) errosJs.push(`[${telaAtual}] ${m.params.entry.text}`);
  });
  await cdp.enviar('Page.enable'); await cdp.enviar('Runtime.enable'); await cdp.enviar('Log.enable'); await cdp.enviar('Network.enable');
  // As telas principais em tema claro (o Windows pode estar no escuro); o escuro é testado mais abaixo
  await cdp.enviar('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'light' }] });
  const avaliar = async (expr) => {
    const r = await cdp.enviar('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
    return r.result.value;
  };
  const aguardar = async (expr, ms = 8000) => {
    const fim = Date.now() + ms;
    while (Date.now() < fim) { try { if (await avaliar(expr)) return true; } catch { /* página trocando */ } await esperar(100); }
    return false;
  };
  const foto = async (nome) => {
    await esperar(450); // deixa as animações terminarem
    const r = await cdp.enviar('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(PRINTS, nome + '.png'), Buffer.from(r.data, 'base64'));
  };
  const abrir = async (hash) => {
    await cdp.enviar('Page.navigate', { url: `${BASE}/?t=${Date.now()}${hash}` });
    return aguardar(`(() => { const c = document.querySelector('#conteudo'); return c && c.querySelector('h1, .vazio') && !document.querySelector('#conteudo .carregando'); })()`);
  };
  const [nomeCookie, valorCookie] = cookie.split('=');
  await cdp.enviar('Network.setCookie', { name: nomeCookie, value: valorCookie, domain: '127.0.0.1', path: '/', httpOnly: true });

  const rodada = async (sufixo) => {
    for (const [hash0, nome] of TELAS) {
      const ontem = new Date(Date.now() - 86400000).toLocaleDateString('sv-SE');
      const hash = hash0.replace('{id}', idFicha).replace('{ontem}', ontem).replace('{prod}', idProd);
      telaAtual = hash + (sufixo ? ` (${sufixo})` : '');
      const errosAntes = errosJs.length;
      const abriu = await abrir(hash);
      const quebrou = abriu && await avaliar(`!!document.querySelector('#conteudo [data-tentar]')`);
      conferir(abriu && !quebrou && errosJs.length === errosAntes, `abre ${telaAtual}`);
      await foto(`${nome}${sufixo ? '-' + sufixo : ''}`);
    }
  };
  await rodada('');

  // Interações principais
  telaAtual = 'interações';
  await abrir('#/residentes');
  conferir(await avaliar(`(() => { const b = document.querySelector('#btnConta').getBoundingClientRect(); return b.bottom <= innerHeight && b.top >= 0; })()`), 'menu: o botão da conta cabe na tela (trilho com muitos grupos)');
  await avaliar(`document.querySelector('#resNovo').click()`);
  conferir(await aguardar(`!!document.querySelector('.modal-fundo.aberto #rNome')`), 'botão Novo residente abre a janela');
  await foto('janela-novo-residente');
  await avaliar(`(() => { const i = document.querySelector('#rNome'); i.value = 'Residente Criado Pelo Teste'; i.dispatchEvent(new Event('input', {bubbles:true})); document.querySelector('#rQuarto').value = '3'; document.querySelector('#rSalvar').click(); })()`);
  conferir(await aguardar(`/^#\\/residente\\/\\d+$/.test(location.hash) && document.querySelector('#conteudo h1')?.textContent.includes('Criado Pelo Teste')`), 'salvar a janela cadastra e abre a ficha nova');
  await avaliar(`document.querySelector('#contatoNovo').click()`);
  conferir(await aguardar(`!!document.querySelector('.modal-fundo.aberto #cNome') && document.querySelector('#cResp').checked`), 'primeiro familiar já vem marcado como responsável');
  await avaliar(`(() => { document.querySelector('#cNome').value = 'Familiar do Teste'; document.querySelector('#cTel').value = '(11) 90000-9999'; document.querySelector('#cSalvar').click(); })()`);
  conferir(await aguardar(`[...document.querySelectorAll('.caixa-contato b')].some((b) => b.textContent === 'Familiar do Teste')`), 'familiar aparece na caixa de Responsável');
  await avaliar(`document.querySelector('.segmentado.situacao button[data-v="hospitalizado"]').click()`);
  conferir(await aguardar(`!!document.querySelector('.modal-fundo.aberto #sitData')`), 'clicar na situação pede a data');
  await avaliar(`document.querySelector('#sitSalvar').click()`);
  conferir(await aguardar(`document.querySelector('.segmentado.situacao')?.dataset.v === 'hospitalizado' && !document.querySelector('.modal-fundo')`), 'situação muda para hospitalizado');
  await avaliar(`document.dispatchEvent(new KeyboardEvent('keydown', { key: '?', bubbles: true }))`);
  conferir(await aguardar(`!!document.querySelector('.modal-fundo.aberto .ajuda')`), 'tecla ? abre a ajuda');
  await foto('ajuda');
  await avaliar(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))`);
  conferir(await aguardar(`!document.querySelector('.modal-fundo')`), 'Esc fecha a janela');
  await avaliar(`(() => { const i = document.querySelector('#buscaRapida'); i.value = 'aurora'; i.dispatchEvent(new Event('input', {bubbles:true})); })()`);
  conferir(await aguardar(`document.querySelectorAll('#resultadosBusca .resultado').length > 0`), 'busca rápida do topo acha residente');
  await avaliar(`document.querySelector('#btnConta').click()`);
  conferir(await aguardar(`!!document.querySelector('.menu-flutuante.aberto')`), 'menu da conta abre');
  await foto('menu-conta');
  await avaliar(`document.querySelector('.menu-item[data-a="bloquear"]').click()`);
  conferir(await aguardar(`!!document.querySelector('.bloqueio.aberto')`), 'bloquear a tela mostra o bloqueio');
  await foto('bloqueio');
  await avaliar(`(() => { document.querySelector('#bqSenha').value = '${SENHA_TESTE}'; document.querySelector('#bqForm').requestSubmit(); })()`);
  conferir(await aguardar(`!document.querySelector('.bloqueio')`), 'desbloqueia com a senha');

  // Diário: anotar uma queda e resolver
  await abrir('#/diario');
  const antesDia = await avaliar(`document.querySelectorAll('#diaLista .reg').length`);
  await avaliar(`document.querySelector('#diaNovo').click()`);
  conferir(await aguardar(`!!document.querySelector('.modal-fundo.aberto #oTexto')`), 'diário: botão Anotar abre a janela');
  await avaliar(`(() => { const s = document.querySelector('#oRes'); s.value = s.options[1].value; s.dispatchEvent(new Event('change', {bubbles:true}));
    const q = document.querySelector('#oTipo_queda'); q.checked = true; q.dispatchEvent(new Event('change', {bubbles:true})); })()`);
  conferir(await avaliar(`document.querySelector('#oGrav_atencao').checked`), 'diário: queda já vem como Atenção');
  await foto('janela-diario');
  await avaliar(`(() => { document.querySelector('#oTexto').value = 'Queda de teste no corredor, sem ferimentos.'; document.querySelector('#oHora').value = '00:05'; document.querySelector('#oSalvar').click(); })()`);
  conferir(await aguardar(`!document.querySelector('.modal-fundo') && document.querySelectorAll('#diaLista .reg').length === ${antesDia} + 1`), 'diário: a anotação aparece na linha do tempo');
  await avaliar(`[...document.querySelectorAll('#diaLista .reg')].find((r) => r.textContent.includes('Queda de teste')).querySelector('[data-resolver]').click()`);
  conferir(await aguardar(`!!document.querySelector('.modal-fundo.aberto #resObs')`), 'diário: Resolver pede o que foi feito');
  await avaliar(`(() => { document.querySelector('#resObs').value = 'Avaliada, tudo bem.'; document.querySelector('#resOk').click(); })()`);
  conferir(await aguardar(`[...document.querySelectorAll('#diaLista .reg.resolvida')].some((r) => r.textContent.includes('Queda de teste'))`), 'diário: fica marcada como resolvida');

  // Agenda: agendar, abrir e marcar como feito; trocar para a lista de 30 dias
  await abrir('#/agenda');
  await avaliar(`document.querySelector('#agNovo').click()`);
  conferir(await aguardar(`!!document.querySelector('.modal-fundo.aberto #aTitulo')`), 'agenda: botão Agendar abre a janela');
  await avaliar(`(() => { const t = document.querySelector('#aTipo_exame'); t.checked = true; t.dispatchEvent(new Event('change', {bubbles:true}));
    document.querySelector('#aTitulo').value = 'Exame criado pelo teste'; document.querySelector('#aHora').value = '23:30'; document.querySelector('#aSalvar').click(); })()`);
  conferir(await aguardar(`!document.querySelector('.modal-fundo') && [...document.querySelectorAll('.compromisso')].some((b) => b.textContent.includes('Exame criado pelo teste'))`), 'agenda: o compromisso aparece na semana');
  await foto('agenda-com-novo');
  await avaliar(`[...document.querySelectorAll('.compromisso')].find((b) => b.textContent.includes('Exame criado pelo teste')).click()`);
  conferir(await aguardar(`!!document.querySelector('.modal-fundo.aberto #cpFeito')`), 'agenda: clicar abre os detalhes');
  await foto('agenda-detalhe');
  await avaliar(`document.querySelector('#cpFeito').click()`);
  conferir(await aguardar(`!!document.querySelector('.modal-fundo.aberto #agResultado')`), 'agenda: "Foi feito" pede o resultado');
  await avaliar(`(() => { document.querySelector('#agResultado').value = 'Tudo certo'; document.querySelector('#agSit').click(); })()`);
  conferir(await aguardar(`[...document.querySelectorAll('.compromisso.feito')].some((b) => b.textContent.includes('Exame criado pelo teste'))`), 'agenda: fica marcado como feito');
  await avaliar(`document.querySelector('.vistaAg button[data-v="lista"]').click()`);
  conferir(await aguardar(`!!document.querySelector('#agArea .lista-dias, #agArea .vazio')`), 'agenda: troca para os próximos 30 dias');
  await foto('agenda-lista');
  await avaliar(`localStorage.removeItem('lar-vista-agenda')`);

  // Estoque: dar entrada pelos botões − e +, e conferir o saldo na página do item
  await abrir(`#/estoque/item-${idProd}`);
  const saldoAntes = await avaliar(`parseFloat(document.querySelector('.saldo-grande .num-saldo').firstChild.textContent.replace(',', '.'))`);
  await avaliar(`document.querySelector('#itEntrada').click()`);
  conferir(await aguardar(`!!document.querySelector('.modal-fundo.aberto #mvQtd')`), 'estoque: Entrada abre a janela');
  await avaliar(`document.querySelector('[data-passo="1"]').click(); document.querySelector('[data-passo="1"]').click();`); // 1 + 2 = 3
  conferir(await avaliar(`document.querySelector('#mvQtd').value === '3'`), 'estoque: botão + aumenta a quantidade');
  await foto('estoque-entrada');
  await avaliar(`(() => { document.querySelector('#mvOrigem1').checked = true; document.querySelector('#mvOk').click(); })()`);
  conferir(await aguardar(`!document.querySelector('.modal-fundo') && parseFloat(document.querySelector('.saldo-grande .num-saldo').firstChild.textContent.replace(',', '.')) === ${saldoAntes} + 3`), 'estoque: o saldo sobe 3 depois da entrada');
  conferir(await avaliar(`[...document.querySelectorAll('.tabela td')].some((td) => td.textContent.includes('Doação'))`), 'estoque: a doação aparece nas movimentações');

  // Remédios: cadastrar uma prescrição pela tela (horário = agora) e marcar "Dei" na folha
  await abrir('#/prescricoes');
  await avaliar(`document.querySelector('#preNova').click()`);
  conferir(await aguardar(`!!document.querySelector('.modal-fundo.aberto #rxMed')`), 'remédios: Nova prescrição abre a janela');
  const hmTela = new Date().toTimeString().slice(0, 5);
  await avaliar(`(() => { const s = document.querySelector('#rxRes'); s.value = s.options[1].value; s.dispatchEvent(new Event('change', {bubbles:true}));
    document.querySelector('#rxMed').value = 'Remédio de teste 10 mg'; document.querySelector('#rxDose').value = '1 comprimido';
    document.querySelector('#rxOutros').value = '${hmTela}'; })()`);
  await foto('janela-prescricao');
  await avaliar(`document.querySelector('#rxSalvar').click()`);
  conferir(await aguardar(`!document.querySelector('.modal-fundo') && document.body.textContent.includes('Remédio de teste 10 mg')`), 'remédios: a prescrição aparece na lista');
  await abrir('#/medicacao');
  await avaliar(`document.querySelector('.filtroTurnoRem button[data-v="todos"]')?.click()`);
  conferir(await aguardar(`[...document.querySelectorAll('.dose')].some((d) => d.textContent.includes('Remédio de teste') && d.querySelector('[data-marcar="dado"]'))`), 'remédios: o remédio novo aparece na folha de hoje');
  await foto('remedios-folha');
  await avaliar(`[...document.querySelectorAll('.dose')].find((d) => d.textContent.includes('Remédio de teste')).querySelector('[data-marcar="dado"]').click()`);
  conferir(await aguardar(`[...document.querySelectorAll('.dose.dado')].some((d) => d.textContent.includes('Remédio de teste') && d.textContent.includes('Kevin'))`), 'remédios: "Dei" marca na hora, com o nome de quem deu');

  // Vacinas: campanha para vários
  await abrir('#/vacinas');
  await avaliar(`document.querySelector('#vacCampanha').click()`);
  conferir(await aguardar(`!!document.querySelector('.modal-fundo.aberto #cpSalvar')`), 'vacinas: Campanha abre a janela');
  await avaliar(`(() => { const v = document.querySelector('#vcVacina'); v.value = 'Covid-19'; v.dispatchEvent(new Event('change', {bubbles:true})); })()`);
  conferir(await avaliar(`document.querySelectorAll('input[id^="cpR"]:checked').length > 0`), 'vacinas: campanha já marca quem ainda não tomou no ano');
  await foto('vacinas-campanha');
  await avaliar(`document.querySelector('#cpSalvar').click()`);
  conferir(await aguardar(`!document.querySelector('.modal-fundo') && !!document.querySelector('.tabela-vac')`), 'vacinas: campanha salva e volta para o painel');

  // Sinais vitais: ronda (valor fora do normal fica vermelho) e gráfico com dica
  await abrir('#/sinais');
  await avaliar(`(() => { const i = document.querySelector('tbody tr input[data-k="pa"]'); i.value = '190x115'; i.dispatchEvent(new Event('input', {bubbles:true})); })()`);
  conferir(await avaliar(`document.querySelector('tbody tr input[data-k="pa"]').classList.contains('fora')`), 'sinais: pressão alta fica vermelha enquanto digita');
  await avaliar(`document.querySelector('#svSalvar').click()`);
  conferir(await aguardar(`!!document.querySelector('.faixa.perigo') && document.body.textContent.includes('190x115')`), 'sinais: a ronda salva e o aviso aparece no alto');
  await foto('sinais-ronda-salva');
  await abrir(`#/sinais/residente-${idFicha}`);
  conferir(await aguardar(`document.querySelectorAll('.grafico-sinal svg path.linha-s1').length >= 3`), 'sinais: os gráficos aparecem (um por medida)');
  await avaliar(`(() => { const s = document.querySelector('.grafico-sinal svg'); const r = s.getBoundingClientRect();
    s.dispatchEvent(new PointerEvent('pointermove', { clientX: r.left + r.width * 0.6, clientY: r.top + r.height / 2, bubbles: true })); })()`);
  conferir(await aguardar(`[...document.querySelectorAll('.dica-graf')].some((d) => !d.hidden && d.textContent.includes('mmHg'))`), 'sinais: passar o mouse mostra a dica com o valor');
  await foto('sinais-graficos-dica');
  await avaliar(`document.querySelector('.vistaSv button[data-v="tabela"]').click()`);
  conferir(await aguardar(`!!document.querySelector('#svArea table')`), 'sinais: dá para ver em tabela');
  await avaliar(`document.querySelector('.vistaSv button[data-v="graficos"]').click()`);

  // Avaliações: reavaliar pelo questionário (a soma aparece enquanto marca)
  await abrir('#/avaliacoes');
  await avaliar(`document.querySelector('[data-avaliar][data-esc="morse"]').click()`);
  conferir(await aguardar(`!!document.querySelector('.modal-fundo.aberto input[name="av_quedas"]')`), 'avaliações: abre o questionário');
  await avaliar(`(() => { for (const nome of ['av_quedas','av_diagnosticos','av_apoio','av_soro','av_marcha','av_mental']) { const r = document.querySelector('input[name="' + nome + '"]'); r.checked = true; }
    document.querySelector('input[name="av_quedas"][value="25"]').checked = true; document.querySelector('.modal-fundo.aberto .modal').dispatchEvent(new Event('change', {bubbles:true})); })()`);
  conferir(await aguardar(`document.querySelector('#avSoma').textContent.includes('25/125')`), 'avaliações: a pontuação aparece enquanto marca');
  await foto('avaliacao-questionario');
  await avaliar(`document.querySelector('#avSalvar').click()`);
  conferir(await aguardar(`!document.querySelector('.modal-fundo')`), 'avaliações: salva a avaliação');

  // PIA: revisar (nova versão)
  await abrir(`#/pia/residente-${idFicha}`);
  await avaliar(`document.querySelector('#piaRevisar').click()`);
  conferir(await aguardar(`!!document.querySelector('.modal-fundo.aberto #pia_saude_situacao') && document.querySelector('#pia_saude_situacao').value.length > 5`), 'PIA: o formulário abre já preenchido');
  await foto('pia-formulario');
  await avaliar(`(() => { document.querySelector('#pia_saude_acoes').value = 'Cuidado combinado pelo teste'; document.querySelector('#piaSalvar').click(); })()`);
  conferir(await aguardar(`!document.querySelector('.modal-fundo') && document.body.textContent.includes('Cuidado combinado pelo teste')`), 'PIA: a revisão salva e aparece no documento');

  // Financeiro: abrir o recibo de uma receita recebida (valor por extenso)
  await abrir('#/lancamentos');
  await avaliar(`document.querySelector('.fTipo button[data-v="receita"]').click(); document.querySelector('.fSit button[data-v="pago"]').click();`);
  conferir(await aguardar(`!!document.querySelector('#lcLista a[href^="#/recibo/"]')`), 'financeiro: receita recebida tem recibo');
  await avaliar(`document.querySelector('#lcLista a[href^="#/recibo/"]').click()`);
  conferir(await aguardar(`!!document.querySelector('.recibo') && /reais/.test(document.querySelector('.recibo').textContent)`), 'financeiro: o recibo abre com o valor por extenso');
  await foto('financeiro-recibo');

  // Tarefas: marcar como feita pelo círculo
  await abrir('#/tarefas');
  const idTf = await avaliar(`document.querySelector('.tarefa:not(.feita) [data-feita]').dataset.feita`);
  await avaliar(`document.querySelector('.tarefa:not(.feita) [data-feita]').click()`);
  conferir(await aguardar(`!!document.querySelector('.tarefa.feita [data-feita="${idTf}"]')`), 'tarefas: o círculo marca a tarefa como feita');
  await foto('tarefas-feita');

  // Patrimônio: abrir um item e registrar manutenção
  await abrir('#/patrimonio');
  await avaliar(`document.querySelector('#patLista a[href^="#/patrimonio/item-"]').click()`);
  conferir(await aguardar(`!!document.querySelector('#piManut')`), 'patrimônio: abre a página do item');
  await avaliar(`document.querySelector('#piManut').click()`);
  conferir(await aguardar(`!!document.querySelector('.modal-fundo.aberto #mnDesc')`), 'patrimônio: Registrar manutenção abre a janela');
  await avaliar(`(() => { document.querySelector('#mnDesc').value = 'Conserto de teste'; document.querySelector('#mnOk').click(); })()`);
  conferir(await aguardar(`document.body.textContent.includes('Conserto de teste') && !document.querySelector('.modal-fundo')`), 'patrimônio: a manutenção aparece no histórico');
  await foto('patrimonio-item');

  // Escala: clicar num dia e trocar o código
  await abrir('#/escala');
  await avaliar(`document.querySelector('button.cel-escala').click()`);
  conferir(await aguardar(`!!document.querySelector('.menu-flutuante.aberto [data-cod-escolha="FE"]')`), 'escala: clicar no dia abre os códigos');
  await avaliar(`document.querySelector('.menu-flutuante.aberto [data-cod-escolha="FE"]').click()`);
  conferir(await aguardar(`document.querySelector('button.cel-escala').textContent.trim() === 'FE'`), 'escala: o dia muda para Férias na hora');

  // Celular
  await cdp.enviar('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  for (const [hash, nome] of [['#/inicio', 'inicio'], ['#/residentes', 'residentes'], [`#/residente/${idFicha}`, 'ficha'], ['#/diario', 'diario'], ['#/medicacao', 'remedios'], ['#/agenda', 'agenda']]) {
    telaAtual = hash + ' (celular)';
    const antes = errosJs.length;
    const abriu = await abrir(hash);
    const rola = await avaliar(`document.documentElement.scrollWidth > innerWidth + 1`);
    conferir(abriu && !rola && errosJs.length === antes, `abre ${telaAtual} sem rolar para o lado`);
    await foto(`celular-${nome}`);
  }
  // Barra de baixo: 4 grupos + "Mais" com o resto
  await abrir('#/estoque');
  conferir(await avaliar(`(() => { const m = document.querySelector('.mais-grupos'); return m && m.offsetParent !== null && m.getAttribute('aria-current') === 'page'; })()`), 'celular: botão "Mais" aparece (e acende no Estoque)');
  await foto('celular-estoque');
  await avaliar(`document.querySelector('.mais-grupos').click()`);
  conferir(await aguardar(`[...document.querySelectorAll('.menu-flutuante.aberto .menu-item')].some((a) => a.textContent.includes('Configurações'))`), 'celular: "Mais" abre os outros grupos');
  await foto('celular-mais');
  await abrir(`#/residente/${idFicha}`);
  await avaliar(`document.querySelector('#resEditar').click()`);
  conferir(await aguardar(`!!document.querySelector('.modal-fundo.aberto .modal-alca')`), 'no celular a janela vira folha (com alça)');
  await foto('celular-janela');
  await cdp.enviar('Emulation.clearDeviceMetricsOverride');

  // Modo escuro
  await avaliar(`localStorage.setItem('lar-tema', 'escuro')`);
  for (const [hash, nome] of [['#/inicio', 'inicio'], ['#/residentes', 'residentes'], [`#/residente/${idFicha}`, 'ficha'], ['#/diario', 'diario'], ['#/medicacao', 'remedios'], ['#/agenda', 'agenda'], ['#/estoque', 'estoque'], ['#/config/backups', 'config-backups']]) {
    telaAtual = hash + ' (escuro)';
    const antes = errosJs.length;
    const abriu = await abrir(hash);
    conferir(abriu && errosJs.length === antes && await avaliar(`document.documentElement.dataset.tema === 'escuro'`), `abre ${telaAtual}`);
    await foto(`escuro-${nome}`);
  }
  await avaliar(`localStorage.removeItem('lar-tema')`);

  // Tela de entrada (sem sessão)
  telaAtual = 'entrada';
  await cdp.enviar('Network.clearBrowserCookies');
  await cdp.enviar('Page.navigate', { url: BASE + '/' });
  conferir(await aguardar(`!!document.querySelector('#formEntrada')`), 'sem sessão mostra a tela de entrada');
  await foto('entrada');
  cdp.fechar();
}

try {
  await principal();
} catch (e) {
  falhou('o teste parou no meio: ' + e.message);
} finally {
  await limpar();
}
if (errosJs.length) { console.log('\nErros de JavaScript no navegador:'); for (const e of errosJs) console.log('  - ' + e); }
console.log(`\nResultado: ${ok} ok, ${falhas} falha(s), ${errosJs.length} erro(s) de JavaScript. Fotos em ferramentas\\prints`);
process.exit(falhas || errosJs.length ? 1 : 0);
