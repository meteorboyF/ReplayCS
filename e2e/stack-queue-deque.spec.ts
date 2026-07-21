import { test, expect, type Page } from '@playwright/test';

async function chooseBacking(page: Page, backing: string) {
  const selector = page.getByLabel('Backing', { exact: true });
  await selector.selectOption(backing);
  await expect(selector).toHaveValue(backing);
}

test.describe('Stack Lab', () => {
  test('mounts with a full trace, prediction gating, and all backings', async ({ page }) => {
    await page.goto('/lesson/dsa-1/stack');
    await expect(page.getByRole('heading', { name: 'Stack Lab' })).toBeVisible();
    await expect(page.getByLabel('Operation', { exact: true })).toBeVisible();
    await expect(page.getByLabel('Trace timeline')).toBeVisible();
    await expect(page.getByLabel('Execution evidence')).toBeVisible();

    const backingOptions = page.getByLabel('Backing', { exact: true }).locator('option');
    expect(await backingOptions.evaluateAll((options) => options.map((o) => o.value))).toEqual([
      'array',
      'dynamic-array',
      'linked-list'
    ]);
  });

  test('makes a full dynamic-array push report O(n) resize and a linked push O(1)', async ({
    page
  }) => {
    await page.goto('/lesson/dsa-1/stack');
    const operationContext = page.locator('.operation-context');

    await chooseBacking(page, 'dynamic-array');
    await expect(operationContext).toContainText('O(n) time');

    await chooseBacking(page, 'linked-list');
    await expect(operationContext).toContainText('O(1) time');
  });
});

test.describe('Queue Lab', () => {
  test('makes naive dequeue O(n) and circular dequeue O(1) with different traces', async ({
    page
  }) => {
    await page.goto('/lesson/dsa-1/queue');
    await expect(page.getByRole('heading', { name: 'Queue Lab' })).toBeVisible();

    const operationContext = page.locator('.operation-context');
    const timeline = page.getByLabel('Trace timeline');

    await chooseBacking(page, 'naive-array');
    await expect(operationContext).toContainText('O(n) time');
    const naiveSteps = Number(await timeline.getAttribute('max')) + 1;

    await chooseBacking(page, 'circular-array');
    await expect(operationContext).toContainText('O(1) time');
    const circularSteps = Number(await timeline.getAttribute('max')) + 1;
    expect(circularSteps).toBeLessThan(naiveSteps);
  });

  test('flips linked enqueue between O(1) with a rear pointer and O(n) without', async ({
    page
  }) => {
    await page.goto('/lesson/dsa-1/queue');
    await page.getByLabel('Operation', { exact: true }).selectOption('enqueue');
    await chooseBacking(page, 'linked-list');

    const rearSwitch = page.getByRole('switch', { name: 'Maintain rear pointer' });
    const operationContext = page.locator('.operation-context');
    const source = page.getByLabel('Source code');
    const timeline = page.getByLabel('Trace timeline');

    await expect(rearSwitch).toHaveAttribute('aria-checked', 'true');
    await expect(operationContext).toContainText('O(1) time');
    const sourceWithRear = await source.innerText();
    const stepsWithRear = Number(await timeline.getAttribute('max')) + 1;

    await rearSwitch.click();
    await expect(rearSwitch).toHaveAttribute('aria-checked', 'false');
    await expect(operationContext).toContainText('O(n) time');
    expect(await source.innerText()).not.toBe(sourceWithRear);
    expect(Number(await timeline.getAttribute('max')) + 1).toBeGreaterThan(stepsWithRear);
  });
});

test.describe('Deque Lab', () => {
  test('mounts with both backings and traces both-ended operations', async ({ page }) => {
    await page.goto('/lesson/dsa-1/deque');
    await expect(page.getByRole('heading', { name: 'Deque Lab' })).toBeVisible();

    const backingOptions = page.getByLabel('Backing', { exact: true }).locator('option');
    expect(await backingOptions.evaluateAll((options) => options.map((o) => o.value))).toEqual([
      'circular-array',
      'linked-list'
    ]);

    const operations = page.getByLabel('Operation', { exact: true }).locator('option');
    expect(await operations.evaluateAll((options) => options.map((o) => o.value))).toEqual([
      'push-front',
      'push-back',
      'pop-front',
      'pop-back',
      'peek-front',
      'peek-back'
    ]);

    const operationContext = page.locator('.operation-context');
    await expect(operationContext).toContainText('O(1) time');
  });

  test('gates the trace behind the prediction checkpoint', async ({ page }) => {
    await page.goto('/lesson/dsa-1/deque');
    const timeline = page.getByLabel('Trace timeline');
    const maximum = await timeline.getAttribute('max');
    if (maximum === null) throw new Error('Deque trace timeline has no maximum.');

    // The first step carries the prediction; jumping past it must be rejected.
    await expect(page.getByRole('button', { name: 'Lock prediction' })).toBeVisible();
    await timeline.fill(maximum);
    await expect(timeline).toHaveValue('0');
  });
});
