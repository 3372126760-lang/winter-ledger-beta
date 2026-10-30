"""Extract ordinary research reference rows without changing the source workbook.

The source is an incomplete value-comparison sheet, not a complete recipe table.
Never copy its money columns into material quantities or fill missing research times.
"""
import json
import re
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path('C:/Users/33721/Desktop/无尽冬日/攻略/价值/科技.xlsx')
TARGET = ROOT / 'reference/planning-web-2026-10-26/normal-research.json'
NS = {'m': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}


def read_rows(path):
    with zipfile.ZipFile(path) as archive:
        shared = []
        if 'xl/sharedStrings.xml' in archive.namelist():
            shared = [''.join(node.itertext()) for node in ET.fromstring(
                archive.read('xl/sharedStrings.xml')).findall('m:si', NS)]
        root = ET.fromstring(archive.read('xl/worksheets/sheet1.xml'))
        records = []
        for row in root.findall('m:sheetData/m:row', NS):
            cells = {}
            for cell in row:
                value = cell.find('m:v', NS)
                text = value.text if value is not None else ''
                if cell.attrib.get('t') == 's' and text:
                    text = shared[int(text)]
                if cell.attrib.get('t') == 'inlineStr':
                    text = ''.join(cell.find('m:is', NS).itertext())
                if text:
                    cells[cell.attrib['r']] = text
            records.append((int(row.attrib['r']), cells))
        return records


source = {
    'id': 'ordinary-research-local-2026-10-26',
    'title': '普通科技参考表 · 科技.xlsx / Sheet1!A1:J95',
    'url': '',
    'path': str(SOURCE),
    'sheet': 'Sheet1',
    'range': 'A1:J95',
    'status': '只读提取。部分科技等级、原文效果与基准研究时间；不是完整升级配方。'
}
notes = [
    '普通科技与战争学院T11/T12分开。火晶科技计算.xlsx包含微粒和钢材配方，未放入普通科技。',
    '此表列出23组名称含6或7的科技以及其中部分等级；保留原名，不将名称末尾数字映射为英雄代数或服务器进度。',
    '普通资源消耗、完整前置链、低等级基础属性缺失，所有路径标为仅查阅，不参与完整成本或最优提升排序。',
    'C列为空的升级没有补写时间，不将同科技首行时间复制到后续等级。',
    'D列只有原文效果，未明确是每级增量还是该级总值，保留effect，不填attributes最终值。',
    'E/F/G列是旧价格与收益估值，不是材料数量；J列注明研究速度按0、1小时加速按0.7计算，未作为当前模型价格。',
    '研究时间仅作原表基准；未自动折算成必须购买的加速，也未抵扣联盟帮助、研究速度或免费等待。'
]
paths, current = [], None
raw_rows = read_rows(SOURCE)
for number, cells in raw_rows:
    if number == 1:
        continue
    name = cells.get(f'A{number}', '').strip()
    raw_level = cells.get(f'B{number}', '')
    if name:
        current = {
            'id': f'ordinary-research-{len(paths) + 1}',
            'name': name,
            'source': source['id'],
            'unitLabel': '项科技',
            'maxPieces': 1,
            'coverage': '普通科研所部分等级；原文效果和少量基准时间可查，升级配方待补。',
            'prerequisiteNote': '科研所等级、前置科技和同名科技阶段须按游戏内核对。',
            'costStatus': 'unverified',
            'rows': []
        }
        paths.append(current)
    if not current or not re.fullmatch(r'\d+', raw_level):
        continue
    level = int(raw_level)
    raw_hours = cells.get(f'C{number}', '')
    hours = float(raw_hours) if raw_hours else None
    effect = cells.get(f'D{number}', '')
    current['rows'].append({
        'level': level,
        'label': f'等级 {level}',
        'cost': {},
        'resources': {},
        'timeHours': hours,
        'attributes': [],
        'effect': f'原表效果：{effect}（增量或总值口径待核对）' if effect else '原表未列该等级效果',
        'sourceRow': number,
        'sourceCells': f'Sheet1!A{number}:D{number}'
    })

for path in paths:
    first = path['rows'][0]['level']
    path['baseline'] = {'level': first - 1, 'label': f'等级 {first - 1}（原表未列属性）',
                        'attributes': [], 'effect': '原表未列初始属性；不可据此视作0属性'}

payload = {'asOf': '2026-10-26', 'source': source, 'sources': [source],
           'paths': paths, 'notes': notes}
TARGET.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

summary = ['# 普通科技资料核对', '', '核对日期：2026-10-26。C盘参考文件仅只读。', '',
           f'来源：{SOURCE}，Sheet1!A1:J95。', '',
           '该表可识别为科研所普通科技，含武器特训、稳守反击、精准射击等；未使用含火晶微粒和钢材的火晶科技表代替。', '',
           f'已提取{len(paths)}组、{sum(len(path["rows"]) for path in paths)}条等级记录；其中仅{sum(row["timeHours"] is not None for path in paths for row in path["rows"])}条有时间。', '',
           '## 适用范围', '']
summary += ['- ' + note for note in notes]
summary += ['', '## 可查阅路径', '', '| 科技原名 | 已列等级 | 有时间的等级 |', '|---|---|---|']
for path in paths:
    summary.append('| ' + path['name'] + ' | ' + ', '.join(str(row['level']) for row in path['rows']) + ' | ' +
                   ', '.join(f'{row["level"]}级：{row["timeHours"]}小时' for row in path['rows'] if row['timeHours'] is not None) + ' |')
summary += ['', '## 网上交叉核对', '',
            '- 冬日工具箱首页 https://wjgl.store/ 提供T11、T12科技及参考总览；本次未找到完整的普通科技逐级原始消耗表。',
            '- 冬日工具箱参考总览 https://wjgl.store/function/reference-hub/index.html 当前目录以活动/礼包为主，未找到普通科技配方。',
            '- 官方FAQ https://wjdrgl.wjdr.cn/faq/faq/ 明确区分科研所战斗科技与其他系统，但未列普通科技逐级消耗。',
            '- 此前的三个金山文档链接在当前工具无法直接读取，因此未把不可见内容当作已核对数据。', '',
            '缺完整资源、时间及属性基线之前，这些路径只支持资料预览；不能宣称已经完成普通科技最优规划。', '']
(ROOT / 'docs/普通科技资料核对-2026-10-26.md').write_text('\n'.join(summary), encoding='utf-8')
print(json.dumps({'paths': len(paths), 'rows': sum(len(path['rows']) for path in paths),
                  'knownTimes': sum(row['timeHours'] is not None for path in paths for row in path['rows'])}))

