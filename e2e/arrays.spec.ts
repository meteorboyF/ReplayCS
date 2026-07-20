import { expect, test, type Page } from '@playwright/test';

const operationOptions = [
  { value: 'access', label: 'Access by index' },
  { value: 'update', label: 'Update by index' },
  { value: 'search', label: 'Linear search' },
  { value: 'insert-beginning', label: 'Insert at beginning' },
  { value: 'insert-middle', label: 'Insert at position' },
  { value: 'insert-end', label: 'Append (insert at end)' },
  { value: 'delete-beginning', label: 'Delete at beginning' },
  { value: 'delete-middle', label: 'Delete at position' },
  { value: 'delete-end', label: 'Delete at end' },
  { value: 'copy', label: 'Copy the array' },
  { value: 'append-sequence', label: 'Dynamic append sequence' }
] as const;

const complexityRows = [
  ['Access', 'Index arithmetic, all cases', 'O(1)', 'O(1)'],
  ['Update', 'Index arithmetic, all cases', 'O(1)', 'O(1)'],
  ['Search', 'Best — match at index 0', 'O(1)', 'O(1)'],
  ['Search', 'Average — match inside', 'O(n)', 'O(1)'],
  ['Search', 'Worst — last or absent', 'O(n)', 'O(1)'],
  ['Insert beginning', 'All n elements shift', 'O(n)', 'O(1)'],
  ['Insert middle', 'Suffix shifts', 'O(n)', 'O(1)'],
  ['Append', 'Spare capacity', 'O(1)', 'O(1)'],
  ['Append', 'Resize required', 'O(n)', 'O(n)'],
  ['Append', 'Amortized over doubling', 'O(1)', 'O(n)'],
  ['Delete beginning', 'Survivors shift left', 'O(n)', 'O(1)'],
  ['Delete middle', 'Suffix shifts left', 'O(n)', 'O(1)'],
  ['Delete end', 'Size decrement only', 'O(1)', 'O(1)'],
  ['Copy', 'n reads + n writes; returned buffer is output', 'O(n)', 'O(1)']
] as const;

type OperationId = (typeof operationOptions)[number]['value'];

async function chooseOperation(page: Page, operation: OperationId) {
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
  if (maximum === null) throw new Error('Array trace timeline has no maximum.');

  for (let attempt = 0; attempt < 20; attempt += 1) {
    await timeline.fill(maximum);
    await lockAnyVisiblePrediction(page);
    if ((await timeline.inputValue()) === maximum) return;
  }
  throw new Error('Array trace remained gated after resolving its prediction checkpoints.');
}

async function findPredictionCheckpoint(page: Page) {
  const lockButton = page.getByRole('button', { name: 'Lock prediction' });
  const timeline = page.getByLabel('Trace timeline');
  const maximum = Number(await timeline.getAttribute('max'));

  for (let step = 0; step <= maximum; step += 1) {
    if (await lockButton.isVisible()) return;
    await page.getByRole('button', { name: /Next/ }).click();
  }
  throw new Error('The selected array operation did not expose a prediction checkpoint.');
}

test.describe('Array & Dynamic Array Lab', () => {
  test('publishes every implemented operation and the complete complexity matrix', async ({
    page
  }) => {
    await page.goto('/lesson/dsa-1/arrays');
    await expect(page.getByRole('heading', { name: 'Array & Dynamic Array Lab' })).toBeVisible();

    const options = page.getByLabel('Operation', { exact: true }).locator('option');
    await expect(options).toHaveCount(operationOptions.length);
    expect(
      await options.evaluateAll((elements) =>
        elements.map((option) => ({ value: option.value, label: option.textContent?.trim() }))
      )
    ).toEqual(operationOptions);

    await expect(
      page.getByRole('heading', { name: 'Array complexity, with assumptions named' })
    ).toBeVisible();
    const rows = page.getByRole('table').locator('tbody tr');
    await expect(rows).toHaveCount(complexityRows.length);
    for (const [index, expectedCells] of complexityRows.entries()) {
      await expect(rows.nth(index).locator('td')).toHaveText([...expectedCells]);
    }
  });

  test('makes spare capacity change complexity, source, trace length, and exact work', async ({
    page
  }) => {
    await page.goto('/lesson/dsa-1/arrays');

    const capacitySwitch = page.getByRole('switch', { name: 'Spare capacity' });
    const activePath = page.locator('.capacity-paths > div.active');
    const operationContext = page.locator('.operation-context');
    const source = page.getByLabel('Source code');
    const timeline = page.getByLabel('Trace timeline');
    const exactWork = page.getByLabel('Execution evidence').locator('.topline strong');

    await expect(capacitySwitch).toHaveAttribute('aria-checked', 'false');
    await expect(activePath).toContainText('OFF · O(n)');
    await expect(operationContext).toContainText('O(n) time');
    const resizeSource = await source.innerText();
    const resizeSteps = Number(await timeline.getAttribute('max')) + 1;
    await reachTraceEnd(page);
    const resizeWork = Number(await exactWork.innerText());

    await capacitySwitch.click();
    await expect(capacitySwitch).toHaveAttribute('aria-checked', 'true');
    await expect(activePath).toContainText('ON · O(1)');
    await expect(operationContext).toContainText('O(1) time');
    const capacitySource = await source.innerText();
    const capacitySteps = Number(await timeline.getAttribute('max')) + 1;
    expect(capacitySource).not.toBe(resizeSource);
    expect(capacitySteps).toBeLessThan(resizeSteps);

    await reachTraceEnd(page);
    const capacityWork = Number(await exactWork.innerText());
    expect(capacityWork).toBeLessThan(resizeWork);
  });

  test('preserves the current step, input, array state, and pending prediction across languages', async ({
    page
  }) => {
    await page.goto('/lesson/dsa-1/arrays');
    await chooseOperation(page, 'update');
    await findPredictionCheckpoint(page);

    const timeline = page.getByLabel('Trace timeline');
    const memory = page.getByLabel('Array memory state');
    const source = page.getByLabel('Source code');
    const prediction = page.getByLabel('Your prediction');
    await prediction.fill('21');

    const preservedStep = await timeline.inputValue();
    const preservedMemory = await memory.innerText();
    const preservedInput = await page.getByLabel('Input values').inputValue();
    const cppSource = await source.innerText();

    await page.getByRole('tab', { name: 'Python' }).click();
    await expect(page.getByRole('tab', { name: 'Python' })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    await expect(timeline).toHaveValue(preservedStep);
    expect(await memory.innerText()).toBe(preservedMemory);
    await expect(page.getByLabel('Input values')).toHaveValue(preservedInput);
    await expect(prediction).toHaveValue('21');
    expect(await source.innerText()).not.toBe(cppSource);
    await expect(source.locator('div.active')).toHaveCount(1);
  });

  test('shows access badges only on source lines that touch the array buffer', async ({ page }) => {
    await page.goto('/lesson/dsa-1/arrays');
    await chooseOperation(page, 'update');
    await findPredictionCheckpoint(page);
    await lockAnyVisiblePrediction(page);

    const memory = page.getByLabel('Array memory state');
    await expect(memory.locator('.marks .r, .marks .w')).toHaveCount(0);

    await page.getByRole('button', { name: /Next/ }).click();
    await expect(memory.locator('.marks .w')).toHaveCount(1);
  });

  test('gates state, gives deterministic mistake feedback, and persists honest partial mastery', async ({
    page
  }) => {
    await page.goto('/lesson/dsa-1/arrays');
    await chooseOperation(page, 'update');
    await findPredictionCheckpoint(page);

    const timeline = page.getByLabel('Trace timeline');
    const gatedStep = await timeline.inputValue();
    const maximum = await timeline.getAttribute('max');
    if (maximum === null) throw new Error('Array trace timeline has no maximum.');

    await expect(page.getByText('Lock the prediction to reveal this transition.')).toBeVisible();
    await timeline.fill(maximum);
    await expect(timeline).toHaveValue(gatedStep);

    await page.getByLabel('Your prediction').fill('21');
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
    await expect(page.getByText('1/12 operations')).toBeVisible();

    const persisted = await page.evaluate(() => ({
      operations: JSON.parse(localStorage.getItem('replaycs-array-operations') ?? '[]'),
      progress: JSON.parse(localStorage.getItem('replaycs-progress') ?? 'null')
    }));
    expect(persisted.operations).toContain('update');
    expect(persisted.progress.completed).not.toContain('array-lab');
    expect(persisted.progress.recoveredMistakes).toHaveLength(1);
    expect(persisted.progress.lessonMastery['array-lab']).toBeLessThanOrEqual(50);

    await page.reload();
    await expect(page.getByText('1/12 operations')).toBeVisible();
    const reloaded = await page.evaluate(() => ({
      operations: JSON.parse(localStorage.getItem('replaycs-array-operations') ?? '[]'),
      progress: JSON.parse(localStorage.getItem('replaycs-progress') ?? 'null')
    }));
    expect(reloaded.operations).toEqual(persisted.operations);
    expect(reloaded.progress.recoveredMistakes).toEqual(persisted.progress.recoveredMistakes);
    expect(reloaded.progress.lessonMastery['array-lab']).toBe(
      persisted.progress.lessonMastery['array-lab']
    );
  });
});
