import { expect, test } from '@playwright/test';

test.describe('Deque Lab', () => {
  test('mounts and displays default operation and abstract view', async ({ page }) => {
    await page.goto('/lesson/dsa-1/deque');
    await expect(page.getByRole('heading', { name: 'Deque Lab' })).toBeVisible();

    // Verify operations dropdown is visible
    const operationSelector = page.getByLabel('Operation', { exact: true });
    await expect(operationSelector).toBeVisible();

    // The backing implementation selector should default to circular-array or naive-array
    const backingSelector = page.getByLabel('Implementation backing', { exact: true });
    await expect(backingSelector).toBeVisible();

    // Abstract Deque Visualizer should be visible
    await expect(page.locator('.deque-container')).toBeVisible();
    await expect(page.getByText('front →')).toBeVisible();

    // Verify memory backing is also visible
    await expect(page.locator('.backing-view')).toBeVisible();
  });

  test('builds a trace and executes operations', async ({ page }) => {
    await page.goto('/lesson/dsa-1/deque');

    // Choose push-front operation
    await page.getByLabel('Operation', { exact: true }).selectOption('push-front');
    // Set custom values and new value
    await page.getByLabel('Current deque').fill('10, 20, 30');
    await page.getByLabel('New value').fill('40');

    await page.getByRole('button', { name: 'Build deterministic trace' }).click();

    // Click next to advance trace
    const nextBtn = page.getByRole('button', { name: /Next/ });
    await expect(nextBtn).toBeEnabled();
    await nextBtn.click();
  });
});
