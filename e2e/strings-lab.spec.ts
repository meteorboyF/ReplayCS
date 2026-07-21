import { expect, test } from '@playwright/test';

test('traces strings freely and preserves the semantic step across languages', async ({ page }) => {
  await page.goto('/lesson/dsa-1/strings');
  await expect(page.getByRole('heading', { name: 'Strings Lab' })).toBeVisible();
  await page.getByRole('button', { name: 'Next' }).click();
  await expect(page.getByText(/Step 2 of/)).toBeVisible();
  await page.getByRole('tab', { name: 'Python' }).click();
  await expect(page.getByText(/Step 2 of/)).toBeVisible();
  await expect(page.getByLabel('String memory visualization')).toBeVisible();
  await expect(page.getByLabel('Trace timeline')).toBeVisible();
});

test('compares immutable and builder construction and stays contained on mobile', async ({
  page
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/lesson/dsa-1/strings');
  await page.getByRole('button', { name: 'Immutable O(n²)' }).click();
  await expect(
    page.locator('.op-context .badges b').filter({ hasText: 'O(n^2) time' })
  ).toBeVisible();
  await page.getByRole('button', { name: 'Builder O(n)' }).click();
  await expect(
    page.locator('.op-context .badges b').filter({ hasText: 'O(n) time' })
  ).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
    true
  );
  await expect(page.getByText(/Lock prediction|AI mentor/i)).toHaveCount(0);
});

test('validates bounded custom string input', async ({ page }) => {
  await page.goto('/lesson/dsa-1/strings');
  await page.getByLabel('Source string').fill('');
  await page.getByRole('button', { name: 'Build trace' }).click();
  await expect(page.getByRole('alert')).toContainText('1–12');
});
