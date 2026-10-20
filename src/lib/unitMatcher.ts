// ====================================================================
// 戶號智慧正規化與容錯比對模組 (Unit Number Normalizer & Matcher)
// 支援 12F-08 vs 12F-8、12樓之8、A棟-12F-08 等台灣常見門牌表示法
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

  const clean = unitStr.trim().replace(/\s+/g, '');

  // 1. 擷取棟別 (例如 A棟, B-...)
  let block = '';
  let rest = clean;
  const blockMatch = rest.match(/^([A-Za-z0-9]+)[棟\-區](.*)$/);
  if (blockMatch) {
    block = blockMatch[1].toUpperCase();
    rest = blockMatch[2];
  }

  // 2. 擷取樓層 (支援 12F, 12樓, 12fl...)
  let floor = 0;
  const floorMatch = rest.match(/(\d+)\s*(?:[Ff樓]|fl)?/);
  if (floorMatch) {
    floor = parseInt(floorMatch[1], 10);
    rest = rest.slice(floorMatch.index! + floorMatch[0].length);
  }

  // 3. 擷取戶號與之幾 (支援 -08, -8, 之8, 8號, 8-1)
  let room = 0;
  let sub = '';

  // 檢查是否含有之幾 (例如 8之1, 8-1, 08之2)
  const roomSubMatch = rest.match(/[-_之號]?\s*(\d+)(?:[-_之號](\d+))?/);
  if (roomSubMatch) {
    room = parseInt(roomSubMatch[1], 10);
    if (roomSubMatch[2]) {
      sub = roomSubMatch[2];
    }
  }

  // 組合正規化字串 (省略前綴0，例如 12F-08 轉為 12F-8)
  const blockPrefix = block && block !== '全區' ? `${block}-` : '';
  const subSuffix = sub ? `之${sub}` : '';
  const normalized = `${blockPrefix}${floor}F-${room}${subSuffix}`;

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
 * 能夠精準匹配 12F-08 與 12F-8、12樓8號 與 12F-08
 */
export function isUnitMatch(unitA: string, unitB: string): boolean {
  if (!unitA || !unitB) return false;

  const cleanA = unitA.trim().toUpperCase();
  const cleanB = unitB.trim().toUpperCase();

  // 完全相等 (最快路徑)
  if (cleanA === cleanB) return true;

  // 包含比對
  if (cleanA.includes(cleanB) || cleanB.includes(cleanA)) return true;

  // 結構化語意解析比對 (解決 08 vs 8、樓層與符號差異)
  const parsedA = parseUnitString(cleanA);
  const parsedB = parseUnitString(cleanB);

  // 只要樓層或房號為0則無法結構比對，退回一般字串
  if (parsedA.floor === 0 || parsedB.floor === 0 || parsedA.room === 0 || parsedB.room === 0) {
    return cleanA.replace(/[^A-Z0-9]/g, '') === cleanB.replace(/[^A-Z0-9]/g, '');
  }

  // 棟別比對 (若任一方為全區/無棟別，則視為通用)
  const blockMatches = !parsedA.block || !parsedB.block || parsedA.block === parsedB.block;
  const floorMatches = parsedA.floor === parsedB.floor;
  const roomMatches = parsedA.room === parsedB.room;
  const subMatches = (!parsedA.sub && !parsedB.sub) || parsedA.sub === parsedB.sub;

  return blockMatches && floorMatches && roomMatches && subMatches;
}
