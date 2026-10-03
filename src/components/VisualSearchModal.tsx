import React, { useState, useRef } from 'react';
import type { Item } from '../types/schema';
import { 
  compareImageWithStoredItems, 
  sanitizeModelOrPattern,
  type VisualComparisonResult 
} from '../services/aiVisionService';
import { processImageFile } from '../utils/image';
import { 
  X, 
  Camera, 
  Upload, 
  Sparkles, 
  Eye, 
  ChevronRight,
  ChevronLeft,
  Loader2,
  FileCheck
} from 'lucide-react';

interface VisualSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  storedItems: Item[];
  onSelectExistingItem: (item: Item) => void;
  onUseMatchForNewItem: (imageBlob: Blob, previewUrl: string, suggested: Partial<Item>) => void;
}

export const VisualSearchModal: React.FC<VisualSearchModalProps> = ({
  isOpen,
  onClose,
  storedItems,
  onSelectExistingItem,
  onUseMatchForNewItem,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [candidateImage, setCandidateImage] = useState<string>('');
  const [candidateBlob, setCandidateBlob] = useState<Blob | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState<VisualComparisonResult[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const processed = await processImageFile(file);
      setCandidateImage(processed.fullDataUrl);
      setCandidateBlob(processed.fullBlob);
      setResults([]);
      setCurrentIndex(0);
      runComparison(processed.fullDataUrl);
    } catch (err) {
      console.error('Failed to process candidate image:', err);
      alert('Error loading image for visual comparison.');
    }
  };

  const runComparison = async (imageUrl: string) => {
    setIsAnalyzing(true);
    try {
      const matchResults = await compareImageWithStoredItems(imageUrl, storedItems);
      setResults(matchResults);
      setCurrentIndex(0);
    } catch (err: any) {
      console.error('Visual comparison error:', err);
      alert(err.message || 'Error running visual search against stored items.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const currentMatch = results[currentIndex];

  const handleApplyToNew = () => {
    if (!currentMatch || !candidateBlob) return;
    const cleanPattern = sanitizeModelOrPattern(currentMatch.suggestedPattern);
    onUseMatchForNewItem(candidateBlob, candidateImage, {
      title: `${currentMatch.suggestedMaker || ''} ${cleanPattern || 'Antique Item'}`.trim(),
      category: currentMatch.matchedItem.category,
      maker: currentMatch.suggestedMaker,
      modelOrPattern: cleanPattern,
      periodOrYear: currentMatch.suggestedPeriod,
      notes: `Identified via AI visual comparison with catalog item "${currentMatch.matchedItem.title}". Match score: ${currentMatch.similarityScore}%.`,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div 
        className="bg-[#faf8f5] w-full max-w-3xl rounded-2xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-white">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-100 text-amber-900">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-serif font-bold text-stone-900">
                AI Visual Image Search & Match
              </h2>
              <p className="text-[11px] text-stone-500 font-sans">
                Compare a new photo or backstamp against your stored catalog images
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
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Upload Intake if no image or to replace */}
          <div className="flex flex-col sm:flex-row items-center gap-4 bg-white p-4 rounded-xl border border-stone-200">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              capture="environment"
              className="hidden"
            />
            
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-stone-800 hover:bg-stone-900 text-amber-100 text-xs font-medium shadow-xs transition"
            >
              <Camera className="w-4 h-4" />
              <span>{candidateImage ? 'Take / Upload Different Photo' : 'Upload Image to Compare'}</span>
            </button>

            <span className="text-xs text-stone-500">
              {candidateImage 
                ? 'Image loaded. AI visual comparator analyzing catalog items.' 
                : 'Snap a maker backstamp, hallmark, wood grain, or item silhouette.'}
            </span>
          </div>

          {/* Loading State */}
          {isAnalyzing && (
            <div className="py-16 text-center bg-white rounded-xl border border-stone-200">
              <Loader2 className="w-8 h-8 text-amber-700 animate-spin mx-auto mb-3" />
              <h3 className="text-sm font-serif font-semibold text-stone-800">
                Analyzing visual characteristics...
              </h3>
              <p className="text-xs text-stone-500 mt-1">
                Comparing hallmark marks, proportions, and materials against {storedItems.length} stored catalog records.
              </p>
            </div>
          )}

          {/* Results Side-by-Side Comparison */}
          {!isAnalyzing && candidateImage && currentMatch && (
            <div className="space-y-4">
              
              {/* Pagination controls if multiple candidates */}
              {results.length > 1 && (
                <div className="flex items-center justify-between px-2">
                  <span className="text-xs font-mono text-stone-500">
                    Match {currentIndex + 1} of {results.length} candidates
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      disabled={currentIndex === 0}
                      onClick={() => setCurrentIndex((prev) => prev - 1)}
                      className="p-1 rounded bg-white border border-stone-200 text-stone-600 disabled:opacity-30 hover:bg-stone-50 text-xs flex items-center gap-1"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" /> Prev
                    </button>
                    <button
                      disabled={currentIndex === results.length - 1}
                      onClick={() => setCurrentIndex((prev) => prev + 1)}
                      className="p-1 rounded bg-white border border-stone-200 text-stone-600 disabled:opacity-30 hover:bg-stone-50 text-xs flex items-center gap-1"
                    >
                      Next <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* Side-by-Side Images */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Candidate Image */}
                <div className="bg-white p-3.5 rounded-xl border border-stone-200 flex flex-col">
                  <div className="text-[11px] font-mono uppercase tracking-wider text-stone-500 mb-2 font-semibold">
                    New Uploaded Image
                  </div>
                  <div className="relative aspect-[4/3] rounded-lg overflow-hidden bg-stone-100 border border-stone-200 flex items-center justify-center">
                    <img
                      src={candidateImage}
                      alt=""
                      aria-hidden="true"
                      className="absolute inset-0 w-full h-full object-cover blur-md opacity-25 scale-110 pointer-events-none"
                    />
                    <img
                      src={candidateImage}
                      alt="Candidate"
                      className="relative z-1 w-full h-full object-contain object-center p-2"
                    />
                  </div>
                  <div className="mt-2 text-xs text-stone-600">
                    Target query photograph
                  </div>
                </div>

                {/* Stored Matched Item */}
                <div className="bg-white p-3.5 rounded-xl border border-stone-200 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-[11px] font-mono uppercase tracking-wider text-stone-500 font-semibold">
                        Matched Stored Item
                      </div>
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                        {currentMatch.similarityScore}% Match
                      </span>
                    </div>

                    <div className="relative aspect-[4/3] rounded-lg overflow-hidden bg-stone-100 border border-stone-200 flex items-center justify-center">
                      {currentMatch.matchedItem.primaryImageUrl ? (
                        <>
                          <img
                            src={currentMatch.matchedItem.primaryImageUrl}
                            alt=""
                            aria-hidden="true"
                            className="absolute inset-0 w-full h-full object-cover blur-md opacity-25 scale-110 pointer-events-none"
                          />
                          <img
                            src={currentMatch.matchedItem.primaryImageUrl}
                            alt={currentMatch.matchedItem.title}
                            className="relative z-1 w-full h-full object-contain object-center p-2"
                          />
                        </>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-stone-400">
                          No Image
                        </div>
                      )}
                    </div>

                    <div className="mt-3">
                      <span className="text-[10px] font-mono uppercase text-amber-800 font-semibold block">
                        {currentMatch.matchedItem.category}
                      </span>
                      <h4 className="font-serif font-bold text-stone-900 text-sm line-clamp-1">
                        {currentMatch.matchedItem.title}
                      </h4>
                      <p className="text-xs text-stone-600 mt-0.5">
                        {currentMatch.matchedItem.maker} &bull; {currentMatch.matchedItem.modelOrPattern || '—'} ({currentMatch.matchedItem.periodOrYear || '—'})
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 pt-2 border-t border-stone-100 flex items-center justify-between">
                    <button
                      onClick={() => {
                        onSelectExistingItem(currentMatch.matchedItem);
                        onClose();
                      }}
                      className="text-xs text-amber-800 hover:text-amber-950 font-medium flex items-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      View Full Record
                    </button>
                    <span className="text-xs font-mono font-semibold text-stone-800">
                      Est. £{(currentMatch.matchedItem.estimatedValue || 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* AI Visual Explanation Card */}
              <div className="bg-amber-50/60 p-4 rounded-xl border border-amber-200/80 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold uppercase font-mono tracking-wider text-amber-900">
                  <Sparkles className="w-3.5 h-3.5 text-amber-700" />
                  AI Comparative Analysis
                </div>
                <p className="text-xs text-stone-700 leading-relaxed">
                  {currentMatch.visualAnalysis}
                </p>

                {currentMatch.matchedFeatures.length > 0 && (
                  <div className="pt-2 flex flex-wrap gap-1.5 items-center">
                    <span className="text-[11px] font-mono text-stone-500">Correlated features:</span>
                    {currentMatch.matchedFeatures.map((feat) => (
                      <span 
                        key={feat}
                        className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-white border border-amber-200 text-stone-800 shadow-2xs"
                      >
                        ✓ {feat}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="pt-3 border-t border-stone-200 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs text-stone-600 hover:text-stone-900 font-medium flex items-center gap-1"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Upload Another Image
                </button>

                <button
                  type="button"
                  onClick={handleApplyToNew}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-stone-800 hover:bg-stone-900 text-amber-100 text-xs font-medium shadow transition"
                >
                  <FileCheck className="w-4 h-4 text-emerald-300" />
                  <span>Catalog as New Item with Matched Details</span>
                </button>
              </div>

            </div>
          )}

          {/* Empty Prompt if no image loaded yet */}
          {!candidateImage && (
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="cursor-pointer border-2 border-dashed border-stone-300 hover:border-amber-700/60 rounded-2xl p-12 text-center bg-white hover:bg-amber-50/20 transition flex flex-col items-center justify-center"
            >
              <Camera className="w-10 h-10 text-stone-400 mb-2" />
              <h3 className="font-serif font-semibold text-stone-800 text-base">
                Select or Capture an Antique Photograph
              </h3>
              <p className="text-xs text-stone-500 max-w-sm mt-1">
                The AI will inspect maker stamps, signatures, or contours and cross-reference them with your catalog items.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
