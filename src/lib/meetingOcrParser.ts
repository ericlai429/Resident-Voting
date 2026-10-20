// ====================================================================
// 手機相機 OCR 文字智慧正規化解析器
// 針對拍攝紙本 A3/A4 區權會決議簡報或投影布幕進行模式提取
// ====================================================================

import { OcrMeetingRecord, OcrResolutionItem } from '../types';

export function parseMeetingOcrText(rawText: string): OcrMeetingRecord {
  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);

  let title = '';
  let date = '';
  let location = '';
  const resolutions: OcrResolutionItem[] = [];

  for (const line of lines) {
    // 匹配會議名稱
    if (/會議名稱|大會主題|開會事由|區分所有權人/.test(line)) {
      const cleaned = line.replace(/.*[：:]/, '').trim();
      if (cleaned && !title) title = cleaned;
    }
    // 匹配開會日期
    else if (/開會時間|會議日期|開會日期|大會日期/.test(line)) {
      const match = line.match(/(?:[0-9]{2,4}[-/年.][0-9]{1,2}[-/月.][0-9]{1,2})/);
      if (match) {
        date = match[0];
      } else {
        const cleaned = line.replace(/.*[：:]/, '').trim();
        if (cleaned) date = cleaned;
      }
    }
    // 匹配地點
    else if (/開會地點|會議地點|地點/.test(line)) {
      const cleaned = line.replace(/.*[：:]/, '').trim();
      if (cleaned && !location) location = cleaned;
    }
  }

  // 兜底預設值
  if (!title) {
    const firstLine = lines.find(l => l.includes('會議') || l.includes('大會') || l.includes('社區'));
    title = firstLine || '區分所有權人會議決議紀錄 (OCR辨識)';
  }

  // 議案區塊解析 (匹配：第一案 / 案由 ... 贊成 XX 反對 XX 決議 通過/不通過)
  const topicSplitRegex = /(?:第\s*[\d一二三四五六七八九十]+\s*案|議案\s*[\d一二三四五六七八九十]+|案由[：:])/g;
  const matches: { index: number; text: string }[] = [];
  let m: RegExpExecArray | null;

  while ((m = topicSplitRegex.exec(rawText)) !== null) {
    matches.push({ index: m.index, text: m[0] });
  }

  if (matches.length > 0) {
    for (let i = 0; i < matches.length; i++) {
      const start = matches[i].index;
      const end = i + 1 < matches.length ? matches[i + 1].index : rawText.length;
      const block = rawText.substring(start, end);

      const firstLine = block.split('\n')[0] || '';
      const yesMatch = block.match(/贊成[：:\s]*([\d.]+%?|\d+[\s]*票|\d+)/);
      const noMatch = block.match(/反對[：:\s]*([\d.]+%?|\d+[\s]*票|\d+)/);
      const abstainMatch = block.match(/棄權[：:\s]*([\d.]+%?|\d+[\s]*票|\d+)/);
      const decisionMatch = block.match(/決議[：:\s]*(通過|照案通過|不通過|否決|照修正案通過|由[^\n]+得標)/);

      resolutions.push({
        topic: firstLine.substring(0, 50),
        yes: yesMatch ? yesMatch[1].trim() : '-',
        no: noMatch ? noMatch[1].trim() : '-',
        abstain: abstainMatch ? abstainMatch[1].trim() : undefined,
        decision: decisionMatch ? decisionMatch[1].trim() : '已結算',
      });
    }
  } else {
    // 若沒有明確的案號標題，從文字中搜尋票數與決議關鍵詞行
    for (const line of lines) {
      if (/贊成|反對|決議/i.test(line)) {
        const yesMatch = line.match(/贊成[：:\s]*([\d.]+%?|\d+票?)/);
        const noMatch = line.match(/反對[：:\s]*([\d.]+%?|\d+票?)/);
        const decisionMatch = line.match(/決議[：:\s]*(通過|不通過|否決)/);

        if (yesMatch || noMatch || decisionMatch) {
          resolutions.push({
            topic: line.substring(0, 40),
            yes: yesMatch ? yesMatch[1] : '-',
            no: noMatch ? noMatch[1] : '-',
            decision: decisionMatch ? decisionMatch[1] : '待確認',
          });
        }
      }
    }
  }

  return {
    title,
    date: date || new Date().toISOString().split('T')[0],
    location: location || '社區會議室',
    resolutions,
    rawText,
  };
}
