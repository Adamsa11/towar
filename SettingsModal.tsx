import React, { useState } from 'react';
import { X, Database, Sparkles, Check, AlertCircle, Save, Smartphone, Globe, Shield, RefreshCw, Volume2, Vibrate } from 'lucide-react';
import { AppSettings } from './types';
import { testSupabaseConnection } from './supabaseService';
import { testGeminiConnection } from './geminiService';
import { audioFeedback } from './audioFeedback';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSaveSettings: (newSettings: AppSettings) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
}) => {
  const [formData, setFormData] = useState<AppSettings>({ ...settings });
  const [supabaseTestStatus, setSupabaseTestStatus] = useState<{
    testing: boolean;
    result?: { ok: boolean; message: string; columns?: string[] };
  }>({ testing: false });

  const [geminiTestStatus, setGeminiTestStatus] = useState<{
    testing: boolean;
    result?: { ok: boolean; message: string };
  }>({ testing: false });

  const [activeTab, setActiveTab] = useState<'connections' | 'columns' | 'android_gh'>('connections');
  const [isSavedNotice, setIsSavedNotice] = useState(false);

  if (!isOpen) return null;

  const handleTestSupabase = async () => {
    setSupabaseTestStatus({ testing: true });
    audioFeedback.triggerHaptic('light', formData.hapticEnabled);
    const res = await testSupabaseConnection(formData);
    setSupabaseTestStatus({ testing: false, result: res });
    if (res.ok) {
      audioFeedback.playSuccess(formData.soundEnabled);
    } else {
      audioFeedback.playError(formData.soundEnabled);
    }
  };

  const handleTestGemini = async () => {
    setGeminiTestStatus({ testing: true });
    audioFeedback.triggerHaptic('light', formData.hapticEnabled);
    const res = await testGeminiConnection(formData);
    setGeminiTestStatus({ testing: false, result: res });
    if (res.ok) {
      audioFeedback.playSuccess(formData.soundEnabled);
    } else {
      audioFeedback.playError(formData.soundEnabled);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings(formData);
    audioFeedback.playSuccess(formData.soundEnabled);
    audioFeedback.triggerHaptic('success', formData.hapticEnabled);
    setIsSavedNotice(true);
    setTimeout(() => {
      setIsSavedNotice(false);
      onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white border border-zinc-200 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-200 flex items-center justify-between bg-zinc-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#F36F21]/10 border border-[#F36F21]/20 flex items-center justify-center text-[#F36F21]">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-zinc-900 tracking-tight font-['Ubuntu',sans-serif]">
                Ustawienia Lokalne (Supabase & Gemini)
              </h2>
              <p className="text-xs text-zinc-500 font-['Poppins',sans-serif]">
                Wszystkie klucze są przechowywane bezpiecznie w Twojej przeglądarce (localStorage)
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

        {/* Tab Navigation */}
        <div className="flex border-b border-zinc-200 bg-zinc-50/50 px-4 gap-2 pt-2">
          <button
            onClick={() => setActiveTab('connections')}
            className={`pb-2.5 px-3 text-xs sm:text-sm font-semibold font-['Ubuntu',sans-serif] border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'connections'
                ? 'border-[#F36F21] text-[#F36F21]'
                : 'border-transparent text-zinc-500 hover:text-zinc-800'
            }`}
          >
            <Database className="w-4 h-4" />
            Baza Supabase & AI Gemini
          </button>
          <button
            onClick={() => setActiveTab('columns')}
            className={`pb-2.5 px-3 text-xs sm:text-sm font-semibold font-['Ubuntu',sans-serif] border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'columns'
                ? 'border-[#F36F21] text-[#F36F21]'
                : 'border-transparent text-zinc-500 hover:text-zinc-800'
            }`}
          >
            <Shield className="w-4 h-4" />
            Kolumny tabeli "towar"
          </button>
          <button
            onClick={() => setActiveTab('android_gh')}
            className={`pb-2.5 px-3 text-xs sm:text-sm font-semibold font-['Ubuntu',sans-serif] border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'android_gh'
                ? 'border-[#F36F21] text-[#F36F21]'
                : 'border-transparent text-zinc-500 hover:text-zinc-800'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            GitHub Pages & Android
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {activeTab === 'connections' && (
            <div className="space-y-5">
              {/* Supabase Section */}
              <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200 space-y-3.5 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-emerald-600" />
                    <h3 className="text-sm font-bold text-zinc-900 font-['Ubuntu',sans-serif]">Konfiguracja Supabase (Tabela: {formData.tableName || 'towar'})</h3>
                  </div>
                  <span className="text-[10px] uppercase font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                    Wymagane
                  </span>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 mb-1">
                      Supabase Project URL
                    </label>
                    <input
                      type="url"
                      placeholder="https://xyzabcdefg.supabase.co"
                      value={formData.supabaseUrl}
                      onChange={e => setFormData({ ...formData, supabaseUrl: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-white border border-zinc-300 rounded-xl text-zinc-900 font-mono text-xs focus:border-[#F36F21] focus:ring-1 focus:ring-[#F36F21] outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 mb-1">
                      Supabase Anon Public API Key
                    </label>
                    <input
                      type="password"
                      placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                      value={formData.supabaseAnonKey}
                      onChange={e => setFormData({ ...formData, supabaseAnonKey: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-white border border-zinc-300 rounded-xl text-zinc-900 font-mono text-xs focus:border-[#F36F21] focus:ring-1 focus:ring-[#F36F21] outline-none transition-all"
                    />
                  </div>

                  {/* Supabase Test Action */}
                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      onClick={handleTestSupabase}
                      disabled={supabaseTestStatus.testing || !formData.supabaseUrl || !formData.supabaseAnonKey}
                      className="px-3.5 py-2 bg-zinc-200 hover:bg-zinc-300 disabled:opacity-50 text-xs font-bold font-['Ubuntu',sans-serif] text-zinc-800 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${supabaseTestStatus.testing ? 'animate-spin' : ''}`} />
                      <span>{supabaseTestStatus.testing ? 'Testowanie...' : 'Testuj połączenie z Supabase'}</span>
                    </button>

                    {supabaseTestStatus.result && (
                      <span
                        className={`text-xs font-medium flex items-center gap-1 ${
                          supabaseTestStatus.result.ok ? 'text-emerald-600' : 'text-[#CC0000]'
                        }`}
                      >
                        {supabaseTestStatus.result.ok ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          <AlertCircle className="w-4 h-4" />
                        )}
                        {supabaseTestStatus.result.message}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Gemini AI OCR Section */}
              <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200 space-y-3.5 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#F36F21]" />
                    <h3 className="text-sm font-bold text-zinc-900 font-['Ubuntu',sans-serif]">Google Gemini AI (Odczyt numerów ze zdjęć OCR)</h3>
                  </div>
                  <span className="text-[10px] uppercase font-semibold text-[#F36F21] bg-[#F36F21]/10 border border-[#F36F21]/20 px-2 py-0.5 rounded">
                    Wizja & OCR
                  </span>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 mb-1">
                      Gemini API Key
                    </label>
                    <input
                      type="password"
                      placeholder="AIzaSy..."
                      value={formData.geminiApiKey}
                      onChange={e => setFormData({ ...formData, geminiApiKey: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-white border border-zinc-300 rounded-xl text-zinc-900 font-mono text-xs focus:border-[#F36F21] focus:ring-1 focus:ring-[#F36F21] outline-none transition-all"
                    />
                    <p className="text-[11px] text-zinc-500 mt-1 font-['Poppins',sans-serif]">
                      Klucz do modelu Gemini (AI Studio). Umożliwia błyskawiczne odczytywanie numerów i kodów z etykiet i części. W przypadku braku klucza używany jest lokalny silnik OCR offline.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 mb-1">
                      Model Gemini
                    </label>
                    <select
                      value={formData.geminiModel}
                      onChange={e => setFormData({ ...formData, geminiModel: e.target.value })}
                      className="w-full px-3.5 py-2 bg-white border border-zinc-300 rounded-xl text-zinc-900 text-xs focus:border-[#F36F21] outline-none"
                    >
                      <option value="gemini-2.5-flash">gemini-2.5-flash (Zalecany - szybki & precyzyjny OCR)</option>
                      <option value="gemini-3.7-flash">gemini-3.7-flash (Najnowszy Flash)</option>
                      <option value="gemini-2.0-flash">gemini-2.0-flash</option>
                    </select>
                  </div>

                  {/* Gemini Test Action */}
                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      onClick={handleTestGemini}
                      disabled={geminiTestStatus.testing || !formData.geminiApiKey}
                      className="px-3.5 py-2 bg-zinc-200 hover:bg-zinc-300 disabled:opacity-50 text-xs font-bold font-['Ubuntu',sans-serif] text-zinc-800 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${geminiTestStatus.testing ? 'animate-spin' : ''}`} />
                      <span>{geminiTestStatus.testing ? 'Testowanie...' : 'Testuj Gemini API'}</span>
                    </button>

                    {geminiTestStatus.result && (
                      <span
                        className={`text-xs font-medium flex items-center gap-1 ${
                          geminiTestStatus.result.ok ? 'text-emerald-600' : 'text-[#CC0000]'
                        }`}
                      >
                        {geminiTestStatus.result.ok ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          <AlertCircle className="w-4 h-4" />
                        )}
                        {geminiTestStatus.result.message}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Preferences Toggles */}
              <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200 flex items-center justify-between gap-4 shadow-xs">
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-xs font-medium text-zinc-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.soundEnabled}
                      onChange={e => setFormData({ ...formData, soundEnabled: e.target.checked })}
                      className="rounded accent-[#F36F21] w-4 h-4"
                    />
                    <Volume2 className="w-3.5 h-3.5 text-zinc-500" />
                    Dźwięki skanera
                  </label>

                  <label className="flex items-center gap-2 text-xs font-medium text-zinc-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.hapticEnabled}
                      onChange={e => setFormData({ ...formData, hapticEnabled: e.target.checked })}
                      className="rounded accent-[#F36F21] w-4 h-4"
                    />
                    <Vibrate className="w-3.5 h-3.5 text-zinc-500" />
                    Wibracje (Android)
                  </label>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'columns' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200 space-y-3.5 shadow-xs">
                <h3 className="text-sm font-bold text-zinc-900 font-['Ubuntu',sans-serif]">Mapowanie kolumn tabeli bazy Supabase</h3>
                <p className="text-xs text-zinc-600 font-['Poppins',sans-serif]">
                  Domyślnie aplikacja przeszukuje tabelę <code className="text-[#F36F21] font-mono font-bold">towar</code> oraz kolumny <code className="text-[#F36F21] font-mono font-bold">Nr katalogowy</code>, <code className="text-sky-700 font-mono font-bold">kod</code>, <code className="text-emerald-700 font-mono font-bold">Nazwa</code>. Możesz je tu zmienić, jeśli Twoja tabela posiada inną strukturę.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 mb-1">
                      Nazwa tabeli
                    </label>
                    <input
                      type="text"
                      value={formData.tableName}
                      onChange={e => setFormData({ ...formData, tableName: e.target.value })}
                      placeholder="towar"
                      className="w-full px-3 py-2 bg-white border border-zinc-300 rounded-xl text-zinc-900 font-mono text-xs focus:border-[#F36F21] outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 mb-1">
                      Kolumna: Nr katalogowy
                    </label>
                    <input
                      type="text"
                      value={formData.catalogNumberColumn}
                      onChange={e => setFormData({ ...formData, catalogNumberColumn: e.target.value })}
                      placeholder="Nr katalogowy"
                      className="w-full px-3 py-2 bg-white border border-zinc-300 rounded-xl text-zinc-900 font-mono text-xs focus:border-[#F36F21] outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 mb-1">
                      Kolumna: Kod
                    </label>
                    <input
                      type="text"
                      value={formData.codeColumn}
                      onChange={e => setFormData({ ...formData, codeColumn: e.target.value })}
                      placeholder="Kod"
                      className="w-full px-3 py-2 bg-white border border-zinc-300 rounded-xl text-zinc-900 font-mono text-xs focus:border-[#F36F21] outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 mb-1">
                      Kolumna: Nazwa
                    </label>
                    <input
                      type="text"
                      value={formData.nameColumn}
                      onChange={e => setFormData({ ...formData, nameColumn: e.target.value })}
                      placeholder="Nazwa"
                      className="w-full px-3 py-2 bg-white border border-zinc-300 rounded-xl text-zinc-900 font-mono text-xs focus:border-[#F36F21] outline-none"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-zinc-700 mb-1">
                      Kolumna: Opis (wyszukiwanie LIKE '%szukany_numer%')
                    </label>
                    <input
                      type="text"
                      value={formData.descriptionColumn || 'Opis'}
                      onChange={e => setFormData({ ...formData, descriptionColumn: e.target.value })}
                      placeholder="Opis"
                      className="w-full px-3 py-2 bg-white border border-zinc-300 rounded-xl text-zinc-900 font-mono text-xs focus:border-[#F36F21] outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'android_gh' && (
            <div className="space-y-4 text-xs text-zinc-700 font-['Poppins',sans-serif]">
              <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200 space-y-3 shadow-xs">
                <div className="flex items-center gap-2 text-[#F36F21] font-bold text-sm font-['Ubuntu',sans-serif]">
                  <Globe className="w-4 h-4" />
                  Wdrożenie na GitHub Pages
                </div>
                <p>
                  Aplikacja jest w 100% klientowym Single Page Application (SPA), co oznacza, że możesz ją wdrożyć bez serwera backendowego na <strong>GitHub Pages</strong>.
                </p>
                <div className="bg-white p-3 rounded-xl font-mono text-[11px] text-zinc-800 space-y-1 border border-zinc-200">
                  <p className="text-zinc-500"># 1. Zbuduj projekt:</p>
                  <p className="text-[#F36F21] font-bold">npm run build</p>
                  <p className="text-zinc-500"># 2. Wypchnij zawartość katalogu dist/ na gałąź gh-pages</p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200 space-y-3 shadow-xs">
                <div className="flex items-center gap-2 text-sky-700 font-bold text-sm font-['Ubuntu',sans-serif]">
                  <Smartphone className="w-4 h-4" />
                  Instalacja na telefonie z Androidem (PWA)
                </div>
                <ol className="list-decimal list-inside space-y-1.5 pl-1 text-zinc-600">
                  <li>Otwórz adres wdrożonej aplikacji w przeglądarce <strong>Chrome na Androidzie</strong>.</li>
                  <li>Dotknij menu trzech kropek w prawym górnym rogu.</li>
                  <li>Wybierz <strong>"Dodaj do ekranu głównego"</strong> lub <strong>"Zainstaluj aplikację"</strong>.</li>
                  <li>Aplikacja zyska pełnoekranowy tryb pracy, dostęp do tylnego aparatu ze wsparciem latarki oraz wibracje dotykowe.</li>
                </ol>
              </div>
            </div>
          )}

          {/* Footer Save Actions */}
          <div className="pt-4 border-t border-zinc-200 flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                setFormData({ ...settings });
                onClose();
              }}
              className="px-4 py-2.5 text-xs font-semibold text-zinc-500 hover:text-zinc-900 transition-colors cursor-pointer"
            >
              Anuluj
            </button>

            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-[#F36F21] hover:bg-[#ff7e33] text-white font-bold font-['Ubuntu',sans-serif] text-sm flex items-center gap-2 shadow-lg shadow-[#F36F21]/20 transition-all cursor-pointer"
            >
              {isSavedNotice ? (
                <>
                  <Check className="w-4 h-4 text-white" />
                  <span>Zapisano pomyślnie!</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Zapisz ustawienia</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
