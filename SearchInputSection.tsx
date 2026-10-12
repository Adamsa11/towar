import React, { useRef, useState, useEffect } from 'react';
import { Search, X, Clipboard, Filter, Mic, Square, Loader2, AlertCircle, Volume2, Check } from 'lucide-react';
import { audioFeedback } from './audioFeedback';
import {
  LiveSpeechRecognizer,
  AudioTranscriptionController,
  transcribeAudioBlob,
  isLiveSpeechSupported,
  normalizeSpokenPartNumber,
} from './transcribeService';

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

  // Live Speech & Transcription state
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [transcriptionError, setTranscriptionError] = useState<string | null>(null);
  const [lastTranscribed, setLastTranscribed] = useState<string | null>(null);
  const [liveVolume, setLiveVolume] = useState<number>(0);
  const [hasLiveEngine, setHasLiveEngine] = useState<boolean>(true);
  const [liveTextCount, setLiveTextCount] = useState<number>(0);

  const liveRecognizerRef = useRef<LiveSpeechRecognizer | null>(null);
  const audioControllerRef = useRef<AudioTranscriptionController | null>(null);
  const timerRef = useRef<number | null>(null);
  const lastRecordedBlobRef = useRef<Blob | null>(null);

  // Check live engine support on mount
  useEffect(() => {
    setHasLiveEngine(isLiveSpeechSupported());
  }, []);

  // Timer while recording
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
      setLiveVolume(0);
    }
    return () => {
      if (timerRef.current !== null) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isRecording]);

  // Clean up all audio tracks and recognizers on unmount
  useEffect(() => {
    return () => {
      if (liveRecognizerRef.current) {
        liveRecognizerRef.current.cancel();
      }
      if (audioControllerRef.current) {
        audioControllerRef.current.cancelRecording();
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

  // START RECORDING & LIVE STREAMING INTO INPUT
  const handleStartRecording = async () => {
    setTranscriptionError(null);
    setLastTranscribed(null);
    setLiveTextCount(0);
    lastRecordedBlobRef.current = null;

    // Provide haptic feedback and beep
    audioFeedback.playScanBeep(soundEnabled);
    audioFeedback.triggerHaptic('medium', hapticEnabled);

    // Initialize controller for audio recording in parallel (for fallback or Gemini refinement)
    if (!audioControllerRef.current) {
      audioControllerRef.current = new AudioTranscriptionController();
    }
    try {
      if (audioControllerRef.current.isSupported()) {
        await audioControllerRef.current.startRecording();
      }
    } catch (recErr) {
      console.warn('Audio controller start recording warning:', recErr);
    }

    // Try Live Web Speech Recognition for real-time online typing
    if (isLiveSpeechSupported()) {
      if (!liveRecognizerRef.current) {
        liveRecognizerRef.current = new LiveSpeechRecognizer();
      }

      try {
        await liveRecognizerRef.current.start({
          lang: 'pl-PL',
          initialText: searchQuery, // If user wants to append or edit
          onLiveText: (text: string) => {
            // ONLINE TRANSCRIPTION: What the user says is written directly into the field!
            // Automatically normalizes numbers ("zero" -> "0", etc.)
            if (text !== undefined) {
              const formattedText = normalizeSpokenPartNumber(text);
              setSearchQuery(formattedText);
              setLiveTextCount((prev) => prev + 1);
              // Ensure input is focused and scrolled to end
              if (inputRef.current) {
                inputRef.current.scrollLeft = inputRef.current.scrollWidth;
              }
            }
          },
          onVolumeChange: (vol: number) => {
            setLiveVolume(vol);
          },
          onError: (err: string) => {
            console.warn('Live speech recognition warning:', err);
            // Non-blocking error handling
          },
          onEnd: () => {
            // Called if speech engine ends
          },
        });

        setIsRecording(true);
        inputRef.current?.focus();
        return;
      } catch (err: unknown) {
        console.warn('Live Speech API could not start, falling back to MediaRecorder:', err);
      }
    }

    // Fallback: If live recognition is unsupported or failed, rely on audioController
    if (audioControllerRef.current?.isRecording) {
      setIsRecording(true);
    } else {
      setTranscriptionError('Nie udało się uzyskać dostępu do mikrofonu. Sprawdź uprawnienia w przeglądarce.');
      audioFeedback.playError(soundEnabled);
      setIsRecording(false);
    }
  };

  // STOP RECORDING
  const handleStopRecording = async (options?: { refineWithGemini?: boolean }) => {
    if (!isRecording) return;

    audioFeedback.triggerHaptic('light', hapticEnabled);
    setIsRecording(false);

    // Stop live recognizer
    if (liveRecognizerRef.current) {
      liveRecognizerRef.current.stop();
    }

    // Stop audio controller and get recorded blob
    let recordedBlob: Blob | null = null;
    if (audioControllerRef.current && audioControllerRef.current.isRecording) {
      try {
        recordedBlob = await audioControllerRef.current.stopRecording();
        lastRecordedBlobRef.current = recordedBlob;
      } catch (err) {
        console.warn('Stop audio recording error:', err);
      }
    }

    // If user explicitly requested Gemini AI refinement OR if live engine wasn't supported
    const shouldRunGemini = Boolean(options?.refineWithGemini) || (!hasLiveEngine && recordedBlob);

    if (shouldRunGemini && recordedBlob) {
      setIsTranscribing(true);
      try {
        const result = await transcribeAudioBlob(recordedBlob);
        if (result.error) {
          setTranscriptionError(result.error);
          audioFeedback.playError(soundEnabled);
        } else if (result.text) {
          const cleanText = result.text.trim();
          setSearchQuery(cleanText);
          setLastTranscribed(cleanText);
          audioFeedback.playSuccess(soundEnabled);
          audioFeedback.triggerHaptic('success', hapticEnabled);
          inputRef.current?.focus();
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Błąd transkrypcji Gemini.';
        setTranscriptionError(msg);
      } finally {
        setIsTranscribing(false);
      }
    } else {
      // Live text was already typed into the input field!
      if (searchQuery.trim()) {
        const normalized = normalizeSpokenPartNumber(searchQuery.trim());
        setSearchQuery(normalized);
        setLastTranscribed(normalized);
        audioFeedback.playSuccess(soundEnabled);
        audioFeedback.triggerHaptic('success', hapticEnabled);
      }
      inputRef.current?.focus();
    }
  };

  // CANCEL RECORDING
  const handleCancelRecording = () => {
    if (liveRecognizerRef.current) {
      liveRecognizerRef.current.cancel();
    }
    if (audioControllerRef.current) {
      audioControllerRef.current.cancelRecording();
    }
    setIsRecording(false);
    audioFeedback.triggerHaptic('light', hapticEnabled);
  };

  // Format seconds to mm:ss
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
        {/* Text Input with icons and live online speech recognition border */}
        <div className="relative flex-1">
          {/* Left Icon: pulsating mic when recording, search icon otherwise */}
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            {isRecording ? (
              <span className="relative flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-rose-600 items-center justify-center">
                  <Mic className="w-2.5 h-2.5 text-white" />
                </span>
              </span>
            ) : (
              <Search className="w-5 h-5 text-zinc-400" />
            )}
          </div>

          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isRecording
                ? '🔴 Mów teraz... tekst wpisuje się na żywo w tym polu!'
                : 'Wpisz lub podyktuj numer części (np. HE221-00311X), kod...'
            }
            className={`w-full pl-11 pr-24 py-3.5 bg-zinc-50/70 focus:bg-white border rounded-xl text-zinc-900 font-mono text-base placeholder:text-zinc-400 placeholder:font-sans outline-none transition-all ${
              isRecording
                ? 'border-emerald-500 bg-emerald-50/20 ring-2 ring-emerald-500/30'
                : 'border-zinc-300 focus:border-[#F36F21] focus:ring-2 focus:ring-[#F36F21]/20'
            }`}
          />

          {/* Right side controls inside input */}
          <div className="absolute inset-y-0 right-0 pr-2 flex items-center gap-1">
            {/* Live Volume visualizer dot inside input when speaking */}
            {isRecording && (
              <div
                className="flex items-center gap-0.5 px-2 py-1 bg-emerald-100/90 text-emerald-800 rounded-lg text-[11px] font-semibold tracking-wider font-mono mr-1"
                title="Poziom dźwięku z mikrofonu"
              >
                <div
                  className="w-1.5 h-3 bg-emerald-600 rounded-full transition-all duration-75"
                  style={{ height: `${Math.max(6, Math.min(18, 6 + (liveVolume / 100) * 12))}px` }}
                />
                <div
                  className="w-1.5 h-4 bg-emerald-600 rounded-full transition-all duration-75"
                  style={{ height: `${Math.max(8, Math.min(20, 8 + (liveVolume / 100) * 14))}px` }}
                />
                <div
                  className="w-1.5 h-3 bg-emerald-600 rounded-full transition-all duration-75"
                  style={{ height: `${Math.max(6, Math.min(18, 6 + (liveVolume / 100) * 12))}px` }}
                />
                <span className="ml-1 text-[10px] uppercase font-bold text-emerald-700">LIVE</span>
              </div>
            )}

            {searchQuery ? (
              <button
                type="button"
                onClick={handleClear}
                className="p-1.5 text-zinc-400 hover:text-zinc-700 rounded-lg hover:bg-zinc-200 transition-colors cursor-pointer"
                title="Wyczyść pole"
              >
                <X className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
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
            onClick={isRecording ? () => handleStopRecording() : handleStartRecording}
            disabled={isTranscribing || isSearching}
            title={
              isRecording
                ? 'Kliknij, aby zatwierdzić podyktowany tekst'
                : 'Dyktuj online na żywo – to co powiesz, wpisze się od razu w polu numeru części'
            }
            className={`py-3.5 px-4.5 rounded-xl font-bold font-['Ubuntu',sans-serif] text-base flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shrink-0 ${
              isRecording
                ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/30 ring-2 ring-rose-400 animate-pulse'
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
            type="button"
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

      {/* Active Recording Live Indicator Banner with Real-Time feedback */}
      {isRecording && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in shadow-xs">
          <div className="flex items-center gap-3">
            <span className="relative flex h-3.5 w-3.5 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-600"></span>
            </span>
            <div className="space-y-0.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-emerald-950 font-['Ubuntu',sans-serif]">
                  Transkrypcja na żywo ({formatTimer(recordingSeconds)})
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-emerald-200 text-emerald-900 rounded-full flex items-center gap-1">
                  <Volume2 className="w-3 h-3" />
                  Mów teraz – tekst wpisuje się online
                </span>
              </div>
              <p className="text-xs text-emerald-800 font-['Poppins',sans-serif]">
                Dyktuj wyraźnie numer części lub nazwę (np. <em>HE221-00311X</em>, <em>filtr oleju</em>).
                {liveTextCount > 0 && (
                  <span className="ml-1 text-emerald-900 font-semibold">
                    ✓ Tekst wpisuje się na bieżąco w powyższym polu.
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0 flex-wrap">
            <button
              type="button"
              onClick={handleCancelRecording}
              className="text-xs px-3 py-1.5 rounded-lg text-zinc-600 hover:text-zinc-900 hover:bg-emerald-100/70 font-medium cursor-pointer transition-colors"
            >
              Anuluj
            </button>
            <button
              type="button"
              onClick={() => handleStopRecording()}
              className="text-xs px-3.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold cursor-pointer transition-colors shadow-xs flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              Zakończ dyktowanie
            </button>
            {/* Quick search right after or while dictating */}
            {searchQuery.trim() && (
              <button
                type="button"
                onClick={() => {
                  handleStopRecording();
                  onSearch();
                }}
                className="text-xs px-3 py-1.5 rounded-lg bg-[#F36F21] hover:bg-[#ff7e33] text-white font-bold cursor-pointer transition-colors shadow-xs flex items-center gap-1"
              >
                <Search className="w-3.5 h-3.5" />
                Zatwierdź i szukaj
              </button>
            )}
          </div>
        </div>
      )}

      {/* Transcribing Progress Banner (Gemini model) */}
      {isTranscribing && (
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 flex items-center gap-3 text-xs text-amber-900 shadow-xs">
          <Loader2 className="w-4 h-4 animate-spin text-amber-600 shrink-0" />
          <span className="font-['Poppins',sans-serif]">
            Przetwarzanie audio przez <strong>Gemini 3.5 Transcribe</strong>... Rozpoznawanie numeru części...
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
            type="button"
            onClick={() => setTranscriptionError(null)}
            className="p-1 hover:bg-rose-100 rounded text-rose-600 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
