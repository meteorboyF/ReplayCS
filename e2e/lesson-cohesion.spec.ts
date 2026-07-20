import { expect, test, type Page } from '@playwright/test';

async function finishTrace(page: Page) {
  const timeline = page.getByLabel('Trace timeline');
  const lastStep = await timeline.getAttribute('max');
  if (!lastStep) throw new Error('Trace timeline is missing its final step.');
  await timeline.fill(lastStep);
}

async function expectMastery(page: Page, subject: string, score: number) {
  await page.goto('/progress');
  const row = page.locator('.mastery-row').filter({ hasText: subject });
  await expect(row.getByText(`${score}%`)).toBeVisible();
}

test.describe('shared lesson systems', () => {
  test('Sorting Arena honors its XP promise and publishes DSA I mastery', async ({ page }) => {
    await page.goto('/lesson/dsa-1/sorting-arena');

    await page.getByLabel('Your prediction').fill('7');
    await page.getByRole('button', { name: 'Lock prediction' }).click();
    await page.getByRole('button', { name: 'Explain this step' }).click();
    await expect(page.getByText('Deterministic', { exact: true })).toBeVisible();

    await finishTrace(page);
    await expect(page.getByText('Sort complete · mastery saved')).toBeVisible();
    await expectMastery(page, 'DSA I', 100);
  });

  test('Graph Explorer records prediction, completion, mentor fallback, and DSA II mastery', async ({
    page
  }) => {
    await page.goto('/lesson/dsa-2/graph-explorer');

    const prediction = page.getByLabel('Your prediction');
    for (let step = 0; step < 8 && !(await prediction.isVisible()); step += 1) {
      await page.getByRole('button', { name: 'Next' }).click();
    }
    await expect(prediction).toBeVisible();
    await prediction.fill('A');
    await page.getByRole('button', { name: 'Lock prediction' }).click();
    await page.getByRole('button', { name: 'Explain this step' }).click();
    await expect(page.getByText('Deterministic', { exact: true })).toBeVisible();

    await finishTrace(page);
    await expect(page.getByText('Traversal complete · mastery saved')).toBeVisible();
    await expectMastery(page, 'DSA II', 100);
  });

  test('CPU Scheduling turns a wrong dispatch into grounded misconception evidence', async ({
    page
  }) => {
    await page.goto('/lesson/operating-systems/cpu-scheduling');

    await page.getByLabel('Your prediction').fill('P2');
    await page.getByRole('button', { name: 'Lock prediction' }).click();
    await expect(page.getByRole('button', { name: 'Explain my mistake' })).toBeVisible();
    await page.getByRole('button', { name: 'Explain my mistake' }).click();
    await expect(page.getByText('Deterministic', { exact: true })).toBeVisible();
    await expect(page.getByText('Recovery challenge:', { exact: true })).toBeVisible();

    await finishTrace(page);
    await expect(page.getByText('Schedule complete · mastery saved')).toBeVisible();
    await expectMastery(page, 'Operating Systems', 50);
    await expect(page.getByText('scheduler-tie-break')).toBeVisible();
  });

  test('Packet Journey awards one prediction and publishes Networks mastery', async ({ page }) => {
    await page.goto('/lesson/computer-networks/packet-journey');

    await page.getByLabel('Browser response cache').selectOption('warm');
    await page.getByRole('button', { name: 'Build journey' }).click();
    await page.getByLabel('Hand cached bytes to the renderer').check();
    await page.getByRole('button', { name: 'Lock prediction' }).click();
    await page.getByRole('button', { name: 'Explain this step' }).click();
    await expect(page.getByText('Deterministic', { exact: true })).toBeVisible();

    await finishTrace(page);
    await expect(page.getByText('Journey complete · mastery saved')).toBeVisible();
    await expectMastery(page, 'Networks', 100);
  });
});
