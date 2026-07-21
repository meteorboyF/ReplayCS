import { expect, test } from '@playwright/test';

test.describe('Packet Journey', () => {
  test('shows the deterministic cold path and hop-local addressing', async ({ page }) => {
    await page.goto('/lesson/computer-networks/packet-journey');

    await expect(page.getByRole('heading', { name: 'Packet Journey' })).toBeVisible();
    await expect(page.getByRole('note', { name: 'Important simplification notice' })).toBeVisible();
    await expect(page.getByText('18 deterministic events')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Source → destination' })).toBeVisible();
    await expect(page.getByText('MAC = this hop only')).toBeVisible();
  });

  test('replays a warm-cache journey freely and restores state', async ({ page }) => {
    await page.goto('/lesson/computer-networks/packet-journey');

    await page.getByLabel('Browser response cache').selectOption('warm');
    await page.getByRole('button', { name: 'Build journey' }).click();
    await expect(page.getByText('3 deterministic events')).toBeVisible();
    await page.getByRole('button', { name: 'Next' }).click();
    await expect(page.getByText('Event 2 of 3')).toBeVisible();
    await page.getByRole('button', { name: 'Previous' }).click();
    await expect(page.getByText('Event 1 of 3')).toBeVisible();
  });
});
