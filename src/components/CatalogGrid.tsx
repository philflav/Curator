import React from 'react';
import type { Item } from '../types/schema';
import { Sparkles, Clock, ImageOff } from 'lucide-react';

interface CatalogGridProps {
  items: Item[];
  onSelectItem: (item: Item) => void;
  pendingItemIds?: Set<string>;
}

const CONDITION_COLORS: Record<string, string> = {
  Mint: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  Excellent: 'bg-teal-100 text-teal-800 border-teal-300',
  Good: 'bg-blue-100 text-blue-800 border-blue-300',
  Fair: 'bg-amber-100 text-amber-800 border-amber-300',
  Restored: 'bg-purple-100 text-purple-800 border-purple-300',
  Damaged: 'bg-rose-100 text-rose-800 border-rose-300',
};

export const CatalogGrid: React.FC<CatalogGridProps> = ({ 
  items, 
  onSelectItem,
  pendingItemIds 
}) => {
  if (items.length === 0) {
    return (
      <div className="text-center py-20 bg-white/60 border border-stone-200 border-dashed rounded-xl my-6">
        <Sparkles className="w-8 h-8 text-stone-400 mx-auto mb-2.5" />
        <h3 className="text-base font-medium text-stone-800">No items found</h3>
        <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
          Try adjusting your search criteria or add your first antique to start the collection.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
      {items.map((item) => (
        <article
          key={item.id}
          onClick={() => onSelectItem(item)}
          className="group cursor-pointer bg-white rounded-xl border border-stone-200/90 shadow-sm hover:shadow-md hover:border-amber-700/50 transition-all duration-200 flex flex-col overflow-hidden"
        >
          {/* Card Hero Image */}
          <div className="relative aspect-[4/3] bg-stone-100 overflow-hidden border-b border-stone-200/60 flex items-center justify-center">
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
                  loading="lazy"
                  className="relative z-1 w-full h-full object-contain object-center p-2 group-hover:scale-105 transition-transform duration-300"
                />
              </>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-stone-400">
                <ImageOff className="w-8 h-8 mb-1" />
                <span className="text-xs font-mono">No Image</span>
              </div>
            )}

            {/* Sync Required badge */}
            {pendingItemIds?.has(item.id) && (
              <span 
                className="absolute top-2.5 left-2.5 z-10 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-600 text-white shadow-md border border-amber-300/80 flex items-center gap-1.5 animate-pulse"
                title="Local changes pending synchronization with Firebase"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-white" />
                Sync Required
              </span>
            )}

            {/* Condition badge */}
            <span
              className={`absolute top-2.5 right-2.5 text-[11px] font-medium px-2 py-0.5 rounded-full border shadow-sm ${
                CONDITION_COLORS[item.condition] || 'bg-stone-100 text-stone-700 border-stone-300'
              }`}
            >
              {item.condition}
            </span>

            {/* Period pill */}
            {item.periodOrYear && (
              <span className="absolute bottom-2.5 left-2.5 text-[11px] font-mono font-medium px-2 py-0.5 rounded bg-stone-900/75 text-stone-100 backdrop-blur-xs flex items-center gap-1">
                <Clock className="w-3 h-3 text-amber-300" />
                {item.periodOrYear}
              </span>
            )}
          </div>

          {/* Card Body */}
          <div className="p-4 flex-1 flex flex-col justify-between">
            <div>
              {/* Category & Subcategory */}
              <div className="text-[11px] uppercase tracking-wider font-semibold text-amber-800 mb-1 flex items-center gap-1 flex-wrap">
                <span>{item.category}</span>
                {item.subcategory && (
                  <>
                    <span className="text-stone-300 font-normal">›</span>
                    <span className="text-amber-950 font-medium">{item.subcategory}</span>
                  </>
                )}
              </div>

              {/* Title */}
              <h3 className="font-serif text-base font-semibold text-stone-900 line-clamp-2 leading-snug group-hover:text-amber-900 transition">
                {item.title}
              </h3>

              {/* Maker & Model */}
              <div className="mt-2 text-xs text-stone-600 flex flex-wrap gap-1.5 items-center">
                {item.maker && (
                  <span className="font-medium text-stone-800">
                    {item.maker}
                  </span>
                )}
                {item.maker && item.modelOrPattern && <span>&bull;</span>}
                {item.modelOrPattern && (
                  <span className="font-mono text-stone-500">
                    {item.modelOrPattern}
                  </span>
                )}
              </div>
            </div>

            {/* Footer with Valuation */}
            <div className="mt-4 pt-3 border-t border-stone-100 flex items-baseline justify-between">
              <span className="text-[11px] text-stone-500 uppercase tracking-wider">
                Est. Value
              </span>
              <span className="font-mono font-bold text-base text-stone-900">
                {item.currency === 'GBP' ? '£' : item.currency === 'USD' ? '$' : '€'}
                {(item.estimatedValue ?? 0).toLocaleString()}
              </span>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
};
