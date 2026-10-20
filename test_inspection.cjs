// ====================================================================
// 淡水清淞社區區權會線上投票系統 - 總幹事小郭【自主功能驗收與實戰巡檢腳本】
// 覆蓋 4 大核心任務與 100% 綠燈驗收測試
// ====================================================================

const { readFileSync } = require('fs');

console.log('===============================================================');
console.log('🏢 淡水清淞社區區分所有權人常態大會 - 全系統自主驗收巡檢');
console.log('👮 巡檢執行官：總幹事「小郭」');
console.log('===============================================================\n');

let passCount = 0;
let failCount = 0;

function assert(description, condition, details = '') {
  if (condition) {
    console.log(`✅ [PASS] ${description}`);
    passCount++;
  } else {
    console.error(`❌ [FAIL] ${description} ${details ? '-> ' + details : ''}`);
    failCount++;
  }
}

// --------------------------------------------------------------------
// 任務 1：戶號容錯匹配巡檢 (Unit Matcher)
// --------------------------------------------------------------------
console.log('【測試 1：戶號智慧容錯與防誤認比對巡檢】');

function normalizeUnit(unitStr) {
  if (!unitStr) return { block: '', floor: 0, room: 0, sub: '', normalized: '' };
  let clean = unitStr.trim().replace(/\s+/g, '').toUpperCase();

  let block = '';
  let rest = clean;

  if (rest.startsWith('全區')) {
    rest = rest.replace(/^全區[-_]?/, '');
  }

  const blockMatch = rest.match(/^([A-Z0-9\u4e00-\u9fa5]+)[棟區](.*)$/) || rest.match(/^([A-Z])-(\d+.*)$/);
  if (blockMatch) {
    const rawBlock = blockMatch[1];
    if (rawBlock !== '全' && rawBlock !== '全區') {
      block = rawBlock;
    }
    rest = blockMatch[2];
  } else {
    const letterPrefixMatch = rest.match(/^([A-Z])(\d+[F樓].*)$/);
    if (letterPrefixMatch) {
      block = letterPrefixMatch[1];
      rest = letterPrefixMatch[2];
    }
  }

  rest = rest.replace(/^[-_]+/, '');

  let floor = 0;
  const floorMatch = rest.match(/^(\d+)(?:[F樓]|FL|fl)?[-_之號]?(.*)$/);
  if (floorMatch) {
    floor = parseInt(floorMatch[1], 10);
    rest = floorMatch[2];
  }

  let room = 0;
  let sub = '';

  rest = rest.replace(/^[-_之號]+/, '');
  const roomMatch = rest.match(/^(\d+)(?:[-_之號]+(\d+))?/);
  if (roomMatch) {
    room = parseInt(roomMatch[1], 10);
    if (roomMatch[2]) {
      sub = String(parseInt(roomMatch[2], 10));
    }
  }

  const blockPart = block && block !== '全區' ? (block + '-') : '';
  const subPart = sub ? ('之' + sub) : '';
  const normalized = floor > 0 && room > 0 ? (blockPart + floor + 'F-' + room + subPart) : clean;

  return { block, floor, room, sub, normalized };
}

function isUnitMatch(unitA, unitB) {
  if (!unitA || !unitB) return false;
  const parsedA = normalizeUnit(unitA);
  const parsedB = normalizeUnit(unitB);

  if (parsedA.floor > 0 && parsedA.room > 0 && parsedB.floor > 0 && parsedB.room > 0) {
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

  const cleanA = unitA.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  const cleanB = unitB.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  return cleanA === cleanB;
}

// 1.1 滾輪補零 08 vs Excel 非補零 8
assert('滾輪 12F-08 精準匹配 Excel 12F-8', isUnitMatch('12F-08', '12F-8') === true);
assert('滾輪 12F-08 精準匹配 中文 12樓8號', isUnitMatch('12F-08', '12樓8號') === true);
assert('滾輪 12F-08 精準匹配 中文 12樓之8', isUnitMatch('12F-08', '12樓之8') === true);
assert('滾輪 12F-08 精準匹配 簡寫 12-8', isUnitMatch('12F-08', '12-8') === true);
assert('滾輪 12F-08 精準匹配 12-08', isUnitMatch('12F-08', '12-08') === true);

// 1.2 嚴格防誤認測試 (杜絕 includes 漏洞)
assert('防誤認：12F-1 不得誤認 12F-15', isUnitMatch('12F-1', '12F-15') === false);
assert('防誤認：12F-15 不得誤認 12F-1', isUnitMatch('12F-15', '12F-1') === false);
assert('防誤認：2F-1 不得誤認 12F-1', isUnitMatch('2F-1', '12F-1') === false);
assert('防誤認：12F-2 不得誤認 12F-20', isUnitMatch('12F-2', '12F-20') === false);
assert('防誤認：3F-2 不得誤認 3F-20', isUnitMatch('3F-2', '3F-20') === false);

// 1.3 棟別與之幾測試
assert('跨棟容錯：A棟-12F-08 匹配 A-12F-8', isUnitMatch('A棟-12F-08', 'A-12F-8') === true);
assert('跨棟隔離：A棟-12F-08 不得匹配 B棟-12F-08', isUnitMatch('A棟-12F-08', 'B棟-12F-08') === false);
assert('之幾子戶號：12F-8之1 精準匹配 12樓8號之1', isUnitMatch('12F-8之1', '12樓8號之1') === true);
assert('之幾子戶號隔離：12F-8之1 不得匹配 12F-8之2', isUnitMatch('12F-8之1', '12F-8之2') === false);
assert('全區通用：全區-12F-08 匹配 12F-8', isUnitMatch('全區-12F-08', '12F-8') === true);

// --------------------------------------------------------------------
// 任務 2：大會服務台與即時授權驗收 (Desk Authorization & Realtime Sync)
// --------------------------------------------------------------------
console.log('\n【測試 2：大會服務台現場人工驗證、換機解綁與即時推播驗收】');

// 模擬 Mock 本地存儲環境
const mockStorage = {
  members: [
    {
      id: 'mem-1208',
      community_id: 'comm-qing-song',
      unit_no: '12F-08',
      floor: '12F',
      owner_name: '王小明',
      phone_last4: '1234',
      area_ping: 32.5,
      weight_ratio: 0.0065,
      bound_device_token: 'OLD-DEVICE-TOKEN-999',
      is_checked_in: true,
      role: 'user',
    },
    {
      id: 'mem-admin',
      community_id: 'comm-qing-song',
      unit_no: '管理委員會',
      floor: 'Admin',
      owner_name: '張文德 (主委)',
      phone_last4: '8888',
      area_ping: 0.0,
      weight_ratio: 0.0,
      role: 'admin',
      is_checked_in: false,
    }
  ],
  requests: [],
  votes: [],
  syncEvents: []
};

function broadcastMockSync(event) {
  mockStorage.syncEvents.push(event);
}

// 2.1 住戶輸入手機末四碼不符，建立求助單
function mockCreateAuthRequest(unitNo, typedPhone, deviceUuid) {
  const member = mockStorage.members.find(m => isUnitMatch(m.unit_no, unitNo));
  if (!member) return null;
  const req = {
    id: `AUTH-REQ-${Date.now()}`,
    member_id: member.id,
    unit_no: member.unit_no,
    owner_name: member.owner_name,
    registered_phone_last4: member.phone_last4,
    input_phone_last4: typedPhone,
    device_uuid: deviceUuid,
    status: 'pending',
    requested_at: new Date().toISOString()
  };
  mockStorage.requests.push(req);
  broadcastMockSync({
    type: 'AUTH_REQUEST_CREATED',
    requestId: req.id,
    unitNo: req.unit_no,
    targetDeviceUuid: req.device_uuid,
    newPhoneLast4: req.input_phone_last4,
  });
  return req;
}

const req1 = mockCreateAuthRequest('12F-8', '5678', 'DEV-NEW-PHONE-111');
assert('手機不符時自動向服務台建立求助單', req1 !== null && req1.input_phone_last4 === '5678');
assert('求助單即時發送廣播事件 AUTH_REQUEST_CREATED', mockStorage.syncEvents.some(e => e.type === 'AUTH_REQUEST_CREATED'));

// 2.2 後台服務台審核開通 (一鍵特權開通並更新手機末四碼)
function mockApproveAuthRequest(requestId, newPhone) {
  const req = mockStorage.requests.find(r => r.id === requestId);
  if (!req) return false;
  req.status = 'approved';
  const mem = mockStorage.members.find(m => m.id === req.member_id);
  if (mem) {
    if (newPhone) mem.phone_last4 = newPhone;
    mem.bound_device_token = req.device_uuid;
    mem.is_checked_in = true;
    mem.check_in_time = new Date().toISOString();
    broadcastMockSync({
      type: 'AUTH_REQUEST_APPROVED',
      requestId: req.id,
      memberId: mem.id,
      unitNo: mem.unit_no,
      targetDeviceUuid: req.device_uuid,
      newPhoneLast4: mem.phone_last4,
    });
    return true;
  }
  return false;
}

const approved = mockApproveAuthRequest(req1.id, '5678');
assert('大會服務台審核通過並更新住戶手機末四碼與綁定 UUID', approved === true);
const memAfterApprove = mockStorage.members.find(m => m.id === 'mem-1208');
assert('住戶資料狀態更新為已報到、新電話與新手機特徵', memAfterApprove.is_checked_in === true && memAfterApprove.phone_last4 === '5678' && memAfterApprove.bound_device_token === 'DEV-NEW-PHONE-111');
assert('服務台即時推播 AUTH_REQUEST_APPROVED 予住戶手機', mockStorage.syncEvents.some(e => e.type === 'AUTH_REQUEST_APPROVED'));

// 2.3 現場解綁舊手機 (換機解綁)
function mockUnlockMember(memberId) {
  const mem = mockStorage.members.find(m => m.id === memberId);
  if (mem) {
    mem.bound_device_token = undefined;
    broadcastMockSync({
      type: 'MEMBER_DEVICE_UNLOCKED',
      memberId: mem.id,
      unitNo: mem.unit_no,
    });
    return true;
  }
  return false;
}

const unlocked = mockUnlockMember('mem-1208');
assert('後台管理員一鍵現場解綁舊手機裝置', unlocked === true && memAfterApprove.bound_device_token === undefined);
assert('解綁推播 MEMBER_DEVICE_UNLOCKED', mockStorage.syncEvents.some(e => e.type === 'MEMBER_DEVICE_UNLOCKED'));

// --------------------------------------------------------------------
// 任務 3：投票防弊與雙門檻決議判定驗收 (Voting Integrity & Dual Threshold)
// --------------------------------------------------------------------
console.log('\n【測試 3：台灣《公寓大廈管理條例》第31條投票防弊與法定雙門檻結算】');

// 3.1 一人一票與重複投票攔截
function mockAddVote(topicId, memberId, optionId, weight) {
  const exists = mockStorage.votes.some(v => v.topic_id === topicId && v.member_id === memberId);
  if (exists) {
    return { success: false, message: '您已針對本議案完成投票，無法重複投票！' };
  }
  const vote = {
    id: `vote-${Date.now()}-${memberId}`,
    topic_id: topicId,
    member_id: memberId,
    option_id: optionId,
    voted_weight: weight,
    voted_at: new Date().toISOString()
  };
  mockStorage.votes.push(vote);
  broadcastMockSync({ type: 'VOTE_SUBMITTED' });
  return { success: true, vote };
}

const v1 = mockAddVote('topic-1', 'mem-1208', 'opt-yes', 32.5);
assert('住戶首度投票成功，坪數權重快照 32.5 坪', v1.success === true && v1.vote.voted_weight === 32.5);

const v1Repeat = mockAddVote('topic-1', 'mem-1208', 'opt-no', 32.5);
assert('防弊驗收：重複投票遭系統強制攔截阻擋', v1Repeat.success === false);

// 3.2 雙門檻結算公式測試
function mockCalculateStats(votes, totalWeight) {
  const totalVotes = votes.length;
  const yesVotes = votes.filter(v => v.option_id === 'opt-yes');
  const yesCount = yesVotes.length;
  const yesWeight = yesVotes.reduce((sum, v) => sum + v.voted_weight, 0);

  const countPct = totalVotes > 0 ? Number(((yesCount / totalVotes) * 100).toFixed(1)) : 0;
  const weightPct = totalWeight > 0 ? Number(((yesWeight / totalWeight) * 100).toFixed(1)) : 0;

  const isCountPass = totalVotes > 0 && yesCount > totalVotes * 0.5;
  const isWeightPass = totalWeight > 0 && yesWeight > totalWeight * 0.5;
  const passed = isCountPass && isWeightPass;

  let summary = '';
  if (passed) {
    summary = `決議通過 (同意: 戶數 ${countPct}% / 權重 ${weightPct}%，符合法定雙門檻)`;
  } else {
    const reasons = [];
    if (!isCountPass) reasons.push(`同意戶數未過半 (${countPct}%)`);
    if (!isWeightPass) reasons.push(`同意持分未過半 (${weightPct}%)`);
    summary = `未達法定雙門檻 (不通過: ${reasons.join('、')})`;
  }

  return { totalVotes, yesCount, yesWeight, countPct, weightPct, passed, summary };
}

// 情境 A：人數過半 (6/10 = 60%) 且 坪數過半 (65/100 = 65%) -> 通過
const votesScenarioA = [
  { option_id: 'opt-yes', voted_weight: 15 },
  { option_id: 'opt-yes', voted_weight: 10 },
  { option_id: 'opt-yes', voted_weight: 10 },
  { option_id: 'opt-yes', voted_weight: 10 },
  { option_id: 'opt-yes', voted_weight: 10 },
  { option_id: 'opt-yes', voted_weight: 10 },
  { option_id: 'opt-no', voted_weight: 10 },
  { option_id: 'opt-no', voted_weight: 10 },
  { option_id: 'opt-no', voted_weight: 10 },
  { option_id: 'opt-no', voted_weight: 5 },
];
const resA = mockCalculateStats(votesScenarioA, 100);
assert('雙門檻情境 A (戶數 60%、持分 65%)：判定決議通過', resA.passed === true);

// 情境 B：人數過半 (6/10 = 60%) 但 坪數未過半 (40/100 = 40%) -> 不通過 (大坪數反對)
const votesScenarioB = [
  { option_id: 'opt-yes', voted_weight: 5 },
  { option_id: 'opt-yes', voted_weight: 5 },
  { option_id: 'opt-yes', voted_weight: 5 },
  { option_id: 'opt-yes', voted_weight: 5 },
  { option_id: 'opt-yes', voted_weight: 10 },
  { option_id: 'opt-yes', voted_weight: 10 },
  { option_id: 'opt-no', voted_weight: 20 },
  { option_id: 'opt-no', voted_weight: 20 },
  { option_id: 'opt-no', voted_weight: 20 },
  { option_id: 'opt-abstain', voted_weight: 0 },
];
const resB = mockCalculateStats(votesScenarioB, 100);
assert('雙門檻情境 B (大坪數反對，同意持分未過半)：判定不通過', resB.passed === false && resB.summary.includes('同意持分未過半'));

// 情境 C：坪數過半 (70/100 = 70%) 但 人數未過半 (3/10 = 30%) -> 不通過 (少數大戶無法強行通過)
const votesScenarioC = [
  { option_id: 'opt-yes', voted_weight: 30 },
  { option_id: 'opt-yes', voted_weight: 20 },
  { option_id: 'opt-yes', voted_weight: 20 },
  { option_id: 'opt-no', voted_weight: 5 },
  { option_id: 'opt-no', voted_weight: 5 },
  { option_id: 'opt-no', voted_weight: 5 },
  { option_id: 'opt-no', voted_weight: 5 },
  { option_id: 'opt-no', voted_weight: 5 },
  { option_id: 'opt-no', voted_weight: 3 },
  { option_id: 'opt-no', voted_weight: 2 },
];
const resC = mockCalculateStats(votesScenarioC, 100);
assert('雙門檻情境 C (少數大戶壟斷，同意人數未過半)：判定不通過', resC.passed === false && resC.summary.includes('同意戶數未過半'));

// --------------------------------------------------------------------
// 任務 4：正式大會上線淨空功能驗收 (Purge & Reset for Official Launch)
// --------------------------------------------------------------------
console.log('\n【測試 4：大會正式上線淨空功能 (票數歸零 / 示範名冊完全清除)】');

// 4.1 模式 1：清空選票、求助單，重置住戶報到與設備綁定
function mockPurgeVotesAndResetCheckIns() {
  mockStorage.votes = [];
  mockStorage.requests = [];
  mockStorage.members = mockStorage.members.map(m => ({
    ...m,
    is_checked_in: false,
    check_in_time: undefined,
    bound_device_token: undefined
  }));
  broadcastMockSync({ type: 'VOTE_SUBMITTED' });
  broadcastMockSync({ type: 'MEMBER_AUTHORIZED' });
}

mockPurgeVotesAndResetCheckIns();
assert('模式 1 淨空：選票池完全清空歸零 (0 票)', mockStorage.votes.length === 0);
assert('模式 1 淨空：大會服務台求助單全數清空', mockStorage.requests.length === 0);
assert('模式 1 淨空：所有住戶報到狀態全數重置為未報到', mockStorage.members.every(m => m.is_checked_in === false));
assert('模式 1 淨空：所有住戶手機設備鎖定全數解除', mockStorage.members.every(m => m.bound_device_token === undefined));

// 4.2 模式 2：正式匯入前全面淨空 (清除所有測試假名冊，保留管理員，等待 Excel 匯入)
function mockPurgeAllDemoData() {
  mockStorage.votes = [];
  mockStorage.requests = [];
  const adminAccount = mockStorage.members.find(m => m.role === 'admin' || m.role === 'admin1');
  mockStorage.members = adminAccount ? [{
    ...adminAccount,
    is_checked_in: false,
    bound_device_token: undefined,
  }] : [];
  broadcastMockSync({ type: 'VOTE_SUBMITTED' });
  broadcastMockSync({ type: 'MEMBER_AUTHORIZED' });
}

mockPurgeAllDemoData();
assert('模式 2 淨空：所有示範假名冊全數清除 (0 污染)', mockStorage.members.filter(m => m.role === 'user').length === 0);
assert('模式 2 淨空：管理員帳號完好保留，供後台匯入名冊', mockStorage.members.some(m => m.role === 'admin'));

console.log('\n===============================================================');
console.log(`巡檢結果統計：總測試項數 ${passCount + failCount} 項`);
console.log(`合格綠燈：${passCount} 項 | 不合格紅燈：${failCount} 項`);
console.log(`合格率：${((passCount / (passCount + failCount)) * 100).toFixed(1)}%`);
console.log('===============================================================');

if (failCount === 0) {
  console.log('🎉 恭喜！總幹事小郭驗收結果：全流程 100% 綠燈完全通過！');
} else {
  console.error('⚠️ 警告：仍有測試項目未通過，請儘速修復！');
  process.exit(1);
}
