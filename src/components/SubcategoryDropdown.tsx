import React, { useState, useRef, useEffect } from 'react';
import type { Item } from '../types/schema';
import { isCustomSubcategory } from '../services/subcategoryService';
import { 
  ChevronDown, 
  Search, 
  Plus, 
  Check, 
  X, 
  Trash2, 
  Tag
} from 'lucide-react';

interface SubcategoryDropdownProps {
  category: string;
  selectedSubcategory: string;
  onSelectSubcategory: (subcat: string) => void;
  availableSubcategories: string[];
  items: Item[];
  onAddSubcategory: (newSubcat: string) => Promise<void>;
  onRemoveSubcategory: (subcatToRemove: string) => Promise<void>;
}

export const SubcategoryDropdown: React.FC<SubcategoryDropdownProps> = ({
  category,
  selectedSubcategory,
  onSelectSubcategory,
  availableSubcategories,
  items,
  onAddSubcategory,
  onRemoveSubcategory,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [newSubcatName, setNewSubcatName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      // Auto-focus search input when opening
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen]);

  // Reset search term when category changes
  useEffect(() => {
    setSearchTerm('');
    setNewSubcatName('');
    setIsOpen(false);
  }, [category]);

  const totalCategoryItemsCount = items.filter((i) => i.category === category).length;

  const filteredSubcategories = availableSubcategories.filter((subcat) =>
    subcat.toLowerCase().includes(searchTerm.toLowerCase().trim())
  );

  const selectedCount = selectedSubcategory === 'All'
    ? totalCategoryItemsCount
    : items.filter((i) => i.category === category && i.subcategory === selectedSubcategory).length;

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newSubcatName.trim();
    if (!trimmed || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onAddSubcategory(trimmed);
      onSelectSubcategory(trimmed);
      setNewSubcatName('');
      setSearchTerm('');
      setIsOpen(false);
    } catch (err) {
      console.error('Failed to add subcategory:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, subcat: string) => {
    e.stopPropagation();
    if (window.confirm(`Delete custom subcategory "${subcat}"?`)) {
      await onRemoveSubcategory(subcat);
      if (selectedSubcategory === subcat) {
        onSelectSubcategory('All');
      }
    }
  };

  return (
    <div className="relative mb-5" ref={dropdownRef}>
      {/* Composite Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 p-2 bg-stone-100/80 border border-stone-200/90 rounded-xl shadow-2xs">
        <div className="flex flex-wrap items-center gap-2">
          
          {/* Composite Dropdown Trigger Button */}
          <button
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition cursor-pointer ${
              isOpen
                ? 'bg-amber-800 text-white border-amber-900 shadow-xs'
                : selectedSubcategory !== 'All'
                  ? 'bg-amber-900 text-amber-50 border-amber-950 shadow-xs'
                  : 'bg-white text-stone-800 hover:bg-stone-50 border-stone-300'
            }`}
            title="Choose subcategory"
          >
            <Tag className="w-3.5 h-3.5 opacity-80" />
            <span className="font-semibold">Subcategory:</span>
            <span className="font-normal font-sans">
              {selectedSubcategory === 'All' ? 'All' : selectedSubcategory}
            </span>
            <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
              selectedSubcategory !== 'All' || isOpen
                ? 'bg-white/20 text-white'
                : 'bg-stone-200 text-stone-700'
            }`}>
              {selectedCount}
            </span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Active Filter Clear Pill (when a specific subcategory is selected) */}
          {selectedSubcategory !== 'All' && (
            <div className="inline-flex items-center gap-1.5 bg-amber-100 text-amber-950 border border-amber-300 px-2.5 py-1 rounded-lg text-xs font-medium animate-in fade-in">
              <span>Filtered:</span>
              <span className="font-bold">{selectedSubcategory}</span>
              <span className="text-[10px] text-amber-800 font-mono">({selectedCount})</span>
              <button
                type="button"
                onClick={() => onSelectSubcategory('All')}
                className="ml-1 text-amber-700 hover:text-amber-950 p-0.5 rounded hover:bg-amber-200/60 transition cursor-pointer"
                title="Clear subcategory filter back to All"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

        </div>

        {/* Total stats label */}
        <div className="text-[11px] text-stone-500 font-sans hidden sm:block px-1">
          {availableSubcategories.length} subcategories in {category}
        </div>
      </div>

      {/* Floating Composite Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-1.5 w-80 sm:w-96 bg-white rounded-xl shadow-2xl border border-stone-200 z-40 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
          
          {/* Search Header */}
          <div className="p-2.5 border-b border-stone-200 bg-stone-50/70">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={`Search ${availableSubcategories.length} subcategories...`}
                className="w-full pl-8 pr-7 py-1.5 text-xs bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-700/40 text-stone-800"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Subcategories Scrollable List */}
          <div className="max-h-64 overflow-y-auto divide-y divide-stone-100 p-1">
            
            {/* "All" Option */}
            {!searchTerm && (
              <button
                type="button"
                onClick={() => {
                  onSelectSubcategory('All');
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-lg transition text-left cursor-pointer ${
                  selectedSubcategory === 'All'
                    ? 'bg-amber-50 text-amber-900 font-semibold'
                    : 'text-stone-700 hover:bg-stone-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
                    selectedSubcategory === 'All' ? 'text-amber-800' : 'opacity-0'
                  }`}>
                    <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                  </div>
                  <span>All {category}</span>
                </div>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-stone-100 text-stone-600">
                  {totalCategoryItemsCount}
                </span>
              </button>
            )}

            {/* List of Subcategories */}
            {filteredSubcategories.length > 0 ? (
              filteredSubcategories.map((subcat) => {
                const count = items.filter(
                  (i) => i.category === category && i.subcategory === subcat
                ).length;
                const isSelected = selectedSubcategory === subcat;
                const isCustom = isCustomSubcategory(category, subcat);

                return (
                  <div
                    key={subcat}
                    onClick={() => {
                      onSelectSubcategory(subcat);
                      setIsOpen(false);
                    }}
                    className={`group w-full flex items-center justify-between px-3 py-2 text-xs rounded-lg transition cursor-pointer ${
                      isSelected
                        ? 'bg-amber-50 text-amber-900 font-semibold'
                        : 'text-stone-700 hover:bg-stone-50'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate pr-2">
                      <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${
                        isSelected ? 'text-amber-800' : 'opacity-0'
                      }`}>
                        <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                      </div>
                      <span className="truncate">{subcat}</span>
                      {isCustom && (
                        <span className="text-[9px] font-mono uppercase bg-stone-100 text-stone-500 px-1 py-0.2 rounded border border-stone-200">
                          Custom
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className={`text-[11px] font-mono px-2 py-0.5 rounded-full ${
                        count > 0
                          ? 'bg-amber-100/70 text-amber-900 font-medium'
                          : 'bg-stone-100 text-stone-400'
                      }`}>
                        {count}
                      </span>
                      {isCustom && (
                        <button
                          type="button"
                          title={`Delete custom subcategory "${subcat}"`}
                          onClick={(e) => handleDelete(e, subcat)}
                          className="opacity-0 group-hover:opacity-100 text-stone-400 hover:text-red-600 p-1 rounded transition"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-4 text-center text-xs text-stone-500">
                No subcategories matching "{searchTerm}".
              </div>
            )}
          </div>

          {/* Quick Add Subcategory Footer */}
          <form
            onSubmit={handleAdd}
            className="p-2.5 border-t border-stone-200 bg-stone-50 flex items-center gap-2"
          >
            <input
              type="text"
              value={newSubcatName}
              onChange={(e) => setNewSubcatName(e.target.value)}
              placeholder="Add new subcategory..."
              className="flex-1 px-2.5 py-1.5 text-xs bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-700/40 text-stone-800"
            />
            <button
              type="submit"
              disabled={!newSubcatName.trim() || isSubmitting}
              className="px-3 py-1.5 bg-amber-800 hover:bg-amber-900 text-white rounded-lg text-xs font-medium flex items-center gap-1 shadow-xs transition disabled:opacity-50 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          </form>

        </div>
      )}
    </div>
  );
};
