# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: wishes.spec.ts >> wish invitation, failure, retry, deduplication, restoration 390
- Location: tests\wishes.spec.ts:11:34

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('complementary', { name: 'Uma estrela cadente' })
Expected: visible
Timeout: 10000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" getByRole('complementary', { name: 'Uma estrela cadente' }) with timeout 10000ms
  - waiting for getByRole('complementary', { name: 'Uma estrela cadente' })

```

```yaml
- banner:
  - text: meu universo
  - button "Ativar sons"
- main:
  - paragraph: ENTRE TODAS AS POSSIBILIDADES
  - heading "Você acabou de entrar no meu universo." [level=1]:
    - text: Você acabou de entrar
    - emphasis: no meu universo.
  - paragraph: E, de algum jeito, ele sempre foi seu.
  - button "Viver de novo"
  - button "Compatibilidade"
  - button "Quiz de Casal"
  - group "Cartas perdidas pelo universo":
    - 'button "Abrir carta: A carta que eu nunca enviei"': A carta que eu nunca enviei
    - 'button "Abrir carta: Um pequeno defeito meu"': Um pequeno defeito meu
    - 'button "Abrir carta: Seus olhos"': Seus olhos
    - 'button "Abrir carta: Cinco minutos a mais"': Cinco minutos a mais
    - 'button "Abrir carta: Se o futuro me permitir"': Se o futuro me permitir
    - 'button "Abrir carta: Se você encontrou esta carta..."': Se você encontrou esta carta...
- contentinfo:
  - list "Atos da experiência":
    - listitem: 01 O encontro
    - listitem: 02 A certeza
    - listitem: 03 O infinito
```

# Test source

```ts
  1  | import { test,expect,type Page } from '@playwright/test';
  2  | import { experience } from '../src/config/experience';
  3  | async function universe(page:Page){
  4  |  await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/');
  5  |  const pin=[experience.birthdays.firstDay,experience.birthdays.secondDay].map(d=>String(d).padStart(2,'0')).join('');
  6  |  for(const digit of pin)await page.getByRole('button',{name:digit,exact:true}).click();
  7  |  const scan=page.getByRole('button',{name:/Leitor visual fictício/});await expect(scan).toBeVisible({timeout:15000});await scan.focus();await page.keyboard.down('Enter');await expect(page.locator('[data-act="recognized"]')).toBeVisible({timeout:6000});await page.keyboard.up('Enter');
  8  |  await expect(page.locator('[data-act="universe"]')).toHaveClass(/is-exploring/,{timeout:25000});
  9  |  await page.clock.install();
  10 | }
  11 | for(const width of [320,390,430])test(`wish invitation, failure, retry, deduplication, restoration ${width}`,async({page})=>{
  12 |  await page.setViewportSize({width,height:740});const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  13 |  const sent:Record<string,unknown>[]=[];
  14 |  await page.route('https://supabase-test.invalid/functions/v1/submit',async route=>{
  15 |   sent.push(route.request().postDataJSON());await new Promise(resolve=>setTimeout(resolve,250));
  16 |   await route.fulfill({status:sent.length===1?503:201,contentType:'application/json',body:JSON.stringify(sent.length===1?{error:'offline'}:{ok:true})});
  17 |  });
  18 |  await universe(page);
  19 |  const invitation=page.getByRole('complementary',{name:'Uma estrela cadente'});const canvas=page.locator('[data-renderer="webgl"]');
> 20 |  await page.clock.runFor(31000);await expect(invitation).toBeVisible();await expect(canvas).toHaveAttribute('data-shooting-position',/.+/);
     |                                                          ^ Error: expect(locator).toBeVisible() failed
  21 |  if(width===430){
  22 |   await invitation.getByRole('button',{name:'Agora não'}).click();await expect(invitation).toBeHidden();await expect(canvas).toHaveCSS('pointer-events','auto');
  23 |   await page.clock.runFor(119000);await expect(invitation).toBeHidden();await page.clock.runFor(2000);await expect(invitation).toBeVisible();
  24 |  }
  25 |  if(width===390){
  26 |   const [x,y]=JSON.parse((await canvas.getAttribute('data-shooting-position'))!);const box=(await canvas.boundingBox())!;
  27 |   await page.touchscreen.tap(box.x+x,box.y+y);
  28 |  }else{await invitation.getByRole('button',{name:'Quero tentar'}).focus();await page.keyboard.press('Enter');}
  29 |  const form=page.getByRole('region',{name:'Estrela cadente dos desejos'});await expect(form).toBeVisible();
  30 |  const saved=await canvas.getAttribute('data-saved-camera-pose');expect(saved).not.toBeNull();
  31 |  const field=form.getByRole('textbox',{name:'Seu desejo'});const send=form.getByRole('button',{name:'Entregar meu desejo ao universo'});
  32 |  await expect(send).toBeDisabled();await field.fill('   ');await expect(send).toBeDisabled();
  33 |  await field.fill('Um desejo de teste\nCom um segundo parágrafo.');await expect(form.getByText(/você o compartilha com o criador/)).toBeVisible();
  34 |  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  35 |  await page.screenshot({path:`test-results/wish-${width}.png`,fullPage:true});
  36 |  await send.click();await expect(form.getByRole('alert')).toBeVisible();await expect(field).toHaveValue('Um desejo de teste\nCom um segundo parágrafo.');
  37 |  await expect(form.getByRole('heading',{name:'Talvez o universo já esteja trabalhando nisso...'})).toHaveCount(0);
  38 |  await send.dblclick();await expect(form.getByRole('heading',{name:'Talvez o universo já esteja trabalhando nisso...'})).toBeVisible();
  39 |  expect(sent).toHaveLength(2);expect(sent[0].submissionId).toBe(sent[1].submissionId);expect(sent[1]).toMatchObject({kind:'wish',consent:true,text:'Um desejo de teste\nCom um segundo parágrafo.'});
  40 |  await form.getByRole('button',{name:'Voltar ao universo'}).click();await expect(form).toHaveCount(0);
  41 |  await expect(page.locator('[data-act="universe"]')).toHaveAttribute('data-navigation','GALAXY_IDLE');
  42 |  expect(await canvas.getAttribute('data-camera-pose')).toBe(saved);await expect(canvas).toHaveCSS('pointer-events','auto');
  43 |  await expect(invitation).toBeHidden();await page.clock.runFor(30000);await expect(invitation).toBeHidden();expect(sent).toHaveLength(2);expect(errors).toEqual([]);
  44 | });
  45 | test('ignoring expires the invitation; other experiences pause encounters; return without sending',async({page})=>{
  46 |  await universe(page);await page.clock.runFor(31000);
  47 |  const invitation=page.getByRole('complementary',{name:'Uma estrela cadente'});
  48 |  await expect(invitation).toBeVisible();await page.clock.runFor(46000);await expect(invitation).toBeHidden();
  49 |  await page.getByRole('button',{name:'Quiz de Casal',exact:true}).click();await expect(page.getByRole('region',{name:'Quiz de Casal',exact:true})).toBeVisible();
  50 |  await page.clock.runFor(130000);await expect(invitation).toBeHidden();await page.getByRole('button',{name:'Voltar à galáxia',exact:true}).click();await page.clock.runFor(1000);
  51 |  await page.clock.runFor(120000);await expect(invitation).toBeVisible();await invitation.getByRole('button',{name:'Quero tentar'}).click();
  52 |  const form=page.getByRole('region',{name:'Estrela cadente dos desejos'});await expect(form).toBeVisible();await form.getByRole('textbox',{name:'Seu desejo'}).fill('Não enviar');
  53 |  await form.getByRole('button',{name:'Voltar',exact:true}).click();await expect(form).toHaveCount(0);await expect(invitation).toBeHidden();
  54 | });
  55 | 
```