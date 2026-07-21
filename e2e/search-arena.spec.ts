import { test, expect } from '@playwright/test';

test('mounts search arena and clicks through trace', async ({ page }) => {
  await page.goto('/lesson/dsa-1/search-arena');
  await expect(page.getByRole('button', { name: 'Binary Search (Iterative)' })).toBeVisible();
  
  // Click next a few times
  const next = page.getByRole('button', { name: /Next/ });
  await next.click();
  await next.click();
  await expect(page.getByRole('button', { name: /Prev/ })).toBeVisible();
  
  // Switch language
  await page.getByRole('tab', { name: 'PYTHON' }).click();
  await expect(page.getByRole('tab', { name: 'PYTHON' })).toHaveAttribute('aria-selected', 'true');
});

test('validates custom input in search arena', async ({ page }) => {
  await page.goto('/lesson/dsa-1/search-arena');
  
  // Test invalid input
  await page.getByLabel('Array Values').fill('1, nope, 3');
  await page.getByRole('button', { name: 'Apply' }).click();
  await expect(page.locator('.error')).toContainText('Invalid value: nope');
  
  // Test binary search sorting requirement
  await page.getByLabel('Array Values').fill('9, 3, 7');
  await page.getByLabel('Target').fill('7');
  await page.getByRole('button', { name: 'Apply' }).click();
  await expect(page.locator('.error')).toContainText('Binary search requires ascending sorted input');
  
  // Test valid input
  await page.getByLabel('Array Values').fill('1, 3, 7, 9');
  await page.getByRole('button', { name: 'Apply' }).click();
  await expect(page.locator('.error')).not.toBeVisible();
});
