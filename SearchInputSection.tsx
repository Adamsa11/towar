import React, { useRef } from 'react';
import { Search, X, Clipboard, Filter } from 'lucide-react';
import { audioFeedback } from './audioFeedback';

interface SearchInputSectionProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onSearch: () => void;
  isSearching: boolean;
  searchType: 'all' | 'catalog' | 'code' | 'name' | 'opis';
  setSearchType: (type: 'all' | 'catalog' | 'code' | 'name' | 'opis') => void;
  soundEnabled?: boolean;
  hapticEnabled?: boolean;
}

export const SearchInputSection: React.FC<SearchInputSectionProps> = ({
  searchQuery,
  setSearchQuery,
  onSearch,
  isSearching,
  searchType,
  setSearchType,
  soundEnabled = true,
  hapticEnabled = true,
}) => {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onSearch();
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setSearchQuery(text.trim());
        audioFeedback.triggerHaptic('light', hapticEnabled);
        inputRef.current?.focus();
      }
    } catch {
      // ignore
    }
  };

  const handleClear = () => {
    setSearchQuery('');
    inputRef.current?.focus();
    audioFeedback.triggerHaptic('light', hapticEnabled);
  };

  return (
    <div className="bg-white border border-zinc-200/90 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
      {/* Search Type Filter Chips */}
      <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 scrollbar-none">
        <div className="flex items-center gap-1.5 text-xs text-zinc-500 font-medium shrink-0 font-['Ubuntu',sans-serif]">
          <Filter className="w-3.5 h-3.5 text-[#F36F21]" />
          <span>Szukaj w:</span>
        </div>

        <div className="flex items-center gap-1.5 font-['Ubuntu',sans-serif]">
          <button
            onClick={() => setSearchType('all')}
            className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
              searchType === 'all'
                ? 'bg-[#F36F21] text-white font-bold shadow-xs'
                : 'bg-zinc-100 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200'
            }`}
          >
            Wszystkie pola
          </button>
          <button
            onClick={() => setSearchType('catalog')}
            className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
              searchType === 'catalog'
                ? 'bg-[#F36F21] text-white font-bold shadow-xs'
                : 'bg-zinc-100 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200'
            }`}
          >
            Nr katalogowy
          </button>
          <button
            onClick={() => setSearchType('code')}
            className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
              searchType === 'code'
                ? 'bg-[#F36F21] text-white font-bold shadow-xs'
                : 'bg-zinc-100 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200'
            }`}
          >
            Kod
          </button>
          <button
            onClick={() => setSearchType('name')}
            className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
              searchType === 'name'
                ? 'bg-[#F36F21] text-white font-bold shadow-xs'
                : 'bg-zinc-100 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200'
            }`}
          >
            Nazwa
          </button>
          <button
            onClick={() => setSearchType('opis')}
            className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
              searchType === 'opis'
                ? 'bg-[#F36F21] text-white font-bold shadow-xs'
                : 'bg-zinc-100 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200'
            }`}
          >
            Opis
          </button>
        </div>
      </div>

      {/* Main Input Row */}
      <div className="flex flex-col sm:flex-row gap-2.5">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
            <Search className="w-5 h-5" />
          </div>

          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Wpisz numer części (np. HE221-00311X), kod lub nazwę..."
            className="w-full pl-11 pr-20 py-3.5 bg-zinc-50/70 focus:bg-white border border-zinc-300 focus:border-[#F36F21] focus:ring-2 focus:ring-[#F36F21]/20 rounded-xl text-zinc-900 font-mono text-base placeholder:text-zinc-400 placeholder:font-sans outline-none transition-all"
          />

          <div className="absolute inset-y-0 right-0 pr-2 flex items-center gap-1">
            {searchQuery ? (
              <button
                onClick={handleClear}
                className="p-1.5 text-zinc-400 hover:text-zinc-700 rounded-lg hover:bg-zinc-200 transition-colors cursor-pointer"
                title="Wyczyść"
              >
                <X className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handlePaste}
                className="p-1.5 text-zinc-400 hover:text-[#F36F21] rounded-lg hover:bg-zinc-200 transition-colors cursor-pointer"
                title="Wklej ze schowka"
              >
                <Clipboard className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Primary Search Button in Saw-Trak Orange */}
        <button
          onClick={onSearch}
          disabled={isSearching || !searchQuery.trim()}
          className={`py-3.5 px-6 rounded-xl font-bold font-['Ubuntu',sans-serif] text-base flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md ${
            isSearching || !searchQuery.trim()
              ? 'bg-zinc-100 text-zinc-400 border border-zinc-200 cursor-not-allowed shadow-none'
              : 'bg-[#F36F21] hover:bg-[#ff7e33] active:scale-95 text-white shadow-[#F36F21]/20 hover:shadow-lg hover:shadow-[#F36F21]/30'
          }`}
        >
          <Search className={`w-5 h-5 ${isSearching ? 'animate-spin' : ''}`} />
          <span>{isSearching ? 'Przeszukuję...' : 'Szukaj w bazie'}</span>
        </button>
      </div>
    </div>
  );
};
