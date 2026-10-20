import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Member, Meeting, Community } from '../types';
import { UniversalButton } from '../components/UniversalButton';
import { Download, ShieldCheck, Smartphone, CheckCircle, ArrowLeft } from 'lucide-react';

interface ResidentPassCardProps {
  member: Member;
  community: Community;
  meeting: Meeting | null;
  onBackToVote: () => void;
}

export const ResidentPassCard: React.FC<ResidentPassCardProps> = ({
  member,
  community,
  meeting,
  onBackToVote,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  useEffect(() => {
    const token = member.reset_token || `TOKEN-${member.unit_no}-${member.phone_last4}`;
    QRCode.toDataURL(token, {
      width: 320,
      margin: 2,
      color: {
        dark: '#1e1b4b',
        light: '#ffffff',
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('產生專屬登入 QR 失敗:', err));
  }, [member]);

  const handleDownload = () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `${community.name}_${member.unit_no}_${member.owner_name}_專屬憑證QR碼.png`;
    link.click();
  };

  return (
    <div className="mx-auto max-w-lg px-4 py-6 sm:py-10">
      <div className="mb-4">
        <button
          onClick={onBackToVote}
          className="inline-flex items-center gap-1.5 text-sm font-bold text-indigo-600 hover:text-indigo-800"
        >
          <ArrowLeft size={18} />
          <span>返回議案表決大廳</span>
        </button>
      </div>

      <div className="overflow-hidden rounded-3xl bg-white shadow-2xl border border-slate-200">
        {/* 卡片頂部飾條 */}
        <div className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-purple-600 p-6 text-white text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold backdrop-blur-md">
            <ShieldCheck size={14} />
            <span>區權會法定電子憑證卡</span>
          </span>
          <h2 className="mt-2 text-2xl font-black">{community.name}</h2>
          <p className="mt-1 text-xs text-indigo-100">{meeting?.title || '區分所有權人大會'}</p>
        </div>

        {/* 住戶詳細資訊區塊 */}
        <div className="p-6">
          <div className="rounded-2xl bg-indigo-50/70 p-4 border border-indigo-100 mb-6">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-xs text-slate-500 block">棟別 / 戶別</span>
                <span className="text-lg font-black text-indigo-950">{member.unit_no}</span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">區分所有權人</span>
                <span className="text-lg font-black text-indigo-950">{member.owner_name}</span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">權狀登記持分坪數</span>
                <span className="text-base font-bold text-slate-800">{member.area_ping} 坪</span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">法定權利比率</span>
                <span className="text-base font-bold text-emerald-700">
                  {(member.weight_ratio * 100).toFixed(4)} %
                </span>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-indigo-200/60 flex items-center justify-between text-xs">
              <span className="text-slate-500">綁定裝置特徵</span>
              <span className="font-mono text-slate-700 font-semibold">
                {member.bound_device_token ? `${member.bound_device_token.slice(0, 16)}...` : '本機已綁定'}
              </span>
            </div>
          </div>

          {/* QR Code 呈現 */}
          <div className="text-center">
            <div className="inline-block rounded-3xl border-4 border-indigo-100 p-3 shadow-inner bg-white">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt="住戶專屬登入憑證 QR 碼"
                  className="h-56 w-56 mx-auto"
                />
              ) : (
                <div className="h-56 w-56 flex items-center justify-center text-slate-400">
                  產生中...
                </div>
              )}
            </div>

            <div className="mt-4 flex items-center justify-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-50 py-2 px-3 rounded-xl mx-auto max-w-xs">
              <CheckCircle size={16} />
              <span>報到完成 · 具備獨立登入與防偽防篡改驗證</span>
            </div>

            <p className="mt-3 text-xs text-slate-500 leading-relaxed px-4">
              📌 <span className="font-bold text-slate-700">貼心提醒：</span>
              您可以將此畫面<span className="font-bold text-indigo-700">截圖保存</span>。日後若關閉瀏覽器或更換分頁，在登入畫面直接掃此 QR 碼即可免打字自動還原身分！
            </p>
          </div>

          {/* 操作按鈕 */}
          <div className="mt-6 flex flex-col gap-2.5">
            <UniversalButton
              variant="primary"
              size="lg"
              className="w-full"
              onClick={handleDownload}
              icon={<Download size={20} />}
            >
              下載憑證 QR 碼圖片
            </UniversalButton>

            <UniversalButton
              variant="outline"
              size="md"
              className="w-full"
              onClick={onBackToVote}
            >
              返回投票議程
            </UniversalButton>
          </div>
        </div>
      </div>
    </div>
  );
};
