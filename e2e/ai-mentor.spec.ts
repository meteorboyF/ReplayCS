import { expect, test } from '@playwright/test';

test('shows a grounded deterministic mentor fallback without an API key', async ({ page }) => {
  await page.goto('/lesson/dsa-1/binary-search?step=1');
  await page.getByRole('button', { name: 'Explain this step' }).click();

  await expect(page.getByText('Deterministic', { exact: true })).toBeVisible();
  await expect(
    page.getByText('AI is not configured, so ReplayCS used its deterministic explanation.')
  ).toBeVisible();
  await expect(page.getByRole('heading', { name: /another candidate remains/i })).toBeVisible();
});
