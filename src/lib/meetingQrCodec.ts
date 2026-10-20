// ====================================================================
// 會議結果高密度 QR Code 壓縮封裝與還原模組 (LZ-String)
// 將整場會議的出席統計、所有議案表決票數與坪數權重決議結果壓縮成單一 QR 碼
// 住戶或稽核人員免上網掃碼即可 100% 還原大會紀錄
// ====================================================================

import LZString from 'lz-string';
import { MeetingResultPayload, Meeting, Topic, Community } from '../types';
import { calculateTopicStats, getMembers } from './storage';

// 產生數位簽章簡易指紋
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

// 壓縮成 QR Code 內容字串 (前綴 MTG:)
export function encodeMeetingResult(payload: MeetingResultPayload): string {
  const jsonStr = JSON.stringify(payload);
  const compressed = LZString.compressToEncodedURIComponent(jsonStr);
  return 'MTG:' + compressed;
}

// 掃描還原
export function decodeMeetingResult(rawQrText: string): MeetingResultPayload | null {
  if (!rawQrText) return null;
  const clean = rawQrText.trim();
  if (!clean.startsWith('MTG:')) return null;

  try {
    const compressed = clean.replace('MTG:', '');
    const decompressed = LZString.decompressFromEncodedURIComponent(compressed);
    if (!decompressed) return null;
    return JSON.parse(decompressed) as MeetingResultPayload;
  } catch (err) {
    console.error('解碼會議 QR 碼失敗:', err);
    return null;
  }
}
