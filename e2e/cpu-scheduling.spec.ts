import { expect, test } from '@playwright/test';

test.describe('CPU Scheduling Arena', () => {
  test('validates workloads and compares all five policies', async ({ page }) => {
    await page.goto('/lesson/operating-systems/cpu-scheduling');

    await expect(page.getByRole('heading', { name: 'CPU Scheduling Arena' })).toBeVisible();
    const workload = page.getByLabel('ID, arrival, burst, priority');
    await workload.fill('P1, 0, 0, 1');
    await page.getByRole('button', { name: 'Build schedule' }).click();
    await expect(page.getByRole('alert')).toContainText('burst must be between');

    await page.getByRole('button', { name: 'Preemption' }).click();
    await expect(page.getByRole('heading', { name: 'Side-by-side comparison' })).toBeVisible();
    for (const algorithm of ['FCFS', 'SJF', 'SRTF', 'Priority', 'Round Robin']) {
      await expect(page.getByText(algorithm, { exact: true }).last()).toBeVisible();
    }
  });

  test('gates the timeline on a prediction and restores the initial state', async ({ page }) => {
    await page.goto('/lesson/operating-systems/cpu-scheduling');

    await page.getByRole('button', { name: 'Next' }).click();
    await expect(page.getByRole('status')).toContainText('Lock a prediction');
    await page.getByLabel('Your prediction').fill('P1');
    await page.getByRole('button', { name: 'Lock prediction' }).click();
    await page.getByRole('button', { name: 'Next' }).click();
    await expect(page.getByText('Step 2 of')).toBeVisible();
    await page.getByRole('button', { name: 'Restart trace' }).click();
    await expect(page.getByText('Step 1 of')).toBeVisible();
  });
});
