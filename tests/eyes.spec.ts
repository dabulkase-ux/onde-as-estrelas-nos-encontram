import { expect, test, type Page } from '@playwright/test';
import { experience } from '../src/config/experience';
import { questions } from '../src/experiences/compatibility/data';
import { coupleQuestions } from '../src/experiences/couple/data';
import { blackHoleFragments } from '../src/experiences/blackHole/data';
import { letterIds } from '../src/experiences/letters/data';
import { eyesPhrase } from '../src/experiences/eyes/progress';
test.use({hasTouch:true});
async function enter(page:Page,waitForExploration=true) {
  const pin=[experience.birthdays.firstDay,experience.birthdays.secondDay].map(day=>String(day).padStart(2,'0')).join('');
  for(const digit of pin)await page.getByRole('button',{name:digit,exact:true}).click();
  const scanner=page.getByRole('button',{name:/Leitor visual fictício/});await expect(scanner).toBeVisible({timeout:15000});
  await scanner.focus();await page.keyboard.down('Enter');await expect(page.locator('[data-act="recognized"]')).toBeVisible({timeout:6000});await page.keyboard.up('Enter');
  await expect(page.locator('[data-act="universe"]')).toBeVisible({timeout:25000});
  if(waitForExploration)await expect(page.locator('.is-exploring')).toBeVisible({timeout:10000});
}
async function seed(page:Page,watched=false) {
  await page.addInitScript(({compatibility,couple,fragments,letters,watched})=>{
    localStorage.setItem('meu-universo.compatibility.v1',JSON.stringify({answers:compatibility,completed:true}));
    localStorage.setItem('meu-universo.couple.v1',JSON.stringify({answers:couple,completed:true}));
    localStorage.setItem('meu-universo.lost-letters.v1',JSON.stringify({version:1,read:letters}));
    localStorage.setItem('meu-universo.black-hole-secrets.v1',JSON.stringify({version:1,discovered:fragments,starFormed:true}));
    if(watched)localStorage.setItem('meu-universo.eyes-constellation.v1',JSON.stringify({version:1,watched:true}));
  },{compatibility:questions.map(q=>q.options[0].id),couple:coupleQuestions.map(q=>q.correct),fragments:blackHoleFragments.map(f=>f.id),letters:[...letterIds],watched});
}
async function explore(page:Page,seconds=14) {
  for(let i=0;i<seconds;i++) {
    if(await page.locator('[data-navigation="EYES_ACTIVE"]').count())return;
    await page.locator('canvas[data-renderer="webgl"]').dispatchEvent('wheel',{deltaY:1});await page.waitForTimeout(1000);
  }
}
for(const width of [320,390,430,1440])test(`automatic eyes, contemplation and romantic affirmation to Nexus at ${width}px`,async({page})=>{
  test.setTimeout(130000);await page.setViewportSize({width,height:width===1440?900:740});await page.emulateMedia({reducedMotion:'reduce'});
  await seed(page);await page.goto('/');await enter(page);
  await page.waitForTimeout(1500);await expect(page.locator('[data-navigation="GALAXY_IDLE"]')).toBeVisible();
  if(width===1440)await page.emulateMedia({reducedMotion:'no-preference'});
  await explore(page);await expect(page.getByRole('dialog',{name:'Constelação dos Olhos'})).toBeVisible();
  const canvas=page.locator('canvas[data-renderer="webgl"]');
  await expect(page.getByText(eyesPhrase,{exact:true})).toBeVisible({timeout:35000});
  await expect(canvas).toHaveAttribute('data-eyes-count','2');await expect(canvas).toHaveAttribute('data-eyes-formed','true');
  await expect(page.getByRole('button',{name:'Quiz de Casal',exact:true})).toBeHidden();
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('meu-universo.eyes-constellation.v1')!).watched)).toBe(true);
  await page.waitForTimeout(2800);await expect(page.getByText(eyesPhrase,{exact:true})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:`test-results/eyes-${width}.png`});
  if(width===390){const center=JSON.parse((await canvas.getAttribute('data-eyes-center'))!);await page.screenshot({path:'test-results/eyes-reference-detail-mobile.png',clip:{x:0,y:Math.max(0,center[1]-97.5),width:390,height:195}});}
  await page.getByRole('button',{name:'Sim, pode',exact:true}).click();
  await expect(page).toHaveURL(/\/universo-dela$/,{timeout:10000});
  await expect(page.locator('section[data-her-stage="travel"]')).toBeVisible();
  await expect(page.locator('canvas')).toHaveCount(1);

});
test('reference artwork forms from scattered stars before lines and the final sentence',async({page})=>{
  test.setTimeout(130000);
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  page.on('console',message=>{if(message.type()==='error'&&/shader|WebGLProgram/i.test(message.text()))errors.push(message.text());});
  await page.setViewportSize({width:1440,height:900});await page.emulateMedia({reducedMotion:'reduce'});
  await seed(page,true);await page.goto('/');await enter(page);
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.getByRole('button',{name:'Rever o olhar entre as estrelas'}).focus();await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog',{name:'Constelação dos Olhos'})).toBeVisible();
  await page.waitForTimeout(1800);await page.screenshot({path:'test-results/eyes-reference-dark.png'});
  await page.waitForTimeout(4200);await expect(page.getByText(eyesPhrase,{exact:true})).toBeHidden();
  await page.screenshot({path:'test-results/eyes-reference-dispersed.png'});
  await page.waitForTimeout(6000);await expect(page.getByText(eyesPhrase,{exact:true})).toBeHidden();
  await page.screenshot({path:'test-results/eyes-reference-connecting.png'});
  await expect(page.getByText(eyesPhrase,{exact:true})).toBeVisible({timeout:20000});await page.waitForTimeout(3200);
  await page.screenshot({path:'test-results/eyes-reference-final-desktop.png'});
  const center=JSON.parse((await page.locator('canvas[data-renderer="webgl"]').getAttribute('data-eyes-center'))!);
  await page.screenshot({path:'test-results/eyes-reference-detail-desktop.png',clip:{x:280,y:Math.max(0,center[1]-220),width:880,height:440}});
  expect(errors).toEqual([]);
  await page.getByRole('button',{name:'Sim, pode',exact:true}).click();
  await expect(page).toHaveURL(/\/universo-dela$/,{timeout:10000});
});
test('an unlocked pending finale never interrupts an active quiz',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});await seed(page);await page.goto('/');await enter(page);
  await page.getByRole('button',{name:'Quiz de Casal',exact:true}).click();
  await expect(page.locator('[data-navigation="QUIZ_ACTIVE"]')).toBeVisible({timeout:10000});
  await explore(page,14);await expect(page.locator('[data-navigation="QUIZ_ACTIVE"]')).toBeVisible();
  await expect(page.getByRole('dialog',{name:'Constelação dos Olhos'})).toBeHidden();
});
test('waits for a held gesture to end before starting',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});await seed(page);await page.goto('/');await enter(page);
  const root=page.locator('.experience');await root.dispatchEvent('pointerdown',{pointerId:77,buttons:1});
  await explore(page,14);await expect(page.getByRole('dialog',{name:'Constelação dos Olhos'})).toBeHidden();
  await root.dispatchEvent('pointerup',{pointerId:77,buttons:0});
  await expect(page.getByRole('dialog',{name:'Constelação dos Olhos'})).toBeVisible({timeout:6000});
  await expect(page.getByText(eyesPhrase,{exact:true})).toBeVisible({timeout:10000});
  await page.getByRole('button',{name:'Sim, pode',exact:true}).click();
  await expect(page).toHaveURL(/\/universo-dela$/,{timeout:10000});
});
test('persisted replay does not auto-trigger and a quiz is never interrupted',async({page})=>{
  test.setTimeout(130000);
  await page.emulateMedia({reducedMotion:'reduce'});await seed(page,true);await page.goto('/');await enter(page);
  await explore(page);await expect(page.getByRole('dialog',{name:'Constelação dos Olhos'})).toBeHidden();
  await page.getByRole('button',{name:'Quiz de Casal',exact:true}).click();
  await expect(page.locator('[data-navigation="QUIZ_ACTIVE"]')).toBeVisible({timeout:10000});
  await explore(page,14);await expect(page.locator('[data-navigation="QUIZ_ACTIVE"]')).toBeVisible();
  await page.reload();await enter(page);await expect(page.getByRole('button',{name:'Rever o olhar entre as estrelas'})).toBeVisible();
});
test('finish URL starts the finale without changing saved experience progress and can replay after reload',async({page})=>{
  test.setTimeout(180000);
  await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/?finish=1');await enter(page,false);
  await expect(page.locator('[data-navigation="GALAXY_IDLE"]')).toBeVisible();
  await page.waitForTimeout(400);
  const progressBefore=await page.evaluate(()=>Object.fromEntries([
    'meu-universo.compatibility.v1','meu-universo.couple.v1','meu-universo.lost-letters.v1',
    'meu-universo.black-hole-secrets.v1','meu-universo.eyes-constellation.v1',
  ].map(key=>[key,localStorage.getItem(key)])));
  await expect(page.getByRole('dialog',{name:'Constelação dos Olhos'})).toBeVisible({timeout:12000});
  await expect(page.getByText(eyesPhrase,{exact:true})).toBeVisible({timeout:10000});
  await page.getByRole('button',{name:'Sim, pode',exact:true}).click();
  await expect(page).toHaveURL(/\/universo-dela$/,{timeout:10000});
  const progressAfter=await page.evaluate(()=>Object.fromEntries([
    'meu-universo.compatibility.v1','meu-universo.couple.v1','meu-universo.lost-letters.v1',
    'meu-universo.black-hole-secrets.v1','meu-universo.eyes-constellation.v1',
  ].map(key=>[key,localStorage.getItem(key)])));
  expect(progressAfter).toEqual(progressBefore);
  await page.goto('/?finish=1');await enter(page,false);
  await expect(page.getByRole('dialog',{name:'Constelação dos Olhos'})).toBeVisible({timeout:15000});
});
test('without finish URL the normal unlock requirements still apply',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/');await enter(page);
  await explore(page);
  await expect(page.locator('[data-navigation="GALAXY_IDLE"]')).toBeVisible();
  await expect(page.getByRole('dialog',{name:'Constelação dos Olhos'})).toBeHidden();
  await expect(page.getByRole('button',{name:'Rever o olhar entre as estrelas'})).toBeHidden();
});
