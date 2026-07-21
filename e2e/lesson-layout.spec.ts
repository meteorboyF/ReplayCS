import { expect, test } from '@playwright/test';
import {
  expectNoPageOverflow,
  expectNoUnexpectedIntersections,
  expectVisibleArea
} from './helpers/layout';

const sharedWorkspaceRoutes = [
  '/lesson/dsa-1/arrays',
  '/lesson/dsa-1/linked-list',
  '/lesson/dsa-1/stack',
  '/lesson/dsa-1/queue',
  '/lesson/dsa-1/deque',
  '/lesson/dsa-1/hash-table',
  '/lesson/dsa-1/search-lab',
  '/lesson/dsa-1/bst',
  '/lesson/dsa-1/strings',
  '/lesson/dsa-1/recursion'
] as const;

const viewports = [
  { name: 'desktop-large', width: 1440, height: 900 },
  { name: 'desktop', width: 1280, height: 800 },
  { name: 'tablet-landscape', width: 1024, height: 768 },
  { name: 'tablet-portrait', width: 768, height: 1024 },
  { name: 'mobile', width: 390, height: 844 }
] as const;

for (const viewport of viewports) {
  test.describe(`shared lesson layout · ${viewport.name}`, () => {
    test.use({ viewport });

    for (const route of sharedWorkspaceRoutes) {
      test(`${route} contains visible, non-overlapping primary panels`, async ({ page }) => {
        await page.goto(route);
        await expectNoPageOverflow(page);

        const toolbar = page.getByTestId('lesson-operation-toolbar');
        const playback = page.getByTestId('lesson-playback-controls');
        await expectVisibleArea(toolbar);
        await expectVisibleArea(playback);

        const panels = [
          page.getByTestId('lesson-code-panel'),
          page.getByTestId('lesson-visual-panel'),
          page.getByTestId('lesson-state-panel'),
          page.getByTestId('lesson-complexity-panel')
        ];
        const visiblePanels = viewport.width <= 680 ? [panels[1]] : panels;
        for (const panel of visiblePanels) await expectVisibleArea(panel);
        await expectNoUnexpectedIntersections([...visiblePanels, toolbar, playback]);

        if (viewport.width <= 680) {
          await page.getByRole('tab', { name: 'Code' }).click();
          await expect(page.locator('[aria-label="Source code"] .active')).toBeVisible();
          for (const tab of ['Code', 'State', 'Complexity']) {
            await page.getByRole('tab', { name: tab }).click();
            await expectVisibleArea(page.getByTestId(`lesson-${tab.toLowerCase()}-panel`));
          }
        } else {
          await expect(page.locator('[aria-label="Source code"] .active')).toBeVisible();
        }
      });
    }
  });
}

const screenshotRoutes = [
  ['linked-list', '/lesson/dsa-1/linked-list'],
  ['arrays', '/lesson/dsa-1/arrays'],
  ['stack', '/lesson/dsa-1/stack'],
  ['queue', '/lesson/dsa-1/queue'],
  ['hash-table', '/lesson/dsa-1/hash-table'],
  ['sorting', '/lesson/dsa-1/sorting-arena'],
  ['bst', '/lesson/dsa-1/bst'],
  ['graph', '/lesson/dsa-2/graph-explorer'],
  ['sql-pipeline', '/lesson/dbms/query-pipeline'],
  ['cpu-scheduling', '/lesson/operating-systems/cpu-scheduling'],
  ['packet-journey', '/lesson/computer-networks/packet-journey']
] as const;

test.describe('layout audit screenshots', () => {
  test.use({ viewport: { width: 1280, height: 800 } });
  for (const [name, route] of screenshotRoutes) {
    test(`${name} produces a contained audit capture`, async ({ page }, testInfo) => {
      await page.goto(route);
      await expectNoPageOverflow(page);
      await testInfo.attach(`${name}-1280x800`, {
        body: await page.screenshot({ fullPage: false }),
        contentType: 'image/png'
      });
    });
  }
});
