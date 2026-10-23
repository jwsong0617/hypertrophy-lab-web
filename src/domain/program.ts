import { getExercise } from './exercises.ts';
import { isWorkSet } from './analytics.ts';
import { addDays, koreaDay } from './time.ts';
import type { CheckIn, Exercise, Profile, Session, TrainingSet } from './types.ts';

export interface Prescription { exercise: Exercise; sets: number; reps: [number, number]; rir: number; rest: number }
export interface PlanSlot { id: string; name: string; focus: string; minutes: string; exercises: Prescription[] }
type Template = [string, number, number, number][];
const A: Template = [['leg-press', 3, 8, 12], ['chest-press', 3, 8, 12], ['lat-pulldown', 3, 8, 12], ['leg-curl', 2, 10, 15], ['lateral-raise', 2, 12, 20], ['core', 2, 8, 12]];
const B: Template = [['supported-row', 3, 8, 12], ['split-squat', 2, 8, 12], ['incline-press', 3, 8, 12], ['leg-curl', 2, 10, 15], ['rear-delt', 2, 12, 20], ['calf', 2, 10, 15]];
const C: Template = [['leg-press', 3, 8, 12], ['chest-press', 2, 8, 12], ['lat-pulldown', 3, 8, 12], ['hip-thrust', 2, 10, 15], ['lateral-raise', 2, 12, 20], ['leg-curl', 2, 10, 15], ['rear-delt', 2, 12, 20]];
const U: Template = [['chest-press', 3, 8, 12], ['supported-row', 3, 8, 12], ['lat-pulldown', 2, 8, 12], ['lateral-raise', 2, 12, 20], ['triceps', 2, 10, 15], ['biceps-curl', 2, 10, 15]];
const L: Template = [['leg-press', 3, 8, 12], ['leg-curl', 3, 10, 15], ['hip-thrust', 2, 10, 15], ['calf', 2, 10, 15], ['core', 2, 8, 12]];
const UB: Template = [['incline-press', 3, 8, 12], ['lat-pulldown', 3, 8, 12], ['supported-row', 2, 8, 12], ['rear-delt', 2, 12, 20], ['lateral-raise', 2, 12, 20]];
const LB: Template = [['split-squat', 3, 8, 12], ['leg-curl', 3, 10, 15], ['hip-thrust', 2, 10, 15], ['calf', 2, 10, 15], ['core', 2, 8, 12]];
const BA: Template = [['squat', 3, 6, 10], ['bench-barbell', 3, 6, 10], ['lat-pulldown', 3, 8, 12], ['leg-curl', 2, 10, 15], ['lateral-raise', 2, 12, 20], ['core', 2, 8, 12]];
const BB: Template = [['deadlift', 2, 5, 8], ['ohp-barbell', 3, 6, 10], ['supported-row', 3, 8, 12], ['split-squat', 2, 8, 12], ['rear-delt', 2, 12, 20], ['calf', 2, 10, 15]];
const BC: Template = [['squat', 2, 6, 10], ['bench-barbell', 3, 6, 10], ['lat-pulldown', 3, 8, 12], ['leg-curl', 2, 10, 15], ['lateral-raise', 2, 12, 20], ['hip-thrust', 2, 10, 15]];
const B2: Template = [['deadlift', 2, 5, 8], ['bench-barbell', 2, 6, 10], ['supported-row', 3, 8, 12], ['split-squat', 2, 8, 12], ['ohp-barbell', 2, 6, 10], ['leg-curl', 2, 10, 15]];
const BU: Template = [['bench-barbell', 3, 6, 10], ...U.slice(1)];
const BL: Template = [['squat', 3, 6, 10], ...L.slice(1)];
const BUB: Template = [['ohp-barbell', 3, 6, 10], ['incline-press', 2, 8, 12], ['supported-row', 3, 8, 12], ['lat-pulldown', 2, 8, 12], ['rear-delt', 2, 12, 20]];
const BLB: Template = [['deadlift', 2, 5, 8], ['split-squat', 3, 8, 12], ['leg-curl', 2, 10, 15], ['core', 2, 8, 12], ['hip-thrust', 2, 10, 15], ['calf', 2, 10, 15]];
export function phase(week: number) {
  if (week <= 2) return { name: '재적응', description: '가벼운 부하와 동작 확인. 운동별 1–2세트로 시작합니다.', sets: 1, rir: 4 };
  if (week <= 4) return { name: '기초 쌓기', description: '회복과 통증을 확인하며 2세트로 늘립니다.', sets: 2, rir: 3 };
  if (week === 8 || week === 12 || week === 16 || week === 24) return { name: '평가와 조정', description: '수행·회복·일정을 점검합니다. 피로가 누적되면 세트를 절반으로 줄입니다.', sets: 2, rir: 3 };
  return { name: '점진적 성장', description: '반복수를 먼저 늘리고, 기록 조건을 만족하면 소폭 증량합니다.', sets: 3, rir: 2 };
}
export function buildPlan(profile: Profile, week: number): PlanSlot[] {
  const p = phase(week);
  const barbell = profile.programStyle === 'barbell' && profile.equipment === 'gym';
  const templates: [string, string, string, Template][] = barbell ? (profile.days === 4
    ? [['U1', '상체 A', '벤치 · 당기기', BU], ['L1', '하체 A', '스쿼트 · 햄스트링', BL], ['U2', '상체 B', 'OHP · 당기기', BUB], ['L2', '하체 B', '데드리프트 · 하체', BLB]]
    : profile.days === 2 ? [['A', '전신 A', '스쿼트 · 벤치', BA], ['B', '전신 B', '데드리프트 · 밀기 · 당기기', B2]]
      : [['A', '전신 A', '스쿼트 · 벤치', BA], ['B', '전신 B', '데드리프트 · OHP', BB], ['C', '전신 C', '스쿼트 · 벤치 반복 노출', BC]]) : profile.days === 4
    ? [['U1', '상체 A', '밀기 · 당기기', U], ['L1', '하체 A', '무릎 · 햄스트링', L], ['U2', '상체 B', '등 · 어깨', UB], ['L2', '하체 B', '균형 · 둔근', LB]]
    : profile.days === 2 ? [['A', '전신 A', '바쁜 주의 핵심 동작', A], ['B', '전신 B', '전신 노출 이어가기', [...B.slice(0, 4), ['lateral-raise', 2, 12, 20], ['core', 2, 8, 12]]]]
      : [['A', '전신 A', '밀기 · 하체 · 수직 당기기', A], ['B', '전신 B', '수평 당기기 · 하체', B], ['C', '전신 C', '반복 노출 · 균형', C]];
  return templates.map(([id, name, focus, template]) => ({
    id, name, focus, minutes: profile.minutes === 30 ? '25–35' : '45–75',
    exercises: template.filter(([exerciseId]) => (exerciseId !== 'calf' || profile.includeCalves === true) && (exerciseId !== 'hip-thrust' || profile.includeHipThrust === true)).slice(0, profile.minutes === 30 ? 4 : undefined).map(([exerciseId, sets, low, high]) => {
      const original = getExercise(exerciseId);
      if (!original) throw new Error('Unknown program exercise');
      const homeId: Record<string, string> = { 'chest-press': 'pushup', 'leg-press': 'split-squat', 'lat-pulldown': 'band-row', 'supported-row': 'dumbbell-row', 'leg-curl': 'heel-slide', 'rear-delt': 'band-pullapart', 'hip-thrust': 'glute-bridge', 'calf': 'bodyweight-calf', 'triceps': 'band-triceps' };
      const exercise = profile.equipment === 'home' ? (getExercise(homeId[exerciseId] ?? exerciseId) ?? original) : original;
      return { exercise, sets: Math.min(sets, p.sets, profile.minutes === 30 ? 2 : 3), reps: [low, high], rir: p.rir, rest: low >= 10 ? 90 : 150 };
    }),
  }));
}
export interface Progression { status: 'stop' | 'reduce' | 'hold' | 'increase'; title: string; detail: string; nextWeight: number | null }
export function progression(exerciseId: string, history: Session[], target: Prescription, readiness: Pick<CheckIn, 'pain' | 'fatigue' | 'sleep' | 'symptoms'> | undefined, increment = 1): Progression {
  const base = { nextWeight: null };
  if (readiness?.symptoms) return { ...base, status: 'stop', title: '운동을 중단하세요', detail: '흉통·실신 느낌·심한 호흡곤란·평소와 다른 심계항진이 있으면 운동을 중단하고 적절한 진료를 받으세요. 심하거나 지속되면 응급 도움을 요청하세요.' };
  if ((readiness?.pain ?? 0) >= 4) return { ...base, status: 'stop', title: '통증이 있는 동작은 중단', detail: '중량을 올리지 마세요. 통증 원인은 이 앱으로 판단할 수 없습니다. 통증 없는 대안과 전문가 평가를 확인하세요.' };
  if ((readiness?.fatigue ?? 0) >= 4 || (readiness?.sleep !== null && readiness?.sleep !== undefined && readiness.sleep < 5)) return { ...base, status: 'reduce', title: '오늘은 세트를 줄여 주세요', detail: '세트를 약 30–50% 줄이고 RIR 3–4 정도로 여유를 두세요. 이는 보수적 운영 규칙이며 의학적 판단이 아닙니다.' };
  if ((readiness?.pain ?? 0) > 0) return { ...base, status: 'hold', title: '증량을 보류하세요', detail: '통증 없는 가동 범위와 대체 동작을 먼저 확인하세요. 통증을 참고 반복하지 마세요.' };
  if (!readiness || readiness.pain === null || readiness.fatigue === null || readiness.sleep === null) return { ...base, status: 'hold', title: '오늘의 회복 상태를 확인하세요', detail: '누락된 통증·피로·수면을 정상으로 가정하지 않습니다. 오늘 상태를 입력하기 전에는 증량을 제안하지 않습니다.' };
  const today = koreaDay();
  const exposures = history.filter(session => session.date >= addDays(today, -28) && session.date <= today).sort((a, b) => b.startedAt.localeCompare(a.startedAt)).flatMap(session => {
    const sets = session.sets.filter(set => set.exerciseId === exerciseId && set.exercise === target.exercise.name && isWorkSet(set));
    return sets.length ? [sets] : [];
  });
  if (exposures.length < 2) return { ...base, status: 'hold', title: '첫 두 번은 기준 만들기', detail: '통증 없는 부하에서 목표 반복수와 RIR를 기록하세요. 과거 최고 기록으로 시작 중량을 정하지 않습니다.' };
  const recent = exposures.slice(0, 2);
  if (recent.some(sets => sets.length < target.sets)) return { ...base, status: 'hold', title: '계획 세트를 먼저 확인', detail: '최근 두 번 모두 계획한 본세트를 완료한 뒤 증량을 판단합니다.' };
  const sets = recent.flatMap(items => items.slice(0, target.sets));
  if (sets.some(set => set.rir === null)) return { ...base, status: 'hold', title: 'RIR 기록이 필요해요', detail: '미입력 RIR는 채우지 않습니다. 목표 반복 상단과 여유 반복을 확인한 뒤 증량을 판단합니다.' };
  const firstWeight = sets[0]?.weight;
  if (sets.every(set => (set.reps ?? 0) >= target.reps[1] && (set.rir ?? -1) >= target.rir) && firstWeight !== null && firstWeight !== undefined && firstWeight > 0 && sets.every(set => set.weight === firstWeight) && target.exercise.load === 'external') {
    const raw = firstWeight * 1.025;
    const nextWeight = Math.ceil(raw / increment) * increment;
    if (nextWeight > firstWeight * 1.1) return { ...base, status: 'hold', title: '작은 증량 단위를 확인하세요', detail: '사용 가능한 최소 증량이 현재 중량의 10%를 넘습니다. 반복수를 유지하거나 더 작은 단위를 선택하세요.' };
    return { status: 'increase', title: '소폭 증량을 고려하세요', detail: '같은 중량으로 최근 두 번 목표 반복 상단과 RIR를 만족했습니다. 기구·기술·현재 컨디션이 같을 때만 제안을 적용하세요.', nextWeight };
  }
  return { ...base, status: 'hold', title: '같은 부하에서 반복수 쌓기', detail: '목표 범위 안에서 1회씩 늘려 보세요. 3회 이상 정체되면 기술·휴식·이행률·회복부터 점검하고 세트를 자동으로 추가하지 않습니다.' };
}
export function previousSets(history: Session[], id: string): TrainingSet[] {
  return history.slice().sort((a, b) => b.startedAt.localeCompare(a.startedAt)).find(session => session.sets.some(set => set.exerciseId === id))?.sets.filter(set => set.exerciseId === id && isWorkSet(set)) ?? [];
}
