import { expect, test } from '@playwright/test';

test.describe('Stack Lab', () => {
  test('mounts and displays default operation and abstract view', async ({ page }) => {
    await page.goto('/lesson/dsa-1/stack');
    await expect(page.getByRole('heading', { name: 'Stack Lab' })).toBeVisible();

    // Verify operations dropdown is visible
    const operationSelector = page.getByLabel('Operation', { exact: true });
    await expect(operationSelector).toBeVisible();

    // The backing implementation selector should default to array
    const backingSelector = page.getByLabel('Implementation backing', { exact: true });
    await expect(backingSelector).toHaveValue('array');

    // Abstract Stack Visualizer should be visible
    await expect(page.locator('.stack-container')).toBeVisible();
    await expect(page.getByText('top →')).toBeVisible();

    // Verify memory backing is also visible
    await expect(page.locator('.backing-view')).toBeVisible();
    // Default is array, so we should see array-container
    await expect(page.locator('.backing-view .buffer')).toBeVisible();
  });

  test('builds a trace and executes operations', async ({ page }) => {
    await page.goto('/lesson/dsa-1/stack');

    // Choose push operation
    await page.getByLabel('Operation', { exact: true }).selectOption('push');
    // Set custom values and new value
    await page.getByLabel('Current stack').fill('10, 20, 30');
    await page.getByLabel('New value').fill('40');

    await page.getByRole('button', { name: 'Build deterministic trace' }).click();

    // Click next to advance trace
    const nextBtn = page.getByRole('button', { name: /Next/ });
    await expect(nextBtn).toBeEnabled();
    await nextBtn.click();
  });
});
