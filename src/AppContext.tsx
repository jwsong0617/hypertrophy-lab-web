import { createContext, useContext } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { AppData, PageId, Session } from './domain/types.ts';

export interface AppServices {
  data: AppData; update: Dispatch<SetStateAction<AppData>>; sessions: Session[];
  mode: 'personal' | 'demo'; setMode: (mode: 'personal' | 'demo') => void;
  navigate: (page: PageId) => void; notify: (message: string) => void;
  startWorkout: (id?: string) => void;
}
export const AppContext = createContext<AppServices | null>(null);
export function useApp(): AppServices {
  const value = useContext(AppContext);
  if (!value) throw new Error('App provider missing');
  return value;
}
