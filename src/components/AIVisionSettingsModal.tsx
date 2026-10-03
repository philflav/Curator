import React, { useState, useEffect } from 'react';
import { 
  X, 
  Sparkles, 
  Check, 
  AlertCircle, 
  Activity, 
  Key, 
  Cpu, 
  ExternalLink,
  RotateCcw,
  Info
} from 'lucide-react';
import { 
  getVisionConfig, 
  saveVisionConfig, 
  clearManualVisionConfig,
  testVisionConnection, 
  type VisionConfig 
} from '../services/aiVisionService';

interface AIVisionSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigSaved?: () => void;
}

export const AIVisionSettingsModal: React.FC<AIVisionSettingsModalProps> = ({
  isOpen,
  onClose,
  onConfigSaved,
}) => {
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('gemini-2.5-flash');
  const [isEnvKey, setIsEnvKey] = useState(false);
  const [hasManualKey, setHasManualKey] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const cfg: VisionConfig = getVisionConfig();
      setApiKey(cfg.apiKey);
      setModel(cfg.model || 'gemini-2.5-flash');
      setIsEnvKey(Boolean(cfg.isEnvKey));
      setHasManualKey(Boolean(cfg.hasManualKey));
      setTestResult(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const result = await testVisionConnection({
        apiKey: apiKey.trim(),
        model: model.trim(),
      });
      setTestResult(result);
    } catch (e: any) {
      setTestResult({
        success: false,
        message: e?.message || 'Connection test failed',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = () => {
    saveVisionConfig({
      apiKey: apiKey.trim(),
      model: model.trim() || 'gemini-2.5-flash',
    });
    if (onConfigSaved) onConfigSaved();
    onClose();
  };

  const handleRestoreEnvKey = () => {
    clearManualVisionConfig();
    const cfg = getVisionConfig();
    setApiKey(cfg.apiKey);
    setModel(cfg.model || 'gemini-2.5-flash');
    setIsEnvKey(Boolean(cfg.isEnvKey));
    setHasManualKey(false);
    setTestResult(null);
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
            <div className="p-1.5 bg-amber-100 text-amber-900 rounded-lg">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-serif font-bold text-stone-900">
                Google Gemini Settings
              </h2>
              <p className="text-xs text-stone-500">
                AI visual intelligence for object appraisal, hallmarks, & descriptions
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
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Key Source Indicator */}
          {isEnvKey && !hasManualKey && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>Loaded from <code className="font-mono text-[11px] bg-emerald-100 px-1 py-0.5 rounded">.env.local</code> file</span>
              </div>
              <span className="text-[11px] text-emerald-700 font-medium">Active</span>
            </div>
          )}

          {hasManualKey && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-950 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-amber-700 flex-shrink-0" />
                <span>Using manual browser key override</span>
              </div>
              <button
                type="button"
                onClick={handleRestoreEnvKey}
                className="text-[11px] text-amber-800 hover:text-amber-950 underline font-medium flex items-center gap-1"
                title="Restore key loaded from .env.local"
              >
                <RotateCcw className="w-3 h-3" />
                Restore .env.local
              </button>
            </div>
          )}

          {/* Configuration Inputs */}
          <div className="space-y-4 p-4 bg-white rounded-xl border border-stone-200 shadow-2xs">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-mono uppercase tracking-wider text-stone-700 font-semibold flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-stone-400" />
                  Google Gemini API Key
                </label>
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="text-[11px] text-stone-500 hover:text-stone-800"
                >
                  {showKey ? 'Hide Key' : 'Show Key'}
                </button>
              </div>
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value);
                  setHasManualKey(true);
                }}
                placeholder="AIzaSy... (from Google AI Studio)"
                className="w-full px-3 py-2 text-xs font-mono bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-700/40"
              />
              <p className="mt-1.5 text-[11px] text-stone-500 flex items-center gap-1">
                <span>Free forever tier available at</span>
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-amber-800 underline font-medium hover:text-amber-950 inline-flex items-center gap-0.5"
                >
                  Google AI Studio <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </p>
            </div>

            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-stone-700 font-semibold mb-1 flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-stone-400" />
                Model Identifier
              </label>
              <input
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="gemini-2.5-flash"
                className="w-full px-3 py-2 text-xs font-mono bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-700/40"
              />
              <p className="mt-1 text-[11px] text-stone-400">
                Recommended: <code className="font-mono text-stone-600">gemini-2.5-flash</code> (fast, accurate multimodal appraisal)
              </p>
            </div>
          </div>

          {/* Test Status Feedback */}
          {testResult && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 animate-in fade-in duration-150 ${
                testResult.success
                  ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                  : 'bg-red-50 text-red-900 border-red-200'
              }`}
            >
              {testResult.success ? (
                <Check className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <span className="font-semibold block">
                  {testResult.success ? 'Connection Verified' : 'Connection Error'}
                </span>
                <span className="text-[11px] opacity-90">{testResult.message}</span>
              </div>
            </div>
          )}

          {/* Information box */}
          <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200/80 text-xs text-amber-950 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-amber-800 flex-shrink-0 mt-0.5" />
            <div className="text-[11px] leading-relaxed">
              <strong>Persistence & Security:</strong> Keys entered here are stored locally in your browser's secure offline storage. You can also specify <code className="font-mono">VITE_GEMINI_API_KEY</code> in <code className="font-mono">.env.local</code> for automatic deployment.
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3.5 bg-stone-50 border-t border-stone-200 flex items-center justify-between">
          <button
            type="button"
            onClick={handleTest}
            disabled={isTesting}
            className="px-3 py-1.5 text-xs font-medium text-stone-700 hover:text-stone-900 border border-stone-300 rounded-lg bg-white hover:bg-stone-50 transition flex items-center gap-1.5 disabled:opacity-50"
          >
            <Activity className={`w-3.5 h-3.5 text-amber-700 ${isTesting ? 'animate-spin' : ''}`} />
            <span>{isTesting ? 'Testing...' : 'Test Connection'}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-stone-500 hover:text-stone-800 font-medium"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-1.5 text-xs bg-stone-900 hover:bg-stone-800 text-amber-100 rounded-lg font-semibold shadow-xs transition"
            >
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
