import { describe, expect, it } from 'vitest';
import { buildPlan, phase, progression } from '../src/domain/program.ts';
import { emptyData } from '../src/domain/storage.ts';
import { addDays, koreaDay } from '../src/domain/time.ts';
import { exerciseSet, makeSession } from './helpers.ts';

const profile = emptyData().profile;
const target = buildPlan(profile, 6)[0].exercises[0];
const ready = { pain: 0, fatigue: 2, sleep: 8, symptoms: false };
function history(rir: number | null = 3) {
  return [-2, -5].map((offset, index) => makeSession({ id: String(index), date: addDays(koreaDay(), offset), sets: Array.from({ length: target.sets }, (_, order) => exerciseSet(target.exercise.id, { id: `${index}-${order}`, weight: 100, reps: target.reps[1], rir })) }));
}
describe('program configuration', () => {
  it.each([2, 3, 4] as const)('builds %s actual weekly slots', days => {
    const plan = buildPlan({ ...profile, days }, 6); expect(plan).toHaveLength(days);
    expect(new Set(plan.map(slot => slot.id)).size).toBe(days);
    expect(plan.flatMap(slot => slot.exercises).every(item => item.sets > 0 && item.rir >= 2)).toBe(true);
  });
  it('provides both lower and upper body exposure in the 2-day alternative', () => {
    for (const slot of buildPlan({ ...profile, days: 2 }, 6)) {
      expect(slot.exercises.some(item => item.exercise.direct.includes('quads'))).toBe(true);
      expect(slot.exercises.some(item => item.exercise.direct.includes('chest'))).toBe(true);
      expect(slot.exercises.some(item => item.exercise.direct.includes('back'))).toBe(true);
    }
  });
  it('starts with fewer sets and more reserve', () => { expect(phase(1).rir).toBe(4); expect(phase(4).sets).toBe(2); expect(phase(6).sets).toBe(3); expect(phase(12).name).toBe('평가와 조정'); });
  it('shortens sessions without creating extra days', () => {
    const plan = buildPlan({ ...profile, minutes: 30 }, 6);
    expect(plan).toHaveLength(3); expect(plan.every(slot => slot.exercises.length <= 4 && slot.exercises.every(item => item.sets <= 2))).toBe(true);
  });
  it('has home alternatives without automatically prescribing barbell hinges', () => {
    const plan = buildPlan({ ...profile, equipment: 'home' }, 6);
    expect(plan.flatMap(slot => slot.exercises).every(item => item.exercise.equipment !== 'machine' && item.exercise.id !== 'rdl')).toBe(true);
  });
  it('keeps calf raises and hip thrusts out unless explicitly requested', () => {
    for (const days of [2, 3, 4] as const) {
      for (const programStyle of ['supported', 'barbell'] as const) {
        const plan = buildPlan({ ...profile, days, programStyle }, 6);
        expect(plan.flatMap(slot => slot.exercises).some(item => ['calf', 'hip-thrust'].includes(item.exercise.id))).toBe(false);
      }
    }
    const ids = buildPlan({ ...profile, includeCalves: true, includeHipThrust: true }, 6).flatMap(slot => slot.exercises.map(item => item.exercise.id));
    expect(ids).toContain('calf'); expect(ids).toContain('hip-thrust');
  });
  it('separates squat/bench days from deadlift/OHP and limits deadlift volume', () => {
    const plan = buildPlan({ ...profile, programStyle: 'barbell' }, 6);
    expect(plan[0].exercises.slice(0, 2).map(item => item.exercise.id)).toEqual(['squat', 'bench-barbell']);
    expect(plan[1].exercises.slice(0, 2).map(item => item.exercise.id)).toEqual(['deadlift', 'ohp-barbell']);
    expect(plan[1].exercises[0].sets).toBe(2);
    expect(plan[2].exercises.slice(0, 2).map(item => item.exercise.id)).toEqual(['squat', 'bench-barbell']);
  });
  it('preserves full-body coverage on both short barbell days and no barbell at home', () => {
    for (const slot of buildPlan({ ...profile, programStyle: 'barbell', days: 2, minutes: 30 }, 6)) {
      for (const muscle of ['chest', 'back', 'quads'] as const) expect(slot.exercises.some(item => item.exercise.direct.includes(muscle))).toBe(true);
    }
    expect(buildPlan({ ...profile, equipment: 'home', programStyle: 'barbell' }, 6).flatMap(slot => slot.exercises).some(item => item.exercise.equipment === 'barbell')).toBe(false);
  });
});
describe('double progression and safety', () => {
  it('suggests a small increment only after two completed qualifying exposures', () => {
    expect(progression(target.exercise.id, history(), target, ready, 1)).toMatchObject({ status: 'increase', nextWeight: 103 });
  });
  it('never fills missing RIR', () => expect(progression(target.exercise.id, history(null), target, ready).title).toContain('RIR'));
  it('never interprets missing recovery inputs as normal', () => {
    expect(progression(target.exercise.id, history(), target, undefined).status).toBe('hold');
    expect(progression(target.exercise.id, history(), target, { ...ready, sleep: null }).title).toContain('회복');
  });
  it('holds after a single exposure', () => expect(progression(target.exercise.id, history().slice(0, 1), target, ready).status).toBe('hold'));
  it('holds when planned sets are incomplete', () => {
    const sessions = history(); sessions[0].sets = sessions[0].sets.slice(0, 1);
    expect(progression(target.exercise.id, sessions, target, ready).status).toBe('hold');
  });
  it('does not mix different loads to trigger an increase', () => {
    const sessions = history(); sessions[1].sets[0].weight = 95;
    expect(progression(target.exercise.id, sessions, target, ready).status).toBe('hold');
  });
  it('does not treat different original exercise labels as the same equipment', () => {
    const sessions = history().map(session => ({ ...session, sets: session.sets.map(set => ({ ...set, exercise: 'Another machine in the same movement category' })) }));
    expect(progression(target.exercise.id, sessions, target, ready).status).toBe('hold');
  });
  it('holds if repetitions do not reach the upper target', () => {
    const sessions = history(); sessions[0].sets[0].reps = target.reps[0];
    expect(progression(target.exercise.id, sessions, target, ready).status).toBe('hold');
  });
  it('does not use stale pre-break records as a current increase criterion', () => {
    const sessions = history().map(session => ({ ...session, date: addDays(koreaDay(), -60) }));
    expect(progression(target.exercise.id, sessions, target, ready).status).toBe('hold');
  });
  it.each([{ ...ready, pain: 5 }, { ...ready, symptoms: true }])('stops on significant pain or symptoms', readiness => expect(progression(target.exercise.id, history(), target, readiness).status).toBe('stop'));
  it.each([{ ...ready, fatigue: 5 }, { ...ready, sleep: 4 }])('reduces volume for poor recovery', readiness => expect(progression(target.exercise.id, history(), target, readiness).status).toBe('reduce'));
  it('holds on mild pain', () => expect(progression(target.exercise.id, history(), target, { ...ready, pain: 1 }).status).toBe('hold'));
  it('does not suggest an equipment jump greater than 10 percent', () => {
    const sessions = history().map(session => ({ ...session, sets: session.sets.map(set => ({ ...set, weight: 4 })) }));
    expect(progression(target.exercise.id, sessions, target, ready, 2.5).status).toBe('hold');
  });
});
