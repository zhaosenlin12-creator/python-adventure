import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT_DIR = process.cwd();
const ARTIFACT_DIR = path.resolve('.tmp-code-research-qa');
const JEST_RESULT_FILE = path.join(ARTIFACT_DIR, 'jest-code-research-result.json');
const QA_RESULT_FILE = path.join(ARTIFACT_DIR, 'qa-code-research-result.json');
const REPORT_FILE = path.join(ARTIFACT_DIR, 'product-score-report.json');

function ensureArtifactDir() {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
}

function runCommand(label, command, extraEnv = {}) {
  const startedAt = Date.now();
  const result = spawnSync(command, {
    shell: true,
    cwd: ROOT_DIR,
    env: {
      ...process.env,
      ...extraEnv,
    },
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 20,
  });
  const durationMs = Date.now() - startedAt;
  return {
    label,
    command,
    durationMs,
    status: result.status ?? 1,
    ok: result.status === 0,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
  };
}

function extractJsonFromText(text) {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) {
    throw new Error('Unable to locate JSON payload in command output.');
  }
  return JSON.parse(text.slice(start, end + 1));
}

function readJsonFile(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function ratioTrue(keys, source) {
  if (!keys.length) return 1;
  let passed = 0;
  for (const key of keys) {
    if (source?.[key] === true) {
      passed += 1;
    }
  }
  return passed / keys.length;
}

function boundedScore(value, good, bad) {
  if (!Number.isFinite(value)) return 0.65;
  if (value <= good) return 1;
  if (value >= bad) return 0;
  return (bad - value) / (bad - good);
}

function round1(value) {
  return Math.round(value * 10) / 10;
}

function main() {
  ensureArtifactDir();
  if (fs.existsSync(JEST_RESULT_FILE)) fs.unlinkSync(JEST_RESULT_FILE);
  if (fs.existsSync(QA_RESULT_FILE)) fs.unlinkSync(QA_RESULT_FILE);

  const checks = [];
  checks.push(runCommand('typecheck', 'npx tsc --noEmit'));
  checks.push(runCommand('lint', 'npm run -s lint'));
  checks.push(
    runCommand(
      'jest',
      `npm test -- --runInBand __tests__/codeResearch.test.ts --json --outputFile "${JEST_RESULT_FILE}"`,
    ),
  );
  checks.push(runCommand('pet-assets', 'npm run -s qa:pet-assets'));
  checks.push(
    runCommand('qa-code-research', 'npm run -s qa:code-research', {
      QA_CODE_RESEARCH_RESULT_FILE: QA_RESULT_FILE,
    }),
  );

  const checkMap = Object.fromEntries(checks.map((item) => [item.label, item]));
  const jestResult = fs.existsSync(JEST_RESULT_FILE) ? readJsonFile(JEST_RESULT_FILE) : null;
  const qaResult = fs.existsSync(QA_RESULT_FILE) ? readJsonFile(QA_RESULT_FILE) : null;
  const petAssetResult = checkMap['pet-assets'].ok
    ? extractJsonFromText(checkMap['pet-assets'].stdout)
    : null;

  const verified = qaResult?.verified ?? {};
  const uxKeys = [
    'chapterSelectFlow',
    'mapRendered',
    'levelOnboardingButton',
    'legacyCoachRailRemoved',
    'drawerDrivenGuide',
    'storyDrawerFlow',
    'storyToggleActiveState',
    'mobileTouchLayout',
    'mobileMapNodeClickable',
    'objectiveProgressMeter',
    'selectedCardEscClose',
    'selectedCardCloseButton',
    'selectedCardEnterStart',
    'commandInsertion',
    'hintInteraction',
    'runTimeline',
    'friendlyFailure',
    'soundToggle',
  ];
  const reliabilityKeys = [
    'progressSavedToCloud',
    'progressFieldsSynced',
    'coinRewardSynced',
    'rewardIdempotent',
    'worseReplayDidNotDowngradeCloud',
    'reloadImportedBestProgress',
    'requiresStudentEditBeforeRun',
    'challengeStarted',
    'editedCodeReachedVictory',
  ];

  const uxRatio = ratioTrue(uxKeys, verified);
  const reliabilityRatio = ratioTrue(reliabilityKeys, verified);

  const domContentLoadedMs = qaResult?.performance?.initial?.domContentLoadedMs ?? null;
  const fcpMs = qaResult?.performance?.initial?.fcpMs ?? null;
  const mapTransitionMs = qaResult?.performance?.transitions?.mapTransitionMs ?? null;
  const levelTransitionMs = qaResult?.performance?.transitions?.levelTransitionMs ?? null;
  const taskDrawerOpenMs = qaResult?.performance?.transitions?.taskDrawerOpenMs ?? null;
  const aiCompanionOpenMs = qaResult?.performance?.transitions?.aiCompanionOpenMs ?? null;
  const storyDrawerOpenMs = qaResult?.performance?.transitions?.storyDrawerOpenMs ?? null;

  const perfRatios = [
    boundedScore(domContentLoadedMs, 2000, 6000),
    boundedScore(fcpMs, 1600, 4500),
    boundedScore(mapTransitionMs, 800, 3200),
    boundedScore(levelTransitionMs, 1000, 3600),
    boundedScore(taskDrawerOpenMs, 220, 1200),
    boundedScore(storyDrawerOpenMs, 240, 1400),
    boundedScore(aiCompanionOpenMs, 280, 1500),
  ];
  const perfRatio = perfRatios.reduce((sum, item) => sum + item, 0) / perfRatios.length;

  const jestRatio =
    jestResult && Number.isFinite(jestResult.numTotalTests) && jestResult.numTotalTests > 0
      ? Math.max(0, Math.min(1, jestResult.numPassedTests / jestResult.numTotalTests))
      : 0;
  const petAssetRatio =
    petAssetResult &&
    Number(petAssetResult.missingReferenceCount ?? 1) === 0 &&
    Number(petAssetResult?.lottie?.missingStateCount ?? 1) === 0
      ? 1
      : 0;

  const engineeringScore =
    (checkMap.typecheck.ok ? 6 : 0) +
    (checkMap.lint.ok ? 6 : 0) +
    10 * jestRatio +
    8 * petAssetRatio;
  const uxScore = 30 * uxRatio;
  const reliabilityScore = 25 * reliabilityRatio;
  const performanceScore = 15 * perfRatio;

  const totalScore = round1(engineeringScore + uxScore + reliabilityScore + performanceScore);

  const criticalChecks = {
    typecheck: checkMap.typecheck.ok,
    lint: checkMap.lint.ok,
    jest: Boolean(jestResult?.success),
    qaStatus: qaResult?.status === 'ok',
    qaConsoleClean: Array.isArray(qaResult?.consoleErrors) && qaResult.consoleErrors.length === 0,
    progressSync: reliabilityRatio === 1,
  };
  const failedCriticalChecks = Object.entries(criticalChecks)
    .filter(([, passed]) => !passed)
    .map(([name]) => name);

  const report = {
    auditedAt: new Date().toISOString(),
    frontend: qaResult?.frontend ?? null,
    score: {
      total: totalScore,
      target: 95,
      reachedTarget: totalScore >= 95 && failedCriticalChecks.length === 0,
      sections: {
        engineering: round1(engineeringScore),
        ux: round1(uxScore),
        reliability: round1(reliabilityScore),
        performance: round1(performanceScore),
      },
      sectionWeights: {
        engineering: 30,
        ux: 30,
        reliability: 25,
        performance: 15,
      },
    },
    metrics: {
      checks: {
        typecheck: checkMap.typecheck.ok,
        lint: checkMap.lint.ok,
        jestPass: Boolean(jestResult?.success),
        petAssetsPass: petAssetRatio === 1,
        qaPass: qaResult?.status === 'ok',
      },
      jest: jestResult
        ? {
            total: jestResult.numTotalTests,
            passed: jestResult.numPassedTests,
            failed: jestResult.numFailedTests,
          }
        : null,
      qaVerifiedRatio: {
        ux: round1(uxRatio * 100),
        reliability: round1(reliabilityRatio * 100),
      },
      performance: {
        domContentLoadedMs,
        fcpMs,
        mapTransitionMs,
        levelTransitionMs,
        taskDrawerOpenMs,
        storyDrawerOpenMs,
        aiCompanionOpenMs,
      },
      petAssets: petAssetResult
        ? {
            missingReferenceCount: petAssetResult.missingReferenceCount,
            missingStateCount: petAssetResult?.lottie?.missingStateCount ?? null,
          }
        : null,
    },
    criticalChecks,
    failedCriticalChecks,
    commandDurationsMs: Object.fromEntries(checks.map((item) => [item.label, item.durationMs])),
    artifacts: {
      qaResultFile: QA_RESULT_FILE,
      jestResultFile: JEST_RESULT_FILE,
    },
  };

  fs.writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2), 'utf8');
  console.log(JSON.stringify(report, null, 2));

  if (failedCriticalChecks.length > 0) {
    process.exitCode = 1;
  }
}

main();
