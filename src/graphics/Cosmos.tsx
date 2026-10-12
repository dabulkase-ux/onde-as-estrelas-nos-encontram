import { useEffect, useRef, useState } from 'react';
import type { LetterId } from '../experiences/letters/data';
import type { LetterProjection } from '../experiences/letters/LetterTargets';
import type { Navigation } from './travel';
import type { Act } from '../core/state';
import type { GardenProjection, SceneInput } from './engine';
import type { BlackHoleProjection } from './blackHoleScene';
import type { BlackHoleFragmentId } from '../experiences/blackHole/data';
import { FallbackCanvas } from './FallbackCanvas';
export default function Cosmos({ eyesWatched, eyesHint, onEyesReady, onEyesProjection, act, scan, reduced, onFormed, quizOpen = false, compatibilityCompleted = false, onCompatibility, onCouple, navigation, onTravelComplete, lettersRead, onLetter, onLetterProjection, onLettersFallback, onGarden, onGardenProjection, onBlackHole, onBlackHoleFragment, onBlackHoleAccessProjection, onBlackHoleProjection, blackHoleDiscovered, blackHoleStarFormed, onBlackHoleStarFormed, shootingState, onWish }: { eyesWatched?: boolean; eyesHint?: boolean; onEyesReady?: () => void; onEyesProjection?: (point: GardenProjection) => void; act: Act; scan: number; reduced: boolean; onFormed: () => void; quizOpen?: boolean; compatibilityCompleted?: boolean; onCompatibility?: () => void; onCouple?: () => void; navigation?: Navigation; onTravelComplete?: () => void; lettersRead?: readonly LetterId[]; onLetter?: (id: LetterId) => void; onLetterProjection?: (points: readonly LetterProjection[]) => void; onLettersFallback?: () => void; onGarden?: () => void; onGardenProjection?: (projection: GardenProjection) => void; onBlackHole?: () => void; onBlackHoleFragment?: (id: BlackHoleFragmentId) => void; onBlackHoleAccessProjection?: (projection: GardenProjection) => void; onBlackHoleProjection?: (points: readonly BlackHoleProjection[]) => void; blackHoleDiscovered?: readonly BlackHoleFragmentId[]; blackHoleStarFormed?: boolean; onBlackHoleStarFormed?: () => void; shootingState?: SceneInput['shootingState']; onWish?: () => void }) {
  const canvas = useRef<HTMLCanvasElement>(null); const [fallback, setFallback] = useState(false);
  const engine = useRef<ReturnType<typeof import('./engine').mountEngine> | null>(null);
  const input = useRef<SceneInput>({ mode: 'hidden', scan: 0, reduced });
  const mode = ['forming','universe'].includes(act) ? 'galaxy' : ['scan','recognized','love'].includes(act) ? 'fingerprint' : 'hidden';
  useEffect(() => { input.current = { eyesWatched, eyesHint, onEyesReady, onEyesProjection, shootingState, onWish, onGarden, onGardenProjection, onBlackHole, onBlackHoleFragment, onBlackHoleAccessProjection, onBlackHoleProjection, blackHoleDiscovered, blackHoleStarFormed, onBlackHoleStarFormed, mode, scan, reduced, suspended: quizOpen && navigation?.phase !== 'BLACK_HOLE_ACTIVE', compatibilityCompleted, onCompatibility, onCouple, navigation, onTravelComplete, lettersRead, onLetter, onLetterProjection }; }, [eyesWatched, eyesHint, onEyesReady, onEyesProjection, shootingState, onWish, onGarden, onGardenProjection, onBlackHole, onBlackHoleFragment, onBlackHoleAccessProjection, onBlackHoleProjection, blackHoleDiscovered, blackHoleStarFormed, onBlackHoleStarFormed, mode, scan, reduced, quizOpen, compatibilityCompleted, onCompatibility, onCouple, navigation, onTravelComplete, lettersRead, onLetter, onLetterProjection]);
  useEffect(() => { engine.current?.wake(); }, [eyesWatched, eyesHint, shootingState, act, mode, reduced, quizOpen, compatibilityCompleted, navigation, lettersRead, blackHoleDiscovered, blackHoleStarFormed]);
  useEffect(() => {
    let cancelled = false;
    void import('./engine').then(({ mountEngine }) => { if (cancelled || !canvas.current) return; try { engine.current = mountEngine(canvas.current, input, onFormed, () => setFallback(true)); } catch { setFallback(true); } }).catch(() => setFallback(true));
    return () => { cancelled = true; engine.current?.dispose(); engine.current = null; };
  }, [onFormed]);
  useEffect(() => { if (fallback) { engine.current?.dispose(); engine.current = null; onLettersFallback?.(); } }, [fallback, onLettersFallback]);
  useEffect(() => {
    if (!fallback || !navigation || !['TRAVEL_TO_DESTINATION','PORTAL_ENTRY','BLACK_HOLE_ENTRY','RETURN_TO_GALAXY'].includes(navigation.phase)) return;
    const timer = setTimeout(() => onTravelComplete?.(), reduced || navigation.skip ? 0 : 450);
    return () => clearTimeout(timer);
  }, [fallback, navigation, reduced, onTravelComplete]);
  return fallback ? <FallbackCanvas shootingState={shootingState} input={input} onFormed={onFormed} mode={mode} reduced={reduced}/> : <canvas ref={canvas} className="cosmos-canvas" aria-hidden="true" data-renderer="webgl"/>;
}
