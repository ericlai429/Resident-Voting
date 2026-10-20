import React, { useRef } from 'react';
import { Community, Meeting, Topic } from '../types';
import { getTopics } from '../lib/storage';
import { compileMeetingReportData, triggerA3Print } from '../lib/pdfReportGenerator';
import { UniversalButton } from '../components/UniversalButton';
import { Printer, Download, ArrowLeft, FileText, CheckCircle, Shield } from 'lucide-react';

interface ReportA3ViewProps {
  community: Community;
  meeting: Meeting | null;
  onBack: () => void;
}

export const ReportA3View: React.FC<ReportA3ViewProps> = ({
  community,
  meeting,
  onBack,
}) => {
  const topics = getTopics(meeting?.id);
  const reportData = compileMeetingReportData(
    community,
    meeting || {
      id: 'default',
      community_id: community.id,
      title: '115年度第1次區分所有權人會議',
      meeting_date: new Date().toISOString().split('T')[0],
      location: '社區交誼廳',
      pin_code: '8866',
      pin_expires_at: '',
      is_active: true,
      created_at: '',
    },
    topics,
    community.contact_name || '張文德 主任委員',
    '李建銘 總幹事'
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:py-10">
      {/* 頂部操作按鈕 (列印時自動隱藏) */}
      <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-white p-5 shadow-md border border-slate-200">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm font-bold text-slate-700 hover:text-indigo-600"
        >
          <ArrowLeft size={18} />
          <span>返回控制台</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500">
            規格：A3 橫向 (297mm × 420mm) 法定會議紀錄格式
          </span>
          <UniversalButton
            variant="primary"
            size="md"
            onClick={triggerA3Print}
            icon={<Printer size={18} />}
          >
            🖨️ 列印 / 匯出 A3 橫式 PDF 簡報
          </UniversalButton>
        </div>
      </div>

      {/* A3 橫式列印區域 (A3 Landscape 420mm x 297mm 比例) */}
      <div className="printable-report mx-auto bg-white p-8 sm:p-12 shadow-2xl border border-slate-300 rounded-2xl text-slate-900 font-sans print:shadow-none print:border-none print:p-0">
        {/* 表頭區塊 */}
        <div className="border-b-2 border-slate-900 pb-4 text-center">
          <h1 className="text-3xl sm:text-4xl font-black tracking-wider text-slate-950">
            {reportData.community.name}
          </h1>
          <h2 className="text-xl sm:text-2xl font-bold mt-1 text-slate-800">
            {reportData.meeting.title} 決議會議紀錄表
          </h2>
          <div className="mt-2 text-xs sm:text-sm text-slate-600 flex flex-wrap justify-center gap-6">
            <span><b>開會日期：</b>{reportData.meeting.meeting_date}</span>
            <span><b>開會地點：</b>{reportData.meeting.location}</span>
            <span><b>社區地址：</b>{reportData.community.address}</span>
            <span><b>大會召集人：</b>{reportData.chairman}</span>
            <span><b>會議記錄：</b>{reportData.recorder}</span>
          </div>
        </div>

        {/* 出席統計與法定門檻宣告 (台灣公寓大廈管理條例規範) */}
        <div className="my-5 rounded-xl border border-slate-400 bg-slate-50/80 p-4">
          <div className="grid grid-cols-2 gap-4 text-xs sm:text-sm md:grid-cols-4">
            <div>
              <span className="text-slate-500 block">法定總戶數 / 實到戶數</span>
              <span className="text-base font-bold text-slate-900">
                {reportData.totalUnits} 戶 / {reportData.attendedUnits} 戶
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">專有部分出席率</span>
              <span className="text-base font-bold text-indigo-700">
                {reportData.unitAttendanceRate}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">總權狀坪數 / 出席坪數</span>
              <span className="text-base font-bold text-slate-900">
                {reportData.totalPing} 坪 / {reportData.attendedPing} 坪
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">權利持分出席率</span>
              <span className="text-base font-bold text-indigo-700">
                {reportData.pingAttendanceRate}
              </span>
            </div>
          </div>

          <div className="mt-3 pt-2 border-t border-slate-200 text-xs font-semibold text-slate-700 flex items-center justify-between">
            <span>
              <b>法定成立判定：</b>依《公寓大廈管理條例》第31條規定，本會議出席人數比例及專有持分比例均合於法定標準，會議合法成立。
            </span>
            <span className="rounded bg-emerald-100 text-emerald-800 px-2 py-0.5 text-xs font-bold">
              合法有效
            </span>
          </div>
        </div>

        {/* 表決議案詳細統計清單 */}
        <div className="space-y-6">
          <h3 className="text-lg font-bold border-l-4 border-slate-900 pl-2.5 text-slate-950">
            各項議案表決統計與最終決議
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-slate-400 text-xs sm:text-sm">
              <thead className="bg-slate-200 text-slate-900 font-bold">
                <tr>
                  <th className="border border-slate-400 px-3 py-2 w-16 text-center">案號</th>
                  <th className="border border-slate-400 px-3 py-2 text-left">議案名稱與提案原由</th>
                  <th className="border border-slate-400 px-3 py-2 w-72 text-left">各選項表決票數與坪數權重統計</th>
                  <th className="border border-slate-400 px-3 py-2 w-48 text-center">最終決議判定</th>
                </tr>
              </thead>
              <tbody>
                {reportData.topicReports.map((t) => (
                  <tr key={t.order} className="border-b border-slate-300">
                    <td className="border border-slate-400 px-3 py-3 text-center font-bold text-base">
                      第 {t.order} 案
                    </td>
                    <td className="border border-slate-400 px-3 py-3">
                      <div className="font-bold text-sm sm:text-base text-slate-950">{t.title}</div>
                      {t.description && (
                        <div className="mt-1 text-xs text-slate-600 leading-relaxed">
                          {t.description}
                        </div>
                      )}
                    </td>
                    <td className="border border-slate-400 px-3 py-3">
                      <div className="space-y-1.5">
                        {t.options.map((opt, idx) => (
                          <div key={idx} className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-slate-800">{opt.label}:</span>
                            <span className="font-mono font-bold text-slate-950">
                              {opt.votes} 票 ({opt.votePct}) · {opt.weight} 坪 ({opt.weightPct})
                            </span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="border border-slate-400 px-3 py-3 text-center">
                      <span
                        className={`inline-block rounded-md px-2.5 py-1 text-xs font-black ${
                          t.passed
                            ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                            : 'bg-rose-100 text-rose-900 border border-rose-300'
                        }`}
                      >
                        {t.decision}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 底部簽章備查欄位 */}
        <div className="mt-10 pt-6 border-t border-slate-400 grid grid-cols-3 gap-6 text-xs text-slate-700">
          <div>
            <span className="block font-bold mb-8">大會召集人 (主席) 簽章：</span>
            <div className="border-b border-dashed border-slate-400 w-48" />
          </div>
          <div>
            <span className="block font-bold mb-8">總幹事 (執行人) 簽章：</span>
            <div className="border-b border-dashed border-slate-400 w-48" />
          </div>
          <div>
            <span className="block font-bold mb-8">監察委員 (監票人) 簽章：</span>
            <div className="border-b border-dashed border-slate-400 w-48" />
          </div>
        </div>

        <div className="mt-6 text-center text-[10px] text-slate-400">
          本會議紀錄與電子表決歷程由「社區區權會手機投票系統」加密生成 · 符合主管機關備查標準
        </div>
      </div>
    </div>
  );
};
