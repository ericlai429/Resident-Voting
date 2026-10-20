import React, { useState } from 'react';
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
  QrCode as QrIcon,
  Menu,
  X,
  ChevronRight,
  Sparkles,
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
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

  const handleTabClick = (tab: ActiveTab) => {
    onSelectTab(tab);
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      {/* 頂部輕量化 Header (專為 iPhone 12 390px 完美緊湊適配) */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-md shadow-xs no-print">
        <div className="mx-auto flex max-w-md md:max-w-6xl items-center justify-between px-3 py-2.5">
          {/* 左側：社區切換與名稱 */}
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-xs">
              <Building2 size={20} />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <select
                  aria-label="切換社區"
                  value={activeCommunity?.id || ''}
                  onChange={(e) => onSelectCommunity(e.target.value)}
                  className="rounded-lg border border-slate-300 bg-white py-0.5 px-1.5 text-xs sm:text-sm font-black text-slate-900 shadow-2xs hover:border-indigo-400 focus:outline-none truncate max-w-[170px] sm:max-w-[240px]"
                >
                  {communities.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>

                {activeMeeting && (
                  <span className="shrink-0 rounded-md bg-amber-100 px-1.5 py-0.5 font-mono text-[11px] font-black text-amber-900 border border-amber-300">
                    PIN:{activeMeeting.pin_code}
                  </span>
                )}
              </div>

              <div className="text-[10px] text-slate-500 truncate max-w-[180px] sm:max-w-none">
                {currentMember ? (
                  <span className="font-bold text-indigo-700">
                    已登入: {currentMember.unit_no} {currentMember.owner_name}
                  </span>
                ) : (
                  <span>{activeMeeting?.title || '區分所有權人會議'}</span>
                )}
              </div>
            </div>
          </div>

          {/* 右側：字級縮放 + 抽屜選單按鈕 */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* 字體快速縮放 (通用設計) */}
            <button
              onClick={toggleFontSize}
              title="切換字體大小"
              className="flex h-8 items-center gap-0.5 rounded-lg border border-slate-200 px-2 text-[11px] font-bold text-slate-700 hover:bg-slate-100 active:scale-95 transition-transform"
            >
              <Type size={13} />
              <span>
                {accessibility.fontSize === 'normal'
                  ? '標'
                  : accessibility.fontSize === 'large'
                  ? '大'
                  : '特大'}
              </span>
            </button>

            {/* 雲端資料庫燈號 (小藥丸) */}
            <button
              onClick={onOpenSupabaseModal}
              title="Supabase 資料庫連線"
              className={`flex h-8 w-8 items-center justify-center rounded-lg border text-xs font-bold ${
                isCloudConnected
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                  : 'bg-slate-100 border-slate-200 text-slate-500'
              }`}
            >
              <Database size={15} />
            </button>

            {/* 手機版主要選單抽屜觸發按鈕 */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-xs hover:bg-indigo-700 active:scale-95 transition-all"
              aria-label="開啟功能選單"
            >
              {isMobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        {/* 電腦/大螢幕平板專用次導覽列 (桌機才會顯示，iPhone 12 不會橫向爆開) */}
        <div className="hidden md:block border-t border-slate-100 bg-slate-50/70 px-4 py-1.5">
          <div className="mx-auto flex max-w-6xl items-center gap-1.5 overflow-x-auto text-xs font-bold">
            <button
              onClick={() => handleTabClick('resident_vote')}
              className={`rounded-xl px-3 py-1.5 ${
                currentTab === 'resident_vote' ? 'bg-indigo-600 text-white' : 'text-slate-700 hover:bg-slate-200'
              }`}
            >
              📱 住戶線上投票
            </button>
            <button
              onClick={() => handleTabClick('resident_pass')}
              className={`rounded-xl px-3 py-1.5 ${
                currentTab === 'resident_pass' ? 'bg-indigo-600 text-white' : 'text-slate-700 hover:bg-slate-200'
              }`}
            >
              🎟️ 我的專屬憑證 QR
            </button>
            <button
              onClick={() => handleTabClick('admin_dashboard')}
              className={`rounded-xl px-3 py-1.5 ${
                currentTab === 'admin_dashboard' ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-200'
              }`}
            >
              ⚙️ 主委/總幹事後台
            </button>
            <button
              onClick={() => handleTabClick('admin_members')}
              className={`rounded-xl px-3 py-1.5 ${
                currentTab === 'admin_members' ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-200'
              }`}
            >
              👥 Excel 住戶清冊與權重
            </button>
            <button
              onClick={() => handleTabClick('live_screen')}
              className={`rounded-xl px-3 py-1.5 ${
                currentTab === 'live_screen' ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-200'
              }`}
            >
              📺 投影大螢幕即時計票
            </button>
            <button
              onClick={() => handleTabClick('report_a3')}
              className={`rounded-xl px-3 py-1.5 ${
                currentTab === 'report_a3' ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-200'
              }`}
            >
              📑 A3 法定決議報表
            </button>
            <button
              onClick={() => handleTabClick('qr_summary')}
              className={`rounded-xl px-3 py-1.5 ${
                currentTab === 'qr_summary' ? 'bg-purple-600 text-white' : 'text-purple-700 hover:bg-purple-100'
              }`}
            >
              結算高密度 QR 碼
            </button>
            <button
              onClick={() => handleTabClick('ocr_scanner')}
              className={`rounded-xl px-3 py-1.5 ${
                currentTab === 'ocr_scanner' ? 'bg-emerald-600 text-white' : 'text-emerald-700 hover:bg-emerald-100'
              }`}
            >
              📷 手機相機 OCR 還原
            </button>
          </div>
        </div>
      </header>

      {/* 手機底部原生導覽列 (iPhone 12 Bottom Navigation Bar) */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)] md:hidden no-print">
        <div className="mx-auto flex max-w-md items-center justify-around px-2 py-1.5 text-[11px] font-bold text-slate-600">
          <button
            onClick={() => handleTabClick('resident_vote')}
            className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-colors ${
              currentTab === 'resident_vote' ? 'text-indigo-600' : 'text-slate-500'
            }`}
          >
            <Vote size={22} className={currentTab === 'resident_vote' ? 'stroke-[2.5]' : ''} />
            <span>投票表決</span>
          </button>

          <button
            onClick={() => handleTabClick('resident_pass')}
            className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-colors ${
              currentTab === 'resident_pass' ? 'text-indigo-600' : 'text-slate-500'
            }`}
          >
            <QrIcon size={22} className={currentTab === 'resident_pass' ? 'stroke-[2.5]' : ''} />
            <span>個人憑證</span>
          </button>

          <button
            onClick={() => handleTabClick('live_screen')}
            className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-colors ${
              currentTab === 'live_screen' ? 'text-indigo-600' : 'text-slate-500'
            }`}
          >
            <Monitor size={22} className={currentTab === 'live_screen' ? 'stroke-[2.5]' : ''} />
            <span>現場看板</span>
          </button>

          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl text-slate-700 hover:text-indigo-600 transition-colors"
          >
            <Menu size={22} />
            <span>功能選單</span>
          </button>
        </div>
      </div>

      {/* 手機版抽屜式功能選單 (Mobile Sheet Modal - 收納所有進階管理與工具) */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-xs md:hidden animate-fade-in no-print">
          <div className="w-full max-h-[85vh] overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl">
            {/* 抽屜頂部標題 */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
                  <Sparkles size={16} />
                </div>
                <h3 className="text-base font-black text-slate-900">區權會功能總覽</h3>
              </div>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200"
              >
                <X size={18} />
              </button>
            </div>

            {/* 功能選單列表 (清晰條列、大觸控熱區) */}
            <div className="space-y-1.5 text-sm font-bold text-slate-800">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-3 pt-1">
                住戶專用
              </div>
              <button
                onClick={() => handleTabClick('resident_vote')}
                className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-indigo-50 hover:text-indigo-700 text-left bg-slate-50"
              >
                <div className="flex items-center gap-3">
                  <Vote size={18} className="text-indigo-600" />
                  <span>📱 住戶線上投票大廳</span>
                </div>
                <ChevronRight size={16} className="text-slate-400" />
              </button>

              <button
                onClick={() => handleTabClick('resident_pass')}
                className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-indigo-50 hover:text-indigo-700 text-left bg-slate-50"
              >
                <div className="flex items-center gap-3">
                  <QrIcon size={18} className="text-indigo-600" />
                  <span>🎟️ 我的個人專屬登入憑證 QR 碼</span>
                </div>
                <ChevronRight size={16} className="text-slate-400" />
              </button>

              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-3 pt-3">
                管委會與大會管理 (Admin)
              </div>

              <button
                onClick={() => handleTabClick('admin_dashboard')}
                className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-slate-100 text-left bg-slate-50"
              >
                <div className="flex items-center gap-3">
                  <Shield size={18} className="text-purple-600" />
                  <span>⚙️ 主委 / 總幹事後台 (PIN碼/議案CRUD)</span>
                </div>
                <ChevronRight size={16} className="text-slate-400" />
              </button>

              <button
                onClick={() => handleTabClick('admin_members')}
                className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-slate-100 text-left bg-slate-50"
              >
                <div className="flex items-center gap-3">
                  <Users size={18} className="text-blue-600" />
                  <span>👥 Excel 493戶名冊與持分權重</span>
                </div>
                <ChevronRight size={16} className="text-slate-400" />
              </button>

              <button
                onClick={() => handleTabClick('live_screen')}
                className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-slate-100 text-left bg-slate-50"
              >
                <div className="flex items-center gap-3">
                  <Monitor size={18} className="text-amber-600" />
                  <span>📺 現場大螢幕即時計票戰情室</span>
                </div>
                <ChevronRight size={16} className="text-slate-400" />
              </button>

              <button
                onClick={() => handleTabClick('report_a3')}
                className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-slate-100 text-left bg-slate-50"
              >
                <div className="flex items-center gap-3">
                  <FileSpreadsheet size={18} className="text-emerald-600" />
                  <span>📑 A3 橫向法定決議報表 (匯出/列印)</span>
                </div>
                <ChevronRight size={16} className="text-slate-400" />
              </button>

              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-3 pt-3">
                離線防偽與稽核工具
              </div>

              <button
                onClick={() => handleTabClick('qr_summary')}
                className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-purple-50 text-left bg-slate-50"
              >
                <div className="flex items-center gap-3">
                  <QrCode size={18} className="text-purple-600" />
                  <span>🔲 大會結算高密度 QR 碼 (斷網還原)</span>
                </div>
                <ChevronRight size={16} className="text-slate-400" />
              </button>

              <button
                onClick={() => handleTabClick('ocr_scanner')}
                className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-emerald-50 text-left bg-slate-50"
              >
                <div className="flex items-center gap-3">
                  <ScanText size={18} className="text-emerald-600" />
                  <span>📷 手機相機 OCR 拍紙本還原議案</span>
                </div>
                <ChevronRight size={16} className="text-slate-400" />
              </button>

              <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onOpenSupabaseModal();
                  }}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 p-2.5 text-slate-700 bg-white"
                >
                  <Database size={15} className="text-emerald-600" />
                  <span>Supabase 設定</span>
                </button>

                <button
                  onClick={toggleHighContrast}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 p-2.5 text-slate-700 bg-white"
                >
                  <SunMoon size={15} />
                  <span>高對比模式</span>
                </button>
              </div>

              {currentMember && (
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onLogoutMember();
                  }}
                  className="w-full mt-2 flex items-center justify-center gap-1.5 p-2.5 rounded-xl text-rose-600 bg-rose-50 font-bold text-xs"
                >
                  <LogOut size={15} />
                  <span>登出目前戶別 ({currentMember.unit_no})</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
