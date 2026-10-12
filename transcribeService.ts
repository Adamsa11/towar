/**
 * Speech-to-Text & Live Voice Transcription Service
 * - Live Web Speech Recognition (online real-time streaming into input field)
 * - Server-side Gemini 3.5 Transcribe (/api/transcribe) running 'gemini-3.5-transcribe'
 * - Real-time Audio Visualizer volume stream
 * - Spoken Polish number-to-digit normalizer ("zero" -> "0", "jeden" -> "1", etc.)
 */

export interface TranscribeResponse {
  text: string;
  error?: string;
  model?: string;
}

export interface LiveSpeechOptions {
  onLiveText: (text: string, isFinal: boolean) => void;
  onVolumeChange?: (volume: number) => void;
  onError?: (error: string) => void;
  onEnd?: () => void;
  initialText?: string;
  lang?: string;
}

/**
 * Polish spoken numbers to Arabic digits dictionary
 */
export const POLISH_WORD_TO_DIGIT: Record<string, string> = {
  zero: '0',
  zer: '0',
  zera: '0',
  zerem: '0',
  zerze: '0',
  jeden: '1',
  jedynka: '1',
  jedynki: '1',
  jedno: '1',
  jedna: '1',
  dwa: '2',
  dwójka: '2',
  dwojka: '2',
  dwie: '2',
  dwójki: '2',
  dwojki: '2',
  trzy: '3',
  trójka: '3',
  trojka: '3',
  trójki: '3',
  trojki: '3',
  cztery: '4',
  czwórka: '4',
  czworka: '4',
  czwórki: '4',
  czworki: '4',
  pięć: '5',
  piec: '5',
  piątka: '5',
  piatka: '5',
  piątki: '5',
  piatki: '5',
  sześć: '6',
  szesc: '6',
  szóstka: '6',
  szostka: '6',
  szóstki: '6',
  szostki: '6',
  siedem: '7',
  siódemka: '7',
  siodemka: '7',
  siódemki: '7',
  siodemki: '7',
  osiem: '8',
  ósemka: '8',
  osemka: '8',
  ósemki: '8',
  osemki: '8',
  dziewięć: '9',
  dziewiec: '9',
  dziewiątka: '9',
  dziewiatka: '9',
  dziewiątki: '9',
  dziewiatki: '9',
  dziesięć: '10',
  dziesiec: '10',
  jedenaście: '11',
  jedenascie: '11',
  dwanaście: '12',
  dwanascie: '12',
  trzynaście: '13',
  trzynascie: '13',
  czternaście: '14',
  czternascie: '14',
  piętnaście: '15',
  pietnascie: '15',
  szesnaście: '16',
  szesnascie: '16',
  siedemnaście: '17',
  siedemnascie: '17',
  osiemnaście: '18',
  osiemnascie: '18',
  dziewiętnaście: '19',
  dziewietnascie: '19',
  dwadzieścia: '20',
  dwadziescia: '20',
  trzydzieści: '30',
  trzydziesci: '30',
  czterdzieści: '40',
  czterdziesci: '40',
  pięćdziesiąt: '50',
  piecdziesiat: '50',
  sześćdziesiąt: '60',
  szescdziesiat: '60',
  siedemdziesiąt: '70',
  siedemdziesiat: '70',
  osiemdziesiąt: '80',
  osiemdziesiat: '80',
  dziewięćdziesiąt: '90',
  dziewiecdziesiat: '90',
  sto: '100',
};

/**
 * Spoken punctuation and symbols in part codes
 */
export const SPOKEN_SYMBOLS: Record<string, string> = {
  spacja: ' ',
  odstęp: ' ',
  odstep: ' ',
  myślnik: '-',
  myslnik: '-',
  kreska: '-',
  minus: '-',
  pauza: '-',
  ukośnik: '/',
  ukosnik: '/',
  slash: '/',
  kropka: '.',
  podkreślenie: '_',
  podkreslenie: '_',
  podkreślnik: '_',
  podkreslnik: '_',
};

/**
 * Spoken isolated letters in part numbers (e.g. "ha" -> H, "iks" -> X)
 */
export const SPOKEN_LETTERS: Record<string, string> = {
  iks: 'X',
  igrek: 'Y',
  jot: 'J',
  ha: 'H',
  wu: 'W',
  zet: 'Z',
  ce: 'C',
  ka: 'K',
  el: 'L',
  em: 'M',
  en: 'N',
  pe: 'P',
  te: 'T',
  fał: 'V',
  fau: 'V',
};

/**
 * Combines two speech transcript segments intelligently without unwanted spaces
 * during brief speech pauses (e.g. "he" + "221" -> "he221", "123" + "456" -> "123456").
 */
export function combineSpeechSegments(prev: string, next: string): string {
  if (!prev) return next;
  if (!next) return prev;

  const prevClean = prev.trim();
  const nextClean = next.trim();
  if (!prevClean) return nextClean;
  if (!nextClean) return prevClean;

  // If user explicitly spoke "spacja" or there's an explicit trailing/leading space, preserve it
  if (/\s$/.test(prev) || /^\s/.test(next)) {
    return `${prevClean} ${nextClean}`;
  }

  // If connected by separator characters (-, _, /), connect directly without space
  if (/[-_\/]$/.test(prevClean) || /^[-_\/]/.test(nextClean)) {
    return `${prevClean}${nextClean}`;
  }

  // Letter + Digit (e.g. "he" + "221" -> "he221"): connect directly without space
  if (/[a-zA-Z]$/.test(prevClean) && /^\d/.test(nextClean)) {
    return `${prevClean}${nextClean}`;
  }

  // Digit + Letter (e.g. "221" + "x" -> "221x", "311" + "X" -> "311X"): connect directly
  if (/\d$/.test(prevClean) && /^[a-zA-Z]/.test(nextClean)) {
    return `${prevClean}${nextClean}`;
  }

  // Digit + Digit (e.g. "0" + "221" -> "0221", "123" + "456" -> "123456"): connect directly
  if (/\d$/.test(prevClean) && /^\d/.test(nextClean)) {
    return `${prevClean}${nextClean}`;
  }

  // Short letter code (1-3 letters like "h", "he") + Letter: connect directly (e.g. "h" + "e" -> "he")
  if (/\b[a-zA-Z]{1,3}$/.test(prevClean) && /^[a-zA-Z]/.test(nextClean)) {
    return `${prevClean}${nextClean}`;
  }

  // Both sides look like normal dictionary words (length >= 4 and purely alphabetical): keep normal word space
  return `${prevClean} ${nextClean}`;
}

/**
 * Normalizes spoken Polish numbers, symbols, and part codes into proper digits and notation.
 * e.g.:
 * "zero" -> "0"
 * "he, 221" -> "HE221" (no commas, no spaces between code letters and digits)
 * "zero zero trzy jeden jeden" -> "00311"
 * "HE dwa dwa jeden myślnik zero zero trzy jeden jeden iks" -> "HE221-00311X"
 * "filtr oleju" -> "filtr oleju"
 */
export function normalizeSpokenPartNumber(input: string): string {
  if (!input) return '';
  let result = input;

  // 0. Remove speech engine pause commas and semicolons
  // Web Speech API in Polish inserts commas on speech pauses (e.g. "he, 221", "123, 456", "filtr, oleju").
  // Strip commas between alphanumeric characters completely so codes stay joined without commas:
  result = result.replace(/([a-zA-Z0-9])\s*,\s*([a-zA-Z0-9])/g, '$1 $2');
  // Any leftover commas or semicolons are replaced by a space or removed
  result = result.replace(/[,;]/g, ' ');

  // 1. Replace spoken symbols (spacja, myślnik, kreska, slash, etc.)
  for (const [spoken, symbol] of Object.entries(SPOKEN_SYMBOLS)) {
    const regex = new RegExp(`(^|\\s|[.,;])${spoken}(\\s|[.,;]|$)`, 'gi');
    result = result.replace(regex, `$1${symbol}$2`);
  }

  // 2. Replace spoken digits & numbers ("zero" -> "0", "jeden" -> "1", etc.)
  // Run twice to catch adjacent spoken numbers (e.g. "zero zero" -> "0 0")
  for (let pass = 0; pass < 2; pass++) {
    for (const [spoken, digit] of Object.entries(POLISH_WORD_TO_DIGIT)) {
      const regex = new RegExp(`(^|\\s|[.,;])${spoken}(\\s|[.,;]|$)`, 'gi');
      result = result.replace(regex, `$1${digit}$2`);
    }
  }

  // 3. Replace spoken letters when isolated (iks -> X, ha -> H, etc.)
  for (const [spoken, letter] of Object.entries(SPOKEN_LETTERS)) {
    const regex = new RegExp(`(^|\\s|[.,;])${spoken}(\\s|[.,;]|$)`, 'gi');
    result = result.replace(regex, `$1${letter}$2`);
  }

  // 4. Connect isolated single letters (e.g. "h e" -> "he")
  result = result.replace(/(?<=\b[a-zA-Z])\s+(?=[a-zA-Z]\b)/g, '');

  // 5. Connect letter codes with adjacent numbers (case-insensitive):
  // e.g. "he 221" -> "he221", "HE 221" -> "HE221", "c 330" -> "c330"
  result = result.replace(/(?<=[a-zA-Z]{1,6})\s+(?=\d)/gi, '');
  // e.g. "311 X" -> "311X", "221 he" -> "221he", "221 x" -> "221x"
  result = result.replace(/(?<=\d)\s+(?=[a-zA-Z]{1,4}\b)/gi, '');

  // 6. Compact consecutive digits into a continuous number:
  // e.g. "0 0 3 1 1" -> "00311", "123 456" -> "123456", "2 2 1" -> "221", "0 221" -> "0221"
  result = result.replace(/(?<=\d)\s+(?=\d)/g, '');

  // 7. Remove unwanted spaces around code separators (-, /, _, .)
  result = result.replace(/\s*([-_/])\s*/g, '$1');

  // 8. Capitalize alphanumeric part codes (e.g. "he221" -> "HE221", "311x" -> "311X", "he221x" -> "HE221X")
  result = result.replace(/\b([a-zA-Z0-9]*[a-zA-Z]+\d+[a-zA-Z0-9]*|[a-zA-Z0-9]*\d+[a-zA-Z]+[a-zA-Z0-9]*)\b/gi, (match) => match.toUpperCase());

  // 9. Strip any trailing or leading periods, commas, colons, or speech recognition end marks
  result = result.replace(/[\.\,\;\:\!\?]+$/g, '');
  result = result.replace(/^[\.\,\;\:\!\?]+/g, '');

  return result.trim();
}

/**
 * Checks whether the browser supports native real-time Web Speech recognition
 */
export function isLiveSpeechSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean(
    (window as any).SpeechRecognition ||
    (window as any).webkitSpeechRecognition
  );
}

/**
 * Live speech recognizer for real-time online dictation
 */
export class LiveSpeechRecognizer {
  private recognition: any = null;
  private isListening = false;
  private shouldKeepListening = false;
  private mediaStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private animationFrameId: number | null = null;
  private accumulatedFinalText = '';
  private currentInterimText = '';

  public isSupported(): boolean {
    return isLiveSpeechSupported();
  }

  public get listening(): boolean {
    return this.isListening;
  }

  public async start(options: LiveSpeechOptions): Promise<void> {
    if (this.isListening) {
      this.stop();
    }

    const SpeechRec =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRec) {
      throw new Error('Przeglądarka nie obsługuje funkcji Live Speech Recognition.');
    }

    this.accumulatedFinalText = options.initialText ? options.initialText.trim() : '';
    this.currentInterimText = '';
    this.shouldKeepListening = true;

    // Set up AudioContext for real-time visualizer volume if microphone is available
    try {
      if (navigator?.mediaDevices?.getUserMedia) {
        this.mediaStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });

        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          this.audioContext = new AudioCtx();
          if (this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
          }
          this.analyser = this.audioContext.createAnalyser();
          this.analyser.fftSize = 64;
          const source = this.audioContext.createMediaStreamSource(this.mediaStream);
          source.connect(this.analyser);

          const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
          const updateVolume = () => {
            if (!this.analyser || !this.isListening) return;
            this.analyser.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
              sum += dataArray[i];
            }
            const average = sum / dataArray.length;
            const volumePercent = Math.min(100, Math.round((average / 128) * 100));
            options.onVolumeChange?.(volumePercent);
            this.animationFrameId = requestAnimationFrame(updateVolume);
          };
          this.animationFrameId = requestAnimationFrame(updateVolume);
        }
      }
    } catch {
      // AudioContext / visualizer is optional; recognition can still proceed
    }

    try {
      this.recognition = new SpeechRec();
      this.recognition.lang = options.lang || 'pl-PL';
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.maxAlternatives = 1;

      this.recognition.onstart = () => {
        this.isListening = true;
      };

      this.recognition.onresult = (event: any) => {
        let interim = '';
        let finalChunk = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const item = event.results[i];
          const transcript = item[0]?.transcript || '';
          if (item.isFinal) {
            finalChunk += transcript;
          } else {
            interim += transcript;
          }
        }

        if (finalChunk) {
          // Clean speech engine punctuation (commas, periods) from Web Speech Recognition chunks
          const chunkClean = finalChunk.trim().replace(/^[\.\,\;\:\!\?]+|[\.\,\;\:\!\?]+$/g, '');
          if (this.accumulatedFinalText) {
            this.accumulatedFinalText = combineSpeechSegments(this.accumulatedFinalText, chunkClean);
          } else {
            this.accumulatedFinalText = chunkClean;
          }
        }

        this.currentInterimText = interim.trim().replace(/^[\.\,\;\:\!\?]+|[\.\,\;\:\!\?]+$/g, '');

        // Build combined live text without unwanted spaces during speech pauses (e.g. "he" + "221" -> "he221")
        const rawLiveText = combineSpeechSegments(this.accumulatedFinalText, this.currentInterimText);

        // Convert spoken numbers like "zero" -> "0" and catalog codes immediately in real-time
        const normalizedLiveText = normalizeSpokenPartNumber(rawLiveText);

        options.onLiveText(normalizedLiveText, Boolean(finalChunk && !interim));
      };

      this.recognition.onerror = (event: any) => {
        // 'no-speech' is non-fatal: user just paused speaking
        if (event.error === 'no-speech') {
          return;
        }
        if (event.error === 'not-allowed') {
          options.onError?.('Brak uprawnień do mikrofonu. Kliknij ikonę kłódki przy adresie strony i zezwól na mikrofon.');
          this.stop();
          return;
        }
        if (event.error === 'aborted') {
          return;
        }
        options.onError?.(`Błąd rozpoznawania mowy: ${event.error || 'Nieznany'}`);
      };

      this.recognition.onend = () => {
        // If we should keep listening (e.g. mobile chrome auto-stop after brief pause), restart
        if (this.shouldKeepListening) {
          try {
            this.recognition.start();
            return;
          } catch {
            // failed to restart, finalize
          }
        }
        this.cleanup();
        options.onEnd?.();
      };

      this.recognition.start();
      this.isListening = true;
    } catch (err: unknown) {
      this.cleanup();
      const msg = err instanceof Error ? err.message : 'Nie udało się uruchomić rozpoznawania mowy.';
      throw new Error(msg);
    }
  }

  public stop(): void {
    this.shouldKeepListening = false;
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {
        // ignore
      }
    }
    this.cleanup();
  }

  public cancel(): void {
    this.shouldKeepListening = false;
    if (this.recognition) {
      try {
        this.recognition.abort();
      } catch {
        // ignore
      }
    }
    this.cleanup();
  }

  private cleanup() {
    this.isListening = false;
    this.shouldKeepListening = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      try {
        this.audioContext.close();
      } catch {
        // ignore
      }
      this.audioContext = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((t) => t.stop());
      this.mediaStream = null;
    }
  }
}

/**
 * Audio Recording Controller for Gemini 3.5 Transcribe
 * Records high-fidelity audio chunks and produces a Blob for server-side processing
 */
export class AudioTranscriptionController {
  private mediaStream: MediaStream | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private mimeType = 'audio/webm';

  public isRecording = false;

  public isSupported(): boolean {
    return Boolean(
      typeof window !== 'undefined' &&
      navigator?.mediaDevices?.getUserMedia &&
      typeof MediaRecorder !== 'undefined'
    );
  }

  public async startRecording(): Promise<void> {
    if (!this.isSupported()) {
      throw new Error('Nagrywanie dźwięku nie jest obsługiwane w tej przeglądarce.');
    }

    const candidateTypes = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/mp4',
      'audio/wav',
    ];

    let chosenType = '';
    for (const t of candidateTypes) {
      if (MediaRecorder.isTypeSupported(t)) {
        chosenType = t;
        break;
      }
    }

    this.mimeType = chosenType || 'audio/webm';
    this.recordedChunks = [];

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      this.mediaRecorder = new MediaRecorder(this.mediaStream, chosenType ? { mimeType: chosenType } : undefined);

      this.mediaRecorder.ondataavailable = (event: BlobEvent) => {
        if (event.data && event.data.size > 0) {
          this.recordedChunks.push(event.data);
        }
      };

      this.mediaRecorder.start(250);
      this.isRecording = true;
    } catch (err: unknown) {
      this.stopMediaTracks();
      this.isRecording = false;
      const errorMsg =
        err instanceof Error && err.name === 'NotAllowedError'
          ? 'Brak uprawnień do mikrofonu. Kliknij ikonę kłódki przy adresie strony i zezwól na dostęp do mikrofonu.'
          : err instanceof Error
          ? err.message
          : 'Nie udało się uzyskać dostępu do mikrofonu.';
      throw new Error(errorMsg);
    }
  }

  public stopRecording(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
        this.stopMediaTracks();
        this.isRecording = false;
        return reject(new Error('Nagrywanie nie było aktywne.'));
      }

      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.recordedChunks, {
          type: this.mimeType || 'audio/webm',
        });
        this.stopMediaTracks();
        this.isRecording = false;
        resolve(audioBlob);
      };

      this.mediaRecorder.stop();
    });
  }

  public cancelRecording(): void {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try {
        this.mediaRecorder.stop();
      } catch {
        // ignore
      }
    }
    this.stopMediaTracks();
    this.recordedChunks = [];
    this.isRecording = false;
  }

  private stopMediaTracks() {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }
  }
}

/**
 * Helper to convert Blob to base64 string
 */
export async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Transcribe recorded audio Blob by calling the server-side Gemini 3.5 Transcribe endpoint.
 */
export async function transcribeAudioBlob(blob: Blob): Promise<TranscribeResponse> {
  try {
    if (!blob || blob.size === 0) {
      return { text: '', error: 'Nagranie jest puste. Spróbuj mówić głośniej do mikrofonu.' };
    }

    const base64Audio = await blobToBase64(blob);

    const response = await fetch('/api/transcribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        audioData: base64Audio,
        mimeType: blob.type || 'audio/webm',
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      const msg = errData?.error || `Błąd serwera transkrypcji (${response.status})`;
      return { text: '', error: msg };
    }

    const data = await response.json();
    const rawText = (data.text || '').trim();
    // Normalize any spoken words left over into digits (e.g. "zero" -> "0")
    const cleanText = normalizeSpokenPartNumber(rawText);

    return {
      text: cleanText,
      model: data.model || 'gemini-3.5-transcribe',
    };
  } catch (err: unknown) {
    console.error('transcribeAudioBlob network error:', err);
    const msg = err instanceof Error ? err.message : 'Błąd połączenia z serwerem transkrypcji.';
    return { text: '', error: msg };
  }
}
