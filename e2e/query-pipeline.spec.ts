import { expect, test } from '@playwright/test';

test.describe('SQL Query Pipeline', () => {
  test('pauses at GROUP BY and turns a WHERE mistake into a recovery trace', async ({ page }) => {
    await page.goto('/lesson/dbms/query-pipeline');

    await expect(page.getByRole('heading', { name: 'SQL Query Pipeline' })).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Logical order ≠ physical plan' })
    ).toBeVisible();
    await expect(page.getByText(/not output captured from a database optimizer/i)).toBeVisible();
    await expect(page.getByRole('heading', { name: /departments/ })).toBeVisible();
    await expect(page.getByRole('heading', { name: /employees/ })).toBeVisible();

    const stageNavigation = page.getByRole('navigation', { name: 'Logical query stages' });
    await expect(page.locator('section.query pre')).not.toContainText('HAVING COUNT');
    await expect(stageNavigation.getByRole('button', { name: /PREDICT/ })).toBeVisible();
    await expect(page.locator('section.final-result')).toContainText('Prediction first');
    await stageNavigation.getByRole('button', { name: /GROUP BY/ }).click();
    await expect(page.getByRole('heading', { name: /Build department buckets/ })).toBeVisible();

    await page.getByRole('button', { name: 'Next' }).click();
    await expect(
      page.getByText('Lock a prediction before revealing the aggregate filter.')
    ).toBeVisible();
    await expect(page.getByText('Mentor locked for this checkpoint')).toBeVisible();

    const checkpoint = page.locator('section.checkpoint');
    await checkpoint.getByRole('button', { name: /^WHERE/ }).click();
    await expect(page.locator('section.query pre')).toContainText('HAVING COUNT');
    await expect(stageNavigation.getByRole('button', { name: /HAVING/ })).toBeVisible();
    await expect(page.getByText('First divergence found.')).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Find the first clause divergence' })
    ).toBeVisible();
    await expect(page.getByText('First divergence · where-vs-having')).toBeVisible();

    const recovery = page.getByRole('group', { name: 'Recovery clause' });
    await recovery.getByRole('button', { name: 'HAVING' }).click();
    await expect(page.getByText(/Recovered · \+6 XP/)).toBeVisible();
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

    await stageNavigation.getByRole('button', { name: /GROUP BY/ }).click();
    await page
      .locator('section.checkpoint')
      .getByRole('button', { name: /^HAVING/ })
      .click();
    await expect(page.getByText('Correct prediction.')).toBeVisible();

    await stageNavigation.getByRole('button', { name: /LIMIT/ }).click();
    await expect(page.getByText('Scenario complete. Progress saved locally.')).toBeVisible();
    const finalResult = page.locator('section.final-result');
    await expect(finalResult.getByText('Engineering', { exact: true })).toBeVisible();
    await expect(finalResult.getByText('1 row', { exact: true })).toBeVisible();
  });
});
