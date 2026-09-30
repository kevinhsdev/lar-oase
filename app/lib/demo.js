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
  gerarDemoDiario(db, transacao);
  gerarDemoAgenda(db, transacao);
  gerarDemoEstoque(db, transacao);
  gerarDemoRemedios(db, transacao);
  return RESIDENTES.length;
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

module.exports = { gerarDemo };
