import { test, expect } from '@playwright/test';

test.describe('Hash Table Lab', () => {
  test('mounts with operations, strategies, presets, and the case matrix', async ({ page }) => {
    await page.goto('/lesson/dsa-1/hash-table');
    await expect(page.getByRole('heading', { name: 'Hash Table Lab' })).toBeVisible();

    const operations = page.getByLabel('Operation', { exact: true }).locator('option');
    expect(await operations.evaluateAll((options) => options.map((o) => o.value))).toEqual([
      'insert',
      'search',
      'delete',
      'resize'
    ]);

    const strategies = page.getByLabel('Strategy', { exact: true }).locator('option');
    expect(await strategies.evaluateAll((options) => options.map((o) => o.value))).toEqual([
      'chaining',
      'linear-probing'
    ]);

    await expect(page.getByRole('button', { name: /Collision-heavy/ })).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Hash-table complexity, with assumptions named' })
    ).toBeVisible();
    const rows = page.getByRole('table').locator('tbody tr');
    await expect(rows).toHaveCount(8);
  });

  test('flips search between expected O(1) and collision-heavy O(n)', async ({ page }) => {
    await page.goto('/lesson/dsa-1/hash-table');
    await page.getByLabel('Operation', { exact: true }).selectOption('search');

    const operationContext = page.locator('.operation-context');
    const timeline = page.getByLabel('Trace timeline');

    await page.getByRole('button', { name: /Good distribution/ }).click();
    await expect(operationContext).toContainText('O(1) time');
    await expect(operationContext).toContainText('expected case');
    const uniformSteps = Number(await timeline.getAttribute('max')) + 1;

    await page.getByRole('button', { name: /Collision-heavy/ }).click();
    await expect(operationContext).toContainText('O(n) time');
    await expect(operationContext).toContainText('worst case');
    expect(Number(await timeline.getAttribute('max')) + 1).toBeGreaterThan(uniformSteps);
  });

  test('traces a probing delete to a tombstone and gates on the prediction', async ({ page }) => {
    await page.goto('/lesson/dsa-1/hash-table');
    await page.getByLabel('Operation', { exact: true }).selectOption('delete');
    await page.getByLabel('Strategy', { exact: true }).selectOption('linear-probing');
    await page.getByLabel('Stored keys').fill('7, 14');
    await page.getByLabel('Key', { exact: true }).fill('7');
    await page.getByRole('button', { name: 'Build deterministic trace' }).click();

    const timeline = page.getByLabel('Trace timeline');
    const maximum = await timeline.getAttribute('max');
    if (maximum === null) throw new Error('Hash table trace timeline has no maximum.');

    // The prediction on the first step gates the timeline.
    await expect(page.getByRole('button', { name: 'Lock prediction' })).toBeVisible();
    await timeline.fill(maximum);
    await expect(timeline).toHaveValue('0');

    // Answer the tombstone question correctly and walk to the end.
    await page.getByLabel('Your prediction').fill('tombstone');
    await page.getByRole('button', { name: 'Lock prediction' }).click();
    await timeline.fill(maximum);
    await expect(timeline).toHaveValue(maximum);
    await expect(page.getByLabel('Hash table memory state')).toContainText('✝');
  });

  test('shows the resize rehashing every stored key into the doubled table', async ({ page }) => {
    await page.goto('/lesson/dsa-1/hash-table');
    await page.getByLabel('Operation', { exact: true }).selectOption('resize');

    const operationContext = page.locator('.operation-context');
    await expect(operationContext).toContainText('O(n) time');
    await expect(operationContext).toContainText('O(n) space');
    await expect(page.getByRole('heading', { name: 'Resize & rehash' })).toBeVisible();
  });
});
