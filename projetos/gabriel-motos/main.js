/**
 * Gabriel Motors — Script Principal
 * Controle da Sequência de Vídeos da Hero (Intro + Loop Contínuo),
 * Tela de Carregamento com Progresso Real e Transparência de Marca
 */

document.addEventListener('DOMContentLoaded', () => {
  // Elementos da Hero e Vídeos
  const hero = document.getElementById('hero');
  const introVideo = document.getElementById('hero-video-intro') || document.getElementById('introVideo');
  const loopVideo = document.getElementById('hero-video-loop');
  const heroText = document.getElementById('heroText') || document.getElementById('hero-content');
  const scrollIndicator = document.querySelector('.hero__scroll-indicator');
  const categoriesSection = document.getElementById('categorias');

  // Elementos da Tela de Carregamento (Loading)
  const loader = document.getElementById('hero-loader');
  const loaderPercent = document.getElementById('hero-loader-percent');
  const loaderBar = document.getElementById('hero-loader-bar');
  const heroLogo = document.getElementById('hero-logo');
  const loaderLogo = document.getElementById('loader-logo');

  let isLoaderDismissed = false;
  let isHandoverDone = false;
  let progressInterval = null;
  let fallbackTimer = null;

  /**
   * Garante a transparência pura da logo em tela, removendo o padrão
   * quadriculado de fundo da imagem via canvas em memória, sem alterar o arquivo em disco.
   */
  function applyLogoTransparency(imgEl) {
    if (!imgEl) return;

    const process = () => {
      try {
        const w = imgEl.naturalWidth || 816;
        const h = imgEl.naturalHeight || 816;
        if (w === 0 || h === 0) return;

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(imgEl, 0, 0);

        const imgData = ctx.getImageData(0, 0, w, h);
        const data = imgData.data;

        // Identifica pixels neutros claros do padrão de fundo externo
        const isBg = (x, y) => {
          const idx = (y * w + x) * 4;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          return r > 165 && g > 165 && b > 165 && Math.abs(r - g) < 22 && Math.abs(g - b) < 22;
        };

        const visited = new Uint8Array(w * h);
        const queue = new Int32Array(w * h);
        let head = 0, tail = 0;

        // Inicia flood-fill a partir das bordas externas
        for (let x = 0; x < w; x++) {
          if (isBg(x, 0)) { queue[tail++] = x; visited[x] = 1; }
          const btm = (h - 1) * w + x;
          if (isBg(x, h - 1) && !visited[btm]) { queue[tail++] = btm; visited[btm] = 1; }
        }
        for (let y = 0; y < h; y++) {
          const lft = y * w;
          if (isBg(0, y) && !visited[lft]) { queue[tail++] = lft; visited[lft] = 1; }
          const rgt = y * w + (w - 1);
          if (isBg(w - 1, y) && !visited[rgt]) { queue[tail++] = rgt; visited[rgt] = 1; }
        }

        // Executa BFS flood-fill tornando o fundo externo transparente (Alpha = 0)
        while (head < tail) {
          const pos = queue[head++];
          data[pos * 4 + 3] = 0;

          const px = pos % w;
          const py = (pos / w) | 0;

          if (px > 0) {
            const n = pos - 1;
            if (!visited[n] && isBg(px - 1, py)) { visited[n] = 1; queue[tail++] = n; }
          }
          if (px < w - 1) {
            const n = pos + 1;
            if (!visited[n] && isBg(px + 1, py)) { visited[n] = 1; queue[tail++] = n; }
          }
          if (py > 0) {
            const n = pos - w;
            if (!visited[n] && isBg(px, py - 1)) { visited[n] = 1; queue[tail++] = n; }
          }
          if (py < h - 1) {
            const n = pos + w;
            if (!visited[n] && isBg(px, py + 1)) { visited[n] = 1; queue[tail++] = n; }
          }
        }

        ctx.putImageData(imgData, 0, 0);
        imgEl.src = canvas.toDataURL('image/png');
      } catch (err) {
        console.warn('Gabriel Motors: Logotipo renderizado com fallback padrão.', err);
      }
    };

    if (imgEl.complete && imgEl.naturalWidth > 0) {
      process();
    } else {
      imgEl.addEventListener('load', process, { once: true });
    }
  }

  const heroTitleImg = document.getElementById('hero-title-img');


  /**
   * Garante a transparência pura do PNG do título ("A PRÓXIMA CURVA PODE SER SUA."),
   * removendo o padrão quadriculado de fundo via canvas em memória sem alterar o arquivo em disco.
   */
  function applyTitleTransparency(imgEl) {
    if (!imgEl) return;

    const process = () => {
      try {
        const w = imgEl.naturalWidth || 1024;
        const h = imgEl.naturalHeight || 438;
        if (w === 0 || h === 0) return;

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(imgEl, 0, 0);

        const imgData = ctx.getImageData(0, 0, w, h);
        const data = imgData.data;

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const diff = Math.max(Math.abs(r - g), Math.abs(r - b), Math.abs(g - b));

          // Padrão de fundo quadriculado (cinzas neutros ~124 ou ~184)
          if (diff <= 9 && r < 192) {
            data[i + 3] = 0;
          } else if (r > 192 && g > 192 && b > 192) {
            // Letras brancas nítidas
            data[i + 3] = 255;
          } else if (r > 140 && g > 120 && b < 100) {
            // Letras amarelas e traço nítidos
            data[i + 3] = 255;
          } else if (diff <= 14 && r < 205) {
            // Transição suave nas bordas de pincel seco
            const factor = (r - 124) / (255 - 124);
            const a = Math.min(255, Math.max(0, Math.round(factor * 255)));
            data[i + 3] = a < 25 ? 0 : a;
          }
        }

        ctx.putImageData(imgData, 0, 0);
        imgEl.src = canvas.toDataURL('image/png');
      } catch (err) {
        console.warn('Gabriel Motors: Título renderizado com fallback padrão.', err);
      }
    };

    if (imgEl.complete && imgEl.naturalWidth > 0) {
      process();
    } else {
      imgEl.addEventListener('load', process, { once: true });
    }
  }


  const stylesTitleImg = document.getElementById('styles-title-img');

  /**
   * Garante a transparência pura do PNG do título da Seção 2 ("ESCOLHA O ESTILO DA SUA PRÓXIMA MOTO"),
   * removendo o padrão quadriculado escuro via canvas em memória sem alterar o arquivo em disco.
   */
  function applySection2TitleTransparency(imgEl) {
    if (!imgEl) return;

    const process = () => {
      try {
        const w = imgEl.naturalWidth || 1024;
        const h = imgEl.naturalHeight || 285;
        if (w === 0 || h === 0) return;

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(imgEl, 0, 0);

        const imgData = ctx.getImageData(0, 0, w, h);
        const data = imgData.data;

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const diff = Math.max(Math.abs(r - g), Math.abs(r - b), Math.abs(g - b));

          // Padrão de fundo quadriculado (cinzas neutros ~40 e ~90, diff <= 6 e r <= 98)
          if (diff <= 6 && r <= 98) {
            data[i + 3] = 0;
          } else if (r > 160 && diff <= 15) {
            // Letras brancas nítidas
            data[i + 3] = 255;
          } else if (r > 110 && g > 100 && b < 80) {
            // Letras amarelas e traço nítidos
            data[i + 3] = 255;
          } else if (diff <= 15 && r > 98 && r <= 160) {
            // Transição suave nas bordas de pincel seco
            const factor = (r - 98) / (160 - 98);
            const a = Math.min(255, Math.max(0, Math.round(factor * 255)));
            data[i + 3] = a < 25 ? 0 : a;
          }
        }

        ctx.putImageData(imgData, 0, 0);
        imgEl.src = canvas.toDataURL('image/png');
      } catch (err) {
        console.warn('Gabriel Motors: Título da Seção 2 renderizado com fallback padrão.', err);
      }
    };

    if (imgEl.complete && imgEl.naturalWidth > 0) {
      process();
    } else {
      imgEl.addEventListener('load', process, { once: true });
    }
  }


  // =========================================================================
  // 1. TELA DE CARREGAMENTO (LOADING EM TEMPO REAL)
  // =========================================================================

  /**
   * Calcula o percentual de carregamento (buffered) de um vídeo específico.
   */
  function getVideoProgress(videoEl) {
    if (!videoEl) return 100;
    
    // Se o readyState já atingiu canplaythrough
    if (videoEl.readyState >= 4) {
      return 100;
    }

    if (videoEl.duration && videoEl.duration > 0) {
      const b = videoEl.buffered;
      if (b && b.length > 0) {
        const bufferedEnd = b.end(b.length - 1);
        const pct = (bufferedEnd / videoEl.duration) * 100;
        return Math.min(99, Math.max(pct, videoEl.readyState >= 3 ? 60 : (videoEl.readyState >= 2 ? 30 : 10)));
      }
    }

    if (videoEl.readyState >= 3) return 60;
    if (videoEl.readyState >= 2) return 30;
    if (videoEl.readyState >= 1) return 15;
    return 5;
  }

  /**
   * Atualiza a interface da barra e porcentagem do loader
   */
  function updateProgressUI(pct) {
    const clamped = Math.min(100, Math.max(0, Math.round(pct)));
    if (loaderPercent) {
      loaderPercent.textContent = `${clamped}%`;
    }
    if (loaderBar) {
      loaderBar.style.width = `${clamped}%`;
    }
    if (loader) {
      loader.setAttribute('aria-valuenow', clamped.toString());
    }
  }

  /**
   * Remove a tela de carregamento com fade-out de 500ms e inicia o vídeo intro
   */
  function dismissLoaderAndStart() {
    if (isLoaderDismissed) return;
    isLoaderDismissed = true;

    if (progressInterval) {
      clearInterval(progressInterval);
      progressInterval = null;
    }
    if (fallbackTimer) {
      clearTimeout(fallbackTimer);
      fallbackTimer = null;
    }

    updateProgressUI(100);

    // Exibe 100% por 300ms antes do fade-out do overlay
    setTimeout(() => {
      if (loader) {
        loader.classList.add('is-hidden');
      }

      // Garante que o vídeo de loop permaneça pausado no início até a intro terminar
      if (loopVideo) {
        try {
          loopVideo.pause();
          loopVideo.currentTime = 0;
        } catch (e) {
          /* no-op */
        }
      }

      // Inicia a reprodução do vídeo da introdução
      if (introVideo) {
        const playPromise = introVideo.play();
        if (playPromise !== undefined) {
          playPromise.catch((err) => {
            console.info('Gabriel Motors: Autoplay restringido pelo navegador.', err);
            // Fallback imediato: se o autoplay for bloqueado, revela o conteúdo da Hero
            triggerHeroText('autoplay restriction fallback');
          });
        }
      }

      // Fallback de segurança para garantir a entrada do texto caso o evento timeupdate não dispare
      setTimeout(() => {
        if (!textShown) {
          triggerHeroText('safety timeout 7.5s fallback');
        }
      }, 7500);
    }, 300);
  }

  /**
   * Verifica se ambos os vídeos estão prontos para exibição sem travar a tela
   */
  function checkVideosReady() {
    if (isLoaderDismissed) return;

    // Com preload="metadata", readyState >= 2 (HAVE_CURRENT_DATA) ou superior é suficiente para reprodução imediata
    const introReady = !introVideo || introVideo.readyState >= 2;
    const loopReady = !loopVideo || loopVideo.readyState >= 1;

    const introPct = getVideoProgress(introVideo);
    const loopPct = getVideoProgress(loopVideo);
    const avgPct = (introPct * 0.5) + (loopPct * 0.5);

    updateProgressUI(avgPct);

    if (introReady && loopReady) {
      dismissLoaderAndStart();
    }
  }

  // Monitora o progresso em tempo real a cada 60ms
  progressInterval = setInterval(checkVideosReady, 60);

  // Listeners de eventos de buffer e prontidão em ambos os vídeos
  [introVideo, loopVideo].forEach((v) => {
    if (!v) return;
    v.addEventListener('progress', checkVideosReady);
    v.addEventListener('loadedmetadata', checkVideosReady);
    v.addEventListener('canplay', checkVideosReady);
    v.addEventListener('canplaythrough', checkVideosReady);
    v.addEventListener('loadeddata', checkVideosReady);
  });

  // Fallback de segurança: se em 12 segundos os vídeos não estiverem prontos, inicia mesmo assim
  fallbackTimer = setTimeout(() => {
    if (!isLoaderDismissed) {
      console.warn('Gabriel Motors: Fallback de 12s ativado para liberação da Hero.');
      dismissLoaderAndStart();
    }
  }, 12000);

  // =========================================================================
  // 2. TIMING E TRANSIÇÃO DA HERO: INTRO -> LOOP (COM ENTRADA DO TEXTO AOS 6,0s)
  // =========================================================================

  // Constante configurável exigida: segundo exato em que o texto deve começar a entrar
  const HERO_TEXT_SHOW_AT = 6.0;

  // Flag de execução única: garante que o texto só dispara uma vez e nunca some
  let textShown = false;
  let loopCycleCount = 0;

  /**
   * Dispara a entrada suave do texto editorial.
   * Executa exatamente uma vez por sessão e nunca remove a classe .show.
   */
  function triggerHeroText(triggerReason) {
    if (textShown) return;
    textShown = true;

    if (heroText) {
      heroText.classList.add('show');
    }
  }

  function handoverToLoop() {
    if (isHandoverDone) return;
    isHandoverDone = true;

    if (loopVideo) {
      // Garante que o loop inicie exatamente do início do arquivo hero.2
      try {
        loopVideo.currentTime = 0;
      } catch (e) {
        /* no-op */
      }

      // Dispara play no vídeo do loop
      const loopPromise = loopVideo.play();
      if (loopPromise !== undefined) {
        loopPromise.catch((err) => {
          console.warn('[Hero Animation] Falha ao iniciar vídeo do loop.', err);
          if (!textShown) {
            triggerHeroText('loop play failure fallback');
          }
        });
      }

      // Crossfade de 300ms via CSS (intro esmaece para 0, loop surge para 1)
      if (introVideo) {
        introVideo.classList.add('is-faded');
      }
      loopVideo.classList.add('is-active');
    }
  }

  if (introVideo) {
    // Monitora o tempo exato para disparar aos 6.0s
    introVideo.addEventListener('timeupdate', () => {
      if (!textShown && introVideo.currentTime >= HERO_TEXT_SHOW_AT) {
        triggerHeroText(`introVideo.currentTime >= ${HERO_TEXT_SHOW_AT}s`);
      }
    });

    // Ao disparar o evento "ended" da intro (executa uma única vez)
    introVideo.addEventListener('ended', () => {
      if (!textShown) {
        triggerHeroText('introVideo ended fallback');
      }
      handoverToLoop();
    });

    // Fallback caso o evento ended falhe por travamento do arquivo de vídeo
    introVideo.addEventListener('error', (err) => {
      console.warn('[Hero Animation] Erro na reprodução da intro, alternando para o loop.', err);
      if (!textShown) {
        triggerHeroText('introVideo error fallback');
      }
      handoverToLoop();
    });
  }

  if (loopVideo) {
    loopVideo.addEventListener('play', () => {
    });

    // Fallback caso ocorra erro no loop
    loopVideo.addEventListener('error', (err) => {
      console.warn('[Hero Animation] Erro na reprodução do loop.', err);
      if (!textShown) {
        triggerHeroText('loopVideo error fallback');
      }
    });

    // Monitora os ciclos de loop para certificar a permanência eterna do texto
    loopVideo.addEventListener('seeked', () => {
      loopCycleCount++;
    });
  }

  // =========================================================================
  // 3. MENU HAMBÚRGUER (ABERTURA POR HOVER/TOUCH, ANIMAÇÃO E FECHAMENTO)
  // =========================================================================

  const menuToggle = document.getElementById('hero-menu-toggle');
  const menuDrawer = document.getElementById('hero-drawer');
  const drawerBackdrop = document.getElementById('hero-drawer-backdrop');
  const drawerCloseBtn = document.getElementById('hero-drawer-close');
  const drawerLinks = document.querySelectorAll('.hero__drawer-link');

  let isDrawerOpen = false;
  let drawerHoverTimer = null;

  function openDrawer() {
    if (drawerHoverTimer) {
      clearTimeout(drawerHoverTimer);
      drawerHoverTimer = null;
    }
    if (isDrawerOpen) return;
    isDrawerOpen = true;

    if (menuDrawer) {
      menuDrawer.classList.add('is-open');
      menuDrawer.setAttribute('aria-hidden', 'false');
    }
    if (drawerBackdrop) {
      drawerBackdrop.classList.add('is-open');
      drawerBackdrop.setAttribute('aria-hidden', 'false');
    }
    if (menuToggle) {
      menuToggle.setAttribute('aria-expanded', 'true');
    }
  }

  function closeDrawer() {
    if (drawerHoverTimer) {
      clearTimeout(drawerHoverTimer);
      drawerHoverTimer = null;
    }
    if (!isDrawerOpen) return;
    isDrawerOpen = false;

    if (menuDrawer) {
      menuDrawer.classList.remove('is-open');
      menuDrawer.setAttribute('aria-hidden', 'true');
    }
    if (drawerBackdrop) {
      drawerBackdrop.classList.remove('is-open');
      drawerBackdrop.setAttribute('aria-hidden', 'true');
    }
    if (menuToggle) {
      menuToggle.setAttribute('aria-expanded', 'false');
    }
  }

  function scheduleCloseDrawer(delay = 350) {
    if (drawerHoverTimer) clearTimeout(drawerHoverTimer);
    drawerHoverTimer = setTimeout(() => {
      closeDrawer();
    }, delay);
  }

  function cancelCloseDrawer() {
    if (drawerHoverTimer) {
      clearTimeout(drawerHoverTimer);
      drawerHoverTimer = null;
    }
  }

  // Suporte a hover no Desktop (com ponteiro fino)
  const isFinePointer = window.matchMedia('(hover: hover) and (pointer: fine)');

  if (menuToggle) {
    // Clique ou toque: alternância manual
    menuToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      if (isDrawerOpen) {
        closeDrawer();
      } else {
        openDrawer();
      }
    });

    // Hover no botão hambúrguer (desktop)
    menuToggle.addEventListener('mouseenter', () => {
      if (isFinePointer.matches) {
        openDrawer();
      }
    });

    menuToggle.addEventListener('mouseleave', () => {
      if (isFinePointer.matches) {
        scheduleCloseDrawer(350);
      }
    });
  }

  if (menuDrawer) {
    // Se o ponteiro entrar no drawer, cancela o timer de fechamento
    menuDrawer.addEventListener('mouseenter', () => {
      if (isFinePointer.matches) {
        cancelCloseDrawer();
      }
    });

    // Se o ponteiro sair do drawer, fecha após debounce
    menuDrawer.addEventListener('mouseleave', () => {
      if (isFinePointer.matches) {
        scheduleCloseDrawer(350);
      }
    });
  }

  // Botão fechar (X)
  if (drawerCloseBtn) {
    drawerCloseBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      closeDrawer();
    });
  }

  // Fechar ao clicar fora (backdrop)
  if (drawerBackdrop) {
    drawerBackdrop.addEventListener('click', () => {
      closeDrawer();
    });
  }

  // Fechar ao clicar em qualquer link do menu
  drawerLinks.forEach((link) => {
    link.addEventListener('click', (e) => {
      const targetId = link.getAttribute('href');
      closeDrawer();

      if (targetId && targetId.startsWith('#')) {
        const targetEl = document.querySelector(targetId);
        if (targetEl) {
          e.preventDefault();
          targetEl.scrollIntoView({
            behavior: prefersReducedMotion.matches ? 'auto' : 'smooth',
            block: 'start'
          });
        }
      }
    });
  });

  // Fechar ao pressionar a tecla Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isDrawerOpen) {
      closeDrawer();
      if (menuToggle) menuToggle.focus();
    }
  });

  // =========================================================================
  // 4. ROLAGEM E ACESSIBILIDADE
  // =========================================================================

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  function scrollToCategories(event) {
    if (event) event.preventDefault();
    if (!categoriesSection) return;

    categoriesSection.scrollIntoView({
      behavior: prefersReducedMotion.matches ? 'auto' : 'smooth',
      block: 'start'
    });

    const sectionTitle = document.getElementById('categorias-titulo');
    if (sectionTitle) {
      sectionTitle.setAttribute('tabindex', '-1');
      sectionTitle.focus({ preventScroll: true });
    }
  }

  if (scrollIndicator) {
    scrollIndicator.addEventListener('click', scrollToCategories);
  }

  // =========================================================================
  // 5. PILHA DE CARTAS DE ESTILOS DE MOTO (SEÇÃO 2 — DECK STACK)
  // =========================================================================

  const styleCards = Array.from(document.querySelectorAll('.style-card'));
  const styleProgressBars = Array.from(document.querySelectorAll('.styles-progress__bar'));
  const btnStylePrev = document.getElementById('styles-prev');
  const btnStyleNext = document.getElementById('styles-next');
  const deckContainer = document.getElementById('styles-deck-container');

  // Mapeamento das cartas da Sessão 2 para categorias da grade de estoque
  const STYLE_INDEX_TO_CATEGORY = ['Urbana', 'Alta Performance', 'Aventura', 'Dia a dia', 'Todas'];
  // Carta -> moto aberta no modal (a carta "Todas" não abre modal)
  const MOTO_MAP = { 0: 1, 1: 5, 2: 4, 3: 6 };

  const TOTAL_CARDS = styleCards.length;
  // Ao entrar no site, começa em "Todas as categorias" para mostrar o estoque inteiro
  const START_INDEX = STYLE_INDEX_TO_CATEGORY.indexOf('Todas');
  let currentStyleIndex = START_INDEX;  // carta-alvo (inteiro)
  let deckPos = START_INDEX;            // posição contínua animada
  let deckVel = 0;
  let deckTarget = START_INDEX;
  let deckRaf = null;
  let lastSettled = START_INDEX;

  // Coverflow: tudo é calculado a partir da distância contínua de cada carta ao centro
  const wrapDelta = (d) => {
    const half = TOTAL_CARDS / 2;
    return ((((d + half) % TOTAL_CARDS) + TOTAL_CARDS) % TOTAL_CARDS) - half;
  };

  function deckMetrics() {
    const w = styleCards[0] ? styleCards[0].offsetWidth : 300;
    const mobile = window.innerWidth <= 768;
    return {
      step: mobile ? w * 0.2 : w * 0.8,
      step2: mobile ? w * 0.11 : w * 0.44,
      rot: mobile ? 16 : 26,
      depth: mobile ? 90 : 170
    };
  }

  function renderDeck() {
    const m = deckMetrics();
    styleCards.forEach((card, idx) => {
      const d = wrapDelta(idx - deckPos);
      const ad = Math.abs(d);
      const sign = Math.sign(d);
      const near = Math.min(ad, 1);
      const far = Math.max(0, Math.min(ad - 1, 1.2));
      const x = sign * (near * m.step + far * m.step2);
      const z = -(near * m.depth + far * m.depth * 0.55);
      const ry = -sign * Math.min(ad, 1) * m.rot;
      const sc = 1.03 - Math.min(ad, 2.2) * 0.075;
      const bright = Math.max(0.28, 1 - ad * 0.36);
      const op = ad > 2.35 ? 0 : Math.max(0, Math.min(1, 2.6 - ad));
      card.style.transform = `translate3d(${x.toFixed(2)}px,0,${z.toFixed(1)}px) rotateY(${ry.toFixed(2)}deg) scale(${sc.toFixed(4)})`;
      card.style.filter = `brightness(${bright.toFixed(3)}) saturate(${(0.7 + 0.3 * (1 - Math.min(ad, 1))).toFixed(3)})`;
      card.style.opacity = op.toFixed(3);
      card.style.zIndex = String(100 - Math.round(ad * 10));
      const pos = Math.round(d);
      card.dataset.pos = String(pos);
      const active = ad < 0.5;
      card.classList.toggle('is-active', active);
      card.setAttribute('aria-selected', active ? 'true' : 'false');
      card.setAttribute('tabindex', active ? '0' : '-1');
    });
  }

  function animateDeck() {
    // Mola criticamente amortecida: chega rápido, sem quicar demais
    const k = 0.085, damp = 0.72;
    const diff = wrapDelta(deckTarget - deckPos);
    deckVel = deckVel * damp + diff * k;
    deckPos += deckVel;
    renderDeck();
    if (Math.abs(diff) < 0.0015 && Math.abs(deckVel) < 0.0015) {
      deckPos = deckTarget;
      deckVel = 0;
      renderDeck();
      deckRaf = null;
      onDeckSettled();
      return;
    }
    deckRaf = requestAnimationFrame(animateDeck);
  }

  function kickDeck() {
    if (prefersReducedMotion.matches) {
      deckPos = deckTarget; renderDeck(); onDeckSettled(); return;
    }
    if (!deckRaf) deckRaf = requestAnimationFrame(animateDeck);
  }

  function onDeckSettled() {
    const idx = ((Math.round(deckPos) % TOTAL_CARDS) + TOTAL_CARDS) % TOTAL_CARDS;
    if (idx === lastSettled) return;
    lastSettled = idx;
    const card = styleCards[idx];
    if (card && !prefersReducedMotion.matches) {
      card.classList.remove('is-sweep');
      void card.offsetWidth;
      card.classList.add('is-sweep');
    }
  }

  const STYLE_LABELS = ['Urbana · Naked', 'Alta Performance · Esportiva', 'Aventura · Big Trail', 'Dia a dia · Versátil', 'Todas as categorias'];
  const filterHint = document.getElementById('styles-filter-now');
  function updateProgress() {
    styleProgressBars.forEach((bar, idx) => bar.classList.toggle('is-active', idx === currentStyleIndex));
    if (filterHint) filterHint.textContent = STYLE_LABELS[currentStyleIndex] || '';
  }

  function setActiveStyle(index) {
    if (!TOTAL_CARDS) return;
    const targetIndex = ((index % TOTAL_CARDS) + TOTAL_CARDS) % TOTAL_CARDS;
    // anda pelo caminho mais curto, mantendo a posição contínua
    deckTarget = deckPos + wrapDelta(targetIndex - deckPos);
    deckTarget = Math.round(deckTarget);
    currentStyleIndex = targetIndex;
    updateProgress();
    syncGridWithActiveStyle(targetIndex);
    kickDeck();
  }

  renderDeck();
  updateProgress();
  window.addEventListener('resize', renderDeck);

  btnStylePrev?.addEventListener('click', () => setActiveStyle(currentStyleIndex - 1));
  btnStyleNext?.addEventListener('click', () => setActiveStyle(currentStyleIndex + 1));
  styleProgressBars.forEach((bar) => {
    bar.addEventListener('click', () => {
      const idx = parseInt(bar.dataset.index, 10);
      if (!isNaN(idx)) setActiveStyle(idx);
    });
  });

  // Clique: carta lateral vem para a frente; carta da frente abre a moto
  let suppressClick = false;
  styleCards.forEach((card) => {
    card.addEventListener('click', () => {
      if (suppressClick) return;
      const idx = parseInt(card.dataset.index, 10);
      if (isNaN(idx)) return;
      if (idx !== currentStyleIndex) { setActiveStyle(idx); return; }
      document.getElementById('filtro-motos')?.scrollIntoView({ behavior: prefersReducedMotion.matches ? 'auto' : 'smooth' });
    });
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); card.click(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); setActiveStyle(currentStyleIndex - 1); styleCards[currentStyleIndex].focus({ preventScroll: true }); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); setActiveStyle(currentStyleIndex + 1); styleCards[currentStyleIndex].focus({ preventScroll: true }); }
    });

  });

  // Arrastar com dedo ou mouse: as cartas seguem o gesto e soltam com inércia
  let dragging = false, dragStartX = 0, dragStartY = 0, dragStartPos = 0, lastX = 0, lastT = 0, flingV = 0, dragAxis = null;
  if (deckContainer) {
    deckContainer.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      dragging = true; dragAxis = null; suppressClick = false;
      dragStartX = lastX = e.clientX; dragStartY = e.clientY; lastT = performance.now();
      dragStartPos = deckPos; flingV = 0;
      if (deckRaf) { cancelAnimationFrame(deckRaf); deckRaf = null; }
      deckVel = 0;
    });
    window.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const dx = e.clientX - dragStartX, dy = e.clientY - dragStartY;
      if (!dragAxis) {
        if (Math.abs(dx) > 6 && Math.abs(dx) > Math.abs(dy)) { dragAxis = 'x'; deckContainer.classList.add('is-dragging'); try { deckContainer.setPointerCapture(e.pointerId); } catch (_) {} }
        else if (Math.abs(dy) > 8) { dragAxis = 'y'; dragging = false; deckTarget = Math.round(deckPos); kickDeck(); return; }
        else return;
      }
      const m = deckMetrics();
      deckPos = dragStartPos - dx / (m.step * 1.05);
      const now = performance.now();
      const dt = Math.max(1, now - lastT);
      flingV = 0.8 * flingV + 0.2 * ((e.clientX - lastX) / dt);
      lastX = e.clientX; lastT = now;
      renderDeck();
    });
    const endDrag = () => {
      if (!dragging) return;
      dragging = false;
      deckContainer.classList.remove('is-dragging');
      if (dragAxis === 'x') {
        suppressClick = true;
        setTimeout(() => { suppressClick = false; }, 60);
        const m = deckMetrics();
        const projected = deckPos - (flingV * 220) / m.step;
        let target = Math.round(projected);
        target = Math.max(Math.round(dragStartPos) - 2, Math.min(Math.round(dragStartPos) + 2, target));
        const idx = ((target % TOTAL_CARDS) + TOTAL_CARDS) % TOTAL_CARDS;
        deckTarget = target;
        deckVel = -(flingV * 16) / m.step;
        currentStyleIndex = idx;
        updateProgress();
        syncGridWithActiveStyle(idx);
        kickDeck();
      }
      dragAxis = null;
    };
    window.addEventListener('pointerup', endDrag);
    window.addEventListener('pointercancel', endDrag);
  }

  // =========================================================================
  // 6. ÁREA DE MODAIS DE MOTOCICLETAS E POP-UP DE FAVORITAR (SESSÃO 2)
  // =========================================================================

  const WHATSAPP_NUMBER = '5519999999999';

  // Estoque do site. "selo" aceita: destaque | vendida | oferta (ou vazio)
  // Estoque do site (valores de exemplo: ano, km, cidade e preço devem ser confirmados pela loja).
  // "selo" aceita: destaque | vendida | oferta (ou vazio)
  const MOTOS_DATA = [
    { id: 1, categoria: "Alta Performance", marca: "BMW", modelo: "BMW S 1000 RR", cor: "M Motorsport", imagem: "assets/img/estoque/01-bmw-s1000rr-2026.webp", ano: 2025, km: 1200, cidade: "Campinas (SP)", preco: 154900, selo: "destaque" },
    { id: 2, categoria: "Alta Performance", marca: "BMW", modelo: "BMW S 1000 RR", cor: "Motorsport", imagem: "assets/img/estoque/02-bmw-s1000rr-2015.webp", ano: 2015, km: 31000, cidade: "Americana (SP)", preco: 72900, selo: "" },
    { id: 3, categoria: "Alta Performance", marca: "HONDA", modelo: "Honda CBR 1000RR-R Fireblade SP", cor: "Tricolor", imagem: "assets/img/estoque/03-cbr1000rr-fireblade.webp", ano: 2022, km: 8400, cidade: "Sumaré (SP)", preco: 139900, selo: "vendida" },
    { id: 4, categoria: "Alta Performance", marca: "KAWASAKI", modelo: "Kawasaki Ninja ZX-10R", cor: "Preta", imagem: "assets/img/estoque/04-kawasaki-zx10r-2010.webp", ano: 2010, km: 38500, cidade: "Indaiatuba (SP)", preco: 49900, selo: "oferta" },
    { id: 5, categoria: "Alta Performance", marca: "SUZUKI", modelo: "Suzuki Hayabusa", cor: "Preta e prata", imagem: "assets/img/estoque/05-hayabusa.webp", ano: 2018, km: 22000, cidade: "Campinas (SP)", preco: 79900, selo: "" },
    { id: 6, categoria: "Alta Performance", marca: "KAWASAKI", modelo: "Kawasaki Ninja ZX-6R", cor: "Cinza grafite", imagem: "assets/img/estoque/06-kawasaki-zx6r.webp", ano: 2024, km: 3000, cidade: "Porto Feliz (SP)", preco: 79900, selo: "" },
    { id: 7, categoria: "Urbana", marca: "KAWASAKI", modelo: "Kawasaki Z900", cor: "Preta", imagem: "assets/img/estoque/07-kawasaki-z900.webp", ano: 2024, km: 2100, cidade: "Sumaré (SP)", preco: 62900, selo: "destaque" },
    { id: 8, categoria: "Urbana", marca: "KAWASAKI", modelo: "Kawasaki Z800", cor: "Preta", imagem: "assets/img/estoque/08-kawasaki-z800.webp", ano: 2016, km: 27000, cidade: "Hortolândia (SP)", preco: 36900, selo: "" },
    { id: 9, categoria: "Urbana", marca: "HONDA", modelo: "Honda CB 600F Hornet", cor: "Vermelha", imagem: "assets/img/estoque/09-cb600f-hornet.webp", ano: 2015, km: 34000, cidade: "Americana (SP)", preco: 36500, selo: "vendida" },
    { id: 10, categoria: "Urbana", marca: "YAMAHA", modelo: "Yamaha XJ6 N", cor: "Azul", imagem: "assets/img/estoque/10-yamaha-xj6.webp", ano: 2015, km: 29000, cidade: "Campinas (SP)", preco: 31900, selo: "" },
    { id: 11, categoria: "Urbana", marca: "KAWASAKI", modelo: "Kawasaki Z750", cor: "Grafite", imagem: "assets/img/estoque/11-kawasaki-z750.webp", ano: 2012, km: 41000, cidade: "Sumaré (SP)", preco: 29900, selo: "oferta" },
    { id: 12, categoria: "Urbana", marca: "HONDA", modelo: "Honda CB 650R", cor: "Preta fosca", imagem: "assets/img/estoque/12-cb650r.webp", ano: 2024, km: 1800, cidade: "Valinhos (SP)", preco: 52900, selo: "" },
    { id: 13, categoria: "Aventura", marca: "CFMOTO", modelo: "CFMOTO Ibex 450", cor: "Azul", imagem: "assets/img/estoque/13-cfmoto-ibex450.webp", ano: 2025, km: 900, cidade: "Campinas (SP)", preco: 39900, selo: "destaque" },
    { id: 14, categoria: "Aventura", marca: "TRIUMPH", modelo: "Triumph Tiger 800 XC", cor: "Branca", imagem: "assets/img/estoque/14-triumph-tiger800.webp", ano: 2018, km: 36000, cidade: "Indaiatuba (SP)", preco: 49900, selo: "" },
    { id: 15, categoria: "Aventura", marca: "BMW", modelo: "BMW R 1250 GS HP", cor: "Branca e azul", imagem: "assets/img/estoque/15-bmw-r1250gs.webp", ano: 2022, km: 18000, cidade: "Campinas (SP)", preco: 104900, selo: "vendida" },
    { id: 16, categoria: "Aventura", marca: "HONDA", modelo: "Honda CRF1100L Africa Twin", cor: "Tricolor", imagem: "assets/img/estoque/16-africa-twin.webp", ano: 2019, km: 24000, cidade: "Sumaré (SP)", preco: 69900, selo: "" },
    { id: 17, categoria: "Aventura", marca: "YAMAHA", modelo: "Yamaha Ténéré 700", cor: "Azul", imagem: "assets/img/estoque/17-yamaha-tenere700.webp", ano: 2023, km: 9800, cidade: "Americana (SP)", preco: 64900, selo: "" },
    { id: 18, categoria: "Dia a dia", marca: "HONDA", modelo: "Honda CG 160 Titan", cor: "Vermelha", imagem: "assets/img/estoque/18-cg160-titan-vermelha.webp", ano: 2024, km: 4500, cidade: "Sumaré (SP)", preco: 18900, selo: "vendida" },
    { id: 19, categoria: "Dia a dia", marca: "HONDA", modelo: "Honda CG 160 Titan", cor: "Preta", imagem: "assets/img/estoque/19-cg160-titan-preta.webp", ano: 2024, km: 7200, cidade: "Hortolândia (SP)", preco: 18500, selo: "" },
    { id: 20, categoria: "Dia a dia", marca: "HONDA", modelo: "Honda CG 160 Titan", cor: "Prata", imagem: "assets/img/estoque/20-cg160-titan-prata.webp", ano: 2024, km: 2300, cidade: "Americana (SP)", preco: 19200, selo: "" },
    { id: 21, categoria: "Dia a dia", marca: "HAOJUE", modelo: "Haojue DR 160", cor: "Vermelha", imagem: "assets/img/estoque/21-haojue-dr160-vermelha.webp", ano: 2024, km: 1200, cidade: "Sumaré (SP)", preco: 15900, selo: "oferta" },
    { id: 22, categoria: "Dia a dia", marca: "HAOJUE", modelo: "Haojue DR 160", cor: "Preta", imagem: "assets/img/estoque/22-haojue-dr160-preta.webp", ano: 2024, km: 3400, cidade: "Campinas (SP)", preco: 15500, selo: "" },
    { id: 23, categoria: "Dia a dia", marca: "HONDA", modelo: "Honda CB 300F Twister", cor: "Vermelha", imagem: "assets/img/estoque/23-cb300f-twister.webp", ano: 2024, km: 3900, cidade: "Sumaré (SP)", preco: 24900, selo: "" },
    { id: 24, categoria: "Dia a dia", marca: "HONDA", modelo: "Honda XRE 300", cor: "Vermelha e branca", imagem: "assets/img/estoque/24-xre300.webp", ano: 2021, km: 21000, cidade: "Indaiatuba (SP)", preco: 22900, selo: "" },
    { id: 25, categoria: "Dia a dia", marca: "YAMAHA", modelo: "Yamaha Fazer FZ25", cor: "Azul", imagem: "assets/img/estoque/25-fazer-fz25.webp", ano: 2024, km: 2800, cidade: "Americana (SP)", preco: 22500, selo: "" },
    { id: 26, categoria: "Dia a dia", marca: "YAMAHA", modelo: "Yamaha Factor 150", cor: "Preta", imagem: "assets/img/estoque/26-yamaha-factor150.webp", ano: 2024, km: 5100, cidade: "Sumaré (SP)", preco: 15200, selo: "" }
  ];

  const fmtPreco = (v) => 'R$ ' + v.toLocaleString('pt-BR');
  const fmtKm = (v) => v.toLocaleString('pt-BR');

  // Elementos do Modal
  const modalBackdrop = document.getElementById('moto-modal-backdrop');
  const modalCloseBtn = document.getElementById('moto-modal-close');
  const modalNavPrev = document.getElementById('modal-nav-prev');
  const modalNavNext = document.getElementById('modal-nav-next');
  const modalCategoria = document.getElementById('modal-categoria');
  const modalImg = document.getElementById('modal-img');
  const modalMarca = document.getElementById('modal-marca');
  const modalModeloTitle = document.getElementById('modal-modelo-title');
  const modalCor = document.getElementById('modal-cor');
  const modalColorPills = document.getElementById('modal-color-pills');
  const modalAno = document.getElementById('modal-ano');
  const modalKm = document.getElementById('modal-km');
  const modalCidade = document.getElementById('modal-cidade');
  const modalPreco = document.getElementById('modal-preco');
  const modalBtnFavorite = document.getElementById('modal-btn-favorite');
  const modalFavoriteText = document.getElementById('modal-favorite-text');
  const modalBtnWhatsapp = document.getElementById('modal-btn-whatsapp');

  // Elementos do Pop-up de Favoritar
  const favoritePopup = document.getElementById('favorite-popup');
  const favPopupClose = document.getElementById('fav-popup-close');
  const favoriteForm = document.getElementById('favorite-form');
  const favPhoneInput = document.getElementById('fav-phone');
  const favEmailInput = document.getElementById('fav-email');
  const favErrorMsg = document.getElementById('fav-error-msg');
  const favSuccessMsg = document.getElementById('fav-success-msg');

  let currentMotoIndex = 0; // Índice no array MOTOS_DATA
  let modalOpenedOnlyForFavorite = false;

  // Gerenciamento no localStorage (contato e lista de favoritos)
  function getStoredUser() {
    try {
      const data = localStorage.getItem('gabriel_motos_user');
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  }

  function saveStoredUser(userData) {
    try {
      localStorage.setItem('gabriel_motos_user', JSON.stringify(userData));
    } catch (e) {
      console.warn('Gabriel Motos: erro ao salvar no localStorage', e);
    }
  }

  function getFavorites() {
    try {
      const favs = localStorage.getItem('gabriel_motos_favorites');
      return favs ? JSON.parse(favs) : [];
    } catch (e) {
      return [];
    }
  }

  function isMotoFavorited(id) {
    const favs = getFavorites();
    return favs.includes(id);
  }

  function updateFavoriteButtonUI(id) {
    if (!modalBtnFavorite) return;
    const favorited = isMotoFavorited(id);
    modalBtnFavorite.classList.toggle('is-favorited', favorited);
    modalBtnFavorite.setAttribute('aria-label', favorited ? 'Favoritado' : 'Favoritar motocicleta');
    if (modalFavoriteText) {
      modalFavoriteText.textContent = favorited ? 'Favoritado' : 'Favoritar';
    }
  }

  // Máscara dinâmica de Celular: (00) 00000-0000
  function formatPhone(val) {
    const digits = val.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 2) {
      return digits ? `(${digits}` : '';
    }
    if (digits.length <= 6) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    }
    if (digits.length <= 10) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    }
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
  }

  if (favPhoneInput) {
    favPhoneInput.addEventListener('input', (e) => {
      e.target.value = formatPhone(e.target.value);
    });
  }

  // Renderização e Atualização dos Dados da Moto no Modal
  function renderMotoData(moto) {
    if (!moto) return;
    currentMotoIndex = MOTOS_DATA.findIndex(m => m.id === moto.id);
    if (currentMotoIndex === -1) currentMotoIndex = 0;

    // Transição suave de foto (transform e opacity)
    if (modalImg) {
      modalImg.style.opacity = '0';
      modalImg.style.transform = 'scale(0.97)';
      setTimeout(() => {
        modalImg.src = moto.imagem;
        modalImg.alt = `${moto.modelo} ${moto.cor}`;
        modalImg.style.opacity = '1';
        modalImg.style.transform = 'scale(1)';
      }, 150);
    }

    if (modalCategoria) modalCategoria.textContent = moto.categoria.toUpperCase();
    if (modalMarca) modalMarca.textContent = moto.marca;
    if (modalModeloTitle) modalModeloTitle.textContent = moto.modelo;
    if (modalCor) modalCor.textContent = moto.cor;
    if (modalAno) modalAno.textContent = moto.ano;
    if (modalKm) modalKm.textContent = `${fmtKm(moto.km)} km`;
    if (modalCidade) modalCidade.textContent = moto.cidade;
    if (modalPreco) modalPreco.textContent = fmtPreco(moto.preco);

    // Seletor de cores: aparece quando o mesmo modelo existe em mais de uma cor
    if (modalColorPills) {
      modalColorPills.innerHTML = '';
      const variants = MOTOS_DATA.filter(m => m.modelo === moto.modelo);
      if (variants.length > 1) {
        variants.forEach(variant => {
          const pill = document.createElement('button');
          pill.type = 'button';
          pill.className = `moto-modal__color-pill ${variant.id === moto.id ? 'is-active' : ''}`;
          pill.textContent = variant.cor;
          pill.addEventListener('click', (e) => { e.stopPropagation(); renderMotoData(variant); });
          modalColorPills.appendChild(pill);
        });
      }
    }

    // Atualiza estado visual do botão Favoritar
    updateFavoriteButtonUI(moto.id);
  }

  // Botão WhatsApp no Modal de Moto abre o fluxo de seleção de vendedor
  if (modalBtnWhatsapp) {
    modalBtnWhatsapp.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const currentMoto = MOTOS_DATA[currentMotoIndex];
      openSellerModal(currentMoto);
    });
  }

  // Clique na foto da moto para foco e detalhes
  const modalMediaTrigger = document.getElementById('modal-media-trigger');
  if (modalMediaTrigger) {
    modalMediaTrigger.addEventListener('click', () => {
      if (modalImg) {
        modalImg.style.transform = 'scale(1.03)';
        setTimeout(() => {
          if (modalImg) modalImg.style.transform = 'scale(1)';
        }, 250);
      }
    });
  }

  function openMotoModal(motoId) {
    modalOpenedOnlyForFavorite = false;
    const moto = MOTOS_DATA.find(m => m.id === motoId) || MOTOS_DATA[0];
    renderMotoData(moto);

    if (modalBackdrop) {
      modalBackdrop.classList.remove('is-hidden');
      document.body.style.overflow = 'hidden'; // impede rolagem de fundo
    }
  }

  function closeMotoModal() {
    if (favoritePopup) favoritePopup.classList.add('is-hidden');
    if (modalBackdrop) {
      modalBackdrop.classList.add('is-hidden');
      document.body.style.overflow = '';
    }
  }

  // Listeners de fechamento do Modal (botão X, clique fora no backdrop e Escape)
  if (modalCloseBtn) {
    modalCloseBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      closeMotoModal();
    });
  }

  if (modalBackdrop) {
    modalBackdrop.addEventListener('click', (e) => {
      if (e.target === modalBackdrop) {
        closeMotoModal();
      }
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modalBackdrop && !modalBackdrop.classList.contains('is-hidden')) {
      if (favoritePopup && !favoritePopup.classList.contains('is-hidden')) {
        favoritePopup.classList.add('is-hidden');
      } else {
        closeMotoModal();
      }
    }
  });

  // Abertura do Pop-up de Favoritar
  if (modalBtnFavorite) {
    modalBtnFavorite.addEventListener('click', (e) => {
      e.stopPropagation();
      const currentMoto = MOTOS_DATA[currentMotoIndex];
      if (!currentMoto) return;

      const user = getStoredUser();

      // Se já temos os dados salvos no localStorage, preenche automaticamente os campos
      if (favPhoneInput && user && user.phone) {
        favPhoneInput.value = user.phone;
      }
      if (favEmailInput && user && user.email) {
        favEmailInput.value = user.email;
      }

      if (favErrorMsg) favErrorMsg.classList.add('is-hidden');
      if (favSuccessMsg) favSuccessMsg.classList.add('is-hidden');
      if (favoriteForm) favoriteForm.style.display = 'flex';

      // Abre o pop-up sobreposto
      if (favoritePopup) {
        favoritePopup.classList.remove('is-hidden');
        if (favPhoneInput && !favPhoneInput.value) {
          favPhoneInput.focus();
        }
      }
    });
  }

  if (favPopupClose) {
    favPopupClose.addEventListener('click', (e) => {
      e.stopPropagation();
      if (favoritePopup) favoritePopup.classList.add('is-hidden');
      if (modalOpenedOnlyForFavorite) {
        closeMotoModal();
        modalOpenedOnlyForFavorite = false;
      }
    });
  }

  // Submissão do formulário de favoritos com validação e persistência no localStorage
  if (favoriteForm) {
    favoriteForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const phone = (favPhoneInput ? favPhoneInput.value : '').trim();
      const email = (favEmailInput ? favEmailInput.value : '').trim();

      // Validação de telefone (mínimo 10 dígitos)
      const cleanDigits = phone.replace(/\D/g, '');
      if (cleanDigits.length < 10) {
        if (favErrorMsg) {
          favErrorMsg.textContent = 'Por favor, insira um número de telefone celular válido.';
          favErrorMsg.classList.remove('is-hidden');
        }
        return;
      }

      // Validação de email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        if (favErrorMsg) {
          favErrorMsg.textContent = 'Por favor, insira um endereço de e-mail válido.';
          favErrorMsg.classList.remove('is-hidden');
        }
        return;
      }

      if (favErrorMsg) favErrorMsg.classList.add('is-hidden');

      // Salva no localStorage do navegador (sem backend/API)
      saveStoredUser({ phone, email });

      // Marca a moto atual como favorita no localStorage
      const currentMoto = MOTOS_DATA[currentMotoIndex];
      if (currentMoto) {
        let favs = getFavorites();
        if (!favs.includes(currentMoto.id)) {
          favs.push(currentMoto.id);
          try {
            localStorage.setItem('gabriel_motos_favorites', JSON.stringify(favs));
          } catch (err) {}
        }
        updateFavoriteButtonUI(currentMoto.id);
      }

      // Mensagem curta de confirmação
      favoriteForm.style.display = 'none';
      if (favSuccessMsg) favSuccessMsg.classList.remove('is-hidden');

      // Fecha o pop-up após breve confirmação
      setTimeout(() => {
        if (favoritePopup) favoritePopup.classList.add('is-hidden');
        if (favoriteForm) favoriteForm.style.display = 'flex';
        if (favSuccessMsg) favSuccessMsg.classList.add('is-hidden');
        if (modalOpenedOnlyForFavorite) {
          closeMotoModal();
          modalOpenedOnlyForFavorite = false;
        }
      }, 1200);
    });
  }

  // =========================================================================
  // 7. ESTOQUE — FILTROS, ORDENAÇÃO E CARDS (SINCRONIZADO COM O CARROSSEL)
  // =========================================================================
  const motosGrid = document.getElementById('motos-grid');
  const stockCount = document.getElementById('stock-count');
  const stockEmpty = document.getElementById('stock-empty');
  const fMarca = document.getElementById('f-marca');
  const fCategoria = document.getElementById('f-categoria');
  const fAno = document.getElementById('f-ano');
  const fPreco = document.getElementById('f-preco');
  const fKm = document.getElementById('f-km');
  const fOrdem = document.getElementById('f-ordem');
  const fPrecoOut = document.getElementById('f-preco-out');
  const fKmOut = document.getElementById('f-km-out');
  const filtersPanel = document.getElementById('stock-filters');
  const filtersBackdrop = document.getElementById('filters-backdrop');
  const filtersOpenBtn = document.getElementById('filters-open');
  const filtersCount = document.getElementById('filters-count');
  const filtersApplyText = document.getElementById('filters-apply-text');

  const PRECO_MAX = 160000, KM_MAX = 45000;
  const filters = { marca: '', categoria: STYLE_INDEX_TO_CATEGORY[currentStyleIndex] || 'Todas', ano: '', preco: PRECO_MAX, km: KM_MAX, ordem: 'destaque' };
  let viewMode = 'grid';

  // Opções de marca e ano vêm do próprio estoque
  const MARCA_LABEL = { BMW: 'BMW', CFMOTO: 'CFMOTO' };
  [...new Set(MOTOS_DATA.map(m => m.marca))].sort().forEach(mc => fMarca?.add(new Option(MARCA_LABEL[mc] || (mc.charAt(0) + mc.slice(1).toLowerCase()), mc)));
  [...new Set(MOTOS_DATA.map(m => m.ano))].sort((x, y) => y - x).forEach(an => fAno?.add(new Option(String(an), String(an))));
  if (fCategoria) fCategoria.value = filters.categoria;

  const SELOS = {
    destaque: { txt: 'Destaque', ico: '<svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7.1L12 17.3 5.8 21l1.6-7.1L2 9.2l7.1-.6z"/></svg>' },
    vendida:  { txt: 'Mais vendida', ico: '<svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M13.5 1.5s.8 3-1.3 5.6C10.4 9.4 8 10.8 8 14.2 8 17.4 10.2 20 12 20c-1.1-1.3-1.2-3.2.3-4.8 1.1-1.2 2.4-1.9 2.6-3.7 1.6 1.3 3.1 3.6 3.1 6.2 0 2.6-2 4.8-5.8 5.3 4.4-.1 7.8-3.2 7.8-7.6 0-5.4-4.6-8.4-6.5-13.9z"/></svg>' },
    oferta:   { txt: 'Oferta especial', ico: '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><line x1="19" y1="5" x2="5" y2="19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg>' }
  };
  const CAT_ICO = {
    'Urbana': '<svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M3 21V9l6-4v4l6-4v16H3zm14 0V3h4v18h-4z"/></svg>',
    'Alta Performance': '<svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M13 2 4 14h6l-1 8 9-12h-6z"/></svg>',
    'Aventura': '<svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M2 20 9 7l4 6 3-4 6 11z"/></svg>',
    'Dia a dia': '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>'
  };
  const ICO = {
    km: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 14l3.5-3.5"/><path d="M3.5 18a9 9 0 1 1 17 0"/></svg>',
    pin: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>',
    cor: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3" fill="currentColor"/></svg>',
    tag: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M20.6 13.4l-7.2 7.2a2 2 0 0 1-2.8 0L2 12V2h10l8.6 8.6a2 2 0 0 1 0 2.8z"/><circle cx="7" cy="7" r="1.2" fill="currentColor"/></svg>',
    heart: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>',
    wa: '<svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><path d="M17.47 14.38c-.3-.15-1.78-.88-2.06-.98-.28-.1-.48-.15-.68.15s-.78.98-.95 1.18c-.18.2-.35.23-.65.08s-1.27-.47-2.42-1.5c-.9-.8-1.5-1.79-1.68-2.09s-.02-.46.13-.61c.14-.14.3-.35.45-.53s.2-.3.3-.5.05-.38-.03-.53c-.07-.15-.68-1.63-.93-2.23-.24-.59-.49-.51-.68-.52l-.58-.01c-.2 0-.53.08-.8.38s-1.05 1.03-1.05 2.51 1.08 2.91 1.23 3.11c.15.2 2.12 3.24 5.14 4.55.72.31 1.28.5 1.72.64.72.23 1.38.2 1.9.12.58-.09 1.78-.73 2.03-1.43s.25-1.31.18-1.43c-.08-.13-.28-.2-.58-.35zM12.04 21.93a9.86 9.86 0 0 1-5.05-1.35l-.36-.21-3.76.99 1-3.66-.23-.36a9.8 9.8 0 0 1-1.48-5.16c0-5.41 4.4-9.8 9.81-9.8 2.62 0 5.08 1.02 6.93 2.87a9.74 9.74 0 0 1 2.87 6.93c0 5.41-4.4 9.81-9.73 9.81zM12.04 0C5.4 0 0 5.4 0 12.04c0 2.12.55 4.19 1.6 6.01L0 24l6.1-1.6a12 12 0 0 0 5.94 1.47c6.64 0 12.04-5.4 12.04-12.04 0-3.22-1.25-6.24-3.53-8.52A11.96 11.96 0 0 0 12.04 0z"/></svg>',
    arrow: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>'
  };
  const SELO_ORDER = { destaque: 0, vendida: 1, oferta: 2, '': 3 };

  function getFilteredMotos() {
    let list = MOTOS_DATA.filter(m =>
      (filters.categoria === 'Todas' || m.categoria === filters.categoria) &&
      (!filters.marca || m.marca === filters.marca) &&
      (!filters.ano || m.ano >= Number(filters.ano)) &&
      (filters.preco >= PRECO_MAX || m.preco <= filters.preco) &&
      (filters.km >= KM_MAX || m.km <= filters.km)
    );
    const sorters = {
      destaque: (x, y) => SELO_ORDER[x.selo || ''] - SELO_ORDER[y.selo || ''],
      recentes: (x, y) => y.ano - x.ano,
      menor: (x, y) => x.preco - y.preco,
      maior: (x, y) => y.preco - x.preco,
      km: (x, y) => x.km - y.km
    };
    return list.slice().sort(sorters[filters.ordem] || sorters.destaque);
  }

  function activeFilterCount() {
    return (filters.marca ? 1 : 0) + (filters.categoria !== 'Todas' ? 1 : 0) + (filters.ano ? 1 : 0) + (filters.preco < PRECO_MAX ? 1 : 0) + (filters.km < KM_MAX ? 1 : 0);
  }

  function updateRangeUI() {
    if (fPreco) {
      fPreco.style.setProperty('--fill', `${((filters.preco - fPreco.min) / (fPreco.max - fPreco.min)) * 100}%`);
      if (fPrecoOut) fPrecoOut.textContent = filters.preco >= PRECO_MAX ? 'Qualquer' : fmtPreco(filters.preco);
    }
    if (fKm) {
      fKm.style.setProperty('--fill', `${(filters.km / KM_MAX) * 100}%`);
      if (fKmOut) fKmOut.textContent = filters.km >= KM_MAX ? 'Qualquer' : `${fmtKm(filters.km)} km`;
    }
  }

  function cardHTML(moto) {
    const isFav = isMotoFavorited(moto.id);
    const selo = SELOS[moto.selo];
    const badge = selo
      ? `<span class="mcard__badge mcard__badge--${moto.selo}"><span class="mcard__badge-ico">${selo.ico}</span>${selo.txt}</span>`
      : `<span class="mcard__badge"><span class="mcard__badge-ico">${CAT_ICO[moto.categoria] || ''}</span>${moto.categoria}</span>`;
    const nome = `${moto.modelo}${moto.cor !== 'Padrão' ? ' ' + moto.cor : ''}`;
    return `
      <div class="mcard__media">
        <img class="mcard__photo" src="${moto.imagem}" alt="${nome}" loading="lazy" width="1200" height="900">
        ${badge}
        <button type="button" class="mcard__fav ${isFav ? 'is-favorited' : ''}" data-fav-id="${moto.id}" aria-label="Favoritar ${nome}">${ICO.heart}</button>
      </div>
      <div class="mcard__body">
        <div class="mcard__top">
          <div><span class="mcard__brand">${moto.marca}</span><h3 class="mcard__model">${nome}</h3></div>
          <span class="mcard__year">${moto.ano}</span>
        </div>
        <div class="mcard__specs">
          <span class="mcard__spec">${ICO.km}<span>${fmtKm(moto.km)} km</span></span>
          <span class="mcard__spec">${ICO.pin}<span>${moto.cidade}</span></span>
          <span class="mcard__spec">${ICO.cor}<span>${moto.cor}</span></span>
          <span class="mcard__spec">${ICO.tag}<span>${moto.categoria}</span></span>
        </div>
        <div class="mcard__foot">
          <span class="mcard__price"><small>R$</small>${moto.preco.toLocaleString('pt-BR')}</span>
          <span class="mcard__actions">
            <button type="button" class="mcard__wa" aria-label="Chamar no WhatsApp sobre ${nome}">${ICO.wa}</button>
            <span class="mcard__btn">Ver detalhes ${ICO.arrow}</span>
          </span>
        </div>
      </div>`;
  }

  function openFavoriteFor(moto) {
    currentMotoIndex = MOTOS_DATA.findIndex(m => m.id === moto.id);
    renderMotoData(MOTOS_DATA[currentMotoIndex] || moto);
    modalOpenedOnlyForFavorite = true;
    const user = getStoredUser();
    if (favPhoneInput && user && user.phone) favPhoneInput.value = user.phone;
    if (favEmailInput && user && user.email) favEmailInput.value = user.email;
    favErrorMsg?.classList.add('is-hidden');
    favSuccessMsg?.classList.add('is-hidden');
    if (favoriteForm) favoriteForm.style.display = 'flex';
    modalBackdrop?.classList.remove('is-hidden');
    document.body.style.overflow = 'hidden';
    favoritePopup?.classList.remove('is-hidden');
    if (favPhoneInput && !favPhoneInput.value) favPhoneInput.focus();
  }

  const PAGE = 9;
  let shown = PAGE;
  const moreWrap = document.getElementById('stock-more');
  const moreBtn = document.getElementById('stock-more-btn');
  moreBtn?.addEventListener('click', () => { shown += PAGE; renderMotosGrid(); });

  function renderMotosGrid() {
    if (!motosGrid) return;
    const all = getFilteredMotos();
    const motos = all.slice(0, shown);
    if (moreWrap) {
      const rest = all.length - motos.length;
      moreWrap.hidden = rest <= 0;
      if (moreBtn) moreBtn.querySelector('span').textContent = `Mostrar mais motos (${rest})`;
    }
    motosGrid.innerHTML = '';
    motosGrid.classList.toggle('is-list', viewMode === 'list');

    motos.forEach((moto, i) => {
      const card = document.createElement('article');
      card.className = 'mcard';
      card.style.setProperty('--i', i);
      card.tabIndex = 0;
      card.setAttribute('role', 'button');
      card.setAttribute('aria-label', `${moto.modelo} ${moto.cor}, ${moto.ano}, ${fmtPreco(moto.preco)}. Ver detalhes`);
      card.innerHTML = cardHTML(moto);

      card.addEventListener('click', (e) => {
        if (e.target.closest('.mcard__fav')) { e.stopPropagation(); openFavoriteFor(moto); return; }
        if (e.target.closest('.mcard__wa')) { e.stopPropagation(); openSellerModal(moto); return; }
        openMotoModal(moto.id);
      });
      card.addEventListener('keydown', (e) => {
        if ((e.key === 'Enter' || e.key === ' ') && e.target === card) { e.preventDefault(); openMotoModal(moto.id); }
      });
      motosGrid.appendChild(card);
    });

    const total = MOTOS_DATA.length;
    if (stockCount) stockCount.innerHTML = `<strong>${all.length}</strong> moto${all.length === 1 ? '' : 's'} encontrada${all.length === 1 ? '' : 's'} · ${total} no estoque`;
    if (stockEmpty) stockEmpty.hidden = all.length > 0;
    if (filtersApplyText) filtersApplyText.textContent = all.length ? `Ver ${all.length} moto${all.length > 1 ? 's' : ''}` : 'Nenhuma moto';
    const n = activeFilterCount();
    if (filtersCount) { filtersCount.hidden = n === 0; filtersCount.textContent = String(n); }
  }

  function updateGridFavoritesUI() {
    motosGrid?.querySelectorAll('.mcard__fav').forEach(btn => {
      btn.classList.toggle('is-favorited', isMotoFavorited(parseInt(btn.dataset.favId, 10)));
    });
  }

  function refreshGrid() {
    shown = PAGE;
    if (!motosGrid || prefersReducedMotion.matches) { renderMotosGrid(); return; }
    motosGrid.classList.add('is-fading');
    clearTimeout(refreshGrid._t);
    refreshGrid._t = setTimeout(() => { renderMotosGrid(); motosGrid.classList.remove('is-fading'); }, 200);
  }

  // Carrossel -> filtro de categoria
  function syncGridWithActiveStyle(styleIndex) {
    const category = STYLE_INDEX_TO_CATEGORY[styleIndex] || 'Todas';
    if (category === filters.categoria) return;
    filters.categoria = category;
    if (fCategoria) fCategoria.value = category;
    refreshGrid();
  }

  // Filtro de categoria -> carrossel
  fCategoria?.addEventListener('change', () => {
    filters.categoria = fCategoria.value;
    const idx = STYLE_INDEX_TO_CATEGORY.indexOf(filters.categoria);
    if (idx >= 0 && idx !== currentStyleIndex) {
      deckTarget = deckPos + wrapDelta(idx - deckPos); deckTarget = Math.round(deckTarget);
      currentStyleIndex = idx; updateProgress(); kickDeck();
    }
    refreshGrid();
  });
  fMarca?.addEventListener('change', () => { filters.marca = fMarca.value; refreshGrid(); });
  fAno?.addEventListener('change', () => { filters.ano = fAno.value; refreshGrid(); });
  fOrdem?.addEventListener('change', () => { filters.ordem = fOrdem.value; refreshGrid(); });
  fPreco?.addEventListener('input', () => { filters.preco = Number(fPreco.value); updateRangeUI(); refreshGrid(); });
  fKm?.addEventListener('input', () => { filters.km = Number(fKm.value); updateRangeUI(); refreshGrid(); });

  function clearFilters() {
    Object.assign(filters, { marca: '', categoria: 'Todas', ano: '', preco: PRECO_MAX, km: KM_MAX });
    if (fMarca) fMarca.value = '';
    if (fAno) fAno.value = '';
    if (fPreco) fPreco.value = PRECO_MAX;
    if (fKm) fKm.value = KM_MAX;
    if (fCategoria) fCategoria.value = 'Todas';
    const idx = STYLE_INDEX_TO_CATEGORY.indexOf('Todas');
    deckTarget = Math.round(deckPos + wrapDelta(idx - deckPos)); currentStyleIndex = idx; updateProgress(); kickDeck();
    updateRangeUI();
    refreshGrid();
  }
  document.getElementById('filters-clear')?.addEventListener('click', clearFilters);
  document.getElementById('stock-empty-clear')?.addEventListener('click', clearFilters);

  document.querySelectorAll('.stock__view-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      viewMode = btn.dataset.view;
      document.querySelectorAll('.stock__view-btn').forEach(b => {
        const on = b === btn; b.classList.toggle('is-active', on); b.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      refreshGrid();
    });
  });

  // Gaveta de filtros no celular
  function setFiltersOpen(open) {
    filtersPanel?.classList.toggle('is-open', open);
    filtersBackdrop?.classList.toggle('is-open', open);
    filtersOpenBtn?.setAttribute('aria-expanded', open ? 'true' : 'false');
    document.body.style.overflow = open ? 'hidden' : '';
  }
  filtersOpenBtn?.addEventListener('click', () => setFiltersOpen(true));
  filtersBackdrop?.addEventListener('click', () => setFiltersOpen(false));
  document.getElementById('filters-close')?.addEventListener('click', () => setFiltersOpen(false));
  document.getElementById('filters-apply')?.addEventListener('click', () => {
    setFiltersOpen(false);
    document.getElementById('motos-grid')?.scrollIntoView({ behavior: prefersReducedMotion.matches ? 'auto' : 'smooth', block: 'start' });
  });

  favoriteForm?.addEventListener('submit', () => { setTimeout(updateGridFavoritesUI, 50); });

  // Banner "Fale agora"
  document.getElementById('talk-whatsapp')?.addEventListener('click', () => openSellerModal(null));
  document.getElementById('talk-more')?.addEventListener('click', () => {
    clearFilters();
    document.getElementById('filtro-motos')?.scrollIntoView({ behavior: prefersReducedMotion.matches ? 'auto' : 'smooth', block: 'start' });
  });

  updateRangeUI();

  // =========================================================================
  // 8. FLUXO DE SELEÇÃO DE VENDEDOR E REDIRECIONAMENTO AO WHATSAPP (ETAPA 2)
  // =========================================================================

  // Variáveis separadas de links e fotos dos vendedores para facilitar alterações futuras
  const WHATSAPP_LINK_GUSTAVO = 'https://wa.me/5519997065506';
  const CAMINHO_FOTO_GUSTAVO  = 'vendedor-gustavo.jpeg';

  const WHATSAPP_LINK_LEANDRO = 'https://wa.me/5519996830965';
  const CAMINHO_FOTO_LEANDRO  = 'vendedor-leandro.jpg';

  const WHATSAPP_LINK_JOAO    = 'https://wa.me/5519998076644';
  const CAMINHO_FOTO_JOAO     = 'vendedor-joão.jpg';

  // Base estática de dados dos vendedores (ordem estrita: Gustavo, Leandro, João)
  const VENDEDORES_DATA = [
    {
      id: 'gustavo',
      nome: 'Gustavo',
      cargo: 'Vendas • Especialista em esportivas',
      link: WHATSAPP_LINK_GUSTAVO,
      foto: CAMINHO_FOTO_GUSTAVO,
      destaque: true
    },
    {
      id: 'leandro',
      nome: 'Leandro',
      cargo: 'Vendas',
      link: WHATSAPP_LINK_LEANDRO,
      foto: CAMINHO_FOTO_LEANDRO,
      destaque: false
    },
    {
      id: 'joao',
      nome: 'João',
      cargo: 'Vendas',
      link: WHATSAPP_LINK_JOAO,
      foto: CAMINHO_FOTO_JOAO,
      destaque: false
    }
  ];

  let activeMotoForSeller = null;

  const sellerModalBackdrop = document.getElementById('seller-modal-backdrop');
  const sellerModalClose = document.getElementById('seller-modal-close');
  const sellerList = document.getElementById('seller-list');
  const redirectModalBackdrop = document.getElementById('redirect-modal-backdrop');
  const redirectModalClose = document.getElementById('redirect-modal-close');
  const redirectSellerName = document.getElementById('redirect-seller-name');
  const redirectLink = document.getElementById('redirect-open-link');

  /**
   * Renderiza a lista de vendedores no painel de película fumê
   */
  function renderSellerList() {
    if (!sellerList) return;
    sellerList.innerHTML = '';

    VENDEDORES_DATA.forEach((vendedor) => {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = `seller-item${vendedor.destaque ? ' seller-item--highlight' : ''}`;
      item.setAttribute('role', 'listitem');
      item.setAttribute('aria-label', `Conversar com ${vendedor.nome} pelo WhatsApp`);
      item.innerHTML = `
        <div class="seller-item__left">
          <img src="${encodeURI(vendedor.foto)}" alt="Foto de ${vendedor.nome}" class="seller-item__avatar" loading="lazy">
          <div class="seller-item__info">
            <strong class="seller-item__name">${vendedor.nome}</strong>
            <span class="seller-item__role">${vendedor.cargo}</span>
          </div>
        </div>
        <div class="seller-item__right">
          <span class="seller-item__wa-icon" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.301-.15-1.782-.879-2.058-.98-.276-.1-.477-.15-.678.15s-.778.98-.954 1.18c-.176.2-.351.226-.653.075s-1.272-.469-2.424-1.496c-.896-.799-1.501-1.787-1.677-2.088s-.019-.464.132-.614c.135-.135.301-.351.452-.527s.201-.301.301-.502.05-.376-.025-.527c-.075-.15-.678-1.631-.929-2.234-.245-.588-.494-.508-.678-.517l-.578-.01c-.2 0-.527.075-.803.376s-1.054 1.03-1.054 2.511 1.079 2.912 1.23 3.113c.15.201 2.124 3.243 5.145 4.549.719.311 1.28.497 1.718.636.723.23 1.381.197 1.902.12.58-.086 1.782-.728 2.033-1.431s.251-1.305.176-1.431c-.075-.126-.276-.201-.577-.351zM12.042 21.928c-1.776 0-3.518-.466-5.053-1.348l-.362-.208-3.754.985 1.002-3.66-.228-.363c-.968-1.541-1.479-3.328-1.479-5.161 0-5.405 4.398-9.803 9.806-9.803 2.618 0 5.08 1.02 6.929 2.871s2.868 4.314 2.868 6.932c-.001 5.407-4.4 9.805-9.729 9.805zM12.042 0C5.402 0 0 5.402 0 12.042c0 2.119.553 4.185 1.603 6.007L0 24l6.104-1.599c1.764.962 3.766 1.468 5.938 1.468 6.64 0 12.042-5.402 12.042-12.042 0-3.217-1.253-6.241-3.528-8.516s-5.299-3.529-8.514-3.529z"/>
            </svg>
          </span>
          <span class="seller-item__arrow" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </span>
        </div>
      `;

      item.addEventListener('click', (e) => {
        e.stopPropagation();
        chooseSeller(vendedor);
      });

      sellerList.appendChild(item);
    });
  }

  /**
   * Abre o Modal "Escolha o Vendedor" (Modal 1)
   */
  function openSellerModal(motoContext = null) {
    activeMotoForSeller = motoContext || null;
    if (redirectModalBackdrop) {
      redirectModalBackdrop.classList.add('is-hidden');
    }
    if (sellerModalBackdrop) {
      sellerModalBackdrop.classList.remove('is-hidden');
      document.body.style.overflow = 'hidden';
    }
  }

  /**
   * Fecha o Modal de Seleção de Vendedor (Modal 1)
   */
  function closeSellerModal() {
    if (sellerModalBackdrop) {
      sellerModalBackdrop.classList.add('is-hidden');
    }
    const motoModal = document.getElementById('moto-modal-backdrop');
    if (!motoModal || motoModal.classList.contains('is-hidden')) {
      document.body.style.overflow = '';
    }
  }

  /**
   * Fecha o Modal de Redirecionamento (Modal 2)
   */
  function closeRedirectModal() {
    clearTimeout(chooseSeller._t);
    if (redirectModalBackdrop) {
      redirectModalBackdrop.classList.add('is-hidden');
    }
    const motoModal = document.getElementById('moto-modal-backdrop');
    if (!motoModal || motoModal.classList.contains('is-hidden')) {
      document.body.style.overflow = '';
    }
  }

  /**
   * Etapa 2: Ao clicar em um vendedor, fecha o modal 1 e abre o modal 2 com o nome dele.
   * Não implementa spinner nem CANCELAR nesta etapa.
   */
  function chooseSeller(vendedor) {
    closeSellerModal();

    if (redirectSellerName) {
      redirectSellerName.textContent = vendedor.nome;
    }

    if (redirectModalBackdrop) {
      redirectModalBackdrop.classList.remove('is-hidden');
      document.body.style.overflow = 'hidden';
    }

    // Monta a mensagem com a moto escolhida e abre a conversa com o vendedor
    const moto = activeMotoForSeller;
    const msg = moto
      ? `Olá, ${vendedor.nome}! Tenho interesse na ${moto.modelo} ${moto.cor} (${moto.ano}) de ${fmtPreco(moto.preco)} que vi no site da Gabriel Motos.`
      : `Olá, ${vendedor.nome}! Vim pelo site da Gabriel Motos e queria tirar uma dúvida.`;
    const url = `${vendedor.link}?text=${encodeURIComponent(msg)}`;
    if (redirectLink) { redirectLink.href = url; }
    clearTimeout(chooseSeller._t);
    chooseSeller._t = setTimeout(() => {
      const w = window.open(url, '_blank', 'noopener');
      if (!w) { try { window.location.href = url; } catch (_) {} }
    }, 1400);
  }

  // Event listeners para fechamento via botão X
  sellerModalClose?.addEventListener('click', closeSellerModal);
  redirectModalClose?.addEventListener('click', closeRedirectModal);

  // Fechar ao clicar no fundo escuro fora do card
  sellerModalBackdrop?.addEventListener('click', (e) => {
    if (e.target === sellerModalBackdrop) {
      closeSellerModal();
    }
  });

  redirectModalBackdrop?.addEventListener('click', (e) => {
    if (e.target === redirectModalBackdrop) {
      closeRedirectModal();
    }
  });

  // Tecla ESC para fechar modais
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (redirectModalBackdrop && !redirectModalBackdrop.classList.contains('is-hidden')) {
        closeRedirectModal();
      } else if (sellerModalBackdrop && !sellerModalBackdrop.classList.contains('is-hidden')) {
        closeSellerModal();
      }
    }
  });

  // Inicializa lista de vendedores
  renderSellerList();

  // Renderiza a grade de motos inicial
  renderMotosGrid();
});

