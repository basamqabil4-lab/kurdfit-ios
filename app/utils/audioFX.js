// =========================================================================
// Native Offline Web Audio FX Engine for Kurd Fit
// 100% Client-side synthesized. Zero audio files, zero network, zero lag.
// =========================================================================

let sharedAudioCtx = null;

function getAudioContext() {
  if (typeof window === 'undefined') return null;
  try {
    if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) sharedAudioCtx = new AudioCtx();
    }
    if (sharedAudioCtx && sharedAudioCtx.state === 'suspended') {
      sharedAudioCtx.resume().catch(() => {});
    }
    return sharedAudioCtx;
  } catch (e) {
    return null;
  }
}

function triggerHaptic(pattern = 25) {
  if (typeof window !== 'undefined' && window.navigator && typeof window.navigator.vibrate === 'function') {
    try {
      window.navigator.vibrate(pattern);
    } catch (e) {}
  }
}

export const playSetCompleteSound = (soundEnabled = true) => {
  triggerHaptic(25);
  if (!soundEnabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(520, now);
    osc1.frequency.exponentialRampToValueAtTime(140, now + 0.04);
    gain1.gain.setValueAtTime(0.0001, now);
    gain1.gain.linearRampToValueAtTime(0.28, now + 0.005);
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.06);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, now);
    gain2.gain.setValueAtTime(0.0001, now);
    gain2.gain.linearRampToValueAtTime(0.20, now + 0.008);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now);
    osc2.stop(now + 0.14);
  } catch (e) {}
};

export const playCountdownTick = (soundEnabled = true, freq = 950) => {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.18, now + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.04);
  } catch (e) {}
};

export const playTimerCompleteSound = (soundEnabled = true) => {
  triggerHaptic([40, 60, 40]);
  if (!soundEnabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(740, now);
    gain1.gain.setValueAtTime(0.0001, now);
    gain1.gain.linearRampToValueAtTime(0.22, now + 0.006);
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.08);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    const t2 = now + 0.09;
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1100, t2);
    gain2.gain.setValueAtTime(0.0001, t2);
    gain2.gain.linearRampToValueAtTime(0.25, t2 + 0.006);
    gain2.gain.exponentialRampToValueAtTime(0.0001, t2 + 0.25);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(t2);
    osc2.stop(t2 + 0.25);
  } catch (e) {}
};

export const playWorkoutFinishedSound = (soundEnabled = true) => {
  triggerHaptic([50, 70, 50, 70, 90]);
  if (!soundEnabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const freqs = [
      { f: 261.63, v: 0.16 },
      { f: 392.00, v: 0.18 },
      { f: 523.25, v: 0.20 },
      { f: 659.25, v: 0.18 },
      { f: 1046.50, v: 0.15 }
    ];
    freqs.forEach(({ f, v }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(v, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.65);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.65);
    });
  } catch (e) {}
};

export const playWaterSound = (soundEnabled = true) => {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(420, now);
    osc.frequency.exponentialRampToValueAtTime(920, now + 0.04);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.24, now + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.08);
  } catch (e) {}
};

export const playMealLoggedSound = (soundEnabled = true) => {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(620, now);
    osc.frequency.setValueAtTime(880, now + 0.03);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.20, now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.10);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.10);
  } catch (e) {}
};

export const playSparkleSound = (soundEnabled = true) => {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(1400, now + 0.06);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.20, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.25);
  } catch (e) {}
};

export const playWaterDecreaseSound = (soundEnabled = true) => {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(680, now);
    osc.frequency.exponentialRampToValueAtTime(280, now + 0.04);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.20, now + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.08);
  } catch (e) {}
};

export const playUncheckSound = (soundEnabled = true) => {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(460, now);
    osc.frequency.exponentialRampToValueAtTime(180, now + 0.035);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.22, now + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.05);
  } catch (e) {}
};

export const playUntoggleWorkoutSound = (soundEnabled = true) => {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(540, now);
    osc.frequency.exponentialRampToValueAtTime(260, now + 0.07);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.20, now + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.15);
  } catch (e) {}
};

export const playFoodUneatenSound = (soundEnabled = true) => {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(480, now);
    osc.frequency.exponentialRampToValueAtTime(220, now + 0.035);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.18, now + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.06);
  } catch (e) {}
};

export const playQuickRemoveSound = (soundEnabled = true) => {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(240, now + 0.04);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.20, now + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.06);
  } catch (e) {}
};

export const playDeleteSound = (soundEnabled = true) => {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(650, now);
    osc.frequency.exponentialRampToValueAtTime(200, now + 0.05);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.20, now + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.07);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.07);
  } catch (e) {}
};
