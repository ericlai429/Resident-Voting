import React, { useState, useEffect } from 'react';
import {
  Community,
  Meeting,
  Topic,
  Member,
  TopicOption,
  TopicVoteType,
  DeskAuthRequest,
  DeskAuthSyncEvent,
} from '../types';
import {
  getTopics,
  saveTopic,
  deleteTopic,
  saveMeeting,
  saveCommunity,
  generateRandomPin,
  getTodayMidnightISO,
  getMembers,
  calculateTopicStats,
  getDeskAuthRequests,
  approveDeskAuthRequest,
  rejectDeskAuthRequest,
  directAuthorizeMember,
  unlockMemberDevice,
  updateMemberPhone,
  subscribeToSyncEvents,
  purgeVotesAndResetCheckIns,
  purgeAllDemoDataForOfficialRoster,
} from '../lib/storage';
import { UniversalButton } from '../components/UniversalButton';
import {
  Plus,
  Trash2,
  Lock,
  Unlock,
  KeyRound,
  RefreshCw,
  Building,
  CheckCircle2,
  Smartphone,
  Eye,
  FileCheck,
  Radio,
  Zap,
  Check,
  RotateCcw,
  Printer,
  MessageCircle,
  Copy,
} from 'lucide-react';

interface AdminDashboardProps {
  community: Community;
  meeting: Meeting | null;
  onRefreshData: () => void;
  onNavigateToScreen: () => void;
  onNavigateToPassCards?: () => void;
  onOpenLineShare?: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  community,
  meeting,
  onRefreshData,
  onNavigateToScreen,
  onNavigateToPassCards,
  onOpenLineShare,
}) => {
  const [topics, setTopics] = useState<Topic[]>(() => getTopics(meeting?.id));
  const [currentPin, setCurrentPin] = useState(meeting?.pin_code || '8866');

  // 新增社區彈窗狀態
  const [showAddCommModal, setShowAddCommModal] = useState(false);
  const [newCommCode, setNewCommCode] = useState('');
  const [newCommName, setNewCommName] = useState('');
  const [newCommAddress, setNewCommAddress] = useState('');
  const [newCommUnits, setNewCommUnits] = useState('120');
  const [newCommPing, setNewCommPing] = useState('3600');

  // 新增議題彈窗狀態
  const [showAddTopicModal, setShowAddTopicModal] = useState(false);
  const [newTopicTitle, setNewTopicTitle] = useState('');
  const [newTopicDesc, setNewTopicDesc] = useState('');
  const [newTopicType, setNewTopicType] = useState<TopicVoteType>('yes_no');
  const [customOptionsText, setCustomOptionsText] = useState('方案A：方案內容說明\n方案B：方案內容說明\n方案C：方案內容說明\n棄權');

  // 重置住戶手機綁定搜尋
  const [searchMemberQuery, setSearchMemberQuery] = useState('');

  // 大會服務台現場即時求助認證單
  const [deskRequests, setDeskRequests] = useState<DeskAuthRequest[]>(() => getDeskAuthRequests(meeting?.id));
  const [editingPhoneLast4, setEditingPhoneLast4] = useState<{ [memberId: string]: string }>({});
  const [activeNotice, setActiveNotice] = useState<string | null>(null);

  // 清除測試資料與重置
  const handlePurgeVotes = () => {
    if (window.confirm('⚠️ 警告：這將會清除所有議案已投之選票紀錄、服務台求助單，並將所有住戶的報到與設備鎖定全數重置為未報到狀態。確定要執行嗎？')) {
      const res = purgeVotesAndResetCheckIns(community.id);
      onRefreshData();
      setActiveNotice(res.message);
      setTimeout(() => setActiveNotice(null), 6000);
    }
  };

  const handlePurgeAllDemo = () => {
    if (window.confirm('🚨 極高危操作警告：這將會徹底清空所有示範名冊資料與測試選票，將系統重置為全新空白狀態！\n\n確定要在匯入管委會正式名冊前執行全面淨空嗎？')) {
      const res = purgeAllDemoDataForOfficialRoster(community.id);
      onRefreshData();
      setActiveNotice(res.message);
      setTimeout(() => setActiveNotice(null), 6000);
    }
  };

  // 監聽全域同步事件 (當住戶送出求助或核准時即時更新)
  useEffect(() => {
    const handleSync = (event: DeskAuthSyncEvent) => {
      if (
        event.type === 'AUTH_REQUEST_CREATED' ||
        event.type === 'AUTH_REQUEST_APPROVED' ||
        event.type === 'AUTH_REQUEST_REJECTED' ||
        event.type === 'MEMBER_AUTHORIZED' ||
        event.type === 'MEMBER_DEVICE_UNLOCKED' ||
        event.type === 'MEMBER_PHONE_UPDATED'
      ) {
        setDeskRequests(getDeskAuthRequests(meeting?.id));
        onRefreshData();
      }
    };

    const unsubscribe = subscribeToSyncEvents(handleSync);
    return () => unsubscribe();
  }, [meeting, onRefreshData]);

  // 大會服務台核准求助單 (可選擇是否將手機號更正為住戶輸入之號碼)
  const handleApproveDeskRequest = (req: DeskAuthRequest, updatePhone: boolean = true) => {
    const newPhone = updatePhone ? req.input_phone_last4 : undefined;
    const res = approveDeskAuthRequest(req.id, newPhone, '大會服務台(admin)');
    if (res.success && res.member) {
      setDeskRequests(getDeskAuthRequests(meeting?.id));
      onRefreshData();
      setActiveNotice(`✅ 已即時核准【${req.unit_no} ${req.owner_name}】！住戶手機畫面已 0 秒同步開通進入表決。`);
      setTimeout(() => setActiveNotice(null), 5000);
    }
  };

  // 大會服務台駁回求助單
  const handleRejectDeskRequest = (req: DeskAuthRequest) => {
    if (window.confirm(`確定要駁回戶號【${req.unit_no}】的現場核准申請嗎？`)) {
      rejectDeskAuthRequest(req.id, '大會服務台查核不符');
      setDeskRequests(getDeskAuthRequests(meeting?.id));
      onRefreshData();
    }
  };

  // 現場一鍵直接授權開通 (無條件核准)
  const handleDirectAuthorize = (m: Member) => {
    const res = directAuthorizeMember(m.id, { approvedBy: '大會服務台(admin)' });
    if (res.success && res.member) {
      onRefreshData();
      setActiveNotice(`⚡ 已現場強制授權開通【${m.unit_no} ${m.owner_name}】！住戶端已即刻開通。`);
      setTimeout(() => setActiveNotice(null), 5000);
    }
  };

  // 現場更正手機末四碼
  const handleUpdatePhone = (m: Member, phone: string) => {
    if (!phone || phone.length !== 4) {
      alert('請輸入 4 位數手機末碼！');
      return;
    }
    const res = updateMemberPhone(m.id, phone);
    if (res.success) {
      onRefreshData();
      setActiveNotice(`📱 已將【${m.unit_no}】登記手機更正為【${phone}】！住戶畫面已即時同步。`);
      setTimeout(() => setActiveNotice(null), 5000);
    }
  };

  // 現場解綁舊手機 (換機重置)
  const handleUnlockDevice = (m: Member) => {
    const res = unlockMemberDevice(m.id);
    if (res.success) {
      onRefreshData();
      setActiveNotice(`🔓 已解除【${m.unit_no}】之手機裝置鎖定！住戶可更換新機登入。`);
      setTimeout(() => setActiveNotice(null), 5000);
    }
  };

  // 重新生成當日 PIN 碼
  const handleRegeneratePin = () => {
    if (!meeting) return;
    const newPin = generateRandomPin();
    setCurrentPin(newPin);
    const updated: Meeting = {
      ...meeting,
      pin_code: newPin,
      pin_expires_at: getTodayMidnightISO(),
    };
    saveMeeting(updated);
    onRefreshData();
  };

  // 新增社區
  const handleCreateCommunity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommName.trim()) return;

    const newComm: Community = {
      id: `comm-${Date.now()}`,
      code: newCommCode.trim() || `C-${Math.floor(100 + Math.random() * 900)}`,
      name: newCommName.trim(),
      address: newCommAddress.trim() || '新北市/台北市',
      total_units: parseInt(newCommUnits) || 100,
      total_area_ping: parseFloat(newCommPing) || 3000,
      created_at: new Date().toISOString(),
    };

    saveCommunity(newComm);
    setShowAddCommModal(false);
    setNewCommCode('');
    setNewCommName('');
    setNewCommAddress('');
    onRefreshData();
    alert(`成功新增社區【${newComm.name}】！可在上方下拉選單切換管委會。`);
  };

  // 儲存新議案
  const handleCreateTopic = (e: React.FormEvent) => {
    e.preventDefault();
    if (!meeting || !newTopicTitle.trim()) return;

    const newTopicId = `topic-${Date.now()}`;
    let options: TopicOption[] = [];

    if (newTopicType === 'yes_no') {
      options = [
        { id: `opt-${newTopicId}-yes`, topic_id: newTopicId, option_key: 'YES', option_label: '贊成通過本案', order_num: 1 },
        { id: `opt-${newTopicId}-no`, topic_id: newTopicId, option_key: 'NO', option_label: '反對通過本案', order_num: 2 },
        { id: `opt-${newTopicId}-abs`, topic_id: newTopicId, option_key: 'ABSTAIN', option_label: '棄權', order_num: 3 },
      ];
    } else {
      // 自訂多選項
      const lines = customOptionsText.split('\n').map(l => l.trim()).filter(Boolean);
      options = lines.map((line, idx) => ({
        id: `opt-${newTopicId}-${idx + 1}`,
        topic_id: newTopicId,
        option_key: String.fromCharCode(65 + idx), // A, B, C...
        option_label: line,
        order_num: idx + 1,
      }));
    }

    const newTopic: Topic = {
      id: newTopicId,
      meeting_id: meeting.id,
      order_num: topics.length + 1,
      title: newTopicTitle.trim(),
      description: newTopicDesc.trim(),
      vote_type: newTopicType,
      status: 'open',
      options,
      created_at: new Date().toISOString(),
    };

    saveTopic(newTopic);
    setTopics(getTopics(meeting.id));
    setShowAddTopicModal(false);
    setNewTopicTitle('');
    setNewTopicDesc('');
  };

  // 切換議題狀態 (開放 / 封票結算)
  const handleToggleTopicStatus = (topic: Topic) => {
    const updated: Topic = {
      ...topic,
      status: topic.status === 'open' ? 'closed' : 'open',
    };
    saveTopic(updated);
    setTopics(getTopics(meeting?.id));
  };

  // 刪除議題
  const handleDeleteTopic = (topicId: string) => {
    if (window.confirm('確定要刪除此議題及其所有歷史投票記錄嗎？此動作無法復原。')) {
      deleteTopic(topicId);
      setTopics(getTopics(meeting?.id));
    }
  };

  const members = getMembers(community.id);
  const filteredMembers = searchMemberQuery.trim()
    ? members.filter(
        (m) =>
          m.unit_no.toLowerCase().includes(searchMemberQuery.toLowerCase()) ||
          m.owner_name.includes(searchMemberQuery) ||
          m.phone_last4.includes(searchMemberQuery)
      ).slice(0, 5)
    : [];

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:py-10 space-y-8">
      {/* 頂部管理者儀表板橫幅 */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-slate-900 p-6 sm:p-8 text-white shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-indigo-500/30 border border-indigo-400 px-3 py-1 text-xs font-bold text-indigo-300">
              主委 & 總幹事 管理台 (Admin)
            </span>
            <span className="text-xs text-slate-400">登入代號: admin1</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black">{community.name}</h1>
          <p className="text-sm text-slate-400">
            登記地址：{community.address} · 總法定戶數：{community.total_units} 戶 · 總持分坪數：{community.total_area_ping} 坪
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <UniversalButton
            variant="primary"
            size="md"
            onClick={onNavigateToScreen}
            icon={<Eye size={18} />}
          >
            開啟現場大螢幕即時投影
          </UniversalButton>

          {onNavigateToPassCards && (
            <button
              onClick={onNavigateToPassCards}
              className="flex items-center gap-1.5 rounded-2xl bg-purple-600 px-4 py-2.5 text-xs font-black text-white hover:bg-purple-700 active:scale-95 transition-all shadow-md"
            >
              <Printer size={16} />
              <span>🎟️ A4 憑證卡 (12格護貝列印)</span>
            </button>
          )}

          {onOpenLineShare && (
            <button
              onClick={onOpenLineShare}
              className="flex items-center gap-1.5 rounded-2xl bg-emerald-600 px-4 py-2.5 text-xs font-black text-white hover:bg-emerald-700 active:scale-95 transition-all shadow-md"
            >
              <MessageCircle size={16} className="fill-white" />
              <span>📲 LINE 防跳出分享</span>
            </button>
          )}

          <UniversalButton
            variant="outline"
            size="md"
            onClick={() => setShowAddCommModal(true)}
            icon={<Building size={18} />}
          >
            + 新增第二/第三社區
          </UniversalButton>
        </div>
      </div>

      {/* 區權會法定電子憑證卡智能生成專區 (限定 admin / admin1 啟用) */}
      <div className="rounded-3xl bg-gradient-to-r from-purple-950 via-indigo-950 to-slate-900 p-6 text-white shadow-xl border border-purple-500/30 flex flex-wrap items-center justify-between gap-5">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-purple-500 text-white shadow-lg">
            <FileCheck size={32} />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-xl font-black text-white">
                🎟️ 區權會法定電子憑證卡智能生成台
              </h3>
              <span className="rounded-md bg-purple-500/40 border border-purple-300 px-2.5 py-0.5 text-xs font-black text-purple-200">
                🔒 限定 admin / admin1 啟用
              </span>
            </div>
            <p className="text-xs sm:text-sm text-purple-200 leading-relaxed max-w-2xl">
              依大會法定規格排版：<b>每張 A4 生成 12 張 QR 憑證卡</b>（3×4 格）、<b>戶號特大加粗</b>、<b>粗實心外邊框</b>、並具備<b>2公分以上護貝留邊粗虛線裁切線</b>。住戶現場出示或相機一掃即可 0 秒免打字完成身分驗證與換機登入！
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onNavigateToPassCards}
            className="flex items-center gap-2 rounded-2xl bg-white px-5 py-3.5 text-xs sm:text-sm font-black text-purple-950 hover:bg-purple-50 active:scale-95 transition-all shadow-xl"
          >
            <Printer size={18} className="text-purple-700" />
            <span>開啟 A4 12格憑證列印台 (進入印製)</span>
          </button>
        </div>
      </div>

      {/* LINE 社群宣傳大會專用 (方案 A 外部開啟防跳出) */}
      <div className="rounded-3xl bg-emerald-950/90 border border-emerald-500/40 p-5 text-white shadow-lg flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-md">
            <MessageCircle size={26} className="fill-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-base font-black text-white">
                📲 LINE 社群宣傳大會專用 (方案 A 防跳出)
              </h4>
              <span className="rounded-md bg-emerald-500/30 px-2 py-0.5 text-[11px] font-bold text-emerald-300 font-mono">
                ?openExternalBrowser=1
              </span>
            </div>
            <p className="text-xs text-emerald-200 mt-0.5">
              專為 LINE 群組設計，點擊自動呼叫 Safari / Chrome 開啟，徹底杜絕住戶滑到底部誤關閉網頁。
            </p>
          </div>
        </div>

        <button
          onClick={onOpenLineShare}
          className="flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-xs font-black text-white hover:bg-emerald-600 active:scale-95 transition-all shadow-md"
        >
          <Copy size={15} />
          <span>一鍵複製 LINE 防跳出宣傳文案</span>
        </button>
      </div>

      {/* 現場當日防遠端灌票 4 碼 PIN 碼專屬控制台 */}
      <div className="rounded-3xl bg-amber-500/10 border-2 border-amber-300 p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-md">
              <KeyRound size={32} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-black text-amber-950">
                  開會現場防灌票 4 位數 PIN 碼
                </h3>
                <span className="rounded-md bg-amber-200 px-2 py-0.5 text-xs font-bold text-amber-900">
                  當日 23:59 自動失效
                </span>
              </div>
              <p className="text-xs sm:text-sm text-amber-800 mt-0.5">
                此 PIN 碼供現場大螢幕公佈或主席口頭宣讀，住戶輸入後方可投票，能 100% 杜絕遠端未出席灌票。
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-white border-2 border-amber-400 px-6 py-2.5 text-center shadow-inner">
              <span className="block text-[10px] font-bold uppercase tracking-widest text-slate-400">
                當前現場 PIN 碼
              </span>
              <span className="font-mono text-3xl font-black tracking-widest text-amber-900">
                {currentPin}
              </span>
            </div>

            <UniversalButton
              variant="outline"
              size="md"
              className="border-amber-400 text-amber-900 hover:bg-amber-100"
              onClick={handleRegeneratePin}
              icon={<RefreshCw size={16} />}
            >
              重新產生 PIN 碼
            </UniversalButton>
          </div>
        </div>
      </div>

      {/* 大會服務台 · 現場身分認證與設備解綁專區 (Service Desk Authorization) */}
      <div className="rounded-3xl bg-white p-6 shadow-md border border-slate-200 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="rounded-2xl bg-indigo-100 p-2 text-indigo-700">
              <Smartphone size={24} />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <span>大會服務台 · 現場身分人工認證與換機開通專區</span>
                <span className="rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5">
                  即時雙向連線
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                專供現場總幹事與管理員：住戶手機末四碼不符認證、更換手機解綁、即時授權開通
              </p>
            </div>
          </div>
          {deskRequests.filter(r => r.status === 'pending').length > 0 && (
            <span className="rounded-full bg-rose-500 text-white text-xs font-black px-3 py-1 animate-pulse">
              🚨 {deskRequests.filter(r => r.status === 'pending').length} 位住戶正在手機前等待審核
            </span>
          )}
        </div>

        {/* 即時反饋通知條 */}
        {activeNotice && (
          <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 border-2 border-emerald-300 p-4 text-xs font-black text-emerald-900 shadow-sm animate-fadeIn">
            <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
            <span className="flex-1">{activeNotice}</span>
          </div>
        )}

        {/* 1. 待現場審核求助清單 (Real-time Pending Requests) */}
        {deskRequests.filter(r => r.status === 'pending').length > 0 ? (
          <div className="rounded-2xl border-2 border-amber-400 bg-amber-50/90 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-3 w-3 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
                </span>
                <h4 className="text-sm font-black text-amber-950 flex items-center gap-1.5">
                  <span>🚨 現場待人工認證求助清單</span>
                  <span className="rounded-full bg-rose-600 px-2 py-0.5 text-[10px] font-black text-white">
                    {deskRequests.filter(r => r.status === 'pending').length} 筆待審核
                  </span>
                </h4>
              </div>
              <span className="text-[11px] font-bold text-amber-800 animate-pulse">
                📡 住戶手機在線等待核准訊號中...
              </span>
            </div>

            <div className="space-y-2.5">
              {deskRequests.filter(r => r.status === 'pending').map((req) => (
                <div
                  key={req.id}
                  className="rounded-2xl border border-amber-200 bg-white p-4 shadow-xs space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-base font-black text-indigo-900 bg-indigo-50 px-2.5 py-1 rounded-xl border border-indigo-200">
                        {req.unit_no}
                      </span>
                      <span className="font-bold text-slate-900 text-sm">{req.owner_name}</span>
                      <span className="text-slate-400">·</span>
                      <span className="text-slate-600">
                        名冊登記末四碼：<b className="font-mono text-slate-800">{req.registered_phone_last4}</b>
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {new Date(req.requested_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>

                  <div className="rounded-xl bg-amber-50 p-2.5 text-xs text-amber-950 flex flex-wrap items-center justify-between gap-2 border border-amber-200">
                    <span>住戶手機剛輸入之末四碼：<b className="font-mono text-base font-black text-rose-600 ml-1">{req.input_phone_last4}</b></span>
                    <span className="text-[10px] text-amber-800 font-mono">設備識別: {req.device_uuid.slice(0, 10)}***</span>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1">
                    {/* 一鍵特權開通 */}
                    <button
                      type="button"
                      onClick={() => handleApproveDeskRequest(req, false)}
                      className="flex-1 min-h-[40px] rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-xs transition-all"
                    >
                      <Zap size={16} />
                      <span>一鍵現場特權開通 (無條件核准)</span>
                    </button>

                    {/* 更正手機為住戶輸入末四碼並開通 */}
                    <button
                      type="button"
                      onClick={() => handleApproveDeskRequest(req, true)}
                      className="flex-1 min-h-[40px] rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-xs transition-all"
                    >
                      <Check size={16} />
                      <span>更正手機為【{req.input_phone_last4}】並開通</span>
                    </button>

                    {/* 駁回 */}
                    <button
                      type="button"
                      onClick={() => handleRejectDeskRequest(req)}
                      className="rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 px-3.5 py-1.5 text-xs font-bold transition-colors"
                    >
                      駁回
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-2xl bg-slate-50 border border-slate-200 p-3 text-xs text-slate-500 flex items-center gap-2">
            <Radio size={16} className="text-emerald-500 animate-pulse" />
            <span>目前無等待審核之求助單。若住戶在登入時手機號碼不符，此處將以 0 秒即時跳出提醒！</span>
          </div>
        )}

        {/* 2. 搜尋住戶戶號卡片與現場操作 */}
        <div className="space-y-3 pt-2">
          <label className="block text-sm font-bold text-slate-800">
            🔍 任意戶號快速搜尋、現場強制授權與號碼更正
          </label>
          <div className="relative">
            <input
              type="text"
              placeholder="請輸入住戶戶號 (例如：12F-15)、所有權人姓名或末四碼搜尋..."
              value={searchMemberQuery}
              onChange={(e) => setSearchMemberQuery(e.target.value)}
              className="w-full rounded-2xl border-2 border-slate-300 px-4 py-3 text-sm font-bold text-slate-900 focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          {filteredMembers.length > 0 && (
            <div className="space-y-2.5">
              {filteredMembers.map((m) => {
                const phoneInputVal = editingPhoneLast4[m.id] !== undefined ? editingPhoneLast4[m.id] : m.phone_last4;
                return (
                  <div
                    key={m.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 space-y-3 shadow-2xs"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-base font-black text-indigo-900 bg-white px-2.5 py-1 rounded-xl border border-slate-200 shadow-2xs">
                          {m.unit_no}
                        </span>
                        <span className="font-bold text-slate-900">{m.owner_name}</span>
                        <span className="text-xs text-slate-500 font-semibold">{m.area_ping} 坪</span>
                        <span className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${
                          m.is_checked_in ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                        }`}>
                          {m.is_checked_in ? '已報到' : '未報到'}
                        </span>
                      </div>

                      <div className="text-xs">
                        {m.bound_device_token ? (
                          <span className="text-indigo-600 font-bold flex items-center gap-1">
                            <Smartphone size={14} />
                            已鎖定設備 ({m.bound_device_token.slice(0, 8)}...)
                          </span>
                        ) : (
                          <span className="text-slate-400">尚未綁定手機</span>
                        )}
                      </div>
                    </div>

                    {/* 管理員認證與修改操作列 */}
                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200/60">
                      {/* 1. 現場一鍵強制授權開通登入 */}
                      <button
                        type="button"
                        onClick={() => handleDirectAuthorize(m)}
                        className="rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white px-3.5 py-2 text-xs font-black flex items-center gap-1 shadow-xs transition-all"
                      >
                        <Zap size={15} />
                        <span>一鍵現場特權開通</span>
                      </button>

                      {/* 2. 修改登記手機號碼 */}
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-600">登記手機末4碼:</span>
                        <input
                          type="text"
                          maxLength={4}
                          value={phoneInputVal}
                          onChange={(e) => setEditingPhoneLast4({ ...editingPhoneLast4, [m.id]: e.target.value.replace(/\D/g, '') })}
                          className="w-16 rounded-lg border border-slate-300 px-2 py-1 text-center font-mono text-sm font-black text-slate-900 focus:border-indigo-600 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleUpdatePhone(m, phoneInputVal)}
                          className="rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white px-2.5 py-1 text-xs font-bold"
                        >
                          更正
                        </button>
                      </div>

                      {/* 3. 解除手機鎖定 */}
                      {m.bound_device_token && (
                        <button
                          type="button"
                          onClick={() => handleUnlockDevice(m)}
                          className="rounded-xl border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-700 px-3 py-1.5 text-xs font-bold flex items-center gap-1 ml-auto"
                        >
                          <Unlock size={14} />
                          <span>換機解綁</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 議案清冊與表決控制 (Topics CRUD) */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
              <FileCheck size={24} className="text-indigo-600" />
              <span>開會表決議案管理 (提案/封票/自訂選項)</span>
            </h2>
            <p className="text-xs text-slate-500">
              主委與總幹事可即時增減表決事項，支援「贊成/反對」或「自訂選項方案」
            </p>
          </div>

          <UniversalButton
            variant="primary"
            size="md"
            onClick={() => setShowAddTopicModal(true)}
            icon={<Plus size={18} />}
          >
            + 新增表決議案
          </UniversalButton>
        </div>

        <div className="grid gap-4">
          {topics.map((t) => {
            const stats = calculateTopicStats(t, community.total_area_ping, community.total_units);
            const isOpen = t.status === 'open';

            return (
              <div
                key={t.id}
                className="rounded-3xl bg-white p-5 sm:p-6 shadow-md border border-slate-200 space-y-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="rounded-lg bg-indigo-100 px-2.5 py-0.5 text-xs font-bold text-indigo-800">
                      第 {t.order_num} 案
                    </span>
                    <span className="text-xs font-semibold text-slate-500">
                      {t.vote_type === 'yes_no' ? '同意/不同意/棄權' : '自訂多方案選擇'}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                        isOpen
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {isOpen ? '🟢 投票進行中' : '🔒 已封票結算'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleTopicStatus(t)}
                      className={`flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-bold ${
                        isOpen
                          ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                          : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                      }`}
                    >
                      {isOpen ? <Lock size={14} /> : <Unlock size={14} />}
                      <span>{isOpen ? '立即封票結算' : '重新開放投票'}</span>
                    </button>

                    <button
                      onClick={() => handleDeleteTopic(t.id)}
                      className="rounded-xl p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                      title="刪除議案"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div>
                  <h4 className="text-lg font-black text-slate-900">{t.title}</h4>
                  {t.description && (
                    <p className="mt-1 text-sm text-slate-600 leading-relaxed">
                      {t.description}
                    </p>
                  )}
                </div>

                {/* 即時得票統計條 */}
                <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100">
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-2 font-semibold">
                    <span>
                      已投總戶數：<b className="text-slate-800">{stats.total_votes} 戶</b> / 已投總權重：<b className="text-slate-800">{stats.total_voted_weight} 坪</b>
                    </span>
                    <span className="text-indigo-700 font-bold">{stats.decision_summary}</span>
                  </div>

                  <div className="space-y-2">
                    {stats.options_stats.map((opt) => (
                      <div key={opt.option_id} className="space-y-1">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                          <span>{opt.option_label}</span>
                          <span>
                            {opt.vote_count} 票 ({opt.count_percentage}%) · {opt.vote_weight} 坪 ({opt.weight_percentage}%)
                          </span>
                        </div>
                        <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
                          <div
                            className="h-full bg-indigo-600 rounded-full transition-all duration-300"
                            style={{ width: `${opt.count_percentage}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 🧹 大會正式上線淨空專區 (Pre-Meeting Purge & Reset) */}
      <div className="rounded-3xl border-2 border-rose-200 bg-rose-50/60 p-6 shadow-md space-y-4">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-rose-100 p-2.5 text-rose-700">
            <Trash2 size={24} />
          </div>
          <div>
            <h3 className="text-lg font-black text-rose-950 flex items-center gap-2">
              <span>大會正式上線淨空專區 (不保留測試資料)</span>
              <span className="rounded-md bg-rose-200 text-rose-900 text-[10px] font-black px-2 py-0.5">
                高危管理操作
              </span>
            </h3>
            <p className="text-xs text-rose-800">
              在大會正式開始前，或準備匯入管委會正式名冊時，可將測試期間產生的票數與假資料完全淨空
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          {/* 模式 1: 僅歸零票數與報到，保留名冊 */}
          <div className="rounded-2xl bg-white border border-rose-200 p-4 space-y-2.5 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-1.5 font-bold text-slate-900 text-sm">
                <RotateCcw size={16} className="text-amber-600" />
                <span>模式 A：選票歸零與重置報到 (保留名冊)</span>
              </div>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                清空目前所有表決票數與求助單，將所有戶別的報到與手機特徵鎖定狀態全數歸零，保留目前的戶號清冊。
              </p>
            </div>
            <button
              type="button"
              onClick={handlePurgeVotes}
              className="w-full rounded-xl bg-amber-600 hover:bg-amber-700 active:scale-98 text-white px-3 py-2 text-xs font-black shadow-xs transition-all"
            >
              🔄 確定清除選票 · 重置報到 (票數歸零)
            </button>
          </div>

          {/* 模式 2: 全面淨空名冊，等待匯入真實 Excel */}
          <div className="rounded-2xl bg-white border border-rose-300 p-4 space-y-2.5 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-1.5 font-bold text-rose-950 text-sm">
                <Trash2 size={16} className="text-rose-600" />
                <span>模式 B：全面淨空測試名冊 (迎接正式 Excel)</span>
              </div>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                全數清空 493 戶示範假名冊與測試選票，讓資料庫回到全新乾淨狀態，隨時準備上傳管委會真正的 Excel 清冊。
              </p>
            </div>
            <button
              type="button"
              onClick={handlePurgeAllDemo}
              className="w-full rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-98 text-white px-3 py-2 text-xs font-black shadow-xs transition-all"
            >
              🧹 確定全面淨空 · 等待匯入正式名冊
            </button>
          </div>
        </div>
      </div>

      {/* 新增議案彈窗 */}
      {showAddTopicModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center bg-black/75 p-3 sm:p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg max-h-[88vh] overflow-y-auto my-auto rounded-3xl bg-white p-5 sm:p-7 shadow-2xl">
            <h3 className="text-xl font-black text-slate-900 mb-4">
              📝 建立新的表決議案 (主委/總幹事提案)
            </h3>
            <form onSubmit={handleCreateTopic} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">
                  議案名稱 *
                </label>
                <input
                  type="text"
                  required
                  placeholder="例如：第四案：社區梯廳節能 LED 燈具全面更換工程案"
                  value={newTopicTitle}
                  onChange={(e) => setNewTopicTitle(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-3 text-base focus:border-indigo-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">
                  議案說明與原由
                </label>
                <textarea
                  rows={3}
                  placeholder="請填寫提案背景、預算編列、效益評估與廠商報價..."
                  value={newTopicDesc}
                  onChange={(e) => setNewTopicDesc(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-3 text-sm focus:border-indigo-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">
                  表決選項模式
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewTopicType('yes_no')}
                    className={`rounded-xl border p-3 text-center text-sm font-bold ${
                      newTopicType === 'yes_no'
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    贊成 / 反對 / 棄權
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewTopicType('multiple_choice')}
                    className={`rounded-xl border p-3 text-center text-sm font-bold ${
                      newTopicType === 'multiple_choice'
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    自訂多選項 (A, B, C...)
                  </button>
                </div>
              </div>

              {newTopicType === 'multiple_choice' && (
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">
                    每行填寫一個自訂選項
                  </label>
                  <textarea
                    rows={4}
                    value={customOptionsText}
                    onChange={(e) => setCustomOptionsText(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 p-3 text-sm focus:border-indigo-600 focus:outline-none font-mono"
                  />
                </div>
              )}

              <div className="flex gap-2.5 pt-2">
                <UniversalButton
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="flex-1"
                >
                  確認建立並開放投票
                </UniversalButton>
                <UniversalButton
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={() => setShowAddTopicModal(false)}
                >
                  取消
                </UniversalButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 新增多社區租戶彈窗 */}
      {showAddCommModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center bg-black/75 p-3 sm:p-4 backdrop-blur-sm">
          <div className="w-full max-w-md max-h-[88vh] overflow-y-auto my-auto rounded-3xl bg-white p-5 sm:p-7 shadow-2xl">
            <h3 className="text-xl font-black text-slate-900 mb-4">
              🏢 新增管委會社區 (Multi-Tenant)
            </h3>
            <form onSubmit={handleCreateCommunity} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">
                  社區代號 (例如：C-003)
                </label>
                <input
                  type="text"
                  placeholder="C-003"
                  value={newCommCode}
                  onChange={(e) => setNewCommCode(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">
                  社區完整名稱 *
                </label>
                <input
                  type="text"
                  required
                  placeholder="例如：大安御邸大廈"
                  value={newCommName}
                  onChange={(e) => setNewCommName(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">
                  社區登記地址
                </label>
                <input
                  type="text"
                  placeholder="例如：台北市大安區信義路四段..."
                  value={newCommAddress}
                  onChange={(e) => setNewCommAddress(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    總戶數
                  </label>
                  <input
                    type="number"
                    value={newCommUnits}
                    onChange={(e) => setNewCommUnits(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    總權利坪數 (坪)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={newCommPing}
                    onChange={(e) => setNewCommPing(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-sm"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-3">
                <UniversalButton
                  type="submit"
                  variant="primary"
                  size="md"
                  className="flex-1"
                >
                  確認建立社區
                </UniversalButton>
                <UniversalButton
                  type="button"
                  variant="outline"
                  size="md"
                  onClick={() => setShowAddCommModal(false)}
                >
                  取消
                </UniversalButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
