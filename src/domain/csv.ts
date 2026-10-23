import Papa from 'papaparse';
import { findExercise } from './exercises.ts';
import { parseStrongDate } from './time.ts';
import type { ImportAudit, ImportResult, Session, SetKind, TrainingSet } from './types.ts';

export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export function numeric(value: string, name: string, maximum: number, integer = false): number | null {
  if (!value.trim()) return null;
  const normalized = value.trim().replace(',', '.');
  if (!/^\d+(?:\.\d+)?$/.test(normalized)) throw new Error(`${name}: 유효하지 않은 숫자`);
  const number = Number(normalized);
  if (!Number.isFinite(number) || number < 0 || number > maximum || (integer && !Number.isInteger(number))) throw new Error(`${name}: 허용 범위 밖`);
  return number;
}
export function classifySet(order: string, exercise: string, reps: number | null, distance: number | null, seconds: number | null): SetKind {
  const tag = order.trim().toLowerCase();
  if (tag === 'rest timer') return 'rest';
  const mapped = findExercise(exercise);
  if (mapped?.load === 'cardio' || ((distance ?? 0) > 0 && !reps)) return 'cardio';
  if ((seconds ?? 0) > 0 && !reps) return mapped?.load === 'timed' || mapped?.direct.includes('core') ? 'timed' : 'cardio';
  if (tag === 'w') return 'warmup';
  if (tag === 'd') return 'drop';
  if (/^\d+$/.test(tag) && Number(tag) > 0) return 'work';
  return 'unknown';
}
export function parseStrongCsv(input: string): ImportResult {
  if (new TextEncoder().encode(input).length > MAX_FILE_BYTES) throw new Error('CSV는 10 MB 이하로 나누어 가져와 주세요.');
  const raw = input.replace(/^\uFEFF/, '');
  const delimiter = raw.split(/\r?\n/, 1)[0]?.includes(';') ? ';' : ',';
  const parsed = Papa.parse<string[]>(raw, { delimiter, skipEmptyLines: 'greedy' });
  if (parsed.errors.length) throw new Error('CSV 따옴표 또는 행 구조를 확인해 주세요. UTF-8 Strong 내보내기 파일이 필요합니다.');
  if (parsed.data.length < 2) throw new Error('헤더와 최소 한 행의 기록이 필요합니다.');
  if (parsed.data.length > 50_001) throw new Error('한 번에 최대 50,000행을 가져올 수 있습니다.');
  const headers = parsed.data[0].map(header => header.trim());
  if (new Set(headers).size !== headers.length) throw new Error('CSV에 같은 이름의 열이 중복되어 있습니다.');
  for (const required of ['Workout #', 'Date', 'Exercise Name', 'Set Order']) {
    if (!headers.includes(required)) throw new Error(`필수 열이 없습니다: ${required}`);
  }
  const audit: ImportAudit = { totalRows: parsed.data.length - 1, acceptedRows: 0, rejectedRows: 0, duplicateRows: 0, rest: 0, warmup: 0, drop: 0, cardio: 0, timed: 0, unknown: 0, missingRpe: 0, missingLoad: 0, unmapped: [], issues: [], delimiter };
  const sessions = new Map<string, Session>();
  const seen = new Set<string>();
  const unmapped = new Set<string>();
  for (const [index, row] of parsed.data.slice(1).entries()) {
    const rowNumber = index + 2;
    const field = (name: string) => (row[headers.indexOf(name)] ?? '').trim();
    try {
      if (row.length !== headers.length) throw new Error('헤더와 열 수가 다릅니다.');
      const sourceId = field('Workout #');
      const date = parseStrongDate(field('Date'));
      const exercise = field('Exercise Name');
      const order = field('Set Order');
      if (!sourceId || sourceId.length > 200) throw new Error('유효한 Workout #가 필요합니다.');
      if (!date) throw new Error('유효하지 않거나 지원하지 않는 날짜입니다. YYYY-MM-DD 형식을 사용해 주세요.');
      if (!exercise && order.toLowerCase() !== 'rest timer') throw new Error('운동 종목명이 없습니다.');
      if (exercise.length > 200) throw new Error('운동 종목명이 너무 깁니다.');
      const signature = JSON.stringify(row);
      if (seen.has(signature)) {
        audit.duplicateRows++;
        audit.issues.push({ row: rowNumber, code: 'duplicate', message: '동일한 행을 발견했습니다. 숫자 순서 세트의 중복은 제외하고, 특수 세트의 반복은 유지합니다.' });
        if (/^\d+$/.test(order)) continue;
      }
      seen.add(signature);
      const source = field('HL Source') === 'log' ? 'log' : 'strong';
      const id = `${source}:${sourceId}`;
      const existing = sessions.get(id);
      if (existing && (existing.date !== date.day || existing.startedAt !== date.iso)) throw new Error('같은 Workout #에 서로 다른 시작 시간이 있습니다. 원본을 확인해 주세요.');
      const weight = numeric(field('Weight (kg)'), '중량', 1500);
      const reps = numeric(field('Reps'), '반복수', 2000, true);
      const rpe = numeric(field('RPE'), 'RPE', 10);
      const rir = numeric(field('RIR'), 'RIR', 10);
      const distance = numeric(field('Distance (meters)'), '거리', 1_000_000);
      const seconds = numeric(field('Seconds'), '시간', 86400);
      const duration = numeric(field('Duration (sec)'), '세션 시간', 86400);
      const kind = classifySet(order, exercise, reps, distance, seconds);
      const mapped = findExercise(exercise);
      if (!mapped && kind !== 'rest') unmapped.add(exercise);
      if (kind !== 'work') audit[kind === 'warmup' || kind === 'drop' || kind === 'rest' || kind === 'cardio' || kind === 'timed' ? kind : 'unknown']++;
      if (kind === 'work' && rpe === null) audit.missingRpe++;
      if (kind === 'work' && weight === null) audit.missingLoad++;
      if (kind === 'work' && !reps) audit.issues.push({ row: rowNumber, code: 'missing-reps', message: '반복수가 없거나 0인 본세트는 세트 수·톤수에서 제외합니다.' });
      if (kind === 'unknown') audit.issues.push({ row: rowNumber, code: 'set-kind', message: `해석되지 않은 세트 표식은 본세트 집계에서 제외합니다.` });
      const set: TrainingSet = { id: `${id}:${index}`, exercise: exercise || '휴식 타이머', exerciseId: mapped?.id ?? null, order, kind, weight, reps, rpe, rir, distance, seconds, notes: field('Notes').slice(0, 5000) };
      const session = existing ?? { id, source, sourceId, date: date.day, startedAt: date.iso, name: field('Workout Name').slice(0, 200) || '가져온 운동', duration, notes: field('Workout Notes').slice(0, 5000), sets: [] };
      session.sets.push(set);
      sessions.set(id, session);
      audit.acceptedRows++;
    } catch (error) {
      audit.rejectedRows++;
      audit.issues.push({ row: rowNumber, code: 'invalid-row', message: error instanceof Error ? error.message : '행을 읽을 수 없습니다.' });
    }
  }
  audit.unmapped = [...unmapped].sort();
  return { sessions: [...sessions.values()].sort((a, b) => a.startedAt.localeCompare(b.startedAt)), audit };
}
export function mergeSessions(existing: Session[], incoming: Session[]): Session[] {
  const merged = new Map(existing.map(session => [session.id, session]));
  for (const session of incoming) merged.set(session.id, session);
  return [...merged.values()].sort((a, b) => a.startedAt.localeCompare(b.startedAt));
}
export function exportStrongCsv(sessions: Session[]): string {
  const safe = (text: string) => /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  const fields = ['Workout #', 'Date', 'Workout Name', 'Duration (sec)', 'Exercise Name', 'Set Order', 'Weight (kg)', 'Reps', 'RPE', 'Distance (meters)', 'Seconds', 'Notes', 'Workout Notes', 'RIR', 'HL Source'];
  const rows = sessions.flatMap(session => session.sets.map(set => [
    safe(session.sourceId), `${session.date} ${new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).format(new Date(session.startedAt))}`,
    safe(session.name), session.duration, safe(set.exercise), safe(set.order), set.weight, set.reps, set.rpe, set.distance, set.seconds, safe(set.notes), safe(session.notes), set.rir, session.source,
  ]));
  return '\uFEFF' + Papa.unparse({ fields, data: rows }, { delimiter: ';', quotes: true });
}
