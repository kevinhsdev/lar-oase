# Instruções para o Claude neste projeto

Este arquivo é lido automaticamente pelo Claude Code em todo chat aberto nesta pasta.
O contexto completo (o que é o sistema, arquitetura, como criar módulos, roteiro) está no **`HANDOFF.md`** — leia inteiro antes de mexer.

## Quem é o usuário
- **Kevin**, jovem aprendiz da secretaria do **Instituto Educacional Luterano (IEL)**, em Ferraz de Vasconcelos/SP (escola da OASE).
  Trabalha à tarde (13h–19h) e não vai às sextas.
- **Não é programador.** Responder **sempre em português (pt-BR)**, com linguagem simples, sem jargão.
  Ao entregar algo, dizer: **o que mudou, para que serve e como testar**.
- Objetivo deste projeto: a chefe do Kevin pediu **um sistema parecido com um sistema da sede**. O que exatamente ele faz
  ainda está sendo levantado — ver `HANDOFF.md` §7 (perguntas para a chefe). Não inventar requisitos: perguntar.

## Decisões já tomadas (não reabrir sem perguntar)
- **App web local**: um PC é o servidor e os outros acessam pelo navegador (celular também, pelo QR Code em Configurações).
- **Node.js portátil, sem npm e sem dependências externas.** Banco **`node:sqlite`** (embutido). Front-end em **HTML/CSS/JS puro**.
  Funciona **sem internet**. Nada de React, Vue, bibliotecas de CDN ou nuvem.
- Login por pessoa, perfis `admin` e `usuario`; senha inicial `trocar123`, troca obrigatória no 1º acesso.

## Regras de ouro
1. **LGPD:** nunca mandar ao GitHub dados reais (pasta `dados/`, planilhas, fotos, backups). Testes só com a **demonstração
   fictícia** (`lib/demo.js`), num **banco temporário** (`APP_DADOS=<pasta temporária>`), apagado no fim. Antes de todo commit, olhar o `git status`.
2. **Não quebrar o que funciona.** Antes de entregar: `node --check` em todo `.js` mexido e **`node ferramentas\testar-telas.mjs`**
   (sobe servidor de teste, abre todas as telas no Edge escondido, acusa erro de JavaScript). Tela nova entra na lista `TELAS` desse teste.
3. **Versão nos DOIS lugares:** `app/lib/versao.js` e a constante `VERSAO` em `app/public/app.js`. Subir a cada entrega.
4. **Commit e push só quando o Kevin pedir.** Mensagem de commit em português.
5. **Atualizar o `HANDOFF.md`** ao fim de cada entrega (o que foi feito, decisões, armadilhas).
6. O PC do Kevin tem **pouca memória livre (~1 GB)**: rodar um servidor/teste de cada vez e sempre desligar no fim.
   Se ele pedir para não abrir servidor, não abrir.

## Convenções do código
- Tudo em **português** (funções, variáveis, mensagens, comentários explicando o *porquê*).
- Servidor: rotas em `app/rotas/<modulo>.js` recebendo `ctx` (modelo: `rotas/registros.js`). Toda alteração chama
  `registrar(usuario, acao, detalhe)` (auditoria). Colunas vindas do navegador passam por uma **lista de permitidas**.
- Front-end: `TELAS.<rota> = async (c, arg) => { ... }`, rota por hash `#/rota/arg`. Tela nova também entra em `GRUPOS`
  (app.js), no `index.html` e na `AJUDA` (ajuda.js). Modelo: `public/registros.js`.
- **Todos os scripts do navegador dividem o mesmo escopo global**: nunca repetir o nome de uma `const`/`function` entre arquivos
  (quebra o app inteiro). Conferir com: `grep -ohE "^(const|let|function|async function) +\w+" app/public/*.js | awk '{print $NF}' | sort | uniq -d`.
- Sempre escapar HTML com `esc()`. Não usar `alert`/`confirm` do navegador: usar `toast()`, `modal()` e `confirmar()`.
- **Cores só pelas variáveis do `:root` em `app.css`** (o modo escuro troca os valores). Nunca cor fixa no JS.
- Edição de registro compartilhado: `salvarComVersao()` na tela + `conferirVersao()` no servidor (avisa se outra pessoa salvou antes).

## Armadilhas do ambiente (Windows + Claude Code)
- PowerShell 5.1: não existe `&&` (use `;`). Scripts `.ps1` com acento: UTF-8 **com BOM**.
- No Bash do Claude Code, contrabarras e aspas somem/quebram dentro de heredoc e de `node -e`: para criar ou alterar arquivo,
  use a ferramenta de escrever arquivo (Write/Edit), não `cat <<EOF` nem `node -e` com texto grande.
- Em `String.replace` feito por script, **`$` no texto novo tem significado especial** — use `texto.replace(a, () => b)`.
- `.bat`: use `set "VAR=1"` (sem espaço sobrando) e mantenha só caracteres ASCII.

## Skills disponíveis (pasta `.claude/skills`)
`apple-design` e `emil-design-eng` (acabamento visual e animações — o Kevin gosta de usar), além de `animate`,
`improve-animations`, `review-animations`, `find-animation-opportunities`, `animation-vocabulary`, `prototype`, `pick-ui-library`
e outras. Os skills de React/Expo/Swift não se aplicam a este projeto (aqui é HTML/JS puro).
