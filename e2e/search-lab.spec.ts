import { test, expect } from '@playwright/test';

test.describe('Search Lab', () => {
  test('mounts with all five strategies, the scoreboard, and the case matrix', async ({ page }) => {
    await page.goto('/lesson/dsa-1/search-lab');
    await expect(page.getByRole('heading', { name: 'Search Lab', exact: true })).toBeVisible();

    const strategies = page.getByLabel('Strategy', { exact: true }).locator('option');
    expect(await strategies.evaluateAll((options) => options.map((o) => o.value))).toEqual([
      'linear',
      'binary-iterative',
      'binary-recursive',
      'bst',
      'hash'
    ]);

    await expect(page.getByRole('heading', { name: 'Same data, five strategies' })).toBeVisible();
    const rows = page.getByRole('table').locator('tbody tr');
    await expect(rows).toHaveCount(8);
  });

  test('separates iterative O(1) space from recursive O(log n) space', async ({ page }) => {
    await page.goto('/lesson/dsa-1/search-lab');
    const operationContext = page.locator('.operation-context');

    await page.getByLabel('Strategy', { exact: true }).selectOption('binary-iterative');
    await expect(operationContext).toContainText('O(1) space');

    await page.getByLabel('Strategy', { exact: true }).selectOption('binary-recursive');
    await expect(operationContext).toContainText('O(log n) time');
    await expect(operationContext).toContainText('O(log n) space');
  });

  test('degrades BST search to O(n) when values are inserted in sorted order', async ({ page }) => {
    await page.goto('/lesson/dsa-1/search-lab');
    await page.getByLabel('Strategy', { exact: true }).selectOption('bst');
    const operationContext = page.locator('.operation-context');

    // A balanced insertion order (root first, then each side) keeps the tree bushy.
    await page.getByLabel('Values', { exact: true }).fill('12, 5, 23, 2, 8, 16, 56');
    await page.getByLabel('Target', { exact: true }).fill('16');
    await page.getByRole('button', { name: 'Build deterministic trace' }).click();
    await expect(operationContext).toContainText('O(log n) time');

    // Sorted insertion order chains the tree into a linked list.
    await page.getByLabel('Values', { exact: true }).fill('2, 5, 8, 12, 16, 23, 56');
    await page.getByLabel('Target', { exact: true }).fill('56');
    await page.getByRole('button', { name: 'Build deterministic trace' }).click();
    await expect(operationContext).toContainText('O(n) time');
    await expect(operationContext).toContainText('worst case');
  });

  test('gates the trace on the prediction and shows the hash bucket shortcut', async ({ page }) => {
    await page.goto('/lesson/dsa-1/search-lab');
    await page.getByLabel('Strategy', { exact: true }).selectOption('hash');

    const timeline = page.getByLabel('Trace timeline');
    const maximum = await timeline.getAttribute('max');
    if (maximum === null) throw new Error('Search trace timeline has no maximum.');

    await expect(page.getByRole('button', { name: 'Lock prediction' })).toBeVisible();
    await timeline.fill(maximum);
    await expect(timeline).toHaveValue('0');

    await page.getByLabel('Your prediction').fill('1');
    await page.getByRole('button', { name: 'Lock prediction' }).click();
    await timeline.fill(maximum);
    await expect(timeline).toHaveValue(maximum);
  });
});
