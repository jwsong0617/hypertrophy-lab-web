import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { CheckIn, Muscle, Session } from '../domain/types.ts';
import { exerciseHistory, muscleSets, weeklyHistory } from '../domain/analytics.ts';
import { addDays, displayDate, koreaDay, monday } from '../domain/time.ts';
import { getExercise } from '../domain/exercises.ts';
import { Empty } from './ui.tsx';

const axis = { fontSize: 11, fill: '#657258' };
export function ActivityChart({ sessions }: { sessions: Session[] }) {
  const data = weeklyHistory(sessions, 8);
  if (!sessions.length) return <Empty detail="운동을 기록하면 주간 흐름이 여기에 나타납니다."/>;
  return <div className="chart" role="img" aria-label={`최근 8주 운동 세션: ${data.map(row => `${row.week} ${row.sessions}회`).join(', ')}`}><ResponsiveContainer width="100%" height="100%"><BarChart data={data} barSize={26} margin={{ top: 10, right: 0, left: -25, bottom: 0 }}><CartesianGrid strokeDasharray="3 5" vertical={false} stroke="#e8ebe4"/><XAxis dataKey="week" tick={axis} axisLine={false} tickLine={false}/><YAxis allowDecimals={false} tick={axis} axisLine={false} tickLine={false}/><Tooltip cursor={{ fill: '#f0f3e9' }} formatter={value => [`${value}회`, '기록된 세션']}/><Bar dataKey="sessions" fill="#b9d580" radius={[5, 5, 0, 0]} isAnimationActive={false}/></BarChart></ResponsiveContainer></div>;
}
export function MuscleChart({ sessions, compact = false }: { sessions: Session[]; compact?: boolean }) {
  const names: Muscle[] = compact ? ['chest', 'back', 'quads', 'hamstrings', 'sideDelts', 'rearDelts'] : ['chest', 'back', 'quads', 'hamstrings', 'glutes', 'frontDelts', 'sideDelts', 'rearDelts', 'biceps', 'triceps', 'calves', 'core'];
  const data = muscleSets(sessions).filter(item => names.includes(item.muscle));
  if (!sessions.length) return <Empty detail="직접·간접 본세트를 구분해 보여드립니다."/>;
  return <div className={`chart ${compact ? 'chart-muscles' : 'chart-tall'}`} role="img" aria-label={data.map(item => `${item.name}: 직접 ${item.direct}, 간접 ${item.indirect}세트`).join('. ')}><ResponsiveContainer width="100%" height="100%"><BarChart data={data} layout="vertical" barSize={7} barGap={3} margin={{ top: 0, right: 8, left: 0, bottom: 0 }}><XAxis type="number" tick={axis} allowDecimals={false} axisLine={false} tickLine={false}/><YAxis type="category" dataKey="name" width={64} tick={axis} axisLine={false} tickLine={false}/><Tooltip cursor={{ fill: '#f3f5ef' }} formatter={(value, name) => [`${value}세트`, name === 'direct' ? '직접 본세트' : '간접 노출']}/><Bar dataKey="direct" name="direct" fill="#638774" radius={[0, 3, 3, 0]} isAnimationActive={false}/><Bar dataKey="indirect" name="indirect" fill="#d7dfd0" radius={[0, 3, 3, 0]} isAnimationActive={false}/><Legend formatter={value => value === 'direct' ? '직접 본세트' : '간접 노출'} iconType="circle" iconSize={6} wrapperStyle={{ fontSize: 11 }}/></BarChart></ResponsiveContainer></div>;
}
export function ExerciseChart({ sessions, name }: { sessions: Session[]; name: string }) {
  const data = exerciseHistory(sessions, name);
  const first = sessions.flatMap(session => session.sets).find(set => set.exercise === name);
  const mapped = getExercise(first?.exerciseId ?? null);
  if (!data.length) return <Empty detail="종목을 선택하면 같은 종목의 기록을 비교할 수 있습니다."/>;
  return <><div className="chart" role="img" aria-label={`${name}의 ${data.length}개 세션별 ${mapped?.load === 'assistance' ? '최소 보조량' : '최대 입력 중량'} 추세`}><ResponsiveContainer width="100%" height="100%"><LineChart data={data} margin={{ top: 15, right: 15, left: -20, bottom: 0 }}><CartesianGrid strokeDasharray="3 5" vertical={false} stroke="#e8ebe4"/><XAxis dataKey="date" tick={axis} axisLine={false} tickLine={false} minTickGap={25}/><YAxis tick={axis} axisLine={false} tickLine={false} unit=" kg"/><Tooltip formatter={value => [value === null ? '미입력' : `${value} kg`, mapped?.load === 'assistance' ? '보조량 (낮을수록 어려움)' : '입력 중량']}/><Line dataKey="weight" type="linear" stroke="#638774" strokeWidth={2.5} dot={{ r: 3, fill: '#638774' }} connectNulls={false} isAnimationActive={false}/></LineChart></ResponsiveContainer></div><p className="chart-footnote">{mapped?.note || '같은 이름·기구 안에서만 비교하세요. 중량은 입력값 그대로이며 실제 근력·근육량을 뜻하지 않습니다.'}</p></>;
}
export function WeightChart({ checks }: { checks: CheckIn[] }) {
  const data = checks.filter(item => item.weight !== null && item.date <= koreaDay()).sort((a, b) => a.date.localeCompare(b.date)).map(item => ({ date: item.date.slice(5), weight: item.weight }));
  if (!data.length) return <Empty title="체중 측정 기록이 없어요" detail="실제 입력한 측정값만 그립니다. 운동 예시 데이터로 체중 변화를 만들지 않습니다."/>;
  return <div className="chart" role="img" aria-label={`직접 입력한 체중 ${data.length}개 측정값`}><ResponsiveContainer width="100%" height="100%"><LineChart data={data} margin={{ top: 15, right: 20, left: -15, bottom: 0 }}><CartesianGrid strokeDasharray="3 5" vertical={false} stroke="#e8ebe4"/><XAxis dataKey="date" tick={axis} axisLine={false} tickLine={false}/><YAxis domain={['dataMin - 1', 'dataMax + 1']} tick={axis} axisLine={false} tickLine={false} unit=" kg"/><Tooltip formatter={value => [`${value} kg`, '직접 입력 체중']}/><Line dataKey="weight" stroke="#638774" strokeWidth={2.5} dot={{ r: 4, fill: '#638774' }} isAnimationActive={false}/></LineChart></ResponsiveContainer></div>;
}
export function Heatmap({ sessions }: { sessions: Session[] }) {
  const today = koreaDay();
  const start = addDays(monday(today), -77);
  const counts = new Map<string, number>();
  sessions.forEach(session => counts.set(session.date, (counts.get(session.date) ?? 0) + 1));
  return <div className="heatmap-wrap"><div className="heatmap-days"><span>월</span><span>수</span><span>금</span><span>일</span></div><div className="heatmap" aria-label="최근 12주 운동 달력">{Array.from({ length: 84 }, (_, index) => {
    const day = addDays(start, index); const count = counts.get(day) ?? 0; const future = day > today;
    return <span key={day} tabIndex={0} className={`heatmap-cell level-${future ? 'future' : Math.min(count, 3)}`} aria-label={`${displayDate(day, true)} ${future ? '미래' : `${count}세션`}`} title={`${day} · ${count}세션`}/>;
  })}</div><div className="heatmap-legend"><span>기록 없음</span><i className="level-0"/><i className="level-1"/><i className="level-2"/><span>운동 기록</span></div></div>;
}
