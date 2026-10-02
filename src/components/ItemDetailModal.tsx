import React from 'react';
import type { Item } from '../types/schema';
import { 
  X, 
  Edit2, 
  Trash2, 
  Tag, 
  Ruler, 
  FileText, 
  ImageOff,
  Calendar,
  MapPin,
  BookOpen,
  Maximize2
} from 'lucide-react';

interface ItemDetailModalProps {
  item: Item | null;
  onClose: () => void;
  onEdit: (item: Item) => void;
  onDelete: (id: string) => void;
  isSyncPending?: boolean;
}

export const ItemDetailModal: React.FC<ItemDetailModalProps> = ({
  item,
  onClose,
  onEdit,
  onDelete,
  isSyncPending,
}) => {
  const [isLightboxOpen, setIsLightboxOpen] = React.useState(false);

  if (!item) return null;

  const currencySymbol = item.currency === 'GBP' ? '£' : item.currency === 'USD' ? '$' : '€';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div 
        className="bg-[#faf8f5] w-full max-w-3xl rounded-2xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-white">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-stone-100 text-stone-700 border border-stone-300">
              {item.category}
            </span>
            {item.subcategory && (
              <span className="text-xs font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200 font-semibold">
                {item.subcategory}
              </span>
            )}
            {isSyncPending && (
              <span className="text-xs font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500 text-white font-bold border border-amber-600 animate-pulse">
                Sync Required
              </span>
            )}
            <span className="text-xs font-mono text-stone-500">
              ID: {item.id.slice(0, 8)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onEdit(item)}
              className="flex items-center gap-1 text-xs font-medium text-stone-700 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 px-3 py-1.5 rounded-lg transition"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>Edit</span>
            </button>
            <button
              onClick={() => {
                if (window.confirm(`Are you sure you want to delete "${item.title}"?`)) {
                  onDelete(item.id);
                  onClose();
                }
              }}
              className="flex items-center gap-1 text-xs font-medium text-rose-700 hover:text-rose-900 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-lg transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100 transition ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="overflow-y-auto p-6 space-y-6">
          {/* Synchronization Required Banner */}
          {isSyncPending && (
            <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl text-amber-950 text-xs flex items-center justify-between shadow-2xs">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-600 animate-pulse flex-shrink-0" />
                <div>
                  <span className="font-bold">Synchronization Required:</span> This item has on-device modifications waiting to sync to the Cloud Firestore database.
                </div>
              </div>
            </div>
          )}

          {/* Main Visual & Title */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            <div 
              onClick={() => item.primaryImageUrl && setIsLightboxOpen(true)}
              className={`relative aspect-[4/3] rounded-xl overflow-hidden bg-stone-100 border border-stone-200 shadow-inner flex items-center justify-center group ${
                item.primaryImageUrl ? 'cursor-zoom-in' : ''
              }`}
              title={item.primaryImageUrl ? 'Click to view full image fitted to window' : undefined}
            >
              {item.primaryImageUrl ? (
                <>
                  <img
                    src={item.primaryImageUrl}
                    alt=""
                    aria-hidden="true"
                    className="absolute inset-0 w-full h-full object-cover blur-md opacity-25 scale-110 pointer-events-none"
                  />
                  <img
                    src={item.primaryImageUrl}
                    alt={item.title}
                    className="relative z-1 w-full h-full object-contain object-center p-2.5 transition-transform duration-200 group-hover:scale-102"
                  />
                  <div className="absolute bottom-2 right-2 z-10 p-1.5 rounded-lg bg-stone-900/70 text-white opacity-0 group-hover:opacity-100 transition shadow-sm flex items-center gap-1.5 text-[11px] font-sans backdrop-blur-xs">
                    <Maximize2 className="w-3.5 h-3.5" />
                    <span>Fit to Window</span>
                  </div>
                </>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-stone-400">
                  <ImageOff className="w-10 h-10 mb-2" />
                  <span className="text-xs font-mono">No Photo Available</span>
                </div>
              )}
            </div>

            <div className="flex flex-col justify-between h-full">
              <div>
                <h2 className="text-2xl font-serif font-bold text-stone-900 leading-tight">
                  {item.title}
                </h2>

                <div className="mt-4 space-y-2.5">
                  {item.subcategory && (
                    <div className="flex items-center justify-between py-1.5 border-b border-stone-200/80">
                      <span className="text-xs text-stone-500 uppercase font-mono">Subcategory</span>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200">
                        {item.subcategory}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between py-1.5 border-b border-stone-200/80">
                    <span className="text-xs text-stone-500 uppercase font-mono">Maker</span>
                    <span className="text-sm font-semibold text-stone-900">
                      {item.maker || 'Unmarked / Unknown'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-1.5 border-b border-stone-200/80">
                    <span className="text-xs text-stone-500 uppercase font-mono">Pattern / Model</span>
                    <span className="text-sm font-mono text-stone-800">
                      {item.modelOrPattern || '—'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-1.5 border-b border-stone-200/80">
                    <span className="text-xs text-stone-500 uppercase font-mono">Period / Year</span>
                    <span className="text-sm text-stone-800">
                      {item.periodOrYear || '—'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-1.5 border-b border-stone-200/80">
                    <span className="text-xs text-stone-500 uppercase font-mono">Condition</span>
                    <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-stone-100 border border-stone-300 text-stone-800">
                      {item.condition}
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick valuation highlight */}
              <div className="mt-6 p-4 rounded-xl bg-amber-50/70 border border-amber-200/80 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-mono uppercase tracking-wider text-amber-900 block">
                    Estimated Current Value
                  </span>
                  <span className="text-2xl font-mono font-bold text-stone-900">
                    {currencySymbol}{(item.estimatedValue ?? 0).toLocaleString()}
                  </span>
                </div>
                {item.acquisitionCost !== undefined && (
                  <div className="text-right">
                    <span className="text-[11px] font-mono uppercase tracking-wider text-stone-500 block">
                      Cost Basis
                    </span>
                    <span className="text-sm font-mono text-stone-700">
                      {currencySymbol}{item.acquisitionCost.toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Details Tabs / Groups */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Dimensions */}
            <div className="bg-white p-4 rounded-xl border border-stone-200">
              <div className="flex items-center gap-2 mb-3 text-stone-800 font-semibold text-xs uppercase font-mono tracking-wider">
                <Ruler className="w-4 h-4 text-amber-700" />
                Physical Dimensions
              </div>
              {item.dimensions && (item.dimensions.height || item.dimensions.width || item.dimensions.depth) ? (
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 bg-stone-50 rounded-lg border border-stone-200">
                    <span className="text-[10px] text-stone-500 uppercase block font-mono">Height</span>
                    <span className="text-sm font-mono font-semibold text-stone-800">
                      {item.dimensions.height ?? '—'} {item.dimensions.unit}
                    </span>
                  </div>
                  <div className="p-2 bg-stone-50 rounded-lg border border-stone-200">
                    <span className="text-[10px] text-stone-500 uppercase block font-mono">Width</span>
                    <span className="text-sm font-mono font-semibold text-stone-800">
                      {item.dimensions.width ?? '—'} {item.dimensions.unit}
                    </span>
                  </div>
                  <div className="p-2 bg-stone-50 rounded-lg border border-stone-200">
                    <span className="text-[10px] text-stone-500 uppercase block font-mono">Depth</span>
                    <span className="text-sm font-mono font-semibold text-stone-800">
                      {item.dimensions.depth ?? '—'} {item.dimensions.unit}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-stone-400 italic">No dimensions recorded.</p>
              )}
            </div>

            {/* Provenance & Acquisition */}
            <div className="bg-white p-4 rounded-xl border border-stone-200">
              <div className="flex items-center gap-2 mb-3 text-stone-800 font-semibold text-xs uppercase font-mono tracking-wider">
                <Calendar className="w-4 h-4 text-amber-700" />
                Provenance & Acquisition
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-stone-500">Acquisition Date:</span>
                  <span className="font-mono text-stone-800 font-medium">{item.acquisitionDate || 'Unrecorded'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Catalog Entry Date:</span>
                  <span className="font-mono text-stone-800">{new Date(item.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Last Modified:</span>
                  <span className="font-mono text-stone-800">{new Date(item.updatedAt).toLocaleDateString()}</span>
                </div>
                {item.acquisitionLocation && (
                  <div className="flex justify-between items-start pt-1.5 border-t border-stone-100">
                    <span className="text-stone-500 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-amber-700" />
                      Source / Location:
                    </span>
                    <span className="font-medium text-stone-800 text-right">{item.acquisitionLocation}</span>
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Catalogue Description */}
          {item.description && (
            <div className="bg-white p-5 rounded-xl border border-stone-200">
              <div className="flex items-center gap-2 mb-2 text-stone-800 font-semibold text-xs uppercase font-mono tracking-wider">
                <BookOpen className="w-4 h-4 text-amber-700" />
                Catalogue Description
              </div>
              <p className="text-xs text-stone-700 leading-relaxed whitespace-pre-line">
                {item.description}
              </p>
            </div>
          )}

          {/* Condition Notes & Curator Notes */}
          <div className="bg-white p-5 rounded-xl border border-stone-200 space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5 text-stone-800 font-semibold text-xs uppercase font-mono tracking-wider">
                <FileText className="w-4 h-4 text-amber-700" />
                Condition Assessment
              </div>
              <p className="text-xs text-stone-700 leading-relaxed">
                {item.conditionNotes || 'No specific flaws or condition remarks logged.'}
              </p>
            </div>

            {item.notes && (
              <div className="pt-3 border-t border-stone-100">
                <div className="flex items-center gap-2 mb-1.5 text-stone-800 font-semibold text-xs uppercase font-mono tracking-wider">
                  <Tag className="w-4 h-4 text-amber-700" />
                  Curator & Backstamp Remarks
                </div>
                <p className="text-xs text-stone-700 leading-relaxed whitespace-pre-line">
                  {item.notes}
                </p>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Full-Screen Lightbox Modal: Scales image completely to fit the browser window */}
      {isLightboxOpen && item.primaryImageUrl && (
        <div 
          className="fixed inset-0 z-60 bg-stone-950/90 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setIsLightboxOpen(false)}
        >
          <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
            <span className="text-xs font-mono text-stone-300 bg-stone-900/80 px-3 py-1.5 rounded-full border border-stone-700 shadow-md">
              {item.title}
            </span>
            <button
              onClick={() => setIsLightboxOpen(false)}
              className="p-2 text-white/80 hover:text-white bg-stone-800/80 hover:bg-stone-700 rounded-full transition shadow-md"
              title="Close image view (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="relative max-w-[95vw] max-h-[88vh] flex items-center justify-center">
            <img
              src={item.primaryImageUrl}
              alt={item.title}
              className="max-w-[95vw] max-h-[85vh] object-contain rounded-lg shadow-2xl border border-stone-800"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          <div className="text-center mt-3 text-stone-400 text-xs font-mono">
            Full view scaled to window • Click outside or press Esc to close
          </div>
        </div>
      )}
    </div>
  );
};
