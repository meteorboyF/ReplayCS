import { expect, test } from '@playwright/test';

test.describe('Sorting Arena', () => {
  test('validates input and preserves it while switching algorithms', async ({ page }) => {
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    await page.goto('/lesson/dsa-1/sorting-arena');

    await expect(page.getByLabel('Values')).toBeVisible();
    const values = page.getByLabel('Values');
    await expect(values).toHaveValue('5, 3, 8, 4, 2');
    await values.fill('4');
    await page.getByRole('button', { name: 'Build trace' }).click();
    await expect(page.locator('.error')).toContainText('between 2 and');

    await values.fill('4, -1, 4, 2');
    await page.getByRole('button', { name: 'Build trace' }).click();
    await page.getByRole('tab', { name: 'Selection' }).click();

    await expect(values).toHaveValue('4, -1, 4, 2');
    await expect(page.getByRole('heading', { name: 'Selection Sort', exact: true })).toBeVisible();
    await expect(page.getByText('Unstable', { exact: true })).toBeVisible();
  });

  test('advances and restores an exact deterministic state', async ({ page }) => {
    page.on('console', msg => console.log('PAGE LOG 3:', msg.text()));
    await page.goto('/lesson/dsa-1/sorting-arena');
    await expect(page.getByLabel('Values')).toHaveValue('5, 3, 8, 4, 2');

    await expect(page.getByText('Step 1 of')).toBeVisible();
    await page.getByRole('button', { name: 'Next' }).click();
    await expect(page.getByText('Step 2 of')).toBeVisible();
    await page.getByRole('button', { name: 'Previous' }).click();
    await expect(page.getByText('Step 1 of')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Start Bubble Sort' })).toBeVisible();
  });
});
