// Dados FICTÍCIOS para demonstração e treino. Nenhuma pessoa aqui existe.
// Sem CPF de propósito (um número inventado poderia ser de alguém de verdade) e com telefones no formato (11) 90000-00xx.
'use strict';

const RESIDENTES = [
  // nome, apelido, sexo, nascimento, entrada, quarto, leito, grau, mobilidade, sangue, alergias, diagnósticos, dieta, convênio, situação
  ['Aurora Menezes Falcão', 'Dona Aurora', 'F', '1936-10-08', '2019-03-11', '1', 'A', 'II', 'Andador', 'O+', 'Dipirona', 'Hipertensão; Artrose nos joelhos', 'Hipossódica', 'SUS', 'no_lar'],
  ['Benedito Arruda Salles', 'Seu Dito', 'M', '1941-02-17', '2021-07-02', '2', 'A', 'I', 'Independente', 'A+', '', 'Diabetes tipo 2', 'Para diabético', 'Unimed', 'no_lar'],
  ['Cecília Brandão Viana', '', 'F', '1933-10-21', '2017-11-20', '1', 'B', 'III', 'Cadeira de rodas', 'B+', 'Penicilina; Frutos do mar', 'Alzheimer (fase moderada)', 'Pastosa', 'SUS', 'no_lar'],
  ['Dirce Toledo Amaral', 'Dona Dirce', 'F', '1944-12-02', '2022-01-15', '3', 'A', 'I', 'Independente', 'O-', '', 'Hipotireoidismo', 'Livre', 'Bradesco Saúde', 'no_lar'],
  ['Eurico Paiva Lacerda', '', 'M', '1938-05-30', '2020-09-09', '2', 'B', 'II', 'Bengala', 'AB+', 'Sulfa', 'Parkinson', 'Livre', 'SUS', 'hospitalizado'],
  ['Filomena Castro Reis', 'Dona Filó', 'F', '1935-10-12', '2016-04-04', '4', 'A', 'III', 'Acamado(a)', 'A-', '', 'Sequela de AVC; Hipertensão', 'Enteral (sonda)', 'SUS', 'no_lar'],
  ['Geraldo Nunes Pimentel', 'Seu Geraldo', 'M', '1940-08-25', '2023-02-27', '5', 'A', 'I', 'Independente', 'O+', 'Ácido acetilsalicílico (AAS)', 'Glaucoma', 'Hipossódica', 'Particular', 'no_lar'],
  ['Hilda Ramos Bittencourt', '', 'F', '1931-11-03', '2015-06-18', '4', 'B', 'III', 'Cadeira de rodas', 'B-', '', 'Demência mista; Osteoporose', 'Pastosa', 'SUS', 'no_lar'],
  ['Ismael Duarte Corrêa', '', 'M', '1945-03-14', '2024-05-06', '5', 'B', 'I', 'Independente', 'A+', 'Lactose', 'Hipertensão', 'Sem lactose', 'SUS', 'no_lar'],
  ['Judite Almeida Prado', 'Dona Judite', 'F', '1939-10-27', '2018-08-13', '3', 'B', 'II', 'Andador', 'O+', '', 'Insuficiência cardíaca', 'Hipossódica', 'Amil', 'no_lar'],
  ['Laércio Moura Fontes', '', 'M', '1937-01-09', '2019-12-02', '6', 'A', 'II', 'Bengala', 'A+', 'Dipirona', 'DPOC', 'Livre', 'SUS', 'no_lar'],
  ['Mafalda Serra Quintela', '', 'F', '1942-07-19', '2021-03-22', '7', 'A', 'I', 'Independente', 'AB-', '', 'Depressão; Hipertensão', 'Livre', 'SUS', 'no_lar'],
  ['Nair Guedes Portela', 'Dona Nair', 'F', '1934-09-05', '2016-10-10', '7', 'B', 'II', 'Andador', 'O+', 'Camarão', 'Artrite reumatoide', 'Hipossódica', 'SUS', 'no_lar'],
  ['Osvaldo Teixeira Lobo', '', 'M', '1936-04-28', '2020-02-17', '6', 'B', 'III', 'Cadeira de rodas', 'B+', '', 'Alzheimer (fase avançada)', 'Pastosa', 'SUS', 'no_lar'],
  ['Palmira Assis Vilela', '', 'F', '1943-10-16', '2022-11-08', '8', 'A', 'I', 'Independente', 'A+', '', 'Diabetes tipo 2', 'Para diabético', 'Unimed', 'no_lar'],
  ['Rosalina Faria Cordeiro', '', 'F', '1932-06-11', '2014-09-01', '8', 'B', 'III', 'Acamado(a)', 'O+', 'Látex', 'Demência; Úlcera por pressão (cuidado)', 'Pastosa', 'SUS', 'hospitalizado'],
  ['Sebastião Leme Carvalho', 'Seu Tião', 'M', '1939-11-22', '2018-01-29', '9', 'A', 'II', 'Andador', 'A-', '', 'Hipertensão; Catarata', 'Hipossódica', 'SUS', 'saiu'],
  ['Teresinha Borba Santiago', '', 'F', '1930-02-02', '2013-05-20', '9', 'B', 'III', 'Acamado(a)', 'B+', '', 'Insuficiência renal', 'Renal', 'SUS', 'faleceu'],
];

const PARENTESCOS = ['Filha', 'Filho', 'Sobrinha', 'Sobrinho', 'Neta', 'Neto', 'Irmã', 'Nora', 'Genro'];
const PRENOMES = ['Márcia', 'Roberto', 'Cláudia', 'Paulo', 'Luciana', 'Fernando', 'Adriana', 'Sérgio', 'Patrícia', 'Marcos', 'Simone', 'Ricardo'];
const MEDICOS = ['Dra. Helena Siqueira (geriatra)', 'Dr. Mauro Tavares (clínico)', 'Dra. Vânia Rocha (geriatra)'];
const RELIGIOES = ['Luterana', 'Católica', 'Evangélica', 'Luterana', 'Católica'];
const CIVIL = ['Viúva(o)', 'Casada(o)', 'Solteira(o)', 'Divorciada(o)', 'Viúva(o)'];

function gerarDemo(db, transacao) {
  const agora = new Date().toISOString();
  const insR = db.prepare(`INSERT INTO residentes (nome, apelido, sexo, dt_nasc, dt_entrada, quarto, leito, grau_dependencia, mobilidade, tipo_sanguineo,
      alergias, diagnosticos, dieta, convenio, convenio_numero, situacao, situacao_desde, situacao_obs, estado_civil, religiao, naturalidade, cartao_sus,
      medico, medico_tel, obs, criado_em, criado_por, atualizado_em, atualizado_por, demo)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1)`);
  const insC = db.prepare(`INSERT INTO contatos (residente_id, nome, parentesco, telefone, telefone2, email, endereco, responsavel, emergencia, obs,
      criado_em, criado_por, atualizado_em, atualizado_por, demo) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,1)`);
  const diasAtras = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return d.toLocaleDateString('sv-SE'); };
  let fone = 1;
  const proxFone = () => `(11) 90000-${String(fone++).padStart(4, '0')}`;
  transacao(() => {
    RESIDENTES.forEach((r, i) => {
      const [nome, apelido, sexo, nasc, entrada, quarto, leito, grau, mob, sangue, alerg, diag, dieta, conv, sit] = r;
      const desde = sit === 'no_lar' ? entrada : sit === 'hospitalizado' ? diasAtras(2 + i % 4) : diasAtras(40 + i * 3);
      const obsSit = { hospitalizado: 'Hospital Regional (fictício) — internação para observação', saiu: 'Voltou a morar com a família', faleceu: '' }[sit] || null;
      const convNum = conv === 'SUS' || conv === 'Particular' ? null : `DEMO ${String(1000 + i * 37)}`;
      const id = Number(insR.run(nome, apelido || null, sexo, nasc, entrada, quarto, leito, grau, mob, sangue, alerg || null, diag, dieta, conv, convNum,
        sit, desde, obsSit, CIVIL[i % CIVIL.length], RELIGIOES[i % RELIGIOES.length], ['São Paulo/SP', 'Mogi das Cruzes/SP', 'Suzano/SP', 'Blumenau/SC', 'Curitiba/PR'][i % 5],
        `000 0000 0000 ${String(i).padStart(4, '0')}`, MEDICOS[i % MEDICOS.length], proxFone(),
        i % 4 === 0 ? 'Gosta de ouvir hinos pela manhã e de participar do culto de quarta.' : null,
        agora, 'demo', agora, 'demo').lastInsertRowid);
      const sobrenome = nome.split(' ').slice(-1)[0];
      const n = 1 + (i % 3); // de 1 a 3 contatos
      for (let k = 0; k < n; k++) {
        const pren = PRENOMES[(i * 3 + k) % PRENOMES.length];
        const par = PARENTESCOS[(i + k * 2) % PARENTESCOS.length];
        insC.run(id, `${pren} ${sobrenome}`, par, proxFone(), k === 0 ? proxFone() : null,
          k === 0 ? `${pren.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()}.demo@exemplo.com` : null,
          k === 0 ? `Rua Fictícia, ${100 + i * 7} — Ferraz de Vasconcelos/SP` : null,
          k === 0 ? 1 : 0, k <= 1 ? 1 : 0, k === 0 ? 'Visita aos domingos' : null, agora, 'demo', agora, 'demo');
      }
    });
  });
  completarDemo(db, transacao);
  return RESIDENTES.length;
}

// Cada módulo com a sua parte fictícia. Módulo novo: acrescente aqui [nome, tabela com a coluna demo, função].
// Quem carregou a demonstração antes de um módulo existir recebe a parte dele ao abrir o sistema (ver server.js).
const MODULOS_DEMO = [
  ['Diário', 'ocorrencias', gerarDemoDiario],
  ['Agenda', 'agenda', gerarDemoAgenda],
  ['Estoque', 'produtos', gerarDemoEstoque],
  ['Remédios', 'prescricoes', gerarDemoRemedios],
  ['Vacinas', 'vacinas', gerarDemoVacinas],
  ['Equipe', 'profissionais', gerarDemoEquipe],
  ['Patrimônio', 'patrimonio', gerarDemoPatrimonio],
  ['Sinais vitais', 'sinais', gerarDemoSinais],
  ['Tarefas', 'tarefas', gerarDemoTarefas],
  ['Avaliações', 'avaliacoes', gerarDemoAvaliacoes],
  ['PIA', 'pias', gerarDemoPia],
  ['Financeiro', 'lancamentos', gerarDemoFinanceiro],
];

// Financeiro fictício: 6 meses de mensalidades, doações, contribuição da OASE e despesas típicas de um lar (valores inventados).
// No mês atual: parte paga, parte em aberto e algumas atrasadas.
function gerarDemoFinanceiro(db, transacao) {
  const rs = db.prepare("SELECT id, nome FROM residentes WHERE demo = 1 AND situacao IN ('no_lar','hospitalizado') ORDER BY id").all();
  const hoje = new Date();
  const hojeIso = hoje.toLocaleDateString('sv-SE');
  const mesDe = (n) => { const d = new Date(hoje.getFullYear(), hoje.getMonth() + n, 1, 12); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };
  const nomes = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  const varia = (s, amp) => Math.round((Math.sin(s * 12.9898) * 43758.5453 % 1) * amp);
  const agora = new Date().toISOString();
  const ins = db.prepare(`INSERT INTO lancamentos (tipo, categoria, descricao, valor, vencimento, pago_em, valor_pago, forma, pessoa, residente_id, competencia, criado_em, criado_por, atualizado_em, atualizado_por, demo)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1)`);
  const lanca = (tipo, cat, desc, valor, venc, pessoa = null, rid = null, comp = null, forma = 'Pix') => {
    const pago = venc <= hojeIso && !(venc >= mesDe(0) + '-01' && varia(valor, 10) > 6); // no mês atual, alguns vencidos ficam sem pagar (atrasados)
    ins.run(tipo, cat, desc, valor, venc, pago ? venc : null, pago ? valor : null, pago ? forma : null, pessoa, rid, comp, agora, 'ana.demo', agora, 'ana.demo');
  };
  transacao(() => {
    rs.forEach((r, i) => db.prepare('UPDATE residentes SET mensalidade = ?, dia_vencimento = ? WHERE id = ?').run(2600 + (i % 6) * 320, i % 3 === 0 ? 5 : 10, r.id));
    const ms = db.prepare('SELECT id, nome, mensalidade, dia_vencimento FROM residentes WHERE demo = 1 AND mensalidade > 0').all();
    for (let n = -5; n <= 0; n++) {
      const m = mesDe(n);
      const nomeMes = `${nomes[Number(m.slice(5)) - 1]}/${m.slice(0, 4)}`;
      for (const r of ms) lanca('receita', 'Mensalidade', `Mensalidade de ${nomeMes} — ${r.nome}`, r.mensalidade, `${m}-${String(r.dia_vencimento).padStart(2, '0')}`, null, r.id, m, r.id % 4 === 0 ? 'Benefício (INSS)' : 'Pix');
      lanca('receita', 'Contribuição da OASE / igreja', `Contribuição mensal da OASE — ${nomeMes}`, 8000, `${m}-05`, 'OASE (fictícia)', null, null, 'Transferência');
      lanca('receita', 'Doação', `Doações da comunidade — ${nomeMes}`, 1500 + Math.abs(varia(n + 7, 2500)), `${m}-15`, 'Comunidade (fictícia)', null, null, 'Pix');
      lanca('despesa', 'Salários e encargos', `Folha de pagamento — ${nomeMes}`, 41800, `${m}-05`, 'Equipe', null, null, 'Transferência');
      lanca('despesa', 'Alimentação', `Mercado e hortifrúti — ${nomeMes}`, 9200 + varia(n + 1, 900), `${m}-12`, 'Mercado (fictício)', null, null, 'Boleto');
      lanca('despesa', 'Remédios e material de saúde', `Farmácia — ${nomeMes}`, 2900 + varia(n + 2, 600), `${m}-18`, 'Farmácia (fictícia)', null, null, 'Boleto');
      lanca('despesa', 'Higiene e limpeza', `Fraldas e produtos de limpeza — ${nomeMes}`, 2600 + varia(n + 3, 400), `${m}-10`, 'Distribuidora (fictícia)', null, null, 'Boleto');
      lanca('despesa', 'Água, luz, gás e telefone', `Contas de consumo — ${nomeMes}`, 3100 + varia(n + 4, 300), `${m}-20`, 'Concessionárias', null, null, 'Boleto');
      lanca('despesa', 'Serviços (médico, fisioterapia…)', `Fisioterapia e nutrição — ${nomeMes}`, 3400, `${m}-25`, 'Prestadores (fictícios)', null, null, 'Pix');
      if (n === -2) lanca('despesa', 'Manutenção e consertos', 'Conserto da máquina de lavar', 650, `${m}-22`, 'Assistência técnica (fictícia)', null, null, 'Pix');
    }
  });
}

// PIA fictício para a maioria dos residentes no lar (um com a revisão vencida; alguns ainda sem PIA)
function gerarDemoPia(db, transacao) {
  const rs = db.prepare("SELECT * FROM residentes WHERE demo = 1 AND situacao = 'no_lar' ORDER BY id").all();
  const dia = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toLocaleDateString('sv-SE'); };
  const ins = db.prepare('INSERT INTO pias (residente_id, data, proxima_revisao, participantes, areas, obs, criado_em, criado_por, demo) VALUES (?,?,?,?,?,?,?,?,1)');
  const agora = new Date().toISOString();
  transacao(() => {
    rs.forEach((r, i) => {
      if (i % 4 === 3) return; // alguns ainda sem PIA (aparecem como pendentes)
      const g = r.grau_dependencia || 'I';
      const areas = {
        saude: { situacao: `${r.diagnosticos || 'Sem diagnósticos registrados'}.${r.alergias ? ' ALERGIA: ' + r.alergias + '.' : ''}`,
          metas: 'Manter as doenças controladas e os remédios nos horários certos.', acoes: 'Dar os remédios conforme a folha; aferir sinais vitais toda manhã; consulta com a geriatra a cada 3 meses.', responsavel: 'Enfermagem' },
        nutricao: { situacao: `Dieta ${String(r.dieta || 'livre').toLowerCase()}.`, metas: g === 'III' ? 'Manter o peso e evitar engasgo.' : 'Manter alimentação variada e boa hidratação.',
          acoes: g === 'III' ? 'Dieta pastosa; oferecer água de 2 em 2 horas; pesar toda segunda-feira.' : 'Oferecer frutas no lanche; incentivar a beber água; pesar toda segunda-feira.', responsavel: 'Nutricionista e cuidadoras' },
        mobilidade: { situacao: `Mobilidade: ${String(r.mobilidade || 'independente').toLowerCase()}.`,
          metas: g === 'III' ? 'Prevenir encurtamentos e manter o conforto no leito.' : 'Evitar quedas e manter a caminhada.',
          acoes: g === 'III' ? 'Exercícios passivos no leito com a fisioterapia 3x por semana.' : 'Caminhar acompanhado(a) no jardim; fisioterapia 2x por semana; manter o quarto sem obstáculos.', responsavel: 'Fisioterapia' },
        pele: { situacao: g === 'III' ? 'Risco alto de ferida por pressão.' : 'Pele íntegra.', metas: g === 'III' ? 'Não ter feridas por pressão.' : 'Manter a pele hidratada e íntegra.',
          acoes: g === 'III' ? 'Mudar de posição de 2 em 2 horas; colchão pneumático; hidratar a pele após o banho; trocar a fralda sempre que preciso.' : 'Hidratar a pele após o banho; observar vermelhidões.', responsavel: 'Técnicos de enfermagem e cuidadoras' },
        cognicao: { situacao: g === 'III' ? 'Desorientado(a) no tempo; momentos de agitação ao entardecer.' : 'Orientado(a), conversa bem.', metas: 'Manter a tranquilidade e a rotina.',
          acoes: g === 'III' ? 'Rotina previsível; música calma ao entardecer; evitar trocas de quarto.' : 'Conversar sobre o dia; jogos de memória na oficina.', responsavel: 'Cuidadoras' },
        social: { situacao: 'Recebe visita da família aos domingos.', metas: 'Manter o contato com a família e a comunidade.',
          acoes: `Incentivar as visitas; chamada de vídeo quinzenal com a família;${r.religiao === 'Luterana' ? ' acompanhar ao culto de quarta.' : ' convidar para o culto e as festas.'}`, responsavel: 'Assistente social' },
        atividades: { situacao: r.obs || 'Gosta de música e de conversar.', metas: 'Participar de atividades de que gosta.', acoes: 'Oficina de música às sextas; festa dos aniversariantes do mês.', responsavel: 'Voluntários e cuidadoras' },
      };
      const vencido = i === 1;
      const data = vencido ? dia(-200) : dia(-(40 + i * 5));
      const prox = vencido ? dia(-20) : (() => { const d = new Date(data + 'T12:00:00'); d.setDate(d.getDate() + 180); return d.toLocaleDateString('sv-SE'); })();
      ins.run(r.id, data, prox, 'Enfermeira responsável, fisioterapeuta, assistente social, residente e família', JSON.stringify(areas), null, agora, 'ana.demo');
    });
  });
}

// Avaliações fictícias, coerentes com o grau de dependência de cada residente (grau III = acamado, risco de ferida alto…).
// Alguns têm só uma avaliação antiga (aparecem como "reavaliar").
function gerarDemoAvaliacoes(db, transacao) {
  const { pontuar } = require('../rotas/avaliacoes');
  const rs = db.prepare("SELECT id, grau_dependencia, mobilidade FROM residentes WHERE demo = 1 AND situacao IN ('no_lar','hospitalizado') ORDER BY id").all();
  const dia = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toLocaleDateString('sv-SE'); };
  const respostas = {
    katz: { I: [1, 1, 1, 1, 1, 1], II: [0, 0, 1, 1, 1, 1], III: [0, 0, 0, 0, 0, 1] },
    braden: { I: [4, 4, 4, 4, 3, 3], II: [3, 3, 3, 3, 3, 2], III: [2, 2, 1, 2, 2, 1] },
    morse: { I: [0, 15, 0, 0, 0, 0], II: [0, 15, 15, 0, 10, 0], III: [0, 15, 0, 0, 0, 15] },
  };
  const chaves = { katz: ['banho', 'vestir', 'banheiro', 'transferencia', 'continencia', 'alimentacao'], braden: ['percepcao', 'umidade', 'atividade', 'mobilidade', 'nutricao', 'friccao'],
    morse: ['quedas', 'diagnosticos', 'apoio', 'soro', 'marcha', 'mental'] };
  const ins = db.prepare('INSERT INTO avaliacoes (residente_id, escala, data, respostas, pontuacao, classificacao, obs, criado_em, criado_por, demo) VALUES (?,?,?,?,?,?,?,?,?,1)');
  const agora = new Date().toISOString();
  transacao(() => {
    rs.forEach((r, i) => {
      const g = r.grau_dependencia || 'I';
      for (const esc of ['katz', 'braden', 'morse']) {
        const v = [...respostas[esc][g]];
        if (esc === 'morse' && i % 4 === 0) v[0] = 25; // caiu nos últimos 3 meses
        const resp = Object.fromEntries(chaves[esc].map((k, j) => [k, v[j]]));
        const { pontuacao, classificacao } = pontuar(esc, resp);
        const velha = (i + esc.length) % 5 === 0; // só a antiga: precisa reavaliar
        ins.run(r.id, esc, dia(-(120 + i)), JSON.stringify(resp), pontuacao, classificacao, null, agora, 'ana.demo');
        if (!velha) ins.run(r.id, esc, dia(-(5 + i * 2)), JSON.stringify(resp), pontuacao, classificacao, esc === 'braden' && g === 'III' ? 'Mudança de decúbito de 2 em 2 horas; colchão pneumático.' : null, agora, 'ana.demo');
      }
    });
  });
}

// Tarefas fictícias da equipe. [título, detalhe, prazo (dias a partir de hoje, null = sem prazo), prioridade, repetir, feita?]
function gerarDemoTarefas(db, transacao) {
  const dia = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toLocaleDateString('sv-SE'); };
  const agora = new Date().toISOString();
  const ins = db.prepare(`INSERT INTO tarefas (titulo, detalhe, prazo, prioridade, repetir, feita, feita_em, feita_por, criado_em, criado_por, atualizado_em, atualizado_por, demo)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,1)`);
  const itens = [
    ['Ligar para a família do Seu Dito', 'Confirmar quem vai acompanhar na consulta do cardiologista.', 0, 'alta', null, 0],
    ['Trocar a roupa de cama dos quartos 1 a 4', null, 0, 'normal', 'semanal', 0],
    ['Comprar fralda geriátrica M', 'Está acabando no estoque (ver Estoque).', -2, 'alta', null, 0],
    ['Conferir a validade dos remédios do armário', 'Separar o que vence em 30 dias.', 3, 'normal', 'mensal', 0],
    ['Pesar os residentes', 'Anotar na ronda de sinais vitais.', (8 - new Date().getDay()) % 7 || 7, 'normal', 'semanal', 0],
    ['Agendar o conserto da cadeira de rodas PAT-021', 'Freio direito falhando.', 1, 'normal', null, 0],
    ['Preparar a festa dos aniversariantes do mês', 'Bolo, decoração e convite para as famílias.', 7, 'normal', null, 0],
    ['Organizar as doações de roupas', null, null, 'normal', null, 0],
    ['Levar a Dona Judite ao exame de sangue', null, -1, 'normal', null, 1],
    ['Recarregar o cilindro de oxigênio', null, -3, 'alta', null, 1],
  ];
  transacao(() => {
    for (const [t, det, prazo, prio, rep, feita] of itens) {
      ins.run(t, det, prazo == null ? null : dia(prazo), prio, rep, feita, feita ? `${dia(prazo || 0)}T15:00:00.000Z` : null, feita ? 'ana.demo' : null, agora, 'ana.demo', agora, 'ana.demo');
    }
  });
}

// Sinais vitais fictícios: 30 dias de ronda da manhã para quem está no lar; glicemia 2x por dia para os diabéticos; peso às segundas.
// Cada pessoa tem o seu "jeito" (hipertenso com pressão mais alta, DPOC com saturação mais baixa…), com uma variação pequena por dia.
function gerarDemoSinais(db, transacao) {
  const rs = db.prepare("SELECT id, nome, diagnosticos, situacao FROM residentes WHERE demo = 1 ORDER BY id").all();
  const dia = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toLocaleDateString('sv-SE'); };
  const varia = (seed, amp) => Math.round(Math.sin(seed * 12.9898) * 43758.5453 % 1 * amp); // "sorteio" que dá sempre o mesmo resultado
  const ins = db.prepare(`INSERT INTO sinais (residente_id, data, hora, pa_sist, pa_diast, temperatura, glicemia, saturacao, fc, peso, dor, obs, criado_em, criado_por, demo)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,1)`);
  const autores = ['ana.demo', 'joana.demo', 'rita.demo', 'paulo.demo'];
  const agoraH = new Date().getHours();
  transacao(() => {
    rs.forEach((r, i) => {
      if (r.situacao !== 'no_lar') return;
      const d = String(r.diagnosticos || '').toLowerCase();
      const hiper = d.includes('hipertens') || d.includes('cardíaca');
      const diab = d.includes('diabetes');
      const dpoc = d.includes('dpoc');
      const pesoBase = 52 + (i * 7) % 28;
      for (let n = 29; n >= 0; n--) {
        if (n === 0 && agoraH < 9) continue; // hoje, só se a ronda da manhã já passou
        const s = i * 100 + n;
        const tendencia = hiper && i % 3 === 0 ? Math.round((29 - n) * 0.8) : 0; // um hipertenso com a pressão subindo no mês
        const sist = (hiper ? 138 : 122) + tendencia + varia(s, 14);
        const diast = (hiper ? 86 : 76) + Math.round(tendencia / 2) + varia(s + 1, 8);
        const temp = n === 3 && i === 6 ? 38.1 : Math.round((36.3 + varia(s + 2, 6) / 10) * 10) / 10;
        const sat = (dpoc ? 91 : 95) + Math.abs(varia(s + 3, 3));
        const fc = 68 + varia(s + 4, 14);
        const peso = new Date(dia(-n) + 'T12:00:00').getDay() === 1 ? Math.round((pesoBase + varia(s + 5, 8) / 10) * 10) / 10 : null;
        const dor = d.includes('artrite') || d.includes('artrose') ? 3 + Math.abs(varia(s + 6, 3)) : null;
        const quando = `${dia(-n)}T08:${String(10 + (i % 40)).padStart(2, '0')}:00`;
        ins.run(r.id, dia(-n), `08:${String(10 + (i % 40)).padStart(2, '0')}`, sist, diast, temp, diab ? 150 + varia(s + 7, 50) : null, Math.min(100, sat), fc, peso, dor,
          temp >= 37.8 ? 'Febre: enfermagem avisada' : null, quando, autores[n % 4]);
        if (diab && (n > 0 || agoraH >= 18)) ins.run(r.id, dia(-n), '17:30', null, null, null, 175 + varia(s + 8, 70), null, null, null, null, null, `${dia(-n)}T17:30:00`, autores[(n + 1) % 4]);
      }
    });
  });
}
// Gera a parte fictícia dos módulos que ainda não têm nenhuma. Devolve os nomes dos que foram completados.
function completarDemo(db, transacao) {
  if (!db.prepare('SELECT 1 FROM residentes WHERE demo = 1 LIMIT 1').get()) return [];
  const feitos = [];
  for (const [nome, tabela, fn] of MODULOS_DEMO) {
    if (db.prepare(`SELECT 1 FROM ${tabela} WHERE demo = 1 LIMIT 1`).get()) continue;
    fn(db, transacao);
    feitos.push(nome);
  }
  return feitos;
}

// Patrimônio fictício. [nome, categoria, código, local, estado, índice do residente que usa (ou null), origem, valor, próxima revisão (dias a partir de hoje)]
const PATRIMONIO_DEMO = [
  ['Cama hospitalar elétrica', 'Mobília e camas', 'PAT-001', 'Quarto 1', 'bom', null, 'Doação', 3200, null],
  ['Cama hospitalar elétrica', 'Mobília e camas', 'PAT-002', 'Quarto 4', 'regular', null, 'Compra', 3500, null],
  ['Cama hospitalar manual', 'Mobília e camas', 'PAT-003', 'Quarto 8', 'bom', null, 'Doação', 1500, null],
  ['Colchão pneumático (anti-escaras)', 'Equipamento de saúde', 'PAT-010', 'Quarto 4', 'bom', 5, 'Compra', 450, 90],
  ['Cadeira de rodas', 'Acessibilidade', 'PAT-020', 'Quarto 1', 'bom', 2, 'Doação', 900, null],
  ['Cadeira de rodas', 'Acessibilidade', 'PAT-021', 'Quarto 6', 'ruim', 13, 'Empréstimo', 800, null],
  ['Andador articulado', 'Acessibilidade', 'PAT-022', 'Quarto 1', 'bom', 0, 'Compra', 250, null],
  ['Cadeira de banho', 'Acessibilidade', 'PAT-023', 'Banheiro ala A', 'bom', null, 'Compra', 380, null],
  ['Concentrador de oxigênio', 'Equipamento de saúde', 'PAT-030', 'Posto de enfermagem', 'bom', null, 'Comodato', 4500, 20],
  ['Cilindro de oxigênio (portátil)', 'Equipamento de saúde', 'PAT-031', 'Posto de enfermagem', 'bom', null, 'Comodato', null, -3],
  ['Aparelho de pressão digital', 'Equipamento de saúde', 'PAT-032', 'Posto de enfermagem', 'bom', null, 'Compra', 220, 150],
  ['Glicosímetro', 'Equipamento de saúde', 'PAT-033', 'Posto de enfermagem', 'bom', null, 'Doação', 90, null],
  ['Extintor de incêndio (pó químico)', 'Segurança', 'PAT-040', 'Corredor ala A', 'bom', null, 'Compra', 180, 12],
  ['Extintor de incêndio (água)', 'Segurança', 'PAT-041', 'Cozinha', 'bom', null, 'Compra', 160, 200],
  ['Geladeira duplex', 'Eletrodoméstico', 'PAT-050', 'Cozinha', 'bom', null, 'Doação', 2800, null],
  ['Fogão industrial 6 bocas', 'Cozinha', 'PAT-051', 'Cozinha', 'regular', null, 'Compra', 1900, null],
  ['Máquina de lavar industrial', 'Lavanderia', 'PAT-060', 'Lavanderia', 'manutencao', null, 'Compra', 8900, null],
  ['Televisão 50"', 'Eletrônico', 'PAT-070', 'Sala de convivência', 'bom', null, 'Doação', 2400, null],
  ['Carro do lar (Spin)', 'Veículo', 'PAT-080', 'Garagem', 'bom', null, 'Doação', 45000, 25],
];

function gerarDemoPatrimonio(db, transacao) {
  const rs = db.prepare('SELECT id FROM residentes WHERE demo = 1 ORDER BY id').all().map((r) => r.id);
  const dia = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toLocaleDateString('sv-SE'); };
  const agora = new Date().toISOString();
  const insP = db.prepare(`INSERT INTO patrimonio (nome, categoria, codigo, local, estado, residente_id, data_aquisicao, origem, valor, proxima_revisao, criado_em, criado_por, atualizado_em, atualizado_por, demo)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,1)`);
  const insM = db.prepare('INSERT INTO manutencoes (patrimonio_id, data, tipo, descricao, custo, responsavel, criado_em, criado_por, demo) VALUES (?,?,?,?,?,?,?,?,1)');
  transacao(() => {
    PATRIMONIO_DEMO.forEach(([nome, cat, cod, local, estado, ri, origem, valor, rev], i) => {
      const id = Number(insP.run(nome, cat, cod, local, estado, ri == null ? null : rs[ri], dia(-400 - i * 30), origem, valor, rev == null ? null : dia(rev), agora, 'ana.demo', agora, 'ana.demo').lastInsertRowid);
      if (cod === 'PAT-060') insM.run(id, dia(-4), 'conserto', 'Parou de centrifugar. Técnico levou a placa para conserto; volta em 10 dias.', 650, 'Assistência técnica (fictícia)', agora, 'ana.demo');
      if (cod === 'PAT-040') insM.run(id, dia(-353), 'revisao', 'Recarga e inspeção anual.', 60, 'Empresa de extintores (fictícia)', agora, 'ana.demo');
      if (cod === 'PAT-080') insM.run(id, dia(-160), 'manutencao', 'Revisão dos 60 mil km, troca de óleo e filtros.', 780, 'Oficina (fictícia)', agora, 'ana.demo');
      if (cod === 'PAT-021') insM.run(id, dia(-20), 'outro', 'Freio direito falhando. Evitar usar em rampa até o conserto.', null, null, agora, 'joana.demo');
    });
  });
}

// Equipe fictícia e a escala do mês. [nome, função, registro, especialidade, vínculo, na escala?, padrão da escala, deslocamento do ciclo]
const EQUIPE_DEMO = [
  ['Dra. Helena Siqueira', 'Médico(a)', 'CRM-SP 000001 (fictício)', 'Geriatria', 'Prestador de serviço', 0],
  ['Dr. Mauro Tavares', 'Médico(a)', 'CRM-SP 000002 (fictício)', 'Clínica geral', 'SUS / UBS', 0],
  ['Dra. Vânia Rocha', 'Médico(a)', 'CRM-SP 000003 (fictício)', 'Geriatria', 'Prestador de serviço', 0],
  ['Cláudia Menezes', 'Enfermeiro(a)', 'COREN-SP 000010 (fictício)', 'Responsável técnica', 'Funcionário', 1, '5x2_manha', 0],
  ['Ana Prado', 'Técnico(a) de enfermagem', 'COREN-SP 000011 (fictício)', null, 'Funcionário', 1, '12x36_dia', 0],
  ['Joana Lima', 'Técnico(a) de enfermagem', 'COREN-SP 000012 (fictício)', null, 'Funcionário', 1, '12x36_dia', 1],
  ['Rita Souza', 'Cuidador(a)', null, null, 'Funcionário', 1, '12x36_dia', 0],
  ['Paulo Nunes', 'Cuidador(a)', null, null, 'Funcionário', 1, '12x36_dia', 1],
  ['Sônia Araújo', 'Cuidador(a)', null, null, 'Funcionário', 1, '12x36_noite', 0],
  ['Marta Ribeiro', 'Cuidador(a)', null, null, 'Funcionário', 1, '12x36_noite', 1],
  ['Lúcia Campos', 'Cozinha', null, null, 'Funcionário', 1, '6x1_manha', 0],
  ['Teresa Gomes', 'Limpeza', null, null, 'Funcionário', 1, '6x1_tarde', 3],
  ['Fábio Martins', 'Fisioterapeuta', 'CREFITO 000020 (fictício)', 'Geriatria', 'Prestador de serviço', 0],
  ['Beatriz Costa', 'Nutricionista', 'CRN 000030 (fictício)', null, 'Prestador de serviço', 0],
  ['Irmã Gertrudes', 'Voluntário(a)', null, 'Culto e visitas', 'Voluntário', 0],
];

function gerarDemoEquipe(db, transacao) {
  const agora = new Date().toISOString();
  const hojeD = new Date();
  const ini = new Date(hojeD.getFullYear(), hojeD.getMonth() - 1, 1, 12); // do mês passado até o fim do próximo
  const fim = new Date(hojeD.getFullYear(), hojeD.getMonth() + 2, 0, 12);
  const insP = db.prepare(`INSERT INTO profissionais (nome, funcao, registro, especialidade, telefone, vinculo, na_escala, criado_em, criado_por, atualizado_em, atualizado_por, demo)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,1)`);
  const insE = db.prepare('INSERT INTO escala (profissional_id, data, codigo, criado_em, criado_por, demo) VALUES (?,?,?,?,?,1)');
  const ciclos = { '12x36_dia': ['D', 'F'], '12x36_noite': ['NN', 'F'], '6x1_manha': ['M', 'M', 'M', 'M', 'M', 'M', 'F'], '6x1_tarde': ['T', 'T', 'T', 'T', 'T', 'T', 'F'] };
  transacao(() => {
    EQUIPE_DEMO.forEach(([nome, funcao, registro, esp, vinculo, naEscala, padrao, desloc], i) => {
      const id = Number(insP.run(nome, funcao, registro, esp, `(11) 90000-${String(200 + i).padStart(4, '0')}`, vinculo, naEscala, agora, 'ana.demo', agora, 'ana.demo').lastInsertRowid);
      if (!padrao) return;
      let n = desloc;
      for (let d = new Date(ini); d <= fim; d.setDate(d.getDate() + 1), n++) {
        const iso = d.toLocaleDateString('sv-SE');
        let codigo = padrao === '5x2_manha' ? ([0, 6].includes(d.getDay()) ? 'F' : 'M') : ciclos[padrao][n % ciclos[padrao].length];
        if (nome === 'Rita Souza' && d.getDate() >= 10 && d.getDate() <= 12 && d.getMonth() === hojeD.getMonth()) codigo = 'AT';
        insE.run(id, iso, codigo, agora, 'ana.demo');
      }
    });
  });
}

// Vacinas fictícias: campanha da gripe deste ano (quase todos), Covid (alguns atrasados), pneumocócica, dT (alguns vencidos) e hepatite B em andamento
function gerarDemoVacinas(db, transacao) {
  const rs = db.prepare("SELECT id FROM residentes WHERE demo = 1 AND situacao IN ('no_lar','hospitalizado') ORDER BY id").all().map((r) => r.id);
  const hojeD = new Date().toLocaleDateString('sv-SE');
  const ano = hojeD >= `${new Date().getFullYear()}-04-20` ? new Date().getFullYear() : new Date().getFullYear() - 1; // última campanha que já aconteceu
  const dia = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toLocaleDateString('sv-SE'); };
  const ins = db.prepare(`INSERT INTO vacinas (residente_id, vacina, dose, data, lote, local, aplicador, proxima_dose, obs, criado_em, criado_por, atualizado_em, atualizado_por, demo)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,1)`);
  const agora = new Date().toISOString();
  const v = (rid, vacina, dose, data, local, proxima = null, obs = null) => ins.run(rid, vacina, dose, data, `DEMO${(rid * 37) % 900 + 100}`, local, 'Equipe da UBS (fictícia)', proxima, obs, agora, 'ana.demo', agora, 'ana.demo');
  transacao(() => {
    rs.forEach((rid, i) => {
      if (i % 6 !== 5) v(rid, 'Influenza (gripe)', 'Dose anual', `${ano}-04-${String(10 + (i % 3)).padStart(2, '0')}`, 'No lar — campanha', null, 'Campanha da gripe: a UBS vacinou no próprio lar');
      v(rid, 'Influenza (gripe)', 'Dose anual', `${ano - 1}-04-15`, 'No lar — campanha');
      v(rid, 'Covid-19', 'Reforço', dia(i % 4 === 0 ? -210 : -(100 + i * 4)), 'UBS Centro (fictícia)');
      if (i % 2 === 0) v(rid, 'Pneumocócica 23 (pneumonia)', 'Dose única', `${ano - 3}-08-20`, 'UBS Centro (fictícia)');
      v(rid, 'Dupla adulto dT (difteria e tétano)', 'Reforço', i % 5 === 0 ? `${ano - 11}-03-02` : `${ano - 4}-06-18`, 'UBS Centro (fictícia)');
      if (i % 4 === 1) v(rid, 'Hepatite B', '2ª dose', dia(-150), 'UBS Centro (fictícia)', dia(i === 1 ? -5 : 20), 'Falta a 3ª dose');
    });
  });
}

// Prescrições fictícias (índice do residente em RESIDENTES). Respeitam as alergias da demonstração (ex.: Dona Aurora não toma dipirona).
// [residente, remédio, dose, via, horários, se necessário?, condição, observação]
const PRESCRICOES_DEMO = [
  [0, 'Losartana 50 mg', '1 comprimido', 'Oral', '08:00', 0, null, null],
  [0, 'Paracetamol 750 mg', '1 comprimido', 'Oral', null, 1, 'Se dor ou febre acima de 37,8 °C (no máximo de 6 em 6 horas)', 'Alérgica a dipirona'],
  [1, 'Metformina 850 mg', '1 comprimido', 'Oral', '08:00,20:00', 0, null, 'Depois do café e do jantar'],
  [1, 'Insulina NPH', '10 UI', 'Subcutânea', '07:00,19:00', 0, null, 'Medir a glicemia antes e anotar no diário'],
  [2, 'Donepezila 10 mg', '1 comprimido', 'Oral', '20:00', 0, null, null],
  [2, 'Quetiapina 25 mg', '1 comprimido', 'Oral', '21:00', 0, null, 'Pode dar sonolência de manhã'],
  [3, 'Levotiroxina 50 mcg', '1 comprimido', 'Oral', '06:00', 0, null, 'Em jejum, 30 minutos antes do café'],
  [4, 'Levodopa + Benserazida 100/25 mg', '1 comprimido', 'Oral', '08:00,14:00,20:00', 0, null, null],
  [5, 'Losartana 50 mg', '1 comprimido (triturado)', 'Sonda', '08:00,20:00', 0, null, 'Lavar a sonda com 20 ml de água depois'],
  [5, 'Omeprazol 20 mg', '1 cápsula (aberta)', 'Sonda', '07:00', 0, null, null],
  [6, 'Timolol 0,5% colírio', '1 gota em cada olho', 'Ocular (colírio)', '08:00,20:00', 0, null, null],
  [6, 'Dipirona 500 mg', '1 comprimido', 'Oral', null, 1, 'Se dor ou febre acima de 37,8 °C', 'Alérgico a AAS: nunca dar AAS'],
  [7, 'Memantina 10 mg', '1 comprimido', 'Oral', '08:00,20:00', 0, null, null],
  [7, 'Carbonato de cálcio + vitamina D', '1 comprimido', 'Oral', '12:00', 0, null, 'Junto com o almoço'],
  [8, 'Anlodipino 5 mg', '1 comprimido', 'Oral', '08:00', 0, null, null],
  [9, 'Furosemida 40 mg', '1 comprimido', 'Oral', '08:00', 0, null, 'Pesar toda segunda-feira'],
  [9, 'Espironolactona 25 mg', '1 comprimido', 'Oral', '08:00', 0, null, null],
  [10, 'Salbutamol spray 100 mcg', '2 jatos', 'Inalatória', null, 1, 'Se falta de ar ou chiado', null],
  [11, 'Sertralina 50 mg', '1 comprimido', 'Oral', '08:00', 0, null, null],
  [12, 'Paracetamol 750 mg', '1 comprimido', 'Oral', '08:00,20:00', 0, null, 'Para as dores da artrite'],
  [13, 'Quetiapina 25 mg', '1 comprimido', 'Oral', '21:00', 0, null, null],
  [14, 'Metformina 500 mg', '1 comprimido', 'Oral', '12:00', 0, null, 'Junto com o almoço'],
];

function gerarDemoRemedios(db, transacao) {
  const ids = db.prepare('SELECT id, situacao FROM residentes WHERE demo = 1 ORDER BY id').all();
  const dia = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toLocaleDateString('sv-SE'); };
  const agora = new Date();
  const agoraMin = agora.getHours() * 60 + agora.getMinutes();
  const hhmm = (m) => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  const insP = db.prepare(`INSERT INTO prescricoes (residente_id, medicamento, dose, via, horarios, se_necessario, condicao, inicio, prescritor, obs,
    criado_em, criado_por, atualizado_em, atualizado_por, demo) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,1)`);
  const insA = db.prepare(`INSERT INTO administracoes (prescricao_id, data, horario, situacao, hora_real, motivo, criado_em, criado_por, demo) VALUES (?,?,?,?,?,?,?,?,1)`);
  const autores = ['ana.demo', 'joana.demo', 'rita.demo', 'paulo.demo'];
  const MEDICOS_P = ['Dra. Helena Siqueira', 'Dr. Mauro Tavares', 'Dra. Vânia Rocha'];
  let k = 0;
  transacao(() => {
    PRESCRICOES_DEMO.forEach(([ri, med, dose, via, horarios, sos, cond, obs], i) => {
      const r = ids[ri];
      const quando = `${dia(-30)}T10:00:00`;
      const pid = Number(insP.run(r.id, med, dose, via, horarios, sos, cond, dia(-30), MEDICOS_P[ri % 3], obs, quando, 'ana.demo', quando, 'ana.demo').lastInsertRowid);
      if (r.situacao !== 'no_lar') return;
      if (sos) { // um "se necessário" dado anteontem
        if (i % 2 === 0) insA.run(pid, dia(-2), null, 'dado', '15:20', 'Dor de cabeça', `${dia(-2)}T15:20:00`, 'rita.demo');
        return;
      }
      for (let n = 3; n >= 0; n--) {
        for (const h of horarios.split(',')) {
          const m = Number(h.slice(0, 2)) * 60 + Number(h.slice(3));
          if (n === 0 && m > agoraMin - 20) continue;               // hoje: só o que já passou
          if (n === 0 && m > agoraMin - 120 && (k++ % 4 === 0)) continue; // deixa alguns sem marcar (aparecem "atrasados")
          const recusou = (i * 7 + n * 3 + m) % 23 === 0;
          const real = hhmm(m + ((i + n) % 4) * 5);
          insA.run(pid, dia(-n), h, recusou ? 'recusado' : 'dado', real, recusou ? 'Recusou; ofereci de novo 30 min depois e recusou outra vez. Enfermagem avisada.' : null,
            `${dia(-n)}T${real}:00`, autores[(n + i) % 4]);
        }
      }
    });
    // Remédios ligados ao estoque (em comprimidos): dar o remédio dá baixa sozinho. A metformina está no fim (aviso "dá para 5 dias").
    const agoraIso = new Date().toISOString();
    const insProd = db.prepare(`INSERT INTO produtos (nome, categoria, unidade, estoque_minimo, local, criado_em, criado_por, atualizado_em, atualizado_por, demo) VALUES (?,'remedio','un',?, 'Armário de remédios', ?, 'ana.demo', ?, 'ana.demo', 1)`);
    const insMov = db.prepare(`INSERT INTO movimentos (produto_id, data, tipo, quantidade, validade, origem, obs, criado_em, criado_por, demo) VALUES (?,?,'entrada',?,?,?,?,?, 'ana.demo', 1)`);
    for (const [nome, remedio, qtd, min, origem] of [['Losartana 50 mg (comprimido)', 'Losartana 50 mg', 48, 20, 'SUS / Farmácia Popular'], ['Metformina 850 mg (comprimido)', 'Metformina 850 mg', 10, 14, 'Família do residente']]) {
      const prod = Number(insProd.run(nome, min, agoraIso, agoraIso).lastInsertRowid);
      insMov.run(prod, dia(-2), qtd, dia(320), origem, 'Estoque atual (demonstração)', agoraIso);
      db.prepare('UPDATE prescricoes SET produto_id = ?, qtd_por_dose = 1 WHERE medicamento = ? AND demo = 1').run(prod, remedio);
    }
  });
}

// Estoque fictício: [nome, categoria, unidade, mínimo, local, entrada inicial, validade em dias (null = sem), gasto por semana, doação recente]
const PRODUTOS = [
  ['Fralda geriátrica G', 'higiene', 'pct', 10, 'Almoxarifado', 40, null, 6, 12],
  ['Fralda geriátrica M', 'higiene', 'pct', 8, 'Almoxarifado', 24, null, 3, 0],
  ['Lenço umedecido', 'higiene', 'pct', 6, 'Almoxarifado', 34, 400, 2.5, 0],
  ['Creme de barreira (assaduras)', 'higiene', 'un', 3, 'Posto de enfermagem', 12, 300, 0.5, 0],
  ['Sabonete líquido 1 L', 'higiene', 'fr', 4, 'Almoxarifado', 14, 500, 1, 6],
  ['Luva de procedimento (M)', 'enfermagem', 'cx', 5, 'Posto de enfermagem', 24, 700, 1.5, 0],
  ['Gaze estéril', 'enfermagem', 'pct', 10, 'Posto de enfermagem', 30, 12, 2, 0],
  ['Soro fisiológico 250 ml', 'enfermagem', 'fr', 6, 'Posto de enfermagem', 20, 90, 1, 0],
  ['Álcool 70%', 'enfermagem', 'fr', 4, 'Posto de enfermagem', 10, 600, 1.5, 0],
  ['Dipirona 500 mg (comprimido)', 'remedio', 'cx', 3, 'Armário de remédios', 8, 25, 0.5, 0],
  ['Paracetamol 750 mg (comprimido)', 'remedio', 'cx', 3, 'Armário de remédios', 9, 200, 0.3, 0],
  ['Suplemento alimentar (lata)', 'alimento', 'lata', 4, 'Despensa', 18, 150, 1, 0],
  ['Espessante alimentar', 'alimento', 'lata', 2, 'Despensa', 9, 210, 0.5, 0],
  ['Leite em pó integral', 'alimento', 'lata', 6, 'Despensa', 12, -5, 1.5, 8],
  ['Café 500 g', 'alimento', 'pct', 5, 'Despensa', 26, 120, 1.5, 0],
  ['Papel higiênico (fardo)', 'limpeza', 'pct', 3, 'Almoxarifado', 12, null, 1, 4],
  ['Desinfetante 2 L', 'limpeza', 'fr', 3, 'Lavanderia', 13, 400, 0.8, 0],
];

function gerarDemoEstoque(db, transacao) {
  const dia = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toLocaleDateString('sv-SE'); };
  const agora = new Date().toISOString();
  const insP = db.prepare(`INSERT INTO produtos (nome, categoria, unidade, estoque_minimo, local, criado_em, criado_por, atualizado_em, atualizado_por, demo)
    VALUES (?,?,?,?,?,?,?,?,?,1)`);
  const insM = db.prepare(`INSERT INTO movimentos (produto_id, data, tipo, quantidade, validade, origem, obs, criado_em, criado_por, demo) VALUES (?,?,?,?,?,?,?,?,?,1)`);
  transacao(() => {
    for (const [nome, cat, un, min, local, inicial, validade, porSemana, doacao] of PRODUTOS) {
      const id = Number(insP.run(nome, cat, un, min, local, agora, 'ana.demo', agora, 'ana.demo').lastInsertRowid);
      insM.run(id, dia(-49), 'entrada', inicial, validade == null ? null : dia(validade), 'Compra', 'Compra do mês (fictícia)', `${dia(-49)}T09:00:00`, 'ana.demo');
      let saldo = inicial;
      for (let s = 6; s >= 0; s--) { // uma saída por semana
        const q = Math.min(saldo, Math.round(porSemana * (0.8 + ((s * 7 + nome.length) % 5) / 10) * 2) / 2);
        if (q <= 0) continue;
        saldo -= q;
        insM.run(id, dia(-s * 7 - 1), 'saida', q, null, null, null, `${dia(-s * 7 - 1)}T15:00:00`, ['ana.demo', 'joana.demo', 'rita.demo'][s % 3]);
      }
      if (doacao) insM.run(id, dia(-3), 'entrada', doacao, validade == null ? null : dia(validade + 60), 'Doação', 'Doação da comunidade (fictícia)', `${dia(-3)}T10:30:00`, 'joana.demo');
    }
  });
}

// Agenda fictícia: consultas, exames, vacinas, visitas e atividades do lar, de 2 semanas atrás até 3 semanas à frente.
function gerarDemoAgenda(db, transacao) {
  const vivos = db.prepare("SELECT id FROM residentes WHERE demo = 1 AND situacao = 'no_lar' ORDER BY id").all().map((r) => r.id);
  const dia = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toLocaleDateString('sv-SE'); };
  const ins = db.prepare(`INSERT INTO agenda (residente_id, data, hora, hora_fim, tipo, titulo, local, acompanhante, transporte, obs, situacao, resultado,
      criado_em, criado_por, atualizado_em, atualizado_por, demo) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1)`);
  const agora = new Date().toISOString();
  // [dias a partir de hoje, índice do residente (null = lar todo), hora, fim, tipo, título, local, acompanhante, transporte, obs, resultado se já passou]
  const itens = [
    [-12, 0, '09:00', null, 'consulta', 'Geriatra — consulta de rotina', 'UBS Centro (fictícia)', 'Cuidadora Ana', 'Carro do lar', 'Levar a lista de remédios atualizada.', 'Manter medicação. Retorno em 3 meses.'],
    [-9, 3, '07:30', null, 'exame', 'Exame de sangue (em jejum)', 'Laboratório Vida (fictício)', 'Filho', 'Família leva', 'Jejum de 8 horas.', 'Coletado. Resultado sai em 5 dias.'],
    [-5, null, '15:00', '16:00', 'atividade', 'Culto da semana', 'Sala de convivência', null, null, 'Ajudar quem quiser participar a chegar até a sala.', 'Participaram 11 residentes.'],
    [-3, 6, '14:00', '15:30', 'visita', 'Visita da família', 'Jardim', null, null, null, null],
    [0, 1, '10:30', null, 'consulta', 'Cardiologista', 'Hospital Regional (fictício) — 2º andar', 'Cuidadora Rita', 'Táxi (conveniado)', 'Levar exames anteriores e o cartão do convênio.', null],
    [0, null, '16:00', '17:00', 'atividade', 'Oficina de música', 'Sala de convivência', 'Voluntária Clara', null, null, null],
    [1, 8, '08:00', null, 'exame', 'Raio-X de tórax', 'Clínica Imagem (fictícia)', 'Cuidadora Joana', 'Carro do lar', null, null],
    [2, null, '15:00', '16:00', 'atividade', 'Culto da semana', 'Sala de convivência', null, null, null, null],
    [3, 2, '09:30', null, 'vacina', 'Vacina da gripe (campanha)', 'No lar — equipe da UBS', null, null, 'A UBS vacina todos os residentes no próprio lar.', null],
    [3, 4, '09:30', null, 'vacina', 'Vacina da gripe (campanha)', 'No lar — equipe da UBS', null, null, null, null],
    [3, 9, '09:30', null, 'vacina', 'Vacina da gripe (campanha)', 'No lar — equipe da UBS', null, null, null, null],
    [5, 5, '14:00', null, 'consulta', 'Oftalmologista — avaliação de catarata', 'Clínica dos Olhos (fictícia)', 'Sobrinha', 'Família leva', null, null],
    [7, null, '15:30', '17:30', 'atividade', 'Festa dos aniversariantes do mês', 'Refeitório', 'Toda a equipe da tarde', null, 'Bolo encomendado. Convidar as famílias.', null],
    [9, 0, '10:00', '11:00', 'visita', 'Visita da neta', 'Sala de visitas', null, null, null, null],
    [9, null, '15:00', '16:00', 'atividade', 'Culto da semana', 'Sala de convivência', null, null, null, null],
    [14, 7, '08:30', null, 'consulta', 'Retorno — dermatologista', 'UBS Centro (fictícia)', 'Cuidadora Ana', 'Carro do lar', null, null],
    [16, null, '15:00', '16:00', 'atividade', 'Culto da semana', 'Sala de convivência', null, null, null, null],
    [20, 10, '07:00', null, 'exame', 'Ultrassom de abdome', 'Hospital Regional (fictício)', 'Cuidadora Rita', 'Táxi (conveniado)', 'Jejum de 6 horas.', null],
  ];
  transacao(() => {
    for (const [n, ri, hora, fim, tipo, titulo, local, acomp, transp, obs, resultado] of itens) {
      const rid = ri == null ? null : vivos[ri % vivos.length];
      const passou = n < 0;
      ins.run(rid, dia(n), hora, fim, tipo, titulo, local, acomp, transp, obs, passou ? 'feito' : 'agendado', passou ? resultado : null,
        agora, 'ana.demo', agora, 'ana.demo');
    }
  });
}

// Uma semana de diário fictício: evolução de rotina, alguns eventos (queda, febre, recusa) e recados gerais.
const AUTORES = ['ana.demo', 'joana.demo', 'rita.demo', 'paulo.demo'];
const EVOLUCOES = [
  'Dormiu bem, acordou disposta(o). Tomou café da manhã completo. Banho de aspersão com auxílio.',
  'Participou da atividade de música na sala. Alimentou-se bem no almoço. Sem queixas.',
  'Tarde tranquila. Assistiu TV na sala de convivência. Aceitou lanche e líquidos.',
  'Noite calma, dormiu das 22h às 6h, levantou uma vez para ir ao banheiro com ajuda.',
  'Caminhou no jardim com andador e acompanhamento. Pele íntegra, troca de fralda às 14h.',
  'Um pouco sonolenta(o) pela manhã; melhorou após o almoço. Hidratação reforçada.',
];
const EVENTOS = [
  ['queda', 'atencao', 'Encontrada(o) sentada(o) no chão do quarto às {hora}, ao lado da cama. Sem ferimentos aparentes, sem dor. Ajudada(o) a levantar com duas cuidadoras. Enfermagem avisada; família comunicada por telefone.', true],
  ['saude', 'atencao', 'Acordou com temperatura de 37,9 °C e queixa de dor de garganta. Oferecido líquido; enfermagem avisada para avaliar. Reavaliar a febre de 4 em 4 horas.', false, { temperatura: 37.9, pa: '130x80', saturacao: 95 }],
  ['alimentacao', 'normal', 'Recusou o almoço (comeu só a sobremesa). Aceitou suplemento no lanche da tarde. Observar nas próximas refeições.', false],
  ['comportamento', 'normal', 'Mais agitada(o) ao entardecer, perguntando pela família. Acalmou com conversa e música. Sem necessidade de outras medidas.', false],
  ['visita', 'normal', 'Recebeu visita da filha das 15h às 16h30. Ficou contente; lancharam juntas no jardim.', false],
  ['saude', 'grave', 'Pressão alta (180x110) com dor de cabeça forte às {hora}. Enfermagem chamada na hora; médica de plantão avisada por telefone. Aguardando orientação.', false, { pa: '180x110', freq_cardiaca: 96 }],
  ['saude', 'normal', 'Glicemia antes do almoço: 142. Dentro do combinado com a médica.', false, { glicemia: 142 }],
];
const RECADOS = [
  'Chegou a entrega de fraldas (tamanho G). Guardado no almoxarifado.',
  'A lavanderia avisou que a máquina 2 está com defeito; usar só a máquina 1 até o conserto.',
  'Culto na quarta-feira às 15h na sala de convivência. Ajudar quem quiser participar a chegar até lá.',
];

function gerarDemoDiario(db, transacao) {
  const vivos = db.prepare("SELECT id, nome, situacao FROM residentes WHERE demo = 1 AND situacao IN ('no_lar','hospitalizado') ORDER BY id").all();
  const ins = db.prepare(`INSERT INTO ocorrencias (residente_id, data, hora, turno, tipo, gravidade, texto, pa, temperatura, glicemia, saturacao, freq_cardiaca,
      resolvida, resolvida_em, resolvida_por, resolucao, criado_em, criado_por, atualizado_em, atualizado_por, demo)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1)`);
  const turnoDe = (h) => { const n = +h.slice(0, 2); return n >= 6 && n < 13 ? 'manha' : n >= 13 && n < 19 ? 'tarde' : 'noite'; };
  const dia = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return d.toLocaleDateString('sv-SE'); };
  const agoraHora = new Date().toTimeString().slice(0, 5);
  let k = 0;
  transacao(() => {
    for (let n = 6; n >= 0; n--) {
      const data = dia(n);
      const horas = ['07:40', '10:15', '14:30', '17:50', '22:10'].filter((h) => n > 0 || h <= agoraHora);
      horas.forEach((hora, j) => {
        const r = vivos[(n * 5 + j * 3) % vivos.length];
        if (r.situacao === 'hospitalizado') return;
        const autor = AUTORES[(n + j) % AUTORES.length];
        const quando = `${data}T${hora}:00`;
        ins.run(r.id, data, hora, turnoDe(hora), 'evolucao', 'normal', EVOLUCOES[k++ % EVOLUCOES.length], null, null, null, null, null, 0, null, null, null, quando, autor, quando, autor);
      });
    }
    EVENTOS.forEach(([tipo, grav, texto, resolvida, vitais = {}], i) => {
      const n = [5, 0, 3, 2, 1, 0, 4][i];
      const hora = n === 0 ? ['06:10', '06:40'][i % 2] :['09:30', '16:10', '12:20', '18:40', '15:00', '11:05', '11:45'][i];
      const r = vivos.filter((x) => x.situacao === 'no_lar')[(i * 4 + 1) % vivos.filter((x) => x.situacao === 'no_lar').length];
      const data = dia(n), autor = AUTORES[i % AUTORES.length], quando = `${data}T${hora}:00`;
      ins.run(r.id, data, hora, turnoDe(hora), tipo, grav, texto.replace('{hora}', hora.replace(':', 'h')), vitais.pa || null, vitais.temperatura || null, vitais.glicemia || null,
        vitais.saturacao || null, vitais.freq_cardiaca || null, resolvida ? 1 : 0, resolvida ? `${data}T${hora}:30` : null, resolvida ? AUTORES[(i + 1) % AUTORES.length] : null,
        resolvida ? 'Avaliada pela enfermagem: sem lesões. Colocada barra de apoio ao lado da cama.' : null, quando, autor, quando, autor);
    });
    RECADOS.forEach((texto, i) => {
      const data = dia([1, 3, 5][i]), hora = ['13:10', '08:05', '19:30'][i], autor = AUTORES[(i + 2) % AUTORES.length], quando = `${data}T${hora}:00`;
      ins.run(null, data, hora, turnoDe(hora), 'recado', 'normal', texto, null, null, null, null, null, 0, null, null, null, quando, autor, quando, autor);
    });
  });
}

module.exports = { gerarDemo, completarDemo, MODULOS_DEMO };
