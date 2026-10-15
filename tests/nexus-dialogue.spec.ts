import {postDraftReset} from './helpers/herDraftBaseline';
import { expect, test, type Page } from '@playwright/test';
test.beforeEach(async({page})=>postDraftReset(page));
import { herUniverseKey } from '../src/experiences/herUniverse/progress';
import { nexusLines } from '../src/experiences/herUniverse/NexusSpeech';
test.use({hasTouch:true});
async function travel(page:Page,reduced:boolean) {
  await page.emulateMedia({reducedMotion:reduced?'reduce':'no-preference'});
  await page.addInitScript(key=>{if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify({version:1,accepted:true,colors:[],created:false,stage:'travel',dialogue:0}));},herUniverseKey);
  await page.goto('/universo-dela');
}
test('typing completes on first touch and advances only on the next; visual timers never skip speech',async({page})=>{
  await page.clock.install();await travel(page,false);
  const speech=page.locator('.nexus-speech');
  await expect(speech).toHaveAttribute('data-speaking','true');
  await speech.getByRole('button',{name:'Mostrar frase completa'}).click();
  await expect(speech.locator('.nexus-text')).toHaveText(nexusLines[0]);
  await expect(speech).toHaveAttribute('data-speaking','false');
  await page.clock.runFor(20000);
  await expect(page.locator('section[data-her-stage="travel"]')).toBeVisible();
  await expect(speech.locator('.nexus-text')).toHaveText(nexusLines[0]);
  await speech.getByRole('button',{name:'Continuar',exact:true}).click();
  await expect(speech).toHaveAttribute('data-speaking','true');
  await expect(speech.getByRole('status')).toHaveText(nexusLines[1]);
  await page.clock.runFor(15000);
  await expect(speech.locator('.nexus-text')).toHaveText(nexusLines[1]);
  await expect(page.locator('section[data-her-stage="travel"]')).toBeVisible();
  await page.reload();await expect(speech.getByRole('status')).toHaveText(nexusLines[1]);
});
test('reduced motion, keyboard and failure recovery still require all four acknowledgements',async({page})=>{
  await page.clock.install();
  await page.addInitScript(()=>{window.requestAnimationFrame=()=>0;});
  await travel(page,true);
  await page.clock.runFor(20000);
  await page.getByRole('button',{name:'Continuar',exact:true}).focus();
  for(let line=0;line<4;line++) {
    await expect(page.locator('.nexus-text')).toHaveText(nexusLines[line]);
    await expect(page.locator('.nexus-speech')).toHaveAttribute('data-speaking','false');
    await page.keyboard.press(line%2?'Space':'Enter');
    if(line<3)await expect(page.getByRole('button',{name:'Continuar',exact:true})).toBeFocused();
  }
  await expect(page.locator('section[data-her-stage="colors"]')).toBeVisible();
  await expect(page.getByRole('button',{name:'Criar minhas estrelas'})).toBeDisabled();
  await page.getByRole('button',{name:'Continuar',exact:true}).click();
  await page.getByRole('button',{name:'Azul',exact:true}).click();
  await page.getByRole('button',{name:'Criar minhas estrelas'}).click();
  await page.clock.runFor(11000);
  await expect(page.locator('section[data-her-stage="creating"]')).toBeVisible();
  await page.getByRole('button',{name:'Continuar',exact:true}).click();
  await expect(page.locator('section[data-her-stage="ready"]')).toBeVisible();
});
test('touch controls complete and advance the text at 320px without filling the viewport',async({page})=>{
  await page.setViewportSize({width:320,height:740});await travel(page,false);
  await page.getByRole('button',{name:'Mostrar frase completa'}).tap();
  await expect(page.locator('.nexus-text')).toHaveText(nexusLines[0]);
  await page.screenshot({path:'test-results/nexus-dialogue-touch.png'});
  await page.getByRole('button',{name:'Continuar',exact:true}).tap();
  await expect(page.locator('.nexus-speech').getByRole('status')).toHaveText(nexusLines[1]);
  const panel=await page.locator('.nexus-dialog').boundingBox();expect(panel!.height).toBeLessThan(740*.7);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
