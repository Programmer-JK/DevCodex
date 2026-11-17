import { describe, expect, it } from 'vitest';
// @ts-expect-error plain .mjs build script without types
import { analyzeHtml, auditText, guessCategory, slugify } from '../../scripts/import-books.mjs';

const html = `<html><head><title>T</title><script>var h="<h2>fake</h2>"</script></head><body>
<nav><h3>Nav heading</h3></nav>
<p>intro text</p>
<h1 id="a">Alpha</h1><p>alpha body</p>
<h2>Beta</h2><p>beta <b>bold</b> body</p><button>Copy</button>
<h2></h2><p>still beta</p></body></html>`;

describe('analyzeHtml', () => {
  const r = analyzeHtml(html, { bookId: 'b', entryUrl: 'books/b/index.html', fallbackTitle: 'F' });
  it('extracts title and sections with DOM-order indices (nav headings still counted)', () => {
    expect(r.title).toBe('T');
    expect(r.sections).toEqual([
      { id: 'a', heading: 'Alpha', level: 1, anchor: 'a', order: 1 },
      { id: 's2', heading: 'Beta', level: 2, anchor: undefined, order: 2 },
    ]);
  });
  it('excludes script/nav/button text from the search index', () => {
    const all = JSON.stringify(r.entries);
    expect(all).not.toContain('fake');
    expect(all).not.toContain('Nav heading');
    expect(all).not.toContain('Copy');
    expect(r.entries.find((e: { sectionId?: string }) => e.sectionId === 's2').textSnippet).toBe('beta bold body still beta');
    expect(r.entries.find((e: { sectionId?: string }) => e.sectionId === 'a').sourceUrl).toBe('books/b/index.html#a');
  });
  it('falls back to the filename title', () => {
    expect(analyzeHtml('<p>x</p>', { bookId: 'b', entryUrl: 'e', fallbackTitle: 'file' }).title).toBe('file');
  });
});

describe('auditText', () => {
  it('flags compatibility risks', () => {
    const a = auditText('<script src="https://cdn.x/y.js"></script><script>fetch("a")</script><img src="file:///C:/x.png">', 'navigator.clipboard.writeText(1); .t{width: 900px; max-width: 2000px}');
    expect(a).toMatchObject({ inlineScripts: 1, externalResources: ['https://cdn.x/y.js'], fetchOrModules: true, fileUrls: ['file:///C:/x.png'], noViewportMeta: true, fixedWidthPx: 900, clipboard: true });
  });
});

it('slugify / guessCategory', () => {
  expect(slugify('Spring Guide.html')).toBe('spring-guide');
  expect(slugify('한글.html')).toMatch(/^book-[0-9a-f]{8}$/);
  expect(guessCategory('Oracle SQL')).toBe('database');
});
