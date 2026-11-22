// Sound, synthesized with WebAudio — no audio files, nothing over the
// network. A soft step, a coin clink, a loot chime, an alarm whoop and a
// getaway fanfare, all from one oscillator helper. Mute with M.

export function createAudio() {
  let context = null;
  let muted = false;
  let stepTimer = 0;

  function ensure() {
    if (context) return context;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      context = new AudioContext();
    } catch {
      context = null;
    }
    return context;
  }

  function tone(freq, seconds, type, gain, when, slideTo) {
    if (muted) return;
    const ctx = ensure();
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
    const ctx = ensure();
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
    // A quiet step while moving; softer and slower while sneaking.
    step(sneaking, dt) {
      stepTimer -= dt;
      if (stepTimer > 0) return;
      stepTimer = sneaking ? 0.42 : 0.28;
      tone(sneaking ? 190 : 150, 0.05, 'triangle', sneaking ? 0.015 : 0.03);
    },
    coin() {
      tone(1568, 0.09, 'sine', 0.08);
      tone(2093, 0.14, 'sine', 0.06, 0.07);
    },
    loot() {
      tone(880, 0.12, 'sine', 0.09);
      tone(1318, 0.16, 'sine', 0.08, 0.09);
      tone(1760, 0.22, 'sine', 0.07, 0.18);
    },
    alarm() {
      tone(620, 0.22, 'sawtooth', 0.07, 0, 940);
      tone(620, 0.22, 'sawtooth', 0.07, 0.24, 940);
    },
    laser() {
      tone(220, 0.12, 'square', 0.05, 0, 90);
    },
    spotted() {
      tone(440, 0.1, 'square', 0.05);
      tone(587, 0.14, 'square', 0.05, 0.1);
    },
    win() {
      const notes = [523, 659, 784, 1046, 1318];
      notes.forEach((freq, index) => tone(freq, 0.22, 'triangle', 0.09, index * 0.11));
    },
    lose() {
      tone(392, 0.25, 'triangle', 0.08, 0, 196);
      tone(311, 0.4, 'triangle', 0.08, 0.22, 155);
    },
  };
}
