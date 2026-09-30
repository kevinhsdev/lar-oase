// Escalas de avaliação: Katz (independência nas atividades do dia a dia), Braden (risco de ferida por pressão) e Morse (risco de queda).
// O sistema soma e classifica; o texto das perguntas foi simplificado. Validar com a enfermagem antes de usar de verdade.
'use strict';

const ESCALAS = {
  katz: {
    nome: 'Katz', titulo: 'Independência no dia a dia (Katz)', reavaliar: 90,
    explica: 'Mostra o quanto a pessoa faz sozinha as atividades básicas. Quanto MAIOR a pontuação, mais independente.',
    itens: [
      ['banho', 'Banho', [['Toma banho sozinho(a) ou só precisa de ajuda em uma parte do corpo', 1], ['Precisa de ajuda em mais de uma parte do corpo, ou não toma banho', 0]]],
      ['vestir', 'Vestir-se', [['Pega as roupas e se veste sozinho(a) (pode precisar de ajuda só para amarrar o sapato)', 1], ['Precisa de ajuda para se vestir, ou fica sem se vestir', 0]]],
      ['banheiro', 'Ir ao banheiro', [['Vai ao banheiro, se limpa e arruma a roupa sozinho(a)', 1], ['Precisa de ajuda, usa comadre/fralda ou não vai ao banheiro', 0]]],
      ['transferencia', 'Levantar e deitar', [['Sai e volta para a cama ou cadeira sozinho(a) (pode usar apoio)', 1], ['Precisa de ajuda para sair da cama ou da cadeira', 0]]],
      ['continencia', 'Controle de urina e fezes', [['Controla totalmente', 1], ['Tem escapes, usa fralda ou sonda', 0]]],
      ['alimentacao', 'Alimentar-se', [['Come sozinho(a) (pode precisar de ajuda só para cortar a carne)', 1], ['Precisa de ajuda para comer, ou come por sonda', 0]]],
    ],
    classificar: (p) => (p >= 6 ? ['Independente', 'ok'] : p >= 3 ? ['Dependência moderada', 'aviso'] : ['Dependência importante', 'perigo']),
    maximo: 6,
  },
  braden: {
    nome: 'Braden', titulo: 'Risco de ferida por pressão (Braden)', reavaliar: 90,
    explica: 'Avalia o risco de escara (ferida por ficar muito tempo na mesma posição). Quanto MENOR a pontuação, MAIOR o risco.',
    itens: [
      ['percepcao', 'Sente e avisa desconforto?', [['Não reage à dor (totalmente limitado)', 1], ['Só reage a dor forte (muito limitado)', 2], ['Reage, mas nem sempre consegue avisar (levemente limitado)', 3], ['Sente e avisa normalmente', 4]]],
      ['umidade', 'Pele úmida (suor, urina)', [['Quase sempre úmida', 1], ['Muitas vezes úmida (trocar a roupa de cama pelo menos 1 vez por turno)', 2], ['Às vezes úmida', 3], ['Raramente úmida', 4]]],
      ['atividade', 'Atividade', [['Fica na cama (acamado)', 1], ['Fica na cadeira, quase não anda', 2], ['Anda às vezes, distâncias curtas', 3], ['Anda com frequência', 4]]],
      ['mobilidade', 'Muda de posição sozinho(a)?', [['Não se mexe sozinho(a)', 1], ['Mexe-se pouco, precisa de ajuda', 2], ['Mexe-se com alguma limitação', 3], ['Mexe-se normalmente', 4]]],
      ['nutricao', 'Alimentação', [['Come muito pouco / jejum', 1], ['Come menos da metade das refeições', 2], ['Come a maior parte / dieta por sonda adequada', 3], ['Come tudo', 4]]],
      ['friccao', 'Escorrega na cama ou cadeira?', [['Escorrega muito, precisa de muita ajuda para ser movido(a)', 1], ['Escorrega às vezes, precisa de alguma ajuda', 2], ['Não escorrega, move-se sozinho(a)', 3]]],
    ],
    classificar: (p) => (p <= 9 ? ['Risco muito alto', 'perigo'] : p <= 12 ? ['Risco alto', 'perigo'] : p <= 14 ? ['Risco moderado', 'aviso'] : p <= 18 ? ['Risco baixo', 'info'] : ['Sem risco', 'ok']),
    maximo: 23,
  },
  morse: {
    nome: 'Morse', titulo: 'Risco de queda (Morse)', reavaliar: 90,
    explica: 'Avalia o risco de a pessoa cair. Quanto MAIOR a pontuação, MAIOR o risco.',
    itens: [
      ['quedas', 'Caiu nos últimos 3 meses?', [['Não', 0], ['Sim', 25]]],
      ['diagnosticos', 'Tem mais de uma doença?', [['Não', 0], ['Sim', 15]]],
      ['apoio', 'Como anda?', [['Sem apoio, acamado(a) ou com ajuda de alguém', 0], ['Com bengala, muleta ou andador', 15], ['Apoiando-se nos móveis', 30]]],
      ['soro', 'Está com soro ou acesso na veia?', [['Não', 0], ['Sim', 20]]],
      ['marcha', 'Jeito de andar', [['Normal, acamado(a) ou em cadeira de rodas', 0], ['Fraco', 10], ['Cambaleante, com dificuldade', 20]]],
      ['mental', 'Lembra das próprias limitações?', [['Sim, conhece os seus limites', 0], ['Não, esquece que tem limitações', 15]]],
    ],
    classificar: (p) => (p >= 45 ? ['Risco alto', 'perigo'] : p >= 25 ? ['Risco moderado', 'aviso'] : ['Risco baixo', 'ok']),
    maximo: 125,
  },
};
const dataValida = (v) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v + 'T12:00:00'));
// Para a tela: as escalas sem as funções
const escalasParaTela = () => Object.fromEntries(Object.entries(ESCALAS).map(([k, e]) => [k, { nome: e.nome, titulo: e.titulo, explica: e.explica, itens: e.itens, maximo: e.maximo, reavaliar: e.reavaliar }]));
function pontuar(escala, respostas) {
  const e = ESCALAS[escala];
  let total = 0;
  for (const [chave, rotulo, opcoes] of e.itens) {
    const v = Number(respostas[chave]);
    if (!opcoes.some(([, valor]) => valor === v)) throw Object.assign(new Error(`Responda: ${rotulo}`), { status: 400 });
    total += v;
  }
  const [classe, cor] = e.classificar(total);
  return { pontuacao: total, classificacao: classe, cor };
}

module.exports = function avaliacoes(ctx) {
  const { rota, db, registrar, falha, json, corpoJson, hoje, agoraIso } = ctx;
  const comClasse = (a) => ({ ...a, respostas: JSON.parse(a.respostas || '{}'), cor: ESCALAS[a.escala].classificar(a.pontuacao)[1] });
  const diasEntre = (a, b) => Math.round((Date.parse(b + 'T12:00:00') - Date.parse(a + 'T12:00:00')) / 86400000);

  // Painel: a última avaliação de cada escala de cada residente no lar (e se já passou da hora de reavaliar)
  rota('GET', '/api/avaliacoes/painel', async (req, res) => {
    const rs = db.prepare("SELECT id, nome, apelido, quarto, grau_dependencia FROM residentes WHERE situacao IN ('no_lar','hospitalizado') ORDER BY nome COLLATE NOCASE").all();
    const todas = db.prepare('SELECT * FROM avaliacoes ORDER BY data, id').all();
    const h = hoje();
    const linhas = rs.map((r) => {
      const ultimas = {};
      for (const a of todas.filter((x) => x.residente_id === r.id)) ultimas[a.escala] = a;
      const por = Object.fromEntries(Object.keys(ESCALAS).map((k) => { const u = ultimas[k]; return [k, u ? { ...comClasse(u), vencida: diasEntre(u.data, h) > ESCALAS[k].reavaliar } : null]; }));
      return { ...r, ultimas: por };
    });
    const pendentes = linhas.reduce((s, l) => s + Object.values(l.ultimas).filter((u) => !u || u.vencida).length, 0);
    const riscos = linhas.reduce((s, l) => s + Object.values(l.ultimas).filter((u) => u && u.cor === 'perigo').length, 0);
    json(res, 200, { linhas, escalas: escalasParaTela(), pendentes, riscos });
  });

  rota('GET', '/api/avaliacoes', async (req, res, { url }) => {
    const r = db.prepare('SELECT id, nome, apelido FROM residentes WHERE id = ?').get(Number(url.searchParams.get('residente'))) || falha(404, 'Residente não encontrado');
    const itens = db.prepare('SELECT a.*, u.nome autor_nome FROM avaliacoes a LEFT JOIN usuarios u ON u.login = a.criado_por WHERE a.residente_id = ? ORDER BY a.data DESC, a.id DESC').all(r.id).map(comClasse);
    json(res, 200, { residente: r, itens, escalas: escalasParaTela() });
  });

  rota('POST', '/api/avaliacoes', async (req, res, { u }) => {
    const b = await corpoJson(req);
    if (!ESCALAS[b.escala]) falha(400, 'Escala inválida');
    const r = db.prepare('SELECT id, nome, demo FROM residentes WHERE id = ?').get(Number(b.residente_id)) || falha(400, 'Escolha o residente');
    const data = b.data || hoje();
    if (!dataValida(data) || data > hoje()) falha(400, 'Data inválida');
    let res1;
    try { res1 = pontuar(b.escala, b.respostas || {}); } catch (e) { falha(e.status || 400, e.message); }
    const respostas = Object.fromEntries(ESCALAS[b.escala].itens.map(([k]) => [k, Number(b.respostas[k])]));
    const id = Number(db.prepare(`INSERT INTO avaliacoes (residente_id, escala, data, respostas, pontuacao, classificacao, obs, criado_em, criado_por, demo) VALUES (?,?,?,?,?,?,?,?,?,?)`)
      .run(r.id, b.escala, data, JSON.stringify(respostas), res1.pontuacao, res1.classificacao, String(b.obs || '').trim().slice(0, 1000) || null, agoraIso(), u.login, r.demo).lastInsertRowid);
    registrar(u.login, `avaliou: ${ESCALAS[b.escala].nome} = ${res1.pontuacao} (${res1.classificacao})`, { residente_id: r.id, nome: r.nome, avaliacao: id });
    json(res, 201, { id, ...res1 });
  });

  rota('DELETE', '/api/avaliacoes/:id', async (req, res, { u, p }) => {
    const a = db.prepare('SELECT a.*, r.nome FROM avaliacoes a JOIN residentes r ON r.id = a.residente_id WHERE a.id = ?').get(+p.id) || falha(404, 'Avaliação não encontrada');
    if (u.perfil !== 'admin' && a.criado_por !== u.login) falha(403, 'Só quem avaliou (ou a administração) pode apagar');
    db.prepare('DELETE FROM avaliacoes WHERE id = ?').run(a.id);
    registrar(u.login, `apagou avaliação ${ESCALAS[a.escala].nome}`, { residente_id: a.residente_id, nome: a.nome, data: a.data });
    json(res, 200, { ok: true });
  });
};

module.exports.ESCALAS = ESCALAS;
module.exports.pontuar = pontuar;
