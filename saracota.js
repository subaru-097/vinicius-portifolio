document.documentElement.classList.add('js');
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// menu com fundo ao rolar (mesmo comportamento da página principal)
const nav = document.querySelector('.nav');
const onScroll = () => nav.classList.toggle('is-scrolled', window.scrollY > 30);
onScroll(); addEventListener('scroll', onScroll, { passive: true });

/* ---------- Quadro da arquitetura (estilo editor de infraestrutura) ---------- */
const board = document.querySelector('.board');
if (board) {
  const canvas = board.querySelector('.board__canvas');
  const svg = board.querySelector('.board__edges');
  const caption = board.querySelector('.board__caption');
  const NS = 'http://www.w3.org/2000/svg';
  const nodes = {};
  board.querySelectorAll('.node').forEach((n) => {
    n.style.left = n.dataset.x + 'px'; n.style.top = n.dataset.y + 'px';
    nodes[n.dataset.id] = n;
  });
  const box = (id) => { const n = nodes[id]; return { x: +n.dataset.x, y: +n.dataset.y, w: n.offsetWidth, h: n.offsetHeight }; };
  // [de, para, saída, entrada, tipo do dado, frase]
  const E = [
    ['painel', 'api', 'r', 'l', 'pk', 'O lojista cola a lista e o painel envia para a API.'],
    ['api', 'banco', 'b', 't', 'pk--db', 'A cotação nova é gravada no banco.'],
    ['api', 'fila', 'r', 'l', 'pk', 'A cotação entra na fila. O worker roda até duas ao mesmo tempo.'],
    ['fila', 'robo', 'r', 'l', 'pk', 'O worker liga o robô para cada fornecedor.'],
    ['cofre', 'robo', 'b', 't', 'pk--db', 'O robô pega a senha do fornecedor, aberta só nessa hora.'],
    ['robo', 's1', 'r', 'l', 'pk', ''], ['robo', 's2', 'r', 'l', 'pk', ''], ['robo', 's3', 'r', 'l', 'pk', ''],
    ['robo', 's4', 'r', 'l', 'pk', ''], ['robo', 's5', 'r', 'l', 'pk', ''],
    ['robo', 'banco', 'b', 'r', 'pk--db', 'Preço por item e total de cada fornecedor voltam para o banco.'],
    ['banco', 'painel', 'l', 'b', 'pk--db', 'O painel lê o resumo e mostra a comparação.'],
  ];
  const info = {
    painel: 'Onde o lojista cola a lista, acompanha o robô e vê o resultado.',
    api: 'Confere a lista, separa quantidade e marca e traduz os nomes (pincel = trincha, 1" = 25 mm).',
    banco: 'Guarda cotações, itens, preços e o histórico de cada execução.',
    fila: 'Organiza os pedidos e roda até duas cotações por vez, sem travar o servidor.',
    cofre: 'As senhas dos fornecedores ficam criptografadas e só abrem na hora do login.',
    robo: 'Entra nos cinco sites ao mesmo tempo. O motor dá nota a cada produto e escolhe o certo.',
    s1: 'Fornecedor de material elétrico. Login, busca e carrinho pelo site.',
    s2: 'Material de construção. O robô busca pela barra do site para não chamar captcha.',
    s3: 'Elétrica e hidráulica. O robô confere o carrinho antes de ler os preços.',
    s4: 'Ferragens. 34 itens cotados em 4m26s, com o total igual ao do site.',
    s5: 'Material de construção. O robô lê todos os resultados e o motor escolhe.',
  };
  const port = (b, side) => side === 'r' ? [b.x + b.w, b.y + b.h / 2] : side === 'l' ? [b.x, b.y + b.h / 2] : side === 't' ? [b.x + b.w / 2, b.y] : [b.x + b.w / 2, b.y + b.h];
  const dir = { r: [1, 0], l: [-1, 0], t: [0, -1], b: [0, 1] };
  const edges = E.map(([a, b, sa, sb, kind, text], i) => {
    const A = port(box(a), sa), B = port(box(b), sb);
    const horiz = 'rl'.includes(sa);
    const k = Math.max(28, (horiz ? Math.abs(B[0] - A[0]) : Math.abs(B[1] - A[1])) * 0.5);
    const d = `M${A[0]},${A[1]} C${A[0] + dir[sa][0] * k},${A[1] + dir[sa][1] * k} ${B[0] + dir[sb][0] * k},${B[1] + dir[sb][1] * k} ${B[0]},${B[1]}`;
    const p = document.createElementNS(NS, 'path'); p.setAttribute('d', d); p.setAttribute('class', 'edge'); svg.appendChild(p);
    const len = p.getTotalLength();
    p.style.strokeDasharray = len; p.style.strokeDashoffset = reduce ? 0 : len;
    const pk = document.createElementNS(NS, 'circle'); pk.setAttribute('r', 3.2); pk.setAttribute('class', 'pk ' + kind); pk.style.opacity = 0; svg.appendChild(pk);
    [A, B].forEach(([x, y], k) => { const c = document.createElementNS(NS, 'circle'); c.setAttribute('cx', x); c.setAttribute('cy', y); c.setAttribute('r', 5); c.setAttribute('class', 'port'); c.style.setProperty('--c', getComputedStyle(nodes[k ? b : a]).getPropertyValue('--c')); svg.appendChild(c); });
    return { a, b, p, pk, len, text, phase: i * 0.11 };
  });

  // o transform não muda o tamanho do layout, então o quadro interno fica 1280x620 e o externo encolhe
  const inner = document.createElement('div');
  const W = +canvas.dataset.w, H = +canvas.dataset.h;
  inner.style.cssText = `position:absolute;left:0;top:0;width:${W}px;height:${H}px;transform-origin:0 0`;
  while (canvas.firstChild) inner.appendChild(canvas.firstChild);
  canvas.appendChild(inner);
  const fit2 = () => {
    const wrap = board.querySelector('.board__scroll');
    const s = innerWidth < 760 ? 0.6 : Math.min(1, (wrap.clientWidth - 48) / W);
    inner.style.transform = `scale(${s})`;
    canvas.style.width = W * s + 'px'; canvas.style.height = H * s + 'px'; canvas.style.transform = 'none';
  };
  fit2(); addEventListener('resize', fit2);

  // foco ao passar o mouse
  const focus = (id) => {
    board.classList.toggle('is-focus', !!id);
    Object.values(nodes).forEach((n) => n.classList.remove('is-hot'));
    edges.forEach((e) => e.p.classList.remove('is-hot'));
    if (!id) { caption.textContent = 'Passe o mouse num bloco.'; return; }
    nodes[id].classList.add('is-hot');
    edges.forEach((e) => { if (e.a === id || e.b === id) { e.p.classList.add('is-hot'); nodes[e.a].classList.add('is-hot'); nodes[e.b].classList.add('is-hot'); } });
    caption.textContent = info[id] || '';
  };
  Object.entries(nodes).forEach(([id, n]) => {
    n.tabIndex = 0;
    n.addEventListener('mouseenter', () => focus(id)); n.addEventListener('focus', () => focus(id));
    n.addEventListener('mouseleave', () => focus(null)); n.addEventListener('blur', () => focus(null));
    n.addEventListener('click', () => focus(id));
  });

  // entrada: blocos aparecem, linhas se desenham, e os dados começam a andar
  const start = () => {
    const order = ['painel', 'api', 'banco', 'fila', 'cofre', 'robo', 's1', 's2', 's3', 's4', 's5'];
    order.forEach((id, i) => nodes[id].animate([{ opacity: 0, transform: 'translateY(14px) scale(0.96)' }, { opacity: 1, transform: 'none' }], { duration: 600, delay: i * 70, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'backwards' }));
    edges.forEach((e, i) => e.p.animate([{ strokeDashoffset: e.len }, { strokeDashoffset: 0 }], { duration: 900, delay: 350 + i * 80, easing: 'cubic-bezier(0.33, 1, 0.68, 1)', fill: 'forwards' }));
    const t0 = performance.now() + 1600;
    const loop = (now) => {
      const t = (now - t0) / 3200;
      edges.forEach((e) => {
        if (t < 0) return;
        const c = (t + e.phase) % 1;
        const pt = e.p.getPointAtLength(c * e.len);
        e.pk.setAttribute('cx', pt.x); e.pk.setAttribute('cy', pt.y);
        e.pk.style.opacity = (1 - Math.abs(c - 0.5) * 1.6).toFixed(2);
      });
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  };
  if (reduce) edges.forEach((e) => (e.p.style.strokeDashoffset = 0));
  else {
    Object.values(nodes).forEach((n) => (n.style.opacity = 0));
    new IntersectionObserver(([en], obs) => {
      if (!en.isIntersecting) return; obs.disconnect();
      Object.values(nodes).forEach((n) => (n.style.opacity = ''));
      start();
    }, { rootMargin: '0px 0px -20% 0px' }).observe(board);
  }
}

/* ---------- Painel de demonstração (abre por cima da página) ---------- */
const demo = document.getElementById('painel');
if (demo) {
  const frame = demo.querySelector('.demo__frame');
  let last = null;
  const open = (e) => {
    if (e) e.preventDefault();
    last = document.activeElement;
    if (!frame.src) frame.src = frame.dataset.src;
    demo.hidden = false; document.body.style.overflow = 'hidden';
    demo.querySelector('.demo__close').focus();
    if (location.hash !== '#painel') history.replaceState(null, '', '#painel');
  };
  const close = () => {
    demo.hidden = true; document.body.style.overflow = '';
    history.replaceState(null, '', location.pathname);
    if (last) last.focus();
  };
  document.querySelectorAll('[data-open-panel]').forEach((b) => b.addEventListener('click', open));
  demo.querySelector('.demo__close').addEventListener('click', close);
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && !demo.hidden) close(); });
  if (location.hash === '#painel') open();
}
