import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium, devices, expect } from '@playwright/test';

// Use a new browser context and synthetic records only on the public website.
const base = new URL(process.env.SMOKE_BASE_URL || '');
assert.equal(base.protocol, 'https:', 'Production smoke requires HTTPS');
assert.ok(base.pathname.endsWith('/'), 'The deployment URL must end in /');
const output = 'test-results/production-smoke';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const report = { url: base.href, checkedAt: new Date().toISOString(), viewports: [], syntheticImport: false, persistence: false, barbell: false, offline: false };
try {
  for (const mobile of [false, true]) {
    const device = { ...devices['iPhone 13'] }; delete device.defaultBrowserType;
    const context = await browser.newContext(mobile ? device : { viewport: { width: 1440, height: 1000 } });
    const page = await context.newPage();
    const errors = []; const external = []; const writes = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => {
      if (!/^https?:/.test(request.url())) return;
      if (new URL(request.url()).origin !== base.origin) external.push(new URL(request.url()).origin);
      if (!['GET', 'HEAD'].includes(request.method())) writes.push(request.method());
    });
    // A freshly published Pages site may briefly return 404 while the CDN updates.
    for (let attempt = 0; ; attempt++) {
      const response = await page.goto(base.href, { waitUntil: 'domcontentloaded' });
      if (response?.status() === 200) break;
      if (attempt >= 5 || ![404, 502, 503].includes(response?.status())) throw new Error(`Live site returned HTTP ${response?.status()}`);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
    await expect(page.getByText('Strong 기록에서 다음 계획을 만드세요.')).toBeVisible();
    const routes = ['program', 'designer', 'progression', 'review', 'history', 'diagnosis', 'log', 'nutrition', 'research', 'settings'];
    for (const route of routes) {
      await page.goto(`${base.href}#/${route}`);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `Horizontal overflow: ${route}`);
    }
    await page.goto(`${base.href}#/designer`);
    await page.getByRole('button', { name: '3대·OHP 중심', exact: true }).click();
    await page.getByLabel('1번 세트', { exact: true }).fill('4');
    await page.getByRole('button', { name: '이 슬롯 설계 저장', exact: true }).click();
    await page.goto(`${base.href}#/program`);
    await page.getByLabel('미리보기 주차', { exact: true }).selectOption('6');
    await expect(page.locator('.program-table tbody tr').first().locator('td').nth(1)).toHaveText('4');
    await expect(page.locator('.program-table')).toContainText('바벨 스쿼트');
    await expect(page.locator('.program-table')).toContainText('바벨 벤치 프레스');
    await page.locator('.slot-tabs>button').nth(1).click();
    await expect(page.locator('.program-table')).toContainText('데드리프트');
    await expect(page.locator('.program-table')).toContainText('바벨 OHP');
    await expect(page.locator('.program-table tbody tr').filter({ hasText: '카프 레이즈' })).toHaveCount(0);
    await page.screenshot({ path: `${output}/${mobile ? 'mobile' : 'desktop'}-program.png`, fullPage: true });
    report.barbell = true;
    if (!mobile) {
      await page.goto(`${base.href}#/settings`);
      const csv = 'Workout #;Date;Workout Name;Duration (sec);Exercise Name;Set Order;Weight (kg);Reps;RPE;Notes;Workout Notes\n' +
        'PUBLIC-SYNTHETIC-1;2026-10-23 10:00:00;Synthetic;900;Bench Press (Barbell);1;20;8;;;\n' +
        'PUBLIC-SYNTHETIC-2;2026-10-22 10:00:00;Synthetic;900;Squat (Barbell);1;20;8;;;\n';
      await page.getByLabel('Strong CSV 파일', { exact: true }).setInputFiles({ name: 'synthetic-smoke.csv', mimeType: 'text/csv', buffer: Buffer.from(csv) });
      await page.getByRole('button', { name: '2세션 병합', exact: true }).click();
      const count = () => page.evaluate(() => new Promise((resolve, reject) => {
        const request = indexedDB.open('hypertrophy-lab', 1);
        request.onerror = () => reject(new Error('Cannot open local database'));
        request.onsuccess = () => {
          const db = request.result; const read = db.transaction('state').objectStore('state').get('app');
          read.onsuccess = () => { resolve(read.result.sessions.length); db.close(); };
          read.onerror = () => { db.close(); reject(new Error('Cannot read local state')); };
        };
      }));
      await expect.poll(count).toBe(2); report.syntheticImport = true;
      await page.reload(); await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await expect.poll(count).toBe(2); report.persistence = true;
      await page.goto(`${base.href}#/program`);
      await expect(page.locator('.program-table')).toContainText('바벨 스쿼트');
      await page.getByLabel('미리보기 주차', { exact: true }).selectOption('6');
      await expect(page.locator('.program-table tbody tr').first().locator('td').nth(1)).toHaveText('4');
      await page.goto(`${base.href}#/review`);
      await page.getByLabel('결정 이유와 적용할 변경', { exact: true }).fill('Synthetic smoke verification: keep the plan');
      await page.getByRole('button', { name: '주간 검토 저장', exact: true }).click();
      await expect(page.getByText('주간 검토를 저장했습니다. 프로그램은 설계 화면에서 직접 적용하세요.', { exact: true })).toBeVisible();
      await page.goto(`${base.href}#/program`);
      await page.waitForFunction(() => !!navigator.serviceWorker.controller, undefined, { timeout: 30000 });
      await context.setOffline(true); await page.reload();
      await expect(page.getByRole('heading', { name: '내 프로그램', exact: true })).toBeVisible();
      report.offline = true; await context.setOffline(false);
    }
    assert.deepEqual(errors, [], 'Browser runtime errors');
    assert.deepEqual(external, [], 'Unexpected external requests');
    assert.deepEqual(writes, [], 'The app must not upload training data');
    report.viewports.push({ name: mobile ? 'mobile' : 'desktop', routes: routes.length, runtimeErrors: errors.length, externalRequests: external.length, uploadRequests: writes.length });
    await context.close();
  }
  await writeFile(`${output}/result.json`, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
  if (process.env.GITHUB_STEP_SUMMARY) await writeFile(process.env.GITHUB_STEP_SUMMARY, `Live HTTPS verification passed: ${base.href}\n\nDesktop and mobile: all 10 routes, program design edits, barbell plan, weekly review, synthetic CSV import, local persistence, offline app. No runtime errors, external requests, or data uploads.\n`);
} finally { await browser.close(); }
