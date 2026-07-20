import { expect, test } from '@playwright/test';

test('serves the public learner journey and safe health metadata', async ({ page, request }) => {
  const healthResponse = await request.get('/api/health');
  expect(healthResponse.ok()).toBe(true);
  const health = await healthResponse.json();
  expect(health).toMatchObject({ status: 'ok', app: 'ReplayCS' });
  expect(typeof health.aiConfigured).toBe('boolean');
  expect(health).not.toHaveProperty('apiKey');

  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Pause computer science/ })).toBeVisible();
  await page.getByRole('link', { name: /Start tracing/ }).click();
  await expect(page).toHaveURL(/\/onboarding$/);
  await expect(
    page.getByRole('heading', { name: /Make ReplayCS fit how you learn/ })
  ).toBeVisible();
});

test('keeps the flagship trace usable at a mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/lesson/dsa-1/binary-search');

  await expect(page.getByRole('heading', { name: 'Binary Search' })).toBeVisible();
  await page.getByRole('button', { name: 'Next' }).click();
  await expect(page.getByText('Step 2', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Explain this step' })).toBeVisible();
});
