export type PinResult = 'correct' | 'reversed' | 'incorrect';
export function checkPin(pin: string, firstDay: number, secondDay: number): PinResult {
  const first = String(firstDay).padStart(2, '0');
  const second = String(secondDay).padStart(2, '0');
  if (pin === first + second) return 'correct';
  return pin === second + first ? 'reversed' : 'incorrect';
}
export function attemptMessage(attempts: number, messages: readonly string[]) {
  return messages[Math.min(Math.max(attempts - 1, 0), messages.length - 1)];
}
