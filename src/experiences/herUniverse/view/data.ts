import { quizRepository } from '../../herCompatibility/repository';
import { coupleRepository } from '../../herCouple/repository';
import { herProgressStore, type HerProgress } from '../progress';
// Read-only projection of the existing repositories. No separate galaxy or quiz copies are saved.
export function loadUniverseView(galaxy:HerProgress=herProgressStore.read()) {
  const compatibility=quizRepository.load(),couple=coupleRepository.load();
  return {
    galaxy:galaxy.accepted&&galaxy.created&&galaxy.colors.length?galaxy:null,
    compatibility:!compatibility.error&&compatibility.draft.status==='completed'?compatibility.draft.questions:null,
    couple:!couple.error&&couple.draft.status==='completed'?couple.draft.questions:null,
    hasErrors:Boolean(compatibility.error||couple.error),
  };
}
export type UniverseViewData=ReturnType<typeof loadUniverseView>;
