/**
 * app.js
 * --------------------------------------------------------------------------
 * Orchestrates the full four-screen experience:
 *   1. Welcome letter popup  -> Continue tap
 *   2. Birthday cake         -> blow (mic) or tap fallback
 *   3. Celebration overlay   -> confetti + "HAPPY BIRTHDAY", auto-advances
 *   4. Main celebration page -> music starts, carousel + swaying frame
 * -------------------------------------------------------------------------- */

document.addEventListener('DOMContentLoaded', () => {

  /* ---------------------------------------------------------------------
   * Element references
   * ------------------------------------------------------------------- */
  const screenWelcome   = document.getElementById('screen-welcome');
  const blurBackdrop    = document.getElementById('blurBackdrop');
  const screenCake      = document.getElementById('screen-cake');
  const continueBtn     = document.getElementById('continueBtn');

  const cakeScene        = document.getElementById('cakeScene');
  const flameWrap         = document.getElementById('flameWrap');
  const smokeWrap          = document.getElementById('smokeWrap');
  const cakeBody          = document.getElementById('cakeBody');
  const tapFallbackBtn     = document.getElementById('tapFallbackBtn');
  const micHint            = document.getElementById('micHint');

  const screenCelebration = document.getElementById('screen-celebration');
  const confettiCanvas    = document.getElementById('confettiCanvas');

  const screenMain      = document.getElementById('screen-main');
  const equalizerWrap   = document.getElementById('equalizerWrap');
  const bgMusic          = document.getElementById('bgMusic');
  const soundToggle       = document.getElementById('soundToggle');

  let candleBlown = false; // guards against double-trigger (mic + tap)

  /* =======================================================================
   * SCREEN 1 -> SCREEN 2  (Welcome popup dismiss)
   * ===================================================================== */
  continueBtn.addEventListener('click', dismissWelcome);

  function dismissWelcome() {
    screenWelcome.classList.add('is-leaving');
    screenCake.classList.remove('is-blurred');

    setTimeout(() => {
      screenWelcome.classList.add('is-hidden');
      startBlowListening();
    }, 550);
  }

  /* =======================================================================
   * SCREEN 2 — Cake / blow detection
   * ===================================================================== */
  function startBlowListening() {
    if (typeof window.BlowDetector === 'undefined') {
      showTapFallback();
      return;
    }

    window.BlowDetector.start({
      onListening: () => {
        micHint.textContent = "Listening… take a breath and blow 💨";
      },
      onBlow: () => {
        triggerCandleOut();
      },
      onUnavailable: () => {
        showTapFallback();
      },
    });

    // Always give a fallback path in case mic detection is slow/unreliable,
    // especially useful on mobile where mic prompts can be dismissed.
    tapFallbackBtn.addEventListener('click', () => {
      window.BlowDetector.stop && window.BlowDetector.stop();
      triggerCandleOut();
    });
  }

  function showTapFallback() {
    micHint.textContent = '';
    tapFallbackBtn.style.display = 'inline-flex';
    tapFallbackBtn.addEventListener('click', triggerCandleOut, { once: true });
  }

  function triggerCandleOut() {
    if (candleBlown) return;
    candleBlown = true;

    micHint.textContent = '';
    tapFallbackBtn.style.display = 'none';

    // Flame bends & disappears
    flameWrap.classList.add('is-blowing');

    // Smoke rises
    smokeWrap.classList.add('is-smoking');

    // Cake bounces
    cakeBody.classList.add('is-bouncing');

    // After ~0.5s, move into the celebration screen
    setTimeout(() => {
      goToCelebration();
    }, 550);
  }

  /* =======================================================================
   * SCREEN 2 -> SCREEN 3  (Celebration overlay)
   * ===================================================================== */
  function goToCelebration() {
    screenCake.classList.add('is-leaving');
    spawnSparkles();
    screenCelebration.classList.add('is-active');
    screenCelebration.removeAttribute('aria-hidden');

    startConfetti();

    // Keep the celebration screen up for ~3 seconds, then move on
    setTimeout(() => {
      goToMainPage();
    }, 3000);
  }

  function spawnSparkles() {
    const field = document.getElementById('sparkleField');
    const count = 24;
    for (let i = 0; i < count; i++) {
      const s = document.createElement('span');
      s.className = 'sparkle';
      s.style.left = `${Math.random() * 100}%`;
      s.style.top = `${Math.random() * 100}%`;
      s.style.animationDelay = `${Math.random() * 1.6}s`;
      field.appendChild(s);
    }
  }

  /* =======================================================================
   * SCREEN 3 -> SCREEN 4  (Main celebration page)
   * ===================================================================== */
  function goToMainPage() {
    screenCelebration.classList.add('is-leaving');

    setTimeout(() => {
      stopConfetti();
      screenCelebration.classList.remove('is-active', 'is-leaving');
      screenCelebration.setAttribute('aria-hidden', 'true');

      screenMain.classList.add('is-active');
      screenMain.removeAttribute('aria-hidden');

      window.PhotoCarousel && window.PhotoCarousel.start();
      playMusicWithFade();
    }, 700);
  }

  /* =======================================================================
   * CONFETTI — lightweight canvas particle system
   * ===================================================================== */
  let confettiCtx = null;
  let confettiParticles = [];
  let confettiAnimId = null;
  let confettiRunning = false;

  const CONFETTI_COLORS = ['#FF2E93', '#7C3AED', '#FFC800', '#00E5C7', '#FF7A1A', '#FFFFFF'];

  function resizeConfettiCanvas() {
    const rect = screenCelebration.getBoundingClientRect();
    confettiCanvas.width = rect.width;
    confettiCanvas.height = rect.height;
  }

  function createParticle(burst) {
    const w = confettiCanvas.width;
    return {
      x: w / 2 + (Math.random() - 0.5) * w * 0.3,
      y: burst ? confettiCanvas.height * 0.35 : -20,
      vx: (Math.random() - 0.5) * (burst ? 9 : 2),
      vy: burst ? -Math.random() * 11 - 4 : Math.random() * 2 + 1,
      size: Math.random() * 7 + 4,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      rotation: Math.random() * 360,
      rotSpeed: (Math.random() - 0.5) * 10,
      shape: Math.random() > 0.5 ? 'rect' : 'circle',
      gravity: 0.22,
      drag: 0.995,
    };
  }

  function startConfetti() {
    confettiCtx = confettiCanvas.getContext('2d');
    resizeConfettiCanvas();
    confettiParticles = [];

    // Initial explosive burst
    for (let i = 0; i < 90; i++) {
      confettiParticles.push(createParticle(true));
    }

    confettiRunning = true;
    let lastSpawn = 0;

    function frame(ts) {
      if (!confettiRunning) return;

      // Gentle continuous fall, trickled in over time
      if (!lastSpawn || ts - lastSpawn > 220) {
        for (let i = 0; i < 4; i++) confettiParticles.push(createParticle(false));
        lastSpawn = ts;
      }

      confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);

      confettiParticles.forEach((p) => {
        p.vy += p.gravity * 0.06;
        p.vx *= p.drag;
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.rotSpeed;

        confettiCtx.save();
        confettiCtx.translate(p.x, p.y);
        confettiCtx.rotate((p.rotation * Math.PI) / 180);
        confettiCtx.fillStyle = p.color;
        if (p.shape === 'rect') {
          confettiCtx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        } else {
          confettiCtx.beginPath();
          confettiCtx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          confettiCtx.fill();
        }
        confettiCtx.restore();
      });

      // Cull particles that have fallen well off-screen
      confettiParticles = confettiParticles.filter((p) => p.y < confettiCanvas.height + 40);

      confettiAnimId = requestAnimationFrame(frame);
    }

    confettiAnimId = requestAnimationFrame(frame);
  }

  function stopConfetti() {
    confettiRunning = false;
    if (confettiAnimId) cancelAnimationFrame(confettiAnimId);
    confettiParticles = [];
    if (confettiCtx) confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
  }

  window.addEventListener('resize', () => {
    if (confettiRunning) resizeConfettiCanvas();
  });

  /* =======================================================================
   * AUDIO — starts only on Screen 4, fades in smoothly
   * ===================================================================== */
  const TARGET_VOLUME = 0.85;
  let musicMuted = false;

  function playMusicWithFade() {
    bgMusic.volume = 0;
    const playPromise = bgMusic.play();

    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          fadeAudioIn();
          equalizerWrap.classList.add('is-playing');
        })
        .catch(() => {
          // Autoplay was blocked — wait for a first user tap anywhere
          const resumeOnTap = () => {
            bgMusic.play().then(() => {
              fadeAudioIn();
              equalizerWrap.classList.add('is-playing');
            });
            document.removeEventListener('click', resumeOnTap);
          };
          document.addEventListener('click', resumeOnTap, { once: true });
        });
    }
  }

  function fadeAudioIn() {
    let vol = 0;
    const step = 0.04;
    const fadeInterval = setInterval(() => {
      vol = Math.min(vol + step, TARGET_VOLUME);
      bgMusic.volume = vol;
      if (vol >= TARGET_VOLUME) clearInterval(fadeInterval);
    }, 80);
  }

  soundToggle.addEventListener('click', () => {
    musicMuted = !musicMuted;
    bgMusic.muted = musicMuted;
    soundToggle.textContent = musicMuted ? '🔇' : '🔊';
    equalizerWrap.classList.toggle('is-playing', !musicMuted);
  });

});
