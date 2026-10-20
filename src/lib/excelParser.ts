// ====================================================================
// Excel 智慧欄位對照與名冊匯入 / 匯出模組 (SheetJS / xlsx)
// 支援管委會常見的各種區權人清冊格式，自動識別並計算權利坪數權重
// ====================================================================

import * as XLSX from 'xlsx';
import { Member } from '../types';

export interface FieldMapping {
  unit_no: string;
  floor: string;
  owner_name: string;
  phone: string;
  area_ping: string;
  address: string;
}

export interface ExcelParseResult {
  headers: string[];
  rawRows: Record<string, any>[];
  detectedMapping: FieldMapping;
  previewMembers: Partial<Member>[];
}

// 智慧欄位正則匹配器
export function autoDetectFieldMapping(headers: string[]): FieldMapping {
  const mapping: FieldMapping = {
    unit_no: '',
    floor: '',
    owner_name: '',
    phone: '',
    area_ping: '',
    address: '',
  };

  const regexes = {
    unit_no: /戶號|棟別|門牌號|戶別|單位|房號|編號|Unit/i,
    floor: /樓層|樓|Floor|FL/i,
    owner_name: /所有權人|區分所有權人|姓名|戶名|代表|業主|Owner|Name/i,
    phone: /手機|電話|行動電話|聯絡電話|Mobile|Phone/i,
    area_ping: /坪數|面積|專有面積|權狀面積|持分|持分坪數|Area|Ping/i,
    address: /地址|建物地址|登記地址|門牌|Address/i,
  };

  for (const header of headers) {
    const trimmed = header.trim();
    if (!mapping.unit_no && regexes.unit_no.test(trimmed)) mapping.unit_no = header;
    else if (!mapping.floor && regexes.floor.test(trimmed)) mapping.floor = header;
    else if (!mapping.owner_name && regexes.owner_name.test(trimmed)) mapping.owner_name = header;
    else if (!mapping.phone && regexes.phone.test(trimmed)) mapping.phone = header;
    else if (!mapping.area_ping && regexes.area_ping.test(trimmed)) mapping.area_ping = header;
    else if (!mapping.address && regexes.address.test(trimmed)) mapping.address = header;
  }

  // 兜底預設值
  if (!mapping.unit_no && headers.length > 0) mapping.unit_no = headers[0];
  if (!mapping.owner_name && headers.length > 1) mapping.owner_name = headers[1];

  return mapping;
}

// 解析上傳的 Excel 檔案
export async function parseExcelFile(file: File): Promise<ExcelParseResult> {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];

  const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
  if (rawRows.length === 0) {
    throw new Error('Excel 工作表為空或格式無法讀取');
  }

  const headers = Object.keys(rawRows[0]);
  const detectedMapping = autoDetectFieldMapping(headers);

  // 轉換成住戶預覽
  const previewMembers = convertRowsToMembers(rawRows, detectedMapping, 'preview-comm-id');

  return {
    headers,
    rawRows,
    detectedMapping,
    previewMembers,
  };
}

// 根據欄位映射轉換名冊資料
export function convertRowsToMembers(
  rows: Record<string, any>[],
  mapping: FieldMapping,
  communityId: string,
  meetingId?: string
): Member[] {
  // 先計算總坪數
  let totalCalculatedPing = 0;
  const tempItems = rows.map((row, index) => {
    const unitNo = String(row[mapping.unit_no] || `戶別-${index + 1}`).trim();
    const rawFloor = String(row[mapping.floor] || '').trim();
    const ownerName = String(row[mapping.owner_name] || '住戶').trim();
    const rawPhone = String(row[mapping.phone] || '').trim();
    const address = String(row[mapping.address] || '').trim();

    // 坪數清理
    const rawPingStr = String(row[mapping.area_ping] || '0').replace(/[^0-9.]/g, '');
    const ping = parseFloat(rawPingStr) || 30.0; // 若未填寫預設 30 坪

    // 擷取手機末四碼
    const cleanDigits = rawPhone.replace(/\D/g, '');
    const phoneLast4 = cleanDigits.length >= 4 ? cleanDigits.slice(-4) : (1000 + (index % 9000)).toString();

    // 提取樓層
    let floor = rawFloor;
    if (!floor) {
      const match = unitNo.match(/(\d+)F/i) || unitNo.match(/(\d+)樓/);
      floor = match ? `${match[1]}F` : '1F';
    }

    totalCalculatedPing += ping;

    return {
      unitNo,
      floor,
      ownerName,
      phoneLast4,
      phoneFull: rawPhone || undefined,
      address,
      ping,
      index,
    };
  });

  if (totalCalculatedPing === 0) totalCalculatedPing = 1;

  return tempItems.map(item => ({
    id: `mem-import-${Date.now()}-${item.index}`,
    community_id: communityId,
    meeting_id: meetingId,
    unit_no: item.unitNo,
    floor: item.floor,
    owner_name: item.ownerName,
    phone_last4: item.phoneLast4,
    phone_full: item.phoneFull,
    address: item.address,
    area_ping: Number(item.ping.toFixed(2)),
    weight_ratio: Number((item.ping / totalCalculatedPing).toFixed(6)),
    role: 'user',
    is_checked_in: false,
    reset_token: `TOKEN-${item.unitNo}-${item.phoneLast4}`,
    created_at: new Date().toISOString(),
  }));
}

// 匯出名冊為 Excel
export function exportMembersToExcel(members: Member[], communityName: string) {
  const exportData = members.map(m => ({
    '棟別/戶號': m.unit_no,
    '樓層': m.floor,
    '區分所有權人姓名': m.owner_name,
    '手機末四碼(登入碼)': m.phone_last4,
    '權狀坪數': m.area_ping,
    '權利比例權重(%)': (m.weight_ratio * 100).toFixed(4) + '%',
    '報到狀態': m.is_checked_in ? '已報到' : '未報到',
    '報到時間': m.check_in_time ? new Date(m.check_in_time).toLocaleString('zh-TW') : '-',
    '手機裝置綁定': m.bound_device_token ? '已綁定' : '未綁定',
    '專屬登入重置Token': m.reset_token || '-',
    '權狀登記地址': m.address || '',
  }));

  const worksheet = XLSX.utils.json_to_sheet(exportData);

  // 設定欄寬
  worksheet['!cols'] = [
    { wch: 14 }, // 戶號
    { wch: 8 },  // 樓層
    { wch: 18 }, // 姓名
    { wch: 18 }, // 手機末四碼
    { wch: 12 }, // 坪數
    { wch: 16 }, // 權重
    { wch: 10 }, // 報到
    { wch: 20 }, // 報到時間
    { wch: 14 }, // 裝置
    { wch: 24 }, // Token
    { wch: 32 }, // 地址
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, '區分所有權人名冊');

  const fileName = `${communityName}_區權人名冊_權重清冊_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(workbook, fileName);
}
