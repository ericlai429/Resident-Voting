// ====================================================================
// 戶號智慧正規化與容錯比對模組 (Unit Number Normalizer & Matcher)
// 支援 12F-08 vs 12F-8、12樓8號、12樓之8、A棟-12F-08 等台灣常見門牌表示法
// 嚴格杜絕 12F-1 誤認 12F-15、2F-1 誤認 12F-1 等子字串包含誤判
// ====================================================================

export interface ParsedUnit {
  block: string;   // 棟別 (例如 'A' 或 '' 全區)
  floor: number;   // 樓層 (例如 12)
  room: number;    // 戶號 (例如 8 或 15)
  sub: string;     // 之幾 (例如 '1', '2' 或 '')
  normalized: string; // 標準字串 (例如 '12F-8' 或 'A-12F-8')
}

export function parseUnitString(unitStr: string): ParsedUnit {
  if (!unitStr) {
    return { block: '', floor: 0, room: 0, sub: '', normalized: '' };
  }

  const clean = unitStr.trim().replace(/\s+/g, '').toUpperCase();
  let block = '';
  let rest = clean;

  // 0. 處理「全區」前綴
  if (rest.startsWith('全區')) {
    rest = rest.replace(/^全區[-_]?/, '');
  }

  // 1. 擷取明確棟別 (例如 A棟, 1棟, A區, A-, 或單一英文字母前綴 A12F)
  const blockMatch = rest.match(/^([A-Z0-9\u4e00-\u9fa5]+)[棟區](.*)$/) || rest.match(/^([A-Z])-(\d+.*)$/);
  if (blockMatch) {
    const rawBlock = blockMatch[1];
    if (rawBlock !== '全' && rawBlock !== '全區') {
      block = rawBlock;
    }
    rest = blockMatch[2];
  } else {
    // 檢查英文字母後緊接樓層者 (例如 A12F-8, A12樓8)
    const letterPrefixMatch = rest.match(/^([A-Z])(\d+[F樓].*)$/);
    if (letterPrefixMatch) {
      block = letterPrefixMatch[1];
      rest = letterPrefixMatch[2];
    }
  }

  // 清除樓層前可能遺留的連接符 (例如 A棟-12F-08 中的 -)
  rest = rest.replace(/^[-_]+/, '');

  // 2. 擷取樓層 (支援 12F, 12樓, 12FL, 12-)
  let floor = 0;
  const floorMatch = rest.match(/^(\d+)(?:[F樓]|FL|fl)?[-_之號]?(.*)$/);
  if (floorMatch) {
    floor = parseInt(floorMatch[1], 10);
    rest = floorMatch[2];
  }

  // 3. 擷取戶號與之幾 (支援 08, 8, 8之1, 8-1, 08-2, 8號之1)
  let room = 0;
  let sub = '';

  // 清除房號前的符號
  rest = rest.replace(/^[-_之號]+/, '');
  const roomMatch = rest.match(/^(\d+)(?:[-_之號]+(\d+))?/);
  if (roomMatch) {
    room = parseInt(roomMatch[1], 10);
    if (roomMatch[2]) {
      // 正規化子戶號 (去除前綴0，如 01 -> 1)
      sub = String(parseInt(roomMatch[2], 10));
    }
  }

  // 組合正規化字串 (省略前綴0，例如 12F-08 轉為 12F-8)
  const blockPrefix = block && block !== '全區' ? `${block}-` : '';
  const subSuffix = sub ? `之${sub}` : '';
  const normalized = floor > 0 && room > 0 ? `${blockPrefix}${floor}F-${room}${subSuffix}` : clean;

  return {
    block,
    floor,
    room,
    sub,
    normalized,
  };
}

/**
 * 智慧容錯比對兩個戶號字串是否為同一戶
 * 100% 精準匹配 12F-08 與 12F-8、12樓8號、12樓之8
 * 徹底禁止模糊 includes 比對，杜絕 12F-1 誤認 12F-15 或 2F-1 誤認 12F-1
 */
export function isUnitMatch(unitA: string, unitB: string): boolean {
  if (!unitA || !unitB) return false;

  const parsedA = parseUnitString(unitA);
  const parsedB = parseUnitString(unitB);

  // 雙方皆成功解析出樓層與戶號：進行語意與法定持分戶號精準比對
  if (parsedA.floor > 0 && parsedA.room > 0 && parsedB.floor > 0 && parsedB.room > 0) {
    // 棟別比對：任一方為「全區」或無棟別前綴時視為通用兼容，否則必須嚴格相等
    const blockMatches =
      (!parsedA.block || parsedA.block === '全區') ||
      (!parsedB.block || parsedB.block === '全區')
        ? true
        : parsedA.block === parsedB.block;

    const floorMatches = parsedA.floor === parsedB.floor;
    const roomMatches = parsedA.room === parsedB.room;
    const subMatches = parsedA.sub === parsedB.sub;

    return blockMatches && floorMatches && roomMatches && subMatches;
  }

  // 若非標準樓戶格式，退回嚴格純文字淨化比對 (移除所有非英數字符號後全等比對)
  const cleanA = unitA.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  const cleanB = unitB.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  return cleanA === cleanB;
}
