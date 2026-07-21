import { expect, test } from '@playwright/test';

test('shows a grounded deterministic mentor fallback without an API key', async ({ page }) => {
  await page.goto('/lesson/dsa-1/binary-search?step=1');
  await page.getByRole('button', { name: 'Explain this step' }).click();

  await expect(page.getByText('Deterministic', { exact: true })).toBeVisible();
  await expect(
    page.getByText('AI is not configured, so ReplayCS used its deterministic explanation.')
  ).toBeVisible();
  await expect(page.getByRole('heading', { name: /another candidate remains/i })).toBeVisible();

  const hintResponse = page.waitForResponse((response) =>
    response.url().includes('/api/ai/explain-step')
  );
  await page.getByRole('button', { name: 'Give me a hint' }).click();
  await hintResponse;
  const progress = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('replaycs-progress') ?? '{}')
  );
  expect(progress.hintsUsed).toBe(1);
  expect(progress.hintEvidence).toContain('search:binary-search-iterative');
});
