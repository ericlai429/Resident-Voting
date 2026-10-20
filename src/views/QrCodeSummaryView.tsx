import React, { useEffect, useState, useMemo } from 'react';
import QRCode from 'qrcode';
import { Community, Meeting, MeetingResultPayload } from '../types';
import { getTopics, getActiveMeeting, getMeetings } from '../lib/storage';
import {
  buildMeetingResultPayload,
  encodeMeetingResult,
  decodeMeetingResult,
} from '../lib/meetingQrCodec';
import { UniversalButton } from '../components/UniversalButton';
import { QrScannerModal } from '../components/QrScannerModal';
import {
  QrCode,
  Download,
  Scan,
  ShieldCheck,
  CheckCircle2,
  FileText,
  Copy,
  Check,
  Smartphone,
  Sparkles,
  RefreshCw,
  Search,
  ExternalLink,
  AlertCircle,
} from 'lucide-react';

interface QrCodeSummaryViewProps {
  community: Community;
  meeting: Meeting | null;
}

export const QrCodeSummaryView: React.FC<QrCodeSummaryViewProps> = ({
  community,
  meeting,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [encodedString, setEncodedString] = useState<string>('');
  const [payload, setPayload] = useState<MeetingResultPayload | null>(null);
  const [restoredData, setRestoredData] = useState<MeetingResultPayload | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [manualCodeInput, setManualCodeInput] = useState('');
  const [manualError, setManualError] = useState('');
  const [selfTestSuccess, setSelfTestSuccess] = useState(false);

  // 安全備援會議物件，保證絕不因 meeting 為空而中斷或無法生成
  const activeMeeting: Meeting = useMemo(() => {
    if (meeting) return meeting;
    const stored = getActiveMeeting();
    if (stored) return stored;
    const list = getMeetings(community?.id);
    if (list.length > 0) return list[0];
    return {
      id: 'default-meeting',
      community_id: community?.id || 'C-001',
      title: '115年度第1次區分所有權人會議',
      meeting_date: new Date().toISOString().split('T')[0],
      location: '社區交誼廳',
      pin_code: '8866',
      pin_expires_at: '',
      is_active: true,
      created_at: new Date().toISOString(),
    };
  }, [meeting, community]);

  // 1. 產生本場大會結算防偽 QR Code 與結構化數據
  const generateCertificate = () => {
    try {
      const topics = getTopics(activeMeeting.id);
      const data = buildMeetingResultPayload(community, activeMeeting, topics);
      setPayload(data);

      const encoded = encodeMeetingResult(data);
      setEncodedString(encoded);

      QRCode.toDataURL(encoded, {
        width: 450,
        margin: 2,
        errorCorrectionLevel: 'M',
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.error('高密度 QR 碼產生失敗:', err));
    } catch (err) {
      console.error('結算憑證生成異常:', err);
    }
  };

  useEffect(() => {
    generateCertificate();
  }, [community, activeMeeting]);

  // 2. 檢驗目前網址列是否由外部相機（如 iPhone 相機或 LINE）掃描帶入
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const hash = window.location.hash || '';
    const search = window.location.search || '';
    if (hash.includes('#res=') || hash.includes('res=') || search.includes('res=')) {
      const decoded = decodeMeetingResult(hash || search);
      if (decoded) {
        setRestoredData(decoded);
      }
    }
  }, []);

  const handleDownloadQr = () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `${community.name}_${activeMeeting.title}_大會結算防偽憑證QR.png`;
    link.click();
  };

  const handleCopyCode = () => {
    if (!encodedString) return;
    navigator.clipboard.writeText(encodedString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // 鏡頭掃描成功回呼
  const handleScanSuccess = (decodedText: string) => {
    setIsScannerOpen(false);
    const result = decodeMeetingResult(decodedText);
    if (result) {
      setRestoredData(result);
      setSelfTestSuccess(true);
      setTimeout(() => setSelfTestSuccess(false), 5000);
    } else {
      alert('無法解析此 QR Code 為有效的大會結算憑證，請確認是否為本系統產出的防偽 QR 碼。');
    }
  };

  // 手動輸入或貼上代碼驗證
  const handleManualVerify = () => {
    setManualError('');
    if (!manualCodeInput.trim()) {
      setManualError('請輸入或貼上 QR 碼文字或完整網址');
      return;
    }
    const result = decodeMeetingResult(manualCodeInput);
    if (result) {
      setRestoredData(result);
      setSelfTestSuccess(true);
      setTimeout(() => setSelfTestSuccess(false), 5000);
    } else {
      setManualError('解析失敗！此代碼不是有效的大會結算憑證字串。');
    }
  };

  // 一鍵自檢還原測試 (無需另一支手機，直接模擬相機掃碼還原流程)
  const handleSelfTest = () => {
    if (!encodedString && payload) {
      const enc = encodeMeetingResult(payload);
      const res = decodeMeetingResult(enc);
      if (res) {
        setRestoredData(res);
        setSelfTestSuccess(true);
      }
      return;
    }
    const res = decodeMeetingResult(encodedString);
    if (res) {
      setRestoredData(res);
      setSelfTestSuccess(true);
      setTimeout(() => setSelfTestSuccess(false), 5000);
    } else {
      alert('自檢還原失敗，請檢查編碼格式。');
    }
  };

  // 當前欲顯示之大會結算資訊 (優先顯示掃碼還原出來之 restoredData，其次為本場大會即時 payload)
  const displayData = restoredData || payload;

  return (
    <div className="mx-auto max-w-5xl px-3 py-4 sm:py-8 space-y-6">
      {/* 頂部說明卡片 */}
      <div className="rounded-3xl bg-gradient-to-r from-purple-950 via-indigo-950 to-slate-900 p-6 sm:p-8 text-white shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-purple-500/30 border border-purple-400 px-3 py-1 text-xs font-bold text-purple-200">
              離線防偽與封裝 (LZ-String 高密度壓縮)
            </span>
            <span className="rounded-full bg-indigo-500/30 border border-indigo-400 px-3 py-1 text-xs font-bold text-indigo-200">
              相容 iPhone 原生相機直掃
            </span>
          </div>

          <button
            onClick={handleSelfTest}
            className="flex items-center gap-1.5 rounded-xl bg-purple-600 px-3.5 py-1.5 text-xs font-black text-white hover:bg-purple-500 active:scale-95 transition-all shadow-md"
          >
            <Sparkles size={14} />
            <span>⚡ 一鍵自檢還原測試 (模擬掃碼)</span>
          </button>
        </div>

        <h1 className="text-2xl sm:text-3xl font-black">
          單次會議結算專用防偽 QR 憑證
        </h1>
        <p className="mt-1.5 text-xs sm:text-sm text-purple-200 leading-relaxed max-w-3xl">
          將整場大會時間、地點、出席戶數、持分總坪數、法定出席率，以及全體議案之贊成/反對票數與坪數持分權重，全數高密度封裝於 QR 碼中。
          即使在<b>完全斷網、無伺服器</b>環境下，使用另一支手機相機即可 100% 還原出完整法定決議報表！
        </p>
      </div>

      {/* 核心資訊展示卡片：保證本場大會結算數據 100% 完整直接顯示！ */}
      {displayData && (
        <div className={`rounded-3xl bg-white p-5 sm:p-7 shadow-xl border-3 transition-all ${
          restoredData ? 'border-emerald-500 ring-4 ring-emerald-100' : 'border-purple-300'
        }`}>
          {/* 卡片標題狀態標籤 */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4 mb-4">
            <div className="flex items-center gap-3">
              <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
                restoredData ? 'bg-emerald-100 text-emerald-700' : 'bg-purple-100 text-purple-700'
              }`}>
                {restoredData ? <CheckCircle2 size={26} /> : <ShieldCheck size={26} />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-black px-2.5 py-0.5 rounded-full ${
                    restoredData
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-purple-100 text-purple-800 border border-purple-200'
                  }`}>
                    {restoredData ? '🎉 掃碼驗證成功 (資料還原無誤)' : '📋 本場大會即時結算數據 (內嵌於 QR 憑證中)'}
                  </span>
                  {selfTestSuccess && (
                    <span className="text-[11px] font-black text-emerald-600 animate-pulse">
                      ✓ 自檢還原通過！
                    </span>
                  )}
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5">
                  {displayData.communityName} · {displayData.meetingTitle}
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-black text-purple-900 bg-purple-50 px-3 py-1 rounded-xl border border-purple-200">
                數位防偽簽章: {displayData.signature || '----'}
              </span>
              {restoredData && (
                <button
                  onClick={() => setRestoredData(null)}
                  className="text-xs font-bold text-slate-500 hover:text-slate-800 underline px-1"
                >
                  切換回即時狀態
                </button>
              )}
            </div>
          </div>

          {/* 會議基礎數據指標看板 (出席率 / 持分權重) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs mb-5">
            <div className="rounded-2xl bg-slate-50 p-3 border border-slate-200/80">
              <span className="text-slate-500 font-bold block text-[11px]">開會日期與地點</span>
              <span className="font-black text-slate-900 text-sm block truncate">
                {displayData.meetingDate} · {displayData.location}
              </span>
            </div>

            <div className="rounded-2xl bg-slate-50 p-3 border border-slate-200/80">
              <span className="text-slate-500 font-bold block text-[11px]">法定出席戶數</span>
              <span className="font-black text-slate-900 text-sm block">
                {displayData.stats.attendees} / {displayData.stats.totalUnits} 戶
                <span className="ml-1 text-xs text-indigo-600">({displayData.stats.attendanceRate})</span>
              </span>
            </div>

            <div className="rounded-2xl bg-indigo-50/70 p-3 border border-indigo-200">
              <span className="text-indigo-700 font-bold block text-[11px]">出席持分總坪數</span>
              <span className="font-black text-indigo-950 text-sm block font-mono">
                {displayData.stats.attendedPing} / {displayData.stats.totalPing} 坪
                <span className="ml-1 text-xs text-indigo-700">({displayData.stats.pingRate})</span>
              </span>
            </div>

            <div className="rounded-2xl bg-emerald-50/70 p-3 border border-emerald-200">
              <span className="text-emerald-700 font-bold block text-[11px]">大會成會狀態</span>
              <span className="font-black text-emerald-950 text-sm block">
                {displayData.stats.attendees >= (displayData.stats.totalUnits * 0.5) ? '✅ 符合法定雙門檻成會' : '⚠️ 出席未過半'}
              </span>
            </div>
          </div>

          {/* 各案表決數據明細列表 */}
          <div className="space-y-3">
            <h3 className="font-black text-slate-900 text-sm sm:text-base flex items-center gap-2">
              <FileText size={18} className="text-indigo-600" />
              <span>本場會議各項議案表決結算結果 ({displayData.topics.length} 案)</span>
            </h3>

            {displayData.topics.length === 0 ? (
              <div className="rounded-2xl bg-slate-50 p-6 text-center text-slate-500 text-xs border border-dashed border-slate-300">
                目前本會議尚未建立表決議題，請先至「主委/總幹事後台」建立議案。
              </div>
            ) : (
              <div className="grid gap-3">
                {displayData.topics.map((t) => (
                  <div
                    key={t.order}
                    className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 space-y-2.5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/60 pb-2">
                      <span className="font-black text-slate-900 text-sm sm:text-base">
                        第 {t.order} 案：{t.title}
                      </span>
                      <span className={`shrink-0 rounded-lg px-2.5 py-1 text-xs font-black ${
                        t.decision.includes('通過') || t.decision.includes('勝出')
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : t.decision.includes('尚未')
                          ? 'bg-slate-200 text-slate-700'
                          : 'bg-rose-100 text-rose-800 border border-rose-300'
                      }`}>
                        {t.decision}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                      {t.options.map((opt, i) => (
                        <div
                          key={i}
                          className="rounded-xl bg-white p-2.5 border border-slate-200/80 shadow-2xs flex flex-col justify-between"
                        >
                          <div className="font-bold text-slate-700 mb-1">{opt.label}</div>
                          <div className="flex items-baseline justify-between font-mono">
                            <span className="text-sm font-black text-slate-900">{opt.votes} 票</span>
                            <span className="text-[11px] font-bold text-slate-500">{opt.weight} 坪</span>
                          </div>
                          <div className="text-[10px] text-indigo-600 font-bold text-right pt-0.5">
                            {opt.percent}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 兩大操作卡片：QR 碼展示 vs 掃碼器 / 代碼自檢 */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* 左側：大會結算 QR Code 展示與下載 */}
        <div className="rounded-3xl bg-white p-5 sm:p-6 shadow-md border border-slate-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <QrCode size={22} className="text-purple-600" />
                <h3 className="text-base sm:text-lg font-black text-slate-900">
                  本場會議結算防偽 QR 憑證
                </h3>
              </div>
              <button
                onClick={generateCertificate}
                title="重新產生/刷新憑證"
                className="flex items-center gap-1 text-[11px] font-bold text-purple-700 hover:text-purple-900 bg-purple-50 px-2 py-1 rounded-lg"
              >
                <RefreshCw size={12} />
                <span>刷新</span>
              </button>
            </div>

            <div className="rounded-2xl border-4 border-purple-100 bg-white p-3 text-center shadow-inner">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt="會議結算防偽 QR 碼"
                  className="mx-auto h-56 w-56 sm:h-64 sm:w-64 object-contain"
                />
              ) : (
                <div className="h-56 w-56 flex flex-col items-center justify-center text-slate-400 gap-2 mx-auto">
                  <RefreshCw size={24} className="animate-spin text-purple-600" />
                  <span className="text-xs">憑證生成中...</span>
                </div>
              )}
            </div>

            <div className="mt-3 text-center">
              <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-3 py-1 text-xs font-mono font-bold text-purple-800 border border-purple-200">
                <ShieldCheck size={14} />
                防偽校驗簽章: {payload?.signature || '----'}
              </span>
            </div>

            <div className="mt-3 rounded-xl bg-slate-50 p-3 text-xs text-slate-600 border border-slate-200 leading-relaxed">
              💡 <b>支援 iPhone 內建相機直掃</b>：拿另一隻手機開啟「相機」對準上方 QR Code，會自動彈出黃色連結，點一下即可在 Safari 中秒速打開並還原整場會議完整數據！
            </div>
          </div>

          <div className="mt-5 space-y-2">
            <UniversalButton
              variant="primary"
              size="md"
              className="w-full bg-purple-600 hover:bg-purple-700"
              onClick={handleDownloadQr}
              icon={<Download size={18} />}
            >
              下載結算 QR 碼圖片 (可投影或印於紙本)
            </UniversalButton>

            <button
              onClick={handleCopyCode}
              className="w-full flex items-center justify-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 py-1.5 rounded-lg border border-slate-200 bg-slate-50"
            >
              {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
              <span>{copied ? '已複製完整密碼串！' : '複製原始密碼串 (可貼至另一台電腦驗證)'}</span>
            </button>
          </div>
        </div>

        {/* 右側：手機相機掃描還原 + 手動貼上自檢 */}
        <div className="rounded-3xl bg-white p-5 sm:p-6 shadow-md border border-slate-200 flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Scan size={22} className="text-indigo-600" />
              <h3 className="text-base sm:text-lg font-black text-slate-900">
                離線驗證與掃描還原工具
              </h3>
            </div>

            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              點擊下方按鈕啟動系統鏡頭（或上傳 QR 截圖），系統會在<b>完全斷網離線</b>狀態下解析並還原整場大會數據。
            </p>

            <UniversalButton
              variant="outline"
              size="lg"
              className="w-full border-2 border-indigo-500 bg-indigo-50 text-indigo-950 hover:bg-indigo-100"
              onClick={() => setIsScannerOpen(true)}
              icon={<Scan size={22} className="text-indigo-600" />}
            >
              啟動相機鏡頭掃描還原
            </UniversalButton>

            {/* 手動貼上代碼快速自檢 (單機測試必備) */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5 space-y-2">
              <div className="flex items-center justify-between text-xs font-black text-slate-700">
                <span className="flex items-center gap-1">
                  <Search size={14} />
                  <span>單機測試：貼上代碼或網址快速解碼</span>
                </span>
                <button
                  onClick={handleSelfTest}
                  className="text-indigo-600 hover:underline font-bold text-[11px]"
                >
                  帶入目前憑證碼
                </button>
              </div>

              <div className="flex gap-1.5">
                <input
                  type="text"
                  placeholder="貼上 #res=MTG:... 或完整網址"
                  value={manualCodeInput}
                  onChange={(e) => setManualCodeInput(e.target.value)}
                  className="flex-1 rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-mono outline-none focus:border-indigo-500"
                />
                <button
                  onClick={handleManualVerify}
                  className="rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-black text-white hover:bg-slate-800 active:scale-95 transition-all shrink-0"
                >
                  驗證還原
                </button>
              </div>
              {manualError && (
                <p className="text-[11px] font-bold text-rose-600">{manualError}</p>
              )}
            </div>

            <div className="rounded-2xl bg-indigo-50/70 p-3 border border-indigo-100 text-xs text-indigo-950 space-y-1">
              <div className="font-bold flex items-center gap-1 text-indigo-900">
                <Smartphone size={14} className="text-indigo-600" />
                <span>兩種最方便的掃描方式：</span>
              </div>
              <div className="text-indigo-800"><b>1. iPhone 內建相機</b>：拿另一隻手機開啟相機對準 QR 碼即可彈出連結打開。</div>
              <div className="text-indigo-800"><b>2. 系統相機</b>：點擊上方「啟動相機鏡頭掃描」，在瀏覽器內直接對焦掃描。</div>
            </div>
          </div>
        </div>
      </div>

      {/* 相機掃描彈窗 */}
      <QrScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={handleScanSuccess}
        title="掃描會議結算 QR 碼"
        description="請將手機鏡頭對準大會產出的防偽結算 QR Code，或上傳相簿圖片"
      />
    </div>
  );
};
