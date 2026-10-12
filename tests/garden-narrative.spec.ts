import { expect, test, type Page, type FrameLocator } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { experience } from '../src/config/experience';

test.use({ hasTouch: true });

for (const reduced of [false, true]) test(`NEXUS interruption recovers and files wait for explicit opening, reduced=${reduced}`, async ({ page }) => {
  await page.setViewportSize({ width: reduced ? 430 : 390, height: 740 });
  await page.emulateMedia({ reducedMotion: reduced ? 'reduce' : 'no-preference' });
  await page.goto('/jardim-eterno/index.html');
  const terminal = page.locator('#terminal');
  await expect(page.locator('body')).toHaveAttribute('data-scene', 'BOOT');
  const advance = page.locator('#terminal-advance');
  await expect(advance).toBeHidden();
  await expect(terminal).toHaveAttribute('data-phase', 'error', { timeout: 20000 });
  await expect(terminal).toHaveClass(/nexus-fault/);
  if (reduced) expect(await terminal.evaluate(node => getComputedStyle(node).animationName)).toBe('none');
  await expect(terminal).not.toHaveClass(/nexus-fault|nexus-recovery/);
  const panelColor = await page.locator('#terminal-lines').evaluate(node => getComputedStyle(node).color);
  await expect.poll(() => page.locator('.terminal-error').evaluate(node => getComputedStyle(node).color)).toBe(panelColor);
  expect(panelColor).not.toBe('rgb(197, 141, 135)');
  await expect(page.locator('.speaker-nexus')).toHaveCount(1, { timeout: 10000 });
  if (reduced) await expect(terminal).toHaveAttribute('data-phase', 'reading');
  else {
    await expect(terminal).toHaveAttribute('data-phase', 'typing');
    await page.waitForTimeout(1200);
  }
  await expect(page.locator('#terminal-lines > div')).toHaveCount(5);
  await expect(advance).toBeVisible();
  await expect(terminal).toHaveAttribute('data-phase', 'reading');
  await page.waitForTimeout(800);
  await expect(page.locator('#terminal-lines > div')).toHaveCount(5);
  await driveTerminal(page, page, '#terminal-file');
  await expect(page.locator('#terminal-file')).toHaveText('[ Abrir canada.txt ]');
  await page.waitForTimeout(1200); await expect(page.locator('#file')).toBeHidden();
  await page.locator('#terminal-file').dblclick();
  await expect(page.locator('#file')).toBeVisible();
  await expect(page.locator('#file-title')).toHaveText('canada.txt');
  await expect(page.locator('#terminal')).toBeHidden();
});

async function driveTerminal(surface: Page | FrameLocator, page: Page, selector: string, name?: string) {
  const target = name ? surface.locator(selector).filter({ hasText: name }) : surface.locator(selector);
  for (let i = 0; i < 160; i++) {
    if (await target.isVisible()) return;
    const fileButton = surface.locator('#terminal-file');
    const advance = surface.locator('#terminal-advance');
    if (await fileButton.isVisible()) await fileButton.click();
    else if (await advance.isVisible() && await advance.isEnabled()) await advance.click();
    await page.waitForTimeout(500);
  }
  await expect(target).toBeVisible();
}

test('terminal speech advances by keyboard without adding another scene', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/jardim-eterno/index.html');
  await expect(page.locator('body')).toHaveAttribute('data-scene', 'BOOT');
  const advance = page.locator('#terminal-advance');
  await expect(page.locator('#terminal-lines')).toContainText('Inicializando Jardim Eterno...');
  await expect(advance).toBeHidden();
  await expect(page.locator('#terminal-lines > div')).toHaveCount(3, { timeout: 6000 });
  await expect(advance).toBeHidden();
  await expect(advance).toBeVisible({ timeout: 20000 });
  await expect(page.locator('.speaker-nexus')).toHaveCount(1);
  await expect(page.locator('#terminal')).toHaveAttribute('data-phase', 'typing');
  const firstDialogue = await page.locator('#terminal-lines > div').count();
  await advance.focus(); await page.keyboard.press('Enter');
  await expect(page.locator('#terminal')).toHaveAttribute('data-phase', 'reading');
  await expect(page.locator('#terminal-lines > div')).toHaveCount(firstDialogue);
  await page.waitForTimeout(600);
  await expect(page.locator('#terminal-lines > div')).toHaveCount(firstDialogue);
  await page.keyboard.press('Space');
  await expect(page.locator('#terminal-lines > div')).toHaveCount(firstDialogue + 1);
  await expect(page.locator('#terminal')).toHaveAttribute('data-phase', 'typing');
  await driveTerminal(page, page, '#terminal-file');
  await expect(page.locator('#file')).toBeHidden();
  await page.waitForTimeout(3000);
  await expect(page.locator('#file')).toBeHidden();
  await expect(page.locator('#terminal-file')).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/nexus-terminal-320.png' });
  await page.locator('#terminal-file').focus(); await page.keyboard.press('Enter');
  await expect(page.locator('#file-title')).toHaveText('canada.txt');
  await expect(page.locator('#file')).toBeVisible();
});

for (const width of [320, 390, 430]) {
  test(`complete garden narrative and optional interactions at ${width}px`, async ({ page }) => {
    test.setTimeout(120000);
    await page.setViewportSize({ width, height: 740 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => {
      const interruptions: string[] = [];
      Object.assign(window, { nexusInterruptions: interruptions });
      new MutationObserver(records => {
        for (const record of records) {
          const node = record.target as HTMLElement;
          if (node.id === 'terminal' && record.attributeName === 'data-phase' && node.dataset.phase === 'error') {
            const scene = document.body.dataset.scene!;
            if (interruptions.at(-1) !== scene) interruptions.push(scene);
          }
        }
      }).observe(document, { subtree: true, attributes: true, attributeFilter: ['data-phase'] });
    });
    await page.goto('/jardim-eterno/index.html');
    async function file(name: string) {
      await driveTerminal(page, page, '#terminal-file');
      await expect(page.locator('#terminal-file')).toHaveText(`[ Abrir ${name} ]`);
      await page.waitForTimeout(2600);
      await expect(page.locator('#file')).toBeHidden();
      await page.locator('#terminal-file').click();
      await expect(page.locator('#file-title')).toHaveText(name, { timeout: 20000 });
      await expect(page.locator('#file')).toBeVisible();
      expect(await page.locator('#final-message').textContent()).toBe(readFileSync(`public/jardim-eterno/${name}`, 'utf8').replace(/\r\n/g, '\n'));
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.locator('#file-scroll').focus();
      await page.keyboard.press('End');
      await expect(page.locator('#file-close')).toBeInViewport();
    }
    await file('canada.txt');
    if (width === 320) await page.screenshot({ path: 'test-results/garden-letter-320.png' });
    await page.keyboard.press('Escape');
    await driveTerminal(page, page, '#cord');
    await expect(page.locator('#cord')).toBeVisible({ timeout: 15000 });
    if (width === 390) {
      const box = (await page.locator('#cord').boundingBox())!;
      const session = await page.context().newCDPSession(page);
      const point = { x: box.x + box.width / 2, y: box.y + box.height - 25 };
      await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point] });
      await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ ...point, y: point.y + 90 }] });
      await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await session.detach();
    } else {
      await page.locator('#cord').focus();
      await page.keyboard.press('Enter');
    }
    await expect(page.locator('#end')).toBeVisible({ timeout: 15000 });
    for (const [name, message] of [
      ['Rosa curiosa', 'Essa aqui disse que gosta bastante do seu cabelo. Acho que ela tem bom gosto.'],
      ['Tulipa companheira', 'Essa prefere os momentos simples. Aqueles em que a companhia já é suficiente.'],
      ['Lírio tímido', 'Calma, ela só ficou com vergonha. Acontece quando encontra alguém bonito.'],
    ]) {
      const flower = page.getByRole('button', { name: `${name} — tocar`, exact: true });
      if (width === 390) await flower.tap();
      else { await flower.focus(); await page.keyboard.press('Enter'); }
      await expect(page.locator('#caption')).toContainText(message);
    }
    for (const name of ['Flor que muda de cor', 'Flor dos vagalumes', 'Flores companheiras']) {
      await page.getByRole('button', { name: `${name} — tocar`, exact: true }).focus();
      await page.keyboard.press('Enter');
    }
    await expect(page.locator('#end')).toBeInViewport();
    if (width === 320) await page.screenshot({ path: 'test-results/garden-interactions-320.png' });
    await page.locator('#end').click();
    await file('convencido.txt');
    await page.locator('#file-close').evaluate(button => { (button as HTMLElement).click(); (button as HTMLElement).click(); });
    await file('pra ela.txt');
    await page.locator('#file-close').click();
    await driveTerminal(page, page, '#epilogue');
    await expect(page.locator('#back-garden')).toBeVisible({ timeout: 25000 });
    expect(await page.evaluate(() => (window as unknown as { nexusInterruptions: string[] }).nexusInterruptions)).toEqual(['BOOT', 'INTERRUPTION', 'FAKE_SHUTDOWN']);
    await expect(page.locator('.blue-lily')).toHaveCount(7);
    await expect(page.locator('#epilogue-lines p')).toHaveCount(3);
    await expect(page.locator('#back-universe')).toBeInViewport();
    await page.screenshot({ path: `test-results/garden-final-${width}.png` });
    if (width === 430) {
      await page.setViewportSize({ width: 844, height: 390 });
      await expect(page.locator('#back-garden')).toBeInViewport();
      await expect(page.locator('#back-universe')).toBeInViewport();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: 'test-results/garden-final-landscape.png' });
    }
    await page.locator('#back-garden').click();
    await expect(page.locator('#end')).toBeVisible();
    await expect(page.locator('#end')).toBeFocused();
    await expect(page.locator('#epilogue')).toBeHidden();
    expect(errors).toEqual([]);
  });
}

for (const width of [320, 1440]) test(`normal-motion terminal and final iframe exit restore the universe at ${width}px`, async ({ page }) => {
  // O percurso completo inclui leitura manual de todas as conversas e CRT/lírios.
  test.setTimeout(180000);
  await page.setViewportSize({ width, height: width === 320 ? 568 : 900 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const pin = [experience.birthdays.firstDay, experience.birthdays.secondDay].map(day => String(day).padStart(2, '0')).join('');
  for (const digit of pin) await page.getByRole('button', { name: digit, exact: true }).click();
  const scanner = page.getByRole('button', { name: /Leitor visual fictício/ });
  await expect(scanner).toBeVisible({ timeout: 15000 });
  await scanner.focus(); await page.keyboard.down('Enter');
  await expect(page.locator('[data-act="recognized"]')).toBeVisible({ timeout: 6000 });
  await page.keyboard.up('Enter');
  const root = page.locator('[data-act="universe"]');
  await expect(root).toBeVisible({ timeout: 20000 });
  const portal = page.getByRole('button', { name: 'Aproximar-se do portal do Jardim Eterno' });
  await portal.focus(); await page.keyboard.press('Enter');
  await page.getByRole('button', { name: 'Sim, quero entrar' }).click();
  await expect(root).toHaveAttribute('data-navigation', 'GARDEN_ACTIVE');
  const canvas = page.locator('canvas[data-renderer="webgl"]');
  const saved = await canvas.getAttribute('data-saved-camera-pose');
  const garden = page.frameLocator('iframe[title="Jardim Eterno"]');
  await expect(garden.locator('body')).toHaveAttribute('data-scene', 'BOOT');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  async function skipTo(selector: string) {
    await driveTerminal(garden, page, selector);
  }
  await skipTo('#file');
  await expect(garden.locator('#file-title')).toHaveText('canada.txt');
  await garden.locator('#file-close').click(); await skipTo('#cord');
  await garden.locator('#cord').focus();
  await expect(garden.locator('#cord')).not.toHaveClass(/entering/, { timeout: 5000 });
  await page.keyboard.press('Enter');
  await expect(garden.locator('#end')).toBeVisible({ timeout: 15000 });
  await garden.locator('#end').click(); await skipTo('#file');
  await expect(garden.locator('#file-title')).toHaveText('convencido.txt');
  await garden.locator('#file-close').click();
  await expect(garden.locator('#file')).toBeHidden(); await skipTo('#file');
  await expect(garden.locator('#file-title')).toHaveText('pra ela.txt');
  await garden.locator('#file-close').click(); await skipTo('#epilogue');
  await expect(garden.locator('#back-universe')).toBeVisible({ timeout: 20000 });
  const externalExit = page.getByRole('button', { name: 'Voltar ao universo', exact: true });
  const firstLine = garden.locator('#epilogue-lines p').first();
  const externalBox = (await externalExit.boundingBox())!;
  const textBox = (await firstLine.boundingBox())!;
  expect(textBox.y).toBeGreaterThan(externalBox.y + externalBox.height);
  await page.screenshot({ path: `test-results/garden-final-iframe-${width}.png` });
  await garden.locator('#back-universe').click();
  await expect(root).toHaveAttribute('data-navigation', 'RETURN_TO_GALAXY');
  await page.getByRole('button', { name: 'Pular animação' }).click();
  await expect(root).toHaveAttribute('data-navigation', 'GALAXY_IDLE');
  expect(await canvas.getAttribute('data-camera-pose')).toBe(saved);
  await expect(portal).toBeFocused();
});
