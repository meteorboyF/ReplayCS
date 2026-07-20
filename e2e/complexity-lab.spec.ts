import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test.describe('Operation Complexity Lab', () => {
  test('compares growth safely and explains real operation cases', async ({ page }) => {
    await page.goto('/complexity');

    await expect(
      page.getByRole('heading', { name: 'Count the work. Then name the growth.' })
    ).toBeVisible();
    await expect(page.getByText('Operation Complexity Lab', { exact: true })).toBeVisible();
    await expect(
      page.getByRole('heading', { name: /Operation count.*wall-clock time/ })
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'See when growth overwhelms constants' })
    ).toBeVisible();

    const inputSize = page.getByRole('slider', { name: /input size/i });
    await page.getByRole('checkbox', { name: 'O(n!)' }).check();
    await inputSize.fill('20');
    await expect(page.getByText(/safe display cap/i)).toBeVisible();

    await page.getByRole('radio', { name: 'Logarithmic' }).check();
    await expect(page.getByRole('table', { name: /representative growth values/i })).toBeVisible();

    await expect(page.getByText('Amortized O(1)', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('O(V + E)', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('O(log n + k)', { exact: true }).first()).toBeVisible();

    const binaryExplorer = page.getByRole('region', {
      name: 'Binary search Operation Complexity Explorer'
    });
    const appendExplorer = page.getByRole('region', {
      name: 'Dynamic-array append Operation Complexity Explorer'
    });

    await expect(
      binaryExplorer.getByRole('heading', { name: 'Binary search', exact: true })
    ).toBeVisible();
    await expect(appendExplorer.getByRole('tab', { name: 'Visual Trace' })).toHaveCount(0);
    await expect(appendExplorer.getByRole('tab', { name: 'Code Trace' })).toHaveCount(0);

    await binaryExplorer.getByRole('tab', { name: 'Cases' }).click();
    await expect(binaryExplorer.getByText('Target at the first midpoint')).toBeVisible();
    await binaryExplorer
      .getByRole('button', { name: /worst.*Last possible decision or missing target/i })
      .click();
    await binaryExplorer.getByRole('tab', { name: 'Visual Trace' }).click();
    await expect(binaryExplorer.locator('.visual').getByText('14', { exact: true })).toBeVisible();
    await binaryExplorer.getByRole('button', { name: /Next/ }).click();
    await binaryExplorer.getByRole('button', { name: /Next/ }).click();
    await binaryExplorer.getByRole('button', { name: /Next/ }).click();
    const visualEvidence = binaryExplorer.getByLabel('Operation work at this trace step');
    await expect(visualEvidence.getByText('Work this step')).toBeVisible();
    await expect(visualEvidence.getByText('4', { exact: true })).toBeVisible();
    await expect(visualEvidence.getByText('14', { exact: true })).toBeVisible();
    await expect(visualEvidence.getByText('read: 3 · comparison: 1')).toBeVisible();

    await binaryExplorer.getByRole('tab', { name: 'Code Trace' }).click();
    await expect(binaryExplorer.getByText('if values[mid] == target: return mid')).toBeVisible();
    const codeEvidence = binaryExplorer.getByLabel('Operation work at this source line');
    await expect(codeEvidence.getByText('4', { exact: true })).toBeVisible();
    await expect(codeEvidence.getByText('14', { exact: true })).toBeVisible();
    await expect(codeEvidence.getByText('read: 9 · write: 3 · comparison: 2')).toBeVisible();

    await binaryExplorer.getByRole('tab', { name: 'Cases' }).click();
    await binaryExplorer.getByRole('button', { name: /worst.*Recursive call stack/i }).click();
    await expect(binaryExplorer.getByRole('tab', { name: 'Visual Trace' })).toHaveCount(0);
    await expect(binaryExplorer.getByRole('tab', { name: 'Code Trace' })).toHaveCount(0);

    const danglingControls = await page
      .locator('.explorer')
      .evaluateAll((explorers) =>
        explorers.flatMap((explorer) =>
          [...explorer.querySelectorAll('[aria-controls]')]
            .map((element) => element.getAttribute('aria-controls'))
            .filter((id) => id && !document.getElementById(id))
        )
      );
    expect(danglingControls).toEqual([]);
  });

  test('has no serious accessibility violations and remains usable on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/complexity');

    const results = await new AxeBuilder({ page }).analyze();
    const serious = results.violations.filter(
      (violation) => violation.impact === 'serious' || violation.impact === 'critical'
    );
    expect(serious).toEqual([]);

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    await expect(page.getByRole('slider', { name: /input size/i })).toBeVisible();

    const growthTabs = page.getByRole('tab', { name: 'Growth' });
    for (let index = 0; index < (await growthTabs.count()); index += 1) {
      await growthTabs.nth(index).click();
    }
    const duplicateIds = await page.evaluate(() => {
      const ids = [...document.querySelectorAll('[id]')].map((element) => element.id);
      return ids.filter((id, index) => ids.indexOf(id) !== index);
    });
    expect(duplicateIds).toEqual([]);

    const interactiveResults = await new AxeBuilder({ page }).analyze();
    const interactiveSerious = interactiveResults.violations.filter(
      (violation) => violation.impact === 'serious' || violation.impact === 'critical'
    );
    expect(interactiveSerious).toEqual([]);
  });
});
