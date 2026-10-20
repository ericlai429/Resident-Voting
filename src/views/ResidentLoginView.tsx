import React, { useState, useMemo } from 'react';
import {
  LogIn,
  QrCode,
  AlertCircle,
  KeyRound,
  ShieldAlert,
  Sparkles,
  Building,
  Phone,
  Home,
  CheckCircle2,
  Sliders,
  Keyboard,
} from 'lucide-react';
import { Member, Meeting } from '../types';
import { getMembers, updateMember, getOrCreateDeviceUUID } from '../lib/storage';
import { UniversalButton } from '../components/UniversalButton';
import { QrScannerModal } from '../components/QrScannerModal';
import { UnitWheelPicker } from '../components/UnitWheelPicker';

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
  // 模式切換：滾輪選擇 (預設) vs 鍵盤手動輸入
  const [inputMode, setInputMode] = useState<'wheel' | 'manual'>('wheel');

  // 大滾輪各軸狀態 (棟別 / 樓層 / 戶號 / 之幾)
  const [wheelState, setWheelState] = useState({
    block: '全區',
    floor: '12F',
    room: '15',
    sub: '本號',
  });

  // 手動輸入文字
  const [manualUnitNo, setManualUnitNo] = useState('');

  const [phoneLast4, setPhoneLast4] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [deviceAlert, setDeviceAlert] = useState<{ isLocked: boolean; unitNo?: string; boundDevice?: string } | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  // 取得目前社區所有名冊
  const members = useMemo(() => getMembers(activeMeeting?.community_id), [activeMeeting]);

  // 組合滾輪產生的標準戶號字串
  const computedUnitNo = useMemo(() => {
    if (inputMode === 'manual') return manualUnitNo.trim();

    const { block, floor, room, sub } = wheelState;
    // 預設為「本號」則免去之幾
    const subStr = sub === '本號' ? '' : sub;
    const blockStr = block === '全區' ? '' : `${block}-`;

    return `${blockStr}${floor}-${room}${subStr}`;
  }, [inputMode, manualUnitNo, wheelState]);

  // 即時動態匹配名冊中的住戶預覽 (即時回饋長輩，不怕選錯戶)
  const matchedPreviewMember = useMemo(() => {
    if (!computedUnitNo) return null;
    const clean = computedUnitNo.toUpperCase();
    return members.find(
      (m) =>
        m.unit_no.toUpperCase() === clean ||
        m.unit_no.toUpperCase().includes(clean) ||
        clean.includes(m.unit_no.toUpperCase())
    ) || null;
  }, [computedUnitNo, members]);

  // 執行表單登入
  const handleFormLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setDeviceAlert(null);

    if (!computedUnitNo) {
      setErrorMsg('請使用滾輪選取或輸入您的戶號');
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
        setErrorMsg(`會議 PIN 碼不正確！請輸入開會現場公佈之 4 碼 PIN。`);
        return;
      }
    }

    // 在名冊中比對住戶
    const member = matchedPreviewMember || members.find(
      (m) =>
        m.unit_no.toUpperCase().includes(computedUnitNo.toUpperCase()) ||
        computedUnitNo.toUpperCase().includes(m.unit_no.toUpperCase())
    );

    if (!member) {
      setErrorMsg(`在名冊中查無戶號【${computedUnitNo}】，請核對是否選對棟別或樓層。`);
      return;
    }

    if (member.phone_last4 !== phoneLast4.trim()) {
      setErrorMsg(`手機號碼末四碼不符！若您近期更換手機號碼，請洽大會服務台確認。`);
      return;
    }

    // 檢查設備綁定 (Device Token)
    const currentDeviceUUID = getOrCreateDeviceUUID();

    if (member.bound_device_token && member.bound_device_token !== currentDeviceUUID) {
      setDeviceAlert({
        isLocked: true,
        unitNo: member.unit_no,
        boundDevice: member.bound_device_token.slice(0, 8) + '***',
      });
      return;
    }

    // 初次登入自動綁定本機特徵值，並標記已報到
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

    const matched = members.find(
      (m) => m.reset_token === decodedText.trim() || decodedText.includes(m.reset_token || '___')
    );

    if (matched) {
      const currentDeviceUUID = getOrCreateDeviceUUID();
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

  // 快捷測試用 Demo 填入
  const handleQuickFill = (targetUnit: string, last4: string) => {
    if (targetUnit.includes('-')) {
      const parts = targetUnit.split('-');
      if (parts.length === 2) {
        setWheelState({
          block: '全區',
          floor: parts[0].includes('F') ? parts[0] : `${parts[0]}F`,
          room: parts[1],
          sub: '本號',
        });
      }
    }
    setManualUnitNo(targetUnit);
    setPhoneLast4(last4);
    if (activeMeeting) {
      setPinCode(activeMeeting.pin_code);
    }
    setErrorMsg('');
    setDeviceAlert(null);
  };

  return (
    <div className="mx-auto max-w-md px-3 py-4 sm:py-8">
      {/* 頂部社區大會標題 */}
      <div className="text-center mb-5">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 border border-indigo-200 px-3.5 py-1 text-xs font-bold text-indigo-700 mb-2">
          <Building size={14} />
          <span>{communityName}</span>
        </div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
          區分所有權人手機線上表決
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-slate-600">
          大滾輪直覺選戶 · 專有坪數法定權重 · 現場雙重防弊
        </p>
      </div>

      {/* 掃描個人專屬 QR 碼快速通關按鈕 */}
      <div className="mb-5">
        <UniversalButton
          variant="outline"
          size="lg"
          className="w-full border-2 border-indigo-400 bg-indigo-50/60 hover:bg-indigo-100 text-indigo-950 shadow-xs"
          onClick={() => setIsScannerOpen(true)}
          icon={<QrCode size={24} className="text-indigo-600" />}
        >
          📷 掃描個人專屬憑證 QR 碼 (免打字)
        </UniversalButton>
      </div>

      <div className="relative my-5 flex items-center justify-center">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-200" />
        </div>
        <span className="relative bg-slate-50 px-3 text-[11px] font-bold text-slate-400 uppercase">
          或手動選取戶別登入
        </span>
      </div>

      {/* 裝置衝突警示 */}
      {deviceAlert?.isLocked && (
        <div className="mb-5 rounded-2xl border-2 border-rose-300 bg-rose-50 p-4 shadow-sm">
          <div className="flex items-start gap-2.5">
            <div className="rounded-xl bg-rose-200 p-1.5 text-rose-800 shrink-0">
              <ShieldAlert size={22} />
            </div>
            <div className="flex-1 text-xs text-rose-900">
              <h3 className="font-bold text-sm">
                ⚠️ 此戶號已在其他手機綁定登入！
              </h3>
              <p className="mt-1 leading-relaxed">
                戶號【{deviceAlert.unitNo}】已綁定於其他裝置。
                為防止未經授權之代投，請洽大會服務台 / 總幹事驗證身分解綁重置。
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 錯誤提示 */}
      {errorMsg && (
        <div className="mb-5 flex items-center gap-2 rounded-2xl bg-amber-50 border border-amber-200 p-3.5 text-xs text-amber-900">
          <AlertCircle size={20} className="text-amber-600 shrink-0" />
          <span className="font-semibold">{errorMsg}</span>
        </div>
      )}

      {/* 登入表單 */}
      <form onSubmit={handleFormLogin} className="rounded-3xl bg-white p-5 sm:p-6 shadow-xl border border-slate-200 space-y-4">
        {/* 戶別選擇區塊 (大滾輪切換) */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-black text-slate-900 flex items-center gap-1.5">
              <Home size={17} className="text-indigo-600" />
              <span>選取棟別與戶號</span>
            </label>

            {/* 切換滾輪 / 鍵盤手動輸入 */}
            <button
              type="button"
              onClick={() => setInputMode(inputMode === 'wheel' ? 'manual' : 'wheel')}
              className="flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-2 py-1 rounded-lg"
            >
              {inputMode === 'wheel' ? (
                <>
                  <Keyboard size={13} />
                  <span>切換為鍵盤打字</span>
                </>
              ) : (
                <>
                  <Sliders size={13} />
                  <span>切換為大滾輪選擇</span>
                </>
              )}
            </button>
          </div>

          {inputMode === 'wheel' ? (
            <UnitWheelPicker
              block={wheelState.block}
              floor={wheelState.floor}
              room={wheelState.room}
              sub={wheelState.sub}
              onChange={setWheelState}
            />
          ) : (
            <input
              type="text"
              required
              value={manualUnitNo}
              onChange={(e) => setManualUnitNo(e.target.value)}
              placeholder="例如：12F-15 或 A棟-08F-3"
              className="w-full min-h-[52px] rounded-2xl border-2 border-slate-300 px-4 text-base font-bold text-slate-900 focus:border-indigo-600 focus:outline-none"
            />
          )}

          {/* 滾輪目前選定之戶別與名冊即時預覽 */}
          <div className="mt-2.5 rounded-xl bg-slate-50 border border-slate-200 p-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 font-semibold">目前選定戶別：</span>
              <span className="font-mono text-base font-black text-indigo-900">
                【{computedUnitNo}】
              </span>
            </div>

            {matchedPreviewMember ? (
              <div className="mt-1.5 pt-1.5 border-t border-slate-200 flex items-center justify-between text-[11px] text-emerald-800 font-bold">
                <span className="flex items-center gap-1">
                  <CheckCircle2 size={13} className="text-emerald-600" />
                  <span>名冊已確認：{matchedPreviewMember.owner_name}</span>
                </span>
                <span>持分 {matchedPreviewMember.area_ping} 坪</span>
              </div>
            ) : (
              <div className="mt-1.5 pt-1.5 border-t border-slate-200 text-[10px] text-amber-700 font-semibold">
                ℹ️ 滾動選擇上方各軸，預設「本號」則自動省略之幾
              </div>
            )}
          </div>
        </div>

        {/* 手機末四碼 */}
        <div>
          <label className="block text-sm font-black text-slate-900 mb-1.5 flex items-center gap-1.5">
            <Phone size={17} className="text-indigo-600" />
            <span>手機號碼末四碼</span>
            <span className="text-[11px] text-slate-400 font-normal">(4位數字)</span>
          </label>
          <input
            type="text"
            required
            maxLength={4}
            inputMode="numeric"
            value={phoneLast4}
            onChange={(e) => setPhoneLast4(e.target.value.replace(/\D/g, ''))}
            placeholder="請輸入登記手機末四碼"
            className="w-full min-h-[52px] rounded-2xl border-2 border-slate-200 px-4 text-xl font-black tracking-widest text-slate-900 focus:border-indigo-600 focus:outline-none focus:ring-3 focus:ring-indigo-100"
          />
        </div>

        {/* 現場當日 4 碼 PIN */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-sm font-black text-slate-900 flex items-center gap-1.5">
              <KeyRound size={17} className="text-amber-600" />
              <span>開會現場 4 位數 PIN 碼</span>
            </label>
            <span className="text-[10px] text-amber-800 bg-amber-100 px-2 py-0.5 rounded font-bold">
              現場公布 · 防遠端灌票
            </span>
          </div>
          <input
            type="text"
            required
            maxLength={4}
            inputMode="numeric"
            value={pinCode}
            onChange={(e) => setPinCode(e.target.value.replace(/\D/g, ''))}
            placeholder="請輸入大螢幕公布之 4 位數 PIN"
            className="w-full min-h-[52px] rounded-2xl border-2 border-amber-300 bg-amber-50/30 px-4 text-xl font-black tracking-widest text-amber-950 focus:border-amber-600 focus:outline-none focus:ring-3 focus:ring-amber-100"
          />
        </div>

        <UniversalButton
          type="submit"
          variant="primary"
          size="xl"
          className="w-full mt-1"
          icon={<LogIn size={22} />}
        >
          確認身分 · 進入線上表決
        </UniversalButton>
      </form>

      {/* 快捷示範測試 */}
      <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-100/60 p-3.5">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 mb-2">
          <Sparkles size={14} className="text-indigo-600" />
          <span>現場示範住戶快速代入測試 (點擊自動滾輪定位)</span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <button
            type="button"
            onClick={() => handleQuickFill('12F-15', '9988')}
            className="rounded-xl bg-white p-2 text-left font-semibold text-slate-700 shadow-2xs hover:border-indigo-400 hover:bg-indigo-50 border border-slate-200"
          >
            <span className="block text-indigo-700 font-bold">12F-15 王小明</span>
            <span className="text-slate-500 text-[10px]">末4碼: 9988 (16.5坪)</span>
          </button>
          <button
            type="button"
            onClick={() => handleQuickFill('26F-08', '5678')}
            className="rounded-xl bg-white p-2 text-left font-semibold text-slate-700 shadow-2xs hover:border-indigo-400 hover:bg-indigo-50 border border-slate-200"
          >
            <span className="block text-indigo-700 font-bold">26F-08 張主委</span>
            <span className="text-slate-500 text-[10px]">末4碼: 5678 (38.6坪)</span>
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
