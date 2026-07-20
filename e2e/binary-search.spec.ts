import { test, expect } from '@playwright/test';
test('keeps the trace step while switching language', async ({ page }) => {
  await page.goto('/lesson/dsa-1/binary-search');
  await expect(page.getByRole('heading', { name: 'Binary Search' })).toBeVisible();
  await page.getByRole('button', { name: /Next/ }).click();
  await page.getByRole('button', { name: /Next/ }).click();
  await expect(page.getByText('Step 3')).toBeVisible();
  await expect(page.getByText('The midpoint is 3.')).not.toBeVisible();
  await expect(page.getByText(/Lock your prediction to unlock/)).toBeVisible();
  await page.getByLabel('Your prediction').fill('3');
  await page.getByRole('button', { name: 'Lock prediction' }).click();
  await expect(page.getByText('The midpoint is 3.')).toBeVisible();
  await page.getByRole('tab', { name: 'PYTHON' }).click();
  await expect(page.getByText('mid = left + (right - left) // 2')).toBeVisible();
  await expect(page.getByText('Step 3')).toBeVisible();
});

test('validates custom input and preserves it in the trace URL', async ({ page }) => {
  await page.goto('/lesson/dsa-1/binary-search');
  await page.getByLabel('Sorted values').fill('9, 3, 7');
  await page.getByLabel('Target').fill('7');
  await page.getByRole('button', { name: 'Build trace' }).click();
  await expect(page.getByRole('alert')).toContainText('ascending sorted input');

  await page.getByLabel('Sorted values').fill('1, 3, 7, 9');
  await page.getByRole('button', { name: 'Build trace' }).click();
  await expect(page).toHaveURL(/values=1%2C3%2C7%2C9/);
  await page.getByRole('button', { name: 'Next' }).click();
  await expect(page.getByText('Step 2')).toBeVisible();
});

test('clamps hostile shared state and leaves focused controls in charge of Space', async ({
  page
}) => {
  await page.goto('/lesson/dsa-1/binary-search?step=-1');
  await expect(page.getByText('Step 1')).toBeVisible();

  await page.goto('/lesson/dsa-1/binary-search?values=1%2Cnope%2C3&target=3&lang=python&step=999');
  await expect(page.getByRole('alert')).toContainText('comma-separated whole numbers');
  await expect(page.getByRole('heading', { name: 'Binary Search' })).toBeVisible();

  await page.goto('/lesson/dsa-1/binary-search');
  const next = page.getByRole('button', { name: 'Next' });
  await next.focus();
  await page.keyboard.press('Space');
  await expect(page.getByText('Step 2')).toBeVisible();
  await page.waitForTimeout(1200);
  await expect(page.getByText('Step 2')).toBeVisible();
});
