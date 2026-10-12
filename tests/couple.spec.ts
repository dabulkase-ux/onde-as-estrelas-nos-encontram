import { test, expect, type Page } from '@playwright/test';
import { experience } from '../src/config/experience';
import { acceptanceFooter, acceptanceTitle, coupleQuestions, lastStar, letterTitle, loveLetter, specialFeedbacks, wrongFeedback } from '../src/experiences/couple/data';
import { coupleStorageKey } from '../src/experiences/couple/logic';
import { storageKey } from '../src/experiences/compatibility/logic';
async function enterUniverse(page:Page) {
 await page.goto('/');
 const pin=[experience.birthdays.firstDay,experience.birthdays.secondDay].map(d=>String(d).padStart(2,'0')).join('');
 for (const digit of pin) await page.getByRole('button',{name:digit,exact:true}).click();
 const scanner=page.getByRole('button',{name:/Leitor visual fictício/}); await expect(scanner).toBeVisible({timeout:15000});
 await scanner.focus(); await page.keyboard.down('Enter'); await expect(page.locator('[data-act="recognized"]')).toBeVisible({timeout:6000}); await page.keyboard.up('Enter');
 await expect(page.locator('[data-act="universe"]')).toBeVisible({timeout:20000});
}
for (const width of [320,390,430,1440]) test(`couple journey, letter, invitation and replay ${width}`,async({page})=>{
 const errors:string[]=[]; page.on('pageerror',e=>errors.push(e.message));
 await page.setViewportSize({width,height:width===320?568:900}); await page.emulateMedia({reducedMotion:'reduce'});
 await page.addInitScript(key=>localStorage.setItem(key,'compatibility-preserved'),storageKey);
 await enterUniverse(page); const access=page.getByRole('button',{name:'Quiz de Casal',exact:true}); await access.focus(); await page.keyboard.press('Enter');
 const quiz=page.getByRole('region',{name:'Quiz de Casal',exact:true});
 const emoji=/(?:\p{Extended_Pictographic}|\p{Regional_Indicator}|\u2661|\uFE0F|\u20E3)/u;
 for(let i=0;i<10;i++) {
  await expect(quiz.getByRole('heading',{name:coupleQuestions[i].text,exact:true})).toBeVisible();
  await expect(quiz.getByText(`${String(i+1).padStart(2,'0')}/10`,{exact:true})).toBeVisible();
  const answer=i===2?'B':coupleQuestions[i].correct;
  await quiz.getByRole('radio',{name:`${answer}. ${coupleQuestions[i].options['ABCD'.indexOf(answer)]}`,exact:true}).focus(); await page.keyboard.press('Space');
  await expect(quiz.getByRole('status').getByText(i===2?specialFeedbacks[2].B!:coupleQuestions[i].feedback,{exact:true})).toBeVisible();
  await expect(quiz.getByRole('radio').first()).toBeDisabled();
  expect(await quiz.textContent()).not.toMatch(emoji);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  if(i===0) await page.screenshot({path:`test-results/couple-question-${width}.png`});
  await quiz.getByRole('button',{name:i===9?'Seguir para a última estrela':'Próxima estrela',exact:true}).click();
 }
 await expect(quiz.getByRole('heading',{name:lastStar,exact:true})).toBeVisible();
 await expect(quiz.getByRole('button',{name:'Sim',exact:true})).toHaveCount(0);
 await quiz.getByRole('button',{name:'Ler sua carta'}).click();
 await expect(quiz.getByRole('heading',{name:letterTitle,exact:true})).toBeVisible();
 for(const paragraph of loveLetter) await expect(quiz.getByText(paragraph,{exact:true})).toBeVisible();
 await expect(quiz.getByRole('heading',{name:'Aceita ficar comigo?',exact:true})).toHaveCount(0);
 await quiz.getByText(loveLetter[6],{exact:true}).scrollIntoViewIfNeeded(); await page.screenshot({path:`test-results/couple-letter-${width}.png`});
 expect(await quiz.textContent()).not.toMatch(emoji);
 await quiz.getByRole('button',{name:'Ainda tem uma última coisa…',exact:true}).click();
 expect(await quiz.textContent()).not.toMatch(emoji);
 const no=quiz.getByRole('button',{name:'Não',exact:true}); await no.focus(); const initial=await no.getAttribute('style'); await page.keyboard.press('Enter'); await expect(no).toBeFocused(); expect(await no.getAttribute('style')).toBe(initial);
 await quiz.getByRole('button',{name:'Sim',exact:true}).click();
 await expect(no).toHaveCount(0); await expect(quiz.getByRole('heading',{name:acceptanceTitle,exact:true})).toBeVisible(); await expect(quiz.getByText(acceptanceFooter,{exact:true})).toBeVisible();
 expect(await quiz.textContent()).not.toMatch(emoji);
 await page.screenshot({path:`test-results/couple-accepted-${width}.png`});
 await quiz.getByRole('button',{name:'Explorar nosso universo',exact:true}).click(); await expect(quiz).toHaveCount(0); await expect(access).toBeFocused();
 expect(await page.evaluate(key=>localStorage.getItem(key),storageKey)).toBe('compatibility-preserved');
 await access.click(); await quiz.getByRole('button',{name:'Reler a declaração',exact:true}).click(); await expect(quiz.getByRole('heading',{name:letterTitle,exact:true})).toBeVisible();
 await page.keyboard.press('Escape'); await expect(quiz).toHaveCount(0);
 await page.reload(); await enterUniverse(page); await access.click(); await quiz.getByRole('button',{name:'Iniciar o Quiz de Casal novamente',exact:true}).click(); await expect(quiz.getByText('01/10',{exact:true})).toBeVisible(); await expect(quiz.getByRole('radio',{checked:true})).toHaveCount(0);
 expect(errors).toEqual([]);
});
async function savedLetter(page:Page) {
 await page.addInitScript(({key,answers})=>localStorage.setItem(key,JSON.stringify({answers,completed:true})),{key:coupleStorageKey,answers:coupleQuestions.map(q=>q.correct)});
 await page.emulateMedia({reducedMotion:'reduce'}); await enterUniverse(page);
 await page.getByRole('button',{name:'Quiz de Casal',exact:true}).click();
 await page.getByRole('button',{name:'Reler a declaração'}).click();
 await page.getByRole('button',{name:'Ainda tem uma última coisa…'}).click();
 await page.emulateMedia({reducedMotion:'no-preference'});
}
test('desktop proximity, safe positions, landscape and exit without accepting',async({page})=>{
 await page.setViewportSize({width:844,height:390}); await savedLetter(page);
 const quiz=page.getByRole('region',{name:'Quiz de Casal',exact:true}); const no=quiz.getByRole('button',{name:'Não',exact:true}); const yes=quiz.getByRole('button',{name:'Sim',exact:true});
 await no.scrollIntoViewIfNeeded(); const stable=await yes.boundingBox();
 for(let i=0;i<5;i++) {
  const before=await no.getAttribute('style'); const box=(await no.boundingBox())!;
  await page.mouse.move(box.x-20,box.y+box.height/2); await expect.poll(()=>no.getAttribute('style')).not.toBe(before);
  await page.waitForTimeout(250); const moved=(await no.boundingBox())!;
  expect(moved.x).toBeGreaterThanOrEqual(0); expect(moved.x+moved.width).toBeLessThanOrEqual(844); expect(moved.y).toBeGreaterThanOrEqual(0); expect(moved.y+moved.height).toBeLessThanOrEqual(390);
 }
 expect(await yes.boundingBox()).toEqual(stable);
 await page.screenshot({path:'test-results/couple-invitation-landscape.png'});
 await quiz.getByRole('button',{name:'Voltar ao nosso universo',exact:true}).click(); await expect(quiz).toHaveCount(0);
});
test.describe('touch invitation',()=>{
 test.use({hasTouch:true});
 test('touch escape, bounded button, acceptance and reduced motion',async({page})=>{
 await page.setViewportSize({width:320,height:568}); await savedLetter(page);
 const quiz=page.getByRole('region',{name:'Quiz de Casal',exact:true}); const no=quiz.getByRole('button',{name:'Não',exact:true});
 await no.scrollIntoViewIfNeeded(); const before=await no.getAttribute('style'); const b=(await no.boundingBox())!; await page.touchscreen.tap(b.x+b.width/2,b.y+b.height/2);
 await expect.poll(()=>no.getAttribute('style')).not.toBe(before); await page.waitForTimeout(250);
 const moved=(await no.boundingBox())!; expect(moved.x).toBeGreaterThanOrEqual(0); expect(moved.x+moved.width).toBeLessThanOrEqual(320); expect(moved.y).toBeGreaterThanOrEqual(0); expect(moved.y+moved.height).toBeLessThanOrEqual(568);
 await page.screenshot({path:'test-results/couple-invitation-touch.png'});
 await page.emulateMedia({reducedMotion:'reduce'}); const steady=await no.getAttribute('style'); await no.tap(); expect(await no.getAttribute('style')).toBe(steady);
 await quiz.getByRole('button',{name:'Sim',exact:true}).tap(); await expect(quiz.getByRole('heading',{name:acceptanceTitle,exact:true})).toBeVisible();
 await quiz.getByRole('button',{name:'Explorar nosso universo'}).tap(); await expect(quiz).toHaveCount(0);
 });
});


test('gradual letter, normal-motion celebration and cancellation',async({page})=>{
 await page.addInitScript(({key,answers})=>localStorage.setItem(key,JSON.stringify({answers,completed:true})),{key:coupleStorageKey,answers:coupleQuestions.map(q=>q.correct)});
 await page.emulateMedia({reducedMotion:'reduce'}); await enterUniverse(page);
 await page.getByRole('button',{name:'Quiz de Casal',exact:true}).click(); await page.emulateMedia({reducedMotion:'no-preference'});
 const quiz=page.getByRole('region',{name:'Quiz de Casal',exact:true}); await quiz.getByRole('button',{name:'Reler a declaração'}).click();
 await expect(quiz.getByText(loveLetter[0],{exact:true})).toBeVisible(); await expect(quiz.getByText(loveLetter[1],{exact:true})).toHaveCount(0);
 await expect(quiz.getByRole('button',{name:'Ainda tem uma última coisa…'})).toHaveCount(0);
 await expect(quiz.getByText(loveLetter[1],{exact:true})).toBeVisible({timeout:4000}); await quiz.getByRole('button',{name:'Mostrar a carta inteira'}).click();
 await quiz.getByRole('button',{name:'Ainda tem uma última coisa…'}).click(); await quiz.getByRole('button',{name:'Sim',exact:true}).click();
 await expect(quiz.getByRole('button',{name:'Não',exact:true})).toHaveCount(0);
 await expect(quiz.getByRole('button',{name:'Explorar nosso universo'})).toHaveCount(0);
 await expect(quiz.getByRole('button',{name:'Explorar nosso universo'})).toBeVisible({timeout:5000});
 await page.screenshot({path:'test-results/couple-celebration-normal.png'});
 await quiz.getByRole('button',{name:'Explorar nosso universo'}).click(); await expect(quiz).toHaveCount(0);
 await page.getByRole('button',{name:'Quiz de Casal',exact:true}).click(); await quiz.getByRole('button',{name:'Reler a declaração'}).click(); await page.keyboard.press('Escape'); await expect(quiz).toHaveCount(0);
 await page.waitForTimeout(2300); await expect(page.locator('[data-act="universe"]')).toBeVisible();
});

test('both 3D destinations open through the existing raycaster',async({page})=>{
 const {PerspectiveCamera,Vector3}=await import('three');
 await page.setViewportSize({width:1440,height:900}); await page.emulateMedia({reducedMotion:'reduce'}); await enterUniverse(page);
 const canvas=page.locator('canvas[data-renderer="webgl"]'); await expect(canvas).toHaveCSS('pointer-events','auto');
 const camera=new PerspectiveCamera(45,1440/900,.1,120);
 camera.position.set(Math.sin(1.25)*Math.cos(Math.PI*.85)*14.5,Math.cos(1.25)*14.5*.72,Math.sin(1.25)*Math.sin(Math.PI*.85)*14.5);
 camera.lookAt(0,0,0); camera.updateMatrixWorld();
 for(const [position,name,close] of [[[-2.8,2.5,3.5],'Quiz de Casal','Voltar à galáxia'],[[0,2.7,2],'Quiz de compatibilidade','Voltar à galáxia']] as const) {
  const p=new Vector3(...position).project(camera); const box=(await canvas.boundingBox())!;
  await page.mouse.click(box.x+(p.x+1)*box.width/2,box.y+(1-p.y)*box.height/2);
  const region=page.getByRole('region',{name,exact:true}); await expect(region).toBeVisible(); await region.getByRole('button',{name:close,exact:true}).click(); await expect(region).toHaveCount(0);
  await expect(canvas).toHaveCSS('pointer-events','auto');
 }
});



test('all forty choices show the approved feedback and permit advance',async({page})=>{
 test.setTimeout(90000);
 await page.emulateMedia({reducedMotion:'reduce'}); await enterUniverse(page);
 const access=page.getByRole('button',{name:'Quiz de Casal',exact:true});
 const quiz=page.getByRole('region',{name:'Quiz de Casal',exact:true});
 const emoji=/(?:\p{Extended_Pictographic}|\p{Regional_Indicator}|\u2661|\uFE0F|\u20E3)/u;
 for(let index=0;index<10;index++) for(const answer of ['A','B','C','D'] as const) {
  await page.evaluate(({key,answers})=>localStorage.setItem(key,JSON.stringify({answers,completed:false})),{key:coupleStorageKey,answers:coupleQuestions.map((q,i)=>i<index?q.correct:null)});
  await access.click();
  const q=coupleQuestions[index]; await expect(quiz.getByRole('heading',{name:q.text,exact:true})).toBeVisible();
  await quiz.getByRole('radio',{name:`${answer}. ${q.options['ABCD'.indexOf(answer)]}`,exact:true}).check();
  const special=specialFeedbacks[index][answer]; const kind=answer===q.correct?'correct':special?'special':'standard';
  const status=quiz.getByRole('status');
  await expect(status).toHaveAttribute('data-feedback-kind',kind);
  await expect(status.getByText(kind==='correct'?q.feedback:kind==='special'?special!:wrongFeedback,{exact:true})).toBeVisible();
  if(kind==='special') { await expect(status.getByText(wrongFeedback,{exact:true})).toHaveCount(0); await expect(status.locator('.couple-answer')).toHaveCount(0); }
  expect(await quiz.textContent()).not.toMatch(emoji);
  await quiz.getByRole('button',{name:index===9?'Seguir para a última estrela':'Próxima estrela',exact:true}).click();
  await expect(quiz.getByRole('heading',{name:index===9?lastStar:coupleQuestions[index+1].text,exact:true})).toBeVisible();
  await page.keyboard.press('Escape'); await expect(quiz).toHaveCount(0);
 }
});


