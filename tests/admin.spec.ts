import { test, expect, type Page } from '@playwright/test';
import { experience } from '../src/config/experience';
import { correct } from '../supabase/functions/_shared/security';
import { dualAdminMock } from './helpers/dualAdminMock';
const token='a'.repeat(64);
async function mockApi(page:Page, submissions: Record<string,unknown>[] = [], expires=15*60000) {
 let authorized=false;
 await page.route('https://supabase-test.invalid/functions/v1/**',async route=>{
  const body=route.request().postDataJSON();const admin=route.request().url().endsWith('/admin');
  let status=200;let response:unknown={};
  if(!admin){submissions.push(body);status=201;response={ok:true};}
  else if(body.action==='login') {
   if(body.password==='wrong'){status=401;response={error:'Senha incorreta.'};}
   else if(body.password==='limited'){status=429;response={error:'Muitas tentativas. Aguarde alguns minutos e tente novamente.'};}
   else {authorized=true;response={token,expiresAt:new Date(Date.now()+expires).toISOString()};}
  } else if(!authorized || route.request().headers().authorization!==`Bearer ${token}`){status=401;response={error:'Sessão necessária.'};}
  else if(body.action==='logout'){authorized=false;response={ok:true};}
  else response={overview:{quizzes:0,wishes:body.kind==='wish'?1:0,proposals:0},hasMore:false,rows:body.kind==='wish'?[{id:'test-wish',created_at:'2026-10-11T12:00:00Z',text:'Um desejo de teste\nCom parágrafos preservados.'}]:[]};
  await route.fulfill({status,contentType:'application/json',body:JSON.stringify(response)});
 });
}
for(const width of [320,390,430,1440]) test(`private admin login, empty data, full wish and logout ${width}`,async({page})=>{
 await page.setViewportSize({width,height:844});await mockApi(page);await page.goto('/admin');
 await expect(page.getByRole('textbox',{name:'Usuário',exact:true})).toBeVisible();await expect(page.locator('form input')).toHaveCount(2);await expect(page.getByLabel('Senha',{exact:true})).toHaveAttribute('type','password');
 await page.getByLabel('Senha',{exact:true}).fill('wrong');await page.getByRole('button',{name:'Entrar',exact:true}).click();await expect(page.getByRole('alert')).toHaveText('Senha incorreta.');
 await page.getByLabel('Senha',{exact:true}).fill('limited');await page.getByRole('button',{name:'Entrar',exact:true}).click();await expect(page.getByRole('alert')).toContainText('Muitas tentativas');
 await page.getByLabel('Senha',{exact:true}).fill('test-access');await page.getByRole('button',{name:'Entrar',exact:true}).click();await expect(page.getByText('Nenhum registro ainda')).toBeVisible();
 await expect(page.locator('.admin-counts strong').first()).toHaveText('0');expect(await page.locator('canvas').count()).toBe(0);
 expect(await page.evaluate(t=>JSON.stringify(localStorage).includes(t),token)).toBe(false);
 await page.reload();await expect(page.getByRole('button',{name:'Sair',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Desejos',exact:true}).click();await expect(page.getByText('Um desejo de teste',{exact:false})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:`test-results/admin-${width}.png`});
 await page.getByRole('button',{name:'Sair',exact:true}).click();await expect(page.getByLabel('Senha',{exact:true})).toBeVisible();await expect(page.locator('.admin-record')).toHaveCount(0);
});
test('short session expires and drops protected data',async({page})=>{
 await mockApi(page,[],1400);await page.goto('/admin');await page.getByLabel('Senha',{exact:true}).fill('test-access');await page.getByRole('button',{name:'Entrar',exact:true}).click();
 await expect(page.getByRole('button',{name:'Sair',exact:true})).toBeVisible();await expect(page.getByLabel('Senha',{exact:true})).toBeVisible();await expect(page.getByRole('alert')).toContainText('expirou');
});
async function universe(page:Page, path = '/') {
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto(path);
 const pin=[experience.birthdays.firstDay,experience.birthdays.secondDay].map(d=>String(d).padStart(2,'0')).join('');for(const digit of pin)await page.getByRole('button',{name:digit,exact:true}).click();
 const scanner=page.getByRole('button',{name:/Leitor visual fictício/});await expect(scanner).toBeVisible({timeout:15000});await scanner.focus();await page.keyboard.down('Enter');await expect(page.locator('[data-act="recognized"]')).toBeVisible({timeout:6000});await page.keyboard.up('Enter');await expect(page.locator('[data-act="universe"]')).toBeVisible({timeout:20000});
}
test('quiz review without upload and intentional No deduplication',async({page})=>{
 const sent:Record<string,unknown>[]=[];await mockApi(page,sent);
 await page.addInitScript(answers=>{
  localStorage.setItem('meu-universo.couple.v1',JSON.stringify({completed:true,answers}));
  localStorage.setItem('meu-universo.compatibility.v1',JSON.stringify({completed:true,answers:answers.map((_,i)=>`${i}-0`)}));
 },correct);
 await universe(page);await page.getByRole('button',{name:/^Compatibilidade/}).click();
 const compatibility=page.getByRole('region',{name:'Quiz de compatibilidade'});
 await expect(compatibility.getByRole('complementary')).toHaveCount(0);expect(sent).toHaveLength(0);
 await compatibility.getByRole('button',{name:'Voltar à galáxia'}).click();await expect(compatibility).toHaveCount(0);
 await page.getByRole('button',{name:'Quiz de Casal',exact:true}).click();const quiz=page.getByRole('region',{name:'Quiz de Casal',exact:true});
 await expect(quiz.getByRole('complementary',{name:'Salvamento opcional do quiz'})).toHaveCount(0);
 await quiz.getByRole('button',{name:'Reler a declaração'}).click();await quiz.getByRole('button',{name:'Ainda tem uma última coisa…',exact:true}).click();
 const no=quiz.getByRole('button',{name:'Não',exact:true});await no.tap();
 const box=(await no.boundingBox())!;await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.waitForTimeout(1200);await page.mouse.up();
 const proposal=quiz.getByRole('complementary',{name:'Salvamento opcional do pedido'});await proposal.getByRole('button',{name:'Autorizar e enviar'}).click();await expect(proposal.getByRole('status')).toHaveText('Enviado ao proprietário.');
 expect(sent[0]).toMatchObject({kind:'proposal',attempts:2,choice:'no',consent:true});
 await quiz.getByRole('button',{name:'Sim',exact:true}).click();const accepted=quiz.getByRole('complementary',{name:'Salvamento opcional do pedido'});await accepted.getByRole('button',{name:'Autorizar e enviar'}).click();await expect(accepted.getByRole('status')).toHaveText('Enviado ao proprietário.');expect(sent[1]).toMatchObject({kind:'proposal',attempts:2,choice:'yes'});
 await page.keyboard.press('Escape');await expect(quiz).toHaveCount(0);await page.getByRole('button',{name:'Quiz de Casal',exact:true}).click();
 await expect(quiz.getByRole('complementary',{name:'Salvamento opcional do quiz'})).toHaveCount(0);expect(sent).toHaveLength(2);
});
test('leaving is not a response; defer is saved only after explicit authorization',async({page})=>{
 const sent:Record<string,unknown>[]=[];await mockApi(page,sent);
 await page.addInitScript(answers=>localStorage.setItem('meu-universo.couple.v1',JSON.stringify({completed:true,answers})),correct);
 await universe(page);
 const quiz=page.getByRole('region',{name:'Quiz de Casal',exact:true});
 const open=async()=>{
  await page.getByRole('button',{name:'Quiz de Casal',exact:true}).click();
  await quiz.getByRole('button',{name:'Reler a declaração'}).click();
  await quiz.getByRole('button',{name:'Ainda tem uma última coisa…',exact:true}).click();
 };
 await open();await quiz.getByRole('button',{name:'Deixar para depois',exact:true}).click();
 await quiz.getByRole('button',{name:'Voltar ao nosso universo',exact:true}).click();await expect(quiz).toHaveCount(0);expect(sent).toHaveLength(0);
 await open();await quiz.getByRole('button',{name:'Deixar para depois',exact:true}).click();
 const save=quiz.getByRole('complementary',{name:'Salvamento opcional do pedido'});
 await save.getByRole('button',{name:'Autorizar e enviar'}).click();await expect(save.getByRole('status')).toHaveText('Enviado ao proprietário.');
 expect(sent).toHaveLength(1);expect(sent[0]).toMatchObject({kind:'proposal',choice:'later',attempts:0,consent:true});
});

for(const kind of ['couple','compatibility'] as const) for(const guest of [false,true]) test(`automatic completion ${kind}, guest=${guest}`,async({page})=>{
 const sent:Record<string,unknown>[]=[];await mockApi(page,sent);
 await page.addInitScript(kind=>{
  const answers=Array.from({length:10},(_,i)=>i===9?null:kind==='couple'?'A':`${i}-0`);
  localStorage.setItem(`meu-universo.${kind}.v1`,JSON.stringify({completed:false,answers}));
 },kind);
 await universe(page,guest?'/?sem-coleta=1':'/');
 await page.getByRole('button',{name:kind==='couple'?'Quiz de Casal':/^Compatibilidade/,exact:kind==='couple'}).click();
 const quiz=page.getByRole('region',{name:kind==='couple'?'Quiz de Casal':'Quiz de compatibilidade',exact:true});
 await quiz.getByRole('radio').first().check();
 await quiz.getByRole('button',{name:kind==='couple'?'Seguir para a última estrela':'Revelar nossa afinidade'}).dblclick();
 await expect(quiz.getByRole('button',{name:kind==='couple'?'Ler sua carta':'Ver nossa porcentagem'})).toBeVisible();
 await expect(quiz.getByRole('button',{name:'Autorizar e enviar'})).toHaveCount(0);
 if(!guest){await expect.poll(()=>sent.length).toBe(1);expect(sent[0]).toMatchObject({kind,consent:true});expect(sent[0].answers).toHaveLength(10);}
 else expect(sent).toHaveLength(0);
 await quiz.getByRole('button',{name:'Voltar à galáxia'}).click();await expect(quiz).toHaveCount(0);
 await page.getByRole('button',{name:kind==='couple'?'Quiz de Casal':/^Compatibilidade/,exact:kind==='couple'}).click();
 await expect(quiz.getByRole('button',{name:kind==='couple'?'Reler a declaração':'E se eu pudesse escolher de novo?'})).toBeVisible();
 expect(sent).toHaveLength(guest?0:1);
});

for(const width of [320,390,430,1440])test(`same admin panel isolates both usernames at ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:850});const server=await dualAdminMock();
  await page.route('https://supabase-test.invalid/functions/v1/admin',async route=>{const response=await server.handler(new Request(route.request().url(),{method:'POST',headers:{Origin:'http://localhost:5174','Content-Type':'application/json',Authorization:route.request().headers().authorization??''},body:route.request().postData()}));await route.fulfill({status:response.status,contentType:'application/json',body:await response.text()});});
  await page.goto('/admin');await page.getByLabel('Usuário',{exact:true}).fill('admin');await page.getByLabel('Senha',{exact:true}).fill('incorrect');await page.getByRole('button',{name:'Entrar',exact:true}).tap();await expect(page.getByRole('alert')).toHaveText('Usuário ou senha incorretos.');
  await page.getByLabel('Senha',{exact:true}).fill('audit-fixture-password-only');await page.getByRole('button',{name:'Entrar',exact:true}).tap();await expect(page.getByText('Tentativa: original-attempt',{exact:true})).toBeVisible();await page.reload();await expect(page.getByText('Tentativa: original-attempt',{exact:true})).toBeVisible();await expect(page.getByText('Pergunta dela 1',{exact:true})).toHaveCount(0);await page.getByRole('button',{name:'Sair',exact:true}).tap();
  await page.getByLabel('Usuário',{exact:true}).fill('meu-universo-dela');await page.getByLabel('Senha',{exact:true}).fill('audit-fixture-password-only');await page.getByRole('button',{name:'Entrar',exact:true}).tap();await expect(page.getByText('Tentativa: her-compatibility-attempt',{exact:true})).toBeVisible();await page.reload();await expect(page.getByText('Tentativa: her-compatibility-attempt',{exact:true})).toBeVisible();await expect(page.getByText(/63%/)).toBeVisible();
  await page.getByRole('button',{name:'Quiz de casal',exact:true}).tap();await expect(page.getByText(/3\/4 — 75%/)).toBeVisible();await expect(page.getByText('Pergunta dela 1',{exact:true})).toBeVisible();await expect(page.getByText('A: Alternativa dela A',{exact:true})).toBeVisible();await expect(page.getByText(/Respostas corretas:/).first()).toBeVisible();await expect(page.getByText('Tentativa: original-attempt',{exact:true})).toHaveCount(0);
  for(const section of ['Desejos','Pedido romântico']){await page.getByRole('button',{name:section,exact:true}).tap();await expect(page.getByText('Nenhum registro ainda',{exact:true})).toBeVisible();await expect(page.locator('.admin-record')).toHaveCount(0);}
  await expect(page.locator('.admin-counts strong')).toHaveText(['2','0','0']);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:`test-results/dual-admin-${width}.png`});
});
