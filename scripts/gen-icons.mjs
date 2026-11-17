// Renders public/icons/*.png from an inline SVG using Playwright's Chromium (already a dev dependency).
import { chromium } from '@playwright/test';
import fs from 'node:fs';

const svg = (pad) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
<rect width="512" height="512" rx="${pad ? 0 : 96}" fill="#1f2a37"/>
<g transform="translate(256 256) scale(${pad ? 0.72 : 1}) translate(-256 -256)">
<rect x="136" y="120" width="240" height="292" rx="18" fill="#f7f5f0"/>
<rect x="136" y="120" width="34" height="292" rx="10" fill="#7db7e0"/>
<path d="M236 222 l-40 44 l40 44 M296 222 l40 44 l-40 44" stroke="#1f2a37" stroke-width="22" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
</g></svg>`;

const targets = [['icon-192.png', 192, false], ['icon-512.png', 512, false], ['icon-maskable-512.png', 512, true], ['apple-touch-icon.png', 180, true]];
fs.mkdirSync('public/icons', { recursive: true });
const browser = await chromium.launch();
for (const [name, size, pad] of targets) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  await page.setContent(`<style>html,body{margin:0}svg{display:block;width:${size}px;height:${size}px}</style>${svg(pad)}`);
  await page.screenshot({ path: `public/icons/${name}`, omitBackground: !pad });
  await page.close();
}
await browser.close();
console.log('icons written');
