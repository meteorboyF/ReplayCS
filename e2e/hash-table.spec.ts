import { test, expect } from '@playwright/test';

test.describe('Hash Table Lesson Route', () => {
  test('Hash Table lab mounts correctly', async ({ page }) => {
    await page.goto('/lesson/dsa-1/hash-table');
    await expect(page.getByRole('heading', { name: 'Hash Table Lab' })).toBeVisible();
    await expect(page.locator('.builder.panel')).toBeVisible();
    
    // Verify default operation starts correctly
    await expect(page.getByLabel('Operation', { exact: true })).toBeVisible();
  });
});
