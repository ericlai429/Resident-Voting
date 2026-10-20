import React, { useState } from 'react';
import {
  Community,
  Meeting,
  Topic,
  Member,
  TopicOption,
  TopicVoteType,
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
  updateMember,
  calculateTopicStats,
} from '../lib/storage';
import { UniversalButton } from '../components/UniversalButton';
import {
  Shield,
  Plus,
  Trash2,
  Lock,
  Unlock,
  KeyRound,
  RefreshCw,
  Building,
  Users,
  CheckCircle2,
  Smartphone,
  Eye,
  FileCheck,
} from 'lucide-react';

interface AdminDashboardProps {
  community: Community;
  meeting: Meeting | null;
  onRefreshData: () => void;
  onNavigateToScreen: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  community,
  meeting,
  onRefreshData,
  onNavigateToScreen,
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
  const [resetSuccessUnit, setResetSuccessUnit] = useState<string | null>(null);

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

  // 現場管理員解除住戶手機綁定 (忘記密碼 / 換新手機重置)
  const handleResetDevice = (member: Member) => {
    const updated: Member = {
      ...member,
      bound_device_token: undefined, // 清空綁定特徵值
      reset_token: `TOKEN-${member.unit_no}-${Date.now().toString(36).toUpperCase()}`,
    };
    updateMember(updated);
    setResetSuccessUnit(member.unit_no);
    setTimeout(() => setResetSuccessUnit(null), 3000);
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

      {/* 現場忘記密碼 / 換機解鎖專區 (Reset Resident Binding) */}
      <div className="rounded-3xl bg-white p-6 shadow-md border border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <Smartphone size={22} className="text-indigo-600" />
            <h3 className="text-lg font-bold text-slate-900">
              住戶換機解綁 / 忘記登入碼重置 (服務台專用)
            </h3>
          </div>
          <span className="text-xs text-slate-500">
            住戶手機遺失、更換新機或遭鎖定時代為解鎖
          </span>
        </div>

        <div className="flex gap-2 mb-3">
          <input
            type="text"
            placeholder="請輸入住戶戶號 (例如：12F-15)、姓名或末四碼搜尋..."
            value={searchMemberQuery}
            onChange={(e) => setSearchMemberQuery(e.target.value)}
            className="flex-1 rounded-2xl border border-slate-300 px-4 py-2.5 text-sm focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
        </div>

        {resetSuccessUnit && (
          <div className="mb-3 flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800 font-bold">
            <CheckCircle2 size={16} className="text-emerald-600" />
            <span>戶號【{resetSuccessUnit}】已成功解除裝置綁定並發放新登入碼！住戶現在可在新手機重新登入。</span>
          </div>
        )}

        {filteredMembers.length > 0 && (
          <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-slate-50/50">
            {filteredMembers.map((m) => (
              <div key={m.id} className="flex items-center justify-between p-3 text-sm">
                <div>
                  <span className="font-bold text-slate-900 mr-2">{m.unit_no}</span>
                  <span className="text-slate-700 font-medium mr-2">{m.owner_name}</span>
                  <span className="text-xs text-slate-400 mr-2">末四碼: {m.phone_last4}</span>
                  <span className="text-xs text-slate-500">
                    狀態: {m.bound_device_token ? '已綁定裝置' : '未綁定'}
                  </span>
                </div>
                <button
                  onClick={() => handleResetDevice(m)}
                  className="rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-700 active:scale-95 transition-transform"
                >
                  一鍵解綁手機 / 重置
                </button>
              </div>
            ))}
          </div>
        )}
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

      {/* 新增議案彈窗 */}
      {showAddTopicModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 sm:p-8 shadow-2xl">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 sm:p-8 shadow-2xl">
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
