import { expect, test } from '@playwright/test';

test.describe('Sorting Arena', () => {
  test('validates input and preserves it while switching algorithms', async ({ page }) => {
    await page.goto('/lesson/dsa-1/sorting-arena');

    await expect(page.getByRole('heading', { name: 'Sorting Arena' })).toBeVisible();
    const values = page.getByLabel('Values');
    await values.fill('4');
    await page.getByRole('button', { name: 'Build trace' }).click();
    await expect(page.getByRole('alert')).toContainText('between 2 and 10');

    await values.fill('4, -1, 4, 2');
    await page.getByRole('button', { name: 'Build trace' }).click();
    await page.getByRole('tab', { name: 'Selection' }).click();

    await expect(values).toHaveValue('4, -1, 4, 2');
    await expect(page.getByRole('heading', { name: 'Selection Sort' })).toBeVisible();
    await expect(page.getByText('Unstable', { exact: true })).toBeVisible();
  });

  test('advances and restores an exact deterministic state', async ({ page }) => {
    await page.goto('/lesson/dsa-1/sorting-arena');

    await expect(page.getByText('Step 1 of')).toBeVisible();
    await page.getByRole('button', { name: 'Next' }).click();
    await expect(page.getByText(/Lock the opening prediction/)).toBeVisible();
    await page.getByLabel('Your prediction').fill('7');
    await page.getByRole('button', { name: 'Lock prediction' }).click();
    await page.getByRole('button', { name: 'Next' }).click();
    await expect(page.getByText('Step 2 of')).toBeVisible();
    await page.getByRole('button', { name: 'Previous' }).click();
    await expect(page.getByText('Step 1 of')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Ready to bubble' })).toBeVisible();
  });
});
