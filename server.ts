import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Parse json and urlencoded payloads (audio base64 can be a few megabytes)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

const apiKey = process.env.GEMINI_API_KEY || '';

const ai = new GoogleGenAI({
  apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

/**
 * POST /api/transcribe
 * Transcribes user speech/audio input using Gemini 3.5 Transcribe model ('gemini-3.5-transcribe').
 */
app.post('/api/transcribe', async (req: Request, res: Response) => {
  try {
    const { audioData, mimeType } = req.body;

    if (!audioData) {
      return res.status(400).json({ error: 'Brak danych audio do transkrypcji.' });
    }

    if (!apiKey) {
      return res.status(500).json({
        error: 'Klucz GEMINI_API_KEY nie jest skonfigurowany na serwerze.',
      });
    }

    // Strip data URL scheme if present (e.g. data:audio/webm;base64,...)
    const cleanBase64 = String(audioData).replace(/^data:audio\/[^;]+;base64,/, '');
    const cleanMime = (mimeType && String(mimeType).split(';')[0]) || 'audio/webm';

    const audioPart = {
      inlineData: {
        mimeType: cleanMime,
        data: cleanBase64,
      },
    };

    const promptText =
      'Transkrybuj dokładnie nagranie audio na tekst. Jest to wyszukiwarka części zamiennych do wózków widłowych i maszyn przemysłowych. ' +
      'Użytkownik dyktuje numery katalogowe (np. HE221-00311X, 0 445 110 239, 03L 130 277 B), kody lub nazwy części (np. filtr powietrza, rozrusznik, alternator, pompa hydrauliczna). ' +
      'Zwróć WYŁĄCZNIE czysty, odczytany tekst bez cudzysłowów, bez podsumowań i bez dodatkowych komentarzy.';

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-transcribe',
      contents: {
        parts: [
          audioPart,
          {
            text: promptText,
          },
        ],
      },
    });

    const transcribedText = response.text ? response.text.trim() : '';

    return res.json({
      text: transcribedText,
      model: 'gemini-3.5-transcribe',
    });
  } catch (error: unknown) {
    console.error('Audio transcription error in server:', error);
    const message = error instanceof Error ? error.message : 'Wystąpił nieoczekiwany błąd podczas transkrypcji mowy.';
    return res.status(500).json({
      error: message,
    });
  }
});

/**
 * POST /api/ocr
 * Server-side fallback OCR using Gemini for image analysis.
 */
app.post('/api/ocr', async (req: Request, res: Response) => {
  try {
    const { imageBase64, model = 'gemini-2.5-flash' } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: 'Brak danych obrazu.' });
    }

    if (!apiKey) {
      return res.status(500).json({ error: 'Klucz GEMINI_API_KEY nie jest skonfigurowany.' });
    }

    const cleanBase64 = String(imageBase64).replace(/^data:image\/[^;]+;base64,/, '');

    const prompt = `Jesteś ekspertem magazynowym i inżynierem części technicznych, motoryzacyjnych oraz przemysłowych.
Twoim zadaniem jest BŁYSKAWICZNE i BEZBŁĘDNE odczytanie ZE ZDJĘCIA wszelkich numerów katalogowych, kodów towaru, oznaczeń części, kodów kreskowych oraz numerów seryjnych.

Przykłady oznaczeń:
- Kody z myślnikami i literami (np. HE221-00311X, GT1749V, 03L-130-277, WK820/17)
- Numery katalogowe ze spacjami (np. 0 445 110 239)
- Etykiety naklejane na kartonach

Zwróć wynik WYŁĄCZNIE w poprawnym formacie JSON:
{
  "numbers": [
    {
      "text": "dokładny numer np. HE221-00311X",
      "cleanText": "HE22100311X",
      "label": "Numer katalogowy / Oznaczenie części",
      "type": "catalog",
      "confidence": 0.99
    }
  ],
  "summary": "Podsumowanie odczytanej etykiety"
}`;

    const response = await ai.models.generateContent({
      model,
      contents: {
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: cleanBase64,
            },
          },
        ],
      },
      config: {
        temperature: 0.1,
        responseMimeType: 'application/json',
      },
    });

    const raw = response.text || '';
    let parsed = { numbers: [] };
    try {
      const clean = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
      parsed = JSON.parse(clean);
    } catch {
      // ignore
    }

    return res.json(parsed);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Błąd analizy OCR';
    return res.status(500).json({ error: message });
  }
});

async function start() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (req: Request, res: Response) => {
        res.sendFile(path.resolve(distPath, 'index.html'));
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Saw-Trak Server] listening on http://0.0.0.0:${PORT}`);
  });
}

start().catch((err) => {
  console.error('[Saw-Trak Server] failed to start:', err);
  process.exit(1);
});
