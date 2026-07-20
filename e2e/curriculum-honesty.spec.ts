import { expect, test } from '@playwright/test';

const subjects = [
  {
    path: '/learn/dsa-1',
    liveLessons: ['Binary Search', 'Sorting Arena', 'Linked List Lab', 'Array & Dynamic Array Lab']
  },
  { path: '/learn/dsa-2', liveLessons: ['Graph Explorer'] },
  { path: '/learn/dbms', liveLessons: ['SQL Execution Lab'] },
  { path: '/learn/operating-systems', liveLessons: ['CPU Scheduling Arena'] },
  { path: '/learn/computer-networks', liveLessons: ['Packet Journey'] }
];

test('primary curriculum navigation contains only complete live lessons', async ({ page }) => {
  for (const subject of subjects) {
    await page.goto(subject.path);
    await expect(page.getByRole('heading', { name: 'Available lessons' })).toBeVisible();
    await expect(page.getByText('Coming soon')).toHaveCount(0);
    await expect(page.getByText('planned', { exact: true })).toHaveCount(0);
    await expect(page.locator('.lessons > a')).toHaveCount(subject.liveLessons.length);

    for (const lesson of subject.liveLessons) {
      await expect(page.getByRole('link', { name: new RegExp(lesson) })).toBeVisible();
    }
  }

  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'From searches to packets.' })).toBeVisible();
  await expect(page.getByText('Trees, graphs, heaps and dynamic programming')).toHaveCount(0);
});
