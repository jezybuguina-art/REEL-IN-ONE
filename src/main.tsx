import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Guard against benign frontend environment/websocket network warnings in the cloud staging containers
if (typeof window !== "undefined") {
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const msg = String(reason?.message || reason || '');
    if (
      msg.toLowerCase().includes('websocket') || 
      msg.toLowerCase().includes('vite') || 
      msg.toLowerCase().includes('hmr') ||
      msg.toLowerCase().includes('ws') ||
      msg.toLowerCase().includes('socket')
    ) {
      event.preventDefault();
      event.stopImmediatePropagation();
      console.warn('[Vite Websocket/HMR Warning Suppressed]', reason);
    }
  }, true);

  window.addEventListener('error', (event) => {
    const msg = String(event.message || '');
    const errorMsg = event.error ? String(event.error.message || event.error) : '';
    if (
      msg.toLowerCase().includes('websocket') || 
      msg.toLowerCase().includes('vite') || 
      msg.toLowerCase().includes('hmr') ||
      msg.toLowerCase().includes('ws') ||
      msg.toLowerCase().includes('socket') ||
      errorMsg.toLowerCase().includes('websocket') ||
      errorMsg.toLowerCase().includes('socket')
    ) {
      event.preventDefault();
      event.stopImmediatePropagation();
      console.warn('[Vite Websocket/HMR Error Suppressed]', event.error || event.message);
    }
  }, true);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
