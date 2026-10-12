import type { ComponentType } from 'react';
export interface ExperienceModule { id: string; title: string; load: () => Promise<{ default: ComponentType<{ onExit: () => void }> }>; }
// Future experiences are registered here and loaded only when entered from the hub.
export const experienceModules: ExperienceModule[] = [{ id: 'compatibility', title: 'Compatibilidade', load: () => import('./compatibility/CompatibilityQuiz') }, { id: 'couple', title: 'Quiz de Casal', load: () => import('./couple/CoupleQuiz') }];



