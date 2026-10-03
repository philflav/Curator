import React, { useState, useEffect } from 'react';
import { 
  X, 
  Sparkles, 
  Check, 
  AlertCircle, 
  Activity, 
  Key, 
  Globe, 
  Cpu, 
  HelpCircle 
} from 'lucide-react';
import { 
  getVisionConfig, 
  saveVisionConfig, 
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
  const [provider, setProvider] = useState<VisionConfig['provider']>('builtin');
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [model, setModel] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const cfg = getVisionConfig();
      setProvider(cfg.provider);
      setApiKey(cfg.apiKey);
      setBaseUrl(cfg.baseUrl);
      setModel(cfg.model);
      setTestResult(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleProviderSelect = (newProvider: VisionConfig['provider']) => {
    setProvider(newProvider);
    setTestResult(null);

    if (newProvider === 'builtin') {
      setBaseUrl('http://localhost:11434/v1');
      setModel('builtin-appraiser');
      setApiKey('');
    } else if (newProvider === 'openai') {
      setBaseUrl('https://api.openai.com/v1');
      setModel('gpt-4o-mini');
    } else if (newProvider === 'gemini') {
      setBaseUrl('https://generativelanguage.googleapis.com/v1beta');
      setModel('gemini-2.5-flash');
    } else if (newProvider === 'ollama') {
      setBaseUrl('http://localhost:11434/v1');
      setModel('llava');
      setApiKey('');
    }
  };

  const handleApiKeyChange = (val: string) => {
    setApiKey(val);
    if (val.trim().startsWith('AIzaSy') && provider !== 'gemini') {
      setProvider('gemini');
      setBaseUrl('https://generativelanguage.googleapis.com/v1beta');
      setModel('gemini-2.5-flash');
    }
  };

  const handleTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const result = await testVisionConnection({
        provider,
        baseUrl: baseUrl.trim(),
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
    let finalBaseUrl = baseUrl.trim();
    let finalModel = model.trim();
    if (provider === 'gemini' || apiKey.trim().startsWith('AIzaSy')) {
      if (!finalBaseUrl || finalBaseUrl.includes('/openai')) {
        finalBaseUrl = 'https://generativelanguage.googleapis.com/v1beta';
      }
      if (!finalModel || finalModel === 'gpt-4o-mini') {
        finalModel = 'gemini-2.5-flash';
      }
    }

    saveVisionConfig({
      provider: apiKey.trim().startsWith('AIzaSy') ? 'gemini' : provider,
      baseUrl: finalBaseUrl,
      apiKey: apiKey.trim(),
      model: finalModel,
    });
    if (onConfigSaved) onConfigSaved();
    onClose();
  };

  const handleResetToBuiltin = () => {
    handleProviderSelect('builtin');
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
                AI Appraisal Vision Settings
              </h2>
              <p className="text-xs text-stone-500">
                Configure multimodal model for automatic backstamp & object appraisal
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
          {/* Provider Selection */}
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-stone-700 font-semibold mb-2">
              Vision Intelligence Provider
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleProviderSelect('builtin')}
                className={`p-3 rounded-xl border text-left transition flex flex-col gap-1 ${
                  provider === 'builtin'
                    ? 'border-amber-700 bg-amber-50/80 shadow-xs ring-1 ring-amber-700'
                    : 'border-stone-200 bg-white hover:bg-stone-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs text-stone-900">Built-in Appraiser</span>
                  {provider === 'builtin' && <Check className="w-3.5 h-3.5 text-amber-800" />}
                </div>
                <span className="text-[11px] text-stone-500">
                  Zero setup • Works 100% offline
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleProviderSelect('openai')}
                className={`p-3 rounded-xl border text-left transition flex flex-col gap-1 ${
                  provider === 'openai'
                    ? 'border-amber-700 bg-amber-50/80 shadow-xs ring-1 ring-amber-700'
                    : 'border-stone-200 bg-white hover:bg-stone-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs text-stone-900">OpenAI Vision</span>
                  {provider === 'openai' && <Check className="w-3.5 h-3.5 text-amber-800" />}
                </div>
                <span className="text-[11px] text-stone-500">
                  GPT-4o / GPT-4o-mini
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleProviderSelect('gemini')}
                className={`p-3 rounded-xl border text-left transition flex flex-col gap-1 ${
                  provider === 'gemini'
                    ? 'border-amber-700 bg-amber-50/80 shadow-xs ring-1 ring-amber-700'
                    : 'border-stone-200 bg-white hover:bg-stone-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs text-stone-900">Google Gemini</span>
                  {provider === 'gemini' && <Check className="w-3.5 h-3.5 text-amber-800" />}
                </div>
                <span className="text-[11px] text-stone-500">
                  Gemini 2.5 Flash / Lite
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleProviderSelect('ollama')}
                className={`p-3 rounded-xl border text-left transition flex flex-col gap-1 ${
                  provider === 'ollama'
                    ? 'border-amber-700 bg-amber-50/80 shadow-xs ring-1 ring-amber-700'
                    : 'border-stone-200 bg-white hover:bg-stone-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs text-stone-900">Local Ollama</span>
                  {provider === 'ollama' && <Check className="w-3.5 h-3.5 text-amber-800" />}
                </div>
                <span className="text-[11px] text-stone-500">
                  Local LLaVA / Moondream
                </span>
              </button>
            </div>
          </div>

          {/* Configuration Inputs for Non-Builtin */}
          {provider !== 'builtin' && (
            <div className="space-y-3 p-4 bg-white rounded-xl border border-stone-200">
              {provider !== 'ollama' && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-mono uppercase tracking-wider text-stone-700 font-semibold flex items-center gap-1.5">
                      <Key className="w-3.5 h-3.5 text-stone-400" />
                      API Key
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowKey(!showKey)}
                      className="text-[10px] text-stone-500 hover:text-stone-800"
                    >
                      {showKey ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={(e) => handleApiKeyChange(e.target.value)}
                    placeholder={provider === 'openai' ? 'sk-...' : provider === 'gemini' ? 'AIzaSy... (from Google AI Studio)' : 'Enter API Key'}
                    className="w-full px-3 py-2 text-xs font-mono bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-700/40"
                  />
                  {provider === 'gemini' && (
                    <p className="mt-1 text-[11px] text-stone-500">
                      Get a free Gemini API key at{' '}
                      <a
                        href="https://aistudio.google.com/app/apikey"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-amber-800 underline font-medium hover:text-amber-950"
                      >
                        Google AI Studio
                      </a>{' '}
                      (Free tier includes high-accuracy multimodal visual appraisals).
                    </p>
                  )}
                </div>
              )}

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-stone-700 font-semibold mb-1 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-stone-400" />
                  Base Endpoint URL
                </label>
                <input
                  type="text"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder={provider === 'gemini' ? 'https://generativelanguage.googleapis.com/v1beta' : 'https://api.openai.com/v1'}
                  className="w-full px-3 py-2 text-xs font-mono bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-700/40"
                />
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
                  placeholder={provider === 'gemini' ? 'gemini-2.5-flash' : 'gpt-4o-mini'}
                  className="w-full px-3 py-2 text-xs font-mono bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-700/40"
                />
              </div>
            </div>
          )}

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
            <HelpCircle className="w-4 h-4 text-amber-800 flex-shrink-0 mt-0.5" />
            <div className="text-[11px] leading-relaxed">
              <strong>Offline-First Design:</strong> If no external API key is entered or the network is offline, Curator automatically uses the built-in collector knowledge base to appraise objects, hallmarks, and write museum-quality descriptions.
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
              onClick={handleResetToBuiltin}
              className="px-3 py-1.5 text-xs text-stone-500 hover:text-stone-800 font-medium"
            >
              Reset to Default
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
