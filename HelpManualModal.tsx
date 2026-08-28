import React from 'react';
import { X, HelpCircle, Camera, CheckSquare, Search, Database, Sparkles, Smartphone } from 'lucide-react';

interface HelpManualModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSettings: () => void;
}

export const HelpManualModal: React.FC<HelpManualModalProps> = ({
  isOpen,
  onClose,
  onOpenSettings,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white border border-zinc-200 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-200 flex items-center justify-between bg-zinc-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#F36F21]/10 border border-[#F36F21]/20 flex items-center justify-center text-[#F36F21]">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-zinc-900 tracking-tight font-['Ubuntu',sans-serif]">
                Instrukcja obsługi & Workflow
              </h2>
              <p className="text-xs text-zinc-500 font-['Poppins',sans-serif]">
                Jak działa skaner elementów i wyszukiwanie w tabeli "towar"
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-zinc-800 hover:bg-zinc-200 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-sm text-zinc-700 font-['Poppins',sans-serif]">
          {/* Workflow Steps */}
          <div className="space-y-3">
            {/* Step 1 */}
            <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200 flex gap-3.5 items-start shadow-xs">
              <div className="w-8 h-8 rounded-xl bg-[#F36F21]/10 border border-[#F36F21]/20 flex items-center justify-center text-[#F36F21] font-bold font-['Ubuntu',sans-serif] shrink-0">
                1
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-zinc-900 font-['Ubuntu',sans-serif] flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-[#F36F21]" />
                  Zrób zdjęcie lub wpisz numer
                </h3>
                <p className="text-xs text-zinc-600">
                  Użyj aparatu w telefonie / komputerze lub wgraj zdjęcie etykiety, tabliczki znamionowej czy oznaczenia na części. Możesz też od razu wpisać numer w polu wyszukiwania.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200 flex gap-3.5 items-start shadow-xs">
              <div className="w-8 h-8 rounded-xl bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-700 font-bold font-['Ubuntu',sans-serif] shrink-0">
                2
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-zinc-900 font-['Ubuntu',sans-serif] flex items-center gap-1.5">
                  <CheckSquare className="w-4 h-4 text-sky-600" />
                  Wskaż numer, po którym chcesz szukać
                </h3>
                <p className="text-xs text-zinc-600">
                  AI OCR odczyta wszystkie potencjalne numery katalogowe, kody OEM, kody kreskowe i numery seryjne. Wystarczy dotknąć wybranego numeru na liście.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200 flex gap-3.5 items-start shadow-xs">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 font-bold font-['Ubuntu',sans-serif] shrink-0">
                3
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-zinc-900 font-['Ubuntu',sans-serif] flex items-center gap-1.5">
                  <Search className="w-4 h-4 text-emerald-600" />
                  Wyszukiwanie w tabeli "towar"
                </h3>
                <p className="text-xs text-zinc-600">
                  Aplikacja przeszukuje Twoją bazę Supabase i zwraca kolumny <strong className="text-[#F36F21]">Nr katalogowy</strong>, <strong className="text-sky-700">kod</strong> oraz <strong className="text-zinc-900">Nazwa</strong> wraz ze stanami magazynowymi i lokalizacją.
                </p>
              </div>
            </div>
          </div>

          {/* Quick Setup Hint */}
          <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200 flex items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2 text-xs text-zinc-600">
              <Database className="w-4 h-4 text-[#F36F21] shrink-0" />
              <span>Chcesz podłączyć własną bazę Supabase lub klucz Gemini?</span>
            </div>
            <button
              onClick={() => {
                onClose();
                onOpenSettings();
              }}
              className="px-3.5 py-1.5 bg-[#F36F21] hover:bg-[#ff7e33] text-white text-xs font-bold font-['Ubuntu',sans-serif] rounded-xl shrink-0 transition-colors cursor-pointer shadow-sm"
            >
              Otwórz Ustawienia
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-200 bg-zinc-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-zinc-200 hover:bg-zinc-300 text-zinc-800 text-xs font-bold font-['Ubuntu',sans-serif] transition-colors cursor-pointer"
          >
            Zamknij
          </button>
        </div>
      </div>
    </div>
  );
};
