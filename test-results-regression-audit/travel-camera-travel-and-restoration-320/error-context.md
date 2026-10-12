# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: travel.spec.ts >> camera travel and restoration 320
- Location: tests\travel.spec.ts:5:49

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('region', { name: 'Quiz de Casal', exact: true })
Expected: visible
Timeout: 10000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" getByRole('region', { name: 'Quiz de Casal', exact: true }) with timeout 10000ms
  - waiting for getByRole('region', { name: 'Quiz de Casal', exact: true })

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
- status: Abrindo nossas estrelas...
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | import { experience } from '../src/config/experience';
  3  | test.use({hasTouch:true});
  4  | 
  5  | for (const width of [320, 390, 430, 844, 1440]) test(`camera travel and restoration ${width}`, async ({page}) => {
  6  |   await page.setViewportSize({width, height: width === 844 ? 390 : width === 1440 ? 900 : 740});
  7  |   await page.emulateMedia({reducedMotion:'reduce'});
  8  |   await page.goto('/');
  9  |   const pin = [experience.birthdays.firstDay,experience.birthdays.secondDay].map(d=>String(d).padStart(2,'0')).join('');
  10 |   for (const digit of pin) await page.getByRole('button',{name:digit,exact:true}).click();
  11 |   const scanner = page.getByRole('button',{name:/Leitor visual fictício/});
  12 |   await expect(scanner).toBeVisible({timeout:15000}); await scanner.focus(); await page.keyboard.down('Enter');
  13 |   await expect(page.locator('[data-act="recognized"]')).toBeVisible({timeout:6000}); await page.keyboard.up('Enter');
  14 |   const root = page.locator('[data-act="universe"]'); await expect(root).toBeVisible({timeout:20000});
  15 |   const canvas = page.locator('canvas[data-renderer="webgl"]');
  16 |   await expect(canvas).toBeVisible();
  17 |   await page.emulateMedia({reducedMotion:'no-preference'});
  18 |   // Save an explored view rather than just testing the initial orbit.
  19 |   const gestureY = width === 844 ? 280 : 500;
  20 |   await page.mouse.move(80,gestureY); await page.mouse.down(); await page.mouse.move(155,gestureY-30,{steps:8}); await page.mouse.up();
  21 |   await page.mouse.wheel(0,180); await page.waitForTimeout(700);
  22 |   let firstSaved: string | null = null;
  23 |   for (const [accessName,regionName] of [['Quiz de Casal','Quiz de Casal'],['Compatibilidade','Quiz de compatibilidade']]) {
  24 |     const access = page.getByRole('button',{name:accessName,exact:true});
  25 |     if (width >= 700) await access.click();
  26 |     else { const box = (await access.boundingBox())!; await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2); }
  27 |     await expect(root).toHaveAttribute('data-navigation','TRAVEL_TO_DESTINATION');
  28 |     await expect(canvas).toHaveCSS('pointer-events','none');
  29 |     // Repeated activation cannot replace the route/destination.
  30 |     await access.evaluate((button: HTMLButtonElement) => { button.click(); button.click(); });
  31 |     const saved = await canvas.getAttribute('data-saved-camera-pose'); expect(saved).not.toBeNull();
  32 |     if (!firstSaved) firstSaved = saved;
  33 |     const quiz = page.getByRole('region',{name:regionName,exact:true});
  34 |     if (width === 430) await page.emulateMedia({reducedMotion:'reduce'});
  35 |     else if (width < 700) { await page.getByRole('button',{name:'Pular animação'}).focus(); await page.keyboard.press('Enter'); }
  36 |     else { await page.waitForTimeout(1800); await expect(quiz).toHaveCount(0); await page.screenshot({path:`test-results/travel-${accessName}.png`}); }
> 37 |     await expect(quiz).toBeVisible();
     |                        ^ Error: expect(locator).toBeVisible() failed
  38 |     expect(await canvas.getAttribute('data-camera-pose')).not.toBe(saved);
  39 |     const {PerspectiveCamera, Vector3} = await import('three');
  40 |     const box = (await canvas.boundingBox())!;
  41 |     const pose: number[] = JSON.parse((await canvas.getAttribute('data-camera-pose'))!);
  42 |     const star: [number, number, number] = JSON.parse((await canvas.getAttribute('data-destination-position'))!);
  43 |     const camera = new PerspectiveCamera(45, box.width / box.height);
  44 |     camera.position.fromArray(pose); camera.quaternion.fromArray(pose, 3); camera.updateMatrixWorld();
  45 |     const point = new Vector3(...star).project(camera);
  46 |     expect(box.x + (point.x + 1) * box.width / 2).toBeCloseTo(width / 2, 0);
  47 |     const viewport = page.viewportSize()!;
  48 |     expect(box.y + (1 - point.y) * box.height / 2).toBeCloseTo(viewport.height / 2, 0);
  49 |     const back = quiz.getByRole('button',{name:'Voltar à galáxia',exact:true});
  50 |     await expect(back).toBeVisible(); await back.click();
  51 |     if (width !== 430) {
  52 |       await expect(root).toHaveAttribute('data-navigation','RETURN_TO_GALAXY');
  53 |       if (width < 700) await page.getByRole('button',{name:'Pular animação'}).click();
  54 |     }
  55 |     await expect(root).toHaveAttribute('data-navigation','GALAXY_IDLE');
  56 |     expect(await canvas.getAttribute('data-camera-pose')).toBe(saved);
  57 |     await expect(canvas).toHaveCSS('pointer-events','auto'); await expect(access).toBeFocused();
  58 |     expect(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  59 |     await page.emulateMedia({reducedMotion:'no-preference'});
  60 |   }
  61 |   // Controls remain operational after both returns; reduced motion still completes both trips.
  62 |   await page.mouse.move(80,gestureY); await page.mouse.down(); await page.mouse.move(180,gestureY-20,{steps:8}); await page.mouse.up(); await page.waitForTimeout(600);
  63 |   await page.emulateMedia({reducedMotion:'reduce'});
  64 |   await page.getByRole('button',{name:'Quiz de Casal',exact:true}).click();
  65 |   const quiz = page.getByRole('region',{name:'Quiz de Casal',exact:true}); await expect(quiz).toBeVisible();
  66 |   expect(await canvas.getAttribute('data-saved-camera-pose')).not.toBe(firstSaved);
  67 |   await page.keyboard.press('Escape'); await expect(root).toHaveAttribute('data-navigation','GALAXY_IDLE');
  68 | });
  69 | 
```