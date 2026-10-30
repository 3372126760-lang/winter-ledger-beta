import zipfile,xml.etree.ElementTree as E,json
from pathlib import Path
N={'m':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
files=[Path('C:/Users/33721/Desktop/无尽冬日/攻略/活动/礼包性价比自动计算（火五-火十） - 副本.xlsx'),Path('C:/Users/33721/Desktop/无尽冬日/攻略/价值/各种材料价值表（四代).xlsx')]
results=[]
for path in files:
 with zipfile.ZipFile(path) as z:
  strings=[]
  if 'xl/sharedStrings.xml' in z.namelist():
   strings=[''.join(e.itertext()) for e in E.fromstring(z.read('xl/sharedStrings.xml')).findall('m:si',N)]
  rel={r.attrib['Id']:r.attrib['Target'] for r in E.fromstring(z.read('xl/_rels/workbook.xml.rels'))}
  for sh in E.fromstring(z.read('xl/workbook.xml')).findall('m:sheets/m:sheet',N):
   name=sh.attrib['name']
   if path==files[0] and name!='材料价值表': continue
   target=rel[sh.attrib['{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id']];target=target.lstrip('/') if target.startswith('/') else 'xl/'+target
   rows=[]
   for row in E.fromstring(z.read(target)).findall('m:sheetData/m:row',N):
    cells={}
    for ce in row:
     v=ce.find('m:v',N);value=v.text if v is not None else ''
     if ce.attrib.get('t')=='s' and value:value=strings[int(value)]
     if ce.attrib.get('t')=='inlineStr':value=''.join(ce.find('m:is',N).itertext())
     f=ce.find('m:f',N)
     if value or f is not None:cells[ce.attrib['r']]={'v':value,'f':f.text if f is not None else None}
    if any(any(k in str(v['v']) for k in ['火五','战争学院','装备箱','专精','领主宝石','宠物口粮','加速','火晶','螺丝']) for v in cells.values()): rows.append(cells)
   results.append({'file':str(path),'sheet':name,'rows':rows})
Path('docs/冲突价格原表追溯-2026-10-26.json').write_text(json.dumps(results,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(results,ensure_ascii=True))
