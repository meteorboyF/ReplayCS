import { expect, test } from '@playwright/test';

test('personalizes the recommended lesson without an account', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.preview .state')).toContainText('mid ?');
  await expect(page.locator('.preview .array .active')).toHaveCount(0);
  await page.getByRole('link', { name: /Start tracing/ }).click();

  // Step 1 — level + goal
  await page.getByLabel('Current level').selectOption('intermediate');
  await page.getByLabel('Primary goal').selectOption('exam');
  await page.getByRole('button', { name: /Continue/ }).click();

  // Step 2 — subjects (keep the default DSA I)
  await page.getByRole('button', { name: /Continue/ }).click();

  // Step 3 — languages
  await page.getByLabel('Programming language').selectOption('python');
  await page.getByLabel('Explanation language').selectOption('bn');
  await page.getByRole('button', { name: /Continue/ }).click();

  // Step 4 — daily goal, then build
  await page.getByLabel('Daily learning goal').fill('25');
  await page.getByRole('button', { name: 'Build my learning path' }).click();

  await expect(page).toHaveURL(/lesson\/dsa-1\/binary-search\?lang=python/);
  await expect(page.getByRole('heading', { name: 'Binary Search' })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'PYTHON' })).toHaveAttribute('aria-selected', 'true');

  await page.evaluate(() => localStorage.removeItem('replaycs-progress'));
  await page.reload();
  await expect(page.getByRole('tab', { name: 'PYTHON' })).toHaveAttribute('aria-selected', 'true');
});

test('welcomes a returning learner with their personalized next lesson', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: /Start tracing/ }).click();

  // Step 1 — accept defaults
  await page.getByRole('button', { name: /Continue/ }).click();

  // Step 2 — swap the default DSA I interest for Networks
  await page.getByRole('button', { name: /DSA I$/ }).click();
  await page.getByRole('button', { name: 'Networks' }).click();
  await page.getByRole('button', { name: /Continue/ }).click();

  // Step 3 — accept defaults
  await page.getByRole('button', { name: /Continue/ }).click();

  // Step 4 — build
  await page.getByRole('button', { name: 'Build my learning path' }).click();

  await expect(page).toHaveURL(/lesson\/computer-networks\/packet-journey/);

  await page.goto('/');
  const continueLink = page.getByRole('link', { name: /Continue · Packet Journey/ });
  await expect(continueLink).toBeVisible();
  await expect(continueLink).toHaveAttribute('href', '/lesson/computer-networks/packet-journey');
  await expect(page.getByRole('link', { name: /Judge demo/ })).toBeVisible();
});

test('advances only when the learner chooses to, and can step back', async ({ page }) => {
  await page.goto('/onboarding');

  await expect(page.getByText('Step 1 of 4')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Where are you starting from?' })).toBeVisible();

  await page.getByRole('button', { name: /Continue/ }).click();
  await expect(page.getByText('Step 2 of 4')).toBeVisible();
  await expect(page.getByRole('heading', { name: /Which subjects/ })).toBeVisible();

  await page.getByRole('button', { name: '← Back' }).click();
  await expect(page.getByText('Step 1 of 4')).toBeVisible();
  await expect(page.getByRole('progressbar', { name: /Onboarding/ })).toHaveAttribute(
    'aria-valuenow',
    '25'
  );
});
