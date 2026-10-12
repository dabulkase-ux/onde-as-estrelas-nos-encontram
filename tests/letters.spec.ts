import { test, expect, type Page } from '@playwright/test';
import { experience } from '../src/config/experience';
import { lostLetters } from '../src/experiences/letters/data';
import { letterStorageKey } from '../src/experiences/letters/progress';
test.use({hasTouch:true});
async function universe(page:Page) {
  await page.goto('/');
  for (const digit of [experience.birthdays.firstDay,experience.birthdays.secondDay].map(day=>String(day).padStart(2,'0')).join('')) await page.getByRole('button',{name:digit,exact:true}).click();
  const scanner = page.getByRole('button',{name:/Leitor visual fictício/});
  await expect(scanner).toBeVisible({timeout:15000}); await scanner.focus(); await page.keyboard.down('Enter');
  await expect(page.locator('[data-act="recognized"]')).toBeVisible({timeout:6000}); await page.keyboard.up('Enter');
  await expect(page.locator('[data-act="universe"]')).toBeVisible({timeout:20000});
}
for (const width of [320,390,430,1440]) test(`six letters, keyboard, scroll, replay and persistence ${width}`,async({page})=>{
  await page.setViewportSize({width,height:width===320?568:900}); await page.emulateMedia({reducedMotion:'reduce'});
  const errors:string[]=[]; page.on('pageerror',error=>errors.push(error.message));
  await page.addInitScript(() => { if (!localStorage.getItem('letter-test-seeded')) { localStorage.setItem('meu-universo.couple.v1','preserved'); localStorage.setItem('meu-universo.compatibility.v1','preserved'); localStorage.setItem('letter-test-seeded','yes'); } });
  await universe(page);
  const canvas=page.locator('canvas[data-renderer="webgl"]');
  if(width < 700) {
    await page.locator('[data-letter-id="letter-1"]').tap();
    const first=page.getByRole('dialog',{name:lostLetters[0].title}); await expect(first).toBeVisible();
    const session=await page.context().newCDPSession(page);
    await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:150,y:440}]});
    for(let y=410;y>=170;y-=30) await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:150,y}]});
    await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]}); await session.detach();
    await expect.poll(()=>first.locator('.letter-scroll').evaluate(node=>node.scrollTop)).toBeGreaterThan(0);
    // Native scrolling consumes the first tap while a fling is still moving.
    let last=-1, stable=0;
    await expect.poll(async()=>{const top=await first.locator('.letter-scroll').evaluate(node=>node.scrollTop); stable=top===last?stable+1:0; last=top; return stable;},{intervals:[100]}).toBeGreaterThanOrEqual(3);
    await first.getByRole('button',{name:'Fechar carta'}).tap(); await expect(first).toHaveCount(0);
    await expect(page.locator('[data-act="universe"]')).toHaveAttribute('data-navigation','GALAXY_IDLE');
    await expect(page.locator('[data-letter-id="letter-1"]')).toBeFocused();
  }
  for(const index of [5,1,3,0,4,2]) {
    const letter=lostLetters[index]; const target=page.locator(`[data-letter-id="${letter.id}"]`);
    await target.focus(); await expect(target).toBeFocused(); await page.keyboard.press('Enter');
    const reader=page.getByRole('dialog',{name:letter.title,exact:true}); await expect(reader).toBeVisible();
    const pose=await canvas.getAttribute('data-saved-camera-pose');
    await expect(reader.getByRole('heading',{name:letter.title,exact:true})).toBeFocused();
    await expect(reader.locator('.letter-paper p')).toHaveCount(letter.paragraphs.length);
    for (let i=0;i<letter.paragraphs.length;i++) await expect(reader.locator('.letter-paper p').nth(i)).toHaveText(letter.paragraphs[i]);
    expect(await reader.textContent()).not.toMatch(/(?:\p{Extended_Pictographic}|\p{Regional_Indicator}|\u2661|\uFE0F|\u20E3)/u);
    if(index===5) await page.screenshot({path:`test-results/letter-first-${width}.png`});
    await reader.locator('.letter-paper p').last().scrollIntoViewIfNeeded();
    await expect(reader.getByRole('button',{name:'Fechar carta',exact:true})).toBeVisible();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    if(index===5) await page.screenshot({path:`test-results/letter-last-${width}.png`});
    await page.keyboard.press('Tab'); await expect(reader.getByRole('button',{name:'Fechar carta'})).toBeFocused();
    await page.keyboard.press('Tab'); await expect(reader.getByRole('button',{name:'Fechar carta'})).toBeFocused();
    await page.keyboard.press('Escape'); await expect(reader).toHaveCount(0);
    await expect(page.locator('[data-act="universe"]')).toHaveAttribute('data-navigation','GALAXY_IDLE');
    expect(await canvas.getAttribute('data-camera-pose')).toBe(pose);
    await expect(target).toBeFocused(); await expect(target).toHaveAttribute('data-read','true');
  }
  expect(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)!).read.length,letterStorageKey)).toBe(6);
  expect(await page.evaluate(()=>[localStorage.getItem('meu-universo.couple.v1'),localStorage.getItem('meu-universo.compatibility.v1')])).toEqual(['preserved','preserved']);
  if(width === 390) {
    const marker=page.locator('[data-letter-id="letter-1"]'); const before=await marker.getAttribute('style');
    await page.mouse.move(80,480); await page.mouse.down(); await page.mouse.move(150,450,{steps:6}); await page.mouse.up();
    await expect.poll(()=>marker.getAttribute('style')).not.toBe(before);
  }
  await page.reload(); await universe(page);
  await expect(page.locator('.letter-target[data-read="true"]')).toHaveCount(6);
  const target=page.getByRole('button',{name:`Reler carta: ${lostLetters[5].title}`,exact:true}); await target.focus(); await page.keyboard.press('Space');
  const reader=page.getByRole('dialog',{name:lostLetters[5].title}); await expect(reader).toBeVisible();
  await reader.getByRole('button',{name:'Fechar carta'}).click(); await expect(reader).toHaveCount(0); await expect(target).toBeFocused();
  expect(errors).toEqual([]);
});

test('envelopes open through the 3D raycaster without an HTML target intercepting',async({page})=>{
  await page.setViewportSize({width:1440,height:900}); await page.emulateMedia({reducedMotion:'reduce'}); await universe(page);
  const {PerspectiveCamera,Vector3}=await import('three');
  const camera=new PerspectiveCamera(45,1440/900,.1,120);
  camera.position.set(Math.sin(1.25)*Math.cos(Math.PI*.85)*14.5,Math.cos(1.25)*14.5*.72,Math.sin(1.25)*Math.sin(Math.PI*.85)*14.5); camera.lookAt(0,0,0); camera.updateMatrixWorld();
  await page.locator('.letter-targets').evaluate((node:HTMLElement)=>{node.style.pointerEvents='none';node.querySelectorAll<HTMLElement>('button').forEach(button=>button.style.pointerEvents='none');});
  // Isolate scene picking from the preexisting galaxy introduction overlay as well.
  await page.locator('.universe-scene').evaluate((node:HTMLElement)=>{node.style.pointerEvents='none';});
  const canvas=page.locator('canvas[data-renderer="webgl"]');
  for(const letter of lostLetters) {
    const projected=new Vector3(...letter.position).project(camera); const box=(await canvas.boundingBox())!;
    await page.mouse.click(box.x+(projected.x+1)*box.width/2,box.y+(1-projected.y)*box.height/2);
    const reader=page.getByRole('dialog',{name:letter.title}); await expect(reader).toBeVisible();
    await page.keyboard.press('Escape'); await expect(reader).toHaveCount(0); await expect(canvas).toHaveCSS('pointer-events','auto');
  }
});

test('cinematic letter, progressive text, repeated activation, skip and cancel',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'}); await universe(page); await page.emulateMedia({reducedMotion:'no-preference'});
  const target=page.locator('[data-letter-id="letter-1"]'); await target.click();
  await expect(page.locator('[data-act="universe"]')).toHaveAttribute('data-navigation','TRAVEL_TO_DESTINATION');
  await target.evaluate((node:HTMLButtonElement)=>{node.click();node.click();});
  const reader=page.getByRole('dialog',{name:lostLetters[0].title});
  await expect(reader).toBeVisible(); await expect(reader.locator('.letter-paper p')).toHaveCount(1);
  await expect(reader.locator('.letter-paper p')).toHaveCount(2,{timeout:4000});
  await reader.getByRole('button',{name:'Mostrar carta inteira'}).click(); await expect(reader.locator('.letter-paper p')).toHaveCount(8);
  const pose=await page.locator('canvas[data-renderer="webgl"]').getAttribute('data-saved-camera-pose');
  await reader.getByRole('button',{name:'Fechar carta'}).dblclick();
  await expect(page.locator('[data-act="universe"]')).toHaveAttribute('data-navigation','RETURN_TO_GALAXY');
  await page.getByRole('button',{name:'Pular animação'}).click();
  await expect(page.locator('[data-act="universe"]')).toHaveAttribute('data-navigation','GALAXY_IDLE');
  expect(await page.locator('canvas[data-renderer="webgl"]').getAttribute('data-camera-pose')).toBe(pose);
  await target.focus(); await page.keyboard.press('Enter'); await page.getByRole('button',{name:'Pular animação'}).click();
  await expect(reader).toBeVisible(); await page.keyboard.press('Escape');
  await expect(reader).toHaveCount(0); await page.getByRole('button',{name:'Pular animação'}).click(); await expect(target).toBeFocused();
  await page.waitForTimeout(2500); await expect(reader).toHaveCount(0);
});

test('fallback, touch and blocked storage still allow reading and session replay',async({page})=>{
  await page.setViewportSize({width:320,height:568}); await page.emulateMedia({reducedMotion:'reduce'});
  await page.addInitScript(()=>{
    const original=HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext=function(...args:Parameters<typeof original>){if(String(args[0]).includes('webgl'))return null;return original.apply(this,args);} as typeof original;
    Storage.prototype.getItem=()=>{throw Error('blocked');}; Storage.prototype.setItem=()=>{throw Error('blocked');};
  });
  await universe(page); await expect(page.locator('canvas[data-renderer="canvas2d"]')).toBeVisible();
  const target=page.locator('[data-letter-id="letter-4"]'); await target.tap();
  const reader=page.getByRole('dialog',{name:lostLetters[3].title}); await expect(reader).toBeVisible();
  await reader.getByRole('button',{name:'Fechar carta'}).tap(); await expect(reader).toHaveCount(0); await expect(target).toHaveAttribute('data-read','true');
  await target.tap(); await expect(reader).toBeVisible(); await page.keyboard.press('Escape'); await expect(target).toBeFocused();
  await page.getByRole('button',{name:'Quiz de Casal',exact:true}).click(); await expect(page.getByRole('region',{name:'Quiz de Casal',exact:true})).toBeVisible();
});
