import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { csv } from '../helpers.ts';
import { addDays, koreaDay } from '../../src/domain/time.ts';

async function go(page: Page, path: string) { await page.goto(`./#/${path}`); await expect(page.getByRole('heading', { level: 1 })).toBeVisible(); }
async function stored(page: Page) {
  return page.evaluate(async () => new Promise<{ sessions: { sets: { rir: number | null }[] }[]; profile: { weight: number | null }; checkIns: unknown[] }>((resolve, reject) => {
    const request = indexedDB.open('hypertrophy-lab', 1);
    request.onerror = () => reject(new Error('Cannot read database'));
    request.onsuccess = () => { const database = request.result; const get = database.transaction('state').objectStore('state').get('app'); get.onsuccess = () => { resolve(get.result); database.close(); }; };
  }));
}
test('first run, separate demo, all views and responsive navigation', async ({ page }, info) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await go(page, 'overview');
  await expect(page.getByText('당신의 기록에서 시작하세요.')).toBeVisible();
  await page.getByRole('button', { name: '예시 둘러보기', exact: true }).click();
  await expect(page.getByText('예시 모드', { exact: true })).toBeVisible();
  await page.screenshot({ path: info.outputPath('dashboard-demo.png'), fullPage: true });
  for (const path of ['history', 'diagnosis', 'program', 'log', 'nutrition', 'research', 'settings']) {
    await go(page, path);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), `Horizontal overflow: ${path}`).toBe(true);
    if (path === 'research') {
      await expect(page.locator('.evidence-card')).toHaveCount(22);
      await page.getByRole('button', { name: '영양', exact: true }).click();
      await expect(page.locator('.evidence-card')).toHaveCount(7);
      await page.getByRole('button', { name: '회복', exact: true }).click();
      await expect(page.locator('.evidence-card')).toHaveCount(3);
    }
  }
  expect((await stored(page)).sessions).toHaveLength(0);
  if (info.project.name === 'mobile') { await page.getByRole('button', { name: '메뉴 열기' }).click(); await page.getByRole('link', { name: '대시보드', exact: true }).click(); await expect(page.getByRole('heading', { name: '작은 기록, 꾸준한 성장.' })).toBeVisible(); }
  expect(errors).toEqual([]);
});
test('private CSV import, deduplication, persistence, backup, clear and restore', async ({ page }) => {
  const outbound: string[] = [];
  page.on('request', request => { if (/^https?:/.test(request.url()) && !request.url().startsWith('http://127.0.0.1:4173/')) outbound.push(request.url()); });
  const fixture = { name: 'synthetic-training.csv', mimeType: 'text/csv', buffer: Buffer.from(csv([
    { Date: `${koreaDay()} 09:00:00`, Notes: '__PRIVATE_TEST_RECORD__' },
    { 'Workout #': 'SYNTHETIC-2', Date: `${addDays(koreaDay(), -2)} 09:00:00`, 'Exercise Name': 'Lat Pulldown', 'Weight (kg)': '30' },
  ])) };
  await go(page, 'settings');
  await page.getByLabel('Strong CSV 파일', { exact: true }).setInputFiles(fixture);
  await expect(page.getByRole('heading', { name: '가져오기 전 확인' })).toBeVisible();
  await page.getByRole('button', { name: '2세션 병합', exact: true }).click();
  await expect.poll(async () => (await stored(page)).sessions.length).toBe(2);
  await page.getByLabel('Strong CSV 파일', { exact: true }).setInputFiles(fixture);
  await page.getByRole('button', { name: '2세션 병합', exact: true }).click();
  await go(page, 'history');
  await expect(page.locator('.session-details')).toHaveCount(2);
  await page.reload(); await expect(page.locator('.session-details')).toHaveCount(2);
  await go(page, 'settings');
  await page.getByLabel('체중 (kg)', { exact: true }).fill('60');
  await page.getByRole('button', { name: '프로필 저장', exact: true }).click();
  await expect.poll(async () => (await stored(page)).profile.weight).toBe(60);
  const downloadEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: /^전체 JSON 백업/ }).click();
  const download = await downloadEvent; const contents = await readFile((await download.path())!, 'utf8');
  expect(JSON.parse(contents).sessions).toHaveLength(2);
  expect(contents).toContain('__PRIVATE_TEST_RECORD__');
  await page.getByRole('button', { name: '이 기기의 모든 개인 데이터 삭제', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: '모든 개인 데이터 삭제', exact: true }).click();
  await expect.poll(async () => (await stored(page)).sessions.length).toBe(0);
  await page.reload();
  expect((await stored(page)).profile.weight).toBeNull();
  await page.getByLabel('JSON 백업 파일', { exact: true }).setInputFiles({ name: 'synthetic-backup.json', mimeType: 'application/json', buffer: Buffer.from(contents) });
  await page.getByRole('button', { name: '백업으로 전체 복원', exact: true }).click();
  await expect.poll(async () => (await stored(page)).sessions.length).toBe(2);
  expect((await stored(page)).profile.weight).toBe(60);
  expect(outbound).toEqual([]);
});
test('logs only performed sets, preserves null RIR, timer and symptom stop', async ({ page }) => {
  await go(page, 'log');
  await page.getByRole('button', { name: '90초', exact: true }).click();
  await expect(page.getByRole('timer')).toHaveText(/1:(30|29)/);
  await page.getByRole('button', { name: '타이머 일시정지', exact: true }).click();
  await page.getByLabel('운동 중단이 필요한 증상', { exact: true }).check();
  await expect(page.getByRole('button', { name: '운동 완료 · 기록 저장', exact: true })).toBeDisabled();
  await page.getByLabel('운동 중단이 필요한 증상', { exact: true }).uncheck();
  await page.getByLabel('레그 프레스 1세트 중량', { exact: true }).fill('50');
  await page.getByLabel('레그 프레스 1세트 반복수', { exact: true }).fill('10');
  await page.getByRole('button', { name: '운동 완료 · 기록 저장', exact: true }).click();
  await expect(page.getByRole('heading', { name: '작은 기록, 꾸준한 성장.' })).toBeVisible();
  await expect.poll(async () => (await stored(page)).sessions.length).toBe(1);
  const state = await stored(page); expect(state.sessions[0].sets).toHaveLength(1); expect(state.sessions[0].sets[0].rir).toBeNull();
});
test('program switching and real body check-ins feed targets without invented trends', async ({ page }) => {
  await go(page, 'program');
  await page.getByRole('button', { name: '주 2회', exact: true }).click();
  await expect(page.locator('.slot-tabs>button')).toHaveCount(2);
  await page.getByRole('button', { name: '주 4회', exact: true }).click();
  await expect(page.locator('.slot-tabs>button')).toHaveCount(4);
  await page.getByRole('button', { name: '압축 25–35분', exact: true }).click();
  await expect(page.locator('.program-table tbody tr')).toHaveCount(4);
  await go(page, 'nutrition');
  await page.getByLabel('체크인 체중 (kg)', { exact: true }).fill('60');
  await page.getByLabel('체크인 수면 (시간)', { exact: true }).fill('7');
  await page.getByRole('button', { name: '체크인 저장', exact: true }).click();
  await expect.poll(async () => (await stored(page)).checkIns.length).toBe(1);
  await expect(page.locator('.metric-value').first()).toContainText('96–132');
});
test('built app works offline under its GitHub Pages subpath', async ({ page, context }) => {
  await go(page, 'overview');
  await page.waitForFunction(() => !!navigator.serviceWorker.controller, undefined, { timeout: 20_000 });
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: '작은 기록, 꾸준한 성장.' })).toBeVisible();
  await expect(page.getByText('당신의 기록에서 시작하세요.')).toBeVisible();
  await context.setOffline(false);
});
test('barbell preference and optional accessories persist into actual logging', async ({ page }) => {
  await go(page, 'program');
  await page.getByRole('button', { name: '3대·OHP 중심', exact: true }).click();
  await expect(page.locator('.program-table')).toContainText('바벨 스쿼트');
  await expect(page.locator('.program-table')).toContainText('바벨 벤치 프레스');
  await page.locator('.slot-tabs>button').nth(1).click();
  await expect(page.locator('.program-table')).toContainText('바벨 OHP');
  await expect(page.locator('.program-table')).toContainText('데드리프트');
  await expect(page.locator('.program-table tbody tr').filter({ hasText: '카프 레이즈' })).toHaveCount(0);
  await page.getByRole('checkbox', { name: /^카프 레이즈 추가/ }).check();
  await expect(page.locator('.program-table tbody tr').filter({ hasText: '카프 레이즈' })).toHaveCount(1);
  await page.getByRole('checkbox', { name: /^카프 레이즈 추가/ }).uncheck();
  await page.locator('.slot-tabs>button').nth(2).click();
  await expect(page.locator('.program-table tbody tr').filter({ hasText: '머신 힙 스러스트' })).toHaveCount(0);
  await page.getByRole('checkbox', { name: /^힙 스러스트 추가/ }).check();
  await expect(page.locator('.program-table tbody tr').filter({ hasText: '머신 힙 스러스트' })).toHaveCount(1);
  await page.reload();
  await expect(page.getByRole('button', { name: '3대·OHP 중심', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: '운동 시작', exact: true }).click();
  await page.getByLabel('바벨 스쿼트 1세트 중량', { exact: true }).fill('20');
  await page.getByLabel('바벨 스쿼트 1세트 반복수', { exact: true }).fill('8');
  await page.getByRole('button', { name: '운동 완료 · 기록 저장', exact: true }).click();
  await expect.poll(async () => (await stored(page)).sessions.length).toBe(1);
});
