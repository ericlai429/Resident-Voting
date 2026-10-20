import React, { useState } from 'react';
import { Member, Community } from '../types';
import { getMembers, saveMembers } from '../lib/storage';
import {
  parseExcelFile,
  convertRowsToMembers,
  exportMembersToExcel,
  FieldMapping,
  ExcelParseResult,
} from '../lib/excelParser';
import { UniversalButton } from '../components/UniversalButton';
import {
  FileSpreadsheet,
  Upload,
  Download,
  CheckCircle,
  AlertCircle,
  Search,
  Check,
  Smartphone,
  Shield,
  FileCheck2,
} from 'lucide-react';

interface MemberManagementProps {
  community: Community;
  onRefreshData: () => void;
}

export const MemberManagement: React.FC<MemberManagementProps> = ({
  community,
  onRefreshData,
}) => {
  const [members, setMembers] = useState<Member[]>(() => getMembers(community.id));
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCheckIn, setFilterCheckIn] = useState<'all' | 'checked' | 'unchecked'>('all');

  // Excel 解析與映射狀態
  const [parseResult, setParseResult] = useState<ExcelParseResult | null>(null);
  const [customMapping, setCustomMapping] = useState<FieldMapping | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const refreshList = () => {
    const list = getMembers(community.id);
    setMembers(list);
    onRefreshData();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await parseExcelFile(file);
      setParseResult(res);
      setCustomMapping(res.detectedMapping);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(`讀取 Excel 失敗: ${msg}`);
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleConfirmImport = () => {
    if (!parseResult || !customMapping) return;

    try {
      const importedMembers = convertRowsToMembers(
        parseResult.rawRows,
        customMapping,
        community.id
      );

      saveMembers(importedMembers);
      setMembers(importedMembers);
      setParseResult(null);
      setCustomMapping(null);
      setSuccessMsg(`🎉 成功匯入 ${importedMembers.length} 筆住戶區權人清冊！已精準依各戶權狀計算持分權重。`);
      onRefreshData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(`匯入名冊失敗: ${msg}`);
    }
  };

  const handleExportExcel = () => {
    exportMembersToExcel(members, community.name);
  };

  // 篩選列表
  const filtered = members.filter((m) => {
    const matchQuery =
      m.unit_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.owner_name.includes(searchQuery) ||
      m.phone_last4.includes(searchQuery);

    if (!matchQuery) return false;
    if (filterCheckIn === 'checked') return m.is_checked_in;
    if (filterCheckIn === 'unchecked') return !m.is_checked_in;
    return true;
  });

  const checkedCount = members.filter((m) => m.is_checked_in).length;
  const totalPing = members.reduce((sum, m) => sum + m.area_ping, 0);
  const checkedPing = members
    .filter((m) => m.is_checked_in)
    .reduce((sum, m) => sum + m.area_ping, 0);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:py-10 space-y-6">
      {/* 頂部標題與統計 */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-white p-6 shadow-md border border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="rounded-full bg-emerald-100 text-emerald-800 px-3 py-0.5 text-xs font-bold">
              住戶清冊管理
            </span>
            <span className="text-xs text-slate-500 font-semibold">{community.name}</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900">
            Excel 智慧名冊匯入與法定坪數權重核算
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            依據台灣《公寓大廈管理條例》專有及持分面積計算權利比率，支援自訂欄位對齊
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-md shadow-indigo-200 hover:bg-indigo-700 active:scale-95 transition-all">
            <Upload size={18} />
            <span>匯入 Excel 區權人清冊</span>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={handleFileUpload}
            />
          </label>

          <UniversalButton
            variant="outline"
            size="md"
            onClick={handleExportExcel}
            icon={<Download size={18} />}
          >
            匯出名冊清冊 (.xlsx)
          </UniversalButton>
        </div>
      </div>

      {/* 統計指標卡片 */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl bg-white p-4 shadow-sm border border-slate-200">
          <span className="text-xs text-slate-500 block">名冊總戶數</span>
          <span className="text-2xl font-black text-slate-900">{members.length} 戶</span>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-sm border border-slate-200">
          <span className="text-xs text-slate-500 block">現場已報到戶數</span>
          <span className="text-2xl font-black text-emerald-600">
            {checkedCount} 戶 ({members.length > 0 ? ((checkedCount / members.length) * 100).toFixed(1) : 0}%)
          </span>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-sm border border-slate-200">
          <span className="text-xs text-slate-500 block">登記總權狀坪數</span>
          <span className="text-2xl font-black text-slate-900">{totalPing.toFixed(1)} 坪</span>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-sm border border-slate-200">
          <span className="text-xs text-slate-500 block">已出席持分權重</span>
          <span className="text-2xl font-black text-indigo-700">
            {checkedPing.toFixed(1)} 坪 ({totalPing > 0 ? ((checkedPing / totalPing) * 100).toFixed(1) : 0}%)
          </span>
        </div>
      </div>

      {/* 訊息反饋 */}
      {errorMsg && (
        <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4 text-sm text-rose-800 flex items-center gap-2">
          <AlertCircle size={20} className="text-rose-600 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-sm text-emerald-800 flex items-center gap-2">
          <CheckCircle size={20} className="text-emerald-600 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Excel 欄位智能映射確認面板 */}
      {parseResult && customMapping && (
        <div className="rounded-3xl bg-indigo-50/80 border-2 border-indigo-300 p-6 shadow-xl space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileCheck2 size={24} className="text-indigo-600" />
              <h3 className="text-lg font-black text-indigo-950">
                Excel 欄位智慧判別與對照確認
              </h3>
            </div>
            <span className="text-xs font-semibold text-indigo-700 bg-indigo-100 px-3 py-1 rounded-full">
              已偵測到 {parseResult.rawRows.length} 筆資料
            </span>
          </div>

          <p className="text-xs sm:text-sm text-slate-600">
            系統已運用正則表達式自動映射您的 Excel 標題欄位。請核對以下欄位對應是否正確，亦可手動調整：
          </p>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                戶號 / 棟別欄位 *
              </label>
              <select
                value={customMapping.unit_no}
                onChange={(e) => setCustomMapping({ ...customMapping, unit_no: e.target.value })}
                className="w-full rounded-xl border border-indigo-200 bg-white p-2 text-xs font-bold"
              >
                {parseResult.headers.map((h) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                區分所有權人姓名 *
              </label>
              <select
                value={customMapping.owner_name}
                onChange={(e) => setCustomMapping({ ...customMapping, owner_name: e.target.value })}
                className="w-full rounded-xl border border-indigo-200 bg-white p-2 text-xs font-bold"
              >
                {parseResult.headers.map((h) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                手機號碼 (自動取末四碼) *
              </label>
              <select
                value={customMapping.phone}
                onChange={(e) => setCustomMapping({ ...customMapping, phone: e.target.value })}
                className="w-full rounded-xl border border-indigo-200 bg-white p-2 text-xs font-bold"
              >
                <option value="">(無)</option>
                {parseResult.headers.map((h) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                權狀持分坪數 *
              </label>
              <select
                value={customMapping.area_ping}
                onChange={(e) => setCustomMapping({ ...customMapping, area_ping: e.target.value })}
                className="w-full rounded-xl border border-indigo-200 bg-white p-2 text-xs font-bold"
              >
                <option value="">(無 - 預設每戶30坪)</option>
                {parseResult.headers.map((h) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                樓層 (選填)
              </label>
              <select
                value={customMapping.floor}
                onChange={(e) => setCustomMapping({ ...customMapping, floor: e.target.value })}
                className="w-full rounded-xl border border-indigo-200 bg-white p-2 text-xs font-bold"
              >
                <option value="">(無 - 自戶號推算)</option>
                {parseResult.headers.map((h) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                登記地址 (選填)
              </label>
              <select
                value={customMapping.address}
                onChange={(e) => setCustomMapping({ ...customMapping, address: e.target.value })}
                className="w-full rounded-xl border border-indigo-200 bg-white p-2 text-xs font-bold"
              >
                <option value="">(無)</option>
                {parseResult.headers.map((h) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-2.5 pt-2">
            <UniversalButton
              variant="success"
              size="md"
              onClick={handleConfirmImport}
              icon={<Check size={18} />}
            >
              確認無誤，將資料寫入大會名冊
            </UniversalButton>
            <UniversalButton
              variant="outline"
              size="md"
              onClick={() => {
                setParseResult(null);
                setCustomMapping(null);
              }}
            >
              取消
            </UniversalButton>
          </div>
        </div>
      )}

      {/* 名冊搜尋與過濾 */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[260px]">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="搜尋戶號 (如: 12F-15)、姓名或末四碼..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-2xl border border-slate-300 pl-10 pr-4 py-2.5 text-sm focus:border-indigo-600 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-white p-1 text-xs font-bold text-slate-600">
          <button
            onClick={() => setFilterCheckIn('all')}
            className={`rounded-xl px-3 py-1.5 ${filterCheckIn === 'all' ? 'bg-indigo-600 text-white' : 'hover:bg-slate-100'}`}
          >
            全部 ({members.length})
          </button>
          <button
            onClick={() => setFilterCheckIn('checked')}
            className={`rounded-xl px-3 py-1.5 ${filterCheckIn === 'checked' ? 'bg-emerald-600 text-white' : 'hover:bg-slate-100'}`}
          >
            已報到 ({checkedCount})
          </button>
          <button
            onClick={() => setFilterCheckIn('unchecked')}
            className={`rounded-xl px-3 py-1.5 ${filterCheckIn === 'unchecked' ? 'bg-slate-800 text-white' : 'hover:bg-slate-100'}`}
          >
            未報到 ({members.length - checkedCount})
          </button>
        </div>
      </div>

      {/* 名冊表格展示 */}
      <div className="overflow-hidden rounded-3xl bg-white shadow-md border border-slate-200">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-100/80 text-xs font-bold uppercase tracking-wider text-slate-700">
              <tr>
                <th className="px-4 py-3.5">戶號 / 樓層</th>
                <th className="px-4 py-3.5">所有權人</th>
                <th className="px-4 py-3.5">手機末四碼</th>
                <th className="px-4 py-3.5">持分坪數</th>
                <th className="px-4 py-3.5">法定權利比率(%)</th>
                <th className="px-4 py-3.5">報到狀態</th>
                <th className="px-4 py-3.5">手機綁定</th>
                <th className="px-4 py-3.5">身分角色</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.slice(0, 100).map((m) => (
                <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-3 font-bold text-slate-900">
                    {m.unit_no}
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-800">
                    {m.owner_name}
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-700">
                    {m.phone_last4}
                  </td>
                  <td className="px-4 py-3 font-bold text-slate-900">
                    {m.area_ping} 坪
                  </td>
                  <td className="px-4 py-3 font-bold text-indigo-700">
                    {(m.weight_ratio * 100).toFixed(4)}%
                  </td>
                  <td className="px-4 py-3">
                    {m.is_checked_in ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                        <Check size={12} />
                        已報到
                      </span>
                    ) : (
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-500">
                        未報到
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {m.bound_device_token ? (
                      <span className="text-indigo-600 font-semibold flex items-center gap-1">
                        <Smartphone size={12} />
                        已鎖定
                      </span>
                    ) : (
                      <span className="text-slate-400">未鎖定</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-md px-2 py-0.5 text-xs font-bold ${
                        m.role === 'admin'
                          ? 'bg-purple-100 text-purple-800'
                          : m.role === 'admin1'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {m.role}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filtered.length > 100 && (
          <div className="bg-slate-50 p-3 text-center text-xs text-slate-500 font-semibold">
            為維持介面極速順暢，列表目前顯示前 100 筆，總計有 {filtered.length} 筆資料（可透過上方搜尋框快速查找任意戶別）
          </div>
        )}
      </div>
    </div>
  );
};
