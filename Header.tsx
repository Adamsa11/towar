import React from 'react';
import { Camera, Settings, History, HelpCircle, Database, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';
import { AppSettings } from './types';
import { SawTrakLogo } from './SawTrakLogo';

interface HeaderProps {
  settings: AppSettings;
  onOpenSettings: () => void;
  onOpenHistory: () => void;
  onOpenHelp: () => void;
  onQuickCamera: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  settings,
  onOpenSettings,
  onOpenHistory,
  onOpenHelp,
  onQuickCamera,
}) => {
  const isSupabaseReady = Boolean(settings.supabaseUrl && settings.supabaseAnonKey);
  const isGeminiReady = Boolean(settings.geminiApiKey);

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-zinc-200/80 px-4 py-3 sm:px-6 shadow-xs">
      <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
        {/* Saw-Trak Brand Logo & Title */}
        <div className="flex items-center gap-3">
          <SawTrakLogo
            size="md"
            variant="light"
            subtitle="Magazyn & Części"
            className="cursor-pointer"
          />
          <div className="hidden lg:flex items-center gap-1.5 pl-3 border-l border-zinc-200">
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#F36F21]/10 text-[#F36F21] border border-[#F36F21]/20 font-['Ubuntu',sans-serif]">
              Skaner AI & OCR
            </span>
          </div>
        </div>

        {/* Status Pills & Actions */}
        <div className="flex items-center gap-2">
          {/* Supabase Status Pill */}
          <button
            onClick={onOpenSettings}
            title={isSupabaseReady ? 'Supabase: Skonfigurowany' : 'Supabase: Brak konfiguracji (Tryb Demo)'}
            className={`hidden md:flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-xl border transition-colors cursor-pointer ${
              isSupabaseReady
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100/70'
                : 'bg-[#F36F21]/10 border-[#F36F21]/30 text-[#F36F21] hover:bg-[#F36F21]/20'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span className="font-medium">
              {isSupabaseReady ? 'Tabela: towar' : 'Demo (bez Supabase)'}
            </span>
            {isSupabaseReady ? (
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            ) : (
              <AlertCircle className="w-3 h-3 text-[#F36F21]" />
            )}
          </button>

          {/* Gemini AI Status Pill */}
          <button
            onClick={onOpenSettings}
            title={isGeminiReady ? 'Gemini AI: Aktywny' : 'Gemini AI: Brak klucza API (Demo OCR)'}
            className={`hidden sm:flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-xl border transition-colors cursor-pointer ${
              isGeminiReady
                ? 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100/70'
                : 'bg-zinc-100 border-zinc-200 text-zinc-600 hover:bg-zinc-200/70'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="font-medium">{isGeminiReady ? 'Gemini OCR' : 'Lokalny OCR'}</span>
          </button>

          {/* Quick Camera Action (Saw-Trak Neon Orange #F36F21) */}
          <button
            onClick={onQuickCamera}
            className="flex items-center gap-1.5 bg-[#F36F21] hover:bg-[#ff7e33] active:scale-95 text-white font-bold font-['Ubuntu',sans-serif] px-3.5 py-2 rounded-xl text-sm transition-all shadow-md shadow-[#F36F21]/20 hover:shadow-lg hover:shadow-[#F36F21]/30 cursor-pointer"
            title="Uruchom aparat"
          >
            <Camera className="w-4 h-4" />
            <span className="hidden sm:inline">Skanuj aparat</span>
          </button>

          {/* History Button */}
          <button
            onClick={onOpenHistory}
            className="p-2 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 rounded-xl transition-colors cursor-pointer"
            title="Historia wyszukiwań"
          >
            <History className="w-5 h-5" />
          </button>

          {/* Help Button */}
          <button
            onClick={onOpenHelp}
            className="p-2 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 rounded-xl transition-colors cursor-pointer"
            title="Instrukcja i pomoc"
          >
            <HelpCircle className="w-5 h-5" />
          </button>

          {/* Settings Button */}
          <button
            onClick={onOpenSettings}
            className="p-2 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 rounded-xl transition-colors relative cursor-pointer"
            title="Ustawienia bazy i AI"
          >
            <Settings className="w-5 h-5" />
            {(!isSupabaseReady || !isGeminiReady) && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#F36F21] animate-pulse" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
