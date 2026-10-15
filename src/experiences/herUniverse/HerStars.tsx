import type { CSSProperties, RefObject } from 'react';
import { palette, type HerProgress } from './progress';
export function HerStars({progress,quizAccess,coupleAccess,onOpenQuiz,onOpenCouple,compatibility=true,couple=true}:{progress:HerProgress;quizAccess:RefObject<HTMLButtonElement|null>;coupleAccess:RefObject<HTMLButtonElement|null>;onOpenQuiz:()=>void;onOpenCouple:()=>void;compatibility?:boolean;couple?:boolean}) {
  return <>
    {compatibility&&<button ref={quizAccess} className="her-compatibility-star" onClick={onOpenQuiz} aria-label="Nossa Compatibilidade"><svg viewBox="0 0 40 40" aria-hidden="true"><path d="M20 2L24 15L38 20L24 24L20 38L16 24L2 20L16 15Z"/></svg><span>Nossa Compatibilidade</span></button>}
    {couple&&<button ref={coupleAccess} className="her-compatibility-star her-couple-star" style={{'--couple-star':palette.find(color=>color.id===progress.colors[progress.colors.length-1])?.hex??'#c2e2ff'} as CSSProperties} onClick={onOpenCouple} aria-label="Quanto Você Me Conhece?"><svg viewBox="0 0 40 40" aria-hidden="true"><path d="M20 3L25 15L37 20L25 25L20 37L15 25L3 20L15 15Z"/></svg><span>Quanto Você Me Conhece?</span></button>}
  </>;
}
