import React, { useState } from 'react';
import { X, Copy, Check, Share2, ExternalLink, ShieldCheck, MessageCircle } from 'lucide-react';

interface LineShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  communityName: string;
  meetingTitle: string;
  pinCode?: string;
}

export const LineShareModal: React.FC<LineShareModalProps> = ({
  isOpen,
  onClose,
  communityName,
  meetingTitle,
  pinCode,
}) => {
  const [copiedType, setCopiedType] = useState<'url' | 'full' | null>(null);

  if (!isOpen) return null;

  // 動態生成方案 A 的 LINE 專屬防跳出網址 (強制以 Safari / Chrome 開啟)
  const getLineExternalUrl = (): string => {
    if (typeof window === 'undefined') {
      return 'https://ericlai429.github.io/Resident-Voting/?openExternalBrowser=1';
    }
    const origin = window.location.origin;
    const pathname = window.location.pathname;
    return `${origin}${pathname}?openExternalBrowser=1`;
  };

  const lineExternalUrl = getLineExternalUrl();

  // 完整的 LINE 官方公告文案
  const fullAnnouncement = `📢【${communityName}】區分所有權人會議 線上手機投票\n` +
    `📌 會議案由：${meetingTitle}\n` +
    (pinCode ? `🔑 大會 PIN 碼：${pinCode}\n` : '') +
    `\n👇 請全體所有權人點擊下方「LINE 專用防跳出連結」進行線上報到與投票：\n` +
    `${lineExternalUrl}\n\n` +
    `💡【重要提示】：本專用連結會自動呼叫手機預設瀏覽器（iPhone Safari / Android Chrome）開啟，滑動瀏覽絕不跳出，投票體驗更流暢穩定！`;

  // 複製網址
  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(lineExternalUrl);
      setCopiedType('url');
      setTimeout(() => setCopiedType(null), 2500);
    } catch {
      alert('複製失敗，請手動複製下方網址。');
    }
  };

  // 複製完整公告文案
  const handleCopyFull = async () => {
    try {
      await navigator.clipboard.writeText(fullAnnouncement);
      setCopiedType('full');
      setTimeout(() => setCopiedType(null), 2500);
    } catch {
      alert('複製失敗，請手動複製。');
    }
  };

  // 手機原生分享 (支援直接傳送到 LINE 或其他通訊軟體)
  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `${communityName} 區權會線上投票`,
          text: fullAnnouncement,
          url: lineExternalUrl,
        });
      } catch (err) {
        console.log('Share dismissed or failed:', err);
      }
    } else {
      handleCopyFull();
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in no-print">
      <div className="w-full max-w-lg max-h-[88vh] overflow-y-auto my-auto rounded-3xl bg-white shadow-2xl border border-slate-200">
        {/* 頂部 Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md shadow-xs text-white">
              <MessageCircle size={24} className="fill-current text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black uppercase tracking-wider bg-emerald-500/50 px-2 py-0.5 rounded-full border border-white/20">
                  方案 A 專屬
                </span>
                <span className="text-xs font-bold text-emerald-100">
                  外部瀏覽器喚醒
                </span>
              </div>
              <h3 className="text-lg font-black leading-tight mt-0.5">
                LINE 專用防跳出分享按鈕
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* 內容區塊 */}
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* 原理提示卡片 */}
          <div className="rounded-2xl bg-emerald-50/80 border border-emerald-200 p-3.5 text-xs text-emerald-900 space-y-1.5">
            <div className="flex items-center gap-2 font-black text-emerald-800 text-sm">
              <ShieldCheck size={18} className="text-emerald-600 shrink-0" />
              <span>為什麼要使用方案 A 專屬連結？</span>
            </div>
            <p className="leading-relaxed">
              LINE 內建瀏覽器在滑到底部時，常因誤觸下拉關閉手勢而閃退。
              本連結在網址後方自動加入 <code className="bg-emerald-100 font-mono px-1 py-0.5 rounded font-black text-emerald-900">?openExternalBrowser=1</code>，
              點擊後 LINE 會<b>自動以手機預設瀏覽器（iPhone Safari / Android Chrome）</b>開啟，
              滑動 100% 絕不跳出！
            </p>
            <div className="text-[11px] font-bold text-emerald-700 pt-1 border-t border-emerald-200/60 flex items-center justify-between">
              <span>🛡️ 雙重保險：方案 B（CSS 底層防回彈鎖定）已同步生效中</span>
            </div>
          </div>

          {/* 專用網址預覽區 */}
          <div className="space-y-1.5">
            <label className="text-xs font-black text-slate-700 flex items-center justify-between">
              <span>LINE 專屬防跳出網址</span>
              <span className="text-[11px] text-emerald-600 font-bold">點擊即可複製</span>
            </label>
            <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-2.5">
              <input
                type="text"
                readOnly
                value={lineExternalUrl}
                className="w-full bg-transparent font-mono text-xs text-slate-800 select-all outline-none truncate font-bold"
              />
              <button
                onClick={handleCopyUrl}
                className={`shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                  copiedType === 'url'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-indigo-600 text-white hover:bg-indigo-700'
                }`}
              >
                {copiedType === 'url' ? (
                  <>
                    <Check size={14} />
                    <span>已複製</span>
                  </>
                ) : (
                  <>
                    <Copy size={14} />
                    <span>複製連結</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* LINE 宣傳文案預覽 */}
          <div className="space-y-1.5">
            <label className="text-xs font-black text-slate-700">
              群組廣播文案預覽（直接貼至管委會 LINE 群）
            </label>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700 font-mono whitespace-pre-wrap leading-relaxed max-h-36 overflow-y-auto">
              {fullAnnouncement}
            </div>
          </div>

          {/* 快捷操作按鈕組 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
            <button
              onClick={handleCopyFull}
              className={`flex items-center justify-center gap-2 py-3 px-4 rounded-2xl text-xs font-black transition-all shadow-xs ${
                copiedType === 'full'
                  ? 'bg-emerald-700 text-white'
                  : 'bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95'
              }`}
            >
              {copiedType === 'full' ? (
                <>
                  <Check size={16} />
                  <span>已複製完整廣播文案！</span>
                </>
              ) : (
                <>
                  <Copy size={16} />
                  <span>一鍵複製完整 LINE 文案</span>
                </>
              )}
            </button>

            <button
              onClick={handleNativeShare}
              className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl text-xs font-black bg-slate-900 text-white hover:bg-slate-800 active:scale-95 transition-all shadow-xs"
            >
              <Share2 size={16} />
              <span>手機原生分享至 LINE</span>
            </button>
          </div>
        </div>

        {/* 底部關閉 */}
        <div className="bg-slate-50 p-3.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span className="flex items-center gap-1 font-bold">
            <ExternalLink size={13} />
            LINE 點開自動呼叫 Safari / Chrome
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl border border-slate-200 bg-white font-black text-slate-700 hover:bg-slate-100"
          >
            關閉
          </button>
        </div>
      </div>
    </div>
  );
};
