import technical from './technical-test-manifest.json';
import confirmedManual from './confirmed-manual-test-manifest.json';

export const legacyCleanupKey = 'meu-universo.her-cleanup.2026-10-14.v1';
export const cleanupKey = 'meu-universo.her-cleanup.2026-10-14.v2';
const pendingKey = `${cleanupKey}.pending`;
const galaxyKey = 'meu-universo.her-universe.v1';
const quizKey = 'meu-universo.her-compatibility.v1';
const coupleKey = 'meu-universo.her-couple.v1';
const bindingKey = 'meu-universo.remote-cache-binding.v1';
const publicationId = '5bfd5a83-b836-4f5b-aa98-460efcb9c8d6';

// Compare the entire payload, including the UUIDs produced by the confirmed run.
// Text resemblance alone never authorizes deletion.
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([key,item])=>`${JSON.stringify(key)}:${canonical(item)}`).join(',')}}`;
  return JSON.stringify(value);
}
function matches(raw: string | null, value: unknown) {
  try { return raw !== null && canonical(JSON.parse(raw)) === canonical(value); } catch { return false; }
}
export function cleanupHerTestStorage(storage: Pick<Storage,'getItem'|'setItem'|'removeItem'>) {
  const removed: string[] = [];
  try {
    if (storage.getItem(cleanupKey)) return { removed, completed: true };
    const pending = storage.getItem(pendingKey);
    if (pending) {
      // A stored deletion plan lets a failed/partial write resume without guessing
      // the provenance of a galaxy whose quizzes were already removed.
      const plan = JSON.parse(pending) as { key: string; raw: string }[];
      const allowed = [galaxyKey,quizKey,coupleKey,bindingKey,'meu-universo.before-remote-import.v1'];
      if (!Array.isArray(plan) || !plan.every(item=>allowed.includes(item.key)&&typeof item.raw==='string')) return { removed, completed:false };
      const changedQuiz = [quizKey,coupleKey].some(key=>{
        const current=storage.getItem(key);
        return current!==null && !plan.some(item=>item.key===key&&item.raw===current);
      });
      for (const item of plan) {
        if (item.key===galaxyKey && changedQuiz) continue;
        if (storage.getItem(item.key)===item.raw) { storage.removeItem(item.key); removed.push(item.key); }
      }
      storage.setItem(cleanupKey,JSON.stringify({ removed,version:2 }));
      storage.removeItem(pendingKey);
      return { removed,completed:true };
    }
    const quiz = matches(storage.getItem(quizKey), technical.compatibility);
    const couple = matches(storage.getItem(coupleKey), technical.couple);
    // A palette is not proof of test origin. Require both exact quiz payloads too.
    const galaxy = quiz && couple && matches(storage.getItem(galaxyKey), technical.galaxy);
    const candidates = [ ...(quiz ? [quizKey] : []), ...(couple ? [coupleKey] : []), ...(galaxy ? [galaxyKey] : []) ];
    // User confirmed this second run. Its empty couple quiz alone proves nothing.
    if (matches(storage.getItem(quizKey), confirmedManual.compatibility)) {
      candidates.push(quizKey);
      if (matches(storage.getItem(galaxyKey), confirmedManual.galaxy) && (storage.getItem(coupleKey)===null || matches(storage.getItem(coupleKey),confirmedManual.couple))) {
        candidates.push(galaxyKey);
        if (matches(storage.getItem(coupleKey), confirmedManual.couple)) candidates.push(coupleKey);
      }
    }
    const binding = storage.getItem(bindingKey);
    if (binding) {
      try { if ([publicationId,'23b21ef3-9dfa-4a8d-904c-aae38b087170'].includes(JSON.parse(binding).active_publication)) candidates.push(bindingKey); } catch { /* Preserve unknown data. */ }
    }
    const backupKey = 'meu-universo.before-remote-import.v1';
    const backup = storage.getItem(backupKey);
    if (backup) {
      try {
        const data = JSON.parse(backup);
        if (canonical(data.keys) === canonical([galaxyKey,quizKey,coupleKey]) && Array.isArray(data.previous) && data.previous.length === 3 && [technical,confirmedManual].some(doc=>data.previous.every((raw: string,index: number)=>matches(raw,[doc.galaxy,doc.compatibility,doc.couple][index])))) candidates.push(backupKey);
      } catch { /* Preserve unknown backups. */ }
    }
    const plan = [...new Set(candidates)].map(key=>({key,raw:storage.getItem(key)!}));
    if(plan.length) storage.setItem(pendingKey,JSON.stringify(plan));
    for (const {key,raw} of plan) {
      if (key===galaxyKey && [quizKey,coupleKey].some(quiz=>{const current=storage.getItem(quiz);return current!==null&&!plan.some(item=>item.key===quiz&&item.raw===current);})) continue;
      if(storage.getItem(key)===raw) { storage.removeItem(key); removed.push(key); }
    }
    storage.setItem(cleanupKey, JSON.stringify({ removed, version: 2 }));
    if(plan.length) storage.removeItem(pendingKey);
    return { removed, completed: true };
  } catch { return { removed, completed: false }; }
}

export function runHerTestCleanup() {
  // Never touch admin sessions, Auth stores, other project keys or browser data.
  for (const name of ['localStorage','sessionStorage'] as const) {
    try { cleanupHerTestStorage(window[name]); } catch { /* Storage may be disabled. */ }
  }
}
