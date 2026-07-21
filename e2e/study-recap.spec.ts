import { expect, test } from '@playwright/test';

test('builds deterministic English, Bangla, concise, and exam-ready recaps', async ({ page }) => {
  await page.goto('/study-recap');
  await expect(page.getByRole('heading', { name: 'Study Recap' })).toBeVisible();

  const topicBoxes = await page.locator('.topics input[type="checkbox"]').all();
  for (const checkbox of topicBoxes) await checkbox.uncheck();
  await page.getByRole('button', { name: 'Generate revision sheet' }).click();
  await expect(page.getByRole('alert')).toContainText('Choose at least one topic');

  await page.getByLabel('Arrays & Dynamic Arrays').check();
  await page.getByLabel('বাংলা').check();
  await page.getByLabel('Exam-ready').check();
  await page.getByRole('button', { name: 'Generate revision sheet' }).click();

  await expect(page.getByTestId('recap-source')).toHaveText('Deterministic');
  await expect(page.getByRole('heading', { name: 'রিভিশন শিট' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Arrays & Dynamic Arrays' })).toBeVisible();

  await page.getByLabel('English').check();
  await page.getByLabel('Concise').check();
  await page.getByRole('button', { name: 'Generate revision sheet' }).click();
  await expect(page.getByRole('heading', { name: 'Revision sheet' })).toBeVisible();
});

test('is reachable from Progress and stays contained on mobile without lesson AI', async ({
  page
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/progress');
  await page.getByTestId('study-recap-link').click();
  await expect(page).toHaveURL(/\/study-recap$/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
    true
  );
  await expect(page.getByText(/AI mentor/i)).toHaveCount(0);
  await expect(page.getByText(/Lock prediction/i)).toHaveCount(0);
});
