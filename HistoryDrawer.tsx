import React from 'react';
import { X, History, Trash2, Search, ArrowRight, Camera, Upload, Keyboard } from 'lucide-react';
import { SearchHistoryEntry } from './types';
import { audioFeedback } from './audioFeedback';

interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  history: SearchHistoryEntry[];
  onSelectHistory: (query: string) => void;
  onClearHistory: () => void;
  soundEnabled?: boolean;
  hapticEnabled?: boolean;
}

export const HistoryDrawer: React.FC<HistoryDrawerProps> = ({
  isOpen,
  onClose,
  history,
  onSelectHistory,
  onClearHistory,
  soundEnabled = true,
  hapticEnabled = true,
}) => {
  if (!isOpen) return null;

  const getSourceIcon = (src: SearchHistoryEntry['source']) => {
    switch (src) {
      case 'camera':
        return <Camera className="w-3 h-3 text-[#F36F21]" />;
      case 'upload':
        return <Upload className="w-3 h-3 text-sky-600" />;
      default:
        return <Keyboard className="w-3 h-3 text-zinc-500" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex justify-end animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-white border-l border-zinc-200 h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-200 flex items-center justify-between bg-zinc-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#F36F21]/10 border border-[#F36F21]/20 flex items-center justify-center text-[#F36F21]">
              <History className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-900 tracking-tight font-['Ubuntu',sans-serif]">
                Historia Wyszukiwań
              </h2>
              <p className="text-[11px] text-zinc-500 font-['Poppins',sans-serif]">
                {history.length} {history.length === 1 ? 'wpis' : history.length < 5 ? 'wpisy' : 'wpisów'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {history.length > 0 && (
              <button
                onClick={() => {
                  if (confirm('Czy na pewno chcesz wyczyścić historię wyszukiwań?')) {
                    onClearHistory();
                    audioFeedback.triggerHaptic('medium', hapticEnabled);
                  }
                }}
                className="p-2 text-zinc-500 hover:text-[#CC0000] rounded-lg hover:bg-zinc-200 transition-colors cursor-pointer"
                title="Wyczyść historię"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-zinc-500 hover:text-zinc-900 rounded-lg hover:bg-zinc-200 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Drawer List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 font-['Poppins',sans-serif]">
          {history.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-zinc-400">
              <History className="w-10 h-10 mb-2 opacity-30" />
              <p className="text-sm font-semibold text-zinc-600 font-['Ubuntu',sans-serif]">Brak historii wyszukiwań</p>
              <p className="text-xs text-zinc-500 mt-1">
                Wyszukaj towar ze zdjęcia lub po numerze katalogowym, a pojawi się tutaj.
              </p>
            </div>
          ) : (
            history.map(item => (
              <div
                key={item.id}
                onClick={() => {
                  audioFeedback.triggerHaptic('light', hapticEnabled);
                  audioFeedback.playSuccess(soundEnabled);
                  onSelectHistory(item.query);
                  onClose();
                }}
                className="group p-3.5 rounded-xl bg-zinc-50 border border-zinc-200 hover:border-[#F36F21]/60 hover:bg-zinc-100/80 transition-all cursor-pointer flex items-center justify-between gap-3 shadow-xs"
              >
                <div className="space-y-1 overflow-hidden">
                  <div className="flex items-center gap-2">
                    <span className="p-1 rounded bg-white border border-zinc-200 shadow-xs">
                      {getSourceIcon(item.source)}
                    </span>
                    <span className="font-mono text-sm font-bold text-zinc-900 group-hover:text-[#F36F21] truncate transition-colors">
                      {item.query}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-[11px] text-zinc-500 pl-6">
                    <span>
                      {new Date(item.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    <span>•</span>
                    <span className="text-zinc-600">
                      Wyników: <strong className="text-[#F36F21]">{item.resultsCount}</strong>
                    </span>
                  </div>
                </div>

                <button className="p-2 rounded-lg bg-white group-hover:bg-[#F36F21] text-zinc-400 group-hover:text-white border border-zinc-200 group-hover:border-[#F36F21] transition-all shrink-0 cursor-pointer shadow-xs">
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
