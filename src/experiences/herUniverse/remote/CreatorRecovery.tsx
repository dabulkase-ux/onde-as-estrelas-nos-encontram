import {useEffect} from 'react';
import {remoteRepository} from './repository';
import {herProgressStore} from '../progress';
// A new browser is a visitor. Never synthesize an editor from public colors:
// it would lack the private quizzes and could overwrite the existing publication.
export default function CreatorRecovery(){
  useEffect(()=>{let live=true;void remoteRepository.public().then(({publication})=>{
    if(live&&publication&&!herProgressStore.read().accepted)window.location.replace('/universo-dela/visao');
  }).catch(()=>{});return()=>{live=false;};},[]);
  return null;
}
