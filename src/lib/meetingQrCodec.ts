// ====================================================================
// 會議結果高密度 QR Code 壓縮封裝與還原模組 (LZ-String)
// 同時相容「純離線資料」與「iPhone相機/LINE掃碼直開網址」
// ====================================================================

import LZString from 'lz-string';
import { MeetingResultPayload, Meeting, Topic, Community } from '../types';
import { calculateTopicStats, getMembers } from './storage';

function generateHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(16).toUpperCase().padStart(8, '0');
}

// 根據當前會議建立結構化結果負載
export function buildMeetingResultPayload(
  community: Community,
  meeting: Meeting,
  topics: Topic[]
): MeetingResultPayload {
  const members = getMembers(community.id);
  const checkedInMembers = members.filter(m => m.is_checked_in);
  const totalUnits = members.length || community.total_units || 1;
  const attendees = checkedInMembers.length;
  const attendanceRate = ((attendees / totalUnits) * 100).toFixed(1) + '%';

  const totalPing = members.reduce((sum, m) => sum + m.area_ping, 0) || community.total_area_ping || 1;
  const attendedPing = checkedInMembers.reduce((sum, m) => sum + m.area_ping, 0);
  const pingRate = ((attendedPing / totalPing) * 100).toFixed(1) + '%';

  const topicsSummary = topics.map(topic => {
    const stats = calculateTopicStats(topic, totalPing, totalUnits);
    return {
      order: topic.order_num,
      title: topic.title,
      type: topic.vote_type,
      decision: stats.decision_summary || '已結算',
      options: stats.options_stats.map(opt => ({
        label: opt.option_label,
        votes: opt.vote_count,
        weight: opt.vote_weight,
        percent: `${opt.count_percentage}% (${opt.weight_percentage}%權重)`,
      })),
    };
  });

  const payload: MeetingResultPayload = {
    version: '1.0',
    communityName: community.name,
    meetingTitle: meeting.title,
    meetingDate: meeting.meeting_date,
    location: meeting.location,
    stats: {
      totalUnits,
      attendees,
      attendanceRate,
      totalPing: Number(totalPing.toFixed(1)),
      attendedPing: Number(attendedPing.toFixed(1)),
      pingRate,
    },
    topics: topicsSummary,
    signature: '',
    generatedAt: new Date().toISOString(),
  };

  payload.signature = generateHash(JSON.stringify(payload));
  return payload;
}

// 輕量化壓縮物件 (縮減欄位長度，讓 QR Code 點陣更稀疏、手機更容易秒讀)
function toCompactJson(p: MeetingResultPayload): string {
  const compact = {
    c: p.communityName,
    t: p.meetingTitle,
    d: p.meetingDate,
    l: p.location,
    s: [p.stats.totalUnits, p.stats.attendees, p.stats.attendanceRate, p.stats.totalPing, p.stats.attendedPing, p.stats.pingRate],
    r: p.topics.map(t => ({
      o: t.order,
      t: t.title,
      d: t.decision,
      opts: t.options.map(o => [o.label, o.votes, o.weight, o.percent]),
    })),
    sig: p.signature,
  };
  return JSON.stringify(compact);
}

function fromCompactJson(compact: any): MeetingResultPayload {
  return {
    version: '1.0',
    communityName: compact.c,
    meetingTitle: compact.t,
    meetingDate: compact.d,
    location: compact.l,
    stats: {
      totalUnits: compact.s[0],
      attendees: compact.s[1],
      attendanceRate: compact.s[2],
      totalPing: compact.s[3],
      attendedPing: compact.s[4],
      pingRate: compact.s[5],
    },
    topics: compact.r.map((r: any) => ({
      order: r.o,
      title: r.t,
      type: 'yes_no',
      decision: r.d,
      options: r.opts.map((opt: any) => ({
        label: opt[0],
        votes: opt[1],
        weight: opt[2],
        percent: opt[3],
      })),
    })),
    signature: compact.sig,
    generatedAt: new Date().toISOString(),
  };
}

// 壓縮成 QR Code 內容字串
// 輸出 Universal URL (格式：https://.../#res=MTG:...)
// 這樣「iPhone 內建相機」能直接辨識為網址點開；「系統內相機」也能直接解碼！
export function encodeMeetingResult(payload: MeetingResultPayload): string {
  const compactJson = toCompactJson(payload);
  const compressed = LZString.compressToEncodedURIComponent(compactJson);
  const token = 'MTG:' + compressed;

  // 取得當前網頁基礎網址 (例如：https://ericlai429.github.io/Resident-Voting/)
  if (typeof window !== 'undefined') {
    const baseUrl = window.location.origin + window.location.pathname;
    return `${baseUrl}#res=${token}`;
  }

  return token;
}

// 掃描還原 (同時相容：完整 URL、#res=...、?res=... 與純 MTG: 代碼)
export function decodeMeetingResult(rawQrText: string): MeetingResultPayload | null {
  if (!rawQrText) return null;
  let clean = rawQrText.trim();

  // 1. 若是 URL，擷取 #res= 或 ?res= 後面的密碼串
  if (clean.includes('#res=')) {
    clean = clean.split('#res=')[1];
  } else if (clean.includes('?res=')) {
    clean = clean.split('?res=')[1].split('&')[0];
  }

  // 2. 檢驗並移除 MTG: 前綴
  if (clean.startsWith('MTG:')) {
    clean = clean.replace('MTG:', '');
  }

  try {
    // 先以 LZString 解壓縮
    let decompressed = LZString.decompressFromEncodedURIComponent(clean);
    if (!decompressed) {
      // 容錯嘗試 decodeURIComponent 再解壓
      try {
        decompressed = LZString.decompressFromEncodedURIComponent(decodeURIComponent(clean));
      } catch {}
    }

    if (!decompressed) return null;

    const parsed = JSON.parse(decompressed);

    // 判斷是否為輕量化格式
    if (parsed.c && parsed.t && parsed.r) {
      return fromCompactJson(parsed);
    }

    // 或是原始標準格式
    return parsed as MeetingResultPayload;
  } catch (err) {
    console.error('解碼會議 QR 碼失敗:', err);
    return null;
  }
}
