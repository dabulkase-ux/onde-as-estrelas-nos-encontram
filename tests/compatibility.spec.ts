import { experience } from '../src/config/experience';
import { test, expect } from '@playwright/test';
import { questions, finalPhrase } from '../src/experiences/compatibility/data';
import { storageKey } from '../src/experiences/compatibility/logic';
async function universe(page: import('@playwright/test').Page) {
 await page.goto('/');
 for (const digit of [experience.birthdays.firstDay, experience.birthdays.secondDay].map(day => String(day).padStart(2,'0')).join('')) await page.getByRole('button', {name:digit,exact:true}).click();
 const scanner = page.getByRole('button',{name:/Leitor visual fictício/});
 await expect(scanner).toBeVisible({timeout:15000}); await scanner.focus(); await page.keyboard.down('Enter');
 await expect(page.locator('[data-act="recognized"]')).toBeVisible({timeout:6000}); await page.keyboard.up('Enter');
 await expect(page.locator('[data-act="universe"]')).toBeVisible({timeout:20000});
}
for (const width of [320,390,430,1440]) test(`compatibility complete and replay ${width}`, async ({page}) => {
 await page.setViewportSize({width,height:width === 320 ? 568 : 900});
 await page.emulateMedia({reducedMotion:width === 1440 ? 'no-preference' : 'reduce'});
 await universe(page);
 const access = page.getByRole('button',{name:/Compatibilidade/}); await access.focus(); await page.keyboard.press('Enter');
 const quiz = page.getByRole('region',{name:'Quiz de compatibilidade'});
 await expect(quiz).toBeVisible({timeout:10000});
 for (let i=0; i<10; i++) {
  await expect(quiz.getByText(`Pergunta ${i+1} de 10`,{exact:true})).toBeVisible();
  await quiz.getByRole('radio', {name:/^(?!New York$)/}).nth(0).focus(); await page.keyboard.press('Space');
  if (i === 1) {
   await quiz.getByRole('button',{name:'Voltar',exact:true}).click();
   await expect(quiz.getByRole('radio', {checked:true})).toHaveCount(1);
   await quiz.getByRole('radio', {name:/^(?!New York$)/}).nth(1).check(); await quiz.getByRole('button',{name:'Continuar',exact:true}).click();
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await quiz.getByRole('button',{name:i === 9 ? 'Revelar nossa afinidade' : 'Continuar',exact:true}).click();
 }
 await quiz.getByRole('button',{name:'Ver nossa porcentagem'}).click();
 const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!),storageKey);
 const points = saved.answers.reduce((sum:number,id:string,i:number) => sum + questions[i].options.find(o => o.id === id)!.weight,0);
 await expect(quiz.getByRole('heading',{name:`${points*100/40}%`,exact:true})).toBeVisible();
 await quiz.getByRole('button',{name:'Continuar',exact:true}).click();
 await quiz.getByRole('button',{name:'E se eu pudesse escolher de novo?'}).click();
 for(let i=0;i<4;i++) await quiz.getByRole('button',{name:'Continuar',exact:true}).click();
 await quiz.getByRole('button',{name:'Descobrir nossa escolha'}).click();
 await expect(quiz.getByText(finalPhrase,{exact:true})).toBeVisible();
 await quiz.getByText(finalPhrase,{exact:true}).scrollIntoViewIfNeeded();
 await page.screenshot({path:`test-results/compatibility-${width}.png`,fullPage:true});
 await quiz.getByRole('button',{name:'Voltar ao nosso universo'}).click();
 await expect(quiz).toHaveCount(0); await expect(access).toBeFocused();
 await access.click(); await expect(quiz.getByRole('button',{name:'E se eu pudesse escolher de novo?'})).toBeVisible();
 await quiz.getByRole('button',{name:'Reiniciar apenas o quiz'}).click();
 await expect(quiz.getByText('Pergunta 1 de 10',{exact:true})).toBeVisible(); await expect(quiz.getByRole('radio',{checked:true})).toHaveCount(0);
});


test.describe('touch and persistence', () => {
 test.use({hasTouch:true});
 test('resume, touch selection and saved declaration after reload in fallback', async ({page}) => {
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.addInitScript(({key, answers}) => {
   if (!localStorage.getItem(key)) localStorage.setItem(key,JSON.stringify({answers,completed:false}));
   const original = HTMLCanvasElement.prototype.getContext;
   HTMLCanvasElement.prototype.getContext = function(type:string,...args:unknown[]) { if(type.startsWith('webgl')) return null; return original.apply(this,[type,...args] as Parameters<typeof original>); } as typeof original;
  }, {key:storageKey,answers:questions.map((q,i) => i === 9 ? null : q.options[0].id)});
  await universe(page); await page.getByRole('button',{name:/Compatibilidade/}).tap();
  const quiz=page.getByRole('region',{name:'Quiz de compatibilidade'});
  await expect(quiz.getByText('Pergunta 10 de 10')).toBeVisible();
  await quiz.getByText(questions[9].options[0].text,{exact:true}).tap();
  await quiz.getByRole('button',{name:'Revelar nossa afinidade'}).tap();
  await quiz.getByRole('button',{name:'Ver nossa porcentagem'}).tap();
  await expect(quiz.getByRole('heading',{name:'100%',exact:true})).toBeVisible();
  await page.reload(); await universe(page);
  await page.getByRole('button',{name:/Compatibilidade/}).tap();
  await expect(quiz.getByRole('button',{name:'E se eu pudesse escolher de novo?'})).toBeVisible();
  await page.keyboard.press('Escape'); await expect(quiz).toHaveCount(0);
  await expect(page.locator('[data-renderer="canvas2d"]')).toBeVisible();
 });
});




for (const reduced of [false,true]) test(`New York toast persists, allows changes and advances manually at 320px, reduced=${reduced}`,async({page})=>{
 await page.setViewportSize({width:320,height:568});
 await page.emulateMedia({reducedMotion:reduced?'reduce':'no-preference'});
 await page.addInitScript(key=>localStorage.setItem(key,JSON.stringify({answers:['0-0',null,'2-0',...Array(7).fill(null)],completed:false})),storageKey);
 await universe(page);await page.getByRole('button',{name:/Compatibilidade/}).click();
 const quiz=page.getByRole('region',{name:'Quiz de compatibilidade'});
 await expect(quiz.getByRole('radio')).toHaveCount(4);
 const ny=quiz.getByRole('radio',{name:'New York',exact:true});
 await ny.check();
 const message=quiz.getByRole('status');await expect(message).toHaveText('Só uma coisinha...Poxa, deixa o Canadá ter um espaço na nossa vida também...');
 await expect(quiz.getByRole('button',{name:'Continuar',exact:true})).toBeEnabled();
 await expect(quiz.getByRole('button',{name:'Voltar',exact:true})).toBeEnabled();
 await expect(ny).toBeEnabled();
 await expect(quiz.locator('.quiz-travel-toast')).toHaveCount(1);
 const toastBox=(await message.boundingBox())!;
 const scrollBox=(await quiz.locator('.quiz-scroll').boundingBox())!;
 expect(toastBox.y+toastBox.height).toBeLessThanOrEqual(scrollBox.y);

 await page.waitForTimeout(2400);await expect(message).toBeVisible();
 await expect(quiz.getByText('Pergunta 2 de 10',{exact:true})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:`test-results/new-york-toast-320-${reduced}.png`,fullPage:true});
 await quiz.getByRole('radio',{name:'Canadá.',exact:true}).check();
 await expect(quiz.locator('.quiz-travel-toast')).toHaveAttribute('aria-hidden','true');
 await expect(quiz.locator('.quiz-travel-toast')).toHaveCSS('opacity','0');
 await expect(quiz.getByText('Pergunta 2 de 10',{exact:true})).toBeVisible();
 await ny.focus();await page.keyboard.press('Space');await expect(message).toBeVisible();
 await quiz.getByRole('button',{name:'Continuar',exact:true}).dblclick();
 await expect(quiz.getByText('Pergunta 3 de 10',{exact:true})).toBeVisible();
 await expect(quiz.locator('.quiz-travel-toast')).toHaveAttribute('aria-hidden','true');
 await quiz.getByRole('button',{name:'Voltar',exact:true}).click();
 await expect(ny).toBeChecked();await expect(message).toBeVisible();
 await quiz.getByRole('radio',{name:'Itália.',exact:true}).check();
 await expect(quiz.locator('.quiz-travel-toast')).toHaveAttribute('aria-hidden','true');
 await quiz.getByRole('button',{name:'Continuar',exact:true}).click();await expect(quiz.getByText('Pergunta 3 de 10',{exact:true})).toBeVisible();
});
