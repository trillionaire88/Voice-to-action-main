import React from 'react'
import ReactDOM from 'react-dom/client'
import * as Sentry from '@sentry/react';
import App from '@/App.jsx'
import '@/index.css'
import '@/globals.css'
import { initialiseSecurity } from "@/lib/security";
import "@/lib/i18n";

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  sendDefaultPii: false,
  environment: import.meta.env.PROD ? 'production' : 'development',
  tracesSampleRate: import.meta.env.PROD ? 0.05 : 0.2,
  replaysOnErrorSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
  replaysSessionSampleRate: 0,
  integrations: import.meta.env.VITE_SENTRY_DSN
    ? [
        Sentry.replayIntegration({
          maskAllText: true,
          blockAllMedia: false,
        }),
      ]
    : [],
});

initialiseSecurity();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)

if (import.meta.hot) {
  import.meta.hot.on('vite:beforeUpdate', () => {
    window.parent?.postMessage({ type: 'sandbox:beforeUpdate' }, '*');
  });
  import.meta.hot.on('vite:afterUpdate', () => {
    window.parent?.postMessage({ type: 'sandbox:afterUpdate' }, '*');
  });
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}