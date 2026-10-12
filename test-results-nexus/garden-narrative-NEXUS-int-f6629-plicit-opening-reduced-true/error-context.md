# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: garden-narrative.spec.ts >> NEXUS interruption recovers and files wait for explicit opening, reduced=true
- Location: tests\garden-narrative.spec.ts:7:38

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator:  locator('#file')
Expected: visible
Received: hidden
Timeout:  10000ms

Call log:
  - Expect "toBeVisible" locator('#file') with timeout 10000ms
  - waiting for locator('#file')
    23 × locator resolved to <section id="file" class="file-window hidden" aria-labelledby="file-title">…</section>
       - unexpected value "hidden"

```

```yaml
- main "Um jardim que cabe em um programa":
  - status
  - region "Terminal do jardim":
    - text: garden.exe personal build / 01
    - log: "> Arquivo fechado."
    - button "Continuar"
  - button "Ativar som": som desligado
```

# Test source

```ts
  1   | import { expect, test, type Page, type FrameLocator } from '@playwright/test';
  2   | import { readFileSync } from 'node:fs';
  3   | import { experience } from '../src/config/experience';
  4   | 
  5   | test.use({ hasTouch: true });
  6   | 
  7   | for (const reduced of [false, true]) test(`NEXUS interruption recovers and files wait for explicit opening, reduced=${reduced}`, async ({ page }) => {
  8   |   await page.setViewportSize({ width: reduced ? 430 : 390, height: 740 });
  9   |   await page.emulateMedia({ reducedMotion: reduced ? 'reduce' : 'no-preference' });
  10  |   await page.goto('/jardim-eterno/index.html');
  11  |   const terminal = page.locator('#terminal');
  12  |   await expect(page.locator('body')).toHaveAttribute('data-scene', 'BOOT');
  13  |   const base = await page.locator('#terminal-lines > div').first().evaluate(node => getComputedStyle(node).color);
  14  |   const advance = page.locator('#terminal-advance');
  15  |   for (let i = 0; i < 30 && await page.locator('#terminal-lines > div').count() < 4; i++) {
  16  |     if (await advance.isEnabled()) await advance.click();
  17  |     await page.waitForTimeout(500);
  18  |   }
  19  |   if (!reduced) await advance.click();
  20  |   await expect(terminal).toHaveAttribute('data-phase', 'error');
  21  |   await expect(terminal).toHaveClass(/nexus-fault/);
  22  |   if (reduced) expect(await terminal.evaluate(node => getComputedStyle(node).animationName)).toBe('none');
  23  |   await expect(terminal).toHaveAttribute('data-phase', 'reading');
  24  |   await expect(terminal).not.toHaveClass(/nexus-fault|nexus-recovery/);
  25  |   expect(await page.locator('.terminal-error').evaluate(node => getComputedStyle(node).color)).toBe(base);
  26  |   await page.waitForTimeout(2800);
  27  |   await expect(page.locator('#terminal-lines > div')).toHaveCount(4);
  28  |   await expect(page.locator('.speaker-nexus')).toHaveCount(0);
  29  |   await driveTerminal(page, page, '#terminal-file');
  30  |   await expect(page.locator('#terminal-file')).toHaveText('[ Abrir canada.txt ]');
  31  |   await page.waitForTimeout(2800); await expect(page.locator('#file')).toBeHidden();
  32  |   await page.locator('#terminal-file').dblclick();
> 33  |   await expect(page.locator('#file')).toBeVisible();
      |                                       ^ Error: expect(locator).toBeVisible() failed
  34  |   await expect(page.locator('#file-title')).toHaveText('canada.txt');
  35  |   await expect(page.locator('#terminal')).toBeHidden();
  36  | });
  37  | 
  38  | async function driveTerminal(surface: Page | FrameLocator, page: Page, selector: string, name?: string) {
  39  |   const target = name ? surface.locator(selector).filter({ hasText: name }) : surface.locator(selector);
  40  |   for (let i = 0; i < 160; i++) {
  41  |     if (await target.isVisible()) return;
  42  |     const fileButton = surface.locator('#terminal-file');
  43  |     const advance = surface.locator('#terminal-advance');
  44  |     if (await fileButton.isVisible()) await fileButton.click();
  45  |     else if (await advance.isVisible() && await advance.isEnabled()) await advance.click();
  46  |     await page.waitForTimeout(500);
  47  |   }
  48  |   await expect(target).toBeVisible();
  49  | }
  50  | 
  51  | test('terminal speech advances by keyboard without adding another scene', async ({ page }) => {
  52  |   await page.setViewportSize({ width: 320, height: 568 });
  53  |   await page.emulateMedia({ reducedMotion: 'no-preference' });
  54  |   await page.goto('/jardim-eterno/index.html');
  55  |   await expect(page.locator('body')).toHaveAttribute('data-scene', 'BOOT');
  56  |   const advance = page.locator('#terminal-advance');
  57  |   await advance.focus(); await page.keyboard.press('Enter');
  58  |   await expect(page.locator('#terminal-lines')).toContainText('Inicializando Jardim Eterno...');
  59  |   await expect(page.locator('#terminal')).toHaveAttribute('data-phase', 'reading');
  60  |   await page.waitForTimeout(3000);
  61  |   await expect(page.locator('#terminal-lines > div')).toHaveCount(1);
  62  |   await page.keyboard.press('Space');
  63  |   await expect(page.locator('#terminal-lines > div')).toHaveCount(2);
  64  |   await page.waitForTimeout(500);
  65  |   await advance.dblclick();
  66  |   await expect(page.locator('#terminal-lines > div')).toHaveCount(2);
  67  |   await driveTerminal(page, page, '#terminal-file');
  68  |   await expect(page.locator('#file')).toBeHidden();
  69  |   await page.waitForTimeout(3000);
  70  |   await expect(page.locator('#file')).toBeHidden();
  71  |   await page.locator('#terminal-file').focus(); await page.keyboard.press('Enter');
  72  |   await expect(page.locator('#file-title')).toHaveText('canada.txt');
  73  |   await expect(page.locator('#file')).toBeVisible();
  74  | });
  75  | 
  76  | for (const width of [320, 390, 430]) {
  77  |   test(`complete garden narrative and optional interactions at ${width}px`, async ({ page }) => {
  78  |     test.setTimeout(120000);
  79  |     await page.setViewportSize({ width, height: 740 });
  80  |     await page.emulateMedia({ reducedMotion: 'reduce' });
  81  |     const errors: string[] = [];
  82  |     page.on('pageerror', error => errors.push(error.message));
  83  |     await page.goto('/jardim-eterno/index.html');
  84  |     async function file(name: string) {
  85  |       await driveTerminal(page, page, '#file', name);
  86  |       await expect(page.locator('#file-title')).toHaveText(name, { timeout: 20000 });
  87  |       await expect(page.locator('#file')).toBeVisible();
  88  |       expect(await page.locator('#final-message').textContent()).toBe(readFileSync(`public/jardim-eterno/${name}`, 'utf8').replace(/\r\n/g, '\n'));
  89  |       expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  90  |       await page.locator('#file-scroll').focus();
  91  |       await page.keyboard.press('End');
  92  |       await expect(page.locator('#file-close')).toBeInViewport();
  93  |     }
  94  |     await file('canada.txt');
  95  |     if (width === 320) await page.screenshot({ path: 'test-results/garden-letter-320.png' });
  96  |     await page.keyboard.press('Escape');
  97  |     await driveTerminal(page, page, '#cord');
  98  |     await expect(page.locator('#cord')).toBeVisible({ timeout: 15000 });
  99  |     if (width === 390) {
  100 |       const box = (await page.locator('#cord').boundingBox())!;
  101 |       const session = await page.context().newCDPSession(page);
  102 |       const point = { x: box.x + box.width / 2, y: box.y + box.height - 25 };
  103 |       await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point] });
  104 |       await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ ...point, y: point.y + 90 }] });
  105 |       await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  106 |       await session.detach();
  107 |     } else {
  108 |       await page.locator('#cord').focus();
  109 |       await page.keyboard.press('Enter');
  110 |     }
  111 |     await expect(page.locator('#end')).toBeVisible({ timeout: 15000 });
  112 |     for (const [name, message] of [
  113 |       ['Rosa curiosa', 'Essa aqui disse que gosta bastante do seu cabelo. Acho que ela tem bom gosto.'],
  114 |       ['Tulipa companheira', 'Essa prefere os momentos simples. Aqueles em que a companhia já é suficiente.'],
  115 |       ['Lírio tímido', 'Calma, ela só ficou com vergonha. Acontece quando encontra alguém bonito.'],
  116 |     ]) {
  117 |       const flower = page.getByRole('button', { name: `${name} — tocar`, exact: true });
  118 |       if (width === 390) await flower.tap();
  119 |       else { await flower.focus(); await page.keyboard.press('Enter'); }
  120 |       await expect(page.locator('#caption')).toContainText(message);
  121 |     }
  122 |     for (const name of ['Flor que muda de cor', 'Flor dos vagalumes', 'Flores companheiras']) {
  123 |       await page.getByRole('button', { name: `${name} — tocar`, exact: true }).focus();
  124 |       await page.keyboard.press('Enter');
  125 |     }
  126 |     await expect(page.locator('#end')).toBeInViewport();
  127 |     if (width === 320) await page.screenshot({ path: 'test-results/garden-interactions-320.png' });
  128 |     await page.locator('#end').click();
  129 |     await file('convencido.txt');
  130 |     await page.locator('#file-close').evaluate(button => { (button as HTMLElement).click(); (button as HTMLElement).click(); });
  131 |     await file('pra ela.txt');
  132 |     await page.locator('#file-close').click();
  133 |     await driveTerminal(page, page, '#epilogue');
```