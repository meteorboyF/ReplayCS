import { expect, test } from '@playwright/test';

test('personalizes the recommended lesson without an account', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.preview .state')).toContainText('mid ?');
  await expect(page.locator('.preview .array .active')).toHaveCount(0);
  await page.getByRole('link', { name: /Start tracing/ }).click();

  await page.getByLabel('Current level').selectOption('intermediate');
  await page.getByLabel('Primary goal').selectOption('exam');
  await page.getByLabel('Programming language').selectOption('python');
  await page.getByLabel('Explanation language').selectOption('bn');
  await page.getByLabel('Daily learning goal').fill('25');
  await page.getByRole('button', { name: 'Build my learning path' }).click();

  await expect(page).toHaveURL(/lesson\/dsa-1\/binary-search/);
  await expect(page.getByRole('heading', { name: 'Binary Search' })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'PYTHON' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('combobox', { name: 'Explanation language' })).toHaveValue('bn');
});

test('welcomes a returning learner with their personalized next lesson', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: /Start tracing/ }).click();

  await page.getByRole('button', { name: /DSA I$/ }).click();
  await page.getByRole('button', { name: 'Networks' }).click();
  await page.getByRole('button', { name: 'Build my learning path' }).click();

  await expect(page).toHaveURL(/lesson\/computer-networks\/packet-journey/);

  await page.goto('/');
  const continueLink = page.getByRole('link', { name: /Continue · Packet Journey/ });
  await expect(continueLink).toBeVisible();
  await expect(continueLink).toHaveAttribute('href', '/lesson/computer-networks/packet-journey');
  await expect(page.getByRole('link', { name: /Judge demo/ })).toBeVisible();
});
