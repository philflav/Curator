import React from 'react';
import { 
  Plus, 
  LayoutGrid, 
  List, 
  Search, 
  Database, 
  RotateCcw, 
  Download, 
  Camera,
  RefreshCw,
  WifiOff,
  CloudCheck,
  Sparkles,
  Smartphone
} from 'lucide-react';

interface NavbarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  viewMode: 'grid' | 'table';
  onViewModeChange: (mode: 'grid' | 'table') => void;
  onAddItem: () => void;
  onExport: () => void;
  onOpenVisualSearch: () => void;
  onOpenSettings: () => void;
  onOpenAiSettings?: () => void;
  onResetDemo: () => void;
  isFirebaseActive: boolean;
  totalItemsCount: number;
  totalValuation: number;
  pendingSyncCount?: number;
  isSyncing?: boolean;
  isOnline?: boolean;
  onTriggerSync?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  searchTerm,
  onSearchChange,
  viewMode,
  onViewModeChange,
  onAddItem,
  onExport,
  onOpenVisualSearch,
  onOpenSettings,
  onOpenAiSettings,
  onResetDemo,
  isFirebaseActive,
  totalItemsCount,
  totalValuation,
  pendingSyncCount = 0,
  isSyncing = false,
  isOnline = true,
  onTriggerSync,
}) => {
  const [installPrompt, setInstallPrompt] = React.useState<any>(null);
  const [isStandalone, setIsStandalone] = React.useState(false);

  React.useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      setIsStandalone(true);
    }

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) {
      alert(
        "To install Curator on your device:\n\n" +
        "• On iPhone / iPad (Safari): Tap the Share button at the bottom of the screen, scroll down and tap 'Add to Home Screen'.\n\n" +
        "• On Android (Chrome / Edge): Tap the three dots menu at the top right, then select 'Install App' or 'Add to Home screen'."
      );
      return;
    }
    installPrompt.prompt();
    const result = await installPrompt.userChoice;
    if (result.outcome === 'accepted') {
      setInstallPrompt(null);
      setIsStandalone(true);
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-[#faf8f5]/95 backdrop-blur-md border-b border-stone-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          
          {/* Brand & Stats */}
          <div className="flex items-center justify-between w-full md:w-auto">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-stone-800 text-amber-200 flex items-center justify-center shadow-inner font-serif font-bold text-xl">
                C
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-serif font-bold tracking-tight text-stone-900">
                    Curator
                  </h1>
                  <span className="text-xs px-2 py-0.5 rounded-full font-mono bg-stone-100 text-stone-600 border border-stone-200">
                    v1.0.0
                  </span>
                </div>
                <p className="text-xs text-stone-500 font-sans">
                  {totalItemsCount} cataloged items &bull; £{totalValuation.toLocaleString()} est. value
                </p>
              </div>
            </div>

            {/* Storage status button on mobile */}
            <div className="flex md:hidden items-center gap-1.5">
              {!isOnline && (
                <span className="px-2 py-1 rounded-md bg-stone-200 text-stone-700 text-xs flex items-center gap-1">
                  <WifiOff className="w-3 h-3 text-stone-500" />
                  Offline
                </span>
              )}
              {isSyncing && (
                <span className="px-2 py-1 rounded-md bg-amber-100 text-amber-900 text-xs flex items-center gap-1">
                  <RefreshCw className="w-3 h-3 animate-spin text-amber-700" />
                  Syncing
                </span>
              )}
              {pendingSyncCount > 0 && !isSyncing && (
                <button
                  onClick={isFirebaseActive ? onTriggerSync : onOpenSettings}
                  className="px-2 py-1 rounded-md bg-amber-500 text-stone-900 font-bold text-xs flex items-center gap-1 shadow-xs animate-pulse"
                  title="Synchronization Required"
                >
                  <RefreshCw className="w-3 h-3" />
                  Sync ({pendingSyncCount})
                </button>
              )}
              <button
                onClick={onOpenSettings}
                className={`text-xs px-2.5 py-1 rounded-full flex items-center gap-1.5 border font-medium ${
                  isFirebaseActive
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                    : 'bg-amber-50 text-amber-700 border-amber-300'
                }`}
              >
                <Database className="w-3.5 h-3.5" />
                {isFirebaseActive ? 'Firebase' : 'Local'}
              </button>
            </div>
          </div>

          {/* Search bar */}
          <div className="w-full md:max-w-md relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search maker, pattern, period, or notes..."
              className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-700/40 focus:border-amber-800 transition shadow-sm placeholder:text-stone-400"
            />
          </div>

          {/* Actions & Layout Toggles */}
          <div className="flex items-center justify-end w-full md:w-auto gap-2">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-stone-200/80 p-0.5 rounded-lg border border-stone-300">
              <button
                type="button"
                onClick={() => onViewModeChange('grid')}
                className={`p-1.5 rounded-md transition ${
                  viewMode === 'grid'
                    ? 'bg-white shadow-sm text-stone-900'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
                title="Card Grid View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => onViewModeChange('table')}
                className={`p-1.5 rounded-md transition ${
                  viewMode === 'table'
                    ? 'bg-white shadow-sm text-stone-900'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
                title="Dense Audit Table"
              >
                <List className="w-4 h-4" />
              </button>
            </div>

            {/* Offline status indicator if offline */}
            {!isOnline && (
              <div 
                className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-stone-200/80 text-stone-700 text-xs font-mono border border-stone-300"
                title="Application is operating in offline mode. Changes are saved locally in IndexedDB."
              >
                <WifiOff className="w-3.5 h-3.5 text-stone-500" />
                <span>Offline</span>
                {pendingSyncCount > 0 && (
                  <span className="bg-stone-300 px-1.5 py-0.2 rounded text-[10px]">
                    {pendingSyncCount} queued
                  </span>
                )}
              </div>
            )}

            {/* Live Sync Status indicator / Action */}
            {pendingSyncCount > 0 && (
              <button
                onClick={isFirebaseActive ? onTriggerSync : onOpenSettings}
                disabled={isSyncing}
                className="hidden md:flex text-xs px-3 py-1.5 rounded-lg items-center gap-1.5 font-bold bg-amber-500 hover:bg-amber-600 text-stone-900 border border-amber-600 shadow-xs transition animate-pulse"
                title="Synchronization Required: Click to synchronize changes with Firebase"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-stone-900 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Syncing...' : `Sync Required (${pendingSyncCount})`}</span>
              </button>
            )}

            {/* Storage button on desktop */}
            <button
              onClick={onOpenSettings}
              className={`hidden md:flex text-xs px-2.5 py-1.5 rounded-lg items-center gap-1.5 border font-medium transition ${
                isFirebaseActive
                  ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300'
                  : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-300'
              }`}
              title="Configure Firebase or Data Storage"
            >
              {isFirebaseActive ? (
                <>
                  <CloudCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Firebase Synced</span>
                </>
              ) : (
                <>
                  <Database className="w-3.5 h-3.5 text-amber-700" />
                  <span>Local Storage {pendingSyncCount > 0 ? `(${pendingSyncCount})` : ''}</span>
                </>
              )}
            </button>

            {/* Reset Demo button if on local */}
            {!isFirebaseActive && (
              <button
                onClick={onResetDemo}
                className="text-stone-500 hover:text-stone-800 p-2 rounded-lg hover:bg-stone-200/60 transition"
                title="Reset sample demonstration items"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}

            {/* AI Visual Match Button */}
            <button
              onClick={onOpenVisualSearch}
              className="flex items-center gap-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300/80 font-medium px-3 py-2 rounded-lg text-sm shadow-2xs transition"
              title="Compare a new image with stored catalog items"
            >
              <Camera className="w-4 h-4 text-amber-700" />
              <span className="hidden sm:inline">Visual Match</span>
            </button>

            {/* AI Settings Button */}
            {onOpenAiSettings && (
              <button
                onClick={onOpenAiSettings}
                className="p-2 text-stone-500 hover:text-stone-800 hover:bg-stone-200/60 rounded-lg border border-stone-200 bg-white transition"
                title="AI Vision & Appraisal Settings"
              >
                <Sparkles className="w-4 h-4 text-amber-700" />
              </button>
            )}

            {/* Install Mobile PWA Button */}
            {!isStandalone && (
              <button
                type="button"
                onClick={handleInstallClick}
                className="flex items-center gap-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-medium px-3 py-2 rounded-lg text-sm shadow-xs transition"
                title="Install Curator as an app on your phone or desktop"
              >
                <Smartphone className="w-4 h-4 text-amber-800" />
                <span className="hidden sm:inline">Install App</span>
              </button>
            )}

            {/* Export Collection Button */}
            <button
              onClick={onExport}
              className="flex items-center gap-1.5 bg-white hover:bg-stone-50 text-stone-700 border border-stone-300 font-medium px-3 py-2 rounded-lg text-sm shadow-xs transition"
              title="Export Collection as CSV or JSON"
            >
              <Download className="w-4 h-4 text-stone-500" />
              <span className="hidden sm:inline">Export</span>
            </button>

            {/* Add Item Button */}
            <button
              onClick={onAddItem}
              className="flex items-center gap-1.5 bg-stone-800 hover:bg-stone-900 text-amber-100 font-medium px-3.5 py-2 rounded-lg text-sm shadow transition"
            >
              <Plus className="w-4 h-4" />
              <span>Add Item</span>
            </button>
          </div>

        </div>
      </div>
    </header>
  );
};
