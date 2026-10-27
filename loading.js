(function () {
  function buildOverlay() {
    var existente = document.querySelector('.loading-overlay');
    if (existente) return existente;

    var overlay = document.createElement('div');
    overlay.className = 'loading-overlay';
    overlay.innerHTML =
      '<div class="loading-box">' +
      '  <div class="loading-psi">' +
      '    <span class="loading-psi-base">\u03A8</span>' +
      '    <span class="loading-psi-fill">\u03A8</span>' +
      '  </div>' +
      '  <span class="loading-label">Carregando…</span>' +
      '</div>';
    document.body.appendChild(overlay);
    return overlay;
  }

  var timer = null;
  function showLoading() {
    var overlay = buildOverlay();
    clearTimeout(timer);
    timer = setTimeout(function () { overlay.classList.add('visible'); }, 250);
  }

  function hideLoading() {
    clearTimeout(timer);
    var overlay = document.querySelector('.loading-overlay');
    if (overlay) overlay.classList.remove('visible');
  }

  document.addEventListener('DOMContentLoaded', function () {
    buildOverlay();

    // Mostra ao clicar em links de navegação normal (não âncoras, não
    // e-mail/telefone, não nova aba, não download).
    document.addEventListener('click', function (e) {
      var link = e.target.closest('a[href]');
      if (!link) return;

      var href = link.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return;
      if (link.target && link.target !== '' && link.target !== '_self') return;
      if (link.hasAttribute('download')) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      showLoading();
    });

    // Mostra ao enviar qualquer formulário (cadastro, login, envio de e-mail, etc).
    document.addEventListener('submit', function () {
      showLoading();
    });

    // Se a página voltar do cache do navegador (botão "voltar"), esconde de novo.
    window.addEventListener('pageshow', hideLoading);
  });
})();
