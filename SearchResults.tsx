import React, { useState } from 'react';
import { Package, Hash, Barcode, Tag, Check, Copy, AlertCircle, Sparkles, MapPin, DollarSign, Boxes, Database } from 'lucide-react';
import { TowarItem } from './types';
import { getFieldVal } from './supabaseService';
import { audioFeedback } from './audioFeedback';

interface SearchResultsProps {
  results: TowarItem[];
  isSearching: boolean;
  searchQuery: string;
  hasSearched: boolean;
  isDemo: boolean;
  errorMessage?: string;
  onOpenSettings: () => void;
  soundEnabled?: boolean;
  hapticEnabled?: boolean;
}

export const SearchResults: React.FC<SearchResultsProps> = ({
  results,
  isSearching,
  searchQuery,
  hasSearched,
  isDemo,
  errorMessage,
  onOpenSettings,
  soundEnabled = true,
  hapticEnabled = true,
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (text: string, key: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    audioFeedback.triggerHaptic('light', hapticEnabled);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  if (isSearching) {
    return (
      <div className="bg-white border border-zinc-200/90 rounded-2xl p-8 sm:p-12 text-center flex flex-col items-center justify-center gap-4 shadow-xs">
        <div className="w-14 h-14 rounded-2xl bg-[#F36F21]/10 border border-[#F36F21]/30 flex items-center justify-center text-[#F36F21] animate-pulse">
          <Database className="w-7 h-7 animate-spin" />
        </div>
        <div>
          <h3 className="text-base font-bold font-['Ubuntu',sans-serif] text-zinc-900 mb-1">Przeszukiwanie tabeli "towar"...</h3>
          <p className="text-xs text-zinc-500 font-['Poppins',sans-serif]">
            Wyszukiwanie numeru: <span className="font-mono text-[#F36F21] font-bold">"{searchQuery}"</span>
          </p>
        </div>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-center flex flex-col items-center justify-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-rose-100 border border-rose-200 flex items-center justify-center text-[#CC0000]">
          <AlertCircle className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-base font-bold font-['Ubuntu',sans-serif] text-zinc-900 mb-1">Błąd podczas wyszukiwania</h3>
          <p className="text-xs text-rose-700 max-w-md mx-auto">{errorMessage}</p>
        </div>
        <button
          onClick={onOpenSettings}
          className="mt-2 px-4 py-2 bg-rose-100 hover:bg-rose-200 border border-rose-300 text-rose-900 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
        >
          Sprawdź konfigurację bazy Supabase w Ustawieniach
        </button>
      </div>
    );
  }

  if (!hasSearched) {
    return (
      <div className="bg-white border border-zinc-200/80 rounded-2xl p-8 text-center flex flex-col items-center justify-center gap-3 shadow-xs">
        <div className="w-12 h-12 rounded-xl bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-500">
          <Package className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-sm font-bold font-['Ubuntu',sans-serif] text-zinc-900 mb-0.5">Gotowy do wyszukiwania części</h3>
          <p className="text-xs text-zinc-500 max-w-sm font-['Poppins',sans-serif]">
            Zrób zdjęcie etykiety aparatem, wybierz odczytany numer ze zdjęcia lub wpisz kod części ręcznie powyżej.
          </p>
        </div>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="bg-white border border-zinc-200/90 rounded-2xl p-8 sm:p-10 text-center flex flex-col items-center justify-center gap-4 shadow-xs">
        <div className="w-14 h-14 rounded-2xl bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-500">
          <Package className="w-7 h-7" />
        </div>
        <div>
          <h3 className="text-base font-bold font-['Ubuntu',sans-serif] text-zinc-900 mb-1">Brak wyników w tabeli "towar"</h3>
          <p className="text-xs text-zinc-500 max-w-md mx-auto font-['Poppins',sans-serif]">
            Nie znaleziono pozycji pasującej do zapytania <span className="font-mono text-[#F36F21] font-bold">"{searchQuery}"</span>.
          </p>
        </div>
        <div className="text-xs text-zinc-600 bg-zinc-50 p-3.5 rounded-xl border border-zinc-200 text-left max-w-md w-full space-y-1">
          <p className="font-semibold text-zinc-900 font-['Ubuntu',sans-serif]">Wskazówki wyszukiwania:</p>
          <ul className="list-disc list-inside space-y-0.5 text-zinc-600 font-['Poppins',sans-serif]">
            <li>Upewnij się, że numer nie zawiera literówek (np. 'O' zamiast '0').</li>
            <li>Spróbuj wpisać krótszy fragment numeru lub sam kod części.</li>
            <li>Sprawdź, czy pozycja została dodana do bazy Supabase w tabeli "towar".</li>
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Results Header */}
      <div className="flex items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-2">
          <h2 className="text-base sm:text-lg font-bold font-['Ubuntu',sans-serif] text-zinc-900 tracking-tight flex items-center gap-2">
            Wyniki wyszukiwania
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#F36F21]/10 text-[#F36F21] border border-[#F36F21]/20">
              {results.length} {results.length === 1 ? 'pozycja' : results.length < 5 ? 'pozycje' : 'pozycji'}
            </span>
          </h2>
        </div>

        {isDemo && (
          <button
            onClick={onOpenSettings}
            className="text-[11px] text-[#F36F21] bg-[#F36F21]/10 hover:bg-[#F36F21]/20 border border-[#F36F21]/30 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 font-medium cursor-pointer"
          >
            <Sparkles className="w-3 h-3 text-[#F36F21]" />
            <span>Tryb Demo • Skonfiguruj Supabase</span>
          </button>
        )}
      </div>

      {/* Item Cards List */}
      <div className="space-y-3.5">
        {results.map((item, idx) => {
          const nrKatalogowy = getFieldVal(item, ['Nr katalogowy', 'nr_katalogowy', 'nrKatalogowy', 'catalog_number', 'nr_kat', 'numer_katalogowy']) || '—';
          const kod = getFieldVal(item, ['kod', 'kod_towaru', 'code', 'ean', 'barcode']) || '—';
          const nazwa = getFieldVal(item, ['Nazwa', 'nazwa', 'name', 'nazwa_towaru', 'tytul']) || 'Brak nazwy';
          const producent = getFieldVal(item, ['producent', 'marka', 'brand', 'manufacturer']);
          const stan = getFieldVal(item, ['stan', 'stan_magazynowy', 'ilosc', 'stock', 'quantity']);
          const cena = getFieldVal(item, ['cena', 'cena_netto', 'cena_brutto', 'price']);
          const lokalizacja = getFieldVal(item, ['lokalizacja', 'regal', 'polka', 'location', 'shelf']);
          const opis = getFieldVal(item, ['opis', 'description', 'uwagi']);

          const copyIdNr = `nr_${idx}_${nrKatalogowy}`;
          const copyIdKod = `kod_${idx}_${kod}`;

          return (
            <div
              key={item.id ? String(item.id) : `item_${idx}`}
              className="bg-white border border-zinc-200/90 hover:border-[#F36F21]/40 rounded-2xl p-4 sm:p-5 shadow-xs transition-all"
            >
              {/* Top Row: Name and Producer */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-bold text-[#F36F21] uppercase tracking-wider bg-[#F36F21]/10 px-2.5 py-0.5 rounded border border-[#F36F21]/20 font-['Ubuntu',sans-serif]">
                      Pozycja #{idx + 1}
                    </span>
                    {producent && (
                      <span className="text-[11px] font-semibold text-zinc-700 bg-zinc-100 px-2 py-0.5 rounded border border-zinc-200 font-['Poppins',sans-serif]">
                        {producent}
                      </span>
                    )}
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-zinc-900 tracking-tight leading-snug font-['Ubuntu',sans-serif]">
                    {nazwa}
                  </h3>
                </div>
              </div>

              {/* Core Requested Fields: "Nr katalogowy", "kod", "Nazwa" */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-3 rounded-xl bg-zinc-50 border border-zinc-200/80 mb-3">
                {/* Nr katalogowy */}
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-white border border-zinc-200 shadow-xs">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-semibold tracking-wider text-zinc-500 uppercase flex items-center gap-1 font-['Ubuntu',sans-serif]">
                      <Hash className="w-3 h-3 text-[#F36F21]" />
                      Nr katalogowy
                    </span>
                    <div className="font-mono text-sm sm:text-base font-bold text-[#F36F21]">
                      {nrKatalogowy}
                    </div>
                  </div>
                  {nrKatalogowy !== '—' && (
                    <button
                      onClick={e => handleCopy(nrKatalogowy, copyIdNr, e)}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-800 hover:bg-zinc-100 transition-colors cursor-pointer"
                      title="Kopiuj numer katalogowy"
                    >
                      {copiedKey === copyIdNr ? (
                        <Check className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  )}
                </div>

                {/* Kod */}
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-white border border-zinc-200 shadow-xs">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-semibold tracking-wider text-zinc-500 uppercase flex items-center gap-1 font-['Ubuntu',sans-serif]">
                      <Barcode className="w-3 h-3 text-sky-600" />
                      Kod
                    </span>
                    <div className="font-mono text-sm sm:text-base font-bold text-sky-700">
                      {kod}
                    </div>
                  </div>
                  {kod !== '—' && (
                    <button
                      onClick={e => handleCopy(kod, copyIdKod, e)}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-800 hover:bg-zinc-100 transition-colors cursor-pointer"
                      title="Kopiuj kod"
                    >
                      {copiedKey === copyIdKod ? (
                        <Check className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Extra Optional Fields if Available in Supabase */}
              {(stan || cena || lokalizacja || opis) && (
                <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-zinc-600 border-t border-zinc-200/80">
                  {stan && (
                    <span className="flex items-center gap-1 text-emerald-700 font-medium">
                      <Boxes className="w-3.5 h-3.5" />
                      Stan: <span className="font-bold text-zinc-900">{stan} szt.</span>
                    </span>
                  )}
                  {cena && (
                    <span className="flex items-center gap-1 text-[#F36F21] font-medium">
                      <DollarSign className="w-3.5 h-3.5" />
                      Cena: <span className="font-bold text-zinc-900">{cena}</span>
                    </span>
                  )}
                  {lokalizacja && (
                    <span className="flex items-center gap-1 text-zinc-700">
                      <MapPin className="w-3.5 h-3.5 text-[#CC0000]" />
                      Lokalizacja: <span className="font-medium text-zinc-900">{lokalizacja}</span>
                    </span>
                  )}
                  {opis && (
                    <p className="w-full text-xs text-zinc-500 mt-1 italic font-['Poppins',sans-serif]">
                      {opis}
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
