const DAY = 86_400_000;
export function koreaDay(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}
export function validDay(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const time = Date.parse(`${value}T12:00:00Z`);
  return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === value && Number(value.slice(0, 4)) >= 1900;
}
export function addDays(day: string, amount: number): string {
  return new Date(Date.parse(`${day}T12:00:00Z`) + amount * DAY).toISOString().slice(0, 10);
}
export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / DAY);
}
export function monday(day: string): string {
  const weekday = new Date(`${day}T12:00:00Z`).getUTCDay();
  return addDays(day, -(weekday === 0 ? 6 : weekday - 1));
}
export function displayDate(day: string, year = false): string {
  if (!validDay(day)) return '날짜 미확인';
  return new Intl.DateTimeFormat('ko-KR', { month: 'long', day: 'numeric', weekday: 'short', ...(year ? { year: 'numeric' } : {}), timeZone: 'UTC' }).format(new Date(`${day}T12:00:00Z`));
}
export function parseStrongDate(raw: string): { day: string; iso: string } | null {
  const input = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:?\d{2})$/i.test(input)) {
    const parsed = new Date(input);
    if (!Number.isFinite(parsed.getTime()) || !validDay(input.slice(0, 10))) return null;
    return { day: koreaDay(parsed), iso: parsed.toISOString() };
  }
  const matched = /^(\d{4})[-/](\d{2})[-/](\d{2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/.exec(input);
  if (!matched) return null;
  const [, y, m, d, hour = '0', minute = '0', second = '0'] = matched;
  const day = `${y}-${m}-${d}`;
  if (!validDay(day) || Number(hour) > 23 || Number(minute) > 59 || Number(second) > 59) return null;
  return { day, iso: new Date(`${day}T${hour.padStart(2, '0')}:${minute}:${second}+09:00`).toISOString() };
}
export function currentWeek(start: string, today = koreaDay()): number {
  return Math.max(1, Math.min(24, Math.floor(daysBetween(start, today) / 7) + 1));
}
