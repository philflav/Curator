import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Curator Uncaught React Error:', error, errorInfo);
  }

  private handleReset = () => {
    // Clear any potentially corrupt cache keys and reload
    const doReload = () => {
      window.location.reload();
    };

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((regs) => {
        for (const reg of regs) {
          reg.unregister();
        }
        if ('caches' in window) {
          caches.keys().then((keys) => {
            for (const key of keys) {
              caches.delete(key);
            }
            doReload();
          }).catch(doReload);
        } else {
          doReload();
        }
      }).catch(doReload);
    } else {
      doReload();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#faf8f5] flex items-center justify-center p-6">
          <div className="bg-white max-w-md w-full p-8 rounded-2xl shadow-xl border border-stone-200 text-center">
            <div className="w-14 h-14 mx-auto mb-4 bg-amber-100 rounded-full flex items-center justify-center text-amber-800">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <h1 className="text-xl font-serif font-bold text-stone-900 mb-2">
              Curator Needs to Refresh
            </h1>
            <p className="text-sm text-stone-600 mb-6">
              A newer version of the catalog or cached assets was detected. Tap below to reload the latest version.
            </p>
            {this.state.error?.message && (
              <div className="p-3 bg-stone-100 rounded-lg text-xs font-mono text-stone-500 mb-6 text-left break-all max-h-24 overflow-y-auto">
                {this.state.error.message}
              </div>
            )}
            <button
              onClick={this.handleReset}
              className="w-full flex items-center justify-center gap-2 bg-stone-900 hover:bg-stone-800 text-amber-100 py-3 rounded-xl font-medium text-sm transition shadow-md"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Refresh & Update App</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
