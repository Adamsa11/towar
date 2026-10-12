import { createWorker } from 'tesseract.js';
import { AppSettings, DetectedNumber } from './types';

export interface OCRResult {
  detectedNumbers: DetectedNumber[];
  rawText?: string;
  source: 'ai_gemini' | 'tesseract_ocr' | 'mock_fallback';
  modelUsed?: string;
  error?: string;
}

/**
 * Intelligent regex pattern parser to extract part numbers, catalog codes,
 * OEM codes, barcodes, and serial numbers from raw OCR text.
 */
export function parsePartNumbersFromText(rawText: string): DetectedNumber[] {
  if (!rawText || !rawText.trim()) return [];

  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
  const foundNumbers: { text: string; cleanText: string; label: string; confidence: number; type: DetectedNumber['type'] }[] = [];
  const seenClean = new Set<string>();

  const addCandidate = (text: string, label: string, confidence: number, type: DetectedNumber['type'] = 'catalog') => {
    const trimmed = text.trim();
    const clean = trimmed.replace(/[\s\-_.\/]/g, '').toUpperCase();
    if (clean.length < 3 || clean.length > 35) return;
    if (seenClean.has(clean)) return;

    // Filter out common dictionary words that are not part numbers
    const disallowedWords = ['AIR', 'FILTER', 'OIL', 'BRAKE', 'ENGINE', 'DIESEL', 'PETROL', 'VALVE', 'SENSOR', 'MADE', 'CHINA', 'GERMANY', 'POLAND', 'GENUINE', 'ORIGINAL', 'PARTS', 'PIECE', 'TOTAL'];
    if (disallowedWords.includes(clean)) return;

    seenClean.add(clean);
    foundNumbers.push({
      text: trimmed,
      cleanText: clean,
      label,
      confidence,
      type,
    });
  };

  // 1. Direct Regex for Automotive / Technical Part Numbers
  // e.g. HE221-00311X, 0 445 110 239, 03L 130 277 B, WK 820/17, 7.02550.60.0, GT1749V, 6PK1750
  
  // Specific pattern: Alphanumeric with hyphens/slashes/dots (like HE221-00311X)
  const codeWithHyphenSlashRegex = /\b[A-Z0-9]{2,10}[-\/.][A-Z0-9]{3,15}(?:[-\/.][A-Z0-9]{1,10})*\b/gi;
  let match: RegExpExecArray | null;
  while ((match = codeWithHyphenSlashRegex.exec(rawText)) !== null) {
    addCandidate(match[0], 'Numer katalogowy / Oznaczenie części', 0.95, 'catalog');
  }

  // Bosch / Standard Spaced numbers (e.g., "0 445 110 239", "0 986 479 042", "03L 130 277 B")
  const spacedNumRegex = /\b[0-9A-Z]{1,4}\s+[0-9A-Z]{3,4}\s+[0-9A-Z]{3,4}(?:\s+[0-9A-Z]{1,4})?\b/gi;
  while ((match = spacedNumRegex.exec(rawText)) !== null) {
    addCandidate(match[0], 'Format numeru Bosch / VAG', 0.92, 'catalog');
  }

  // Continuous alphanumeric codes with both letters and numbers (e.g., HE22100311X, GT1749V, 6PK1750, WK82017)
  const mixedAlphaNumRegex = /\b(?=[A-Z0-9]{4,20}\b)(?=[A-Z0-9]*[A-Z])(?=[A-Z0-9]*[0-9])[A-Z0-9]+\b/gi;
  while ((match = mixedAlphaNumRegex.exec(rawText)) !== null) {
    addCandidate(match[0], 'Kod alfanumeryczny części', 0.88, 'part');
  }

  // Pure digits of length 6 to 14 (e.g. EAN barcodes or OEM codes)
  const pureDigitsRegex = /\b\d{6,14}\b/g;
  while ((match = pureDigitsRegex.exec(rawText)) !== null) {
    addCandidate(match[0], match[0].length === 13 ? 'Kod kreskowy EAN-13' : 'Kod numeryczny', 0.85, match[0].length === 13 ? 'barcode' : 'catalog');
  }

  // 2. Line-by-line inspection (e.g., if a line contains "HE221-00311X" directly under "Air Filter")
  lines.forEach((line) => {
    const trimmedLine = line.replace(/[^A-Za-z0-9\-.\/\s]/g, '').trim();
    if (trimmedLine.length >= 4 && trimmedLine.length <= 25) {
      if (/[0-9]/.test(trimmedLine) && trimmedLine.split(' ').length <= 4) {
        addCandidate(trimmedLine, 'Wykryty z linii etykiety', 0.9, 'catalog');
      }
    }
  });

  return foundNumbers.map((item, idx) => ({
    id: `det_${Date.now()}_${idx}`,
    text: item.text,
    cleanText: item.cleanText,
    label: item.label,
    type: item.type,
    confidence: item.confidence,
  }));
}

/**
 * High-speed local OCR using Tesseract.js (Works 100% offline and locally without API key)
 */
export async function extractNumbersWithLocalOCR(imageBase64: string): Promise<OCRResult> {
  try {
    const worker = await createWorker('pol+eng');
    const ret = await worker.recognize(imageBase64);
    await worker.terminate();

    const rawText = ret.data.text || '';
    const detected = parsePartNumbersFromText(rawText);

    if (detected.length > 0) {
      return {
        detectedNumbers: detected,
        rawText,
        source: 'tesseract_ocr',
      };
    }

    return {
      detectedNumbers: [],
      rawText,
      source: 'tesseract_ocr',
      error: 'Nie wykryto czytelnego numeru w lokalnym silniku OCR. Upewnij się, że etykieta jest ostra i dobrze oświetlona.',
    };
  } catch (err: unknown) {
    console.warn('Local Tesseract OCR error:', err);
    return {
      detectedNumbers: [],
      source: 'tesseract_ocr',
      error: err instanceof Error ? err.message : 'Błąd silnika OCR',
    };
  }
}

/**
 * Primary OCR orchestrator:
 * 1. If Gemini API Key is configured -> Calls Gemini Vision AI
 * 2. If no API key or Gemini fails -> Automatically runs local high-precision Tesseract OCR
 */
export async function extractNumbersFromImage(
  imageBase64: string,
  settings: AppSettings
): Promise<OCRResult> {
  const apiKey = (settings.geminiApiKey || '').trim();
  const cleanBase64 = imageBase64.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, '');

  // If Gemini API Key is available, use Gemini 2.5 Flash / 3.7 Flash for deep context understanding
  if (apiKey) {
    const modelName = settings.geminiModel || 'gemini-2.5-flash';

    const prompt = `Jesteś ekspertem magazynowym i inżynierem części technicznych, motoryzacyjnych oraz przemysłowych.
Twoim zadaniem jest BŁYSKAWICZNE i BEZBŁĘDNE odczytanie ZE ZDJĘCIA wszelkich numerów katalogowych, kodów towaru, oznaczeń części, kodów kreskowych oraz numerów seryjnych.

Przykłady oznaczeń, na które musisz zwrócić uwagę:
- Kody z myślnikami i literami (np. HE221-00311X, GT1749V, 03L-130-277, WK820/17)
- Numery katalogowe ze spacjami (np. 0 445 110 239)
- Etykiety naklejane na kartonach (np. pod nazwą "Air Filter" znajduje się numer "HE221-00311X")
- Grawery laserowe, tabliczki znamionowe, numery odlewów

Zwróć wynik WYŁĄCZNIE w poprawnym formacie JSON wg schematu:
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
  "summary": "Odczytano etykietę Air Filter z numerem HE221-00311X"
}

Ważne:
1. Odczytaj DOKŁADNIE każdy ciąg liter i cyfr stanowiący numer części.
2. Zwróć tylko czysty obiekt JSON bez znaczników \`\`\`json.`;

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
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
          ],
          generationConfig: {
            temperature: 0.1,
            topP: 0.95,
            responseMimeType: 'application/json',
          },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const rawAnswer = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        
        let parsed: { numbers?: Array<{ text: string; cleanText?: string; label?: string; type?: string; confidence?: number }>; summary?: string } = {};
        try {
          const cleanedJson = rawAnswer.replace(/```json/gi, '').replace(/```/g, '').trim();
          parsed = JSON.parse(cleanedJson);
        } catch {
          parsed = { numbers: [] };
        }

        if (parsed.numbers && Array.isArray(parsed.numbers) && parsed.numbers.length > 0) {
          const detectedNumbers: DetectedNumber[] = parsed.numbers.map((item, idx) => ({
            id: `det_${Date.now()}_${idx}`,
            text: item.text || '',
            cleanText: item.cleanText || (item.text || '').replace(/[\s\-_.\/]/g, '').toUpperCase(),
            label: item.label || 'Numer z etykiety (Gemini AI)',
            type: (item.type as DetectedNumber['type']) || 'catalog',
            confidence: item.confidence || 0.95,
          })).filter(n => n.text.trim().length > 0);

          return {
            detectedNumbers,
            rawText: parsed.summary || rawAnswer,
            source: 'ai_gemini',
            modelUsed: modelName,
          };
        }
      }
    } catch (geminiError) {
      console.warn('Gemini OCR API call failed, falling back to server OCR:', geminiError);
    }
  }

  // Try server-side OCR proxy endpoint (/api/ocr) if available
  try {
    const serverRes = await fetch('/api/ocr', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64, model: settings.geminiModel || 'gemini-2.5-flash' }),
    });

    if (serverRes.ok) {
      const parsed = await serverRes.json();
      if (parsed.numbers && Array.isArray(parsed.numbers) && parsed.numbers.length > 0) {
        const detectedNumbers: DetectedNumber[] = parsed.numbers
          .map((item: any, idx: number) => ({
            id: `det_${Date.now()}_${idx}`,
            text: item.text || '',
            cleanText: item.cleanText || (item.text || '').replace(/[\s\-_.\/]/g, '').toUpperCase(),
            label: item.label || 'Numer z etykiety (Gemini AI)',
            type: (item.type as DetectedNumber['type']) || 'catalog',
            confidence: item.confidence || 0.95,
          }))
          .filter((n: DetectedNumber) => n.text.trim().length > 0);

        if (detectedNumbers.length > 0) {
          return {
            detectedNumbers,
            rawText: parsed.summary || '',
            source: 'ai_gemini',
            modelUsed: settings.geminiModel || 'gemini-2.5-flash',
          };
        }
      }
    }
  } catch {
    // Ignore server OCR failure and continue to local OCR
  }

  // Automatic Local OCR fallback (Tesseract.js)
  const localOcrResult = await extractNumbersWithLocalOCR(imageBase64);
  if (localOcrResult.detectedNumbers.length > 0) {
    return localOcrResult;
  }

  // If local OCR also couldn't find text, check regex fallback
  if (localOcrResult.rawText) {
    const fallbackParsed = parsePartNumbersFromText(localOcrResult.rawText);
    if (fallbackParsed.length > 0) {
      return {
        detectedNumbers: fallbackParsed,
        rawText: localOcrResult.rawText,
        source: 'tesseract_ocr',
      };
    }
  }

  return {
    detectedNumbers: [],
    source: 'tesseract_ocr',
    error: 'Nie wykryto numeru na zdjęciu. Sprawdź, czy etykieta jest wyraźna lub wprowadź klucz Gemini API w Ustawieniach dla maksymalnej precyzji AI.',
  };
}

export async function testGeminiConnection(settings: AppSettings): Promise<{ ok: boolean; message: string }> {
  const apiKey = (settings.geminiApiKey || '').trim();
  if (!apiKey) {
    return { ok: false, message: 'Wprowadź klucz Gemini API Key' };
  }

  const modelName = settings.geminiModel || 'gemini-2.5-flash';

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: 'Odpowiedz tylko słowem OK' }] }],
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return { ok: false, message: `Błąd API (${response.status}): ${err.error?.message || response.statusText}` };
    }

    return { ok: true, message: `Połączono pomyślnie z modelem ${modelName}!` };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Błąd połączenia';
    return { ok: false, message: `Błąd sieci Gemini: ${msg}` };
  }
}
