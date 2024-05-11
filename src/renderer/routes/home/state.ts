import { atom } from 'recoil';

import { ScrapeTaskType } from '../../../types';

interface AppState {
  file: File | null;
  timeout: number;
  type: ScrapeTaskType;
}

export const appStateAtom = atom<Partial<AppState>>({
  key: 'appState',
  default: {},
});
