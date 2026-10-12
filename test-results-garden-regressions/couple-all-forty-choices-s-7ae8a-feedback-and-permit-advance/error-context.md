# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: couple.spec.ts >> all forty choices show the approved feedback and permit advance
- Location: tests\couple.spec.ts:128:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('region', { name: 'Quiz de Casal', exact: true }).getByRole('heading', { name: 'Quem você acha que sente mais ciúmes entre nós dois?', exact: true })
Expected: visible
Timeout: 10000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" getByRole('region', { name: 'Quiz de Casal', exact: true }).getByRole('heading', { name: 'Quem você acha que sente mais ciúmes entre nós dois?', exact: true }) with timeout 10000ms
  - waiting for getByRole('region', { name: 'Quiz de Casal', exact: true }).getByRole('heading', { name: 'Quem você acha que sente mais ciúmes entre nós dois?', exact: true })

```

```yaml
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
  - group "Portal do Jardim Eterno":
    - button "Aproximar-se do portal do Jardim Eterno": Portal do Jardim Eterno
- status: Abrindo nossas estrelas...
```

# Test source

```ts
  37  |  for(const paragraph of loveLetter) await expect(quiz.getByText(paragraph,{exact:true})).toBeVisible();
  38  |  await expect(quiz.getByRole('heading',{name:'Aceita ficar comigo?',exact:true})).toHaveCount(0);
  39  |  await quiz.getByText(loveLetter[6],{exact:true}).scrollIntoViewIfNeeded(); await page.screenshot({path:`test-results/couple-letter-${width}.png`});
  40  |  expect(await quiz.textContent()).not.toMatch(emoji);
  41  |  await quiz.getByRole('button',{name:'Ainda tem uma última coisa…',exact:true}).click();
  42  |  expect(await quiz.textContent()).not.toMatch(emoji);
  43  |  const no=quiz.getByRole('button',{name:'Não',exact:true}); await no.focus(); const initial=await no.getAttribute('style'); await page.keyboard.press('Enter'); await expect(no).toBeFocused(); expect(await no.getAttribute('style')).toBe(initial);
  44  |  await quiz.getByRole('button',{name:'Sim',exact:true}).click();
  45  |  await expect(no).toHaveCount(0); await expect(quiz.getByRole('heading',{name:acceptanceTitle,exact:true})).toBeVisible(); await expect(quiz.getByText(acceptanceFooter,{exact:true})).toBeVisible();
  46  |  expect(await quiz.textContent()).not.toMatch(emoji);
  47  |  await page.screenshot({path:`test-results/couple-accepted-${width}.png`});
  48  |  await quiz.getByRole('button',{name:'Explorar nosso universo',exact:true}).click(); await expect(quiz).toHaveCount(0); await expect(access).toBeFocused();
  49  |  expect(await page.evaluate(key=>localStorage.getItem(key),storageKey)).toBe('compatibility-preserved');
  50  |  await access.click(); await quiz.getByRole('button',{name:'Reler a declaração',exact:true}).click(); await expect(quiz.getByRole('heading',{name:letterTitle,exact:true})).toBeVisible();
  51  |  await page.keyboard.press('Escape'); await expect(quiz).toHaveCount(0);
  52  |  await page.reload(); await enterUniverse(page); await access.click(); await quiz.getByRole('button',{name:'Iniciar o Quiz de Casal novamente',exact:true}).click(); await expect(quiz.getByText('01/10',{exact:true})).toBeVisible(); await expect(quiz.getByRole('radio',{checked:true})).toHaveCount(0);
  53  |  expect(errors).toEqual([]);
  54  | });
  55  | async function savedLetter(page:Page) {
  56  |  await page.addInitScript(({key,answers})=>localStorage.setItem(key,JSON.stringify({answers,completed:true})),{key:coupleStorageKey,answers:coupleQuestions.map(q=>q.correct)});
  57  |  await page.emulateMedia({reducedMotion:'reduce'}); await enterUniverse(page);
  58  |  await page.getByRole('button',{name:'Quiz de Casal',exact:true}).click();
  59  |  await page.getByRole('button',{name:'Reler a declaração'}).click();
  60  |  await page.getByRole('button',{name:'Ainda tem uma última coisa…'}).click();
  61  |  await page.emulateMedia({reducedMotion:'no-preference'});
  62  | }
  63  | test('desktop proximity, safe positions, landscape and exit without accepting',async({page})=>{
  64  |  await page.setViewportSize({width:844,height:390}); await savedLetter(page);
  65  |  const quiz=page.getByRole('region',{name:'Quiz de Casal',exact:true}); const no=quiz.getByRole('button',{name:'Não',exact:true}); const yes=quiz.getByRole('button',{name:'Sim',exact:true});
  66  |  await no.scrollIntoViewIfNeeded(); const stable=await yes.boundingBox();
  67  |  for(let i=0;i<5;i++) {
  68  |   const before=await no.getAttribute('style'); const box=(await no.boundingBox())!;
  69  |   await page.mouse.move(box.x-20,box.y+box.height/2); await expect.poll(()=>no.getAttribute('style')).not.toBe(before);
  70  |   await page.waitForTimeout(250); const moved=(await no.boundingBox())!;
  71  |   expect(moved.x).toBeGreaterThanOrEqual(0); expect(moved.x+moved.width).toBeLessThanOrEqual(844); expect(moved.y).toBeGreaterThanOrEqual(0); expect(moved.y+moved.height).toBeLessThanOrEqual(390);
  72  |  }
  73  |  expect(await yes.boundingBox()).toEqual(stable);
  74  |  await page.screenshot({path:'test-results/couple-invitation-landscape.png'});
  75  |  await quiz.getByRole('button',{name:'Voltar ao nosso universo',exact:true}).click(); await expect(quiz).toHaveCount(0);
  76  | });
  77  | test.describe('touch invitation',()=>{
  78  |  test.use({hasTouch:true});
  79  |  test('touch escape, bounded button, acceptance and reduced motion',async({page})=>{
  80  |  await page.setViewportSize({width:320,height:568}); await savedLetter(page);
  81  |  const quiz=page.getByRole('region',{name:'Quiz de Casal',exact:true}); const no=quiz.getByRole('button',{name:'Não',exact:true});
  82  |  await no.scrollIntoViewIfNeeded(); const before=await no.getAttribute('style'); const b=(await no.boundingBox())!; await page.touchscreen.tap(b.x+b.width/2,b.y+b.height/2);
  83  |  await expect.poll(()=>no.getAttribute('style')).not.toBe(before); await page.waitForTimeout(250);
  84  |  const moved=(await no.boundingBox())!; expect(moved.x).toBeGreaterThanOrEqual(0); expect(moved.x+moved.width).toBeLessThanOrEqual(320); expect(moved.y).toBeGreaterThanOrEqual(0); expect(moved.y+moved.height).toBeLessThanOrEqual(568);
  85  |  await page.screenshot({path:'test-results/couple-invitation-touch.png'});
  86  |  await page.emulateMedia({reducedMotion:'reduce'}); const steady=await no.getAttribute('style'); await no.tap(); expect(await no.getAttribute('style')).toBe(steady);
  87  |  await quiz.getByRole('button',{name:'Sim',exact:true}).tap(); await expect(quiz.getByRole('heading',{name:acceptanceTitle,exact:true})).toBeVisible();
  88  |  await quiz.getByRole('button',{name:'Explorar nosso universo'}).tap(); await expect(quiz).toHaveCount(0);
  89  |  });
  90  | });
  91  | 
  92  | 
  93  | test('gradual letter, normal-motion celebration and cancellation',async({page})=>{
  94  |  await page.addInitScript(({key,answers})=>localStorage.setItem(key,JSON.stringify({answers,completed:true})),{key:coupleStorageKey,answers:coupleQuestions.map(q=>q.correct)});
  95  |  await page.emulateMedia({reducedMotion:'reduce'}); await enterUniverse(page);
  96  |  await page.getByRole('button',{name:'Quiz de Casal',exact:true}).click(); await page.emulateMedia({reducedMotion:'no-preference'});
  97  |  const quiz=page.getByRole('region',{name:'Quiz de Casal',exact:true}); await quiz.getByRole('button',{name:'Reler a declaração'}).click();
  98  |  await expect(quiz.getByText(loveLetter[0],{exact:true})).toBeVisible(); await expect(quiz.getByText(loveLetter[1],{exact:true})).toHaveCount(0);
  99  |  await expect(quiz.getByRole('button',{name:'Ainda tem uma última coisa…'})).toHaveCount(0);
  100 |  await expect(quiz.getByText(loveLetter[1],{exact:true})).toBeVisible({timeout:4000}); await quiz.getByRole('button',{name:'Mostrar a carta inteira'}).click();
  101 |  await quiz.getByRole('button',{name:'Ainda tem uma última coisa…'}).click(); await quiz.getByRole('button',{name:'Sim',exact:true}).click();
  102 |  await expect(quiz.getByRole('button',{name:'Não',exact:true})).toHaveCount(0);
  103 |  await expect(quiz.getByRole('button',{name:'Explorar nosso universo'})).toHaveCount(0);
  104 |  await expect(quiz.getByRole('button',{name:'Explorar nosso universo'})).toBeVisible({timeout:5000});
  105 |  await page.screenshot({path:'test-results/couple-celebration-normal.png'});
  106 |  await quiz.getByRole('button',{name:'Explorar nosso universo'}).click(); await expect(quiz).toHaveCount(0);
  107 |  await page.getByRole('button',{name:'Quiz de Casal',exact:true}).click(); await quiz.getByRole('button',{name:'Reler a declaração'}).click(); await page.keyboard.press('Escape'); await expect(quiz).toHaveCount(0);
  108 |  await page.waitForTimeout(2300); await expect(page.locator('[data-act="universe"]')).toBeVisible();
  109 | });
  110 | 
  111 | test('both 3D destinations open through the existing raycaster',async({page})=>{
  112 |  const {PerspectiveCamera,Vector3}=await import('three');
  113 |  await page.setViewportSize({width:1440,height:900}); await page.emulateMedia({reducedMotion:'reduce'}); await enterUniverse(page);
  114 |  const canvas=page.locator('canvas[data-renderer="webgl"]'); await expect(canvas).toHaveCSS('pointer-events','auto');
  115 |  const camera=new PerspectiveCamera(45,1440/900,.1,120);
  116 |  camera.position.set(Math.sin(1.25)*Math.cos(Math.PI*.85)*14.5,Math.cos(1.25)*14.5*.72,Math.sin(1.25)*Math.sin(Math.PI*.85)*14.5);
  117 |  camera.lookAt(0,0,0); camera.updateMatrixWorld();
  118 |  for(const [position,name,close] of [[[-2.8,2.5,3.5],'Quiz de Casal','Voltar à galáxia'],[[0,2.7,2],'Quiz de compatibilidade','Voltar à galáxia']] as const) {
  119 |   const p=new Vector3(...position).project(camera); const box=(await canvas.boundingBox())!;
  120 |   await page.mouse.click(box.x+(p.x+1)*box.width/2,box.y+(1-p.y)*box.height/2);
  121 |   const region=page.getByRole('region',{name,exact:true}); await expect(region).toBeVisible(); await region.getByRole('button',{name:close,exact:true}).click(); await expect(region).toHaveCount(0);
  122 |   await expect(canvas).toHaveCSS('pointer-events','auto');
  123 |  }
  124 | });
  125 | 
  126 | 
  127 | 
  128 | test('all forty choices show the approved feedback and permit advance',async({page})=>{
  129 |  test.setTimeout(90000);
  130 |  await page.emulateMedia({reducedMotion:'reduce'}); await enterUniverse(page);
  131 |  const access=page.getByRole('button',{name:'Quiz de Casal',exact:true});
  132 |  const quiz=page.getByRole('region',{name:'Quiz de Casal',exact:true});
  133 |  const emoji=/(?:\p{Extended_Pictographic}|\p{Regional_Indicator}|\u2661|\uFE0F|\u20E3)/u;
  134 |  for(let index=0;index<10;index++) for(const answer of ['A','B','C','D'] as const) {
  135 |   await page.evaluate(({key,answers})=>localStorage.setItem(key,JSON.stringify({answers,completed:false})),{key:coupleStorageKey,answers:coupleQuestions.map((q,i)=>i<index?q.correct:null)});
  136 |   await access.click();
> 137 |   const q=coupleQuestions[index]; await expect(quiz.getByRole('heading',{name:q.text,exact:true})).toBeVisible();
      |                                                                                                    ^ Error: expect(locator).toBeVisible() failed
  138 |   await quiz.getByRole('radio',{name:`${answer}. ${q.options['ABCD'.indexOf(answer)]}`,exact:true}).check();
  139 |   const special=specialFeedbacks[index][answer]; const kind=answer===q.correct?'correct':special?'special':'standard';
  140 |   const status=quiz.getByRole('status');
  141 |   await expect(status).toHaveAttribute('data-feedback-kind',kind);
  142 |   await expect(status.getByText(kind==='correct'?q.feedback:kind==='special'?special!:wrongFeedback,{exact:true})).toBeVisible();
  143 |   if(kind==='special') { await expect(status.getByText(wrongFeedback,{exact:true})).toHaveCount(0); await expect(status.locator('.couple-answer')).toHaveCount(0); }
  144 |   expect(await quiz.textContent()).not.toMatch(emoji);
  145 |   await quiz.getByRole('button',{name:index===9?'Seguir para a última estrela':'Próxima estrela',exact:true}).click();
  146 |   await expect(quiz.getByRole('heading',{name:index===9?lastStar:coupleQuestions[index+1].text,exact:true})).toBeVisible();
  147 |   await page.keyboard.press('Escape'); await expect(quiz).toHaveCount(0);
  148 |  }
  149 | });
  150 | 
  151 | 
  152 | 
```