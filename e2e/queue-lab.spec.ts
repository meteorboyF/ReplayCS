import { expect, test } from '@playwright/test';

test.describe('Queue Lab', () => {
  test('mounts and displays default operation and abstract view', async ({ page }) => {
    await page.goto('/lesson/dsa-1/queue');
    await expect(page.getByRole('heading', { name: 'Queue Lab' })).toBeVisible();

    // Verify operations dropdown is visible
    const operationSelector = page.getByLabel('Operation', { exact: true });
    await expect(operationSelector).toBeVisible();

    // The backing implementation selector should default to circular-array or naive-array
    const backingSelector = page.getByLabel('Implementation backing', { exact: true });
    await expect(backingSelector).toBeVisible();

    // Abstract Queue Visualizer should be visible
    await expect(page.locator('.queue-container')).toBeVisible();
    await expect(page.getByText('front →')).toBeVisible();

    // Verify memory backing is also visible
    await expect(page.locator('.backing-view')).toBeVisible();
  });

  test('builds a trace and executes operations', async ({ page }) => {
    await page.goto('/lesson/dsa-1/queue');

    // Choose enqueue operation
    await page.getByLabel('Operation', { exact: true }).selectOption('enqueue');
    // Set custom values and new value
    await page.getByLabel('Current queue').fill('10, 20, 30');
    await page.getByLabel('New value').fill('40');

    await page.getByRole('button', { name: 'Build deterministic trace' }).click();

    // Click next to advance trace
    const nextBtn = page.getByRole('button', { name: /Next/ });
    await expect(nextBtn).toBeEnabled();
    await nextBtn.click();
  });
});
