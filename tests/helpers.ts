import Papa from 'papaparse';
import { getExercise } from '../src/domain/exercises.ts';
import { koreaDay } from '../src/domain/time.ts';
import type { Session, TrainingSet } from '../src/domain/types.ts';

export const columns = ['Workout #', 'Date', 'Workout Name', 'Duration (sec)', 'Exercise Name', 'Set Order', 'Weight (kg)', 'Reps', 'RPE', 'Distance (meters)', 'Seconds', 'Notes', 'Workout Notes', 'RIR'];
export function csv(rows: Record<string, string>[] = [{}], delimiter = ';') {
  const base = { 'Workout #': 'SYNTHETIC-1', Date: '2025-01-02 18:00:00', 'Workout Name': '테스트 전신', 'Duration (sec)': '3000', 'Exercise Name': 'Bench Press (Barbell)', 'Set Order': '1', 'Weight (kg)': '40', Reps: '10' };
  return Papa.unparse({ fields: columns, data: rows.map(row => { const values: Record<string, string> = { ...base, ...row }; return columns.map(key => values[key] ?? ''); }) }, { delimiter });
}
export function makeSet(values: Partial<TrainingSet> = {}): TrainingSet {
  return { id: 'set-1', exercise: 'Bench Press (Barbell)', exerciseId: 'bench-barbell', order: '1', kind: 'work', weight: 40, reps: 10, rpe: null, rir: null, seconds: null, distance: null, notes: '', ...values };
}
export function makeSession(values: Partial<Session> = {}): Session {
  const date = values.date ?? koreaDay();
  return { id: 'strong:SYNTHETIC-1', sourceId: 'SYNTHETIC-1', source: 'strong', date, startedAt: `${date}T09:00:00.000Z`, name: '합성 테스트', duration: 3000, notes: '', sets: [makeSet()], ...values };
}
export function exerciseSet(id: string, values: Partial<TrainingSet> = {}) { const exercise = getExercise(id)!; return makeSet({ exerciseId: id, exercise: exercise.name, ...values }); }
