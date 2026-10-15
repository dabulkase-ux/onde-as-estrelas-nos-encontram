import { blankQuiz, limits, parseQuiz, type QuizDraft } from './model';
import type { SaveResult } from '../herCompatibility/repository';
import { notifyLocalUniverseChange } from '../herUniverse/localChange';
export const herCoupleKey='meu-universo.her-couple.v1';
export const coupleRepository={
  load():{draft:QuizDraft;error?:string}{
    try{const raw=localStorage.getItem(herCoupleKey);return {draft:raw?parseQuiz(raw):blankQuiz()};}
    catch{return {draft:blankQuiz(),error:'Não foi possível ler seu rascunho de casal. Os dados salvos foram preservados.'};}
  },
  save(draft:QuizDraft):SaveResult{
    try{
      const raw=JSON.stringify(draft);
      if(raw.length>limits.storageCharacters)return {ok:false,error:'Este rascunho atingiu o limite técnico de armazenamento. Reduza os textos para salvar; a última versão salva permanece intacta.'};
      localStorage.setItem(herCoupleKey,raw);notifyLocalUniverseChange();return {ok:true};
    }catch{return {ok:false,error:'O navegador não permitiu salvar. Mantenha esta página aberta; a última versão salva permanece intacta.'};}
  },
};
