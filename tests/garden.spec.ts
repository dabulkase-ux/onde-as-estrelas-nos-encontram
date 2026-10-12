import { expect, test } from '@playwright/test';
import { experience } from '../src/config/experience';

async function enterGalaxy(page: import('@playwright/test').Page, width: number) {
  await page.setViewportSize({ width, height: 740 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const pin = [experience.birthdays.firstDay, experience.birthdays.secondDay]
    .map(day => String(day).padStart(2, '0'))
    .join('');
  for (const digit of pin) await page.getByRole('button', { name: digit, exact: true }).click();
  const scanner = page.getByRole('button', { name: /Leitor visual fictício/ });
  await expect(scanner).toBeVisible({ timeout: 15000 });
  await scanner.focus();
  await page.keyboard.down('Enter');
  await expect(page.locator('[data-act="recognized"]')).toBeVisible({ timeout: 6000 });
  await page.keyboard.up('Enter');
  await expect(page.locator('[data-act="universe"]')).toBeVisible({ timeout: 20000 });
}

for (const width of [320, 390, 430]) {
  test(`garden portal invitation, cancellation, re-entry and layout at ${width}px`, async ({ page }) => {
    await enterGalaxy(page, width);
    const root = page.locator('[data-act="universe"]');
    const canvas = page.locator('canvas[data-renderer="webgl"]');
    const portal = page.getByRole('button', { name: 'Aproximar-se do portal do Jardim Eterno' });
    if (width === 390) {
      await expect(portal).toHaveAttribute('data-onscreen', 'true', { timeout: 5000 });
      const point = (await portal.boundingBox())!;
      await portal.evaluate(button => { button.parentElement!.style.display = 'none'; });
      await page.mouse.click(point.x + point.width / 2, point.y + point.height / 2);
      await page.locator('.garden-access-target').evaluate(button => { button.parentElement!.style.display = ''; });
    } else {
      await portal.focus();
      await page.keyboard.press('Enter');
    }
    await expect(page.getByRole('dialog', { name: 'Existe um lugar que eu guardei especialmente pra você. Quer entrar?' })).toBeVisible();
    const savedPose = await canvas.getAttribute('data-saved-camera-pose');
    expect(savedPose).not.toBeNull();

    await page.getByRole('button', { name: 'Agora não' }).click();
    await expect(root).toHaveAttribute('data-navigation', 'GALAXY_IDLE');
    expect(await canvas.getAttribute('data-camera-pose')).toBe(savedPose);
    await expect(canvas).toHaveCSS('pointer-events', 'auto');

    await portal.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByRole('button', { name: 'Sim, quero entrar' }).click();
    await expect(root).toHaveAttribute('data-navigation', 'GARDEN_ACTIVE');
    const gardenFrame = page.frameLocator('iframe[title="Jardim Eterno"]');
    await expect(gardenFrame.locator('#garden')).toBeVisible();
    await expect(gardenFrame.locator('#terminal-advance')).toBeFocused();

    await page.getByRole('button', { name: 'Voltar ao universo' }).click();
    await expect(root).toHaveAttribute('data-navigation', 'GALAXY_IDLE');
    await expect(page.locator('iframe[title="Jardim Eterno"]')).toHaveCount(0);
    expect(await canvas.getAttribute('data-camera-pose')).toBe(savedPose);
    await expect(portal).toBeFocused();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

    await portal.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByRole('button', { name: 'Sim, quero entrar' }).click();
    await expect(root).toHaveAttribute('data-navigation', 'GARDEN_ACTIVE');
    await expect(page.locator('iframe[title="Jardim Eterno"]')).toBeVisible();
  });
}

test('portal flight animates and can be skipped with reduced-motion disabled', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const pin = [experience.birthdays.firstDay, experience.birthdays.secondDay]
    .map(day => String(day).padStart(2, '0'))
    .join('');
  for (const digit of pin) await page.getByRole('button', { name: digit, exact: true }).click();
  const scanner = page.getByRole('button', { name: /Leitor visual fictício/ });
  await expect(scanner).toBeVisible({ timeout: 15000 });
  await scanner.focus();
  await page.keyboard.down('Enter');
  await expect(page.locator('[data-act="recognized"]')).toBeVisible({ timeout: 6000 });
  await page.keyboard.up('Enter');
  const root = page.locator('[data-act="universe"]');
  await expect(root).toBeVisible({ timeout: 20000 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  const portal = page.getByRole('button', { name: 'Aproximar-se do portal do Jardim Eterno' });
  await portal.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'Pular animação' })).toBeVisible();
  await page.getByRole('button', { name: 'Pular animação' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Sim, quero entrar' }).click();
  await expect(root).toHaveAttribute('data-navigation', 'PORTAL_ENTRY');
  await expect(page.getByRole('button', { name: 'Pular animação' })).toBeVisible();
  await page.getByRole('button', { name: 'Pular animação' }).click();
  await expect(root).toHaveAttribute('data-navigation', 'GARDEN_ACTIVE');
  await expect(page.locator('iframe[title="Jardim Eterno"]')).toBeVisible();
});
