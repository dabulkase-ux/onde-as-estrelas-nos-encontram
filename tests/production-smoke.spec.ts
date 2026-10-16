import {blackHoleFragments} from '../src/experiences/blackHole/data';
import {lostLetters} from '../src/experiences/letters/data';
import {postDraftReset} from './helpers/herDraftBaseline';
import {test,expect} from '@playwright/test';
import {experience} from '../src/config/experience';
import {eyesPhrase} from '../src/experiences/eyes/progress';
const browserErrors=new WeakMap<object,string[]>();
test.afterEach(async({page})=>expect(browserErrors.get(page)??[]).toEqual([]));
test.beforeEach(async({page})=>{
 const errors:string[]=[];browserErrors.set(page,errors);page.on('pageerror',error=>errors.push(error.message));
 await page.route('**/functions/v1/**',async route=>{
  const request=route.request();
  if(request.method()==='OPTIONS')return route.continue();
  let action='';try{action=request.postDataJSON()?.action??'';}catch{/* Other endpoints are blocked below. */}
  if(request.url().endsWith('/stellar-mail')&&action==='mailbox')return route.continue();
  if(request.url().endsWith('/stellar-mail')&&action==='arrival')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({id:null})});
  if(request.url().endsWith('/her-universe')&&['owner','public'].includes(action))return route.continue();
  await route.abort('blockedbyclient');throw new Error('Production smoke blocked a non-read request.');
 });
});
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
 await page.goto('/universo-dela/visao');await expect(page.getByRole('region',{name:'Explorar o universo dela',exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Meus elementos',exact:true})).toHaveCount(0);await expect(page.getByRole('button',{name:'Nossa Compatibilidade',exact:true})).toBeVisible();await page.getByRole('button',{name:'Nossa Compatibilidade',exact:true}).click();const publishedQuiz=page.getByRole('dialog',{name:'Nossa Compatibilidade',exact:true});await expect(publishedQuiz.getByRole('radio')).toHaveCount(4);await publishedQuiz.getByRole('button',{name:'Voltar à galáxia',exact:true}).click();
 await page.goto('/admin');await expect(page.getByLabel('Usuário',{exact:true})).toBeVisible();await expect(page.getByLabel('Senha',{exact:true})).toBeVisible();expect(auth).toEqual([]);expect(errors).toEqual([]);
});


test('deployed custom elements and organizer persist only in a disposable browser',async({page})=>{
 await postDraftReset(page);await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:320,height:850});
 await page.addInitScript(()=>{if(!localStorage.getItem('meu-universo.her-universe.v1'))localStorage.setItem('meu-universo.her-universe.v1',JSON.stringify({version:1,accepted:true,created:true,stage:'ready',colors:['roxo']}));});
 await page.goto('/universo-dela');await page.getByRole('button',{name:'Adicionar carta',exact:true}).tap();await page.getByRole('textbox',{name:'Título da cartinha',exact:true}).fill('Verificação local descartável');await page.getByRole('textbox',{name:'Mensagem da cartinha',exact:true}).fill('Esta carta existe apenas neste navegador de teste.');await page.getByRole('button',{name:'Fechar carta',exact:true}).tap();
 await page.getByRole('button',{name:'Adicionar elemento',exact:true}).tap();await page.getByRole('button',{name:'Adicionar buraco negro',exact:true}).tap();await page.getByRole('button',{name:'Meus elementos',exact:true}).tap();let panel=page.getByRole('dialog',{name:'Meus elementos',exact:true});await expect(panel).toContainText('Cartinhas (1)');await expect(panel).toContainText('Buracos negros (1)');await panel.locator('li').filter({has:page.getByRole('heading',{name:'Buraco negro 1',exact:true})}).getByRole('button',{name:'Editar',exact:true}).tap();
 for(let i=1;i<=5;i++){await page.getByRole('button',{name:`Descobrir fragmento: Cristal ${i}`,exact:true}).click();await page.getByRole('textbox',{name:'Título do cristal',exact:true}).fill(`Nota local ${i}`);await page.getByRole('textbox',{name:'Conteúdo do cristal',exact:true}).fill(`Mensagem local ${i}`);await page.getByRole('button',{name:'Salvar e fechar',exact:true}).tap();}
 await page.getByRole('button',{name:'Escrever carta da estrela',exact:true}).tap();await page.getByRole('textbox',{name:'Título da carta da estrela',exact:true}).fill('Estrela local');await page.getByRole('textbox',{name:'Conteúdo da carta da estrela',exact:true}).fill('Somente no contexto descartável.');await page.getByRole('button',{name:'Fechar carta',exact:true}).tap();await page.getByRole('button',{name:'Voltar à galáxia',exact:true}).tap();
 const saved=await page.evaluate(()=>[localStorage.getItem('meu-universo.her-letters.v1'),localStorage.getItem('meu-universo.her-black-holes.v1')]);await page.reload();expect(await page.evaluate(()=>[localStorage.getItem('meu-universo.her-letters.v1'),localStorage.getItem('meu-universo.her-black-holes.v1')])).toEqual(saved);
 await page.getByRole('button',{name:'Meus elementos',exact:true}).tap();panel=page.getByRole('dialog',{name:'Meus elementos',exact:true});await expect(panel).toContainText('Nota local 1');await panel.locator('li').filter({has:page.getByRole('heading',{name:'Verificação local descartável',exact:true})}).getByRole('button',{name:'Localizar',exact:true}).tap();await expect(page.getByRole('dialog',{name:'Verificação local descartável',exact:true})).toContainText('Esta carta existe apenas neste navegador de teste.');await expect(page.getByRole('textbox')).toHaveCount(0);await page.getByRole('button',{name:'Fechar carta',exact:true}).tap();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});


test('deployed original letters and black hole remain readable without submissions',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:390,height:850});await page.addInitScript(()=>localStorage.setItem('meu-universo.eyes-constellation.v1',JSON.stringify({version:1,watched:true})));
 await page.goto('/');const pin=[experience.birthdays.firstDay,experience.birthdays.secondDay].map(day=>String(day).padStart(2,'0')).join('');for(const digit of pin)await page.getByRole('button',{name:digit,exact:true}).click();const scanner=page.getByRole('button',{name:/Leitor visual fictício/});await scanner.focus();await page.keyboard.down('Enter');await expect(page.locator('[data-act="recognized"]')).toBeVisible();await page.keyboard.up('Enter');await expect(page.locator('[data-act="universe"]')).toBeVisible({timeout:30000});
 await page.locator('[data-letter-id="letter-1"]').tap();await expect(page.getByRole('dialog',{name:lostLetters[0].title,exact:true})).toBeVisible();await page.getByRole('button',{name:'Fechar carta',exact:true}).tap();
 const hole=page.getByRole('button',{name:'Aproximar-se do Buraco Negro dos Segredos',exact:true});const decline=page.getByRole('button',{name:'Agora não',exact:true});if(await decline.isVisible())await decline.click();for(let i=0;i<8&&!(await hole.isVisible());i++){await page.mouse.move(175,320);await page.mouse.down();await page.mouse.move(340,320,{steps:10});await page.mouse.up();await page.waitForTimeout(500);}await hole.click();await expect(page.getByRole('region',{name:'Buraco Negro dos Segredos',exact:true})).toBeVisible();for(const crystal of blackHoleFragments){await page.getByRole('button',{name:`Descobrir fragmento: ${crystal.title}`,exact:true}).click();await expect(page.getByRole('dialog')).toContainText(crystal.text);await page.getByRole('button',{name:'Voltar aos fragmentos',exact:true}).click();}await page.getByRole('button',{name:'Ler o que eu escondo até das estrelas',exact:true}).click();await expect(page.getByRole('dialog')).toBeVisible();await page.getByRole('button',{name:'Fechar carta',exact:true}).click();await page.getByRole('button',{name:'Voltar à galáxia',exact:true}).click();
});
