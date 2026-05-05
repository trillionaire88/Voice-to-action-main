import React from 'react'
import ReactDOM from 'react-dom/client'
import * as Sentry from '@sentry/react';
import App from '@/App.jsx'
import '@/index.css'
import { initialiseSecurity } from "@/lib/security";
import "@/lib/i18n";

Sentry.init({
  dsn: 'https://5867f6e65a6e66ffd2e949b4e3339ec9@o4511212214091776.ingest.us.sentry.io/4511212220776448',
  sendDefaultPii: false,
  environment: import.meta.env.PROD ? 'production' : 'development',
  tracesSampleRate: 0.2,
  replaysOnErrorSampleRate: 1.0,
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