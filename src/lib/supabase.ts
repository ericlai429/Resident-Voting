import { createClient, SupabaseClient } from '@supabase/supabase-js';

const STORAGE_KEY_URL = 'resident_voting_supabase_url';
const STORAGE_KEY_KEY = 'resident_voting_supabase_key';

// 預設讀取環境變數，若無則檢查本機 LocalStorage
export function getStoredSupabaseConfig() {
  const envUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

  const localUrl = localStorage.getItem(STORAGE_KEY_URL) || '';
  const localKey = localStorage.getItem(STORAGE_KEY_KEY) || '';

  return {
    url: localUrl || envUrl,
    key: localKey || envKey,
  };
}

export function saveSupabaseConfig(url: string, key: string) {
  if (url && key) {
    localStorage.setItem(STORAGE_KEY_URL, url.trim());
    localStorage.setItem(STORAGE_KEY_KEY, key.trim());
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
  const testUrl = url || getStoredSupabaseConfig().url;
  const testKey = key || getStoredSupabaseConfig().key;

  if (!testUrl || !testKey) {
    return { success: false, message: '尚未提供 Supabase URL 或 API Key' };
  }

  try {
    const client = createClient(testUrl, testKey);
    const { error } = await client.from('communities').select('id').limit(1);

    if (error) {
      // 判斷是否為休眠 (Paused) 或 DNS 異常
      if (error.message.includes('fetch failed') || error.message.includes('ENOTFOUND') || error.message.includes('502')) {
        return {
          success: false,
          isHibernated: true,
          message: 'Supabase 專案可能處於休眠（Paused）狀態或網址錯誤，請至 Supabase Dashboard 點擊「Restore project」喚醒。'
        };
      }
      return { success: false, message: `連線失敗: ${error.message}` };
    }

    return { success: true, message: 'Supabase 雲端資料庫連線正常！' };
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      message: `連線異常: ${errMsg}`
    };
  }
}
