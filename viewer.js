(() => {
  'use strict';
  const v = document.getElementById('viewer');
  if (!v) return;
  const frame = document.getElementById('viewerFrame');
  const title = document.getElementById('viewerTitle');
  const out = document.getElementById('viewerOut');
  const modes = v.querySelectorAll('[data-mode]');
  let lastFocus = null;

  const setMode = (m) => {
    v.classList.toggle('is-phone', m === 'phone');
    modes.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mode === m)));
  };
  const open = (href, name, push = true) => {
    lastFocus = document.activeElement;
    title.textContent = name;
    out.href = href;
    frame.src = href;
    setMode('desk');
    v.hidden = false;
    document.documentElement.classList.add('viewer-open');
    v.querySelector('[data-close]').focus();
    if (push) history.pushState({ viewer: href, name }, '', '#ver=' + href.split('/')[1]);
  };
  const close = (fromHistory = false) => {
    if (v.hidden) return;
    v.hidden = true;
    frame.src = 'about:blank';
    document.documentElement.classList.remove('viewer-open');
    if (lastFocus) lastFocus.focus();
    if (!fromHistory && history.state && history.state.viewer) history.back();
  };

  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[data-view]');
    if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey) return;
    const slide = a.closest('.slide');
    // no carrossel, o clique num cartão que não está em destaque só troca de slide
    if (slide && !slide.classList.contains('is-active')) return;
    e.preventDefault();
    open(a.getAttribute('href'), a.dataset.title || a.textContent.trim());
  });
  v.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) close(); });
  modes.forEach((b) => b.addEventListener('click', () => setMode(b.dataset.mode)));
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && !v.hidden) close(); });
  addEventListener('popstate', (e) => {
    if (e.state && e.state.viewer) open(e.state.viewer, e.state.name, false); else close(true);
  });
  // link direto: ...#ver=a3-estetica
  const m = location.hash.match(/^#ver=([\w-]+)$/);
  if (m) {
    const a = document.querySelector(`a[data-view="${m[1]}"]`);
    if (a) { history.replaceState(null, '', location.pathname); open(a.getAttribute('href'), a.dataset.title); }
  }
})();
