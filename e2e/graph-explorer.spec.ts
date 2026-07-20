import { expect, test } from '@playwright/test';

test.describe('Graph Explorer', () => {
  test('validates custom edges and rebuilds a DFS trace', async ({ page }) => {
    await page.goto('/lesson/dsa-2/graph-explorer');

    await expect(page.getByRole('heading', { name: 'Graph Explorer' })).toBeVisible();
    await page.getByLabel('Custom edges').check();
    await page.getByLabel(/Edges/).fill('A-A');
    await page.getByRole('button', { name: 'Build trace' }).click();
    await expect(page.getByRole('alert')).toContainText('Self-loop');

    await page.getByLabel(/Edges/).fill('A-B, A-C, B-D');
    await page.getByLabel('DFS · iterative').check();
    await page.getByRole('button', { name: 'Build trace' }).click();

    await expect(page.getByRole('heading', { name: 'Iterative depth-first search' })).toBeVisible();
    await expect(page.getByRole('list', { name: 'Stack, bottom first' })).toBeVisible();
  });

  test('moves forward and backward without losing graph state', async ({ page }) => {
    await page.goto('/lesson/dsa-2/graph-explorer');

    await expect(page.getByText('Step 1 /')).toBeVisible();
    await page.getByRole('button', { name: 'Next' }).click();
    await expect(page.getByText('Step 2 /')).toBeVisible();
    await page.getByRole('button', { name: 'Previous' }).click();
    await expect(page.getByText('Step 1 /')).toBeVisible();
    await expect(page.getByText('A', { exact: true }).first()).toBeVisible();
  });
});
