import { test, expect } from '@playwright/test';
test('keeps the trace step while switching language', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: /Start tracing/ }).click();
  await expect(page.getByRole('heading', { name: 'Binary Search' })).toBeVisible();
  await page.getByRole('button', { name: /Next/ }).click();
  await page.getByRole('button', { name: /Next/ }).click();
  await expect(page.getByText('Step 3')).toBeVisible();
  await page.getByRole('tab', { name: 'PYTHON' }).click();
  await expect(page.getByText('mid = left + (right - left) // 2')).toBeVisible();
  await expect(page.getByText('Step 3')).toBeVisible();
});
