import React from 'react';
import { Sparkles, Key, ExternalLink, X, ShieldAlert, CheckCircle2 } from 'lucide-react';

interface GeminiApiKeyPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSettings: () => void;
  featureName?: string;
}

export const GeminiApiKeyPromptModal: React.FC<GeminiApiKeyPromptModalProps> = ({
  isOpen,
  onClose,
  onOpenSettings,
  featureName = 'AI Visual Appraisal',
}) => {
  if (!isOpen) return null;

  const handleOpenStudio = () => {
    window.open('https://aistudio.google.com/app/apikey', '_blank', 'noopener,noreferrer');
  };

  const handleGoToSettings = () => {
    onClose();
    onOpenSettings();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div
        className="bg-[#faf8f5] w-full max-w-md rounded-2xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-100 text-amber-900 rounded-xl">
              <Sparkles className="w-5 h-5 text-amber-800" />
            </div>
            <div>
              <h2 className="text-base font-serif font-bold text-stone-900">
                Google Gemini Key Required
              </h2>
              <p className="text-xs text-stone-500">
                Visual intelligence for {featureName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 text-xs text-stone-700 leading-relaxed">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-amber-950">
            <ShieldAlert className="w-4 h-4 text-amber-800 flex-shrink-0 mt-0.5" />
            <div>
              <strong className="block font-semibold">Gemini API Key Needed</strong>
              Curator uses <strong>Google Gemini (Gemini 2.5 Flash)</strong> to inspect photographs, identify makers and periods, transcribe marks, and write catalog descriptions.
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="font-mono uppercase tracking-wider text-[11px] font-semibold text-stone-800">
              How to enable AI in 2 minutes (100% Free):
            </h3>
            <ul className="space-y-2 text-stone-600">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>1. Get a free API key:</strong> Google provides a generous free tier for Gemini at{' '}
                  <button
                    type="button"
                    onClick={handleOpenStudio}
                    className="text-amber-800 underline font-semibold hover:text-amber-950 inline-flex items-center gap-0.5"
                  >
                    Google AI Studio <ExternalLink className="w-3 h-3" />
                  </button>
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>2. Enter your key:</strong> Click <em>Enter API Key</em> below to save it in Curator’s settings, or add <code className="px-1 py-0.5 bg-stone-200 rounded text-stone-800 font-mono text-[10px]">VITE_GEMINI_API_KEY</code> to your <code className="px-1 py-0.5 bg-stone-200 rounded text-stone-800 font-mono text-[10px]">.env.local</code> file.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>3. Ready to appraise:</strong> Once saved, visual recognition and catalog auto-completion are active immediately.
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-stone-50 border-t border-stone-200 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={handleOpenStudio}
            className="px-3 py-2 text-xs font-medium text-stone-700 hover:text-stone-900 border border-stone-300 rounded-lg bg-white hover:bg-stone-50 transition flex items-center gap-1.5"
          >
            <ExternalLink className="w-3.5 h-3.5 text-amber-700" />
            <span>Get Free Key</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 text-xs text-stone-500 hover:text-stone-800 font-medium"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleGoToSettings}
              className="px-4 py-2 text-xs bg-stone-900 hover:bg-stone-800 text-amber-100 rounded-lg font-semibold shadow-xs transition flex items-center gap-1.5"
            >
              <Key className="w-3.5 h-3.5 text-amber-400" />
              <span>Enter API Key</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
