/**
 * Web Audio API Ringtone & Dialing sound generator
 * Creates clean, synthesized phone sounds directly inside the browser.
 */

export function playRingtone(type: 'incoming' | 'dialing'): { stop: () => void } {
  // Check if AudioContext is supported
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContextClass) {
    return { stop: () => {} };
  }

  const ctx = new AudioContextClass();
  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const gainNode = ctx.createGain();

  // Set up standard dual-tone multi-frequency signals
  if (type === 'incoming') {
    // US/Middle East Ringing signal: 440Hz + 480Hz
    osc1.frequency.value = 440;
    osc2.frequency.value = 480;
  } else {
    // Dialing / Audible ringing sound: 350Hz + 440Hz
    osc1.frequency.value = 350;
    osc2.frequency.value = 440;
  }

  osc1.connect(gainNode);
  osc2.connect(gainNode);
  gainNode.connect(ctx.destination);

  // Initial sound state
  gainNode.gain.setValueAtTime(0, ctx.currentTime);

  let active = true;
  const cycleSound = () => {
    if (!active) return;
    const now = ctx.currentTime;
    
    if (type === 'incoming') {
      // Ring for 1.5 seconds, quiet for 2.5 seconds
      gainNode.gain.setValueAtTime(0.2, now);
      gainNode.gain.setValueAtTime(0.2, now + 1.5);
      gainNode.gain.setValueAtTime(0, now + 1.6);
      
      setTimeout(() => {
        if (active) cycleSound();
      }, 4000);
    } else {
      // Dialing tone: Ring for 1 second, quiet for 3 seconds
      gainNode.gain.setValueAtTime(0.15, now);
      gainNode.gain.setValueAtTime(0.15, now + 1.0);
      gainNode.gain.setValueAtTime(0, now + 1.1);

      setTimeout(() => {
        if (active) cycleSound();
      }, 4000);
    }
  };

  // Start oscillators
  osc1.start(0);
  osc2.start(0);
  cycleSound();

  return {
    stop: () => {
      active = false;
      try {
        osc1.stop();
        osc2.stop();
        ctx.close();
      } catch (e) {
        // Safe catch for already closed context
      }
    }
  };
}
