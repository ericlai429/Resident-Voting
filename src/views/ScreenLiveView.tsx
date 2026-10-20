import React, { useEffect, useState } from 'react';
import { Community, Meeting, Topic } from '../types';
import { getTopics, getMembers, calculateTopicStats, subscribeToSyncEvents } from '../lib/storage';
import {
  CheckCircle2,
  AlertCircle,
  KeyRound,
  Maximize2,
} from 'lucide-react';

interface ScreenLiveViewProps {
  community: Community;
  meeting: Meeting | null;
}

export const ScreenLiveView: React.FC<ScreenLiveViewProps> = ({
  community,
  meeting,
}) => {
  const [topics, setTopics] = useState<Topic[]>(() => getTopics(meeting?.id));
  const [members, setMembers] = useState(() => getMembers(community.id));
  const [lastUpdated, setLastUpdated] = useState(() => new Date());

  // 即時監聽全域事件 (投票、開議、結算 0 秒跳動) + 每 2.5 秒輪詢備援
  useEffect(() => {
    const refreshState = () => {
      setTopics(getTopics(meeting?.id));
      setMembers(getMembers(community.id));
      setLastUpdated(new Date());
    };

    const unsubscribe = subscribeToSyncEvents((event) => {
      if (
        event.type === 'VOTE_SUBMITTED' ||
        event.type === 'TOPIC_UPDATED' ||
        event.type === 'MEMBER_AUTHORIZED' ||
        event.type === 'AUTH_REQUEST_APPROVED'
      ) {
        refreshState();
      }
    });

    const timer = setInterval(refreshState, 2500);

    return () => {
      unsubscribe();
      clearInterval(timer);
    };
  }, [meeting, community]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const totalUnits = members.length || community.total_units || 1;
  const checkedInMembers = members.filter((m) => m.is_checked_in);
  const attendedUnits = checkedInMembers.length;
  const unitRate = ((attendedUnits / totalUnits) * 100).toFixed(1);

  const totalPing = members.reduce((sum, m) => sum + m.area_ping, 0) || community.total_area_ping || 1;
  const attendedPing = checkedInMembers.reduce((sum, m) => sum + m.area_ping, 0);
  const pingRate = ((attendedPing / totalPing) * 100).toFixed(1);

  // 公寓大廈管理條例法定出席門檻：戶數過半 且 坪數過半
  const isUnitQuorumMet = attendedUnits >= totalUnits * 0.5;
  const isPingQuorumMet = attendedPing >= totalPing * 0.5;
  const isFullQuorumMet = isUnitQuorumMet && isPingQuorumMet;

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 sm:p-8 space-y-6">
      {/* 大螢幕投影專用頂部橫幅 */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="rounded-md bg-indigo-600 px-3 py-1 text-xs font-black uppercase tracking-wider text-white">
              大會現場即時計票戰情報告
            </span>
            <span className="text-xs font-bold text-slate-400">
              更新時間: {lastUpdated.toLocaleTimeString('zh-TW')}
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
            {community.name} · {meeting?.title || '區分所有權人會議'}
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            開會地點：{meeting?.location} · 台灣《公寓大廈管理條例》雙門檻即時法定決議
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* 大字現場防灌票 PIN 碼展示 */}
          <div className="rounded-2xl bg-amber-500/20 border-2 border-amber-400/80 px-5 py-2.5 text-center shadow-lg">
            <span className="flex items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-wider text-amber-300">
              <KeyRound size={12} />
              <span>現場投票 PIN 碼</span>
            </span>
            <span className="font-mono text-3xl font-black tracking-widest text-amber-300">
              {meeting?.pin_code || '8866'}
            </span>
          </div>

          <button
            onClick={toggleFullscreen}
            className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
            title="切換全螢幕投影"
          >
            <Maximize2 size={24} />
          </button>
        </div>
      </div>

      {/* 法定出席雙門檻即時統計看板 */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* 指標 1: 專有部分戶數比例 */}
        <div className="rounded-3xl bg-slate-900 border border-slate-800 p-5 shadow-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400">
              指標一：出席戶數比例 (法定門檻 50%)
            </span>
            {isUnitQuorumMet ? (
              <span className="rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 px-2.5 py-0.5 text-xs font-bold">
                ✓ 達出席標準
              </span>
            ) : (
              <span className="rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/50 px-2.5 py-0.5 text-xs font-bold">
                未達標
              </span>
            )}
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-black text-white">{attendedUnits}</span>
            <span className="text-xl text-slate-400 font-bold">/ {totalUnits} 戶</span>
            <span className="ml-auto text-3xl font-black text-indigo-400">{unitRate}%</span>
          </div>
          <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-slate-800">
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                isUnitQuorumMet ? 'bg-emerald-500' : 'bg-indigo-500'
              }`}
              style={{ width: `${Math.min(parseFloat(unitRate), 100)}%` }}
            />
          </div>
        </div>

        {/* 指標 2: 權利持分坪數比例 */}
        <div className="rounded-3xl bg-slate-900 border border-slate-800 p-5 shadow-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400">
              指標二：出席持分坪數比例 (法定門檻 50%)
            </span>
            {isPingQuorumMet ? (
              <span className="rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 px-2.5 py-0.5 text-xs font-bold">
                ✓ 達出席標準
              </span>
            ) : (
              <span className="rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/50 px-2.5 py-0.5 text-xs font-bold">
                未達標
              </span>
            )}
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-black text-white">{attendedPing.toFixed(1)}</span>
            <span className="text-xl text-slate-400 font-bold">/ {totalPing.toFixed(1)} 坪</span>
            <span className="ml-auto text-3xl font-black text-indigo-400">{pingRate}%</span>
          </div>
          <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-slate-800">
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                isPingQuorumMet ? 'bg-emerald-500' : 'bg-indigo-500'
              }`}
              style={{ width: `${Math.min(parseFloat(pingRate), 100)}%` }}
            />
          </div>
        </div>

        {/* 指標 3: 大會法定開議判定總結果 */}
        <div
          className={`rounded-3xl border p-5 shadow-xl flex flex-col justify-between ${
            isFullQuorumMet
              ? 'bg-emerald-950/40 border-emerald-500/60'
              : 'bg-amber-950/30 border-amber-500/50'
          }`}
        >
          <div>
            <span className="text-xs font-bold text-slate-400">
              公寓大廈管理條例 第31/32條 總判定
            </span>
            <h3 className="text-2xl font-black mt-1 text-white flex items-center gap-2">
              {isFullQuorumMet ? (
                <>
                  <CheckCircle2 size={28} className="text-emerald-400" />
                  <span>大會合法有效成立</span>
                </>
              ) : (
                <>
                  <AlertCircle size={28} className="text-amber-400" />
                  <span>出席報到統計中</span>
                </>
              )}
            </h3>
          </div>
          <p className="text-xs text-slate-300 mt-2">
            {isFullQuorumMet
              ? '出席之區分所有權人人數與持分比率均已逾全社區之二分之一，表決結果具備法律完整約束力。'
              : '目前尚未達到法定開議出席雙門檻，請現場工作人員加強住戶掃碼報到。'}
          </p>
        </div>
      </div>

      {/* 各議案即時計票跳動長條圖 */}
      <div className="space-y-4">
        <h2 className="text-2xl font-black text-white flex items-center gap-2">
          <span>📊 各議案表決得票即時戰報</span>
        </h2>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {topics.map((t) => {
            const stats = calculateTopicStats(t, totalPing, totalUnits);
            const isOpen = t.status === 'open';

            return (
              <div
                key={t.id}
                className="rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-xl space-y-4"
              >
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="rounded-lg bg-indigo-600 px-3 py-1 text-xs font-black text-white">
                      第 {t.order_num} 案
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                        isOpen
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                          : 'bg-slate-700 text-slate-300'
                      }`}
                    >
                      {isOpen ? '即時計票中' : '🔒 封票已結算'}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-xs text-slate-400 block">已投票統計</span>
                    <span className="text-sm font-black text-white">
                      {stats.total_votes} 戶 / {stats.total_voted_weight} 坪
                    </span>
                  </div>
                </div>

                <h3 className="text-xl font-black text-white leading-snug">
                  {t.title}
                </h3>

                {/* 選項跳動橫條 */}
                <div className="space-y-3 pt-2">
                  {stats.options_stats.map((opt) => {
                    const isYes = opt.option_key === 'YES';
                    const isNo = opt.option_key === 'NO';

                    const barColor = isYes
                      ? 'bg-emerald-500'
                      : isNo
                      ? 'bg-rose-500'
                      : 'bg-indigo-500';

                    return (
                      <div key={opt.option_id} className="space-y-1">
                        <div className="flex items-center justify-between text-sm font-bold">
                          <span className="text-slate-200">{opt.option_label}</span>
                          <span className="text-slate-300 font-mono">
                            <span className="text-lg font-black text-white">{opt.vote_count}</span> 票 ({opt.count_percentage}%) ·{' '}
                            <span className="text-white font-bold">{opt.vote_weight}</span> 坪 ({opt.weight_percentage}%)
                          </span>
                        </div>
                        <div className="h-4 w-full overflow-hidden rounded-full bg-slate-800">
                          <div
                            className={`h-full ${barColor} rounded-full transition-all duration-700 ease-out`}
                            style={{ width: `${Math.min(opt.count_percentage, 100)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="rounded-2xl bg-slate-950 p-3 border border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-slate-400">目前決議狀態：</span>
                  <span className="font-bold text-indigo-300 text-sm">
                    {stats.decision_summary}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
