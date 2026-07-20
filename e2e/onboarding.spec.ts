import { expect, test } from '@playwright/test';

test('personalizes the recommended lesson without an account', async ({ page }) => {
  await page.goto('/');
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
