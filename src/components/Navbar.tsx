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
  LogOut,
  QrCode as QrIcon,
  Menu,
  X,
  ChevronRight,
  Sparkles,
  MessageCircle,
} from 'lucide-react';
import { Community, Meeting, Member, AccessibilitySettings, FontScale } from '../types';
import { getStoredSupabaseConfig } from '../lib/supabase';

export type ActiveTab =
  | 'resident_vote'
  | 'resident_pass'
  | 'admin_dashboard'
  | 'admin_members'
  | 'admin_pass_cards'
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
  onOpenLineShare: () => void;
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
  onOpenLineShare,
  accessibility,
  onUpdateAccessibility,
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const isCloudConnected = Boolean(getStoredSupabaseConfig().url && getStoredSupabaseConfig().key);

  const FONT_SCALES: FontScale[] = [1.0, 1.2, 1.4, 1.6, 2.0];

  const cycleFontScale = () => {
    const currentScale = accessibility.fontScale || 1.0;
    const currentIdx = FONT_SCALES.indexOf(currentScale);
    const nextScale = FONT_SCALES[(currentIdx + 1) % FONT_SCALES.length];
    onUpdateAccessibility({ fontScale: nextScale });
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
      {/* 頂部輕量化 Header (固定於父容器頂部，不隨切換大小放大，專為手機 360px-390px 完美緊湊適配) */}
      <header className="w-full border-b border-slate-200 bg-white/95 backdrop-blur-md shadow-xs no-print select-none" style={{ zoom: 1 }}>
        <div className="mx-auto flex max-w-md md:max-w-6xl items-center justify-between px-2.5 py-1.5 sm:py-2">
          {/* 左側：社區切換與名稱 */}
          <div className="flex items-center gap-1.5 min-w-0">
            <div className="flex h-7.5 w-7.5 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-lg sm:rounded-xl bg-indigo-600 text-white shadow-xs">
              <Building2 size={17} />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1">
                <select
                  aria-label="切換社區"
                  value={activeCommunity?.id || ''}
                  onChange={(e) => onSelectCommunity(e.target.value)}
                  className="rounded-md border border-slate-300 bg-white py-0.5 px-1.5 text-xs sm:text-sm font-black text-slate-900 shadow-2xs hover:border-indigo-400 focus:outline-none truncate max-w-[125px] sm:max-w-[220px]"
                >
                  {communities.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>

                {activeMeeting && (
                  <span className="shrink-0 rounded bg-amber-100 px-1 py-0.2 font-mono text-[10px] font-black text-amber-900 border border-amber-300">
                    PIN:{activeMeeting.pin_code}
                  </span>
                )}
              </div>

              <div className="text-[10px] text-slate-500 truncate max-w-[160px] sm:max-w-none">
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

          {/* 右側：字級縮放 (固定大小不放大) + LINE防跳出分享 + 抽屜選單按鈕 */}
          <div className="flex items-center gap-1 shrink-0">
            {/* 字體四段縮放按鈕：視覺顯示「大(20px) 小(12px)」，按鈕本體與字級保持緊湊不放大，避免擠壓整體介面 */}
            <button
              onClick={cycleFontScale}
              title={`切換字體大小 (目前 ${accessibility.fontScale || 1.0}x，點擊循環放大四段: 1.2x、1.4x、1.6x、2.0x)`}
              aria-label={`字體大小切換 目前 ${accessibility.fontScale || 1.0} 倍`}
              className={`flex h-7.5 sm:h-8 items-center gap-1 rounded-lg border px-1.5 sm:px-2 transition-all shadow-2xs active:scale-95 ${
                (accessibility.fontScale || 1.0) > 1.0
                  ? 'bg-indigo-50 border-indigo-400 text-indigo-900 ring-1 ring-indigo-300'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              {/* 依指示使用「大(20px) 小(12px)」視覺文字標籤 */}
              <span className="flex items-baseline leading-none select-none">
                <span style={{ fontSize: '17px' }} className="font-black text-slate-900 leading-none">
                  大
                </span>
                <span style={{ fontSize: '11px' }} className="font-bold text-slate-500 leading-none ml-0.5">
                  小
                </span>
              </span>
              <span
                className={`font-mono text-[9px] font-black px-1 rounded ${
                  (accessibility.fontScale || 1.0) > 1.0
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {(accessibility.fontScale || 1.0) === 1.0 ? '1.0x' : `${accessibility.fontScale}x`}
              </span>
            </button>

            {/* 方案 A：LINE 專用防跳出分享按鈕 */}
            <button
              onClick={onOpenLineShare}
              title="LINE 專用防跳出分享 (方案 A 外部瀏覽器開啟)"
              className="flex h-7.5 sm:h-8 items-center gap-1 rounded-lg border border-emerald-300 bg-emerald-50 px-1.5 sm:px-2 text-xs font-black text-emerald-800 hover:bg-emerald-100 active:scale-95 transition-all shadow-2xs"
            >
              <MessageCircle size={14} className="fill-emerald-600 text-emerald-600 shrink-0" />
              <span className="hidden sm:inline">LINE 分享</span>
            </button>

            {/* 雲端資料庫燈號 (小藥丸) */}
            <button
              onClick={onOpenSupabaseModal}
              title="Supabase 資料庫連線"
              className={`flex h-7.5 w-7.5 sm:h-8 sm:w-8 items-center justify-center rounded-lg border text-xs font-bold ${
                isCloudConnected
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                  : 'bg-slate-100 border-slate-200 text-slate-500'
              }`}
            >
              <Database size={14} />
            </button>

            {/* 手機版主要選單抽屜觸發按鈕 */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="flex h-7.5 w-7.5 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-xs hover:bg-indigo-700 active:scale-95 transition-all"
              aria-label="開啟功能選單"
            >
              {isMobileMenuOpen ? <X size={16} /> : <Menu size={16} />}
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
              onClick={() => handleTabClick('admin_pass_cards')}
              className={`rounded-xl px-3 py-1.5 flex items-center gap-1.5 ${
                currentTab === 'admin_pass_cards'
                  ? 'bg-purple-700 text-white'
                  : 'bg-purple-50 text-purple-800 hover:bg-purple-100 border border-purple-200'
              }`}
            >
              <span>🎟️ A4 憑證卡 (12格護貝列印)</span>
              <span className="text-[10px] font-black bg-purple-900 text-white px-1 rounded">admin/admin1</span>
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

            {/* 方案 A：LINE 專用防跳出分享按鈕 (醒目置頂) */}
            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                onOpenLineShare();
              }}
              className="w-full mb-3 flex items-center justify-between p-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-md active:scale-98 transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20">
                  <MessageCircle size={20} className="fill-white text-white" />
                </div>
                <div className="text-left">
                  <div className="text-xs font-black">📲 複製 LINE 防跳出分享連結 (方案 A)</div>
                  <div className="text-[10px] text-emerald-100">帶有 ?openExternalBrowser=1，以 Safari / Chrome 開啟絕不跳出</div>
                </div>
              </div>
              <ChevronRight size={16} className="text-emerald-200" />
            </button>

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

              {/* 依要求：A4 12格法定電子憑證卡 (限定 admin / admin1) */}
              <button
                onClick={() => handleTabClick('admin_pass_cards')}
                className="w-full flex items-center justify-between p-3 rounded-2xl bg-purple-50 hover:bg-purple-100 text-left border border-purple-200"
              >
                <div className="flex items-center gap-3">
                  <QrIcon size={18} className="text-purple-700" />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-black text-purple-950">🎟️ A4 區權人電子憑證卡 (12格護貝列印)</span>
                      <span className="text-[9px] font-black bg-purple-600 text-white px-1.5 py-0.2 rounded">admin/admin1</span>
                    </div>
                    <div className="text-[10px] text-purple-700">大戶號 · 粗外邊框 · 2cm留邊粗虛線裁切</div>
                  </div>
                </div>
                <ChevronRight size={16} className="text-purple-400" />
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
