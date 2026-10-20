import React, { useState, useEffect } from 'react';
import { X, Database, CheckCircle2, AlertTriangle, CloudOff, RefreshCw, Copy, Check } from 'lucide-react';
import { UniversalButton } from './UniversalButton';
import { getStoredSupabaseConfig, saveSupabaseConfig, testSupabaseConnection } from '../lib/supabase';

interface SupabaseConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigChanged: () => void;
}

export const SupabaseConfigModal: React.FC<SupabaseConfigModalProps> = ({
  isOpen,
  onClose,
  onConfigChanged,
}) => {
  const [url, setUrl] = useState('');
  const [key, setKey] = useState('');
  const [testing, setTesting] = useState(false);
  const [status, setStatus] = useState<{ success?: boolean; message?: string; isHibernated?: boolean } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const cfg = getStoredSupabaseConfig();
      setUrl(cfg.url);
      setKey(cfg.key);
      setStatus(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTest = async () => {
    setTesting(true);
    setStatus(null);
    const res = await testSupabaseConnection(url, key);
    setStatus(res);
    setTesting(false);
  };

  const handleSave = () => {
    saveSupabaseConfig(url, key);
    onConfigChanged();
    onClose();
  };

  const handleClear = () => {
    saveSupabaseConfig('', '');
    setUrl('');
    setKey('');
    setStatus({ success: false, message: '已切換為純本機/離線優先模式 (Local-First)' });
    onConfigChanged();
  };

  const copySqlHint = () => {
    setCopied(true);
    navigator.clipboard.writeText(`-- 請複製專案內的 supabase/schema.sql 內容至 Supabase SQL Editor 一鍵執行建表`);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200"
        >
          <X size={24} />
        </button>

        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
            <Database size={28} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900">🧙‍♂️ SB大師 · Supabase 雲端設定</h3>
            <p className="text-sm text-slate-500">PostgreSQL + Realtime 即時同步資料庫連線</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">
              Project URL (網址)
            </label>
            <input
              type="text"
              placeholder="https://your-project-ref.supabase.co"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-base focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">
              Publishable Key / Anon API Key (金鑰)
            </label>
            <input
              type="password"
              placeholder="sb_publishable_... 或 eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              value={key}
              onChange={(e) => setKey(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-base focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            />
          </div>

          {status && (
            <div
              className={`rounded-2xl p-4 text-sm flex items-start gap-3 ${
                status.success
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : status.isHibernated
                  ? 'bg-amber-50 text-amber-800 border border-amber-300'
                  : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}
            >
              {status.success ? (
                <CheckCircle2 size={24} className="text-emerald-600 flex-shrink-0" />
              ) : (
                <AlertTriangle size={24} className={status.isHibernated ? 'text-amber-600' : 'text-rose-600'} />
              )}
              <div className="flex-1">
                <p className="font-semibold">{status.message}</p>
                {status.isHibernated && (
                  <p className="mt-1 text-xs text-amber-700">
                    💡 提示：Supabase 免費專案在 7 天無操作會進入休眠。請至 Supabase 控制台點擊「Restore project」，1~2 分鐘後即可恢復正常！
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                SQL Schema DDL 腳本
              </span>
              <button
                onClick={copySqlHint}
                className="flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700"
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                <span>{copied ? '已複製提醒' : '複製路徑提示'}</span>
              </button>
            </div>
            <p className="text-xs text-slate-600">
              專案已備妥完整的 <code className="bg-slate-200 px-1 py-0.5 rounded text-slate-800 font-mono">supabase/schema.sql</code>，包含 6 張主表、RLS 權限政策、Realtime 廣播與防並發 Transaction 預存程序。
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2.5">
          <UniversalButton
            variant="outline"
            size="md"
            className="flex-1"
            disabled={testing || !url || !key}
            onClick={handleTest}
            icon={<RefreshCw size={18} className={testing ? 'animate-spin' : ''} />}
          >
            {testing ? '測試連線中...' : '測試連線'}
          </UniversalButton>

          <UniversalButton
            variant="success"
            size="md"
            className="flex-1"
            onClick={handleSave}
          >
            保存並套用
          </UniversalButton>

          <button
            onClick={handleClear}
            className="w-full py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center justify-center gap-1.5"
          >
            <CloudOff size={14} />
            <span>清除連線，恢復純本機 Demo 模式</span>
          </button>
        </div>
      </div>
    </div>
  );
};
