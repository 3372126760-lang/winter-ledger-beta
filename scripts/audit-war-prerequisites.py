import json,re,urllib.request,concurrent.futures,unicodedata
from pathlib import Path
from bs4 import BeautifulSoup
ROOT=Path('reference/rules-audit-2026-10-30');ROOT.mkdir(parents=True,exist_ok=True)
index=BeautifulSoup(Path('reference/research-2026-10-28/wiki-research-index.html').read_text(encoding='utf-8'),'html.parser')
prefixes=('flame-','blazing-','crystal-vision','crystal-armor','crystal-arrow','crystal-protection','helios-','exalted-','molten-','solar-supremacy','indomitable-wall','meridian-phalanx','starfire')
links={a['href']:a.get_text(' ',strip=True) for a in index.find_all('a',href=True) if '/research/' in a['href'] and a['href'].rstrip('/').split('/')[-1].startswith(prefixes)}
def fetch(pair):
 url,name=pair;file=ROOT/(url.rstrip('/').split('/')[-1]+'.html')
 try:
  if not file.exists():file.write_bytes(urllib.request.urlopen(url,timeout=35).read())
  soup=BeautifulSoup(file.read_text(encoding='utf-8'),'html.parser');table=next((t for t in soup.find_all('table') if 'Prerequisites' in t.get_text()),None)
  if table is None:raise ValueError('no prerequisites table')
  rows=[]
  for tr in table.find_all('tr'):
   cols=tr.find_all(['td','th'],recursive=False)
   if len(cols)>=2 and re.fullmatch(r'\d+',cols[0].get_text(strip=True)):
    rows.append({'level':int(cols[0].get_text(strip=True)),'prerequisites':cols[1].get_text('\n',strip=True)})
  return {'name':name,'url':url,'rows':rows}
 except Exception as e:return {'name':name,'url':url,'error':str(e)}
with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:records=list(pool.map(fetch,links.items()))
(ROOT/'war-prerequisites.json').write_text(json.dumps(records,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'pages':len(records),'failed':[r['url'] for r in records if 'error'in r]},ensure_ascii=False))
for r in records:
 if any(k in r['url'] for k in ['flame-squad-2/','flame-strike/','flame-shield/','flame-legion-2/','flame-tomahawk/','flame-protection/','exalted-helm/','molten-blades-i/','molten-blades-%e2%85%b1/','molten-blades-%e2%85%b2/']):print(r['url'],[(x['level'],x['prerequisites']) for x in r.get('rows',[]) if x['prerequisites']])
