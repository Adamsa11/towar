/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './Header';
import { CameraScannerModal } from './CameraScannerModal';
import { ImageUploadZone } from './ImageUploadZone';
import { DetectedNumbersPicker } from './DetectedNumbersPicker';
import { SearchInputSection } from './SearchInputSection';
import { SearchResults } from './SearchResults';
import { SettingsModal } from './SettingsModal';
import { HistoryDrawer } from './HistoryDrawer';
import { HelpManualModal } from './HelpManualModal';

import { AppSettings, DetectedNumber, SearchHistoryEntry, TowarItem } from './types';
import { storageService } from './storageService';
import { searchTowar } from './supabaseService';
import { extractNumbersFromImage } from './geminiService';
import { audioFeedback } from './audioFeedback';
import { Sparkles, AlertCircle, Database } from 'lucide-react';

export default function App() {
  // Application Settings
  const [settings, setSettings] = useState<AppSettings>(() => storageService.getSettings());

  // Modal Dialogs
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  // Search & Scanner State
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [isScanningOCR, setIsScanningOCR] = useState(false);
  const [detectedNumbers, setDetectedNumbers] = useState<DetectedNumber[]>([]);
  const [ocrError, setOcrError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<'all' | 'catalog' | 'code' | 'name' | 'opis'>('all');
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchResults, setSearchResults] = useState<TowarItem[]>([]);
  const [searchErrorMessage, setSearchErrorMessage] = useState<string | undefined>(undefined);
  const [isDemoResult, setIsDemoResult] = useState(false);

  // History
  const [history, setHistory] = useState<SearchHistoryEntry[]>(() => storageService.getHistory());

  // Save settings handler
  const handleSaveSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    storageService.saveSettings(newSettings);
  };

  // Perform search against Supabase 'towar' table
  const executeSearch = useCallback(
    async (queryToSearch: string, source: SearchHistoryEntry['source'] = 'manual') => {
      const trimmed = queryToSearch.trim();
      if (!trimmed) return;

      setIsSearching(true);
      setSearchErrorMessage(undefined);

      try {
        const res = await searchTowar(trimmed, settings, searchType);
        setSearchResults(res.items);
        setIsDemoResult(res.isDemo);
        setHasSearched(true);

        if (res.error) {
          setSearchErrorMessage(res.error);
          audioFeedback.playError(settings.soundEnabled);
          audioFeedback.triggerHaptic('warning', settings.hapticEnabled);
        } else {
          if (res.items.length > 0) {
            audioFeedback.playSuccess(settings.soundEnabled);
            audioFeedback.triggerHaptic('success', settings.hapticEnabled);
          }
          // Save to search history
          const updatedHistory = storageService.addHistory({
            query: trimmed,
            resultsCount: res.items.length,
            source,
            firstResultName: res.items[0]?.Nazwa || res.items[0]?.nazwa || undefined,
          });
          setHistory(updatedHistory);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Błąd zapytania';
        setSearchErrorMessage(msg);
        audioFeedback.playError(settings.soundEnabled);
      } finally {
        setIsSearching(false);
      }
    },
    [settings, searchType]
  );

  // Handle Photo Capture or File Upload -> Run Gemini OCR
  const handleImageCaptured = async (base64Image: string) => {
    setImagePreviewUrl(base64Image);
    setIsCameraOpen(false);
    setIsScanningOCR(true);
    setOcrError(null);
    setDetectedNumbers([]);

    try {
      const ocrResult = await extractNumbersFromImage(base64Image, settings);

      if (ocrResult.error && ocrResult.detectedNumbers.length === 0) {
        setOcrError(ocrResult.error);
        audioFeedback.playError(settings.soundEnabled);
      } else {
        setDetectedNumbers(ocrResult.detectedNumbers);
        audioFeedback.playScanBeep(settings.soundEnabled);
        audioFeedback.triggerHaptic('success', settings.hapticEnabled);

        // If at least one number detected
        if (ocrResult.detectedNumbers.length > 0) {
          const topCandidate = ocrResult.detectedNumbers[0].text;
          setSearchQuery(topCandidate);

          if (settings.autoSearchOnSingleDetect && ocrResult.detectedNumbers.length === 1) {
            // Auto search if user configured single-detect auto search
            executeSearch(topCandidate, 'camera');
          }
        }
      }
    } catch (err: unknown) {
      console.error('OCR Extraction error:', err);
      setOcrError('Wystąpił błąd podczas analizy obrazu przez AI.');
      audioFeedback.playError(settings.soundEnabled);
    } finally {
      setIsScanningOCR(false);
    }
  };

  // Handle Direct Live Barcode Scan (Continuous 1D/2D reader)
  const handleBarcodeScanned = (barcode: string) => {
    setIsCameraOpen(false);
    setSearchQuery(barcode);
    executeSearch(barcode, 'camera');
  };

  const handleSelectDetectedNumber = (selectedNum: string, autoSearch = true) => {
    setSearchQuery(selectedNum);
    if (autoSearch) {
      executeSearch(selectedNum, 'detected_pick');
    }
  };

  const handleClearImage = () => {
    setImagePreviewUrl(null);
    setDetectedNumbers([]);
    setOcrError(null);
    audioFeedback.triggerHaptic('light', settings.hapticEnabled);
  };

  const isSupabaseConfigured = Boolean(settings.supabaseUrl && settings.supabaseAnonKey);

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#161616] flex flex-col font-sans">
      {/* Header Bar */}
      <Header
        settings={settings}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenHistory={() => setIsHistoryOpen(true)}
        onOpenHelp={() => setIsHelpOpen(true)}
        onQuickCamera={() => setIsCameraOpen(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 space-y-6 pb-20">
        {/* Banner if Supabase not configured yet */}
        {!isSupabaseConfigured && (
          <div className="rounded-2xl p-4 bg-white border border-amber-300/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-[#F36F21] shrink-0">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-zinc-900 font-['Ubuntu',sans-serif]">
                  Aktywny Tryb Demonstracyjny (Wyszukiwanie w bazie próbnej)
                </h2>
                <p className="text-xs text-zinc-600 font-['Poppins',sans-serif]">
                  Wprowadź swój <span className="font-mono text-[#F36F21] font-semibold">Supabase URL</span> i <span className="font-mono text-[#F36F21] font-semibold">Anon Key</span> w Ustawieniach, aby przeszukiwać własną tabelę <strong>towar</strong>.
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="px-4 py-2 bg-[#F36F21] hover:bg-[#ff7e33] text-white text-xs font-bold font-['Ubuntu',sans-serif] rounded-xl shrink-0 transition-colors shadow-sm cursor-pointer"
            >
              Skonfiguruj Supabase
            </button>
          </div>
        )}

        {/* Section 1: Image & Camera OCR Zone */}
        <ImageUploadZone
          onImageSelected={handleImageCaptured}
          onOpenLiveCamera={() => setIsCameraOpen(true)}
          soundEnabled={settings.soundEnabled}
          hapticEnabled={settings.hapticEnabled}
        />

        {/* OCR Scanning Loading Indicator */}
        {isScanningOCR && (
          <div className="bg-white border border-[#F36F21]/40 rounded-2xl p-6 text-center flex flex-col items-center justify-center gap-3 shadow-xs animate-pulse">
            <div className="w-12 h-12 rounded-xl bg-[#F36F21]/10 border border-[#F36F21]/30 flex items-center justify-center text-[#F36F21]">
              <Sparkles className="w-6 h-6 animate-spin" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-900 mb-0.5 font-['Ubuntu',sans-serif]">Analiza obrazu przez AI OCR...</h3>
              <p className="text-xs text-zinc-500 font-['Poppins',sans-serif]">Odczytywanie numerów katalogowych, kodów OEM i kodów kreskowych</p>
            </div>
          </div>
        )}

        {/* OCR Error Notice */}
        {ocrError && !isScanningOCR && (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-center justify-between gap-3 text-xs text-rose-800">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-[#CC0000] shrink-0" />
              <span className="font-['Poppins',sans-serif]">{ocrError}</span>
            </div>
            <button
              onClick={() => setIsCameraOpen(true)}
              className="px-3 py-1 bg-rose-100 hover:bg-rose-200 border border-rose-300 text-rose-900 font-semibold rounded-lg shrink-0 transition-colors cursor-pointer"
            >
              Spróbuj ponownie
            </button>
          </div>
        )}

        {/* Section 2: Detected Numbers Picker (If Photo Was Scanned) */}
        <DetectedNumbersPicker
          detectedNumbers={detectedNumbers}
          selectedNumber={searchQuery}
          onSelectNumber={handleSelectDetectedNumber}
          imagePreviewUrl={imagePreviewUrl}
          onClearImage={handleClearImage}
          onRescan={() => setIsCameraOpen(true)}
          isSearching={isSearching}
          soundEnabled={settings.soundEnabled}
          hapticEnabled={settings.hapticEnabled}
        />

        {/* Section 3: Manual Search Input & Filter Options */}
        <SearchInputSection
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onSearch={() => executeSearch(searchQuery, 'manual')}
          isSearching={isSearching}
          searchType={searchType}
          setSearchType={setSearchType}
          soundEnabled={settings.soundEnabled}
          hapticEnabled={settings.hapticEnabled}
        />

        {/* Section 4: Search Results in "towar" Table */}
        <SearchResults
          results={searchResults}
          isSearching={isSearching}
          searchQuery={searchQuery}
          hasSearched={hasSearched}
          isDemo={isDemoResult}
          errorMessage={searchErrorMessage}
          onOpenSettings={() => setIsSettingsOpen(true)}
          soundEnabled={settings.soundEnabled}
          hapticEnabled={settings.hapticEnabled}
        />
      </main>

      {/* Camera Viewfinder Modal */}
      <CameraScannerModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onCapture={handleImageCaptured}
        onBarcodeDetected={handleBarcodeScanned}
        soundEnabled={settings.soundEnabled}
        hapticEnabled={settings.hapticEnabled}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSaveSettings={handleSaveSettings}
      />

      {/* Search History Drawer */}
      <HistoryDrawer
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        history={history}
        onSelectHistory={query => {
          setSearchQuery(query);
          executeSearch(query, 'manual');
        }}
        onClearHistory={() => {
          storageService.clearHistory();
          setHistory([]);
        }}
        soundEnabled={settings.soundEnabled}
        hapticEnabled={settings.hapticEnabled}
      />

      {/* Help & Workflow Guide Modal */}
      <HelpManualModal
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />
    </div>
  );
}
