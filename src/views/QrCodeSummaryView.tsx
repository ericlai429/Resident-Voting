import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Community, Meeting, Topic, MeetingResultPayload } from '../types';
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

  useEffect(() => {
    if (!meeting) return;
    const topics = getTopics(meeting.id);
    const data = buildMeetingResultPayload(community, meeting, topics);
    setPayload(data);

    const encoded = encodeMeetingResult(data);
    setEncodedString(encoded);

    QRCode.toDataURL(encoded, {
      width: 450,
      margin: 2,
      errorCorrectionLevel: 'L', // 容納最高字元數
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('高密度 QR 碼產生失敗:', err));
  }, [community, meeting]);

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
    <div className="mx-auto max-w-4xl px-4 py-6 sm:py-10 space-y-8">
      {/* 頂部說明卡片 */}
      <div className="rounded-3xl bg-purple-900 p-6 sm:p-8 text-white shadow-xl">
        <div className="flex items-center gap-2 mb-2">
          <span className="rounded-full bg-purple-500/30 border border-purple-400 px-3 py-1 text-xs font-bold text-purple-200">
            離線防偽與輕量化封裝 (LZ-String)
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black">
          單次會議結算專用高密度 QR Code
        </h1>
        <p className="mt-1.5 text-sm text-purple-200 leading-relaxed max-w-2xl">
          將整場區權大會的時間、地點、出席率、所有議案之贊成/反對票數與坪數持分權重，壓縮並封裝於單一 QR 碼中。
          任何人只要以手機掃描，<b>毋須連網連線</b>即可 100% 離線還原完整大會決議！
        </p>
      </div>

      {/* 兩大功能區塊：生成展示 vs 掃碼還原 */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* 左側：大會結算 QR Code 展示與下載 */}
        <div className="rounded-3xl bg-white p-6 shadow-md border border-slate-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <QrCode size={22} className="text-purple-600" />
              <h3 className="text-lg font-black text-slate-900">
                本場會議結算防偽 QR 憑證
              </h3>
            </div>

            <div className="rounded-2xl border-4 border-purple-100 bg-white p-3 text-center shadow-inner">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt="會議結算高密度 QR 碼"
                  className="mx-auto h-64 w-64"
                />
              ) : (
                <div className="h-64 w-64 flex items-center justify-center text-slate-400">
                  壓縮產生中...
                </div>
              )}
            </div>

            <div className="mt-3 text-center">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-50 px-3 py-1 text-xs font-bold text-purple-700">
                <ShieldCheck size={14} />
                數位簽章校驗指紋: {payload?.signature || '----'}
              </span>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-2">
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
              className="flex items-center justify-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 py-1.5"
            >
              {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
              <span>{copied ? '已複製壓縮碼' : '複製原始壓縮密碼串'}</span>
            </button>
          </div>
        </div>

        {/* 右側：手機掃描還原工具 */}
        <div className="rounded-3xl bg-white p-6 shadow-md border border-slate-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Scan size={22} className="text-indigo-600" />
              <h3 className="text-lg font-black text-slate-900">
                手機掃描 QR 碼即刻還原大會紀錄
              </h3>
            </div>

            <p className="text-sm text-slate-600 leading-relaxed">
              點擊下方按鈕啟動手機鏡頭，對準剛才下載或投影在大螢幕/紙本上的結算 QR 碼，系統將立即在離線狀態下還原會議時間、地點與所有表決議案結果。
            </p>

            <div className="my-6 rounded-2xl bg-slate-50 p-4 border border-slate-200 text-xs text-slate-500 space-y-1.5">
              <div className="font-bold text-slate-700">📌 適用情境：</div>
              <div>• 住戶開完會後拍照/截圖 QR 碼留底存查</div>
              <div>• 主管機關或稽核委員驗證會議結果防偽</div>
              <div>• 地下室或山區網路中斷時離線查驗</div>
            </div>
          </div>

          <UniversalButton
            variant="outline"
            size="lg"
            className="w-full border-2 border-indigo-400 bg-indigo-50 text-indigo-900 hover:bg-indigo-100"
            onClick={() => setIsScannerOpen(true)}
            icon={<Scan size={22} className="text-indigo-600" />}
          >
            啟動相機掃描還原會議紀錄
          </UniversalButton>
        </div>
      </div>

      {/* 掃描成功後還原出來的結構化報表 */}
      {restoredData && (
        <div className="rounded-3xl bg-white p-6 sm:p-8 shadow-xl border-2 border-emerald-400 space-y-5 animate-fade-in">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                <CheckCircle2 size={24} />
              </div>
              <div>
                <span className="text-xs font-bold text-emerald-700">QR 碼離線解析還原成功</span>
                <h3 className="text-xl font-black text-slate-900">
                  {restoredData.communityName} · {restoredData.meetingTitle}
                </h3>
              </div>
            </div>

            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-mono font-bold text-slate-600">
              簽章: {restoredData.signature}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-xs">
            <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-100">
              <span className="text-slate-400 block">開會日期</span>
              <span className="font-bold text-slate-800 text-sm">{restoredData.meetingDate}</span>
            </div>
            <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-100">
              <span className="text-slate-400 block">開會地點</span>
              <span className="font-bold text-slate-800 text-sm">{restoredData.location}</span>
            </div>
            <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-100">
              <span className="text-slate-400 block">出席戶數</span>
              <span className="font-bold text-indigo-700 text-sm">
                {restoredData.stats.attendees} / {restoredData.stats.totalUnits} 戶 ({restoredData.stats.attendanceRate})
              </span>
            </div>
            <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-100">
              <span className="text-slate-400 block">出席持分坪數</span>
              <span className="font-bold text-indigo-700 text-sm">
                {restoredData.stats.attendedPing} / {restoredData.stats.totalPing} 坪 ({restoredData.stats.pingRate})
              </span>
            </div>
          </div>

          <div className="space-y-4 pt-2">
            <h4 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <FileText size={18} className="text-indigo-600" />
              <span>還原各議案表決決議</span>
            </h4>

            <div className="grid gap-3">
              {restoredData.topics.map((t) => (
                <div key={t.order} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-slate-900">
                      第 {t.order} 案：{t.title}
                    </span>
                    <span className="rounded-md bg-emerald-100 text-emerald-800 px-2 py-0.5 text-xs font-black">
                      {t.decision}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {t.options.map((opt, i) => (
                      <div key={i} className="flex justify-between border-b border-slate-200/60 py-1">
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

      {/* 掃描彈窗 */}
      <QrScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={handleScanSuccess}
        title="掃描會議結算 QR 碼"
        description="請將手機鏡頭對準大會產出的高密度結算 QR Code"
      />
    </div>
  );
};
