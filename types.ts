export interface TowarItem {
  id?: string | number;
  'Nr katalogowy'?: string;
  nr_katalogowy?: string;
  nrKatalogowy?: string;
  catalog_number?: string;
  
  Kod?: string;
  kod?: string;
  code?: string;
  kod_towaru?: string;
  ean?: string;
  
  Nazwa?: string;
  nazwa?: string;
  name?: string;
  nazwa_towaru?: string;

  Opis?: string;
  opis?: string;
  description?: string;
  jednostka?: string;
  created_at?: string;
  [key: string]: unknown;
}

export interface DetectedNumber {
  id: string;
  text: string;
  cleanText: string;
  label: string; // e.g. "Główny numer katalogowy", "Kod OEM", "Kod kreskowy / EAN", "Numer seryjny"
  confidence?: number;
  type: 'catalog' | 'oem' | 'barcode' | 'serial' | 'part' | 'general';
  highlighted?: boolean;
}

export interface AppSettings {
  supabaseUrl: string;
  supabaseAnonKey: string;
  geminiApiKey: string;
  geminiModel: string;
  tableName: string;
  catalogNumberColumn: string;
  codeColumn: string;
  nameColumn: string;
  descriptionColumn: string;
  autoSearchOnSingleDetect: boolean;
  soundEnabled: boolean;
  hapticEnabled: boolean;
  searchMode: 'contains' | 'exact' | 'fuzzy';
  demoMode: boolean;
}

export interface SearchHistoryEntry {
  id: string;
  query: string;
  timestamp: number;
  resultsCount: number;
  source: 'camera' | 'upload' | 'manual' | 'detected_pick';
  firstResultName?: string;
}

export interface SearchFilterState {
  searchQuery: string;
  activeDetectedNumberId?: string;
  searchType: 'all' | 'catalog' | 'code' | 'name';
}
