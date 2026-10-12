import { test,expect,type Page } from '@playwright/test';
import { experience } from '../src/config/experience';
async function universe(page:Page){
 await page.clock.install();
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/');
 const pin=[experience.birthdays.firstDay,experience.birthdays.secondDay].map(d=>String(d).padStart(2,'0')).join('');
 for(const digit of pin)await page.getByRole('button',{name:digit,exact:true}).click();
 const scan=page.getByRole('button',{name:/Leitor visual fictício/});await expect(scan).toBeVisible({timeout:15000});await scan.focus();await page.keyboard.down('Enter');await expect(page.locator('[data-act="recognized"]')).toBeVisible({timeout:6000});await page.keyboard.up('Enter');
 await page.clock.runFor(14000);
 await expect(page.locator('[data-act="universe"]')).toHaveClass(/is-exploring/,{timeout:25000});
}
for(const width of [320,390,430])test(`wish invitation, failure, retry, deduplication, restoration ${width}`,async({page})=>{
 await page.setViewportSize({width,height:740});const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 const sent:Record<string,unknown>[]=[];
 await page.route('https://supabase-test.invalid/functions/v1/submit',async route=>{
  sent.push(route.request().postDataJSON());await new Promise(resolve=>setTimeout(resolve,250));
  await route.fulfill({status:sent.length===1?503:201,contentType:'application/json',body:JSON.stringify(sent.length===1?{error:'offline'}:{ok:true})});
 });
 await universe(page);
 const invitation=page.getByRole('complementary',{name:'Uma estrela cadente'});const canvas=page.locator('[data-renderer="webgl"]');
 await page.clock.runFor(31000);await expect(invitation).toBeVisible();await expect(canvas).toHaveAttribute('data-shooting-position',/.+/);
 if(width===430){
  await invitation.getByRole('button',{name:'Agora não'}).click();await expect(invitation).toBeHidden();await expect(canvas).toHaveCSS('pointer-events','auto');
  await page.clock.runFor(119000);await expect(invitation).toBeHidden();await page.clock.runFor(2000);await expect(invitation).toBeVisible();
 }
 if(width===390){
  const [x,y]=JSON.parse((await canvas.getAttribute('data-shooting-position'))!);const box=(await canvas.boundingBox())!;
  await page.touchscreen.tap(box.x+x,box.y+y);
 }else{await invitation.getByRole('button',{name:'Quero tentar'}).focus();await page.keyboard.press('Enter');}
 const form=page.getByRole('region',{name:'Estrela cadente dos desejos'});await expect(form).toBeVisible();
 const saved=await canvas.getAttribute('data-saved-camera-pose');expect(saved).not.toBeNull();
 const field=form.getByRole('textbox',{name:'Seu desejo'});const send=form.getByRole('button',{name:'Entregar meu desejo ao universo'});
 await expect(send).toBeDisabled();await field.fill('   ');await expect(send).toBeDisabled();
 await field.fill('Um desejo de teste\nCom um segundo parágrafo.');await expect(form.getByText(/você o compartilha com o criador/)).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:`test-results/wish-${width}.png`,fullPage:true});
 await send.click();await expect(form.getByRole('alert')).toBeVisible();await expect(field).toHaveValue('Um desejo de teste\nCom um segundo parágrafo.');
 await expect(form.getByRole('heading',{name:'Talvez o universo já esteja trabalhando nisso...'})).toHaveCount(0);
 await send.dblclick();await expect(form.getByRole('heading',{name:'Talvez o universo já esteja trabalhando nisso...'})).toBeVisible();
 expect(sent).toHaveLength(2);expect(sent[0].submissionId).toBe(sent[1].submissionId);expect(sent[1]).toMatchObject({kind:'wish',consent:true,text:'Um desejo de teste\nCom um segundo parágrafo.'});
 await form.getByRole('button',{name:'Voltar ao universo'}).click();await expect(form).toHaveCount(0);
 await expect(page.locator('[data-act="universe"]')).toHaveAttribute('data-navigation','GALAXY_IDLE');
 expect(await canvas.getAttribute('data-camera-pose')).toBe(saved);await expect(canvas).toHaveCSS('pointer-events','auto');
 await expect(invitation).toBeHidden();await page.clock.runFor(30000);await expect(invitation).toBeHidden();expect(sent).toHaveLength(2);expect(errors).toEqual([]);
});
test('ignoring expires the invitation; other experiences pause encounters; return without sending',async({page})=>{
 await universe(page);await page.clock.runFor(31000);
 const invitation=page.getByRole('complementary',{name:'Uma estrela cadente'});
 await expect(invitation).toBeVisible();await page.clock.runFor(46000);await expect(invitation).toBeHidden();
 await page.getByRole('button',{name:'Quiz de Casal',exact:true}).click();await expect(page.getByRole('region',{name:'Quiz de Casal',exact:true})).toBeVisible();
 await page.clock.runFor(130000);await expect(invitation).toBeHidden();await page.getByRole('button',{name:'Voltar à galáxia',exact:true}).click();await page.clock.runFor(1000);
 await page.clock.runFor(120000);await expect(invitation).toBeVisible();await invitation.getByRole('button',{name:'Quero tentar'}).click();
 const form=page.getByRole('region',{name:'Estrela cadente dos desejos'});await expect(form).toBeVisible();await form.getByRole('textbox',{name:'Seu desejo'}).fill('Não enviar');
 await form.getByRole('button',{name:'Voltar',exact:true}).click();await expect(form).toHaveCount(0);await expect(invitation).toBeHidden();
});
