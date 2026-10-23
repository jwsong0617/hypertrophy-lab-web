import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import type { AppData } from '../../src/domain/types.ts';
import { readFile } from 'node:fs/promises';
import { csv } from '../helpers.ts';
import { addDays, koreaDay } from '../../src/domain/time.ts';

async function go(page: Page, path: string) { await page.goto(`./#/${path}`); await expect(page.getByRole('heading', { level: 1 })).toBeVisible(); }
async function stored(page: Page) {
  return page.evaluate(async () => new Promise<AppData>((resolve, reject) => {
    const request = indexedDB.open('hypertrophy-lab', 1);
    request.onerror = () => reject(new Error('Cannot read database'));
    request.onsuccess = () => { const database = request.result; const get = database.transaction('state').objectStore('state').get('app'); get.onsuccess = () => { resolve(get.result); database.close(); }; };
  }));
}
test('first run, separate demo, all views and responsive navigation', async ({ page }, info) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await go(page, 'program');
  await expect(page.getByText('Strong 기록에서 다음 계획을 만드세요.')).toBeVisible();
  await page.getByRole('button', { name: '예시 둘러보기', exact: true }).click();
  await expect(page.getByText('예시 모드', { exact: true })).toBeVisible();
  await page.screenshot({ path: info.outputPath('dashboard-demo.png'), fullPage: true });
  for (const path of ['designer', 'progression', 'review', 'history', 'diagnosis', 'program', 'log', 'nutrition', 'research', 'settings']) {
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
  if (info.project.name === 'mobile') { await page.getByRole('button', { name: '메뉴 열기' }).click(); await page.getByRole('link', { name: '내 프로그램', exact: true }).click(); await expect(page.getByRole('heading', { name: '내 프로그램', exact: true })).toBeVisible(); }
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
  await expect(page.getByRole('heading', { name: '내 프로그램', exact: true })).toBeVisible();
  await expect.poll(async () => (await stored(page)).sessions.length).toBe(1);
  const state = await stored(page); expect(state.sessions[0].sets).toHaveLength(1); expect(state.sessions[0].sets[0].rir).toBeNull();
});
test('program switching and real body check-ins feed targets without invented trends', async ({ page }) => {
  await go(page, 'designer');
  await page.getByRole('button', { name: '주 2회', exact: true }).click();
  await expect(page.locator('.slot-tabs>button')).toHaveCount(2);
  await page.getByRole('button', { name: '주 4회', exact: true }).click();
  await expect(page.locator('.slot-tabs>button')).toHaveCount(4);
  await page.getByRole('button', { name: '압축 25–35분', exact: true }).click();
  await expect(page.locator('.editor-row')).toHaveCount(4);
  await go(page, 'nutrition');
  await page.getByLabel('체크인 체중 (kg)', { exact: true }).fill('60');
  await page.getByLabel('체크인 수면 (시간)', { exact: true }).fill('7');
  await page.getByRole('button', { name: '체크인 저장', exact: true }).click();
  await expect.poll(async () => (await stored(page)).checkIns.length).toBe(1);
  await expect(page.locator('.metric-value').first()).toContainText('96–132');
});
test('built app works offline under its GitHub Pages subpath', async ({ page, context }) => {
  await go(page, 'program');
  await page.waitForFunction(() => !!navigator.serviceWorker.controller, undefined, { timeout: 20_000 });
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: '내 프로그램', exact: true })).toBeVisible();
  await expect(page.getByText('Strong 기록에서 다음 계획을 만드세요.')).toBeVisible();
  await context.setOffline(false);
});
test('barbell preference and optional accessories persist into actual logging', async ({ page }) => {
  await go(page, 'designer');
  await page.getByRole('button', { name: '3대·OHP 중심', exact: true }).click();
  await expect(page.locator('.editor-row-heading>strong').filter({ hasText: '바벨 스쿼트' })).toHaveCount(1);
  await expect(page.locator('.editor-row-heading>strong').filter({ hasText: '바벨 벤치 프레스' })).toHaveCount(1);
  await page.locator('.slot-tabs>button').nth(1).click();
  await expect(page.locator('.editor-row-heading>strong').filter({ hasText: '바벨 OHP' })).toHaveCount(1);
  await expect(page.locator('.editor-row-heading>strong').filter({ hasText: '데드리프트' })).toHaveCount(1);
  await expect(page.locator('.editor-row-heading>strong').filter({ hasText: '카프 레이즈' })).toHaveCount(0);
  await page.getByRole('checkbox', { name: /^카프 레이즈 추가/ }).check();
  await expect(page.locator('.editor-row-heading>strong').filter({ hasText: '카프 레이즈' })).toHaveCount(1);
  await page.getByRole('checkbox', { name: /^카프 레이즈 추가/ }).uncheck();
  await page.locator('.slot-tabs>button').nth(2).click();
  await expect(page.locator('.editor-row-heading>strong').filter({ hasText: '머신 힙 스러스트' })).toHaveCount(0);
  await page.getByRole('checkbox', { name: /^힙 스러스트 추가/ }).check();
  await expect(page.locator('.editor-row-heading>strong').filter({ hasText: '머신 힙 스러스트' })).toHaveCount(1);
  await page.reload();
  await expect(page.getByRole('button', { name: '3대·OHP 중심', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await go(page, 'log');
  await page.getByLabel('바벨 스쿼트 1세트 중량', { exact: true }).fill('20');
  await page.getByLabel('바벨 스쿼트 1세트 반복수', { exact: true }).fill('8');
  await page.getByRole('button', { name: '운동 완료 · 기록 저장', exact: true }).click();
  await expect.poll(async () => (await stored(page)).sessions.length).toBe(1);
});
test('saved design and weekly decisions survive profile editing and JSON backup', async ({ page }, info) => {
  await go(page, 'designer');
  await page.getByRole('button', { name: '3대·OHP 중심', exact: true }).click();
  await page.getByLabel('1번 종목', { exact: true }).selectOption('goblet-squat');
  await page.getByLabel('1번 세트', { exact: true }).fill('4');
  await page.getByRole('button', { name: '이 슬롯 설계 저장', exact: true }).click();
  await expect.poll(async () => Object.keys((await stored(page)).profile.customPlans ?? {}).length).toBe(1);
  await go(page, 'program');
  await page.getByLabel('미리보기 주차', { exact: true }).selectOption('6');
  const row = page.locator('.program-table tbody tr').first();
  await expect(row).toContainText('덤벨 스쿼트');
  await expect(row.locator('td').nth(1)).toHaveText('4');
  const planDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: '계획표 내려받기', exact: true }).click();
  const plan = await planDownload;
  expect(await readFile((await plan.path())!, 'utf8')).toContain('실제 수행 기록이 아닙니다');
  await page.screenshot({ path: info.outputPath('planning-program.png'), fullPage: true });
  await go(page, 'review');
  await page.getByLabel('결정 이유와 적용할 변경', { exact: true }).fill('이번 주 계획을 유지하고 같은 기구로 수행 확인');
  await page.getByRole('button', { name: '주간 검토 저장', exact: true }).click();
  await expect.poll(async () => (await stored(page)).reviews?.length).toBe(1);
  await go(page, 'settings');
  await page.getByRole('button', { name: '프로필 저장', exact: true }).click();
  const downloadEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: /^전체 JSON 백업/ }).click();
  const download = await downloadEvent; const backup = await readFile((await download.path())!, 'utf8');
  expect(Object.keys(JSON.parse(backup).profile.customPlans)).toHaveLength(1);
  expect(JSON.parse(backup).reviews).toHaveLength(1);
  await page.reload();
  expect(Object.keys((await stored(page)).profile.customPlans ?? {})).toHaveLength(1);
  await go(page, 'designer');
  await expect(page.getByLabel('1번 종목', { exact: true })).toHaveValue('goblet-squat');
  await expect(page.getByLabel('1번 세트', { exact: true })).toHaveValue('4');
  await expect(page.locator('.rationale-grid a')).not.toHaveCount(0);
});
test('imported English records need source confirmation and current readiness for progression', async ({ page }) => {
  await go(page, 'designer');
  await page.getByRole('button', { name: '3대·OHP 중심', exact: true }).click();
  await go(page, 'settings');
  const fixture = { name: 'synthetic-progression.csv', mimeType: 'text/csv', buffer: Buffer.from(csv([-2, -5].map((offset, index) => ({ 'Workout #': `PROGRESSION-${index}`, Date: `${addDays(koreaDay(), offset)} 09:00:00`, Reps: '10', RIR: '4' })))) };
  await page.getByLabel('Strong CSV 파일', { exact: true }).setInputFiles(fixture);
  await page.getByRole('button', { name: '2세션 병합', exact: true }).click();
  await go(page, 'progression');
  await page.getByLabel('검토용 오늘 통증 (0–10)', { exact: true }).fill('0');
  await page.getByLabel('검토용 오늘 피로 (1–5)', { exact: true }).fill('2');
  await page.getByLabel('검토용 지난밤 수면 (시간)', { exact: true }).fill('8');
  await page.getByRole('checkbox', { name: /^필요한 운동 허용 범위를 확인/ }).check();
  await page.getByRole('button', { name: '오늘의 확인 저장', exact: true }).click();
  const bench = page.locator('.progression-card').filter({ has: page.getByRole('heading', { name: '바벨 벤치 프레스', exact: true }) });
  await expect(bench.locator('.progression-advice')).not.toContainText('41 kg');
  await bench.getByLabel('바벨 벤치 프레스 기록 연결', { exact: true }).selectOption('Bench Press (Barbell)');
  await bench.getByRole('checkbox', { name: /^현재 동작·기구/ }).check();
  await bench.getByRole('button', { name: '기록 연결 저장', exact: true }).click();
  await expect(bench.locator('.progression-advice')).toContainText('41 kg');
  await page.reload();
  await expect(bench.locator('.progression-advice')).toContainText('41 kg');
  await page.getByLabel('검토용 오늘 통증 (0–10)', { exact: true }).fill('5');
  await page.getByRole('button', { name: '오늘의 확인 저장', exact: true }).click();
  await expect(bench.locator('.progression-advice')).toContainText('통증이 있는 동작은 중단');
  await expect(bench.locator('.progression-advice')).not.toContainText('41 kg');
});
