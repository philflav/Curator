import { useState, useEffect, useMemo } from 'react';
import type { Item, Category } from './types/schema';
import { CATEGORIES } from './types/schema';
import { 
  getSubcategoriesForCategory,
  initSubcategoriesSync,
  subscribeToSubcategories,
  addUserSubcategory,
  removeUserSubcategory,
  isCustomSubcategory
} from './services/subcategoryService';
import { 
  fetchAllItems, 
  saveItem as persistItem, 
  deleteItem as removeItem,
  resetDemoData,
  subscribeToRemoteItems
} from './services/storageService';
import { 
  subscribeToSyncStatus, 
  processSyncQueue 
} from './services/syncService';
import { isFirebaseConfigured } from './services/firebase';
import { Navbar } from './components/Navbar';
import { CatalogGrid } from './components/CatalogGrid';
import { CatalogTable } from './components/CatalogTable';
import { ItemDetailModal } from './components/ItemDetailModal';
import { ItemFormModal } from './components/ItemFormModal';
import { FirebaseModal } from './components/FirebaseModal';
import { ExportModal } from './components/ExportModal';
import { VisualSearchModal } from './components/VisualSearchModal';
import { 
  ArrowUpDown, 
  Loader2,
  RefreshCw,
  Plus,
  X
} from 'lucide-react';

export function App() {
  const [items, setItems] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'updated' | 'value-desc' | 'value-asc' | 'maker' | 'title'>('updated');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Modals
  const [activeItem, setActiveItem] = useState<Item | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<Item | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isVisualSearchOpen, setIsVisualSearchOpen] = useState(false);
  const [isFirebaseActive, setIsFirebaseActive] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Subcategory management state
  const [subcategoryVersion, setSubcategoryVersion] = useState(0);
  const [isAddingSubcatInline, setIsAddingSubcatInline] = useState(false);
  const [newInlineSubcatName, setNewInlineSubcatName] = useState('');

  // Sync state
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [pendingItemIds, setPendingItemIds] = useState<string[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  const pendingItemIdsSet = useMemo(() => new Set(pendingItemIds), [pendingItemIds]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const active = isFirebaseConfigured();
      setIsFirebaseActive(active);
      const data = await fetchAllItems();
      setItems(data);
    } catch (err) {
      console.error('Failed to load items:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Listen to offline sync queue status
    const unsubscribeSync = subscribeToSyncStatus((status) => {
      setPendingSyncCount(status.pendingCount);
      setPendingItemIds(status.pendingItemIds || []);
      setIsSyncing(status.isSyncing);
      setIsOnline(status.isOnline);
      setIsFirebaseActive(status.isFirebaseActive);
    });

    // Real-time remote updates when Firebase is active
    const unsubscribeRemote = subscribeToRemoteItems((remoteItems) => {
      setItems(remoteItems);
    });

    // Real-time categories/subcategories synchronization with Firestore
    const unsubscribeSubcategories = subscribeToSubcategories(() => {
      setSubcategoryVersion((v) => v + 1);
    });
    const unsubscribeSubcatRemote = initSubcategoriesSync();

    // Background push of any pending changes on startup if online
    if (typeof navigator !== 'undefined' && navigator.onLine && isFirebaseConfigured()) {
      processSyncQueue().catch(() => {});
    }

    return () => {
      unsubscribeSync();
      if (unsubscribeRemote) unsubscribeRemote();
      unsubscribeSubcategories();
      if (unsubscribeSubcatRemote) unsubscribeSubcatRemote();
    };
  }, []);

  const handleTriggerSync = async () => {
    showToast('Synchronizing with Firebase...');
    try {
      const res = await processSyncQueue();
      showToast(res.message);
      await loadData();
    } catch (err: any) {
      showToast(`Sync failed: ${err?.message || err}`);
    }
  };

  const handleSaveItem = async (item: Item) => {
    const isNew = !items.some((i) => i.id === item.id);
    const saved = await persistItem(item);
    setItems((prev) => {
      const idx = prev.findIndex((i) => i.id === saved.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = saved;
        return copy;
      }
      return [saved, ...prev];
    });

    if (activeItem && activeItem.id === saved.id) {
      setActiveItem(saved);
    }

    showToast(isNew ? `✓ Added "${saved.title}" to catalog` : `✓ Updated "${saved.title}"`);
  };

  const handleDeleteItem = async (id: string) => {
    await removeItem(id);
    setItems((prev) => prev.filter((i) => i.id !== id));
    if (activeItem?.id === id) {
      setActiveItem(null);
    }
  };

  const handleResetDemo = () => {
    if (window.confirm('Reset catalog back to sample antique items?')) {
      const reset = resetDemoData();
      setItems(reset);
      setActiveItem(null);
    }
  };

  // Available subcategories for currently selected category
  const availableSubcategories = useMemo(() => {
    if (selectedCategory === 'All') return [];
    return getSubcategoriesForCategory(selectedCategory as Category);
  }, [selectedCategory, items, subcategoryVersion]);

  // Filtered & Sorted items
  const filteredItems = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();

    return items
      .filter((item) => {
        // Category filter
        if (selectedCategory !== 'All' && item.category !== selectedCategory) {
          return false;
        }

        // Subcategory filter
        if (selectedCategory !== 'All' && selectedSubcategory !== 'All') {
          if (item.subcategory !== selectedSubcategory) {
            return false;
          }
        }

        // Search term
        if (!term) return true;
        const inTitle = item.title.toLowerCase().includes(term);
        const inMaker = (item.maker || '').toLowerCase().includes(term);
        const inPattern = (item.modelOrPattern || '').toLowerCase().includes(term);
        const inPeriod = (item.periodOrYear || '').toLowerCase().includes(term);
        const inDesc = (item.description || '').toLowerCase().includes(term);
        const inLoc = (item.acquisitionLocation || '').toLowerCase().includes(term);
        const inNotes = (item.notes || '').toLowerCase().includes(term);
        const inSubcat = (item.subcategory || '').toLowerCase().includes(term);

        return inTitle || inMaker || inPattern || inPeriod || inDesc || inLoc || inNotes || inSubcat;
      })
      .sort((a, b) => {
        if (sortBy === 'updated') {
          return b.updatedAt - a.updatedAt;
        }
        if (sortBy === 'value-desc') {
          return (b.estimatedValue || 0) - (a.estimatedValue || 0);
        }
        if (sortBy === 'value-asc') {
          return (a.estimatedValue || 0) - (b.estimatedValue || 0);
        }
        if (sortBy === 'maker') {
          return (a.maker || 'zzz').localeCompare(b.maker || 'zzz');
        }
        if (sortBy === 'title') {
          return a.title.localeCompare(b.title);
        }
        return 0;
      });
  }, [items, searchTerm, selectedCategory, selectedSubcategory, sortBy]);

  // Overall Portfolio Valuation
  const totalValuation = useMemo(() => {
    return items.reduce((acc, curr) => acc + (curr.estimatedValue || 0), 0);
  }, [items]);

  return (
    <div className="min-h-screen bg-[#faf8f5] flex flex-col font-sans">
      {/* Top Navbar */}
      <Navbar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onAddItem={() => {
          setItemToEdit(null);
          setIsFormOpen(true);
        }}
        onExport={() => setIsExportOpen(true)}
        onOpenVisualSearch={() => setIsVisualSearchOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onResetDemo={handleResetDemo}
        isFirebaseActive={isFirebaseActive}
        totalItemsCount={items.length}
        totalValuation={totalValuation}
        pendingSyncCount={pendingSyncCount}
        isSyncing={isSyncing}
        isOnline={isOnline}
        onTriggerSync={handleTriggerSync}
      />

      {/* Prominent Synchronization Required Banner */}
      {pendingSyncCount > 0 && (
        <div className="bg-amber-500 text-stone-950 px-4 py-2.5 border-b border-amber-600 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs sm:text-sm font-medium animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-80" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-950" />
            </span>
            <span className="leading-snug">
              <strong>Synchronization Required:</strong> {pendingSyncCount} item{pendingSyncCount > 1 ? 's have' : ' has'} local on-device changes pending cloud sync.
            </span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {isFirebaseActive ? (
              <button
                onClick={handleTriggerSync}
                disabled={isSyncing || !isOnline}
                className="bg-stone-900 hover:bg-stone-800 text-amber-200 px-3.5 py-1.5 rounded-lg font-semibold text-xs transition shadow-xs flex items-center gap-1.5 disabled:opacity-60"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
              </button>
            ) : (
              <button
                onClick={() => setIsSettingsOpen(true)}
                className="bg-stone-900 hover:bg-stone-800 text-amber-200 px-3.5 py-1.5 rounded-lg font-semibold text-xs transition shadow-xs"
              >
                Connect Firebase to Sync
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* Category Pill Filters & Sorting Toolbar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          {/* Category Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => {
                setSelectedCategory('All');
                setSelectedSubcategory('All');
              }}
              className={`text-xs px-3.5 py-1.5 rounded-full font-medium transition whitespace-nowrap ${
                selectedCategory === 'All'
                  ? 'bg-stone-800 text-amber-100 shadow-xs'
                  : 'bg-white hover:bg-stone-100 text-stone-600 border border-stone-200'
              }`}
            >
              All Categories ({items.length})
            </button>
            {CATEGORIES.map((cat) => {
              const count = items.filter((i) => i.category === cat).length;
              return (
                <button
                  key={cat}
                  onClick={() => {
                    setSelectedCategory(cat);
                    setSelectedSubcategory('All');
                  }}
                  className={`text-xs px-3.5 py-1.5 rounded-full font-medium transition whitespace-nowrap ${
                    selectedCategory === cat
                      ? 'bg-stone-800 text-amber-100 shadow-xs'
                      : 'bg-white hover:bg-stone-100 text-stone-600 border border-stone-200'
                  }`}
                >
                  {cat} {count > 0 && <span className="opacity-75">({count})</span>}
                </button>
              );
            })}
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-2 self-end md:self-auto text-xs text-stone-600">
            <ArrowUpDown className="w-3.5 h-3.5 text-stone-400" />
            <span className="font-mono uppercase tracking-wider text-[11px] text-stone-500">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-white border border-stone-300 rounded-lg px-2.5 py-1 text-xs text-stone-800 focus:outline-none focus:ring-1 focus:ring-amber-700"
            >
              <option value="updated">Recently Updated</option>
              <option value="value-desc">Highest Value</option>
              <option value="value-asc">Lowest Value</option>
              <option value="maker">Maker (A–Z)</option>
              <option value="title">Title (A–Z)</option>
            </select>
          </div>
        </div>

        {/* Subcategory Pills Row (shown when a specific category is active) */}
        {selectedCategory !== 'All' && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none mb-5 p-2 bg-stone-100/70 border border-stone-200/80 rounded-xl">
            <span className="text-[11px] font-mono uppercase tracking-wider text-amber-900 bg-amber-100/80 px-2 py-0.5 rounded font-semibold whitespace-nowrap">
              Subcategory:
            </span>
            <button
              onClick={() => setSelectedSubcategory('All')}
              className={`text-xs px-3 py-1 rounded-full font-medium transition whitespace-nowrap ${
                selectedSubcategory === 'All'
                  ? 'bg-amber-800 text-white shadow-xs'
                  : 'bg-white hover:bg-stone-50 text-stone-700 border border-stone-200'
              }`}
            >
              All {selectedCategory} ({items.filter((i) => i.category === selectedCategory).length})
            </button>
            {availableSubcategories.map((subcat) => {
              const count = items.filter(
                (i) => i.category === selectedCategory && i.subcategory === subcat
              ).length;
              const isCustom = isCustomSubcategory(selectedCategory, subcat);
              const isSelected = selectedSubcategory === subcat;

              return (
                <div
                  key={subcat}
                  className={`inline-flex items-center text-xs rounded-full font-medium transition whitespace-nowrap ${
                    isSelected
                      ? 'bg-amber-800 text-white shadow-xs'
                      : 'bg-white hover:bg-stone-50 text-stone-700 border border-stone-200'
                  }`}
                >
                  <button
                    onClick={() => setSelectedSubcategory(subcat)}
                    className="px-3 py-1 text-xs"
                  >
                    {subcat} {count > 0 && <span className={isSelected ? 'text-amber-200' : 'text-stone-400'}>({count})</span>}
                  </button>
                  {isCustom && (
                    <button
                      type="button"
                      title={`Delete custom subcategory "${subcat}"`}
                      onClick={async (e) => {
                        e.stopPropagation();
                        if (window.confirm(`Delete custom subcategory "${subcat}"?`)) {
                          await removeUserSubcategory(selectedCategory, subcat);
                          if (selectedSubcategory === subcat) setSelectedSubcategory('All');
                          showToast(`Removed subcategory "${subcat}"`);
                        }
                      }}
                      className={`pr-2 pl-0.5 py-1 ${isSelected ? 'text-amber-200 hover:text-white' : 'text-stone-400 hover:text-red-600'}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              );
            })}

            {/* Inline Add Subcategory */}
            {isAddingSubcatInline ? (
              <div className="flex items-center gap-1 bg-white border border-amber-300 rounded-full px-2 py-0.5 shadow-xs">
                <input
                  type="text"
                  autoFocus
                  value={newInlineSubcatName}
                  onChange={(e) => setNewInlineSubcatName(e.target.value)}
                  onKeyDown={async (e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (newInlineSubcatName.trim()) {
                        await addUserSubcategory(selectedCategory, newInlineSubcatName.trim());
                        setSelectedSubcategory(newInlineSubcatName.trim());
                        showToast(`✓ Added subcategory "${newInlineSubcatName.trim()}"`);
                        setNewInlineSubcatName('');
                        setIsAddingSubcatInline(false);
                      }
                    } else if (e.key === 'Escape') {
                      setIsAddingSubcatInline(false);
                      setNewInlineSubcatName('');
                    }
                  }}
                  placeholder="New subcategory..."
                  className="text-xs bg-transparent outline-none w-28 px-1 text-stone-800"
                />
                <button
                  type="button"
                  onClick={async () => {
                    if (newInlineSubcatName.trim()) {
                      await addUserSubcategory(selectedCategory, newInlineSubcatName.trim());
                      setSelectedSubcategory(newInlineSubcatName.trim());
                      showToast(`✓ Added subcategory "${newInlineSubcatName.trim()}"`);
                      setNewInlineSubcatName('');
                      setIsAddingSubcatInline(false);
                    }
                  }}
                  className="text-[11px] font-bold text-amber-900 hover:text-amber-950 px-1.5 py-0.5 rounded bg-amber-100 hover:bg-amber-200"
                >
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingSubcatInline(false);
                    setNewInlineSubcatName('');
                  }}
                  className="text-stone-400 hover:text-stone-600 px-1"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsAddingSubcatInline(true)}
                className="text-xs px-2.5 py-1 rounded-full font-medium transition whitespace-nowrap bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200/90 flex items-center gap-1 shadow-2xs"
                title={`Add custom subcategory to ${selectedCategory}`}
              >
                <Plus className="w-3 h-3 text-amber-800" />
                <span>Add</span>
              </button>
            )}
          </div>
        )}

        {/* Loading Spinner */}
        {isLoading ? (
          <div className="py-24 text-center">
            <Loader2 className="w-8 h-8 text-amber-700 animate-spin mx-auto mb-3" />
            <p className="text-sm font-serif text-stone-600">Loading catalog...</p>
          </div>
        ) : (
          <>
            {/* View Mode Switching */}
            {viewMode === 'grid' ? (
              <CatalogGrid
                items={filteredItems}
                onSelectItem={(item) => setActiveItem(item)}
                pendingItemIds={pendingItemIdsSet}
              />
            ) : (
              <CatalogTable
                items={filteredItems}
                onSelectItem={(item) => setActiveItem(item)}
                onEditItem={(item) => {
                  setItemToEdit(item);
                  setIsFormOpen(true);
                }}
                onDeleteItem={handleDeleteItem}
                pendingItemIds={pendingItemIdsSet}
              />
            )}
          </>
        )}
      </main>

      {/* Item Detail Inspector Modal */}
      <ItemDetailModal
        item={activeItem}
        onClose={() => setActiveItem(null)}
        onEdit={(item) => {
          setItemToEdit(item);
          setIsFormOpen(true);
        }}
        onDelete={handleDeleteItem}
        isSyncPending={activeItem ? pendingItemIdsSet.has(activeItem.id) : false}
      />

      {/* Item Add / Edit Modal */}
      <ItemFormModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setItemToEdit(null);
        }}
        onSave={handleSaveItem}
        itemToEdit={itemToEdit}
      />

      {/* Firebase & Data Storage Modal */}
      <FirebaseModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onConfigChanged={loadData}
        isFirebaseActive={isFirebaseActive}
      />

      {/* Export Modal with Category Selection (including Furniture) */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        items={items}
        initialCategory={selectedCategory}
      />

      {/* AI Visual Image Match Modal */}
      <VisualSearchModal
        isOpen={isVisualSearchOpen}
        onClose={() => setIsVisualSearchOpen(false)}
        storedItems={items}
        onSelectExistingItem={(item) => setActiveItem(item)}
        onUseMatchForNewItem={(_imageBlob, previewUrl, suggested) => {
          setItemToEdit({
            id: 'item-' + Date.now(),
            title: suggested.title || '',
            category: suggested.category || 'Ceramics & Porcelain',
            maker: suggested.maker || '',
            modelOrPattern: suggested.modelOrPattern || '',
            periodOrYear: suggested.periodOrYear || '',
            condition: 'Good',
            currency: 'GBP',
            primaryImageUrl: previewUrl,
            notes: suggested.notes || '',
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });
          setIsFormOpen(true);
        }}
      />

      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-stone-900 text-amber-100 text-xs font-medium px-4 py-2.5 rounded-xl shadow-xl border border-stone-700 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Minimal Footer */}
      <footer className="border-t border-stone-200 bg-white py-4 mt-12 text-center text-xs text-stone-500 font-mono">
        Curator &bull; Antiques & Fine Art Catalog &bull; Offline-Ready PWA
      </footer>
    </div>
  );
}

export default App;
