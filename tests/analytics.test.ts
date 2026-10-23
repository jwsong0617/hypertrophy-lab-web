import { describe, expect, it } from 'vitest';
import { diagnosis, estimated1RM, exerciseHistory, filterSessions, muscleSets, setVolume, summarize, weeklyHistory, weightAverages } from '../src/domain/analytics.ts';
import { addDays, currentWeek, daysBetween, monday, parseStrongDate, validDay } from '../src/domain/time.ts';
import type { CheckIn } from '../src/domain/types.ts';
import { exerciseSet, makeSession, makeSet } from './helpers.ts';

describe('Korea calendar and dates', () => {
  it('uses the local Korea day around UTC midnight', () => expect(parseStrongDate('2025-01-01T15:30:00Z')?.day).toBe('2025-01-02'));
  it('interprets naive timestamps as Korea time', () => expect(parseStrongDate('2025-01-02 00:30:00')?.iso).toBe('2025-01-01T15:30:00.000Z'));
  it.each(['2025-02-29', '2025-04-31', '2025-01-01 25:00:00', '01/02/2025', 'not a date'])('rejects invalid or ambiguous %s', value => expect(parseStrongDate(value)).toBeNull());
  it('validates leap days', () => { expect(validDay('2024-02-29')).toBe(true); expect(validDay('2025-02-29')).toBe(false); });
  it('starts weeks on Monday across years', () => { expect(monday('2025-01-01')).toBe('2024-12-30'); expect(monday('2025-01-05')).toBe('2024-12-30'); });
  it('handles exact 7-day windows and excludes future sessions', () => {
    const sessions = ['2025-01-01', '2025-01-02', '2025-01-08', '2025-01-09'].map((date, index) => makeSession({ id: String(index), date }));
    expect(filterSessions(sessions, 7, '2025-01-08').map(item => item.date)).toEqual(['2025-01-02', '2025-01-08']);
    expect(filterSessions(sessions, 'all', '2025-01-08')).toHaveLength(3);
  });
  it('clamps program weeks and calculates date differences without local DST', () => { expect(currentWeek('2025-01-01', '2025-01-08')).toBe(2); expect(currentWeek('2025-01-01', '2026-01-01')).toBe(24); expect(daysBetween('2025-01-01', addDays('2025-01-01', 7))).toBe(7); });
});
describe('training analysis', () => {
  it('counts work sets while separating non-work and assisted loads', () => {
    const session = makeSession({ sets: [makeSet(), makeSet({ kind: 'warmup' }), makeSet({ kind: 'drop' }), exerciseSet('assisted-pullup', { weight: 50 }), makeSet({ weight: null })] });
    const stats = summarize([session]);
    expect(stats.sets).toBe(3); expect(stats.volume).toBe(400); expect(stats.missingRir).toBe(3);
  });
  it('does not count empty or zero repetitions', () => { expect(summarize([makeSession({ sets: [makeSet({ reps: 0 }), makeSet({ reps: null })] })]).sets).toBe(0); });
  it('keeps direct and indirect sets separate', () => {
    const muscle = muscleSets([makeSession()]);
    expect(muscle.find(item => item.muscle === 'chest')).toMatchObject({ direct: 1, indirect: 0 });
    expect(muscle.find(item => item.muscle === 'triceps')).toMatchObject({ direct: 0, indirect: 1 });
  });
  it('excludes unmapped, assisted and bodyweight loads from tonnage', () => {
    expect(setVolume(makeSet({ exerciseId: null }))).toBeNull(); expect(setVolume(exerciseSet('assisted-pullup'))).toBeNull(); expect(setVolume(exerciseSet('pushup'))).toBeNull();
  });
  it('does not create an e1RM when RIR/RPE is unknown or repetitions unsuitable', () => {
    expect(estimated1RM(makeSet())).toBeNull(); expect(estimated1RM(makeSet({ rir: 1, reps: 15 }))).toBeNull(); expect(estimated1RM(exerciseSet('assisted-pullup', { rir: 1 }))).toBeNull();
    expect(estimated1RM(makeSet({ weight: 60, reps: 10, rir: 2 }))).toBe(80);
    expect(estimated1RM(makeSet({ weight: 60, reps: 10, rpe: 8 }))).toBe(80);
  });
  it('interprets an assistance trend as minimum assistance, not maximum strength', () => {
    const session = makeSession({ sets: [exerciseSet('assisted-pullup', { weight: 50 }), exerciseSet('assisted-pullup', { weight: 40 })] });
    expect(exerciseHistory([session], '보조 턱걸이')[0].weight).toBe(40);
  });
  it('counts distinct sessions and actual days separately and reports years', () => {
    const sessions = [makeSession({ id: '1', date: '2024-12-31' }), makeSession({ id: '2', date: '2025-01-01' }), makeSession({ id: '3', date: '2025-01-01' })];
    expect(summarize(sessions, '2025-01-05')).toMatchObject({ sessions: 3, days: 2, years: { '2024': 1, '2025': 2 } });
    expect(weeklyHistory(sessions, 1, '2025-01-05')[0]).toMatchObject({ sessions: 3, days: 2 });
  });
  it('does not invent diagnoses without sessions', () => expect(diagnosis([])).toEqual([]));
  it('computes weight averages from only measured values in each actual period', () => {
    const check = (date: string, weight: number | null): CheckIn => ({ id: date, date, weight, waist: null, sleep: null, fatigue: null, pain: null, protein: null, symptoms: false, notes: '' });
    const result = weightAverages([check('2025-01-08', 60), check('2025-01-07', 62), check('2025-01-06', null), check('2025-01-01', 59)], '2025-01-08');
    expect(result.current).toEqual({ value: 61, count: 2 }); expect(result.previous).toEqual({ value: 59, count: 1 });
    expect(weightAverages([], '2025-01-08').current.value).toBeNull();
  });
});
