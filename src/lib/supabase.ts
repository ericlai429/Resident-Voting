import { createClient, SupabaseClient } from '@supabase/supabase-js';

const STORAGE_KEY_URL = 'resident_voting_supabase_url';
const STORAGE_KEY_KEY = 'resident_voting_supabase_key';

// 自動清洗與校正 Supabase Project URL (自動去除 /rest/v1、結尾斜線或從 dashboard 網址擷取)
export function cleanSupabaseUrl(raw: string): string {
  if (!raw) return '';
  let url = raw.trim();

  // 若使用者複製了後台儀表板網址如 https://supabase.com/dashboard/project/xigfbdsbtmmsbogetoeh/...
  const dashMatch = url.match(/supabase\.com\/dashboard\/project\/([a-z0-9_-]+)/i);
  if (dashMatch && dashMatch[1]) {
    return `https://${dashMatch[1]}.supabase.co`;
  }

  // 去除結尾的 /rest/v1, /rest, /auth/v1 或斜線
  url = url.replace(/\/rest\/v1\/?$/i, '');
  url = url.replace(/\/rest\/?$/i, '');
  url = url.replace(/\/auth\/v1\/?$/i, '');
  url = url.replace(/\/+$/, '');

  // 若使用者漏掉了 https://
  if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
    url = `https://${url}`;
  }

  return url;
}

// 預設讀取環境變數，若無則檢查本機 LocalStorage
export function getStoredSupabaseConfig() {
  const envUrl = cleanSupabaseUrl(import.meta.env.VITE_SUPABASE_URL || '');
  const envKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

  const localUrl = cleanSupabaseUrl(localStorage.getItem(STORAGE_KEY_URL) || '');
  const localKey = (localStorage.getItem(STORAGE_KEY_KEY) || '').trim();

  return {
    url: localUrl || envUrl,
    key: localKey || envKey,
  };
}

export function saveSupabaseConfig(url: string, key: string) {
  const cleanedUrl = cleanSupabaseUrl(url);
  const cleanedKey = key.trim();

  if (cleanedUrl && cleanedKey) {
    localStorage.setItem(STORAGE_KEY_URL, cleanedUrl);
    localStorage.setItem(STORAGE_KEY_KEY, cleanedKey);
    initSupabaseClient();
  } else {
    localStorage.removeItem(STORAGE_KEY_URL);
    localStorage.removeItem(STORAGE_KEY_KEY);
    activeClient = null;
  }
}

let activeClient: SupabaseClient | null = null;

export function initSupabaseClient(): SupabaseClient | null {
  const { url, key } = getStoredSupabaseConfig();
  if (url && key) {
    try {
      activeClient = createClient(url, key, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        },
      });
      return activeClient;
    } catch (err) {
      console.error('Supabase 初始化失敗:', err);
      activeClient = null;
      return null;
    }
  }
  activeClient = null;
  return null;
}

export function getSupabase(): SupabaseClient | null {
  if (!activeClient) {
    initSupabaseClient();
  }
  return activeClient;
}

// 測試 Supabase 連線狀態
export async function testSupabaseConnection(url?: string, key?: string): Promise<{ success: boolean; message: string; isHibernated?: boolean }> {
  const testUrl = cleanSupabaseUrl(url || getStoredSupabaseConfig().url);
  const testKey = (key || getStoredSupabaseConfig().key).trim();

  if (!testUrl || !testKey) {
    return { success: false, message: '尚未提供 Supabase URL 或 API Key' };
  }

  try {
    const client = createClient(testUrl, testKey);
    const { error } = await client.from('communities').select('id').limit(1);

    if (error) {
      // 1. 若資料庫連線成功，但表格尚未建立 (PGRST205 / Could not find table)
      if (error.message.includes('Could not find the table') || (error as any).code === 'PGRST205') {
        return {
          success: true,
          message: '✅ 連線成功！Supabase 雲端伺服器與 API 金鑰認證完全正常。(目前資料庫為空，請至 SQL Editor 貼上建表腳本)'
        };
      }

      // 2. 判斷是否為休眠 (Paused) 或 DNS 異常
      if (error.message.includes('fetch failed') || error.message.includes('ENOTFOUND') || error.message.includes('502')) {
        return {
          success: false,
          isHibernated: true,
          message: 'Supabase 專案可能處於休眠（Paused）狀態或網址錯誤，請至 Supabase Dashboard 點擊「Restore project」喚醒。'
        };
      }

      // 3. 網址路徑錯誤提示
      if (error.message.includes('Invalid path specified in request URL') || (error as any).code === 'PGRST125') {
        return {
          success: false,
          message: '網址格式不正確：請確保 Project URL 為標準格式「https://xxxx.supabase.co」（請勿在末端加上 /rest/v1 等子路徑）。'
        };
      }

      return { success: false, message: `連線失敗: ${error.message}` };
    }

    return { success: true, message: '🎉 Supabase 雲端資料庫連線正常！資料表已就緒。' };
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      message: `連線異常: ${errMsg}`
    };
  }
}
