// Sound, built live with WebAudio — no sound files, nothing over the wire.
// A soft footfall, a coin clink, a prize chime, an alarm whoop and a getaway
// fanfare, all from a single oscillator helper. Mute with M.

export function createAudio() {
  let context = null;
  let muted = false;
  let stepClock = 0;

  function getCtx() {
    if (context) return context;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      context = new AudioContext();
    } catch {
      context = null;
    }
    return context;
  }

  function beep(freq, seconds, type, gain, when, slideTo) {
    if (muted) return;
    const ctx = getCtx();
    if (!ctx) return;
    const start = ctx.currentTime + (when ?? 0);
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, start + seconds);
    amp.gain.setValueAtTime(0.0001, start);
    amp.gain.exponentialRampToValueAtTime(gain, start + 0.012);
    amp.gain.exponentialRampToValueAtTime(0.0001, start + seconds);
    osc.connect(amp);
    amp.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + seconds + 0.05);
  }

  function resume() {
    const ctx = getCtx();
    if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
  }

  return {
    resume,
    get muted() {
      return muted;
    },
    toggleMute() {
      muted = !muted;
      return muted;
    },
    // A hushed footfall while moving; softer and slower while sneaking.
    step(sneaking, dt) {
      stepClock -= dt;
      if (stepClock > 0) return;
      stepClock = sneaking ? 0.42 : 0.28;
      beep(sneaking ? 190 : 150, 0.05, 'triangle', sneaking ? 0.015 : 0.03);
    },
    coin() {
      beep(1568, 0.09, 'sine', 0.08);
      beep(2093, 0.14, 'sine', 0.06, 0.07);
    },
    loot() {
      beep(880, 0.12, 'sine', 0.09);
      beep(1318, 0.16, 'sine', 0.08, 0.09);
      beep(1760, 0.22, 'sine', 0.07, 0.18);
    },
    alarm() {
      beep(620, 0.22, 'sawtooth', 0.07, 0, 940);
      beep(620, 0.22, 'sawtooth', 0.07, 0.24, 940);
    },
    laser() {
      beep(220, 0.12, 'square', 0.05, 0, 90);
    },
    spotted() {
      beep(440, 0.1, 'square', 0.05);
      beep(587, 0.14, 'square', 0.05, 0.1);
    },
    win() {
      const notes = [523, 659, 784, 1046, 1318];
      notes.forEach((freq, index) => beep(freq, 0.22, 'triangle', 0.09, index * 0.11));
    },
    lose() {
      beep(392, 0.25, 'triangle', 0.08, 0, 196);
      beep(311, 0.4, 'triangle', 0.08, 0.22, 155);
    },
  };
}
