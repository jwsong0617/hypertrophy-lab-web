import { describe, expect, it } from 'vitest';
import { buildBasePlan, buildPlan, planKey } from '../src/domain/program.ts';
import { matchingExposures, planMarkdown, plannedMuscles, progressionAssessment, reviewWeek } from '../src/domain/planning.ts';
import { emptyData, parseBackup, slotPlanSchema } from '../src/domain/storage.ts';
import { addDays } from '../src/domain/time.ts';
import { exerciseSet, makeSession } from './helpers.ts';
import type { CheckIn, PlannedExercise } from '../src/domain/types.ts';

const today = '2026-10-23';
const profile = { ...emptyData(today).profile, programStyle: 'barbell' as const, clearance: 'confirmed' as const };
const edit: PlannedExercise = { exerciseId: 'bench-dumbbell', sets: 4, reps: [8, 12], rir: 2, rest: 180 };
const custom = { ...profile, customPlans: { [planKey(profile, 'A')]: [edit] } };
const target = buildPlan(profile, 6)[0].exercises[1];
const ready: CheckIn = { id: 'check', date: today, pain: 0, fatigue: 2, sleep: 8, symptoms: false, weight: null, waist: null, protein: null, notes: '' };
const exposures = [-2, -5].map((offset, index) => makeSession({ id: `s${index}`, date: addDays(today, offset), startedAt: `${addDays(today, offset)}T09:00:00Z`, sets: Array.from({ length: target.sets }, (_, order) => exerciseSet('bench-barbell', { id: `${index}-${order}`, exercise: 'Bench Press (Barbell)', weight: 40, reps: target.reps[1], rir: 3 })) }));

describe('persisted, phase-aware program design', () => {
  it('applies saved exercises, volume and rest without changing the base template', () => {
    expect(buildPlan(custom, 6)[0].exercises[0]).toMatchObject({ exercise: { id: 'bench-dumbbell' }, sets: 4, reps: [8, 12], rest: 180 });
    expect(buildBasePlan(custom, 6)[0].exercises[0].exercise.id).toBe('squat');
    expect(buildPlan(custom, 6)[1]).toEqual(buildPlan(profile, 6)[1]);
  });
  it('preserves introductory and evaluation limits on a saved growth plan', () => {
    expect(buildPlan(custom, 1)[0].exercises[0]).toMatchObject({ sets: 1, rir: 4 });
    expect(buildPlan(custom, 4)[0].exercises[0]).toMatchObject({ sets: 2, rir: 3 });
    expect(buildPlan(custom, 8)[0].exercises[0]).toMatchObject({ sets: 2, rir: 3 });
  });
  it('isolates schedules, equipment, duration and optional accessory configurations', () => {
    expect(buildPlan({ ...custom, days: 2 }, 6)[0].exercises[0].exercise.id).toBe('squat');
    expect(buildPlan({ ...custom, equipment: 'home' }, 6)[0].exercises[0].exercise.id).not.toBe('bench-dumbbell');
    expect(buildPlan({ ...custom, minutes: 30 }, 6)[0].exercises[0].exercise.id).toBe('squat');
    expect(buildPlan({ ...custom, includeCalves: true }, 6)[0].exercises[0].exercise.id).toBe('squat');
  });
  it('enforces short-session caps even on a crafted backup and rejects unsuitable home exercises', () => {
    const short = { ...profile, minutes: 30 as const };
    const rows = ['squat', 'bench-barbell', 'lat-pulldown', 'leg-curl', 'lateral-raise'].map(exerciseId => ({ ...edit, exerciseId, sets: 6 }));
    expect(buildPlan({ ...short, customPlans: { [planKey(short, 'A')]: rows } }, 6)[0].exercises).toHaveLength(4);
    expect(buildPlan({ ...short, customPlans: { [planKey(short, 'A')]: rows } }, 6)[0].exercises.every(row => row.sets === 2)).toBe(true);
    const home = { ...profile, equipment: 'home' as const };
    expect(buildPlan({ ...home, customPlans: { [planKey(home, 'A')]: [{ ...edit, exerciseId: 'squat' }] } }, 6)[0].exercises.every(row => row.exercise.equipment !== 'barbell')).toBe(true);
  });
  it('rejects duplicate, unknown and out-of-range prescriptions', () => {
    expect(slotPlanSchema.safeParse([edit, edit]).success).toBe(false);
    for (const row of [{ ...edit, exerciseId: 'invented' }, { ...edit, sets: 0 }, { ...edit, reps: [12, 8] }, { ...edit, rir: 0 }, { ...edit, rest: 0 }]) expect(slotPlanSchema.safeParse([row]).success).toBe(false);
  });
  it('round-trips new design, source binding and weekly review through version-1 backups', () => {
    const data = { ...emptyData(today), profile: { ...custom, recordBindings: { 'bench-barbell': 'Bench Press (Barbell)' } }, reviews: [{ week: '2026-10-19', action: 'keep' as const, note: 'Keep the same plan', recordedAt: '2026-10-23T10:00:00Z' }] };
    expect(parseBackup(JSON.stringify(data))).toEqual(data);
    expect(parseBackup(JSON.stringify(emptyData(today))).profile.customPlans).toBeUndefined();
    expect(() => parseBackup(JSON.stringify({ ...data, profile: { ...custom, customPlans: { [planKey(profile, 'A')]: [edit, edit] } } }))).toThrow();
  });
  it('exports a plan clearly distinct from completed Strong records', () => {
    const text = planMarkdown(custom, 6);
    expect(text).toContain('실제 수행 기록이 아닙니다'); expect(text).toContain('덤벨 벤치 프레스'); expect(text).toContain('180초'); expect(text).not.toContain('Workout #');
    expect(plannedMuscles(buildPlan(custom, 6)).find(item => item.muscle === 'chest')?.direct).toBe(7);
  });
});

describe('Strong source identity and explainable progression', () => {
  it('requires explicit binding of an imported label and then checks real conditions', () => {
    expect(progressionAssessment(target, exposures, profile, ready, today).advice.status).toBe('hold');
    const bound = { ...profile, recordBindings: { 'bench-barbell': 'Bench Press (Barbell)' } };
    const result = progressionAssessment(target, exposures, bound, ready, today);
    expect(result.advice).toMatchObject({ status: 'increase', nextWeight: 41 });
    expect(result.checks.every(check => check.met)).toBe(true);
    expect(exposures[0].sets[0].exercise).toBe('Bench Press (Barbell)');
  });
  it('does not infer RIR from an absent value or promote a different original label', () => {
    const bound = { ...profile, recordBindings: { 'bench-barbell': 'Bench Press (Barbell)' } };
    const missing = exposures.map(session => ({ ...session, sets: session.sets.map(set => ({ ...set, rir: null, rpe: 8 })) }));
    expect(progressionAssessment(target, missing, bound, ready, today).advice.title).toContain('RIR');
    expect(matchingExposures(exposures, 'bench-barbell', 'Bench Press (Smith Machine)', today)).toEqual([]);
  });
  it('keeps clearance and current-day recovery as separate prerequisites', () => {
    const bound = { ...profile, recordBindings: { 'bench-barbell': 'Bench Press (Barbell)' } };
    expect(progressionAssessment(target, exposures, { ...bound, clearance: 'unknown' }, ready, today).advice.nextWeight).toBeNull();
    expect(progressionAssessment(target, exposures, bound, { ...ready, date: addDays(today, -1) }, today).advice.title).toContain('회복');
    expect(progressionAssessment(target, exposures, bound, { ...ready, symptoms: true }, today).advice.status).toBe('stop');
  });
  it('uses exactly 28 calendar days and excludes warmups and future sessions', () => {
    const old = { ...exposures[0], id: 'old', date: addDays(today, -28) };
    const future = { ...exposures[0], id: 'future', date: addDays(today, 1) };
    const warmup = { ...exposures[0], id: 'warmup', sets: exposures[0].sets.map(set => ({ ...set, kind: 'warmup' as const })) };
    expect(matchingExposures([old, future, warmup, ...exposures], 'bench-barbell', 'Bench Press (Barbell)', today)).toHaveLength(2);
  });
});

describe('weekly review uses observations, not invented adherence', () => {
  it('counts days separately from sessions and separates planned and actual exposure', () => {
    const second = { ...exposures[0], id: 'same-day' };
    const result = reviewWeek([exposures[0], second], profile, '2026-10-19', today);
    expect(result.stats.sessions).toBe(2); expect(result.stats.days).toBe(1); expect(result.partial).toBe(true);
    expect(result.volumes.find(row => row.muscle === 'chest')?.actual).toBe(6);
    expect(result.observations[0].title).toBe('진행 중인 주입니다');
  });
  it('treats no records as missing evidence and does not mutate the program', () => {
    const before = JSON.stringify(custom); const result = reviewWeek([], custom, '2026-10-12', today);
    expect(result.observations[0].action).toBe('import'); expect(result.stats.days).toBe(0); expect(JSON.stringify(custom)).toBe(before);
  });
});
