import React, { useState, useRef, useEffect } from 'react';
import type { Category } from '../types/schema';
import { 
  researchMarksWithAI, 
  isGeminiKeyConfigured,
  NEUTRAL_NO_MARKS_FOUND_NOTE,
  type MarkResearchResult 
} from '../services/aiVisionService';
import { processImageFile, type ProcessedImage } from '../utils/image';
import { 
  X, 
  Camera, 
  Upload, 
  Sparkles, 
  Search, 
  Loader2, 
  Info, 
  FileCheck2,
  RefreshCw,
  Plus,
  Calendar
} from 'lucide-react';

interface ResearchMarksModalProps {
  isOpen: boolean;
  onClose: () => void;
  category?: Category;
  makerHint?: string;
  itemTitle?: string;
  onApplyResults: (
    results: MarkResearchResult,
    mode: 'append' | 'replace'
  ) => void;
  onOpenApiKeyPrompt?: () => void;
}

export const ResearchMarksModal: React.FC<ResearchMarksModalProps> = ({
  isOpen,
  onClose,
  category,
  makerHint = '',
  itemTitle = '',
  onApplyResults,
  onOpenApiKeyPrompt,
}) => {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedImage, setSelectedImage] = useState<string>('');
  const [imageStats, setImageStats] = useState<string>('');
  const [hint, setHint] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState<MarkResearchResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Always require a brand new photograph whenever the modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedImage('');
      setImageStats('');
      setHint(makerHint || itemTitle || '');
      setResults(null);
      setErrorMessage(null);
    }
  }, [isOpen, makerHint, itemTitle]);

  if (!isOpen) return null;

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const processed: ProcessedImage = await processImageFile(file);
      setSelectedImage(processed.fullDataUrl);
      const kb = Math.round(processed.fullBlob.size / 1024);
      setImageStats(`${processed.width}x${processed.height}px (${kb} KB downscaled)`);
      setResults(null);
      setErrorMessage(null);
    } catch (err) {
      console.error('Failed to process image file:', err);
      setErrorMessage('Failed to process image. Please try another file.');
    } finally {
      // Clear input so same file can be re-selected if desired
      e.target.value = '';
    }
  };

  const handleExecuteResearch = async () => {
    if (!selectedImage) {
      setErrorMessage('Please capture or upload a close-up image of the mark, base, or signature.');
      return;
    }

    if (!isGeminiKeyConfigured()) {
      onOpenApiKeyPrompt?.();
      return;
    }

    setIsAnalyzing(true);
    setErrorMessage(null);

    try {
      const res = await researchMarksWithAI(selectedImage, hint.trim() || undefined, category);
      setResults(res);
    } catch (err: any) {
      console.error('Mark research failed:', err);
      if (err?.message?.includes('GEMINI_API_KEY_REQUIRED')) {
        onOpenApiKeyPrompt?.();
      } else {
        setErrorMessage(err?.message || 'AI mark research failed. Please check your network and API key.');
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleApply = (mode: 'append' | 'replace') => {
    if (!results) return;
    onApplyResults(results, mode);
    onClose();
  };

  const hasDetectedMarks = Boolean(results && results.detectedMarks && results.detectedMarks.length > 0);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div 
        className="bg-[#faf8f5] w-full max-w-2xl rounded-2xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-100 text-amber-900">
              <Search className="w-5 h-5 text-amber-800" />
            </div>
            <div>
              <h2 className="text-base font-serif font-bold text-stone-900">
                Research Marks, Hallmarks & Signatures
              </h2>
              <p className="text-xs text-stone-500 font-sans">
                Curator AI mark identification and registry attribution
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100 transition"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Hidden File Inputs */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleFileSelected}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileSelected}
        />

        {/* Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs text-stone-700">
          
          {/* Informative Guidance Banner */}
          <div className="p-3.5 bg-amber-50/80 border border-amber-200/70 rounded-xl space-y-2 text-amber-950">
            <div className="flex items-center gap-1.5 font-semibold text-amber-900 text-xs">
              <Camera className="w-4 h-4 text-amber-800" />
              <span>A New Photograph of the Mark or Identifier is Required:</span>
            </div>
            <p className="text-[11px] text-stone-600 leading-relaxed">
              To accurately inspect hallmarks, backstamps, or signatures, please provide a clear, focused new photograph specifically showing:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-[11px]">
              <div className="bg-white/80 p-2 rounded-lg border border-amber-200/50 flex items-start gap-1.5">
                <span className="font-bold text-amber-800">🏺 Base / Underside:</span>
                <span className="text-stone-600">Porcelain factory backstamps, impressed marks, kiln initials, or shape codes.</span>
              </div>
              <div className="bg-white/80 p-2 rounded-lg border border-amber-200/50 flex items-start gap-1.5">
                <span className="font-bold text-amber-800">🏷️ Hallmarks:</span>
                <span className="text-stone-600">Silver/gold assay punches, town marks, purity numerals (e.g. 925), maker's initials.</span>
              </div>
              <div className="bg-white/80 p-2 rounded-lg border border-amber-200/50 flex items-start gap-1.5">
                <span className="font-bold text-amber-800">✍️ Signatures:</span>
                <span className="text-stone-600">Artist signatures, monograms, estate stamps, or paper exhibition labels on art.</span>
              </div>
              <div className="bg-white/80 p-2 rounded-lg border border-amber-200/50 flex items-start gap-1.5">
                <span className="font-bold text-amber-800">⚙️ Movement / Kite:</span>
                <span className="text-stone-600">Clock escapement stamps, diamond registration marks (Rd. No.), foundry plates.</span>
              </div>
            </div>
          </div>

          {/* Image Capture & Upload Section */}
          <div className="space-y-2.5">
            <label className="block text-xs font-mono uppercase tracking-wider text-stone-700 font-semibold">
              New Mark Photograph (Required)
            </label>

            {selectedImage ? (
              <div className="p-3 bg-white border border-stone-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                      New Mark Photo Loaded
                    </span>
                    {imageStats && (
                      <span className="text-[11px] text-stone-400 font-mono">
                        {imageStats}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => cameraInputRef.current?.click()}
                      className="px-2.5 py-1 text-[11px] font-medium bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-md transition flex items-center gap-1 cursor-pointer"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>Take Different Photo</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-2.5 py-1 text-[11px] font-medium bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-md transition flex items-center gap-1 cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload Different File</span>
                    </button>
                  </div>
                </div>

                <div className="flex justify-center bg-stone-100/70 p-2 rounded-lg border border-stone-200/70">
                  <img
                    src={selectedImage}
                    alt="Close-up of mark or signature"
                    className="max-h-56 object-contain rounded-md shadow-xs"
                  />
                </div>
              </div>
            ) : (
              <div className="p-6 bg-white border-2 border-dashed border-stone-300 hover:border-amber-500/50 rounded-xl text-center space-y-3 transition">
                <div className="flex justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className="px-4 py-2.5 bg-amber-800 hover:bg-amber-900 text-white rounded-xl font-medium text-xs flex items-center gap-2 shadow-xs transition cursor-pointer"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Take New Photo of Mark</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-300 rounded-xl font-medium text-xs flex items-center gap-2 transition cursor-pointer"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Upload New Mark Image</span>
                  </button>
                </div>
                <p className="text-[11px] text-stone-500">
                  Please capture or select a focused close-up photo of the mark, base, hallmark, or signature.
                </p>
              </div>
            )}
          </div>

          {/* Optional Collector Context / Hints */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-mono uppercase tracking-wider text-stone-700 font-semibold">
                Known Maker, Mark Hint, or Inscription (Optional)
              </label>
              {category && (
                <span className="text-[11px] font-mono text-stone-500">
                  Context: {category}
                </span>
              )}
            </div>
            <input
              type="text"
              value={hint}
              onChange={(e) => setHint(e.target.value)}
              placeholder="e.g. Birmingham Anchor, 'W. Moorcroft', 925, or partial monogram initials"
              className="w-full px-3 py-2 text-xs bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-700/40"
            />
            <p className="text-[10px] text-stone-400">
              Provide any letters or maker names visible to the naked eye to assist AI cross-referencing.
            </p>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-start gap-2">
              <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Research Button */}
          <div>
            <button
              type="button"
              onClick={handleExecuteResearch}
              disabled={isAnalyzing || !selectedImage}
              className="w-full py-2.5 px-4 rounded-xl font-medium text-xs flex items-center justify-center gap-2 bg-amber-800 hover:bg-amber-900 text-white shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Inspecting marks, hallmarks & registries with AI...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>{results ? 'Re-Analyze Marks with AI' : 'Research Marks with AI'}</span>
                </>
              )}
            </button>
          </div>

          {/* Results Display */}
          {results && (
            <div className="mt-4 pt-4 border-t border-stone-200 space-y-3 animate-in fade-in duration-200">
              {hasDetectedMarks ? (
                <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-bold text-emerald-900 text-xs">
                      <FileCheck2 className="w-4 h-4 text-emerald-700" />
                      <span>Identified Marks ({results.detectedMarks.length})</span>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-full">
                      Verified Match
                    </span>
                  </div>

                  {/* Badges for Detected Marks */}
                  <div className="flex flex-wrap gap-1.5">
                    {results.detectedMarks.map((mark, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 bg-white border border-emerald-300 rounded-lg text-xs font-mono font-medium text-emerald-800 shadow-2xs"
                      >
                        {mark}
                      </span>
                    ))}
                  </div>

                  {/* Determined Period or Date Range */}
                  {results.periodOrYear && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 rounded-lg border border-amber-200/80 text-xs">
                      <Calendar className="w-3.5 h-3.5 text-amber-800 flex-shrink-0" />
                      <span className="font-semibold text-amber-900">Determined Period / Year:</span>
                      <span className="font-mono font-bold text-amber-950 bg-white px-2 py-0.5 rounded border border-amber-300">
                        {results.periodOrYear}
                      </span>
                      <span className="text-[10px] text-amber-700 italic ml-auto hidden sm:inline">
                        Will update Period/Year field
                      </span>
                    </div>
                  )}

                  {/* Research Notes */}
                  <div className="p-3 bg-white rounded-lg border border-emerald-200/70 text-xs leading-relaxed text-stone-800 font-sans">
                    {results.notes}
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-stone-100 border border-stone-300 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-stone-800 font-bold text-xs">
                    <Info className="w-4 h-4 text-stone-500" />
                    <span>No Distinctive Marks or Signatures Detected</span>
                  </div>
                  <p className="text-xs text-stone-600 leading-relaxed italic bg-white p-3 rounded-lg border border-stone-200">
                    "{results.notes || NEUTRAL_NO_MARKS_FOUND_NOTE}"
                  </p>
                  <p className="text-[11px] text-stone-500">
                    If this piece has an impressed mark or worn signature, try taking a closer macro shot with angled lighting.
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleApply('append')}
                  className="w-full sm:w-1/2 py-2 px-3 text-xs font-medium rounded-lg bg-amber-800 hover:bg-amber-900 text-white flex items-center justify-center gap-1.5 shadow-xs transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Append to Curator Remarks</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleApply('replace')}
                  className="w-full sm:w-1/2 py-2 px-3 text-xs font-medium rounded-lg bg-stone-200 hover:bg-stone-300 text-stone-800 flex items-center justify-center gap-1.5 transition"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Replace Curator Remarks</span>
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="flex-shrink-0 px-6 py-3.5 border-t border-stone-200 bg-white flex items-center justify-between">
          <div className="text-[11px] text-stone-500">
            Powered by Google Gemini 2.5 Flash Vision
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-100 rounded-lg transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
