export type Muscle = 'chest' | 'back' | 'quads' | 'hamstrings' | 'glutes' | 'frontDelts' | 'sideDelts' | 'rearDelts' | 'biceps' | 'triceps' | 'calves' | 'core';
export type SetKind = 'work' | 'warmup' | 'drop' | 'rest' | 'cardio' | 'timed' | 'unknown';
export interface Exercise {
  id: string; name: string; aliases: string[]; direct: Muscle[]; indirect: Muscle[];
  load: 'external' | 'assistance' | 'bodyweight' | 'cardio' | 'timed';
  equipment: 'machine' | 'dumbbell' | 'barbell' | 'bodyweight' | 'cable';
  note: string; alternative: string; cue: string;
}
export interface TrainingSet {
  id: string; exercise: string; exerciseId: string | null; order: string; kind: SetKind;
  weight: number | null; reps: number | null; rpe: number | null; rir: number | null;
  distance: number | null; seconds: number | null; notes: string;
}
export interface Session {
  id: string; source: 'strong' | 'log' | 'demo'; sourceId: string;
  date: string; startedAt: string; name: string; duration: number | null;
  notes: string; sets: TrainingSet[]; slot?: string;
}
export interface ImportIssue { row: number; code: string; message: string }
export interface ImportAudit {
  totalRows: number; acceptedRows: number; rejectedRows: number; duplicateRows: number;
  rest: number; warmup: number; drop: number; cardio: number; timed: number;
  unknown: number; missingRpe: number; missingLoad: number; unmapped: string[];
  issues: ImportIssue[]; delimiter: string;
}
export interface ImportResult { sessions: Session[]; audit: ImportAudit }
export interface PlannedExercise { exerciseId: string; sets: number; reps: [number, number]; rir: number; rest: number }
export interface WeeklyReview { week: string; action: 'keep' | 'reduce' | 'change'; note: string; recordedAt: string }
export interface Profile {
  weight: number | null; height: number | null; waist: number | null;
  days: 2 | 3 | 4; minutes: 30 | 60; startDate: string; increment: number;
  goal: 'grow' | 'maintain' | 'recompose'; clearance: 'unknown' | 'confirmed';
  equipment: 'gym' | 'home';
  programStyle?: 'supported' | 'barbell';
  includeCalves?: boolean; includeHipThrust?: boolean;
  customPlans?: Record<string, PlannedExercise[]>;
  recordBindings?: Record<string, string>;
}
export interface CheckIn {
  id: string; date: string; weight: number | null; waist: number | null;
  sleep: number | null; fatigue: number | null; pain: number | null;
  protein: number | null; symptoms: boolean; notes: string;
}
export interface AppData {
  schemaVersion: 1; sessions: Session[]; checkIns: CheckIn[]; profile: Profile;
  nextSlot: number; importedAt: string | null; lastAudit: ImportAudit | null;
  reviews?: WeeklyReview[];
}
export type PageId = 'overview' | 'history' | 'diagnosis' | 'program' | 'designer' | 'progression' | 'review' | 'log' | 'nutrition' | 'research' | 'settings';
export const MUSCLES: Record<Muscle, string> = {
  chest: '가슴', back: '등', quads: '대퇴사두', hamstrings: '햄스트링', glutes: '둔근',
  frontDelts: '전면 어깨', sideDelts: '측면 어깨', rearDelts: '후면 어깨',
  biceps: '이두', triceps: '삼두', calves: '종아리', core: '코어',
};
