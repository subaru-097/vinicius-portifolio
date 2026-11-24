// iPhone flutuante com a prévia do vídeo da Saracota (usado na página inicial e na página da Saracota)
/* ==========================================================================
   Saracota — celular flutuando com uma prévia do vídeo. Ao clicar, ele é
   "jogado" na tela: gira, mostra a traseira e para deitado cobrindo o card;
   aí o vídeo do projeto começa dentro da tela dele. No X, faz o caminho de volta.
   Tudo carrega sob demanda: nada pesa no carregamento inicial do site.
   ========================================================================== */
(() => {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const card = document.querySelector('.ph-host');
  const ph = card && card.querySelector('.ph');
  const opt = card ? card.dataset : {};
  const GROW = opt.phGrow !== '0';          // card cresce ao tocar (seção 2 da página inicial)
  const POP = opt.phPop === '1';            // em repouso o celular sai um pouco para fora do card (3D)
  const vfull = document.querySelector('.vfull');
  // mp4 (H.264) para quase todos; webm só se o navegador não tocar mp4
  const pick = (u) => u;
  const SRC = 'media/saracota-video.mp4';          // vertical: tela cheia no celular
  const SRC_WIDE = 'media/saracota-video-wide.mp4'; // deitado: dentro do iPhone
  const desktop = () => innerWidth > 980;

  // celular / telas menores: abre o vídeo em tela cheia
  const openFull = () => {
    if (!vfull) return;
    const v = vfull.querySelector('video');
    if (!v.src) v.src = SRC;
    vfull.hidden = false; document.body.style.overflow = 'hidden';
    v.currentTime = 0; v.play().catch(() => {});
  };
  const closeFull = () => { const v = vfull.querySelector('video'); v.pause(); vfull.hidden = true; document.body.style.overflow = ''; };
  if (vfull) {
    vfull.querySelector('.vfull__close').addEventListener('click', closeFull);
    vfull.querySelector('video').addEventListener('ended', closeFull);
  }
  if (!ph) { document.querySelectorAll('[data-watch]').forEach((b) => b.addEventListener('click', openFull)); return; }

  const stage = ph.querySelector('.ph__stage');
  const idle = ph.querySelector('.ph__idle');
  const still = ph.querySelector('.ph__still');
  const prev = ph.querySelector('.ph__preview');
  const ain = ph.querySelector('.ph__anim--in');
  const aout = ph.querySelector('.ph__anim--out');
  const vid = ph.querySelector('.ph__video');
  const bar = ph.querySelector('.ph__bar span');
  const mute = ph.querySelector('.ph__mute');
  const W = 1920, H = 1080, PW = 1054, PH = 521, PCX = 959, PCY = 539.5;   // quadro do vídeo e celular deitado no fim
  const Z0 = 0.86, OX0 = 0.06;                      // em repouso: um pouco menor e mais à direita

  // prévia encaixada na tela inclinada do celular (homografia → matrix3d)
  const QUAD = [[1310, 194.6], [1607.9, 238.9], [1414, 851.2], [1117.2, 778.1]];   // prévia inteira na largura da tela
  const homography = (src, dst) => {
    const A = [], b = [];
    for (let k = 0; k < 4; k++) {
      const [x, y] = src[k], [X, Y] = dst[k];
      A.push([x, y, 1, 0, 0, 0, -X * x, -X * y]); b.push(X);
      A.push([0, 0, 0, x, y, 1, -Y * x, -Y * y]); b.push(Y);
    }
    for (let c = 0; c < 8; c++) {           // eliminação de Gauss
      let p = c; for (let r = c + 1; r < 8; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
      [A[c], A[p]] = [A[p], A[c]]; [b[c], b[p]] = [b[p], b[c]];
      for (let r = c + 1; r < 8; r++) { const f = A[r][c] / A[c][c]; for (let k = c; k < 8; k++) A[r][k] -= f * A[c][k]; b[r] -= f * b[c]; }
    }
    const h = new Array(8);
    for (let r = 7; r >= 0; r--) { let s = b[r]; for (let k = r + 1; k < 8; k++) s -= A[r][k] * h[k]; h[r] = s / A[r][r]; }
    return `matrix3d(${h[0]},${h[3]},0,${h[6]},${h[1]},${h[4]},0,${h[7]},0,0,1,0,${h[2]},${h[5]},0,1)`;
  };
  prev.style.transform = homography([[0, 0], [720, 0], [720, 1280], [0, 1280]], QUAD);

  // posição do palco: cobre o card; p = 0 (repouso) … 1 (celular cobrindo o card)
  let p = 0, pop = POP ? 1 : 0;
  const place = () => {
    const r = card.getBoundingClientRect();
    const s0 = Math.max(r.width / W, r.height / H);
    const zEnd = Math.min((r.width * 0.96) / (PW * s0), (r.height * 0.94) / (PH * s0));
    const zFit = POP ? (r.height * 0.92) / (780 * s0) : Math.min(Z0, (r.height * 0.88) / (780 * s0));   // em repouso o celular inteiro cabe no card
    const z0 = POP ? zFit + ((r.height * 1.16) / (780 * s0) - zFit) * pop : zFit;
    const z = z0 + (zEnd - z0) * p;
    const ox = POP ? -(1372 - W / 2) * z0 * s0 * (1 - p) : OX0 * (1 - p) * r.width;   // POP: celular centralizado
    const cx = W / 2 + (PCX - W / 2) * p, cy = H / 2 + (PCY - H / 2) * p;
    stage.style.transform = `translate(${ox}px, 0) scale(${s0 * z}) translate(${-cx}px, ${-cy}px)`;
  };
  place();
  new ResizeObserver(place).observe(card);

  // carrega as animações só quando o card está chegando perto da tela
  const load = (v) => { if (!v.src && v.dataset.src) { v.src = pick(v.dataset.src); v.preload = 'auto'; } };
  new IntersectionObserver(([e]) => {
    if (e.isIntersecting) { load(prev); load(ain); load(aout); if (!busy && !reduce) prev.play().catch(() => {}); }
    else if (!playing) prev.pause();
  }, { rootMargin: '600px 0px' }).observe(card);

  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const follow = (v, dir, until) => {      // a câmera acompanha o vídeo do celular
    const loop = () => {
      const t = Math.min(1, v.currentTime / until);
      p = dir > 0 ? ease(t) : 1 - ease(t);
      place();
      if (!v.paused && !v.ended) requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  };

  let busy = false, playing = false, baseH = 0;
  const tweenPop = (to, dur = 320) => new Promise((done) => {   // encolhe/expande o celular para caber no card
    if (!POP || reduce) { pop = POP ? to : 0; place(); return done(); }
    const from = pop, t0 = performance.now();
    const step = (now) => { const t = Math.min(1, (now - t0) / dur); pop = from + (to - from) * ease(t); place(); if (t < 1) requestAnimationFrame(step); else done(); };
    requestAnimationFrame(step);
  });
  const grow = (on) => {
    if (!GROW) return;
    const r = card.getBoundingClientRect();
    if (on) {
      baseH = r.height;
      const target = Math.max(baseH, Math.min(r.width / 2.12, innerHeight * 0.86));
      if (target - baseH < 8) return;
      card.style.height = baseH + 'px'; card.offsetHeight;
      card.style.transition = 'height 0.7s cubic-bezier(0.22, 1, 0.36, 1)';
      card.style.height = target + 'px';
      const top = r.top + scrollY - (innerHeight - target) / 2;
      scrollTo({ top, behavior: reduce ? 'auto' : 'smooth' });
    } else if (baseH) {
      card.style.height = baseH + 'px';
      setTimeout(() => { card.style.height = ''; card.style.transition = ''; }, 750);
    }
  };
  const show = (el, on) => { el.style.opacity = on ? '1' : '0'; };

  const watch = async () => {
    if (!desktop()) return openFull();
    if (busy || playing) return;
    busy = true; playing = true;
    load(ain); load(aout);
    if (!vid.src) vid.src = SRC_WIDE;
    // destrava o som dentro do clique (o vídeo só começa depois do giro)
    vid.muted = false; mute.classList.remove('is-muted');
    vid.play().then(() => vid.pause()).catch(() => {});
    prev.pause();
    await tweenPop(0);
    card.classList.add('is-playing');
    grow(true);
    ain.currentTime = 0;
    ain.defaultPlaybackRate = ain.playbackRate = 2.3;   // giro rápido: quase não dá para ver os detalhes
    try { await ain.play(); } catch (e) { /* sem animação: segue direto */ }
    show(ain, true); show(still, false); show(prev, false);
    follow(ain, 1, 2.35);
  };
  const startVideo = () => {
    p = 1; place();
    card.classList.add('is-video');
    vid.currentTime = 0;
    vid.play().catch(() => { vid.muted = true; mute.classList.add('is-muted'); vid.play().catch(() => {}); });
    busy = false;
  };
  ain.addEventListener('ended', startVideo);
  ain.addEventListener('error', () => { if (playing) startVideo(); });

  const close = async () => {
    if (!playing || busy) return;
    busy = true;
    vid.pause();
    card.classList.remove('is-video');
    grow(false);
    aout.currentTime = 0;
    aout.defaultPlaybackRate = aout.playbackRate = 1.7;
    try { await aout.play(); show(aout, true); show(ain, false); follow(aout, -1, 1.2); }
    catch (e) { finish(); }
  };
  const finish = () => {
    p = 0; place();
    show(still, true); show(prev, true); show(aout, false); show(ain, false);
    card.classList.remove('is-playing');
    tweenPop(1, 420);
    playing = false; busy = false;
    if (!reduce) prev.play().catch(() => {});
  };
  aout.addEventListener('ended', finish);

  document.querySelectorAll('[data-watch]').forEach((b) => b.addEventListener('click', watch));
  ph.querySelector('.ph__close').addEventListener('click', close);
  vid.addEventListener('ended', close);
  vid.addEventListener('click', () => (vid.paused ? vid.play() : vid.pause()));
  vid.addEventListener('timeupdate', () => { if (vid.duration) bar.style.transform = `scaleX(${vid.currentTime / vid.duration})`; });
  mute.addEventListener('click', () => {
    vid.muted = !vid.muted; mute.classList.toggle('is-muted', vid.muted);
    mute.setAttribute('aria-label', vid.muted ? 'Ligar o som' : 'Tirar o som');
  });
  addEventListener('keydown', (e) => { if (e.key === 'Escape') { if (playing) close(); if (vfull && !vfull.hidden) closeFull(); } });
})();
