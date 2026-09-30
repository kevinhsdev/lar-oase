# LAR — sistema do Lar OASE

Sistema do **Lar OASE** (lar de idosos da Ordem Auxiliadora de Senhoras Evangélicas), inspirado no Gerifácil (gerifacil.com.br).
Feito do zero em HTML/CSS/JS puro + Node.js portátil, com o mesmo jeito de trabalhar da Secretaria IEL (SEK).

- **Já vem pronto:** entrada com senha, bloqueio de tela, usuários e perfis, cópias de segurança automáticas e cifradas,
  atualização por botão, acesso pelo celular com QR Code, auditoria, modo claro/escuro, ajuda em cada tela
  e o módulo **Residentes** (ficha de cada idoso, saúde, alergias, familiares, responsável e contato de emergência).
- **Roda sem internet**, num computador do lar, com dois cliques. Sem instalar programa e sem mensalidade.

## Como usar
1. Dê dois cliques em `Iniciar Sistema.bat`. Na primeira vez ele baixa o Node.js portátil sozinho.
2. Acesse http://localhost:3000 e entre como `kevin`, senha `trocar123` (troca obrigatória no 1º acesso).
3. Para ver com dados fictícios: **Configurações › Geral › Carregar a demonstração**.

## Teste automático
Na pasta do projeto: `node ferramentas\testar-telas.mjs` (usa banco temporário e o Edge escondido; fotos em `ferramentas\prints`).

Leia o **[HANDOFF.md](HANDOFF.md)** (contexto, arquitetura, visual e como criar módulos) e o **[PROMPT-PRIMEIRO-CHAT.md](PROMPT-PRIMEIRO-CHAT.md)** para começar com o Claude.

> **LGPD:** o banco (`dados/`), planilhas, fotos e backups **nunca** entram no repositório (o `.gitignore` já protege).
