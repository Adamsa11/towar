import { AppSettings, SearchHistoryEntry } from './types';

const SETTINGS_KEY = 'skaner_towaru_settings_v1';
const HISTORY_KEY = 'skaner_towaru_history_v1';

export const DEFAULT_SETTINGS: AppSettings = {
  supabaseUrl: '',
  supabaseAnonKey: '',
  geminiApiKey: '',
  geminiModel: 'gemini-2.5-flash',
  tableName: 'towar',
  catalogNumberColumn: 'Nr katalogowy',
  codeColumn: 'Kod',
  nameColumn: 'Nazwa',
  descriptionColumn: 'Opis',
  autoSearchOnSingleDetect: false,
  soundEnabled: true,
  hapticEnabled: true,
  searchMode: 'contains',
  demoMode: false,
};

export const storageService = {
  getSettings(): AppSettings {
    try {
      const stored = localStorage.getItem(SETTINGS_KEY);
      if (stored) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
      }
    } catch (e) {
      console.warn('Could not read settings from localStorage', e);
    }
    return { ...DEFAULT_SETTINGS };
  },

  saveSettings(settings: AppSettings): void {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (e) {
      console.warn('Could not save settings to localStorage', e);
    }
  },

  getHistory(): SearchHistoryEntry[] {
    try {
      const stored = localStorage.getItem(HISTORY_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Could not read history from localStorage', e);
    }
    return [];
  },

  addHistory(entry: Omit<SearchHistoryEntry, 'id' | 'timestamp'>): SearchHistoryEntry[] {
    try {
      const current = this.getHistory();
      const newEntry: SearchHistoryEntry = {
        ...entry,
        id: 'hist_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
        timestamp: Date.now(),
      };
      // Keep unique recent entries, limit to 40
      const filtered = current.filter(item => item.query.toLowerCase() !== entry.query.toLowerCase());
      const updated = [newEntry, ...filtered].slice(0, 40);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
      return updated;
    } catch (e) {
      console.warn('Could not save history', e);
      return [];
    }
  },

  clearHistory(): void {
    try {
      localStorage.removeItem(HISTORY_KEY);
    } catch (e) {
      console.warn('Could not clear history', e);
    }
  },
};
