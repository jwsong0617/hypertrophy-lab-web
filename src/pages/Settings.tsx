import { Check, Database, Download, FileUp, HardDrive, LockKeyhole, ShieldCheck, Trash2, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { useApp } from '../AppContext.tsx';
import { Card, Field, Modal, Notice, PageHeading, fmt } from '../components/ui.tsx';
import { MAX_FILE_BYTES, exportStrongCsv, mergeSessions, parseStrongCsv } from '../domain/csv.ts';
import { backupSchema, downloadFile, emptyData, parseBackup, profileSchema } from '../domain/storage.ts';
import { koreaDay } from '../domain/time.ts';
import type { ImportResult, Profile } from '../domain/types.ts';

function ProfileForm({ profile }: { profile: Profile }) {
  const { update, notify } = useApp();
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    const optional = (name: string) => form.get(name) === '' ? null : Number(form.get(name));
    const result = profileSchema.safeParse({
      weight: optional('weight'), height: optional('height'), waist: optional('waist'),
      days: Number(form.get('days')), minutes: Number(form.get('minutes')), startDate: form.get('startDate'),
      increment: Number(form.get('increment')), goal: form.get('goal'), equipment: form.get('equipment'),
      clearance: form.get('clearance') === 'on' ? 'confirmed' : 'unknown',
      programStyle: profile.programStyle ?? 'supported', includeCalves: profile.includeCalves ?? false, includeHipThrust: profile.includeHipThrust ?? false,
    });
    if (!result.success) return notify('프로필의 입력 범위와 날짜를 확인해 주세요.');
    update(previous => ({ ...previous, profile: result.data })); notify('프로필을 이 기기에 저장했습니다.');
  };
  return <form onSubmit={submit}><div className="form-grid"><Field label="체중 (kg)" hint="직접 입력한 값만 사용합니다."><input type="number" name="weight" min="20" max="400" step="0.1" defaultValue={profile.weight ?? ''} placeholder="미입력"/></Field><Field label="키 (cm)"><input type="number" name="height" min="80" max="250" step="0.1" defaultValue={profile.height ?? ''} placeholder="미입력"/></Field><Field label="허리둘레 (cm)"><input type="number" name="waist" min="30" max="250" step="0.1" defaultValue={profile.waist ?? ''} placeholder="선택"/></Field><Field label="목표"><select name="goal" defaultValue={profile.goal}><option value="grow">근육 성장</option><option value="recompose">체형 개선</option><option value="maintain">현재 상태 유지</option></select></Field><Field label="주간 운동 빈도"><select name="days" defaultValue={profile.days}><option value="2">주 2회</option><option value="3">주 3회</option><option value="4">주 4회</option></select></Field><Field label="가용 시간"><select name="minutes" defaultValue={profile.minutes}><option value="60">45–75분</option><option value="30">25–35분</option></select></Field><Field label="운동 환경" hint="집에서는 덤벨·밴드 및 맨몸 대안을 사용합니다."><select name="equipment" defaultValue={profile.equipment}><option value="gym">헬스장</option><option value="home">집 · 덤벨/밴드</option></select></Field><Field label="프로그램 시작일"><input type="date" name="startDate" required max={koreaDay()} defaultValue={profile.startDate}/></Field><Field label="최소 증량 단위 (kg)" hint="덤벨은 기존 기록의 한 손/양손 기준을 유지하세요."><input type="number" name="increment" required min="0.1" max="10" step="0.1" defaultValue={profile.increment}/></Field></div><label className="checkbox-field"><input type="checkbox" name="clearance" defaultChecked={profile.clearance === 'confirmed'}/><span>필요한 경우 의료진에게 운동 허용 범위를 확인했고, 현재 통증·심폐 증상을 고려해 훈련 범위를 정했습니다. <small>자기 확인 항목이며 앱이 운동 안전성을 보증하지 않습니다.</small></span></label><button className="button dark" type="submit"><Check size={16}/>프로필 저장</button></form>;
}
export function Settings() {
  const { data, update, notify, setMode, mode } = useApp();
  const [pending, setPending] = useState<ImportResult | null>(null); const [busy, setBusy] = useState(false); const backupInput = useRef<HTMLInputElement>(null);
  const [confirm, setConfirm] = useState<'clear' | 'replace' | null>(null);
  const [pendingBackup, setPendingBackup] = useState<ReturnType<typeof parseBackup> | null>(null);
  const readFile = async (event: ChangeEvent<HTMLInputElement>, kind: 'csv' | 'backup') => {
    const file = event.target.files?.[0]; event.target.value = ''; if (!file) return;
    if (file.size > (kind === 'csv' ? MAX_FILE_BYTES : 50 * 1024 * 1024)) return notify('파일 크기 제한을 초과했습니다. CSV 10 MB, JSON 백업 50 MB까지 지원합니다.');
    setBusy(true);
    try {
      const content = new TextDecoder('utf-8', { fatal: true }).decode(await file.arrayBuffer());
      if (kind === 'csv') setPending(parseStrongCsv(content)); else setPendingBackup(parseBackup(content));
    } catch (error) { notify(error instanceof Error ? error.message : 'UTF-8 파일을 확인해 주세요.'); }
    finally { setBusy(false); }
  };
  const applyImport = (replace: boolean) => {
    if (!pending?.sessions.length) return;
    update(previous => ({ ...previous, sessions: replace ? pending.sessions : mergeSessions(previous.sessions, pending.sessions), importedAt: new Date().toISOString(), lastAudit: pending.audit }));
    setMode('personal'); notify(`${pending.sessions.length}세션을 ${replace ? '전체 교체' : '병합'}했습니다. 동일 운동번호는 중복 삽입하지 않습니다.`); setPending(null); setConfirm(null);
  };
  const audit = pending?.audit ?? data.lastAudit;
  const collisions = pending?.sessions.filter(session => data.sessions.some(existing => existing.id === session.id)).length ?? 0;
  return <><PageHeading eyebrow="SETTINGS & YOUR DATA" title="나의 데이터, 나의 기기" description="처음에는 CSV만 가져와도 충분해요. 나머지 정보는 필요한 만큼 천천히 입력하세요."/>
    <div className="privacy-banner"><span><LockKeyhole size={25}/></span><div><strong>개인 기록은 브라우저 안에서 처리됩니다.</strong><p>서버 전송·광고 추적·자동 동기화가 없습니다. 같은 URL을 다른 기기에서 열어도 기록은 공유되지 않습니다.</p></div><span className="pill soft">LOCAL FIRST</span></div>
    <Card title="Strong 운동 기록 가져오기" subtitle="UTF-8 · 세미콜론(;) 또는 쉼표(,) · 최대 10 MB"><label className={`dropzone ${busy ? 'busy' : ''}`} htmlFor="strong-csv"><span className="upload-icon"><FileUp size={28}/></span><strong>{busy ? '이 기기에서 읽는 중…' : 'Strong CSV 파일을 선택하세요'}</strong><span>원본 파일은 수정하거나 외부로 보내지 않습니다.</span><span className="button dark small"><Upload size={15}/>파일 선택</span></label><input id="strong-csv" className="visually-hidden" type="file" accept=".csv,text/csv" aria-label="Strong CSV 파일" onChange={event => void readFile(event, 'csv')} disabled={busy}/><p className="chart-footnote">Workout #, Date, Exercise Name, Set Order 열이 필요합니다. 시각이 없는 날짜와 시간대 없는 시각은 한국 시간으로 해석합니다. 같은 Workout #는 세션 단위로 교체합니다.</p></Card>
    {pending && <Card title="가져오기 전 확인" subtitle="아래 내용을 확인한 다음 직접 적용하세요." className="import-preview"><div className="import-counts"><div><strong>{pending.sessions.length}</strong><span>세션</span></div><div><strong>{fmt(pending.audit.acceptedRows)}</strong><span>읽은 행</span></div><div><strong>{collisions}</strong><span>기존 운동번호와 겹침</span></div><div><strong>{pending.audit.rejectedRows}</strong><span>제외된 잘못된 행</span></div></div>{pending.audit.rejectedRows > 0 && <Notice tone="warning">잘못된 {pending.audit.rejectedRows}행은 제외됩니다. 아래 품질 감사에서 이유를 확인하고 필요한 경우 원본을 수정한 사본으로 다시 가져오세요.</Notice>}<div className="button-row"><button className="button dark" disabled={!pending.sessions.length} onClick={() => applyImport(false)}><Check size={16}/>{pending.sessions.length}세션 병합</button><button className="button secondary" disabled={!pending.sessions.length} onClick={() => setConfirm('replace')}>모든 운동 기록 교체</button><button className="text-button" onClick={() => setPending(null)}>취소</button></div><p className="chart-footnote">병합: 기존 Workout #만 이번 파일의 세션으로 교체하며 직접 기록한 세션은 보존합니다. 전체 교체: 직접 기록한 세션을 포함해 기존 운동 기록 전체를 대체합니다. 신체 체크인과 프로필은 유지됩니다.</p></Card>}
    {audit && <Card title="데이터 품질 감사" subtitle={pending ? '선택한 파일 · 아직 적용되지 않았습니다.' : `마지막 가져오기 ${data.importedAt ? new Date(data.importedAt).toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul' }) : ''}`}><div className="audit-grid">{[['전체 행', audit.totalRows], ['휴식 타이머', audit.rest], ['준비세트', audit.warmup], ['드롭세트', audit.drop], ['유산소·시간 운동', audit.cardio + audit.timed], ['미해석 세트 유형', audit.unknown], ['RPE 미입력 본세트', audit.missingRpe], ['중량 미입력 본세트', audit.missingLoad], ['중복 가능 행', audit.duplicateRows], ['잘못된 행', audit.rejectedRows]].map(([label, value]) => <div key={label}><span>{label}</span><strong>{fmt(Number(value))}</strong></div>)}</div>{audit.unmapped.length > 0 && <Notice tone="warning">근육 분류가 없는 종목: {audit.unmapped.join(', ')}. 전체 반복 본세트 수에는 포함될 수 있지만 근육별·톤수·e1RM 집계에서 제외됩니다.</Notice>}{audit.issues.length > 0 && <details className="method-details"><summary>품질 이슈 {audit.issues.length}개 보기</summary><ul className="issue-list">{audit.issues.slice(0, 100).map((issue, index) => <li key={index}>논리 행 {issue.row}: {issue.message}</li>)}</ul>{audit.issues.length > 100 && <p>화면에는 첫 100개만 표시합니다. 전체 감사는 JSON 백업에 포함됩니다.</p>}</details>}</Card>}
    <Card title="내 프로필" subtitle="미입력 정보는 추측하지 않습니다."><ProfileForm key={JSON.stringify(data.profile)} profile={data.profile}/></Card>
    <div className="dashboard-grid"><Card title="백업과 다른 기기로 이동" subtitle="내보낸 파일도 민감한 개인 데이터입니다."><div className="backup-options"><button className="backup-button" onClick={() => downloadFile(JSON.stringify(backupSchema.parse(data), null, 2), `hypertrophy-lab-backup-${koreaDay()}.json`, 'application/json')}><Download size={20}/><span><strong>전체 JSON 백업</strong><small>운동·프로필·체크인·프로그램 상태 포함</small></span></button><button className="backup-button" onClick={() => downloadFile(exportStrongCsv(data.sessions), `training-records-${koreaDay()}.csv`, 'text/csv;charset=utf-8')}><ArrowExport/><span><strong>운동 CSV 내보내기</strong><small>운동 기록만 · RIR 확장 열 포함</small></span></button><button className="backup-button" onClick={() => backupInput.current?.click()}><Upload size={20}/><span><strong>JSON 백업 복원</strong><small>형식 검증 후 기존 데이터를 전체 교체</small></span></button><input className="visually-hidden" ref={backupInput} aria-label="JSON 백업 파일" type="file" accept=".json,application/json" onChange={event => void readFile(event, 'backup')}/></div><p className="chart-footnote">예시 모드에서도 백업에는 개인 저장소의 데이터만 포함합니다. 파일은 안전한 개인 저장 공간으로 옮겨 주세요.</p></Card><Card title="저장과 개인정보" subtitle="브라우저 IndexedDB 사용"><ul className="privacy-list"><li><HardDrive size={18}/><span>현재 기기에 {data.sessions.length}개 운동, {data.checkIns.length}개 체크인</span></li><li><ShieldCheck size={18}/><span>별도 인증·암호화·기기 간 자동 동기화는 제공하지 않습니다.</span></li><li><Database size={18}/><span>공유 기기·브라우저 초기화·시크릿 모드에서는 유실 또는 다른 사용자의 접근에 주의하세요.</span></li></ul><button className="text-button danger-text" onClick={() => setConfirm('clear')}><Trash2 size={15}/>이 기기의 모든 개인 데이터 삭제</button><button className="text-button" onClick={() => setMode(mode === 'demo' ? 'personal' : 'demo')}>{mode === 'demo' ? '내 기록으로 돌아가기' : '개인 데이터와 분리된 예시 둘러보기'}</button></Card></div>
    {confirm && <Modal title={confirm === 'clear' ? '모든 개인 데이터를 삭제할까요?' : '운동 기록을 전체 교체할까요?'} close={() => setConfirm(null)}><p>{confirm === 'clear' ? '이 기기의 운동·프로필·체크인을 모두 지웁니다. 먼저 JSON 백업을 내려받으세요. 이 작업은 되돌릴 수 없습니다.' : '기존 운동 기록을 모두 지우고 선택한 CSV로 대체합니다. 프로필과 체크인은 유지합니다. 먼저 백업을 권장합니다.'}</p><div className="button-row"><button className="button danger" onClick={() => { if (confirm === 'clear') { update(emptyData()); setMode('personal'); setPending(null); setConfirm(null); notify('이 기기의 개인 데이터를 삭제했습니다. 내려받은 백업 파일은 별도로 삭제하세요.'); } else applyImport(true); }}>{confirm === 'clear' ? '모든 개인 데이터 삭제' : '운동 기록 전체 교체'}</button><button className="button secondary" onClick={() => setConfirm(null)}>취소</button></div></Modal>}
    {pendingBackup && <Modal title="JSON 백업을 복원할까요?" close={() => setPendingBackup(null)}><p>운동 {pendingBackup.sessions.length}개와 체크인 {pendingBackup.checkIns.length}개를 포함한 백업입니다. 현재 운동·프로필·체크인·프로그램 상태를 모두 대체합니다.</p><div className="button-row"><button className="button dark" onClick={() => { update(pendingBackup); setMode('personal'); setPendingBackup(null); notify('백업을 복원했습니다.'); }}>백업으로 전체 복원</button><button className="button secondary" onClick={() => setPendingBackup(null)}>취소</button></div></Modal>}
  </>;
}
function ArrowExport() { return <Download size={20}/>; }
