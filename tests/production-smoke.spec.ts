import {test,expect} from '@playwright/test';
import {experience} from '../src/config/experience';
import {eyesPhrase} from '../src/experiences/eyes/progress';
for(const width of [320,390])test(`production romantic creation and public routes at ${width}px`,async({page},info)=>{
 const errors:string[]=[];const auth:string[]=[];page.on('pageerror',error=>errors.push(error.message));page.on('request',request=>{if(request.url().includes('/auth/v1/'))auth.push(request.url());});
 await page.setViewportSize({width,height:850});await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/?finish=1');
 await expect(page.getByRole('heading',{name:'que só você pode abrir.'})).toBeVisible();
 const pin=[experience.birthdays.firstDay,experience.birthdays.secondDay].map(day=>String(day).padStart(2,'0')).join('');for(const digit of pin)await page.getByRole('button',{name:digit,exact:true}).click();
 const scanner=page.getByRole('button',{name:/Leitor visual fictício/});await scanner.focus();await page.keyboard.down('Enter');await expect(page.locator('[data-act="recognized"]')).toBeVisible();await page.keyboard.up('Enter');
 await expect(page.getByText(eyesPhrase,{exact:true})).toBeVisible({timeout:45000});await expect(page.getByRole('button',{name:'Sim, pode',exact:true})).toBeHidden();
 await expect(page.getByRole('button',{name:'Sim, pode',exact:true})).toBeVisible();await page.waitForTimeout(1500);await expect(page).toHaveURL(/\?finish=1$/);
 await page.screenshot({path:info.outputPath('romantic-confirmation.png')});await page.getByRole('button',{name:'Sim, pode',exact:true}).click();await expect(page).toHaveURL(/\/universo-dela$/);
 for(let i=0;i<4;i++)await page.getByRole('button',{name:'Continuar',exact:true}).click();await expect(page.locator('section[data-her-stage="colors"]')).toBeVisible();await page.getByRole('button',{name:'Continuar',exact:true}).click();
 await page.getByRole('button',{name:'Rosa',exact:true}).click();await page.getByRole('button',{name:'Turquesa',exact:true}).click();await page.getByRole('button',{name:'Criar minhas estrelas',exact:true}).click();await page.getByRole('button',{name:'Continuar',exact:true}).click();await expect(page.locator('section[data-her-stage="ready"]')).toBeVisible();
 await expect(page.getByRole('button',{name:'Salvar e publicar',exact:true})).toBeVisible();await page.reload();await expect(page.locator('section[data-her-stage="ready"]')).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.goto('/universo-dela/visao');await expect(page.getByRole('heading',{name:'Este universo ainda não foi publicado.',exact:true})).toBeVisible();
 await page.goto('/admin');await expect(page.getByLabel('Usuário',{exact:true})).toBeVisible();await expect(page.getByLabel('Senha',{exact:true})).toBeVisible();expect(auth).toEqual([]);expect(errors).toEqual([]);
});
