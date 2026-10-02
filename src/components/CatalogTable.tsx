import React from 'react';
import type { Item } from '../types/schema';
import { Eye, Edit2, Trash2, ImageOff } from 'lucide-react';

interface CatalogTableProps {
  items: Item[];
  onSelectItem: (item: Item) => void;
  onEditItem: (item: Item) => void;
  onDeleteItem: (id: string) => void;
  pendingItemIds?: Set<string>;
}

export const CatalogTable: React.FC<CatalogTableProps> = ({
  items,
  onSelectItem,
  onEditItem,
  onDeleteItem,
  pendingItemIds,
}) => {
  if (items.length === 0) {
    return (
      <div className="text-center py-16 bg-white border border-stone-200 rounded-xl my-6">
        <p className="text-stone-500 text-sm">No items found matching your filters.</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-stone-200 rounded-xl shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-stone-700">
          <thead className="bg-stone-100/75 border-b border-stone-200 text-stone-600 uppercase text-[11px] font-semibold tracking-wider font-mono">
            <tr>
              <th scope="col" className="px-4 py-3 w-16">Item</th>
              <th scope="col" className="px-4 py-3">Title & Category</th>
              <th scope="col" className="px-4 py-3">Maker / Mark</th>
              <th scope="col" className="px-4 py-3">Pattern / Model</th>
              <th scope="col" className="px-4 py-3">Period</th>
              <th scope="col" className="px-4 py-3">Condition</th>
              <th scope="col" className="px-4 py-3 text-right">Est. Value</th>
              <th scope="col" className="px-4 py-3 text-center w-28">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {items.map((item) => (
              <tr 
                key={item.id}
                className="hover:bg-amber-50/40 transition group"
              >
                {/* Thumbnail */}
                <td className="px-4 py-3">
                  <div 
                    onClick={() => onSelectItem(item)}
                    className="w-12 h-12 rounded-lg bg-stone-100 overflow-hidden border border-stone-200 cursor-pointer flex-shrink-0 flex items-center justify-center p-0.5"
                  >
                    {item.primaryImageUrl ? (
                      <img
                        src={item.primaryImageUrl}
                        alt={item.title}
                        className="w-full h-full object-contain object-center"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-stone-400">
                        <ImageOff className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                </td>

                {/* Title & Category */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span 
                      onClick={() => onSelectItem(item)}
                      className="font-serif font-medium text-stone-900 cursor-pointer hover:text-amber-900 line-clamp-1"
                    >
                      {item.title}
                    </span>
                    {pendingItemIds?.has(item.id) && (
                      <span 
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-100 text-amber-900 border border-amber-300 flex-shrink-0 animate-pulse"
                        title="Local changes pending sync"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
                        Sync Required
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] uppercase tracking-wider text-amber-800 font-medium flex items-center gap-1">
                    <span>{item.category}</span>
                    {item.subcategory && (
                      <span className="text-stone-500 font-normal">({item.subcategory})</span>
                    )}
                  </div>
                </td>

                {/* Maker */}
                <td className="px-4 py-3 font-medium text-stone-800">
                  {item.maker || <span className="text-stone-400 italic">Unknown</span>}
                </td>

                {/* Pattern / Model */}
                <td className="px-4 py-3 font-mono text-xs text-stone-600">
                  {item.modelOrPattern || '—'}
                </td>

                {/* Period */}
                <td className="px-4 py-3 text-stone-600 text-xs">
                  {item.periodOrYear || '—'}
                </td>

                {/* Condition */}
                <td className="px-4 py-3">
                  <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-full bg-stone-100 border border-stone-200 text-stone-800">
                    {item.condition}
                  </span>
                </td>

                {/* Est. Value */}
                <td className="px-4 py-3 text-right font-mono font-semibold text-stone-900">
                  {item.currency === 'GBP' ? '£' : item.currency === 'USD' ? '$' : '€'}
                  {(item.estimatedValue ?? 0).toLocaleString()}
                </td>

                {/* Actions */}
                <td className="px-4 py-3 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <button
                      onClick={() => onSelectItem(item)}
                      title="Inspect Details"
                      className="p-1.5 text-stone-500 hover:text-stone-900 rounded hover:bg-stone-100"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onEditItem(item)}
                      title="Edit Item"
                      className="p-1.5 text-stone-500 hover:text-amber-800 rounded hover:bg-amber-50"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDeleteItem(item.id)}
                      title="Delete Item"
                      className="p-1.5 text-stone-400 hover:text-rose-700 rounded hover:bg-rose-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
