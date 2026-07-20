import { expect, test } from '@playwright/test';

test('replays an incorrect prediction and awards recovery XP', async ({ page }) => {
  await page.goto('/lesson/dsa-1/binary-search?step=2');
  await page.getByLabel('Your prediction').fill('4');
  await page.getByRole('button', { name: 'Lock prediction' }).click();

  await expect(page.getByRole('heading', { name: 'Find the first divergence' })).toBeVisible();
  await expect(page.getByText('mid = 4')).toBeVisible();
  await expect(page.getByText('mid = 3')).toBeVisible();

  await page.getByRole('button', { name: 'Replay correct transition' }).click();
  await expect(page.getByText('after: mid = 3')).toBeVisible();

  await page.getByLabel(/Recovery challenge/).fill('3');
  await page.getByRole('button', { name: 'Check recovery' }).click();
  await expect(page.getByText(/Recovered · \+6 XP/)).toBeVisible();
  await expect(page.getByText('⚡ 6 XP')).toBeVisible();
});
