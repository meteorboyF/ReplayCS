import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const configuredBaseUrl = process.env.REPLAYCS_BASE_URL?.replace(/\/+$/, '');
const baseUrl = configuredBaseUrl || 'http://127.0.0.1:4173';
const outputDirectory = new URL('../static/screenshots/', import.meta.url);
let previewProcess;

async function waitForServer(url, attempts = 60) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // The preview process may still be starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`ReplayCS did not become ready at ${url}.`);
}

async function open(page, path) {
  const response = await page.goto(`${baseUrl}${path}`, { waitUntil: 'networkidle' });
  if (!response?.ok()) throw new Error(`Could not capture ${path}: HTTP ${response?.status()}.`);
}

async function savePage(page, name, fullPage = false) {
  await page.screenshot({
    path: fileURLToPath(new URL(`${name}.png`, outputDirectory)),
    fullPage,
    animations: 'disabled'
  });
}

async function saveLocator(page, selector, name) {
  const locator = page.locator(selector).first();
  await locator.scrollIntoViewIfNeeded();
  await locator.screenshot({
    path: fileURLToPath(new URL(`${name}.png`, outputDirectory)),
    animations: 'disabled'
  });
}

async function saveViewportAt(page, selector, name) {
  await page.locator(selector).first().scrollIntoViewIfNeeded();
  await savePage(page, name);
}

async function captureScreenshots() {
  await mkdir(outputDirectory, { recursive: true });
  const browser = await chromium.launch();

  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
      colorScheme: 'dark',
      reducedMotion: 'reduce'
    });
    const page = await context.newPage();

    await open(page, '/');
    await savePage(page, 'landing');

    await open(page, '/lesson/dsa-1/binary-search?lang=python&step=2');
    await savePage(page, 'binary-search');
    await page.getByLabel('Your prediction').fill('4');
    await page.getByRole('button', { name: 'Lock prediction' }).click();
    await saveLocator(page, 'section.replay', 'replay-my-mistake');
    await page.getByLabel(/Recovery challenge/).fill('3');
    await page.getByRole('button', { name: 'Check recovery' }).click();

    await open(page, '/lesson/dsa-1/sorting-arena');
    await saveLocator(page, 'section.stage', 'sorting-arena');

    await open(page, '/lesson/dbms/query-pipeline?scenario=dhaka-department-capacity&step=3');
    await savePage(page, 'sql-execution');

    await open(page, '/lesson/operating-systems/cpu-scheduling');
    await saveLocator(page, 'section.scheduler-stage', 'cpu-scheduling');

    await open(page, '/lesson/computer-networks/packet-journey');
    await saveViewportAt(page, 'section.timeline-section', 'packet-journey');

    await open(page, '/progress');
    await savePage(page, 'progress-dashboard');

    await open(page, '/challenges');
    const challengeHeading = page.getByRole('heading', {
      name: 'Five subjects. No lucky guesses.'
    });
    if (await challengeHeading.isVisible()) {
      await savePage(page, 'challenge-arena');
    } else if (process.env.REQUIRE_CHALLENGE_ARENA === '1') {
      throw new Error('Challenge Arena capture failed: functional heading was not found.');
    } else {
      console.warn('Functional Challenge Arena is not available yet; skipped challenge-arena.png.');
    }

    const judgeResponse = await page.goto(`${baseUrl}/judge-demo`, { waitUntil: 'networkidle' });
    if (judgeResponse?.ok()) {
      await savePage(page, 'judge-demo');
    } else if (process.env.REQUIRE_JUDGE_DEMO === '1') {
      throw new Error(`Judge Demo capture failed: HTTP ${judgeResponse?.status()}.`);
    } else {
      console.warn('Judge Demo is not available yet; skipped judge-demo.png.');
    }

    console.log(`Captured ReplayCS screenshots in ${outputDirectory.pathname}`);
  } finally {
    await browser.close();
  }
}

try {
  if (!configuredBaseUrl) {
    previewProcess = spawn(
      process.execPath,
      [
        'node_modules/vite/bin/vite.js',
        'preview',
        '--host',
        '127.0.0.1',
        '--port',
        '4173',
        '--strictPort'
      ],
      { stdio: 'inherit' }
    );
    await waitForServer(baseUrl);
  }
  await captureScreenshots();
} finally {
  previewProcess?.kill('SIGTERM');
}
