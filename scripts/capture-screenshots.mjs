import { chromium } from '@playwright/test';
import { once } from 'node:events';
import { mkdir } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const configuredBaseUrl = process.env.REPLAYCS_BASE_URL?.replace(/\/+$/, '');
const baseUrl = configuredBaseUrl || 'http://127.0.0.1:4173';
const outputDirectory = new URL('../static/screenshots/', import.meta.url);
let previewProcess;

async function responds(url) {
  try {
    const response = await fetch(url, { redirect: 'manual' });
    return response.status > 0;
  } catch {
    return false;
  }
}

async function waitForServer(url, process, attempts = 60) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (process.exitCode !== null) {
      throw new Error(`ReplayCS preview exited with code ${process.exitCode} before it was ready.`);
    }
    if (await responds(url)) return;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`ReplayCS did not become ready at ${url}.`);
}

function waitForProcessExit(process, timeoutMs) {
  return new Promise((resolve) => {
    let timeoutId;
    const finish = (exited) => {
      clearTimeout(timeoutId);
      process.off('exit', onExit);
      resolve(exited);
    };
    const onExit = () => finish(true);

    process.once('exit', onExit);
    timeoutId = setTimeout(() => finish(false), timeoutMs);
  });
}

async function stopPreviewProcess(process) {
  if (!process || process.exitCode !== null) return;

  const exitedAfterTerm = waitForProcessExit(process, 5_000);
  process.kill('SIGTERM');
  if (await exitedAfterTerm) return;

  if (process.exitCode === null) {
    const forcedExit = once(process, 'exit');
    process.kill('SIGKILL');
    await forcedExit;
  }
}

async function open(page, path, heading) {
  const response = await page.goto(`${baseUrl}${path}`, { waitUntil: 'domcontentloaded' });
  if (!response?.ok()) throw new Error(`Could not capture ${path}: HTTP ${response?.status()}.`);
  await page.getByRole('heading', { name: heading, level: 1 }).waitFor({ state: 'visible' });
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
  const captured = [];

  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
      colorScheme: 'dark',
      reducedMotion: 'reduce'
    });
    const page = await context.newPage();

    await open(page, '/', /Pause computer science\.\s*Trace every state\./i);
    await savePage(page, 'landing');
    captured.push('landing.png');

    await open(page, '/lesson/dsa-1/binary-search?lang=python&step=2', 'Binary Search');
    await savePage(page, 'binary-search');
    captured.push('binary-search.png');
    await page.getByLabel('Your prediction').fill('4');
    await page.getByRole('button', { name: 'Lock prediction' }).click();
    await saveLocator(page, 'section.replay', 'replay-my-mistake');
    captured.push('replay-my-mistake.png');
    await page.getByLabel(/Recovery challenge/).fill('3');
    await page.getByRole('button', { name: 'Check recovery' }).click();

    await open(page, '/lesson/dsa-1/sorting-arena', 'Sorting Arena');
    await saveLocator(page, 'section.stage', 'sorting-arena');
    captured.push('sorting-arena.png');

    await open(page, '/lesson/dsa-2/graph-explorer', 'Graph Explorer');
    await savePage(page, 'graph-explorer');
    captured.push('graph-explorer.png');

    await open(
      page,
      '/lesson/dbms/query-pipeline?scenario=dhaka-department-capacity&step=3',
      'SQL Query Pipeline'
    );
    await page
      .locator('section.checkpoint')
      .getByRole('button', { name: /^HAVING/ })
      .click();
    await savePage(page, 'sql-execution');
    captured.push('sql-execution.png');

    await open(page, '/lesson/operating-systems/cpu-scheduling', 'CPU Scheduling Arena');
    await saveLocator(page, 'section.scheduler-stage', 'cpu-scheduling');
    captured.push('cpu-scheduling.png');

    await open(page, '/lesson/computer-networks/packet-journey', 'Packet Journey');
    await saveViewportAt(page, 'section.timeline-section', 'packet-journey');
    captured.push('packet-journey.png');

    await open(page, '/progress', /Level \d+ tracer/);
    await savePage(page, 'progress-dashboard');
    captured.push('progress-dashboard.png');

    await open(page, '/challenges', 'Five subjects. No lucky guesses.');
    await savePage(page, 'challenge-arena');
    captured.push('challenge-arena.png');

    await open(page, '/judge-demo', /judge path through real execution/i);
    await savePage(page, 'judge-demo');
    captured.push('judge-demo.png');

    console.log(
      `Captured ${captured.length} live ReplayCS screens in ${fileURLToPath(outputDirectory)}:\n${captured.join('\n')}`
    );
  } finally {
    await browser.close();
  }
}

try {
  if (!configuredBaseUrl) {
    if (await responds(baseUrl)) {
      throw new Error(
        `${baseUrl} is already serving another process. Stop it before capturing, or set REPLAYCS_BASE_URL explicitly.`
      );
    }
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
    await waitForServer(baseUrl, previewProcess);
  }
  await captureScreenshots();
} finally {
  await stopPreviewProcess(previewProcess);
}
