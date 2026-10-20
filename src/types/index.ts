// ====================================================================
// 社區區權會手機投票系統 - TypeScript 型別定義
// ====================================================================

export type UserRole = 'user' | 'admin' | 'admin1' | 'admin2';

export interface Community {
  id: string;
  code: string;               // 如 C-001
  name: string;               // 如 台北信義之星社區
  address: string;
  total_units: number;
  total_area_ping: number;
  contact_name?: string;
  contact_phone?: string;
  created_at: string;
}

export interface Meeting {
  id: string;
  community_id: string;
  title: string;              // 會議標題 (如: 115年度第1次區分所有權人會議)
  meeting_date: string;       // YYYY-MM-DD
  location: string;           // B1多功能會議室
  pin_code: string;           // 當日 4 位數 PIN 碼
  pin_expires_at: string;     // ISO string (當日 23:59:59)
  is_active: boolean;
  banner_url?: string;
  result_hash?: string;
  created_at: string;
}

export interface Member {
  id: string;
  community_id: string;
  meeting_id?: string;
  unit_no: string;            // 戶號，如: A棟-12F
  floor: string;              // 樓層，如: 12F
  owner_name: string;         // 所有權人姓名
  phone_last4: string;        // 手機末四碼
  phone_full?: string;        // 完整電話
  address?: string;           // 權狀地址
  area_ping: number;          // 專有+公設持分坪數
  weight_ratio: number;       // 權利持分比例 (例如: 0.003500)
  bound_device_token?: string;// 綁定之手機特徵 UUID
  is_checked_in: boolean;     // 報到狀態
  check_in_time?: string;
  reset_token?: string;       // 個人專屬 QR 碼登入 Token
  role: UserRole;
  created_at: string;
}

export type TopicVoteType = 'yes_no' | 'multiple_choice';
export type TopicStatus = 'draft' | 'open' | 'closed';

export interface TopicOption {
  id: string;
  topic_id: string;
  option_key: string;         // 'YES', 'NO', 'ABSTAIN' 或 'A', 'B', 'C'
  option_label: string;       // '贊成', '反對', '方案一(採購A牌)'
  order_num: number;
}

export interface Topic {
  id: string;
  meeting_id: string;
  order_num: number;
  title: string;
  description?: string;
  vote_type: TopicVoteType;
  status: TopicStatus;
  options?: TopicOption[];
  created_at: string;
}

export interface Vote {
  id: string;
  topic_id: string;
  member_id: string;
  option_id: string;
  voted_weight: number;       // 投票當下的坪數快照
  voted_at: string;
}

// 投票結果聚合統計
export interface TopicVoteStats {
  topic_id: string;
  total_votes: number;
  total_voted_weight: number;
  voted_member_ids: string[];
  options_stats: {
    option_id: string;
    option_key: string;
    option_label: string;
    vote_count: number;
    vote_weight: number;
    count_percentage: number;
    weight_percentage: number;
  }[];
  passed?: boolean;           // 判定是否通過雙門檻
  decision_summary?: string;  // 例如「決議通過」或「由方案一勝出」
}

// 高密度 QR Code 離線封裝 Payload
export interface MeetingResultPayload {
  version: string;
  communityName: string;
  meetingTitle: string;
  meetingDate: string;
  location: string;
  stats: {
    totalUnits: number;
    attendees: number;
    attendanceRate: string;
    totalPing: number;
    attendedPing: number;
    pingRate: string;
  };
  topics: {
    order: number;
    title: string;
    type: string;
    decision: string;
    options: {
      label: string;
      votes: number;
      weight: number;
      percent: string;
    }[];
  }[];
  signature: string;          // 數位校驗碼
  generatedAt: string;
}

// OCR 辨識結果
export interface OcrResolutionItem {
  topic: string;
  yes: string;
  no: string;
  abstain?: string;
  decision: string;
}

export interface OcrMeetingRecord {
  title: string;
  date: string;
  location: string;
  resolutions: OcrResolutionItem[];
  rawText: string;
}

// 通用設計視覺設定 (Universal Design Accessibility)
export interface AccessibilitySettings {
  fontSize: 'normal' | 'large' | 'extra-large';
  highContrast: boolean;
  hapticFeedback: boolean;
}
