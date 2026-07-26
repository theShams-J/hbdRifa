/**
 * microphone.js
 * --------------------------------------------------------------------------
 * Detects a "blow" gesture into the microphone by watching for a sustained
 * burst of low-frequency energy (the rumble of breath hitting the mic).
 * Exposes a tiny public API on window.BlowDetector that app.js drives.
 * Falls back gracefully (calls onUnavailable) if getUserMedia isn't
 * available or permission is denied — app.js then relies on the tap button.
 * -------------------------------------------------------------------------- */

window.BlowDetector = (function () {
  let audioCtx = null;
  let analyser = null;
  let mediaStream = null;
  let sourceNode = null;
  let rafId = null;
  let listening = false;

  // Tunables
  const BLOW_VOLUME_THRESHOLD = 0.45;   // 0-1 normalized low-band energy
  const BLOW_SUSTAIN_FRAMES = 4;        // consecutive frames above threshold
  let sustainCount = 0;

  function computeLowBandEnergy(dataArray) {
    // Blowing into a mic reads as strong low-frequency energy across a
    // wide band (unlike a sharp isolated peak from speech/clicks).
    const lowBandEnd = Math.floor(dataArray.length * 0.18);
    let sum = 0;
    for (let i = 0; i < lowBandEnd; i++) {
      sum += dataArray[i];
    }
    const avg = sum / lowBandEnd; // 0-255
    return avg / 255;
  }

  async function start({ onBlow, onUnavailable, onListening }) {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      onUnavailable && onUnavailable('unsupported');
      return;
    }

    try {
      mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      onUnavailable && onUnavailable('denied');
      return;
    }

    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AudioContextClass();
      sourceNode = audioCtx.createMediaStreamSource(mediaStream);
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.6;
      sourceNode.connect(analyser);

      listening = true;
      onListening && onListening();

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const tick = () => {
        if (!listening) return;
        analyser.getByteFrequencyData(dataArray);
        const energy = computeLowBandEnergy(dataArray);

        if (energy > BLOW_VOLUME_THRESHOLD) {
          sustainCount++;
          if (sustainCount >= BLOW_SUSTAIN_FRAMES) {
            listening = false;
            onBlow && onBlow();
            stop();
            return;
          }
        } else {
          sustainCount = 0;
        }

        rafId = requestAnimationFrame(tick);
      };

      tick();
    } catch (err) {
      onUnavailable && onUnavailable('error');
    }
  }

  function stop() {
    listening = false;
    if (rafId) cancelAnimationFrame(rafId);
    if (mediaStream) {
      mediaStream.getTracks().forEach((track) => track.stop());
      mediaStream = null;
    }
    if (sourceNode) {
      try { sourceNode.disconnect(); } catch (e) {}
      sourceNode = null;
    }
    if (audioCtx) {
      try { audioCtx.close(); } catch (e) {}
      audioCtx = null;
    }
    analyser = null;
    sustainCount = 0;
  }

  return { start, stop };
})();
