import { expect, test } from '@playwright/test';

test.describe('Scenario Gallery', () => {
  test('lists trace scenarios with working links and no prediction UI', async ({ page }) => {
    await page.goto('/challenges');

    await expect(
      page.getByRole('heading', { name: 'Interesting traces, one click away' })
    ).toBeVisible();

    // Cards render (11 curated scenarios).
    const cards = page.getByTestId(/^scenario-card-/);
    await expect(cards).toHaveCount(11);

    // No prediction / guessing UI anywhere.
    await expect(page.getByRole('button', { name: /Lock prediction/i })).toHaveCount(0);
    await expect(page.getByLabel('Your prediction')).toHaveCount(0);
    await expect(page.getByText(/XP/)).toHaveCount(0);
    await expect(page.getByText(/correct answer/i)).toHaveCount(0);

    // A deep-linked scenario resolves to the real lesson.
    await page.getByTestId('scenario-link-binary-search-worst-case').click();
    await expect(page).toHaveURL(/\/lesson\/dsa-1\/binary-search\?values=/);
    await expect(page.getByRole('heading', { name: 'Binary Search' })).toBeVisible();
  });

  test('every scenario link resolves to a lesson page', async ({ page }) => {
    await page.goto('/challenges');
    const links = page.getByTestId(/^scenario-link-/);
    const count = await links.count();
    const hrefs: string[] = [];
    for (let i = 0; i < count; i++) {
      const href = await links.nth(i).getAttribute('href');
      if (href) hrefs.push(href);
    }
    expect(hrefs.length).toBe(11);
    for (const href of hrefs) {
      const response = await page.goto(href);
      expect(response?.ok()).toBe(true);
      expect(new URL(page.url()).pathname.startsWith('/lesson/')).toBe(true);
    }
  });
});
