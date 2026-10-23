import { openDB } from 'idb';
import { z } from 'zod';
import { koreaDay, validDay } from './time.ts';
import type { AppData } from './types.ts';

const nullable = (max: number) => z.number().finite().min(0).max(max).nullable();
const day = z.string().refine(validDay, '유효하지 않은 날짜');
const text = z.string().max(5000);
const setSchema = z.object({
  id: z.string().max(1000), exercise: z.string().min(1).max(200), exerciseId: z.string().max(100).nullable(),
  order: z.string().max(100), kind: z.enum(['work', 'warmup', 'drop', 'rest', 'cardio', 'timed', 'unknown']),
  weight: nullable(1500), reps: nullable(2000).refine(v => v === null || Number.isInteger(v)), rpe: nullable(10), rir: nullable(10), distance: nullable(1_000_000), seconds: nullable(86400), notes: text,
});
export const profileSchema = z.object({
  weight: nullable(400).refine(v => v === null || v >= 20), height: nullable(250).refine(v => v === null || v >= 80),
  waist: nullable(250).refine(v => v === null || v >= 30), days: z.union([z.literal(2), z.literal(3), z.literal(4)]),
  minutes: z.union([z.literal(30), z.literal(60)]), startDate: day, increment: z.number().min(0.1).max(10),
  goal: z.enum(['grow', 'maintain', 'recompose']), clearance: z.enum(['unknown', 'confirmed']), equipment: z.enum(['gym', 'home']),
  programStyle: z.enum(['supported', 'barbell']).optional(), includeCalves: z.boolean().optional(), includeHipThrust: z.boolean().optional(),
});
const auditSchema = z.object({
  totalRows: z.number().int().min(0), acceptedRows: z.number().int().min(0), rejectedRows: z.number().int().min(0), duplicateRows: z.number().int().min(0),
  rest: z.number().int().min(0), warmup: z.number().int().min(0), drop: z.number().int().min(0), cardio: z.number().int().min(0), timed: z.number().int().min(0), unknown: z.number().int().min(0),
  missingRpe: z.number().int().min(0), missingLoad: z.number().int().min(0), unmapped: z.array(z.string().max(200)).max(50_000),
  issues: z.array(z.object({ row: z.number().int().min(0), code: z.string(), message: text })).max(100_000), delimiter: z.string().max(1),
});
export const checkInSchema = z.object({
  id: z.string().min(1), date: day, weight: nullable(400).refine(v => v === null || v >= 20), waist: nullable(250).refine(v => v === null || v >= 30),
  sleep: nullable(24), fatigue: nullable(5).refine(v => v === null || v >= 1), pain: nullable(10), protein: nullable(500), symptoms: z.boolean(), notes: text,
});
export const backupSchema: z.ZodType<AppData> = z.object({
  schemaVersion: z.literal(1),
  sessions: z.array(z.object({
    id: z.string().min(1).max(1000), source: z.enum(['strong', 'log']), sourceId: z.string().max(200),
    date: day, startedAt: z.string().datetime(), name: z.string().max(200), duration: nullable(86400), notes: text,
    sets: z.array(setSchema).max(5000), slot: z.string().max(10).optional(),
  })).max(50_000).refine(items => new Set(items.map(item => item.id)).size === items.length, '운동 ID 중복'),
  checkIns: z.array(checkInSchema).max(50_000).refine(items => new Set(items.map(item => item.date)).size === items.length, '체크인 날짜 중복'),
  profile: profileSchema, nextSlot: z.number().int().min(0).max(1_000_000), importedAt: z.string().datetime().nullable(), lastAudit: auditSchema.nullable(),
});
export function emptyData(today = koreaDay()): AppData {
  return { schemaVersion: 1, sessions: [], checkIns: [], profile: { weight: null, height: null, waist: null, days: 3, minutes: 60, startDate: today, increment: 1, goal: 'grow', clearance: 'unknown', equipment: 'gym', programStyle: 'supported', includeCalves: false, includeHipThrust: false }, nextSlot: 0, importedAt: null, lastAudit: null };
}
const db = () => openDB('hypertrophy-lab', 1, { upgrade(database) { database.createObjectStore('state'); } });
export async function loadData(): Promise<AppData> {
  const database = await db();
  try { const value = await database.get('state', 'app'); return value ? backupSchema.parse(value) : emptyData(); }
  finally { database.close(); }
}
export async function saveData(value: AppData): Promise<void> {
  const database = await db();
  try { await database.put('state', backupSchema.parse(value), 'app'); }
  finally { database.close(); }
}
export function parseBackup(input: string): AppData {
  if (new TextEncoder().encode(input).length > 50 * 1024 * 1024) throw new Error('백업은 50 MB 이하만 지원합니다.');
  try { return backupSchema.parse(JSON.parse(input)); }
  catch { throw new Error('지원하지 않거나 손상된 Hypertrophy Lab 백업입니다. 기존 데이터는 변경하지 않았습니다.'); }
}
export function downloadFile(content: string, name: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = name; anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
