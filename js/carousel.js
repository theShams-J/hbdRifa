/**
 * carousel.js
 * --------------------------------------------------------------------------
 * Auto-rotating photo carousel for Screen 4's hanging frame.
 * Two <img> elements are cross-faded (rather than swapping src on one
 * element) so the fade+zoom transition has no flash/pop. The frame's own
 * sway/float animation lives in animations.css and runs independently.
 * -------------------------------------------------------------------------- */

window.PhotoCarousel = (function () {
  const IMAGE_COUNT = 6;
  const INTERVAL_MS = 2500;
  const ASSET_PATH = 'assets/img';

  let imgA, imgB;
  let activeIsA = true;
  let currentIndex = 1; // img1 is already shown as the initial active image
  let timerId = null;

  function preload(index) {
    const img = new Image();
    img.src = `${ASSET_PATH}${index}.jpg`;
    return img.src;
  }

  function nextIndex() {
    currentIndex = (currentIndex % IMAGE_COUNT) + 1;
    return currentIndex;
  }

  function advance() {
    const upcoming = imgA.classList.contains('is-active') ? imgB : imgA;
    const outgoing = imgA.classList.contains('is-active') ? imgA : imgB;

    const idx = nextIndex();
    upcoming.src = preload(idx);

    // Swap active state — CSS handles the fade+zoom transition
    upcoming.classList.add('is-active');
    outgoing.classList.remove('is-active');
  }

  function start() {
    imgA = document.getElementById('carouselImg1');
    imgB = document.getElementById('carouselImg2');
    if (!imgA || !imgB) return;

    stop(); // guard against double-start
    timerId = setInterval(advance, INTERVAL_MS);
  }

  function stop() {
    if (timerId) {
      clearInterval(timerId);
      timerId = null;
    }
  }

  return { start, stop };
})();
