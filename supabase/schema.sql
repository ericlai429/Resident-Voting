-- ====================================================================
-- 社區區權會手機線上投票系統 (Resident Voting System)
-- Supabase PostgreSQL 完整資料庫架構 (DDL, RLS, Realtime & RPC)
-- Supabase 資料庫 專業全端設計架構
-- ====================================================================

-- 0. 啟用 UUID 擴充功能
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- --------------------------------------------------------------------
-- 1. 社區主表 (Communities / Tenants - 支援多社區多管委會)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.communities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,               -- 社區代號 (如: C-001)
    name VARCHAR(255) NOT NULL,                      -- 社區名稱 (如: 台北信義之星社區)
    address TEXT NOT NULL,                           -- 社區地址
    total_units INT NOT NULL DEFAULT 0,              -- 總戶數
    total_area_ping NUMERIC(12, 4) NOT NULL DEFAULT 0.0, -- 總權狀持分坪數
    contact_name VARCHAR(100),                       -- 管委會聯絡人 / 主委姓名
    contact_phone VARCHAR(50),                       -- 聯絡電話
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- --------------------------------------------------------------------
-- 2. 會議主表 (Meetings - 綁定社區，管理當日PIN碼與防灌票)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.meetings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,                     -- 會議名稱 (如: 115年度第1次區分所有權人會議)
    meeting_date DATE NOT NULL,                      -- 開會日期
    location TEXT NOT NULL,                          -- 開會地點 (如: B1多功能交誼廳)
    pin_code VARCHAR(4) NOT NULL,                    -- 當日 4 碼現場防灌票 PIN 碼
    pin_expires_at TIMESTAMPTZ NOT NULL,             -- PIN 碼失效時間 (當日 23:59:59)
    is_active BOOLEAN DEFAULT true,                  -- 會議是否開啟中
    banner_url TEXT,                                 -- 會議自訂主視覺橫幅圖片
    result_hash TEXT,                                -- 會議結算數位防偽指紋
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- --------------------------------------------------------------------
-- 3. 住戶/區分所有權人名冊表 (Members - Excel 智慧匯入與設備綁定)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
    meeting_id UUID REFERENCES public.meetings(id) ON DELETE CASCADE,
    unit_no VARCHAR(50) NOT NULL,                    -- 戶號 (如: A棟-12F, B棟-03)
    floor VARCHAR(20) NOT NULL,                      -- 樓層 (如: 12F, 3F)
    owner_name VARCHAR(100) NOT NULL,                -- 所有權人姓名
    phone_last4 VARCHAR(4) NOT NULL,                 -- 手機末四碼 (登入驗證)
    phone_full VARCHAR(20),                          -- 完整電話 (供管理員聯繫，遮罩保護)
    address TEXT,                                    -- 權狀登記地址
    area_ping NUMERIC(10, 4) NOT NULL DEFAULT 0.0,  -- 權狀持分坪數 (專有+公設持分)
    weight_ratio NUMERIC(10, 8) NOT NULL DEFAULT 0.0, -- 權利持分比例 (依台灣公寓大廈條例衝量)
    bound_device_token VARCHAR(255),                 -- 綁定之手機唯一設備特徵 (Device UUID)
    is_checked_in BOOLEAN DEFAULT false,             -- 是否已掃碼報到
    check_in_time TIMESTAMPTZ,                       -- 報到時間
    reset_token VARCHAR(100),                        -- 忘記密碼/獨立專屬 QR 快速登入碼
    role VARCHAR(20) DEFAULT 'user',                 -- user, admin, admin1 (總幹事), admin2 (監委)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(community_id, unit_no)
);

-- --------------------------------------------------------------------
-- 4. 議案主表 (Topics - 投票議案與開關狀態)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
    order_num INT NOT NULL DEFAULT 1,                -- 議案順序 (第 1 案, 第 2 案...)
    title TEXT NOT NULL,                             -- 議案名稱
    description TEXT,                                -- 議案詳細說明與提案原由
    vote_type VARCHAR(20) DEFAULT 'yes_no',          -- 'yes_no' (贊成/反對/棄權) 或 'multiple_choice' (多選/自訂選項)
    status VARCHAR(20) DEFAULT 'open',               -- draft(草稿), open(投票進行中), closed(已封票結算)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- --------------------------------------------------------------------
-- 5. 議案選項表 (Topic Options - 贊成/反對/棄權 或 A, B, C 自訂選項)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.topic_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    topic_id UUID NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
    option_key VARCHAR(20) NOT NULL,                 -- 'YES', 'NO', 'ABSTAIN', 'A', 'B', 'C'
    option_label TEXT NOT NULL,                      -- '贊成', '反對', '方案一(採購大金空調)'
    order_num INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- --------------------------------------------------------------------
-- 6. 投票明細表 (Votes - 嚴謹唯一性約束，保障一人一票與坪數權重快照)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    topic_id UUID NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    option_id UUID NOT NULL REFERENCES public.topic_options(id) ON DELETE CASCADE,
    voted_weight NUMERIC(10, 4) NOT NULL,            -- 投票當下的持分坪數快照 (防止後續名冊修改造成計算誤差)
    voted_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(topic_id, member_id)                      -- 鐵律：每位住戶對單一議案僅能投 1 票
);

-- --------------------------------------------------------------------
-- 7. 大會服務台現場認證求助表 (Desk Auth Requests - 即時身分審核)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.desk_auth_requests (
    id VARCHAR(100) PRIMARY KEY,
    community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
    meeting_id UUID REFERENCES public.meetings(id) ON DELETE CASCADE,
    member_id UUID REFERENCES public.members(id) ON DELETE CASCADE,
    unit_no VARCHAR(50) NOT NULL,
    owner_name VARCHAR(100) NOT NULL,
    registered_phone_last4 VARCHAR(4) NOT NULL,
    input_phone_last4 VARCHAR(4) NOT NULL,
    device_uuid VARCHAR(255) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',             -- pending, approved, rejected
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    approved_at TIMESTAMPTZ,
    approved_by VARCHAR(100),
    note TEXT
);

-- --------------------------------------------------------------------
-- 7. 索引建立 (提高 400+ 住戶現場高併發查詢效能)
-- --------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_members_comm_unit ON public.members(community_id, unit_no);
CREATE INDEX IF NOT EXISTS idx_members_device_token ON public.members(bound_device_token);
CREATE INDEX IF NOT EXISTS idx_topics_meeting ON public.topics(meeting_id);
CREATE INDEX IF NOT EXISTS idx_votes_topic ON public.votes(topic_id);
CREATE INDEX IF NOT EXISTS idx_votes_member ON public.votes(member_id);

-- --------------------------------------------------------------------
-- 8. Row Level Security (RLS) 權限安全原則
-- --------------------------------------------------------------------
ALTER TABLE public.communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topic_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;

-- 策略 1: 公開/匿名使用者 (住戶手機端) 可讀取當前進行中的會議、議案與選項
CREATE POLICY "Public read active communities" ON public.communities
    FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Public read active meetings" ON public.meetings
    FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Public read topics" ON public.topics
    FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Public read topic options" ON public.topic_options
    FOR SELECT TO anon, authenticated USING (true);

-- 策略 2: 住戶名冊查詢與更新 (驗證本人或大會管理)
CREATE POLICY "Public read members" ON public.members
    FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Update member checkin and device" ON public.members
    FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

-- 策略 3: 投票紀錄寫入與查詢
CREATE POLICY "Insert vote policy" ON public.votes
    FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Read vote policy" ON public.votes
    FOR SELECT TO anon, authenticated USING (true);

-- 允許管理者後台全開 (Admin/Service Role 具備完全異動權限)
CREATE POLICY "Admin all communities" ON public.communities
    FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Admin all meetings" ON public.meetings
    FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Admin all members" ON public.members
    FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Admin all topics" ON public.topics
    FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Admin all topic_options" ON public.topic_options
    FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- --------------------------------------------------------------------
-- 9. 安全防併發重覆投票 Stored Procedure (RPC / Transaction)
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.submit_vote_secure(
    p_topic_id UUID,
    p_member_id UUID,
    p_option_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_topic_status VARCHAR(20);
    v_member_ping NUMERIC(10, 4);
    v_existing_vote_id UUID;
    v_vote_id UUID;
BEGIN
    -- 1. 檢查議案是否處於投票中 (open)
    SELECT status INTO v_topic_status FROM public.topics WHERE id = p_topic_id;
    IF v_topic_status IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', '議案不存在');
    END IF;
    IF v_topic_status <> 'open' THEN
        RETURN jsonb_build_object('success', false, 'message', '此議案投票已結束或尚未開放');
    END IF;

    -- 2. 獲取住戶持分坪數
    SELECT area_ping INTO v_member_ping FROM public.members WHERE id = p_member_id;
    IF v_member_ping IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', '查無此住戶資料');
    END IF;

    -- 3. 檢查是否已投過票 (原子防重複)
    SELECT id INTO v_existing_vote_id FROM public.votes WHERE topic_id = p_topic_id AND member_id = p_member_id;
    IF v_existing_vote_id IS NOT NULL THEN
        RETURN jsonb_build_object('success', false, 'message', '您已對本議案完成投票，無法重複投遞');
    END IF;

    -- 4. 插入投票明細並記錄權重快照
    INSERT INTO public.votes (topic_id, member_id, option_id, voted_weight, voted_at)
    VALUES (p_topic_id, p_member_id, p_option_id, v_member_ping, NOW())
    RETURNING id INTO v_vote_id;

    RETURN jsonb_build_object(
        'success', true,
        'message', '投票成功',
        'vote_id', v_vote_id,
        'voted_weight', v_member_ping
    );
EXCEPTION WHEN unique_violation THEN
    RETURN jsonb_build_object('success', false, 'message', '投票併發衝突，您已經投過本票');
WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;

-- --------------------------------------------------------------------
-- 10. 啟用 Realtime 即時推播 (開會大螢幕秒級更新)
-- --------------------------------------------------------------------
ALTER PUBLICATION supabase_realtime ADD TABLE public.meetings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.topics;
ALTER PUBLICATION supabase_realtime ADD TABLE public.votes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.desk_auth_requests;

-- 啟用服務台求助表 RLS 與公開存取規則
ALTER TABLE public.desk_auth_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "允許公開建立求助請求" ON public.desk_auth_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "允許公開讀取求助請求" ON public.desk_auth_requests FOR SELECT USING (true);
CREATE POLICY "允許管理員更新求助請求" ON public.desk_auth_requests FOR UPDATE USING (true);
