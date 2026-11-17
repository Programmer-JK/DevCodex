#!/usr/bin/env node
// Imports legacy HTML books into public/books/<slug>/ (copies only — inputs are never modified)
// and generates src/generated/catalog.json, src/generated/search-index.json, docs/legacy-audit.md.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import * as cheerio from 'cheerio';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const USER_DIRS = ['incoming', 'source-books'];
const SAMPLE_DIR = 'samples';
const OUT_BOOKS = path.join(ROOT, 'public/books');
const OUT_GEN = path.join(ROOT, 'src/generated');
const META_FILE = path.join(ROOT, 'books.meta.json');
const MAX_SECTION_TEXT = 1500;
const HEADINGS = 'h1,h2,h3,h4,h5,h6';

export function slugify(name) {
  const s = name.toLowerCase().replace(/\.html?$/, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return s || 'book-' + crypto.createHash('sha1').update(name).digest('hex').slice(0, 8);
}

export function guessCategory(text) {
  const t = text.toLowerCase();
  if (/spring|java|jpa|jvm/.test(t)) return 'java-spring';
  if (/sql|oracle|database|db\b|mysql|postgres/.test(t)) return 'database';
  if (/front|react|javascript|\bjs\b|css|html|browser|vue|typescript/.test(t)) return 'frontend';
  return 'other';
}

const clean = (s) => s.replace(/\s+/g, ' ').trim();

/** Extract title, TOC sections and search entries from raw HTML. Pure; used by tests. */
export function analyzeHtml(html, { bookId, entryUrl, fallbackTitle }) {
  const $ = cheerio.load(html);
  // Order is computed on the full DOM so it matches document.querySelectorAll(HEADINGS) in the reader.
  $(HEADINGS).each((i, el) => { $(el).attr('data-dc-order', String(i)); });
  const title = clean($('title').first().text()) || clean($('h1').first().text()) || fallbackTitle;
  $('script,style,noscript,template,nav,svg,button').remove();

  const sections = [];
  const entries = [];
  let cur = { sectionId: undefined, heading: title, level: 0, anchor: undefined, text: '' };
  const flush = () => {
    const text = clean(cur.text).slice(0, MAX_SECTION_TEXT);
    if (text || cur.sectionId) {
      entries.push({
        bookId, sectionId: cur.sectionId, heading: cur.heading, textSnippet: text,
        rankHint: cur.level || 7, sourceUrl: entryUrl + (cur.anchor ? '#' + cur.anchor : ''),
      });
    }
  };
  const walk = (node) => {
    for (const child of node.children || []) {
      if (child.type === 'text') cur.text += ' ' + child.data;
      else if (child.type === 'tag') {
        if (/^h[1-6]$/.test(child.name)) {
          const heading = clean($(child).text());
          const order = Number($(child).attr('data-dc-order'));
          if (!heading) continue;
          flush();
          const anchor = $(child).attr('id') || undefined;
          const section = { id: anchor || `s${order}`, heading, level: Number(child.name[1]), anchor, order };
          sections.push(section);
          cur = { sectionId: section.id, heading, level: section.level, anchor, text: '' };
        } else walk(child);
      }
    }
  };
  walk($('body')[0] || $.root()[0]);
  flush();
  return { title, sections, entries };
}

/** Compatibility checks from PRD §6.3 over the HTML plus its local JS/CSS. */
export function auditText(html, extraCode = '') {
  const all = html + '\n' + extraCode;
  const ext = new Set();
  for (const m of html.matchAll(/<(?:script|link|img|iframe|source)\b[^>]*?(?:src|href)=["']((?:https?:)?\/\/[^"']+)["']/gi)) ext.add(m[1]);
  const widths = [...all.matchAll(/(?<![-\w])(?:min-)?width\s*:\s*(\d{3,})px/gi)].map((m) => Number(m[1])).filter((w) => w >= 600);
  return {
    inlineScripts: (html.match(/<script(?![^>]*\bsrc=)[^>]*>/gi) || []).length,
    externalResources: [...ext],
    fetchOrModules: /\bfetch\s*\(|type=["']module["']|\bimport\s*\(|XMLHttpRequest/.test(all),
    parentWindow: /window\.(open|parent|top)\b|\bparent\.postMessage|top\.location/.test(all),
    fileUrls: [...new Set(all.match(/file:\/\/[^\s"')]+/g) || [])],
    noViewportMeta: !/<meta[^>]+name=["']viewport["']/i.test(html),
    fixedWidthPx: widths.length ? Math.max(...widths) : null,
    clipboard: /navigator\.clipboard|execCommand\(\s*['"]copy/.test(all),
  };
}

const REF_ATTRS = [['link', 'href'], ['script', 'src'], ['img', 'src'], ['source', 'src'], ['video', 'src'], ['video', 'poster'],
  ['audio', 'src'], ['iframe', 'src'], ['embed', 'src'], ['object', 'data'], ['a', 'href'], ['input', 'src']];

function collectRefs(html) {
  const $ = cheerio.load(html);
  const refs = [];
  for (const [tag, attr] of REF_ATTRS) $(`${tag}[${attr}]`).each((_, el) => refs.push({ ref: $(el).attr(attr), tag }));
  $('img[srcset],source[srcset]').each((_, el) => {
    for (const part of $(el).attr('srcset').split(',')) refs.push({ ref: part.trim().split(/\s+/)[0], tag: 'srcset' });
  });
  const css = $('style').text() + ' ' + $('[style]').map((_, el) => $(el).attr('style')).get().join(' ');
  return refs.concat(cssRefs(css));
}

const cssRefs = (css) => [...css.matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)|@import\s+['"]([^'"]+)['"]/g)]
  .map((m) => ({ ref: m[1] || m[2], tag: 'css' }));

/** Resolve local references of a single-file book (recursing into local CSS). */
function traceSingleFile(htmlPath, report) {
  const baseDir = path.dirname(htmlPath);
  const files = new Set();
  const queue = collectRefs(fs.readFileSync(htmlPath, 'utf8')).map((r) => ({ ...r, from: baseDir }));
  while (queue.length) {
    const { ref, tag, from } = queue.shift();
    if (!ref || /^(#|data:|mailto:|tel:|javascript:|about:|blob:)/i.test(ref)) continue;
    if (/^(https?:)?\/\//i.test(ref) || /^file:/i.test(ref)) continue; // reported by auditText
    if (ref.startsWith('/')) { report.rootAbsolute.push(ref); continue; }
    const clean = decodeURIComponent(ref.split(/[?#]/)[0]);
    if (!clean) continue;
    const abs = path.resolve(from, clean);
    const rel = path.relative(baseDir, abs);
    if (rel.startsWith('..')) { report.outsideRefs.push(ref); continue; }
    if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) {
      if (tag !== 'a') report.missing.push(ref);
      continue;
    }
    if (files.has(rel)) continue;
    files.add(rel);
    if (abs.endsWith('.css')) queue.push(...cssRefs(fs.readFileSync(abs, 'utf8')).map((r) => ({ ...r, from: path.dirname(abs) })));
  }
  return [...files];
}

function listFiles(dir, base = dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    if (d.name.startsWith('.')) return [];
    const p = path.join(dir, d.name);
    return d.isDirectory() ? listFiles(p, base) : [path.relative(base, p)];
  });
}

/** Find book candidates: *.html files and folders containing index.html. */
function discover(dirName, sample) {
  const dir = path.join(ROOT, dirName);
  if (!fs.existsSync(dir)) return { found: [], skipped: [] };
  const found = [];
  const skipped = [];
  for (const d of fs.readdirSync(dir, { withFileTypes: true })) {
    if (d.name.startsWith('.')) continue;
    const p = path.join(dir, d.name);
    if (d.isFile() && /\.html?$/i.test(d.name)) found.push({ kind: 'file', src: p, name: d.name, sample });
    else if (d.isDirectory() && fs.existsSync(path.join(p, 'index.html'))) found.push({ kind: 'dir', src: p, name: d.name, sample });
    else if (d.isDirectory()) skipped.push(`${dirName}/${d.name}/ (index.html 없음 — 다른 책의 자산 폴더로 간주)`);
  }
  return { found, skipped };
}

function main() {
  const user = USER_DIRS.map((d) => discover(d, false));
  const userFound = user.flatMap((u) => u.found);
  const includeSamples = userFound.length === 0 || process.env.INCLUDE_SAMPLES === '1';
  const samples = includeSamples ? discover(SAMPLE_DIR, true) : { found: [], skipped: [] };
  const candidates = [...userFound, ...samples.found];
  const skipped = [...user.flatMap((u) => u.skipped), ...samples.skipped];

  const meta = fs.existsSync(META_FILE) ? JSON.parse(fs.readFileSync(META_FILE, 'utf8')) : {};
  fs.rmSync(OUT_BOOKS, { recursive: true, force: true });
  fs.mkdirSync(OUT_BOOKS, { recursive: true });
  fs.mkdirSync(OUT_GEN, { recursive: true });

  const books = [];
  const index = [];
  const reports = [];
  const used = new Set();
  for (const c of candidates) {
    let id = slugify(c.name);
    const conflict = used.has(id);
    for (let n = 2; used.has(id); n++) id = `${slugify(c.name)}-${n}`;
    used.add(id);

    const report = { id, source: path.relative(ROOT, c.src), sample: c.sample, conflict, missing: [], outsideRefs: [], rootAbsolute: [] };
    const srcDir = c.kind === 'dir' ? c.src : path.dirname(c.src);
    const entryName = c.kind === 'dir' ? 'index.html' : c.name;
    const htmlPath = path.join(srcDir, entryName);
    const deps = traceSingleFile(htmlPath, report); // also reports missing refs for folder books
    const files = c.kind === 'dir' ? listFiles(c.src) : [entryName, ...deps];

    const destDir = path.join(OUT_BOOKS, id);
    const hash = crypto.createHash('sha256');
    for (const rel of files.sort()) {
      const dest = path.join(destDir, rel);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.copyFileSync(path.join(srcDir, rel), dest);
      hash.update(rel).update(fs.readFileSync(dest));
    }

    const html = fs.readFileSync(htmlPath, 'utf8');
    const code = files.filter((f) => /\.(js|mjs|css)$/.test(f)).map((f) => fs.readFileSync(path.join(srcDir, f), 'utf8')).join('\n');
    report.audit = auditText(html, code);

    const toUrl = (rel) => `books/${id}/` + rel.split(path.sep).map(encodeURIComponent).join('/');
    const entryUrl = toUrl(entryName);
    const fallbackTitle = c.name.replace(/\.html?$/i, '');
    const a = analyzeHtml(html, { bookId: id, entryUrl, fallbackTitle });
    report.titleFromFilename = a.title === fallbackTitle;

    if (!meta[id]) {
      meta[id] = {
        title: a.title,
        category: guessCategory(a.title + ' ' + c.name),
        description: c.sample ? '기능 검증용 샘플 문서 (실제 족보집 아님)' : '',
        tags: c.sample ? ['sample'] : [],
        trusted: true,
      };
    }
    const m = meta[id];
    books.push({
      id, title: m.title || a.title, description: m.description || undefined, category: m.category || 'other',
      tags: m.tags || [], sample: c.sample, trusted: m.trusted !== false, entryUrl,
      assets: [entryUrl, ...files.filter((f) => f !== entryName).sort().map(toUrl)],
      sizeBytes: files.reduce((n, f) => n + fs.statSync(path.join(srcDir, f)).size, 0),
      sections: a.sections, contentVersion: hash.digest('hex').slice(0, 12),
    });
    index.push(...a.entries);
    reports.push(report);
  }

  fs.writeFileSync(META_FILE, JSON.stringify(meta, null, 2) + '\n');
  fs.writeFileSync(path.join(OUT_GEN, 'catalog.json'), JSON.stringify({ schemaVersion: 1, books }, null, 2) + '\n');
  fs.writeFileSync(path.join(OUT_GEN, 'search-index.json'), JSON.stringify(index) + '\n');
  fs.mkdirSync(path.join(ROOT, 'docs'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'docs/legacy-audit.md'), renderAudit(reports, skipped, userFound.length));

  const size = fs.statSync(path.join(OUT_GEN, 'search-index.json')).size;
  console.log(`Imported ${books.length} book(s) (${userFound.length} user, ${samples.found.length} sample). search-index: ${(size / 1024).toFixed(1)} KB`);
  for (const r of reports) {
    const issues = [...r.missing.map((x) => `missing ${x}`), ...r.outsideRefs.map((x) => `outside ${x}`), ...r.rootAbsolute.map((x) => `root-absolute ${x}`), ...r.audit.fileUrls.map((x) => `file:// ${x}`)];
    console.log(` - ${r.id}${r.sample ? ' [SAMPLE]' : ''}${r.conflict ? ' [slug conflict renamed]' : ''}${issues.length ? ': ' + issues.join(', ') : ''}`);
  }
  for (const s of skipped) console.log(` ! skipped ${s}`);
}

function renderAudit(reports, skipped, userCount) {
  const yn = (b) => (b ? '있음' : '없음');
  const lines = [
    '# Legacy HTML Audit',
    '',
    '> `npm run books:import`가 자동 생성합니다. 직접 수정하지 마세요. 원본 파일은 읽기만 하며, 복사본에도 경로 보정을 적용하지 않았습니다(수정 사항 없음).',
    '',
    userCount === 0
      ? '**사용자 HTML 없음:** `incoming/`, `source-books/`가 비어 있어 `samples/`의 SAMPLE 문서만 가져왔습니다. 아래 결과는 실제 족보집이 아닌 샘플 기준입니다.'
      : `사용자 HTML ${userCount}개를 가져왔습니다.`,
    '',
    '| 책 | 원본 | 인라인 스크립트 | 외부 CDN | fetch/모듈 | 부모창/팝업 | file:// | viewport 메타 | 고정 폭(px) | Clipboard | 누락/범위밖/루트절대 |',
    '|---|---|---|---|---|---|---|---|---|---|---|',
  ];
  for (const r of reports) {
    const a = r.audit;
    lines.push(`| ${r.id}${r.sample ? ' (SAMPLE)' : ''} | \`${r.source}\` | ${a.inlineScripts} | ${a.externalResources.length ? a.externalResources.join('<br>') : '없음'} | ${yn(a.fetchOrModules)} | ${yn(a.parentWindow)} | ${a.fileUrls.length ? a.fileUrls.join('<br>') : '없음'} | ${a.noViewportMeta ? '**없음**' : '있음'} | ${a.fixedWidthPx ?? '-'} | ${yn(a.clipboard)} | ${[...r.missing, ...r.outsideRefs, ...r.rootAbsolute].join('<br>') || '-'} |`);
  }
  lines.push('', '## 처리 지침', '',
    '- **인라인 스크립트/Clipboard:** 리더는 동일 출처 iframe에서 원본 JS를 그대로 실행합니다. Clipboard API는 HTTPS(또는 localhost)에서만 동작하므로 배포 URL에서 확인하세요.',
    '- **외부 CDN:** 오프라인 저장 대상(assets)에 포함되지 않습니다. 오프라인에서 필요하면 파일을 책 폴더에 넣고 상대 경로로 바꾼 뒤 다시 import 하세요.',
    '- **file:// / 루트 절대 경로(`/x`) / 책 폴더 밖 참조(`../x`):** 웹에서 동작하지 않습니다. 원본을 상대 경로로 고친 뒤 다시 import 해야 합니다(자동 치환 안 함).',
    '- **viewport 메타 없음/고정 폭:** 모바일에서 축소 표시되거나 가로 스크롤이 생길 수 있습니다. 원본 보기는 그대로 유지합니다.',
    '- **부모창/팝업 의존:** iframe 안에서 `window.top` 등은 앱 셸을 가리킵니다. 개별 검증이 필요합니다.',
    '- **신뢰:** `books.meta.json`에서 `"trusted": false`로 지정한 책은 스크립트 없이(sandbox) 렌더링됩니다.',
  );
  if (skipped.length) lines.push('', '## 건너뛴 항목', '', ...skipped.map((s) => `- ${s}`));
  return lines.join('\n') + '\n';
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
