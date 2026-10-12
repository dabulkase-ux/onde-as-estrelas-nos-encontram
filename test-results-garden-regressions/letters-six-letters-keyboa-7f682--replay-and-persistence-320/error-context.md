# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: letters.spec.ts >> six letters, keyboard, scroll, replay and persistence 320
- Location: tests\letters.spec.ts:14:41

# Error details

```
Error: expect(locator).toBeFocused() failed

Locator:  locator('[data-letter-id="letter-6"]')
Expected: focused
Received: inactive
Timeout:  10000ms

Call log:
  - Expect "toBeFocused" locator('[data-letter-id="letter-6"]') with timeout 10000ms
  - waiting for locator('[data-letter-id="letter-6"]')
    23 × locator resolved to <button data-read="false" data-onscreen="false" class="letter-target " data-letter-id="letter-6" aria-label="Abrir carta: Se você encontrou esta carta...">…</button>
       - unexpected value "inactive"

```

```yaml
- 'button "Abrir carta: Se você encontrou esta carta..."': Se você encontrou esta carta...
```

# Test source

```ts
  1   | import { test, expect, type Page } from '@playwright/test';
  2   | import { experience } from '../src/config/experience';
  3   | import { lostLetters } from '../src/experiences/letters/data';
  4   | import { letterStorageKey } from '../src/experiences/letters/progress';
  5   | test.use({hasTouch:true});
  6   | async function universe(page:Page) {
  7   |   await page.goto('/');
  8   |   for (const digit of [experience.birthdays.firstDay,experience.birthdays.secondDay].map(day=>String(day).padStart(2,'0')).join('')) await page.getByRole('button',{name:digit,exact:true}).click();
  9   |   const scanner = page.getByRole('button',{name:/Leitor visual fictício/});
  10  |   await expect(scanner).toBeVisible({timeout:15000}); await scanner.focus(); await page.keyboard.down('Enter');
  11  |   await expect(page.locator('[data-act="recognized"]')).toBeVisible({timeout:6000}); await page.keyboard.up('Enter');
  12  |   await expect(page.locator('[data-act="universe"]')).toBeVisible({timeout:20000});
  13  | }
  14  | for (const width of [320,390,430,1440]) test(`six letters, keyboard, scroll, replay and persistence ${width}`,async({page})=>{
  15  |   await page.setViewportSize({width,height:width===320?568:900}); await page.emulateMedia({reducedMotion:'reduce'});
  16  |   const errors:string[]=[]; page.on('pageerror',error=>errors.push(error.message));
  17  |   await page.addInitScript(() => { if (!localStorage.getItem('letter-test-seeded')) { localStorage.setItem('meu-universo.couple.v1','preserved'); localStorage.setItem('meu-universo.compatibility.v1','preserved'); localStorage.setItem('letter-test-seeded','yes'); } });
  18  |   await universe(page);
  19  |   const canvas=page.locator('canvas[data-renderer="webgl"]');
  20  |   if(width < 700) {
  21  |     await page.locator('[data-letter-id="letter-1"]').tap();
  22  |     const first=page.getByRole('dialog',{name:lostLetters[0].title}); await expect(first).toBeVisible();
  23  |     const session=await page.context().newCDPSession(page);
  24  |     await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:150,y:440}]});
  25  |     for(let y=410;y>=170;y-=30) await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:150,y}]});
  26  |     await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]}); await session.detach();
  27  |     await expect.poll(()=>first.locator('.letter-scroll').evaluate(node=>node.scrollTop)).toBeGreaterThan(0);
  28  |     // Native scrolling consumes the first tap while a fling is still moving.
  29  |     let last=-1, stable=0;
  30  |     await expect.poll(async()=>{const top=await first.locator('.letter-scroll').evaluate(node=>node.scrollTop); stable=top===last?stable+1:0; last=top; return stable;},{intervals:[100]}).toBeGreaterThanOrEqual(3);
  31  |     await first.getByRole('button',{name:'Fechar carta'}).tap(); await expect(first).toHaveCount(0);
  32  |   }
  33  |   for(const index of [5,1,3,0,4,2]) {
  34  |     const letter=lostLetters[index]; const target=page.locator(`[data-letter-id="${letter.id}"]`);
> 35  |     await target.focus(); await expect(target).toBeFocused(); await page.keyboard.press('Enter');
      |                                                ^ Error: expect(locator).toBeFocused() failed
  36  |     const reader=page.getByRole('dialog',{name:letter.title,exact:true}); await expect(reader).toBeVisible();
  37  |     const pose=await canvas.getAttribute('data-saved-camera-pose');
  38  |     await expect(reader.getByRole('heading',{name:letter.title,exact:true})).toBeFocused();
  39  |     await expect(reader.locator('.letter-paper p')).toHaveCount(letter.paragraphs.length);
  40  |     for (let i=0;i<letter.paragraphs.length;i++) await expect(reader.locator('.letter-paper p').nth(i)).toHaveText(letter.paragraphs[i]);
  41  |     expect(await reader.textContent()).not.toMatch(/(?:\p{Extended_Pictographic}|\p{Regional_Indicator}|\u2661|\uFE0F|\u20E3)/u);
  42  |     if(index===5) await page.screenshot({path:`test-results/letter-first-${width}.png`});
  43  |     await reader.locator('.letter-paper p').last().scrollIntoViewIfNeeded();
  44  |     await expect(reader.getByRole('button',{name:'Fechar carta',exact:true})).toBeVisible();
  45  |     expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  46  |     if(index===5) await page.screenshot({path:`test-results/letter-last-${width}.png`});
  47  |     await page.keyboard.press('Tab'); await expect(reader.getByRole('button',{name:'Fechar carta'})).toBeFocused();
  48  |     await page.keyboard.press('Tab'); await expect(reader.getByRole('button',{name:'Fechar carta'})).toBeFocused();
  49  |     await page.keyboard.press('Escape'); await expect(reader).toHaveCount(0);
  50  |     await expect(page.locator('[data-act="universe"]')).toHaveAttribute('data-navigation','GALAXY_IDLE');
  51  |     expect(await canvas.getAttribute('data-camera-pose')).toBe(pose);
  52  |     await expect(target).toBeFocused(); await expect(target).toHaveAttribute('data-read','true');
  53  |   }
  54  |   expect(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)!).read.length,letterStorageKey)).toBe(6);
  55  |   expect(await page.evaluate(()=>[localStorage.getItem('meu-universo.couple.v1'),localStorage.getItem('meu-universo.compatibility.v1')])).toEqual(['preserved','preserved']);
  56  |   if(width === 390) {
  57  |     const marker=page.locator('[data-letter-id="letter-1"]'); const before=await marker.getAttribute('style');
  58  |     await page.mouse.move(80,480); await page.mouse.down(); await page.mouse.move(150,450,{steps:6}); await page.mouse.up();
  59  |     await expect.poll(()=>marker.getAttribute('style')).not.toBe(before);
  60  |   }
  61  |   await page.reload(); await universe(page);
  62  |   await expect(page.locator('.letter-target[data-read="true"]')).toHaveCount(6);
  63  |   const target=page.getByRole('button',{name:`Reler carta: ${lostLetters[5].title}`,exact:true}); await target.focus(); await page.keyboard.press('Space');
  64  |   const reader=page.getByRole('dialog',{name:lostLetters[5].title}); await expect(reader).toBeVisible();
  65  |   await reader.getByRole('button',{name:'Fechar carta'}).click(); await expect(reader).toHaveCount(0); await expect(target).toBeFocused();
  66  |   expect(errors).toEqual([]);
  67  | });
  68  | 
  69  | test('envelopes open through the 3D raycaster without an HTML target intercepting',async({page})=>{
  70  |   await page.setViewportSize({width:1440,height:900}); await page.emulateMedia({reducedMotion:'reduce'}); await universe(page);
  71  |   const {PerspectiveCamera,Vector3}=await import('three');
  72  |   const camera=new PerspectiveCamera(45,1440/900,.1,120);
  73  |   camera.position.set(Math.sin(1.25)*Math.cos(Math.PI*.85)*14.5,Math.cos(1.25)*14.5*.72,Math.sin(1.25)*Math.sin(Math.PI*.85)*14.5); camera.lookAt(0,0,0); camera.updateMatrixWorld();
  74  |   await page.locator('.letter-targets').evaluate((node:HTMLElement)=>{node.style.pointerEvents='none';node.querySelectorAll<HTMLElement>('button').forEach(button=>button.style.pointerEvents='none');});
  75  |   // Isolate scene picking from the preexisting galaxy introduction overlay as well.
  76  |   await page.locator('.universe-scene').evaluate((node:HTMLElement)=>{node.style.pointerEvents='none';});
  77  |   const canvas=page.locator('canvas[data-renderer="webgl"]');
  78  |   for(const letter of lostLetters) {
  79  |     const projected=new Vector3(...letter.position).project(camera); const box=(await canvas.boundingBox())!;
  80  |     await page.mouse.click(box.x+(projected.x+1)*box.width/2,box.y+(1-projected.y)*box.height/2);
  81  |     const reader=page.getByRole('dialog',{name:letter.title}); await expect(reader).toBeVisible();
  82  |     await page.keyboard.press('Escape'); await expect(reader).toHaveCount(0); await expect(canvas).toHaveCSS('pointer-events','auto');
  83  |   }
  84  | });
  85  | 
  86  | test('cinematic letter, progressive text, repeated activation, skip and cancel',async({page})=>{
  87  |   await page.emulateMedia({reducedMotion:'reduce'}); await universe(page); await page.emulateMedia({reducedMotion:'no-preference'});
  88  |   const target=page.locator('[data-letter-id="letter-1"]'); await target.click();
  89  |   await expect(page.locator('[data-act="universe"]')).toHaveAttribute('data-navigation','TRAVEL_TO_DESTINATION');
  90  |   await target.evaluate((node:HTMLButtonElement)=>{node.click();node.click();});
  91  |   const reader=page.getByRole('dialog',{name:lostLetters[0].title});
  92  |   await expect(reader).toBeVisible(); await expect(reader.locator('.letter-paper p')).toHaveCount(1);
  93  |   await expect(reader.locator('.letter-paper p')).toHaveCount(2,{timeout:4000});
  94  |   await reader.getByRole('button',{name:'Mostrar carta inteira'}).click(); await expect(reader.locator('.letter-paper p')).toHaveCount(8);
  95  |   const pose=await page.locator('canvas[data-renderer="webgl"]').getAttribute('data-saved-camera-pose');
  96  |   await reader.getByRole('button',{name:'Fechar carta'}).dblclick();
  97  |   await expect(page.locator('[data-act="universe"]')).toHaveAttribute('data-navigation','RETURN_TO_GALAXY');
  98  |   await page.getByRole('button',{name:'Pular animação'}).click();
  99  |   await expect(page.locator('[data-act="universe"]')).toHaveAttribute('data-navigation','GALAXY_IDLE');
  100 |   expect(await page.locator('canvas[data-renderer="webgl"]').getAttribute('data-camera-pose')).toBe(pose);
  101 |   await target.focus(); await page.keyboard.press('Enter'); await page.getByRole('button',{name:'Pular animação'}).click();
  102 |   await expect(reader).toBeVisible(); await page.keyboard.press('Escape');
  103 |   await expect(reader).toHaveCount(0); await page.getByRole('button',{name:'Pular animação'}).click(); await expect(target).toBeFocused();
  104 |   await page.waitForTimeout(2500); await expect(reader).toHaveCount(0);
  105 | });
  106 | 
  107 | test('fallback, touch and blocked storage still allow reading and session replay',async({page})=>{
  108 |   await page.setViewportSize({width:320,height:568}); await page.emulateMedia({reducedMotion:'reduce'});
  109 |   await page.addInitScript(()=>{
  110 |     const original=HTMLCanvasElement.prototype.getContext;
  111 |     HTMLCanvasElement.prototype.getContext=function(...args:Parameters<typeof original>){if(String(args[0]).includes('webgl'))return null;return original.apply(this,args);} as typeof original;
  112 |     Storage.prototype.getItem=()=>{throw Error('blocked');}; Storage.prototype.setItem=()=>{throw Error('blocked');};
  113 |   });
  114 |   await universe(page); await expect(page.locator('canvas[data-renderer="canvas2d"]')).toBeVisible();
  115 |   const target=page.locator('[data-letter-id="letter-4"]'); await target.tap();
  116 |   const reader=page.getByRole('dialog',{name:lostLetters[3].title}); await expect(reader).toBeVisible();
  117 |   await reader.getByRole('button',{name:'Fechar carta'}).tap(); await expect(reader).toHaveCount(0); await expect(target).toHaveAttribute('data-read','true');
  118 |   await target.tap(); await expect(reader).toBeVisible(); await page.keyboard.press('Escape'); await expect(target).toBeFocused();
  119 |   await page.getByRole('button',{name:'Quiz de Casal',exact:true}).click(); await expect(page.getByRole('region',{name:'Quiz de Casal',exact:true})).toBeVisible();
  120 | });
  121 | 
```