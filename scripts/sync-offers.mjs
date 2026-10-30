import { readFile, writeFile, rename } from 'node:fs/promises';
import {applyOfferCorrections} from '../src/domain/offer-corrections.js';
import { OFFER_SOURCES, normalizePacks, auditOffers } from '../src/domain/offers.js';

// Updates source snapshots only. Browser drafts and personal prices are separate.
const packs = (await Promise.all(Object.entries(OFFER_SOURCES).map(async ([category, source]) => {
  const response = await fetch(source.api, { signal: AbortSignal.timeout(25000) });
  if (!response.ok) throw new Error(`${source.name}读取失败：${response.status}`);
  return normalizePacks(category, await response.json());
}))).flat();
applyOfferCorrections(packs,JSON.parse(await readFile(new URL('../src/data/offer-corrections.json',import.meta.url))).corrections);
if (new Set(packs.map(p=>p.id)).size !== packs.length) throw new Error('来源身份重复，停止更新');
const data = { schemaVersion:1, asOf:new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Shanghai'}).format(new Date()),
  sources:OFFER_SOURCES, packs, audit:auditOffers(packs) };
const target = new URL('../src/data/offers.json', import.meta.url);
const temp = new URL('../src/data/offers.json.tmp', import.meta.url);
await writeFile(temp, JSON.stringify(data,null,2)+'\n','utf8');
await rename(temp,target);
console.log(`已整理${packs.length}个礼包、${packs.reduce((s,p)=>s+p.sections.length,0)}组分段。`);
console.log(`校对记录${data.audit.findings.length}项，进度待确认${data.audit.unresolvedSections}组，道具／单位待对齐${data.audit.unresolvedMaterials.length}种。`);
