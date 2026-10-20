// ====================================================================
// 本機優先存儲與資料狀態管理 (Local-First & Supabase 混合架構)
// 以「新北市淡水區淡金路21號 清淞社區」(493戶) 為主軸社區模型
// ====================================================================

import { Community, Meeting, Member, Topic, Vote, TopicVoteStats, DeskAuthRequest, DeskAuthSyncEvent } from '../types';
import { getSupabase } from './supabase';

const STORAGE_KEY_COMMUNITIES = 'resident_voting_communities_v2';
const STORAGE_KEY_MEETINGS = 'resident_voting_meetings_v2';
const STORAGE_KEY_MEMBERS = 'resident_voting_members_v2';
const STORAGE_KEY_TOPICS = 'resident_voting_topics_v2';
const STORAGE_KEY_VOTES = 'resident_voting_votes_v2';
const STORAGE_KEY_ACTIVE_COMMUNITY = 'resident_voting_active_comm_id_v2';
const STORAGE_KEY_ACTIVE_MEETING = 'resident_voting_active_meeting_id_v2';
const STORAGE_KEY_DEVICE_UUID = 'resident_voting_device_uuid';
const STORAGE_KEY_CURRENT_MEMBER = 'resident_voting_current_member';
const STORAGE_KEY_AUTH_REQUESTS = 'resident_voting_auth_requests_v2';
const STORAGE_KEY_SYNC_PULSE = 'resident_voting_sync_pulse';

// 建立跨分頁/跨視窗即時通訊通道 (BroadcastChannel)
let syncChannel: BroadcastChannel | null = null;
try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    syncChannel = new BroadcastChannel('resident_voting_sync_channel');
  }
} catch {
  // BroadcastChannel 在部分受限環境可能不支援
}

// 發送全域即時同步事件 (同時支援 BroadcastChannel、LocalStorage Event、DOM CustomEvent 與 Supabase Realtime)
export function broadcastSyncEvent(event: DeskAuthSyncEvent) {
  // 1. BroadcastChannel 廣播
  try {
    syncChannel?.postMessage(event);
  } catch (err) {
    console.warn('BroadcastChannel 發送失敗:', err);
  }

  // 2. 本地 CustomEvent (同頁面即時觸發)
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('resident_sync_event', { detail: event }));
  }

  // 3. LocalStorage 觸發跨 Tab / 跨視窗 storage 事件
  try {
    localStorage.setItem(STORAGE_KEY_SYNC_PULSE, JSON.stringify(event));
  } catch (err) {
    console.warn('LocalStorage pulse 失敗:', err);
  }

  // 4. Supabase 雲端 Realtime 廣播 (若有配置 Supabase)
  const client = getSupabase();
  if (client) {
    try {
      const channel = client.channel('desk_sync_room');
      channel.send({
        type: 'broadcast',
        event: 'desk_sync',
        payload: event,
      }).catch(() => {});
    } catch (err) {
      console.warn('Supabase Realtime 廣播失敗:', err);
    }
  }
}

// 訂閱全域即時同步事件
export function subscribeToSyncEvents(listener: (event: DeskAuthSyncEvent) => void): () => void {
  // 1. BroadcastChannel 監聽
  const handleBroadcast = (msg: MessageEvent) => {
    if (msg.data && typeof msg.data === 'object' && msg.data.type) {
      listener(msg.data as DeskAuthSyncEvent);
    }
  };
  syncChannel?.addEventListener('message', handleBroadcast);

  // 2. Local CustomEvent 監聽
  const handleCustomEvent = (e: Event) => {
    const custom = e as CustomEvent<DeskAuthSyncEvent>;
    if (custom.detail) {
      listener(custom.detail);
    }
  };
  if (typeof window !== 'undefined') {
    window.addEventListener('resident_sync_event', handleCustomEvent);
  }

  // 3. Storage Event 跨分頁監聽
  const handleStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY_SYNC_PULSE && e.newValue) {
      try {
        const parsed = JSON.parse(e.newValue);
        listener(parsed);
      } catch {}
    }
  };
  if (typeof window !== 'undefined') {
    window.addEventListener('storage', handleStorage);
  }

  // 4. Supabase Realtime 監聽 (若有雲端連線)
  const client = getSupabase();
  let supabaseChannel: any = null;
  if (client) {
    try {
      supabaseChannel = client.channel('desk_sync_room')
        .on('broadcast', { event: 'desk_sync' }, (payload: any) => {
          if (payload.payload) {
            listener(payload.payload);
          }
        })
        .subscribe();
    } catch {}
  }

  // 清除函式
  return () => {
    syncChannel?.removeEventListener('message', handleBroadcast);
    if (typeof window !== 'undefined') {
      window.removeEventListener('resident_sync_event', handleCustomEvent);
      window.removeEventListener('storage', handleStorage);
    }
    if (supabaseChannel && client) {
      client.removeChannel(supabaseChannel);
    }
  };
}

export function getOrCreateDeviceUUID(): string {
  let uuid = localStorage.getItem(STORAGE_KEY_DEVICE_UUID);
  if (!uuid) {
    uuid = 'DEV-' + Math.random().toString(36).substring(2, 10).toUpperCase() + '-' + Date.now().toString(36).toUpperCase();
    localStorage.setItem(STORAGE_KEY_DEVICE_UUID, uuid);
  }
  return uuid;
}

export function getTodayMidnightISO(): string {
  const now = new Date();
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  return midnight.toISOString();
}

export function generateRandomPin(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

// 建立示範資料：以「清淞社區」為主要核心
function createInitialMockData() {
  const qingsongCommId = 'comm-qingsong-tamsui';
  const secondCommId = 'comm-garden-city';

  // 1. 清淞社區基本資料：新北市淡水區淡金路21號，總戶數 493 戶 (地上29層、地下5層)
  const defaultCommunities: Community[] = [
    {
      id: qingsongCommId,
      code: 'QS-001',
      name: '淡水清淞社區 (清淞溫泉會館)',
      address: '新北市淡水區淡金路21號',
      total_units: 493,
      total_area_ping: 11428.6,
      contact_name: '張主任委員',
      contact_phone: '02-8626-xxxx',
      created_at: new Date().toISOString(),
    },
    {
      id: secondCommId,
      code: 'C-002',
      name: '花園新城景觀社區',
      address: '新北市新店區花園十路52號',
      total_units: 180,
      total_area_ping: 8520.0,
      contact_name: '林惠芳 主任委員',
      contact_phone: '0988-765-432',
      created_at: new Date().toISOString(),
    }
  ];

  const meetingId = 'mtg-qingsong-115-01';
  const defaultMeetings: Meeting[] = [
    {
      id: meetingId,
      community_id: qingsongCommId,
      title: '清淞社區 115年度第1次區分所有權人常態大會',
      meeting_date: new Date().toISOString().split('T')[0],
      location: '淡金路21號 清淞社區 B1 多功能休閒交誼廳',
      pin_code: '8866',
      pin_expires_at: getTodayMidnightISO(),
      is_active: true,
      banner_url: '',
      created_at: new Date().toISOString(),
    }
  ];

  // 2. 清淞社區 493 戶 名冊生成 (精準考量 1F~29F，每層 15~18 戶，坪數 13.4 ~ 42 坪)
  const defaultMembers: Member[] = [];
  const totalPing = 11428.6;

  // 主委、總幹事與測試代表
  defaultMembers.push(
    {
      id: 'mem-qs-admin',
      community_id: qingsongCommId,
      meeting_id: meetingId,
      unit_no: '26F-08',
      floor: '26F',
      owner_name: '張文德 (主委)',
      phone_last4: '5678',
      phone_full: '0912-345-678',
      address: '新北市淡水區淡金路21號26樓之8',
      area_ping: 38.6,
      weight_ratio: Number((38.6 / totalPing).toFixed(6)),
      role: 'admin',
      is_checked_in: true,
      check_in_time: new Date().toISOString(),
      reset_token: 'TOKEN-QS-26F08-ADMIN',
      created_at: new Date().toISOString(),
    },
    {
      id: 'mem-qs-admin1',
      community_id: qingsongCommId,
      meeting_id: meetingId,
      unit_no: '03F-02',
      floor: '3F',
      owner_name: '李建銘 (總幹事)',
      phone_last4: '1234',
      phone_full: '0933-221-234',
      address: '新北市淡水區淡金路21號3樓之2',
      area_ping: 18.2,
      weight_ratio: Number((18.2 / totalPing).toFixed(6)),
      role: 'admin1',
      is_checked_in: true,
      check_in_time: new Date().toISOString(),
      reset_token: 'TOKEN-QS-03F02-ADMIN1',
      created_at: new Date().toISOString(),
    },
    {
      id: 'mem-qs-user1',
      community_id: qingsongCommId,
      meeting_id: meetingId,
      unit_no: '12F-15',
      floor: '12F',
      owner_name: '王小明',
      phone_last4: '9988',
      phone_full: '0987-659-988',
      address: '新北市淡水區淡金路21號12樓之15',
      area_ping: 16.5,
      weight_ratio: Number((16.5 / totalPing).toFixed(6)),
      role: 'user',
      is_checked_in: false,
      reset_token: 'TOKEN-QS-12F15-USER',
      created_at: new Date().toISOString(),
    }
  );

  // 批量產出清淞社區 490 戶住戶名冊 (1~29樓)
  const familyNames = ['陳', '林', '黃', '張', '李', '王', '吳', '劉', '蔡', '楊', '許', '鄭', '謝', '洪', '郭', '邱', '廖', '周'];
  const givenNames = ['建宏', '俊傑', '雅婷', '志遠', '宗憲', '淑芬', '惠雯', '美玲', '家瑋', '佩君', '偉哲', '正雄', '冠宇', '宜珊', '文馨'];

  let count = 4;
  for (let fl = 1; fl <= 29; fl++) {
    const unitsOnFloor = fl <= 25 ? 17 : 14; // 高樓層大坪數戶數較少
    for (let u = 1; u <= unitsOnFloor; u++) {
      if (count > 493) break;
      const floorStr = `${fl}F`;
      const unitNo = `${fl < 10 ? '0' + fl : fl}F-${u < 10 ? '0' + u : u}`;
      const fName = familyNames[(count * 5) % familyNames.length];
      const gName = givenNames[(count * 11) % givenNames.length];
      // 清淞社區坪數以 13.4 ~ 18.5 坪小套房佔 70%，其餘 24 ~ 42 坪
      const ping = count % 4 === 0 ? 32 + ((count * 7) % 10) : 13.4 + ((count * 3) % 6);
      const last4 = (1000 + ((count * 67) % 9000)).toString();

      defaultMembers.push({
        id: `mem-qs-${count}`,
        community_id: qingsongCommId,
        meeting_id: meetingId,
        unit_no: unitNo,
        floor: floorStr,
        owner_name: `${fName}${gName}`,
        phone_last4: last4,
        phone_full: `09${Math.floor(10 + Math.random() * 89)}-***-${last4}`,
        address: `新北市淡水區淡金路21號${fl}樓之${u}`,
        area_ping: Number(ping.toFixed(1)),
        weight_ratio: Number((ping / totalPing).toFixed(6)),
        role: 'user',
        is_checked_in: count <= 120, // 模擬已現場報到 120 戶
        check_in_time: count <= 120 ? new Date(Date.now() - count * 45000).toISOString() : undefined,
        reset_token: `TOKEN-${unitNo}-${last4}`,
        created_at: new Date().toISOString(),
      });
      count++;
    }
  }

  // 3. 議題設定 (針對清淞社區特色：溫泉公設、物業管理、充電樁)
  const topic1Id = 'topic-qs-01';
  const topic2Id = 'topic-qs-02';
  const topic3Id = 'topic-qs-03';

  const defaultTopics: Topic[] = [
    {
      id: topic1Id,
      meeting_id: meetingId,
      order_num: 1,
      title: '第一案：清淞社區全棟溫泉儲熱供水系統管線定期汰換與保養工程發包案',
      description: '說明：本社區主打戶戶碳酸氫鈉泉，因地下室熱泵及高溫原水管線已運轉多年產生鈣化與水垢沉積，擬動用公共基金新台幣 185 萬元進行主管線汰換與熱交換器大保養。',
      vote_type: 'yes_no',
      status: 'open',
      created_at: new Date().toISOString(),
      options: [
        { id: 'opt-qs1-yes', topic_id: topic1Id, option_key: 'YES', option_label: '贊成通過本管線保養工程發包案', order_num: 1 },
        { id: 'opt-qs1-no', topic_id: topic1Id, option_key: 'NO', option_label: '反對通過本工程發包案', order_num: 2 },
        { id: 'opt-qs1-abs', topic_id: topic1Id, option_key: 'ABSTAIN', option_label: '棄權', order_num: 3 }
      ]
    },
    {
      id: topic2Id,
      meeting_id: meetingId,
      order_num: 2,
      title: '第二案：116年度飯店式物業管理維護與秘書會館服務公司遴選案',
      description: '說明：現行物業合約即將屆滿，經管委會公開招標審查，遴選三家具備飯店式溫泉社區管理經驗之公司，由區權人投票決標。',
      vote_type: 'multiple_choice',
      status: 'open',
      created_at: new Date().toISOString(),
      options: [
        { id: 'opt-qs2-a', topic_id: topic2Id, option_key: 'A', option_label: '方案A：新光國際物業管理 (月報價 36 萬 / 駐衛 6 人+英日語雙語秘書)', order_num: 1 },
        { id: 'opt-qs2-b', topic_id: topic2Id, option_key: 'B', option_label: '方案B：東京都物業管理 (月報價 34.5 萬 / 駐衛 5 人+會館營運專員)', order_num: 2 },
        { id: 'opt-qs2-c', topic_id: topic2Id, option_key: 'C', option_label: '方案C：中興保全生活科技 (月報價 38 萬 / 智慧AI門禁監控+高階秘書)', order_num: 3 },
        { id: 'opt-qs2-abs', topic_id: topic2Id, option_key: 'ABSTAIN', option_label: '棄權', order_num: 4 }
      ]
    },
    {
      id: topic3Id,
      meeting_id: meetingId,
      order_num: 3,
      title: '第三案：B1~B5 地下停車場電動車（EV）EMS 智慧充電樁線槽規劃與管理規範案',
      description: '說明：為維持社區電網安全與計費公允，擬統一由管委會施作專利匯流排線槽，並訂定住戶個人充電樁安裝審查標準與每度電公設維護費分攤機制。',
      vote_type: 'yes_no',
      status: 'open',
      created_at: new Date().toISOString(),
      options: [
        { id: 'opt-qs3-yes', topic_id: topic3Id, option_key: 'YES', option_label: '贊成通過本充電樁規範', order_num: 1 },
        { id: 'opt-qs3-no', topic_id: topic3Id, option_key: 'NO', option_label: '反對通過本充電樁規範', order_num: 2 },
        { id: 'opt-qs3-abs', topic_id: topic3Id, option_key: 'ABSTAIN', option_label: '棄權', order_num: 3 }
      ]
    }
  ];

  // 4. 預載部分已投票資料 (以展現實時圖表)
  const defaultVotes: Vote[] = [];
  for (let i = 0; i < 68; i++) {
    const mem = defaultMembers[i];
    // 案一投票
    defaultVotes.push({
      id: `vote-1-${mem.id}`,
      topic_id: topic1Id,
      member_id: mem.id,
      option_id: i % 6 === 0 ? 'opt-qs1-no' : 'opt-qs1-yes',
      voted_weight: mem.area_ping,
      voted_at: new Date(Date.now() - (68 - i) * 35000).toISOString()
    });

    // 案二投票
    const optId = i % 3 === 0 ? 'opt-qs2-a' : i % 3 === 1 ? 'opt-qs2-b' : 'opt-qs2-c';
    defaultVotes.push({
      id: `vote-2-${mem.id}`,
      topic_id: topic2Id,
      member_id: mem.id,
      option_id: optId,
      voted_weight: mem.area_ping,
      voted_at: new Date(Date.now() - (68 - i) * 32000).toISOString()
    });
  }

  return {
    communities: defaultCommunities,
    meetings: defaultMeetings,
    members: defaultMembers,
    topics: defaultTopics,
    votes: defaultVotes,
  };
}

export function ensureInitialData() {
  if (!localStorage.getItem(STORAGE_KEY_COMMUNITIES)) {
    const data = createInitialMockData();
    localStorage.setItem(STORAGE_KEY_COMMUNITIES, JSON.stringify(data.communities));
    localStorage.setItem(STORAGE_KEY_MEETINGS, JSON.stringify(data.meetings));
    localStorage.setItem(STORAGE_KEY_MEMBERS, JSON.stringify(data.members));
    localStorage.setItem(STORAGE_KEY_TOPICS, JSON.stringify(data.topics));
    localStorage.setItem(STORAGE_KEY_VOTES, JSON.stringify(data.votes));
    localStorage.setItem(STORAGE_KEY_ACTIVE_COMMUNITY, data.communities[0].id);
    localStorage.setItem(STORAGE_KEY_ACTIVE_MEETING, data.meetings[0].id);
  }
}

export function getCommunities(): Community[] {
  ensureInitialData();
  const raw = localStorage.getItem(STORAGE_KEY_COMMUNITIES);
  return raw ? JSON.parse(raw) : [];
}

export function saveCommunity(community: Community) {
  const list = getCommunities();
  const idx = list.findIndex(c => c.id === community.id);
  if (idx >= 0) {
    list[idx] = community;
  } else {
    list.push(community);
  }
  localStorage.setItem(STORAGE_KEY_COMMUNITIES, JSON.stringify(list));
}

export function getActiveCommunityId(): string {
  ensureInitialData();
  let id = localStorage.getItem(STORAGE_KEY_ACTIVE_COMMUNITY);
  if (!id) {
    const list = getCommunities();
    id = list[0]?.id || '';
    if (id) localStorage.setItem(STORAGE_KEY_ACTIVE_COMMUNITY, id);
  }
  return id;
}

export function setActiveCommunityId(id: string) {
  localStorage.setItem(STORAGE_KEY_ACTIVE_COMMUNITY, id);
  const meetings = getMeetings(id);
  if (meetings.length > 0) {
    setActiveMeetingId(meetings[0].id);
  }
}

export function getMeetings(communityId?: string): Meeting[] {
  ensureInitialData();
  const raw = localStorage.getItem(STORAGE_KEY_MEETINGS);
  const list: Meeting[] = raw ? JSON.parse(raw) : [];
  if (communityId) {
    return list.filter(m => m.community_id === communityId);
  }
  return list;
}

export function getActiveMeeting(): Meeting | null {
  ensureInitialData();
  const id = localStorage.getItem(STORAGE_KEY_ACTIVE_MEETING);
  const list = getMeetings();
  if (id) {
    const found = list.find(m => m.id === id);
    if (found) return found;
  }
  return list[0] || null;
}

export function setActiveMeetingId(id: string) {
  localStorage.setItem(STORAGE_KEY_ACTIVE_MEETING, id);
}

export function saveMeeting(meeting: Meeting) {
  const list = getMeetings();
  const idx = list.findIndex(m => m.id === meeting.id);
  if (idx >= 0) {
    list[idx] = meeting;
  } else {
    list.push(meeting);
  }
  localStorage.setItem(STORAGE_KEY_MEETINGS, JSON.stringify(list));
}

export function getMembers(communityId?: string): Member[] {
  ensureInitialData();
  const raw = localStorage.getItem(STORAGE_KEY_MEMBERS);
  const list: Member[] = raw ? JSON.parse(raw) : [];
  if (communityId) {
    return list.filter(m => m.community_id === communityId);
  }
  return list;
}

export function saveMembers(members: Member[]) {
  localStorage.setItem(STORAGE_KEY_MEMBERS, JSON.stringify(members));
}

export function updateMember(updated: Member) {
  const list = getMembers();
  const idx = list.findIndex(m => m.id === updated.id);
  if (idx >= 0) {
    list[idx] = updated;
    saveMembers(list);
  }
}

// --------------------------------------------------------------------
// 大會服務台現場人工認證與設備換機管理 (Real-time Desk Authorization)
// --------------------------------------------------------------------

export function getDeskAuthRequests(meetingId?: string): DeskAuthRequest[] {
  const raw = localStorage.getItem(STORAGE_KEY_AUTH_REQUESTS);
  const list: DeskAuthRequest[] = raw ? JSON.parse(raw) : [];
  let filtered = list;
  if (meetingId) {
    filtered = list.filter(r => !r.meeting_id || r.meeting_id === meetingId);
  }
  // 待審核優先，再依時間倒序
  return filtered.sort((a, b) => {
    if (a.status === 'pending' && b.status !== 'pending') return -1;
    if (a.status !== 'pending' && b.status === 'pending') return 1;
    return new Date(b.requested_at).getTime() - new Date(a.requested_at).getTime();
  });
}

export function saveDeskAuthRequests(requests: DeskAuthRequest[]) {
  localStorage.setItem(STORAGE_KEY_AUTH_REQUESTS, JSON.stringify(requests));
}

// 住戶手機端送出求助認證請求
export function createDeskAuthRequest(params: Omit<DeskAuthRequest, 'id' | 'status' | 'requested_at'>): DeskAuthRequest {
  const list = getDeskAuthRequests();
  // 檢查是否已有該戶之 pending 請求，若有則直接更新輸入的手機號與時間
  const existingIdx = list.findIndex(
    r => r.unit_no.toLowerCase() === params.unit_no.toLowerCase() && r.status === 'pending'
  );

  let targetRequest: DeskAuthRequest;
  if (existingIdx >= 0) {
    targetRequest = {
      ...list[existingIdx],
      input_phone_last4: params.input_phone_last4,
      device_uuid: params.device_uuid,
      requested_at: new Date().toISOString(),
    };
    list[existingIdx] = targetRequest;
  } else {
    targetRequest = {
      id: `AUTH-REQ-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      status: 'pending',
      requested_at: new Date().toISOString(),
      ...params,
    };
    list.unshift(targetRequest);
  }

  saveDeskAuthRequests(list);

  // 全域廣播：通知大會服務台管理員有新的求助請求
  broadcastSyncEvent({
    type: 'AUTH_REQUEST_CREATED',
    timestamp: Date.now(),
    requestId: targetRequest.id,
    memberId: targetRequest.member_id,
    unitNo: targetRequest.unit_no,
    targetDeviceUuid: targetRequest.device_uuid,
    newPhoneLast4: targetRequest.input_phone_last4,
  });

  return targetRequest;
}

// 大會服務台審核通過住戶求助
export function approveDeskAuthRequest(
  requestId: string,
  newPhoneLast4?: string,
  approvedBy: string = '大會服務台(admin)'
): { success: boolean; member?: Member } {
  const requests = getDeskAuthRequests();
  const reqIdx = requests.findIndex(r => r.id === requestId);
  if (reqIdx < 0) return { success: false };

  const req = requests[reqIdx];
  req.status = 'approved';
  req.approved_at = new Date().toISOString();
  req.approved_by = approvedBy;
  if (newPhoneLast4) {
    req.note = `管理員更正手機末四碼為【${newPhoneLast4}】並開通`;
  } else {
    req.note = `管理員現場確認身分無誤，一鍵特權開通`;
  }
  saveDeskAuthRequests(requests);

  // 同步更新住戶名冊資料
  const members = getMembers();
  const memIdx = members.findIndex(m => m.id === req.member_id || m.unit_no.toLowerCase() === req.unit_no.toLowerCase());
  if (memIdx >= 0) {
    const mem = members[memIdx];
    const updatedMember: Member = {
      ...mem,
      phone_last4: (newPhoneLast4 || req.input_phone_last4 || mem.phone_last4).trim(),
      bound_device_token: req.device_uuid, // 直接綁定該求助手機的 Device UUID
      is_checked_in: true,
      check_in_time: mem.check_in_time || new Date().toISOString(),
      reset_token: mem.reset_token || `TOKEN-${mem.unit_no}-${mem.phone_last4}`,
    };
    members[memIdx] = updatedMember;
    saveMembers(members);

    // 全域即時推播：告知該住戶手機「已現場審核通過」，手機將即刻自動登入進入表決
    broadcastSyncEvent({
      type: 'AUTH_REQUEST_APPROVED',
      timestamp: Date.now(),
      requestId,
      memberId: updatedMember.id,
      unitNo: updatedMember.unit_no,
      targetDeviceUuid: req.device_uuid,
      newPhoneLast4: updatedMember.phone_last4,
      approvedBy,
      payload: updatedMember,
    });

    return { success: true, member: updatedMember };
  }

  return { success: false };
}

// 大會服務台駁回住戶求助
export function rejectDeskAuthRequest(requestId: string, reason?: string): boolean {
  const requests = getDeskAuthRequests();
  const req = requests.find(r => r.id === requestId);
  if (!req) return false;

  req.status = 'rejected';
  req.approved_at = new Date().toISOString();
  req.note = reason || '大會服務台核對身分不符，駁回申請';
  saveDeskAuthRequests(requests);

  broadcastSyncEvent({
    type: 'AUTH_REQUEST_REJECTED',
    timestamp: Date.now(),
    requestId,
    memberId: req.member_id,
    unitNo: req.unit_no,
    targetDeviceUuid: req.device_uuid,
  });

  return true;
}

// 後台管理員直接對任意住戶進行「現場直接認證開通 (免等待申請)」
export function directAuthorizeMember(
  memberId: string,
  options?: { newPhoneLast4?: string; deviceUuid?: string; approvedBy?: string }
): { success: boolean; member?: Member } {
  const members = getMembers();
  const memIdx = members.findIndex(m => m.id === memberId);
  if (memIdx < 0) return { success: false };

  const mem = members[memIdx];
  const updatedMember: Member = {
    ...mem,
    phone_last4: (options?.newPhoneLast4 || mem.phone_last4).trim(),
    bound_device_token: options?.deviceUuid || mem.bound_device_token,
    is_checked_in: true,
    check_in_time: mem.check_in_time || new Date().toISOString(),
  };
  members[memIdx] = updatedMember;
  saveMembers(members);

  // 全域廣播
  broadcastSyncEvent({
    type: 'MEMBER_AUTHORIZED',
    timestamp: Date.now(),
    memberId: updatedMember.id,
    unitNo: updatedMember.unit_no,
    targetDeviceUuid: options?.deviceUuid,
    newPhoneLast4: updatedMember.phone_last4,
    approvedBy: options?.approvedBy || '大會服務台(admin)',
    payload: updatedMember,
  });

  return { success: true, member: updatedMember };
}

// 後台管理員一鍵解除住戶舊手機綁定 (換機重置)
export function unlockMemberDevice(memberId: string): { success: boolean; member?: Member } {
  const members = getMembers();
  const memIdx = members.findIndex(m => m.id === memberId);
  if (memIdx < 0) return { success: false };

  const mem = members[memIdx];
  const updatedMember: Member = {
    ...mem,
    bound_device_token: undefined,
  };
  members[memIdx] = updatedMember;
  saveMembers(members);

  broadcastSyncEvent({
    type: 'MEMBER_DEVICE_UNLOCKED',
    timestamp: Date.now(),
    memberId: updatedMember.id,
    unitNo: updatedMember.unit_no,
  });

  return { success: true, member: updatedMember };
}

// 後台更正住戶手機末四碼
export function updateMemberPhone(memberId: string, newPhoneLast4: string): { success: boolean; member?: Member } {
  const members = getMembers();
  const memIdx = members.findIndex(m => m.id === memberId);
  if (memIdx < 0) return { success: false };

  const mem = members[memIdx];
  const updatedMember: Member = {
    ...mem,
    phone_last4: newPhoneLast4.trim(),
  };
  members[memIdx] = updatedMember;
  saveMembers(members);

  broadcastSyncEvent({
    type: 'MEMBER_PHONE_UPDATED',
    timestamp: Date.now(),
    memberId: updatedMember.id,
    unitNo: updatedMember.unit_no,
    newPhoneLast4: updatedMember.phone_last4,
  });

  return { success: true, member: updatedMember };
}

export function getCurrentMember(): Member | null {
  const raw = localStorage.getItem(STORAGE_KEY_CURRENT_MEMBER);
  return raw ? JSON.parse(raw) : null;
}

export function setCurrentMember(member: Member | null) {
  if (member) {
    localStorage.setItem(STORAGE_KEY_CURRENT_MEMBER, JSON.stringify(member));
  } else {
    localStorage.removeItem(STORAGE_KEY_CURRENT_MEMBER);
  }
}

export function getTopics(meetingId?: string): Topic[] {
  ensureInitialData();
  const raw = localStorage.getItem(STORAGE_KEY_TOPICS);
  const list: Topic[] = raw ? JSON.parse(raw) : [];
  if (meetingId) {
    return list.filter(t => t.meeting_id === meetingId).sort((a, b) => a.order_num - b.order_num);
  }
  return list.sort((a, b) => a.order_num - b.order_num);
}

export function saveTopic(topic: Topic) {
  const list = getTopics();
  const idx = list.findIndex(t => t.id === topic.id);
  if (idx >= 0) {
    list[idx] = topic;
  } else {
    list.push(topic);
  }
  localStorage.setItem(STORAGE_KEY_TOPICS, JSON.stringify(list));
}

export function deleteTopic(topicId: string) {
  const list = getTopics().filter(t => t.id !== topicId);
  localStorage.setItem(STORAGE_KEY_TOPICS, JSON.stringify(list));
}

export function getVotes(topicId?: string): Vote[] {
  ensureInitialData();
  const raw = localStorage.getItem(STORAGE_KEY_VOTES);
  const list: Vote[] = raw ? JSON.parse(raw) : [];
  if (topicId) {
    return list.filter(v => v.topic_id === topicId);
  }
  return list;
}

export function addVote(vote: Vote): { success: boolean; message: string } {
  const list = getVotes();
  const exists = list.some(v => v.topic_id === vote.topic_id && v.member_id === vote.member_id);
  if (exists) {
    return { success: false, message: '您已針對本議案完成投票，無法重複投票！' };
  }

  list.push(vote);
  localStorage.setItem(STORAGE_KEY_VOTES, JSON.stringify(list));

  const client = getSupabase();
  if (client) {
    client.from('votes').insert([{
      id: vote.id,
      topic_id: vote.topic_id,
      member_id: vote.member_id,
      option_id: vote.option_id,
      voted_weight: vote.voted_weight,
      voted_at: vote.voted_at
    }]).then(({ error }) => {
      if (error) console.warn('Supabase 同步投票失敗:', error.message);
    });
  }

  return { success: true, message: '投票成功！' };
}

export function calculateTopicStats(topic: Topic, communityTotalPing: number, totalRegisteredUnits: number): TopicVoteStats {
  const topicVotes = getVotes(topic.id);
  const totalVotes = topicVotes.length;
  const totalWeight = topicVotes.reduce((sum, v) => sum + (v.voted_weight || 0), 0);
  const votedMemberIds = topicVotes.map(v => v.member_id);

  const options = topic.options || [];
  const optionsStats = options.map(opt => {
    const optVotes = topicVotes.filter(v => v.option_id === opt.id);
    const count = optVotes.length;
    const weight = optVotes.reduce((sum, v) => sum + (v.voted_weight || 0), 0);
    const countPct = totalVotes > 0 ? Number(((count / totalVotes) * 100).toFixed(1)) : 0;
    const weightPct = totalWeight > 0 ? Number(((weight / totalWeight) * 100).toFixed(1)) : 0;

    return {
      option_id: opt.id,
      option_key: opt.option_key,
      option_label: opt.option_label,
      vote_count: count,
      vote_weight: Number(weight.toFixed(2)),
      count_percentage: countPct,
      weight_percentage: weightPct,
    };
  });

  let decisionSummary = '結算中';
  let passed = false;

  if (topic.vote_type === 'yes_no') {
    const yesStat = optionsStats.find(o => o.option_key === 'YES');
    const yesCount = yesStat ? yesStat.vote_count : 0;
    const yesWeight = yesStat ? yesStat.vote_weight : 0;

    if (totalVotes > 0 && yesCount > (totalVotes - yesCount) && yesWeight >= (totalWeight * 0.5)) {
      passed = true;
      decisionSummary = '決議通過 (符合戶數與權利雙門檻)';
    } else {
      passed = false;
      decisionSummary = totalVotes === 0 ? '無投票紀錄' : '未達法定決議門檻 (不通過)';
    }
  } else {
    const sorted = [...optionsStats].sort((a, b) => b.vote_count - a.vote_count);
    if (sorted.length > 0 && sorted[0].vote_count > 0) {
      decisionSummary = `由【${sorted[0].option_label}】最高票勝出 (${sorted[0].vote_count} 票 / ${sorted[0].weight_percentage}%)`;
      passed = true;
    }
  }

  return {
    topic_id: topic.id,
    total_votes: totalVotes,
    total_voted_weight: Number(totalWeight.toFixed(2)),
    voted_member_ids: votedMemberIds,
    options_stats: optionsStats,
    passed,
    decision_summary: decisionSummary
  };
}
