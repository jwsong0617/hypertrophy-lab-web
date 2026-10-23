import { Activity, Apple, ArrowRight, BookOpen, ChartNoAxesCombined, Check, ChevronRight, ClipboardList, Dumbbell, FlaskConical, LockKeyhole, Menu, Settings2, ShieldCheck, Sparkles, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Component, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { AppContext } from './AppContext.tsx';
import { demoSessions } from './domain/demo.ts';
import { emptyData, loadData, saveData } from './domain/storage.ts';
import { koreaDay } from './domain/time.ts';
import type { AppData, PageId } from './domain/types.ts';
import { Diagnosis, History } from './pages/Training.tsx';
import { Designer, Program, ProgressionPlanner, WeeklyReview } from './pages/Planning.tsx';
import { Log } from './pages/Logging.tsx';
import { Nutrition, Research } from './pages/Lifestyle.tsx';
import { Settings } from './pages/Settings.tsx';

const NAV: { id: PageId; label: string; en: string; icon: LucideIcon }[] = [
  { id: 'program', label: '내 프로그램', en: 'MY PROGRAM', icon: Dumbbell },
  { id: 'designer', label: '프로그램 설계', en: 'PROGRAM DESIGN', icon: Settings2 },
  { id: 'progression', label: '증량 계획', en: 'PROGRESSION PLAN', icon: Activity },
  { id: 'review', label: '주간 검토', en: 'WEEKLY REVIEW', icon: ClipboardList },
  { id: 'history', label: '수행 기록 분석', en: 'TRAINING HISTORY', icon: ChartNoAxesCombined },
  { id: 'research', label: '연구와 방법론', en: 'RESEARCH & METHODS', icon: BookOpen },
];
const AUX_NAV: typeof NAV = [
  { id: 'log', label: '세트 기록 · 타이머', en: 'OPTIONAL TRAINING LOG', icon: ClipboardList },
  { id: 'nutrition', label: '회복 체크인 · 식사 참고', en: 'OPTIONAL RECOVERY', icon: Apple },
  { id: 'diagnosis', label: '기록 인사이트', en: 'RECORD INSIGHTS', icon: Sparkles },
];
const pageFromHash = (): PageId => {
  const value = window.location.hash.replace(/^#\/?/, '');
  return value === 'overview' ? 'review' : [...NAV.map(item => item.id), ...AUX_NAV.map(item => item.id), 'settings'].includes(value) ? value as PageId : 'program';
};
export default function App() {
  const [data, update] = useState<AppData>(emptyData);
  const [loaded, setLoaded] = useState(false); const [writable, setWritable] = useState(true); const [storageStatus, setStorageStatus] = useState('기기 내 저장');
  const [page, setPage] = useState<PageId>(pageFromHash); const [mode, setMode] = useState<'personal' | 'demo'>('personal');
  const [menu, setMenu] = useState(false); const [toast, setToast] = useState(''); const [requestedSlot, setRequestedSlot] = useState<string | null>(null);
  const queue = useRef(Promise.resolve());
  useEffect(() => {
    let cancelled = false;
    loadData().then(value => { if (!cancelled) { update(value); setLoaded(true); } }).catch(() => { if (!cancelled) { setWritable(false); setStorageStatus('저장소를 열 수 없음'); setLoaded(true); } });
    return () => { cancelled = true; };
  }, []);
  useEffect(() => {
    if (!loaded || !writable) return;
    let cancelled = false;
    setStorageStatus('기기에 저장 중');
    queue.current = queue.current.then(() => saveData(data)).then(() => { if (!cancelled) setStorageStatus('이 기기에 저장됨'); }).catch(() => { if (!cancelled) setStorageStatus('저장 실패 · JSON 백업 필요'); });
    return () => { cancelled = true; };
  }, [data, loaded, writable]);
  useEffect(() => { const handler = () => { setPage(pageFromHash()); setMenu(false); window.scrollTo(0, 0); }; window.addEventListener('hashchange', handler); return () => window.removeEventListener('hashchange', handler); }, []);
  useEffect(() => { if (!toast) return; const id = window.setTimeout(() => setToast(''), 6000); return () => window.clearTimeout(id); }, [toast]);
  const navigate = (next: PageId) => { setPage(next); setMenu(false); setRequestedSlot(null); window.location.hash = `/${next}`; window.scrollTo(0, 0); };
  const startWorkout = (id?: string) => { setMode('personal'); navigate('log'); setRequestedSlot(id ?? null); };
  if (!loaded) return <div className="loading-screen"><span className="brand-icon"><Dumbbell size={26}/></span><strong>Hypertrophy Lab</strong><p>이 기기의 기록을 여는 중입니다…</p></div>;
  const sessions = mode === 'demo' ? demoSessions() : data.sessions;
  const active = [...NAV, ...AUX_NAV].find(item => item.id === page);
  const content = page === 'designer' ? <Designer/> : page === 'progression' ? <ProgressionPlanner/> : page === 'review' || page === 'overview' ? <WeeklyReview/> : page === 'history' ? <History/> : page === 'diagnosis' ? <Diagnosis/> : page === 'program' ? <Program/> : page === 'log' ? <Log key={`${requestedSlot}-${data.nextSlot}-${data.profile.days}-${data.profile.minutes}`} requestedSlot={requestedSlot}/> : page === 'nutrition' ? <Nutrition/> : page === 'research' ? <Research/> : <Settings/>;
  return <AppContext.Provider value={{ data, update, sessions, mode, setMode, navigate, notify: setToast, startWorkout }}><a className="skip-link" href="#main" onClick={event => { event.preventDefault(); document.getElementById('main')?.focus(); }}>본문으로 건너뛰기</a>
    {menu && <div className="mobile-scrim" onClick={() => setMenu(false)}/>}
    <aside className={`sidebar ${menu ? 'open' : ''}`} aria-label="주 메뉴"><a className="brand" href="#/program" onClick={event => { event.preventDefault(); navigate('program'); }}><span className="brand-icon"><Dumbbell size={23}/></span><span>Hypertrophy<span className="brand-lab">Lab<span className="brand-dot">.</span></span></span></a><button className="mobile-close icon-button" aria-label="메뉴 닫기" onClick={() => setMenu(false)}><X size={22}/></button><div className="workspace-label">TRAINING WORKSPACE</div><nav>{NAV.map(item => <a key={item.id} href={`#/${item.id}`} className={page === item.id ? 'active' : ''} aria-current={page === item.id ? 'page' : undefined} onClick={event => { event.preventDefault(); navigate(item.id); }}><item.icon size={18} strokeWidth={1.7}/><span>{item.label}</span>{page === item.id && <i/>}</a>)}</nav><details className="nav-tools"><summary>보조 도구</summary><nav aria-label="보조 도구">{AUX_NAV.map(item => <a key={item.id} href={`#/${item.id}`} className={page === item.id ? 'active' : ''} onClick={event => { event.preventDefault(); navigate(item.id); }}><item.icon size={16}/><span>{item.label}</span></a>)}</nav></details><div className="sidebar-bottom"><a href="#/settings" className={`settings-nav ${page === 'settings' ? 'active' : ''}`} onClick={event => { event.preventDefault(); navigate('settings'); }}><Settings2 size={18}/><span>설정 · 데이터</span></a><div className="local-card"><span><ShieldCheck size={19}/></span><strong>당신의 기록은,<br/>당신의 기기에.</strong><p>서버로 보내지 않는<br/>개인 운동 데이터</p><button className="text-button" onClick={() => navigate('settings')}>데이터 관리<ArrowRight size={13}/></button></div><div className="sidebar-version"><FlaskConical size={12}/><span>PROGRAM DESIGN STUDIO</span></div></div></aside>
    <div className="app-main"><header className="topbar"><div className="breadcrumb"><button className="mobile-menu icon-button" aria-label="메뉴 열기" onClick={() => setMenu(true)}><Menu size={22}/></button><span>TRAINING WORKSPACE</span><ChevronRight size={12}/><strong>{active?.en ?? 'SETTINGS & DATA'}</strong></div><div className="topbar-right"><span className={`save-status ${storageStatus.includes('실패') ? 'storage-error' : ''}`} role="status"><LockKeyhole size={12}/>{storageStatus}</span><span className="topbar-divider"/><span className="avatar">MY</span></div></header>
      {mode === 'demo' && <div className="demo-banner"><span><FlaskConical size={15}/><strong>예시 모드</strong> · 운동 수치는 합성 예시이며 실제 개인 기록이 아닙니다.</span><button onClick={() => setMode('personal')}>내 기록으로 돌아가기<ArrowRight size={13}/></button></div>}
      {!writable && <div className="storage-banner" role="alert">기존 저장소를 열지 못해 덮어쓰기를 중단했습니다. 현재 입력은 메모리에만 유지됩니다. 설정에서 JSON 백업을 내보내고 브라우저 저장 권한을 확인하세요.</div>}
      <main id="main" className="content" tabIndex={-1}>{content}</main><footer className="app-footer"><span><Activity size={12}/>HYPERTROPHY LAB</span><p>기록에서 근거로, 근거에서 다음 계획으로.</p><span>LOCAL FIRST · {koreaDay().slice(0, 4)}</span></footer>
    </div>{toast && <div className="toast" role="status"><span><Check size={16}/></span><p>{toast}</p><button className="icon-button" aria-label="알림 닫기" onClick={() => setToast('')}><X size={16}/></button></div>}
  </AppContext.Provider>;
}
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <div className="loading-screen"><h1>화면을 다시 열어 주세요.</h1><p>개인 데이터는 서버로 전송되지 않습니다. 저장된 기록은 이 기기에 유지됩니다.</p><button className="button dark" onClick={() => window.location.reload()}>새로고침</button></div> : this.props.children; }
}
