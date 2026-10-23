import { getExercise } from './exercises.ts';
import { addDays, koreaDay, monday } from './time.ts';
import type { Session } from './types.ts';

/** Entirely synthetic. Never merged into the personal database. No body measurements. */
export function demoSessions(today = koreaDay()): Session[] {
  return Array.from({ length: 18 }, (_, index) => {
    const date = addDays(monday(today), -35 + Math.floor(index / 3) * 7 + (index % 3) * 2);
    const ids = index % 3 === 0 ? ['leg-press', 'chest-press', 'lat-pulldown', 'lateral-raise'] : index % 3 === 1 ? ['supported-row', 'split-squat', 'incline-press', 'leg-curl'] : ['leg-press', 'chest-press', 'rear-delt', 'leg-curl'];
    const sets = ids.flatMap((id, exerciseIndex) => Array.from({ length: 3 }, (_, order) => ({
      id: `demo-${index}-${exerciseIndex}-${order}`, exercise: getExercise(id)!.name, exerciseId: id,
      order: String(order + 1), kind: 'work' as const,
      weight: id === 'leg-press' ? 60 + Math.floor(index / 6) * 5 : id === 'lateral-raise' || id === 'rear-delt' ? 4 + Math.floor(index / 9) : 15 + exerciseIndex * 5 + Math.floor(index / 6) * 2.5,
      reps: 8 + index % 4 - (order === 2 ? 1 : 0), rpe: null, rir: order === 2 ? 2 : 3, distance: null, seconds: null, notes: '합성 예시 · 실제 운동 기록 아님',
    })));
    return { id: `demo-${index}`, source: 'demo' as const, sourceId: `DEMO-${index + 1}`, date, startedAt: `${date}T09:00:00.000Z`, name: `예시 전신 ${'ABC'[index % 3]}`, duration: 3000 + (index % 3) * 300, notes: '기능 확인용 합성 데이터', sets };
  }).filter(session => session.date <= today);
}
