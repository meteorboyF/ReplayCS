import { test, expect } from '@playwright/test';

test.describe('Stack, Queue, Deque Lesson Routes', () => {
  test('Stack lab mounts correctly', async ({ page }) => {
    await page.goto('/lesson/dsa-1/stack');
    await expect(page.getByRole('heading', { name: 'Stack Lab' })).toBeVisible();
    await expect(page.locator('.builder.panel')).toBeVisible();
    
    // Verify default operation starts correctly
    await expect(page.getByLabel('Operation', { exact: true })).toBeVisible();
  });

  test('Queue lab mounts correctly', async ({ page }) => {
    await page.goto('/lesson/dsa-1/queue');
    await expect(page.getByRole('heading', { name: 'Queue Lab' })).toBeVisible();
    await expect(page.locator('.builder.panel')).toBeVisible();
    
    // Verify default operation starts correctly
    await expect(page.getByLabel('Operation', { exact: true })).toBeVisible();
  });

  test('Deque lab mounts correctly', async ({ page }) => {
    await page.goto('/lesson/dsa-1/deque');
    await expect(page.getByRole('heading', { name: 'Deque Lab' })).toBeVisible();
    await expect(page.locator('.builder.panel')).toBeVisible();
    
    // Verify default operation starts correctly
    await expect(page.getByLabel('Operation', { exact: true })).toBeVisible();
  });
});
