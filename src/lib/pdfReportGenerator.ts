// ====================================================================
// A3 橫式區權會決議簡報與法定紀錄產生器
// 依據台灣《公寓大廈管理條例》格式排版 (297mm × 420mm A3 橫向)
// ====================================================================

import { Community, Meeting, Topic } from '../types';
import { calculateTopicStats, getMembers } from './storage';

export interface ReportData {
  community: Community;
  meeting: Meeting;
  topics: Topic[];
  chairman: string;
  recorder: string;
  totalUnits: number;
  attendedUnits: number;
  unitAttendanceRate: string;
  totalPing: number;
  attendedPing: number;
  pingAttendanceRate: string;
  isQuorumMet: boolean;
  topicReports: {
    order: number;
    title: string;
    description: string;
    voteType: string;
    totalVotes: number;
    totalWeight: number;
    options: {
      label: string;
      votes: number;
      weight: number;
      votePct: string;
      weightPct: string;
    }[];
    decision: string;
    passed: boolean;
  }[];
}

export function compileMeetingReportData(
  community: Community,
  meeting: Meeting,
  topics: Topic[],
  chairman = '陳志明 主任委員',
  recorder = '張家豪 總幹事'
): ReportData {
  const members = getMembers(community.id);
  const checkedIn = members.filter(m => m.is_checked_in);

  const totalUnits = members.length || community.total_units || 1;
  const attendedUnits = checkedIn.length;
  const unitRate = ((attendedUnits / totalUnits) * 100).toFixed(2);

  const totalPing = members.reduce((sum, m) => sum + m.area_ping, 0) || community.total_area_ping || 1;
  const attendedPing = checkedIn.reduce((sum, m) => sum + m.area_ping, 0);
  const pingRate = ((attendedPing / totalPing) * 100).toFixed(2);

  // 公寓大廈管理條例法定出席門檻通常為 1/2 或 2/3 (此處以出席過半為法定指標)
  const isQuorumMet = attendedUnits >= totalUnits * 0.5 && attendedPing >= totalPing * 0.5;

  const topicReports = topics.map(topic => {
    const stats = calculateTopicStats(topic, totalPing, totalUnits);
    return {
      order: topic.order_num,
      title: topic.title,
      description: topic.description || '',
      voteType: topic.vote_type,
      totalVotes: stats.total_votes,
      totalWeight: stats.total_voted_weight,
      options: stats.options_stats.map(opt => ({
        label: opt.option_label,
        votes: opt.vote_count,
        weight: opt.vote_weight,
        votePct: opt.count_percentage + '%',
        weightPct: opt.weight_percentage + '%',
      })),
      decision: stats.decision_summary || '已封票結算',
      passed: !!stats.passed,
    };
  });

  return {
    community,
    meeting,
    topics,
    chairman,
    recorder,
    totalUnits,
    attendedUnits,
    unitAttendanceRate: unitRate + '%',
    totalPing: Number(totalPing.toFixed(2)),
    attendedPing: Number(attendedPing.toFixed(2)),
    pingAttendanceRate: pingRate + '%',
    isQuorumMet,
    topicReports,
  };
}

// 觸發原生 A3 橫向高解析列印
export function triggerA3Print() {
  window.print();
}
