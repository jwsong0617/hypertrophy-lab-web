import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parseStrongCsv, MAX_FILE_BYTES } from '../src/domain/csv.ts';
import { diagnosis, filterSessions, isWorkSet, muscleSets, summarize, weeklyHistory } from '../src/domain/analytics.ts';
import { demoSessions } from '../src/domain/demo.ts';
import { koreaDay } from '../src/domain/time.ts';
import { emptyData } from '../src/domain/storage.ts';

const input = process.argv[2];
if (!input) { process.stderr.write('사용법: npm run analyze -- data/private/<Strong CSV> 또는 --demo\n원본은 수정하지 않으며 결과는 reports/private/에만 저장합니다.\n'); process.exit(2); }
let result;
try {
  if (input === '--demo') result = { sessions: demoSessions(), audit: null };
  else {
    const bytes = await readFile(resolve(input));
    if (bytes.length > MAX_FILE_BYTES) throw new Error('CSV 10 MB 제한을 초과했습니다.');
    result = parseStrongCsv(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  }
} catch { process.stderr.write('CSV를 읽지 못했습니다. 파일 경로, UTF-8 인코딩, Strong 열 구조를 확인하세요. 개인 데이터는 출력하지 않았습니다.\n'); process.exit(2); }
if (!result.sessions.length) { process.stderr.write('분석 가능한 세션이 없습니다.\n'); process.exit(2); }
const synthetic = input === '--demo';
const stats = summarize(result.sessions); const muscles = muscleSets(result.sessions);
const directory = resolve(synthetic ? 'reports/private/example' : 'reports/private'); await mkdir(directory, { recursive: true });
const label = synthetic ? '합성 예시 · 실제 개인 분석 아님' : '비공개 운동 기록 · 공개 배포 금지';
const recent = [28, 84].map(days => { const rows = filterSessions(result.sessions, days); return { days, summary: summarize(rows), muscles: muscleSets(rows) }; });
const yearly = Object.keys(stats.years).map(year => { const rows = result.sessions.filter(item => item.date.startsWith(year)); return { year, summary: summarize(rows), muscles: muscleSets(rows) }; });
const exercises = [...new Set(result.sessions.flatMap(session => session.sets.filter(isWorkSet).map(set => set.exercise)))].map(name => {
  const matches = result.sessions.filter(session => session.sets.some(set => set.exercise === name && isWorkSet(set)));
  const last = matches.at(-1)!;
  return { name, sessions: matches.length, first: matches[0].date, last: last.date, lastSets: last.sets.filter(set => set.exercise === name && isWorkSet(set)).map(set => ({ weight: set.weight, reps: set.reps, rir: set.rir, rpe: set.rpe })) };
});
const summary = { source: synthetic ? 'synthetic-demo' : 'private-csv', analyzedOn: koreaDay(), timezone: 'Asia/Seoul', summary: stats, audit: result.audit, muscles, weekly: weeklyHistory(result.sessions), recent, yearly, exercises, priorities: diagnosis(result.sessions) };
await writeFile(resolve(directory, 'analysis.json'), JSON.stringify(summary, null, 2));
await writeFile(resolve(directory, 'data-audit.md'), `# 데이터 품질 감사\n\n${label}\n\n분석일 ${koreaDay()} · 한국 시간, 월요일 시작\n\n- 세션 ${stats.sessions}개, 운동일 ${stats.days}일\n- 기록 기간 ${stats.first}–${stats.last}\n- 본세트 ${stats.sets}개\n- RIR 미입력 본세트 ${stats.missingRir}개\n- 미분류 본세트 ${stats.unmappedSets}개\n\n${result.audit ? ['totalRows', 'acceptedRows', 'rejectedRows', 'duplicateRows', 'rest', 'warmup', 'drop', 'cardio', 'timed', 'unknown', 'missingRpe'].map(key => `- ${key}: ${result.audit![key as keyof typeof result.audit]}`).join('\n') : '예시 자료이므로 실제 CSV 품질은 확인하지 않았습니다.'}\n\n원본 수치를 master 문서의 예비 수치에 맞추지 않습니다. 모든 결과는 실제로 읽은 입력에 한정됩니다.\n`);
await writeFile(resolve(directory, 'training-history.md'), `# 훈련 이력\n\n${label}\n\n## 연도별 기록 세션\n\n${Object.entries(stats.years).map(([year, count]) => `- ${year}: ${count}회`).join('\n')}\n\n## 근육별 노출\n\n| 근육 | 직접 본세트 | 간접 노출 |\n|---|---:|---:|\n${muscles.map(item => `| ${item.name} | ${item.direct} | ${item.indirect} |`).join('\n')}\n\n기록 횟수는 실제 운동 전체를 뜻하지 않습니다. 간접 세트는 직접 세트에 더하지 않습니다. 보조량·맨몸·미분류 중량은 톤수에서 제외합니다.\n`);
await writeFile(resolve(directory, 'personal-assessment.md'), `# 기록 기반 점검\n\n${label}\n\n${diagnosis(result.sessions).map((item, index) => `## ${index + 1}. ${item.title}\n\n- 사실: ${item.fact}\n- 가능한 해석: ${item.hypothesis}\n- 다음 행동: ${item.action}\n- 확실성: ${item.confidence}`).join('\n\n')}\n`);
if (!synthetic) await writeFile(resolve(directory, 'app-backup.private.json'), JSON.stringify({ ...emptyData(), sessions: result.sessions, lastAudit: result.audit, importedAt: new Date().toISOString() }, null, 2));
process.stdout.write(`${synthetic ? '합성 예시' : '비공개 입력'} 분석 완료: ${stats.sessions}세션. 결과는 reports/private/${synthetic ? 'example/' : ''}에 저장했으며 원본은 변경하지 않았습니다.\n`);
