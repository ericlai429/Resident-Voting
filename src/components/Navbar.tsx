import React from 'react';
import {
  Vote,
  Users,
  Shield,
  Monitor,
  FileSpreadsheet,
  QrCode,
  ScanText,
  Database,
  Type,
  SunMoon,
  Building2,
  Calendar,
  LogOut,
  QrCode as QrIcon
} from 'lucide-react';
import { Community, Meeting, Member, AccessibilitySettings } from '../types';
import { getStoredSupabaseConfig } from '../lib/supabase';

export type ActiveTab =
  | 'resident_vote'
  | 'resident_pass'
  | 'admin_dashboard'
  | 'admin_members'
  | 'live_screen'
  | 'report_a3'
  | 'qr_summary'
  | 'ocr_scanner';

interface NavbarProps {
  currentTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  communities: Community[];
  activeCommunity: Community | null;
  onSelectCommunity: (commId: string) => void;
  activeMeeting: Meeting | null;
  currentMember: Member | null;
  onLogoutMember: () => void;
  onOpenSupabaseModal: () => void;
  accessibility: AccessibilitySettings;
  onUpdateAccessibility: (settings: Partial<AccessibilitySettings>) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  communities,
  activeCommunity,
  onSelectCommunity,
  activeMeeting,
  currentMember,
  onLogoutMember,
  onOpenSupabaseModal,
  accessibility,
  onUpdateAccessibility,
}) => {
  const isCloudConnected = Boolean(getStoredSupabaseConfig().url && getStoredSupabaseConfig().key);

  const toggleFontSize = () => {
    const nextSize: Record<string, 'normal' | 'large' | 'extra-large'> = {
      normal: 'large',
      large: 'extra-large',
      'extra-large': 'normal',
    };
    onUpdateAccessibility({ fontSize: nextSize[accessibility.fontSize] });
  };

  const toggleHighContrast = () => {
    onUpdateAccessibility({ highContrast: !accessibility.highContrast });
  };

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-md shadow-xs no-print">
      {/* 頂層資訊列 */}
      <div className="mx-auto flex max-w-7xl items-center justify-between px-3 py-2 sm:px-6">
        {/* 社區品牌與切換 */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-200">
            <Building2 size={22} />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <select
                aria-label="切換社區"
                value={activeCommunity?.id || ''}
                onChange={(e) => onSelectCommunity(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white py-0.5 px-2 text-sm font-bold text-slate-800 shadow-xs hover:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-300"
              >
                {communities.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.code})
                  </option>
                ))}
              </select>

              <span className="hidden sm:inline-flex rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700">
                多租戶架構
              </span>
            </div>

            {activeMeeting && (
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <Calendar size={12} />
                <span className="truncate max-w-[200px] sm:max-w-none">{activeMeeting.title}</span>
                <span className="rounded bg-amber-100 px-1 py-0.2 text-[10px] font-bold text-amber-800">
                  PIN: {activeMeeting.pin_code}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* 右側無障礙、雲端狀態與登入身分 */}
        <div className="flex items-center gap-2">
          {/* 字體調整按鈕 */}
          <button
            onClick={toggleFontSize}
            title="切換字體大小 (通用設計)"
            className="flex h-9 items-center gap-1 rounded-xl border border-slate-200 px-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100"
          >
            <Type size={14} />
            <span>
              {accessibility.fontSize === 'normal'
                ? '字級:標'
                : accessibility.fontSize === 'large'
                ? '字級:大'
                : '字級:特大'}
            </span>
          </button>

          {/* 高對比切換 */}
          <button
            onClick={toggleHighContrast}
            title="切換高對比度顯示"
            className={`flex h-9 w-9 items-center justify-center rounded-xl border ${
              accessibility.highContrast
                ? 'bg-amber-400 border-amber-500 text-slate-900 font-bold'
                : 'border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
          >
            <SunMoon size={18} />
          </button>

          {/* SB大師 Supabase 狀態指示燈 */}
          <button
            onClick={onOpenSupabaseModal}
            title="Supabase 雲端資料庫設定"
            className={`flex h-9 items-center gap-1.5 rounded-xl px-2.5 text-xs font-bold border transition-colors ${
              isCloudConnected
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                : 'bg-slate-100 border-slate-300 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Database size={14} className={isCloudConnected ? 'text-emerald-600' : 'text-slate-400'} />
            <span className="hidden sm:inline">
              {isCloudConnected ? 'Supabase 連線中' : 'Demo 離線模式'}
            </span>
          </button>

          {/* 當前住戶身分標籤與登出 */}
          {currentMember && (
            <div className="flex items-center gap-1.5 rounded-xl bg-indigo-50 border border-indigo-200 py-1 px-2.5">
              <span className="text-xs font-bold text-indigo-900">
                {currentMember.unit_no} {currentMember.owner_name}
              </span>
              <button
                onClick={onLogoutMember}
                title="登出 / 更換戶別"
                className="text-slate-400 hover:text-rose-600 ml-1"
              >
                <LogOut size={14} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 底部導覽頁籤 (分流住戶、管委會與稽核工具) */}
      <nav className="overflow-x-auto border-t border-slate-100 bg-slate-50/70 px-3 sm:px-6 py-1 scrollbar-none">
        <div className="flex items-center gap-1 min-w-max text-sm">
          <button
            onClick={() => onSelectTab('resident_vote')}
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 font-bold transition-colors ${
              currentTab === 'resident_vote'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Vote size={18} />
            <span>📱 住戶線上投票</span>
          </button>

          {currentMember && (
            <button
              onClick={() => onSelectTab('resident_pass')}
              className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 font-bold transition-colors ${
                currentTab === 'resident_pass'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              <QrIcon size={18} />
              <span>🎟️ 我的專屬憑證QR</span>
            </button>
          )}

          <div className="h-4 w-[1px] bg-slate-300 mx-1" />

          <button
            onClick={() => onSelectTab('admin_dashboard')}
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 font-bold transition-colors ${
              currentTab === 'admin_dashboard'
                ? 'bg-slate-900 text-white'
                : 'text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Shield size={18} />
            <span>⚙️ 主委/總幹事後台</span>
          </button>

          <button
            onClick={() => onSelectTab('admin_members')}
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 font-bold transition-colors ${
              currentTab === 'admin_members'
                ? 'bg-slate-900 text-white'
                : 'text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Users size={18} />
            <span>👥 Excel 住戶清冊與權重</span>
          </button>

          <button
            onClick={() => onSelectTab('live_screen')}
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 font-bold transition-colors ${
              currentTab === 'live_screen'
                ? 'bg-slate-900 text-white'
                : 'text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Monitor size={18} />
            <span>📺 投影大螢幕即時計票</span>
          </button>

          <button
            onClick={() => onSelectTab('report_a3')}
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 font-bold transition-colors ${
              currentTab === 'report_a3'
                ? 'bg-slate-900 text-white'
                : 'text-slate-700 hover:bg-slate-200'
            }`}
          >
            <FileSpreadsheet size={18} />
            <span>📑 A3 法定決議報表</span>
          </button>

          <div className="h-4 w-[1px] bg-slate-300 mx-1" />

          <button
            onClick={() => onSelectTab('qr_summary')}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-2 font-bold transition-colors ${
              currentTab === 'qr_summary'
                ? 'bg-purple-600 text-white'
                : 'text-purple-700 hover:bg-purple-100'
            }`}
          >
            <QrCode size={18} />
            <span>結算高密度 QR 碼</span>
          </button>

          <button
            onClick={() => onSelectTab('ocr_scanner')}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-2 font-bold transition-colors ${
              currentTab === 'ocr_scanner'
                ? 'bg-emerald-600 text-white'
                : 'text-emerald-700 hover:bg-emerald-100'
            }`}
          >
            <ScanText size={18} />
            <span>📷 手機相機 OCR 還原</span>
          </button>
        </div>
      </nav>
    </header>
  );
};
