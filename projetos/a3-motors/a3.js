/* A3 Motors: hero com o Audi R8, estoque com a pilha de marcas e iPhone com o app */
(() => {
  const CARS = [
    { marca: 'Ferrari', modelo: 'Ferrari 458 Italia V8 570cv', ano: 2015, km: '14.800 km', motor: '4.5 V8', preco: 2450000, img: 'carro-1.webp', cond: 'seminovo', tag: 'Supercarro' },
    { marca: 'BMW', modelo: 'BMW M2 Coupé G87 460cv', ano: 2024, km: '3.200 km', motor: '3.0 Bi-Turbo', preco: 620000, img: 'carros-2.jpg', cond: 'seminovo', tag: 'Destaque' },
    { marca: 'McLaren', modelo: 'McLaren 600LT Coupé 600cv', ano: 2020, km: '6.500 km', motor: '3.8 V8', preco: 2890000, img: 'carros-3.webp', cond: 'seminovo', tag: 'Exclusivo' },
    { marca: 'BMW', modelo: 'BMW M2 Competition F87 410cv', ano: 2020, km: '18.000 km', motor: '3.0 Bi-Turbo', preco: 450000, img: 'carros-4.jpg', cond: 'seminovo', tag: 'Oportunidade' },
    { marca: 'Mercedes', modelo: 'Mercedes-AMG S 63 Coupé V8 612cv', ano: 2018, km: '24.000 km', motor: '4.0 V8', preco: 890000, img: 'carros-5.jpg', cond: 'seminovo', tag: 'Alto Padrão' },
    { marca: 'Porsche', modelo: 'Porsche 911 Turbo S 992 650cv', ano: 2023, km: '5.100 km', motor: '3.7 Boxer', preco: 1980000, img: 'carros-6.jpg', cond: 'seminovo', tag: 'Destaque' }
  ];
  const BRANDS = [
    { nome: '', titulo: 'Todas as marcas', img: 'imagem-de-fundo.jpg' },
    { nome: 'Audi', titulo: 'Audi', img: 'marca-audi.jpg', logo: 'logotipo-audi.png' },
    { nome: 'BMW', titulo: 'BMW', img: 'marca-bmw.jpg', logo: 'logotipo-bmw.png' },
    { nome: 'Lamborghini', titulo: 'Lamborghini', img: 'marca-lamborghini.jpg', logo: 'logotipo-lamborghini.png' },
    { nome: 'Mercedes', titulo: 'Mercedes', img: 'marca-mercedes.jpg', logo: 'logotipo-mercedes.png' },
    { nome: 'Porsche', titulo: 'Porsche', img: 'marca-porsche.jpg', logo: 'logotipo-porsche.png' },
    { nome: 'Ferrari', titulo: 'Ferrari', img: 'carro-1.webp' },
    { nome: 'McLaren', titulo: 'McLaren', img: 'carros-3.webp' }
  ];
  const brl = n => 'R$ ' + n.toLocaleString('pt-BR');
  const $ = s => document.querySelector(s);
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Hero: o carro entra, para, e o site aparece ---------- */
  const hero = document.getElementById('hero');
  const hv = document.getElementById('heroVideo');
  if (hero && hv) {
    const ready = () => hero.classList.add('is-ready');
    hv.addEventListener('ended', ready);
    const start = () => {
      if (reduce) { hv.currentTime = hv.duration || 5; ready(); return; }
      hv.play().catch(ready);
      setTimeout(ready, 7000); // se o vídeo travar, o site aparece mesmo assim
    };
    if (document.getElementById('preloader')) document.addEventListener('a3:intro', start, { once: true });
    else start();
  }

  /* ---------- Estoque: barra de busca ---------- */
  const grid = $('#carGrid');
  if (grid) {
    const MARCAS = ['Audi', 'BMW', 'Ferrari', 'Lamborghini', 'McLaren', 'Mercedes', 'Porsche'];
    const ANOS = Array.from({ length: 12 }, (_, i) => 2025 - i);
    const PRECOS = [300000, 500000, 700000, 1000000, 1500000, 2000000, 2500000, 3000000];
    const short = n => n >= 1e6 ? `R$ ${(n / 1e6).toLocaleString('pt-BR')} mi` : `R$ ${n / 1e3} mil`;
    const q = { marca: '', modelo: '', anoDe: '', anoAte: '', precoDe: '', precoAte: '' };
    const opts = {
      marca: () => [['', 'Todas as marcas'], ...MARCAS.map(m => [m, m])],
      modelo: () => [['', 'Todos os modelos'], ...CARS.filter(c => !q.marca || c.marca === q.marca).map(c => [c.modelo, c.modelo])],
      anoDe: () => [['', 'Qualquer'], ...ANOS.slice().reverse().map(a => [a, a])],
      anoAte: () => [['', 'Qualquer'], ...ANOS.map(a => [a, a])],
      precoDe: () => [['', 'Qualquer'], ...PRECOS.map(p => [p, short(p)])],
      precoAte: () => [['', 'Qualquer'], ...PRECOS.map(p => [p, short(p)])]
    };
    const card = c => `<article class="property-card car-card is-in group bg-[#141414]/40 backdrop-blur-[16px] rounded-2xl overflow-hidden border border-amber-500/15 shadow-[0_8px_32px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.08)] hover:border-amber-400/50 hover:-translate-y-1 transition-all duration-300 flex flex-col">
        <div class="w-full h-52 sm:h-56 bg-black/60 overflow-hidden relative border-b border-white/10">
          <img src="${c.img}" alt="${c.modelo}" loading="lazy" class="w-full h-full object-cover">
          <span class="absolute top-3 left-3 bg-black/70 backdrop-blur-md border border-white/20 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full">${c.cond === 'zero' ? 'Zero km' : 'Seminovo'}</span>
          <span class="absolute top-3 right-3 bg-gradient-to-r from-amber-500/90 to-amber-600/90 text-black text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full flex items-center gap-1"><i class="fa-solid fa-star text-[9px]"></i> ${c.tag}</span>
        </div>
        <div class="p-5 flex-grow flex flex-col justify-between gap-4">
          <div>
            <div class="flex items-center gap-1.5 text-amber-400/90 text-xs font-semibold uppercase tracking-wider mb-1"><i class="fa-solid fa-car text-xs"></i><span>${c.marca} • ${c.ano}</span></div>
            <h3 class="text-lg font-extrabold text-white tracking-tight group-hover:text-amber-300 transition-colors">${c.modelo}</h3>
          </div>
          <div class="grid grid-cols-3 gap-2 py-2.5 px-3 bg-white/[0.04] rounded-xl border border-white/10 text-center text-xs text-zinc-200 font-semibold">
            <span class="flex items-center justify-center gap-1.5"><i class="fa-solid fa-calendar-days text-amber-400/80"></i>${c.ano}</span>
            <span class="flex items-center justify-center gap-1.5 border-x border-white/10 px-1"><i class="fa-solid fa-gauge-high text-amber-400/80"></i>${c.km}</span>
            <span class="flex items-center justify-center gap-1.5"><i class="fa-solid fa-bolt text-amber-400/80"></i>${c.motor}</span>
          </div>
          <div class="pt-1 flex items-center justify-between border-t border-white/10">
            <div><span class="text-[10px] text-zinc-400 uppercase tracking-widest block font-bold">Valor de venda</span><span class="text-lg font-black text-white">${brl(c.preco)}</span></div>
            <a href="https://wa.me/" target="_blank" rel="noopener" aria-label="Falar sobre ${c.modelo}" class="w-9 h-9 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-black flex items-center justify-center text-xs font-extrabold shadow-md shadow-amber-500/20 group-hover:scale-110 transition-transform">↗</a>
          </div>
        </div>
      </article>`;

    function render() {
      const n = v => (v === '' ? null : +v);
      const list = CARS.filter(c => (!q.marca || c.marca === q.marca) && (!q.modelo || c.modelo === q.modelo) &&
        (n(q.anoDe) === null || c.ano >= n(q.anoDe)) && (n(q.anoAte) === null || c.ano <= n(q.anoAte)) &&
        (n(q.precoDe) === null || c.preco >= n(q.precoDe)) && (n(q.precoAte) === null || c.preco <= n(q.precoAte)));
      grid.innerHTML = list.map(card).join('');
      $('#carEmpty').classList.toggle('hidden', list.length > 0);
      $('#fCount').textContent = list.length === 1 ? '1 veículo encontrado' : `${list.length} veículos encontrados`;
    }

    // selects de vidro
    const sels = [...document.querySelectorAll('.gsel')];
    const closeAll = except => sels.forEach(s => { if (s !== except) { s.classList.remove('is-open'); s.querySelector('.gsel__btn').setAttribute('aria-expanded', 'false'); } });
    function fill(sel) {
      const k = sel.dataset.key;
      sel.querySelector('.gsel__list').innerHTML = opts[k]().map(([v, t]) => `<li role="option" tabindex="-1" data-v="${v}" aria-selected="${String(q[k]) === String(v)}">${t}</li>`).join('');
    }
    function setVal(sel, v, t) {
      const k = sel.dataset.key; q[k] = v;
      const val = sel.querySelector('.gsel__val');
      val.textContent = v === '' ? val.dataset.ph : t;
      sel.classList.toggle('has-val', v !== '');
      if (k === 'marca') { const m = sels.find(s => s.dataset.key === 'modelo'); setVal(m, '', ''); syncDeck(v); }
    }
    let syncDeck = () => {};
    sels.forEach(sel => {
      const btn = sel.querySelector('.gsel__btn'), list = sel.querySelector('.gsel__list');
      btn.addEventListener('click', () => {
        const open = !sel.classList.contains('is-open');
        closeAll(sel); fill(sel);
        sel.classList.toggle('is-open', open); btn.setAttribute('aria-expanded', open);
        if (open) (list.querySelector('[aria-selected="true"]') || list.firstElementChild)?.focus();
      });
      list.addEventListener('click', e => {
        const li = e.target.closest('li'); if (!li) return;
        setVal(sel, li.dataset.v, li.textContent); closeAll(); btn.focus(); render();
      });
      list.addEventListener('keydown', e => {
        const li = document.activeElement;
        if (e.key === 'ArrowDown') { e.preventDefault(); li.nextElementSibling?.focus(); }
        if (e.key === 'ArrowUp') { e.preventDefault(); li.previousElementSibling?.focus(); }
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); li.click(); }
        if (e.key === 'Escape') { closeAll(); btn.focus(); }
      });
    });
    document.addEventListener('click', e => { if (!e.target.closest('.gsel')) closeAll(); });
    $('#sbarGo').addEventListener('click', () => { render(); grid.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' }); });
    $('#fClear').addEventListener('click', () => { sels.forEach(s => setVal(s, '', '')); render(); });

    // cards das marcas: o card do meio é a marca escolhida (e preenche a busca)
    const stage = $('#deckStage'), bars = $('#deckBars');
    const count = nome => CARS.filter(c => !nome || c.marca === nome).length;
    stage.innerHTML = BRANDS.map((b, i) => `<button type="button" class="brand-card" role="option" data-i="${i}" aria-label="${b.titulo}">
        <img src="${b.img}" alt="" loading="lazy">
        <span class="brand-card__info">${b.logo ? `<img src="${b.logo}" alt="" class="brand-card__logo">` : '<i class="fa-solid fa-layer-group brand-card__all"></i>'}
          <span><b>${b.titulo}</b><small>${count(b.nome) ? count(b.nome) + (count(b.nome) > 1 ? ' carros' : ' carro') + ' no estoque' : 'Sob encomenda'}</small></span></span>
      </button>`).join('');
    bars.innerHTML = BRANDS.map(() => '<span></span>').join('');
    const cards = [...stage.children], N = cards.length;
    let cur = 0;
    function layout() {
      cards.forEach((el, i) => {
        let d = i - cur; if (d > N / 2) d -= N; if (d < -N / 2) d += N;
        el.style.setProperty('--d', d); el.style.setProperty('--ad', Math.abs(d));
        el.classList.toggle('is-active', d === 0); el.setAttribute('aria-selected', d === 0);
        el.tabIndex = Math.abs(d) <= 1 ? 0 : -1;
      });
      [...bars.children].forEach((b, i) => b.classList.toggle('is-on', i === cur));
    }
    const marcaSel = sels.find(s => s.dataset.key === 'marca');
    function go(i) {
      cur = (i + N) % N; layout();
      const nome = BRANDS[cur].nome;
      if (q.marca !== nome) { setVal(marcaSel, nome, nome); render(); }
    }
    syncDeck = nome => { const i = BRANDS.findIndex(b => b.nome === nome); if (i >= 0 && i !== cur) { cur = i; layout(); } };
    stage.addEventListener('click', e => { const c = e.target.closest('.brand-card'); if (c) go(+c.dataset.i); });
    $('#deckPrev').addEventListener('click', () => go(cur - 1));
    $('#deckNext').addEventListener('click', () => go(cur + 1));
    stage.addEventListener('keydown', e => { if (e.key === 'ArrowLeft') go(cur - 1); if (e.key === 'ArrowRight') go(cur + 1); });
    let sx = null;
    stage.addEventListener('pointerdown', e => { sx = e.clientX; });
    stage.addEventListener('pointerup', e => { if (sx !== null && Math.abs(e.clientX - sx) > 40) go(cur + (e.clientX < sx ? 1 : -1)); sx = null; });
    layout();
    render();
  }

  /* ---------- iPhone com o app ---------- */
  const phone = document.querySelector('.a3phone');
  if (phone) {
    const stage = phone.querySelector('.a3phone__stage');
    const fit = () => stage.style.setProperty('--s', phone.clientWidth / 566);
    new ResizeObserver(fit).observe(phone); fit();
    const v = document.getElementById('appPhoneVideo');
    new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { if (!v.src) v.src = v.dataset.src; v.play().catch(() => {}); } else if (v.src) v.pause();
    }, { rootMargin: '200px' }).observe(phone);
  }

})();
