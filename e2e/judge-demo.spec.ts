import { expect, test } from '@playwright/test';

const stages = [
  {
    id: 'binary-search',
    name: 'Open Binary Search',
    href: '/lesson/dsa-1/binary-search?values=2%2C5%2C8%2C12%2C16%2C23%2C38%2C56&target=23&lang=python&step=2',
    heading: 'Binary Search'
  },
  {
    id: 'sql-pipeline',
    name: 'Open SQL Pipeline',
    href: '/lesson/dbms/query-pipeline?scenario=dhaka-department-capacity&step=3',
    heading: 'SQL Query Pipeline'
  },
  {
    id: 'cpu-scheduling',
    name: 'Open CPU Scheduling',
    href: '/lesson/operating-systems/cpu-scheduling#algorithm-heading',
    heading: 'CPU Scheduling Arena'
  },
  {
    id: 'packet-journey',
    name: 'Open Packet Journey',
    href: '/lesson/computer-networks/packet-journey#timeline-heading',
    heading: 'Packet Journey'
  },
  {
    id: 'progress',
    name: 'Open Progress',
    href: '/progress',
    heading: /Level 1 tracer/
  }
] as const;

test('presents a truthful five-stop path with persistent checklist progress', async ({ page }) => {
  await page.goto('/judge-demo');

  await expect(
    page.getByRole('heading', { name: /judge path through real execution/i })
  ).toBeVisible();
  await expect(page.getByTestId('judge-demo-stage')).toHaveCount(5);
  await expect(
    page.getByText('GPT-5.6 when configured; deterministic fallback when not.')
  ).toBeVisible();

  for (const stage of stages) {
    await expect(page.getByRole('link', { name: new RegExp(stage.name) })).toHaveAttribute(
      'href',
      stage.href
    );
  }

  const checks = page.getByRole('checkbox');
  await expect(checks).toHaveCount(5);
  for (let index = 0; index < 5; index++) await checks.nth(index).check();

  await expect(
    page.getByText('Tour verified. The product routes remain open for deeper judging.')
  ).toBeVisible();
  await page.reload();
  for (let index = 0; index < 5; index++) await expect(checks.nth(index)).toBeChecked();
});

test('every guided link resolves to a real product screen without an API key', async ({ page }) => {
  for (const stage of stages) {
    await page.goto(stage.href);
    await expect(page.getByRole('heading', { name: stage.heading, level: 1 })).toBeVisible();
  }

  await page.goto(stages[0].href);
  await page.getByRole('button', { name: 'Explain this step' }).click();
  await expect(page.getByText('Deterministic', { exact: true })).toBeVisible();
  await expect(
    page.getByText('AI is not configured, so ReplayCS used its deterministic explanation.')
  ).toBeVisible();
});

test('landing page and mobile navigation expose the judge route', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');

  await expect(page.getByRole('link', { name: 'Judge demo · 3 min' })).toHaveAttribute(
    'href',
    '/judge-demo'
  );
  await expect(
    page.getByRole('navigation').getByRole('link', { name: 'Judge Demo' })
  ).toBeVisible();
});
