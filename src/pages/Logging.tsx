import { ArrowRight, Check, CirclePause, CirclePlay, HeartPulse, Plus, RotateCcw, TimerReset, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useApp } from '../AppContext.tsx';
import { Card, Field, Notice, PageHeading, fmt } from '../components/ui.tsx';
import { previousSets, buildPlan, phase, progression } from '../domain/program.ts';
import { currentWeek, koreaDay } from '../domain/time.ts';
import { checkInSchema } from '../domain/storage.ts';
import type { CheckIn, Session, TrainingSet } from '../domain/types.ts';

interface DraftSet { id: string; weight: string; reps: string; rir: string; warmup: boolean }
function newSet(): DraftSet { return { id: crypto.randomUUID(), weight: '', reps: '', rir: '', warmup: false }; }
export function RestTimer() {
  const [left, setLeft] = useState(0); const [end, setEnd] = useState<number | null>(null);
  useEffect(() => {
    if (end === null) return;
    const tick = () => { const remaining = Math.max(0, Math.ceil((end - Date.now()) / 1000)); setLeft(remaining); if (remaining === 0) setEnd(null); };
    tick(); const id = window.setInterval(tick, 250); return () => window.clearInterval(id);
  }, [end]);
  return <section className="rest-timer" aria-label="휴식 타이머"><span><TimerReset size={19}/>휴식 타이머</span><strong role="timer" aria-label="남은 휴식 시간">{Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')}</strong><div className="timer-presets">{[60, 90, 150].map(seconds => <button key={seconds} onClick={() => { setLeft(seconds); setEnd(Date.now() + seconds * 1000); }}>{seconds}초</button>)}</div><button className="icon-button" aria-label={end === null ? '타이머 재개' : '타이머 일시정지'} onClick={() => setEnd(end === null && left > 0 ? Date.now() + left * 1000 : null)}>{end === null ? <CirclePlay size={20}/> : <CirclePause size={20}/>}</button><button className="icon-button" aria-label="타이머 초기화" onClick={() => { setEnd(null); setLeft(0); }}><RotateCcw size={17}/></button></section>;
}
export function Log({ requestedSlot }: { requestedSlot: string | null }) {
  const { data, update, notify, navigate, mode, setMode } = useApp();
  const week = currentWeek(data.profile.startDate); const plan = buildPlan(data.profile, week);
  const initial = Math.max(0, requestedSlot ? plan.findIndex(item => item.id === requestedSlot) : data.nextSlot % plan.length);
  const [slotIndex, setSlotIndex] = useState(initial); const slot = plan[slotIndex % plan.length];
  const makeDraft = (index: number) => Object.fromEntries(plan[index].exercises.map(item => [item.exercise.id, Array.from({ length: item.sets }, newSet)]));
  const [draft, setDraft] = useState<Record<string, DraftSet[]>>(() => makeDraft(initial));
  const [date, setDate] = useState(koreaDay()); const [duration, setDuration] = useState(''); const [notes, setNotes] = useState('');
  const todayCheck = data.checkIns.find(item => item.date === date);
  const [pain, setPain] = useState(''); const [fatigue, setFatigue] = useState(''); const [sleep, setSleep] = useState(''); const [symptoms, setSymptoms] = useState(todayCheck?.symptoms ?? false);
  const readiness = { pain: pain === '' ? todayCheck?.pain ?? null : Number(pain), fatigue: fatigue === '' ? todayCheck?.fatigue ?? null : Number(fatigue), sleep: sleep === '' ? todayCheck?.sleep ?? null : Number(sleep), symptoms };
  const setValue = (exerciseId: string, id: string, values: Partial<DraftSet>) => setDraft(previous => ({ ...previous, [exerciseId]: previous[exerciseId].map(set => set.id === id ? { ...set, ...values } : set) }));
  const readinessEntry = (): CheckIn => ({ ...todayCheck, id: todayCheck?.id ?? crypto.randomUUID(), date, weight: todayCheck?.weight ?? null, waist: todayCheck?.waist ?? null, protein: todayCheck?.protein ?? null, notes: todayCheck?.notes ?? '', ...readiness });
  const recordSymptoms = () => { const entry = checkInSchema.safeParse(readinessEntry()); if (!entry.success || date > koreaDay()) return notify('몸 상태의 입력 범위와 날짜를 확인해 주세요.'); update(previous => ({ ...previous, checkIns: [...previous.checkIns.filter(item => item.date !== date), entry.data] })); notify('증상 확인만 저장했습니다. 운동을 중단하고 적절한 진료를 받으세요.'); };
  const complete = (event: FormEvent) => {
    event.preventDefault(); if (symptoms) return;
    if (!checkInSchema.safeParse(readinessEntry()).success || date > koreaDay()) return notify('몸 상태의 입력 범위와 날짜를 확인해 주세요.');
    const sets: TrainingSet[] = []; let invalid = false;
    slot.exercises.forEach(item => draft[item.exercise.id].forEach((set, index) => {
      if (!set.weight && !set.reps && !set.rir) return;
      const weight = set.weight === '' ? null : Number(set.weight); const reps = Number(set.reps); const rir = set.rir === '' ? null : Number(set.rir);
      if (!Number.isInteger(reps) || reps < 1 || reps > 2000 || (weight !== null && (!Number.isFinite(weight) || weight < 0 || weight > 1500)) || (rir !== null && (!Number.isFinite(rir) || rir < 0 || rir > 10))) { invalid = true; return; }
      sets.push({ id: set.id, exercise: item.exercise.name, exerciseId: item.exercise.id, order: set.warmup ? 'W' : String(index + 1), kind: set.warmup ? 'warmup' : 'work', weight, reps, rir, rpe: null, seconds: null, distance: null, notes: '' });
    }));
    if (invalid) return notify('입력한 세트의 반복수·중량·RIR 범위를 확인해 주세요. 반복수는 1회 이상 필요합니다.');
    if (!sets.length) return notify('실제로 수행한 세트를 한 개 이상 입력해 주세요. 빈 세트는 기록하지 않습니다.');
    const sourceId = crypto.randomUUID(); const now = new Date();
    const startedAt = date === koreaDay() ? now.toISOString() : new Date(`${date}T12:00:00+09:00`).toISOString();
    const session: Session = { id: `log:${sourceId}`, source: 'log', sourceId, date, startedAt, name: `${slot.name} · ${week}주`, duration: duration === '' ? null : Number(duration) * 60, notes, sets, slot: slot.id };
    update(previous => ({ ...previous, sessions: [...previous.sessions, session], nextSlot: sets.some(set => set.kind === 'work') ? previous.nextSlot + ((slotIndex - previous.nextSlot % plan.length + plan.length) % plan.length) + 1 : previous.nextSlot, checkIns: pain !== '' || fatigue !== '' || sleep !== '' ? [...previous.checkIns.filter(item => item.date !== date), readinessEntry()] : previous.checkIns }));
    setMode('personal'); notify(`${sets.filter(set => set.kind === 'work').length}개 본세트를 기록했습니다. 오늘도 수고했어요.`); navigate('program');
  };
  if (mode === 'demo') return <><PageHeading eyebrow="LOG YOUR TRAINING" title="이제 나의 기록을 시작해요" description="예시 기록은 개인 기록에 섞이지 않습니다."/><Card><Notice>이 화면에서 입력하는 내용은 실제 개인 기록으로 저장됩니다. 예시 모드에서 나와 시작하세요.</Notice><button className="button dark" onClick={() => setMode('personal')}>내 운동 기록 시작<ArrowRight size={16}/></button></Card></>;
  return <><PageHeading eyebrow="LOG YOUR TRAINING" title="지금, 이 세트에 집중하기" description={`${week}주 · ${phase(week).name} · 빈 세트와 미입력 RIR는 저장할 때 채우지 않습니다.`}/>
    {data.profile.clearance === 'unknown' && <Notice tone="warning">운동 허용 범위를 확인하지 않은 상태입니다. 통증·심폐 증상·기존 질환이 있다면 시작 전 확인이 필요합니다. 시작 중량과 최대강도를 자동 처방하지 않습니다.</Notice>}
    <RestTimer/>
    <Card title="오늘의 몸 상태" subtitle="입력은 선택이지만, 증상이 있으면 운동을 중단하세요."><div className="form-grid"><Field label="통증 (0–10)"><input aria-label="오늘 통증" type="number" min="0" max="10" value={pain} onChange={event => setPain(event.target.value)} placeholder={todayCheck?.pain === null || todayCheck?.pain === undefined ? '미입력' : String(todayCheck.pain)}/></Field><Field label="피로 (1–5)"><select aria-label="오늘 피로" value={fatigue} onChange={event => setFatigue(event.target.value)}><option value="">{todayCheck?.fatigue ? `오늘 기록: ${todayCheck.fatigue}` : '미입력'}</option>{[1, 2, 3, 4, 5].map(value => <option key={value} value={value}>{value}{value === 5 ? ' · 매우 높음' : value === 1 ? ' · 낮음' : ''}</option>)}</select></Field><Field label="지난밤 수면 (시간)"><input aria-label="오늘 수면" type="number" min="0" max="24" step="0.5" value={sleep} onChange={event => setSleep(event.target.value)} placeholder="미입력"/></Field></div><label className="checkbox-field"><input aria-label="운동 중단이 필요한 증상" type="checkbox" checked={symptoms} onChange={event => setSymptoms(event.target.checked)}/><span>흉통·실신 느낌·심한 호흡곤란·평소와 다른 심계항진이 있어요.</span></label>{symptoms && <Notice tone="danger"><strong>운동을 중단하세요.</strong> 증상이 심하거나 지속되면 응급 도움을 요청하세요. 적절한 진료와 운동 허용 범위를 확인하세요.<button className="button secondary small" onClick={recordSymptoms}>증상 확인만 저장</button></Notice>}</Card>
    <form onSubmit={complete}><div className="log-session-header"><div className="segmented">{plan.map((item, index) => <button type="button" key={item.id} className={slotIndex === index ? 'active' : ''} onClick={() => { if (Object.values(draft).flat().some(set => set.reps || set.weight || set.rir) && !window.confirm('입력 중인 세트를 지우고 다른 슬롯으로 바꿀까요?')) return; setSlotIndex(index); setDraft(makeDraft(index)); }}>{item.name}</button>)}</div><Field label="운동일"><input aria-label="운동일" type="date" max={koreaDay()} required value={date} onChange={event => setDate(event.target.value)}/></Field></div>
      {slot.exercises.map((item, exerciseIndex) => {
        const previous = previousSets(data.sessions, item.exercise.id);
        const advice = progression(item.exercise.id, data.sessions, item, readiness, data.profile.increment);
        const unconfirmedIncrease = advice.status === 'increase' && data.profile.clearance !== 'confirmed';
        return <Card className="log-exercise" key={item.exercise.id}><header><span className="exercise-number">{String(exerciseIndex + 1).padStart(2, '0')}</span><div><h2>{item.exercise.name}</h2><p>목표 {item.reps.join('–')}회 · RIR {item.rir} · 휴식 {item.rest}초</p></div><span className="pill soft">{item.sets} 본세트</span></header><p className="previous-record">지난 기록: {previous.length ? previous.map(set => `${set.weight ?? '미입력'} kg × ${set.reps}회${set.rir === null ? ' · RIR 미입력' : ` · RIR ${set.rir}`}`).join(' / ') : '없음 · 가볍고 통제 가능한 부하를 직접 선택하세요.'}</p><div className="set-grid set-grid-head"><span>세트</span><span>중량 kg</span><span>반복수</span><span>RIR <small>(선택)</small></span><span>준비</span><span/></div>{draft[item.exercise.id].map((set, index) => <div className="set-grid" key={set.id}><span className={`set-number ${set.warmup ? 'warmup' : ''}`}>{set.warmup ? 'W' : index + 1}</span><input disabled={symptoms} aria-label={`${item.exercise.name} ${index + 1}세트 중량`} type="number" min="0" max="1500" step="0.1" inputMode="decimal" value={set.weight} onChange={event => setValue(item.exercise.id, set.id, { weight: event.target.value })} placeholder="—"/><input disabled={symptoms} aria-label={`${item.exercise.name} ${index + 1}세트 반복수`} type="number" min="1" max="2000" inputMode="numeric" value={set.reps} onChange={event => setValue(item.exercise.id, set.id, { reps: event.target.value })} placeholder="—"/><input disabled={symptoms} aria-label={`${item.exercise.name} ${index + 1}세트 RIR`} type="number" min="0" max="10" step="0.5" inputMode="decimal" value={set.rir} onChange={event => setValue(item.exercise.id, set.id, { rir: event.target.value })} placeholder="—"/><input disabled={symptoms} type="checkbox" aria-label={`${item.exercise.name} ${index + 1}세트 준비세트`} checked={set.warmup} onChange={event => setValue(item.exercise.id, set.id, { warmup: event.target.checked })}/><button className="icon-button" type="button" aria-label={`${item.exercise.name} ${index + 1}세트 삭제`} disabled={symptoms || draft[item.exercise.id].length === 1} onClick={() => setDraft(previous => ({ ...previous, [item.exercise.id]: previous[item.exercise.id].filter(row => row.id !== set.id) }))}><Trash2 size={15}/></button></div>)}<button type="button" disabled={symptoms} className="text-button add-set" onClick={() => setDraft(previous => ({ ...previous, [item.exercise.id]: [...previous[item.exercise.id], newSet()] }))}><Plus size={14}/>세트 추가</button><div className={`progression-advice advice-${advice.status}`}><TrendingIcon/><div><strong>{unconfirmedIncrease ? '운동 허용 범위를 먼저 확인하세요' : advice.title}{advice.nextWeight && !unconfirmedIncrease ? ` · 제안 ${fmt(advice.nextWeight, 1)} kg` : ''}</strong><p>{unconfirmedIncrease ? '기록상 반복 기준은 충족했지만 안전 확인 전에는 증량을 제안하지 않습니다.' : advice.detail}</p></div></div><details className="method-details"><summary>동작·대체 종목 안내</summary><p>{item.exercise.cue}</p><p>대체: {item.exercise.alternative}. {item.exercise.note}</p></details></Card>;
      })}
      <Card title="오늘의 마무리"><div className="form-grid"><Field label="운동 시간 (분)" hint="미입력 시 평균 시간 계산에서 제외합니다."><input aria-label="운동 시간 (분)" type="number" min="0" max="1440" step="1" value={duration} onChange={event => setDuration(event.target.value)} placeholder="미입력"/></Field><Field label="메모"><textarea aria-label="운동 메모" value={notes} maxLength={5000} onChange={event => setNotes(event.target.value)} placeholder="실제 컨디션, 조절한 동작 등을 적어 주세요."/></Field></div><Notice>수행한 세트만 저장합니다. 계획을 일부만 수행해도 기록할 수 있습니다. 맨몸 부하와 중량 미입력 세트의 톤수는 추정하지 않습니다.</Notice><button className="button dark large" type="submit" disabled={symptoms}><Check size={18}/>운동 완료 · 기록 저장</button></Card>
    </form>
  </>;
}
function TrendingIcon() { return <HeartPulse size={18}/>; }
