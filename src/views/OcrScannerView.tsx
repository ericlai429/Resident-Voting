import React, { useState } from 'react';
import { createWorker } from 'tesseract.js';
import { parseMeetingOcrText } from '../lib/meetingOcrParser';
import { OcrMeetingRecord } from '../types';
import { UniversalButton } from '../components/UniversalButton';
import {
  ScanText,
  Camera,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  RefreshCw,
} from 'lucide-react';

export const OcrScannerView: React.FC = () => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressStatus, setProgressStatus] = useState<string>('');
  const [parsedRecord, setParsedRecord] = useState<OcrMeetingRecord | null>(null);
  const [rawText, setRawText] = useState<string>('');

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setSelectedImage(event.target?.result as string);
      setParsedRecord(null);
      setRawText('');
    };
    reader.readAsDataURL(file);
  };

  const handleRunOcr = async () => {
    if (!selectedImage) return;

    setIsProcessing(true);
    setProgressStatus('正在初始化 OCR 辨識引擎...');

    try {
      const worker = await createWorker('chi_tra+eng', 1, {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            setProgressStatus(`文字識別中... ${Math.round(m.progress * 100)}%`);
          } else {
            setProgressStatus(m.status);
          }
        },
      });

      const ret = await worker.recognize(selectedImage);
      await worker.terminate();

      const text = ret.data.text;
      setRawText(text);

      const parsed = parseMeetingOcrText(text);
      setParsedRecord(parsed);
    } catch (err: unknown) {
      console.error('OCR 辨識出錯:', err);
      alert('OCR 引擎載入或影像辨識中斷，請確認照片解析度與光源清晰度。');
    } finally {
      setIsProcessing(false);
      setProgressStatus('');
    }
  };

  // 快捷載入示範紙本文字進行測試
  const handleLoadSampleText = () => {
    const sampleText = `
淡水清淞社區 115年度第1次區分所有權人常態大會
開會日期：2026-10-20
開會地點：淡金路21號 清淞社區 B1 多功能休閒交誼廳

第 1 案：清淞社區全棟溫泉儲熱供水系統管線定期汰換與保養工程發包案
贊成：325 票 (78.2%)
反對：42 票 (10.5%)
棄權：15 票
決議：通過 (符合法定雙門檻)

第 2 案：116年度飯店式物業管理維護與秘書會館服務公司遴選案
方案A：180 票
方案B：110 票
方案C：60 票
決議：由新光國際物業管理得標

第 3 案：B1~B5 地下停車場電動車（EV）EMS 智慧充電樁線槽規劃與管理規範案
贊成：298 票 (72.6%)
反對：65 票 (18.1%)
決議：通過
    `.trim();

    setRawText(sampleText);
    const parsed = parseMeetingOcrText(sampleText);
    setParsedRecord(parsed);
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:py-10 space-y-8">
      {/* 頂部功能介紹 */}
      <div className="rounded-3xl bg-emerald-900 p-6 sm:p-8 text-white shadow-xl">
        <div className="flex items-center gap-2 mb-2">
          <span className="rounded-full bg-emerald-500/30 border border-emerald-400 px-3 py-1 text-xs font-bold text-emerald-200">
            純前端相機 OCR 光學辨識 (Tesseract.js)
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black">
          手機拍照 OCR 智慧辨識 · 還原紙本會議紀錄
        </h1>
        <p className="mt-1.5 text-sm text-emerald-200 leading-relaxed max-w-2xl">
          支援直接拍攝現場印出之 A3/A4 紙本決議簡報或會議大螢幕。系統透過光學字元辨識與正則表達式，自動擷取時間、地點、各議案之同意票、反對票與最終表決判定。
        </p>
      </div>

      {/* 上傳與操作區 */}
      <div className="rounded-3xl bg-white p-6 shadow-md border border-slate-200 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <Camera size={22} className="text-emerald-600" />
            <span>拍攝或選取會議紙本簡報</span>
          </h3>

          <button
            onClick={handleLoadSampleText}
            className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100"
          >
            <Sparkles size={14} className="text-emerald-600" />
            <span>直接載入清淞社區示範紙本文字測試</span>
          </button>
        </div>

        {/* 圖片選取區域 */}
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-6 text-center">
          {selectedImage ? (
            <div className="space-y-4">
              <img
                src={selectedImage}
                alt="拍攝之紙本會議紀錄"
                className="max-h-72 rounded-xl object-contain shadow-md mx-auto border border-slate-200"
              />
              <div className="flex justify-center gap-2">
                <UniversalButton
                  variant="success"
                  size="md"
                  disabled={isProcessing}
                  onClick={handleRunOcr}
                  icon={<ScanText size={18} className={isProcessing ? 'animate-spin' : ''} />}
                >
                  {isProcessing ? progressStatus : '開始 OCR 光學文字解析'}
                </UniversalButton>

                <label className="flex cursor-pointer items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100">
                  <span>更換照片</span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={handleImageChange}
                  />
                </label>
              </div>
            </div>
          ) : (
            <label className="flex flex-col items-center cursor-pointer py-4">
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
                <Camera size={32} />
              </div>
              <span className="text-base font-bold text-slate-800">
                點擊啟動手機相機拍照 或 從相簿上傳會議紙本
              </span>
              <span className="text-xs text-slate-400 mt-1">
                支援 JPG, PNG, WEBP 高解析度拍攝
              </span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleImageChange}
              />
            </label>
          )}
        </div>
      </div>

      {/* 解析成果展示卡片 */}
      {parsedRecord && (
        <div className="rounded-3xl bg-white p-6 sm:p-8 shadow-xl border-2 border-emerald-400 space-y-5 animate-fade-in">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                <FileCheck size={24} />
              </div>
              <div>
                <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
                  OCR 智能結構化還原成功
                </span>
                <h3 className="text-xl font-black text-slate-900">
                  {parsedRecord.title}
                </h3>
              </div>
            </div>

            <span className="rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1 text-xs font-bold">
              辨識完成
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 text-xs">
            <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
              <span className="text-slate-400 block font-semibold">開會時間</span>
              <span className="font-bold text-slate-900 text-sm">{parsedRecord.date}</span>
            </div>
            <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
              <span className="text-slate-400 block font-semibold">開會地點</span>
              <span className="font-bold text-slate-900 text-sm">{parsedRecord.location}</span>
            </div>
          </div>

          {/* 各項表決議項與最終決議票數結果 */}
          <div className="space-y-3 pt-2">
            <h4 className="font-bold text-slate-900 text-base">
              解析議案表決結果列表 ({parsedRecord.resolutions.length} 案)
            </h4>

            {parsedRecord.resolutions.map((res, i) => (
              <div
                key={i}
                className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-sm">
                    {res.topic}
                  </span>
                  <span
                    className={`rounded-md px-2.5 py-0.5 text-xs font-black ${
                      res.decision.includes('通過') || res.decision.includes('得標')
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    決議：{res.decision}
                  </span>
                </div>

                <div className="flex items-center gap-4 text-xs font-semibold text-slate-600">
                  <span>贊成：<b className="text-emerald-700">{res.yes}</b></span>
                  <span>反對：<b className="text-rose-700">{res.no}</b></span>
                  {res.abstain && <span>棄權：<b className="text-slate-700">{res.abstain}</b></span>}
                </div>
              </div>
            ))}
          </div>

          {/* 原始 OCR 純文字折疊區塊 */}
          {rawText && (
            <details className="rounded-2xl border border-slate-200 bg-slate-100/60 p-3 text-xs">
              <summary className="cursor-pointer font-bold text-slate-600">
                查看原始 OCR 擷取字串 (Raw Text)
              </summary>
              <pre className="mt-2 whitespace-pre-wrap font-mono text-slate-700 max-h-48 overflow-y-auto">
                {rawText}
              </pre>
            </details>
          )}
        </div>
      )}
    </div>
  );
};
