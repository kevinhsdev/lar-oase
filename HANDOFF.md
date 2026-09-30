# HANDOFF — OASE - Lar (sistema do lar de idosos da OASE)

> Documento de passagem para continuar o projeto em outro computador ou em outro chat. Leia inteiro antes de mexer.

---

## 1. Quem, onde e por quê

- **Usuário:** Kevin, jovem aprendiz da secretaria do **Instituto Educacional Luterano (IEL)**, Ferraz de Vasconcelos/SP.
  Não é programador: respostas em pt-BR, simples, dizendo **o que mudou, para que serve e como testar**.
- **Pedido:** a chefe do Kevin pediu um sistema para o **Lar OASE** — um **lar de idosos** da OASE (Ordem Auxiliadora de
  Senhoras Evangélicas) — **parecido com o Gerifácil** (gerifacil.com.br: sistema pago, em nuvem, para ILPIs, com residentes,
  prontuário, medicação, estoque, agenda, escalas e financeiro).
- **O que se sabe (29–30/09/2026):** roda **num computador do próprio Lar** (ligado todo dia), para **~7 pessoas** (funções ainda
  não definidas). Hoje **tudo é feito à mão, sem registro**. O financeiro provavelmente fica com a chefe do Kevin.
  Relatórios exigidos: **Kevin vai perguntar** (§7.1).
- **Recomeço do zero (30/09/2026):** a primeira versão (0.1.0–0.2.1, de 29/09) foi apagada da pasta e o Kevin escolheu
  **começar um app novo do zero** em vez de restaurar da Lixeira. O código atual foi **todo reescrito** em 30/09; da
  Secretaria IEL (`..\secretaria-iel`) vieram só as peças de "motor": `lib/backup.js`, `lib/atualizacao.js`, `rotas/backup.js`,
  `rotas/atualizacao.js`, `public/qr.js`, as fontes e `ferramentas/instalar-node.ps1` (renomeados para o LAR).
- Nome: **OASE - Lar** (`NOME_APP` "OASE", `SUBTITULO_APP` "Lar" — pedido do Kevin em 30/09; antes era "LAR — Lar OASE"). Fica em `app/public/app.js` → `NOME_APP`/`SUBTITULO_APP`/`DESCRICAO_APP`, no `<title>`
  do `app/public/index.html` e no `title` do `Iniciar Sistema.bat`. **Logo (0.4.0):** o **símbolo da OASE** (torre, cruz e globo),
  **redesenhado em vetor** a partir de um print do site da OASE que o Kevin copiou (o print tinha fundo texturizado e ficaria borrado pequeno).
  Versão compacta de traço grosso em `MARCA_SVG` (app.js, cores pelo CSS `.logo-oase` / `--oase` vinho #8e1b2f sobre `--selo-fundo`)
  e em `public/icone.svg` (aba do navegador). Se vier o arquivo oficial da logo, dá para trocar mantendo os mesmos lugares.
  **No menu lateral** (pedido do Kevin): a logo é **PNG de fundo transparente**, sem o quadrado branco — `public/logo.png` (vinho, tema
  claro) e `public/logo-escuro.png` (vinho claro, tema escuro), trocadas pelo CSS `.selo-png`. Geradas por `node ferramentas\gerar-icone.mjs`.
  A tela de entrada continua com o símbolo sobre o azulejo branco (`MARCA_SVG`).
  Nome oficial: Ordem Auxiliadora **de** Senhoras Evangélicas.
- **Sobre a OASE** (texto que o Kevin trouxe, 30/09): é um setor de trabalho da **IECLB** (Igreja Evangélica de Confissão Luterana no
  Brasil) — mulheres que participam da comunidade em "comunhão, testemunho e serviço". Desde o começo (Rio Claro/SP, 1899; nome OASE
  desde 1941) cuida de doentes, idosos e necessitados, e mantém hospitais, maternidades e **ancionatos (lares de idosos)**. Por isso o
  tom do sistema é calmo e respeitoso (ex.: "Faleceu" em lilás discreto) e atividades como **culto** aparecem na demonstração.
- **Atalho na área de trabalho:** `OASE - Lar.lnk` (ícone do símbolo da OASE) → abre o `Iniciar Sistema.bat`. Para recriar:
  `node ferramentas\gerar-icone.mjs` (gera `app/public/icone.ico` a partir do `icone.svg`) e depois
  `powershell -ExecutionPolicy Bypass -File ferramentas\criar-atalho.ps1`.

## 2. Decisões já tomadas (não reabrir sem perguntar)

| Tema | Decisão |
|---|---|
| Plataforma | **App web local**: um PC é o servidor e os outros (e o celular) acessam pelo navegador, na rede interna. |
| Tecnologia | **Node.js portátil**, sem npm e sem dependências. **node:sqlite** embutido. **HTML/CSS/JS puro**. Funciona sem internet. |
| Usuários | Login por pessoa. Perfis `admin` (Configurações, excluir fichas) e `usuario` ("Equipe"). Senha inicial `trocar123`, troca obrigatória. |
| Visual | Feito com as skills **emil-design-eng** e **apple-design** (ver §5). Claro/escuro, fontes locais (Bricolage Grotesque, Onest, IBM Plex Mono). |
| LGPD | Dados reais **nunca** vão para o GitHub. Testes com a **demonstração fictícia**, em banco temporário. A demonstração **não tem CPF** e usa telefones `(11) 90000-00xx`. |
| Entrega | Um módulo por vez, cada um testado (`node ferramentas\testar-telas.mjs`) antes do próximo. |

## 3. O que já existe (versão 0.16.1)

- **Entrada** com usuário e senha (5 erros = espera 1 minuto), **troca obrigatória** da senha inicial (com barra de força),
  trocar senha pelo menu da conta.
- **Sessões que sobrevivem a reinício** (no banco, só o hash) e **faixa "sem conexão"** quando o servidor cai, com **rascunho das
  janelas** (o que foi digitado volta com "Recuperar").
- **Bloqueio de tela** depois de N minutos parado (padrão 15; Configurações › Geral) ou pelo menu da conta — tela de vidro fosco
  com relógio. O servidor também bloqueia (nada passa sem a senha, nem recarregando a página).
- **Menu**: trilho lateral com a marca e os grupos (no celular vira **barra de abas embaixo**), abas no alto quando o grupo tem
  várias telas, contador amarelo (hospitalizados), **busca rápida de residente** no topo (tecla `/`), **Ajuda** em cada tela
  (botão `?` ou tecla `?`), menu da conta (tema, modo compacto, bloquear, trocar senha, sair).
- **Início**: saudação, números (no lar, hospitalizados, aniversários em 30 dias, fichas) e cartões em **duas colunas equilibradas**; os **próximos aniversários** mostram só os 4 mais perto (+ "E mais N"; 0.16.1 — antes ocupava uma coluna inteira), hospitalizados
  agora, quem chegou por último. Avisa se a cópia de segurança está atrasada (só admin).
- **Residentes** (módulo 1):
  - Lista em **cartões** ou **lista** (escolha lembrada no navegador), busca (nome, apelido, quarto, familiar, CPF),
    filtros com marcador deslizante (Atuais, No lar, Hospitalizados, Histórico, Todos), telefone do responsável clicável,
    etiqueta vermelha de alergia, impressão da lista.
  - **Ficha** em estilo perfil: avatar com iniciais (cor fixa por pessoa), pílulas (idade, quarto/leito, tempo no lar, convênio,
    grau), **faixa vermelha de alergias**, caixas grandes de **Responsável** e **Emergência** com botão Ligar, Saúde (grau de
    dependência da **RDC 502/2021** da Anvisa, mobilidade, tipo sanguíneo, dieta, diagnósticos, médico), Dados pessoais,
    Observações, **Familiares e contatos** (um único responsável por residente; o 1º cadastrado já vem marcado),
    **Histórico da ficha** (quem fez o quê) e impressão da ficha.
  - **Situação** (no lar / hospitalizado / saiu / faleceu) num seletor colorido; mudar pede a data e o motivo. Quem sai ou
    falece continua com a ficha (filtro Histórico). **Excluir** só a administração (com aviso para preferir mudar a situação).
  - **LGPD:** tabela `acessos` anota quem abriu cada ficha.
- **Diário** (módulo 2, 0.3.0 — o "Diário de Equipe + evolução + alertas" do Gerifácil):
  - Linha do tempo **por dia e por turno** (Manhã 6h–12h59, Tarde 13h–18h59, Noite 19h–5h59 — **provisório**, confirmar os plantões),
    setas/calendário para outros dias, filtro por turno, busca, **impressão da folha do dia** (passagem de plantão).
  - Anotação: sobre quem (ou **recado geral da equipe**), tipo (evolução, queda, saúde, alimentação, comportamento, visita, recado,
    outro), **gravidade** (normal/atenção/grave), texto, dia/hora/turno e **sinais vitais opcionais** (PA, temperatura, glicemia,
    saturação, FC — o servidor recusa número impossível). Queda já vem como Atenção; Saúde abre os sinais vitais.
  - **Atenção/Grave ficam pendentes** (contador amarelo no menu, cartão "Precisa de atenção" no Início, faixa no Diário, tela
    `#/diario/atencao`) até alguém clicar **Resolver** (com "o que foi feito"). Dá para reabrir.
  - Editar: só quem escreveu ou a administração. Apagar: só a administração (o diário é histórico do cuidado). Tudo na auditoria.
  - Na **ficha do residente**: as 5 últimas anotações, botão Anotar e "Ver tudo" (`#/diario/residente-ID`).
  - Demonstração: uma semana de evoluções, uma queda resolvida, febre (atenção) e pressão alta (grave) pendentes, recados.
- **Agenda** (módulo 3, 0.4.0 — a "Agenda de atividades e tarefas" do Gerifácil):
  - **Semana em 7 colunas** (hoje em destaque; no celular vira lista só com os dias que têm algo) ou **Próximos 30 dias**; setas, calendário,
    legenda de cores por tipo (consulta azul, exame lilás, vacina verde-escuro, visita laranja, atividade verde), impressão da semana.
  - Compromisso: para quem (ou **todo o lar**: culto, festa, oficina), tipo, título (com sugestões por tipo), dia, hora/até (vazio = dia todo),
    local, **quem acompanha**, **transporte**, observações (jejum, levar exames…).
  - Clicar abre os detalhes: **Foi feito** (com o resultado/orientação), **Desmarcar** (com o motivo; fica no histórico), Editar, Voltar para agendado.
    Qualquer pessoa da equipe edita; apagar só quem criou ou a administração.
  - Na **ficha do residente**: "Próximos compromissos" + Agendar + "Ver tudo" (`#/agenda/residente-ID`). No **Início**: agenda de hoje e amanhã.
  - Demonstração: 18 compromissos de 2 semanas atrás até 3 semanas à frente (os passados já "feitos" com resultado).
  - **Não tem repetição automática** (ex.: culto toda quarta): hoje é preciso agendar cada um. Dá para fazer se a chefe quiser.
- **Estoque** (módulo 4, 0.5.0 — o "Controle de estoque e produtos" do Gerifácil):
  - Itens com categoria (higiene e fraldas, remédios, enfermagem, alimentos, limpeza, outros), unidade (pacote, caixa, frasco…),
    **estoque mínimo**, onde fica e, se for o caso, **item pessoal de um residente** (ex.: remédio que a família traz).
  - **Entrada** (quantidade, **de onde veio** — compra, doação, família, SUS —, validade), **Saída** (para quem, opcional) e **Contar**
    (diz quanto tem de verdade e o sistema corrige a diferença). Botões **− e +** grandes para a quantidade. Aceita vírgula (2,5).
  - Avisos: **Acabou**, **Acabando** (saldo no mínimo), **Vencido** e **Vence em N dias** (30 dias). Filtro "Atenção", contador no menu,
    cartão no Início. Página do item com saldo, validades por lote e todas as movimentações (desfazer: quem lançou no mesmo dia, ou admin).
  - Arquivar (some da lista, histórico fica); apagar de vez só a administração.
  - Demonstração: 17 itens, 7 semanas de uso, doações recentes, 5 avisos (acabou, acabando, vencido, 2 vencendo).
- **Remédios** (módulo 5, 0.6.0 — a "Prescrição médica" do Gerifácil). **Regras provisórias: validar com a enfermagem.**
  - **Prescrições** (`#/prescricoes`): residente, remédio + concentração, dose, **via** (oral, sonda, colírio, subcutânea…), **horários fixos**
    (botões dos horários comuns + "outros") ou **se necessário** (com a condição), início, fim (vazio = uso contínuo), médico, observação.
    **Suspender** (com motivo) / reativar; apagar só admin. Mudar remédio/dose/via/horário de prescrição **já usada** é recusado
    (suspender e criar outra — o histórico da folha fica certo). **Aviso de alergia** quando o nome bate com a alergia da ficha
    (`conflitoAlergia` no servidor e `alergiaRem` na tela; só ajuda, não substitui a conferência) — pede confirmação ao salvar.
  - **Folha do dia** (`#/medicacao`, `#/medicacao/AAAA-MM-DD`): cada remédio em cada horário, agrupado por horário, abre no turno de agora.
    **Dei** = um toque (grava quem e a hora). **Recusou / Não dei** pedem motivo. "Se necessário" = **Dar agora** com o porquê (pode várias vezes).
    Um horário só pode ser marcado **uma vez** (409 "já foi dado por Fulana" — evita dose dupla). Não marca mais de **2 h antes**.
    **Atrasado** = passou 1 h sem marcar (contador do menu, faixa, Início). Dia passado sem marca = "Sem registro".
    Desfazer: quem marcou (mesmo dia) ou admin. Só entra na folha quem está **no lar** (hospitalizado não).
  - Ficha do residente: "Remédios em uso". Início: "Remédios de hoje" (X de Y marcados, atrasados).
  - Demonstração: 22 prescrições (respeitam as alergias fictícias), 3 dias de folha marcada, alguns recusados e alguns atrasados hoje.
- **Vacinas** (0.7.0 — "Gestão de imunizações" do Gerifácil), aba do grupo **Saúde** (`#/vacinas`):
  painel de todos os residentes com a última dose das 5 vacinas principais (gripe, Covid, pneumonia, dT, hepatite B), números
  (campanha da gripe do ano, doses atrasadas, vencendo em 30 dias), **cartão de vacina** de cada um (`#/vacinas/residente-ID`, imprimível),
  **Campanha** (mesma vacina para vários; já marca quem não tomou no ano). Prazos: gripe 365 dias, Covid 180, dT 3650; as outras seguem
  a "próxima dose" anotada (`VACINAS` em rotas/vacinas.js — **conferir com o posto a cada campanha**). Na ficha e no Início.
- **Equipe** (0.8.0 — "Escala de turnos" + "Organização do corpo clínico" do Gerifácil), grupo novo com ícone de crachá:
  - **Profissionais** (`#/profissionais`): equipe do lar e de fora (médicos com CRM, COREN, CREFITO…), função, especialidade, vínculo
    (funcionário, voluntário, prestador, SUS/UBS), telefone, "aparece na escala", "ainda trabalha no lar". Só admin cadastra/edita.
    Os médicos viram sugestão no campo "Médico(a)" da prescrição.
  - **Escala** (`#/escala`, `#/escala/AAAA-MM`): grade do mês (pessoa × dia) com códigos M, T, N, D (12 h dia), NN (12 h noite), F, FE, AT
    (**provisórios** — `CODIGOS` em rotas/equipe.js). Admin clica no dia para trocar; **Preencher com padrão** (12x36 dia/noite, 6x1, 5x2).
    Linhas de baixo contam quem trabalha de dia e de noite (0 em vermelho = buraco na escala). Início: "No plantão hoje".
- **Patrimônio** (0.9.0 — "Inventário de itens da unidade" do Gerifácil), aba do grupo **Estoque** (`#/patrimonio`):
  itens por local (nome, categoria, nº de patrimônio, estado bom/regular/ruim/em manutenção/baixado, em uso por qual residente,
  origem, aquisição, valor, garantia, **próxima revisão**). Página do item (`#/patrimonio/item-ID`) com o histórico de manutenções
  (tipo, custo, quem fez) e **Registrar manutenção** (já muda estado e próxima revisão). Filtro "Atenção" = ruim, em manutenção ou
  revisão vencida/vencendo (30 dias). Apagar só admin; o normal é "Baixado". Valor no formato brasileiro (1.500,00).
- **Sinais vitais** (0.10.0), aba do grupo **Saúde** (`#/sinais`):
  - **Ronda do dia**: tabela com todos os residentes no lar (pressão 120x80, temperatura, glicemia, saturação, batimentos, dor 0–10);
    valor fora do normal fica vermelho enquanto digita; **Salvar a ronda** grava todos de uma vez; faixa no alto com quem ficou fora do normal.
  - **Gráficos** de cada residente (`#/sinais/residente-ID`, 7/30/90 dias): **um gráfico por medida** (nunca dois eixos), SVG puro
    (`graficoSinal`), linha 2px, pontos com anel (vermelho = fora do normal), faixa do normal ao fundo (menos na pressão), legenda na pressão,
    **dica ao passar o mouse/dedo**, e a vista **Tabela**. Junta os sinais anotados no **Diário**. Cores `--graf-1/--graf-2`
    **validadas** com o script da skill dataviz (claro e escuro). Faixas de normal **provisórias** (`MEDIDAS` em rotas/sinais.js).
  - Na ficha: última medida e "Ver gráficos".
- **Remédios ↔ Estoque** (0.11.0): a prescrição pode ligar a um item do estoque + "quanto sai por dose" (colunas `produto_id`,
  `qtd_por_dose`). Marcar **Dei** grava uma saída no estoque (`administracoes.movimento_id`); desfazer apaga a saída (devolve).
  Se o estoque estiver zerado, marca mesmo assim e avisa. O Estoque calcula o **consumo diário** pelas prescrições ativas e mostra
  **"Dá para N dias"** (menos de 7 dias = "Acabando"). Demonstração: Losartana e Metformina em comprimidos (a metformina no fim).
- **Agenda com repetição + Tarefas** (0.12.0): ao agendar, **Repetir** (todo dia, toda semana, a cada 2 semanas, todo mês) até uma data
  (máx. 1 ano/120 vezes; coluna `agenda.serie`); nos detalhes, **Parar a repetição** desmarca este e os próximos. **Tarefas** (aba da Agenda,
  `#/tarefas`, `#/tarefas/minhas`): título, detalhes, responsável (usuário ou equipe toda), prazo, urgente, repetição (ao concluir, cria a
  próxima), residente opcional; atrasadas no topo; círculo para concluir; Início mostra "Minhas tarefas de hoje".
- **Avaliações** (0.13.0), aba do grupo **Saúde** (`#/avaliacoes`): escalas **Katz** (independência, 0–6), **Braden** (risco de ferida,
  6–23; menor = pior) e **Morse** (risco de queda, 0–125). Perguntas em linguagem simples (`ESCALAS` em rotas/avaliacoes.js — **conferir com
  a enfermagem**); o servidor soma e classifica; a tela mostra a soma enquanto marca; reavaliação já vem com as respostas anteriores.
  Painel com a última de cada escala, "Reavaliar" depois de 90 dias, filtros "Fazer/reavaliar" e "Risco alto"; histórico por residente
  com ↑↓; resumo na ficha. Demonstração coerente com o grau de dependência.
- **PIA — Plano Individual de Atenção** (0.14.0), aba do grupo **Residentes** (`#/pia`, `#/pia/residente-ID`, versões `-vID`): 7 áreas
  (saúde, alimentação, mobilidade/quedas, pele/higiene, memória/comportamento, família/espiritualidade, lazer) com situação atual, metas,
  cuidados combinados e responsável; data, próxima revisão (180 dias), participantes. **A situação atual é sugerida** com o que o sistema
  sabe (diagnósticos, alergias, remédios, dieta, peso, Morse, Braden, Katz, família, religião). Cada revisão = versão nova (tabela `pias`).
  Painel com vencidos; impressão com espaço para assinaturas. Pedido pela RDC 502/2021 — **validar o modelo com a responsável técnica**.
- **Prontuário completo** (0.15.0, `#/prontuario/ID`, botão "Prontuário" na ficha): uma página que só lê e junta tudo — identificação,
  alergias, remédios em uso, últimas avaliações, **resumo dos sinais vitais** (média/menor/maior/avisos), PIA atual, consultas do período,
  vacinas e diário do período (30 dias, 90 dias ou 1 ano). Pensada para imprimir/levar a consultas (`public/prontuario.js`).
- **Financeiro** (0.16.0 — **só a administração**, no menu e no servidor), grupo com 3 abas + recibo:
  - **Resumo** (`#/financeiro[/AAAA-MM]`): entrou/saiu/saldo pela data do pagamento, a receber/a pagar, **atrasados**, vencendo em 7 dias,
    gráfico de barras de 6 meses (receitas × despesas, cores `--graf-1/2` validadas, dica ao passar o mouse) e **resultado por categoria** (DRE simples).
  - **Contas** (`#/lancamentos`): receitas e despesas (categorias fixas em `CATEGORIAS` de rotas/financeiro.js), valor em formato brasileiro,
    vencimento, **repetir por 3/6/12 meses**, Receber/Pagar (data, valor, forma), desfazer, filtros por tipo e situação, total do filtro.
  - **Mensalidades** (`#/mensalidades`): valor e dia de vencimento por residente (colunas `residentes.mensalidade/dia_vencimento`),
    **Gerar as mensalidades do mês** (uma por residente por mês — índice único `competencia`), Receber, Recibo.
  - **Recibo** (`#/recibo/ID`): nº, valor, **valor por extenso** (`porExtenso`), referente a, forma, data e assinatura — imprimível.
  - Boleto bancário e "IA" ficam de fora (precisam de banco/internet). Demonstração: 6 meses de um lar filantrópico (valores inventados).
- **Menu lateral com muitos grupos** (0.16.0): os itens ficam mais compactos e, se não couberem, a lista rola por dentro — o tema e a
  conta ficam sempre visíveis (o teste confere que o botão da conta cabe na tela).
- **Demonstração que se completa** (0.10.0): `MODULOS_DEMO` + `completarDemo()` em lib/demo.js. Ao abrir o sistema (e pelo botão
  "Completar a demonstração"), os módulos sem dados fictícios recebem os seus — para quem carregou a demonstração antes deles existirem.
  **Módulo novo: acrescente a linha dele em `MODULOS_DEMO`.**
- **Menu:** o grupo "Remédios" virou **Saúde** (abas: Remédios de hoje, Prescrições, Vacinas; contador = remédios atrasados).
- **Celular:** a barra de baixo mostra 4 grupos (Início, Residentes, Diário, **Saúde**) + **"Mais"** (Agenda, Estoque, Configurações).
- **Configurações** (só admin): **Geral** (nome, bloqueio, demonstração, sobre), **Usuários** (criar, editar função/perfil,
  desativar, redefinir senha; sugere o login a partir do nome; sempre sobra um admin), **Cópias de segurança** (automáticas a
  cada 6 h, pasta, quantas guardar, senha AES-256, lista, restaurar agendado + reinício), **Celular e rede** (liberar a rede +
  **QR Code**), **Atualizações** (pelo Git, com cópia antes) e **Auditoria** (filtro por pessoa/ação/residente).
- **Aviso de edição simultânea** (`salvarComVersao` + `conferirVersao`) e **aviso de versão** (telas e servidor diferentes).
- **Demonstração** fictícia: 18 residentes (14 no lar, 2 hospitalizados, 1 saiu, 1 faleceu) com 1 a 3 familiares cada.

## 4. Arquitetura

```
novo-sistema/
├─ Iniciar Sistema.bat        → baixa o Node (1ª vez) e sobe o servidor em http://localhost:3000 (reinicia sozinho com código 90). Só ASCII, CRLF.
├─ CLAUDE.md / HANDOFF.md / README.md / LEIA-ME.txt / PROMPT-PRIMEIRO-CHAT.md
├─ .gitignore                 → protege dados/, *.db, backups, planilhas, fotos e ferramentas/prints
├─ .claude/skills, .agents/   → skills do Claude (apple-design, emil-design-eng…)
├─ ferramentas/
│  ├─ instalar-node.ps1       → baixa o Node LTS portátil para node/ (UTF-8 com BOM)
│  ├─ gerar-icone.mjs         → gera app/public/icone.ico (16 a 256 px) a partir do icone.svg, pelo Edge escondido
│  ├─ criar-atalho.ps1        → cria o atalho "LAR" na área de trabalho (só ASCII: o PowerShell 5.1 lê .ps1 sem BOM como ANSI)
│  ├─ testar-telas.mjs        → TESTE: conferências + API + todas as telas no Edge escondido (computador, celular, escuro)
│  └─ prints/ (ignorado)      → fotos que o teste tira
├─ node/ (ignorado)           dados/ (ignorado: sistema.db e backups — dados reais, NUNCA no Git)
└─ app/
   ├─ server.js               → HTTP, sessões, segurança (CSRF: cabeçalho X-APP: 1; CSP), login, senha, bloqueio, Início,
   │                            admin (config, usuários, rede, demonstração, auditoria). Liga os módulos em "── Módulos ──".
   ├─ rotas/residentes.js     → Residentes e contatos (campos permitidos, CPF com dígito verificador, situação, excluir só admin)
   ├─ rotas/diario.js         → Diário (ocorrências): validação, sinais vitais, pendentes/resolver, quem edita e quem apaga
   ├─ rotas/agenda.js         → Agenda: validação (tipo, horas), próximos, feito/desmarcado, quem apaga
   ├─ rotas/estoque.js        → Estoque: itens, movimentos (entrada/saída/contagem), saldo e lotes na ordem do tempo, avisos
   ├─ rotas/remedios.js       → Remédios: prescrições, folha do dia (folha()), marcar/desfazer, dose dupla bloqueada, aviso de alergia
   ├─ rotas/backup.js         → cópias de segurança, restauração e reinício (POST /api/admin/reiniciar → código 90)
   ├─ rotas/atualizacao.js    → verificar e aplicar versão nova pelo Git
   ├─ lib/db.js               → tabelas (CREATE TABLE), colunaNova() para colunas novas, config padrão, usuário inicial (kevin)
   ├─ lib/backup.js           → VACUUM INTO, cifra AES-256-GCM (marca LARBK1), arquivos lar-AAAA-MM-DD_hh-mm-ss-motivo.db
   ├─ lib/atualizacao.js      → conversa com o Git; nada lança erro, tudo volta explicado
   ├─ lib/demo.js             → dados FICTÍCIOS
   ├─ lib/versao.js           → VERSAO (repetida em public/app.js)
   └─ public/
      ├─ index.html           → carrega os scripts (a ordem importa: app.js primeiro, ajuda.js por último)
      ├─ app.css              → TODO o visual (cores só nas variáveis do :root; escuro = :root[data-tema="escuro"])
      ├─ tema.js              → aplica claro/escuro antes de desenhar (evita piscar)
      ├─ app.js               → o "casco": utilitários, api, toast, modal (folha no celular), confirmar, menu flutuante,
      │                         segmentado, ícones, entrada/senha, GRUPOS, rotear, busca rápida, Início
      ├─ sistema.js           → bloqueio de tela, reiniciar, Configurações (todas as abas)
      ├─ residentes.js        → lista + ficha + formulários (modelo "lista → ficha com sub-lista", ROTA_PAI.residente)
      ├─ diario.js            → linha do tempo, formRegistro(), janelaResolver(), itemDiario()/ligarItensDiario() (usados na ficha);
      │                         também nomeDia() e somarDiasIso(), usados pela Agenda
      ├─ agenda.js            → semana/lista, formCompromisso(), abrirCompromisso(), itemCompromisso()/ligarCompromissos() (usados na ficha)
      ├─ estoque.js           → lista com saldo/avisos, página do item (item-ID), janelaMovimento() (− e +), formProduto()
      ├─ remedios.js          → folha do dia (TELAS.medicacao), prescrições (TELAS.prescricoes), formPrescricao(), receitaItem()/ligarReceitas()
      ├─ qr.js                → gerador de QR Code sem biblioteca
      ├─ ajuda.js             → textos da Ajuda de cada tela
      └─ icone.svg, fontes/
```

**Variáveis da janela preta** (úteis para testar): `APP_DADOS` (pasta do banco), `APP_PORTA` (porta, padrão 3000),
`APP_REDE=1` (libera a rede à força), `APP_RAIZ` (pasta do Git, para testar a atualização).

**Peças prontas no app.js para usar nos próximos módulos:** `api()`, `salvarComVersao()`, `botaoOcupado(botao, fn)`,
`toast(msg, erro)`, `modal(titulo, html, { rodape, onAbrir, tamanho: 'largo'|'estreito', sub })`, `confirmar(msg, botao, { perigo })`,
`abrirMenu(botao, html)`, `segmentado(opcoes, valor)` + `ligarSegmentado(el, aoMudar)`, `avatar(nome, 'p'|'g'|'xg')`,
`foneLink()`, `mascararFone()`, `mascararCpf()`, `vazio(icone, titulo, texto, botoes)`, `cascata(el)`, `dataBR()`, `dataExtenso()`,
`tempoDesde()`, `icone(nome)`. Em residentes.js: `ddRes()`/`ddResHtml()` (pares rótulo/valor), `datalist()`, `opcoesSelect()`.

## 5. Visual e movimento (skills emil-design-eng + apple-design)

Regras seguidas — manter nos próximos módulos:
- **Só `transform` e `opacity` animam.** Curvas fortes no `:root`: `--ease-out` (0.23, 1, 0.32, 1), `--ease-gaveta` (folha do celular).
  Nada de UI passa de ~300 ms; a **saída é mais rápida que a entrada** (janela: 240 ms entra, 150 ms sai).
- **Nada anima o que é feito pelo teclado** ou repetido o dia todo: a lista da busca rápida aparece seca; filtrar/buscar não tem cascata.
- **Botões "afundam"** ao apertar (`scale(0.97)` no `:active`); hover só em aparelhos com mouse (`@media (hover: hover)`).
- **Nada nasce do zero:** janelas entram de `scale(0.97)` + opacidade; menus nascem **do botão que os abriu** (`transform-origin`).
- **Toasts** entram e saem por baixo (mesmo caminho), pausam com o mouse em cima e quando a aba fica escondida.
- **Folha no celular:** a janela sobe de baixo; a alça segue o dedo 1:1, resiste para cima (elástico) e um "peteleco" rápido fecha.
- **Materiais:** topo e barra do celular em **vidro fosco** (`backdrop-filter`); a linha sob o topo só aparece quando o conteúdo passa por baixo.
  Bloqueio de tela = vidro grosso sobre o sistema.
- **Tipografia:** títulos com espaçamento negativo (`-0.028em` no h1), texto normal em 0; números com `tabular-nums`.
- **Cores com sentido:** verde-sálvia (marca), terracota (aniversários/demonstração), laranja (hospitalizado), cinza (saiu),
  lilás discreto (faleceu), vermelho só para alergia/perigo.
- **Acessibilidade:** `prefers-reduced-motion` tira os deslocamentos, `prefers-reduced-transparency` tira o vidro,
  `prefers-contrast: more` reforça bordas; foco visível; campos com 16px no celular (o iPhone não dá zoom).

## 6. Como criar um módulo novo (passo a passo)

Exemplo: "Ocorrências". Use **Residentes** como modelo.

1. **Banco** — em `app/lib/db.js`, acrescente no `db.exec(...)`:
   `CREATE TABLE IF NOT EXISTS ocorrencias (id INTEGER PRIMARY KEY, ..., criado_em TEXT, criado_por TEXT, atualizado_em TEXT, atualizado_por TEXT, demo INTEGER NOT NULL DEFAULT 0);`
   Coluna nova numa tabela que já existe? Use `colunaNova('tabela', 'coluna', 'TEXT')` logo abaixo, senão o banco de quem já usa não recebe.
2. **Servidor** — crie `app/rotas/ocorrencias.js` (copie a estrutura de `rotas/residentes.js`) e ligue em `app/server.js`
   na seção "── Módulos ──": `require('./rotas/ocorrencias')(ctx);`. Toda alteração chama `registrar(...)` e, se for de um residente,
   ponha `residente_id` como **primeira chave** do detalhe (`{ residente_id, nome, ... }`): é assim que aparece no Histórico da ficha.
   Campos vindos da tela: **só os da lista permitida**.
3. **Tela** — crie `app/public/ocorrencias.js` com `TELAS.ocorrencias = async (c, arg) => { ... }` e **nomes globais novos**
   (ex.: `SITUACOES_OCO`, `formOcorrencia`): dois arquivos com o mesmo nome global quebram o app inteiro.
4. **Menu** — em `app/public/app.js`, acrescente em `GRUPOS` (grupo novo com um ícone de `ICONES`, ou dentro de um grupo existente).
5. **Carregar** — em `app/public/index.html`, acrescente `<script src="ocorrencias.js"></script>` antes do `ajuda.js`.
6. **Ajuda** — em `app/public/ajuda.js`, acrescente `ocorrencias: { nome, serve, passos, dicas }`.
7. **Demonstração** — em `app/lib/demo.js`, crie dados fictícios (`demo = 1`) e apague-os no `DELETE /api/admin/demo` do server.js.
8. **Teste** — acrescente `['#/ocorrencias', 'ocorrencias']` na lista `TELAS` de `ferramentas/testar-telas.mjs` (e testes de API se houver regra nova).
9. **Versão** — suba em `app/lib/versao.js` **e** em `app/public/app.js` (iguais; o teste confere) e anote no §9.

## 7. Roteiro: o que falta

### 7.0 Módulos sugeridos (combinados com o Kevin)
Ordem proposta — **um por vez**, mostrando à chefe antes do próximo:
1. ~~**Residentes**~~ — feito na 0.2.0 (refeito do zero em 30/09).
2. ~~**Ocorrências (diário)**~~ — feito na 0.3.0 como **Diário**.
3. ~~**Remédios**~~ — feito na 0.6.0 (prescrições + folha do dia). **Falta validar as regras com a enfermagem do Lar.**
4. ~~**Agenda**~~ — feita na 0.4.0 (adiantada, porque não dependia das respostas da chefe).
5. ~~**Estoque**~~ — feito na 0.5.0.
6. ~~**Financeiro**~~ — feito na 0.16.0 (validar categorias e jeito de trabalhar com a chefe).
Fora do escopo (precisam de internet/empresa): certificado/assinatura digital, boleto bancário, inteligência artificial.

**O que o site do Gerifácil lista (conferido em 30/09/2026)** e onde isso cai aqui:
Administrativo: usuários e cargos (✔ Usuários), **escala de trabalho e diário de equipe** (✔ Diário; escala = futuro), dados da empresa (✔ Geral),
certificado digital (fora). Prontuário e cuidado: cadastro de hóspedes (✔ Residentes), **SAE/evolução** (✔ evolução no Diário),
**prescrição médica** (→ Remédios), **imunizações** (futuro: vacinas por residente), prontuário eletrônico (✔ ficha + diário),
alertas (✔ pendentes do Diário). Financeiro: contas a pagar/receber, recibos, fluxo de caixa, relatórios, DRE (→ Financeiro; boleto e IA fora).
Operacional: estoque e produtos (→ Estoque), inventário/patrimônio (futuro), agenda (→ Agenda), corpo clínico (futuro: cadastro de
profissionais), escalas de turno (futuro). Também: "relatórios automáticos para auditorias e fiscalizações" (esperando a chefe dizer quais).

### 7.1 Levantar com a chefe (antes de programar o próximo módulo)
**A lista completa e atualizada de perguntas está em `PERGUNTAS-PARA-A-CHEFE.md`** (na raiz; o Kevin anota as respostas lá). A lista abaixo é o histórico.
**Já respondido (29/09):** lar de idosos; PC do Lar ligado todo dia; ~7 usuários; sem prioridade entre módulos; sem ficha de
papel de base; financeiro provavelmente com a chefe; nome LAR.
**Ainda falta:**
1. **Quais relatórios/documentos** precisam sair (tela, impressão, planilha)? A **Vigilância Sanitária** exige algum?
2. **Como os remédios são dados e anotados hoje** e quem cuida disso (enfermagem? cuidadoras?).
3. **Quem pode ver os dados de saúde** (a cozinha vê só dieta e alergia? a enfermagem vê tudo?).
4. **Funções das ~7 pessoas** (define os perfis de acesso além de admin/equipe).
5. ~~**Logo**~~ — o Kevin trouxe o símbolo da OASE (0.4.0). Se houver o arquivo oficial (em boa qualidade), trocar.
6. **Qual módulo agora** (Residentes, Diário e Agenda prontos; sugestão: Remédios, depois de responder o item 2).
7. Algum campo da ficha do residente que falta ou sobra (mostrar a ficha impressa para ela).
8. **Como são os turnos/plantões** do Lar (ex.: 12x36 das 7h às 19h?). Hoje o Diário usa Manhã/Tarde/Noite provisórios.
9. Quem pode **editar e apagar** anotações do diário (hoje: edita quem escreveu; apaga só a administração).
10. Os sinais vitais no diário bastam, ou a enfermagem quer uma tela própria com gráfico?
11. A agenda precisa de **compromisso que se repete** (culto toda quarta, fisioterapia 2x por semana)?

## 8. Como rodar e testar

1. Duplo clique em **`Iniciar Sistema.bat`** (na 1ª vez baixa o Node sozinho — precisa de internet só nessa vez) e abra http://localhost:3000.
2. Entre como **`kevin`** com a senha **`trocar123`** e crie uma senha sua.
3. **Configurações › Geral › Carregar a demonstração** para ver o sistema com dados fictícios.
4. **Configurações › Cópias de segurança**: aponte a pasta para um pen drive ou o OneDrive antes de usar com dado real.

**Teste automático** (rede de proteção): na pasta do projeto, `node ferramentas\testar-telas.mjs` (qualquer Node 22+; usa o Edge
escondido). Usa banco temporário e porta 3998, testa as regras da API (senha, CSRF, CPF, responsável único, perfis, conflito de
edição, demonstração, cópia), abre todas as telas (computador, celular 390 px e modo escuro), faz as interações principais
(cadastrar, familiar, situação, ajuda, busca, bloqueio) e tira fotos em `ferramentas\prints`. **0.16.1: 249 ok, 0 falhas.**

**GitHub:** repositório **privado** `https://github.com/kevinhsdev/lar-oase` (criado em 30/09/2026, ramo `main`, primeiro envio = 0.6.0).
O botão Configurações › Atualizações busca as versões novas dele. Para mandar uma entrega nova (só quando o Kevin pedir):
`git status` (**conferir**: não pode aparecer `dados/`, `.db`, planilhas, fotos), `git add -A`, `git commit` (mensagem em português) e `git push`.
O `.gitattributes` garante CRLF no `.bat`/`.ps1`. Não há GitHub CLI (`gh`) no PC do Kevin: o repositório foi criado pela API do
GitHub usando o login que o Git Credential Manager já guardava. Para instalar o sistema no PC do Lar: `git clone` desse endereço
(pede o login do GitHub uma vez) e depois o atalho (`ferramentas\criar-atalho.ps1`).

### Armadilhas
- **Barra de baixo do celular:** com mais de 5 grupos, ela mostra os 4 primeiros e um botão **"Mais"** com o resto
  (`desenharNavegacao`, classes `so-trilho`/`mais-grupos`). A **ordem em `GRUPOS`** decide quem fica visível no celular.
- **Estoque — conta dos lotes:** o saldo e a validade seguem a **ordem do tempo** (`calcular` em rotas/estoque.js): cada saída
  gasta só o que já existia naquele dia, primeiro o que vence antes. (Um primeiro jeito, sem a ordem do tempo, marcava vencido errado — o teste pegou.)
- **Scripts do navegador dividem o escopo global**: nome repetido de `const`/`function` quebra tudo (o teste confere).
- **CSP:** nada de `onclick="..."` no HTML nem `<script>` solto — ligue eventos pelo JS (o teste confere).
- A tela é montada numa `div` nova e entra inteira no `#conteudo` (`rotear`): eventos ligados em `c` continuam valendo.
- `sistema.js` usa `ddRes`/`datalist` de `residentes.js` (carregado depois): funciona porque só são chamados ao abrir a tela.
- Edge escondido segue o tema do Windows: o teste força o claro nas telas principais e testa o escuro à parte.
- O `.bat` precisa de fim de linha **CRLF** e só ASCII; o `.ps1` com acento precisa de UTF-8 **com BOM**.
- No Bash do Claude Code não use heredoc/`node -e` com texto grande para editar arquivo: use a ferramenta de edição.

## 9. Histórico de versões
| Versão | Data | O que mudou |
|---|---|---|
| 0.1.0–0.2.1 | 29/09/2026 | Primeira tentativa (base tirada da Secretaria IEL + Residentes). **Apagada** da pasta em 29/09 à noite; o Kevin preferiu recomeçar. |
| 0.2.0 | 30/09/2026 | **Recomeço do zero.** Base nova (entrada, senha, sessões, bloqueio, menu com trilho/abas/barra no celular, busca rápida, ajuda, Configurações completas, cópias, rede/QR, atualização, auditoria) + módulo **Residentes** (lista em cartões/lista, filtros, ficha perfil, alergias, responsável/emergência, familiares, situação com data, histórico, impressão, LGPD de acesso). Visual novo com as skills emil-design-eng + apple-design. Teste automático refeito: **65 ok**. |
| 0.3.0 | 30/09/2026 | Módulo **Diário** (ocorrências + evolução + alertas, como no Gerifácil): linha do tempo por turno, tipos, gravidade, sinais vitais, pendentes com Resolver, recado geral, impressão da folha do dia, diário na ficha do residente, cartão "Precisa de atenção" no Início, contador no menu, demonstração de uma semana. Teste: **89 ok**. |
| 0.4.0 | 30/09/2026 | **Logo da OASE** (símbolo redesenhado em vetor a partir do print que o Kevin copiou; menu, entrada e aba do navegador) e nome oficial "Ordem Auxiliadora de Senhoras Evangélicas". Módulo **Agenda**: semana em colunas ou próximos 30 dias, cores por tipo, compromisso de residente ou do lar todo, quem acompanha/transporte, Foi feito (com resultado)/Desmarcar, próximos compromissos na ficha, agenda de hoje e amanhã no Início, demonstração. Teste: **109 ok**. |
| 0.5.0 | 30/09/2026 | Nome do sistema trocado para **OASE - Lar** (menu, entrada, abas do navegador, janela preta, atalho `OASE - Lar` na área de trabalho). Módulo **Estoque**: itens por categoria, entrada (compra/doação/família/SUS, validade), saída, contagem, estoque mínimo, avisos de acabando/vencendo, página do item com lotes e movimentações, item pessoal de residente, demonstração. No celular, botão **"Mais"** na barra de baixo. Teste: **131 ok**. |
| 0.6.0 | 30/09/2026 | Módulo **Remédios**: prescrições (dose, via, horários ou "se necessário", suspender), folha do dia com "Dei" em um toque, recusou/não dei com motivo, dose dupla bloqueada, atrasados, aviso de alergia, remédios em uso na ficha, cartão no Início. Menu do celular: Remédios entre os 4 primeiros. Abas do topo descem para uma linha própria no celular. Teste: **158 ok**. |
| 0.7.0 | 30/09/2026 | **Vacinas** (cartão de vacina, painel com a última dose das vacinas principais, campanha para vários, avisos de dose atrasada). Grupo "Remédios" virou **Saúde**. |
| 0.8.0 | 30/09/2026 | **Equipe**: Profissionais (corpo clínico e equipe) e **Escala** do mês (grade, códigos de turno, preencher com padrão 12x36/6x1/5x2, contagem de dia/noite, "no plantão hoje" no Início). Médicos viram sugestão na prescrição. |
| 0.9.0 | 30/09/2026 | **Patrimônio** (inventário por local, estado, em uso por, revisões com aviso, histórico de manutenções). |
| 0.10.0 | 30/09/2026 | **Sinais vitais** (ronda do dia para todos os residentes, avisos de fora do normal, gráficos por residente com dica e tabela, junta o Diário). **Demonstração que se completa** sozinha ao abrir (e botão "Completar a demonstração"). |
| 0.11.0 | 30/09/2026 | **Remédios dão baixa no Estoque** (prescrição ligada a um item; "Dei" tira do estoque, desfazer devolve) e "dá para N dias" no Estoque. |
| 0.12.0 | 30/09/2026 | **Agenda com repetição** (todo dia/semana/quinzena/mês, parar a repetição) e **Tarefas** da equipe (responsável, prazo, urgente, repetição). |
| 0.13.0 | 30/09/2026 | **Avaliações** Katz, Braden e Morse (questionário que soma ao vivo, painel, reavaliar a cada 90 dias, histórico). |
| 0.14.0 | 30/09/2026 | **PIA — Plano Individual de Atenção** (7 áreas, situação sugerida pelo sistema, versões, impressão). |
| 0.15.0 | 30/09/2026 | **Prontuário completo** por residente (tudo numa página, por período, para imprimir). |
| 0.16.0 | 30/09/2026 | **Financeiro** (resumo com gráfico e resultado por categoria, contas a pagar/receber, mensalidades, recibo com valor por extenso). Menu lateral que cabe com muitos grupos. Teste: **249 ok**. |
| 0.16.1 | 30/09/2026 | Início: "Próximos aniversários" compacto (só os 4 mais perto) e cartões em duas colunas equilibradas. Arquivo **PERGUNTAS-PARA-A-CHEFE.md** com tudo o que falta validar. Teste: **249 ok**. |
