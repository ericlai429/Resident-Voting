import React, { useState, useEffect } from 'react';
import {
  Community,
  Meeting,
  Member,
  AccessibilitySettings,
  FontScale,
} from './types';
import {
  ensureInitialData,
  getCommunities,
  getActiveCommunityId,
  setActiveCommunityId,
  getActiveMeeting,
  getCurrentMember,
  setCurrentMember,
  getMeetings,
} from './lib/storage';
import { Navbar, ActiveTab } from './components/Navbar';
import { ResidentLoginView } from './views/ResidentLoginView';
import { ResidentVoteView } from './views/ResidentVoteView';
import { ResidentPassCard } from './views/ResidentPassCard';
import { AdminDashboard } from './views/AdminDashboard';
import { MemberManagement } from './views/MemberManagement';
import { ScreenLiveView } from './views/ScreenLiveView';
import { ReportA3View } from './views/ReportA3View';
import { QrCodeSummaryView } from './views/QrCodeSummaryView';
import { OcrScannerView } from './views/OcrScannerView';
import { A4PassCardPrintView } from './views/A4PassCardPrintView';
import { LineShareModal } from './components/LineShareModal';
import { SupabaseConfigModal } from './components/SupabaseConfigModal';

export function App() {
  const [currentTab, setCurrentTab] = useState<ActiveTab>('resident_vote');
  const [communities, setCommunities] = useState<Community[]>([]);
  const [activeCommunity, setActiveCommunity] = useState<Community | null>(null);
  const [activeMeeting, setActiveMeetingState] = useState<Meeting | null>(null);
  const [currentMember, setCurrentMemberState] = useState<Member | null>(null);
  const [showSupabaseModal, setShowSupabaseModal] = useState(false);
  const [showLineShareModal, setShowLineShareModal] = useState(false);
  const [showLineBanner, setShowLineBanner] = useState(true);

  // 通用設計無障礙設定 (Universal Design Accessibility)
  const [accessibility, setAccessibility] = useState<AccessibilitySettings>(() => {
    let savedScale: FontScale = 1.0;
    try {
      const stored = localStorage.getItem('resident_font_scale');
      if (stored) {
        const val = parseFloat(stored) as FontScale;
        if ([1.0, 1.2, 1.4, 1.6, 2.0].includes(val)) savedScale = val;
      }
    } catch {}
    return {
      fontSize: 'normal',
      fontScale: savedScale,
      highContrast: false,
      hapticFeedback: true,
    };
  });

  // 確保根節點 zoom 為 1，防止頂部功能列與整體視窗在切換字級時被放大擠壓變形
  useEffect(() => {
    try {
      localStorage.setItem('resident_font_scale', String(accessibility.fontScale));
      if (typeof document !== 'undefined' && document.documentElement) {
        (document.documentElement.style as any).zoom = '1';
      }
    } catch (e) {
      console.warn('Zoom reset error:', e);
    }
  }, [accessibility.fontScale]);

  // 杜絕 LINE 內建瀏覽器頂部與底部邊界滑動跳出 (Touch Boundary Clamp)
  useEffect(() => {
    let startY = 0;
    const rootEl = document.getElementById('root');
    if (!rootEl) return;

    const handleTouchStart = (e: TouchEvent) => {
      startY = e.touches[0].clientY;
    };

    const handleTouchMove = (e: TouchEvent) => {
      // 若觸控事件發生在彈窗、對話盒或有 overflow-y-auto 的子元素內，放行內部正常滾動
      const target = e.target as HTMLElement | null;
      if (target && target.closest('.overflow-y-auto, [role="dialog"], .fixed')) {
        return;
      }

      const currentY = e.touches[0].clientY;
      const isAtTop = rootEl.scrollTop <= 0;
      const isAtBottom = rootEl.scrollTop + rootEl.clientHeight >= rootEl.scrollHeight - 1;

      // 在頂端繼續下拉 (避免觸發 LINE 下拉關閉 / 橡皮筋回彈)
      if (isAtTop && currentY > startY) {
        if (e.cancelable) e.preventDefault();
      }
      // 在底端繼續上滑 (避免觸發 LINE 上拉關閉)
      if (isAtBottom && currentY < startY) {
        if (e.cancelable) e.preventDefault();
      }
    };

    rootEl.addEventListener('touchstart', handleTouchStart, { passive: true });
    rootEl.addEventListener('touchmove', handleTouchMove, { passive: false });

    return () => {
      rootEl.removeEventListener('touchstart', handleTouchStart);
      rootEl.removeEventListener('touchmove', handleTouchMove);
    };
  }, []);

  // 偵測是否在 LINE 內建瀏覽器中開啟
  const isLineBrowser = typeof navigator !== 'undefined' && /Line\/|LIApp/i.test(navigator.userAgent || '');

  // 初始化資料載入
  const loadAppState = () => {
    ensureInitialData();
    const commList = getCommunities();
    setCommunities(commList);

    const activeId = getActiveCommunityId();
    const currentComm = commList.find((c) => c.id === activeId) || commList[0] || null;
    setActiveCommunity(currentComm);

    const mtg = getActiveMeeting();
    setActiveMeetingState(mtg);

    const member = getCurrentMember();
    setCurrentMemberState(member);
  };

  useEffect(() => {
    loadAppState();
    // 若網址帶有會議結算憑證代碼 (例如 iPhone 原生相機直接掃描)
    if (window.location.hash.includes('#res=') || window.location.search.includes('res=')) {
      setCurrentTab('qr_summary');
    }
  }, []);

  // 切換社區
  const handleSelectCommunity = (commId: string) => {
    setActiveCommunityId(commId);
    const comm = communities.find((c) => c.id === commId) || null;
    setActiveCommunity(comm);
    const meetings = getMeetings(commId);
    setActiveMeetingState(meetings[0] || null);
    // 社區切換時清除當前住戶身分以防跨社區資料混淆
    setCurrentMember(null);
    setCurrentMemberState(null);
  };

  // 住戶登入成功
  const handleLoginSuccess = (member: Member) => {
    setCurrentMember(member);
    setCurrentMemberState(member);
    setCurrentTab('resident_vote');
  };

  // 住戶登出
  const handleLogoutMember = () => {
    setCurrentMember(null);
    setCurrentMemberState(null);
  };

  const handleUpdateAccessibility = (newSettings: Partial<AccessibilitySettings>) => {
    setAccessibility((prev) => ({ ...prev, ...newSettings }));
  };

  // 高對比模式樣式類別
  const contrastClass = accessibility.highContrast
    ? 'contrast-more bg-slate-950 text-amber-300'
    : 'bg-slate-50 text-slate-900';

  const fontSizeClass = {
    normal: '',
    large: 'text-lg',
    'extra-large': 'text-xl',
  }[accessibility.fontSize];

  return (
    <div className={`min-h-screen ${contrastClass} ${fontSizeClass} flex flex-col font-sans transition-colors duration-200`}>
      {/* 頂部固定置頂區塊：包含 LINE 外開提示與主導覽列，統一為單一 sticky 容器，滑動時一體釘選，絕不互相遮擋 */}
      <div className="sticky top-0 z-40 w-full no-print">
        {/* LINE 內建瀏覽器外開提醒橫幅 (支援一鍵關閉，滑動時與導覽列一體固定不重疊) */}
        {showLineBanner && isLineBrowser && !window.location.search.includes('openExternalBrowser=1') && (
          <div className="bg-emerald-600 text-white px-2.5 py-1.5 text-xs font-bold flex items-center justify-between border-b border-emerald-700 shadow-xs">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="shrink-0 text-xs">📲</span>
              <span className="truncate text-[11px] sm:text-xs">LINE 瀏覽器模式 · 建議切換至 Safari / Chrome 開啟</span>
            </div>
            <div className="flex items-center gap-1 shrink-0 ml-2">
              <button
                onClick={() => {
                  const origin = window.location.origin;
                  const pathname = window.location.pathname;
                  window.location.href = `${origin}${pathname}?openExternalBrowser=1`;
                }}
                className="rounded-md bg-white px-2 py-0.5 text-[11px] font-black text-emerald-800 shadow-2xs hover:bg-emerald-50 active:scale-95"
              >
                立即外開
              </button>
              <button
                onClick={() => setShowLineBanner(false)}
                className="rounded p-0.5 text-emerald-100 hover:text-white hover:bg-emerald-700/60 leading-none text-xs ml-0.5"
                title="關閉提示"
                aria-label="關閉"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* 頂部通用設計導覽與控制列 */}
        <Navbar
          currentTab={currentTab}
          onSelectTab={setCurrentTab}
          communities={communities}
          activeCommunity={activeCommunity}
          onSelectCommunity={handleSelectCommunity}
          activeMeeting={activeMeeting}
          currentMember={currentMember}
          onLogoutMember={handleLogoutMember}
          onOpenSupabaseModal={() => setShowSupabaseModal(true)}
          onOpenLineShare={() => setShowLineShareModal(true)}
          accessibility={accessibility}
          onUpdateAccessibility={handleUpdateAccessibility}
        />
      </div>

      {/* 主工作區視圖切換 (支援字體四段縮放 1.2x, 1.4x, 1.6x, 2.0x，頂部功能按鈕不放大、不跑版) */}
      <main
        className="flex-1 pb-24 md:pb-12 w-full overflow-x-hidden"
        style={{
          zoom: accessibility.fontScale || 1.0,
        }}
      >
        {currentTab === 'resident_vote' && (
          currentMember && activeCommunity ? (
            <ResidentVoteView
              member={currentMember}
              community={activeCommunity}
              meeting={activeMeeting}
              onOpenPassCard={() => setCurrentTab('resident_pass')}
              accessibility={accessibility}
            />
          ) : (
            <ResidentLoginView
              activeMeeting={activeMeeting}
              onLoginSuccess={handleLoginSuccess}
              communityName={activeCommunity?.name || '社區區權會'}
            />
          )
        )}

        {currentTab === 'resident_pass' && currentMember && activeCommunity && (
          <ResidentPassCard
            member={currentMember}
            community={activeCommunity}
            meeting={activeMeeting}
            onBackToVote={() => setCurrentTab('resident_vote')}
          />
        )}

        {currentTab === 'admin_dashboard' && activeCommunity && (
          <AdminDashboard
            community={activeCommunity}
            meeting={activeMeeting}
            onRefreshData={loadAppState}
            onNavigateToScreen={() => setCurrentTab('live_screen')}
            onNavigateToPassCards={() => setCurrentTab('admin_pass_cards')}
            onOpenLineShare={() => setShowLineShareModal(true)}
          />
        )}

        {currentTab === 'admin_members' && activeCommunity && (
          <MemberManagement
            community={activeCommunity}
            onRefreshData={loadAppState}
          />
        )}

        {/* 區權會法定電子憑證卡 (A4 12格護貝列印版 · 限定 admin/admin1) */}
        {currentTab === 'admin_pass_cards' && activeCommunity && (
          <A4PassCardPrintView
            community={activeCommunity}
            meeting={activeMeeting}
            onBack={() => setCurrentTab('admin_dashboard')}
          />
        )}

        {currentTab === 'live_screen' && activeCommunity && (
          <ScreenLiveView
            community={activeCommunity}
            meeting={activeMeeting}
          />
        )}

        {currentTab === 'report_a3' && activeCommunity && (
          <ReportA3View
            community={activeCommunity}
            meeting={activeMeeting}
            onBack={() => setCurrentTab('admin_dashboard')}
          />
        )}

        {currentTab === 'qr_summary' && activeCommunity && (
          <QrCodeSummaryView
            community={activeCommunity}
            meeting={activeMeeting}
          />
        )}

        {currentTab === 'ocr_scanner' && (
          <OcrScannerView />
        )}
      </main>

      {/* Supabase 資料庫 設定對話框 */}
      <SupabaseConfigModal
        isOpen={showSupabaseModal}
        onClose={() => setShowSupabaseModal(false)}
        onConfigChanged={loadAppState}
      />

      {/* LINE 專用防跳出分享對話框 (方案 A) */}
      <LineShareModal
        isOpen={showLineShareModal}
        onClose={() => setShowLineShareModal(false)}
        communityName={activeCommunity?.name || '清淞社區'}
        meetingTitle={activeMeeting?.title || '區權會'}
        pinCode={activeMeeting?.pin_code}
      />
    </div>
  );
}

export default App;
