import { chromium } from 'playwright';
const SP = process.argv[2];
const browser = await chromium.launch();
for (const w of [375, 1440]) {
  const page = await browser.newPage({ viewport: { width: w, height: 900 } });
  await page.goto('http://localhost:4321/', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.querySelector('astro-dev-toolbar')?.remove());
  const meta = page.locator('.card__meta').first();
  await meta.scrollIntoViewIfNeeded();
  await page.waitForTimeout(800);
  const info = await page.evaluate(() => { const m = document.querySelector('.card__meta'); const cs = getComputedStyle(m); const items = [...m.querySelectorAll('.card__meta-item')].map((i) => { const b = i.getBoundingClientRect(); return [Math.round(b.x), Math.round(b.y), Math.round(b.width)]; }); return { dir: cs.flexDirection, gap: cs.gap, items }; });
  console.log(w, JSON.stringify(info));
  if (w === 375) { const b = await page.locator('.card').first().boundingBox(); await page.screenshot({ path: `${SP}/meta-375.png`, clip: { x: 0, y: b.y + b.height - 140, width: 375, height: 150 } }); }
  await page.close();
}
await browser.close();
