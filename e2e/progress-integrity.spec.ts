import { expect, test } from '@playwright/test';

const recordedProgress = {
  version: 3,
  onboardingComplete: true,
  learnerLevel: 'intermediate',
  primaryGoal: 'interview',
  preferredLanguage: 'cpp',
  explanationLanguage: 'en',
  explanationLevel: 'technical',
  subjectsOfInterest: ['dsa-1', 'dbms'],
  dailyGoalMinutes: 20,
  xp: 184,
  streak: 2,
  hearts: 2,
  completed: ['binary-search', 'query-pipeline'],
  awardedPredictions: [
    'binary-search:mid',
    'sorting-arena:first-prediction',
    'packet-journey:cold:checkpoint'
  ],
  misconceptionCounts: { 'comparison-direction': 1, 'scheduler-tie-break': 1 },
  mistakeEvidence: ['sorting-arena:first-prediction', 'cpu-scheduling:first-dispatch'],
  recoveredMistakes: ['sorting-arena:first-prediction'],
  lessonMastery: { 'binary-search': 75, 'query-pipeline': 75 },
  predictionAttempts: 6,
  correctPredictions: 3,
  firstAttemptCorrect: 3,
  hintsUsed: 3,
  hintEvidence: ['binary-search'],
  recentActivity: [
    {
      type: 'prediction',
      lessonId: 'binary-search:mid',
      xp: 10,
      at: '2026-07-20T08:00:00.000Z'
    },
    {
      type: 'recovery',
      lessonId: 'sorting-arena',
      xp: 6,
      at: '2026-07-19T08:00:00.000Z'
    },
    {
      type: 'completion',
      lessonId: 'query-pipeline',
      xp: 25,
      at: '2026-07-18T08:00:00.000Z'
    }
  ],
  languageUsage: { cpp: 4, python: 2 },
  badges: ['First Prediction', 'State Detective'],
  completedBossChallenges: ['binary-bound-boss', 'sql-pipeline-boss']
};

test.describe('progress evidence integrity', () => {
  test('derives dashboard metrics from canonical persisted evidence', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    await page.addInitScript((progress) => {
      localStorage.setItem('replaycs-progress', JSON.stringify(progress));
    }, recordedProgress);

    await page.goto('/progress');

    await expect(page.getByRole('heading', { name: 'Level 2 tracer' })).toBeVisible();
    // Completion-focused metrics (no prediction accuracy / hearts / streak).
    await expect(page.getByTestId('traces-completed')).toContainText('2');
    await expect(page.getByTestId('subjects-started')).toContainText('2');
    await expect(page.getByTestId('languages-viewed')).toContainText('2');

    const languageUsage = page.getByTestId('language-usage');
    await expect(languageUsage).toContainText('6 recorded');
    await expect(languageUsage).toContainText('C++');
    await expect(languageUsage).toContainText('4');
    await expect(languageUsage).toContainText('Python');
    await expect(languageUsage).toContainText('2');
    const recentActivity = page.getByTestId('recent-activity');
    await expect(recentActivity).toContainText('Lesson completed');
    await expect(recentActivity).toContainText('Query Pipeline');
    expect(pageErrors).toEqual([]);
  });

  test('shows honest empty states before evidence exists', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript(() => localStorage.removeItem('replaycs-progress'));
    await page.goto('/progress');

    await expect(page.getByTestId('traces-completed')).toContainText('0');
    await expect(page.getByTestId('languages-viewed')).toContainText('0');
    await expect(page.getByTestId('language-usage')).toContainText(
      'No language interactions recorded yet'
    );
    await expect(page.getByTestId('recent-activity')).toContainText('No activity recorded yet');
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1))
      .toBe(true);
  });
});
