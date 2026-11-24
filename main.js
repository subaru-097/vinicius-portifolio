document.documentElement.classList.add('js');
if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) document.documentElement.classList.add('asm');

const ready = () => document.body.classList.add('is-ready');
if (document.fonts && document.fonts.ready) {
  Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 900))]).then(ready);
} else {
  ready();
}

// Menu ganha fundo vitrificado ao rolar
const nav = document.querySelector('.nav');
const onScroll = () => nav.classList.toggle('is-scrolled', window.scrollY > 30);
onScroll();
window.addEventListener('scroll', onScroll, { passive: true });

// Link ativo do menu conforme a seção
const links = [...document.querySelectorAll('.nav__links a')];
const sections = links.filter((a) => a.getAttribute('href').startsWith('#')).map((a) => document.querySelector(a.getAttribute('href'))).filter(Boolean);
const spy = new IntersectionObserver((entries) => {
  entries.forEach((e) => {
    if (!e.isIntersecting) return;
    const id = e.target.dataset.nav || e.target.id;
    links.forEach((a) => a.classList.toggle('is-on', a.getAttribute('href') === `#${id}`));
  });
}, { rootMargin: '-45% 0px -50% 0px' });
sections.forEach((s) => spy.observe(s));
const extra = document.getElementById('mais-projetos'); if (extra) { extra.dataset.nav = 'projetos'; spy.observe(extra); }

// Blocos aparecem ao rolar
document.querySelectorAll('.case--main').forEach((el) => el.classList.add('reveal'));
const io = new IntersectionObserver((entries) => {
  entries.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
  });
}, { threshold: 0.15 });
document.querySelectorAll('.reveal').forEach((el) => io.observe(el));

const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Saracota: toca a abertura ao chegar no card; no fim a cortina corre da direita
// para a esquerda revelando as informações, e vira um antes/depois arrastável.
const card = document.querySelector('#saracota');
const video = card && card.querySelector('.intro__video');
const handle = card && card.querySelector('.intro__handle');
if (card && video && handle) {
  let x = 100;
  let anim = null;
  const setX = (v) => {
    x = Math.max(0, Math.min(100, v));
    if (x > 97) x = 100; if (x < 3 && x > 0) x = 0;
    card.style.setProperty('--x', x + '%');
    const w = card.offsetWidth, px = (x / 100) * w;
    handle.style.setProperty('--kx', (px < 22 ? 22 - px : px > w - 22 ? w - 22 - px : 0) + 'px');
    handle.setAttribute('aria-valuenow', Math.round(x));
    handle.classList.toggle('is-rest', x < 2 && !handle.classList.contains('is-drag'));
  };
  const open = () => {
    if (card.classList.contains('is-open')) return;
    card.classList.add('is-open');
    if (window.assembleCard) window.assembleCard();
    const from = x, to = 0, dur = 1000, t0 = performance.now();
    const ease = (t) => 1 - Math.pow(1 - t, 3);
    const step = (now) => {
      const t = Math.min(1, (now - t0) / dur);
      setX(from + (to - from) * ease(t));
      if (t < 1) anim = requestAnimationFrame(step);
    };
    anim = requestAnimationFrame(step);
  };

  if (reduce) {
    setX(0); card.classList.add('is-open');
    video.addEventListener('loadeddata', () => { video.currentTime = Math.max(0, video.duration - 0.1); }, { once: true });
  } else {
    video.defaultPlaybackRate = video.playbackRate = 1.6;
    video.addEventListener('ended', open);
    video.addEventListener('error', open, true);
    new IntersectionObserver(([e], obs) => {
      if (!e.isIntersecting) return;
      obs.disconnect();
      const p = video.play();
      if (p && p.catch) p.catch(open);   // navegador bloqueou o autoplay: mostra as informações
    }, { rootMargin: '0px 0px -35% 0px' }).observe(card);
  }

  // arrastar
  const fromEvent = (ev) => {
    const r = card.getBoundingClientRect();
    return ((ev.clientX - r.left) / r.width) * 100;
  };
  handle.addEventListener('pointerdown', (ev) => {
    cancelAnimationFrame(anim);
    handle.setPointerCapture(ev.pointerId);
    handle.classList.add('is-drag'); handle.classList.remove('is-rest');
  });
  handle.addEventListener('pointermove', (ev) => {
    if (handle.classList.contains('is-drag')) setX(fromEvent(ev));
  });
  const end = () => { handle.classList.remove('is-drag'); setX(x); };
  handle.addEventListener('pointerup', end);
  handle.addEventListener('pointercancel', end);
  handle.addEventListener('keydown', (ev) => {
    if (ev.key === 'ArrowLeft') { setX(x - 5); ev.preventDefault(); }
    if (ev.key === 'ArrowRight') { setX(x + 5); ev.preventDefault(); }
  });
}

// Projetos: cards lado a lado. Troca pelo botão, pelos tracinhos, arrastando, pelas setas do
// teclado ou com rolagem lateral do trackpad (a roda vertical continua rolando a página).
// A foto de cada card desliza um pouco mais devagar que o card (parallax), dando profundidade.
const deck = document.querySelector('.deck');
if (deck) {
  const track = deck.querySelector('.deck__track');
  const slides = [...track.querySelectorAll('.slide')];
  const imgs = slides.map((s) => s.querySelector('.pc__media img'));
  const btns = [...document.querySelectorAll('.more__btn')];
  const dots = [...document.querySelectorAll('.more__dot')];
  const count = document.querySelector('.more__count b');
  const N = slides.length;
  let x = 0, current = 0, raf = null;
  const maxX = () => Math.max(0, track.scrollWidth - deck.clientWidth + parseFloat(getComputedStyle(deck).paddingLeft) * 2);
  const targetFor = (k) => Math.min(maxX(), slides[k].offsetLeft);
  const paint = () => {
    track.style.transform = `translate3d(${-x}px, 0, 0)`;
    const vw = deck.clientWidth;
    slides.forEach((s, i) => {
      const c = s.offsetLeft - x + s.offsetWidth / 2;
      const off = Math.max(-1, Math.min(1, (c - vw / 2) / vw));
      if (imgs[i]) imgs[i].style.transform = `translate3d(${(-off * 6).toFixed(2)}%, 0, 0)`;
    });
  };
  const mark = (k) => {
    slides.forEach((s, i) => { s.classList.toggle('is-active', i === k); s.querySelectorAll('a').forEach((a) => (a.tabIndex = i === k ? 0 : -1)); });
    dots.forEach((d, i) => d.classList.toggle('is-on', i === k));
    if (count) count.textContent = String(k + 1).padStart(2, '0');
    btns[0].disabled = k === 0;
    btns[1].querySelector('span').textContent = k === N - 1 ? 'Voltar ao início' : 'Próximo';
  };
  const ease = (t) => 1 - Math.pow(1 - t, 4);
  const glide = (to, dur = 850) => {
    cancelAnimationFrame(raf);
    const from = x, t0 = performance.now();
    if (reduce || Math.abs(to - from) < 1) { x = to; paint(); return; }
    const step = (now) => { const t = Math.min(1, (now - t0) / dur); x = from + (to - from) * ease(t); paint(); raf = t < 1 ? requestAnimationFrame(step) : null; };
    raf = requestAnimationFrame(step);
  };
  const go = (k) => { current = (k + N) % N; mark(current); glide(targetFor(current)); };
  btns.forEach((b) => b.addEventListener('click', () => go(current + Number(b.dataset.dir))));
  dots.forEach((d) => d.addEventListener('click', () => go(Number(d.dataset.go))));
  slides.forEach((s, i) => s.addEventListener('click', (e) => { if (moved) { e.preventDefault(); return; } if (i !== current) { e.preventDefault(); go(i); } }));
  deck.addEventListener('keydown', (e) => { if (e.key === 'ArrowRight') { go(current + 1); e.preventDefault(); } if (e.key === 'ArrowLeft') { go(current - 1); e.preventDefault(); } });

  // arrastar: o card segue o dedo/mouse; ao soltar, vai para o próximo se passou de um pouco
  let sx = null, sxX = 0, moved = false;
  deck.addEventListener('pointerdown', (e) => { if (e.button !== 0) return; sx = e.clientX; sxX = x; moved = false; cancelAnimationFrame(raf); });
  addEventListener('pointermove', (e) => {
    if (sx === null) return;
    const dx = e.clientX - sx;
    if (Math.abs(dx) > 6) moved = true;
    if (moved) { const m = maxX(); x = sxX - dx; if (x < 0) x *= 0.35; if (x > m) x = m + (x - m) * 0.35; paint(); }
  });
  addEventListener('pointerup', (e) => {
    if (sx === null) return;
    const dx = e.clientX - sx; sx = null;
    if (moved && Math.abs(dx) > 50) go(Math.max(0, Math.min(N - 1, current + (dx < 0 ? 1 : -1))));
    else glide(targetFor(current), 600);
    setTimeout(() => (moved = false), 0);
  });

  // rolagem lateral (trackpad ou Shift + roda): leve, um card por gesto
  let acc = 0, lock = 0;
  deck.addEventListener('wheel', (e) => {
    const dx = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : (e.shiftKey ? e.deltaY : 0);
    if (!dx) return;
    e.preventDefault();
    const now = performance.now();
    if (now < lock) return;
    acc += dx;
    if (Math.abs(acc) > 40) { go(Math.max(0, Math.min(N - 1, current + (acc > 0 ? 1 : -1)))); acc = 0; lock = now + 650; }
  }, { passive: false });

  addEventListener('resize', () => { x = targetFor(current); paint(); });
  mark(0); paint();
}

document.querySelectorAll('.about > *').forEach((el, k) => {
  el.classList.add('reveal'); el.style.transitionDelay = (k % 3) * 0.08 + 's'; io.observe(el);
});

/* ==========================================================================
   "Montar e digitar": peças voam de várias direções e se encaixam;
   depois cada letra chega do espaço 3D girando e assenta no lugar.
   (adaptado do card assemble-then-type-flyin)
   ========================================================================== */
const rnd = (i) => { const s = Math.sin(i * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const OUT_BACK = 'cubic-bezier(0.34, 1.45, 0.64, 1)';
const OUT_CUBIC = 'cubic-bezier(0.33, 1, 0.68, 1)';
let seed = 1;

// quebra o texto em letras sem perder a quebra de linha natural (palavra inteira junta)
const splitChars = (el) => {
  if (el.dataset.split) return [...el.querySelectorAll('.ch')];
  el.dataset.split = '1';
  if (!el.getAttribute('aria-label')) el.setAttribute('aria-label', el.textContent.trim().replace(/\s+/g, ' '));
  const walk = (node) => {
    [...node.childNodes].forEach((n) => {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach((part) => {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
          const w = document.createElement('span'); w.className = 'w'; w.setAttribute('aria-hidden', 'true');
          [...part].forEach((c) => { const s = document.createElement('span'); s.className = 'ch'; s.textContent = c; w.appendChild(s); });
          frag.appendChild(w);
        });
        n.replaceWith(frag);
      } else if (n.nodeType === 1 && !n.matches('svg, img, video')) walk(n);
    });
  };
  walk(el);
  return [...el.querySelectorAll('.ch')];
};

// peça (sem texto) voando até o lugar com leve passada do ponto
const flyShell = (el, delay, dur = 620, amp = 1) => {
  const k = seed++;
  const ang = rnd(k) * Math.PI * 2, dist = (60 + rnd(k + 7) * 160) * amp;
  const rot = (rnd(k + 13) - 0.5) * 16;
  el.style.opacity = '1';
  el.animate([
    { opacity: 0, transform: `translate(${Math.cos(ang) * dist}px, ${Math.sin(ang) * dist}px) rotate(${rot}deg)`, filter: 'blur(2px)' },
    { opacity: 1, transform: 'translate(0, 0) rotate(0deg)', filter: 'blur(0px)' },
  ], { duration: dur, delay, easing: OUT_BACK, fill: 'backwards' });
};

// letras chegando do fundo, girando nos 3 eixos
const flyChars = (el, delay, { dur = 620, step = 0.035, amp = 1, until = null } = {}) => {
  el.style.opacity = '1';
  const chars = splitChars(el);
  const st = until ? Math.min(step, Math.max(0.004, (until - dur / 1000) / Math.max(1, chars.length))) : step;
  chars.forEach((c, i) => {
    const k = seed++;
    const dx = (rnd(k) - 0.5) * 340 * amp, dy = (rnd(k + 1) - 0.5) * 260 * amp;
    const dz = -(120 + rnd(k + 2) * 300) * amp;
    const rx = (rnd(k + 3) - 0.5) * 340, ry = (rnd(k + 4) - 0.5) * 380, rz = (rnd(k + 5) - 0.5) * 240;
    c.animate([
      { opacity: 0, transform: `perspective(600px) translate3d(${dx}px, ${dy}px, ${dz}px) rotateX(${rx}deg) rotateY(${ry}deg) rotateZ(${rz}deg)` },
      { opacity: 1, offset: 0.55 },
      { opacity: 1, transform: 'perspective(600px) translate3d(0, 0, 0) rotateX(0deg) rotateY(0deg) rotateZ(0deg)' },
    ], { duration: dur, delay: delay + i * st * 1000, easing: OUT_CUBIC, fill: 'backwards' });
  });
};

const once = (el, fn, margin = '0px 0px -20% 0px') => {
  if (!el) return;
  new IntersectionObserver(([e], obs) => { if (e.isIntersecting) { obs.disconnect(); fn(); } }, { rootMargin: margin }).observe(el);
};

if (!reduce) {
  // 1) HERO — rápido e fluido: peças em ~0,5 s, nome em ~1,2 s, tudo pronto em ~1,6 s
  const runHero = () => {
    const navBits = [...document.querySelectorAll('.nav__brand, .nav__links a, .nav__cv')];
    navBits.forEach((el, i) => flyShell(el, 40 + i * 45, 560, 0.45));
    const bg = document.querySelector('.hero__bg');
    if (bg) { bg.style.opacity = '1'; bg.animate([{ opacity: 0, transform: 'scale(1.06)' }, { opacity: 1, transform: 'scale(1)' }], { duration: 1300, easing: OUT_CUBIC, fill: 'backwards' }); }
    const name = document.querySelector('.hero__name');
    const lead = document.querySelector('.hero__lead');
    const cta = document.querySelector('.hero__cta');
    if (cta) { cta.style.opacity = '1'; flyShell(cta, 180, 640, 0.8); }
    if (name) { name.style.opacity = '1'; flyChars(name, 300, { dur: 700, step: 0.05, amp: 1 }); }
    if (lead) { lead.style.opacity = '1'; flyChars(lead, 620, { dur: 520, amp: 0.35, until: 0.95 }); }
  };
  if (document.body.classList.contains('is-ready')) runHero();
  else new MutationObserver((m, obs) => { if (document.body.classList.contains('is-ready')) { obs.disconnect(); runHero(); } }).observe(document.body, { attributes: true });

  // 2) SARACOTA — título da seção monta ao chegar; o conteúdo do card monta quando a cortina abre
  const wh = document.querySelector('.work__head');
  if (wh) {
    const eb = wh.querySelector('.work__brand img'), ti = wh.querySelector('.work__title'), it = wh.querySelector('.work__tag');
    [eb, ti, it].forEach((el) => el && (el.style.opacity = '0'));
    once(wh, () => {
      if (eb) flyShell(eb, 0, 600, 0.5);
      if (ti) flyChars(ti, 120, { dur: 650, step: 0.03 });
      if (it) flyChars(it, 450, { dur: 500, amp: 0.3, until: 0.8 });
    });
  }
  window.assembleCard = () => {
    const c = document.querySelector('#saracota');
    if (!c) return;
    const shells = [...c.querySelectorAll('.case__text, .case__compare > div, .case__hint, .case__actions .btn')];
    shells.forEach((el, i) => flyShell(el, i * 45, 620, 0.7));
    const ph = c.querySelector('.ph');
    if (ph) ph.animate([{ opacity: 0, translate: '80px 0' }, { opacity: 1, translate: '0 0' }], { duration: 900, delay: 150, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'backwards' });
    const t = c.querySelector('.case__title');
    if (t) flyChars(t, 380, { dur: 600, amp: 0.6, until: 0.9 });
  };

  // 3) PROJETOS — cards entram de várias direções, depois o título digita do 3D
  const more = document.querySelector('.more');
  if (more) {
    const cards = [];
    const bits = [...more.querySelectorAll('.more__head .eyebrow, .more__hint, .more__ctrl')];
    const title = more.querySelector('.more__title');
    [...cards, ...bits, title].forEach((el) => el && (el.style.opacity = '0'));
    once(more, () => {
      bits.forEach((el, i) => flyShell(el, i * 60, 600, 0.5));
      cards.forEach((el, i) => flyShell(el, 80 + i * 90, 760, 1));
      if (title) flyChars(title, 520, { dur: 650, step: 0.032 });
      cards.forEach((el, i) => { const n = el.querySelector('.pcard__name'); if (n) flyChars(n, 820 + i * 90, { dur: 520, amp: 0.4, step: 0.025 }); });
    }, '0px 0px -25% 0px');
  }
}
