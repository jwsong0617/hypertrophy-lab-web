import { Apple, BookOpen, Check, ExternalLink, HeartPulse, Leaf, Moon, Scale, Utensils } from 'lucide-react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { useApp } from '../AppContext.tsx';
import { Card, Empty, Field, Metric, Notice, PageHeading, fmt } from '../components/ui.tsx';
import { WeightChart } from '../components/charts.tsx';
import { weightAverages } from '../domain/analytics.ts';
import { EVIDENCE, RESEARCH_STATUS } from '../domain/evidence.ts';
import { koreaDay } from '../domain/time.ts';
import { backupSchema } from '../domain/storage.ts';
import type { CheckIn } from '../domain/types.ts';

const MEALS = [
  { title: '준비가 쉬운 아침', time: '5분', items: '그릭 요거트 + 우유 또는 두유 + 과일 + 견과', note: '제품 라벨을 보고 단백질을 조합하세요. 요거트 종류에 따라 함량 차이가 큽니다.' },
  { title: '냉동실에서 꺼낸 한 끼', time: '15분', items: '냉동 닭·생선·두부 + 냉동 채소 + 즉석밥', note: '단백질 손바닥 1–2장, 채소 1–2주먹, 밥은 활동량과 체중 추세에 맞추세요.' },
  { title: '외식하는 날의 기준', time: '유연하게', items: '주 단백질 메뉴 먼저 + 밥·면 + 채소 곁들이기', note: '한 끼를 망쳤다고 보상 단식이나 과도한 운동을 하지 않아도 됩니다.' },
  { title: '부족한 만큼만 간식', time: '3분', items: '달걀 · 우유 · 두유 · 통조림 · 코티지 치즈', note: '포장 단위와 개수를 활용하세요. 정밀한 기록은 원하는 날에만 선택하면 됩니다.' },
];
export function Nutrition() {
  const { data, update, notify, navigate, mode } = useApp();
  const today = koreaDay(); const checks = data.checkIns.slice().sort((a, b) => b.date.localeCompare(a.date));
  const current = checks.find(item => item.date === today);
  const weight = checks.find(item => item.weight !== null && item.date <= today)?.weight ?? data.profile.weight;
  const averages = weightAverages(data.checkIns);
  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const form = new FormData(event.currentTarget); const n = (name: string) => form.get(name) === '' ? null : Number(form.get(name));
    const date = String(form.get('date')); const old = data.checkIns.find(item => item.date === date);
    const entry: CheckIn = { id: old?.id ?? crypto.randomUUID(), date, weight: n('weight'), waist: n('waist'), sleep: n('sleep'), fatigue: n('fatigue'), pain: n('pain'), protein: n('protein'), symptoms: form.get('symptoms') === 'on', notes: String(form.get('notes') ?? '') };
    const next = { ...data, checkIns: [...data.checkIns.filter(item => item.date !== date), entry] };
    if (!backupSchema.safeParse(next).success) return notify('체크인의 날짜와 입력 범위를 확인해 주세요.');
    update(next); notify('체크인을 이 기기에 저장했습니다.');
  };
  return <><PageHeading eyebrow="NUTRITION & RECOVERY" title="성장은 운동 밖에서도 이어져요" description="완벽한 통제보다 반복 가능한 식사와 회복. 측정한 값만 모아 다음 주를 조절하세요."/>
    {mode === 'demo' && <Notice>이 화면의 신체·체크인 수치는 개인 저장소의 직접 입력값입니다. 예시 운동에서 신체 변화를 만들어 내지 않습니다.</Notice>}
    <div className="metric-grid"><Metric icon={Utensils} label="단백질 참고 범위" value={weight ? `${fmt(weight * 1.6)}–${fmt(weight * 2.2)}` : '—'} unit={weight ? 'g/일' : ''} detail={weight ? `${weight} kg × 1.6–2.2 g/kg · 추정 목표` : '체중 입력 후 계산 · 1.6–2.2 g/kg'}/><Metric icon={Scale} label="최근 7일 평균 체중" value={averages.current.value === null ? '—' : fmt(averages.current.value, 1)} unit={averages.current.value === null ? '' : 'kg'} detail={`${averages.current.count}개의 직접 입력 측정값`}/><Metric icon={Moon} label="오늘 기록한 수면" value={current?.sleep ?? '—'} unit={current?.sleep === null || current?.sleep === undefined ? '' : '시간'} detail="운동 CSV에서는 알 수 없습니다."/><Metric icon={Apple} label="오늘 기록한 단백질" value={current?.protein ?? '—'} unit={current?.protein === null || current?.protein === undefined ? '' : 'g'} detail="실제 입력량 · 목표와 구분"/></div>
    {!weight && <Notice>체중 정보가 없어 하루 단백질 g 수치를 만들지 않았습니다. 아래 체크인이나 프로필에 체중을 입력하면 범위를 계산합니다.</Notice>}
    <div className="dashboard-grid"><Card title="에너지 섭취는 추세를 보고" subtitle="TDEE · 유지 칼로리: 미확인"><p className="body-text">현재 정보만으로 감량·린벌크·리컴프 중 하나를 확정하지 않습니다. 2–4주 동안 체중 평균, 허리둘레, 수행과 피로를 함께 관찰하세요.</p><div className="energy-options"><div><b>근육 성장 중심</b><p>수행이 늘고 허리둘레 변화가 과하지 않은지 확인하며 식사량을 소폭 조절합니다.</p></div><div><b>체형 개선 중심</b><p>체중만 줄이기보다 훈련 수행·허리둘레·수면의 변화를 같이 봅니다.</p></div><div><b>유지 중심</b><p>현재 일정을 유지할 수 있는 빈도와 식사 구성을 먼저 찾습니다.</p></div></div><p className="chart-footnote">이전 7일 평균: {averages.previous.value === null ? '기록 없음' : `${fmt(averages.previous.value, 1)} kg (${averages.previous.count}개 측정)`}. 적은 측정 수로 지방·근육 변화를 확정하지 않습니다.</p></Card><Card title="한 주를 편하게 운영하는 기준"><ul className="lifestyle-list"><li><Leaf size={19}/><div><strong>단백질은 3–4번에 나누어</strong><p>손바닥·개수·포장 단위를 쓰고 필요할 때만 계량하세요.</p></div></li><li><Moon size={19}/><div><strong>잠이 부족하면 훈련을 작게</strong><p>피로가 높으면 세트를 줄이고 회복을 확인하세요.</p></div></li><li><HeartPulse size={19}/><div><strong>유산소는 허용 범위 안에서</strong><p>허용된 경우 가벼운 걷기·자전거부터 선택하세요. 고강도 인터벌과 최대강도 시험은 기본값이 아닙니다.</p></div></li><li><Apple size={19}/><div><strong>모임과 외식도 일상 안에</strong><p>음주 후 탈수·수면·컨디션을 확인하고 무리한 훈련으로 보상하지 마세요. 정량적인 개인 영향은 알 수 없습니다.</p></div></li></ul></Card></div>
    <Card title="매번 고민하지 않는 식사 템플릿" subtitle="10–20분 내 준비 · 제품별 함량과 개인 적합성을 확인하세요."><div className="meal-grid">{MEALS.map((meal, index) => <article key={meal.title}><span className="meal-number">0{index + 1}</span><span className="pill soft">{meal.time}</span><h3>{meal.title}</h3><strong>{meal.items}</strong><p>{meal.note}</p></article>)}</div></Card>
    <Card title="오늘의 체크인" subtitle="체중·허리둘레·사진 등 여러 지표 중 필요한 것을 선택하세요. 사진 업로드는 지원하지 않습니다."><form onSubmit={save}><div className="form-grid"><Field label="체크인 날짜"><input name="date" type="date" required max={today} defaultValue={today}/></Field><Field label="체크인 체중 (kg)"><input name="weight" type="number" min="20" max="400" step="0.1" placeholder="미입력" defaultValue={current?.weight ?? ''}/></Field><Field label="체크인 허리둘레 (cm)"><input name="waist" type="number" min="30" max="250" step="0.1" placeholder="선택" defaultValue={current?.waist ?? ''}/></Field><Field label="체크인 수면 (시간)"><input name="sleep" type="number" min="0" max="24" step="0.5" defaultValue={current?.sleep ?? ''}/></Field><Field label="체크인 피로 (1–5)"><input name="fatigue" type="number" min="1" max="5" defaultValue={current?.fatigue ?? ''}/></Field><Field label="체크인 통증 (0–10)"><input name="pain" type="number" min="0" max="10" defaultValue={current?.pain ?? ''}/></Field><Field label="단백질 섭취량 (g)"><input name="protein" type="number" min="0" max="500" step="1" placeholder="추정 입력은 메모에 표시하세요" defaultValue={current?.protein ?? ''}/></Field><Field label="체크인 메모"><textarea name="notes" maxLength={5000} defaultValue={current?.notes ?? ''}/></Field></div><label className="checkbox-field"><input type="checkbox" name="symptoms" defaultChecked={current?.symptoms ?? false}/><span>운동 중단이 필요한 흉통·실신 느낌·심한 호흡곤란·평소와 다른 심계항진이 있었습니다.</span></label><button className="button dark" type="submit"><Check size={16}/>체크인 저장</button></form></Card>
    <Card title="직접 측정한 체중 추세" subtitle="실제 입력값 · 체중만으로 성과를 판단하지 않습니다."><WeightChart checks={data.checkIns}/></Card>
    <Card title="직접 입력한 체크인" subtitle="예시 신체 데이터는 생성하지 않습니다.">{checks.length ? <div className="table-scroll"><table><thead><tr><th>날짜</th><th>체중 kg</th><th>허리 cm</th><th>수면 h</th><th>피로</th><th>통증</th><th>단백질 g</th></tr></thead><tbody>{checks.slice(0, 30).map(item => <tr key={item.id}><td>{item.date}</td><td>{item.weight ?? '—'}</td><td>{item.waist ?? '—'}</td><td>{item.sleep ?? '—'}</td><td>{item.fatigue ?? '—'}</td><td>{item.pain ?? '—'}</td><td>{item.protein ?? '—'}</td></tr>)}</tbody></table></div> : <Empty title="측정 기록이 없어요" detail="체중만으로 성과를 판단하지 않습니다. 필요한 지표부터 입력해 주세요."/>}</Card>
    <Notice>단백질 목표는 일반적인 훈련 성인의 참고 범위입니다. 질환·약물·식이 제한 등 개인 적합성을 확인하세요. 크레아틴 등 보충제는 선택 사항이며 자동 복용 처방을 제공하지 않습니다. <button className="text-button" onClick={() => navigate('research')}>근거와 한계 보기</button></Notice>
  </>;
}
export function Research() {
  const [topic, setTopic] = useState('all');
  const nutrition = new Set(['protein', 'protein-2022', 'protein-position', 'surplus-2023', 'carbohydrate-2026', 'creatine', 'creatine-2024']);
  const recovery = new Set(['sleep', 'alcohol', 'concurrent']);
  const references = EVIDENCE.filter(item => topic === 'all' || (topic === 'nutrition' ? nutrition.has(item.id) : topic === 'recovery' ? recovery.has(item.id) : !nutrition.has(item.id) && !recovery.has(item.id)));
  return <><PageHeading eyebrow="RESEARCH & METHODOLOGY" title="추천 뒤에 있는 근거" description="기록에서 계산한 값과 일반 근거에서 가져온 운영 기준을 구분합니다."/>
    <Notice>{RESEARCH_STATUS}</Notice>
    <Card title="어떻게 읽으면 좋을까요?"><div className="evidence-legend"><div><span className="pill soft">직접 기록</span><p>가져온 CSV·직접 입력한 운동·체크인에서 계산합니다.</p></div><div><span className="pill lime">연구 기반 참고</span><p>집단 평균을 개인의 확정적 결과로 적용하지 않습니다.</p></div><div><span className="pill peach">보수적 운영 규칙</span><p>시작 세트·2회 확인·피로 기준은 검증된 개인 처방 공식이 아닙니다.</p></div></div></Card>
    <div className="program-controls"><div className="segmented" aria-label="연구 주제">{[['all', `전체 ${EVIDENCE.length}편`], ['training', '훈련'], ['nutrition', '영양'], ['recovery', '회복']].map(([value, label]) => <button key={value} className={topic === value ? 'active' : ''} onClick={() => setTopic(value)}>{label}</button>)}</div></div>
    <div className="evidence-list">{references.map(item => <Card key={item.id} className="evidence-card"><div className="evidence-top"><span className="pill soft">{item.type} · {item.year}</span><BookOpen size={20}/></div><h2>{item.claim}</h2><p className="paper-title">{item.title}</p><dl><dt>주요 결과</dt><dd>{item.result}</dd><dt>적용 범위와 한계</dt><dd>{item.limitation}</dd><dt>앱에서의 사용</dt><dd>{item.application}</dd><dt>개인 적용의 확실성</dt><dd>{item.certainty ?? '일반적인 건강한 성인의 참고: 중간 · 개인 최적값과 의학적 적합성: 미확인'}</dd></dl><a className="paper-link" href={`https://doi.org/${item.doi}`} target="_blank" rel="noopener noreferrer">DOI: {item.doi}<ExternalLink size={13}/></a><small className="verification-note">2026-10-23 · Europe PMC 서지·초록 확인{item.verification === 'full-text' ? ' · 관련 원문 검토' : ' · 전문 미검토'}</small></Card>)}</div>
    <Card title="계산의 기준과 판단하지 않는 것"><div className="methodology-grid"><div><h3>시간과 중복</h3><p>한국 시간, 월요일 시작 주간. 시간대 없는 Strong 시각은 한국 시간으로 해석합니다. 같은 Workout #는 세션 단위로 병합·교체합니다.</p></div><div><h3>세트와 근육 분류</h3><p>숫자 세트 중 반복수 1회 이상만 본세트. W·D·Rest Timer·유산소·시간 운동은 별도입니다. 간접 노출에 임의 가중치를 곱하지 않습니다.</p></div><div><h3>톤수와 보조량</h3><p>분류된 외부 중량 본세트의 입력 kg × 반복수만 합산합니다. 보조 턱걸이·맨몸·미분류는 제외하며 다른 기구의 값은 비교하지 않습니다.</p></div><div><h3>추정 1RM</h3><p>Epley 식을 참고 함수로만 제공합니다. 외부 중량, 3–10회, 명시적 RIR ≤2 또는 RPE ≥8인 본세트만 허용합니다. 실제 1RM 시험값이 아니며 기본 그래프에 표시하지 않습니다.</p></div><div><h3>증량 제안</h3><p>최근 두 번의 계획 세트, 반복 상단, 목표 RIR, 같은 부하를 확인합니다. 미입력 RIR·통증·피로·수면 부족 시 증량을 보류합니다.</p></div><div><h3>의학적 판단</h3><p>운동 가능 여부·통증 원인·심장 증상·근육량·체지방률은 판단하지 않습니다. 증상이 있으면 운동을 중단하고 적절한 진료를 확인하세요.</p></div></div></Card>
  </>;
}
