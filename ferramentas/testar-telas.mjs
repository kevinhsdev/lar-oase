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
  ['#/diario', 'diario'],
  ['#/diario/{ontem}', 'diario-ontem'],
  ['#/diario/atencao', 'diario-atencao'],
  ['#/diario/residente-{id}', 'diario-residente'],
  ['#/medicacao', 'remedios-hoje'],
  ['#/medicacao/{ontem}', 'remedios-ontem'],
  ['#/prescricoes', 'prescricoes'],
  ['#/prescricoes/residente-{id}', 'prescricoes-residente'],
  ['#/agenda', 'agenda'],
  ['#/agenda/residente-{id}', 'agenda-residente'],
  ['#/estoque', 'estoque'],
  ['#/estoque/avisos', 'estoque-avisos'],
  ['#/estoque/item-{prod}', 'estoque-item'],
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
  const ini = (await api('GET', '/api/inicio')).dados;
  conferir(ini.demo && ini.porSituacao.no_lar > 0 && Array.isArray(ini.aniversarios), 'Início resume a demonstração');
  conferir(ini.atencao_total >= 2 && ini.diario_hoje >= 1, `demonstração traz diário (${ini.diario_hoje} hoje, ${ini.atencao_total} pendentes)`);
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
