// Versão do sistema. Precisa ser IGUAL à constante VERSAO no começo de public/app.js:
// é assim que o app percebe que a janela preta está rodando uma versão antiga do servidor
// enquanto o navegador já carregou as telas novas. O teste (ferramentas/testar-telas.mjs) compara as duas.
'use strict';
module.exports = { VERSAO: '0.18.2' };
