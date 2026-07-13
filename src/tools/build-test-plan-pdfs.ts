/**
 * Render every test-plan markdown under `docs/test-plans/` to a PDF alongside
 * it in `docs/test-plans/pdf/`.
 *
 *   npm run test-plans:pdf
 *
 * Markdown → HTML via `marked`, HTML → PDF via Playwright's Chromium
 * (`page.pdf`, headless only). Both are already project dependencies, so no
 * external tool (pandoc/wkhtmltopdf) is needed.
 */
import { readdir, readFile, mkdir } from 'node:fs/promises';
import { join, basename } from 'node:path';
import { chromium } from 'playwright';
import { logger } from '../utils/logger';

// marked v4 is CommonJS-friendly; require keeps it simple under `module: commonjs`.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { marked } = require('marked') as { marked: { parse(md: string): string } };

const PLANS_DIR = join(process.cwd(), 'docs', 'test-plans');
const OUT_DIR = join(PLANS_DIR, 'pdf');

/** Print CSS — larger, readable type; tables and code styled for print. */
const STYLE = `
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Roboto, sans-serif;
    font-size: 15px; line-height: 1.6; color: #23324a; margin: 0;
  }
  h1 { font-size: 30px; margin: 0 0 6px; color: #26324c; }
  h2 { font-size: 22px; margin: 28px 0 12px; color: #283552; border-bottom: 2px solid #ececf4; padding-bottom: 6px; }
  h3 { font-size: 17px; margin: 20px 0 8px; color: #283552; }
  p, li { font-size: 15px; }
  a { color: #5d4fb3; text-decoration: none; }
  code { font-family: "SFMono-Regular", Consolas, monospace; font-size: 13px;
    background: #f3f4fb; border: 1px solid #e6e8f2; border-radius: 6px; padding: 1px 5px; }
  pre { background: #f7f8fc; border: 1px solid #e6e8f2; border-radius: 10px; padding: 12px 14px; overflow-x: auto; }
  pre code { border: 0; background: none; padding: 0; }
  table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 13.5px; }
  th, td { border: 1px solid #e2e7f2; padding: 8px 11px; text-align: left; vertical-align: top; }
  th { background: #eef4ff; color: #3a4a68; font-size: 12px; text-transform: uppercase; letter-spacing: 0.04em; }
  tr:nth-child(even) td { background: #fafbff; }
  blockquote { margin: 12px 0; padding: 8px 16px; border-left: 4px solid #d9c7ff; background: #faf7ff; color: #4a4470; }
  hr { border: 0; border-top: 1px solid #e6e8f2; margin: 22px 0; }
`;

function wrap(title: string, bodyHtml: string): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<title>${title}</title><style>${STYLE}</style></head><body>${bodyHtml}</body></html>`;
}

async function main(): Promise<void> {
  const entries = (await readdir(PLANS_DIR)).filter((f) => f.endsWith('.md')).sort();
  if (entries.length === 0) {
    logger.step(`No markdown test plans found in ${PLANS_DIR}`);
    return;
  }
  await mkdir(OUT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    for (const file of entries) {
      const md = await readFile(join(PLANS_DIR, file), 'utf8');
      const title = basename(file, '.md');
      await page.setContent(wrap(title, marked.parse(md)), { waitUntil: 'load' });
      const out = join(OUT_DIR, `${title}.pdf`);
      await page.pdf({
        path: out,
        format: 'A4',
        printBackground: true,
        margin: { top: '18mm', bottom: '18mm', left: '16mm', right: '16mm' },
      });
      logger.step(`PDF: ${file} → docs/test-plans/pdf/${title}.pdf`);
    }
  } finally {
    await browser.close();
  }
  logger.step(`Wrote ${entries.length} PDF(s) to ${OUT_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
