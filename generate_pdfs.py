# -*- coding: utf-8 -*-
import os
import sys
import io
import re
import shutil
import subprocess

if sys.stdout.encoding != 'utf-8':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
if sys.stderr.encoding != 'utf-8':
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

CHROME_PATH = r'C:\Program Files\Google\Chrome\Application\chrome.exe'
SRC_HTML = r'd:\GitHub\Resident Voting\public\a3_presentation.html'
PDF_DIR = r'd:\GitHub\Resident Voting\PDF'

os.makedirs(PDF_DIR, exist_ok=True)

with open(SRC_HTML, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. 生成版本一獨立 HTML
# 將 deck-v2 完全移除，並確保 deck-v1 正常顯示
content_v1 = re.sub(r'<div id="deck-v2".*?</div>\s*</main>', '</main>', content, flags=re.DOTALL)
content_v1 = content_v1.replace('<header class="no-print', '<header style="display:none;" class="no-print')
# 確保 print 樣式無邊界
html_v1_path = os.path.join(PDF_DIR, 'temp_v1.html')
with open(html_v1_path, 'w', encoding='utf-8') as f:
    f.write(content_v1)

# 2. 生成版本二獨立 HTML
# 將 deck-v1 完全移除，並將 deck-v2 的 hidden 去除
content_v2 = re.sub(r'<div id="deck-v1".*?</div>\s*<!-- ===+ -->\s*<!-- 版本二', '<!-- 版本二', content, flags=re.DOTALL)
content_v2 = content_v2.replace('id="deck-v2" class="slide-deck space-y-8 print:space-y-0 hidden"', 'id="deck-v2" class="slide-deck space-y-8 print:space-y-0"')
content_v2 = content_v2.replace('<header class="no-print', '<header style="display:none;" class="no-print')
html_v2_path = os.path.join(PDF_DIR, 'temp_v2.html')
with open(html_v2_path, 'w', encoding='utf-8') as f:
    f.write(content_v2)

# 3. 轉為 PDF
targets = [
    (
        html_v1_path,
        os.path.join(PDF_DIR, '淡水清淞社區區權會_A3簡報_版本一_大會實務功能流.pdf'),
        os.path.join(PDF_DIR, 'A3_Presentation_V1_Workflow.pdf')
    ),
    (
        html_v2_path,
        os.path.join(PDF_DIR, '淡水清淞社區區權會_A3簡報_版本二_法規架構功能陣列.pdf'),
        os.path.join(PDF_DIR, 'A3_Presentation_V2_Architecture.pdf')
    ),
]

for html_file, pdf_main, pdf_copy in targets:
    cmd = [
        CHROME_PATH,
        '--headless',
        '--disable-gpu',
        '--no-pdf-header-footer',
        f'--print-to-pdf={pdf_main}',
        html_file
    ]
    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode == 0 and os.path.exists(pdf_main):
        shutil.copyfile(pdf_main, pdf_copy)
        with open(pdf_main, 'rb') as pf:
            p_data = pf.read()
            p_count = len(re.findall(rb'/Type\s*/Page\b', p_data))
        print(f"成功生成: {pdf_main} (頁數: {p_count}, 大小: {os.path.getsize(pdf_main)} bytes)")
    else:
        print(f"生成失敗: {pdf_main}, 錯誤: {res.stderr}")

# 清理 temp 檔案
if os.path.exists(html_v1_path): os.remove(html_v1_path)
if os.path.exists(html_v2_path): os.remove(html_v2_path)
if os.path.exists(os.path.join(PDF_DIR, 'test.pdf')): os.remove(os.path.join(PDF_DIR, 'test.pdf'))
print("PDF 產出作業完畢！")
