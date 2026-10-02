import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { ErrorBoundary } from './components/ErrorBoundary';
import { registerSW } from 'virtual:pwa-register';

// Register PWA Service Worker with automatic update handling
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    // Automatically accept new version and activate
    updateSW(true);
  },
  onRegisteredSW(_swUrl, registration) {
    if (registration) {
      // Periodically check for new updates every 10 minutes
      setInterval(() => {
        registration.update().catch(() => {});
      }, 10 * 60 * 1000);
    }
  },
});

// Auto-reload when new service worker takes over clients
if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    window.location.reload();
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
