import React, { useRef, useState, useEffect } from 'react';
import { Search, X, Clipboard, Filter, Mic, Square, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { audioFeedback } from './audioFeedback';
import { AudioTranscriptionController, transcribeAudioBlob } from './transcribeService';

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

  // Audio transcription state
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [transcriptionError, setTranscriptionError] = useState<string | null>(null);
  const [lastTranscribed, setLastTranscribed] = useState<string | null>(null);

  const controllerRef = useRef<AudioTranscriptionController | null>(null);
  const timerRef = useRef<number | null>(null);

  // Initialize or get controller
  const getController = () => {
    if (!controllerRef.current) {
      controllerRef.current = new AudioTranscriptionController();
    }
    return controllerRef.current;
  };

  // Recording timer effect
  useEffect(() => {
    if (isRecording) {
      setRecordingSeconds(0);
      timerRef.current = window.setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current !== null) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current !== null) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isRecording]);

  // Clean up recording tracks on unmount
  useEffect(() => {
    return () => {
      if (controllerRef.current) {
        controllerRef.current.cancelRecording();
      }
    };
  }, []);

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
    setTranscriptionError(null);
    setLastTranscribed(null);
    inputRef.current?.focus();
    audioFeedback.triggerHaptic('light', hapticEnabled);
  };

  // Start speech recording
  const handleStartRecording = async () => {
    setTranscriptionError(null);
    setLastTranscribed(null);

    const controller = getController();
    try {
      await controller.startRecording();
      setIsRecording(true);
      audioFeedback.playScanBeep(soundEnabled);
      audioFeedback.triggerHaptic('medium', hapticEnabled);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Nie udało się włączyć mikrofonu.';
      setTranscriptionError(msg);
      audioFeedback.playError(soundEnabled);
      audioFeedback.triggerHaptic('warning', hapticEnabled);
    }
  };

  // Stop recording and send audio to Gemini 3.5 Transcribe
  const handleStopAndTranscribe = async () => {
    if (!isRecording) return;

    const controller = getController();
    setIsRecording(false);
    setIsTranscribing(true);
    setTranscriptionError(null);
    audioFeedback.triggerHaptic('light', hapticEnabled);

    try {
      const audioBlob = await controller.stopRecording();
      const result = await transcribeAudioBlob(audioBlob);

      if (result.error) {
        setTranscriptionError(result.error);
        audioFeedback.playError(soundEnabled);
        audioFeedback.triggerHaptic('warning', hapticEnabled);
      } else if (result.text) {
        const text = result.text.trim();
        setSearchQuery(text);
        setLastTranscribed(text);
        audioFeedback.playSuccess(soundEnabled);
        audioFeedback.triggerHaptic('success', hapticEnabled);
        inputRef.current?.focus();
      } else {
        setTranscriptionError('Nie wykryto wyraźnej mowy na nagraniu. Spróbuj powiedzieć numer głośniej.');
        audioFeedback.playError(soundEnabled);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Błąd podczas transkrypcji mowy.';
      setTranscriptionError(msg);
      audioFeedback.playError(soundEnabled);
    } finally {
      setIsTranscribing(false);
    }
  };

  // Cancel recording without transcribing
  const handleCancelRecording = () => {
    const controller = getController();
    controller.cancelRecording();
    setIsRecording(false);
    audioFeedback.triggerHaptic('light', hapticEnabled);
  };

  const formatTimer = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="bg-white border border-zinc-200/90 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
      {/* Search Type Filter Chips Header ("Szukaj w:") */}
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

      {/* Main Input Row + Voice Transcription & Search Buttons */}
      <div className="flex flex-col sm:flex-row gap-2.5">
        {/* Text Input with icons */}
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
            <Search className="w-5 h-5" />
          </div>

          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Wpisz lub podyktuj numer części (np. HE221-00311X), kod..."
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

        {/* Action Buttons: Microphone (Transcribe Audio) & Primary Search ("Szukaj w bazie") */}
        <div className="flex items-center gap-2">
          {/* Voice Microphone Transcription Button */}
          <button
            type="button"
            onClick={isRecording ? handleStopAndTranscribe : handleStartRecording}
            disabled={isTranscribing || isSearching}
            title={
              isRecording
                ? 'Kliknij, aby zakończyć nagrywanie i dokonać transkrypcji mowy (Gemini AI)'
                : 'Dyktuj głosem numer lub nazwę części (Transkrypcja AI gemini-3.5-transcribe)'
            }
            className={`py-3.5 px-4.5 rounded-xl font-bold font-['Ubuntu',sans-serif] text-base flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shrink-0 ${
              isRecording
                ? 'bg-rose-600 hover:bg-rose-700 text-white animate-pulse shadow-rose-600/30 ring-2 ring-rose-400'
                : isTranscribing
                ? 'bg-amber-600 text-white cursor-wait shadow-amber-600/20'
                : 'bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white shadow-emerald-600/25'
            }`}
          >
            {isRecording ? (
              <>
                <Square className="w-4 h-4 fill-white" />
                <span className="tabular-nums">Stop ({formatTimer(recordingSeconds)})</span>
              </>
            ) : isTranscribing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Transkrypcja...</span>
              </>
            ) : (
              <>
                <Mic className="w-5 h-5" />
                <span>Głos</span>
              </>
            )}
          </button>

          {/* Primary Search Button in Saw-Trak Orange */}
          <button
            onClick={onSearch}
            disabled={isSearching || !searchQuery.trim()}
            className={`flex-1 sm:flex-none py-3.5 px-6 rounded-xl font-bold font-['Ubuntu',sans-serif] text-base flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md ${
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

      {/* Active Recording Live Indicator Banner */}
      {isRecording && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in shadow-xs">
          <div className="flex items-center gap-3">
            <span className="relative flex h-3 w-3 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-600"></span>
            </span>
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-rose-900 font-['Ubuntu',sans-serif]">
                  Nagrywanie mowy ({formatTimer(recordingSeconds)})
                </span>
                <span className="text-[10px] uppercase font-semibold tracking-wider px-1.5 py-0.5 bg-rose-200/80 text-rose-800 rounded">
                  Gemini 3.5 Transcribe
                </span>
              </div>
              <p className="text-xs text-rose-700 font-['Poppins',sans-serif]">
                Mów wyraźnie numer części lub nazwę (np. <em>HE221-00311X</em> lub <em>filtr oleju</em>).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            <button
              type="button"
              onClick={handleCancelRecording}
              className="text-xs px-3 py-1.5 rounded-lg text-rose-700 hover:bg-rose-100 font-medium cursor-pointer transition-colors"
            >
              Anuluj
            </button>
            <button
              type="button"
              onClick={handleStopAndTranscribe}
              className="text-xs px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold cursor-pointer transition-colors shadow-xs"
            >
              Zakończ i transkrybuj
            </button>
          </div>
        </div>
      )}

      {/* Transcribing Progress Banner */}
      {isTranscribing && (
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 flex items-center gap-3 text-xs text-amber-900 shadow-xs">
          <Loader2 className="w-4 h-4 animate-spin text-amber-600 shrink-0" />
          <span className="font-['Poppins',sans-serif]">
            Transkrypcja mowy na tekst przez <strong>Gemini 3.5 Transcribe</strong>... Rozpoznawanie numeru części...
          </span>
        </div>
      )}

      {/* Transcription Error Banner */}
      {transcriptionError && !isRecording && !isTranscribing && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-between gap-2 text-xs text-rose-800 shadow-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{transcriptionError}</span>
          </div>
          <button
            onClick={() => setTranscriptionError(null)}
            className="p-1 hover:bg-rose-100 rounded text-rose-600 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Last Transcribed Success Toast */}
      {lastTranscribed && !isRecording && !isTranscribing && (
        <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-between gap-2 text-xs text-emerald-900 shadow-xs">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>
              Rozpoznano z mowy: <strong>&bdquo;{lastTranscribed}&rdquo;</strong>
            </span>
          </div>
          <button
            onClick={onSearch}
            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] rounded-lg cursor-pointer transition-colors shadow-2xs"
          >
            Szukaj w bazie
          </button>
        </div>
      )}
    </div>
  );
};
