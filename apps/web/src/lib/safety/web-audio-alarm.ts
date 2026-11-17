/**
 * Web Audio API synthesizer for the Autonomous Sentinel Agent.
 * Generates alarm chimes and warning pulses entirely in-browser without
 * requiring any external MP3 or audio asset files.
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") {
    return null;
  }

  const AudioContextClass =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext })
      .webkitAudioContext;

  if (!AudioContextClass) {
    return null;
  }

  if (!audioCtx || audioCtx.state === "closed") {
    audioCtx = new AudioContextClass();
  }

  if (audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => undefined);
  }

  return audioCtx;
}

/**
 * Play a gentle advisory pulse (Level 1 Caution)
 */
export function playAdvisoryChime() {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880.0, ctx.currentTime + 0.15); // A5

    gain.gain.setValueAtTime(0.01, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.32);
  } catch {
    // Graceful fallback if audio is blocked by user autoplay policy
  }
}

/**
 * Play an escalating Dead-Man warning chime (Level 2 Anomaly)
 * @param urgency 0.0 (calm) to 1.0 (imminent expiration)
 */
export function playDeadManPulse(urgency = 0.5) {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const baseFreq = 440 + urgency * 440; // 440Hz (A4) to 880Hz (A5)
    const duration = Math.max(0.15, 0.35 - urgency * 0.15);

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = urgency > 0.7 ? "sawtooth" : "triangle";
    osc.frequency.setValueAtTime(baseFreq, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(baseFreq * 1.25, ctx.currentTime + duration * 0.5);

    gain.gain.setValueAtTime(0.01, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(Math.min(0.35, 0.15 + urgency * 0.2), ctx.currentTime + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + duration + 0.02);
  } catch {
    // Autoplay policy fallback
  }
}

/**
 * Play a full SOS dispatch confirmation chime (Level 3 Crisis)
 */
export function playSosDispatchedSiren() {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(960, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(480, ctx.currentTime + 0.25);
    osc.frequency.linearRampToValueAtTime(960, ctx.currentTime + 0.5);

    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.55);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.6);
  } catch {
    // Autoplay policy fallback
  }
}
