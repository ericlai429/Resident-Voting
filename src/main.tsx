import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

// 自動捕獲版本更新後的舊快取失效錯誤 (解決按 F5 讀取到舊 chunk 404 白畫面問題)
window.addEventListener('vite:preloadError', (event) => {
  console.warn('Vite 靜態資源版本更新，自動刷新至最新版本:', event);
  const reloadKey = 'last_chunk_reload_ts';
  const now = Date.now();
  const lastReload = parseInt(sessionStorage.getItem(reloadKey) || '0', 10);
  if (now - lastReload > 5000) {
    sessionStorage.setItem(reloadKey, String(now));
    window.location.reload();
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
