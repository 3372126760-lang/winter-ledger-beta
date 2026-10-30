"""Read static data literals only; never execute downloaded JavaScript."""
import re,json,ast
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
BASE=ROOT/'reference/planning-web-2026-10-26'
TOKEN=re.compile(r'\s+|//[^\n]*|/\*[\s\S]*?\*/|"(?:\\.|[^"\\])*"|\'(?:\\.|[^\'\\])*\'|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|[A-Za-z_$][\w$]*|[\[\]{}:,]',re.M)
def extract(file,name):
 text=(BASE/file).read_text(encoding='utf-8');m=re.search(re.escape(name)+r'\s*=\s*',text)
 if not m:raise ValueError(name)
 pos=m.end()
 def token():
  nonlocal pos
  while True:
   t=TOKEN.match(text,pos)
   if not t:raise ValueError('Unsupported static literal at '+text[pos:pos+40])
   pos=t.end();v=t.group()
   if v.isspace() or v.startswith('//') or v.startswith('/*'):continue
   return v
 def value(t=None):
  t=t or token()
  if t=='[':
   out=[];t=token()
   while t!=']':
    out.append(value(t));t=token()
    if t==',':t=token()
    elif t!=']':raise ValueError('array separator')
   return out
  if t=='{':
   out={};t=token()
   while t!='}':
    key=ast.literal_eval(t) if t[0] in "\"'" else t
    if token()!=':':raise ValueError('object separator')
    out[key]=value();t=token()
    if t==',':t=token()
    elif t!='}':raise ValueError('object comma')
   return out
  if t[0] in "\"'":return json.loads(t) if t[0]=='"' else ast.literal_eval(t)
  if t in ('null','true','false'):return {'null':None,'true':True,'false':False}[t]
  if re.fullmatch(r'-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?',t):return float(t) if any(c in t for c in '.eE') else int(t)
  raise ValueError('Nonliteral identifier '+t)
 return value()
data={}
for file,name in [('T11Calculator.html','t11Data'),('T12Calculator.html','t12Data'),('Architecture10.html','fireData'),('building-upgrade-calculator.html','BUILDING_DATA'),('pet-data-query.html','PET_GROUPS'),('expert-calculator-data.js','window.ExpertCalculatorData')]:
 data[name]=extract(file,name)
(BASE/'extracted.json').write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({k:len(v) for k,v in data.items()},ensure_ascii=True))
