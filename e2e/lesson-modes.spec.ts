import { expect, test, type Page } from '@playwright/test';

// Every operation lesson now runs on the shared visualization-first workspace.
const workspaceLessons = [
  '/lesson/dsa-1/stack',
  '/lesson/dsa-1/arrays',
  '/lesson/dsa-1/queue',
  '/lesson/dsa-1/deque',
  '/lesson/dsa-1/linked-list',
  '/lesson/dsa-1/hash-table',
  '/lesson/dsa-1/search-lab',
  '/lesson/dsa-1/bst'
];

async function timeline(page: Page) {
  return page.getByLabel('Trace timeline');
}

test.describe('Learn Mode is the default and never gates', () => {
  for (const route of workspaceLessons) {
    test(`${route} opens in Learn Mode with visualization and free navigation`, async ({
      page
    }) => {
      await page.goto(route);

      // Mode toggle exists and Learn is selected by default.
      const learn = page.getByRole('button', { name: 'Learn', exact: true });
      await expect(learn).toHaveAttribute('aria-pressed', 'true');

      // Visualization, code, and playback controls are all present immediately.
      await expect(page.getByLabel('Source code')).toBeVisible();
      const bar = await timeline(page);
      await expect(bar).toBeVisible();
      await expect(page.getByRole('button', { name: /Next/ })).toBeEnabled();
      await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeEnabled();

      // No prediction overlay blocks the lesson on open.
      await expect(page.getByRole('button', { name: 'Lock prediction' })).toHaveCount(0);

      // The trace can be scrubbed all the way to the end without answering anything.
      const max = await bar.getAttribute('max');
      if (max === null) throw new Error(`${route} has no timeline maximum`);
      await bar.fill(max);
      await expect(bar).toHaveValue(max);

      // State after the line is revealed (not masked) in Learn Mode.
      await expect(page.getByLabel('Execution evidence')).not.toContainText(
        'Lock the prediction to reveal'
      );
    });
  }
});

test.describe('Mode switching', () => {
  test('Challenge Mode gates a step behind its prediction; Learn un-gates it again', async ({
    page
  }) => {
    await page.goto('/lesson/dsa-1/stack');
    const bar = await timeline(page);
    const max = (await bar.getAttribute('max')) ?? '0';

    // Challenge: jumping to the end is blocked at the first unanswered prediction.
    await page.getByRole('button', { name: 'Challenge', exact: true }).click();
    await bar.fill(max);
    await expect(bar).toHaveValue('0');
    await expect(page.getByRole('button', { name: 'Lock prediction' })).toBeVisible();

    // Back to Learn: the same jump now succeeds.
    await page.getByRole('button', { name: 'Learn', exact: true }).click();
    await bar.fill(max);
    await expect(bar).toHaveValue(max);
  });

  test('Guided Mode surfaces an optional checkpoint that can be skipped', async ({ page }) => {
    await page.goto('/lesson/dsa-1/stack');
    await page.getByRole('button', { name: 'Guided', exact: true }).click();

    // An optional checkpoint appears but does not block navigation.
    await expect(page.getByText('Optional checkpoint', { exact: true })).toBeVisible();
    const skip = page.getByRole('button', { name: 'Skip' });
    await expect(skip).toBeVisible();
    const bar = await timeline(page);
    const max = (await bar.getAttribute('max')) ?? '0';
    await bar.fill(max);
    await expect(bar).toHaveValue(max);
  });

  test('Learn Mode offers an optional prediction without blocking', async ({ page }) => {
    await page.goto('/lesson/dsa-1/stack');
    const optional = page.getByRole('button', { name: /Try predicting/ });
    await expect(optional).toBeVisible();
    await optional.click();
    // Revealing the optional prediction still leaves Next enabled.
    await expect(page.getByRole('button', { name: /Next/ })).toBeEnabled();
  });
});

test.describe('Presets and the mentor', () => {
  test('a preset loads a fresh trace and the mentor is available in Learn Mode', async ({
    page
  }) => {
    await page.goto('/lesson/dsa-1/stack');
    await page.getByRole('button', { name: 'Resize push' }).click();
    await expect(page.locator('.op-context')).toContainText('O(n) time');
    // The AI mentor panel is present (never locked in Learn Mode).
    await expect(page.getByRole('button', { name: 'Explain this step' })).toBeVisible();
  });

  test('the sorting arena also defaults to Learn Mode without gating', async ({ page }) => {
    await page.goto('/lesson/dsa-1/sorting-arena');
    await expect(page.getByRole('button', { name: 'Learn', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    await page.getByRole('button', { name: /Next/ }).click();
    // Learn Mode advances past step 1 without demanding the opening prediction.
    await expect(page.getByText('Step 2 of')).toBeVisible();
  });
});
