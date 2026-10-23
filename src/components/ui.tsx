import { ArrowRight, CircleHelp, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cloneElement, isValidElement, useEffect, useId, useRef } from 'react';
import type { ReactNode } from 'react';

export function PageHeading({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) {
  return <div className="page-heading"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p className="page-description">{description}</p></div>{action}</div>;
}
export function Card({ children, className = '', title, subtitle, action }: { children: ReactNode; className?: string; title?: string; subtitle?: string; action?: ReactNode }) {
  return <section className={`card ${className}`}>{title && <div className="card-heading"><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>{action}</div>}{children}</section>;
}
export function Metric({ icon: Icon, label, value, unit, detail, accent = false }: { icon: LucideIcon; label: string; value: ReactNode; unit?: string; detail: string; accent?: boolean }) {
  return <div className={`metric ${accent ? 'metric-accent' : ''}`}><div className="metric-label"><span>{label}</span><Icon size={17} /></div><div className="metric-value">{value}<small>{unit}</small></div><p>{detail}</p></div>;
}
export function Empty({ title = '아직 기록이 없어요', detail = 'CSV를 가져오거나 첫 운동을 기록해 주세요.', onAction, action = 'CSV 가져오기' }: { title?: string; detail?: string; onAction?: () => void; action?: string }) {
  return <div className="empty-state"><span className="empty-icon"><CircleHelp size={25}/></span><h3>{title}</h3><p>{detail}</p>{onAction && <button className="button secondary small" onClick={onAction}>{action}<ArrowRight size={15}/></button>}</div>;
}
export function Notice({ children, tone = 'info' }: { children: ReactNode; tone?: 'info' | 'warning' | 'danger' | 'success' }) {
  return <div className={`notice notice-${tone}`} role={tone === 'danger' ? 'alert' : undefined}>{children}</div>;
}
export function Modal({ title, children, close }: { title: string; children: ReactNode; close: () => void }) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden';
    ref.current?.querySelector<HTMLElement>('button')?.focus();
    return () => { document.body.style.overflow = previousOverflow; previous?.focus(); };
  }, []);
  return <div className="modal-backdrop" onClick={event => { if (event.target === event.currentTarget) close(); }} onKeyDown={event => {
    if (event.key === 'Escape') close();
    if (event.key === 'Tab') {
      const nodes = ref.current?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]');
      if (nodes?.length && event.shiftKey && document.activeElement === nodes[0]) { event.preventDefault(); nodes[nodes.length - 1].focus(); }
      else if (nodes?.length && !event.shiftKey && document.activeElement === nodes[nodes.length - 1]) { event.preventDefault(); nodes[0].focus(); }
    }
  }}><section ref={ref} className="modal" role="dialog" aria-modal="true" aria-label={title}><header><h2>{title}</h2><button className="icon-button" aria-label="닫기" onClick={close}><X size={20}/></button></header>{children}</section></div>;
}
export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  const id = useId();
  const control = isValidElement<{ id?: string; 'aria-describedby'?: string }>(children) ? cloneElement(children, { id, 'aria-describedby': hint ? `${id}-hint` : undefined }) : children;
  return <div className="field"><label htmlFor={id}>{label}</label>{control}{hint && <small id={`${id}-hint`}>{hint}</small>}</div>;
}
export const fmt = (value: number, digits = 0) => new Intl.NumberFormat('ko-KR', { maximumFractionDigits: digits }).format(value);
