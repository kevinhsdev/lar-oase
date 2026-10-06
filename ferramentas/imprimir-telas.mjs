// IMPRESSÃO DE TESTE do OASE - Lar — gera um PDF (A4) de cada tela que tem botão "Imprimir", do jeito que sai na impressora.
// Uso (na pasta do projeto):  node ferramentas\imprimir-telas.mjs  [parte-do-nome]   (ex.: "ficha" gera só os que têm "ficha" no nome)
//
// Igual ao testar-telas: servidor de teste numa PASTA TEMPORÁRIA (porta 3997), só com a demonstração fictícia, e Edge escondido.
// Os PDFs ficam em ferramentas\prints\pdf (pasta ignorada pelo Git). No fim desliga tudo e apaga a pasta temporária.
//
// Documento novo para imprimir? Acrescente na lista DOCUMENTOS abaixo.
import { spawn, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const APP = path.join(RAIZ, 'app');
const SAIDA = path.join(RAIZ, 'ferramentas', 'prints', 'pdf');
const PORTA = 3997, PORTA_EDGE = 9334;
const BASE = `http://127.0.0.1:${PORTA}`;
const FILTRO = (process.argv[2] || '').toLowerCase();

// [endereço, nome do arquivo, paisagem?]  ({id} = um residente da demonstração; {prod} = um item do estoque; {rec} = uma mensalidade paga)
const DOCUMENTOS = [
  ['#/residentes', 'residentes-lista'],
  ['#/residente/{id}', 'residente-ficha'],
  ['#/prontuario/{id}', 'prontuario'],
  ['#/pia/residente-{id}', 'pia'],
  ['#/diario', 'diario-dia'],
  ['#/diario/residente-{id}', 'diario-residente'],
  ['#/medicacao', 'remedios-folha', true],
  ['#/prescricoes', 'prescricoes'],
  ['#/sinais', 'sinais-ronda', true],
  ['#/sinais/residente-{id}', 'sinais-graficos'],
  ['#/avaliacoes', 'avaliacoes'],
  ['#/avaliacoes/residente-{id}', 'avaliacoes-residente'],
  ['#/vacinas', 'vacinas'],
  ['#/vacinas/residente-{id}', 'vacinas-cartao'],
  ['#/agenda', 'agenda'],
  ['#/tarefas', 'tarefas'],
  ['#/estoque', 'estoque'],
  ['#/estoque/item-{prod}', 'estoque-item'],
  ['#/patrimonio', 'patrimonio'],
  ['#/escala', 'escala', true],
  ['#/profissionais', 'profissionais'],
  ['#/financeiro', 'financeiro-resumo'],
  ['#/lancamentos', 'financeiro-contas'],
  ['#/mensalidades', 'financeiro-mensalidades'],
  ['#/recibo/{rec}', 'financeiro-recibo'],
];

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
const plural = (n) => `${n} página${n === 1 ? '' : 's'}`;
let erros = 0;
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'lar-impressao-'));
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
  for (let i = 0; i < 10; i++) { try { fs.rmSync(TMP, { recursive: true, force: true }); break; } catch { await esperar(500); } }
}

let cookie = '';
async function api(metodo, url, corpo) {
  const r = await fetch(BASE + url, {
    method: metodo,
    headers: { 'X-APP': '1', ...(corpo ? { 'Content-Type': 'application/json' } : {}), ...(cookie ? { Cookie: cookie } : {}) },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  const sc = r.headers.get('set-cookie');
  if (sc) cookie = sc.split(';')[0];
  return { status: r.status, dados: await r.json().catch(() => ({})) };
}

function conectar(url) {
  return new Promise((ok, erro) => {
    const ws = new WebSocket(url);
    let id = 0;
    const pend = new Map();
    ws.onopen = () => ok({ enviar: (method, params = {}) => new Promise((res, rej) => { const i = ++id; pend.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); }) });
    ws.onerror = () => erro(new Error('não conectei no Edge'));
    ws.onmessage = (ev) => {
      const m = JSON.parse(ev.data);
      if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); if (m.error) p.rej(new Error(m.error.message)); else p.res(m.result); }
    };
  });
}

async function principal() {
  let subiu = false;
  for (let i = 0; i < 60 && !subiu; i++) { try { subiu = (await fetch(BASE + '/api/versao')).ok; } catch { await esperar(250); } }
  if (!subiu) { console.log(saidaServidor); throw new Error('o servidor de teste não subiu'); }
  await api('POST', '/api/login', { login: 'kevin', senha: 'trocar123' });
  await api('POST', '/api/trocar-senha', { atual: 'trocar123', nova: 'impressao-teste-9x' });
  await api('POST', '/api/admin/demo');
  const res = (await api('GET', '/api/residentes')).dados;
  // A ficha mais "cheia" (com mais familiares) mostra melhor o que acontece com texto grande
  const idRes = [...res].sort((a, b) => b.n_contatos - a.n_contatos || (b.alergias ? 1 : 0) - (a.alergias ? 1 : 0))[0].id;
  const prods = (await api('GET', '/api/produtos')).dados;
  const idProd = ((prods.itens || prods).find((p) => /fralda/i.test(p.nome)) || (prods.itens || prods)[0]).id;
  const lanc = (await api('GET', `/api/lancamentos?mes=${new Date().toLocaleDateString('sv-SE').slice(0, 7)}`)).dados;
  const lista = lanc.itens || lanc;
  const idRec = (Array.isArray(lista) ? lista : []).find((l) => l.tipo === 'receita' && l.pago_em)?.id;

  const exe = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find((p) => fs.existsSync(p));
  if (!exe) throw new Error('não achei o Microsoft Edge');
  fs.mkdirSync(SAIDA, { recursive: true });
  for (const f of fs.readdirSync(SAIDA)) if (f.endsWith('.pdf') && (!FILTRO || f.includes(FILTRO))) fs.rmSync(path.join(SAIDA, f));
  edge = spawn(exe, ['--headless=new', `--remote-debugging-port=${PORTA_EDGE}`, `--user-data-dir=${path.join(TMP, 'edge')}`, '--no-first-run', '--no-default-browser-check',
    '--disable-extensions', '--disable-gpu', '--window-size=1366,900', '--lang=pt-BR', 'about:blank'], { stdio: 'ignore' });
  let alvo = null;
  for (let i = 0; i < 60 && !alvo; i++) {
    try { alvo = (await (await fetch(`http://127.0.0.1:${PORTA_EDGE}/json/list`)).json()).find((t) => t.type === 'page'); } catch { /* subindo */ }
    if (!alvo) await esperar(250);
  }
  if (!alvo) throw new Error('o Edge escondido não abriu');
  const cdp = await conectar(alvo.webSocketDebuggerUrl);
  await cdp.enviar('Page.enable'); await cdp.enviar('Runtime.enable'); await cdp.enviar('Network.enable');
  await cdp.enviar('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'light' }] });
  const [nomeCookie, valorCookie] = cookie.split('=');
  await cdp.enviar('Network.setCookie', { name: nomeCookie, value: valorCookie, domain: '127.0.0.1', path: '/', httpOnly: true });
  const avaliar = async (expr) => {
    const r = await cdp.enviar('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
    return r.result?.value;
  };

  for (const [hash0, nome, paisagem] of DOCUMENTOS) {
    if (FILTRO && !nome.includes(FILTRO)) continue;
    if (hash0.includes('{rec}') && !idRec) { console.log(`  pulei  ${nome} (sem mensalidade paga na demonstração)`); continue; }
    const hash = hash0.replace('{id}', idRes).replace('{prod}', idProd).replace('{rec}', idRec);
    await cdp.enviar('Page.navigate', { url: `${BASE}/?t=${Date.now()}${hash}` });
    let pronto = false;
    for (let i = 0; i < 80 && !pronto; i++) {
      pronto = await avaliar(`(() => { const c = document.querySelector('#conteudo'); return !!(c && c.querySelector('h1, .vazio') && !c.querySelector('.carregando')); })()`).catch(() => false);
      if (!pronto) await esperar(100);
    }
    await esperar(700); // gráficos e animações
    // O documento de papel é montado no "beforeprint" (impressao.js); aqui disparo à mão e confiro se a tela tem documento próprio
    // chama direto (e não pelo evento) para um erro na montagem do documento aparecer aqui
    let temDoc = false;
    try { temDoc = await avaliar(`(() => { prepararImpressao(); return document.documentElement.classList.contains('com-documento'); })()`); }
    catch (e) { erros++; console.log(`  ERRO   ${nome}: ${e.message.split('\n')[0]}`); continue; }
    await esperar(300); // foto do residente (vem do cache)
    // A impressão de verdade usa a orientação que a página pede (@page); paisagem aqui só se a página não disser nada
    const r = await cdp.enviar('Page.printToPDF', { paperWidth: 8.27, paperHeight: 11.69, landscape: !!paisagem, printBackground: true, preferCSSPageSize: true,
      marginTop: 0, marginBottom: 0, marginLeft: 0, marginRight: 0 });
    const buf = Buffer.from(r.data, 'base64');
    fs.writeFileSync(path.join(SAIDA, nome + '.pdf'), buf);
    const paginas = (buf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;
    await avaliar(`dispatchEvent(new Event('afterprint'))`);
    console.log(`  ${pronto ? 'ok   ' : 'LENTO'}  ${nome}.pdf — ${plural(paginas)}${temDoc ? '' : '  (SEM documento próprio: saiu a tela)'}`);
  }
}

principal()
  .catch((e) => { console.error('\nERRO:', e.message); process.exitCode = 1; })
  .finally(async () => {
    await limpar();
    console.log(`\nPDFs em ferramentas\\prints\\pdf${erros ? ` — ${erros} documento(s) com ERRO` : ''}`);
    if (erros) process.exitCode = 1;
  });
