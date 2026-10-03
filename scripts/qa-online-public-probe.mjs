import fs from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";

const FRONTEND_ORIGIN = (process.env.FRONTEND_ORIGIN || "https://game.codebn.cn").replace(/\/+$/, "");
const ARTIFACT_DIR = path.resolve(".tmp-production-online-audit/public");

fs.mkdirSync(ARTIFACT_DIR, { recursive: true });

const PROBES = [
  { path: "/", name: "home" },
  { path: "/world", name: "world" },
  { path: "/campaign", name: "campaign" },
  { path: "/editor", name: "editor" },
  { path: "/code-research", name: "code-research" },
  { path: "/typing/index.html", name: "typing-spa" },
];

const consoleErrors = [];
const pageErrors = [];
const failedRequests = [];

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 980 } });
  const page = await context.newPage();

  page.on("console", (message) => {
    if (message.type() === "error") {
      const text = message.text();
      if (text.includes("Failed to start background music")) return;
      if (text.includes("favicon")) return;
      if (text.includes("net::ERR_ABORTED")) return;
      consoleErrors.push(text);
    }
  });
  page.on("pageerror", (err) => pageErrors.push(err.message));
  page.on("requestfailed", (req) => {
    const url = req.url();
    if (url.includes("/_next/static/css/app/layout.css") && url.includes("map")) return;
    failedRequests.push({ url, method: req.method(), failure: req.failure()?.errorText });
  });

  const results = [];
  for (const probe of PROBES) {
    const t0 = Date.now();
    const url = `${FRONTEND_ORIGIN}${probe.path}`;
    let status = null;
    let title = null;
    let visibleSelectors = [];
    try {
      const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
      status = response?.status() ?? null;
      await page.waitForTimeout(1200);
      title = await page.title();
      visibleSelectors = await page.evaluate(() => {
        const probes = [
          '[data-testid="ai-research-button"]',
          '[data-testid="code-research-button"]',
          '[data-testid="typing-entry-button"]',
          'canvas',
          'main',
          'header',
        ];
        return probes
          .map((sel) => ({ selector: sel, present: document.querySelector(sel) !== null }))
          .filter((p) => p.present);
      });
      await page.screenshot({ path: path.join(ARTIFACT_DIR, `${probe.name}.png`), fullPage: false });
    } catch (error) {
      results.push({ ...probe, url, status: status ?? "ERR", title, durationMs: Date.now() - t0, error: error.message });
      continue;
    }
    results.push({ ...probe, url, status, title, durationMs: Date.now() - t0, visibleSelectors });
  }

  const buildInfoResp = await page.evaluate(async (origin) => {
    const r = await fetch(`${origin}/build-info.json`, { method: "GET" });
    return { status: r.status, json: r.ok ? await r.json() : null };
  }, FRONTEND_ORIGIN);

  await browser.close();

  const report = {
    frontend: FRONTEND_ORIGIN,
    capturedAt: new Date().toISOString(),
    buildInfo: buildInfoResp,
    pageResults: results,
    consoleErrors,
    pageErrors,
    failedRequests: failedRequests.slice(0, 30),
  };

  const out = path.join(ARTIFACT_DIR, "report.json");
  fs.writeFileSync(out, JSON.stringify(report, null, 2));

  console.log(JSON.stringify({ status: report.pageResults.every((r) => r.status === 200) ? "ok" : "degraded", pagesOk: report.pageResults.filter((r) => r.status === 200).length, total: report.pageResults.length, consoleErrors: consoleErrors.length, pageErrors: pageErrors.length, failedRequests: failedRequests.length, report: out }, null, 2));
  if (report.pageResults.some((r) => r.status !== 200)) process.exit(1);
}

run().catch((err) => {
  console.error("audit failed:", err);
  process.exit(2);
});
