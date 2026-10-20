import React, { useState, useEffect } from 'react';
import {
  Community,
  Meeting,
  Member,
  AccessibilitySettings,
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
import { SupabaseConfigModal } from './components/SupabaseConfigModal';

export function App() {
  const [currentTab, setCurrentTab] = useState<ActiveTab>('resident_vote');
  const [communities, setCommunities] = useState<Community[]>([]);
  const [activeCommunity, setActiveCommunity] = useState<Community | null>(null);
  const [activeMeeting, setActiveMeetingState] = useState<Meeting | null>(null);
  const [currentMember, setCurrentMemberState] = useState<Member | null>(null);
  const [showSupabaseModal, setShowSupabaseModal] = useState(false);

  // 通用設計無障礙設定 (Universal Design Accessibility)
  const [accessibility, setAccessibility] = useState<AccessibilitySettings>({
    fontSize: 'normal',
    highContrast: false,
    hapticFeedback: true,
  });

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
        accessibility={accessibility}
        onUpdateAccessibility={handleUpdateAccessibility}
      />

      {/* 主工作區視圖切換 (iPhone 12 自適應與底部留白) */}
      <main className="flex-1 pb-24 md:pb-12">
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
          />
        )}

        {currentTab === 'admin_members' && activeCommunity && (
          <MemberManagement
            community={activeCommunity}
            onRefreshData={loadAppState}
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
    </div>
  );
}

export default App;
