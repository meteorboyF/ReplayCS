import { expect, test, type Page } from '@playwright/test';

const operationIds = [
  'access',
  'traverse',
  'search',
  'insert-head',
  'insert-tail',
  'insert-after-known',
  'insert-at-position',
  'delete-head',
  'delete-tail',
  'delete-by-value',
  'delete-after-known',
  'reverse-iterative',
  'reverse-recursive',
  'detect-cycle'
] as const;

const complexityRows = [
  ['Access head', 'Direct', 'O(1)', 'O(1)'],
  ['Access position', 'Traversal', 'O(n)', 'O(1)'],
  ['Search', 'Best', 'O(1)', 'O(1)'],
  ['Search', 'Average', 'O(n)', 'O(1)'],
  ['Search', 'Worst', 'O(n)', 'O(1)'],
  ['Insert head', 'All cases', 'O(1)', 'O(1)'],
  ['Insert tail', 'Without tail pointer', 'O(n)', 'O(1)'],
  ['Insert tail', 'With tail pointer', 'O(1)', 'O(1)'],
  ['Insert after known node', 'Direct node reference', 'O(1)', 'O(1)'],
  ['Insert at position', 'Position must be found', 'O(n)', 'O(1)'],
  ['Delete head', 'All cases', 'O(1)', 'O(1)'],
  ['Delete tail', 'Singly linked list', 'O(n)', 'O(1)'],
  ['Delete known successor', 'Predecessor known', 'O(1)', 'O(1)'],
  ['Delete by value', 'Search required', 'O(n)', 'O(1)'],
  ['Reverse iterative', 'All nodes', 'O(n)', 'O(1)'],
  ['Reverse recursive', 'All nodes', 'O(n)', 'O(n)'],
  ['Cycle detection', 'Floyd', 'O(n)', 'O(1)']
] as const;

async function chooseOperation(page: Page, operation: (typeof operationIds)[number]) {
  const selector = page.getByLabel('Operation', { exact: true });
  await selector.selectOption(operation);
  await expect(selector).toHaveValue(operation);
}

async function lockAnyVisiblePrediction(page: Page) {
  const lockButton = page.getByRole('button', { name: 'Lock prediction' });
  if (!(await lockButton.isVisible())) return false;

  const firstRadio = page.getByRole('radio').first();
  if (await firstRadio.isVisible()) await firstRadio.check();
  else await page.getByLabel('Your prediction').fill('0');
  if (!(await lockButton.isEnabled())) return false;
  await lockButton.click();
  return true;
}

async function reachTraceEnd(page: Page) {
  const timeline = page.getByLabel('Trace timeline');
  const maximum = await timeline.getAttribute('max');
  if (maximum === null) throw new Error('Linked List trace timeline has no maximum.');

  for (let attempt = 0; attempt < 20; attempt += 1) {
    await timeline.fill(maximum);
    await lockAnyVisiblePrediction(page);
    if ((await timeline.inputValue()) === maximum) return;
  }
  throw new Error('Linked List trace remained gated after resolving its prediction checkpoints.');
}

async function findPredictionCheckpoint(page: Page) {
  const lockButton = page.getByRole('button', { name: 'Lock prediction' });
  const timeline = page.getByLabel('Trace timeline');
  const maximum = Number(await timeline.getAttribute('max'));

  for (let step = 0; step <= maximum; step += 1) {
    if (await lockButton.isVisible()) return;
    await page.getByRole('button', { name: /Next/ }).click();
  }
  throw new Error('The selected Linked List operation did not expose a prediction checkpoint.');
}

test.describe('Linked List Lab', () => {
  test('publishes every implemented operation and the complete case matrix', async ({ page }) => {
    await page.goto('/lesson/dsa-1/linked-list');
    await expect(page.getByRole('heading', { name: 'Linked List Lab' })).toBeVisible();

    const operationOptions = page.getByLabel('Operation').locator('option');
    await expect(operationOptions).toHaveCount(operationIds.length);
    expect(
      await operationOptions.evaluateAll((options) => options.map((option) => option.value))
    ).toEqual(operationIds);

    await expect(
      page.getByRole('heading', { name: 'Linked-list complexity, with assumptions named' })
    ).toBeVisible();
    const rows = page.getByRole('table').locator('tbody tr');
    await expect(rows).toHaveCount(complexityRows.length);
    for (const [index, expectedCells] of complexityRows.entries()) {
      await expect(rows.nth(index).locator('td')).toHaveText([...expectedCells]);
    }
  });

  test('makes the tail-pointer switch change complexity, source, trace, and exact work', async ({
    page
  }) => {
    await page.goto('/lesson/dsa-1/linked-list');

    const tailSwitch = page.getByRole('switch', { name: 'Maintain tail pointer' });
    const activePath = page.locator('.tail-paths > div.active');
    const operationContext = page.locator('.operation-context');
    const source = page.getByLabel('Source code');
    const timeline = page.getByLabel('Trace timeline');
    const exactWork = page.getByLabel('Execution evidence').locator('.topline strong');

    await expect(tailSwitch).toHaveAttribute('aria-checked', 'false');
    await expect(activePath).toContainText('OFF · O(n)');
    await expect(operationContext).toContainText('O(n) time');
    const sourceWithoutTail = await source.innerText();
    const stepsWithoutTail = Number(await timeline.getAttribute('max')) + 1;
    await reachTraceEnd(page);
    const workWithoutTail = Number(await exactWork.innerText());

    await tailSwitch.click();
    await expect(tailSwitch).toHaveAttribute('aria-checked', 'true');
    await expect(activePath).toContainText('ON · O(1)');
    await expect(operationContext).toContainText('O(1) time');
    const sourceWithTail = await source.innerText();
    const stepsWithTail = Number(await timeline.getAttribute('max')) + 1;
    expect(sourceWithTail).not.toBe(sourceWithoutTail);
    expect(stepsWithTail).toBeLessThan(stepsWithoutTail);

    await reachTraceEnd(page);
    const workWithTail = Number(await exactWork.innerText());
    expect(workWithTail).toBeLessThan(workWithoutTail);
  });

  test('preserves the active step and list state across languages and exposes every trace control', async ({
    page
  }) => {
    await page.goto('/lesson/dsa-1/linked-list');
    await chooseOperation(page, 'reverse-iterative');

    const timeline = page.getByLabel('Trace timeline');
    const memory = page.getByLabel('Linked list memory state');
    const source = page.getByLabel('Source code');
    const previous = page.getByRole('button', { name: /Previous/ });
    const next = page.getByRole('button', { name: /Next/ });
    const restart = page.getByRole('button', { name: 'Restart trace' });

    await expect(previous).toBeDisabled();
    await expect(next).toBeEnabled();
    await expect(restart).toBeVisible();
    await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeVisible();
    await expect(timeline).toBeVisible();

    await lockAnyVisiblePrediction(page);
    await next.click();
    const preservedStep = await timeline.inputValue();
    expect(Number(preservedStep)).toBeGreaterThan(0);
    const preservedMemory = await memory.innerText();
    const preservedInput = await page.getByLabel('Input list').inputValue();
    const cppSource = await source.innerText();

    await page.getByRole('tab', { name: 'Python' }).click();
    await expect(page.getByRole('tab', { name: 'Python' })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    await expect(timeline).toHaveValue(preservedStep);
    expect(await memory.innerText()).toBe(preservedMemory);
    await expect(page.getByLabel('Input list')).toHaveValue(preservedInput);
    expect(await source.innerText()).not.toBe(cppSource);
    await expect(source.locator('div.active')).toHaveCount(1);

    await previous.click();
    expect(Number(await timeline.inputValue())).toBe(Number(preservedStep) - 1);
    await next.click();
    await expect(timeline).toHaveValue(preservedStep);
    await restart.click();
    await expect(timeline).toHaveValue('0');

    await page.getByRole('button', { name: 'Play', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Pause', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeVisible();
  });

  test('gates state on a prediction, replays a mistake, and persists honest partial mastery', async ({
    page
  }) => {
    await page.goto('/lesson/dsa-1/linked-list');
    await chooseOperation(page, 'insert-head');
    await findPredictionCheckpoint(page);

    const timeline = page.getByLabel('Trace timeline');
    const gatedStep = await timeline.inputValue();
    const maximum = await timeline.getAttribute('max');
    if (maximum === null) throw new Error('Linked List trace timeline has no maximum.');

    await expect(page.getByText('Lock the prediction to reveal this transition.')).toBeVisible();
    await timeline.fill(maximum);
    await expect(timeline).toHaveValue(gatedStep);

    const nullChoice = page.getByRole('radio', { name: /null/i });
    if (await nullChoice.isVisible()) await nullChoice.check();
    else await page.getByLabel('Your prediction').fill('definitely-wrong');
    await page.getByRole('button', { name: 'Lock prediction' }).click();

    await expect(page.getByRole('status').filter({ hasText: 'Not quite.' })).toBeVisible();
    const replay = page.locator('section.replay');
    await expect(replay.getByRole('heading', { name: 'Find the first divergence' })).toBeVisible();
    await replay.getByRole('button', { name: 'Replay correct transition' }).click();
    await expect(replay.getByText('execute highlighted line')).toBeVisible();

    const actualState = (await replay.locator('.actual strong').innerText())
      .split('=')
      .slice(1)
      .join('=')
      .trim();
    await replay.getByLabel(/Recovery challenge/).fill(actualState);
    await replay.getByRole('button', { name: 'Check recovery' }).click();
    await expect(replay.getByRole('status')).toContainText('Recovered · +6 XP');

    await reachTraceEnd(page);
    await expect(page.getByText('1/15 operations')).toBeVisible();

    const persisted = await page.evaluate(() => ({
      operations: JSON.parse(localStorage.getItem('replaycs-linked-list-operations') ?? '[]'),
      progress: JSON.parse(localStorage.getItem('replaycs-progress') ?? 'null')
    }));
    expect(persisted.operations).toContain('insert-head');
    expect(persisted.progress.completed).not.toContain('linked-list-lab');
    expect(persisted.progress.recoveredMistakes).toHaveLength(1);
    expect(persisted.progress.lessonMastery['linked-list-lab']).toBeLessThanOrEqual(50);

    await page.reload();
    await expect(page.getByText('1/15 operations')).toBeVisible();
    await page.goto('/progress');
    const dsaMastery = page.locator('.mastery-row').filter({ hasText: 'DSA I' });
    await expect(dsaMastery.getByText('50%')).toBeVisible();
  });
});
