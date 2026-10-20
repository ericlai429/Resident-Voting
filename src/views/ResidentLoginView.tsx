import React, { useState } from 'react';
import { LogIn, QrCode, AlertCircle, KeyRound, ShieldAlert, Sparkles, Building, Phone, Home } from 'lucide-react';
import { Member, Meeting } from '../types';
import { getMembers, updateMember, getOrCreateDeviceUUID, getTodayMidnightISO } from '../lib/storage';
import { UniversalButton } from '../components/UniversalButton';
import { QrScannerModal } from '../components/QrScannerModal';

interface ResidentLoginViewProps {
  activeMeeting: Meeting | null;
  onLoginSuccess: (member: Member) => void;
  communityName: string;
}

export const ResidentLoginView: React.FC<ResidentLoginViewProps> = ({
  activeMeeting,
  onLoginSuccess,
  communityName,
}) => {
  const [unitNo, setUnitNo] = useState('');
  const [floor, setFloor] = useState('');
  const [phoneLast4, setPhoneLast4] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [deviceAlert, setDeviceAlert] = useState<{ isLocked: boolean; unitNo?: string; boundDevice?: string } | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  // 執行一般表單登入
  const handleFormLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setDeviceAlert(null);

    if (!unitNo.trim()) {
      setErrorMsg('請輸入您的棟別與戶號 (例如：A棟-08F-3)');
      return;
    }
    if (!phoneLast4.trim() || phoneLast4.length !== 4) {
      setErrorMsg('請輸入手機號碼末四碼 (4位數字)');
      return;
    }

    // 檢驗當日防遠端灌票 4 碼 PIN
    if (activeMeeting) {
      const now = new Date().toISOString();
      if (activeMeeting.pin_expires_at && now > activeMeeting.pin_expires_at) {
        setErrorMsg('當日會議 PIN 碼已過期失效，請洽現場主委或總幹事重新確認！');
        return;
      }
      if (pinCode.trim() !== activeMeeting.pin_code) {
        setErrorMsg(`會議 PIN 碼不正確！請輸入開會現場公佈之 4 碼 PIN（非遠端隨意輸入）。`);
        return;
      }
    }

    // 在名冊中尋找該住戶
    const members = getMembers(activeMeeting?.community_id);
    const cleanUnit = unitNo.trim().toUpperCase();

    const member = members.find(
      (m) =>
        m.unit_no.toUpperCase().includes(cleanUnit) ||
        cleanUnit.includes(m.unit_no.toUpperCase())
    );

    if (!member) {
      setErrorMsg(`在名冊中查無戶號「${unitNo}」，請確認是否與權狀門牌或通知單一致。`);
      return;
    }

    if (member.phone_last4 !== phoneLast4.trim()) {
      setErrorMsg(`手機號碼末四碼不符！若您近期更換手機號碼，請洽管理台 (Admin) 辦理名冊更正。`);
      return;
    }

    // 檢查每隻手機綁定內碼 (Device Token)
    const currentDeviceUUID = getOrCreateDeviceUUID();

    if (member.bound_device_token && member.bound_device_token !== currentDeviceUUID) {
      setDeviceAlert({
        isLocked: true,
        unitNo: member.unit_no,
        boundDevice: member.bound_device_token.slice(0, 8) + '***',
      });
      return;
    }

    // 初次登入自動綁定本機特徵值，並標記自動報到
    const updatedMember: Member = {
      ...member,
      bound_device_token: currentDeviceUUID,
      is_checked_in: true,
      check_in_time: member.check_in_time || new Date().toISOString(),
      reset_token: member.reset_token || `TOKEN-${member.unit_no}-${member.phone_last4}`,
    };

    updateMember(updatedMember);
    onLoginSuccess(updatedMember);
  };

  // 掃描個人專屬 QR 碼一鍵免打字登入
  const handleQrScanSuccess = (decodedText: string) => {
    setIsScannerOpen(false);
    setErrorMsg('');
    setDeviceAlert(null);

    const members = getMembers(activeMeeting?.community_id);
    const matched = members.find(
      (m) => m.reset_token === decodedText.trim() || decodedText.includes(m.reset_token || '___')
    );

    if (matched) {
      const currentDeviceUUID = getOrCreateDeviceUUID();
      // 專屬 QR 碼視為最高級別實體憑證，若換手機掃自己的憑證 QR 碼，系統允許重新覆蓋綁定
      const updated: Member = {
        ...matched,
        bound_device_token: currentDeviceUUID,
        is_checked_in: true,
        check_in_time: matched.check_in_time || new Date().toISOString(),
      };
      updateMember(updated);
      onLoginSuccess(updated);
    } else {
      setErrorMsg('此 QR Code 不是有效的區權人登入憑證，請確認後重新掃描。');
    }
  };

  // 快速測試用 Demo 填入
  const handleQuickFill = (targetUnit: string, targetFloor: string, last4: string) => {
    setUnitNo(targetUnit);
    setFloor(targetFloor);
    setPhoneLast4(last4);
    if (activeMeeting) {
      setPinCode(activeMeeting.pin_code);
    }
    setErrorMsg('');
    setDeviceAlert(null);
  };

  return (
    <div className="mx-auto max-w-xl px-4 py-6 sm:py-10">
      {/* 頂部社區大會標題 */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 border border-indigo-200 px-4 py-1.5 text-sm font-bold text-indigo-700 mb-3">
          <Building size={16} />
          <span>{communityName}</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          區分所有權人手機線上表決
        </h1>
        <p className="mt-2 text-sm sm:text-base text-slate-600">
          現場掃碼登入 · 專有持分法定權重 · 雙重防弊驗證
        </p>
      </div>

      {/* 掃描個人專屬 QR 碼快速通關按鈕 (Universal Big Button) */}
      <div className="mb-6">
        <UniversalButton
          variant="outline"
          size="lg"
          className="w-full border-2 border-indigo-400 bg-indigo-50/50 hover:bg-indigo-100 text-indigo-900 shadow-sm"
          onClick={() => setIsScannerOpen(true)}
          icon={<QrCode size={26} className="text-indigo-600" />}
        >
          📷 掃描個人專屬登入 QR 碼 (免打字)
        </UniversalButton>
        <p className="mt-1.5 text-center text-xs text-slate-500">
          曾保存過專屬憑證 QR 碼者，直接掃碼即可秒速回復身分
        </p>
      </div>

      <div className="relative my-6 flex items-center justify-center">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-200" />
        </div>
        <span className="relative bg-slate-50 px-4 text-xs font-bold text-slate-400 uppercase">
          或手動輸入資料驗證
        </span>
      </div>

      {/* 裝置衝突嚴格警示 */}
      {deviceAlert?.isLocked && (
        <div className="mb-6 rounded-3xl border-2 border-rose-300 bg-rose-50 p-5 shadow-md">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-rose-200 p-2 text-rose-800">
              <ShieldAlert size={28} />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-rose-900">
                ⚠️ 此戶號已在其他手機綁定登入！
              </h3>
              <p className="mt-1 text-sm text-rose-800 leading-relaxed">
                戶號【{deviceAlert.unitNo}】已綁定於其他裝置（特徵：{deviceAlert.boundDevice}）。
                為防止未經授權之他人代投或重複投票，系統已啟動防盜投防護機制。
              </p>
              <div className="mt-3 rounded-xl bg-white/80 p-3 text-xs text-slate-700 border border-rose-200">
                💡 <span className="font-bold">現場解決方式：</span>
                請親自攜帶身分證件洽大會主席台 / 總幹事（Admin1），在管理者後台點擊「解除綁定 / 產生臨時重置碼」，或使用您手機保存的「專屬 QR 憑證」重新覆蓋登入。
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 錯誤提示 */}
      {errorMsg && (
        <div className="mb-6 flex items-center gap-3 rounded-2xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-900">
          <AlertCircle size={22} className="text-amber-600 flex-shrink-0" />
          <span className="font-medium">{errorMsg}</span>
        </div>
      )}

      {/* 登入表單 (通用設計：高對比、大間距、大輸入框) */}
      <form onSubmit={handleFormLogin} className="rounded-3xl bg-white p-6 sm:p-8 shadow-xl border border-slate-100 space-y-5">
        <div>
          <label className="block text-base font-bold text-slate-800 mb-2 flex items-center gap-1.5">
            <Home size={18} className="text-indigo-600" />
            <span>棟別與戶號</span>
            <span className="text-xs text-slate-400 font-normal">(例: A棟-08F-3)</span>
          </label>
          <input
            type="text"
            required
            value={unitNo}
            onChange={(e) => setUnitNo(e.target.value)}
            placeholder="請輸入棟別或戶號 (例如：A棟-08F-3)"
            className="w-full min-h-[56px] rounded-2xl border-2 border-slate-200 px-4 text-lg font-medium text-slate-900 focus:border-indigo-600 focus:outline-none focus:ring-4 focus:ring-indigo-100"
          />
        </div>

        <div>
          <label className="block text-base font-bold text-slate-800 mb-2 flex items-center gap-1.5">
            <Phone size={18} className="text-indigo-600" />
            <span>手機號碼末四碼</span>
            <span className="text-xs text-slate-400 font-normal">(4位數字)</span>
          </label>
          <input
            type="text"
            required
            maxLength={4}
            inputMode="numeric"
            value={phoneLast4}
            onChange={(e) => setPhoneLast4(e.target.value.replace(/\D/g, ''))}
            placeholder="例如：9988"
            className="w-full min-h-[56px] rounded-2xl border-2 border-slate-200 px-4 text-xl font-bold tracking-widest text-slate-900 focus:border-indigo-600 focus:outline-none focus:ring-4 focus:ring-indigo-100"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-base font-bold text-slate-800 flex items-center gap-1.5">
              <KeyRound size={18} className="text-amber-600" />
              <span>當日會議 4 位數 PIN 碼</span>
            </label>
            <span className="text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md font-semibold">
              防止遠端灌票
            </span>
          </div>
          <input
            type="text"
            required
            maxLength={4}
            inputMode="numeric"
            value={pinCode}
            onChange={(e) => setPinCode(e.target.value.replace(/\D/g, ''))}
            placeholder="開會現場大螢幕公布之 4 碼"
            className="w-full min-h-[56px] rounded-2xl border-2 border-amber-300 bg-amber-50/30 px-4 text-xl font-bold tracking-widest text-amber-950 focus:border-amber-600 focus:outline-none focus:ring-4 focus:ring-amber-100"
          />
          <p className="mt-1 text-xs text-slate-500">
            由開會現場主席宣布，於當日 23:59 自動失效
          </p>
        </div>

        <UniversalButton
          type="submit"
          variant="primary"
          size="xl"
          className="w-full mt-2"
          icon={<LogIn size={24} />}
        >
          驗證身分並進入表決
        </UniversalButton>
      </form>

      {/* 快捷展示快速填入 (方便測試) */}
      <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-slate-100/60 p-4">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-600 mb-2">
          <Sparkles size={16} className="text-indigo-600" />
          <span>現場測試快捷示範帳號 (點擊帶入)</span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <button
            type="button"
            onClick={() => handleQuickFill('A棟-08F-3', '8F', '9988')}
            className="rounded-xl bg-white p-2.5 text-left font-semibold text-slate-700 shadow-2xs hover:border-indigo-400 hover:bg-indigo-50 border border-slate-200"
          >
            <span className="block text-indigo-700 font-bold">一般住戶 王小明</span>
            <span className="text-slate-500">A棟-08F-3 (末4碼 9988)</span>
          </button>
          <button
            type="button"
            onClick={() => handleQuickFill('A棟-15F-1', '15F', '5678')}
            className="rounded-xl bg-white p-2.5 text-left font-semibold text-slate-700 shadow-2xs hover:border-indigo-400 hover:bg-indigo-50 border border-slate-200"
          >
            <span className="block text-indigo-700 font-bold">管委會主委 陳志明</span>
            <span className="text-slate-500">A棟-15F-1 (末4碼 5678)</span>
          </button>
        </div>
      </div>

      {/* QR 碼掃描器彈窗 */}
      <QrScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={handleQrScanSuccess}
        title="掃描住戶專屬登入 QR 碼"
        description="請對準您保存的登入憑證 QR 碼，或由管理台提供之換機重置碼"
      />
    </div>
  );
};
