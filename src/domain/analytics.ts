import { getExercise } from './exercises.ts';
import { addDays, daysBetween, koreaDay, monday } from './time.ts';
import { MUSCLES } from './types.ts';
import type { CheckIn, Muscle, Session, TrainingSet } from './types.ts';

export const isWorkSet = (set: TrainingSet) => set.kind === 'work' && set.reps !== null && set.reps > 0;
export function setVolume(set: TrainingSet): number | null {
  const exercise = getExercise(set.exerciseId);
  if (!isWorkSet(set) || set.weight === null || !exercise || exercise.load !== 'external') return null;
  return set.weight * (set.reps ?? 0);
}
export function estimated1RM(set: TrainingSet): number | null {
  const exercise = getExercise(set.exerciseId);
  const closeToFailure = (set.rir !== null && set.rir <= 2) || (set.rpe !== null && set.rpe >= 8);
  if (!isWorkSet(set) || !exercise || exercise.load !== 'external' || !set.weight || !set.reps || set.reps > 10 || set.reps < 3 || !closeToFailure) return null;
  return Math.round(set.weight * (1 + set.reps / 30) * 10) / 10;
}
export function filterSessions(sessions: Session[], range: number | 'all', today = koreaDay()): Session[] {
  const start = range === 'all' ? '0000-00-00' : addDays(today, -range + 1);
  return sessions.filter(session => session.date >= start && session.date <= today);
}
export function muscleSets(sessions: Session[]) {
  const totals = Object.fromEntries(Object.keys(MUSCLES).map(key => [key, { direct: 0, indirect: 0 }])) as Record<Muscle, { direct: number; indirect: number }>;
  for (const session of sessions) for (const set of session.sets.filter(isWorkSet)) {
    const exercise = getExercise(set.exerciseId);
    exercise?.direct.forEach(muscle => totals[muscle].direct++);
    exercise?.indirect.forEach(muscle => totals[muscle].indirect++);
  }
  return Object.entries(totals).map(([muscle, value]) => ({ muscle: muscle as Muscle, name: MUSCLES[muscle as Muscle], ...value }));
}
export function summarize(sessions: Session[], today = koreaDay()) {
  const valid = sessions.filter(session => session.date <= today).sort((a, b) => a.date.localeCompare(b.date));
  const days = [...new Set(valid.map(session => session.date))];
  const durations = valid.flatMap(session => session.duration === null ? [] : [session.duration]);
  const sets = valid.flatMap(session => session.sets);
  const gaps = days.slice(1).map((day, index) => ({ from: days[index], to: day, days: Math.max(0, daysBetween(days[index], day) - 1) }));
  const years: Record<string, number> = {};
  const months: Record<string, number> = {};
  for (const session of valid) {
    years[session.date.slice(0, 4)] = (years[session.date.slice(0, 4)] ?? 0) + 1;
    months[session.date.slice(0, 7)] = (months[session.date.slice(0, 7)] ?? 0) + 1;
  }
  return {
    sessions: valid.length, days: days.length, sets: sets.filter(isWorkSet).length,
    volume: sets.reduce((total, set) => total + (setVolume(set) ?? 0), 0),
    meanDuration: durations.length ? durations.reduce((a, b) => a + b, 0) / durations.length / 60 : null,
    first: days[0] ?? null, last: days.at(-1) ?? null,
    longestGap: gaps.sort((a, b) => b.days - a.days)[0] ?? null,
    missingRir: sets.filter(isWorkSet).filter(set => set.rir === null).length,
    unmappedSets: sets.filter(isWorkSet).filter(set => !set.exerciseId).length,
    years, months,
  };
}
export function weeklyHistory(sessions: Session[], weeks = 12, today = koreaDay()) {
  return Array.from({ length: weeks }, (_, index) => {
    const start = addDays(monday(today), -(weeks - 1 - index) * 7);
    const end = addDays(start, 6);
    const matches = sessions.filter(session => session.date >= start && session.date <= end && session.date <= today);
    return { week: start.slice(5).replace('-', '/'), start, sessions: matches.length, days: new Set(matches.map(session => session.date)).size, sets: matches.flatMap(session => session.sets).filter(isWorkSet).length };
  });
}
export function exerciseHistory(sessions: Session[], name: string) {
  return sessions.slice().sort((a, b) => a.startedAt.localeCompare(b.startedAt)).flatMap(session => {
    const sets = session.sets.filter(set => set.exercise === name && isWorkSet(set));
    const weights = sets.flatMap(set => set.weight === null ? [] : [set.weight]);
    if (!sets.length) return [];
    const assistance = getExercise(sets[0].exerciseId)?.load === 'assistance';
    return [{ date: session.date.slice(5).replace('-', '/'), fullDate: session.date, weight: weights.length ? (assistance ? Math.min(...weights) : Math.max(...weights)) : null, reps: Math.max(...sets.map(set => set.reps ?? 0)), sets: sets.length }];
  });
}
export function weightAverages(checkIns: CheckIn[], today = koreaDay()) {
  const average = (start: string, end: string) => {
    const values = checkIns.filter(item => item.date >= start && item.date <= end && item.weight !== null).map(item => item.weight as number);
    return { value: values.length ? values.reduce((a, b) => a + b, 0) / values.length : null, count: values.length };
  };
  return { current: average(addDays(today, -6), today), previous: average(addDays(today, -13), addDays(today, -7)) };
}
export function diagnosis(sessions: Session[], today = koreaDay()) {
  if (!sessions.length) return [];
  const recent = filterSessions(sessions, 28, today);
  const totals = summarize(sessions, today);
  const work = recent.flatMap(session => session.sets).filter(isWorkSet);
  const groups = muscleSets(recent);
  const direct = (name: Muscle) => groups.find(item => item.muscle === name)?.direct ?? 0;
  const concentrated = recent.filter(session => session.sets.filter(isWorkSet).length >= 20).length;
  const items = [
    { title: '기록의 연속성을 먼저 확인하세요', fact: `최근 28일에 ${recent.length}세션, ${new Set(recent.map(session => session.date)).size}일이 기록되어 있습니다.`, hypothesis: '기록되지 않은 운동은 알 수 없습니다. 빈도만으로 근손실을 판단할 수 없습니다.', confidence: '기록 집계: 높음', action: '다음 4주에는 주 3회 슬롯을 배치하고 바쁜 주에는 2회 전신으로 전환하세요.', impact: '높음', effort: '낮음' },
    { title: '하체·후면 어깨 노출을 따로 살펴보세요', fact: `최근 28일 직접 본세트: 대퇴사두 ${direct('quads')}, 햄스트링 ${direct('hamstrings')}, 둔근 ${direct('glutes')}, 후면 어깨 ${direct('rearDelts')}세트입니다.`, hypothesis: '기여 근육의 분류는 근사치입니다. 직접 세트 0이 자극 0을 의미하지 않으며 누락 여부도 확인해야 합니다.', confidence: '근육 분류: 중간', action: '간접 노출과 구분해 보고 통증 없는 무릎·햄스트링·후면 어깨 동작을 점진적으로 배치하세요.', impact: '높음', effort: '중간' },
    { title: '실패 근접도를 남겨 주세요', fact: `최근 본세트 ${work.length}개 중 RIR 미입력 ${work.filter(set => set.rir === null).length}개입니다.`, hypothesis: 'RIR가 없으면 중량 정체가 낮은 노력 때문인지 단정할 수 없습니다.', confidence: '누락 여부: 높음', action: '마지막 본세트부터 RIR를 선택적으로 기록하세요. 미입력 시 자동 증량하지 않습니다.', impact: '높음', effort: '낮음' },
    { title: '한 번에 몰기보다 주간에 나누어 보세요', fact: `최근 세션당 본세트 평균 ${recent.length ? (work.length / recent.length).toFixed(1) : '미확인'}개이며, 20세트 이상 세션은 ${concentrated}개입니다. 전체 미분류 본세트는 ${totals.unmappedSets}개입니다.`, hypothesis: '세트 수만으로 과훈련이나 피로의 원인을 확정할 수 없습니다. 같은 중량의 반복 감소도 RIR와 휴식 정보가 필요합니다.', confidence: '기록 집계: 높음 · 원인: 미확인', action: '주 2–3회에 핵심 동작을 나누고, 부위별 주간 세트와 현재 회복을 확인하세요. 같은 기구의 중량·반복만 비교하세요.', impact: '높음', effort: '중간' },
    { title: '회복과 실제 변화를 함께 기록하세요', fact: '운동 CSV만으로 섭취량·수면·근육량 변화·통증 원인을 알 수 없습니다.', hypothesis: '훈련량을 늘리는 것이 항상 첫 해법은 아닙니다.', confidence: '개인 원인: 판단 불가', action: '주간 체중 평균, 허리둘레, 수행, 수면, 통증을 함께 확인하고 한 번에 한 요소를 조절하세요.', impact: '높음', effort: '중간' },
  ];
  return items;
}
