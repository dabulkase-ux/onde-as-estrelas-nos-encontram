let audio: AudioContext | undefined;
let enabled = false;
export function setSound(value: boolean) {
  enabled = value;
  if (value) { audio ??= new AudioContext(); void audio.resume().catch(() => {}); }
}
export function feedback(kind: 'tap' | 'error' | 'success') {
  if (navigator.userActivation?.hasBeenActive && 'vibrate' in navigator) navigator.vibrate(kind === 'error' ? [25, 40, 25] : kind === 'success' ? [15, 60, 25] : 8);
  if (!enabled || !audio || audio.state !== 'running') return;
  const oscillator = audio.createOscillator(); const gain = audio.createGain();
  oscillator.type = 'sine'; oscillator.frequency.setValueAtTime(kind === 'error' ? 130 : kind === 'success' ? 660 : 440, audio.currentTime);
  gain.gain.setValueAtTime(0.035, audio.currentTime); gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + 0.45);
  oscillator.connect(gain); gain.connect(audio.destination); oscillator.start(); oscillator.stop(audio.currentTime + 0.5);
  oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
}
