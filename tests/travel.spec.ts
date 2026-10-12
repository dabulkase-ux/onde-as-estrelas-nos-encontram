import { test, expect } from '@playwright/test';
import { experience } from '../src/config/experience';
test.use({hasTouch:true});

for (const width of [320, 390, 430, 844, 1440]) test(`camera travel and restoration ${width}`, async ({page}) => {
  await page.setViewportSize({width, height: width === 844 ? 390 : width === 1440 ? 900 : 740});
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('/');
  const pin = [experience.birthdays.firstDay,experience.birthdays.secondDay].map(d=>String(d).padStart(2,'0')).join('');
  for (const digit of pin) await page.getByRole('button',{name:digit,exact:true}).click();
  const scanner = page.getByRole('button',{name:/Leitor visual fictício/});
  await expect(scanner).toBeVisible({timeout:15000}); await scanner.focus(); await page.keyboard.down('Enter');
  await expect(page.locator('[data-act="recognized"]')).toBeVisible({timeout:6000}); await page.keyboard.up('Enter');
  const root = page.locator('[data-act="universe"]'); await expect(root).toBeVisible({timeout:20000});
  const canvas = page.locator('canvas[data-renderer="webgl"]');
  await expect(canvas).toBeVisible();
  await page.emulateMedia({reducedMotion:'no-preference'});
  // Save an explored view rather than just testing the initial orbit.
  const gestureY = width === 844 ? 280 : 500;
  await page.mouse.move(80,gestureY); await page.mouse.down(); await page.mouse.move(155,gestureY-30,{steps:8}); await page.mouse.up();
  await page.mouse.wheel(0,180); await page.waitForTimeout(700);
  let firstSaved: string | null = null;
  for (const [accessName,regionName] of [['Quiz de Casal','Quiz de Casal'],['Compatibilidade','Quiz de compatibilidade']]) {
    const access = page.getByRole('button',{name:accessName,exact:true});
    if (width >= 700) await access.click();
    else { const box = (await access.boundingBox())!; await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2); }
    await expect(root).toHaveAttribute('data-navigation','TRAVEL_TO_DESTINATION');
    await expect(canvas).toHaveCSS('pointer-events','none');
    // Repeated activation cannot replace the route/destination.
    await access.evaluate((button: HTMLButtonElement) => { button.click(); button.click(); });
    const saved = await canvas.getAttribute('data-saved-camera-pose'); expect(saved).not.toBeNull();
    if (!firstSaved) firstSaved = saved;
    const quiz = page.getByRole('region',{name:regionName,exact:true});
    if (width === 430) await page.emulateMedia({reducedMotion:'reduce'});
    else if (width < 700) { await page.getByRole('button',{name:'Pular animação'}).focus(); await page.keyboard.press('Enter'); }
    else { await page.waitForTimeout(1800); await expect(quiz).toHaveCount(0); await page.screenshot({path:`test-results/travel-${accessName}.png`}); }
    await expect(quiz).toBeVisible();
    expect(await canvas.getAttribute('data-camera-pose')).not.toBe(saved);
    const {PerspectiveCamera, Vector3} = await import('three');
    const box = (await canvas.boundingBox())!;
    const pose: number[] = JSON.parse((await canvas.getAttribute('data-camera-pose'))!);
    const star: [number, number, number] = JSON.parse((await canvas.getAttribute('data-destination-position'))!);
    const camera = new PerspectiveCamera(45, box.width / box.height);
    camera.position.fromArray(pose); camera.quaternion.fromArray(pose, 3); camera.updateMatrixWorld();
    const point = new Vector3(...star).project(camera);
    expect(box.x + (point.x + 1) * box.width / 2).toBeCloseTo(width / 2, 0);
    const viewport = page.viewportSize()!;
    expect(box.y + (1 - point.y) * box.height / 2).toBeCloseTo(viewport.height / 2, 0);
    const back = quiz.getByRole('button',{name:'Voltar à galáxia',exact:true});
    await expect(back).toBeVisible(); await back.click();
    if (width !== 430) {
      await expect(root).toHaveAttribute('data-navigation','RETURN_TO_GALAXY');
      if (width < 700) await page.getByRole('button',{name:'Pular animação'}).click();
    }
    await expect(root).toHaveAttribute('data-navigation','GALAXY_IDLE');
    expect(await canvas.getAttribute('data-camera-pose')).toBe(saved);
    await expect(canvas).toHaveCSS('pointer-events','auto'); await expect(access).toBeFocused();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.emulateMedia({reducedMotion:'no-preference'});
  }
  // Controls remain operational after both returns; reduced motion still completes both trips.
  await page.mouse.move(80,gestureY); await page.mouse.down(); await page.mouse.move(180,gestureY-20,{steps:8}); await page.mouse.up(); await page.waitForTimeout(600);
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.getByRole('button',{name:'Quiz de Casal',exact:true}).click();
  const quiz = page.getByRole('region',{name:'Quiz de Casal',exact:true}); await expect(quiz).toBeVisible();
  expect(await canvas.getAttribute('data-saved-camera-pose')).not.toBe(firstSaved);
  await page.keyboard.press('Escape'); await expect(root).toHaveAttribute('data-navigation','GALAXY_IDLE');
});
