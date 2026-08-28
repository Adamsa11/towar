import React, { useRef, useState } from 'react';
import { Camera, Upload, Sparkles, Smartphone } from 'lucide-react';
import { audioFeedback } from './audioFeedback';

interface ImageUploadZoneProps {
  onImageSelected: (base64: string) => void;
  onOpenLiveCamera: () => void;
  soundEnabled?: boolean;
  hapticEnabled?: boolean;
}

export const ImageUploadZone: React.FC<ImageUploadZoneProps> = ({
  onImageSelected,
  onOpenLiveCamera,
  soundEnabled = true,
  hapticEnabled = true,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const nativeCameraInputRef = useRef<HTMLInputElement | null>(null);

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      audioFeedback.playError(soundEnabled);
      alert('Wybierz plik graficzny (JPG, PNG, WebP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = e => {
      const result = e.target?.result as string;
      if (result) {
        audioFeedback.playScanBeep(soundEnabled);
        audioFeedback.triggerHaptic('medium', hapticEnabled);
        onImageSelected(result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
    e.target.value = '';
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative rounded-2xl border-2 border-dashed transition-all p-5 sm:p-6 bg-white shadow-xs ${
        isDragging
          ? 'border-[#F36F21] bg-[#F36F21]/5 scale-[1.01]'
          : 'border-zinc-300 hover:border-zinc-400'
      }`}
    >
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

      <div className="flex flex-col lg:flex-row items-center justify-between gap-5">
        {/* Left / Top info */}
        <div className="flex items-center gap-4 text-center lg:text-left">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#F36F21]/15 via-[#F36F21]/5 to-transparent border border-[#F36F21]/25 flex items-center justify-center text-[#F36F21] shrink-0 shadow-xs">
            <Sparkles className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-zinc-900 tracking-tight font-['Ubuntu',sans-serif] flex items-center justify-center lg:justify-start gap-2">
              Skanowanie ze zdjęcia (AI OCR)
            </h2>
            <p className="text-xs sm:text-sm text-zinc-500 mt-0.5 font-['Poppins',sans-serif]">
              Zrób zdjęcie etykiety towaru, tabliczki znamionowej lub numeru wybitego na części
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto justify-center">
          {/* Live Camera Viewfinder */}
          <button
            onClick={() => {
              audioFeedback.triggerHaptic('light', hapticEnabled);
              onOpenLiveCamera();
            }}
            className="flex-1 min-w-[130px] sm:flex-initial py-3 px-4 rounded-xl bg-[#F36F21] hover:bg-[#ff7e33] active:scale-95 text-white font-bold font-['Ubuntu',sans-serif] text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-[#F36F21]/20 transition-all cursor-pointer"
          >
            <Camera className="w-4 h-4" />
            <span>Aparat na żywo</span>
          </button>

          {/* Quick System Camera (Always works without browser permission blocks) */}
          <button
            onClick={() => {
              audioFeedback.triggerHaptic('light', hapticEnabled);
              nativeCameraInputRef.current?.click();
            }}
            className="flex-1 min-w-[130px] sm:flex-initial py-3 px-4 rounded-xl bg-zinc-100 hover:bg-zinc-200 active:scale-95 border border-zinc-300 text-zinc-800 hover:text-[#F36F21] font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
            title="Szybkie zdjęcie aparatem telefonu"
          >
            <Smartphone className="w-4 h-4 text-[#F36F21]" />
            <span>Zrób zdjęcie</span>
          </button>

          {/* Gallery / File Button */}
          <button
            onClick={() => {
              audioFeedback.triggerHaptic('light', hapticEnabled);
              fileInputRef.current?.click();
            }}
            className="flex-1 min-w-[110px] sm:flex-initial py-3 px-3.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 active:scale-95 border border-zinc-300 text-zinc-700 hover:text-zinc-900 font-medium text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <Upload className="w-4 h-4 text-zinc-500" />
            <span>Galeria / Plik</span>
          </button>
        </div>
      </div>
    </div>
  );
};
