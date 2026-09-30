// Banco de dados SQLite (embutido no Node) e estrutura inicial.
'use strict';
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { DatabaseSync } = require('node:sqlite');

// APP_DADOS existe para os testes: eles usam uma pasta temporária e nunca tocam no banco de verdade.
const PASTA_DADOS = process.env.APP_DADOS || path.join(__dirname, '..', '..', 'dados');
fs.mkdirSync(PASTA_DADOS, { recursive: true });

// Se alguém pediu para restaurar um backup, a troca do arquivo acontece agora, antes de abrir o banco.
const backup = require('./backup');
const restauracao = backup.aplicarPendente(PASTA_DADOS);

const db = new DatabaseSync(path.join(PASTA_DADOS, 'sistema.db'));
db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');

db.exec(`
CREATE TABLE IF NOT EXISTS usuarios (
  id INTEGER PRIMARY KEY, login TEXT UNIQUE NOT NULL, nome TEXT NOT NULL, funcao TEXT,
  perfil TEXT NOT NULL CHECK (perfil IN ('admin','usuario')),
  senha_hash TEXT NOT NULL, trocar_senha INTEGER NOT NULL DEFAULT 1, ativo INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS config (chave TEXT PRIMARY KEY, valor TEXT);
CREATE TABLE IF NOT EXISTS sessoes (hash TEXT PRIMARY KEY, uid INTEGER NOT NULL, expira INTEGER NOT NULL, bloqueada INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS log (id INTEGER PRIMARY KEY, quando TEXT NOT NULL, usuario TEXT, acao TEXT, detalhe TEXT);
-- LGPD: quem abriu a ficha de quem (dado de saúde é sensível)
CREATE TABLE IF NOT EXISTS acessos (id INTEGER PRIMARY KEY, quando TEXT NOT NULL, usuario TEXT, tipo TEXT, ref_id INTEGER);

CREATE TABLE IF NOT EXISTS residentes (
  id INTEGER PRIMARY KEY, nome TEXT NOT NULL, apelido TEXT, sexo TEXT, dt_nasc TEXT, cpf TEXT, rg TEXT, cartao_sus TEXT,
  estado_civil TEXT, religiao TEXT, naturalidade TEXT,
  dt_entrada TEXT, quarto TEXT, leito TEXT,
  situacao TEXT NOT NULL DEFAULT 'no_lar' CHECK (situacao IN ('no_lar','hospitalizado','saiu','faleceu')),
  situacao_desde TEXT, situacao_obs TEXT,
  grau_dependencia TEXT, mobilidade TEXT, tipo_sanguineo TEXT, alergias TEXT, diagnosticos TEXT, dieta TEXT,
  convenio TEXT, convenio_numero TEXT, medico TEXT, medico_tel TEXT, obs TEXT,
  criado_em TEXT, criado_por TEXT, atualizado_em TEXT, atualizado_por TEXT, demo INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS contatos (
  id INTEGER PRIMARY KEY, residente_id INTEGER NOT NULL REFERENCES residentes(id) ON DELETE CASCADE,
  nome TEXT NOT NULL, parentesco TEXT, telefone TEXT, telefone2 TEXT, email TEXT, endereco TEXT,
  responsavel INTEGER NOT NULL DEFAULT 0, emergencia INTEGER NOT NULL DEFAULT 0, obs TEXT,
  criado_em TEXT, criado_por TEXT, atualizado_em TEXT, atualizado_por TEXT, demo INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS contatos_residente ON contatos(residente_id);

-- Diário (ocorrências e evolução): cada anotação da equipe. residente_id vazio = recado geral da equipe.
-- Gravidade "atencao"/"grave" fica pendente (aparece no Início) até alguém marcar como resolvida.
CREATE TABLE IF NOT EXISTS ocorrencias (
  id INTEGER PRIMARY KEY, residente_id INTEGER REFERENCES residentes(id) ON DELETE CASCADE,
  data TEXT NOT NULL, hora TEXT NOT NULL, turno TEXT NOT NULL CHECK (turno IN ('manha','tarde','noite')),
  tipo TEXT NOT NULL, gravidade TEXT NOT NULL DEFAULT 'normal' CHECK (gravidade IN ('normal','atencao','grave')),
  texto TEXT NOT NULL,
  pa TEXT, temperatura REAL, glicemia INTEGER, saturacao INTEGER, freq_cardiaca INTEGER,
  resolvida INTEGER NOT NULL DEFAULT 0, resolvida_em TEXT, resolvida_por TEXT, resolucao TEXT,
  criado_em TEXT, criado_por TEXT, atualizado_em TEXT, atualizado_por TEXT, demo INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS ocorrencias_data ON ocorrencias(data, hora);
CREATE INDEX IF NOT EXISTS ocorrencias_residente ON ocorrencias(residente_id, data);

-- Agenda: consultas, exames, visitas, atividades… residente_id vazio = compromisso do lar (ex.: culto, festa).
CREATE TABLE IF NOT EXISTS agenda (
  id INTEGER PRIMARY KEY, residente_id INTEGER REFERENCES residentes(id) ON DELETE CASCADE,
  data TEXT NOT NULL, hora TEXT, hora_fim TEXT, tipo TEXT NOT NULL, titulo TEXT NOT NULL,
  local TEXT, acompanhante TEXT, transporte TEXT, obs TEXT,
  situacao TEXT NOT NULL DEFAULT 'agendado' CHECK (situacao IN ('agendado','feito','cancelado')), resultado TEXT,
  criado_em TEXT, criado_por TEXT, atualizado_em TEXT, atualizado_por TEXT, demo INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS agenda_data ON agenda(data, hora);
CREATE INDEX IF NOT EXISTS agenda_residente ON agenda(residente_id, data);

-- Estoque: cada item (fralda, remédio, alimento…) e suas movimentações. O saldo é a soma das movimentações
-- (entrada soma, saída tira, ajuste corrige depois de contar). A validade fica em cada entrada (lote).
CREATE TABLE IF NOT EXISTS produtos (
  id INTEGER PRIMARY KEY, nome TEXT NOT NULL, categoria TEXT NOT NULL, unidade TEXT NOT NULL DEFAULT 'un',
  estoque_minimo REAL, local TEXT, residente_id INTEGER REFERENCES residentes(id) ON DELETE SET NULL, obs TEXT,
  ativo INTEGER NOT NULL DEFAULT 1,
  criado_em TEXT, criado_por TEXT, atualizado_em TEXT, atualizado_por TEXT, demo INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS movimentos (
  id INTEGER PRIMARY KEY, produto_id INTEGER NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
  data TEXT NOT NULL, tipo TEXT NOT NULL CHECK (tipo IN ('entrada','saida','ajuste')), quantidade REAL NOT NULL,
  validade TEXT, origem TEXT, residente_id INTEGER REFERENCES residentes(id) ON DELETE SET NULL, obs TEXT,
  criado_em TEXT, criado_por TEXT, demo INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS movimentos_produto ON movimentos(produto_id, data);

-- Remédios: a prescrição (o que o médico passou: remédio, dose, via, horários) e cada vez que foi dado (a "folha").
-- horarios = "08:00,20:00". se_necessario = 1 para remédio "se precisar" (SOS), sem horário fixo.
CREATE TABLE IF NOT EXISTS prescricoes (
  id INTEGER PRIMARY KEY, residente_id INTEGER NOT NULL REFERENCES residentes(id) ON DELETE CASCADE,
  medicamento TEXT NOT NULL, dose TEXT NOT NULL, via TEXT NOT NULL, horarios TEXT, se_necessario INTEGER NOT NULL DEFAULT 0,
  condicao TEXT, inicio TEXT NOT NULL, fim TEXT, prescritor TEXT, obs TEXT,
  ativa INTEGER NOT NULL DEFAULT 1, suspensa_em TEXT, suspensa_por TEXT, motivo_suspensao TEXT,
  criado_em TEXT, criado_por TEXT, atualizado_em TEXT, atualizado_por TEXT, demo INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS prescricoes_residente ON prescricoes(residente_id, ativa);
CREATE TABLE IF NOT EXISTS administracoes (
  id INTEGER PRIMARY KEY, prescricao_id INTEGER NOT NULL REFERENCES prescricoes(id) ON DELETE CASCADE,
  data TEXT NOT NULL, horario TEXT, situacao TEXT NOT NULL CHECK (situacao IN ('dado','recusado','nao_dado')),
  hora_real TEXT, motivo TEXT, criado_em TEXT, criado_por TEXT, demo INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS administracoes_data ON administracoes(data, prescricao_id);
-- Um horário marcado só uma vez por dia (o "se necessário", sem horário, pode ser dado várias vezes)
CREATE UNIQUE INDEX IF NOT EXISTS administracoes_unica ON administracoes(prescricao_id, data, horario) WHERE horario IS NOT NULL;

-- Vacinas (cartão de vacina de cada residente). proxima_dose = quando tomar a próxima (se o posto informou).
CREATE TABLE IF NOT EXISTS vacinas (
  id INTEGER PRIMARY KEY, residente_id INTEGER NOT NULL REFERENCES residentes(id) ON DELETE CASCADE,
  vacina TEXT NOT NULL, dose TEXT, data TEXT NOT NULL, lote TEXT, local TEXT, aplicador TEXT, proxima_dose TEXT, obs TEXT,
  criado_em TEXT, criado_por TEXT, atualizado_em TEXT, atualizado_por TEXT, demo INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS vacinas_residente ON vacinas(residente_id, data);

-- Equipe: profissionais do lar e de fora (corpo clínico: médicos, enfermagem, fisioterapia…) e a escala de turnos.
CREATE TABLE IF NOT EXISTS profissionais (
  id INTEGER PRIMARY KEY, nome TEXT NOT NULL, funcao TEXT NOT NULL, registro TEXT, especialidade TEXT, telefone TEXT, email TEXT,
  vinculo TEXT NOT NULL DEFAULT 'Funcionário', na_escala INTEGER NOT NULL DEFAULT 1, ativo INTEGER NOT NULL DEFAULT 1, obs TEXT,
  criado_em TEXT, criado_por TEXT, atualizado_em TEXT, atualizado_por TEXT, demo INTEGER NOT NULL DEFAULT 0
);
-- Um código por pessoa por dia: M, T, N (turnos), D (12 h de dia), NN (12 h de noite), F (folga), FE (férias), AT (atestado)
CREATE TABLE IF NOT EXISTS escala (
  id INTEGER PRIMARY KEY, profissional_id INTEGER NOT NULL REFERENCES profissionais(id) ON DELETE CASCADE,
  data TEXT NOT NULL, codigo TEXT NOT NULL, obs TEXT, criado_em TEXT, criado_por TEXT, demo INTEGER NOT NULL DEFAULT 0,
  UNIQUE (profissional_id, data)
);
CREATE INDEX IF NOT EXISTS escala_data ON escala(data);

-- Patrimônio: camas, cadeiras de rodas, eletrodomésticos, extintores… onde estão, estado e manutenções.
CREATE TABLE IF NOT EXISTS patrimonio (
  id INTEGER PRIMARY KEY, nome TEXT NOT NULL, categoria TEXT NOT NULL, codigo TEXT, local TEXT,
  estado TEXT NOT NULL DEFAULT 'bom' CHECK (estado IN ('bom','regular','ruim','manutencao','baixado')),
  residente_id INTEGER REFERENCES residentes(id) ON DELETE SET NULL, data_aquisicao TEXT, origem TEXT, valor REAL,
  garantia_ate TEXT, proxima_revisao TEXT, obs TEXT,
  criado_em TEXT, criado_por TEXT, atualizado_em TEXT, atualizado_por TEXT, demo INTEGER NOT NULL DEFAULT 0
);
-- Sinais vitais (a "ronda": pressão, temperatura, glicemia, saturação, batimentos, peso e dor de 0 a 10)
CREATE TABLE IF NOT EXISTS sinais (
  id INTEGER PRIMARY KEY, residente_id INTEGER NOT NULL REFERENCES residentes(id) ON DELETE CASCADE,
  data TEXT NOT NULL, hora TEXT NOT NULL, pa_sist INTEGER, pa_diast INTEGER, temperatura REAL, glicemia INTEGER,
  saturacao INTEGER, fc INTEGER, peso REAL, dor INTEGER, obs TEXT, criado_em TEXT, criado_por TEXT, demo INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS sinais_residente ON sinais(residente_id, data);
CREATE TABLE IF NOT EXISTS manutencoes (
  id INTEGER PRIMARY KEY, patrimonio_id INTEGER NOT NULL REFERENCES patrimonio(id) ON DELETE CASCADE,
  data TEXT NOT NULL, tipo TEXT NOT NULL, descricao TEXT NOT NULL, custo REAL, responsavel TEXT,
  criado_em TEXT, criado_por TEXT, demo INTEGER NOT NULL DEFAULT 0
);
`);

// Colunas novas numa tabela que já existe: acrescente aqui (CREATE TABLE IF NOT EXISTS não mexe em tabela pronta).
// Exemplo: colunaNova('residentes', 'foto', 'TEXT');
function colunaNova(tabela, coluna, tipo) {
  const tem = db.prepare(`PRAGMA table_info(${tabela})`).all().some((c) => c.name === coluna);
  if (!tem) db.exec(`ALTER TABLE ${tabela} ADD COLUMN ${coluna} ${tipo}`);
}
// 0.11.0: remédio ligado a um item do estoque (dar o remédio dá baixa sozinho)
colunaNova('prescricoes', 'produto_id', 'INTEGER REFERENCES produtos(id) ON DELETE SET NULL');
colunaNova('prescricoes', 'qtd_por_dose', 'REAL');
colunaNova('administracoes', 'movimento_id', 'INTEGER');
// 0.12.0: compromissos que se repetem (mesma "serie") e tarefas da equipe
colunaNova('agenda', 'serie', 'TEXT');
db.exec(`CREATE TABLE IF NOT EXISTS tarefas (
  id INTEGER PRIMARY KEY, titulo TEXT NOT NULL, detalhe TEXT, responsavel TEXT, prazo TEXT,
  prioridade TEXT NOT NULL DEFAULT 'normal' CHECK (prioridade IN ('normal','alta')),
  repetir TEXT CHECK (repetir IN ('diaria','semanal','mensal')), residente_id INTEGER REFERENCES residentes(id) ON DELETE SET NULL,
  feita INTEGER NOT NULL DEFAULT 0, feita_em TEXT, feita_por TEXT,
  criado_em TEXT, criado_por TEXT, atualizado_em TEXT, atualizado_por TEXT, demo INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS tarefas_prazo ON tarefas(feita, prazo);
-- 0.13.0: escalas de avaliação (Katz, Braden, Morse). respostas = JSON com o valor escolhido em cada item.
CREATE TABLE IF NOT EXISTS avaliacoes (
  id INTEGER PRIMARY KEY, residente_id INTEGER NOT NULL REFERENCES residentes(id) ON DELETE CASCADE,
  escala TEXT NOT NULL, data TEXT NOT NULL, respostas TEXT NOT NULL, pontuacao INTEGER NOT NULL, classificacao TEXT NOT NULL, obs TEXT,
  criado_em TEXT, criado_por TEXT, demo INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS avaliacoes_residente ON avaliacoes(residente_id, escala, data);
-- 0.14.0: PIA (Plano Individual de Atenção). Cada revisão é uma linha nova (a mais recente vale). areas = JSON por área.
CREATE TABLE IF NOT EXISTS pias (
  id INTEGER PRIMARY KEY, residente_id INTEGER NOT NULL REFERENCES residentes(id) ON DELETE CASCADE,
  data TEXT NOT NULL, proxima_revisao TEXT, participantes TEXT, areas TEXT NOT NULL, obs TEXT,
  criado_em TEXT, criado_por TEXT, demo INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS pias_residente ON pias(residente_id, data);
-- 0.16.0: Financeiro (só a administração). Receitas e despesas; mensalidade = receita com residente e competência (AAAA-MM).
CREATE TABLE IF NOT EXISTS lancamentos (
  id INTEGER PRIMARY KEY, tipo TEXT NOT NULL CHECK (tipo IN ('receita','despesa')), categoria TEXT NOT NULL, descricao TEXT NOT NULL,
  valor REAL NOT NULL, vencimento TEXT NOT NULL, pago_em TEXT, valor_pago REAL, forma TEXT, pessoa TEXT,
  residente_id INTEGER REFERENCES residentes(id) ON DELETE SET NULL, competencia TEXT, obs TEXT,
  criado_em TEXT, criado_por TEXT, atualizado_em TEXT, atualizado_por TEXT, demo INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS lancamentos_venc ON lancamentos(vencimento);
CREATE UNIQUE INDEX IF NOT EXISTS lancamentos_mensalidade ON lancamentos(residente_id, competencia) WHERE competencia IS NOT NULL;`);
colunaNova('residentes', 'mensalidade', 'REAL');
colunaNova('residentes', 'dia_vencimento', 'INTEGER');

function hashSenha(senha) {
  const sal = crypto.randomBytes(16).toString('hex');
  return sal + ':' + crypto.scryptSync(senha, sal, 32).toString('hex');
}
function conferirSenha(senha, guardado) {
  const [sal, h] = String(guardado).split(':');
  if (!sal || !h) return false;
  const calc = crypto.scryptSync(senha, sal, 32);
  return crypto.timingSafeEqual(calc, Buffer.from(h, 'hex'));
}

const SENHA_INICIAL = 'trocar123';

const cfgPadrao = {
  nome_organizacao: 'Lar OASE',
  bloqueio_minutos: '15',           // bloqueia a tela após este tempo parado (0 = não bloquear)
  rede_liberada: '0',               // 1 = celulares e outros PCs da rede podem entrar (vale depois de reiniciar)
  backup_pasta: '',                 // vazio = <dados>\backups. Aponte para um pen drive ou o OneDrive.
  backup_horas: '6',                // de quantas em quantas horas o sistema copia sozinho
  backup_manter: '30',              // quantas cópias guardar (as mais velhas são apagadas)
  backup_avisar_dias: '2',          // avisa na tela se o último backup for mais velho que isso
  backup_senha: '',                 // se preenchida, o arquivo do backup sai cifrado (AES-256)
};

// Nunca sai do servidor para a tela (nem para o admin): só se diz se está definida ou não.
const CHAVES_SECRETAS = ['backup_senha'];

function inicializar() {
  if (!db.prepare('SELECT 1 FROM usuarios LIMIT 1').get()) {
    db.prepare('INSERT INTO usuarios (login, nome, funcao, perfil, senha_hash) VALUES (?, ?, ?, ?, ?)')
      .run('kevin', 'Kevin', 'Administração', 'admin', hashSenha(SENHA_INICIAL));
  }
  const insCfg = db.prepare('INSERT OR IGNORE INTO config (chave, valor) VALUES (?, ?)');
  for (const [k, v] of Object.entries(cfgPadrao)) insCfg.run(k, v);
}

function cfg() {
  return Object.fromEntries(db.prepare('SELECT chave, valor FROM config').all().map((r) => [r.chave, r.valor]));
}
function cfgPublica() {
  const c = cfg();
  for (const k of CHAVES_SECRETAS) { c[k + '_definida'] = !!c[k]; delete c[k]; }
  return c;
}
function gravarCfg(chave, valor) {
  db.prepare('INSERT INTO config (chave, valor) VALUES (?, ?) ON CONFLICT(chave) DO UPDATE SET valor = excluded.valor').run(chave, String(valor));
}

// Auditoria: tudo o que alguém altera passa por aqui (Configurações › Auditoria)
function registrar(usuario, acao, detalhe) {
  db.prepare('INSERT INTO log (quando, usuario, acao, detalhe) VALUES (?, ?, ?, ?)')
    .run(new Date().toISOString(), usuario, acao, typeof detalhe === 'string' ? detalhe : JSON.stringify(detalhe ?? ''));
}
function registrarAcesso(usuario, tipo, refId) {
  db.prepare('INSERT INTO acessos (quando, usuario, tipo, ref_id) VALUES (?, ?, ?, ?)').run(new Date().toISOString(), usuario, tipo, refId);
}

function transacao(fn) {
  db.exec('BEGIN');
  try { const r = fn(); db.exec('COMMIT'); return r; } catch (e) { db.exec('ROLLBACK'); throw e; }
}

module.exports = { db, inicializar, cfg, cfgPublica, gravarCfg, registrar, registrarAcesso, transacao, hashSenha, conferirSenha, SENHA_INICIAL, PASTA_DADOS, restauracao, CHAVES_SECRETAS };
