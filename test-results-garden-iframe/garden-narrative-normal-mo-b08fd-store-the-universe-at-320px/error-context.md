# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: garden-narrative.spec.ts >> normal-motion terminal and final iframe exit restore the universe at 320px
- Location: tests\garden-narrative.spec.ts:82:34

# Error details

```
Error: expect(locator).toHaveText(expected) failed

Locator:  locator('iframe[title="Jardim Eterno"]').contentFrame().locator('#file-title')
Expected: "canada.txt"
Received: "para_ela.txt"
Timeout:  10000ms

Call log:
  - Expect "toHaveText" locator('iframe[title="Jardim Eterno"]').contentFrame().locator('#file-title') with timeout 10000ms
  - waiting for locator('iframe[title="Jardim Eterno"]').contentFrame().locator('#file-title')
    23 × locator resolved to <span id="file-title">para_ela.txt</span>
       - unexpected value "para_ela.txt"

```

```yaml
- main "Um jardim que cabe em um programa":
  - status
  - region "Terminal do jardim":
    - text: garden.exe personal build / 01
    - log: "> Inicializando Jardim Eterno..."
    - button "Avançar fala"
  - button "Ativar som": som desligado
```

# Test source

```ts
  14  |     await page.goto('/jardim-eterno/index.html');
  15  |     async function file(name: string) {
  16  |       await expect(page.locator('#file-title')).toHaveText(name, { timeout: 20000 });
  17  |       await expect(page.locator('#file')).toBeVisible();
  18  |       expect(await page.locator('#final-message').textContent()).toBe(readFileSync(`public/jardim-eterno/${name}`, 'utf8').replace(/\r\n/g, '\n'));
  19  |       expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  20  |       await page.locator('#file-scroll').focus();
  21  |       await page.keyboard.press('End');
  22  |       await expect(page.locator('#file-close')).toBeInViewport();
  23  |     }
  24  |     await file('canada.txt');
  25  |     if (width === 320) await page.screenshot({ path: 'test-results/garden-letter-320.png' });
  26  |     await page.keyboard.press('Escape');
  27  |     await expect(page.locator('#cord')).toBeVisible({ timeout: 15000 });
  28  |     if (width === 390) {
  29  |       const box = (await page.locator('#cord').boundingBox())!;
  30  |       const session = await page.context().newCDPSession(page);
  31  |       const point = { x: box.x + box.width / 2, y: box.y + box.height - 25 };
  32  |       await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point] });
  33  |       await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ ...point, y: point.y + 90 }] });
  34  |       await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  35  |       await session.detach();
  36  |     } else {
  37  |       await page.locator('#cord').focus();
  38  |       await page.keyboard.press('Enter');
  39  |     }
  40  |     await expect(page.locator('#end')).toBeVisible({ timeout: 15000 });
  41  |     for (const [name, message] of [
  42  |       ['Rosa curiosa', 'Essa aqui disse que gosta bastante do seu cabelo. Acho que ela tem bom gosto.'],
  43  |       ['Tulipa companheira', 'Essa prefere os momentos simples. Aqueles em que a companhia já é suficiente.'],
  44  |       ['Lírio tímido', 'Calma, ela só ficou com vergonha. Acontece quando encontra alguém bonito.'],
  45  |     ]) {
  46  |       const flower = page.getByRole('button', { name: `${name} — tocar`, exact: true });
  47  |       if (width === 390) await flower.tap();
  48  |       else { await flower.focus(); await page.keyboard.press('Enter'); }
  49  |       await expect(page.locator('#caption')).toContainText(message);
  50  |     }
  51  |     for (const name of ['Flor que muda de cor', 'Flor dos vagalumes', 'Flores companheiras']) {
  52  |       await page.getByRole('button', { name: `${name} — tocar`, exact: true }).focus();
  53  |       await page.keyboard.press('Enter');
  54  |     }
  55  |     await expect(page.locator('#end')).toBeInViewport();
  56  |     if (width === 320) await page.screenshot({ path: 'test-results/garden-interactions-320.png' });
  57  |     await page.locator('#end').click();
  58  |     await file('convencido.txt');
  59  |     await page.locator('#file-close').evaluate(button => { (button as HTMLElement).click(); (button as HTMLElement).click(); });
  60  |     await file('pra ela.txt');
  61  |     await page.locator('#file-close').click();
  62  |     await expect(page.locator('#back-garden')).toBeVisible({ timeout: 25000 });
  63  |     await expect(page.locator('.blue-lily')).toHaveCount(7);
  64  |     await expect(page.locator('#epilogue-lines p')).toHaveCount(3);
  65  |     await expect(page.locator('#back-universe')).toBeInViewport();
  66  |     await page.screenshot({ path: `test-results/garden-final-${width}.png` });
  67  |     if (width === 430) {
  68  |       await page.setViewportSize({ width: 844, height: 390 });
  69  |       await expect(page.locator('#back-garden')).toBeInViewport();
  70  |       await expect(page.locator('#back-universe')).toBeInViewport();
  71  |       expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  72  |       await page.screenshot({ path: 'test-results/garden-final-landscape.png' });
  73  |     }
  74  |     await page.locator('#back-garden').click();
  75  |     await expect(page.locator('#end')).toBeVisible();
  76  |     await expect(page.locator('#end')).toBeFocused();
  77  |     await expect(page.locator('#epilogue')).toBeHidden();
  78  |     expect(errors).toEqual([]);
  79  |   });
  80  | }
  81  | 
  82  | for (const width of [320, 1440]) test(`normal-motion terminal and final iframe exit restore the universe at ${width}px`, async ({ page }) => {
  83  |   test.setTimeout(120000);
  84  |   await page.setViewportSize({ width, height: width === 320 ? 568 : 900 });
  85  |   await page.emulateMedia({ reducedMotion: 'reduce' });
  86  |   await page.goto('/');
  87  |   const pin = [experience.birthdays.firstDay, experience.birthdays.secondDay].map(day => String(day).padStart(2, '0')).join('');
  88  |   for (const digit of pin) await page.getByRole('button', { name: digit, exact: true }).click();
  89  |   const scanner = page.getByRole('button', { name: /Leitor visual fictício/ });
  90  |   await expect(scanner).toBeVisible({ timeout: 15000 });
  91  |   await scanner.focus(); await page.keyboard.down('Enter');
  92  |   await expect(page.locator('[data-act="recognized"]')).toBeVisible({ timeout: 6000 });
  93  |   await page.keyboard.up('Enter');
  94  |   const root = page.locator('[data-act="universe"]');
  95  |   await expect(root).toBeVisible({ timeout: 20000 });
  96  |   const portal = page.getByRole('button', { name: 'Aproximar-se do portal do Jardim Eterno' });
  97  |   await portal.focus(); await page.keyboard.press('Enter');
  98  |   await page.getByRole('button', { name: 'Sim, quero entrar' }).click();
  99  |   await expect(root).toHaveAttribute('data-navigation', 'GARDEN_ACTIVE');
  100 |   const canvas = page.locator('canvas[data-renderer="webgl"]');
  101 |   const saved = await canvas.getAttribute('data-saved-camera-pose');
  102 |   await page.emulateMedia({ reducedMotion: 'no-preference' });
  103 |   const garden = page.frameLocator('iframe[title="Jardim Eterno"]');
  104 |   const advance = garden.locator('#terminal-advance');
  105 |   async function skipTo(selector: string) {
  106 |     for (let i = 0; i < 160; i++) {
  107 |       if (await garden.locator(selector).isVisible()) return;
  108 |       if (await advance.isVisible()) await advance.click();
  109 |       await page.waitForTimeout(70);
  110 |     }
  111 |     await expect(garden.locator(selector)).toBeVisible();
  112 |   }
  113 |   await skipTo('#file');
> 114 |   await expect(garden.locator('#file-title')).toHaveText('canada.txt');
      |                                               ^ Error: expect(locator).toHaveText(expected) failed
  115 |   await garden.locator('#file-close').click(); await skipTo('#cord');
  116 |   await garden.locator('#cord').focus();
  117 |   await expect(garden.locator('#cord')).not.toHaveClass(/entering/, { timeout: 5000 });
  118 |   await page.keyboard.press('Enter');
  119 |   await expect(garden.locator('#end')).toBeVisible({ timeout: 15000 });
  120 |   await garden.locator('#end').click(); await skipTo('#file');
  121 |   await expect(garden.locator('#file-title')).toHaveText('convencido.txt');
  122 |   await garden.locator('#file-close').click();
  123 |   await expect(garden.locator('#file')).toBeHidden(); await skipTo('#file');
  124 |   await expect(garden.locator('#file-title')).toHaveText('pra ela.txt');
  125 |   await garden.locator('#file-close').click(); await skipTo('#epilogue');
  126 |   await expect(garden.locator('#back-universe')).toBeVisible({ timeout: 20000 });
  127 |   const externalExit = page.getByRole('button', { name: 'Voltar ao universo', exact: true });
  128 |   const firstLine = garden.locator('#epilogue-lines p').first();
  129 |   const externalBox = (await externalExit.boundingBox())!;
  130 |   const textBox = (await firstLine.boundingBox())!;
  131 |   expect(textBox.y).toBeGreaterThan(externalBox.y + externalBox.height);
  132 |   await page.screenshot({ path: `test-results/garden-final-iframe-${width}.png` });
  133 |   await garden.locator('#back-universe').click();
  134 |   await expect(root).toHaveAttribute('data-navigation', 'RETURN_TO_GALAXY');
  135 |   await page.getByRole('button', { name: 'Pular animação' }).click();
  136 |   await expect(root).toHaveAttribute('data-navigation', 'GALAXY_IDLE');
  137 |   expect(await canvas.getAttribute('data-camera-pose')).toBe(saved);
  138 |   await expect(portal).toBeFocused();
  139 | });
  140 | 
  141 | 
```