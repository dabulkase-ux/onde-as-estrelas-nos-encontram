import {postDraftReset} from './helpers/herDraftBaseline';
import { expect, test, type Page } from '@playwright/test';
test.beforeEach(async({page})=>postDraftReset(page));
import { experience } from '../src/config/experience';
import { herUniverseKey } from '../src/experiences/herUniverse/progress';
async function continueSpeech(page:Page) {
  const speech=page.locator('.nexus-speech');
  if(await speech.getAttribute('data-speaking')==='true')await speech.getByRole('button',{name:'Mostrar frase completa'}).click();
  await speech.getByRole('button',{name:'Continuar',exact:true}).click();
}
async function finishIntroduction(page:Page) {
  for(let line=0;line<4;line++)await continueSpeech(page);
  await expect(page.locator('section[data-her-stage="colors"]')).toBeVisible({timeout:25000});
  await continueSpeech(page);
}
async function finish(page:Page){
  await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/?finish=1');
  const pin=[experience.birthdays.firstDay,experience.birthdays.secondDay].map(day=>String(day).padStart(2,'0')).join('');
  for(const digit of pin)await page.getByRole('button',{name:digit,exact:true}).click();
  const scanner=page.getByRole('button',{name:/Leitor visual fictício/});await expect(scanner).toBeVisible({timeout:15000});
  await scanner.focus();await page.keyboard.down('Enter');await expect(page.locator('[data-act="recognized"]')).toBeVisible({timeout:6000});await page.keyboard.up('Enter');
  await expect(page.getByText('Depois de tudo isso… será que você conseguiria olhar pra mim de um jeito diferente?',{exact:true})).toBeVisible({timeout:40000});
}
test('Eyes affirmation goes to Nexus, travels, creates and persists without reload',async({page})=>{
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  await finish(page);
  await expect(page.getByText('Depois de tudo isso… será que você conseguiria olhar pra mim de um jeito diferente?',{exact:true})).toBeVisible();
  await page.evaluate(()=>{(window as Window & {continuity?:string}).continuity='same-page';});
  await expect(page.getByRole('button',{name:'Sim, pode',exact:true})).toBeVisible();
  await page.screenshot({path:'test-results/eyes-romantic-confirmation.png'});
  await page.getByRole('button',{name:'Sim, pode',exact:true}).click();
  await expect(page).toHaveURL(/\/universo-dela$/,{timeout:10000});
  await expect(page.locator('section[data-her-stage="travel"]')).toBeVisible();
  await finishIntroduction(page);
  await expect(page.getByRole('button',{name:'Azul',exact:true})).toBeVisible();
  expect(await page.evaluate(()=>(window as Window & {continuity?:string}).continuity)).toBe('same-page');
  await page.getByRole('button',{name:'Azul',exact:true}).click();await page.getByRole('button',{name:'Rosa',exact:true}).click();
  await expect(page.getByRole('button',{name:'Verde',exact:true})).toBeDisabled();
  await page.getByRole('button',{name:'Verde',exact:true}).click({force:true});await expect(page.getByRole('button',{name:'Verde',exact:true})).toHaveAttribute('aria-pressed','false');
  await page.getByRole('button',{name:'Azul',exact:true}).click();await page.getByRole('button',{name:'Verde',exact:true}).click();
  await expect(page.getByRole('button',{name:'Verde',exact:true})).toHaveAttribute('aria-pressed','true');
  await page.getByRole('button',{name:'Criar minhas estrelas'}).click();await expect(page.locator('section[data-her-stage="creating"]')).toBeVisible();
  await continueSpeech(page);
  await expect(page.locator('section[data-her-stage="ready"]')).toBeVisible();
  await expect.poll(()=>page.locator('canvas').getAttribute('data-her-star-count')).not.toBe('0');
  await page.reload();await expect(page.locator('section[data-her-stage="ready"]')).toBeVisible();await expect(page.locator('.nexus-speech')).toHaveCount(0);expect(errors).toEqual([]);
  const canvas=page.locator('canvas[data-renderer="webgl"]');
  await canvas.focus();await page.keyboard.press('ArrowRight');await page.keyboard.press('+');
  await expect(canvas).toBeFocused();
});
test('normal motion keeps one canvas through travel and gradual birth',async({page})=>{
  await finish(page);await page.emulateMedia({reducedMotion:'no-preference'});
  await page.getByRole('button',{name:'Sim, pode',exact:true}).click();
  await expect(page).toHaveURL(/\/universo-dela$/,{timeout:10000});
  await expect(page.locator('section[data-her-stage="travel"]')).toBeVisible();
  await expect(page.locator('canvas')).toHaveCount(1);
  await finishIntroduction(page);
  await expect(page.getByRole('button',{name:'Turquesa',exact:true})).toBeVisible({timeout:25000});
  await page.getByRole('button',{name:'Turquesa',exact:true}).click();
  await page.getByRole('button',{name:'Criar minhas estrelas'}).click();
  await continueSpeech(page);
  const canvas=page.locator('canvas');
  await expect.poll(async()=>Number(await canvas.getAttribute('data-her-star-count'))).toBeGreaterThan(0);
  const first=Number(await canvas.getAttribute('data-her-star-count'));
  await expect.poll(async()=>Number(await canvas.getAttribute('data-her-star-count'))).toBeGreaterThan(first);
  await expect(page.locator('section[data-her-stage="ready"]')).toBeVisible({timeout:15000});
  await canvas.screenshot({path:'test-results/her-universe-normal.png'});
});
test('Eyes waits for romantic affirmation and decline never starts creation',async({page})=>{
  await finish(page);
  await expect(page.getByText('Eu te mostrei o meu universo… será que posso conhecer o seu também?',{exact:true})).toBeVisible();
  await page.waitForTimeout(5500);await expect(page).toHaveURL(/\/\?finish=1$/);
  await expect(page.locator('.nexus-text')).toHaveCount(0);
  await page.getByRole('button',{name:'Agora não',exact:true}).click();
  await expect(page.getByText('Tudo bem. Obrigado por conhecer o meu universo.',{exact:true})).toBeVisible();
  expect(await page.evaluate(key=>localStorage.getItem(key),herUniverseKey)).toBeNull();
  await page.getByRole('button',{name:'Voltar à galáxia',exact:true}).click();
  await expect(page.getByRole('dialog',{name:'Constelação dos Olhos'})).toBeHidden();
});
test('direct route without acceptance provides a discreet return',async({page})=>{
  await page.goto('/universo-dela');await expect(page.getByRole('link',{name:'Conhecer o universo original'})).toBeVisible();
  await expect(page.getByText('NEXUS',{exact:true})).toBeHidden();
});
for(const width of [320,390,430,1440])test(`one color and responsive restoration at ${width}`,async({page})=>{
  await page.setViewportSize({width,height:850});await page.emulateMedia({reducedMotion:'reduce'});
  await page.addInitScript(key=>{if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify({version:1,accepted:true,colors:[],stage:'colors',created:false}));},herUniverseKey);
  await page.goto('/universo-dela');await page.getByRole('button',{name:'Dourado',exact:true}).click();
  await page.reload();await expect(page.getByRole('button',{name:'Dourado',exact:true})).toHaveAttribute('aria-pressed','true');
  await continueSpeech(page);
  await page.getByRole('button',{name:'Criar minhas estrelas'}).click();await continueSpeech(page);await expect(page.locator('section[data-her-stage="ready"]')).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:`test-results/her-universe-${width}.png`});
});
