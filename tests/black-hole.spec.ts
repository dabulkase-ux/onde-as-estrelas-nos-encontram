import { expect, test } from '@playwright/test';
import { experience } from '../src/config/experience';
import { blackHoleFragments } from '../src/experiences/blackHole/data';

async function enterUniverse(page: import('@playwright/test').Page) {
  const pin = [experience.birthdays.firstDay, experience.birthdays.secondDay]
    .map(day => String(day).padStart(2, '0'))
    .join('');
  for (const digit of pin) await page.getByRole('button', { name: digit, exact: true }).click();
  const scanner = page.getByRole('button', { name: /Leitor visual fictício/ });
  await expect(scanner).toBeVisible({ timeout: 15_000 });
  await scanner.focus();
  await page.keyboard.down('Enter');
  await expect(page.locator('[data-act="recognized"]')).toBeVisible({ timeout: 6_000 });
  await page.keyboard.up('Enter');
  await expect(page.locator('[data-act="universe"]')).toBeVisible({ timeout: 25_000 });
}

test('discovers, assembles, rereads and returns from the black-hole experience', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.evaluate(() => localStorage.removeItem('meu-universo.black-hole-secrets.v1'));
  await page.reload();
  await enterUniverse(page);

  const blackHoleAccess = page.getByRole('button', { name: 'Aproximar-se do Buraco Negro dos Segredos' });
  const declineWish = page.getByRole('button', { name: 'Agora não' });
  if (await declineWish.isVisible()) await declineWish.click();
  for (let attempt = 0; attempt < 8 && !(await blackHoleAccess.isVisible()); attempt++) {
    await page.mouse.move(175, 320);
    await page.mouse.down();
    await page.mouse.move(340, 320, { steps: 10 });
    await page.mouse.up();
    await page.waitForTimeout(500);
  }
  await expect(blackHoleAccess).toBeVisible({ timeout: 5_000 });
  await blackHoleAccess.click();
  await expect(page.locator('[data-navigation="BLACK_HOLE_ACTIVE"]')).toBeVisible();
  await expect(page.getByRole('region', { name: 'Buraco Negro dos Segredos' })).toBeVisible();
  const canvas = page.locator('canvas[data-renderer="webgl"]');
  const savedCameraPose = await canvas.getAttribute('data-saved-camera-pose');
  expect(savedCameraPose).not.toBeNull();

  for (const width of [320, 390, 430]) {
    await page.setViewportSize({ width, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect(page.getByRole('button', {
      name: `Descobrir fragmento: ${blackHoleFragments[0].title}`,
    })).toBeVisible({ timeout: 10_000 });
  }

  await page.setViewportSize({ width: 390, height: 844 });
  for (const [index, fragment] of blackHoleFragments.entries()) {
    const target = page.getByRole('button', {
      name: `Descobrir fragmento: ${fragment.title}`,
    });
    await expect(target).toBeVisible({ timeout: 10_000 });
    if (index === 0) {
      const box = (await target.boundingBox())!;
      const canvas = page.locator('canvas[data-renderer="webgl"]');
      await target.evaluate(node => { node.style.pointerEvents = 'none'; });
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
      await expect(page.getByRole('heading', { name: fragment.title, exact: true })).toBeFocused();
      await expect(page.getByText(fragment.text, { exact: true })).toBeVisible();
      await expect(canvas).toBeVisible();
    } else {
      await target.click();
    }
    await expect(page.getByRole('heading', { name: fragment.title, exact: true })).toBeFocused();
    await expect(page.getByText(fragment.text, { exact: true })).toBeVisible();
    const closeFragment = page.getByRole('button', { name: 'Voltar aos fragmentos' });
    await page.keyboard.press('Tab');
    await expect(closeFragment).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(closeFragment).toBeFocused();
    await page.keyboard.press('Escape');
  }

  const readLetter = page.getByRole('button', { name: 'Ler o que eu escondo até das estrelas' });
  await expect(readLetter).toBeVisible({ timeout: 10_000 });
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('meu-universo.black-hole-secrets.v1') ?? '{}')))
    .toMatchObject({ discovered: blackHoleFragments.map(fragment => fragment.id), starFormed: true });
  await readLetter.click();
  const letter = page.getByRole('dialog', { name: 'O que eu escondo até das estrelas' });
  await expect(letter).toBeVisible();
  const letterHeading = letter.getByRole('heading', { name: 'O que eu escondo até das estrelas' });
  await expect(letterHeading).toBeVisible();
  await expect(letterHeading).toBeFocused();
  await expect(letter.locator('article > p:not(.black-hole-letter-eyebrow)')).toHaveCount(48);
  const closeLetter = letter.getByRole('button', { name: 'Fechar' });
  await page.keyboard.press('Tab');
  await expect(closeLetter).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(closeLetter).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(readLetter).toBeFocused();

  await page.getByRole('button', { name: 'Voltar à galáxia' }).click();
  await expect(page.locator('[data-navigation="GALAXY_IDLE"]')).toBeVisible();
  await expect(canvas).toHaveAttribute('data-camera-pose', savedCameraPose!);
  await expect(page.getByRole('button', { name: 'Aproximar-se do Buraco Negro dos Segredos' })).toBeFocused();
  await page.getByRole('button', { name: 'Aproximar-se do Buraco Negro dos Segredos' }).click();
  await expect(page.locator('[data-navigation="BLACK_HOLE_ACTIVE"]')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Ler o que eu escondo até das estrelas' })).toBeVisible();
});
