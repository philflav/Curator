import React, { useState } from 'react';
import type { Item } from '../types/schema';
import { CATEGORIES } from '../types/schema';
import { exportToCSV, exportToJSON } from '../utils/export';
import { X, Download, FileSpreadsheet, FileCode, Check } from 'lucide-react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: Item[];
  initialCategory?: string;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  items,
  initialCategory = 'All',
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory);
  const [exportFormat, setExportFormat] = useState<'csv' | 'json'>('csv');
  const [isExported, setIsExported] = useState(false);

  if (!isOpen) return null;

  const filteredItems = selectedCategory === 'All'
    ? items
    : items.filter((i) => i.category === selectedCategory);

  const totalValue = filteredItems.reduce((acc, curr) => acc + (curr.estimatedValue || 0), 0);

  const handleExport = () => {
    if (exportFormat === 'csv') {
      exportToCSV(items, selectedCategory);
    } else {
      exportToJSON(items, selectedCategory);
    }
    setIsExported(true);
    setTimeout(() => {
      setIsExported(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div 
        className="bg-[#faf8f5] w-full max-w-md rounded-2xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-white">
          <div className="flex items-center gap-2">
            <Download className="w-5 h-5 text-amber-700" />
            <h2 className="text-base font-serif font-bold text-stone-900">
              Export Collection
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Category Selector */}
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-stone-700 font-semibold mb-1.5">
              Category to Export
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-700/40"
            >
              <option value="All">All Categories ({items.length} items)</option>
              {CATEGORIES.map((cat) => {
                const count = items.filter((i) => i.category === cat).length;
                return (
                  <option key={cat} value={cat}>
                    {cat} ({count} {count === 1 ? 'item' : 'items'})
                  </option>
                );
              })}
            </select>
          </div>

          {/* Format Selector */}
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-stone-700 font-semibold mb-1.5">
              File Format
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setExportFormat('csv')}
                className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition ${
                  exportFormat === 'csv'
                    ? 'bg-amber-50/80 border-amber-600 text-amber-950 ring-1 ring-amber-600'
                    : 'bg-white border-stone-200 text-stone-700 hover:border-stone-300'
                }`}
              >
                <FileSpreadsheet className="w-5 h-5 text-amber-700 mt-0.5" />
                <div>
                  <div className="text-xs font-semibold">CSV / Excel</div>
                  <div className="text-[11px] text-stone-500">Metadata only (no images)</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setExportFormat('json')}
                className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition ${
                  exportFormat === 'json'
                    ? 'bg-amber-50/80 border-amber-600 text-amber-950 ring-1 ring-amber-600'
                    : 'bg-white border-stone-200 text-stone-700 hover:border-stone-300'
                }`}
              >
                <FileCode className="w-5 h-5 text-amber-700 mt-0.5" />
                <div>
                  <div className="text-xs font-semibold">JSON Archive</div>
                  <div className="text-[11px] text-stone-500">Backup, raw schema data</div>
                </div>
              </button>
            </div>
          </div>

          {/* Export Summary Box */}
          <div className="bg-white p-3.5 rounded-xl border border-stone-200 text-xs flex justify-between items-center">
            <div>
              <span className="text-stone-500 block font-mono">Export Scope:</span>
              <span className="font-semibold text-stone-900">
                {selectedCategory}
              </span>
            </div>
            <div className="text-right">
              <span className="text-stone-500 block font-mono">Matched Records:</span>
              <span className="font-mono font-bold text-stone-900">
                {filteredItems.length} items &bull; £{totalValue.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Action button */}
          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs text-stone-600 hover:text-stone-900 font-medium"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleExport}
              disabled={filteredItems.length === 0}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-stone-800 hover:bg-stone-900 text-amber-100 text-xs font-medium shadow transition disabled:opacity-50"
            >
              {isExported ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Downloaded!</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>Download {exportFormat.toUpperCase()}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
