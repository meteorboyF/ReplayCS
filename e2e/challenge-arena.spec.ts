import { expect, test } from '@playwright/test';

test.describe('Challenge Arena', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      if (!sessionStorage.getItem('replaycs-e2e-ready')) {
        localStorage.removeItem('replaycs-progress');
        sessionStorage.setItem('replaycs-e2e-ready', 'true');
      }
    });
  });

  test('supports retry, reveal, cross-subject completion, and single-award persistence', async ({
    page
  }) => {
    await page.goto('/challenges');

    await expect(
      page.getByRole('heading', { name: 'Five subjects. No lucky guesses.' })
    ).toBeVisible();
    await expect(page.getByTestId(/^challenge-card-/)).toHaveCount(5);

    await page.getByLabel('low = 3, high = 6').check();
    await page.getByTestId('check-answer').click();
    await expect(page.getByRole('alert')).toContainText('State mismatch');

    await page.getByTestId('retry-answer').click();
    await page.getByLabel('low = 4, high = 6').check();
    await page.getByTestId('check-answer').click();
    await expect(page.getByRole('status')).toContainText('State matched');
    await page.getByTestId('advance-checkpoint').click();

    await page.getByLabel('31 at index 5').check();
    await page.getByTestId('check-answer').click();
    await page.getByTestId('complete-challenge').click();
    await expect(page.getByTestId('challenge-complete')).toContainText('+30 XP saved');

    await page.getByTestId('challenge-card-sql-pipeline-boss').click();
    await page.getByLabel('1, 2, 3, 4, 5').check();
    await page.getByTestId('check-answer').click();
    await page.getByTestId('reveal-answer').click();
    await expect(page.getByRole('status')).toContainText('Answer revealed: 1, 2, 4, 5');
    await page.getByTestId('advance-checkpoint').click();

    await page.getByLabel('South | 230').check();
    await page.getByTestId('check-answer').click();
    await page.getByTestId('complete-challenge').click();
    await expect(page.getByTestId('challenge-complete')).toContainText('Reveals do not clear');
    await expect(page.getByTestId('challenge-complete')).toContainText(/30\s*total XP/);

    await page.getByTestId('replay-unassisted').click();
    await page.getByLabel('1, 2, 4, 5').check();
    await page.getByTestId('check-answer').click();
    await page.getByTestId('advance-checkpoint').click();
    await page.getByLabel('South | 230').check();
    await page.getByTestId('check-answer').click();
    await page.getByTestId('complete-challenge').click();
    await expect(page.getByTestId('challenge-complete')).toContainText('+30 XP saved');

    await page.reload();
    await expect(page.getByTestId('challenge-status-binary-bound-boss')).toHaveText('Cleared');
    await expect(page.getByTestId('challenge-status-sql-pipeline-boss')).toHaveText('Cleared');
    await expect(page.getByLabel('Arena progress')).toContainText('2/5');
    await expect(page.getByLabel('Arena progress')).toContainText('60 total XP');

    await page.getByTestId('challenge-card-binary-bound-boss').click();
    await page.getByLabel('low = 4, high = 6').check();
    await page.getByTestId('check-answer').click();
    await page.getByTestId('advance-checkpoint').click();
    await page.getByLabel('31 at index 5').check();
    await page.getByTestId('check-answer').click();
    await page.getByTestId('complete-challenge').click();

    await expect(page.getByTestId('challenge-complete')).toContainText('single-award');
    await expect(page.getByTestId('challenge-complete')).toContainText(/60\s*total XP/);
    await expect
      .poll(() =>
        page.evaluate(() => {
          const saved = JSON.parse(localStorage.getItem('replaycs-progress') ?? '{}');
          return {
            xp: saved.xp,
            bosses: saved.completedBossChallenges
          };
        })
      )
      .toEqual({
        xp: 60,
        bosses: ['binary-bound-boss', 'sql-pipeline-boss']
      });
  });

  test('keeps every boss interaction reachable on a narrow viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/challenges?challenge=packet-route-boss');

    await expect(page.getByRole('heading', { name: 'Packet Route Boss' })).toBeVisible();
    await page.getByLabel('The default gateway’s LAN MAC').check();
    await page.getByTestId('check-answer').click();
    await expect(page.getByRole('status')).toContainText('State matched');
    await expect(page.getByTestId('advance-checkpoint')).toBeVisible();
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1))
      .toBe(true);
  });

  test('recovers safely from malformed legacy progress', async ({ page }) => {
    await page.goto('/challenges');
    await page.evaluate(() =>
      localStorage.setItem(
        'replaycs-progress',
        JSON.stringify({
          version: 1,
          xp: -40,
          hearts: 99,
          misconceptionCounts: null,
          badges: null,
          completedBossChallenges: null
        })
      )
    );

    await page.reload();
    await expect(
      page.getByRole('heading', { name: 'Five subjects. No lucky guesses.' })
    ).toBeVisible();
    await expect(page.getByLabel('Arena progress')).toContainText('0/5');
    await expect(page.getByLabel('Arena progress')).toContainText('0 total XP');

    await page.goto('/progress');
    await expect(page.getByRole('heading', { name: 'Level 1 tracer' })).toBeVisible();
    await expect(page.getByText('No misconception evidence yet.')).toBeVisible();
  });
});
