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
  test('Sorting Arena completes a trace and publishes DSA I mastery', async ({ page }) => {
    await page.goto('/lesson/dsa-1/sorting-arena');

    await finishTrace(page);
    await expect(page.getByText('Mastery saved')).toBeVisible();
    await expectMastery(page, 'DSA I', 50);
  });

  test('Graph Explorer completes a traversal and publishes DSA II mastery', async ({ page }) => {
    await page.goto('/lesson/dsa-2/graph-explorer');

    await finishTrace(page);
    await expect(page.getByText('Traversal complete · mastery saved')).toBeVisible();
    await expectMastery(page, 'DSA II', 50);
  });

  test('CPU Scheduling completes a schedule and publishes Operating Systems mastery', async ({
    page
  }) => {
    await page.goto('/lesson/operating-systems/cpu-scheduling');

    await finishTrace(page);
    await expect(page.getByText('Schedule complete · mastery saved')).toBeVisible();
    await expectMastery(page, 'Operating Systems', 50);
  });

  test('Packet Journey completes a warm journey and publishes Networks mastery', async ({
    page
  }) => {
    await page.goto('/lesson/computer-networks/packet-journey');

    await page.getByLabel('Browser response cache').selectOption('warm');
    await page.getByRole('button', { name: 'Build journey' }).click();

    await finishTrace(page);
    await expect(page.getByText('Journey complete · mastery saved')).toBeVisible();
    await expectMastery(page, 'Networks', 50);
  });
});
