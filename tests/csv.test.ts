import { describe, expect, it } from 'vitest';
import { classifySet, exportStrongCsv, mergeSessions, numeric, parseStrongCsv } from '../src/domain/csv.ts';
import { backupSchema, emptyData } from '../src/domain/storage.ts';
import { csv, makeSession, makeSet } from './helpers.ts';

describe('Strong CSV ingestion', () => {
  it('reads UTF-8 BOM, semicolons and multiline quoted notes without exposing them', () => {
    const result = parseStrongCsv('\uFEFF' + csv([{ Notes: '합성 메모; "따옴표"\n두 번째 줄' }]));
    expect(result.sessions).toHaveLength(1);
    expect(result.sessions[0].sets[0].notes).toBe('합성 메모; "따옴표"\n두 번째 줄');
    expect(result.audit.acceptedRows).toBe(1);
  });
  it('supports comma-delimited exports too', () => expect(parseStrongCsv(csv([{}], ',')).audit.delimiter).toBe(','));
  it('separates rest, warmup, drop, cardio and timed core work', () => {
    const result = parseStrongCsv(csv([
      { 'Set Order': 'Rest Timer', 'Exercise Name': '', Reps: '', 'Weight (kg)': '' },
      { 'Set Order': 'W' }, { 'Set Order': 'D' },
      { 'Exercise Name': 'Running', Reps: '', 'Distance (meters)': '1000', Seconds: '500' },
      { 'Exercise Name': 'Plank', Reps: '', Seconds: '30' }, { 'Set Order': '2' },
    ]));
    expect(result.sessions[0].sets.map(set => set.kind)).toEqual(['rest', 'warmup', 'drop', 'cardio', 'timed', 'work']);
    expect(result.audit).toMatchObject({ rest: 1, warmup: 1, drop: 1, cardio: 1, timed: 1 });
    expect(backupSchema.safeParse({ ...emptyData(), sessions: result.sessions, lastAudit: result.audit }).success).toBe(true);
  });
  it('keeps missing RPE, RIR and weight null; keeps a real zero weight', () => {
    const result = parseStrongCsv(csv([{ 'Weight (kg)': '', RPE: '', RIR: '' }, { 'Set Order': '2', 'Weight (kg)': '0' }]));
    expect(result.sessions[0].sets[0]).toMatchObject({ weight: null, rpe: null, rir: null });
    expect(result.sessions[0].sets[1].weight).toBe(0);
    expect(result.audit.missingLoad).toBe(1);
  });
  it('does not guess an unrecognized muscle mapping or set type', () => {
    const result = parseStrongCsv(csv([{ 'Exercise Name': 'Synthetic unknown machine', 'Set Order': 'F' }]));
    expect(result.sessions[0].sets[0]).toMatchObject({ exerciseId: null, kind: 'unknown' });
    expect(result.audit.unmapped).toEqual(['Synthetic unknown machine']);
  });
  it('reports and excludes malformed numbers and impossible dates', () => {
    const result = parseStrongCsv(csv([{ 'Weight (kg)': '-5' }, { Reps: '1.5' }, { Date: '2025-02-30 18:00:00' }, { 'Workout #': 'ok', 'Set Order': '2' }]));
    expect(result.audit.rejectedRows).toBe(3); expect(result.audit.acceptedRows).toBe(1);
    expect(result.audit.issues).toHaveLength(3);
  });
  it('rejects a conflicting date for the same workout number', () => {
    const result = parseStrongCsv(csv([{}, { Date: '2025-01-03 18:00:00', 'Set Order': '2' }]));
    expect(result.audit.rejectedRows).toBe(1); expect(result.sessions).toHaveLength(1);
  });
  it('deduplicates exact numbered rows, but preserves potentially valid repeated drop rows', () => {
    const result = parseStrongCsv(csv([{}, {}, { 'Set Order': 'D' }, { 'Set Order': 'D' }]));
    expect(result.audit.duplicateRows).toBe(2); expect(result.sessions[0].sets).toHaveLength(3);
  });
  it('requires the Strong identifying columns', () => expect(() => parseStrongCsv('date;weight\n2025-01-01;20')).toThrow('필수 열'));
  it('rejects empty and malformed quoted data', () => { expect(() => parseStrongCsv('')).toThrow(); expect(() => parseStrongCsv('Workout #;Date;Exercise Name;Set Order\n"broken')).toThrow(); });
  it('imports ISO timestamps into the Korea calendar day', () => expect(parseStrongCsv(csv([{ Date: '2025-01-02T16:00:00Z' }])).sessions[0].date).toBe('2025-01-03'));
  it('round-trips valid sets, notes, duration and explicit RIR through CSV', () => {
    const first = parseStrongCsv(csv([{ RIR: '2', Notes: '합성; 테스트' }]));
    const second = parseStrongCsv(exportStrongCsv(first.sessions));
    expect(second.sessions[0].sets[0]).toMatchObject({ weight: 40, reps: 10, rir: 2, rpe: null, notes: '합성; 테스트' });
    expect(second.sessions[0].startedAt).toBe(first.sessions[0].startedAt);
  });
  it('prevents spreadsheet formulas in user-supplied exported cells', () => {
    const exported = exportStrongCsv([makeSession({ name: '=HYPERLINK("bad")', notes: '@command', sets: [makeSet({ order: '=1+1', notes: '+SUM(1)' })] })]);
    expect(exported).toContain("'=HYPERLINK"); expect(exported).toContain("'@command"); expect(exported).toContain("'=1+1"); expect(exported).toContain("'+SUM");
  });
  it('merges repeated workout IDs once and preserves manual sessions', () => {
    const first = makeSession(); const changed = makeSession({ sets: [makeSet({ weight: 50 })] });
    const manual = makeSession({ id: 'log:manual', source: 'log' });
    const result = mergeSessions([first, manual], [changed]);
    expect(result).toHaveLength(2); expect(result.find(item => item.id === first.id)?.sets[0].weight).toBe(50);
    expect(mergeSessions(result, [changed])).toHaveLength(2);
  });
  it('preserves manual identities through its CSV extension and merges without duplicating them', () => {
    const manual = makeSession({ id: 'log:manual-source', sourceId: 'manual-source', source: 'log' });
    const imported = parseStrongCsv(exportStrongCsv([manual])).sessions;
    expect(imported[0].id).toBe(manual.id); expect(imported[0].source).toBe('log');
    expect(mergeSessions([manual], imported)).toHaveLength(1);
  });
});
describe('numeric and set classification', () => {
  it.each(['NaN', 'Infinity', '-1', '1e20', '100kg'])('rejects %s', value => expect(() => numeric(value, 'test', 1000)).toThrow());
  it('accepts decimal commas without inventing missing values', () => { expect(numeric('12,5', 'test', 100)).toBe(12.5); expect(numeric(' ', 'test', 100)).toBeNull(); });
  it('does not count zero or unknown set tags as ordinary work', () => { expect(classifySet('0', 'Bench Press', 10, null, null)).toBe('unknown'); expect(classifySet('D', 'Bench Press', 10, null, null)).toBe('drop'); });
  it('separates a timed back exercise from cardio', () => expect(classifySet('1', 'Superman', null, null, 30)).toBe('timed'));
});
