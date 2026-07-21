import { expect, test } from '@playwright/test';

test.describe('SQL Query Pipeline', () => {
  test('shows every logical stage, the full SQL, and the final relation', async ({ page }) => {
    await page.goto('/lesson/dbms/query-pipeline');

    await expect(page.getByRole('heading', { name: 'SQL Query Pipeline' })).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Logical order ≠ physical plan' })
    ).toBeVisible();
    await expect(page.getByText(/not output captured from a database optimizer/i)).toBeVisible();
    await expect(page.getByRole('heading', { name: /departments/ })).toBeVisible();
    await expect(page.getByRole('heading', { name: /employees/ })).toBeVisible();

    const stageNavigation = page.getByRole('navigation', { name: 'Logical query stages' });
    // The full query is always visible now — nothing is hidden behind a prediction.
    await expect(page.locator('section.query pre')).toContainText('HAVING COUNT');
    await expect(stageNavigation.getByRole('button', { name: /HAVING/ })).toBeVisible();
    await expect(stageNavigation.getByRole('button', { name: /PREDICT/ })).toHaveCount(0);

    await stageNavigation.getByRole('button', { name: /GROUP BY/ }).click();
    await expect(page.getByRole('heading', { name: /Build department buckets/ })).toBeVisible();

    await stageNavigation.getByRole('button', { name: /LIMIT/ }).click();
    await expect(page.getByText('Scenario complete. Progress saved locally.')).toBeVisible();
    await expect(page.locator('section.final-result')).not.toContainText('Prediction first');
  });

  test('traces LEFT JOIN NULL preservation and completes the second preset', async ({ page }) => {
    await page.goto('/lesson/dbms/query-pipeline');

    await page.getByRole('tab', { name: /Dhaka department capacity/ }).click();
    await expect(page).toHaveURL(/scenario=dhaka-department-capacity/);

    const stageNavigation = page.getByRole('navigation', { name: 'Logical query stages' });
    await stageNavigation.getByRole('button', { name: /JOIN/ }).click();
    await expect(
      page.getByRole('heading', { name: /Preserve unmatched departments/ })
    ).toBeVisible();
    await expect(page.getByText('NULL', { exact: true }).first()).toBeVisible();

    await stageNavigation.getByRole('button', { name: /LIMIT/ }).click();
    await expect(page.getByText('Scenario complete. Progress saved locally.')).toBeVisible();
    const finalResult = page.locator('section.final-result');
    await expect(finalResult.getByText('Engineering', { exact: true })).toBeVisible();
    await expect(finalResult.getByText('1 row', { exact: true })).toBeVisible();
  });
});
