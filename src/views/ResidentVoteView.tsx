import React, { useState, useEffect, useCallback } from 'react';
import {
  Member,
  Meeting,
  Topic,
  Community,
  TopicOption,
  AccessibilitySettings,
} from '../types';
import {
  getTopics,
  getVotes,
  addVote,
  subscribeToSyncEvents,
} from '../lib/storage';
import { UniversalButton } from '../components/UniversalButton';
import {
  CheckCircle2,
  Clock,
  ShieldCheck,
  AlertTriangle,
  QrCode,
  FileText,
  BadgeCheck,
  Sparkles,
} from 'lucide-react';

interface ResidentVoteViewProps {
  member: Member;
  community: Community;
  meeting: Meeting | null;
  onOpenPassCard: () => void;
  accessibility: AccessibilitySettings;
}

export const ResidentVoteView: React.FC<ResidentVoteViewProps> = ({
  member,
  community,
  meeting,
  onOpenPassCard,
  accessibility,
}) => {
  const [topics, setTopics] = useState<Topic[]>(() => getTopics(meeting?.id));
  const [votes, setVotes] = useState(() => getVotes());
  const [confirmModal, setConfirmModal] = useState<{
    topic: Topic;
    option: TopicOption;
  } | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // 重新載入投票狀態
  const refreshVotes = useCallback(() => {
    setVotes(getVotes());
    setTopics(getTopics(meeting?.id));
  }, [meeting?.id]);

  // 即時監聽議案狀態更新與全域事件
  useEffect(() => {
    const handleSync = (event: { type: string }) => {
      if (event.type === 'TOPIC_UPDATED' || event.type === 'VOTE_SUBMITTED') {
        refreshVotes();
      }
    };
    const unsubscribe = subscribeToSyncEvents(handleSync);
    return () => unsubscribe();
  }, [refreshVotes]);

  const handleSelectOption = (topic: Topic, option: TopicOption) => {
    setConfirmModal({ topic, option });
  };

  const handleConfirmVote = () => {
    if (!confirmModal) return;
    const { topic, option } = confirmModal;

    const result = addVote({
      id: `vote-${Date.now()}-${member.id}`,
      topic_id: topic.id,
      member_id: member.id,
      option_id: option.id,
      voted_weight: member.area_ping,
      voted_at: new Date().toISOString(),
    });

    if (result.success) {
      setSuccessToast(`🎉 成功投下【${option.option_label}】！已記錄法定持分權重 ${member.area_ping} 坪。`);
      setTimeout(() => setSuccessToast(null), 4000);
      refreshVotes();
    } else {
      alert(result.message);
    }
    setConfirmModal(null);
  };

  // 文字大小樣式映射 (通用設計)
  const textSizeClasses = {
    normal: { title: 'text-xl', body: 'text-base', option: 'text-lg' },
    large: { title: 'text-2xl', body: 'text-lg', option: 'text-xl' },
    'extra-large': { title: 'text-3xl', body: 'text-xl', option: 'text-2xl' },
  }[accessibility.fontSize];

  return (
    <div className="mx-auto max-w-2xl px-4 py-5 sm:py-8 space-y-6">
      {/* 成功投票浮動提示 */}
      {successToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-2xl bg-emerald-600 px-6 py-3.5 text-white font-bold shadow-2xl animate-bounce">
          <Sparkles size={22} />
          <span>{successToast}</span>
        </div>
      )}

      {/* 住戶專屬身分識別橫幅 (Universal ID Badge) */}
      <div className="overflow-hidden rounded-3xl bg-white p-5 sm:p-6 shadow-md border border-slate-200">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white font-black text-xl shadow-xs">
              {member.floor}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl sm:text-2xl font-black text-slate-900">
                  {member.unit_no}
                </span>
                <span className="rounded-full bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 text-xs font-bold text-indigo-700">
                  {community.name}
                </span>
                <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                  已報到
                </span>
              </div>
              <p className="text-sm text-slate-500 font-medium">
                區分所有權人：<span className="text-slate-800 font-bold">{member.owner_name}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onOpenPassCard}
            className="flex items-center gap-1.5 rounded-2xl border-2 border-indigo-200 bg-indigo-50 px-3.5 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-100 transition-colors"
          >
            <QrCode size={18} />
            <span>個人專屬憑證 QR</span>
          </button>
        </div>

        {/* 台灣公寓大廈法定持分坪數與權重計算展示 */}
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 text-center">
          <div className="rounded-2xl bg-slate-50 p-2.5 border border-slate-100">
            <span className="text-xs text-slate-500 block">權狀持分坪數</span>
            <span className="text-lg font-black text-slate-800">{member.area_ping} 坪</span>
          </div>
          <div className="rounded-2xl bg-indigo-50/70 p-2.5 border border-indigo-100">
            <span className="text-xs text-indigo-700 block font-semibold">法定權利比率</span>
            <span className="text-lg font-black text-indigo-900">
              {(member.weight_ratio * 100).toFixed(4)}%
            </span>
          </div>
          <div className="rounded-2xl bg-slate-50 p-2.5 border border-slate-100">
            <span className="text-xs text-slate-500 block">大會進行中議案</span>
            <span className="text-lg font-black text-slate-800">
              {topics.filter((t) => t.status === 'open').length} 案
            </span>
          </div>
          <div className="rounded-2xl bg-emerald-50/70 p-2.5 border border-emerald-100">
            <span className="text-xs text-emerald-700 block font-semibold">您已完成投票</span>
            <span className="text-lg font-black text-emerald-800">
              {topics.filter((t) => votes.some((v) => v.topic_id === t.id && v.member_id === member.id)).length} 案
            </span>
          </div>
        </div>
      </div>

      {/* 議案表決清單 */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
            <FileText size={24} className="text-indigo-600" />
            <span>本次大會表決議案</span>
          </h2>
          <span className="text-xs font-semibold text-slate-500">
            一人一票 · 依權狀持分衝量
          </span>
        </div>

        {topics.length === 0 ? (
          <div className="rounded-3xl bg-white p-8 text-center border border-slate-200">
            <Clock size={40} className="mx-auto text-slate-300 mb-2" />
            <p className="text-slate-500 font-semibold">大會目前尚未建立投票議案，請稍候</p>
          </div>
        ) : (
          topics.map((topic) => {
            const userVote = votes.find(
              (v) => v.topic_id === topic.id && v.member_id === member.id
            );
            const isVoted = Boolean(userVote);
            const votedOption = topic.options?.find((o) => o.id === userVote?.option_id);
            const isClosed = topic.status === 'closed';

            return (
              <div
                key={topic.id}
                className={`overflow-hidden rounded-3xl bg-white shadow-md border-2 transition-all ${
                  isVoted
                    ? 'border-emerald-200 bg-emerald-50/10'
                    : isClosed
                    ? 'border-slate-200 opacity-90'
                    : 'border-indigo-100 hover:border-indigo-300'
                }`}
              >
                {/* 議案頂部標題 */}
                <div className="p-5 sm:p-6 border-b border-slate-100">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="rounded-full bg-indigo-100 text-indigo-800 font-bold px-3 py-0.5 text-xs">
                      第 {topic.order_num} 案
                    </span>
                    {isClosed ? (
                      <span className="rounded-full bg-slate-200 text-slate-700 px-3 py-0.5 text-xs font-bold">
                        🔒 已封票結算
                      </span>
                    ) : isVoted ? (
                      <span className="flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-800 px-3 py-0.5 text-xs font-bold">
                        <BadgeCheck size={14} />
                        已完成投票
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 rounded-full bg-amber-100 text-amber-900 px-3 py-0.5 text-xs font-bold">
                        <Clock size={14} />
                        投票進行中
                      </span>
                    )}
                  </div>

                  <h3 className={`font-black text-slate-900 ${textSizeClasses.title} leading-snug`}>
                    {topic.title}
                  </h3>

                  {topic.description && (
                    <div className="mt-3 rounded-2xl bg-slate-50 p-4 text-slate-600 text-sm sm:text-base leading-relaxed border border-slate-100 whitespace-pre-wrap">
                      {topic.description}
                    </div>
                  )}
                </div>

                {/* 投票選項區塊 */}
                <div className="p-5 sm:p-6 bg-slate-50/50">
                  {isVoted ? (
                    // 已投票狀態展示
                    <div className="rounded-2xl border-2 border-emerald-300 bg-emerald-50 p-4 text-center">
                      <div className="flex items-center justify-center gap-2 text-emerald-800 font-black text-lg sm:text-xl">
                        <CheckCircle2 size={24} className="text-emerald-600" />
                        <span>您投下的選項：【{votedOption?.option_label || '已送出'}】</span>
                      </div>
                      <p className="mt-1.5 text-xs sm:text-sm text-emerald-700 font-medium">
                        投票時間：{userVote?.voted_at ? new Date(userVote.voted_at).toLocaleTimeString('zh-TW') : '-'} · 已計入 {member.area_ping} 坪持分權重
                      </p>
                    </div>
                  ) : isClosed ? (
                    // 已封票
                    <div className="rounded-2xl bg-slate-200/80 p-4 text-center text-slate-600 font-bold">
                      本案已於現場封票結算，不再受理投票
                    </div>
                  ) : (
                    // 未投票 - 提供超大按鈕 (Universal Design >= 56px)
                    <div className="space-y-3">
                      <div className="text-xs font-bold text-slate-500 mb-1">
                        請點選您支持的決議（點擊後將彈出二次確認）：
                      </div>

                      {topic.options?.map((option) => {
                        const isYes = option.option_key === 'YES';
                        const isNo = option.option_key === 'NO';
                        const isAbstain = option.option_key === 'ABSTAIN';

                        const variant = isYes ? 'success' : isNo ? 'danger' : isAbstain ? 'outline' : 'primary';

                        return (
                          <UniversalButton
                            key={option.id}
                            variant={variant}
                            size="xl"
                            className="w-full text-left justify-start"
                            onClick={() => handleSelectOption(topic, option)}
                          >
                            <span className="flex items-center justify-between w-full">
                              <span className="font-bold">{option.option_label}</span>
                              <span className="text-sm font-semibold opacity-80 ml-2">點此選擇 ➔</span>
                            </span>
                          </UniversalButton>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 防手抖誤投 二度確認對話視窗 (Universal Confirmation Modal) */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md rounded-3xl bg-white p-6 sm:p-8 shadow-2xl border-4 border-indigo-400">
            <div className="mb-4 text-center">
              <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-3xl bg-indigo-100 text-indigo-700">
                <AlertTriangle size={36} />
              </div>
              <h3 className="text-2xl font-black text-slate-900">
                投票確認送出
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                依公寓大廈管理條例法定投票程序，送出後無法竄改或撤回
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200 space-y-2 mb-6">
              <div className="text-xs text-slate-500">表決議案</div>
              <div className="font-bold text-slate-900 text-base">
                {confirmModal.topic.title}
              </div>

              <div className="pt-2 border-t border-slate-200">
                <div className="text-xs text-slate-500">您選擇投下的決議</div>
                <div className="text-2xl font-black text-indigo-700 mt-1">
                  【{confirmModal.option.option_label}】
                </div>
              </div>

              <div className="text-xs text-slate-500 pt-1">
                投票人：<span className="font-bold text-slate-700">{member.unit_no} {member.owner_name}</span> (權重: {member.area_ping} 坪)
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <UniversalButton
                variant="primary"
                size="xl"
                className="w-full bg-indigo-600 hover:bg-indigo-700"
                onClick={handleConfirmVote}
                icon={<ShieldCheck size={26} />}
              >
                確認無誤，正式提交投票
              </UniversalButton>

              <UniversalButton
                variant="outline"
                size="lg"
                className="w-full"
                onClick={() => setConfirmModal(null)}
              >
                返回重新選擇
              </UniversalButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
