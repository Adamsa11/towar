import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  X,
  Camera,
  RefreshCw,
  Zap,
  ZapOff,
  Image as ImageIcon,
  Smartphone,
  HelpCircle,
  Barcode,
  Sparkles,
  CheckCircle2,
  ScanLine
} from 'lucide-react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { audioFeedback } from './audioFeedback';

interface CameraScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (base64Image: string) => void;
  onBarcodeDetected?: (barcode: string) => void;
  soundEnabled?: boolean;
  hapticEnabled?: boolean;
}

export const CameraScannerModal: React.FC<CameraScannerModalProps> = ({
  isOpen,
  onClose,
  onCapture,
  onBarcodeDetected,
  soundEnabled = true,
  hapticEnabled = true,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const nativeCameraInputRef = useRef<HTMLInputElement | null>(null);
  const scannerControlsRef = useRef<{ stop: () => void } | null>(null);
  const isScanningFrameRef = useRef<boolean>(false);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<{ isPermissionDenied: boolean; message: string } | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [hasTorch, setHasTorch] = useState<boolean>(false);
  const [torchOn, setTorchOn] = useState<boolean>(false);
  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  
  // Scanner modes: 'auto_barcode' (live continuous decoding) vs 'ai_photo' (OCR snapshot)
  const [scanMode, setScanMode] = useState<'auto_barcode' | 'ai_photo'>('auto_barcode');
  const [lastDetectedBarcode, setLastDetectedBarcode] = useState<string | null>(null);

  const stopStream = useCallback(() => {
    if (scannerControlsRef.current) {
      try {
        scannerControlsRef.current.stop();
      } catch (e) {
        console.warn('Scanner stop error:', e);
      }
      scannerControlsRef.current = null;
    }
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  }, [stream]);

  const handleBarcodeFound = useCallback((barcodeText: string) => {
    if (!barcodeText || isCapturing) return;
    const cleanText = barcodeText.trim();
    if (!cleanText) return;

    setLastDetectedBarcode(cleanText);
    audioFeedback.playScanBeep(soundEnabled);
    audioFeedback.triggerHaptic('success', hapticEnabled);

    // Auto trigger search if callback provided
    if (onBarcodeDetected) {
      stopStream();
      onBarcodeDetected(cleanText);
    }
  }, [isCapturing, onBarcodeDetected, soundEnabled, hapticEnabled, stopStream]);

  // Start continuous barcode scanning from active video stream
  const startBarcodeScanner = useCallback(async (videoElement: HTMLVideoElement) => {
    if (scannerControlsRef.current) {
      try {
        scannerControlsRef.current.stop();
      } catch (e) {
        console.warn(e);
      }
      scannerControlsRef.current = null;
    }

    try {
      const codeReader = new BrowserMultiFormatReader();
      // Decode from live video stream
      const controls = await codeReader.decodeFromVideoElement(videoElement, (result, err) => {
        if (result && result.getText()) {
          const text = result.getText();
          handleBarcodeFound(text);
        }
      });
      scannerControlsRef.current = controls;
    } catch (scannerErr) {
      console.warn('ZXing live scanner initialization fallback to animation frame:', scannerErr);
    }
  }, [handleBarcodeFound]);

  const startCamera = useCallback(async () => {
    setCameraError(null);
    setLastDetectedBarcode(null);
    stopStream();

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError({
          isPermissionDenied: false,
          message: 'Twoja przeglądarka nie obsługuje bezpośredniego podglądu wideo. Użyj aparatu systemowego poniżej.',
        });
        return;
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1920, min: 640 },
          height: { ideal: 1080, min: 480 },
        },
        audio: false,
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play().catch(e => console.warn('Video play warning:', e));

        // Start live barcode detector on video
        if (scanMode === 'auto_barcode') {
          setTimeout(() => {
            if (videoRef.current) {
              startBarcodeScanner(videoRef.current);
            }
          }, 300);
        }
      }

      // Check for torch capability
      const videoTrack = mediaStream.getVideoTracks()[0];
      if (videoTrack) {
        const capabilities = (videoTrack.getCapabilities ? videoTrack.getCapabilities() : {}) as { torch?: boolean };
        if (capabilities && 'torch' in capabilities) {
          setHasTorch(Boolean(capabilities.torch));
        } else {
          setHasTorch(false);
        }
      }
    } catch (err: unknown) {
      const isDenied =
        err instanceof DOMException &&
        (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError' || err.message?.includes('Permission'));

      setCameraError({
        isPermissionDenied: isDenied,
        message: isDenied
          ? 'Brak zgody na dostęp do aparatu w przeglądarce. Możesz zrobić zdjęcie aparatem systemowym lub odblokować uprawnienia w pasku adresu.'
          : err instanceof Error ? err.message : 'Nie udało się uzyskać obrazu z aparatu.',
      });
    }
  }, [facingMode, stopStream, scanMode, startBarcodeScanner]);

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopStream();
      setTorchOn(false);
      setLastDetectedBarcode(null);
    }
    return () => {
      stopStream();
    };
  }, [isOpen, startCamera, stopStream]);

  const toggleTorch = async () => {
    if (!stream) return;
    const track = stream.getVideoTracks()[0];
    if (track) {
      try {
        const newTorch = !torchOn;
        await (track as MediaStreamTrack & { applyConstraints: (c: unknown) => Promise<void> }).applyConstraints({
          advanced: [{ torch: newTorch }],
        });
        setTorchOn(newTorch);
        audioFeedback.triggerHaptic('light', hapticEnabled);
      } catch (e) {
        console.warn('Could not toggle torch:', e);
      }
    }
  };

  const switchCamera = () => {
    setFacingMode(prev => (prev === 'environment' ? 'user' : 'environment'));
    audioFeedback.triggerHaptic('light', hapticEnabled);
  };

  const handleCapture = () => {
    if (!videoRef.current || isCapturing) return;

    setIsCapturing(true);
    audioFeedback.playScanBeep(soundEnabled);
    audioFeedback.triggerHaptic('medium', hapticEnabled);

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current || document.createElement('canvas');
      const width = video.videoWidth || 1280;
      const height = video.videoHeight || 720;

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, width, height);
        const base64 = canvas.toDataURL('image/jpeg', 0.92);
        stopStream();
        onCapture(base64);
      }
    } catch (err) {
      console.error('Capture frame error:', err);
    } finally {
      setIsCapturing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = event => {
      const result = event.target?.result as string;
      if (result) {
        stopStream();
        audioFeedback.playScanBeep(soundEnabled);
        audioFeedback.triggerHaptic('medium', hapticEnabled);
        onCapture(result);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col items-center justify-between overflow-hidden animate-in fade-in duration-200">
      {/* Top Header Controls Bar */}
      <div className="w-full flex flex-col z-20 bg-gradient-to-b from-slate-950 via-slate-950/80 to-transparent p-4 pb-2">
        <div className="flex items-center justify-between">
          <button
            onClick={onClose}
            className="p-2.5 rounded-full bg-slate-900/80 border border-slate-700/60 text-slate-200 hover:text-white active:scale-95 transition-all"
            title="Zamknij"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Mode Switcher Pills */}
          <div className="flex items-center p-1 bg-[#161616] border border-zinc-800 rounded-2xl shadow-lg">
            <button
              onClick={() => {
                setScanMode('auto_barcode');
                audioFeedback.triggerHaptic('light', hapticEnabled);
                if (videoRef.current) startBarcodeScanner(videoRef.current);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold font-['Ubuntu',sans-serif] flex items-center gap-1.5 transition-all cursor-pointer ${
                scanMode === 'auto_barcode'
                  ? 'bg-[#F36F21] text-white shadow-md shadow-[#F36F21]/20'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Barcode className="w-3.5 h-3.5" />
              <span>Auto Kody (Kreskowe/QR)</span>
            </button>

            <button
              onClick={() => {
                setScanMode('ai_photo');
                audioFeedback.triggerHaptic('light', hapticEnabled);
                if (scannerControlsRef.current) {
                  scannerControlsRef.current.stop();
                  scannerControlsRef.current = null;
                }
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold font-['Ubuntu',sans-serif] flex items-center gap-1.5 transition-all cursor-pointer ${
                scanMode === 'ai_photo'
                  ? 'bg-[#F36F21] text-white shadow-md shadow-[#F36F21]/20'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Zdjęcie AI (OCR)</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {hasTorch && !cameraError && (
              <button
                onClick={toggleTorch}
                className={`p-2.5 rounded-full border transition-all ${
                  torchOn
                    ? 'bg-[#F36F21] border-[#F36F21] text-white'
                    : 'bg-zinc-900 border-zinc-700/60 text-zinc-200 hover:text-white'
                }`}
                title={torchOn ? 'Wyłącz latarkę' : 'Włącz latarkę'}
              >
                {torchOn ? <Zap className="w-5 h-5 fill-current" /> : <ZapOff className="w-5 h-5" />}
              </button>
            )}

            {!cameraError && (
              <button
                onClick={switchCamera}
                className="p-2.5 rounded-full bg-zinc-900 border border-zinc-700/60 text-zinc-200 hover:text-white active:scale-95 transition-all"
                title="Przełącz aparat (przód/tył)"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Viewfinder Stage */}
      <div className="relative flex-1 w-full max-w-lg flex items-center justify-center overflow-hidden px-4">
        {cameraError ? (
          <div className="p-6 text-center max-w-md w-full bg-[#161616] border border-zinc-800 rounded-3xl flex flex-col items-center gap-4 shadow-2xl backdrop-blur-md">
            <div className="w-14 h-14 rounded-2xl bg-[#F36F21]/15 border border-[#F36F21]/30 flex items-center justify-center text-[#F36F21]">
              <Camera className="w-7 h-7" />
            </div>

            <div>
              <h3 className="text-base font-bold font-['Ubuntu',sans-serif] text-white mb-1">
                {cameraError.isPermissionDenied ? 'Wymagana zgoda lub aparat systemowy' : 'Problem z podglądem na żywo'}
              </h3>
              <p className="text-xs text-zinc-300 leading-relaxed max-w-xs mx-auto font-['Poppins',sans-serif]">
                {cameraError.message}
              </p>
            </div>

            {/* Actions for fallback */}
            <div className="flex flex-col gap-2.5 w-full pt-1">
              <button
                onClick={() => {
                  audioFeedback.triggerHaptic('light', hapticEnabled);
                  nativeCameraInputRef.current?.click();
                }}
                className="w-full py-3.5 px-4 bg-[#F36F21] hover:bg-[#ff7e33] active:scale-95 text-white font-bold font-['Ubuntu',sans-serif] rounded-2xl flex items-center justify-center gap-2.5 shadow-lg shadow-[#F36F21]/25 transition-all cursor-pointer text-sm"
              >
                <Camera className="w-5 h-5" />
                <span>Zrób zdjęcie (Aparat systemowy)</span>
              </button>

              <button
                onClick={() => {
                  audioFeedback.triggerHaptic('light', hapticEnabled);
                  fileInputRef.current?.click();
                }}
                className="w-full py-3 px-4 bg-zinc-800 hover:bg-zinc-700 active:scale-95 border border-zinc-700 text-zinc-200 hover:text-white font-semibold rounded-2xl flex items-center justify-center gap-2 text-xs transition-all cursor-pointer"
              >
                <ImageIcon className="w-4 h-4 text-zinc-400" />
                <span>Wybierz zdjęcie z galerii / plików</span>
              </button>

              <button
                onClick={startCamera}
                className="w-full py-2.5 px-4 bg-transparent hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 font-medium rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Ponów próbę uruchomienia podglądu</span>
              </button>
            </div>

            <div className="pt-2 border-t border-zinc-800/80 w-full text-left text-[11px] text-zinc-400 flex items-start gap-2">
              <HelpCircle className="w-4 h-4 text-[#F36F21] shrink-0 mt-0.5" />
              <span>
                <strong>Wskazówka:</strong> Aby włączyć podgląd wideo na żywo, kliknij ikonę kłódki obok adresu strony w przeglądarce i zezwól na <em>Aparat</em>.
              </span>
            </div>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              className="absolute inset-0 w-full h-full object-cover"
            />

            {/* Target Reticle / Scanner Framing */}
            <div
              className={`relative z-10 ${
                scanMode === 'auto_barcode' ? 'w-72 h-44 sm:w-80 sm:h-48' : 'w-72 h-64 sm:w-80 sm:h-72'
              } border-2 ${
                lastDetectedBarcode ? 'border-emerald-400 shadow-[0_0_20px_#34d399]' : 'border-[#F36F21]/90'
              } rounded-2xl shadow-[0_0_0_9999px_rgba(22,22,22,0.75)] flex flex-col items-center justify-between p-3 pointer-events-none transition-all duration-300`}
            >
              {/* Corner markers */}
              <div className="w-full flex justify-between">
                <span className={`w-4 h-4 border-t-4 border-l-4 ${lastDetectedBarcode ? 'border-emerald-400' : 'border-[#F36F21]'} -mt-1 -ml-1 rounded-tl`} />
                <span className={`w-4 h-4 border-t-4 border-r-4 ${lastDetectedBarcode ? 'border-emerald-400' : 'border-[#F36F21]'} -mt-1 -mr-1 rounded-tr`} />
              </div>

              {/* Animated laser line */}
              <div className={`w-full h-0.5 ${
                lastDetectedBarcode
                  ? 'bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_15px_#34d399]'
                  : 'bg-gradient-to-r from-transparent via-[#F36F21] to-transparent shadow-[0_0_12px_#F36F21] animate-pulse'
              }`} />

              <div className="w-full flex justify-between">
                <span className={`w-4 h-4 border-b-4 border-l-4 ${lastDetectedBarcode ? 'border-emerald-400' : 'border-[#F36F21]'} -mb-1 -ml-1 rounded-bl`} />
                <span className={`w-4 h-4 border-b-4 border-r-4 ${lastDetectedBarcode ? 'border-emerald-400' : 'border-[#F36F21]'} -mb-1 -mr-1 rounded-br`} />
              </div>
            </div>

            {/* Detected Barcode Popup in Real-Time */}
            {lastDetectedBarcode && (
              <div className="absolute top-8 z-30 px-5 py-3 rounded-2xl bg-emerald-950/90 border border-emerald-500 text-white font-mono text-sm font-bold backdrop-blur-md shadow-2xl flex items-center gap-2.5 animate-in slide-in-from-top duration-200">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <span>Odczytano: {lastDetectedBarcode}</span>
              </div>
            )}

            {/* Helper Hint Tag */}
            <div className="absolute bottom-6 z-20 px-4 py-1.5 rounded-full bg-[#161616]/90 border border-zinc-700/80 text-xs text-[#F36F21] font-medium backdrop-blur-md shadow-lg pointer-events-none flex items-center gap-1.5 font-['Poppins',sans-serif]">
              {scanMode === 'auto_barcode' ? (
                <>
                  <ScanLine className="w-3.5 h-3.5 animate-pulse text-[#F36F21]" />
                  <span>Nakieruj ramkę na kod kreskowy lub QR (automatyczny odczyt)</span>
                </>
              ) : (
                <>
                  <Camera className="w-3.5 h-3.5 text-[#F36F21]" />
                  <span>Wyceluj w tabliczkę / grawer i naciśnij przycisk migawki</span>
                </>
              )}
            </div>
          </>
        )}
      </div>

      {/* Hidden file inputs: standard gallery & native camera */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
      <input
        ref={nativeCameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />
      <canvas ref={canvasRef} className="hidden" />

      {/* Bottom Action Bar */}
      <div className="w-full max-w-lg p-6 pb-8 z-20 flex items-center justify-around bg-gradient-to-t from-[#161616] to-transparent">
        {/* Gallery / File Picker */}
        <button
          onClick={() => {
            audioFeedback.triggerHaptic('light', hapticEnabled);
            fileInputRef.current?.click();
          }}
          className="p-3.5 rounded-2xl bg-[#161616]/90 border border-zinc-700 text-zinc-300 hover:text-white active:scale-95 transition-all flex flex-col items-center gap-1 cursor-pointer"
          title="Galeria zdjęć"
        >
          <ImageIcon className="w-6 h-6" />
          <span className="text-[10px] font-medium">Galeria</span>
        </button>

        {/* Center Shutter Button in Saw-Trak Orange */}
        {cameraError ? (
          <button
            onClick={() => {
              audioFeedback.triggerHaptic('medium', hapticEnabled);
              nativeCameraInputRef.current?.click();
            }}
            className="w-20 h-20 rounded-full border-4 border-[#F36F21]/50 p-1 bg-transparent active:scale-90 transition-transform cursor-pointer hover:border-[#F36F21]"
            title="Zrób zdjęcie aparatem"
          >
            <div className="w-full h-full rounded-full bg-[#F36F21] hover:bg-[#ff7e33] flex items-center justify-center shadow-lg shadow-[#F36F21]/30">
              <Camera className="w-8 h-8 text-white" />
            </div>
          </button>
        ) : (
          <button
            onClick={handleCapture}
            disabled={isCapturing}
            className="w-20 h-20 rounded-full border-4 border-[#F36F21]/50 p-1 bg-transparent active:scale-90 transition-transform cursor-pointer hover:border-[#F36F21] group"
            title={scanMode === 'auto_barcode' ? 'Zrób zdjęcie kodu' : 'Zrób zdjęcie do analizy AI'}
          >
            <div className="w-full h-full rounded-full bg-[#F36F21] group-hover:bg-[#ff7e33] flex items-center justify-center shadow-lg shadow-[#F36F21]/30">
              {scanMode === 'auto_barcode' ? (
                <Barcode className="w-8 h-8 text-white" />
              ) : (
                <Camera className="w-8 h-8 text-white" />
              )}
            </div>
          </button>
        )}

        {/* Native Camera Shortcut Button */}
        <button
          onClick={() => {
            audioFeedback.triggerHaptic('light', hapticEnabled);
            nativeCameraInputRef.current?.click();
          }}
          className="p-3.5 rounded-2xl bg-[#161616]/90 border border-zinc-700 text-zinc-300 hover:text-white active:scale-95 transition-all flex flex-col items-center gap-1 cursor-pointer"
          title="Aparat systemowy"
        >
          <Smartphone className="w-6 h-6" />
          <span className="text-[10px] font-medium">Systemowy</span>
        </button>
      </div>
    </div>
  );
};

