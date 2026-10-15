import { coupleQuestions, letters, specialFeedbacks, wrongFeedback, type Letter } from './data';
export const coupleStorageKey = 'meu-universo.couple.v1';
export type CoupleProgress = { answers: (Letter | null)[]; completed: boolean };
export function emptyCoupleProgress(): CoupleProgress { return { answers: coupleQuestions.map(() => null), completed: false }; }
export function readCoupleProgress(): CoupleProgress {
 try {
  const value = JSON.parse(localStorage.getItem(coupleStorageKey) ?? 'null');
  if (!value || !Array.isArray(value.answers) || value.answers.length !== 10) return emptyCoupleProgress();
  // Only a contiguous sequence can be resumed. No invitation choice is stored.
  let gap = false;
  const answers = value.answers.map((answer: unknown) => {
   if (gap || !letters.includes(answer as Letter)) { gap = true; return null; }
   return answer as Letter;
  });
  return { answers, completed: value.completed === true && !gap };
 } catch { return emptyCoupleProgress(); }
}
export function saveCoupleProgress(progress: CoupleProgress): boolean {
 try { localStorage.setItem(coupleStorageKey, JSON.stringify(progress)); return true; } catch { return false; }
}
export function isCorrect(index: number, answer: Letter): boolean { return coupleQuestions[index]?.correct === answer; }
export type Point = { x: number; y: number };
// Coordinates are fractions of available space AFTER subtracting the button size.
export function nextEscapePoint(previous: Point, random = Math.random): Point {
 const candidates = [{x:.05,y:.08},{x:.95,y:.08},{x:.05,y:.92},{x:.95,y:.92},{x:.5,y:.5}];
 const distant = candidates.filter(p => Math.hypot(p.x - previous.x,p.y - previous.y) > .4);
 return distant[Math.min(distant.length - 1, Math.max(0, Math.floor(random() * distant.length)))];
}

export function nextVisibleEscapePoint(previous:Point,minY:number,maxY:number,spaceY:number,random=Math.random):Point {
 if(maxY===minY)return {x:previous.x<.5?.95:.05,y:spaceY>0?minY/spaceY:0};
 // Compare points in the visible range, before mapping back to the full area.
 // Otherwise a different nominal point can land at the same rendered position.
 const relative={x:previous.x,y:Math.max(0,Math.min(1,(previous.y*spaceY-minY)/(maxY-minY)))};
 const candidate=nextEscapePoint(relative,random);
 return {x:candidate.x,y:(minY+candidate.y*(maxY-minY))/spaceY};
}


export function getAnswerFeedback(index: number, answer: Letter): { kind: 'correct' | 'special' | 'standard'; text: string } {
 if (isCorrect(index, answer)) return { kind: 'correct', text: coupleQuestions[index].feedback };
 const special = specialFeedbacks[index]?.[answer];
 return special ? { kind: 'special', text: special } : { kind: 'standard', text: wrongFeedback };
}
