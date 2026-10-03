import fs from "node:fs";
import path from "node:path";

const FRONTEND_ORIGIN = (process.env.FRONTEND_ORIGIN || "https://game.codebn.cn").replace(/\/+$/, "");
const API_BASE = (process.env.API_BASE || `${FRONTEND_ORIGIN}/api/v1`).replace(/\/+$/, "");
const ARTIFACT_DIR = path.resolve(".tmp-production-online-audit/perf-security");

fs.mkdirSync(ARTIFACT_DIR, { recursive: true });

function median(arr) {
  if (!arr.length) return null;
  const sorted = arr.slice().sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

async function timeIt(fn, runs = 5) {
  const samples = [];
  let lastError = null;
  for (let i = 0; i < runs; i += 1) {
    const t0 = process.hrtime.bigint();
    try {
      await fn();
      const t1 = process.hrtime.bigint();
      samples.push(Number(t1 - t0) / 1e6);
    } catch (error) {
      lastError = error;
    }
  }
  const sorted = samples.slice().sort((a, b) => a - b);
  return {
    runs,
    succeeded: samples.length,
    failed: runs - samples.length,
    medianMs: Math.round(median(samples) * 10) / 10,
    p95Ms: Math.round((sorted[Math.floor(sorted.length * 0.95)] ?? 0) * 10) / 10,
    maxMs: Math.round(Math.max(...samples, 0) * 10) / 10,
    error: lastError ? String(lastError.message ?? lastError) : null,
  };
}

async function fetchTiming(url, init = {}) {
  const t0 = process.hrtime.bigint();
  const response = await fetch(url, init);
  await response.text();
  const t1 = process.hrtime.bigint();
  return {
    url,
    status: response.status,
    ms: Math.round((Number(t1 - t0) / 1e6) * 10) / 10,
    headers: Object.fromEntries(response.headers.entries()),
    contentLength: response.headers.get("content-length"),
  };
}

async function main() {
  const report = { capturedAt: new Date().toISOString(), frontend: FRONTEND_ORIGIN, apiBase: API_BASE };

  const perfTargets = [
    { url: `${FRONTEND_ORIGIN}/`, kind: "frontend" },
    { url: `${FRONTEND_ORIGIN}/world`, kind: "frontend" },
    { url: `${FRONTEND_ORIGIN}/code-research`, kind: "frontend" },
    { url: `${FRONTEND_ORIGIN}/campaign`, kind: "frontend" },
    { url: `${FRONTEND_ORIGIN}/editor`, kind: "frontend" },
    { url: `${FRONTEND_ORIGIN}/typing/index.html`, kind: "frontend" },
    { url: `${FRONTEND_ORIGIN}/build-info.json`, kind: "frontend" },
    { url: `${FRONTEND_ORIGIN}/assets/player/player.png`, kind: "asset" },
    { url: `${FRONTEND_ORIGIN}/assets/bosses/campaign_1.png`, kind: "asset" },
    { url: `${FRONTEND_ORIGIN}/assets/pet-home/garden-bg.png`, kind: "asset" },
    { url: `${API_BASE}/auth/login`, method: "POST", body: "{}", kind: "api" },
    { url: `${API_BASE}/coins/balance`, kind: "api-auth" },
  ];

  const perfResults = [];
  for (const t of perfTargets) {
    const init = { method: t.method ?? "GET" };
    if (t.body) {
      init.headers = { "Content-Type": "application/json" };
      init.body = t.body;
    }
    const stats = await timeIt(() => fetchTiming(t.url, init), 5);
    perfResults.push({ url: t.url, kind: t.kind, ...stats });
  }
  report.perf = perfResults;

  const security = {};

  const expose = await fetch(`${API_BASE}/openapi.json`).catch((e) => ({ status: 0, error: String(e) }));
  security.openapiExposed = expose.status;
  const docsResp = await fetch(`${FRONTEND_ORIGIN}/docs`).catch((e) => ({ status: 0, error: String(e) }));
  security.swaggerUiExposed = docsResp.status;

  const loginProbe = await fetch(`${API_BASE}/auth/login`, { method: "GET" });
  security.loginGetStatus = loginProbe.status;

  const corsResp = await fetch(`${API_BASE}/coins/balance`, {
    method: "OPTIONS",
    headers: {
      Origin: "https://attacker.example",
      "Access-Control-Request-Method": "GET",
      "Access-Control-Request-Headers": "authorization",
    },
  });
  security.corsAllowOrigin = corsResp.headers.get("access-control-allow-origin");
  security.corsAllowCredentials = corsResp.headers.get("access-control-allow-credentials");
  security.corsAllowMethods = corsResp.headers.get("access-control-allow-methods");
  security.corsStatus = corsResp.status;

  const badAuth = await fetch(`${API_BASE}/coins/balance`, {
    headers: { Authorization: "Bearer thisisnotarealtoken" },
  });
  security.badTokenRejected = badAuth.status;

  const sqli = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "' OR 1=1 --", password: "x" }),
  });
  security.sqlInjectionUsername = sqli.status;

  const wrongPw = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "senlin", password: "wrong-password-for-rate-probe" }),
  });
  security.wrongPasswordStatus = wrongPw.status;
  security.wrongPasswordHeaders = Object.fromEntries(wrongPw.headers.entries());

  const lvlProbe = await fetch(`${API_BASE}/campaign/levels/__not_exist__`, { method: "HEAD" }).catch((e) => ({ status: 0, error: String(e) }));
  security.bogusLevelStatus = lvlProbe.status;

  const assetCache = await fetch(`${FRONTEND_ORIGIN}/assets/player/player.png`, { method: "HEAD" });
  security.staticCacheControl = assetCache.headers.get("cache-control");
  security.staticExpires = assetCache.headers.get("expires");
  security.staticEtag = assetCache.headers.get("etag");

  const expiredLike = await fetch(`${API_BASE}/coins/balance`, {
    headers: { Authorization: "Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ4In0.bogussig" },
  });
  security.malformedJwt = expiredLike.status;

  const noSuchUser = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "definitely_no_such_user_xyz123", password: "any" }),
  });
  security.noSuchUserStatus = noSuchUser.status;
  security.noSuchUserBody = (await noSuchUser.text()).slice(0, 200);

  const wrongPw2 = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "senlin", password: "wrong-pw-2" }),
  });
  security.wrongPw2Body = (await wrongPw2.text()).slice(0, 200);

  report.security = security;

  const stability = {};

  const buildSamples = [];
  for (let i = 0; i < 30; i += 1) {
    const r = await fetch(`${FRONTEND_ORIGIN}/build-info.json`);
    buildSamples.push({ status: r.status, body: (await r.text()).trim() });
  }
  const uniqueBodies = new Set(buildSamples.map((s) => s.body));
  const uniqueStatuses = new Set(buildSamples.map((s) => s.status));
  stability.buildInfoStatus = uniqueStatuses.size === 1 ? [...uniqueStatuses][0] : [...uniqueStatuses];
  stability.buildInfoUniqueBodies = uniqueBodies.size;
  stability.buildInfoBodies = [...uniqueBodies];

  const rootStatuses = [];
  for (let i = 0; i < 50; i += 1) {
    const r = await fetch(`${FRONTEND_ORIGIN}/`);
    rootStatuses.push(r.status);
  }
  const rootSet = new Set(rootStatuses);
  stability.rootStatusHistogram = {};
  for (const s of rootSet) stability.rootStatusHistogram[s] = rootStatuses.filter((x) => x === s).length;

  const apiHealthStatuses = [];
  for (let i = 0; i < 20; i += 1) {
    try {
      const r = await fetch(`${API_BASE}/progress/load`, {
        headers: { Authorization: "Bearer nonauth" },
      });
      apiHealthStatuses.push(r.status);
    } catch (error) {
      apiHealthStatuses.push("EXC:" + error.message);
    }
  }
  const authSet = new Set(apiHealthStatuses);
  stability.apiAuth401Histogram = {};
  for (const s of authSet) stability.apiAuth401Histogram[s] = apiHealthStatuses.filter((x) => x === s).length;

  report.stability = stability;

  fs.writeFileSync(path.join(ARTIFACT_DIR, "report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ status: "ok", report: path.join(ARTIFACT_DIR, "report.json") }, null, 2));
}

main().catch((err) => {
  console.error("perf-security probe failed:", err);
  process.exit(2);
});
