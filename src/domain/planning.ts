import { isWorkSet, muscleSets, summarize } from './analytics.ts';
import { buildPlan, progression } from './program.ts';
import type { PlanSlot, Prescription } from './program.ts';
import { addDays, currentWeek, koreaDay } from './time.ts';
import { MUSCLES } from './types.ts';
import type { CheckIn, Profile, Session } from './types.ts';

export function plannedMuscles(plan: PlanSlot[]) {
  return Object.entries(MUSCLES).map(([muscle, name]) => ({
    muscle, name,
    direct: plan.reduce((total, slot) => total + slot.exercises.reduce((sum, item) => sum + (item.exercise.direct.some(id => id === muscle) ? item.sets : 0), 0), 0),
    indirect: plan.reduce((total, slot) => total + slot.exercises.reduce((sum, item) => sum + (item.exercise.indirect.some(id => id === muscle) ? item.sets : 0), 0), 0),
  }));
}

export function matchingExposures(history: Session[], exerciseId: string, name: string, today = koreaDay()) {
  return history.filter(session => session.date >= addDays(today, -27) && session.date <= today)
    .slice().sort((a, b) => b.startedAt.localeCompare(a.startedAt) || b.id.localeCompare(a.id))
    .flatMap(session => {
      const sets = session.sets.filter(set => set.exerciseId === exerciseId && set.exercise === name && isWorkSet(set));
      return sets.length ? [{ date: session.date, sessionId: session.id, sets }] : [];
    });
}

export function progressionAssessment(target: Prescription, history: Session[], profile: Profile, readiness: CheckIn | undefined, today = koreaDay()) {
  readiness = readiness?.date === today ? readiness : undefined;
  const sourceName = profile.recordBindings?.[target.exercise.id] ?? target.exercise.name;
  const exposures = matchingExposures(history, target.exercise.id, sourceName, today).slice(0, 2);
  const compared = exposures.flatMap(exposure => exposure.sets.slice(0, target.sets));
  const complete = exposures.length === 2 && exposures.every(exposure => exposure.sets.length >= target.sets);
  const load = compared[0]?.weight;
  const checks = [
    { label: '최근 28일 같은 종목·기구의 두 노출', met: exposures.length === 2 },
    { label: `두 번 모두 ${target.sets}개 계획 본세트 완료`, met: complete },
    { label: `계획 세트 모두 ${target.reps[1]}회 이상`, met: complete && compared.every(set => (set.reps ?? 0) >= target.reps[1]) },
    { label: `계획 세트 모두 RIR ${target.rir} 이상 기록`, met: complete && compared.every(set => set.rir !== null && set.rir >= target.rir) },
    { label: '양쪽 노출의 계획 세트 중량 일치', met: complete && !!load && compared.every(set => set.weight === load) },
    { label: '외부 중량을 올리는 종목', met: target.exercise.load === 'external' },
    { label: '오늘 통증·피로·수면 확인 및 증상 없음', met: !!readiness && readiness.pain === 0 && readiness.fatigue !== null && readiness.fatigue < 4 && readiness.sleep !== null && readiness.sleep >= 5 && !readiness.symptoms },
    { label: '필요한 운동 허용 범위 확인', met: profile.clearance === 'confirmed' },
  ];
  const raw = progression(target.exercise.id, history, { ...target, exercise: { ...target.exercise, name: sourceName } }, readiness, profile.increment, today);
  const advice = raw.status === 'increase' && profile.clearance !== 'confirmed'
    ? { status: 'hold' as const, title: '운동 허용 범위를 먼저 확인하세요', detail: '수행 기준은 충족했지만 현재 허용 범위 확인 전에는 증량을 제안하지 않습니다.', nextWeight: null }
    : raw;
  return { sourceName, exposures, checks, advice };
}

export function reviewWeek(history: Session[], profile: Profile, start: string, today = koreaDay()) {
  const end = addDays(start, 6);
  const rows = history.filter(session => session.date >= start && session.date <= end && session.date <= today && session.sets.some(isWorkSet));
  const stats = summarize(rows, today);
  const week = currentWeek(profile.startDate, end > today ? today : end);
  const plan = buildPlan(profile, week);
  const actual = muscleSets(rows);
  const volumes = plannedMuscles(plan).map(item => ({ ...item, actual: actual.find(row => row.muscle === item.muscle)?.direct ?? 0, actualIndirect: actual.find(row => row.muscle === item.muscle)?.indirect ?? 0 }));
  const partial = end > today;
  const observations = !rows.length ? [{ title: '이번 기간의 기록을 먼저 확인하세요', detail: '기록 없음은 운동하지 않았다는 증거가 아닙니다. Strong CSV를 갱신한 뒤 계획을 검토하세요.', action: 'import' }]
    : [
      { title: partial ? '진행 중인 주입니다' : stats.days < profile.days ? '다음 주에 가능한 빈도를 확인하세요' : '기록된 빈도를 유지할 수 있는지 확인하세요', detail: `${stats.days}일 · ${stats.sessions}세션이 기록돼 있습니다. 현재 주 ${profile.days}회 목표와 비교한 참고이며 과거 계획의 완료율은 아닙니다.${partial ? ' 주가 끝나기 전에는 부족하다고 단정하지 않습니다.' : stats.days < profile.days ? ' 바쁜 주라면 2회 대안이나 압축형을 검토하세요.' : ' 빈도만으로 근성장이나 회복 상태를 판단하지 않습니다.'}`, action: 'schedule' },
      { title: '부위별 계획과 기록의 차이를 확인하세요', detail: volumes.filter(item => ['quads', 'hamstrings', 'chest', 'back'].includes(item.muscle) && item.direct > 0 && item.actual === 0).map(item => item.name).join(' · ') ? `직접 세트 기록이 없는 계획 부위: ${volumes.filter(item => ['quads', 'hamstrings', 'chest', 'back'].includes(item.muscle) && item.direct > 0 && item.actual === 0).map(item => item.name).join(' · ')}. 대체 종목·간접 노출·누락을 확인하고 세트를 자동 추가하지 않습니다.` : '주요 부위의 직접 노출이 기록돼 있습니다. 계획보다 많은 세트가 항상 더 나은 것은 아닙니다.', action: 'volume' },
      { title: '증량 판단에 필요한 기록을 확인하세요', detail: `본세트 ${stats.sets}개 중 RIR 미입력 ${stats.missingRir}개입니다. 누락된 RIR는 추측하지 않으며, 같은 기구의 최근 두 노출과 오늘 회복 상태를 함께 확인합니다.`, action: 'progression' },
    ];
  return { start, end, rows, stats, volumes, observations, partial };
}

export function planMarkdown(profile: Profile, week: number) {
  return `# 내 훈련 계획 · ${week}주\n\n계획표입니다. 실제 수행 기록이 아닙니다. Strong에 직접 옮겨 적어 사용하세요.\n\n${buildPlan(profile, week).map(slot => `## ${slot.name}\n\n| 종목 | 본세트 | 반복 | RIR | 휴식 |\n|---|---:|---|---:|---:|\n${slot.exercises.map(item => `| ${item.exercise.name} | ${item.sets} | ${item.reps.join('–')} | ${item.rir} | ${item.rest}초 |`).join('\n')}`).join('\n\n')}\n\n증량: 같은 종목·기구의 최근 두 노출에서 계획 세트·반복 상단·RIR를 충족한 뒤 현재 회복과 운동 허용 범위를 확인합니다. 시작 중량은 과거 최고 기록으로 자동 설정하지 않습니다.\n`;
}

export function exerciseReason(target: Prescription): string {
  const id = target.exercise.id;
  if (['squat', 'leg-press', 'split-squat', 'smith-squat', 'goblet-squat'].includes(id)) return '무릎 중심 하체 노출을 확보합니다. 통증 없는 범위와 익숙한 기구로 선택하고 주간에 나눠 수행합니다.';
  if (['deadlift', 'rdl'].includes(id)) return '힙힌지 패턴을 배치합니다. 부하·기술·회복에 맞춰 시작량을 조절하며, 근비대의 필수 종목으로 요구하지 않습니다.';
  if (id === 'ohp-barbell' || id === 'shoulder-press') return '수직 밀기 동작입니다. 벤치와 전면 어깨·삼두 노출이 겹치므로 밀기 세트를 함께 고려합니다.';
  if (target.exercise.direct.includes('back')) return '밀기 동작과 함께 당기기 노출을 확보합니다. 로우와 풀다운의 방향·기구 차이를 구분해 기록합니다.';
  if (target.exercise.direct.includes('chest')) return '수평 또는 경사 밀기로 가슴을 훈련합니다. 반복 가능한 동작을 유지하며 어깨·삼두의 간접 노출도 고려합니다.';
  if (target.exercise.direct.includes('hamstrings')) return '햄스트링 직접 노출을 보완합니다. 무릎 굽힘 운동은 스쿼트·힙힌지와 역할이 다릅니다.';
  if (target.exercise.direct.includes('calves') || id.includes('thrust') || id.includes('bridge')) return '해당 부위를 더 훈련하고 싶을 때 고르는 선택 운동입니다. 시간과 회복, 주간 노출을 보고 추가합니다.';
  return `${target.exercise.direct.map(muscle => MUSCLES[muscle]).join(' · ')} 노출을 보완합니다. 선택 종목의 정확한 세트 수가 개인 최적값으로 검증된 것은 아닙니다.`;
}
