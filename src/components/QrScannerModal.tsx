import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, Camera, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { UniversalButton } from './UniversalButton';

interface QrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (decodedText: string) => void;
  title?: string;
  description?: string;
}

export const QrScannerModal: React.FC<QrScannerModalProps> = ({
  isOpen,
  onClose,
  onScanSuccess,
  title = '掃描 QR Code',
  description = '請將鏡頭對準個人專屬 QR 碼或會議結算碼',
}) => {
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isScanning, setIsScanning] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = 'html5-qr-scanner-box';

  useEffect(() => {
    if (!isOpen) {
      stopScanning();
      return;
    }

    setErrorMessage('');
    const startScanner = async () => {
      try {
        const scanner = new Html5Qrcode(scannerContainerId);
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 260, height: 260 },
          },
          (decodedText) => {
            stopScanning();
            onScanSuccess(decodedText);
          },
          () => {
            // 解析中的暫時無效影格忽略
          }
        );
        setIsScanning(true);
      } catch (err: unknown) {
        console.warn('鏡頭啟動受阻:', err);
        setErrorMessage('無法啟用相機鏡頭（可能是權限未允許或不支援），您可以點選下方按鈕上傳 QR 碼圖片。');
      }
    };

    // 稍微延遲以確保 DOM 容器已掛載
    const timer = setTimeout(() => {
      startScanner();
    }, 300);

    return () => {
      clearTimeout(timer);
      stopScanning();
    };
  }, [isOpen]);

  const stopScanning = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch (e) {
        console.warn('關閉掃描器異常', e);
      }
      scannerRef.current = null;
      setIsScanning(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const scanner = new Html5Qrcode('file-qr-temp-box');
      const result = await scanner.scanFile(file, true);
      scanner.clear();
      stopScanning();
      onScanSuccess(result);
    } catch (err) {
      setErrorMessage('無法在該圖片中辨識到有效的 QR 碼，請換一張清晰的照片試試。');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
        {/* 頂部關閉按鈕 */}
        <button
          onClick={() => {
            stopScanning();
            onClose();
          }}
          className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200"
          aria-label="關閉掃描視窗"
        >
          <X size={24} />
        </button>

        <div className="mb-4 text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600">
            <Camera size={28} />
          </div>
          <h3 className="text-xl font-bold text-slate-900">{title}</h3>
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        </div>

        {/* 掃描鏡頭預覽區塊 */}
        <div className="relative mx-auto mb-4 overflow-hidden rounded-2xl border-2 border-indigo-400 bg-slate-950">
          <div id={scannerContainerId} className="w-full min-h-[280px]" />
          <div id="file-qr-temp-box" className="hidden" />
        </div>

        {errorMessage && (
          <div className="mb-4 flex items-start gap-2.5 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
            <AlertCircle size={20} className="mt-0.5 flex-shrink-0 text-amber-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* 圖片上傳備援 */}
        <div className="flex flex-col gap-2">
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-300 bg-slate-50 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100">
            <ImageIcon size={18} />
            <span>從相簿選擇 QR 碼截圖</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
            />
          </label>

          <UniversalButton
            variant="outline"
            size="md"
            onClick={() => {
              stopScanning();
              onClose();
            }}
          >
            取消
          </UniversalButton>
        </div>
      </div>
    </div>
  );
};
