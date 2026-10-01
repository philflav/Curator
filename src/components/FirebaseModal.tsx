import { useState, useEffect } from 'react';
import { 
  X, 
  Database, 
  Check, 
  AlertCircle, 
  HelpCircle,
  RotateCcw,
  RefreshCw,
  ClipboardCheck,
  Activity,
  CloudUpload
} from 'lucide-react';
import { 
  getStoredFirebaseConfig, 
  saveStoredFirebaseConfig, 
  testFirebaseConnection,
  parseFirebaseSnippet,
  initFirebase,
  sanitizeForFirestore,
  type FirebaseConfig 
} from '../services/firebase';
import { 
  getPendingSyncCount, 
  processSyncQueue,
  clearSyncQueue 
} from '../services/syncService';
import { getIDBItems } from '../services/storageService';
import { doc, setDoc } from 'firebase/firestore';

interface FirebaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigChanged: () => void;
  isFirebaseActive: boolean;
}

export const FirebaseModal: React.FC<FirebaseModalProps> = ({
  isOpen,
  onClose,
  onConfigChanged,
  isFirebaseActive,
}) => {
  const currentConfig = getStoredFirebaseConfig();
  const [apiKey, setApiKey] = useState(currentConfig?.apiKey || '');
  const [projectId, setProjectId] = useState(currentConfig?.projectId || '');
  const [authDomain, setAuthDomain] = useState(currentConfig?.authDomain || '');
  const [storageBucket, setStorageBucket] = useState(currentConfig?.storageBucket || '');
  const [messagingSenderId, setMessagingSenderId] = useState(currentConfig?.messagingSenderId || '');
  const [appId, setAppId] = useState(currentConfig?.appId || '');

  // Snippet paste box toggle
  const [showPasteBox, setShowPasteBox] = useState(false);
  const [snippetText, setSnippetText] = useState('');

  // Connection testing state
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Sync Queue state
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const cfg = getStoredFirebaseConfig();
      if (cfg) {
        setApiKey(cfg.apiKey || '');
        setProjectId(cfg.projectId || '');
        setAuthDomain(cfg.authDomain || '');
        setStorageBucket(cfg.storageBucket || '');
        setMessagingSenderId(cfg.messagingSenderId || '');
        setAppId(cfg.appId || '');
      }
      getPendingSyncCount().then(setPendingCount);
      setTestResult(null);
      setSyncStatusMsg(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleApplySnippet = () => {
    const parsed = parseFirebaseSnippet(snippetText);
    if (!parsed) {
      alert('Could not extract Firebase credentials from the provided text. Please ensure it contains apiKey and projectId.');
      return;
    }
    setApiKey(parsed.apiKey);
    setProjectId(parsed.projectId);
    setAuthDomain(parsed.authDomain);
    setStorageBucket(parsed.storageBucket);
    setMessagingSenderId(parsed.messagingSenderId);
    setAppId(parsed.appId);
    setShowPasteBox(false);
    setSnippetText('');
    setTestResult(null);
  };

  const handleTestConnection = async () => {
    if (!apiKey.trim() || !projectId.trim()) {
      alert('Please fill in API Key and Project ID first.');
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    const testCfg: FirebaseConfig = {
      apiKey: apiKey.trim(),
      projectId: projectId.trim(),
      authDomain: authDomain.trim() || `${projectId.trim()}.firebaseapp.com`,
      storageBucket: storageBucket.trim() || `${projectId.trim()}.firebasestorage.app`,
      messagingSenderId: messagingSenderId.trim(),
      appId: appId.trim(),
    };

    try {
      const res = await testFirebaseConnection(testCfg);
      setTestResult(res);
    } catch (e: any) {
      setTestResult({
        success: false,
        message: e?.message || 'Connection test failed',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleTriggerSync = async () => {
    setIsSyncing(true);
    setSyncStatusMsg(null);
    try {
      const res = await processSyncQueue();
      setSyncStatusMsg(res.message);
      const count = await getPendingSyncCount();
      setPendingCount(count);
      onConfigChanged();
    } catch (err: any) {
      setSyncStatusMsg(`Sync failed: ${err?.message || err}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const [isPushingAll, setIsPushingAll] = useState(false);

  const handlePushAllToFirestore = async () => {
    setIsPushingAll(true);
    setSyncStatusMsg('Pushing all local items to Cloud Firestore...');
    try {
      const items = await getIDBItems();
      const { db } = initFirebase();
      if (!db) throw new Error('Firestore not initialized. Please verify configuration.');
      
      let count = 0;
      for (const item of items) {
        const docRef = doc(db, 'items', item.id);
        await setDoc(docRef, sanitizeForFirestore(item), { merge: true });
        count++;
      }
      setSyncStatusMsg(`Successfully pushed ${count} catalog items to Cloud Firestore!`);
      await clearSyncQueue();
      setPendingCount(0);
      onConfigChanged();
    } catch (err: any) {
      setSyncStatusMsg(`Upload failed: ${err?.message || err}`);
    } finally {
      setIsPushingAll(false);
    }
  };

  const handleClearQueue = async () => {
    if (window.confirm('Clear all pending offline sync records? Any local items will remain in your catalog.')) {
      await clearSyncQueue();
      setPendingCount(0);
      setSyncStatusMsg('Offline sync queue cleared.');
      onConfigChanged();
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim() || !projectId.trim()) {
      alert('Please provide at least the Firebase API Key and Project ID');
      return;
    }

    const config: FirebaseConfig = {
      apiKey: apiKey.trim(),
      projectId: projectId.trim(),
      authDomain: authDomain.trim() || `${projectId.trim()}.firebaseapp.com`,
      storageBucket: storageBucket.trim() || `${projectId.trim()}.firebasestorage.app`,
      messagingSenderId: messagingSenderId.trim(),
      appId: appId.trim(),
    };

    saveStoredFirebaseConfig(config);
    onConfigChanged();
    onClose();
  };

  const handleClear = () => {
    if (window.confirm('Disconnect Firebase and operate purely in local offline mode?')) {
      saveStoredFirebaseConfig(null);
      setApiKey('');
      setProjectId('');
      setAuthDomain('');
      setStorageBucket('');
      setMessagingSenderId('');
      setAppId('');
      onConfigChanged();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div 
        className="bg-[#faf8f5] w-full max-w-lg rounded-2xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-white">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-amber-700" />
            <h2 className="text-base font-serif font-bold text-stone-900">
              Firebase & Local Storage Engine
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSave} className="overflow-y-auto p-6 space-y-4">
          {/* Status banner */}
          <div className={`p-3.5 rounded-xl border flex items-start gap-3 ${
            isFirebaseActive 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
              : 'bg-amber-50 border-amber-200 text-amber-900'
          }`}>
            {isFirebaseActive ? (
              <Check className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            )}
            <div className="text-xs">
              <div className="font-semibold text-sm">
                {isFirebaseActive ? 'Live Firebase Backend Active' : 'Local Storage Mode'}
              </div>
              <p className="mt-1 leading-relaxed text-stone-600">
                {isFirebaseActive 
                  ? 'All changes save locally to on-device IndexedDB and automatically synchronize with Cloud Firestore and Cloud Storage.' 
                  : 'Operating locally using IndexedDB (with multi-gigabyte storage capacity). Items are persisted on-device and will automatically synchronize when Firebase credentials are configured.'}
              </p>
            </div>
          </div>

          {/* Offline Sync Outbox Status Card */}
          <div className="p-3.5 bg-white rounded-xl border border-stone-200 text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CloudUpload className="w-4 h-4 text-amber-700" />
                <span className="font-semibold text-stone-800">Offline Synchronization Queue:</span>
              </div>
              <span className={`px-2 py-0.5 rounded font-mono font-medium ${
                pendingCount > 0 
                  ? 'bg-amber-100 text-amber-900 border border-amber-300' 
                  : 'bg-stone-100 text-stone-600'
              }`}>
                {pendingCount} change{pendingCount === 1 ? '' : 's'} pending
              </span>
            </div>

            {pendingCount > 0 && (
              <div className="mt-2.5 flex items-center justify-between pt-2 border-t border-stone-100">
                <span className="text-stone-500">
                  {isFirebaseActive 
                    ? 'Pending changes ready to push to Firestore.' 
                    : 'Changes will sync automatically once Firebase is connected.'}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleClearQueue}
                    disabled={isSyncing}
                    className="px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-medium border border-stone-200"
                    title="Clear pending queue items if stuck"
                  >
                    Clear Queue
                  </button>
                  {isFirebaseActive && (
                    <button
                      type="button"
                      onClick={handleTriggerSync}
                      disabled={isSyncing}
                      className="flex items-center gap-1 bg-amber-700 hover:bg-amber-800 disabled:opacity-50 text-white px-2.5 py-1 rounded-lg text-xs font-medium transition shadow-xs"
                    >
                      <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
                      <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {isFirebaseActive && (
              <div className="mt-2.5 pt-2 border-t border-stone-100 flex items-center justify-between">
                <span className="text-stone-500 text-[11px]">
                  Cloud catalog sync:
                </span>
                <button
                  type="button"
                  onClick={handlePushAllToFirestore}
                  disabled={isPushingAll || isSyncing}
                  className="flex items-center gap-1.5 bg-stone-800 hover:bg-stone-900 disabled:opacity-50 text-amber-200 px-2.5 py-1 rounded-lg text-xs font-medium transition shadow-xs"
                >
                  <CloudUpload className={`w-3.5 h-3.5 ${isPushingAll ? 'animate-bounce' : ''}`} />
                  <span>{isPushingAll ? 'Uploading...' : 'Push All Items to Firestore'}</span>
                </button>
              </div>
            )}

            {syncStatusMsg && (
              <p className="mt-2 text-[11px] font-mono text-emerald-700 bg-emerald-50 p-1.5 rounded border border-emerald-200">
                {syncStatusMsg}
              </p>
            )}
          </div>

          {/* Quick Paste Snippet Toggle */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-xs font-mono uppercase text-stone-500 font-semibold">
              Firebase Credentials
            </span>
            <button
              type="button"
              onClick={() => setShowPasteBox(!showPasteBox)}
              className="text-xs text-amber-800 hover:text-amber-900 font-medium flex items-center gap-1"
            >
              <ClipboardCheck className="w-3.5 h-3.5" />
              <span>{showPasteBox ? 'Hide Snippet Tool' : 'Paste from Firebase Console'}</span>
            </button>
          </div>

          {showPasteBox && (
            <div className="p-3 bg-stone-100 rounded-xl border border-stone-300 space-y-2 animate-in fade-in duration-150">
              <label className="block text-[11px] font-medium text-stone-700">
                Paste your Firebase Config snippet or JSON:
              </label>
              <textarea
                rows={4}
                value={snippetText}
                onChange={(e) => setSnippetText(e.target.value)}
                placeholder={'const firebaseConfig = {\n  apiKey: "AIzaSy...",\n  projectId: "curator-app",\n  ...\n};'}
                className="w-full p-2 text-xs font-mono bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-700"
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleApplySnippet}
                  className="px-3 py-1 bg-amber-700 hover:bg-amber-800 text-white rounded text-xs font-medium"
                >
                  Auto-fill Form Fields
                </button>
              </div>
            </div>
          )}

          {/* Form Fields */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-stone-700 font-semibold mb-1">
                Firebase API Key *
              </label>
              <input
                type="text"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full px-3 py-2 text-xs font-mono bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-700/40"
              />
            </div>

            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-stone-700 font-semibold mb-1">
                Project ID *
              </label>
              <input
                type="text"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                placeholder="my-antiques-app"
                className="w-full px-3 py-2 text-xs font-mono bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-700/40"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-stone-700 font-semibold mb-1">
                  Storage Bucket
                </label>
                <input
                  type="text"
                  value={storageBucket}
                  onChange={(e) => setStorageBucket(e.target.value)}
                  placeholder="app.firebasestorage.app"
                  className="w-full px-2.5 py-1.5 text-xs font-mono bg-white border border-stone-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-stone-700 font-semibold mb-1">
                  App ID
                </label>
                <input
                  type="text"
                  value={appId}
                  onChange={(e) => setAppId(e.target.value)}
                  placeholder="1:123456:web:..."
                  className="w-full px-2.5 py-1.5 text-xs font-mono bg-white border border-stone-300 rounded-lg"
                />
              </div>
            </div>
          </div>

          {/* Test Connection Button & Result */}
          <div className="pt-2">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={isTesting || !apiKey.trim() || !projectId.trim()}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 border border-stone-300 hover:bg-stone-50 disabled:opacity-50 text-stone-700 rounded-lg text-xs font-medium transition"
            >
              <Activity className={`w-3.5 h-3.5 text-amber-700 ${isTesting ? 'animate-spin' : ''}`} />
              <span>{isTesting ? 'Testing Firestore Connection...' : 'Test Connection to Firestore'}</span>
            </button>

            {testResult && (
              <div className={`mt-2 p-2.5 rounded-lg border text-xs flex items-start gap-2 ${
                testResult.success 
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
                  : 'bg-rose-50 border-rose-200 text-rose-900'
              }`}>
                {testResult.success ? (
                  <Check className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                )}
                <span>{testResult.message}</span>
              </div>
            )}
          </div>

          <div className="text-xs text-stone-500 leading-relaxed bg-white p-3 rounded-xl border border-stone-200">
            <p className="font-medium text-stone-700 mb-0.5 flex items-center gap-1">
              <HelpCircle className="w-3.5 h-3.5 text-amber-700" />
              Tip:
            </p>
            <p>
              You can also specify these credentials in <code className="bg-stone-100 px-1 py-0.5 rounded font-mono">.env.local</code> as <code className="font-mono">VITE_FIREBASE_API_KEY</code> and <code className="font-mono">VITE_FIREBASE_PROJECT_ID</code>.
            </p>
          </div>

          {/* Action buttons */}
          <div className="pt-3 border-t border-stone-200 flex items-center justify-between">
            {isFirebaseActive ? (
              <button
                type="button"
                onClick={handleClear}
                className="text-xs text-rose-700 hover:text-rose-900 font-medium flex items-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Disconnect
              </button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 text-xs text-stone-600 hover:text-stone-900 font-medium"
              >
                Close
              </button>
              <button
                type="submit"
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-900 text-amber-100 text-xs font-medium shadow transition"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Save & Connect</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
