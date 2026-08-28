import React from 'react';
import { Check, Hash, Barcode, Cpu, Layers, Copy, Search, ArrowRight, RefreshCw } from 'lucide-react';
import { DetectedNumber } from './types';
import { audioFeedback } from './audioFeedback';

interface DetectedNumbersPickerProps {
  detectedNumbers: DetectedNumber[];
  selectedNumber: string;
  onSelectNumber: (number: string, autoSearch?: boolean) => void;
  imagePreviewUrl: string | null;
  onClearImage: () => void;
  onRescan: () => void;
  isSearching: boolean;
  soundEnabled?: boolean;
  hapticEnabled?: boolean;
}

export const DetectedNumbersPicker: React.FC<DetectedNumbersPickerProps> = ({
  detectedNumbers,
  selectedNumber,
  onSelectNumber,
  imagePreviewUrl,
  onClearImage,
  onRescan,
  isSearching,
  soundEnabled = true,
  hapticEnabled = true,
}) => {
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  const handleCopy = (text: string, id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    audioFeedback.triggerHaptic('light', hapticEnabled);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const getTypeIcon = (type: DetectedNumber['type']) => {
    switch (type) {
      case 'barcode':
        return <Barcode className="w-3.5 h-3.5" />;
      case 'oem':
        return <Cpu className="w-3.5 h-3.5" />;
      case 'catalog':
        return <Hash className="w-3.5 h-3.5" />;
      default:
        return <Layers className="w-3.5 h-3.5" />;
    }
  };

  const getTypeBadgeColor = (type: DetectedNumber['type']) => {
    switch (type) {
      case 'catalog':
        return 'bg-[#F36F21]/10 text-[#F36F21] border-[#F36F21]/25';
      case 'oem':
        return 'bg-sky-50 text-sky-700 border-sky-200';
      case 'barcode':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'serial':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      default:
        return 'bg-zinc-100 text-zinc-700 border-zinc-200';
    }
  };

  if (detectedNumbers.length === 0 && !imagePreviewUrl) {
    return null;
  }

  return (
    <div className="bg-white border border-zinc-200/90 rounded-2xl p-4 sm:p-5 shadow-xs transition-all">
      {/* Header with image thumbnail and status */}
      <div className="flex items-center justify-between pb-3.5 border-b border-zinc-200 gap-3">
        <div className="flex items-center gap-3">
          {imagePreviewUrl && (
            <div className="relative w-12 h-12 rounded-xl overflow-hidden border border-zinc-200 bg-zinc-100 shrink-0">
              <img
                src={imagePreviewUrl}
                alt="Zeskanowane zdjęcie"
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 text-[11px] font-bold tracking-wide uppercase px-2 py-0.5 rounded-md bg-[#F36F21]/10 text-[#F36F21] border border-[#F36F21]/20 font-['Ubuntu',sans-serif]">
                Wykryto {detectedNumbers.length}{' '}
                {detectedNumbers.length === 1 ? 'numer' : detectedNumbers.length < 5 ? 'numery' : 'numerów'}
              </span>
            </div>
            <p className="text-xs sm:text-sm font-bold text-zinc-900 mt-0.5 font-['Ubuntu',sans-serif]">
              Wskaż numer, po którym chcesz szukać w tabeli towar:
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={onRescan}
            className="p-2 text-xs font-medium text-zinc-700 hover:text-zinc-900 bg-zinc-100 hover:bg-zinc-200 rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
            title="Skanuj ponownie"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline font-['Ubuntu',sans-serif]">Ponów</span>
          </button>
          <button
            onClick={onClearImage}
            className="p-2 text-xs font-medium text-zinc-600 hover:text-[#CC0000] bg-zinc-100 hover:bg-zinc-200 rounded-xl transition-colors cursor-pointer font-['Ubuntu',sans-serif]"
            title="Usuń zdjęcie"
          >
            Usuń
          </button>
        </div>
      </div>

      {/* Candidate Numbers List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-3.5">
        {detectedNumbers.map(item => {
          const isSelected = selectedNumber.trim() === item.text.trim() || selectedNumber.trim() === item.cleanText.trim();

          return (
            <div
              key={item.id}
              onClick={() => {
                audioFeedback.triggerHaptic('medium', hapticEnabled);
                audioFeedback.playSuccess(soundEnabled);
                onSelectNumber(item.text, true);
              }}
              className={`group relative p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                isSelected
                  ? 'bg-[#F36F21]/5 border-[#F36F21] shadow-xs ring-1 ring-[#F36F21]/30'
                  : 'bg-zinc-50/70 border-zinc-200 hover:border-[#F36F21]/50 hover:bg-white'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <span
                  className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md border font-['Ubuntu',sans-serif] ${getTypeBadgeColor(
                    item.type
                  )}`}
                >
                  {getTypeIcon(item.type)}
                  {item.label}
                </span>

                <div className="flex items-center gap-1">
                  <button
                    onClick={e => handleCopy(item.text, item.id, e)}
                    className="p-1 rounded-md text-zinc-400 hover:text-zinc-800 hover:bg-zinc-200 transition-colors"
                    title="Kopiuj numer"
                  >
                    {copiedId === item.id ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Number display */}
              <div className="flex items-baseline justify-between gap-2">
                <div className="font-mono text-base sm:text-lg font-bold text-zinc-900 tracking-wide break-all group-hover:text-[#F36F21] transition-colors">
                  {item.text}
                </div>

                <button
                  disabled={isSearching}
                  className={`shrink-0 text-xs font-bold font-['Ubuntu',sans-serif] px-2.5 py-1 rounded-lg flex items-center gap-1 transition-all ${
                    isSelected
                      ? 'bg-[#F36F21] text-white shadow-xs'
                      : 'bg-zinc-200 group-hover:bg-[#F36F21] text-zinc-700 group-hover:text-white'
                  }`}
                >
                  <Search className="w-3 h-3" />
                  <span>{isSelected ? 'Szukam...' : 'Wybierz'}</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
