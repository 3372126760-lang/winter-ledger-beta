"""Import only current model/reward item artwork; do not import prices/rules."""
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone, timedelta
from hashlib import sha256
from html.parser import HTMLParser
from io import BytesIO
from pathlib import Path
from urllib.parse import urljoin, urlparse
from urllib.request import Request, urlopen
import json
import sys
import time

from PIL import Image

sys.stdout.reconfigure(encoding='utf-8')
ROOT = Path(__file__).resolve().parent.parent
SOURCE = 'https://wosgift.com/zh-cn/items/'
OUT = ROOT / 'public' / 'assets' / 'items'
MANIFEST = ROOT / 'src' / 'data' / 'item-art.json'
OUT.mkdir(parents=True, exist_ok=True)


class ItemParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.items = []
        self.current = None
        self.depth = 0
        self.small = False

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == 'details':
            if self.current:
                self.depth += 1
            elif 'item-card' in a.get('class', '').split():
                self.current = {'categoryId': a.get('data-category', ''), 'category': ''}
                self.depth = 1
        if not self.current:
            return
        if tag == 'small':
            self.small = True
        if tag == 'img' and '/images/items/' in a.get('src', ''):
            url = urljoin(SOURCE, a['src'])
            if urlparse(url).netloc != 'wosgift.com':
                raise ValueError('Unexpected image source')
            self.current.update(name=a.get('alt', '').strip(), sourceUrl=url)

    def handle_data(self, data):
        if self.current and self.small:
            self.current['category'] += data

    def handle_endtag(self, tag):
        if tag == 'small':
            self.small = False
        if tag == 'details' and self.current:
            self.depth -= 1
            if self.depth == 0:
                if not self.current.get('name') or not self.current.get('sourceUrl'):
                    raise ValueError('Item card has no name or image')
                self.current['category'] = self.current['category'].strip()
                self.items.append(self.current)
                self.current = None


def fetch(url):
    request = Request(url, headers={'User-Agent': 'Mozilla/5.0', 'Referer': SOURCE})
    with urlopen(request, timeout=25) as response:
        return response.read()


catalog = json.loads((ROOT / 'src/data/catalog.json').read_text(encoding='utf-8'))
needed_names = {name for item in catalog['items'] for name in [item['name'], *item.get('aliases', []), *([item['artName']] if item.get('artName') else [])]}
expert_path = ROOT / 'src/data/expert-packs.json'
if expert_path.exists():
    expert = json.loads(expert_path.read_text(encoding='utf-8'))
    needed_names.update(reward['name'] for pack in expert['packs'] for reward in pack['primaryRewards'] if reward.get('name'))
parser = ItemParser()
parser.feed(fetch(SOURCE).decode('utf-8'))
if not parser.items:
    raise RuntimeError('No item cards found; existing manifest was kept')
parser.items = [item for item in parser.items if item['name'] in needed_names]
parser.items = list({(item['name'],item['sourceUrl']):item for item in parser.items}.values())
if not parser.items:
    raise RuntimeError('No model-related item cards found; existing manifest was kept')

urls = list(dict.fromkeys(item['sourceUrl'] for item in parser.items))
print(f'发现 {len(parser.items)} 个道具条目，{len(urls)} 张独立图片。', flush=True)


def download(url):
    extension = Path(urlparse(url).path).suffix.lower()
    if extension not in ['.webp', '.png', '.jpg', '.jpeg', '.gif', '.avif']:
        raise ValueError('Unsupported image extension')
    filename = sha256(url.encode()).hexdigest()[:24] + extension
    destination = OUT / filename
    error = None
    for attempt in range(3):
        try:
            content = destination.read_bytes() if destination.exists() and attempt == 0 else fetch(url)
            with Image.open(BytesIO(content)) as picture:
                width, height = picture.size
                picture.verify()
            if width < 1 or height < 1:
                raise ValueError('Invalid image dimensions')
            if not destination.exists() or attempt > 0:
                temporary = destination.with_suffix(extension + '.part')
                temporary.write_bytes(content)
                temporary.replace(destination)
            return url, {'localPath': '/public/assets/items/' + filename,
                         'sha256': sha256(content).hexdigest(), 'bytes': len(content),
                         'width': width, 'height': height}
        except Exception as exc:
            error = str(exc)
            time.sleep(0.5 * (attempt + 1))
    return url, {'localPath': None, 'error': error}


results = {}
with ThreadPoolExecutor(max_workers=8) as pool:
    tasks = [pool.submit(download, url) for url in urls]
    for future in as_completed(tasks):
        url, record = future.result()
        results[url] = record
        if len(results) % 60 == 0 or len(results) == len(urls):
            print(f'已检查 {len(results)}/{len(urls)} 张图片', flush=True)

entries = []
for index, item in enumerate(parser.items):
    entry = {**item, 'id': 'wosgift-' + sha256((item['name'] + '|' + item['sourceUrl']).encode()).hexdigest()[:20],
             **results[item['sourceUrl']]}
    entries.append(entry)

extra_path = ROOT / 'src/data/item-art-extra.json'
extra = json.loads(extra_path.read_text(encoding='utf-8')) if extra_path.exists() else {'entries': [], 'sources': []}
for entry in extra['entries']:
    if entry.get('sourceFile') and entry.get('localPath') and (ROOT / entry['localPath'].lstrip('/')).exists():
        entries.append(entry)
        continue
    if entry['name'] not in needed_names:
        continue
    url, record = download(entry['sourceUrl'])
    results[url] = record
    if url not in urls:
        urls.append(url)
    entries.append({**entry, **record})

failed = [url for url in urls if not results[url].get('localPath')]
data = {'schemaVersion': 1, 'scope': '当前模型道具及已录入礼包奖励', 'sourceName': 'WosGift · 无尽冬日道具资料库', 'sourceUrl': SOURCE,
        'asOf': datetime.now(timezone(timedelta(hours=8))).date().isoformat(),
        'additionalSources': extra['sources'], 'entryCount': len(entries), 'uniqueImageCount': len({e['localPath'] for e in entries if e.get('localPath')}), 'failedUrls': failed, 'entries': entries}
temporary = MANIFEST.with_suffix('.json.tmp')
temporary.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
temporary.replace(MANIFEST)
(OUT / 'SOURCES.md').write_text(
    '# Item artwork\n\nSource: ' + SOURCE + '\n\n'
    'Only artwork needed by the current model and recorded pack rewards is imported. Game artwork belongs to its respective rights holders. '
    'Names and categories are retained as source metadata; game rules, prices and descriptions are not imported.\n\n'
    'Per-image source URL, local path, dimensions and SHA-256 are recorded in src/data/item-art.json.\n', encoding='utf-8')
print(f'完成：{len(entries)} 个条目，{len(urls) - len(failed)} 张图片可用，失败 {len(failed)} 张。', flush=True)
if failed:
    sys.exit(1)
