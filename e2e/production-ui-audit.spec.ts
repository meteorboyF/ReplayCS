import { expect, test } from '@playwright/test';

const routes = [
  '/',
  '/learn/dsa-1',
  '/trace-lab',
  '/complexity',
  '/progress',
  '/study-recap',
  '/challenges',
  '/judge-demo',
  '/lesson/dsa-1/arrays',
  '/lesson/dsa-1/linked-list',
  '/lesson/dsa-1/stack',
  '/lesson/dsa-1/queue',
  '/lesson/dsa-1/deque',
  '/lesson/dsa-1/hash-table',
  '/lesson/dsa-1/search-lab',
  '/lesson/dsa-1/sorting-arena',
  '/lesson/dsa-1/binary-search',
  '/lesson/dsa-1/bst',
  '/lesson/dsa-1/strings',
  '/lesson/dsa-2/graph-explorer',
  '/lesson/dbms/query-pipeline',
  '/lesson/operating-systems/cpu-scheduling',
  '/lesson/computer-networks/packet-journey'
] as const;

const viewports = [
  { name: 'desktop-large', width: 1440, height: 900 },
  { name: 'desktop', width: 1280, height: 800 },
  { name: 'tablet', width: 1024, height: 768 },
  { name: 'mobile', width: 390, height: 844 }
] as const;

for (const viewport of viewports) {
  test.describe(viewport.name, () => {
    test.use({ viewport });

    for (const route of routes) {
      test(`${route} loads without console errors or page overflow`, async ({ page }) => {
        const errors: string[] = [];
        page.on('console', (message) => {
          if (message.type() === 'error') errors.push(message.text());
        });
        page.on('pageerror', (error) => errors.push(error.message));

        const response = await page.goto(route, { waitUntil: 'networkidle' });
        expect(response?.ok(), `${route} returned ${response?.status()}`).toBe(true);
        await expect(page.locator('main')).toBeVisible();
        await expect(page.locator('body')).not.toContainText('Internal Error');
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
          `${route} has page-level horizontal overflow`
        ).toBe(true);
        expect(errors, `${route} emitted browser errors`).toEqual([]);

        await expect(page.getByText(/Lock prediction/i)).toHaveCount(0);
        await expect(page.getByText(/AI mentor/i)).toHaveCount(0);
      });
    }
  });
}

for (const route of routes.filter((path) => path.startsWith('/lesson/'))) {
  test(`${route} exposes unrestricted trace controls`, async ({ page }) => {
    await page.goto(route);
    const next = page.getByRole('button', { name: 'Next' });
    await expect(next).toBeVisible();
    await next.click();
    await expect(page.getByRole('button', { name: 'Previous' })).toBeEnabled();
    await expect(page.getByRole('button', { name: 'Restart trace' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeVisible();
    await expect(page.getByLabel('Trace timeline')).toBeVisible();
  });
}
