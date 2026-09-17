import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(__dirname, "../frontend/public");
const logoPath = path.join(publicDir, "logo.svg");
const logoData = fs.readFileSync(logoPath);
const logoHref = `data:image/svg+xml;base64,${logoData.toString("base64")}`;

const ogHtml = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      html, body { width: 1200px; height: 630px; overflow: hidden; }
      body {
        font-family: "Segoe UI", system-ui, sans-serif;
        background: linear-gradient(135deg, #102010 0%, #1a2e1a 45%, #243824 100%);
        color: #f0f5f0;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 64px;
      }
      .card {
        display: flex;
        align-items: center;
        gap: 56px;
        width: 100%;
      }
      .logo-wrap {
        width: 280px;
        height: 280px;
        border-radius: 36px;
        background: #e8eee8;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        box-shadow: 0 24px 48px rgba(0, 0, 0, 0.35);
      }
      img { width: 220px; height: 220px; }
      .copy { display: flex; flex-direction: column; gap: 18px; min-width: 0; }
      h1 {
        font-size: 72px;
        line-height: 1;
        font-weight: 800;
        letter-spacing: -0.03em;
      }
      p {
        font-size: 32px;
        line-height: 1.25;
        color: #c5d8c5;
        max-width: 680px;
        font-weight: 500;
      }
      .pills { display: flex; gap: 12px; flex-wrap: wrap; margin-top: 8px; }
      .pill {
        font-size: 18px;
        font-weight: 600;
        color: #dce8dc;
        background: rgba(74, 138, 74, 0.35);
        border: 1px solid rgba(143, 188, 143, 0.35);
        border-radius: 999px;
        padding: 8px 16px;
      }
    </style>
  </head>
  <body>
    <div class="card">
      <div class="logo-wrap"><img src="${logoHref}" alt="" /></div>
      <div class="copy">
        <h1>NumisGallery</h1>
        <p>Catalog and showcase your banknote collection</p>
        <div class="pills">
          <span class="pill">PMG certified</span>
          <span class="pill">Paper money</span>
          <span class="pill">AI cataloging</span>
        </div>
      </div>
    </div>
  </body>
</html>`;

const iconHtml = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      html, body { width: 512px; height: 512px; overflow: hidden; }
      body {
        background: #e8eee8;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      img { width: 420px; height: 420px; }
    </style>
  </head>
  <body>
    <img src="${logoHref}" alt="" />
  </body>
</html>`;

const browser = await chromium.launch();
const page = await browser.newPage();

await page.setViewportSize({ width: 1200, height: 630 });
await page.setContent(ogHtml, { waitUntil: "load" });
await page.screenshot({
  path: path.join(publicDir, "og-image.png"),
  type: "png",
});

await page.setViewportSize({ width: 512, height: 512 });
await page.setContent(iconHtml, { waitUntil: "load" });
await page.screenshot({
  path: path.join(publicDir, "apple-touch-icon.png"),
  type: "png",
});

await browser.close();
console.log("Wrote og-image.png and apple-touch-icon.png");
