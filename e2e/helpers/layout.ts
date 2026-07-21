import { expect, type Locator, type Page } from '@playwright/test';

export async function expectNoPageOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({
    viewport: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.viewport + 1);
}

export async function expectVisibleArea(locator: Locator) {
  await expect(locator).toBeVisible();
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.width).toBeGreaterThan(40);
  expect(box!.height).toBeGreaterThan(40);
}

export async function expectNoUnexpectedIntersections(locators: Locator[], tolerance = 2) {
  const boxes = (
    await Promise.all(
      locators.map(async (locator) => ((await locator.isVisible()) ? locator.boundingBox() : null))
    )
  ).filter((box) => box !== null);

  for (let left = 0; left < boxes.length; left++) {
    for (let right = left + 1; right < boxes.length; right++) {
      const a = boxes[left]!;
      const b = boxes[right]!;
      const overlapWidth = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
      const overlapHeight = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
      expect(
        overlapWidth > tolerance && overlapHeight > tolerance,
        `panels ${left} and ${right} overlap by ${overlapWidth}px × ${overlapHeight}px`
      ).toBe(false);
    }
  }
}
