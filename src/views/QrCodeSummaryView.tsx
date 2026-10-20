import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Community, Meeting, MeetingResultPayload } from '../types';
import { getTopics } from '../lib/storage';
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

  // 1. 產生 QR Code
  useEffect(() => {
    if (!meeting) return;
    const topics = getTopics(meeting.id);
    const data = buildMeetingResultPayload(community, meeting, topics);
    setPayload(data);

    const encoded = encodeMeetingResult(data);
    setEncodedString(encoded);

    QRCode.toDataURL(encoded, {
      width: 400,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('高密度 QR 碼產生失敗:', err));
  }, [community, meeting]);

  // 2. 檢驗目前網址列是否由外部相機（如 iPhone 相機或 LINE）掃描帶入
  useEffect(() => {
    const hash = window.location.hash;
    const search = window.location.search;
    if (hash.includes('#res=') || search.includes('res=')) {
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
    link.download = `${community.name}_${meeting?.title}_大會結算憑證QR.png`;
    link.click();
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(encodedString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleScanSuccess = (decodedText: string) => {
    setIsScannerOpen(false);
    const result = decodeMeetingResult(decodedText);
    if (result) {
      setRestoredData(result);
    } else {
      alert('無法解析此 QR Code 為有效的大會結算憑證，請確認是否為開會系統產出的憑證碼。');
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-3 py-4 sm:py-8 space-y-6">
      {/* 頂部說明卡片 */}
      <div className="rounded-3xl bg-purple-900 p-5 sm:p-7 text-white shadow-xl">
        <div className="flex items-center gap-2 mb-2">
          <span className="rounded-full bg-purple-500/30 border border-purple-400 px-3 py-1 text-xs font-bold text-purple-200">
            離線防偽與封裝 (LZ-String)
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black">
          單次會議結算專用防偽 QR 憑證
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-purple-200 leading-relaxed max-w-2xl">
          將整場大會時間、地點、出席率、所有議案之贊成/反對票數與坪數持分權重，全數封裝於 QR 碼中。
          支援 <b>iPhone 內建相機直掃</b> 與 <b>系統內建鏡頭掃描</b>！
        </p>
      </div>

      {/* 掃描成功後還原出來的結構化報表 (置頂醒目顯示) */}
      {restoredData && (
        <div className="rounded-3xl bg-white p-5 sm:p-7 shadow-2xl border-4 border-emerald-400 space-y-4 animate-fade-in">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                <CheckCircle2 size={24} />
              </div>
              <div>
                <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
                  🎉 會議結算數據還原成功
                </span>
                <h3 className="text-lg sm:text-xl font-black text-slate-900">
                  {restoredData.communityName} · {restoredData.meetingTitle}
                </h3>
              </div>
            </div>

            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-mono font-bold text-slate-600">
              簽章: {restoredData.signature}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 text-xs">
            <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-100">
              <span className="text-slate-400 block font-semibold">開會日期</span>
              <span className="font-bold text-slate-800 text-sm">{restoredData.meetingDate}</span>
            </div>
            <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-100">
              <span className="text-slate-400 block font-semibold">開會地點</span>
              <span className="font-bold text-slate-800 text-sm truncate block">{restoredData.location}</span>
            </div>
            <div className="rounded-xl bg-indigo-50/70 p-2.5 border border-indigo-100">
              <span className="text-indigo-600 block font-semibold">出席戶數</span>
              <span className="font-bold text-indigo-950 text-sm">
                {restoredData.stats.attendees} / {restoredData.stats.totalUnits} 戶 ({restoredData.stats.attendanceRate})
              </span>
            </div>
            <div className="rounded-xl bg-indigo-50/70 p-2.5 border border-indigo-100">
              <span className="text-indigo-600 block font-semibold">出席持分坪數</span>
              <span className="font-bold text-indigo-950 text-sm">
                {restoredData.stats.attendedPing} / {restoredData.stats.totalPing} 坪 ({restoredData.stats.pingRate})
              </span>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <h4 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-1.5">
              <FileText size={18} className="text-indigo-600" />
              <span>還原各項表決議案結果</span>
            </h4>

            <div className="grid gap-2.5">
              {restoredData.topics.map((t) => (
                <div key={t.order} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-3.5 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-black text-slate-900 text-sm">
                      第 {t.order} 案：{t.title}
                    </span>
                    <span className="shrink-0 rounded-md bg-emerald-100 text-emerald-800 px-2 py-0.5 text-xs font-black">
                      {t.decision}
                    </span>
                  </div>

                  <div className="space-y-1 text-xs">
                    {t.options.map((opt, i) => (
                      <div key={i} className="flex justify-between border-b border-slate-200/50 py-1">
                        <span className="text-slate-600 font-semibold">{opt.label}:</span>
                        <span className="font-bold text-slate-900">
                          {opt.votes} 票 · {opt.weight} 坪 ({opt.percent})
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 兩大功能區塊：QR 碼展示 vs 掃碼器 */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* 左側：大會結算 QR Code 展示與下載 */}
        <div className="rounded-3xl bg-white p-5 sm:p-6 shadow-md border border-slate-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <QrCode size={22} className="text-purple-600" />
              <h3 className="text-base sm:text-lg font-black text-slate-900">
                本場會議結算防偽 QR 憑證
              </h3>
            </div>

            <div className="rounded-2xl border-4 border-purple-100 bg-white p-2.5 text-center shadow-inner">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt="會議結算防偽 QR 碼"
                  className="mx-auto h-56 w-56 sm:h-64 sm:w-64"
                />
              ) : (
                <div className="h-56 w-56 flex items-center justify-center text-slate-400">
                  產生中...
                </div>
              )}
            </div>

            <div className="mt-2.5 text-center">
              <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2.5 py-0.5 text-[11px] font-bold text-purple-700">
                <ShieldCheck size={13} />
                數位簽章: {payload?.signature || '----'}
              </span>
            </div>

            <div className="mt-3 rounded-xl bg-slate-50 p-2.5 text-[11px] text-slate-600 border border-slate-200">
              💡 <b>支援 iPhone 內建相機</b>：拿另一隻手機開啟「相機」對準上方 QR Code，會自動彈出黃色連結，點一下即可在 Safari 中秒速打開並還原！
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-2">
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
              className="flex items-center justify-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-800 py-1"
            >
              {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
              <span>{copied ? '已複製完整密碼串' : '複製原始密碼串'}</span>
            </button>
          </div>
        </div>

        {/* 右側：手機掃描還原工具 */}
        <div className="rounded-3xl bg-white p-5 sm:p-6 shadow-md border border-slate-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Scan size={22} className="text-indigo-600" />
              <h3 className="text-base sm:text-lg font-black text-slate-900">
                方式二：使用系統內建鏡頭掃描
              </h3>
            </div>

            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              點擊下方按鈕啟動系統鏡頭（或直接上傳 QR 截圖），系統會在離線狀態下解析並還原整場會議數據。
            </p>

            <div className="my-4 rounded-2xl bg-indigo-50/70 p-3.5 border border-indigo-100 text-xs text-indigo-950 space-y-1.5">
              <div className="font-bold flex items-center gap-1">
                <Smartphone size={14} className="text-indigo-600" />
                <span>兩種最方便的掃描方式：</span>
              </div>
              <div><b>1. iPhone 內建相機</b>：直接用相機對準 QR 碼，點擊螢幕出現的黃色連結。</div>
              <div><b>2. 系統內建鏡頭</b>：點擊下方按鈕，在瀏覽器內直接掃描。</div>
            </div>
          </div>

          <UniversalButton
            variant="outline"
            size="lg"
            className="w-full border-2 border-indigo-500 bg-indigo-50 text-indigo-950 hover:bg-indigo-100"
            onClick={() => setIsScannerOpen(true)}
            icon={<Scan size={22} className="text-indigo-600" />}
          >
            啟動相機掃描還原會議紀錄
          </UniversalButton>
        </div>
      </div>

      {/* 掃描彈窗 */}
      <QrScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={handleScanSuccess}
        title="掃描會議結算 QR 碼"
        description="請將手機鏡頭對準大會產出的防偽結算 QR Code"
      />
    </div>
  );
};
