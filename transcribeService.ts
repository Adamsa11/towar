/**
 * Speech-to-Text Transcription Service
 * Captures microphone audio using MediaRecorder and sends it to the server-side
 * Gemini API endpoint (/api/transcribe) running 'gemini-3.5-transcribe'.
 */

export interface TranscribeResponse {
  text: string;
  error?: string;
}

export class AudioTranscriptionController {
  private mediaStream: MediaStream | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private mimeType = 'audio/webm';

  public isRecording = false;

  /**
   * Checks if audio recording is supported by current browser environment.
   */
  public isSupported(): boolean {
    return Boolean(
      typeof window !== 'undefined' &&
      navigator?.mediaDevices?.getUserMedia &&
      typeof MediaRecorder !== 'undefined'
    );
  }

  /**
   * Starts recording audio from microphone.
   */
  public async startRecording(): Promise<void> {
    if (!this.isSupported()) {
      throw new Error('Nagrywanie dźwięku nie jest obsługiwane w tej przeglądarce.');
    }

    // Determine supported mimeType
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

      this.mediaRecorder.start(250); // Slice chunks every 250ms
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

  /**
   * Stops recording and returns the recorded audio Blob.
   */
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

  /**
   * Cancels ongoing recording and discards audio tracks.
   */
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
    return {
      text: (data.text || '').trim(),
    };
  } catch (err: unknown) {
    console.error('transcribeAudioBlob network error:', err);
    const msg = err instanceof Error ? err.message : 'Błąd połączenia z serwerem transkrypcji.';
    return { text: '', error: msg };
  }
}
