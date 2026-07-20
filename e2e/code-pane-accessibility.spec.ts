import { expect, test } from '@playwright/test';

test('language tabs support roving focus without moving the trace', async ({ page }) => {
  await page.goto('/lesson/dsa-1/binary-search');
  await page.getByRole('button', { name: 'Next' }).click();
  await expect(page.getByText('Step 2')).toBeVisible();

  const c = page.getByRole('tab', { name: 'C', exact: true });
  const cpp = page.getByRole('tab', { name: 'C++', exact: true });
  const java = page.getByRole('tab', { name: 'JAVA', exact: true });
  const python = page.getByRole('tab', { name: 'PYTHON', exact: true });

  await expect(cpp).toHaveAttribute('aria-selected', 'true');
  await expect(cpp).toHaveAttribute('tabindex', '0');
  await expect(c).toHaveAttribute('tabindex', '-1');
  await expect(java).toHaveAttribute('tabindex', '-1');
  await expect(python).toHaveAttribute('tabindex', '-1');

  await cpp.focus();
  await page.keyboard.press('ArrowRight');
  await expect(java).toBeFocused();
  await expect(java).toHaveAttribute('aria-selected', 'true');
  await expect(java).toHaveAttribute('tabindex', '0');
  await expect(cpp).toHaveAttribute('tabindex', '-1');
  await expect(page.getByText('Step 2')).toBeVisible();

  await page.keyboard.press('End');
  await expect(python).toBeFocused();
  await expect(python).toHaveAttribute('aria-selected', 'true');

  await page.keyboard.press('ArrowRight');
  await expect(c).toBeFocused();
  await expect(c).toHaveAttribute('aria-selected', 'true');

  await page.keyboard.press('ArrowLeft');
  await expect(python).toBeFocused();

  await page.keyboard.press('Home');
  await expect(c).toBeFocused();
  await expect(c).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByText('Step 2')).toBeVisible();
});
