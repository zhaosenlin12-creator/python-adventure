import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const publicRoot = path.join(repoRoot, "public");
const lottieRoot = path.join(publicRoot, "assets", "pets", "lottie");
const profileFile = path.join(repoRoot, "lib", "config", "petArtworkProfiles.ts");
const lottieComponentFile = path.join(repoRoot, "components", "pet", "LottiePet.tsx");

const scanTargets = [
  path.join(repoRoot, "components", "pet"),
  path.join(repoRoot, "lib", "config", "petAssets.ts"),
  path.join(repoRoot, "lib", "utils", "assetPreloader.ts"),
];

const PET_PATH_RE = /\/assets\/pets\/[A-Za-z0-9_./-]+/g;
const DECORATION_PATH_RE = /\/icons\/decorations\/[A-Za-z0-9_./-]+/g;
const LOTTIE_STATES = [
  "normal",
  "happy",
  "excited",
  "sad",
  "tired",
  "curious",
  "eating",
  "coma",
  "playing",
  "sleeping",
  "walking",
  "question",
];

function walkFiles(entryPath, collector) {
  if (!fs.existsSync(entryPath)) return;
  const stat = fs.statSync(entryPath);
  if (stat.isFile()) {
    collector.push(entryPath);
    return;
  }
  for (const name of fs.readdirSync(entryPath)) {
    walkFiles(path.join(entryPath, name), collector);
  }
}

function toAbsolutePublicPath(publicUrlPath) {
  return path.join(publicRoot, publicUrlPath.replace(/^\//, "").replace(/\//g, path.sep));
}

function collectStaticRefs(files) {
  const refs = new Set();
  for (const file of files) {
    if (!/\.(ts|tsx)$/.test(file)) continue;
    const source = fs.readFileSync(file, "utf8");
    for (const match of source.match(PET_PATH_RE) ?? []) refs.add(match);
    for (const match of source.match(DECORATION_PATH_RE) ?? []) refs.add(match);
  }
  return refs;
}

function collectProfileStageRefs() {
  const refs = new Set();
  if (!fs.existsSync(profileFile)) return refs;
  const source = fs.readFileSync(profileFile, "utf8");

  // slug: 'british-shorthair'
  const slugDefaults = [...source.matchAll(/slug:\s*'([^']+)'/g)].map((match) => match[1]);
  for (const slug of slugDefaults) {
    for (const stage of [1, 2, 3, 4, 5]) {
      refs.add(`/assets/pets/camp-remaster/${slug}/stage-${stage}.png`);
    }
  }

  // stages: buildRemasterStageChain('golden-roc', [1,2,3,4,4])
  for (const match of source.matchAll(/buildRemasterStageChain\('([^']+)'\s*,\s*\[([^\]]+)\]\)/g)) {
    const slug = match[1];
    const indexes = match[2]
      .split(",")
      .map((token) => Number(token.trim()))
      .filter((value) => Number.isFinite(value));
    for (const stage of indexes) {
      refs.add(`/assets/pets/camp-remaster/${slug}/stage-${stage}.png`);
    }
  }

  return refs;
}

function checkMissing(refs) {
  const missing = [];
  for (const ref of refs) {
    if (!fs.existsSync(toAbsolutePublicPath(ref))) {
      missing.push(ref);
    }
  }
  return missing.sort();
}

function auditLottieDirs() {
  if (!fs.existsSync(lottieRoot)) {
    return {
      rootExists: false,
      petDirs: [],
      missingStates: [{ petType: "(all)", missing: [...LOTTIE_STATES] }],
    };
  }

  const petDirs = fs
    .readdirSync(lottieRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  const missingStates = [];
  for (const petType of petDirs) {
    const missing = LOTTIE_STATES.filter((state) => {
      const filePath = path.join(lottieRoot, petType, `${state}.json`);
      return !fs.existsSync(filePath);
    });
    if (missing.length) {
      missingStates.push({ petType, missing });
    }
  }

  return {
    rootExists: true,
    petDirs,
    missingStates,
  };
}

function collectLottieEnabledPetTypes() {
  if (!fs.existsSync(lottieComponentFile)) return [];
  const source = fs.readFileSync(lottieComponentFile, "utf8");
  const match = source.match(/LOTTIE_ENABLED_PET_TYPES\s*=\s*new Set\(\[([\s\S]*?)\]\)/);
  if (!match) return [];
  return [...match[1].matchAll(/'([^']+)'/g)].map((entry) => entry[1]).sort();
}

function main() {
  const files = [];
  for (const target of scanTargets) {
    walkFiles(target, files);
  }

  const staticRefs = collectStaticRefs(files);
  const profileRefs = collectProfileStageRefs();
  const allRefs = new Set([...staticRefs, ...profileRefs]);

  const missingRefs = checkMissing(allRefs);
  const lottieAudit = auditLottieDirs();
  const enabledPetTypes = collectLottieEnabledPetTypes();
  const enabledSet = new Set(enabledPetTypes);
  const dirSet = new Set(lottieAudit.petDirs);
  const enabledButMissingDirs = enabledPetTypes.filter((petType) => !dirSet.has(petType));
  const dirsWithoutEnabledConfig = lottieAudit.petDirs.filter((petType) => !enabledSet.has(petType));

  const report = {
    checkedAt: new Date().toISOString(),
    scannedFiles: files.filter((file) => /\.(ts|tsx)$/.test(file)).length,
    staticReferenceCount: staticRefs.size,
    profileReferenceCount: profileRefs.size,
    totalReferenceCount: allRefs.size,
    missingReferenceCount: missingRefs.length,
    missingReferences: missingRefs,
    lottie: {
      rootExists: lottieAudit.rootExists,
      petDirCount: lottieAudit.petDirs.length,
      petDirs: lottieAudit.petDirs,
      enabledPetTypeCount: enabledPetTypes.length,
      enabledPetTypes,
      enabledButMissingDirCount: enabledButMissingDirs.length,
      enabledButMissingDirs,
      dirWithoutEnabledConfigCount: dirsWithoutEnabledConfig.length,
      dirsWithoutEnabledConfig,
      missingStateCount: lottieAudit.missingStates.length,
      missingStates: lottieAudit.missingStates,
    },
  };

  console.log(JSON.stringify(report, null, 2));

  if (
    missingRefs.length ||
    lottieAudit.missingStates.length ||
    enabledButMissingDirs.length ||
    dirsWithoutEnabledConfig.length
  ) {
    process.exitCode = 1;
  }
}

main();
