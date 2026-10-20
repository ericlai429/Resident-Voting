# -*- coding: utf-8 -*-
import sys
import io

# Ensure UTF-8 output on Windows consoles
if sys.stdout.encoding != 'utf-8':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
if sys.stderr.encoding != 'utf-8':
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE

def create_deck(version_name, filename, theme):
    prs = Presentation()
    # A3 橫向尺寸：420mm x 297mm (16.535 x 11.693 吋)
    prs.slide_width = Inches(16.535)
    prs.slide_height = Inches(11.693)
    blank_layout = prs.slide_layouts[6]

    for slide_data in theme['slides']:
        slide = prs.slides.add_slide(blank_layout)

        # 1. 背景顏色矩形
        bg_shape = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, prs.slide_width, prs.slide_height)
        bg_shape.fill.solid()
        bg_shape.fill.fore_color.rgb = theme['bg_color']
        bg_shape.line.color.rgb = theme['bg_color']

        # 2. 頂部標題區
        header_box = slide.shapes.add_textbox(Inches(0.8), Inches(0.6), Inches(14.9), Inches(1.9))
        tf = header_box.text_frame
        tf.word_wrap = True

        # Tagline
        p0 = tf.paragraphs[0]
        p0.text = slide_data['tag']
        p0.font.size = Pt(13)
        p0.font.bold = True
        p0.font.color.rgb = theme['tag_color']

        # Title
        p1 = tf.add_paragraph()
        p1.text = slide_data['title']
        p1.font.size = Pt(28)
        p1.font.bold = True
        p1.font.color.rgb = theme['title_color']
        p1.space_before = Pt(6)

        # Subtitle
        p2 = tf.add_paragraph()
        p2.text = slide_data['subtitle']
        p2.font.size = Pt(16)
        p2.font.bold = True
        p2.font.color.rgb = theme['subtitle_color']
        p2.space_before = Pt(4)

        # 3. 三大核心功能卡片
        card_width = Inches(4.7)
        card_height = Inches(7.0)
        card_y = Inches(2.7)
        spacing = Inches(0.4)
        start_x = Inches(0.8)

        for i, card in enumerate(slide_data['cards']):
            cx = start_x + i * (card_width + spacing)

            # 卡片背景
            c_bg = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, cx, card_y, card_width, card_height)
            c_bg.fill.solid()
            c_bg.fill.fore_color.rgb = theme['card_bg']
            c_bg.line.color.rgb = theme['card_border']
            c_bg.line.width = Pt(2.0)

            ctf = c_bg.text_frame
            ctf.word_wrap = True
            ctf.margin_left = Inches(0.35)
            ctf.margin_right = Inches(0.35)
            ctf.margin_top = Inches(0.35)
            ctf.margin_bottom = Inches(0.35)

            # 卡片標題
            cp0 = ctf.paragraphs[0]
            cp0.text = f"{card['icon']} {card['title']}"
            cp0.font.size = Pt(20)
            cp0.font.bold = True
            cp0.font.color.rgb = theme['card_title_color']

            # 功能定位說明
            cp1 = ctf.add_paragraph()
            cp1.text = card['subtitle']
            cp1.font.size = Pt(13)
            cp1.font.bold = True
            cp1.font.color.rgb = theme['tag_color']
            cp1.space_before = Pt(4)
            cp1.space_after = Pt(10)

            # 具體功能條列
            for bullet in card['bullets']:
                bp = ctf.add_paragraph()
                bp.text = f"• {bullet}"
                bp.font.size = Pt(12)
                bp.font.color.rgb = theme['bullet_color']
                bp.space_before = Pt(6)

            # 功能指標
            stat_p = ctf.add_paragraph()
            stat_p.text = f"【核心指標】{card['stat']}"
            stat_p.font.size = Pt(12)
            stat_p.font.bold = True
            stat_p.font.color.rgb = theme['stat_color']
            stat_p.space_before = Pt(16)

        # 4. 底部總結橫條
        foot_shape = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(10.1), Inches(14.9), Inches(0.9))
        foot_shape.fill.solid()
        foot_shape.fill.fore_color.rgb = theme['foot_bg']
        foot_shape.line.color.rgb = theme['foot_border']
        ftf = foot_shape.text_frame
        ftf.word_wrap = True
        ftf.margin_left = Inches(0.4)
        ftf.margin_top = Inches(0.18)

        fp = ftf.paragraphs[0]
        fp.text = f"⚙️ 功能運作論述 · {slide_data['summary']}"
        fp.font.size = Pt(12)
        fp.font.bold = True
        fp.font.color.rgb = theme['foot_text']

    prs.save(filename)
    print(f"✅ 已成功產出 PPTX 檔案：{filename}")

# 版本一數據：【大會現場作業流程流】(Operational Workflow Deck)
theme_v1 = {
    'bg_color': RGBColor(241, 245, 249), # Slate-100
    'title_color': RGBColor(15, 23, 42),
    'subtitle_color': RGBColor(2, 132, 199), # Sky-600
    'tag_color': RGBColor(3, 105, 161),
    'card_bg': RGBColor(255, 255, 255),
    'card_border': RGBColor(226, 232, 240),
    'card_title_color': RGBColor(15, 23, 42),
    'bullet_color': RGBColor(51, 65, 85),
    'stat_color': RGBColor(2, 132, 199),
    'foot_bg': RGBColor(15, 23, 42),
    'foot_border': RGBColor(30, 41, 59),
    'foot_text': RGBColor(255, 255, 255),
    'slides': [
        {
            'tag': '階段一 · 會前準備與身分驗證功能模組',
            'title': '493戶名冊自動匯入、智慧正規化匹配與實體憑證發卡功能',
            'subtitle': '建構零打字、零出錯的名冊解析與雙因子報到驗證體系',
            'summary': '透過 Excel 匯入自動換算持分比率、台灣門牌去前綴零容錯解析，結合 A4 12 格實體護貝憑證，完成 0 秒身分鎖定。',
            'cards': [
                {
                    'icon': '📑',
                    'title': 'Excel 名冊匯入與權重換算',
                    'subtitle': '493 戶清冊自動化解析處理',
                    'bullets': [
                        '一鍵匯入 Excel，自動拆分棟別、樓層、姓名、手機與專有坪數',
                        '持分比例（Weight Ratio）自動精算至小數點後 6 位',
                        '全社區持分加總嚴格校驗 100%，名冊匯入後總坪數防漏檢查',
                        '管理員帳號自動隔離保留，防止匯入時覆蓋管理後台身分'
                    ],
                    'stat': '493 戶名冊匯入秒級解析，權重比精確度 0.000001'
                },
                {
                    'icon': '🎯',
                    'title': '門牌正規化與智慧匹配',
                    'subtitle': '多維度語意結構化去零比對',
                    'bullets': [
                        '支援「12F-08」與「12F-8」、「12樓8號」、「12-8」全自動等價識別',
                        '獨立四軸輪盤（棟/樓/室/之幾），住戶單手滑動秒選戶號',
                        '嚴格隔離 12F-1 與 12F-15、2F-1 與 12F-1，剔除模糊包含誤匹配',
                        '雙因子驗證：戶號 + 手機末四碼 + 當日現場 4 碼 PIN 碼（防遠端灌票）'
                    ],
                    'stat': '門牌匹配成功率 100.0%，誤認率 0.000%'
                },
                {
                    'icon': '🎟️',
                    'title': 'A4 護貝實體憑證卡印製',
                    'subtitle': '限定 admin/admin1 啟用 · 3×4 網格',
                    'bullets': [
                        '每頁 A4 嚴格排列 12 張憑證卡（3 欄 × 4 列），493 戶精準分割 42 頁',
                        '特大加粗門牌戶號（22-26px），搭配 3.5px 黑色實心粗外邊框',
                        '≥2cm 護貝預留粗虛線裁切線，裁切後直接放入熱膠膜密封防起泡',
                        '內嵌高對比黑白 QR 碼，住戶到場出示相機一掃 0 秒免打字完成報到'
                    ],
                    'stat': '每張 A4 容納 12 格憑證，護貝留邊 ≥ 2 公分'
                }
            ]
        },
        {
            'tag': '階段二 · 會中投票防弊與法規運算功能模組',
            'title': '一人一票防弊快照、公寓大廈條例第31條雙門檻與服務台救援功能',
            'subtitle': '表決當下坪數凍結，雙門檻自動化運算判定，服務台跨螢幕即時授權',
            'summary': '嚴格恪遵法定雙門檻（戶數過半且坪數過半），投票瞬間鎖定專有坪數快照，結合服務台換機解綁完成會中表決風控。',
            'cards': [
                {
                    'icon': '🔒',
                    'title': '一人一票與坪數快照防弊',
                    'subtitle': '原子級不可逆 Snapshot 鎖定',
                    'bullets': [
                        '綁定手機特徵 UUID，初次登入鎖定該裝置，防止同戶跨機重複投票',
                        '點擊表決當下，系統即時將權狀專有坪數凍結為不可篡改快照',
                        '並行連點與重複送票原子級攔截，符合資料庫交易一致性',
                        '支援是非題（贊成/反對/棄權）與自訂多方案候選案獨立計票'
                    ],
                    'stat': '表決重複投票攔截率 100%，坪數持分快照不可竄改'
                },
                {
                    'icon': '⚖️',
                    'title': '條例第31條雙門檻運算',
                    'subtitle': '法定雙門檻演算法自動判定',
                    'bullets': [
                        '嚴格並行檢驗：【同意戶數 > 50%】且【同意持分坪數 > 50%】',
                        '雙項條件缺一不可，未達標自動精準指涉成因（如：持分未過半）',
                        '防止少數大坪數戶霸凌多數戶，亦杜絕多數小套房侵害大戶產權',
                        '支援出席成會門檻判定與議案決議門檻獨立判定'
                    ],
                    'stat': '公寓大廈條例第 31 條雙門檻即時自動判定'
                },
                {
                    'icon': '⚡',
                    'title': '大會服務台現場即時救援',
                    'subtitle': '即時授權開通 · 換機解綁 · 電話更正',
                    'bullets': [
                        '住戶手機末碼不符時自動派發求助單，現場管理台單鍵查驗核准',
                        '更換新手機時，後台一鍵解綁舊機 UUID，自動安全接納新裝置',
                        '登記市話現場更正為手機末碼，住戶端 0 秒同步放行進入表決',
                        '三層容災同步：BroadcastChannel + Storage事件 + 1.2s 斷網輪詢'
                    ],
                    'stat': '跨裝置廣播延遲 < 0.1 秒，支援地下室斷網定時輪詢'
                }
            ]
        },
        {
            'tag': '階段三 · 會後計票投影、官方報表與抗災存證功能模組',
            'title': '現場大螢幕即時計票戰情室、A3 法定呈報表與離線高密度 QR 碼',
            'subtitle': '投開票公開透明零爭議，散會即產出報表簽署，完全斷網相機直掃還原',
            'summary': '動態長條圖縮減 70% 議程時間，A3 法定報表會後立即簽報工務局，高密度 QR 碼實現 100% 離線抗災還原。',
            'cards': [
                {
                    'icon': '📺',
                    'title': '大螢幕即時計票戰情室',
                    'subtitle': '投影即時開票 · 全場公開公證',
                    'bullets': [
                        '住戶手機投票送出，大螢幕長條圖毫秒級同步跳動刷新',
                        '動態顯示出席戶數、出席坪數、各案贊成/反對票數與持分佔比',
                        '即時指示雙門檻達成進度，全場公證見證，徹底消除黑箱疑慮',
                        '計票等待時間自傳統紙本人工唱票的 3~4 小時降至 0 秒'
                    ],
                    'stat': '大會投開票議事時間縮減 70% 以上'
                },
                {
                    'icon': '📑',
                    'title': 'A3 橫式法定決議公報',
                    'subtitle': '對齊新北市工務局報備標準規範',
                    'bullets': [
                        '官方橫向 A3 排版，單頁匯總開會時間地點、出席率與表決結果',
                        '各案贊成、反對、棄權之戶數與持分坪數完全對齊地政清冊',
                        '閉幕現場一鍵列印彩色列印，主任委員與大會總幹事當場簽署生效',
                        '免除大會結束後耗費數週彙整與人工核對算票的行政沉重負擔'
                    ],
                    'stat': '大會決議報表 0 秒自動編排，散會即印即簽'
                },
                {
                    'icon': '🔲',
                    'title': '離線高密度結算 QR 憑證',
                    'subtitle': 'LZ-String 壓縮 · 斷網相機秒解讀',
                    'bullets': [
                        '將全場大會時間、地點、成會率、全體表決數據濃縮為單一 QR 碼',
                        '任何手機原廠相機在斷網無伺服器環境下，100% 完整解讀還原報表',
                        '內建 SHA 數位防偽校驗簽章，具備防紙本造假竄改之不可逆檢驗',
                        '大會正式上線前具備「一鍵淨空」：清空選票重置報到，0 歷史污染'
                    ],
                    'stat': '100% 離線抗災還原，大會總幹事 33 項驗收全綠燈'
                }
            ]
        }
    ]
}

# 版本二數據：【管委會架構與法規風控陣列】(Architecture & Risk Control Deck)
theme_v2 = {
    'bg_color': RGBColor(15, 23, 42), # Slate-900 深色
    'title_color': RGBColor(255, 255, 255),
    'subtitle_color': RGBColor(56, 189, 248), # Sky-400
    'tag_color': RGBColor(14, 165, 233),
    'card_bg': RGBColor(30, 41, 59),
    'card_border': RGBColor(51, 65, 85),
    'card_title_color': RGBColor(255, 255, 255),
    'bullet_color': RGBColor(203, 213, 225),
    'stat_color': RGBColor(56, 189, 248),
    'foot_bg': RGBColor(2, 6, 23),
    'foot_border': RGBColor(30, 41, 59),
    'foot_text': RGBColor(148, 163, 184),
    'slides': [
        {
            'tag': '系統模組一 · 接入授權與名冊正規化中樞',
            'title': '身分識別體系、門牌語意正規化引擎與實體離線發卡架構',
            'subtitle': '整合台灣門牌多樣性表示法、防止誤匹配漏洞與實體抗災發卡機制',
            'summary': '以四維度正規化演算解決 12F-1 與 12F-15 誤匹配漏洞，支援雙因子防遠端灌票與 A4 12 格實體護貝憑證卡。',
            'cards': [
                {
                    'icon': '⚙️',
                    'title': '門牌語意正規化引擎架構',
                    'subtitle': '台灣門牌多樣性統一標準化',
                    'bullets': [
                        '正則語意剖析「棟別、樓層、室號、之幾」四維度獨立實體',
                        '智慧去除前綴零：自動將 12F-08、12樓8號、12-8 轉為標準字串',
                        '完全剔除 includes 模糊包含比對，杜絕 12F-1 匹配 12F-15 漏洞',
                        '跨棟別隔離機制：A棟-12F-8 與 B棟-12F-8 嚴格分流'
                    ],
                    'stat': '四維度正規化剖析，誤認率 0.000%'
                },
                {
                    'icon': '🔑',
                    'title': '三因子大會防偽登入閘門',
                    'subtitle': '身分查驗 · 手機末碼 · 現場PIN碼',
                    'bullets': [
                        '第一因子：門牌戶號（滾輪滑動選定，支援鍵盤手動備援輸入）',
                        '第二因子：地政名冊登記所有權人手機末四碼身分核算',
                        '第三因子：當日大會現場動態 4 碼 PIN 碼（當日23:59:59失效）',
                        '無效遠端灌票防杜：未到場住戶即使得知戶號亦無法越區投票'
                    ],
                    'stat': '有效防杜遠端未到場幽靈投票 100%'
                },
                {
                    'icon': '🪪',
                    'title': '法定 A4 憑證印製子系統',
                    'subtitle': '大戶號 · 3.5px 粗框 · 2cm 護貝虛線',
                    'bullets': [
                        '限定 admin (主委) / admin1 (總幹事) 授權啟用，具備安全鎖定',
                        'A4 直向標準版面 3×4 排列，單頁 12 格，493 戶自動演算 42 頁',
                        '特大戶號置頂（22-26px）+ 3.5px 粗實心外框，公信力高規辨識',
                        '外圍 ≥2cm 粗虛線裁切指南，剪裁後適配熱護貝膠膜密封'
                    ],
                    'stat': '限定 admin/admin1 啟用，A4 容納 12 格'
                }
            ]
        },
        {
            'tag': '系統模組二 · 法規運算、票務防弊與高並發狀態中樞',
            'title': '一人一票坪數快照鎖定、條例第31條雙門檻運算與容災同步中樞',
            'subtitle': '建立具備法律剛性的不可逆表決 Snapshot，落實司法級程序正義',
            'summary': '以原子級快照凍結表決坪數，嚴格落實人數過半且坪數過半法定雙門檻，結合三層容災通訊保證高並發穩定。',
            'cards': [
                {
                    'icon': '🛡️',
                    'title': '持分坪數原子級快照機制',
                    'subtitle': 'IMMUTABLE WEIGHT SNAPSHOT',
                    'bullets': [
                        '住戶送出選票當下，即刻固化當前持分坪數與權重比率為 Snapshot',
                        '嚴防大會開會期間名冊異動、過戶買賣造成之持分爭議',
                        '單一裝置特徵 UUID 綁定，阻斷多設備並行登入與同戶重複投票',
                        '資料庫層級 ACID 交易原子性保證，每票皆具備不可逆數位簽章'
                    ],
                    'stat': '權利持分即時快照，杜絕二次重複表決'
                },
                {
                    'icon': '⚖️',
                    'title': '法規第31條雙門檻運算核心',
                    'subtitle': 'PARALLEL DUAL-THRESHOLD ENGINE',
                    'bullets': [
                        '門檻一：同意戶數必須嚴格大於出席戶數之 50%',
                        '門檻二：同意持分坪數必須嚴格大於出席坪數之 50%',
                        '雙門檻並行審查，未達標自動產出精準成因（人數未過或持分未過）',
                        '兼顧多數決民主程序與民法所有權持分保障，杜絕訴訟爭議'
                    ],
                    'stat': '《公寓大廈管理條例》第 31 條法定判定'
                },
                {
                    'icon': '📡',
                    'title': '三層容災通訊與服務台管制',
                    'subtitle': '0ms 廣播 · 本地快取 · 離線定時輪詢',
                    'bullets': [
                        '第一層：BroadcastChannel 跨視窗 0ms 即時廣播同步',
                        '第二層：LocalStorage storage 事件脈衝通訊（跨分頁/進程）',
                        '第三層：1.2 秒定時輪詢備援機制（支援地下室無網路環境開通）',
                        '現場服務台換機解綁、號碼更正單鍵完成，住戶端 0 秒同步放行'
                    ],
                    'stat': '三層通訊備援，跨裝置推播延遲 < 0.1 秒'
                }
            ]
        },
        {
            'tag': '系統模組三 · 可視化開票、法規呈報與離線防偽存證架構',
            'title': '大螢幕實時戰情室、A3 官方呈報公報與 Air-Gapped 離線防偽 QR',
            'subtitle': '開票全流程公開透明，產出合規備查公文，離線狀態具備完整還原能力',
            'summary': '大螢幕開票長條圖化解黑箱猜忌，A3 法定報表會後即刻簽署，LZ-String 離線高密度封裝保證斷網下百分百還原。',
            'cards': [
                {
                    'icon': '🖥️',
                    'title': '即時計票戰情視覺化中樞',
                    'subtitle': 'LIVE WAR-ROOM ENGINE',
                    'bullets': [
                        '大會現場大投影同步展現出席率進度與各案表決長條圖動態',
                        '贊成/反對之戶數比例與坪數權重雙軌實時跳動顯示',
                        '即時標記法定雙門檻跨越狀態，消除人工計票爭執與作票質疑',
                        '大幅縮短現場議事等待時間 70%，展現現代化科技治理實力'
                    ],
                    'stat': '開票長條圖即時動態刷新，縮減 70% 議程'
                },
                {
                    'icon': '📋',
                    'title': 'A3 橫式法定呈報公報模組',
                    'subtitle': 'STATUTORY REPORT GENERATOR',
                    'bullets': [
                        '嚴格對齊地方主管機關（工務局）區權會大會決議備查公報格式',
                        '橫向 A3 單頁完整收錄大會時間地點、出席戶數坪數與各案決議',
                        '閉幕現場直接列印彩色公報，主任委員與總幹事當場簽章存證',
                        '會後免耗費數週彙整與算票，大幅降低管委會行政法務負擔'
                    ],
                    'stat': '大會決議公文 0 秒生成，現場即印即簽'
                },
                {
                    'icon': '🔐',
                    'title': 'Air-Gapped 離線高密度 QR',
                    'subtitle': 'RESILIENT AIR-GAPPED ARCHIVE',
                    'bullets': [
                        'LZ-String 高密度壓縮全場大會數據（時間/地點/雙門檻/各案結算）',
                        '無伺服器、完全斷網狀態下，任何手機相機一掃 100% 完整還原',
                        '內嵌 SHA 數位不可逆防偽簽章，具備司法級紙本真實性校驗',
                        '正式大會上線前具備「一鍵淨空」機制，徹底銷毀測試資料 0 污染'
                    ],
                    'stat': '100% 離線抗災還原，33 項自主功能巡檢綠燈'
                }
            ]
        }
    ]
}

if __name__ == '__main__':
    create_deck(
        '版本一',
        r'd:\GitHub\Resident Voting\淡水清淞社區區權會_A3簡報_版本一_大會實務功能流.pptx',
        theme_v1
    )
    create_deck(
        '版本二',
        r'd:\GitHub\Resident Voting\淡水清淞社區區權會_A3簡報_版本二_法規架構功能陣列.pptx',
        theme_v2
    )
