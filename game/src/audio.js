// All sound is synthesized with WebAudio: no audio files, no network. The
// context is created on the first user gesture (browsers block audio before
// one); every method is a no-op when muted or before that gesture.
const NOTES = [523.25, 587.33, 659.25, 783.99, 880.0]; // C5 D5 E5 G5 A5

export function makeAudio() {
  let ctx = null;
  let master = null;
  let musicTimer = null;
  let muted = false;
  let noteIndex = 0;

  function ensure() {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume();
      return true;
    }
    try {
      const AC = window.AudioContext ?? window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
      return true;
    } catch {
      return false;
    }
  }

  /** A short oscillator blip with a pitch slide and a quick fade. */
  function blip(freq, endFreq, seconds, type, volume, when = 0) {
    if (!ctx || muted) return;
    const t0 = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), t0 + seconds);
    gain.gain.setValueAtTime(volume, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + seconds);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t0);
    osc.stop(t0 + seconds + 0.02);
  }

  /** A soft filtered noise burst (hits, pops, thuds). */
  function noise(seconds, volume, cutoff, when = 0) {
    if (!ctx || muted) return;
    const t0 = ctx.currentTime + when;
    const len = Math.max(1, Math.floor(ctx.sampleRate * seconds));
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = cutoff;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + seconds);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    src.start(t0);
  }

  const api = {
    get muted() {
      return muted;
    },
    ensure,
    toggleMute() {
      muted = !muted;
      return muted;
    },
    click() {
      blip(660, 520, 0.06, 'sine', 0.12);
    },
    plant() {
      noise(0.12, 0.25, 500);
      blip(180, 90, 0.12, 'triangle', 0.2);
    },
    shoot() {
      blip(880, 420, 0.08, 'square', 0.05);
    },
    hit() {
      noise(0.06, 0.12, 2400);
    },
    pop() {
      blip(420, 900, 0.09, 'sine', 0.12);
      noise(0.08, 0.1, 3000);
    },
    sun() {
      blip(1046, 1568, 0.18, 'sine', 0.12);
    },
    frost() {
      blip(1200, 1800, 0.25, 'sine', 0.08);
      blip(1800, 2400, 0.2, 'sine', 0.05, 0.05);
    },
    horn() {
      blip(196, 196, 0.35, 'sawtooth', 0.12);
      blip(294, 294, 0.35, 'sawtooth', 0.1, 0.12);
    },
    breach() {
      blip(220, 55, 0.5, 'sawtooth', 0.2);
      noise(0.3, 0.2, 400);
    },
    win() {
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => blip(f, f, 0.3, 'triangle', 0.16, i * 0.14));
    },
    lose() {
      [392, 329.63, 261.63, 196].forEach((f, i) => blip(f, f * 0.94, 0.35, 'triangle', 0.14, i * 0.16));
    },
    /** A slow pentatonic pluck every couple of seconds: the garden's music. */
    startMusic() {
      if (!ctx || musicTimer) return;
      musicTimer = window.setInterval(() => {
        if (muted) return;
        const f = NOTES[noteIndex % NOTES.length];
        noteIndex += 1;
        blip(f, f * 0.995, 0.9, 'sine', 0.045);
      }, 2200);
    },
    stopMusic() {
      if (musicTimer) {
        window.clearInterval(musicTimer);
        musicTimer = null;
      }
    },
  };
  return api;
}
