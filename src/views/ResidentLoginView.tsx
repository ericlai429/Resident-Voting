import React, { useState, useMemo, useEffect } from 'react';
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
  Unlock,
  Radio,
  Clock,
  CheckCheck,
} from 'lucide-react';
import { Member, Meeting, DeskAuthSyncEvent } from '../types';
import {
  getMembers,
  updateMember,
  getOrCreateDeviceUUID,
  createDeskAuthRequest,
  subscribeToSyncEvents,
} from '../lib/storage';
import { UniversalButton } from '../components/UniversalButton';
import { QrScannerModal } from '../components/QrScannerModal';
import { UnitWheelPicker } from '../components/UnitWheelPicker';
import { isUnitMatch } from '../lib/unitMatcher';

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
  // 模式切換：大滾輪選擇 (預設) vs 鍵盤手動輸入
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
  const [deviceAlert, setDeviceAlert] = useState<{ isLocked: boolean; unitNo?: string; boundDevice?: string; member?: Member } | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  // 記錄手機末四碼不符資訊與大會服務台求助狀態
  const [phoneMismatchInfo, setPhoneMismatchInfo] = useState<{
    member: Member;
    typedPhone: string;
    isRequested: boolean;
  } | null>(null);

  // 現場大會服務台即時核准反饋狀態
  const [isApprovedRealtime, setIsApprovedRealtime] = useState<Member | null>(null);

  // 取得目前社區所有名冊
  const members = useMemo(() => getMembers(activeMeeting?.community_id), [activeMeeting]);

  // 組合滾輪產生的標準戶號字串
  const computedUnitNo = useMemo(() => {
    if (inputMode === 'manual') return manualUnitNo.trim();

    const { block, floor, room, sub } = wheelState;
    const subStr = sub === '本號' ? '' : sub;
    const blockStr = block === '全區' ? '' : `${block}-`;

    return `${blockStr}${floor}-${room}${subStr}`;
  }, [inputMode, manualUnitNo, wheelState]);

  // 即時動態匹配名冊中的住戶預覽 (支援智慧容錯比對，如 12F-08 vs 12F-8)
  const matchedPreviewMember = useMemo(() => {
    if (!computedUnitNo) return null;
    return members.find((m) => isUnitMatch(computedUnitNo, m.unit_no)) || null;
  }, [computedUnitNo, members]);

  // 監聽大會服務台即時授權核准訊號 (跨視窗/跨設備 Realtime)
  useEffect(() => {
    const currentDeviceUUID = getOrCreateDeviceUUID();

    const handleSync = (event: DeskAuthSyncEvent) => {
      // 檢查是否是針對本戶號或本手機的授權
      const targetMemberId = phoneMismatchInfo?.member?.id;
      const targetUnit = (phoneMismatchInfo?.member?.unit_no || computedUnitNo).toUpperCase();

      const isMatchUnit = (event.memberId && event.memberId === targetMemberId) ||
        (event.unitNo && isUnitMatch(event.unitNo, targetUnit));

      const isMatchDevice = event.targetDeviceUuid === currentDeviceUUID;

      if ((isMatchUnit || isMatchDevice) && (
        event.type === 'AUTH_REQUEST_APPROVED' ||
        event.type === 'MEMBER_AUTHORIZED' ||
        event.type === 'MEMBER_PHONE_UPDATED'
      )) {
        // 從存儲獲取最新資料
        const freshMembers = getMembers(activeMeeting?.community_id);
        const target = freshMembers.find(m => m.id === event.memberId || isUnitMatch(m.unit_no, targetUnit));
        if (target) {
          const approvedMember: Member = {
            ...target,
            bound_device_token: currentDeviceUUID,
            is_checked_in: true,
            check_in_time: target.check_in_time || new Date().toISOString(),
          };
          updateMember(approvedMember);
          setIsApprovedRealtime(approvedMember);

          // 輕微觸覺震動 (若裝置支援)
          try {
            if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
              navigator.vibrate([120, 60, 180]);
            }
          } catch {}

          // 給予視覺高光慶祝後自動登入進入表決
          setTimeout(() => {
            onLoginSuccess(approvedMember);
          }, 1200);
        }
      }

      // 當管理員現場解除舊手機鎖定 (換機解綁)
      if ((isMatchUnit || isMatchDevice) && event.type === 'MEMBER_DEVICE_UNLOCKED') {
        setDeviceAlert(null);
        setErrorMsg('');
      }
    };

    const unsubscribe = subscribeToSyncEvents(handleSync);

    // 輪詢備援機制 (每 1.2 秒輪詢一次名冊，保證在任何離線/跨視窗環境下皆能自動即時反應)
    const interval = setInterval(() => {
      if (!phoneMismatchInfo?.member) return;
      const freshMembers = getMembers(activeMeeting?.community_id);
      const target = freshMembers.find(m => m.id === phoneMismatchInfo.member.id);
      if (target) {
        // 條件 A: 後台直接更新了手機末四碼使其相符
        const isPhoneMatchedNow = target.phone_last4 === phoneMismatchInfo.typedPhone;
        // 條件 B: 後台直接核准並綁定了本機 UUID
        const isDeviceBound = target.bound_device_token === currentDeviceUUID;
        // 條件 C: 後台現場一鍵特權開通
        const isAuthorizedNow = target.is_checked_in;

        if (isPhoneMatchedNow || isDeviceBound || isAuthorizedNow) {
          const approvedMember: Member = {
            ...target,
            bound_device_token: currentDeviceUUID,
            is_checked_in: true,
            check_in_time: target.check_in_time || new Date().toISOString(),
          };
          updateMember(approvedMember);
          setIsApprovedRealtime(approvedMember);
          clearInterval(interval);
          setTimeout(() => {
            onLoginSuccess(approvedMember);
          }, 1000);
        }
      }
    }, 1200);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [phoneMismatchInfo, computedUnitNo, activeMeeting, onLoginSuccess]);

  // 當滾輪切換且找到住戶時，清除先前的錯誤提示
  const handleWheelChange = (val: { block: string; floor: string; room: string; sub: string }) => {
    setWheelState(val);
    setErrorMsg('');
    setDeviceAlert(null);
    setPhoneMismatchInfo(null);
    setIsApprovedRealtime(null);
  };

  // 執行表單登入
  const handleFormLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setDeviceAlert(null);

    if (!computedUnitNo) {
      setErrorMsg('請使用滾輪選取或輸入您的戶號');
      return;
    }

    if (!phoneLast4.trim()) {
      setErrorMsg('請輸入登記之手機號碼末四碼！');
      return;
    }

    if (phoneLast4.trim().length !== 4) {
      setErrorMsg('手機號碼末四碼必須為 4 位數字！');
      return;
    }

    if (!pinCode.trim()) {
      setErrorMsg(`請輸入開會現場公佈之 4 位數 PIN 碼 (今日為 ${activeMeeting?.pin_code || '8866'})！`);
      return;
    }

    // 檢驗當日防遠端灌票 4 碼 PIN
    if (activeMeeting) {
      const now = new Date().toISOString();
      if (activeMeeting.pin_expires_at && now > activeMeeting.pin_expires_at) {
        setErrorMsg('當日會議 PIN 碼已過期失效，請洽現場主委或總幹事確認！');
        return;
      }
      if (pinCode.trim() !== activeMeeting.pin_code) {
        setErrorMsg(`會議 PIN 碼不正確！現場公布的 PIN 碼為【${activeMeeting.pin_code}】。`);
        return;
      }
    }

    // 在名冊中比對住戶 (支援智慧容錯比對)
    const member = matchedPreviewMember || members.find((m) => isUnitMatch(computedUnitNo, m.unit_no));

    if (!member) {
      setErrorMsg(`在名冊中查無戶號【${computedUnitNo}】，請核對是否選對棟別或樓層。`);
      return;
    }

    // 手機號碼末四碼比對
    if (member.phone_last4 !== phoneLast4.trim()) {
      setErrorMsg('手機號碼末四碼不符！若您近期更換手機號碼，請洽大會服務台確認。');

      // 自動向大會服務台送出人工認證求助單 (後台 Admin 即刻動態收到)
      const currentDeviceUUID = getOrCreateDeviceUUID();
      createDeskAuthRequest({
        community_id: member.community_id,
        meeting_id: activeMeeting?.id,
        member_id: member.id,
        unit_no: member.unit_no,
        owner_name: member.owner_name,
        registered_phone_last4: member.phone_last4,
        input_phone_last4: phoneLast4.trim(),
        device_uuid: currentDeviceUUID,
      });

      setPhoneMismatchInfo({
        member,
        typedPhone: phoneLast4.trim(),
        isRequested: true,
      });
      return;
    }

    // 檢查設備綁定 (Device Token)
    const currentDeviceUUID = getOrCreateDeviceUUID();

    if (member.bound_device_token && member.bound_device_token !== currentDeviceUUID) {
      setDeviceAlert({
        isLocked: true,
        unitNo: member.unit_no,
        boundDevice: member.bound_device_token.slice(0, 8) + '***',
        member: member,
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

  // 現場一鍵授權解綁設備並登入
  const handleForceUnlockAndLogin = () => {
    if (!deviceAlert?.member) return;
    const currentDeviceUUID = getOrCreateDeviceUUID();
    const updatedMember: Member = {
      ...deviceAlert.member,
      bound_device_token: currentDeviceUUID,
      is_checked_in: true,
      check_in_time: deviceAlert.member.check_in_time || new Date().toISOString(),
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
      <div className="text-center mb-4">
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
      <div className="mb-4">
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

      <div className="relative my-4 flex items-center justify-center">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-200" />
        </div>
        <span className="relative bg-slate-50 px-3 text-[11px] font-bold text-slate-400 uppercase">
          或手動選取戶別登入
        </span>
      </div>

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
              onChange={handleWheelChange}
            />
          ) : (
            <input
              type="text"
              value={manualUnitNo}
              onChange={(e) => setManualUnitNo(e.target.value)}
              placeholder="例如：12F-15 或 A棟-08F-3"
              className="w-full min-h-[52px] rounded-2xl border-2 border-slate-300 px-4 text-base font-bold text-slate-900 focus:border-indigo-600 focus:outline-none"
            />
          )}

          {/* 滾輪目前選定之戶別與名冊即時預覽 */}
          <div className="mt-2.5 rounded-xl bg-slate-50 border border-slate-200 p-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 font-semibold">選定戶號：</span>
              <span className="font-mono text-base font-black text-indigo-900">
                【{computedUnitNo}】
              </span>
            </div>

            {matchedPreviewMember ? (
              <div className="mt-1.5 pt-1.5 border-t border-slate-200 space-y-1">
                <div className="flex items-center justify-between text-[11px] text-emerald-800 font-bold">
                  <span className="flex items-center gap-1">
                    <CheckCircle2 size={13} className="text-emerald-600" />
                    <span>所有權人：{matchedPreviewMember.owner_name}</span>
                  </span>
                  <span>權利持分 {matchedPreviewMember.area_ping} 坪</span>
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-500">
                  <span>登記末四碼：<b className="text-slate-800">{matchedPreviewMember.phone_last4}</b></span>
                  <button
                    type="button"
                    onClick={() => {
                      setPhoneLast4(matchedPreviewMember.phone_last4);
                      setErrorMsg('');
                    }}
                    className="text-indigo-600 font-bold hover:underline"
                  >
                    點此自動填入末4碼 ➔
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-1.5 pt-1.5 border-t border-slate-200 text-[10px] text-amber-700 font-semibold">
                ℹ️ 滾動上方各軸，預設「本號」則自動省略之幾
              </div>
            )}
          </div>
        </div>

        {/* 手機末四碼 */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-sm font-black text-slate-900 flex items-center gap-1.5">
              <Phone size={17} className="text-indigo-600" />
              <span>手機號碼末四碼</span>
            </label>
            {matchedPreviewMember && (
              <button
                type="button"
                onClick={() => setPhoneLast4(matchedPreviewMember.phone_last4)}
                className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded"
              >
                帶入 {matchedPreviewMember.phone_last4}
              </button>
            )}
          </div>
          <input
            type="text"
            maxLength={4}
            inputMode="numeric"
            value={phoneLast4}
            onChange={(e) => {
              setPhoneLast4(e.target.value.replace(/\D/g, ''));
              setErrorMsg('');
            }}
            placeholder="請輸入登記手機末四碼 (例如 9988)"
            className="w-full min-h-[52px] rounded-2xl border-2 border-slate-200 px-4 text-xl font-black tracking-widest text-slate-900 focus:border-indigo-600 focus:outline-none focus:ring-3 focus:ring-indigo-100"
          />
        </div>

        {/* 現場當日 4 碼 PIN */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-sm font-black text-slate-900 flex items-center gap-1.5">
              <KeyRound size={17} className="text-amber-600" />
              <span>現場投票 4 位數 PIN 碼</span>
            </label>
            {activeMeeting && (
              <button
                type="button"
                onClick={() => setPinCode(activeMeeting.pin_code)}
                className="text-[11px] font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded border border-amber-300"
              >
                帶入現場 PIN: {activeMeeting.pin_code}
              </button>
            )}
          </div>
          <input
            type="text"
            maxLength={4}
            inputMode="numeric"
            value={pinCode}
            onChange={(e) => {
              setPinCode(e.target.value.replace(/\D/g, ''));
              setErrorMsg('');
            }}
            placeholder={`大螢幕現場公布 (目前為 ${activeMeeting?.pin_code || '8866'})`}
            className="w-full min-h-[52px] rounded-2xl border-2 border-amber-300 bg-amber-50/30 px-4 text-xl font-black tracking-widest text-amber-950 focus:border-amber-600 focus:outline-none focus:ring-3 focus:ring-amber-100"
          />
        </div>

        {/* 醒目錯誤警告區 (直接置於按鈕上方，一眼看清) */}
        {errorMsg && (
          <div className="rounded-2xl bg-rose-50 border-2 border-rose-300 p-3.5 text-xs text-rose-900 font-bold flex items-center gap-2 animate-shake">
            <AlertCircle size={20} className="text-rose-600 shrink-0" />
            <span className="flex-1">{errorMsg}</span>
          </div>
        )}

        {/* 大會服務台現場即時認證專區 (當手機末四碼不符時即時連線) */}
        {phoneMismatchInfo && (
          <div className="rounded-2xl border-2 border-amber-300 bg-amber-50/90 p-4 shadow-md space-y-3">
            <div className="flex items-start gap-2.5">
              <Radio className="text-amber-600 shrink-0 mt-0.5 animate-pulse" size={22} />
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="rounded-full bg-amber-200 px-2.5 py-0.5 text-xs font-black text-amber-950">
                    📡 大會服務台現場即時認證
                  </span>
                  <span className="flex h-2.5 w-2.5 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </span>
                </div>
                <p className="text-xs text-amber-950 font-semibold leading-relaxed">
                  若您近期更換手機號碼，或管委會名冊登記為舊市話：
                </p>
                <div className="rounded-xl bg-white/90 p-2.5 text-xs border border-amber-200 space-y-1 text-slate-700">
                  <div className="flex justify-between">
                    <span>• 登記戶號：</span>
                    <b className="text-indigo-900 font-mono font-black">{phoneMismatchInfo.member.unit_no}（{phoneMismatchInfo.member.owner_name}）</b>
                  </div>
                  <div className="flex justify-between">
                    <span>• 您目前輸入的手機末四碼：</span>
                    <b className="text-rose-600 font-mono font-black">{phoneMismatchInfo.typedPhone}</b>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>• 系統名冊登記之末四碼：</span>
                    <span className="font-mono font-bold">••••（與您輸入的不符）</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-emerald-50 border border-emerald-300 p-3 text-xs text-emerald-950 space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-emerald-800">
                <Clock size={16} className="animate-spin text-emerald-600" />
                <span>已自動向大會服務台發送現場認證請求！</span>
              </div>
              <p className="text-[11px] text-emerald-800 leading-normal">
                請洽現場主委、總幹事或服務台工作人員。<b>服務台從後台管理介面點擊「現場一鍵核准」或「更正手機號碼」，此畫面將 0 秒即時自動開通並進入線上表決！</b>
              </p>
              <div className="pt-1 flex items-center justify-between text-[10px] text-slate-500 border-t border-emerald-200">
                <span>本機識別碼：{getOrCreateDeviceUUID().slice(0, 10)}***</span>
                <span className="text-emerald-700 font-bold flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  服務台即時在線連線中
                </span>
              </div>
            </div>
          </div>
        )}

        {/* 裝置衝突警示 + 一鍵解鎖按鈕 */}
        {deviceAlert?.isLocked && (
          <div className="rounded-2xl border-2 border-rose-300 bg-rose-50 p-4 shadow-sm space-y-2.5">
            <div className="flex items-start gap-2 text-xs text-rose-900">
              <ShieldAlert size={20} className="text-rose-700 shrink-0 mt-0.5" />
              <div>
                <p className="font-black text-sm">此戶號已在其他手機登入！</p>
                <p className="mt-0.5 text-rose-800">
                  戶號【{deviceAlert.unitNo}】已綁定於其他裝置。若您更換了新手機，可點擊下方按鈕重新綁定。
                </p>
              </div>
            </div>

            <UniversalButton
              type="button"
              variant="outline"
              size="md"
              className="w-full border-rose-400 bg-white text-rose-800 hover:bg-rose-100 text-xs font-bold"
              onClick={handleForceUnlockAndLogin}
              icon={<Unlock size={16} />}
            >
              更換新手機 · 解除舊裝置綁定並進入
            </UniversalButton>
          </div>
        )}

        <UniversalButton
          type="submit"
          variant="primary"
          size="xl"
          className="w-full mt-1 bg-indigo-600 hover:bg-indigo-700"
          icon={<LogIn size={22} />}
        >
          確認身分 · 進入線上表決
        </UniversalButton>
      </form>

      {/* 快捷示範測試 */}
      <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-100/60 p-3.5">
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

      {/* 服務台現場核准即時反饋彈窗 */}
      {isApprovedRealtime && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-2xl border-4 border-emerald-500">
            <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 animate-bounce">
              <CheckCheck size={40} />
            </div>
            <h3 className="text-xl font-black text-slate-900">🎉 大會服務台已現場核准！</h3>
            <p className="mt-1 text-sm font-bold text-emerald-800">
              【{isApprovedRealtime.unit_no}】{isApprovedRealtime.owner_name}
            </p>
            <div className="mt-3 rounded-2xl bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-900 font-semibold space-y-1.5 text-left">
              <p className="flex items-center gap-1.5 text-emerald-800">
                <CheckCircle2 size={15} className="shrink-0 text-emerald-600" />
                <span>身分查驗核准：手機末四碼認可開通</span>
              </p>
              <p className="flex items-center gap-1.5 text-emerald-800">
                <CheckCircle2 size={15} className="shrink-0 text-emerald-600" />
                <span>防弊綁定：本機裝置特徵值已綁定</span>
              </p>
              <p className="flex items-center gap-1.5 text-emerald-800">
                <CheckCircle2 size={15} className="shrink-0 text-emerald-600" />
                <span>大會報到成功：權利持分 {isApprovedRealtime.area_ping} 坪</span>
              </p>
            </div>
            <p className="mt-4 text-xs font-bold text-slate-500 animate-pulse">
              🚀 正在自動為您進入線上表決大廳...
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
