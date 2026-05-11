import fs from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const typingRoot = path.join(projectRoot, "public", "typing");
const dataRoot = path.join(typingRoot, "data");
const reportPath =
  process.argv[2] ||
  path.join(projectRoot, "release", `typing-resource-stability-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function walkFiles(rootDir, predicate) {
  const out = [];
  const stack = [rootDir];
  while (stack.length) {
    const current = stack.pop();
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
        continue;
      }
      if (!predicate || predicate(full)) out.push(full);
    }
  }
  return out;
}

function normalizeKey(value) {
  return String(value || "").trim();
}

function toPosix(value) {
  return value.replace(/\\/g, "/");
}

function collectStrings(node, output = []) {
  if (typeof node === "string") {
    output.push(node.trim());
    return output;
  }
  if (Array.isArray(node)) {
    for (const item of node) collectStrings(item, output);
    return output;
  }
  if (node && typeof node === "object") {
    for (const value of Object.values(node)) collectStrings(value, output);
  }
  return output;
}

function looksLikeAssetRef(value) {
  if (!value) return false;
  if (value.startsWith("data/")) return true;
  if (value.startsWith("./data/")) return true;
  if (value.startsWith("/data/")) return true;
  if (value.startsWith("/key-icon/")) return true;
  if (value.startsWith("/assets/")) return true;
  if (/^https?:\/\//i.test(value)) return true;
  return /\.(png|jpg|jpeg|webp|svg|mp3|ogg|wav)(\?|#|$)/i.test(value);
}

function resolveToLocalAsset(value, assetMap) {
  const raw = normalizeKey(value);
  if (!raw) return null;

  const direct = assetMap[raw];
  if (direct) return normalizeKey(direct);

  if (raw.startsWith("data/")) return raw;
  if (raw.startsWith("./data/")) return raw.slice(2);
  if (raw.startsWith("/data/")) return raw.slice(1);

  if (raw.startsWith("/")) {
    const mapped = assetMap[`https://www.daziya.com${raw}`] || assetMap[raw];
    if (mapped) return normalizeKey(mapped);
  }

  if (/^https?:\/\//i.test(raw)) {
    const secureKey = raw.replace(/^http:\/\//i, "https://");
    if (assetMap[secureKey]) return normalizeKey(assetMap[secureKey]);
    if (assetMap[raw]) return normalizeKey(assetMap[raw]);
    try {
      const parsed = new URL(raw);
      const mapped = assetMap[`https://www.daziya.com${parsed.pathname}`] || assetMap[parsed.pathname];
      if (mapped) return normalizeKey(mapped);
    } catch {
      return null;
    }
  }

  return null;
}

function existsUnderTyping(relativePath) {
  const normalized = String(relativePath || "").replace(/^\.\//, "");
  if (!normalized) return false;
  return fs.existsSync(path.join(typingRoot, normalized));
}

const assetMapPath = path.join(dataRoot, "asset-map.json");
const catalogPath = path.join(dataRoot, "catalog.json");
const wordAudioMapPath = path.join(dataRoot, "audio", "word-audio-map.json");
const lessonsDir = path.join(dataRoot, "lessons");

const assetMap = readJson(assetMapPath);
const catalog = readJson(catalogPath);
const wordAudioMap = readJson(wordAudioMapPath);
const lessonFiles = walkFiles(lessonsDir, (file) => file.toLowerCase().endsWith(".json"));

const assetMapEntries = Object.entries(assetMap);
const missingAssetMapFiles = [];
for (const [remote, local] of assetMapEntries) {
  if (!existsUnderTyping(local)) {
    missingAssetMapFiles.push({ remote, local });
  }
}

const wordAudioEntries = Object.entries(wordAudioMap);
const missingWordAudioFiles = [];
for (const [word, audioPath] of wordAudioEntries) {
  if (!existsUnderTyping(audioPath)) {
    missingWordAudioFiles.push({ word, audioPath });
  }
}

const catalogRefs = collectStrings(catalog).filter(looksLikeAssetRef);
const lessonRefSet = new Set();
for (const lessonFile of lessonFiles) {
  const lessonJson = readJson(lessonFile);
  const refs = collectStrings(lessonJson).filter(looksLikeAssetRef);
  for (const ref of refs) lessonRefSet.add(ref);
}
const lessonRefs = [...lessonRefSet];

function auditRefs(refs, assetMapObj) {
  const unresolved = [];
  const missing = [];
  const resolved = [];
  for (const ref of refs) {
    const local = resolveToLocalAsset(ref, assetMapObj);
    if (!local) {
      unresolved.push(ref);
      continue;
    }
    if (!existsUnderTyping(local)) {
      missing.push({ ref, local });
      continue;
    }
    resolved.push({ ref, local });
  }
  return {
    total: refs.length,
    resolved: resolved.length,
    unresolved: unresolved.length,
    missing: missing.length,
    unresolvedSamples: unresolved.slice(0, 40),
    missingSamples: missing.slice(0, 40),
  };
}

const catalogAudit = auditRefs(catalogRefs, assetMap);
const lessonAudit = auditRefs(lessonRefs, assetMap);

const runtimeFiles = [
  path.join(typingRoot, "assets", "app.js"),
  path.join(projectRoot, "app", "api", "typing", "[...path]", "route.ts"),
  path.join(projectRoot, "backend", "app", "api", "v1", "typing.py"),
];

const externalUrlPattern = /https?:\/\/[^\s"'`),]+/g;
const externalUrls = new Set();
for (const file of runtimeFiles) {
  const source = fs.readFileSync(file, "utf8");
  const matches = source.match(externalUrlPattern) || [];
  for (const match of matches) externalUrls.add(match.trim());
}

const allTypingFiles = walkFiles(typingRoot);
let typingBytes = 0;
for (const file of allTypingFiles) {
  typingBytes += fs.statSync(file).size;
}

const appJs = fs.readFileSync(path.join(typingRoot, "assets", "app.js"), "utf8");
const routeTs = fs.readFileSync(path.join(projectRoot, "app", "api", "typing", "[...path]", "route.ts"), "utf8");
const backendTyping = fs.readFileSync(path.join(projectRoot, "backend", "app", "api", "v1", "typing.py"), "utf8");

const report = {
  generatedAt: new Date().toISOString(),
  projectRoot: toPosix(projectRoot),
  typingRoot: toPosix(typingRoot),
  summary: {
    typingFileCount: allTypingFiles.length,
    typingTotalSizeMB: Number((typingBytes / (1024 * 1024)).toFixed(2)),
    assetMapEntries: assetMapEntries.length,
    wordAudioEntries: wordAudioEntries.length,
    lessonFiles: lessonFiles.length,
    assetMapMissingFiles: missingAssetMapFiles.length,
    wordAudioMissingFiles: missingWordAudioFiles.length,
    catalogAssetRefs: catalogAudit.total,
    catalogResolved: catalogAudit.resolved,
    lessonAssetRefs: lessonAudit.total,
    lessonResolved: lessonAudit.resolved,
  },
  stability: {
    localStaticAssetsStable: missingAssetMapFiles.length === 0,
    localWordAudioStable: missingWordAudioFiles.length === 0,
    catalogAssetRefsStable: catalogAudit.missing === 0,
    lessonAssetRefsStable: lessonAudit.missing === 0,
    frontendWordExternalFallbackDefaultOff: /ALLOW_EXTERNAL_WORD_AUDIO_FALLBACK\s*=\s*false/.test(appJs),
    nextApiWordExternalFallbackEnvGuard: /externalWordAudioFallbackEnabled/.test(routeTs),
    backendApiWordExternalFallbackEnvGuard: /_external_word_audio_fallback_enabled/.test(backendTyping),
  },
  riskNotes: [
    "Typing static images, lessons and mapped audio are stored under public/typing/data and shipped with frontend package.",
    "Word pronunciation and AI TTS still contain optional external providers in source, but word-audio external fallback is now env-gated and default-off.",
    "If you need fully offline pronunciation fallback, keep TYPING_EXTERNAL_WORD_AUDIO_FALLBACK unset/false in backend and Next env.",
  ],
  externalRuntimeUrls: [...externalUrls].sort(),
  missingSamples: {
    assetMapFiles: missingAssetMapFiles.slice(0, 60),
    wordAudioFiles: missingWordAudioFiles.slice(0, 60),
    catalogUnresolved: catalogAudit.unresolvedSamples,
    catalogMissing: catalogAudit.missingSamples,
    lessonUnresolved: lessonAudit.unresolvedSamples,
    lessonMissing: lessonAudit.missingSamples,
  },
};

fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8");

console.log(`REPORT=${toPosix(reportPath)}`);
console.log(
  JSON.stringify(
    {
      stable: report.stability,
      summary: report.summary,
      externalRuntimeUrlCount: report.externalRuntimeUrls.length,
    },
    null,
    2
  )
);
