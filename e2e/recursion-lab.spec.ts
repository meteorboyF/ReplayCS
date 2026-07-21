import { expect, test } from '@playwright/test';

test('traces calls and unwinding while preserving the semantic step across languages', async ({
  page
}) => {
  await page.goto('/lesson/dsa-1/recursion');
  await expect(page.getByRole('heading', { name: 'Recursion Lab' })).toBeVisible();
  await page.getByRole('button', { name: 'Next' }).click();
  await expect(page.getByText(/Step 2 of/)).toBeVisible();
  await page.getByRole('tab', { name: 'Java' }).click();
  await expect(page.getByText(/Step 2 of/)).toBeVisible();
  await expect(page.getByLabel('Recursion call stack visualization')).toBeVisible();
});

test('shows recurrence families and remains contained on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/lesson/dsa-1/recursion');
  await page.getByRole('button', { name: 'Binary tree' }).click();
  await expect(page.getByText('T(n) = 2T(n - 1) + O(1)', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Divide & conquer' }).click();
  await expect(page.getByText('T(n) = 2T(n / 2) + O(n)', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
    true
  );
  await expect(page.getByText(/Lock prediction|AI mentor/i)).toHaveCount(0);
});

test('enforces the exponential input bound', async ({ page }) => {
  await page.goto('/lesson/dsa-1/recursion');
  await page.getByRole('button', { name: 'Binary tree' }).click();
  await page.getByLabel('Input n').fill('6');
  await page.getByRole('button', { name: 'Build trace' }).click();
  await expect(page.getByRole('alert')).toContainText('1 to 5');
});
