import React, { useState, useEffect, useRef } from 'react';
import type { Item, Category, Condition } from '../types/schema';
import { CATEGORIES, CONDITIONS } from '../types/schema';
import { processImageFile, type ProcessedImage } from '../utils/image';
import { uploadItemImage } from '../services/storageService';
import { 
  getSubcategoriesForCategory, 
  addUserSubcategory, 
  removeUserSubcategory, 
  getCustomSubcategoriesForCategory 
} from '../services/subcategoryService';
import { 
  analyzeImageAndCompleteDetails, 
  enhanceDescriptionWithAI, 
  isGeminiKeyConfigured,
  sanitizeModelOrPattern,
  type AnalyzedItemDetails 
} from '../services/aiVisionService';
import { AIVisionSettingsModal } from './AIVisionSettingsModal';
import { GeminiApiKeyPromptModal } from './GeminiApiKeyPromptModal';
import { ResearchMarksModal } from './ResearchMarksModal';
import { 
  X, 
  Upload, 
  Camera, 
  Check, 
  Loader2, 
  Plus,
  Sparkles,
  Settings,
  Undo2
} from 'lucide-react';

interface ItemFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: Item) => Promise<void>;
  itemToEdit?: Item | null;
}

export const ItemFormModal: React.FC<ItemFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  itemToEdit,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [pendingBlob, setPendingBlob] = useState<Blob | null>(null);
  const [imageStats, setImageStats] = useState<string>('');

  // AI Appraisal State
  const [isAnalyzingAi, setIsAnalyzingAi] = useState(false);
  const [aiSuccessBanner, setAiSuccessBanner] = useState<{ confidence: number; detectedMarks: string[] } | null>(null);
  const [backupFormData, setBackupFormData] = useState<any>(null);
  const [isAiSettingsOpen, setIsAiSettingsOpen] = useState(false);
  const [isApiKeyPromptOpen, setIsApiKeyPromptOpen] = useState(false);
  const [apiKeyPromptFeature, setApiKeyPromptFeature] = useState('AI Visual Appraisal');
  const [isEnhancingDescription, setIsEnhancingDescription] = useState(false);
  const [isResearchMarksModalOpen, setIsResearchMarksModalOpen] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<Category>('Ceramics & Porcelain');
  const [subcategory, setSubcategory] = useState('');
  const [availableSubcategories, setAvailableSubcategories] = useState<string[]>([]);
  const [isAddingSubcat, setIsAddingSubcat] = useState(false);
  const [newSubcatName, setNewSubcatName] = useState('');
  const [maker, setMaker] = useState('');
  const [modelOrPattern, setModelOrPattern] = useState('');
  const [periodOrYear, setPeriodOrYear] = useState('');
  const [condition, setCondition] = useState<Condition>('Good');
  const [conditionNotes, setConditionNotes] = useState('');
  const [dimHeight, setDimHeight] = useState<string>('');
  const [dimWidth, setDimWidth] = useState<string>('');
  const [dimDepth, setDimDepth] = useState<string>('');
  const [dimUnit, setDimUnit] = useState<'cm' | 'in'>('cm');
  const [acquisitionDate, setAcquisitionDate] = useState('');
  const [acquisitionLocation, setAcquisitionLocation] = useState('');
  const [acquisitionCost, setAcquisitionCost] = useState<string>('');
  const [currency, setCurrency] = useState<'GBP' | 'USD' | 'EUR'>('GBP');
  const [estimatedValue, setEstimatedValue] = useState<string>('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');

  // Load subcategories whenever category changes
  useEffect(() => {
    const list = getSubcategoriesForCategory(category);
    setAvailableSubcategories(list);
  }, [category]);

  useEffect(() => {
    if (itemToEdit) {
      setTitle(itemToEdit.title || '');
      setCategory(itemToEdit.category || 'Ceramics & Porcelain');
      setSubcategory(itemToEdit.subcategory || '');
      setMaker(itemToEdit.maker || '');
      setModelOrPattern(sanitizeModelOrPattern(itemToEdit.modelOrPattern) || '');
      setPeriodOrYear(itemToEdit.periodOrYear || '');
      setCondition(itemToEdit.condition || 'Good');
      setConditionNotes(itemToEdit.conditionNotes || '');
      setDimHeight(itemToEdit.dimensions?.height ? String(itemToEdit.dimensions.height) : '');
      setDimWidth(itemToEdit.dimensions?.width ? String(itemToEdit.dimensions.width) : '');
      setDimDepth(itemToEdit.dimensions?.depth ? String(itemToEdit.dimensions.depth) : '');
      setDimUnit(itemToEdit.dimensions?.unit || 'cm');
      setAcquisitionDate(itemToEdit.acquisitionDate || '');
      setAcquisitionLocation(itemToEdit.acquisitionLocation || '');
      setAcquisitionCost(itemToEdit.acquisitionCost !== undefined ? String(itemToEdit.acquisitionCost) : '');
      setCurrency(itemToEdit.currency || 'GBP');
      setEstimatedValue(itemToEdit.estimatedValue !== undefined ? String(itemToEdit.estimatedValue) : '');
      setDescription(itemToEdit.description || '');
      setNotes(itemToEdit.notes || '');
      setImagePreview(itemToEdit.primaryImageUrl || '');
      setPendingBlob(null);
      setImageStats('');
      setIsAddingSubcat(false);
      setNewSubcatName('');
    } else {
      // Defaults for new item
      setTitle('');
      setCategory('Ceramics & Porcelain');
      setSubcategory('');
      setMaker('');
      setModelOrPattern('');
      setPeriodOrYear('');
      setCondition('Good');
      setConditionNotes('');
      setDimHeight('');
      setDimWidth('');
      setDimDepth('');
      setDimUnit('cm');
      setAcquisitionDate(new Date().toISOString().split('T')[0]);
      setAcquisitionLocation('');
      setAcquisitionCost('');
      setCurrency('GBP');
      setEstimatedValue('');
      setDescription('');
      setNotes('');
      setImagePreview('');
      setPendingBlob(null);
      setImageStats('');
      setIsAddingSubcat(false);
      setNewSubcatName('');
    }
  }, [itemToEdit, isOpen]);

  if (!isOpen) return null;

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const processed: ProcessedImage = await processImageFile(file);
      setImagePreview(processed.fullDataUrl);
      setPendingBlob(processed.fullBlob);
      const kb = Math.round(processed.fullBlob.size / 1024);
      setImageStats(`${processed.width}x${processed.height}px (${kb} KB downscaled)`);
    } catch (err) {
      console.error('Failed to process image:', err);
      alert('Error processing image. Please try another file.');
    }
  };

  const handleAiAnalyzeImage = async () => {
    if (!imagePreview) {
      fileInputRef.current?.click();
      return;
    }

    if (!isGeminiKeyConfigured()) {
      setApiKeyPromptFeature('AI Auto-Complete Details');
      setIsApiKeyPromptOpen(true);
      return;
    }

    // Backup current state to enable Undo
    setBackupFormData({
      title,
      category,
      subcategory,
      maker,
      modelOrPattern,
      periodOrYear,
      condition,
      conditionNotes,
      dimHeight,
      dimWidth,
      dimDepth,
      dimUnit,
      currency,
      estimatedValue,
      description,
      notes,
    });

    setIsAnalyzingAi(true);
    setAiSuccessBanner(null);

    try {
      const result: AnalyzedItemDetails = await analyzeImageAndCompleteDetails(imagePreview, {
        title,
        category,
        subcategory,
        maker,
        modelOrPattern: sanitizeModelOrPattern(modelOrPattern),
        periodOrYear,
        condition,
        conditionNotes,
        description,
        notes,
        estimatedValue: estimatedValue ? parseFloat(estimatedValue) : undefined,
      });

      if (result.title) setTitle(result.title);
      if (result.category) {
        setCategory(result.category);
        const subList = getSubcategoriesForCategory(result.category);
        setAvailableSubcategories(subList);
      }
      if (result.subcategory) setSubcategory(result.subcategory);
      if (result.maker) setMaker(result.maker);
      if (result.modelOrPattern) {
        const cleanPattern = sanitizeModelOrPattern(result.modelOrPattern);
        if (cleanPattern) {
          setModelOrPattern(cleanPattern);
        }
      }
      if (result.periodOrYear) setPeriodOrYear(result.periodOrYear);
      if (result.condition) setCondition(result.condition);
      if (result.conditionNotes) setConditionNotes(result.conditionNotes);
      if (result.dimensions?.height) setDimHeight(String(result.dimensions.height));
      if (result.dimensions?.width) setDimWidth(String(result.dimensions.width));
      if (result.dimensions?.depth) setDimDepth(String(result.dimensions.depth));
      if (result.dimensions?.unit) setDimUnit(result.dimensions.unit);
      if (result.estimatedValue) setEstimatedValue(String(result.estimatedValue));
      if (result.currency) setCurrency(result.currency);
      if (result.description) setDescription(result.description);
      if (result.notes) setNotes(result.notes);

      setAiSuccessBanner({
        confidence: result.confidenceScore || 90,
        detectedMarks: result.detectedMarks || [],
      });
    } catch (err: any) {
      console.error('AI Appraisal failed:', err);
      if (err?.message?.includes('GEMINI_API_KEY_REQUIRED')) {
        setApiKeyPromptFeature('AI Auto-Complete Details');
        setIsApiKeyPromptOpen(true);
      } else {
        alert(`AI Analysis failed: ${err?.message || err}`);
      }
    } finally {
      setIsAnalyzingAi(false);
    }
  };

  const handleUndoAiFill = () => {
    if (!backupFormData) return;
    setTitle(backupFormData.title);
    setCategory(backupFormData.category);
    setSubcategory(backupFormData.subcategory);
    setMaker(backupFormData.maker);
    setModelOrPattern(backupFormData.modelOrPattern);
    setPeriodOrYear(backupFormData.periodOrYear);
    setCondition(backupFormData.condition);
    setConditionNotes(backupFormData.conditionNotes);
    setDimHeight(backupFormData.dimHeight);
    setDimWidth(backupFormData.dimWidth);
    setDimDepth(backupFormData.dimDepth);
    setDimUnit(backupFormData.dimUnit);
    setCurrency(backupFormData.currency);
    setEstimatedValue(backupFormData.estimatedValue);
    setDescription(backupFormData.description);
    setNotes(backupFormData.notes);
    setBackupFormData(null);
    setAiSuccessBanner(null);
  };

  const handleEnhanceDescription = async () => {
    if (!imagePreview && !title && !description) {
      alert('Please upload an image, enter an item title, or provide some initial notes first.');
      return;
    }

    if (!isGeminiKeyConfigured()) {
      setApiKeyPromptFeature('Polish & Expand Description');
      setIsApiKeyPromptOpen(true);
      return;
    }

    setIsEnhancingDescription(true);
    try {
      const enhanced = await enhanceDescriptionWithAI(imagePreview || undefined, {
        title,
        category,
        subcategory,
        maker,
        modelOrPattern,
        periodOrYear,
        condition,
        conditionNotes,
        description,
        notes,
      });
      setDescription(enhanced);
    } catch (err: any) {
      console.error('Enhance description failed:', err);
      if (err?.message?.includes('GEMINI_API_KEY_REQUIRED')) {
        setApiKeyPromptFeature('Polish & Expand Description');
        setIsApiKeyPromptOpen(true);
      } else {
        alert(`Could not polish description: ${err?.message || err}`);
      }
    } finally {
      setIsEnhancingDescription(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('Please enter an item title');
      return;
    }

    setIsSubmitting(true);
    try {
      const itemId = itemToEdit?.id || 'item-' + Date.now();
      let finalImageUrl = imagePreview;

      // If a new photo was selected, upload it
      if (pendingBlob) {
        finalImageUrl = await uploadItemImage(itemId, pendingBlob, 'primary.jpg');
      }

      const itemData: Item = {
        id: itemId,
        title: title.trim(),
        category,
        subcategory: subcategory.trim() || undefined,
        maker: maker.trim() || undefined,
        modelOrPattern: sanitizeModelOrPattern(modelOrPattern) || undefined,
        periodOrYear: periodOrYear.trim() || undefined,
        condition,
        conditionNotes: conditionNotes.trim() || undefined,
        dimensions: {
          height: dimHeight ? parseFloat(dimHeight) : undefined,
          width: dimWidth ? parseFloat(dimWidth) : undefined,
          depth: dimDepth ? parseFloat(dimDepth) : undefined,
          unit: dimUnit,
        },
        acquisitionDate: acquisitionDate || undefined,
        acquisitionCost: acquisitionCost ? parseFloat(acquisitionCost) : undefined,
        acquisitionLocation: acquisitionLocation.trim() || undefined,
        currency,
        estimatedValue: estimatedValue ? parseFloat(estimatedValue) : undefined,
        description: description.trim() || undefined,
        notes: notes.trim() || undefined,
        primaryImageUrl: finalImageUrl || undefined,
        createdAt: itemToEdit?.createdAt || Date.now(),
        updatedAt: Date.now(),
      };

      await onSave(itemData);
      onClose();
    } catch (err) {
      console.error('Failed to save item:', err);
      alert('Failed to save item. Check console for details.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div 
        className="bg-[#faf8f5] w-full max-w-2xl rounded-2xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-white">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-serif font-bold text-stone-900">
              {itemToEdit ? 'Edit Antique Record' : 'Catalog New Antique'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form id="item-catalog-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Photo Intake */}
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-stone-700 font-semibold mb-2">
              Primary Photograph
            </label>
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="w-full sm:w-48 h-36 rounded-xl border-2 border-dashed border-stone-300 hover:border-amber-700/60 bg-stone-100/70 hover:bg-amber-50/30 flex flex-col items-center justify-center cursor-pointer transition overflow-hidden relative group p-1"
              >
                {imagePreview ? (
                  <>
                    <img
                      src={imagePreview}
                      alt=""
                      aria-hidden="true"
                      className="absolute inset-0 w-full h-full object-cover blur-md opacity-25 scale-110 pointer-events-none"
                    />
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="relative z-1 w-full h-full object-contain object-center"
                    />
                    <div className="absolute inset-0 z-10 bg-stone-900/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xs font-medium backdrop-blur-2xs">
                      Change Photo
                    </div>
                  </>
                ) : (
                  <div className="text-center p-3">
                    <Camera className="w-6 h-6 text-stone-400 mx-auto mb-1 group-hover:text-amber-700 transition" />
                    <span className="text-xs text-stone-600 font-medium block">
                      Click to upload
                    </span>
                    <span className="text-[10px] text-stone-400 block mt-0.5">
                      Auto-resized on device
                    </span>
                  </div>
                )}
              </div>

              <div className="flex-1 w-full text-xs text-stone-600 space-y-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageFileChange}
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-lg border border-stone-300 bg-white hover:bg-stone-50 font-medium text-stone-700 flex items-center gap-1.5 transition"
                >
                  <Upload className="w-3.5 h-3.5 text-stone-500" />
                  Select File or Take Photo
                </button>
                {imageStats && (
                  <div className="text-[11px] font-mono text-emerald-700 bg-emerald-50 px-2 py-1 rounded border border-emerald-200 inline-block">
                    ✓ {imageStats}
                  </div>
                )}
                {imagePreview ? (
                  <div className="pt-1 flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={handleAiAnalyzeImage}
                      disabled={isAnalyzingAi}
                      className="px-3.5 py-1.5 bg-gradient-to-r from-amber-800 to-stone-900 hover:from-amber-900 hover:to-stone-950 text-amber-100 rounded-lg font-medium text-xs shadow-xs flex items-center gap-1.5 transition hover:scale-[1.01] disabled:opacity-60"
                      title="Analyze this photograph using Google Gemini to auto-complete all fields (title, category, maker, period, condition, valuation, dimensions, and description)"
                    >
                      {isAnalyzingAi ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-300" />
                          <span>Gemini Analyzing Object & Marks...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                          <span>Auto-Complete All Fields</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsAiSettingsOpen(true)}
                      className="p-1.5 text-stone-500 hover:text-stone-800 hover:bg-stone-200/60 rounded-lg border border-stone-300 bg-white transition"
                      title="Google Gemini AI Settings"
                    >
                      <Settings className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <p className="text-[11px] text-stone-500">
                    Images are client-side optimized before storage. Once uploaded, you can use Google Gemini to auto-complete all fields.
                  </p>
                )}
              </div>
            </div>

            {/* AI Appraisal Success Banner */}
            {aiSuccessBanner && (
              <div className="mt-3 p-3 bg-amber-50/95 border border-amber-300 rounded-xl text-xs text-amber-950 flex items-start justify-between gap-3 animate-in fade-in duration-200 shadow-2xs">
                <div className="flex items-start gap-2.5">
                  <Sparkles className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold block text-stone-900">
                      AI Visual Appraisal Applied ({aiSuccessBanner.confidence}% confidence)
                    </span>
                    <span className="text-[11px] text-stone-600 block">
                      Title, maker, period, valuation, and comprehensive description filled from visual analysis.
                    </span>
                    {aiSuccessBanner.detectedMarks && aiSuccessBanner.detectedMarks.length > 0 && (
                      <span className="block text-[11px] text-amber-900 font-mono mt-1 bg-amber-100/70 px-2 py-0.5 rounded">
                        Detected: {aiSuccessBanner.detectedMarks.join(' • ')}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {backupFormData && (
                    <button
                      type="button"
                      onClick={handleUndoAiFill}
                      className="px-2.5 py-1 text-[11px] font-semibold text-stone-700 bg-white border border-stone-300 hover:bg-stone-50 rounded-lg shadow-2xs flex items-center gap-1"
                      title="Revert form back to values before AI fill"
                    >
                      <Undo2 className="w-3 h-3 text-stone-500" />
                      Undo
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setAiSuccessBanner(null)}
                    className="p-1 text-stone-400 hover:text-stone-700 rounded"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Title, Category & Subcategory */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-3">
              <label className="block text-xs font-mono uppercase tracking-wider text-stone-700 font-semibold mb-1">
                Item Title *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Royal Doulton 'The Old Balloon Seller'"
                className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-700/40"
              />
            </div>

            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-stone-700 font-semibold mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => {
                  const newCat = e.target.value as Category;
                  setCategory(newCat);
                  setSubcategory('');
                  setIsAddingSubcat(false);
                }}
                className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-700/40"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-mono uppercase tracking-wider text-stone-700 font-semibold">
                  Subcategory {category === 'Ceramics & Porcelain' && <span className="text-amber-800 font-normal">(e.g. Moorcroft, Japanese)</span>}
                </label>
                {!isAddingSubcat && (
                  <button
                    type="button"
                    onClick={() => setIsAddingSubcat(true)}
                    className="text-[11px] text-amber-800 hover:text-amber-950 font-medium flex items-center gap-0.5"
                  >
                    <Plus className="w-3 h-3" />
                    <span>New Subcategory</span>
                  </button>
                )}
              </div>

              {isAddingSubcat ? (
                <div className="flex items-center gap-1.5 animate-in fade-in duration-150">
                  <input
                    type="text"
                    value={newSubcatName}
                    onChange={(e) => setNewSubcatName(e.target.value)}
                    placeholder="Enter new subcategory name..."
                    className="flex-1 px-3 py-1.5 text-xs bg-white border border-amber-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-700/40"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      if (newSubcatName.trim()) {
                        const updated = await addUserSubcategory(category, newSubcatName.trim());
                        setAvailableSubcategories(updated);
                        setSubcategory(newSubcatName.trim());
                      }
                      setIsAddingSubcat(false);
                      setNewSubcatName('');
                    }}
                    className="px-2.5 py-1.5 bg-stone-800 hover:bg-stone-900 text-amber-100 text-xs rounded-lg font-medium shadow-xs"
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingSubcat(false);
                      setNewSubcatName('');
                    }}
                    className="px-2 py-1.5 text-xs text-stone-500 hover:text-stone-800 font-medium"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <>
                  <select
                    value={subcategory}
                    onChange={(e) => {
                      if (e.target.value === '__NEW__') {
                        setIsAddingSubcat(true);
                      } else {
                        setSubcategory(e.target.value);
                      }
                    }}
                    className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-700/40"
                  >
                    <option value="">-- None / General --</option>
                    {availableSubcategories.map((sub) => (
                      <option key={sub} value={sub}>{sub}</option>
                    ))}
                    <option value="__NEW__">+ Add Custom Subcategory...</option>
                  </select>

                  {/* Removable Custom Subcategories List */}
                  {getCustomSubcategoriesForCategory(category).length > 0 && (
                    <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-stone-500">
                      <span className="font-mono text-[10px] uppercase text-stone-400">Custom:</span>
                      {getCustomSubcategoriesForCategory(category).map((customSub) => (
                        <span 
                          key={customSub} 
                          className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-900 border border-amber-200/80 rounded-md font-medium"
                        >
                          {customSub}
                          <button
                            type="button"
                            title={`Delete custom subcategory "${customSub}"`}
                            onClick={async (e) => {
                              e.preventDefault();
                              if (window.confirm(`Delete custom subcategory "${customSub}"?`)) {
                                const updated = await removeUserSubcategory(category, customSub);
                                setAvailableSubcategories(updated);
                                if (subcategory === customSub) setSubcategory('');
                              }
                            }}
                            className="text-stone-400 hover:text-red-600 font-bold ml-0.5 leading-none"
                          >
                            &times;
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Maker, Pattern, Period */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-stone-700 font-semibold mb-1">
                Maker / Studio
              </label>
              <input
                type="text"
                value={maker}
                onChange={(e) => setMaker(e.target.value)}
                placeholder="e.g. Moorcroft, Lalique"
                className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-700/40"
              />
            </div>

            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-stone-700 font-semibold mb-1">
                Pattern / Model No.
              </label>
              <input
                type="text"
                value={modelOrPattern}
                onChange={(e) => setModelOrPattern(e.target.value)}
                placeholder="Optional (leave blank if unknown)"
                className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-700/40 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-stone-700 font-semibold mb-1">
                Period / Year
              </label>
              <input
                type="text"
                value={periodOrYear}
                onChange={(e) => setPeriodOrYear(e.target.value)}
                placeholder="e.g. c. 1930, Victorian"
                className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-700/40"
              />
            </div>
          </div>

          {/* Condition & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-stone-700 font-semibold mb-1">
                Condition
              </label>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value as Condition)}
                className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-700/40"
              >
                {CONDITIONS.map((cond) => (
                  <option key={cond} value={cond}>{cond}</option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-mono uppercase tracking-wider text-stone-700 font-semibold mb-1">
                Condition Remarks
              </label>
              <input
                type="text"
                value={conditionNotes}
                onChange={(e) => setConditionNotes(e.target.value)}
                placeholder="e.g. Minor crazing under base, gilt intact"
                className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-700/40"
              />
            </div>
          </div>

          {/* Dimensions */}
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-stone-700 font-semibold mb-1">
              Dimensions
            </label>
            <div className="grid grid-cols-4 gap-2">
              <input
                type="number"
                step="0.1"
                value={dimHeight}
                onChange={(e) => setDimHeight(e.target.value)}
                placeholder="Height"
                className="px-2.5 py-2 text-sm bg-white border border-stone-300 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-amber-700/40"
              />
              <input
                type="number"
                step="0.1"
                value={dimWidth}
                onChange={(e) => setDimWidth(e.target.value)}
                placeholder="Width"
                className="px-2.5 py-2 text-sm bg-white border border-stone-300 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-amber-700/40"
              />
              <input
                type="number"
                step="0.1"
                value={dimDepth}
                onChange={(e) => setDimDepth(e.target.value)}
                placeholder="Depth"
                className="px-2.5 py-2 text-sm bg-white border border-stone-300 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-amber-700/40"
              />
              <select
                value={dimUnit}
                onChange={(e) => setDimUnit(e.target.value as 'cm' | 'in')}
                className="px-2 py-2 text-sm bg-white border border-stone-300 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-amber-700/40"
              >
                <option value="cm">cm</option>
                <option value="in">in</option>
              </select>
            </div>
          </div>

          {/* Freeform Item Description */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-mono uppercase tracking-wider text-stone-700 font-semibold">
                Item Description
              </label>
              {(imagePreview || title || description) && (
                <button
                  type="button"
                  onClick={handleEnhanceDescription}
                  disabled={isEnhancingDescription}
                  className="text-[11px] text-amber-800 hover:text-amber-950 font-medium flex items-center gap-1 transition disabled:opacity-50"
                  title="Polish and expand this description into museum-grade prose using Google Gemini"
                >
                  {isEnhancingDescription ? (
                    <Loader2 className="w-3 h-3 animate-spin text-amber-700" />
                  ) : (
                    <Sparkles className="w-3 h-3 text-amber-700" />
                  )}
                  <span>Polish & Expand with AI</span>
                </button>
              )}
            </div>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Comprehensive description of the item, aesthetics, subject matter, materials, and overall impression..."
              className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-700/40"
            />
          </div>

          {/* Valuation & Acquisition */}
          <div className="space-y-2.5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider text-stone-700 font-semibold mb-1">
                  Currency
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as 'GBP' | 'USD' | 'EUR')}
                  className="w-full px-2.5 py-2 text-sm bg-white border border-stone-300 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-amber-700/40"
                >
                  <option value="GBP">GBP (£)</option>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider text-stone-700 font-semibold mb-1">
                  Est. Value
                </label>
                <input
                  type="number"
                  value={estimatedValue}
                  onChange={(e) => setEstimatedValue(e.target.value)}
                  placeholder="e.g. 250"
                  className="w-full px-2.5 py-2 text-sm bg-white border border-stone-300 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-amber-700/40"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider text-stone-700 font-semibold mb-1">
                  Cost Basis
                </label>
                <input
                  type="number"
                  value={acquisitionCost}
                  onChange={(e) => setAcquisitionCost(e.target.value)}
                  placeholder="e.g. 80"
                  className="w-full px-2.5 py-2 text-sm bg-white border border-stone-300 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-amber-700/40"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider text-stone-700 font-semibold mb-1">
                  Acquired Date
                </label>
                <input
                  type="date"
                  value={acquisitionDate}
                  onChange={(e) => setAcquisitionDate(e.target.value)}
                  className="w-full px-2 py-2 text-xs bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-700/40"
                />
              </div>
            </div>

            {/* Acquisition Location */}
            <div>
              <label className="block text-[11px] font-mono uppercase tracking-wider text-stone-700 font-semibold mb-1">
                Acquisition Location / Source
              </label>
              <input
                type="text"
                value={acquisitionLocation}
                onChange={(e) => setAcquisitionLocation(e.target.value)}
                placeholder="e.g. Portobello Road Market, Christie's South Kensington, Estate Sale"
                className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-700/40"
              />
            </div>
          </div>

          {/* Notes & Backstamp Description */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-mono uppercase tracking-wider text-stone-700 font-semibold">
                Curator Remarks & Mark Description
              </label>
              <button
                type="button"
                onClick={() => setIsResearchMarksModalOpen(true)}
                className="text-[11px] text-amber-800 hover:text-amber-950 font-medium flex items-center gap-1 transition cursor-pointer"
                title="Research hallmarks, backstamps, signatures, and maker touchmarks using AI"
              >
                <Sparkles className="w-3 h-3 text-amber-700" />
                <span>Research Marks with AI</span>
              </button>
            </div>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Record any hallmarks, painter signatures, registry numbers, or provenance details..."
              className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-700/40"
            />
          </div>
        </form>

        {/* Sticky Footer (Always Visible at bottom of modal) */}
        <div className="flex-shrink-0 px-6 py-4 border-t border-stone-200 bg-white shadow-xs flex items-center justify-between">
          <div className="text-xs text-stone-500 font-mono hidden sm:block">
            * <span className="font-semibold text-stone-700">Item Title</span> is required
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-stone-700 hover:text-stone-900 font-medium transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="item-catalog-form"
              disabled={isSubmitting}
              className="flex items-center justify-center gap-1.5 px-6 py-2.5 rounded-lg bg-stone-800 hover:bg-stone-900 text-amber-100 text-sm font-semibold shadow-md transition disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>{itemToEdit ? 'Update Item' : 'Add to Catalog'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* AI Marks & Hallmarks Research Modal */}
      <ResearchMarksModal
        isOpen={isResearchMarksModalOpen}
        onClose={() => setIsResearchMarksModalOpen(false)}
        initialImage={imagePreview || undefined}
        category={category}
        makerHint={maker}
        itemTitle={title}
        onApplyResults={(results, mode) => {
          const markHeader = results.detectedMarks?.length
            ? `[Marks Detected: ${results.detectedMarks.join(', ')}]\n`
            : '';
          const formattedText = `${markHeader}${results.notes}`.trim();
          if (mode === 'append') {
            setNotes((prev) => (prev ? `${prev}\n\n${formattedText}` : formattedText));
          } else {
            setNotes(formattedText);
          }
        }}
        onOpenApiKeyPrompt={() => {
          setIsResearchMarksModalOpen(false);
          setApiKeyPromptFeature('Research Marks with AI');
          setIsApiKeyPromptOpen(true);
        }}
      />

      {/* Gemini API Key Explanatory Prompt Modal */}
      <GeminiApiKeyPromptModal
        isOpen={isApiKeyPromptOpen}
        onClose={() => setIsApiKeyPromptOpen(false)}
        onOpenSettings={() => setIsAiSettingsOpen(true)}
        featureName={apiKeyPromptFeature}
      />

      {/* Google Gemini Settings Modal */}
      <AIVisionSettingsModal
        isOpen={isAiSettingsOpen}
        onClose={() => setIsAiSettingsOpen(false)}
      />
    </div>
  );
};
