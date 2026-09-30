// Aplica o tema salvo antes de a tela aparecer (evita a "piscada" branca no modo escuro).
// Fica em arquivo separado, e não dentro do HTML, porque o sistema proíbe scripts soltos na página (segurança).
(function () {
  'use strict';
  try {
    var t = localStorage.getItem('lar-tema');
    if (t !== 'claro' && t !== 'escuro') t = matchMedia('(prefers-color-scheme: dark)').matches ? 'escuro' : 'claro';
    document.documentElement.dataset.tema = t;
    if (localStorage.getItem('lar-compacto') === '1') document.documentElement.dataset.densidade = 'compacta';
  } catch (e) { document.documentElement.dataset.tema = 'claro'; }
})();
