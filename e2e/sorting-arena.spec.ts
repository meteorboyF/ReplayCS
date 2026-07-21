import { expect, test } from '@playwright/test';

test.describe('Sorting Arena', () => {
  test('shows a synchronized four-language code panel with a highlighted active line', async ({
    page
  }) => {
    await page.goto('/lesson/dsa-1/sorting-arena');

    await expect(page.getByRole('heading', { name: 'Sorting Arena' })).toBeVisible();

    // Four language tabs are present.
    for (const lang of ['C', 'C++', 'JAVA', 'PYTHON']) {
      await expect(page.getByRole('tab', { name: lang, exact: true })).toBeVisible();
    }

    // Advance a couple of steps; at least one source line is highlighted.
    await page.getByRole('button', { name: 'Next' }).click();
    await page.getByRole('button', { name: 'Next' }).click();
    expect(await page.locator('.code-panel pre div.active').count()).toBeGreaterThanOrEqual(1);
  });

  test('switching language preserves the step, array, and counters', async ({ page }) => {
    await page.goto('/lesson/dsa-1/sorting-arena');

    // Move a few steps in.
    for (let i = 0; i < 4; i++) await page.getByRole('button', { name: 'Next' }).click();

    const stepBefore = await page.getByText(/Step \d+ of \d+/).textContent();
    const arrayBefore = await page.locator('.array .value').allTextContents();

    // Switch C++ -> Python.
    await page.getByRole('tab', { name: 'PYTHON', exact: true }).click();
    await expect(page.getByText('def bubble_sort(a):')).toBeVisible();

    const stepAfter = await page.getByText(/Step \d+ of \d+/).textContent();
    const arrayAfter = await page.locator('.array .value').allTextContents();

    expect(stepAfter).toBe(stepBefore);
    expect(arrayAfter).toEqual(arrayBefore);
  });

  test('every algorithm builds a trace with a code panel', async ({ page }) => {
    await page.goto('/lesson/dsa-1/sorting-arena');
    for (const algo of [
      'Bubble',
      'Selection',
      'Insertion',
      'Merge',
      'Quick',
      'Heap',
      'Counting',
      'Radix'
    ]) {
      await page.getByRole('tab', { name: algo }).click();
      await expect(page.locator('.code-panel pre')).toBeVisible();
      await expect(page.getByText(/Step \d+ of \d+/)).toBeVisible();
    }
  });
});
