import { experience } from '../src/config/experience';
const correctPin = [experience.birthdays.firstDay, experience.birthdays.secondDay].map(day => String(day).padStart(2,'0')).join('');
const reversedPin = [experience.birthdays.secondDay, experience.birthdays.firstDay].map(day => String(day).padStart(2,'0')).join('');
import { test, expect } from '@playwright/test';
async function pin(page: import('@playwright/test').Page, value: string) { for (const digit of value) await page.getByRole('button',{name:digit,exact:true}).click(); }
test('complete cinematic journey, errors, reversed days, interrupted and complete hold', async ({ page }) => {
  const errors: string[]=[]; page.on('pageerror',error=>errors.push(error.message)); page.on('console',message=> { if(message.type()==='error') errors.push(message.text()); });
  await page.goto('/'); await expect(page.getByRole('heading',{name:'que só você pode abrir.'})).toBeVisible();
  await page.screenshot({path:'test-results/lock-390.png'});
  await pin(page,'0000'); await expect(page.getByText('Hmm… tenta pensar em nós dois.')).toBeVisible(); await page.waitForTimeout(700);
  await pin(page,'0000'); await expect(page.getByText('São dois dias que eu espero que você lembre.')).toBeVisible(); await page.waitForTimeout(700);
  await pin(page,reversedPin); await expect(page.getByText(experience.lock.reversed)).toBeVisible(); await page.waitForTimeout(700);
  await page.getByRole('button',{name:'Uma pequena pista'}).click(); await expect(page.getByText('O dia do seu aniversário e o dia do meu. Nessa ordem.')).toBeVisible();
  await pin(page,correctPin); await expect(page.locator('[data-act="unlocking"]')).toBeVisible();
  await expect(page.getByText('Você entrou.',{exact:true})).toBeVisible({timeout:5000});
  const scanner=page.getByRole('button',{name:/Leitor visual fictício/}); await expect(scanner).toBeVisible({timeout:12000});
  await page.screenshot({path:'test-results/scanner-390.png'});
  const box=(await scanner.boundingBox())!; await page.mouse.move(box.x+box.width/2,box.y+box.height/2); await page.mouse.down(); await page.waitForTimeout(900); await page.mouse.up();
  await expect(page.locator('[data-act="scan"]')).toBeVisible(); await page.waitForTimeout(700); await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow','0');
  await page.mouse.down(); await expect(page.getByText('Identidade reconhecida.',{exact:true})).toBeVisible({timeout:6500}); await page.mouse.up();
  await expect(page.getByText(experience.scan.love,{exact:true})).toBeVisible({timeout:4000});
  await expect(page.locator('[data-act="universe"]')).toBeVisible({timeout:25000}); await page.waitForTimeout(2600); await page.screenshot({path:'test-results/galaxy-390.png'});
  await page.getByRole('button',{name:'Viver de novo'}).click(); await expect(page.locator('[data-act="lock"]')).toBeVisible(); expect(errors).toEqual([]);
});
for (const width of [320,360,390,430,1440]) test(`layout fits ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:width===320?568:900}); await page.goto('/');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  const zero=page.getByRole('button',{name:'0',exact:true}); await expect(zero).toBeVisible(); const box=(await zero.boundingBox())!; expect(box.width).toBeGreaterThanOrEqual(44); expect(box.height).toBeGreaterThanOrEqual(44);
  await page.waitForTimeout(1600);
  await page.screenshot({path:`test-results/layout-${width}.png`,fullPage:true});
});
test('reduced-motion flow and no-WebGL fallback',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.addInitScript(()=>{ const original=HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext=function(type: string,...args: unknown[]) { if(type==='webgl2'||type==='webgl'||type==='experimental-webgl') return null; return original.apply(this,[type,...args] as Parameters<typeof original>); } as typeof original; });
  await page.goto('/'); await pin(page,correctPin); const scanner=page.getByRole('button',{name:/Leitor visual fictício/}); await expect(scanner).toBeVisible({timeout:15000});
  await expect(page.locator('[data-renderer="canvas2d"]')).toBeVisible(); await scanner.focus(); await page.keyboard.down('Enter'); await expect(page.locator('[data-act="recognized"]')).toBeVisible({timeout:6000}); await page.keyboard.up('Enter');
  await expect(page.locator('[data-act="universe"]')).toBeVisible({timeout:12000});
});

