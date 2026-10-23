import { CalendarDays, ChevronRight, Dumbbell, Footprints, Info, Layers3 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useApp } from '../AppContext.tsx';
import { ExerciseChart, Heatmap, MuscleChart } from '../components/charts.tsx';
import { Card, Empty, Metric, Notice, PageHeading, fmt } from '../components/ui.tsx';
import { diagnosis, filterSessions, isWorkSet, summarize } from '../domain/analytics.ts';
import { getExercise } from '../domain/exercises.ts';
import type { Session, SetKind } from '../domain/types.ts';

const kindNames: Record<SetKind, string> = { work: '본세트', warmup: '준비', drop: '드롭', rest: '휴식 타이머', cardio: '유산소', timed: '시간 운동', unknown: '미분류' };

function SessionDetails({ session }: { session: Session }) {
  return <details className="session-details"><summary><div className="session-date"><CalendarDays size={17}/><span>{session.date}</span></div><strong>{session.name}</strong><span className="session-summary">{session.sets.filter(isWorkSet).length} 본세트 · {session.duration === null ? '시간 미입력' : `${fmt(session.duration / 60)}분`}</span><ChevronRight size={16}/></summary><div className="table-scroll"><table><thead><tr><th>종목</th><th>유형</th><th>kg</th><th>반복</th><th>RPE</th><th>RIR</th><th>비고</th></tr></thead><tbody>{session.sets.map(set => <tr key={set.id}><td>{set.exercise}</td><td><span className={`set-tag kind-${set.kind}`}>{kindNames[set.kind]}</span></td><td>{set.weight ?? '—'}</td><td>{set.reps ?? (set.seconds ? `${set.seconds}초` : '—')}</td><td>{set.rpe ?? '—'}</td><td>{set.rir ?? '—'}</td><td className="notes-cell">{set.notes || (getExercise(set.exerciseId)?.load === 'assistance' ? '중량은 보조량' : '')}</td></tr>)}</tbody></table></div>{session.notes && <p className="session-note">메모: {session.notes}</p>}</details>;
}
export function History() {
  const { sessions, navigate, mode } = useApp();
  const [range, setRange] = useState<number | 'all'>(84); const [selected, setSelected] = useState(''); const [page, setPage] = useState(0);
  const filtered = useMemo(() => filterSessions(sessions, range), [sessions, range]);
  const names = [...new Set(filtered.flatMap(session => session.sets.filter(isWorkSet).map(set => set.exercise)))].sort();
  const name = names.includes(selected) ? selected : names[0] ?? '';
  const stats = summarize(filtered);
  const rows = filtered.slice().sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  const activePage = Math.min(page, Math.max(0, Math.ceil(rows.length / 15) - 1));
  return <><PageHeading eyebrow="HISTORY & ANALYTICS" title="기록이 보여주는 흐름" description="같은 종목의 변화와 주간 노출을 살펴보세요. 중량만으로 근육량을 판단하지 않습니다." action={<div className="segmented" aria-label="기록 기간">{([7, 28, 84, 'all'] as const).map(value => <button key={value} className={range === value ? 'active' : ''} onClick={() => { setRange(value); setPage(0); }}>{value === 'all' ? '전체' : value === 7 ? '7일' : `${value / 7}주`}</button>)}</div>}/>
    <div className="metric-grid"><Metric icon={CalendarDays} label="기록된 세션" value={stats.sessions} unit="회" detail={`${stats.days}일 · ${mode === 'demo' ? '합성 예시' : '가져온 기록/직접 입력'}`}/><Metric icon={Layers3} label="본세트" value={fmt(stats.sets)} unit="세트" detail="숫자 순서 · 반복수 1회 이상"/><Metric icon={Dumbbell} label="집계 가능한 외부 중량" value={fmt(stats.volume)} unit="kg·회" detail="보조량·맨몸·미분류 제외, 기구 간 비교 금지"/><Metric icon={Footprints} label="가장 긴 기록 공백" value={stats.longestGap?.days ?? '—'} unit={stats.longestGap ? '일' : ''} detail={stats.longestGap ? `${stats.longestGap.from} → ${stats.longestGap.to}` : '두 운동일 이상 필요'}/></div>
    <Card title="꾸준함의 모양" subtitle="최근 12주 · 한국 시간 기준, 월요일 시작"><Heatmap sessions={sessions}/></Card>
    <div className="dashboard-grid section-gap"><Card title="종목별 중량 추세" subtitle="각 세션의 최대 입력 중량 · 보조 종목은 최소 보조량" action={<select aria-label="분석할 운동 종목" value={name} onChange={event => setSelected(event.target.value)}>{names.length ? names.map(item => <option key={item}>{item}</option>) : <option value="">기록 없음</option>}</select>}><ExerciseChart sessions={filtered} name={name}/>{name && <div className="mini-data-list">{filtered.filter(session => session.sets.some(set => set.exercise === name && isWorkSet(set))).slice(-3).map(session => <span key={session.id}>{session.date}: {session.sets.filter(set => set.exercise === name && isWorkSet(set)).map(set => `${set.weight ?? '—'}kg × ${set.reps}`).join(' / ')}</span>)}</div>}</Card><Card title="직접·간접 노출" subtitle="간접 세트를 직접 세트에 합산하지 않습니다."><MuscleChart sessions={filtered}/></Card></div>
    {Object.keys(stats.years).length > 0 && <Card title="연도별 기록" subtitle="실제 운동 횟수가 아닌 앱에 남은 세션 수입니다."><div className="year-stats">{Object.entries(stats.years).map(([year, count]) => <div key={year}><span>{year}</span><strong>{count}<small>회</small></strong></div>)}</div><details className="method-details"><summary>월별 수치 보기</summary><div className="year-stats">{Object.entries(stats.months).map(([month, count]) => <div key={month}><span>{month}</span><strong>{count}<small>회</small></strong></div>)}</div></details></Card>}
    <Card title="운동 세션" subtitle={stats.first ? `${stats.first} – ${stats.last} · 한국 시간` : '가져온 기록이 여기에 표시됩니다.'} action={<span className="pill soft">{rows.length}개</span>}>{rows.length ? <><div className="session-list">{rows.slice(activePage * 15, activePage * 15 + 15).map(session => <SessionDetails key={session.id} session={session}/>)}</div><div className="pagination"><button className="button secondary small" disabled={activePage === 0} onClick={() => setPage(activePage - 1)}>이전</button><span>{activePage + 1} / {Math.ceil(rows.length / 15)}</span><button className="button secondary small" disabled={(activePage + 1) * 15 >= rows.length} onClick={() => setPage(activePage + 1)}>다음</button></div></> : <Empty onAction={() => navigate('settings')} detail="선택 기간에 기록이 없습니다. 전체 기간을 보거나 CSV를 가져오세요."/>}</Card>
    <Notice>드롭세트·준비·타이머·유산소·시간 운동은 기본 본세트에서 제외됩니다. 미분류 종목 {stats.unmappedSets}세트는 근육별·톤수 집계에서 제외됩니다. RIR가 없으면 실제 실패 근접도는 알 수 없습니다.</Notice>
  </>;
}

export function Diagnosis() {
  const { sessions, navigate, mode } = useApp(); const items = diagnosis(sessions);
  return <><PageHeading eyebrow="PERSONAL INSIGHTS" title="사실에서 시작하는 다음 한 걸음" description="관찰한 기록, 가능한 해석, 아직 알 수 없는 것을 나누었습니다."/>
    <Notice tone="warning">{mode === 'demo' ? '예시 기록에 대한 분석입니다. 개인의 실제 특성이 아닙니다.' : '원본을 가져온 범위만 분석합니다. 운동 기록만으로 근손실·영양 상태·통증 원인을 진단하지 않습니다.'}</Notice>
    {!items.length ? <Card><Empty title="개인 분석을 위한 기록이 필요해요" detail="문서에 적힌 과거 수치는 원본으로 확인하기 전까지 개인 분석에 사용하지 않습니다." onAction={() => navigate('settings')}/></Card> : <div className="diagnosis-grid">{items.map((item, index) => <Card key={item.title} className="diagnosis-card"><div className="diagnosis-top"><span className="priority">0{index + 1}</span><span className="pill soft">영향 {item.impact} · 실행 {item.effort}</span></div><h2>{item.title}</h2><dl><dt>기록으로 확인</dt><dd>{item.fact}</dd><dt>가능한 해석 · 한계</dt><dd>{item.hypothesis}</dd><dt>다음 행동</dt><dd>{item.action}</dd></dl><span className="confidence"><Info size={13}/>{item.confidence}</span></Card>)}</div>}
    <Card title="현재 판단할 수 없는 것"><div className="unknown-grid">{['실제 근육량·체지방 변화', '정확한 유지 칼로리·섭취량', '미입력 RIR·실제 최대근력', '통증의 원인·운동 허용 범위'].map(item => <div key={item}><Info size={17}/><span>{item}</span><strong>미확인</strong></div>)}</div></Card>
  </>;
}
