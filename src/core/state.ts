export type Act = 'lock' | 'unlocking' | 'narrative' | 'scan' | 'recognized' | 'love' | 'forming' | 'universe';
const next: Record<Act, Act> = { lock: 'unlocking', unlocking: 'narrative', narrative: 'scan', scan: 'recognized', recognized: 'love', love: 'forming', forming: 'universe', universe: 'universe' };
export type Action = { type: 'advance'; from: Act } | { type: 'restart' };
export function actReducer(state: Act, action: Action): Act {
  return action.type === 'restart' ? 'lock' : action.from === state ? next[state] : state;
}
