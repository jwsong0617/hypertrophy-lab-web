import { ArrowRight, ArrowUp, ArrowDown, BookOpen, Check, ClipboardList, Download, Dumbbell, FileUp, Layers3, Link2, Plus, Settings2, Target, Trash2, TrendingUp } from 'lucide-react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { useApp } from '../AppContext.tsx';
import { Card, Field, Metric, Notice, PageHeading, fmt } from '../components/ui.tsx';
import { filterSessions, isWorkSet, summarize } from '../domain/analytics.ts';
import { EVIDENCE } from '../domain/evidence.ts';
import { EXERCISES } from '../domain/exercises.ts';
import { buildPlan, phase, planKey } from '../domain/program.ts';
import type { PlanSlot, Prescription } from '../domain/program.ts';
import { exerciseReason, planMarkdown, plannedMuscles, progressionAssessment, reviewWeek } from '../domain/planning.ts';
import { checkInSchema, downloadFile, profileSchema, slotPlanSchema } from '../domain/storage.ts';
import { addDays, currentWeek, koreaDay, monday } from '../domain/time.ts';
import { MUSCLES } from '../domain/types.ts';
import type { PlannedExercise, Profile } from '../domain/types.ts';

function ImportPrompt() {
  const { sessions, navigate, setMode } = useApp();
  if (sessions.length) return null;
  return <div className="onboarding-strip"><div><strong>Strong 기록에서 다음 계획을 만드세요.</strong><p>운동은 Strong에 기록하고, CSV를 가져와 이곳에서 설계·증량·주간 검토를 이어갑니다.</p></div><button className="button dark small" onClick={() => navigate('settings')}><FileUp size={15}/>CSV 가져오기</button><button className="text-button" onClick={() => setMode('demo')}>예시 둘러보기</button></div>;
}

function SlotTabs({ plan, selected, select }: { plan: PlanSlot[]; selected: number; select: (index: number) => void }) {
  return <div className="slot-tabs">{plan.map((slot, index) => <button key={slot.id} className={selected === index ? 'selected' : ''} aria-pressed={selected === index} onClick={() => select(index)}><span>SLOT {slot.id}</span><strong>{slot.name}</strong><small>{slot.focus}</small></button>)}</div>;
}

function PlanTable({ slot }: { slot: PlanSlot }) {
  return <div className="table-scroll"><table className="program-table"><thead><tr><th>종목</th><th>본세트</th><th>반복</th><th>RIR</th><th>휴식</th><th>선택 이유 · 대안</th></tr></thead><tbody>{slot.exercises.map((item, index) => <tr key={item.exercise.id}><td><span className="exercise-number">{String(index + 1).padStart(2, '0')}</span><div><strong>{item.exercise.name}</strong><small>{item.exercise.direct.map(muscle => MUSCLES[muscle]).join(' · ')}</small></div></td><td>{item.sets}</td><td>{item.reps.join('–')}</td><td>{item.rir}</td><td>{item.rest}초</td><td><details><summary>이 동작을 넣은 이유</summary><p>{exerciseReason(item)}</p><p>대안: {item.exercise.alternative}</p><p>{item.exercise.cue} {item.exercise.note}</p></details></td></tr>)}</tbody></table></div>;
}

function PlannedVolume({ plan }: { plan: PlanSlot[] }) {
  return <div className="table-scroll"><table className="volume-table"><thead><tr><th>부위</th><th>계획 직접 세트</th><th>간접 노출</th></tr></thead><tbody>{plannedMuscles(plan).filter(item => item.direct || item.indirect).map(item => <tr key={item.muscle}><td>{item.name}</td><td><strong>{item.direct}</strong></td><td>{item.indirect}</td></tr>)}</tbody></table><p className="chart-footnote">간접 노출을 직접 세트에 합산하지 않습니다. 근육 분류와 계획량은 개인의 실제 자극·최적 볼륨을 확정하지 않습니다.</p></div>;
}

function EvidenceReferences({ ids }: { ids: string[] }) {
  return <div className="evidence-links">{ids.map(id => {
    const item = EVIDENCE.find(row => row.id === id);
    return item ? <a key={id} href={`https://doi.org/${item.doi}`} target="_blank" rel="noreferrer" title={item.title}><BookOpen size={13}/>{item.year} · {item.type}<span>↗</span></a> : null;
  })}</div>;
}

function DesignReasons() {
  const { data, sessions, navigate } = useApp();
  const stats = summarize(filterSessions(sessions, 28));
  const reasons = [
    { title: '빈도는 지속 가능한 일정으로', decision: `주 ${data.profile.days}회 · ${data.profile.days === 4 ? '상·하체로 분산' : '전신으로 반복 노출'}`, why: '같은 주간 볼륨에서 전신과 분할의 근비대 차이는 뚜렷하지 않습니다. 한 번 빠졌을 때의 공백과 가용 시간을 고려한 운영 선택입니다.', limit: '빈도 자체의 우월성이나 같은 성과를 보장하지 않습니다.', ids: ['split-2024', 'frequency'] },
    { title: '종목은 선호와 움직임을 함께', decision: data.profile.programStyle === 'barbell' && data.profile.equipment === 'gym' ? '3대·OHP 중심 + 당기기·무릎 굽힘 보완' : '지지형·덤벨·맨몸 중심 + 부위별 노출 보완', why: '스쿼트·벤치·데드리프트·OHP도 중심이 될 수 있습니다. 로우·풀다운·레그 컬은 다른 움직임을 보완합니다. 카프·힙 스러스트는 부위 목표에 따른 선택입니다.', limit: '기구 종류만으로 근비대의 우열을 정하지 않습니다. 현재 수행·통증·기술을 확인해 선택합니다.', ids: ['acsm-2026'] },
    { title: '볼륨은 적게 시작해 관찰', decision: '재적응 1세트 → 기초 최대 2세트 → 성장기 종목별 조절', why: '더 큰 주간 볼륨의 평균적 이점과 개인 회복 차이를 함께 봅니다. 첫 2–4주의 낮은 시작량은 현재 능력 미확인에 대한 보수적 운영 규칙입니다.', limit: '주 10세트를 의무화하지 않습니다. 정확한 재적응 기간과 개인 최적 세트 수는 미확인입니다.', ids: ['acsm-2026', 'dose-2026'] },
    { title: '증량보다 먼저 반복수와 노력', decision: 'RIR 4 → 3 → 약 2 · 두 노출 확인 후 소폭 증량', why: '매번 실패를 요구하지 않습니다. 같은 기구·종목의 반복 상단과 RIR, 현재 회복 상태를 확인한 후 증량을 검토합니다. 기본 휴식은 복합 150초·보조 90초이며 더 쉴 수 있습니다.', limit: '정확한 RIR·휴식·2.5% 증량은 개인 최적값이 아닌 출발 규칙입니다. 누락 RIR를 추측하지 않습니다.', ids: ['proximity-2024', 'rest-2024'] },
  ];
  return <><Card title="설계에 반영한 기록" subtitle="현재 브라우저에서 가져온 범위만 사용합니다."><p className="planning-copy">최근 28일 {stats.sessions}세션 · 본세트 {stats.sets}개 · RIR 미입력 {stats.missingRir}개. 기록이 실제 훈련 전체를 대표하는지는 알 수 없습니다. 이 수치만으로 개인 최적 프로그램을 계산했다고 주장하지 않습니다.</p><button className="text-button" onClick={() => navigate('history')}>기록의 분포와 원본 확인<ArrowRight size={14}/></button></Card><div className="rationale-grid">{reasons.map(item => <Card key={item.title} title={item.title}><span className="pill lime">{item.decision}</span><p className="planning-copy">{item.why}</p><p className="chart-footnote">적용 한계 · {item.limit}</p><EvidenceReferences ids={item.ids}/></Card>)}</div></>;
}

export function Program() {
  const { data, navigate, mode } = useApp();
  const actualWeek = currentWeek(data.profile.startDate); const [viewWeek, setViewWeek] = useState(actualWeek); const [selected, select] = useState(0);
  const plan = buildPlan(data.profile, viewWeek); const slot = plan[selected % plan.length]; const p = phase(viewWeek);
  const sets = plan.flatMap(item => item.exercises).reduce((total, item) => total + item.sets, 0);
  return <><PageHeading eyebrow="YOUR TRAINING PROGRAM" title="내 프로그램" description="계획은 이곳에서, 운동 기록은 Strong에서. 근거와 수행 기록을 확인하며 다음 훈련을 준비하세요." action={<button className="button dark" onClick={() => navigate('designer')}><Settings2 size={16}/>설계 수정</button>}/>
    <ImportPrompt/>
    <section className="planner-hero"><div><p className="eyebrow">PLAN → TRAIN → REVIEW</p><h2>이번 주의 훈련에<br/><em>분명한 기준을.</em></h2><p>주 {data.profile.days}회 · {data.profile.equipment === 'home' ? '집 대안' : data.profile.programStyle === 'barbell' ? '3대·OHP 중심' : '지지형 중심'} · 실제 {actualWeek}주차</p><div className="button-row"><button className="button dark" onClick={() => navigate('progression')}>증량 계획 확인<TrendingUp size={16}/></button><button className="button secondary" onClick={() => downloadFile(planMarkdown(data.profile, viewWeek), `training-plan-week-${viewWeek}.md`, 'text/markdown;charset=utf-8')}><Download size={15}/>계획표 내려받기</button></div></div><div className="planner-loop" aria-hidden="true"><span>01 <b>설계</b></span><i>↓</i><span>02 <b>Strong에 기록</b></span><i>↓</i><span>03 <b>다음 주 검토</b></span></div></section>
    <div className="metric-grid planning-metrics"><Metric icon={Target} label="미리보기 주차" value={viewWeek} unit="주" detail={`${p.name} · 현재 ${actualWeek}주차와 구분`} accent/><Metric icon={Layers3} label="주간 계획 본세트" value={sets} unit="세트" detail="실제 수행량과 별도로 집계"/><Metric icon={Dumbbell} label="가용 시간" value={data.profile.minutes === 30 ? '25–35' : '45–75'} unit="분" detail="준비·휴식·기구 대기에 따라 달라집니다"/></div>
    <div className="program-toolbar"><Field label="미리보기 주차"><select value={viewWeek} onChange={event => setViewWeek(Number(event.target.value))}>{Array.from({ length: 24 }, (_, index) => <option key={index + 1} value={index + 1}>{index + 1}주 · {phase(index + 1).name}</option>)}</select></Field><p>{p.description} 주차 미리보기는 실제 시작일을 바꾸지 않습니다.</p></div>
    <SlotTabs plan={plan} selected={selected % plan.length} select={select}/>
    <Card title={`${slot.name} · ${viewWeek}주차 계획`} subtitle={`${slot.exercises.length}종목 · 본세트만 표시 · ${mode === 'demo' ? '예시 자료와 함께 보는 계획' : '내 설정 기준'}`}><PlanTable slot={slot}/><p className="chart-footnote">준비운동: 허용된 가벼운 움직임 5–8분과 첫 복합 동작의 가벼운 준비세트. 과거 최고 기록으로 시작 중량을 자동 지정하지 않습니다. 계획표는 Strong에 직접 옮겨 적어 사용하세요.</p></Card>
    <div className="dashboard-grid"><Card title="계획된 주간 노출" subtitle="직접 세트와 간접 노출을 따로 확인하세요."><PlannedVolume plan={plan}/></Card><Card title="계획을 사용하는 순서"><ol className="steps-list"><li><b>01</b><div><strong>설계와 근거 확인</strong><p>빈도·종목·세트·반복 범위를 정하고 선택 이유를 확인합니다.</p></div></li><li><b>02</b><div><strong>Strong에서 실제 수행 기록</strong><p>CSV는 자동 연동되지 않습니다. 검토할 때 최신 파일을 가져오세요.</p></div></li><li><b>03</b><div><strong>증량과 다음 주 검토</strong><p>현재 기록과 회복을 확인하고 유지·축소·변경 이유를 남깁니다.</p></div></li></ol><button className="text-button" onClick={() => navigate('review')}>주간 검토 열기<ArrowRight size={14}/></button></Card></div>
    <details className="planning-details"><summary>12주 단계와 24주 로드맵</summary><div className="roadmap"><div><b>1–4주 · 기준 만들기</b><p>1 → 2세트, RIR 4 → 3. 통증·기술·현재 수행을 확인합니다. 기간은 개인 최적값이 아닙니다.</p></div><div><b>5–12주 · 수행과 평가</b><p>반복 상단을 쌓고 8·12주에 평가합니다. 피로가 높으면 세트를 줄이며 달력만으로 증량하지 않습니다.</p></div><div><b>13–24주 · 조정과 다음 블록</b><p>16·24주에 회복·이행·수행을 평가합니다. 정체만으로 세트를 자동 추가하지 않습니다.</p></div></div></details>
    <Notice>이 프로그램은 현재 입력과 일반 연구를 바탕으로 한 초안입니다. 통증·심폐 증상·기존 질환이 있으면 운동 허용 범위를 확인하세요. <button className="text-button" onClick={() => navigate('designer')}>설계 근거 보기</button></Notice>
  </>;
}

function ProfileControls({ change }: { change: (values: Partial<Profile>) => void }) {
  const { data } = useApp(); const profile = data.profile;
  return <><div className="program-controls"><div><span className="control-label">주간 빈도</span><div className="segmented">{([2, 3, 4] as const).map(days => <button key={days} aria-pressed={profile.days === days} className={profile.days === days ? 'active' : ''} onClick={() => change({ days })}>주 {days}회</button>)}</div></div><div><span className="control-label">세션 길이</span><div className="segmented">{([60, 30] as const).map(minutes => <button key={minutes} className={profile.minutes === minutes ? 'active' : ''} onClick={() => change({ minutes })}>{minutes === 60 ? '기본 45–75분' : '압축 25–35분'}</button>)}</div></div></div>
    <div className="program-controls"><Field label="운동 환경"><select value={profile.equipment} onChange={event => change({ equipment: event.target.value as Profile['equipment'] })}><option value="gym">헬스장</option><option value="home">집 · 덤벨/밴드</option></select></Field><div><span className="control-label">핵심 동작</span><div className="segmented"><button className={profile.programStyle !== 'barbell' ? 'active' : ''} aria-pressed={profile.programStyle !== 'barbell'} onClick={() => change({ programStyle: 'supported' })}>지지형 중심</button><button className={profile.programStyle === 'barbell' ? 'active' : ''} aria-pressed={profile.programStyle === 'barbell'} disabled={profile.equipment === 'home'} onClick={() => change({ programStyle: 'barbell' })}>3대·OHP 중심</button></div></div></div>
    <label className="checkbox-field"><input type="checkbox" checked={profile.includeCalves === true} onChange={event => change({ includeCalves: event.target.checked })}/><span>카프 레이즈 추가 <small>종아리 성장을 더 원할 때 선택합니다.</small></span></label><label className="checkbox-field"><input type="checkbox" checked={profile.includeHipThrust === true} onChange={event => change({ includeHipThrust: event.target.checked })}/><span>힙 스러스트 추가 <small>둔근 직접 노출을 더 원할 때 선택합니다.</small></span></label></>;
}

function SlotEditor({ slot, onDirty }: { slot: PlanSlot; onDirty: (value: boolean) => void }) {
  const { data, update, notify } = useApp(); const key = planKey(data.profile, slot.id);
  const [rows, setRows] = useState<PlannedExercise[]>(() => slot.exercises.map(item => ({ exerciseId: item.exercise.id, sets: item.sets, reps: item.reps, rir: item.rir, rest: item.rest })));
  const [addition, setAddition] = useState('');
  const choices = EXERCISES.filter(item => !['cardio', 'timed'].includes(item.load) && (data.profile.equipment !== 'home' || ['bodyweight', 'dumbbell'].includes(item.equipment)));
  const edit = (next: PlannedExercise[]) => { setRows(next); onDirty(true); };
  const field = (index: number, values: Partial<PlannedExercise>) => edit(rows.map((row, position) => position === index ? { ...row, ...values } : row));
  const save = (event: FormEvent) => {
    event.preventDefault();
    const checked = slotPlanSchema.safeParse(rows);
    if (!checked.success) return notify('종목 중복, 세트 1–6, 반복 3–30(하한≤상한), RIR 2–5, 휴식 60–300초를 확인하세요.');
    const profile = profileSchema.safeParse({ ...data.profile, customPlans: { ...data.profile.customPlans, [key]: checked.data } });
    if (!profile.success) return notify('설정 가능한 설계 수나 입력 범위를 확인하세요.');
    update(previous => ({ ...previous, profile: profile.data })); onDirty(false); notify(`${slot.name} 설계를 저장했습니다. 내 프로그램과 증량 계획에 적용됩니다.`);
  };
  return <form className="planner-editor" onSubmit={save}><div className="editor-rows">{rows.map((row, index) => <div className="editor-row" key={index}><div className="editor-row-heading"><span className="exercise-number">{String(index + 1).padStart(2, '0')}</span><strong>{EXERCISES.find(item => item.id === row.exerciseId)?.name}</strong><div className="editor-order"><button type="button" className="icon-button" aria-label={`${index + 1}번 위로`} disabled={index === 0} onClick={() => { const next = [...rows]; [next[index - 1], next[index]] = [next[index], next[index - 1]]; edit(next); }}><ArrowUp size={16}/></button><button type="button" className="icon-button" aria-label={`${index + 1}번 아래로`} disabled={index === rows.length - 1} onClick={() => { const next = [...rows]; [next[index + 1], next[index]] = [next[index], next[index + 1]]; edit(next); }}><ArrowDown size={16}/></button><button type="button" className="icon-button" aria-label={`${index + 1}번 종목 제거`} disabled={rows.length === 1} onClick={() => edit(rows.filter((_, position) => position !== index))}><Trash2 size={16}/></button></div></div><div className="editor-fields"><Field label={`${index + 1}번 종목`}><select value={row.exerciseId} onChange={event => field(index, { exerciseId: event.target.value })}>{choices.map(exercise => <option key={exercise.id} value={exercise.id} disabled={rows.some((other, position) => position !== index && other.exerciseId === exercise.id)}>{exercise.name}</option>)}</select></Field><Field label={`${index + 1}번 세트`}><input type="number" min="1" max="6" required value={row.sets} onChange={event => field(index, { sets: Number(event.target.value) })}/></Field><Field label={`${index + 1}번 반복 하한`}><input type="number" min="3" max="30" required value={row.reps[0]} onChange={event => field(index, { reps: [Number(event.target.value), row.reps[1]] })}/></Field><Field label={`${index + 1}번 반복 상한`}><input type="number" min={row.reps[0]} max="30" required value={row.reps[1]} onChange={event => field(index, { reps: [row.reps[0], Number(event.target.value)] })}/></Field><Field label={`${index + 1}번 RIR`}><input type="number" min="2" max="5" required value={row.rir} onChange={event => field(index, { rir: Number(event.target.value) })}/></Field><Field label={`${index + 1}번 휴식 (초)`}><input type="number" min="60" max="300" step="10" required value={row.rest} onChange={event => field(index, { rest: Number(event.target.value) })}/></Field></div></div>)}</div><div className="editor-add"><Field label="추가할 종목"><select value={addition} onChange={event => setAddition(event.target.value)}><option value="">종목 선택</option>{choices.filter(item => !rows.some(row => row.exerciseId === item.id)).map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field><button type="button" className="button secondary" disabled={!addition || rows.length >= (data.profile.minutes === 30 ? 4 : 12)} onClick={() => { edit([...rows, { exerciseId: addition, sets: 2, reps: [10, 15], rir: 2, rest: 90 }]); setAddition(''); }}><Plus size={15}/>종목 추가</button></div><div className="button-row"><button className="button dark" type="submit"><Check size={16}/>이 슬롯 설계 저장</button><button type="button" className="button secondary" disabled={!data.profile.customPlans?.[key]} onClick={() => { const customPlans = { ...data.profile.customPlans }; delete customPlans[key]; update(previous => ({ ...previous, profile: { ...previous.profile, customPlans } })); onDirty(false); notify('이 슬롯을 기본 설계로 되돌렸습니다.'); }}>기본 설계로 복원</button></div><p className="chart-footnote">변경 후 저장하세요. 빈도·시간·환경·선택 운동이 다른 구성은 각각 저장합니다. 재적응·평가 주차에는 세트 상한과 RIR를 완화하고, 압축형은 최대 4종목·2세트로 제한합니다.</p></form>;
}

export function Designer() {
  const { data, update, navigate, mode, setMode } = useApp();
  const [selected, select] = useState(0); const [dirty, setDirty] = useState(false);
  const plan = buildPlan(data.profile, 6); const slot = plan[selected % plan.length];
  const absent = plannedMuscles(plan).filter(item => ['chest', 'back', 'quads', 'hamstrings'].includes(item.muscle) && item.direct === 0);
  const guard = () => !dirty || window.confirm('저장하지 않은 설계 변경을 버리고 이동할까요?');
  const change = (values: Partial<Profile>) => { if (!guard()) return; update(previous => ({ ...previous, profile: { ...previous.profile, ...values } })); if (['days', 'minutes', 'equipment', 'programStyle'].some(key => key in values)) select(0); setDirty(false); };
  return <><PageHeading eyebrow="DESIGN WITH A REASON" title="프로그램 설계" description="가능한 일정과 선호 동작에서 시작해, 부위별 노출과 근거를 확인하며 설계하세요." action={<button className="button secondary" onClick={() => { if (guard()) navigate('program'); }}>내 프로그램 보기<ArrowRight size={15}/></button>}/>
    {mode === 'demo' && <Notice>예시 자료를 보는 중입니다. 개인 설계와 섞이지 않도록 편집을 잠시 비활성화했습니다. <button className="text-button" onClick={() => setMode('personal')}>내 계획으로 전환</button></Notice>}
    <fieldset className="planning-fieldset" disabled={mode === 'demo'}><Card title="일정과 핵심 동작" subtitle="여기서 바꾼 기본 구성은 바로 저장됩니다. 종목별 수정은 아래 저장 버튼을 사용하세요."><ProfileControls change={change}/></Card>
    <SlotTabs plan={plan} selected={selected % plan.length} select={index => { if (guard()) { select(index); setDirty(false); } }}/>
    <Card title={`${slot.name} 설계 편집`} subtitle="성장기(5–7주) 기준 · 초기·평가 주차에는 더 적은 세트와 높은 RIR 적용"><SlotEditor key={`${planKey(data.profile, slot.id)}-${JSON.stringify(data.profile.customPlans?.[planKey(data.profile, slot.id)] ?? null)}`} slot={slot} onDirty={setDirty}/></Card></fieldset>
    {absent.length > 0 && <Notice tone="warning">직접 세트가 계획되지 않은 주요 부위: {absent.map(item => item.name).join(' · ')}. 의도한 선택인지, 대체 동작·간접 노출로 충분한지 검토하세요. 세트는 자동 추가하지 않습니다.</Notice>}
    <Card title="현재 저장된 설계의 주간 노출" subtitle="성장기 기준 · 미저장 입력은 반영하지 않습니다."><PlannedVolume plan={plan}/></Card>
    <DesignReasons/>
    <Notice>선택한 세트 수의 효과는 실제 수행·회복을 보고 판단합니다. 많은 세트나 특정 종목을 의무화하지 않습니다. <button className="text-button" onClick={() => navigate('research')}>전체 연구와 한계 보기</button></Notice>
  </>;
}

function ReadinessForm() {
  const { data, update, notify, mode } = useApp(); const today = koreaDay(); const entry = data.checkIns.find(item => item.date === today);
  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const form = new FormData(event.currentTarget); const optional = (key: string) => form.get(key) === '' ? null : Number(form.get(key));
    const result = checkInSchema.safeParse({ id: entry?.id ?? crypto.randomUUID(), date: today, weight: entry?.weight ?? null, waist: entry?.waist ?? null, protein: entry?.protein ?? null, notes: entry?.notes ?? '', pain: optional('pain'), fatigue: optional('fatigue'), sleep: optional('sleep'), symptoms: form.get('symptoms') === 'on' });
    if (!result.success) return notify('회복 입력 범위를 확인하세요.');
    update(previous => ({ ...previous, profile: { ...previous.profile, clearance: form.get('clearance') === 'on' ? 'confirmed' : 'unknown' }, checkIns: [...previous.checkIns.filter(item => item.date !== today), result.data] })); notify('오늘의 확인 내용을 저장했습니다.');
  };
  return <Card title="증량 전 오늘의 확인" subtitle={`${today} · 삼성 헬스 자동 연동은 제공하지 않습니다. 필요한 요약만 직접 입력하세요.`}><form onSubmit={save}><fieldset className="planning-fieldset" disabled={mode === 'demo'}><div className="form-grid"><Field label="검토용 오늘 통증 (0–10)"><input name="pain" type="number" min="0" max="10" defaultValue={entry?.pain ?? ''} placeholder="미확인"/></Field><Field label="검토용 오늘 피로 (1–5)"><input name="fatigue" type="number" min="1" max="5" defaultValue={entry?.fatigue ?? ''} placeholder="미확인"/></Field><Field label="검토용 지난밤 수면 (시간)"><input name="sleep" type="number" min="0" max="24" step="0.5" defaultValue={entry?.sleep ?? ''} placeholder="미확인"/></Field></div><label className="checkbox-field"><input name="symptoms" type="checkbox" defaultChecked={entry?.symptoms ?? false}/><span>흉통·실신 느낌·심한 호흡곤란·평소와 다른 심계항진이 있습니다.</span></label><label className="checkbox-field"><input name="clearance" type="checkbox" defaultChecked={data.profile.clearance === 'confirmed'}/><span>필요한 운동 허용 범위를 확인했습니다. <small>자기 확인 항목이며 앱이 운동 안전성을 보증하지 않습니다.</small></span></label><button className="button secondary" type="submit">오늘의 확인 저장</button></fieldset></form></Card>;
}

function ProgressionCard({ target }: { target: Prescription }) {
  const { data, sessions, update, notify, mode } = useApp();
  const today = koreaDay(); const readiness = mode === 'demo' ? undefined : data.checkIns.find(item => item.date === today);
  const result = progressionAssessment(target, sessions, data.profile, readiness);
  const [binding, setBinding] = useState(result.sourceName); const [confirmed, confirm] = useState(false);
  const names = [...new Set([result.sourceName, target.exercise.name, ...sessions.filter(session => session.date <= today).flatMap(session => session.sets.filter(set => set.exerciseId === target.exercise.id && isWorkSet(set)).map(set => set.exercise))])];
  const advice = result.advice;
  return <Card className="progression-card" title={target.exercise.name} subtitle={`${target.sets}세트 × ${target.reps.join('–')}회 · RIR ${target.rir} · 휴식 ${target.rest}초`} action={<span className={`decision-badge decision-${advice.status}`}>{advice.status === 'increase' ? '증량 검토' : advice.status === 'stop' ? '중단 확인' : advice.status === 'reduce' ? '축소 검토' : '유지·정보 확인'}</span>}>
    <div className={`progression-advice advice-${advice.status}`}><TrendingUp size={18}/><div><strong>{advice.title}{advice.nextWeight !== null ? ` · ${fmt(advice.nextWeight, 1)} kg` : ''}</strong><p>{advice.detail}</p></div></div>
    <details className="binding-details" open={!result.exposures.length}><summary><Link2 size={14}/>비교할 Strong 종목: {result.sourceName}</summary><p className="chart-footnote">가져온 원래 종목명 그대로 비교합니다. 기구·스미스·자유중량·덤벨 기준이 같은지 직접 확인하세요. 이름을 바꿔도 과거 기록은 수정하지 않습니다.</p><fieldset className="planning-fieldset" disabled={mode === 'demo'}><Field label={`${target.exercise.name} 기록 연결`}><select value={binding} onChange={event => { setBinding(event.target.value); confirm(false); }}>{names.map(name => <option key={name}>{name}</option>)}</select></Field><label className="checkbox-field"><input type="checkbox" checked={confirmed} onChange={event => confirm(event.target.checked)}/><span>현재 동작·기구·중량 표기 기준이 같은 기록임을 확인했습니다.</span></label><button className="button secondary small" disabled={!confirmed} onClick={() => { update(previous => ({ ...previous, profile: { ...previous.profile, recordBindings: { ...previous.profile.recordBindings, [target.exercise.id]: binding } } })); confirm(false); notify('비교할 원래 종목명을 연결했습니다.'); }}>기록 연결 저장</button></fieldset></details>
    <div className="exposure-grid">{[0, 1].map(index => <div key={index}><span>{index + 1}번째 최근 노출</span><strong>{result.exposures[index]?.date ?? '비교할 기록 없음'}</strong><p>{result.exposures[index]?.sets.map(set => `${set.weight ?? '미입력'}kg × ${set.reps}회 · RIR ${set.rir ?? '미입력'}`).join(' / ') ?? '최근 28일의 같은 원래 종목명 기록이 필요합니다.'}</p></div>)}</div>
    <details className="method-details"><summary>판단 조건 {result.checks.filter(item => item.met).length}/{result.checks.length} 확인</summary><ul className="decision-checks">{result.checks.map(check => <li key={check.label}><span className={check.met ? 'check-met' : ''}>{check.met ? '✓' : '○'}</span>{check.label}</li>)}</ul><p className="chart-footnote">기구별 증량 단위와 외부 중량 여부도 확인합니다. 누락 RIR·회복 정보는 정상으로 채우지 않습니다.</p></details>
  </Card>;
}

export function ProgressionPlanner() {
  const { data, update, navigate, notify, mode } = useApp(); const week = currentWeek(data.profile.startDate); const plan = buildPlan(data.profile, week); const [selected, select] = useState(0); const slot = plan[selected % plan.length];
  const saveIncrement = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const increment = Number(new FormData(event.currentTarget).get('increment')); if (!Number.isFinite(increment) || increment < 0.1 || increment > 10) return notify('증량 단위는 0.1–10kg 범위로 입력하세요.'); update(previous => ({ ...previous, profile: { ...previous.profile, increment } })); notify('증량 단위를 저장했습니다.'); };
  return <><PageHeading eyebrow="PROGRESSION, WITH CONDITIONS" title="증량 계획" description="최근 두 번의 수행 → 목표 반복·RIR → 오늘 회복. 숫자와 보류 이유를 함께 확인하세요." action={<button className="button secondary" onClick={() => navigate('settings')}><FileUp size={15}/>Strong CSV 갱신</button>}/><ImportPrompt/>
    <Notice>현재 {week}주차의 실제 계획을 기준으로 판단합니다. Strong의 미입력 RIR를 자동 추정하지 않습니다. 후보 종목명이 여러 개이거나 영문으로 가져왔다면 각 카드에서 같은 기구의 기록을 연결하세요.</Notice>
    <ReadinessForm key={`${koreaDay()}-${mode}`}/>
    <Card title="증량 단위와 진행 방식"><form className="increment-form" onSubmit={saveIncrement}><Field label="사용 가능한 최소 증량 단위 (kg)"><input name="increment" type="number" min="0.1" max="10" step="0.1" required defaultValue={data.profile.increment}/></Field><button className="button secondary" disabled={mode === 'demo'} type="submit">증량 단위 저장</button></form><p className="planning-copy">반복 범위 상단을 최근 두 번 충족하면 약 2.5%를 기구 단위에 맞춰 검토합니다. 최소 단위가 현재 중량의 10%를 넘으면 보류합니다. 통증·피로·누락 기록이 있으면 무조건 올리지 않습니다.</p><EvidenceReferences ids={['acsm-2026', 'proximity-2024']}/></Card>
    <SlotTabs plan={plan} selected={selected % plan.length} select={select}/>
    <div className="progression-cards">{slot.exercises.map(target => <ProgressionCard key={`${slot.id}-${target.exercise.id}-${data.profile.recordBindings?.[target.exercise.id] ?? ''}`} target={target}/>)}</div>
    <Notice>과거 최고 기록으로 시작 중량을 처방하지 않습니다. 제안은 현재 입력을 바탕으로 한 검토이며 개인의 운동 허가·최대근력을 의미하지 않습니다.</Notice>
  </>;
}

export function WeeklyReview() {
  const { data, sessions, update, navigate, notify, mode } = useApp(); const today = koreaDay();
  const [start, setStart] = useState(addDays(monday(today), -7)); const review = reviewWeek(sessions, data.profile, start); const saved = data.reviews?.find(item => item.week === start);
  const save = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const form = new FormData(event.currentTarget); const action = form.get('action') as 'keep' | 'reduce' | 'change'; const note = String(form.get('note') ?? '').trim(); if (!note || note.length > 2000) return notify('다음 주 결정 이유를 1–2000자로 남겨 주세요.'); update(previous => ({ ...previous, reviews: [...(previous.reviews ?? []).filter(item => item.week !== start), { week: start, action, note, recordedAt: new Date().toISOString() }].slice(-1000) })); notify('주간 검토를 저장했습니다. 프로그램은 설계 화면에서 직접 적용하세요.'); };
  return <><PageHeading eyebrow="REVIEW BEFORE ADDING MORE" title="주간 검토" description="Strong 기록을 갱신하고, 수행한 양과 현재 계획을 비교한 뒤 다음 주의 결정을 남기세요." action={<button className="button secondary" onClick={() => navigate('settings')}><FileUp size={15}/>CSV 갱신</button>}/><ImportPrompt/>
    <div className="program-toolbar"><Field label="검토할 주의 날짜"><input type="date" max={today} value={start} onChange={event => { if (event.target.value) setStart(monday(event.target.value)); }}/></Field><p>{review.start} – {review.end} · {review.partial ? '진행 중인 주' : '완료된 주'} · {data.importedAt ? `마지막 CSV 적용 ${koreaDay(new Date(data.importedAt))}` : 'CSV 적용 시각 없음'}</p></div>
    <div className="metric-grid planning-metrics"><Metric icon={Target} label="기록된 운동일" value={review.stats.days} unit="일" detail={`현재 목표 주 ${data.profile.days}회 · ${review.stats.sessions}세션`} accent/><Metric icon={Layers3} label="실제 기록 본세트" value={review.stats.sets} unit="세트" detail="준비·드롭·휴식·시간 운동 제외"/><Metric icon={ClipboardList} label="RIR 확인된 본세트" value={review.stats.sets ? `${review.stats.sets - review.stats.missingRir}/${review.stats.sets}` : '—'} detail="누락값은 추정하지 않습니다"/></div>
    <div className="review-observations">{review.observations.map(item => <Card key={item.title} title={item.title}><p className="planning-copy">{item.detail}</p><button className="text-button" onClick={() => navigate(item.action === 'import' ? 'settings' : item.action === 'progression' ? 'progression' : 'designer')}>{item.action === 'import' ? 'CSV 가져오기' : item.action === 'progression' ? '증량 조건 확인' : '다음 주 설계 검토'}<ArrowRight size={14}/></button></Card>)}</div>
    <Card title="현재 계획과 기록된 부위별 노출" subtitle="현재 설정으로 환산한 비교선입니다. 과거 계획·완료율을 복원한 수치가 아닙니다."><div className="table-scroll"><table className="review-volume"><thead><tr><th>부위</th><th>현재 계획 직접</th><th>기록 직접</th><th>기록 간접</th></tr></thead><tbody>{review.volumes.filter(item => item.direct || item.actual || item.actualIndirect).map(item => <tr key={item.muscle}><td>{item.name}</td><td>{item.direct}</td><td><strong>{item.actual}</strong></td><td>{item.actualIndirect}</td></tr>)}</tbody></table></div><p className="chart-footnote">계획이 바뀌었거나 운동 기록이 누락됐을 수 있습니다. 직접 세트 0이 자극 0을 의미하지 않습니다. 차이만으로 세트를 자동 추가하지 않습니다.</p></Card>
    <Card title="다음 주 결정 남기기" subtitle={saved ? '이 주의 검토가 저장돼 있습니다. 수정하면 같은 주의 기록을 교체합니다.' : '기록을 확인한 후 한 번에 한 요소를 조절하세요.'}><form key={`${start}-${saved?.recordedAt ?? ''}`} onSubmit={save}><fieldset className="planning-fieldset" disabled={mode === 'demo'}><div className="form-grid"><Field label="다음 주 결정"><select name="action" defaultValue={saved?.action ?? 'keep'}><option value="keep">현재 계획 유지</option><option value="reduce">빈도·세트 축소 검토</option><option value="change">종목·구성 변경 검토</option></select></Field><Field label="결정 이유와 적용할 변경"><textarea name="note" required maxLength={2000} defaultValue={saved?.note ?? ''} placeholder="예: 바쁜 주에는 2회로 전환하고 핵심 동작을 유지. 통증·회복·기록 누락도 함께 확인."/></Field></div><div className="button-row"><button className="button dark" type="submit">주간 검토 저장</button><button className="button secondary" type="button" onClick={() => navigate('designer')}>설계에 직접 반영<ArrowRight size={14}/></button></div></fieldset></form><p className="chart-footnote">검토 메모 저장이 프로그램을 자동 변경하지는 않습니다. 예시 모드에서는 개인 검토를 저장하지 않습니다.</p></Card>
    <details className="planning-details"><summary>영양·회복과 보조 도구</summary><p className="planning-copy">식사·활동·수면은 사용 중인 앱에 계속 기록하세요. 이 웹앱에는 삼성 헬스 자동 연동이나 식품별 칼로리 기록 기능이 없습니다. 필요한 체중·수면·피로 요약만 선택적으로 남길 수 있습니다.</p><div className="button-row"><button className="button secondary" onClick={() => navigate('nutrition')}>회복 체크인·참고 식사</button><button className="button secondary" onClick={() => navigate('log')}>웹에서 세트 기록(보조)</button><button className="button secondary" onClick={() => navigate('diagnosis')}>기록 인사이트 더 보기</button></div></details>
  </>;
}
