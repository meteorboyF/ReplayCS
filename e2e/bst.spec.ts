import { test, expect } from '@playwright/test';

test.describe('BST Lab', () => {
  test('mounts with all eight operations, presets, and the case matrix', async ({ page }) => {
    await page.goto('/lesson/dsa-1/bst');
    await expect(page.getByRole('heading', { name: 'BST Lab', exact: true })).toBeVisible();

    const operations = page.getByLabel('Operation', { exact: true }).locator('option');
    expect(await operations.evaluateAll((options) => options.map((o) => o.value))).toEqual([
      'search',
      'insert',
      'delete',
      'inorder',
      'preorder',
      'postorder',
      'levelorder',
      'height'
    ]);

    await expect(page.getByRole('heading', { name: 'Balance decides the bound' })).toBeVisible();
    const rows = page.getByRole('table').locator('tbody tr');
    await expect(rows).toHaveCount(5);
    await expect(page.getByLabel('Binary search tree state')).toBeVisible();
  });

  test('swings search between O(log n) balanced and O(n) skewed via insertion order', async ({
    page
  }) => {
    await page.goto('/lesson/dsa-1/bst');
    await page.getByLabel('Operation', { exact: true }).selectOption('search');
    const operationContext = page.locator('.operation-context');

    await page.getByRole('button', { name: /Balanced insertion order/ }).click();
    await expect(operationContext).toContainText('O(log n) time');

    await page.getByRole('button', { name: /Sorted insertion order/ }).click();
    await expect(operationContext).toContainText('O(n) time');
    await expect(operationContext).toContainText('worst case');
  });

  test('contrasts DFS O(h) stack space with BFS O(w) queue space', async ({ page }) => {
    await page.goto('/lesson/dsa-1/bst');
    const operationContext = page.locator('.operation-context');

    await page.getByLabel('Operation', { exact: true }).selectOption('inorder');
    await expect(operationContext).toContainText('O(h) space');

    await page.getByLabel('Operation', { exact: true }).selectOption('levelorder');
    await expect(operationContext).toContainText('O(w) space');

    await page.getByLabel('Operation', { exact: true }).selectOption('height');
    await expect(operationContext).toContainText('O(h) space');
  });

  test('gates a delete trace on the prediction checkpoint', async ({ page }) => {
    await page.goto('/lesson/dsa-1/bst');
    await page.getByLabel('Operation', { exact: true }).selectOption('delete');
    await page.getByLabel('Key', { exact: true }).fill('30');
    await page.getByRole('button', { name: 'Build deterministic trace' }).click();

    const timeline = page.getByLabel('Trace timeline');
    const maximum = await timeline.getAttribute('max');
    if (maximum === null) throw new Error('BST trace timeline has no maximum.');

    await expect(page.getByRole('button', { name: 'Lock prediction' })).toBeVisible();
    await timeline.fill(maximum);
    await expect(timeline).toHaveValue('0');
  });
});
