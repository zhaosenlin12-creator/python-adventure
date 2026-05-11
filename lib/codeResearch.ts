export type CodeResearchDirection = "up" | "down" | "left" | "right";

export type CodeResearchItemKind = "crystal" | "key" | "scroll" | "coin" | "plank" | "potion";

export type CodeResearchTerrainKind = "wall" | "hazard" | "water" | "rune" | "decor";

export type CodeResearchCommand =
  | { type: "move"; direction: CodeResearchDirection; source: string; line: number }
  | { type: "collect"; source: string; line: number }
  | { type: "attack"; source: string; line: number }
  | { type: "openDoor"; source: string; line: number }
  | { type: "buildBridge"; direction?: CodeResearchDirection; source: string; line: number }
  | { type: "stepOnSwitch"; source: string; line: number }
  | { type: "scan"; source: string; line: number }
  | { type: "wait"; source: string; line: number }
  | { type: "say"; text: string; source: string; line: number };

export interface CodeResearchPoint {
  x: number;
  y: number;
}

export interface CodeResearchSceneGrid {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface CodeResearchSceneConfig {
  theme: "city" | "dungeonScene";
  background: string;
  grid: CodeResearchSceneGrid;
  sourceWidth?: number;
  sourceHeight?: number;
  tokenScale?: number;
}

export interface CodeResearchItem extends CodeResearchPoint {
  id: string;
  kind: CodeResearchItemKind;
  label: string;
  required?: boolean;
}

export interface CodeResearchEnemy extends CodeResearchPoint {
  id: string;
  label: string;
  kind: "guard" | "bug" | "sentinel" | "slime";
  hp: number;
}

export interface CodeResearchTerrain extends CodeResearchPoint {
  id: string;
  kind: CodeResearchTerrainKind;
  label: string;
}

export interface CodeResearchDoor extends CodeResearchPoint {
  id: string;
  label: string;
  requiresItemId?: string;
}

export interface CodeResearchBridgeSpot extends CodeResearchPoint {
  id: string;
  label: string;
  requiresItemId?: string;
}

export interface CodeResearchSwitch extends CodeResearchPoint {
  id: string;
  label: string;
  opensDoorId?: string;
}

export interface CodeResearchGoal {
  id: string;
  label: string;
  kind: "collect" | "defeat" | "exit" | "openDoor" | "buildBridge" | "activateSwitch" | "say" | "scan";
  targetId?: string;
}

export type CodeResearchTaskMode = "fill_blanks" | "fix_bug" | "guided_build" | "capstone";

export interface CodeResearchTask {
  mode: CodeResearchTaskMode;
  title: string;
  summary: string;
  checklist: string[];
  requireCodeChange?: boolean;
}

export interface CodeResearchTutorialCodeRequirement {
  snippet: string;
  count?: number;
}

export interface CodeResearchTutorialCommandRequirement {
  type: CodeResearchCommand["type"];
  direction?: CodeResearchDirection;
  count?: number;
  textIncludes?: string;
}

export interface CodeResearchTutorialStep {
  id: string;
  title: string;
  instruction: string;
  coach: string;
  success: string;
  requiredSnippets?: CodeResearchTutorialCodeRequirement[];
  forbiddenSnippets?: string[];
  requiredCommands?: CodeResearchTutorialCommandRequirement[];
  requiredGoalIds?: string[];
}

export interface CodeResearchLevel {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  mapTitle: string;
  difficulty: "入门" | "基础" | "进阶" | "挑战";
  biome: "dungeon" | "forest" | "river" | "ruins";
  concepts: string[];
  toolbox: string[];
  task: CodeResearchTask;
  tutorialSteps?: CodeResearchTutorialStep[];
  mentor: {
    name: string;
    avatar: string;
    intro: string;
    success: string;
  };
  scene?: CodeResearchSceneConfig;
  mapPosition: {
    left: number;
    top: number;
    size?: "small" | "large";
  };
  width: number;
  height: number;
  terrain: CodeResearchTerrain[];
  doors?: CodeResearchDoor[];
  bridges?: CodeResearchBridgeSpot[];
  switches?: CodeResearchSwitch[];
  heroStart: CodeResearchPoint;
  exit: CodeResearchPoint;
  items: CodeResearchItem[];
  enemies: CodeResearchEnemy[];
  starterCode: string;
  solution: string;
  goals: CodeResearchGoal[];
  hints: string[];
  briefing: string[];
  failureTips: Record<string, string>;
  parSteps: number;
  xpReward: number;
  coinReward: number;
}

export interface CodeResearchRuntimeState {
  hero: CodeResearchPoint;
  collectedItemIds: string[];
  defeatedEnemyIds: string[];
  openedDoorIds: string[];
  builtBridgeIds: string[];
  activatedSwitchIds: string[];
  scanned: boolean;
  saidMessages: string[];
  message: string;
  messageTone: "idle" | "info" | "success" | "fail" | "hint";
  activeCommand?: string;
  failed?: string;
  success?: boolean;
  step: number;
}

export interface CodeResearchGoalStatus extends CodeResearchGoal {
  completed: boolean;
}

export interface CodeResearchTutorialStepStatus extends CodeResearchTutorialStep {
  completed: boolean;
  draftComplete: boolean;
  runComplete: boolean;
}

export interface CodeResearchFrame {
  state: CodeResearchRuntimeState;
  log: string;
  command?: string;
  event:
    | "start"
    | "move"
    | "collect"
    | "attack"
    | "openDoor"
    | "buildBridge"
    | "switch"
    | "scan"
    | "say"
    | "wait"
    | "fail"
    | "success";
}

export interface CodeResearchResult {
  success: boolean;
  failedReason?: string;
  coaching: string;
  stars: number;
  steps: number;
  frames: CodeResearchFrame[];
  logs: string[];
  goalStatuses: CodeResearchGoalStatus[];
}

export interface CodeResearchProgressRecord {
  completed: boolean;
  stars: number;
  bestSteps: number;
  completedAt: string;
}

function normalizeProgressStars(value: number | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(3, Math.floor(value)));
}

function normalizeProgressBestSteps(value: number | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) return Number.MAX_SAFE_INTEGER;
  return Math.max(1, Math.floor(value));
}

export function mergeCodeResearchProgressRecord(
  previous?: Partial<CodeResearchProgressRecord>,
  next?: Partial<CodeResearchProgressRecord>,
): CodeResearchProgressRecord | undefined {
  if (!previous && !next) return undefined;

  const previousStars = normalizeProgressStars(previous?.stars);
  const nextStars = normalizeProgressStars(next?.stars);
  const previousBestSteps = normalizeProgressBestSteps(previous?.bestSteps);
  const nextBestSteps = normalizeProgressBestSteps(next?.bestSteps);
  const mergedBestSteps = Math.min(previousBestSteps, nextBestSteps);
  const completedAt =
    [previous?.completedAt, next?.completedAt]
      .filter((value): value is string => Boolean(value))
      .sort()
      .at(-1) ?? new Date().toISOString();

  return {
    completed: Boolean(previous?.completed || next?.completed),
    stars: Math.max(previousStars, nextStars),
    bestSteps: Number.isFinite(mergedBestSteps)
      ? mergedBestSteps
      : Math.max(1, Math.floor(next?.bestSteps ?? previous?.bestSteps ?? 1)),
    completedAt,
  };
}

const directionDelta: Record<CodeResearchDirection, CodeResearchPoint> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

const directionName: Record<CodeResearchDirection, string> = {
  up: "上",
  down: "下",
  left: "左",
  right: "右",
};

const pointKey = (point: CodeResearchPoint) => `${point.x},${point.y}`;

function samePoint(a: CodeResearchPoint, b: CodeResearchPoint) {
  return a.x === b.x && a.y === b.y;
}

function isAdjacent(a: CodeResearchPoint, b: CodeResearchPoint) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y) === 1;
}

function pointInDirection(point: CodeResearchPoint, direction: CodeResearchDirection) {
  const delta = directionDelta[direction];
  return { x: point.x + delta.x, y: point.y + delta.y };
}

function cloneState(state: CodeResearchRuntimeState): CodeResearchRuntimeState {
  return {
    hero: { ...state.hero },
    collectedItemIds: [...state.collectedItemIds],
    defeatedEnemyIds: [...state.defeatedEnemyIds],
    openedDoorIds: [...state.openedDoorIds],
    builtBridgeIds: [...state.builtBridgeIds],
    activatedSwitchIds: [...state.activatedSwitchIds],
    scanned: state.scanned,
    saidMessages: [...state.saidMessages],
    message: state.message,
    messageTone: state.messageTone,
    activeCommand: state.activeCommand,
    failed: state.failed,
    success: state.success,
    step: state.step,
  };
}

function stripComment(line: string) {
  const slashIndex = line.indexOf("//");
  const hashIndex = line.indexOf("#");
  const indexes = [slashIndex, hashIndex].filter((index) => index >= 0);
  if (!indexes.length) return line;
  return line.slice(0, Math.min(...indexes));
}

function normalizeLine(rawLine: string) {
  return stripComment(rawLine).trim().replace(/;$/, "").trim();
}

function parseDirection(raw: string): CodeResearchDirection {
  return raw.toLowerCase() as CodeResearchDirection;
}

function countOccurrences(value: string, snippet: string) {
  if (!snippet) return 0;
  return value.split(snippet).length - 1;
}

function normalizeSnippetText(value: string) {
  return value.replace(/\r/g, "").replace(/[ \t]+$/gm, "").trim();
}

function toSnakeHeroSyntax(value: string) {
  return value
    .replace(/\bhero\.moveRight\s*\(\s*\)/g, "hero.move_right()")
    .replace(/\bhero\.moveLeft\s*\(\s*\)/g, "hero.move_left()")
    .replace(/\bhero\.moveUp\s*\(\s*\)/g, "hero.move_up()")
    .replace(/\bhero\.moveDown\s*\(\s*\)/g, "hero.move_down()")
    .replace(/\bhero\.openDoor\s*\(\s*\)/g, "hero.open_door()")
    .replace(/\bhero\.stepOnSwitch\s*\(\s*\)/g, "hero.step_on_switch()")
    .replace(/\bhero\.buildBridge\s*\(/g, "hero.build_bridge(")
    .replace(/\bhero\.scan\s*\(\s*\)/g, "hero.scan_map()")
    .replace(/\bhero\.wait\s*\(\s*\)/g, "hero.wait_turn()")
    .replace(/\bhero\.move\s*\(\s*["']right["']\s*\)/gi, "hero.move_right()")
    .replace(/\bhero\.move\s*\(\s*["']left["']\s*\)/gi, "hero.move_left()")
    .replace(/\bhero\.move\s*\(\s*["']up["']\s*\)/gi, "hero.move_up()")
    .replace(/\bhero\.move\s*\(\s*["']down["']\s*\)/gi, "hero.move_down()");
}

function toCamelHeroSyntax(value: string) {
  return value
    .replace(/\bhero\.move_right\s*\(\s*\)/g, "hero.moveRight()")
    .replace(/\bhero\.move_left\s*\(\s*\)/g, "hero.moveLeft()")
    .replace(/\bhero\.move_up\s*\(\s*\)/g, "hero.moveUp()")
    .replace(/\bhero\.move_down\s*\(\s*\)/g, "hero.moveDown()")
    .replace(/\bhero\.open_door\s*\(\s*\)/g, "hero.openDoor()")
    .replace(/\bhero\.step_on_switch\s*\(\s*\)/g, "hero.stepOnSwitch()")
    .replace(/\bhero\.build_bridge\s*\(/g, "hero.buildBridge(")
    .replace(/\bhero\.scan_map\s*\(\s*\)/g, "hero.scan()")
    .replace(/\bhero\.wait_turn\s*\(\s*\)/g, "hero.wait()");
}

function convertLegacyRepeatToPython(value: string) {
  return value.replace(/repeat\s*\(\s*([^)]+)\s*\)\s*\{\s*([\s\S]*?)\s*\}/g, (_match, count, body) => {
    const bodyLines = String(body)
      .replace(/\r/g, "")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => toSnakeHeroSyntax(line));
    if (!bodyLines.length) {
      return `for _ in range(${String(count).trim()}):`;
    }
    return `for _ in range(${String(count).trim()}):\n${bodyLines.map((line) => `    ${line}`).join("\n")}`;
  });
}

function convertPythonForToLegacy(value: string) {
  return value.replace(
    /for\s+_\s+in\s+range\(\s*([^)]+)\s*\)\s*:\s*\n([\s\S]*?)(?=\n(?:\S|$)|$)/g,
    (_match, count, body) => {
      const bodyLines = String(body)
        .replace(/\r/g, "")
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => toCamelHeroSyntax(line));
      if (!bodyLines.length) return `repeat(${String(count).trim()}) {\n}`;
      return `repeat(${String(count).trim()}) {\n${bodyLines.map((line) => `  ${line}`).join("\n")}\n}`;
    },
  );
}

function countSnippetMatches(userCode: string, snippet: string) {
  const normalizedCode = normalizeSnippetText(userCode);
  const normalizedSnippet = normalizeSnippetText(snippet);
  if (!normalizedCode || !normalizedSnippet) return 0;

  const variants = new Set<string>();
  const pushVariant = (value: string) => {
    const normalized = normalizeSnippetText(value);
    if (normalized) variants.add(normalized);
  };

  pushVariant(normalizedSnippet);
  pushVariant(toSnakeHeroSyntax(normalizedSnippet));
  pushVariant(toCamelHeroSyntax(normalizedSnippet));

  const legacyToPython = convertLegacyRepeatToPython(normalizedSnippet);
  pushVariant(legacyToPython);
  pushVariant(toSnakeHeroSyntax(legacyToPython));
  pushVariant(toCamelHeroSyntax(legacyToPython));

  const pythonToLegacy = convertPythonForToLegacy(normalizedSnippet);
  pushVariant(pythonToLegacy);
  pushVariant(toSnakeHeroSyntax(pythonToLegacy));
  pushVariant(toCamelHeroSyntax(pythonToLegacy));

  let bestCount = 0;
  for (const variant of variants) {
    bestCount = Math.max(bestCount, countOccurrences(normalizedCode, variant));
  }
  return bestCount;
}

function commandMatchesRequirement(
  command: CodeResearchCommand,
  requirement: CodeResearchTutorialCommandRequirement,
) {
  if (command.type !== requirement.type) return false;
  if (requirement.direction) {
    if (command.type !== "move" && command.type !== "buildBridge") return false;
    if (command.direction !== requirement.direction) return false;
  }
  if (requirement.textIncludes) {
    if (command.type !== "say") return false;
    if (!command.text.includes(requirement.textIncludes)) return false;
  }
  return true;
}

function parseCommand(line: string, lineNumber: number): CodeResearchCommand | string {
  const moveSnakeMethod = line.match(/^hero\.(move_up|move_down|move_left|move_right)\s*\(\s*\)$/i);
  if (moveSnakeMethod) {
    const direction = moveSnakeMethod[1].replace("move_", "").toLowerCase() as CodeResearchDirection;
    return { type: "move", direction, source: line, line: lineNumber };
  }

  const moveMethod = line.match(/^hero\.(moveUp|moveDown|moveLeft|moveRight)\s*\(\s*\)$/i);
  if (moveMethod) {
    const direction = moveMethod[1].replace("move", "").toLowerCase() as CodeResearchDirection;
    return { type: "move", direction, source: line, line: lineNumber };
  }

  const moveString = line.match(/^hero\.move\s*\(\s*["'](up|down|left|right)["']\s*\)$/i);
  if (moveString) {
    return { type: "move", direction: parseDirection(moveString[1]), source: line, line: lineNumber };
  }

  const buildBridge = line.match(/^hero\.(?:buildBridge|build_bridge)\s*\(\s*(?:["'](up|down|left|right)["']\s*)?\)$/i);
  if (buildBridge) {
    return {
      type: "buildBridge",
      direction: buildBridge[1] ? parseDirection(buildBridge[1]) : undefined,
      source: line,
      line: lineNumber,
    };
  }

  if (/^hero\.collect\s*\(\s*\)$/i.test(line)) {
    return { type: "collect", source: line, line: lineNumber };
  }

  if (/^hero\.attack\s*\(\s*\)$/i.test(line)) {
    return { type: "attack", source: line, line: lineNumber };
  }

  if (/^hero\.(?:openDoor|open_door)\s*\(\s*\)$/i.test(line)) {
    return { type: "openDoor", source: line, line: lineNumber };
  }

  if (/^hero\.(?:stepOnSwitch|step_on_switch)\s*\(\s*\)$/i.test(line)) {
    return { type: "stepOnSwitch", source: line, line: lineNumber };
  }

  if (/^hero\.(?:scan|scan_map)\s*\(\s*\)$/i.test(line)) {
    return { type: "scan", source: line, line: lineNumber };
  }

  if (/^hero\.(?:wait|wait_turn)\s*\(\s*\)$/i.test(line)) {
    return { type: "wait", source: line, line: lineNumber };
  }

  const say = line.match(/^hero\.say\s*\(\s*["'](.{0,80})["']\s*\)$/i);
  if (say) {
    return { type: "say", text: say[1], source: line, line: lineNumber };
  }

  return `无法识别命令：${line}。可用命令在右侧“命令书”里，学生代码不会被直接执行。`;
}

function addParsedCommand(target: CodeResearchCommand[], line: string, lineNumber: number): string | null {
  const parsed = parseCommand(line, lineNumber);
  if (typeof parsed === "string") return parsed;
  target.push(parsed);
  return null;
}

type PythonValue = number | boolean | string;

interface PythonSourceLine {
  lineNumber: number;
  indent: number;
  text: string;
}

interface PythonExpandedLine {
  lineNumber: number;
  text: string;
}

interface PythonExpandContext {
  variables: Map<string, PythonValue>;
  functions: Map<string, PythonExpandedLine[]>;
}

function stripPythonComment(line: string) {
  let inSingleQuote = false;
  let inDoubleQuote = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const prev = index > 0 ? line[index - 1] : "";
    const escaped = prev === "\\";

    if (char === "'" && !inDoubleQuote && !escaped) {
      inSingleQuote = !inSingleQuote;
      continue;
    }

    if (char === '"' && !inSingleQuote && !escaped) {
      inDoubleQuote = !inDoubleQuote;
      continue;
    }

    if (char === "#" && !inSingleQuote && !inDoubleQuote) {
      return line.slice(0, index);
    }
  }

  return line;
}

function tokenizePythonLines(code: string): PythonSourceLine[] {
  return code
    .split(/\r?\n/)
    .map((rawLine, index) => {
      const lineNumber = index + 1;
      const noComment = stripPythonComment(rawLine).replace(/\s+$/, "");
      if (!noComment.trim()) return null;
      const expanded = noComment.replace(/\t/g, "    ");
      const indent = expanded.match(/^ */)?.[0].length ?? 0;
      const text = expanded.trim().replace(/;$/, "").trim();
      if (!text) return null;
      return { lineNumber, indent, text };
    })
    .filter((line): line is PythonSourceLine => line !== null);
}

function normalizePythonHeroSyntax(line: string): string {
  return line
    .replace(/\bhero\.move_up\s*\(\s*\)/gi, "hero.moveUp()")
    .replace(/\bhero\.move_down\s*\(\s*\)/gi, "hero.moveDown()")
    .replace(/\bhero\.move_left\s*\(\s*\)/gi, "hero.moveLeft()")
    .replace(/\bhero\.move_right\s*\(\s*\)/gi, "hero.moveRight()")
    .replace(/\bhero\.open_door\s*\(\s*\)/gi, "hero.openDoor()")
    .replace(/\bhero\.build_bridge\s*\(/gi, "hero.buildBridge(")
    .replace(/\bhero\.step_on_switch\s*\(\s*\)/gi, "hero.stepOnSwitch()")
    .replace(/\bhero\.scan_map\s*\(\s*\)/gi, "hero.scan()")
    .replace(/\bhero\.wait_turn\s*\(\s*\)/gi, "hero.wait()");
}

function tokenizePythonMathExpression(expression: string): string[] | undefined {
  const tokens: string[] = [];
  let index = 0;

  while (index < expression.length) {
    const char = expression[index];
    if (/\s/.test(char)) {
      index += 1;
      continue;
    }

    if (expression.slice(index, index + 2) === "//") {
      tokens.push("//");
      index += 2;
      continue;
    }

    if (/^[+\-*()%]$/.test(char)) {
      tokens.push(char);
      index += 1;
      continue;
    }

    const numberMatch = expression.slice(index).match(/^\d+/);
    if (numberMatch) {
      tokens.push(numberMatch[0]);
      index += numberMatch[0].length;
      continue;
    }

    const identifierMatch = expression.slice(index).match(/^[a-zA-Z_]\w*/);
    if (identifierMatch) {
      tokens.push(identifierMatch[0]);
      index += identifierMatch[0].length;
      continue;
    }

    return undefined;
  }

  return tokens.length ? tokens : undefined;
}

function parsePythonMathExpression(token: string, context: PythonExpandContext): number | undefined {
  const tokens = tokenizePythonMathExpression(token);
  if (!tokens) return undefined;

  let index = 0;

  const parsePrimary = (): number | undefined => {
    const current = tokens[index];
    if (!current) return undefined;

    if (current === "(") {
      index += 1;
      const value = parseAddSubtract();
      if (value === undefined || tokens[index] !== ")") return undefined;
      index += 1;
      return value;
    }

    if (current === "-") {
      index += 1;
      const value = parsePrimary();
      return value === undefined ? undefined : -value;
    }

    if (/^-?\d+$/.test(current)) {
      index += 1;
      return Number(current);
    }

    if (/^[a-zA-Z_]\w*$/.test(current)) {
      index += 1;
      const value = context.variables.get(current);
      if (typeof value === "number") return value;
      if (typeof value === "boolean") return value ? 1 : 0;
      return undefined;
    }

    return undefined;
  };

  const parseMultiply = (): number | undefined => {
    let value = parsePrimary();
    if (value === undefined) return undefined;

    while (index < tokens.length) {
      const operator = tokens[index];
      if (operator !== "*" && operator !== "//" && operator !== "%") break;
      index += 1;
      const right = parsePrimary();
      if (right === undefined) return undefined;

      if (operator === "*") {
        value *= right;
      } else if (operator === "//") {
        if (right === 0) return undefined;
        value = Math.floor(value / right);
      } else {
        if (right === 0) return undefined;
        value %= right;
      }
    }

    return value;
  };

  const parseAddSubtract = (): number | undefined => {
    let value = parseMultiply();
    if (value === undefined) return undefined;

    while (index < tokens.length) {
      const operator = tokens[index];
      if (operator !== "+" && operator !== "-") break;
      index += 1;
      const right = parseMultiply();
      if (right === undefined) return undefined;
      if (operator === "+") {
        value += right;
      } else {
        value -= right;
      }
    }

    return value;
  };

  const result = parseAddSubtract();
  if (result === undefined || index !== tokens.length || !Number.isFinite(result)) return undefined;
  return result;
}

function parsePythonValue(token: string, context: PythonExpandContext): PythonValue | undefined {
  const trimmed = token.trim();
  if (/^-?\d+$/.test(trimmed)) return Number(trimmed);
  if (/^(True|true)$/i.test(trimmed)) return true;
  if (/^(False|false)$/i.test(trimmed)) return false;
  const stringMatch = trimmed.match(/^["'](.+)["']$/);
  if (stringMatch) return stringMatch[1];
  if (context.variables.has(trimmed)) return context.variables.get(trimmed);
  const mathValue = parsePythonMathExpression(trimmed, context);
  if (mathValue !== undefined) return mathValue;
  return undefined;
}

function parsePythonInt(token: string, context: PythonExpandContext): number | undefined {
  const value = parsePythonValue(token, context);
  return typeof value === "number" && Number.isFinite(value) ? Math.floor(value) : undefined;
}

function splitLogicalExpression(token: string, operator: "and" | "or"): string[] {
  return token
    .split(new RegExp(`\\s+${operator}\\s+`, "i"))
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

function parsePythonBool(token: string, context: PythonExpandContext): boolean | undefined {
  const trimmed = token.trim();
  if (/^(True|true)$/i.test(trimmed)) return true;
  if (/^(False|false)$/i.test(trimmed)) return false;

  const orParts = splitLogicalExpression(trimmed, "or");
  if (orParts.length > 1) {
    let sawUnknown = false;
    for (const part of orParts) {
      const value = parsePythonBool(part, context);
      if (value === true) return true;
      if (value === undefined) sawUnknown = true;
    }
    return sawUnknown ? undefined : false;
  }

  const andParts = splitLogicalExpression(trimmed, "and");
  if (andParts.length > 1) {
    let sawUnknown = false;
    for (const part of andParts) {
      const value = parsePythonBool(part, context);
      if (value === false) return false;
      if (value === undefined) sawUnknown = true;
    }
    return sawUnknown ? undefined : true;
  }

  const notMatch = trimmed.match(/^not\s+(.+)$/i);
  if (notMatch) {
    const value = parsePythonBool(notMatch[1], context);
    return typeof value === "boolean" ? !value : undefined;
  }

  const compareMatch = trimmed.match(/^(.+?)\s*(==|!=|<=|>=|<|>)\s*(.+)$/);
  if (compareMatch) {
    const leftValue = parsePythonValue(compareMatch[1], context);
    const rightValue = parsePythonValue(compareMatch[3], context);
    if (leftValue === undefined || rightValue === undefined) return undefined;
    const [, , operator] = compareMatch;
    switch (operator) {
      case "==":
        return leftValue === rightValue;
      case "!=":
        return leftValue !== rightValue;
      case "<":
        return Number(leftValue) < Number(rightValue);
      case "<=":
        return Number(leftValue) <= Number(rightValue);
      case ">":
        return Number(leftValue) > Number(rightValue);
      case ">=":
        return Number(leftValue) >= Number(rightValue);
      default:
        return undefined;
    }
  }

  const value = parsePythonValue(trimmed, context);
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  return undefined;
}

function resolvePythonCommandLine(rawLine: string, context: PythonExpandContext): string {
  const printMatch = rawLine.match(/^print\s*\(\s*["'](.{0,80})["']\s*\)$/);
  if (printMatch) {
    const safeText = printMatch[1].replace(/"/g, '\\"');
    return `hero.say("${safeText}")`;
  }

  const moveByVarMatch = rawLine.match(/^hero\.move\s*\(\s*([a-zA-Z_]\w*)\s*\)$/);
  if (moveByVarMatch) {
    const value = parsePythonValue(moveByVarMatch[1], context);
    if (typeof value === "string") {
      return `hero.move("${value}")`;
    }
  }

  return normalizePythonHeroSyntax(rawLine);
}

function parsePythonBlock(
  lines: PythonSourceLine[],
  startIndex: number,
  expectedIndent: number,
  context: PythonExpandContext,
): { nextIndex: number; expanded: PythonExpandedLine[]; error?: string } {
  const expanded: PythonExpandedLine[] = [];
  let index = startIndex;

  while (index < lines.length) {
    const line = lines[index];
    if (line.indent < expectedIndent) break;
    if (line.indent > expectedIndent) {
      return {
        nextIndex: index,
        expanded,
        error: `第 ${line.lineNumber} 行：缩进层级不正确，请统一使用同一层缩进。`,
      };
    }

    if (/^pass$/i.test(line.text)) {
      index += 1;
      continue;
    }

    if (/^else\s*:\s*$/i.test(line.text) || /^elif\s+.+\s*:\s*$/i.test(line.text)) {
      break;
    }

    const assignment = line.text.match(/^([a-zA-Z_]\w*)\s*=\s*(.+)$/);
    if (assignment) {
      const value = parsePythonValue(assignment[2], context);
      if (value === undefined) {
        return {
          nextIndex: index,
          expanded,
          error: `第 ${line.lineNumber} 行：变量赋值仅支持数字、布尔、字符串或已定义变量。`,
        };
      }
      context.variables.set(assignment[1], value);
      index += 1;
      continue;
    }

    const forLoop = line.text.match(/^for\s+([a-zA-Z_]\w*)\s+in\s+range\(\s*([^)]+)\s*\)\s*:\s*$/);
    if (forLoop) {
      const count = parsePythonInt(forLoop[2], context);
      if (count === undefined || count < 0 || count > 20) {
        return {
          nextIndex: index,
          expanded,
          error: `第 ${line.lineNumber} 行：range 次数需要是 0 到 20 的整数。`,
        };
      }

      const bodyStart = index + 1;
      if (bodyStart >= lines.length || lines[bodyStart].indent <= line.indent) {
        return {
          nextIndex: index,
          expanded,
          error: `第 ${line.lineNumber} 行：for 循环后需要一个缩进代码块。`,
        };
      }

      const blockIndent = lines[bodyStart].indent;
      const bodyResult = parsePythonBlock(lines, bodyStart, blockIndent, context);
      if (bodyResult.error) return bodyResult;

      for (let loopIndex = 0; loopIndex < count; loopIndex += 1) {
        context.variables.set(forLoop[1], loopIndex);
        expanded.push(...bodyResult.expanded);
      }
      index = bodyResult.nextIndex;
      continue;
    }

    const ifLine = line.text.match(/^if\s+(.+)\s*:\s*$/);
    if (ifLine) {
      const condition = parsePythonBool(ifLine[1], context);
      if (condition === undefined) {
        return {
          nextIndex: index,
          expanded,
          error: `第 ${line.lineNumber} 行：if 条件仅支持布尔值、变量和简单比较。`,
        };
      }

      const trueStart = index + 1;
      if (trueStart >= lines.length || lines[trueStart].indent <= line.indent) {
        return {
          nextIndex: index,
          expanded,
          error: `第 ${line.lineNumber} 行：if 后需要一个缩进代码块。`,
        };
      }

      const trueIndent = lines[trueStart].indent;
      const trueResult = parsePythonBlock(lines, trueStart, trueIndent, context);
      if (trueResult.error) return trueResult;

      let nextIndex = trueResult.nextIndex;
      let selectedExpanded: PythonExpandedLine[] | null = condition ? trueResult.expanded : null;

      while (nextIndex < lines.length) {
        const elifLine = lines[nextIndex];
        if (!elifLine || elifLine.indent !== expectedIndent) break;
        const elifMatch = elifLine.text.match(/^elif\s+(.+)\s*:\s*$/);
        if (!elifMatch) break;

        const elifCondition = parsePythonBool(elifMatch[1], context);
        if (elifCondition === undefined) {
          return {
            nextIndex,
            expanded,
            error: `第 ${elifLine.lineNumber} 行：elif 条件仅支持布尔值、变量和简单比较。`,
          };
        }

        const elifStart = nextIndex + 1;
        if (elifStart >= lines.length || lines[elifStart].indent <= elifLine.indent) {
          return {
            nextIndex,
            expanded,
            error: `第 ${elifLine.lineNumber} 行：elif 后需要一个缩进代码块。`,
          };
        }

        const elifIndent = lines[elifStart].indent;
        const elifResult = parsePythonBlock(lines, elifStart, elifIndent, context);
        if (elifResult.error) return elifResult;
        if (selectedExpanded === null && elifCondition) {
          selectedExpanded = elifResult.expanded;
        }
        nextIndex = elifResult.nextIndex;
      }

      const elseLine = lines[nextIndex];
      if (elseLine && elseLine.indent === expectedIndent && /^else\s*:\s*$/i.test(elseLine.text)) {
        const falseStart = nextIndex + 1;
        if (falseStart >= lines.length || lines[falseStart].indent <= elseLine.indent) {
          return {
            nextIndex,
            expanded,
            error: `第 ${elseLine.lineNumber} 行：else 后需要一个缩进代码块。`,
          };
        }
        const falseIndent = lines[falseStart].indent;
        const falseResult = parsePythonBlock(lines, falseStart, falseIndent, context);
        if (falseResult.error) return falseResult;
        if (selectedExpanded === null) {
          selectedExpanded = falseResult.expanded;
        }
        nextIndex = falseResult.nextIndex;
      }

      expanded.push(...(selectedExpanded ?? []));
      index = nextIndex;
      continue;
    }

    const defLine = line.text.match(/^def\s+([a-zA-Z_]\w*)\s*\(\s*\)\s*:\s*$/);
    if (defLine) {
      const bodyStart = index + 1;
      if (bodyStart >= lines.length || lines[bodyStart].indent <= line.indent) {
        return {
          nextIndex: index,
          expanded,
          error: `第 ${line.lineNumber} 行：def 后需要一个缩进代码块。`,
        };
      }
      const bodyIndent = lines[bodyStart].indent;
      const bodyResult = parsePythonBlock(lines, bodyStart, bodyIndent, context);
      if (bodyResult.error) return bodyResult;
      context.functions.set(defLine[1], bodyResult.expanded);
      index = bodyResult.nextIndex;
      continue;
    }

    const callMatch = line.text.match(/^([a-zA-Z_]\w*)\s*\(\s*\)\s*$/);
    if (callMatch && context.functions.has(callMatch[1])) {
      expanded.push(...(context.functions.get(callMatch[1]) ?? []));
      index += 1;
      continue;
    }

    const resolved = resolvePythonCommandLine(line.text, context);
    expanded.push({ lineNumber: line.lineNumber, text: resolved });
    index += 1;
  }

  return { nextIndex: index, expanded };
}

function compilePythonCodeResearchCommands(code: string): { commands: CodeResearchCommand[]; error?: string } {
  const lines = tokenizePythonLines(code);
  if (!lines.length) return { commands: [] };
  if (lines[0].indent > 0) {
    return { commands: [], error: `第 ${lines[0].lineNumber} 行：顶层代码不需要缩进。` };
  }

  const context: PythonExpandContext = {
    variables: new Map<string, PythonValue>(),
    functions: new Map<string, PythonExpandedLine[]>(),
  };

  const parsed = parsePythonBlock(lines, 0, lines[0].indent, context);
  if (parsed.error) {
    return { commands: [], error: parsed.error };
  }

  const commands: CodeResearchCommand[] = [];
  for (const item of parsed.expanded) {
    const error = addParsedCommand(commands, item.text, item.lineNumber);
    if (error) {
      return { commands: [], error: `第 ${item.lineNumber} 行：${error}` };
    }
  }

  if (commands.length > 120) {
    return { commands: [], error: "命令太多了，请把步骤控制在 120 行以内。可用 for range 减少重复。" };
  }

  return { commands };
}

function compileLegacyCodeResearchCommands(code: string): { commands: CodeResearchCommand[]; error?: string } {
  const rootCommands: CodeResearchCommand[] = [];
  const stack: Array<{ repeat: number; commands: CodeResearchCommand[]; line: number }> = [];
  const rawLines = code.split(/\r?\n/);

  for (let index = 0; index < rawLines.length; index += 1) {
    const lineNumber = index + 1;
    const line = normalizeLine(rawLines[index]);
    if (!line) continue;

    const repeat = line.match(/^repeat\s*\(?\s*(\d{1,2})\s*\)?\s*\{?$/i);
    if (repeat) {
      const count = Number(repeat[1]);
      if (count < 1 || count > 20) {
        return { commands: [], error: `第 ${lineNumber} 行：repeat 次数需要在 1 到 20 之间。` };
      }
      stack.push({ repeat: count, commands: [], line: lineNumber });
      continue;
    }

    if (line === "}") {
      const frame = stack.pop();
      if (!frame) {
        return { commands: [], error: `第 ${lineNumber} 行：多了一个 }。` };
      }
      const repeated = Array.from({ length: frame.repeat }, () => frame.commands).flat();
      const target = stack.length ? stack[stack.length - 1].commands : rootCommands;
      target.push(...repeated);
      continue;
    }

    const target = stack.length ? stack[stack.length - 1].commands : rootCommands;
    const error = addParsedCommand(target, line, lineNumber);
    if (error) {
      return { commands: [], error: `第 ${lineNumber} 行：${error}` };
    }
  }

  if (stack.length) {
    const frame = stack[stack.length - 1];
    return { commands: [], error: `第 ${frame.line} 行：repeat 缺少结尾的 }。` };
  }

  if (rootCommands.length > 120) {
    return { commands: [], error: "命令太多了。请把步骤控制在 120 行以内，优先用 repeat 简化重复动作。" };
  }

  return { commands: rootCommands };
}

export function compileCodeResearchCommands(code: string): { commands: CodeResearchCommand[]; error?: string } {
  const hasLegacyBlockSyntax = /(^|\n)\s*repeat\s*\(|\{|\}/i.test(code);
  if (hasLegacyBlockSyntax) {
    const legacy = compileLegacyCodeResearchCommands(code);
    if (!legacy.error) return legacy;
    const python = compilePythonCodeResearchCommands(code);
    return python.error ? legacy : python;
  }

  const python = compilePythonCodeResearchCommands(code);
  if (!python.error) return python;
  const legacy = compileLegacyCodeResearchCommands(code);
  return legacy.error ? python : legacy;
}

function getInitialState(level: CodeResearchLevel): CodeResearchRuntimeState {
  return {
    hero: { ...level.heroStart },
    collectedItemIds: [],
    defeatedEnemyIds: [],
    openedDoorIds: [],
    builtBridgeIds: [],
    activatedSwitchIds: [],
    scanned: false,
    saidMessages: [],
    message: level.mentor.intro,
    messageTone: "idle",
    step: 0,
  };
}

export function getCodeResearchGoalStatuses(
  level: CodeResearchLevel,
  state: CodeResearchRuntimeState,
): CodeResearchGoalStatus[] {
  return level.goals.map((goal) => {
    let completed = false;
    if (goal.kind === "collect" && goal.targetId) completed = state.collectedItemIds.includes(goal.targetId);
    if (goal.kind === "defeat" && goal.targetId) completed = state.defeatedEnemyIds.includes(goal.targetId);
    if (goal.kind === "openDoor" && goal.targetId) completed = state.openedDoorIds.includes(goal.targetId);
    if (goal.kind === "buildBridge" && goal.targetId) completed = state.builtBridgeIds.includes(goal.targetId);
    if (goal.kind === "activateSwitch" && goal.targetId) completed = state.activatedSwitchIds.includes(goal.targetId);
    if (goal.kind === "say") completed = state.saidMessages.length > 0;
    if (goal.kind === "scan") completed = state.scanned;
    if (goal.kind === "exit") completed = samePoint(state.hero, level.exit);
    return { ...goal, completed };
  });
}

export function getCodeResearchTutorialSteps(level: CodeResearchLevel): CodeResearchTutorialStep[] {
  if (level.tutorialSteps?.length) {
    return level.tutorialSteps;
  }

  return level.briefing.map((instruction, index) => ({
    id: `briefing-${index + 1}`,
    title: `步骤 ${index + 1}`,
    instruction,
    coach: level.hints[index] ?? level.mentor.intro,
    success: index === level.briefing.length - 1 ? level.mentor.success : "继续推进下一步。",
  }));
}

export function getCodeResearchTutorialStatuses(
  level: CodeResearchLevel,
  code: string,
  state: CodeResearchRuntimeState,
): CodeResearchTutorialStepStatus[] {
  const compiled = compileCodeResearchCommands(code);
  const commands = compiled.error ? [] : compiled.commands;
  const goalStatusById = new Map(
    getCodeResearchGoalStatuses(level, state).map((goal) => [goal.id, goal.completed]),
  );

  return getCodeResearchTutorialSteps(level).map((step) => {
    const snippetsReady = (step.requiredSnippets ?? []).every(
      (requirement) => countSnippetMatches(code, requirement.snippet) >= (requirement.count ?? 1),
    );
    const forbiddenClear = (step.forbiddenSnippets ?? []).every((snippet) => !code.includes(snippet));
    const commandsReady = (step.requiredCommands ?? []).every(
      (requirement) =>
        commands.filter((command) => commandMatchesRequirement(command, requirement)).length >=
        (requirement.count ?? 1),
    );
    const requiredGoalIds = step.requiredGoalIds ?? [];
    const draftComplete = snippetsReady && forbiddenClear && commandsReady;
    const runComplete = requiredGoalIds.every((goalId) => goalStatusById.get(goalId));

    return {
      ...step,
      completed: draftComplete && runComplete,
      draftComplete,
      runComplete,
    };
  });
}

function getRequiredItemIds(level: CodeResearchLevel) {
  return level.items.filter((item) => item.required !== false).map((item) => item.id);
}

function goalCompletionMessage(level: CodeResearchLevel, state: CodeResearchRuntimeState) {
  const statuses = getCodeResearchGoalStatuses(level, state);
  const missing = statuses.filter((status) => !status.completed);
  if (!missing.length) return "";
  return `还差一步：${missing[0].label}`;
}

function failTip(level: CodeResearchLevel, key: string, fallback: string) {
  return level.failureTips[key] ?? fallback;
}

export function simulateCodeResearchLevel(level: CodeResearchLevel, code: string): CodeResearchResult {
  const compiled = compileCodeResearchCommands(code);
  const initialState = getInitialState(level);
  const frames: CodeResearchFrame[] = [{ state: cloneState(initialState), log: initialState.message, event: "start" }];
  const logs: string[] = [initialState.message];

  const complete = (state: CodeResearchRuntimeState, success: boolean, failedReason?: string): CodeResearchResult => {
    const goalStatuses = getCodeResearchGoalStatuses(level, state);
    const stars = success
      ? state.step <= level.parSteps
        ? 3
        : state.step <= level.parSteps + 4
          ? 2
          : 1
      : 0;
    return {
      success,
      failedReason,
      coaching: success ? level.mentor.success : failedReason ?? "观察地图，找出哪一步和目标不一致。",
      stars,
      steps: state.step,
      frames,
      logs,
      goalStatuses,
    };
  };

  if (compiled.error) {
    const failed = { ...initialState, failed: compiled.error, message: compiled.error, messageTone: "fail" as const };
    frames.push({ state: cloneState(failed), log: compiled.error, event: "fail" });
    logs.push(compiled.error);
    return complete(failed, false, compiled.error);
  }

  const terrainByKey = new Map(level.terrain.map((terrain) => [pointKey(terrain), terrain]));
  const doors = level.doors ?? [];
  const bridgeSpots = level.bridges ?? [];
  const switches = level.switches ?? [];
  let state = initialState;

  const pushFrame = (log: string, command: CodeResearchCommand, event: CodeResearchFrame["event"]) => {
    logs.push(log);
    frames.push({ state: cloneState(state), log, command: command.source, event });
  };

  const fail = (reason: string, command: CodeResearchCommand, key = "generic"): CodeResearchResult => {
    const coaching = failTip(level, key, reason);
    state = {
      ...state,
      failed: reason,
      message: `${reason} ${coaching}`,
      messageTone: "fail",
      activeCommand: command.source,
    };
    pushFrame(state.message, command, "fail");
    return complete(state, false, state.message);
  };

  for (let index = 0; index < compiled.commands.length; index += 1) {
    const command = compiled.commands[index];
    const nextStep = index + 1;
    let log = `第 ${nextStep} 步：${command.source}`;

    if (command.type === "move") {
      const next = pointInDirection(state.hero, command.direction);
      const terrain = terrainByKey.get(pointKey(next));
      const closedDoor = doors.find((door) => samePoint(door, next) && !state.openedDoorIds.includes(door.id));
      const blockingEnemy = level.enemies.find((enemy) => samePoint(enemy, next) && !state.defeatedEnemyIds.includes(enemy.id));
      const bridgeSpot = bridgeSpots.find((spot) => samePoint(spot, next));
      const waterWithoutBridge = terrain?.kind === "water" && !bridgeSpot;
      const waterBridgeMissing = terrain?.kind === "water" && bridgeSpot && !state.builtBridgeIds.includes(bridgeSpot.id);

      if (next.x < 0 || next.x >= level.width || next.y < 0 || next.y >= level.height) {
        return fail("撞到地图边界。", command, "boundary");
      }
      if (terrain?.kind === "wall") {
        return fail(`前面是 ${terrain.label}，不能穿墙。`, command, "wall");
      }
      if (terrain?.kind === "hazard") {
        return fail(`踩到 ${terrain.label}。`, command, "hazard");
      }
      if (waterWithoutBridge || waterBridgeMissing) {
        return fail("前面是断桥水域，还不能直接通过。", command, "water");
      }
      if (closedDoor) {
        return fail(`${closedDoor.label} 还关着。`, command, "door");
      }
      if (blockingEnemy) {
        return fail(`${blockingEnemy.label} 挡住了路。`, command, "enemy");
      }

      state = {
        ...state,
        hero: next,
        message: `向${directionName[command.direction]}移动一格。`,
        messageTone: "info",
        activeCommand: command.source,
        step: nextStep,
      };
      log = `向${directionName[command.direction]}移动到 (${next.x + 1}, ${next.y + 1})`;
      pushFrame(log, command, "move");
    }

    if (command.type === "collect") {
      const item = level.items.find((candidate) => samePoint(candidate, state.hero) && !state.collectedItemIds.includes(candidate.id));
      if (!item) {
        return fail("这里没有可收集的物品。", command, "collect");
      }
      state = {
        ...state,
        collectedItemIds: [...state.collectedItemIds, item.id],
        message: `收集：${item.label}`,
        messageTone: "success",
        activeCommand: command.source,
        step: nextStep,
      };
      pushFrame(`收集：${item.label}`, command, "collect");
    }

    if (command.type === "attack") {
      const enemy = level.enemies.find(
        (candidate) => isAdjacent(candidate, state.hero) && !state.defeatedEnemyIds.includes(candidate.id),
      );
      if (!enemy) {
        return fail("攻击落空。必须站在敌人上下左右相邻格。", command, "attack");
      }
      state = {
        ...state,
        defeatedEnemyIds: [...state.defeatedEnemyIds, enemy.id],
        message: `击退：${enemy.label}`,
        messageTone: "success",
        activeCommand: command.source,
        step: nextStep,
      };
      pushFrame(`击退：${enemy.label}`, command, "attack");
    }

    if (command.type === "openDoor") {
      const door = doors.find((candidate) => isAdjacent(candidate, state.hero) && !state.openedDoorIds.includes(candidate.id));
      if (!door) {
        return fail("附近没有可以打开的门。", command, "door");
      }
      if (door.requiresItemId && !state.collectedItemIds.includes(door.requiresItemId)) {
        const key = level.items.find((item) => item.id === door.requiresItemId);
        return fail(`需要先拿到 ${key?.label ?? "钥匙"}。`, command, "doorKey");
      }
      state = {
        ...state,
        openedDoorIds: [...state.openedDoorIds, door.id],
        message: `${door.label} 打开了。`,
        messageTone: "success",
        activeCommand: command.source,
        step: nextStep,
      };
      pushFrame(`${door.label} 打开了`, command, "openDoor");
    }

    if (command.type === "buildBridge") {
      const candidates = command.direction
        ? [pointInDirection(state.hero, command.direction)]
        : [
            pointInDirection(state.hero, "up"),
            pointInDirection(state.hero, "down"),
            pointInDirection(state.hero, "left"),
            pointInDirection(state.hero, "right"),
          ];
      const bridge = bridgeSpots.find(
        (spot) => candidates.some((candidate) => samePoint(candidate, spot)) && !state.builtBridgeIds.includes(spot.id),
      );
      if (!bridge) {
        return fail("附近没有需要修复的断桥。", command, "bridge");
      }
      if (bridge.requiresItemId && !state.collectedItemIds.includes(bridge.requiresItemId)) {
        const item = level.items.find((candidate) => candidate.id === bridge.requiresItemId);
        return fail(`需要先收集 ${item?.label ?? "木板"} 才能修桥。`, command, "bridgeItem");
      }
      state = {
        ...state,
        builtBridgeIds: [...state.builtBridgeIds, bridge.id],
        message: `${bridge.label} 修好了，可以通过。`,
        messageTone: "success",
        activeCommand: command.source,
        step: nextStep,
      };
      pushFrame(`${bridge.label} 修好了`, command, "buildBridge");
    }

    if (command.type === "stepOnSwitch") {
      const switchTile = switches.find((candidate) => samePoint(candidate, state.hero) && !state.activatedSwitchIds.includes(candidate.id));
      if (!switchTile) {
        return fail("这里没有未触发的机关踏板。", command, "switch");
      }
      const nextOpenedDoorIds = switchTile.opensDoorId
        ? Array.from(new Set([...state.openedDoorIds, switchTile.opensDoorId]))
        : state.openedDoorIds;
      state = {
        ...state,
        activatedSwitchIds: [...state.activatedSwitchIds, switchTile.id],
        openedDoorIds: nextOpenedDoorIds,
        message: `${switchTile.label} 被点亮，远处传来石门移动的声音。`,
        messageTone: "success",
        activeCommand: command.source,
        step: nextStep,
      };
      pushFrame(`${switchTile.label} 被点亮`, command, "switch");
    }

    if (command.type === "scan") {
      state = {
        ...state,
        scanned: true,
        message: "扫描完成：高亮陷阱、敌人和出口，先观察再写代码。",
        messageTone: "hint",
        activeCommand: command.source,
        step: nextStep,
      };
      pushFrame("扫描地图，标记危险区域", command, "scan");
    }

    if (command.type === "wait") {
      state = {
        ...state,
        message: "等待一拍，确认巡逻路线。",
        messageTone: "info",
        activeCommand: command.source,
        step: nextStep,
      };
      pushFrame("等待一拍", command, "wait");
    }

    if (command.type === "say") {
      state = {
        ...state,
        saidMessages: [...state.saidMessages, command.text],
        message: `英雄说：“${command.text}”`,
        messageTone: "info",
        activeCommand: command.source,
        step: nextStep,
      };
      pushFrame(`英雄说：“${command.text}”`, command, "say");
    }
  }

  const missingRequiredItems = getRequiredItemIds(level).filter((id) => !state.collectedItemIds.includes(id));
  if (missingRequiredItems.length) {
    const item = level.items.find((candidate) => candidate.id === missingRequiredItems[0]);
    const syntheticCommand = compiled.commands[compiled.commands.length - 1] ?? {
      type: "wait" as const,
      source: "运行结束",
      line: 0,
    };
    return fail(`代码运行完了，但还没有收集 ${item?.label ?? "任务物品"}。`, syntheticCommand, "missingItem");
  }

  const missingGoal = goalCompletionMessage(level, state);
  if (missingGoal) {
    const syntheticCommand = compiled.commands[compiled.commands.length - 1] ?? {
      type: "wait" as const,
      source: "运行结束",
      line: 0,
    };
    return fail(`代码运行完了，${missingGoal}。`, syntheticCommand, "missingGoal");
  }

  state = {
    ...state,
    success: true,
    message: "挑战完成：出口已打开，任务目标全部达成。",
    messageTone: "success",
  };
  frames.push({ state: cloneState(state), log: state.message, event: "success" });
  logs.push(state.message);

  return complete(state, true);
}

export const codeResearchLevels: CodeResearchLevel[] = [
  {
    id: "shadow-cell-1",
    title: "暗影地牢 1",
    subtitle: "用顺序命令拿到星火水晶",
    description: "学习顺序执行。每一行命令都会让英雄行动一步，先拿水晶，再抵达出口。",
    mapTitle: "暗影地牢",
    difficulty: "入门",
    biome: "dungeon",
    concepts: ["顺序执行", "移动命令", "收集目标"],
    toolbox: ["hero.moveRight()", "hero.collect()", "hero.say(\"准备好了\")"],
    task: {
      mode: "fill_blanks",
      title: "补全代码",
      summary: "先补齐缺失命令，让英雄先拿到水晶，再继续向右抵达出口。",
      checklist: ["向右走到水晶格", "执行 collect 收集水晶", "继续向右走到出口"],
      requireCodeChange: true,
    },
    tutorialSteps: [
      {
        id: "reach-crystal",
        title: "步骤 1：走到水晶格",
        instruction: "先把缺失的移动补上，让英雄恰好走到星火水晶所在格子。",
        coach: "先数格子。英雄起点在最左侧中线，水晶在右侧第二格。",
        success: "已经具备走到水晶格的路线，可以准备收集。",
        requiredSnippets: [{ snippet: "hero.moveRight()", count: 2 }],
        requiredCommands: [{ type: "move", direction: "right", count: 2 }],
      },
      {
        id: "collect-crystal",
        title: "步骤 2：收集星火水晶",
        instruction: "英雄站在水晶格之后，立刻追加 hero.collect()。",
        coach: "collect 不会自动移动，必须先站对位置再执行。",
        success: "收集动作已经写进代码，运行时就会拿到任务物品。",
        requiredSnippets: [{ snippet: "hero.collect()" }],
        requiredCommands: [{ type: "collect" }],
        requiredGoalIds: ["g1"],
      },
      {
        id: "reach-exit",
        title: "步骤 3：抵达出口",
        instruction: "收集后继续补足向右移动，直到英雄走到最右侧出口。",
        coach: "先收集，再赶路。不要把 collect 写到出口之后。",
        success: "整条顺序路线已经完整，运行后应能直接过关。",
        requiredSnippets: [{ snippet: "hero.moveRight()", count: 6 }],
        requiredCommands: [{ type: "move", direction: "right", count: 6 }],
        requiredGoalIds: ["g1", "g2"],
      },
    ],
    mentor: {
      name: "导师林恩",
      avatar: "🧙",
      intro: "观察水晶的位置。代码会从上到下执行，先移动到水晶格，再 collect。",
      success: "很好。你已经掌握了最基础的“顺序执行”。",
    },
    scene: {
      theme: "dungeonScene",
      background: "/code-research/calciumtrice-dungeon/scene-training-hall-v2.png",
      sourceWidth: 1600,
      sourceHeight: 900,
      grid: { left: 214, top: 506, width: 1104, height: 0 },
      tokenScale: 1.36,
    },
    mapPosition: { left: 48, top: 30, size: "large" },
    width: 7,
    height: 5,
    terrain: [
      { id: "wall-a", kind: "wall", label: "碎石墙", x: 3, y: 0 },
      { id: "wall-b", kind: "wall", label: "碎石墙", x: 3, y: 1 },
      { id: "rune-a", kind: "rune", label: "发光符文", x: 1, y: 1 },
      { id: "decor-a", kind: "decor", label: "火把", x: 5, y: 1 },
    ],
    heroStart: { x: 0, y: 2 },
    exit: { x: 6, y: 2 },
    items: [{ id: "spark", kind: "crystal", label: "星火水晶", x: 2, y: 2 }],
    enemies: [],
    starterCode: `# 任务：补全缺失命令
hero.moveRight()
# TODO: 再向右移动到水晶
# TODO: 收集星火水晶
# TODO: 继续向右走到出口`,
    solution: `hero.moveRight()
hero.moveRight()
hero.collect()
hero.moveRight()
hero.moveRight()
hero.moveRight()
hero.moveRight()`,
    goals: [
      { id: "g1", kind: "collect", targetId: "spark", label: "收集星火水晶" },
      { id: "g2", kind: "exit", label: "抵达右侧出口" },
    ],
    hints: [
      "英雄从左侧中间开始。",
      "先向右走两步到水晶格。",
      "站在水晶格上使用 hero.collect()，再继续向右到出口。",
    ],
    briefing: [
      "观察英雄、水晶、出口在同一条横线上的位置。",
      "写两行 moveRight 让英雄站到水晶格。",
      "执行 collect 收集水晶，再连续向右抵达出口。",
    ],
    failureTips: {
      collect: "收集命令必须站在物品所在格子上执行。",
      missingItem: "先完成收集，再去出口。",
      boundary: "数一数格子，不要让英雄走出棋盘。",
    },
    parSteps: 7,
    xpReward: 30,
    coinReward: 8,
  },
  {
    id: "bone-patrol-2",
    title: "骸骨巡逻",
    subtitle: "站在相邻格攻击守卫",
    description: "敌人会挡住通道。先走到它旁边，使用 hero.attack() 清路，再拿钥匙离开。",
    mapTitle: "暗影地牢",
    difficulty: "基础",
    biome: "dungeon",
    concepts: ["相邻判断", "攻击命令", "路径规划"],
    toolbox: ["hero.moveRight()", "hero.attack()", "hero.collect()"],
    task: {
      mode: "fix_bug",
      title: "修复错误顺序",
      summary: "当前代码在靠近守卫前就提前攻击了。把顺序修正后，再拿钥匙出门。",
      checklist: ["先站到守卫左边", "再执行 attack", "收集钥匙并抵达出口"],
      requireCodeChange: true,
    },
    tutorialSteps: [
      {
        id: "approach-guard",
        title: "步骤 1：先贴近守卫",
        instruction: "把攻击前的移动补足，确保英雄站在守卫左边一格。",
        coach: "attack 不是远程技能，先靠近再出手。",
        success: "接敌位置已经正确，下一步可以安全攻击。",
        requiredSnippets: [{ snippet: "hero.moveRight()", count: 2 }],
        requiredCommands: [{ type: "move", direction: "right", count: 2 }],
      },
      {
        id: "attack-guard",
        title: "步骤 2：击退守卫",
        instruction: "确认 hero.attack() 出现在第二次移动之后，再处理敌人。",
        coach: "如果攻击过早，运行时会提示攻击落空。",
        success: "敌人处理顺序已经合理，通道会被清开。",
        requiredSnippets: [{ snippet: "hero.attack()" }],
        requiredCommands: [{ type: "attack" }],
        requiredGoalIds: ["g1"],
      },
      {
        id: "finish-patrol",
        title: "步骤 3：拿钥匙并撤离",
        instruction: "守卫消失后继续向右，收集铜钥匙，再走到出口。",
        coach: "这一关要同时完成战斗、收集和撤离三个目标。",
        success: "路径已经覆盖全部目标，运行成功后就会完成整关。",
        requiredSnippets: [
          { snippet: "hero.collect()" },
          { snippet: "hero.moveRight()", count: 7 },
        ],
        requiredCommands: [
          { type: "collect" },
          { type: "move", direction: "right", count: 7 },
        ],
        requiredGoalIds: ["g1", "g2", "g3"],
      },
    ],
    mentor: {
      name: "导师林恩",
      avatar: "🛡️",
      intro: "不要直接撞上守卫。攻击必须在上下左右相邻格执行。",
      success: "你把路径拆成了“接近、处理障碍、继续前进”，这是编程闯关的核心思路。",
    },
    scene: {
      theme: "dungeonScene",
      background: "/code-research/calciumtrice-dungeon/scene-guard-corridor-v2.png",
      sourceWidth: 1600,
      sourceHeight: 900,
      grid: { left: 200, top: 506, width: 1180, height: 0 },
      tokenScale: 1.36,
    },
    mapPosition: { left: 30, top: 62 },
    width: 8,
    height: 5,
    terrain: [
      { id: "wall-a", kind: "wall", label: "石墙", x: 2, y: 0 },
      { id: "wall-b", kind: "wall", label: "石墙", x: 2, y: 1 },
      { id: "wall-c", kind: "wall", label: "石墙", x: 2, y: 3 },
      { id: "wall-d", kind: "wall", label: "石墙", x: 2, y: 4 },
      { id: "decor-a", kind: "decor", label: "旗帜", x: 5, y: 1 },
    ],
    heroStart: { x: 0, y: 2 },
    exit: { x: 7, y: 2 },
    items: [{ id: "bronze-key", kind: "key", label: "铜钥匙", x: 4, y: 2 }],
    enemies: [{ id: "guard", label: "骸骨守卫", kind: "guard", hp: 1, x: 3, y: 2 }],
    starterCode: `# 任务：修正错误顺序
hero.moveRight()
hero.attack()
hero.moveRight()
hero.moveRight()
hero.collect()
hero.moveRight()
hero.moveRight()
hero.moveRight()`,
    solution: `hero.moveRight()
hero.moveRight()
hero.attack()
hero.moveRight()
hero.moveRight()
hero.collect()
hero.moveRight()
hero.moveRight()
hero.moveRight()`,
    goals: [
      { id: "g1", kind: "defeat", targetId: "guard", label: "击退骸骨守卫" },
      { id: "g2", kind: "collect", targetId: "bronze-key", label: "收集铜钥匙" },
      { id: "g3", kind: "exit", label: "抵达出口" },
    ],
    hints: ["先到守卫左边。", "hero.attack() 不会移动英雄，只会处理相邻敌人。", "守卫消失后继续向右拿钥匙。"],
    briefing: [
      "先走到骸骨守卫左侧，保持和敌人相邻。",
      "使用 attack 清掉挡路敌人，不要走进敌人格。",
      "继续前进收集钥匙，最后走到右侧出口。",
    ],
    failureTips: {
      enemy: "先在守卫旁边用 hero.attack()，不要直接走进守卫格。",
      attack: "攻击范围只有上下左右一格。",
      missingGoal: "敌人、钥匙、出口三个目标都要完成。",
    },
    parSteps: 9,
    xpReward: 45,
    coinReward: 12,
  },
  {
    id: "echo-loop-3",
    title: "回声长廊",
    subtitle: "用 repeat 简化重复移动",
    description: "重复动作连续出现时，可以用 Python 的 for ... in range(...) 让代码更短、更清楚。",
    mapTitle: "暗影地牢",
    difficulty: "基础",
    biome: "dungeon",
    concepts: ["repeat 循环", "重复移动", "代码简化"],
    toolbox: ["for _ in range(4):", "hero.move_right()", "hero.collect()"],
    task: {
      mode: "fill_blanks",
      title: "补全循环体",
      summary: "这一关重点不是多写 moveRight，而是把循环体补完整，再在正确的位置 collect。",
      checklist: ["第一个 repeat 中向右移动", "到卷轴格 collect", "第二个 repeat 穿过长廊"],
      requireCodeChange: true,
    },
    tutorialSteps: [
      {
        id: "fill-first-loop",
        title: "步骤 1：补全第一段循环",
        instruction: "先在第一个 repeat 里写 hero.moveRight()，让英雄自动连走 4 步。",
        coach: "循环体只要写一次，repeat 会帮你重复执行。",
        success: "第一段长距离移动已经压缩进循环里。",
        requiredSnippets: [{ snippet: "for _ in range(4):\n    hero.move_right()" }],
        requiredCommands: [{ type: "move", direction: "right", count: 4 }],
      },
      {
        id: "collect-loop-scroll",
        title: "步骤 2：在中点收集卷轴",
        instruction: "循环结束后补上 hero.collect()，在长廊中点拿到卷轴。",
        coach: "如果先写第二个循环，英雄会直接越过卷轴格。",
        success: "卷轴收集动作已经写好，运行后会在中点停下拿取。",
        requiredSnippets: [{ snippet: "hero.collect()" }],
        requiredCommands: [{ type: "collect" }],
        requiredGoalIds: ["g1"],
      },
      {
        id: "fill-second-loop",
        title: "步骤 3：补全第二段循环并通关",
        instruction: "在第二个 repeat 中继续向右移动 4 次，穿过整条长廊。",
        coach: "两段 repeat 之间夹一个 collect，就是这一关最重要的结构。",
        success: "循环结构完整，路线精简且可读。",
        requiredSnippets: [
          { snippet: "for _ in range(4):\n    hero.move_right()", count: 2 },
          { snippet: "hero.collect()" },
        ],
        requiredCommands: [{ type: "move", direction: "right", count: 8 }],
        requiredGoalIds: ["g1", "g2"],
      },
    ],
    mentor: {
      name: "导师林恩",
      avatar: "📜",
      intro: "这条长廊看起来很长，但逻辑很短：重复向右走。",
      success: "循环让重复动作变得可读。之后更复杂的关卡也会用这个思想。",
    },
    scene: {
      theme: "dungeonScene",
      background: "/code-research/calciumtrice-dungeon/scene-loop-gallery-v2.png",
      sourceWidth: 1600,
      sourceHeight: 900,
      grid: { left: 200, top: 506, width: 1216, height: 0 },
      tokenScale: 1.34,
    },
    mapPosition: { left: 68, top: 60 },
    width: 9,
    height: 5,
    terrain: [
      { id: "wall-a", kind: "wall", label: "塌方石块", x: 1, y: 1 },
      { id: "wall-b", kind: "wall", label: "塌方石块", x: 2, y: 1 },
      { id: "wall-c", kind: "wall", label: "塌方石块", x: 6, y: 3 },
      { id: "hazard-a", kind: "hazard", label: "暗影陷阱", x: 4, y: 1 },
      { id: "hazard-b", kind: "hazard", label: "暗影陷阱", x: 4, y: 3 },
    ],
    heroStart: { x: 0, y: 2 },
    exit: { x: 8, y: 2 },
    items: [{ id: "loop-scroll", kind: "scroll", label: "循环卷轴", x: 4, y: 2 }],
    enemies: [],
    starterCode: `# 任务：把循环补完整
repeat(4) {
  # TODO: 在循环里向右移动
}
# TODO: 收集循环卷轴
repeat(4) {
  # TODO: 继续向右穿过长廊
}`,
    solution: `for _ in range(4):
    hero.move_right()
hero.collect()
for _ in range(4):
    hero.move_right()`,
    goals: [
      { id: "g1", kind: "collect", targetId: "loop-scroll", label: "收集循环卷轴" },
      { id: "g2", kind: "exit", label: "穿过回声长廊" },
    ],
    hints: ["中间横向通道是安全的。", "repeat(4) 可以连续执行 4 次向右。", "上下的暗影陷阱不要踩。"],
    briefing: [
      "确认安全路线是中间一行，陷阱只在上下两侧。",
      "用 repeat(4) 代替四次重复的 moveRight。",
      "到卷轴格 collect，再用第二个 repeat 穿过长廊。",
    ],
    failureTips: {
      hazard: "陷阱在长廊上下两侧，保持在中间那一行。",
      missingItem: "走到卷轴格后别忘了 collect。",
    },
    parSteps: 9,
    xpReward: 55,
    coinReward: 16,
  },
  {
    id: "locked-gate-4",
    title: "青铜门",
    subtitle: "收集钥匙后打开门",
    description: "有些障碍不能靠移动穿过。先拿钥匙，站在门旁边执行 hero.openDoor()。",
    mapTitle: "机关地牢",
    difficulty: "进阶",
    biome: "dungeon",
    concepts: ["钥匙与门", "相邻交互", "状态变化"],
    toolbox: ["hero.collect()", "hero.openDoor()", "hero.move(\"right\")"],
    task: {
      mode: "guided_build",
      title: "补全开门流程",
      summary: "先拿钥匙，再站到门旁边开门。现在 starter code 只搭了骨架，需要你补齐关键动作。",
      checklist: ["收集青铜门钥匙", "在门旁边 openDoor", "继续向右到出口"],
      requireCodeChange: true,
    },
    tutorialSteps: [
      {
        id: "collect-gate-key",
        title: "步骤 1：先收集钥匙",
        instruction: "第一步就要把 hero.collect() 补在拿到钥匙的位置。",
        coach: "这把钥匙是后面 openDoor 的前置条件，漏掉就一定过不去。",
        success: "钥匙前置条件已经满足，可以准备靠近门。",
        requiredSnippets: [{ snippet: "hero.collect()" }],
        requiredCommands: [{ type: "collect" }],
        requiredGoalIds: ["g1"],
      },
      {
        id: "open-bronze-door",
        title: "步骤 2：站在门边开门",
        instruction: "走到青铜门左侧后，补上 hero.openDoor()，不要直接撞门。",
        coach: "开门是相邻交互，不是走进门格。",
        success: "门的状态切换逻辑已经写对，运行时会打开通道。",
        requiredSnippets: [{ snippet: "hero.openDoor()" }],
        requiredCommands: [{ type: "openDoor" }],
        requiredGoalIds: ["g1", "g2"],
      },
      {
        id: "walk-through-gate",
        title: "步骤 3：穿门撤离",
        instruction: "门打开之后继续向右补全剩余路径，直到抵达出口。",
        coach: "开门之后还要继续推进，不要停在门口。",
        success: "整套钥匙-开门-通过的流程已经完整。",
        requiredSnippets: [{ snippet: "hero.moveRight()", count: 7 }],
        requiredCommands: [{ type: "move", direction: "right", count: 7 }],
        requiredGoalIds: ["g1", "g2", "g3"],
      },
    ],
    mentor: {
      name: "机关师阿洛",
      avatar: "🔑",
      intro: "门是一个状态：关着时会挡路，打开后就能通过。",
      success: "你已经能用代码改变关卡状态了。",
    },
    scene: {
      theme: "dungeonScene",
      background: "/code-research/calciumtrice-dungeon/scene-bronze-gate-v2.png",
      sourceWidth: 1600,
      sourceHeight: 900,
      grid: { left: 214, top: 572, width: 1108, height: 0 },
      tokenScale: 1.3,
    },
    mapPosition: { left: 48, top: 78 },
    width: 8,
    height: 6,
    terrain: [
      { id: "wall-a", kind: "wall", label: "厚石墙", x: 3, y: 0 },
      { id: "wall-b", kind: "wall", label: "厚石墙", x: 3, y: 1 },
      { id: "wall-c", kind: "wall", label: "厚石墙", x: 3, y: 4 },
      { id: "wall-d", kind: "wall", label: "厚石墙", x: 3, y: 5 },
      { id: "rune-a", kind: "rune", label: "门纹符文", x: 2, y: 2 },
    ],
    doors: [{ id: "bronze-door", label: "青铜门", requiresItemId: "gate-key", x: 3, y: 3 }],
    heroStart: { x: 0, y: 3 },
    exit: { x: 7, y: 3 },
    items: [{ id: "gate-key", kind: "key", label: "青铜门钥匙", x: 1, y: 3 }],
    enemies: [],
    starterCode: `# 任务：补全开门流程
hero.moveRight()
# TODO: 收集钥匙
hero.moveRight()
# TODO: 打开青铜门
hero.moveRight()
# TODO: 补上剩余移动，到达出口`,
    solution: `hero.moveRight()
hero.collect()
hero.moveRight()
hero.openDoor()
hero.moveRight()
hero.moveRight()
hero.moveRight()
hero.moveRight()
hero.moveRight()`,
    goals: [
      { id: "g1", kind: "collect", targetId: "gate-key", label: "收集青铜门钥匙" },
      { id: "g2", kind: "openDoor", targetId: "bronze-door", label: "打开青铜门" },
      { id: "g3", kind: "exit", label: "穿过门到达出口" },
    ],
    hints: ["openDoor 必须站在门的旁边。", "先收集钥匙，再靠近门。", "门打开后再 moveRight 进入门后的通道。"],
    briefing: [
      "第一步先拿起青铜门钥匙。",
      "走到青铜门左边一格时执行 openDoor。",
      "门打开后继续向右穿过原本被锁住的位置。",
    ],
    failureTips: {
      door: "门挡路时，不要 move 进去；先站在旁边 openDoor。",
      doorKey: "钥匙在起点右边一格，先 collect。",
    },
    parSteps: 9,
    xpReward: 70,
    coinReward: 20,
  },
  {
    id: "bridge-river-5",
    title: "断桥河谷",
    subtitle: "用木板修复断桥",
    description: "水域不能直接通过。收集木板后，对相邻断桥格使用 hero.buildBridge(\"right\")。",
    mapTitle: "河谷营地",
    difficulty: "进阶",
    biome: "river",
    concepts: ["资源前置条件", "方向参数", "环境改造"],
    toolbox: ["hero.build_bridge(\"right\")", "hero.collect()", "hero.move_right()"],
    task: {
      mode: "guided_build",
      title: "搭建修桥脚本",
      summary: "先拿到木板，再站到断桥左边修桥。你需要按步骤补完整个流程。",
      checklist: ["向右拿木板", "站到断桥左侧 buildBridge", "穿过桥面到出口"],
      requireCodeChange: true,
    },
    tutorialSteps: [
      {
        id: "g5-step-1",
        title: "步骤 1：先备料",
        instruction: "先向右推进到木板格并执行 collect。",
        coach: "材料不到位时，build_bridge 一定会失败。",
        success: "木板收集完成。",
        requiredGoalIds: ["g1"],
      },
      {
        id: "g5-step-2",
        title: "步骤 2：修复断桥",
        instruction: "站到断桥左侧后执行 build_bridge(\"right\")。",
        coach: "修桥命令需要方向参数和相邻站位。",
        success: "断桥修复完成。",
        requiredSnippets: [{ snippet: "hero.build_bridge(\"right\")" }],
        requiredGoalIds: ["g2"],
      },
      {
        id: "g5-step-3",
        title: "步骤 3：通过桥面撤离",
        instruction: "桥修好后继续向右通过河谷并抵达出口。",
        coach: "先修桥再过桥，不要直接踩水域。",
        success: "断桥河谷通关。",
        requiredGoalIds: ["g3"],
      },
    ],
    mentor: {
      name: "营地伙伴米娅",
      avatar: "🪵",
      intro: "这关不是绕路，而是先准备材料，再改变地图。",
      success: "你学会了让代码修复环境，这会在后面的机关关卡里继续出现。",
    },
    scene: {
      theme: "dungeonScene",
      background: "/code-research/calciumtrice-dungeon/scene-river-crossing-v1.png",
      sourceWidth: 1600,
      sourceHeight: 900,
      grid: { left: 270, top: 248, width: 1000, height: 412 },
      tokenScale: 1.14,
    },
    mapPosition: { left: 76, top: 36 },
    width: 8,
    height: 6,
    terrain: [
      { id: "water-a", kind: "water", label: "急流", x: 4, y: 1 },
      { id: "water-b", kind: "water", label: "急流", x: 4, y: 2 },
      { id: "water-c", kind: "water", label: "急流", x: 4, y: 3 },
      { id: "water-d", kind: "water", label: "急流", x: 4, y: 4 },
      { id: "wall-a", kind: "wall", label: "树根墙", x: 2, y: 1 },
      { id: "wall-b", kind: "wall", label: "树根墙", x: 2, y: 4 },
    ],
    bridges: [{ id: "river-bridge", label: "河谷断桥", requiresItemId: "plank", x: 4, y: 3 }],
    heroStart: { x: 0, y: 3 },
    exit: { x: 7, y: 3 },
    items: [
      { id: "plank", kind: "plank", label: "结实木板", x: 2, y: 3 },
      { id: "camp-coin", kind: "coin", label: "营地金币", x: 6, y: 2, required: false },
    ],
    enemies: [],
    starterCode: `# 任务：先备料，再修桥
hero.moveRight()
# TODO: 再向右走到木板
# TODO: collect 木板
# TODO: 站到断桥左边并修桥
# TODO: 穿过河谷到出口`,
    solution: `hero.moveRight()
hero.moveRight()
hero.collect()
hero.moveRight()
hero.buildBridge("right")
hero.moveRight()
hero.moveRight()
hero.moveRight()
hero.moveRight()`,
    goals: [
      { id: "g1", kind: "collect", targetId: "plank", label: "收集结实木板" },
      { id: "g2", kind: "buildBridge", targetId: "river-bridge", label: "修复河谷断桥" },
      { id: "g3", kind: "exit", label: "通过断桥到达出口" },
    ],
    hints: ["木板在英雄右边两格。", "站在断桥左边，对右侧水格 buildBridge。", "buildBridge 后水格会变成可走的桥。"],
    briefing: [
      "先收集木板，因为修桥需要材料。",
      "站到断桥左侧，对右边的水格 buildBridge(\"right\")。",
      "桥修好后再移动通过河谷，不要直接踩水。",
    ],
    failureTips: {
      water: "水域需要先 buildBridge，不能直接 move 过去。",
      bridgeItem: "修桥前先 collect 木板。",
      bridge: "确认英雄站在断桥相邻格，再指定方向。",
    },
    parSteps: 9,
    xpReward: 85,
    coinReward: 24,
  },
  {
    id: "rune-switch-6",
    title: "符文机关",
    subtitle: "踩下开关打开远处石门",
    description: "机关踏板会改变远处门的状态。走到踏板上执行 hero.stepOnSwitch()。",
    mapTitle: "机关地牢",
    difficulty: "挑战",
    biome: "ruins",
    concepts: ["机关触发", "远程状态", "路线拆分"],
    toolbox: ["hero.step_on_switch()", "hero.open_door()", "hero.move_up()"],
    task: {
      mode: "guided_build",
      title: "补全机关路线",
      summary: "先拿卷轴，再踩踏板，最后回到主路穿过石门。代码还差关键几步。",
      checklist: ["向上走到踏板", "执行 stepOnSwitch", "回到主路后穿门到出口"],
      requireCodeChange: true,
    },
    tutorialSteps: [
      {
        id: "g6-step-1",
        title: "步骤 1：卷轴与踏板站位",
        instruction: "先收集卷轴，再上移到日轮踏板格。",
        coach: "踏板必须站上去，隔格无法触发。",
        success: "踏板站位完成。",
        requiredGoalIds: ["g1"],
      },
      {
        id: "g6-step-2",
        title: "步骤 2：触发机关开门",
        instruction: "在踏板格执行 step_on_switch，打开远处符文石门。",
        coach: "先触发机关，再谈开门与撤离。",
        success: "机关触发完成。",
        requiredSnippets: [{ snippet: "hero.step_on_switch()" }],
        requiredGoalIds: ["g2", "g3"],
      },
      {
        id: "g6-step-3",
        title: "步骤 3：回主路穿门",
        instruction: "回到主路后继续向右，穿过已打开的石门抵达出口。",
        coach: "确认门状态已打开，再推进到出口。",
        success: "符文机关通关。",
        requiredGoalIds: ["g4"],
      },
    ],
    mentor: {
      name: "机关师阿洛",
      avatar: "⚙️",
      intro: "先去踩踏板，不然终点前的石门不会开。",
      success: "你已经能处理“一个动作影响另一个位置”的逻辑了。",
    },
    scene: {
      theme: "dungeonScene",
      background: "/code-research/calciumtrice-dungeon/scene-switch-sanctum-v1.png",
      sourceWidth: 1600,
      sourceHeight: 900,
      grid: { left: 274, top: 226, width: 986, height: 444 },
      tokenScale: 1.16,
    },
    mapPosition: { left: 22, top: 38 },
    width: 8,
    height: 6,
    terrain: [
      { id: "wall-a", kind: "wall", label: "残墙", x: 3, y: 0 },
      { id: "wall-b", kind: "wall", label: "残墙", x: 3, y: 1 },
      { id: "wall-c", kind: "wall", label: "残墙", x: 3, y: 3 },
      { id: "wall-d", kind: "wall", label: "残墙", x: 5, y: 4 },
      { id: "hazard-a", kind: "hazard", label: "毒雾", x: 2, y: 4 },
    ],
    doors: [{ id: "rune-door", label: "符文石门", x: 6, y: 2 }],
    switches: [{ id: "sun-switch", label: "日轮踏板", opensDoorId: "rune-door", x: 1, y: 1 }],
    heroStart: { x: 0, y: 2 },
    exit: { x: 7, y: 2 },
    items: [{ id: "rune-scroll", kind: "scroll", label: "机关说明卷轴", x: 1, y: 2 }],
    enemies: [],
    starterCode: `# 任务：补全机关路线
hero.moveRight()
hero.collect()
# TODO: 向上走到踏板
# TODO: 触发机关
# TODO: 回到主路并穿过石门`,
    solution: `hero.moveRight()
hero.collect()
hero.moveUp()
hero.stepOnSwitch()
hero.moveDown()
repeat(5) {
  hero.moveRight()
}
hero.moveRight()`,
    goals: [
      { id: "g1", kind: "collect", targetId: "rune-scroll", label: "收集机关说明卷轴" },
      { id: "g2", kind: "activateSwitch", targetId: "sun-switch", label: "踩亮日轮踏板" },
      { id: "g3", kind: "openDoor", targetId: "rune-door", label: "打开符文石门" },
      { id: "g4", kind: "exit", label: "通过符文石门" },
    ],
    hints: ["踏板在卷轴上方一格。", "stepOnSwitch 会把远处石门加入已打开状态。", "踩完踏板回到主路再向右。"],
    briefing: [
      "先收集卷轴，然后向上走到踏板。",
      "站在踏板上执行 stepOnSwitch，远处石门会打开。",
      "回到主路向右穿过打开后的石门。",
    ],
    failureTips: {
      switch: "必须站在踏板上才能 stepOnSwitch。",
      door: "远处石门需要先踩踏板。",
      hazard: "毒雾在下方，不要走到第 5 行。",
    },
    parSteps: 10,
    xpReward: 95,
    coinReward: 28,
  },
  {
    id: "scanner-ruins-7",
    title: "哨兵视野",
    subtitle: "先扫描，再规划安全路径",
    description: "复杂地图先 hero.scan()，让学生学会观察、再编码。",
    mapTitle: "网页废墟",
    difficulty: "挑战",
    biome: "ruins",
    concepts: ["观察调试", "安全路径", "组合命令"],
    toolbox: ["hero.scan_map()", "hero.wait_turn()", "hero.attack()", "hero.collect()"],
    task: {
      mode: "guided_build",
      title: "先观察，再写路径",
      summary: "这关不再给完整路线。先 scan，再自己补全拿两件资源、击退甲虫、抵达出口的脚本。",
      checklist: ["先 scan 标记危险区", "收集 HTML 石板和 CSS 星火", "击退甲虫并走到右上出口"],
      requireCodeChange: true,
    },
    tutorialSteps: [
      {
        id: "g7-step-1",
        title: "步骤 1：扫描与首个资源",
        instruction: "先 scan_map，再沿底线收集 HTML 石板。",
        coach: "先观察再行动，可以明显降低走错概率。",
        success: "扫描与首个资源完成。",
        requiredSnippets: [{ snippet: "hero.scan_map()" }],
        requiredGoalIds: ["g1", "g2"],
      },
      {
        id: "g7-step-2",
        title: "步骤 2：上移收集并清敌",
        instruction: "从右侧上移收集 CSS 星火，并在相邻格击退甲虫。",
        coach: "收集和战斗要在相邻正确位置执行。",
        success: "资源与战斗阶段完成。",
        requiredGoalIds: ["g3", "g4"],
      },
      {
        id: "g7-step-3",
        title: "步骤 3：高位撤离",
        instruction: "清障后继续向右上推进，抵达出口。",
        coach: "收尾前确认前置目标都已完成。",
        success: "哨兵视野通关。",
        requiredGoalIds: ["g5"],
      },
    ],
    mentor: {
      name: "调试员诺亚",
      avatar: "🔎",
      intro: "这关故意信息密度更高。先 scan，把危险区、敌人和出口标出来。",
      success: "先观察再行动，是调试复杂问题最稳定的方法。",
    },
    scene: {
      theme: "dungeonScene",
      background: "/code-research/calciumtrice-dungeon/scene-scan-ruins-v1.png",
      sourceWidth: 1600,
      sourceHeight: 900,
      grid: { left: 230, top: 214, width: 1120, height: 432 },
      tokenScale: 1.14,
    },
    mapPosition: { left: 63, top: 82 },
    width: 9,
    height: 6,
    terrain: [
      { id: "hazard-a", kind: "hazard", label: "裂隙", x: 3, y: 2 },
      { id: "hazard-b", kind: "hazard", label: "裂隙", x: 4, y: 2 },
      { id: "hazard-c", kind: "hazard", label: "裂隙", x: 4, y: 3 },
      { id: "wall-a", kind: "wall", label: "倒塌石柱", x: 1, y: 1 },
      { id: "wall-b", kind: "wall", label: "倒塌石柱", x: 6, y: 4 },
      { id: "rune-a", kind: "rune", label: "调试符文", x: 2, y: 4 },
    ],
    heroStart: { x: 0, y: 4 },
    exit: { x: 8, y: 1 },
    items: [
      { id: "html-scroll", kind: "scroll", label: "HTML 石板", x: 2, y: 4 },
      { id: "css-crystal", kind: "crystal", label: "CSS 星火", x: 5, y: 2 },
    ],
    enemies: [{ id: "bug", label: "漏洞甲虫", kind: "bug", hp: 1, x: 6, y: 2 }],
    starterCode: `# 任务：先 scan，再规划路径
hero.scan()
# TODO: 先沿底部拿到 HTML 石板
# TODO: 再从右侧向上拿 CSS 星火
# TODO: 击退甲虫并抵达出口`,
    solution: `hero.scan()
hero.moveRight()
hero.moveRight()
hero.collect()
hero.moveRight()
hero.moveRight()
hero.moveRight()
hero.moveUp()
hero.moveUp()
hero.collect()
hero.attack()
hero.moveRight()
hero.moveUp()
hero.moveRight()
hero.moveRight()`,
    goals: [
      { id: "g1", kind: "scan", label: "扫描地图危险区" },
      { id: "g2", kind: "collect", targetId: "html-scroll", label: "收集 HTML 石板" },
      { id: "g3", kind: "collect", targetId: "css-crystal", label: "收集 CSS 星火" },
      { id: "g4", kind: "defeat", targetId: "bug", label: "击退漏洞甲虫" },
      { id: "g5", kind: "exit", label: "抵达右上出口" },
    ],
    hints: ["先沿底部拿 HTML 石板。", "从右侧向上接近 CSS 星火和甲虫。", "甲虫在水晶右边，收集后站在相邻格 attack。"],
    briefing: [
      "第一行先 scan，把隐藏危险点全部标出来。",
      "沿底部安全路线收集 HTML 石板，再从右侧向上。",
      "拿到 CSS 星火后攻击相邻甲虫，最后去右上出口。",
    ],
    failureTips: {
      hazard: "scan 后红色裂隙都不能踩，路线要从下方绕过去。",
      enemy: "甲虫挡路时先 attack。",
      missingGoal: "这关要求 scan、两个收集、一个战斗和出口全部完成。",
    },
    parSteps: 15,
    xpReward: 110,
    coinReward: 34,
  },
  {
    id: "capstone-8",
    title: "终端圣殿",
    subtitle: "组合循环、门、桥、战斗和提示",
    description: "综合挑战：用更少代码完成收集、修桥、开门、战斗和出口目标。",
    mapTitle: "终端圣殿",
    difficulty: "挑战",
    biome: "ruins",
    concepts: ["综合规划", "多目标验证", "调试反馈"],
    toolbox: ["hero.scan_map()", "for _ in range(n):", "hero.build_bridge(\"down\")", "hero.open_door()", "hero.attack()"],
    task: {
      mode: "capstone",
      title: "综合编写完整解法",
      summary: "这一关只给目标顺序，不再给可运行模板。你需要自己把扫描、修桥、拿钥匙、战斗、开门和终点串起来。",
      checklist: ["scan 后先拿桥板并修桥", "拿钥匙并击退哨兵", "开门、拿终端水晶、抵达出口"],
      requireCodeChange: true,
    },
    tutorialSteps: [
      {
        id: "g8-step-1",
        title: "步骤 1：扫描与桥段",
        instruction: "先 scan_map，收集桥板并修复地下河断桥。",
        coach: "综合关第一步先把地形通路打通。",
        success: "桥段前置完成。",
        requiredSnippets: [{ snippet: "hero.scan_map()" }, { snippet: "hero.build_bridge(\"right\")" }],
        requiredGoalIds: ["g1", "g2", "g3"],
      },
      {
        id: "g8-step-2",
        title: "步骤 2：钥匙与门前战斗",
        instruction: "上移拿钥匙，回到门前击退哨兵并打开终端门。",
        coach: "门前顺序固定：key -> attack -> open_door。",
        success: "开门推进完成。",
        requiredGoalIds: ["g4", "g5", "g6"],
      },
      {
        id: "g8-step-3",
        title: "步骤 3：水晶与撤离",
        instruction: "收集终端水晶后继续推进到出口。",
        coach: "压轴关也要严格完成资源目标，不只看出口。",
        success: "终端圣殿通关。",
        requiredGoalIds: ["g7", "g8"],
      },
    ],
    mentor: {
      name: "调试员诺亚",
      avatar: "🏛️",
      intro: "这是当前训练营的综合关。先 scan，再按目标顺序拆解。",
      success: "完整通关。现在这套玩法已经具备教学循环、关卡目标、反馈和奖励闭环。",
    },
    scene: {
      theme: "dungeonScene",
      background: "/code-research/calciumtrice-dungeon/scene-terminal-temple-v1.png",
      sourceWidth: 1600,
      sourceHeight: 900,
      grid: { left: 214, top: 188, width: 1140, height: 504 },
      tokenScale: 1.12,
    },
    mapPosition: { left: 82, top: 70 },
    width: 9,
    height: 7,
    terrain: [
      { id: "water-a", kind: "water", label: "地下河", x: 3, y: 3 },
      { id: "water-b", kind: "water", label: "地下河", x: 3, y: 4 },
      { id: "water-c", kind: "water", label: "地下河", x: 3, y: 5 },
      { id: "hazard-a", kind: "hazard", label: "能量裂隙", x: 5, y: 4 },
      { id: "wall-a", kind: "wall", label: "圣殿墙", x: 1, y: 1 },
      { id: "wall-b", kind: "wall", label: "圣殿墙", x: 2, y: 1 },
      { id: "wall-c", kind: "wall", label: "圣殿墙", x: 6, y: 5 },
    ],
    bridges: [{ id: "temple-bridge", label: "圣殿石桥", requiresItemId: "temple-plank", x: 3, y: 4 }],
    doors: [{ id: "temple-door", label: "终端门", requiresItemId: "temple-key", x: 6, y: 3 }],
    heroStart: { x: 0, y: 4 },
    exit: { x: 8, y: 3 },
    items: [
      { id: "temple-plank", kind: "plank", label: "圣殿桥板", x: 2, y: 4 },
      { id: "temple-key", kind: "key", label: "终端门钥匙", x: 4, y: 2 },
      { id: "final-crystal", kind: "crystal", label: "终端水晶", x: 7, y: 3 },
    ],
    enemies: [{ id: "sentinel", label: "终端哨兵", kind: "sentinel", hp: 1, x: 5, y: 3 }],
    starterCode: `# 任务：综合编写完整解法
hero.scan()
# TODO: 先拿桥板并修桥
# TODO: 再向上拿钥匙
# TODO: 击退哨兵，打开终端门
# TODO: 收集终端水晶并到达出口`,
    solution: `hero.scan()
hero.moveRight()
hero.moveRight()
hero.collect()
hero.buildBridge("right")
hero.moveRight()
hero.moveRight()
hero.moveUp()
hero.moveUp()
hero.collect()
hero.moveDown()
hero.attack()
hero.moveRight()
hero.openDoor()
hero.moveRight()
hero.moveRight()
hero.collect()
hero.moveRight()`,
    goals: [
      { id: "g1", kind: "scan", label: "扫描终端圣殿" },
      { id: "g2", kind: "collect", targetId: "temple-plank", label: "收集圣殿桥板" },
      { id: "g3", kind: "buildBridge", targetId: "temple-bridge", label: "修复圣殿石桥" },
      { id: "g4", kind: "collect", targetId: "temple-key", label: "收集终端门钥匙" },
      { id: "g5", kind: "defeat", targetId: "sentinel", label: "击退终端哨兵" },
      { id: "g6", kind: "openDoor", targetId: "temple-door", label: "打开终端门" },
      { id: "g7", kind: "collect", targetId: "final-crystal", label: "收集终端水晶" },
      { id: "g8", kind: "exit", label: "抵达终端出口" },
    ],
    hints: [
      "先拿桥板，再修下方断桥。",
      "过桥后向上拿钥匙，回到哨兵旁边 attack。",
      "打开终端门后收集终端水晶，再继续向右到出口。",
    ],
    briefing: [
      "先 scan，再拿桥板并修复地下河断桥。",
      "过桥后绕到上方拿钥匙，回到哨兵旁边 attack。",
      "用钥匙开终端门，收集终端水晶后抵达出口。",
    ],
    failureTips: {
      bridgeItem: "先拿桥板，再修桥。",
      doorKey: "终端门需要钥匙，钥匙在上方。",
      enemy: "哨兵挡在门前，先 attack。",
      missingGoal: "综合关要按目标顺序逐个核对，不要只看出口。",
    },
    parSteps: 18,
    xpReward: 140,
    coinReward: 44,
  },
  {
    id: "dungeon-gauntlet-9",
    title: "深层回廊",
    subtitle: "先拿钥匙，再清掉守卫穿门离开",
    description: "路线更长，目标更密集。你需要在一条主通道中完成收集、战斗、开门和出口四段任务。",
    mapTitle: "暗影地牢",
    difficulty: "挑战",
    biome: "dungeon",
    concepts: ["多目标路径", "战斗前置", "门锁流程"],
    toolbox: ["hero.move_right()", "hero.collect()", "hero.attack()", "hero.open_door()"],
    task: {
      mode: "guided_build",
      title: "清扫并穿门",
      summary: "先把深层钥匙拿到，再击退守卫，最后开门并带着终端碎晶撤离。",
      checklist: ["收集深层钥匙", "击退通道守卫", "打开铁门并到达出口"],
      requireCodeChange: true,
    },
    tutorialSteps: [
      {
        id: "g9-step-1",
        title: "步骤 1：先拿钥匙",
        instruction: "先走到深层钥匙位置并执行 collect，不要提前接敌。",
        coach: "这关的顺序必须是 key -> enemy -> door -> exit。",
        success: "钥匙阶段完成。",
        requiredGoalIds: ["g1"],
      },
      {
        id: "g9-step-2",
        title: "步骤 2：清守卫并开门",
        instruction: "在守卫相邻格 attack，随后推进到门边 open_door。",
        coach: "守卫必须先清掉，门前才会稳定推进。",
        success: "门前战斗与开门完成。",
        requiredSnippets: [{ snippet: "hero.attack()" }, { snippet: "hero.open_door()" }],
        requiredGoalIds: ["g2", "g3"],
      },
      {
        id: "g9-step-3",
        title: "步骤 3：回收晶体并撤离",
        instruction: "穿门后先 collect 晶体，再继续向右到出口。",
        coach: "不要只顾着到出口，先完成晶体目标。",
        success: "深层回廊通关。",
        requiredGoalIds: ["g4", "g5"],
      },
    ],
    mentor: {
      name: "导师林恩",
      avatar: "🛡️",
      intro: "这关的关键是顺序：钥匙 -> 守卫 -> 门 -> 出口。",
      success: "你已经能稳定处理一条长通道里的多阶段任务。",
    },
    scene: {
      theme: "dungeonScene",
      background: "/code-research/calciumtrice-dungeon/scene-guard-corridor-v2.png",
      sourceWidth: 1600,
      sourceHeight: 900,
      grid: { left: 184, top: 520, width: 1230, height: 0 },
      tokenScale: 1.2,
    },
    mapPosition: { left: 18, top: 28 },
    width: 10,
    height: 7,
    terrain: [
      { id: "wall-a", kind: "wall", label: "断柱", x: 4, y: 2 },
      { id: "wall-b", kind: "wall", label: "断柱", x: 4, y: 4 },
      { id: "hazard-a", kind: "hazard", label: "裂隙", x: 7, y: 2 },
      { id: "hazard-b", kind: "hazard", label: "裂隙", x: 7, y: 4 },
    ],
    doors: [{ id: "deep-door", label: "深层铁门", requiresItemId: "deep-key", x: 6, y: 3 }],
    heroStart: { x: 0, y: 3 },
    exit: { x: 9, y: 3 },
    items: [
      { id: "deep-key", kind: "key", label: "深层钥匙", x: 2, y: 3 },
      { id: "deep-crystal", kind: "crystal", label: "终端碎晶", x: 8, y: 3 },
    ],
    enemies: [{ id: "deep-bug", label: "通道甲虫", kind: "bug", hp: 1, x: 5, y: 3 }],
    starterCode: `# 任务：补全深层回廊流程
hero.moveRight()
# TODO: 继续向右拿到深层钥匙
# TODO: 清掉前方守卫
# TODO: 打开深层铁门并到达出口`,
    solution: `hero.moveRight()
hero.moveRight()
hero.collect()
hero.moveRight()
hero.moveRight()
hero.attack()
hero.moveRight()
hero.openDoor()
hero.moveRight()
hero.moveRight()
hero.moveRight()
hero.collect()
hero.moveRight()`,
    goals: [
      { id: "g1", kind: "collect", targetId: "deep-key", label: "收集深层钥匙" },
      { id: "g2", kind: "defeat", targetId: "deep-bug", label: "击退通道甲虫" },
      { id: "g3", kind: "openDoor", targetId: "deep-door", label: "打开深层铁门" },
      { id: "g4", kind: "collect", targetId: "deep-crystal", label: "收集终端碎晶" },
      { id: "g5", kind: "exit", label: "抵达深层出口" },
    ],
    hints: [
      "钥匙在起点右侧两格，先拿再推进。",
      "守卫挡在门前，先 attack 再开门。",
      "开门后别忘记收集终端碎晶再离开。",
    ],
    briefing: [
      "先向右推进拿到深层钥匙。",
      "在门前清掉守卫，然后 openDoor。",
      "穿门后收集碎晶并到达出口。",
    ],
    failureTips: {
      doorKey: "这道铁门需要先拿到深层钥匙。",
      enemy: "守卫会挡路，先在相邻格 attack。",
      missingGoal: "先确认钥匙、守卫、铁门和碎晶都完成了。",
    },
    parSteps: 13,
    xpReward: 155,
    coinReward: 48,
  },
  {
    id: "switch-river-10",
    title: "双段机关河道",
    subtitle: "修桥后去踩机关，再回主路作战",
    description: "这是一个双阶段路线：先修桥，再踩机关开门，然后回主路处理守卫并冲刺出口。",
    mapTitle: "河谷营地",
    difficulty: "挑战",
    biome: "river",
    concepts: ["双阶段路径", "机关开门", "回路规划"],
    toolbox: ["hero.build_bridge(\"right\")", "hero.step_on_switch()", "hero.attack()"],
    task: {
      mode: "guided_build",
      title: "修桥 + 机关 + 战斗",
      summary: "先收集桥板并修桥，踩亮机关，再击退守卫通过门后到达出口。",
      checklist: ["收集桥板并修桥", "触发机关打开石门", "击退守卫并到达出口"],
      requireCodeChange: true,
    },
    tutorialSteps: [
      {
        id: "g10-step-1",
        title: "步骤 1：桥段准备",
        instruction: "先 collect 桥板，再执行 build_bridge 通过水格。",
        coach: "桥段没打通，后续所有步骤都无法推进。",
        success: "桥段完成。",
        requiredSnippets: [{ snippet: "hero.build_bridge(\"right\")" }],
        requiredGoalIds: ["g1", "g2"],
      },
      {
        id: "g10-step-2",
        title: "步骤 2：上层机关",
        instruction: "上行到踏板格执行 step_on_switch，先把石门打开。",
        coach: "这一步是典型“先支线开路，再回主线”的节奏。",
        success: "机关阶段完成。",
        requiredSnippets: [{ snippet: "hero.step_on_switch()" }],
        requiredGoalIds: ["g3", "g4"],
      },
      {
        id: "g10-step-3",
        title: "步骤 3：主路作战与冲刺",
        instruction: "回主路 attack 守卫，再直线推进到出口。",
        coach: "守卫不清会直接卡住路线。",
        success: "河道机关关通关。",
        requiredGoalIds: ["g5", "g6"],
      },
    ],
    mentor: {
      name: "营地伙伴米薇",
      avatar: "🏕️",
      intro: "别急着冲主路。先修桥上高台触发机关，门开后再回来作战。",
      success: "你已经具备‘先支线开路，再回主线推进’的节奏控制能力。",
    },
    scene: {
      theme: "dungeonScene",
      background: "/code-research/calciumtrice-dungeon/scene-river-crossing-v1.png",
      sourceWidth: 1600,
      sourceHeight: 900,
      grid: { left: 250, top: 240, width: 1020, height: 430 },
      tokenScale: 1.2,
    },
    mapPosition: { left: 34, top: 34 },
    width: 10,
    height: 7,
    terrain: [
      { id: "water-a", kind: "water", label: "激流", x: 3, y: 3 },
      { id: "hazard-a", kind: "hazard", label: "毒雾", x: 7, y: 2 },
    ],
    bridges: [{ id: "switch-river-bridge", label: "河道木桥", requiresItemId: "river-plank", x: 3, y: 3 }],
    doors: [{ id: "switch-river-door", label: "机关石门", x: 7, y: 3 }],
    switches: [{ id: "switch-river-plate", label: "上层踏板", opensDoorId: "switch-river-door", x: 3, y: 1 }],
    heroStart: { x: 0, y: 3 },
    exit: { x: 9, y: 3 },
    items: [{ id: "river-plank", kind: "plank", label: "河道桥板", x: 2, y: 3 }],
    enemies: [{ id: "switch-river-guard", label: "河道守卫", kind: "guard", hp: 1, x: 6, y: 3 }],
    starterCode: `# 任务：补全河道机关路线
hero.moveRight()
# TODO: 再向右拿桥板并修桥
# TODO: 上去触发机关开门
# TODO: 回主路击退守卫并冲向出口`,
    solution: `hero.moveRight()
hero.moveRight()
hero.collect()
hero.buildBridge("right")
hero.moveRight()
hero.moveUp()
hero.moveUp()
hero.stepOnSwitch()
hero.moveDown()
hero.moveDown()
hero.moveRight()
hero.moveRight()
hero.attack()
hero.moveRight()
hero.moveRight()
hero.moveRight()
hero.moveRight()`,
    goals: [
      { id: "g1", kind: "collect", targetId: "river-plank", label: "收集河道桥板" },
      { id: "g2", kind: "buildBridge", targetId: "switch-river-bridge", label: "修复河道木桥" },
      { id: "g3", kind: "activateSwitch", targetId: "switch-river-plate", label: "触发上层踏板" },
      { id: "g4", kind: "openDoor", targetId: "switch-river-door", label: "打开机关石门" },
      { id: "g5", kind: "defeat", targetId: "switch-river-guard", label: "击退河道守卫" },
      { id: "g6", kind: "exit", label: "抵达河道出口" },
    ],
    hints: [
      "桥板在右侧两格，修桥后再上去踩踏板。",
      "踏板点亮后石门会远程打开。",
      "回主路时先处理守卫，再一口气冲刺到出口。",
    ],
    briefing: [
      "先拿桥板并在水格右侧修桥。",
      "通过桥去上层踩踏板，让石门打开。",
      "回到主路，击退守卫后穿门到出口。",
    ],
    failureTips: {
      bridgeItem: "修桥前先 collect 河道桥板。",
      switch: "必须站在踏板格子上再 stepOnSwitch。",
      enemy: "守卫卡位时先 attack。",
    },
    parSteps: 17,
    xpReward: 170,
    coinReward: 52,
  },
  {
    id: "ruins-scan-11",
    title: "侦测裂谷",
    subtitle: "扫描后取钥匙、开门、拿晶体并撤离",
    description: "这关强调扫描后的路线规划。危险格、守卫、门锁和出口串成一条需要精确执行的路径。",
    mapTitle: "网页废墟",
    difficulty: "挑战",
    biome: "ruins",
    concepts: ["扫描规划", "先钥匙后开门", "长路线执行"],
    toolbox: ["hero.scan_map()", "hero.collect()", "hero.attack()", "hero.open_door()"],
    task: {
      mode: "guided_build",
      title: "扫描后执行长路线",
      summary: "先扫描确认危险区，再拿钥匙、清守卫、开门并收集终端晶体。",
      checklist: ["扫描地图", "收集钥匙并击退守卫", "开门后收集晶体并离开"],
      requireCodeChange: true,
    },
    tutorialSteps: [
      {
        id: "g11-step-1",
        title: "步骤 1：扫描与取钥匙",
        instruction: "先 scan_map，再沿底线收集裂谷钥匙。",
        coach: "先观察再执行，是长路线稳定通关的关键。",
        success: "扫描与钥匙阶段完成。",
        requiredSnippets: [{ snippet: "hero.scan_map()" }],
        requiredGoalIds: ["g1", "g2"],
      },
      {
        id: "g11-step-2",
        title: "步骤 2：门前清障",
        instruction: "上行到门前，先 attack 再 open_door。",
        coach: "门前顺序固定：enemy -> door。",
        success: "门前阶段完成。",
        requiredSnippets: [{ snippet: "hero.attack()" }, { snippet: "hero.open_door()" }],
        requiredGoalIds: ["g3", "g4"],
      },
      {
        id: "g11-step-3",
        title: "步骤 3：晶体回收与撤离",
        instruction: "穿门后 collect 晶体，再向右上到出口。",
        coach: "晶体目标和出口目标都要同时完成。",
        success: "裂谷侦测关通关。",
        requiredGoalIds: ["g5", "g6"],
      },
    ],
    mentor: {
      name: "调试员诺亚",
      avatar: "🔎",
      intro: "先 scan，再按顺序推进。不要边走边猜。",
      success: "你已经能把扫描信息转成稳定的执行脚本。",
    },
    scene: {
      theme: "dungeonScene",
      background: "/code-research/calciumtrice-dungeon/scene-scan-ruins-v1.png",
      sourceWidth: 1600,
      sourceHeight: 900,
      grid: { left: 230, top: 214, width: 1120, height: 432 },
      tokenScale: 1.16,
    },
    mapPosition: { left: 54, top: 46 },
    width: 11,
    height: 7,
    terrain: [
      { id: "hazard-a", kind: "hazard", label: "裂隙", x: 5, y: 3 },
      { id: "hazard-b", kind: "hazard", label: "裂隙", x: 6, y: 3 },
      { id: "hazard-c", kind: "hazard", label: "裂隙", x: 6, y: 4 },
      { id: "wall-a", kind: "wall", label: "残柱", x: 2, y: 2 },
      { id: "wall-b", kind: "wall", label: "残柱", x: 8, y: 5 },
    ],
    doors: [{ id: "scan-door", label: "裂谷石门", requiresItemId: "scan-key", x: 8, y: 2 }],
    heroStart: { x: 0, y: 5 },
    exit: { x: 10, y: 1 },
    items: [
      { id: "scan-key", kind: "key", label: "裂谷钥匙", x: 4, y: 5 },
      { id: "scan-crystal", kind: "crystal", label: "终端晶体", x: 9, y: 2 },
    ],
    enemies: [{ id: "scan-bug", label: "裂谷甲虫", kind: "bug", hp: 1, x: 7, y: 2 }],
    starterCode: `# 任务：先扫描，再补全执行顺序
hero.scan()
# TODO: 先沿底部拿到裂谷钥匙
# TODO: 上行清掉守卫并打开石门
# TODO: 收集终端晶体后撤离到出口`,
    solution: `hero.scan()
hero.moveRight()
hero.moveRight()
hero.moveRight()
hero.moveRight()
hero.collect()
hero.moveUp()
hero.moveUp()
hero.moveUp()
hero.moveRight()
hero.moveRight()
hero.attack()
hero.moveRight()
hero.openDoor()
hero.moveRight()
hero.moveRight()
hero.collect()
hero.moveRight()
hero.moveUp()`,
    goals: [
      { id: "g1", kind: "scan", label: "扫描裂谷地图" },
      { id: "g2", kind: "collect", targetId: "scan-key", label: "收集裂谷钥匙" },
      { id: "g3", kind: "defeat", targetId: "scan-bug", label: "击退裂谷甲虫" },
      { id: "g4", kind: "openDoor", targetId: "scan-door", label: "打开裂谷石门" },
      { id: "g5", kind: "collect", targetId: "scan-crystal", label: "收集终端晶体" },
      { id: "g6", kind: "exit", label: "抵达右上出口" },
    ],
    hints: [
      "先走底线拿钥匙，再上行推进。",
      "守卫在门前，先 attack 再 openDoor。",
      "拿到晶体后向右上撤离。",
    ],
    briefing: [
      "先 scan，然后沿底部拿裂谷钥匙。",
      "上行到门前击退守卫并打开石门。",
      "收集终端晶体后撤离到右上出口。",
    ],
    failureTips: {
      hazard: "扫描后红色裂隙不能踩，保持在安全线。",
      doorKey: "开门前先 collect 裂谷钥匙。",
      enemy: "守卫必须先清掉再推进。",
    },
    parSteps: 21,
    xpReward: 185,
    coinReward: 56,
  },
  {
    id: "forge-capstone-12",
    title: "锻炉总控",
    subtitle: "修桥、踏板、支线卷轴、双门与口令撤离",
    description: "这一关开始要求你把支线和主线拆开写。先修桥上高台触发机关并带走卷轴，再回主路清哨兵、拿钥匙、打开内门、收集晶体并撤离。",
    mapTitle: "终端圣殿",
    difficulty: "挑战",
    biome: "ruins",
    concepts: ["支线先行", "双门推进", "结果确认"],
    toolbox: [
      "hero.build_bridge(\"right\")",
      "hero.step_on_switch()",
      "hero.collect()",
      "hero.attack()",
      "hero.open_door()",
      "hero.say(\"...\")",
    ],
    task: {
      mode: "capstone",
      title: "完成锻炉总控流程",
      summary: "先修桥上高台点亮踏板并回收卷轴，再回主路击退哨兵、拿钥匙、依次通过外门和内门，收集晶体后发送口令撤离。",
      checklist: ["修桥并完成卷轴支线", "回主路清哨兵并收集钥匙", "打开双门、收集晶体并发出口令"],
      requireCodeChange: true,
    },
    tutorialSteps: [
      {
        id: "g12-step-1",
        title: "步骤 1：高台支线",
        instruction: "收集桥板并修桥，上高台触发踏板并回收卷轴。",
        coach: "先完成支线开路，再回主线推进。",
        success: "高台支线完成。",
        requiredGoalIds: ["g1", "g2", "g3", "g4"],
      },
      {
        id: "g12-step-2",
        title: "步骤 2：主路战斗与取钥匙",
        instruction: "回主路击退哨兵，推进到钥匙点完成收集。",
        coach: "双门前先保证哨兵已清、钥匙已拿。",
        success: "主路线前置阶段完成。",
        requiredGoalIds: ["g5", "g6", "g7"],
      },
      {
        id: "g12-step-3",
        title: "步骤 3：内门终结段",
        instruction: "打开内门，收集晶体，发送口令并抵达出口。",
        coach: "收尾顺序保持：open_door -> collect -> say -> exit。",
        success: "锻炉总控通关。",
        requiredSnippets: [{ snippet: "hero.say(\"forge clear\")" }],
        requiredGoalIds: ["g8", "g9", "g10", "g11"],
      },
    ],
    mentor: {
      name: "调试员诺亚",
      avatar: "🧭",
      intro: "别把流程揉成一条线。先把高台支线写干净，再回来处理双门和撤离。",
      success: "你已经能把锻炉章节的支线、主线、双门和口令确认写成一套稳定流程了。",
    },
    scene: {
      theme: "dungeonScene",
      background: "/code-research/calciumtrice-dungeon/scene-terminal-temple-v1.png",
      sourceWidth: 1600,
      sourceHeight: 900,
      grid: { left: 214, top: 188, width: 1140, height: 504 },
      tokenScale: 1.16,
    },
    mapPosition: { left: 74, top: 58 },
    width: 13,
    height: 7,
    terrain: [
      { id: "water-a", kind: "water", label: "锻炉暗河", x: 4, y: 3 },
      { id: "hazard-a", kind: "hazard", label: "能量裂隙", x: 8, y: 2 },
      { id: "wall-a", kind: "wall", label: "熔炉壁", x: 2, y: 1 },
      { id: "wall-b", kind: "wall", label: "熔炉壁", x: 7, y: 5 },
    ],
    bridges: [{ id: "forge-bridge", label: "锻炉木桥", requiresItemId: "forge-plank", x: 4, y: 3 }],
    switches: [{ id: "forge-switch", label: "锻炉踏板", opensDoorId: "forge-door-a", x: 4, y: 1 }],
    doors: [
      { id: "forge-door-a", label: "锻炉外门", x: 8, y: 3 },
      { id: "forge-door-b", label: "锻炉内门", requiresItemId: "forge-key", x: 10, y: 3 },
    ],
    heroStart: { x: 0, y: 3 },
    exit: { x: 12, y: 3 },
    items: [
      { id: "forge-plank", kind: "plank", label: "锻炉桥板", x: 2, y: 3 },
      { id: "forge-scroll", kind: "scroll", label: "锻炉卷轴", x: 5, y: 1 },
      { id: "forge-key", kind: "key", label: "锻炉钥匙", x: 9, y: 3 },
      { id: "forge-crystal", kind: "crystal", label: "锻炉晶体", x: 11, y: 3 },
    ],
    enemies: [{ id: "forge-sentinel", label: "锻炉哨兵", kind: "sentinel", hp: 1, x: 7, y: 3 }],
    starterCode: `# 任务：补全锻炉总控流程
hero.moveRight()
# TODO: 拿桥板并修桥，去上层点亮踏板
# TODO: 顺手带回锻炉卷轴，再回主路处理哨兵
# TODO: 拿钥匙后打开内门，收集晶体并发送口令撤离`,
    solution: `hero.moveRight()
hero.moveRight()
hero.collect()
hero.moveRight()
hero.buildBridge("right")
hero.moveRight()
hero.moveUp()
hero.moveUp()
hero.stepOnSwitch()
hero.moveRight()
hero.collect()
hero.moveLeft()
hero.moveDown()
hero.moveDown()
hero.moveRight()
hero.moveRight()
hero.attack()
hero.moveRight()
hero.moveRight()
hero.moveRight()
hero.collect()
hero.openDoor()
hero.moveRight()
hero.moveRight()
hero.collect()
hero.say("forge clear")
hero.moveRight()`,
    goals: [
      { id: "g1", kind: "collect", targetId: "forge-plank", label: "收集锻炉桥板" },
      { id: "g2", kind: "buildBridge", targetId: "forge-bridge", label: "修复锻炉木桥" },
      { id: "g3", kind: "activateSwitch", targetId: "forge-switch", label: "触发锻炉踏板" },
      { id: "g4", kind: "collect", targetId: "forge-scroll", label: "收集锻炉卷轴" },
      { id: "g5", kind: "defeat", targetId: "forge-sentinel", label: "击退锻炉哨兵" },
      { id: "g6", kind: "openDoor", targetId: "forge-door-a", label: "打开锻炉外门" },
      { id: "g7", kind: "collect", targetId: "forge-key", label: "收集锻炉钥匙" },
      { id: "g8", kind: "openDoor", targetId: "forge-door-b", label: "打开锻炉内门" },
      { id: "g9", kind: "collect", targetId: "forge-crystal", label: "收集锻炉晶体" },
      { id: "g10", kind: "say", label: "发送口令确认" },
      { id: "g11", kind: "exit", label: "抵达锻炉出口" },
    ],
    hints: [
      "踏板不是支线终点，点亮后右上还有锻炉卷轴要顺手带走。",
      "外门会被踏板解锁，真正需要手动打开的是后面的锻炉内门。",
      "收集晶体后再 say 口令确认，最后继续向右撤离。",
    ],
    briefing: [
      "第一段先拿桥板修桥，转入上层支线点亮踏板并回收锻炉卷轴。",
      "第二段回主路清掉锻炉哨兵，推进到钥匙位置完成取物。",
      "第三段打开锻炉内门，收集晶体并发出口令后抵达出口。",
    ],
    failureTips: {
      bridgeItem: "先 collect 锻炉桥板，再 buildBridge。",
      switch: "锻炉踏板要站在对应格子上再 stepOnSwitch。",
      doorKey: "锻炉内门需要先拿到锻炉钥匙。",
      enemy: "哨兵挡路时先 attack。",
      missingGoal: "检查桥板、踏板、卷轴、钥匙、双门、晶体和口令是否全部完成。",
    },
    parSteps: 27,
    xpReward: 205,
    coinReward: 62,
  },
  {
    id: "switch-gate-13",
    title: "回廊联动门",
    subtitle: "先踩机关，再清敌收集并撤离",
    description: "这一关要求你先触发踏板打开主门，再按顺序完成收集、战斗和出口目标。",
    mapTitle: "联动回廊",
    difficulty: "挑战",
    biome: "dungeon",
    concepts: ["路径拆解", "机关联动", "战斗顺序", "门后支线回收"],
    toolbox: ["hero.move_right()", "hero.step_on_switch()", "hero.collect()", "hero.attack()", "hero.open_door()"],
    task: {
      mode: "guided_build",
      title: "触发机关并清场撤离",
      summary: "先拿卷轴并踩亮踏板，再在上层补拿情报代币；回主路后拿钥匙、处理双敌、打开内闸并收集水晶撤离。",
      checklist: ["触发联动踏板并回收情报代币", "拿钥匙后连续击退双敌", "打开内闸、收集水晶并撤离"],
      requireCodeChange: true,
    },
    tutorialSteps: [
      {
        id: "g13-step-1",
        title: "步骤 1：先做上层联动",
        instruction: "收集回廊卷轴后先去踩踏板，并在上层回收情报代币。",
        coach: "这关的核心是先支线开路，再回主路推进。",
        success: "联动踏板与上层回收完成。",
        requiredGoalIds: ["g1", "g2", "g7"],
      },
      {
        id: "g13-step-2",
        title: "步骤 2：主路双敌清障",
        instruction: "回主路先拿钥匙，再按顺序击退甲虫和哨兵。",
        coach: "不要跳过钥匙直接战斗，后续内闸会卡住。",
        success: "主路战斗阶段完成。",
        requiredGoalIds: ["g3", "g4", "g5"],
      },
      {
        id: "g13-step-3",
        title: "步骤 3：内闸收尾",
        instruction: "打开联动内闸，收集水晶并抵达出口。",
        coach: "收尾顺序固定：open_door -> collect -> exit。",
        success: "回廊联动门通关。",
        requiredSnippets: [{ snippet: "hero.open_door()" }],
        requiredGoalIds: ["g6", "g8", "g9"],
      },
    ],
    mentor: {
      name: "导师林恩",
      avatar: "🛡️",
      intro: "这关关键是顺序：踏板 -> 上层回收 -> 钥匙 -> 双敌 -> 内闸 -> 水晶。",
      success: "你已经能把联动机关、上层回收和主路战斗串成完整路线。",
    },
    scene: {
      theme: "dungeonScene",
      background: "/code-research/calciumtrice-dungeon/scene-switch-sanctum-v1.png",
      sourceWidth: 1600,
      sourceHeight: 900,
      grid: { left: 214, top: 188, width: 1140, height: 504 },
      tokenScale: 1.18,
    },
    mapPosition: { left: 23, top: 44 },
    width: 12,
    height: 7,
    terrain: [
      { id: "wall-a", kind: "wall", label: "断柱", x: 5, y: 4 },
      { id: "hazard-a", kind: "hazard", label: "裂隙", x: 8, y: 2 },
    ],
    doors: [
      { id: "relay-door", label: "联动石门", x: 8, y: 3 },
      { id: "relay-inner-door", label: "联动内闸", requiresItemId: "relay-key", x: 10, y: 3 },
    ],
    switches: [{ id: "relay-switch", label: "联动踏板", opensDoorId: "relay-door", x: 4, y: 1 }],
    heroStart: { x: 0, y: 3 },
    exit: { x: 11, y: 3 },
    items: [
      { id: "relay-scroll", kind: "scroll", label: "回廊卷轴", x: 2, y: 3 },
      { id: "relay-coin", kind: "coin", label: "情报代币", x: 6, y: 1 },
      { id: "relay-key", kind: "key", label: "联动钥匙", x: 6, y: 3 },
      { id: "relay-crystal", kind: "crystal", label: "联动水晶", x: 10, y: 2 },
    ],
    enemies: [
      { id: "relay-bug", label: "回廊甲虫", kind: "bug", hp: 1, x: 7, y: 3 },
      { id: "relay-sentinel", label: "联动哨兵", kind: "sentinel", hp: 1, x: 9, y: 3 },
    ],
    starterCode: `# 任务：按顺序触发机关并撤离
hero.moveRight()
# TODO: 拿卷轴后先去踩踏板并回收上层情报代币
# TODO: 回主路拿钥匙并连续处理双敌
# TODO: 打开联动内闸，收集水晶后撤离`,
    solution: `hero.moveRight()
hero.moveRight()
hero.collect()
hero.moveRight()
hero.moveRight()
hero.moveUp()
hero.moveUp()
hero.stepOnSwitch()
hero.moveRight()
hero.moveRight()
hero.collect()
hero.moveDown()
hero.moveDown()
hero.collect()
hero.attack()
hero.moveRight()
hero.moveRight()
hero.attack()
hero.moveRight()
hero.openDoor()
hero.moveRight()
hero.moveUp()
hero.collect()
hero.moveDown()
hero.moveRight()`,
    goals: [
      { id: "g1", kind: "collect", targetId: "relay-scroll", label: "收集回廊卷轴" },
      { id: "g2", kind: "activateSwitch", targetId: "relay-switch", label: "触发联动踏板" },
      { id: "g3", kind: "collect", targetId: "relay-key", label: "收集联动钥匙" },
      { id: "g4", kind: "defeat", targetId: "relay-bug", label: "击退回廊甲虫" },
      { id: "g5", kind: "defeat", targetId: "relay-sentinel", label: "击退联动哨兵" },
      { id: "g6", kind: "openDoor", targetId: "relay-inner-door", label: "打开联动内闸" },
      { id: "g7", kind: "collect", targetId: "relay-coin", label: "收集情报代币" },
      { id: "g8", kind: "collect", targetId: "relay-crystal", label: "收集联动水晶" },
      { id: "g9", kind: "exit", label: "抵达出口" },
    ],
    hints: [
      "先把左侧卷轴拿到，再去上方踩踏板并顺手回收情报代币。",
      "回到主路后先拿钥匙，再按顺序处理甲虫和哨兵。",
      "联动石门由踏板解锁，真正要手动处理的是后面的联动内闸。",
    ],
    briefing: [
      "第一段先完成卷轴收集，踩亮联动踏板并回收上层情报代币。",
      "第二段回主路收集钥匙，连续清掉甲虫与哨兵。",
      "第三段打开联动内闸，收集水晶后抵达出口。",
    ],
    failureTips: {
      switch: "联动门需要先在踏板格执行 stepOnSwitch。",
      doorKey: "联动内闸需要先拿到联动钥匙。",
      enemy: "双敌连续挡路时，要先推进到相邻格再逐个 attack。",
      missingGoal: "检查踏板、代币、钥匙、双敌、内闸、水晶和出口是否全部完成。",
    },
    parSteps: 24,
    xpReward: 228,
    coinReward: 70,
  },
  {
    id: "bridge-siege-14",
    title: "断桥突进",
    subtitle: "修桥后先走上层支线，再回主路打开双段通路",
    description: "不再是一条纯直线。先修桥拿钥匙，再上侧路踩踏板、收卷轴，回主路清守卫开门，最后穿过第二道已解锁的闸口带着水晶撤离。",
    mapTitle: "断桥主廊",
    difficulty: "挑战",
    biome: "river",
    concepts: ["支线折返", "桥门联动", "双段通路"],
    toolbox: [
      "hero.build_bridge(\"right\")",
      "hero.step_on_switch()",
      "hero.open_door()",
      "hero.attack()",
      "hero.collect()",
    ],
    task: {
      mode: "guided_build",
      title: "桥段 + 支线 + 闸门推进",
      summary: "先收集桥板并修桥，拿到主廊钥匙后上去完成踏板和卷轴支线，再回主路清守卫、开门、穿过第二闸口拿走战术水晶。",
      checklist: ["修桥并完成上层支线", "回主路开闸并穿过双段通路", "收集水晶并撤离"],
      requireCodeChange: true,
    },
    tutorialSteps: [
      {
        id: "g14-step-1",
        title: "步骤 1：桥段与钥匙",
        instruction: "先收集桥板修桥，沿主廊推进并拿到主廊钥匙。",
        coach: "钥匙是后续主闸门和撤离段的前置条件。",
        success: "桥段与钥匙阶段完成。",
        requiredGoalIds: ["g1", "g2", "g3"],
      },
      {
        id: "g14-step-2",
        title: "步骤 2：上层支线",
        instruction: "转入上层，踩踏板并收集侦察卷轴后再回主路。",
        coach: "踏板和卷轴都在支线，别只做其中一个。",
        success: "上层支线完成。",
        requiredGoalIds: ["g4", "g5"],
      },
      {
        id: "g14-step-3",
        title: "步骤 3：主路收尾",
        instruction: "回主路击退守卫、开主闸、收集水晶并抵达出口。",
        coach: "主路收尾要一口气完成 battle -> gate -> crystal -> exit。",
        success: "断桥突进通关。",
        requiredSnippets: [{ snippet: "hero.open_door()" }],
        requiredGoalIds: ["g6", "g7", "g8", "g9"],
      },
    ],
    mentor: {
      name: "前锋教官",
      avatar: "⚔️",
      intro: "先别把它写成一条直冲到底的脚本。这关要先上去处理支线，再回来推进主廊。",
      success: "你已经能把主路、支线和撤离段拆开处理了。",
    },
    scene: {
      theme: "dungeonScene",
      background: "/code-research/calciumtrice-dungeon/scene-river-crossing-v1.png",
      sourceWidth: 1600,
      sourceHeight: 900,
      grid: { left: 250, top: 240, width: 1020, height: 430 },
      tokenScale: 1.2,
    },
    mapPosition: { left: 38, top: 46 },
    width: 14,
    height: 7,
    terrain: [
      { id: "water-a", kind: "water", label: "断桥河道", x: 4, y: 3 },
      { id: "hazard-a", kind: "hazard", label: "毒雾", x: 9, y: 2 },
      { id: "wall-a", kind: "wall", label: "废弃石柱", x: 6, y: 5 },
    ],
    bridges: [{ id: "siege-bridge", label: "主廊木桥", requiresItemId: "siege-plank", x: 4, y: 3 }],
    doors: [
      { id: "siege-door-a", label: "主廊闸门", requiresItemId: "siege-key", x: 9, y: 3 },
      { id: "siege-door-b", label: "支援闸门", x: 11, y: 3 },
    ],
    switches: [{ id: "siege-switch", label: "上层踏板", opensDoorId: "siege-door-b", x: 7, y: 1 }],
    heroStart: { x: 0, y: 3 },
    exit: { x: 13, y: 3 },
    items: [
      { id: "siege-plank", kind: "plank", label: "主廊桥板", x: 2, y: 3 },
      { id: "siege-key", kind: "key", label: "主廊钥匙", x: 6, y: 3 },
      { id: "siege-scroll", kind: "scroll", label: "侦察卷轴", x: 8, y: 1 },
      { id: "siege-crystal", kind: "crystal", label: "战术水晶", x: 12, y: 3 },
    ],
    enemies: [{ id: "siege-guard", label: "主廊守卫", kind: "guard", hp: 1, x: 8, y: 3 }],
    starterCode: `# 任务：完成断桥突进流程
hero.moveRight()
# TODO: 收集桥板后修桥，通过河道拿到主廊钥匙
# TODO: 先上去踩踏板并收集侦察卷轴，再回主路
# TODO: 清掉守卫、打开闸门，穿过支援闸口拿走水晶并撤离`,
    solution: `hero.moveRight()
hero.moveRight()
hero.collect()
hero.moveRight()
hero.buildBridge("right")
hero.moveRight()
hero.moveRight()
hero.moveRight()
hero.collect()
hero.moveRight()
hero.moveUp()
hero.moveUp()
hero.stepOnSwitch()
hero.moveRight()
hero.collect()
hero.moveLeft()
hero.moveDown()
hero.moveDown()
hero.attack()
hero.moveRight()
hero.openDoor()
hero.moveRight()
hero.moveRight()
hero.moveRight()
hero.moveRight()
hero.collect()
hero.moveRight()`,
    goals: [
      { id: "g1", kind: "collect", targetId: "siege-plank", label: "收集主廊桥板" },
      { id: "g2", kind: "buildBridge", targetId: "siege-bridge", label: "修复主廊木桥" },
      { id: "g3", kind: "collect", targetId: "siege-key", label: "收集主廊钥匙" },
      { id: "g4", kind: "activateSwitch", targetId: "siege-switch", label: "触发上层踏板" },
      { id: "g5", kind: "collect", targetId: "siege-scroll", label: "收集侦察卷轴" },
      { id: "g6", kind: "defeat", targetId: "siege-guard", label: "击退主廊守卫" },
      { id: "g7", kind: "openDoor", targetId: "siege-door-a", label: "打开主廊闸门" },
      { id: "g8", kind: "collect", targetId: "siege-crystal", label: "收集战术水晶" },
      { id: "g9", kind: "exit", label: "抵达右侧出口" },
    ],
    hints: [
      "拿到钥匙后别急着打守卫，先上去完成踏板和卷轴支线。",
      "守卫仍然挡在闸门前，要先 attack 再 openDoor。",
      "支援闸门会被踏板提前解锁，回主路后可以直接穿过去拿水晶。",
    ],
    briefing: [
      "第一段先收集桥板、修桥并拿到主廊钥匙。",
      "第二段转入上层支线，踩亮踏板并回收侦察卷轴。",
      "第三段回主路清守卫、开闸门，拿走战术水晶后抵达出口。",
    ],
    failureTips: {
      bridgeItem: "修桥前要先 collect 主廊桥板。",
      switch: "上层踏板要站到对应格子上再 stepOnSwitch。",
      doorKey: "主廊闸门需要先拿到主廊钥匙。",
      enemy: "守卫挡路时，请先在相邻格 attack。",
      missingGoal: "这关不是一条直线，请确认桥段、支线卷轴、战斗、开门和撤离是否都完成。",
    },
    parSteps: 29,
    xpReward: 235,
    coinReward: 74,
  },
  {
    id: "scan-loop-15",
    title: "侦测长廊",
    subtitle: "scan + repeat + 上层折线 + 高台撤离",
    description: "不再只是横向直冲。先扫描、用 repeat 拿钥匙，再切入上层折线收卷轴，回主廊拿代币、清敌开门，最后爬上高台带走终端水晶。",
    mapTitle: "侦测长廊",
    difficulty: "挑战",
    biome: "ruins",
    concepts: ["scan 观察", "repeat 压缩", "折线路径拆段", "口令确认"],
    toolbox: ["hero.scan_map()", "for _ in range(n):", "hero.collect()", "hero.attack()", "hero.open_door()", "hero.say(\"...\")"],
    task: {
      mode: "capstone",
      title: "扫描后拆段推进",
      summary: "先 scan，再用 repeat 拿到钥匙并切入上层收卷轴；回主廊拿代币、清双敌、开门后上高台拿终端水晶并发送口令撤离。",
      checklist: ["scan 后完成钥匙与卷轴收集", "回主廊完成代币、双敌战斗与开门", "收集终端水晶并发送口令抵达出口"],
      requireCodeChange: true,
    },
    tutorialSteps: [
      {
        id: "g15-step-1",
        title: "步骤 1：扫描与首段循环",
        instruction: "先扫描地图，再用循环段推进并收集侦测钥匙。",
        coach: "先 scan 再写循环，路线会稳定很多。",
        success: "扫描与钥匙阶段完成。",
        requiredSnippets: [{ snippet: "hero.scan_map()" }, { snippet: "for _ in range(3):\n    hero.move_right()" }],
        requiredGoalIds: ["g1", "g2"],
      },
      {
        id: "g15-step-2",
        title: "步骤 2：上层折线与主廊准备",
        instruction: "切到上层收卷轴，回主廊拿代币并清理第一名敌人。",
        coach: "先完成资源目标，再进入门前推进。",
        success: "折线中段完成。",
        requiredGoalIds: ["g3", "g4", "g5"],
      },
      {
        id: "g15-step-3",
        title: "步骤 3：门后终结段",
        instruction: "开门后上移清第二名敌人，收水晶、发口令并撤离。",
        coach: "门后仍有战斗，别把收尾写成纯移动。",
        success: "侦测长廊通关。",
        requiredGoalIds: ["g6", "g7", "g8", "g9", "g10"],
      },
    ],
    mentor: {
      name: "侦测导师",
      avatar: "🧭",
      intro: "先扫图，再把路线拆成四段：钥匙、上层卷轴、主廊双敌、高台口令撤离。这样 repeat 才会写得更清楚。",
      success: "你已经会把 scan、repeat、双敌清场和口令撤离组合成完整路线。",
    },
    scene: {
      theme: "dungeonScene",
      background: "/code-research/calciumtrice-dungeon/scene-scan-ruins-v1.png",
      sourceWidth: 1600,
      sourceHeight: 900,
      grid: { left: 230, top: 214, width: 1120, height: 432 },
      tokenScale: 1.16,
    },
    mapPosition: { left: 56, top: 52 },
    width: 13,
    height: 8,
    terrain: [
      { id: "hazard-a", kind: "hazard", label: "裂隙", x: 5, y: 3 },
      { id: "hazard-b", kind: "hazard", label: "裂隙", x: 10, y: 5 },
      { id: "wall-a", kind: "wall", label: "崩塌石墙", x: 2, y: 2 },
      { id: "wall-b", kind: "wall", label: "崩塌石墙", x: 8, y: 6 },
    ],
    doors: [{ id: "scan-loop-door", label: "侦测石门", requiresItemId: "scan-loop-key", x: 10, y: 4 }],
    heroStart: { x: 0, y: 4 },
    exit: { x: 12, y: 2 },
    items: [
      { id: "scan-loop-key", kind: "key", label: "侦测钥匙", x: 3, y: 4 },
      { id: "scan-loop-scroll", kind: "scroll", label: "调试卷轴", x: 7, y: 3 },
      { id: "scan-loop-coin", kind: "coin", label: "巡检代币", x: 8, y: 4 },
      { id: "scan-loop-crystal", kind: "crystal", label: "终端水晶", x: 11, y: 2 },
    ],
    enemies: [
      { id: "scan-loop-sentinel", label: "长廊哨兵", kind: "sentinel", hp: 1, x: 9, y: 4 },
      { id: "scan-loop-bug", label: "裂隙甲虫", kind: "bug", hp: 1, x: 11, y: 3 },
    ],
    starterCode: `# 任务：scan 后按三段路线推进
hero.scan()
# TODO: 用 repeat 快速移动并收集钥匙
# TODO: 切入上层折线回收卷轴，再回主廊拿代币
# TODO: 清掉双敌、开门、拿水晶并发送口令撤离`,
    solution: `hero.scan()
repeat(3) {
  hero.moveRight()
}
hero.collect()
repeat(3) {
  hero.moveRight()
}
hero.moveUp()
hero.moveRight()
hero.collect()
hero.moveDown()
hero.moveRight()
hero.collect()
hero.attack()
hero.moveRight()
hero.openDoor()
hero.moveRight()
hero.moveUp()
hero.attack()
hero.moveRight()
hero.moveUp()
hero.collect()
hero.say("scan clear")
hero.moveRight()`,
    goals: [
      { id: "g1", kind: "scan", label: "扫描侦测长廊" },
      { id: "g2", kind: "collect", targetId: "scan-loop-key", label: "收集侦测钥匙" },
      { id: "g3", kind: "collect", targetId: "scan-loop-scroll", label: "收集调试卷轴" },
      { id: "g4", kind: "collect", targetId: "scan-loop-coin", label: "收集巡检代币" },
      { id: "g5", kind: "defeat", targetId: "scan-loop-sentinel", label: "击退长廊哨兵" },
      { id: "g6", kind: "defeat", targetId: "scan-loop-bug", label: "击退裂隙甲虫" },
      { id: "g7", kind: "openDoor", targetId: "scan-loop-door", label: "打开侦测石门" },
      { id: "g8", kind: "collect", targetId: "scan-loop-crystal", label: "收集终端水晶" },
      { id: "g9", kind: "say", label: "发送侦测口令" },
      { id: "g10", kind: "exit", label: "抵达高台出口" },
    ],
    hints: [
      "先 scan，再把路径拆成四段：钥匙、卷轴、双敌、高台口令撤离。",
      "卷轴在上层，拿完后要回到主廊继续收代币并先处理第一名哨兵。",
      "开门后上移时还有一只甲虫，处理后再拿水晶并 say 口令离场。",
    ],
    briefing: [
      "第一段：scan 后用 repeat 拿到侦测钥匙。",
      "第二段：切入上层折线收集调试卷轴，再回主廊拿到巡检代币。",
      "第三段：击退哨兵、开门并上移处理甲虫。",
      "第四段：收集终端水晶，发送口令后抵达出口。",
    ],
    failureTips: {
      collect: "确认英雄已经站在目标物品格子上再 collect。",
      doorKey: "开门前先拿侦测钥匙。",
      enemy: "双敌分布在主廊和上层，处理完第一名后别忘了上移再 attack 第二名。",
      missingGoal: "本关目标较多，请依次核对 scan、钥匙、卷轴、代币、双敌、开门、口令与出口。",
    },
    parSteps: 25,
    xpReward: 262,
    coinReward: 82,
  },
  {
    id: "dungeon-finale-16",
    title: "黑曜总控室",
    subtitle: "桥、踏板、卷轴、双门、口令一体",
    description: "综合压轴关继续升级：你需要把修桥、触发机关、支线卷轴、拿钥匙、清敌、依次开门、口令确认和撤离串成一套完整流程。",
    mapTitle: "黑曜总控室",
    difficulty: "挑战",
    biome: "dungeon",
    concepts: ["综合流程设计", "主支线拼接", "结果可验证"],
    toolbox: [
      "hero.build_bridge(\"right\")",
      "hero.step_on_switch()",
      "hero.collect()",
      "hero.attack()",
      "hero.open_door()",
      "hero.say(\"...\")",
    ],
    task: {
      mode: "capstone",
      title: "完成压轴综合流程",
      summary: "先修桥进入核心区触发踏板并回收卷轴，再回主路拿钥匙、击退哨兵、依次打开双门，收集黑曜水晶后发送口令撤离。",
      checklist: ["修桥并完成卷轴支线", "拿钥匙、清敌并依次开门", "口令确认并抵达出口"],
      requireCodeChange: true,
    },
    tutorialSteps: [
      {
        id: "g16-step-1",
        title: "步骤 1：核心区前置",
        instruction: "收集桥板并修桥，进入核心区踩踏板并回收黑曜卷轴。",
        coach: "这一步完成后，主线才具备稳定推进条件。",
        success: "桥段与卷轴支线完成。",
        requiredGoalIds: ["g1", "g2", "g3", "g4"],
      },
      {
        id: "g16-step-2",
        title: "步骤 2：主路战斗与双门",
        instruction: "回主路拿钥匙，击退哨兵并依次打开外环闸门与总控闸门。",
        coach: "双门段必须在拿钥匙后再执行。",
        success: "战斗与双门阶段完成。",
        requiredGoalIds: ["g5", "g6", "g7", "g8"],
      },
      {
        id: "g16-step-3",
        title: "步骤 3：水晶确认与撤离",
        instruction: "收集黑曜水晶，发送口令并抵达出口。",
        coach: "最后保留结果确认动作，形成可审计收尾。",
        success: "黑曜总控室通关。",
        requiredSnippets: [{ snippet: "hero.say(\"all clear\")" }],
        requiredGoalIds: ["g9", "g10", "g11"],
      },
    ],
    mentor: {
      name: "总控导师",
      avatar: "🧠",
      intro: "这关要把支线、主线和终点确认拆开写。别把所有动作揉成一条直线。",
      success: "你已经具备把复杂综合关拆成多段脚本并稳定验证的能力。",
    },
    scene: {
      theme: "dungeonScene",
      background: "/code-research/calciumtrice-dungeon/scene-terminal-temple-v1.png",
      sourceWidth: 1600,
      sourceHeight: 900,
      grid: { left: 214, top: 188, width: 1140, height: 504 },
      tokenScale: 1.16,
    },
    mapPosition: { left: 71, top: 56 },
    width: 15,
    height: 8,
    terrain: [
      { id: "water-a", kind: "water", label: "暗河", x: 4, y: 4 },
      { id: "hazard-a", kind: "hazard", label: "能量裂隙", x: 11, y: 2 },
      { id: "wall-a", kind: "wall", label: "黑曜石墙", x: 2, y: 1 },
      { id: "wall-b", kind: "wall", label: "黑曜石墙", x: 8, y: 6 },
    ],
    bridges: [{ id: "finale-bridge", label: "总控木桥", requiresItemId: "finale-plank", x: 4, y: 4 }],
    switches: [{ id: "finale-switch", label: "总控踏板", opensDoorId: "finale-door-a", x: 5, y: 2 }],
    doors: [
      { id: "finale-door-a", label: "外环闸门", x: 10, y: 4 },
      { id: "finale-door-b", label: "总控闸门", requiresItemId: "finale-key", x: 12, y: 4 },
    ],
    heroStart: { x: 0, y: 4 },
    exit: { x: 14, y: 4 },
    items: [
      { id: "finale-plank", kind: "plank", label: "总控桥板", x: 2, y: 4 },
      { id: "finale-scroll", kind: "scroll", label: "黑曜卷轴", x: 7, y: 2 },
      { id: "finale-key", kind: "key", label: "总控钥匙", x: 8, y: 4 },
      { id: "finale-crystal", kind: "crystal", label: "黑曜水晶", x: 13, y: 4 },
    ],
    enemies: [{ id: "finale-sentinel", label: "黑曜哨兵", kind: "sentinel", hp: 1, x: 9, y: 4 }],
    starterCode: `# 任务：完成黑曜总控室压轴流程
hero.moveRight()
# TODO: 拿桥板修桥，进入核心区踩踏板
# TODO: 顺手回收黑曜卷轴，再回主路拿钥匙
# TODO: 清掉哨兵，依次开门，收集水晶后发送口令撤离`,
    solution: `hero.moveRight()
hero.moveRight()
hero.collect()
hero.moveRight()
hero.buildBridge("right")
hero.moveRight()
hero.moveRight()
hero.moveUp()
hero.moveUp()
hero.stepOnSwitch()
hero.moveRight()
hero.moveRight()
hero.collect()
hero.moveLeft()
hero.moveLeft()
hero.moveDown()
hero.moveDown()
hero.moveRight()
hero.moveRight()
hero.moveRight()
hero.collect()
hero.attack()
hero.moveRight()
hero.moveRight()
hero.moveRight()
hero.openDoor()
hero.moveRight()
hero.moveRight()
hero.collect()
hero.say("all clear")
hero.moveRight()`,
    goals: [
      { id: "g1", kind: "collect", targetId: "finale-plank", label: "收集总控桥板" },
      { id: "g2", kind: "buildBridge", targetId: "finale-bridge", label: "修复总控木桥" },
      { id: "g3", kind: "activateSwitch", targetId: "finale-switch", label: "触发总控踏板" },
      { id: "g4", kind: "collect", targetId: "finale-scroll", label: "收集黑曜卷轴" },
      { id: "g5", kind: "collect", targetId: "finale-key", label: "收集总控钥匙" },
      { id: "g6", kind: "defeat", targetId: "finale-sentinel", label: "击退黑曜哨兵" },
      { id: "g7", kind: "openDoor", targetId: "finale-door-a", label: "打开外环闸门" },
      { id: "g8", kind: "openDoor", targetId: "finale-door-b", label: "打开总控闸门" },
      { id: "g9", kind: "collect", targetId: "finale-crystal", label: "收集黑曜水晶" },
      { id: "g10", kind: "say", label: "发送口令确认" },
      { id: "g11", kind: "exit", label: "抵达总控出口" },
    ],
    hints: [
      "踏板不是支线终点，右上还有黑曜卷轴要顺手回收。",
      "外环闸门会被踏板解锁，真正需要手动打开的是后面的总控闸门。",
      "黑曜水晶后别忘了 say 口令，再向右撤离。",
    ],
    briefing: [
      "第一段完成修桥并触发踏板，顺手回收黑曜卷轴。",
      "第二段回主路拿钥匙，处理哨兵并依次打开双门。",
      "第三段收集黑曜水晶，口令确认后抵达出口。",
    ],
    failureTips: {
      bridgeItem: "修桥前必须先 collect 总控桥板。",
      doorKey: "总控闸门需要先拿总控钥匙。",
      switch: "踏板要站在对应格子上再 stepOnSwitch。",
      missingGoal: "这关是综合流程，请逐个核对桥、踏板、卷轴、钥匙、战斗、双门、口令和出口。",
    },
    parSteps: 29,
    xpReward: 272,
    coinReward: 86,
  },
  {
    id: "dungeon-ambush-17",
    title: "地牢伏击",
    subtitle: "先拿卷轴，再清双敌，最后回收门后信标撤离",
    description: "这关开始要求你在开门后继续做一次短支线回收。先拿卷轴和钥匙，连续处理两名敌人，开门后再去上方带走撤离信标。",
    mapTitle: "暗影地牢",
    difficulty: "进阶",
    biome: "dungeon",
    concepts: ["先观察后推进", "双敌顺序处理", "门后回收", "机关解锁撤离"],
    toolbox: [
      "hero.collect()",
      "hero.attack()",
      "hero.open_door()",
      "hero.step_on_switch()",
      "hero.say(\"...\")",
      "hero.move_right()",
      "hero.move_up()",
      "hero.move_down()",
    ],
    task: {
      mode: "guided_build",
      title: "处理伏击走廊",
      summary: "先拿卷轴提示，再推进收集钥匙并清双敌；打开外门后切到下层踩亮机关，解锁内门并回收信标，最后发送口令撤离。",
      checklist: ["收集卷轴和钥匙", "连续击退两名敌人并打开外门", "触发机关、回收信标并发送口令撤离"],
      requireCodeChange: true,
    },
    tutorialSteps: [
      {
        id: "g17-step-1",
        title: "步骤 1：收集前置资源",
        instruction: "先收集伏击卷轴，再推进收集伏击钥匙。",
        coach: "这关先收集再战斗，顺序不能反。",
        success: "卷轴与钥匙阶段完成。",
        requiredGoalIds: ["g1", "g2"],
      },
      {
        id: "g17-step-2",
        title: "步骤 2：门前双敌与外门",
        instruction: "连续击退两名敌人后，打开伏击铁门进入门后区域。",
        coach: "双敌是门前硬前置，必须逐个清掉。",
        success: "门前推进阶段完成。",
        requiredGoalIds: ["g3", "g4", "g5"],
      },
      {
        id: "g17-step-3",
        title: "步骤 3：内闸与信标撤离",
        instruction: "踩踏板打开内闸，回收信标，发送口令并抵达出口。",
        coach: "收尾顺序保持 switch -> signal -> say -> exit。",
        success: "地牢伏击通关。",
        requiredSnippets: [{ snippet: "hero.say(\"ambush clear\")" }],
        requiredGoalIds: ["g6", "g7", "g8", "g9", "g10"],
      },
    ],
    mentor: {
      name: "巡逻教官",
      avatar: "🛡️",
      intro: "别以为开门就结束了。门后还有机关内闸和信标回收，最后还要口令确认。",
      success: "你已经能处理卷轴、双敌、双门机关、信标回收和口令撤离的完整流程。",
    },
    scene: {
      theme: "dungeonScene",
      background: "/code-research/calciumtrice-dungeon/scene-guard-corridor-v2.png",
      sourceWidth: 1600,
      sourceHeight: 900,
      grid: { left: 184, top: 520, width: 1230, height: 0 },
      tokenScale: 1.18,
    },
    mapPosition: { left: 28, top: 32 },
    width: 12,
    height: 7,
    terrain: [
      { id: "ambush-wall-a", kind: "wall", label: "石柱", x: 4, y: 2 },
      { id: "ambush-wall-b", kind: "wall", label: "石柱", x: 4, y: 4 },
      { id: "ambush-hazard", kind: "hazard", label: "火焰裂缝", x: 9, y: 2 },
    ],
    doors: [
      { id: "ambush-door", label: "伏击铁门", requiresItemId: "ambush-key", x: 9, y: 3 },
      { id: "ambush-door-b", label: "伏击内闸", x: 11, y: 3 },
    ],
    switches: [{ id: "ambush-switch", label: "内闸踏板", opensDoorId: "ambush-door-b", x: 10, y: 4 }],
    heroStart: { x: 0, y: 3 },
    exit: { x: 11, y: 3 },
    items: [
      { id: "ambush-scroll", kind: "scroll", label: "伏击卷轴", x: 2, y: 3 },
      { id: "ambush-key", kind: "key", label: "伏击钥匙", x: 6, y: 3 },
      { id: "ambush-coin", kind: "coin", label: "撤离信标", x: 11, y: 4 },
    ],
    enemies: [
      { id: "ambush-guard", label: "伏击守卫", kind: "guard", hp: 1, x: 7, y: 3 },
      { id: "ambush-slime", label: "裂缝黏怪", kind: "slime", hp: 1, x: 8, y: 3 },
    ],
    starterCode: `# 任务：处理地牢伏击
hero.moveRight()
# TODO: 再向右收集卷轴
# TODO: 继续推进到钥匙位置并 collect
# TODO: 连续击退两名敌人，开门后去下层踩踏板解锁内闸
# TODO: 回收信标、发送口令后撤离`,
    solution: `hero.moveRight()
hero.moveRight()
hero.collect()
hero.moveRight()
hero.moveRight()
hero.moveRight()
hero.moveRight()
hero.collect()
hero.attack()
hero.moveRight()
hero.attack()
hero.moveRight()
hero.openDoor()
hero.moveRight()
hero.moveRight()
hero.moveDown()
hero.stepOnSwitch()
hero.moveRight()
hero.collect()
hero.moveUp()
hero.say("ambush clear")`,
    goals: [
      { id: "g1", kind: "collect", targetId: "ambush-scroll", label: "收集伏击卷轴" },
      { id: "g2", kind: "collect", targetId: "ambush-key", label: "收集伏击钥匙" },
      { id: "g3", kind: "defeat", targetId: "ambush-guard", label: "击退伏击守卫" },
      { id: "g4", kind: "defeat", targetId: "ambush-slime", label: "击退裂缝黏怪" },
      { id: "g5", kind: "openDoor", targetId: "ambush-door", label: "打开伏击铁门" },
      { id: "g6", kind: "activateSwitch", targetId: "ambush-switch", label: "触发内闸踏板" },
      { id: "g7", kind: "openDoor", targetId: "ambush-door-b", label: "打开伏击内闸" },
      { id: "g8", kind: "collect", targetId: "ambush-coin", label: "收集撤离信标" },
      { id: "g9", kind: "say", label: "发送撤离口令" },
      { id: "g10", kind: "exit", label: "抵达右侧出口" },
    ],
    hints: [
      "卷轴在起点右边两格，先拿提示再往后推进。",
      "两名敌人在门前连着站，按顺序 attack 两次再开外门。",
      "外门后要先下到踏板格点亮内闸，再回收右侧信标。",
    ],
    briefing: [
      "第一段先收集卷轴并拿到伏击钥匙。",
      "第二段连续击退双敌，打开伏击铁门推进到门后区域。",
      "第三段下探踩亮内闸踏板，回收信标并发送口令撤离。",
    ],
    failureTips: {
      doorKey: "伏击铁门需要先拿到伏击钥匙。",
      switch: "伏击内闸需要先在踏板格执行 stepOnSwitch。",
      enemy: "连续敌人会挡路，请在相邻格逐个 attack。",
      missingGoal: "检查卷轴、钥匙、双敌、双门、踏板、信标、口令和出口是否全部完成。",
    },
    parSteps: 21,
    xpReward: 278,
    coinReward: 88,
  },
  {
    id: "river-fork-18",
    title: "河谷岔路",
    subtitle: "先打通上层支线，再回主路打开双段营地通路",
    description: "把支线的价值再做实：修桥后要先去上层踩板并回收卷轴，再折返主路拿钥匙、清守卫、通过两段营地门，最后带着药剂离场。",
    mapTitle: "河谷营地",
    difficulty: "进阶",
    biome: "river",
    concepts: ["支线回收", "双前置开路", "回路规划", "门后增援处理"],
    toolbox: [
      "hero.build_bridge(\"right\")",
      "hero.step_on_switch()",
      "hero.attack()",
      "hero.open_door()",
      "hero.collect()",
      "hero.say(\"...\")",
    ],
    task: {
      mode: "guided_build",
      title: "支线回收后主线推进",
      summary: "先修桥进入上层支线完成踏板与卷轴回收，再回主路拿钥匙、处理双敌、打开营地内门，收集药剂与情报代币后发送口令撤离。",
      checklist: ["修桥并完成上层支线", "回主路拿钥匙并连续处理双敌", "收集药剂与情报代币并发送口令撤离"],
      requireCodeChange: true,
    },
    tutorialSteps: [
      {
        id: "g18-step-1",
        title: "步骤 1：桥段与上层支线",
        instruction: "先修桥进入上层，触发踏板并回收营地卷轴。",
        coach: "上层支线完成后，主路才会顺畅推进。",
        success: "桥段与支线完成。",
        requiredGoalIds: ["g1", "g2", "g3", "g4"],
      },
      {
        id: "g18-step-2",
        title: "步骤 2：主路钥匙与内门",
        instruction: "回主路收集河谷钥匙，击退守卫并打开营地内门。",
        coach: "内门之前必须先拿钥匙并清掉第一名敌人。",
        success: "主路内门阶段完成。",
        requiredGoalIds: ["g5", "g6", "g8"],
      },
      {
        id: "g18-step-3",
        title: "步骤 3：门后清场与收尾",
        instruction: "处理门后甲虫，回收药剂和情报代币，发送口令并抵达出口。",
        coach: "别漏掉门后增援与双资源回收目标。",
        success: "河谷岔路通关。",
        requiredGoalIds: ["g7", "g9", "g10", "g11", "g12"],
      },
    ],
    mentor: {
      name: "河谷向导",
      avatar: "🌉",
      intro: "上层不是可有可无的岔路。先把那段做干净，再回主路处理内门后的增援和收尾口令。",
      success: "你已经会把上层支线、主路双敌和门后收尾目标接成完整路线了。",
    },
    scene: {
      theme: "dungeonScene",
      background: "/code-research/calciumtrice-dungeon/scene-river-crossing-v1.png",
      sourceWidth: 1600,
      sourceHeight: 900,
      grid: { left: 250, top: 240, width: 1020, height: 430 },
      tokenScale: 1.2,
    },
    mapPosition: { left: 44, top: 40 },
    width: 14,
    height: 7,
    terrain: [
      { id: "fork-water", kind: "water", label: "河谷断桥", x: 3, y: 3 },
      { id: "fork-hazard", kind: "hazard", label: "水雾裂隙", x: 8, y: 2 },
    ],
    bridges: [{ id: "fork-bridge", label: "河谷木桥", requiresItemId: "fork-plank", x: 3, y: 3 }],
    doors: [
      { id: "fork-door-a", label: "营地外门", x: 9, y: 3 },
      { id: "fork-door-b", label: "营地内门", requiresItemId: "fork-key", x: 10, y: 3 },
    ],
    switches: [{ id: "fork-switch", label: "上层踏板", opensDoorId: "fork-door-a", x: 4, y: 1 }],
    heroStart: { x: 0, y: 3 },
    exit: { x: 13, y: 3 },
    items: [
      { id: "fork-plank", kind: "plank", label: "河谷桥板", x: 2, y: 3 },
      { id: "fork-scroll", kind: "scroll", label: "营地卷轴", x: 5, y: 1 },
      { id: "fork-key", kind: "key", label: "河谷钥匙", x: 7, y: 3 },
      { id: "fork-potion", kind: "potion", label: "营地药剂", x: 12, y: 2 },
      { id: "fork-coin", kind: "coin", label: "河谷情报代币", x: 11, y: 1 },
    ],
    enemies: [
      { id: "fork-guard", label: "河谷守卫", kind: "guard", hp: 1, x: 8, y: 3 },
      { id: "fork-bug", label: "河道甲虫", kind: "bug", hp: 1, x: 12, y: 3 },
    ],
    starterCode: `# 任务：先走河谷支线
hero.moveRight()
# TODO: 收集桥板并修桥，进入上层支线
# TODO: 踩亮踏板并回收营地卷轴，再折返主路
# TODO: 拿钥匙、处理双敌、打开营地内门
# TODO: 收集药剂和情报代币，发送口令后撤离`,
    solution: `hero.moveRight()
hero.moveRight()
hero.collect()
hero.buildBridge("right")
hero.moveRight()
hero.moveUp()
hero.moveUp()
hero.moveRight()
hero.stepOnSwitch()
hero.moveRight()
hero.collect()
hero.moveLeft()
hero.moveDown()
hero.moveDown()
hero.moveRight()
hero.moveRight()
hero.moveRight()
hero.collect()
hero.attack()
hero.moveRight()
hero.moveRight()
hero.openDoor()
hero.moveRight()
hero.moveRight()
hero.attack()
hero.moveRight()
hero.moveUp()
hero.collect()
hero.moveLeft()
hero.moveUp()
hero.collect()
hero.moveDown()
hero.moveRight()
hero.moveDown()
hero.say("fork clear")
hero.moveRight()`,
    goals: [
      { id: "g1", kind: "collect", targetId: "fork-plank", label: "收集河谷桥板" },
      { id: "g2", kind: "buildBridge", targetId: "fork-bridge", label: "修复河谷木桥" },
      { id: "g3", kind: "activateSwitch", targetId: "fork-switch", label: "触发上层踏板" },
      { id: "g4", kind: "collect", targetId: "fork-scroll", label: "收集营地卷轴" },
      { id: "g5", kind: "collect", targetId: "fork-key", label: "收集河谷钥匙" },
      { id: "g6", kind: "defeat", targetId: "fork-guard", label: "击退河谷守卫" },
      { id: "g7", kind: "defeat", targetId: "fork-bug", label: "击退河道甲虫" },
      { id: "g8", kind: "openDoor", targetId: "fork-door-b", label: "打开营地内门" },
      { id: "g9", kind: "collect", targetId: "fork-potion", label: "收集营地药剂" },
      { id: "g10", kind: "collect", targetId: "fork-coin", label: "收集河谷情报代币" },
      { id: "g11", kind: "say", label: "发送河谷口令" },
      { id: "g12", kind: "exit", label: "抵达河谷出口" },
    ],
    hints: [
      "上层支线不是只踩一下踏板，还要顺手把卷轴带回来。",
      "营地外门会被踏板提前打开，真正要手动打开的是后面的营地内门。",
      "内门后还有甲虫增援，先清场再去上层收药剂和情报代币。",
    ],
    briefing: [
      "第一段先修桥，转入上层支线触发踏板。",
      "第二段在支线尽头回收营地卷轴，再折返主路收集钥匙。",
      "第三段处理双敌并打开营地内门，再回收药剂和情报代币，发送口令后撤离。",
    ],
    failureTips: {
      bridgeItem: "修桥前要先 collect 河谷桥板。",
      switch: "需要站在踏板格子上再执行 stepOnSwitch。",
      doorKey: "营地内门前先确认河谷钥匙已经到手。",
      enemy: "双敌分布在主路和内门后，先处理守卫再推进到甲虫位置。",
      missingGoal: "请依次核对桥段、卷轴、钥匙、双敌、内门、药剂、代币、口令和出口。",
    },
    parSteps: 31,
    xpReward: 326,
    coinReward: 102,
  },
  {
    id: "ruins-double-scan-19",
    title: "双扫描遗迹",
    subtitle: "scan + repeat + 双支线收集 + 双敌清场",
    description: "把 scan 和 repeat 再往前推一步：先拿钥匙和卷轴，再切到上层收能量代币，随后回主廊处理双敌、开门并带着终端水晶撤离。",
    mapTitle: "网页废墟",
    difficulty: "挑战",
    biome: "ruins",
    concepts: ["scan 观察", "repeat 压缩", "双层战斗顺序"],
    toolbox: ["hero.scan_map()", "for _ in range(n):", "hero.collect()", "hero.attack()", "hero.open_door()"],
    task: {
      mode: "capstone",
      title: "双支线双敌路线",
      summary: "扫描后先用 repeat 拿钥匙和卷轴，再转入上层收代币，回主廊依次处理两名敌人、开门、收集终端水晶并撤离。",
      checklist: ["scan 后完成钥匙、卷轴与代币收集", "依次击退两名敌人并打开石门", "收集终端水晶并抵达出口"],
      requireCodeChange: true,
    },
    tutorialSteps: [
      {
        id: "g19-step-1",
        title: "步骤 1：扫描与主廊双收集",
        instruction: "先扫描，再通过循环推进完成钥匙与卷轴双收集。",
        coach: "先把主廊资源做干净，再考虑战斗段。",
        success: "主廊收集阶段完成。",
        requiredSnippets: [{ snippet: "hero.scan_map()" }],
        requiredGoalIds: ["g1", "g2", "g3"],
      },
      {
        id: "g19-step-2",
        title: "步骤 2：上层代币与首敌",
        instruction: "切上层收能量代币，回主廊击退第一名敌人。",
        coach: "注意先收代币，再进入开门推进节奏。",
        success: "中段推进完成。",
        requiredGoalIds: ["g4", "g5"],
      },
      {
        id: "g19-step-3",
        title: "步骤 3：双敌收尾与撤离",
        instruction: "处理上层哨兵，开门后收终端水晶并抵达出口。",
        coach: "终结段要覆盖 second enemy -> door -> crystal -> exit。",
        success: "双扫描遗迹通关。",
        requiredGoalIds: ["g6", "g7", "g8", "g9"],
      },
    ],
    mentor: {
      name: "侦测导师",
      avatar: "📡",
      intro: "这关要开始真正拆路线了：主廊收集一段、上层代币一段、双敌撤离一段。别把所有动作挤成一团。",
      success: "你已经能把 scan、repeat、上层收集和双敌顺序稳定串起来了。",
    },
    scene: {
      theme: "dungeonScene",
      background: "/code-research/calciumtrice-dungeon/scene-scan-ruins-v1.png",
      sourceWidth: 1600,
      sourceHeight: 900,
      grid: { left: 230, top: 214, width: 1120, height: 432 },
      tokenScale: 1.16,
    },
    mapPosition: { left: 62, top: 44 },
    width: 14,
    height: 8,
    terrain: [
      { id: "double-scan-hazard-a", kind: "hazard", label: "裂隙", x: 5, y: 3 },
      { id: "double-scan-hazard-b", kind: "hazard", label: "裂隙", x: 11, y: 5 },
      { id: "double-scan-wall-a", kind: "wall", label: "遗迹石柱", x: 2, y: 2 },
      { id: "double-scan-wall-b", kind: "wall", label: "遗迹石柱", x: 8, y: 6 },
    ],
    doors: [{ id: "double-scan-door", label: "遗迹石门", requiresItemId: "double-scan-key", x: 11, y: 4 }],
    heroStart: { x: 0, y: 4 },
    exit: { x: 13, y: 2 },
    items: [
      { id: "double-scan-key", kind: "key", label: "侦测钥匙", x: 3, y: 4 },
      { id: "double-scan-scroll", kind: "scroll", label: "调试卷轴", x: 6, y: 4 },
      { id: "double-scan-coin", kind: "coin", label: "能量代币", x: 8, y: 3 },
      { id: "double-scan-crystal", kind: "crystal", label: "终端水晶", x: 12, y: 4 },
    ],
    enemies: [
      { id: "double-scan-bug", label: "遗迹甲虫", kind: "bug", hp: 1, x: 9, y: 4 },
      { id: "double-scan-sentinel", label: "遗迹哨兵", kind: "sentinel", hp: 1, x: 10, y: 3 },
    ],
    starterCode: `# 任务：scan 后按三段路线推进
hero.scan()
# TODO: 用 repeat 拿到钥匙和卷轴
# TODO: 切到上层收能量代币，再回主廊
# TODO: 依次清敌、开门、拿走终端水晶并撤离`,
    solution: `hero.scan()
repeat(3) {
  hero.moveRight()
}
hero.collect()
repeat(3) {
  hero.moveRight()
}
hero.collect()
hero.moveUp()
repeat(2) {
  hero.moveRight()
}
hero.collect()
hero.moveDown()
hero.attack()
hero.moveRight()
hero.moveUp()
hero.attack()
hero.moveRight()
hero.moveDown()
hero.openDoor()
hero.moveRight()
hero.moveRight()
hero.collect()
hero.moveUp()
hero.moveUp()
hero.moveRight()`,
    goals: [
      { id: "g1", kind: "scan", label: "扫描双扫描遗迹" },
      { id: "g2", kind: "collect", targetId: "double-scan-key", label: "收集侦测钥匙" },
      { id: "g3", kind: "collect", targetId: "double-scan-scroll", label: "收集调试卷轴" },
      { id: "g4", kind: "collect", targetId: "double-scan-coin", label: "收集能量代币" },
      { id: "g5", kind: "defeat", targetId: "double-scan-bug", label: "击退遗迹甲虫" },
      { id: "g6", kind: "defeat", targetId: "double-scan-sentinel", label: "击退遗迹哨兵" },
      { id: "g7", kind: "openDoor", targetId: "double-scan-door", label: "打开遗迹石门" },
      { id: "g8", kind: "collect", targetId: "double-scan-crystal", label: "收集终端水晶" },
      { id: "g9", kind: "exit", label: "抵达高台出口" },
    ],
    hints: [
      "先 scan，再把脚本拆成三段：主廊双收集、上层代币、双敌撤离。",
      "拿到卷轴后不是立刻战斗，而是先上去收能量代币。",
      "第二个敌人在上层，处理完第一个后要切到上方再 attack。",
    ],
    briefing: [
      "第一段：scan 后用 repeat 拿到侦测钥匙和调试卷轴。",
      "第二段：切到上层收集能量代币，再回到主廊准备战斗。",
      "第三段：依次清理两名敌人、打开石门、收集终端水晶并撤离到出口。",
    ],
    failureTips: {
      collect: "确认英雄已经站在资源格子上再 collect。",
      doorKey: "遗迹石门需要先拿到侦测钥匙。",
      enemy: "双敌分别在上下两层，不要把两次 attack 写成同一层的直线动作。",
      missingGoal: "本关目标较多，请逐项核对 scan、钥匙、卷轴、代币、双敌、石门、水晶和出口。",
    },
    parSteps: 27,
    xpReward: 298,
    coinReward: 94,
  },
  {
    id: "terminal-override-20",
    title: "终端超控",
    subtitle: "桥、踏板、卷轴、双门、口令确认一体化",
    description: "这是当前版本的重要压轴关之一，需要学生把桥、踏板、支线卷轴、钥匙、双敌、双门、口令和撤离整合成完整脚本。",
    mapTitle: "终端圣殿",
    difficulty: "挑战",
    biome: "dungeon",
    concepts: ["综合流程设计", "双敌目标控制", "双门结果确认"],
    toolbox: [
      "hero.build_bridge(\"right\")",
      "hero.step_on_switch()",
      "hero.collect()",
      "hero.attack()",
      "hero.open_door()",
      "hero.say(\"...\")",
    ],
    task: {
      mode: "capstone",
      title: "完成终端超控流程",
      summary: "先修桥进入核心区踩踏板并回收卷轴，再回主路拿钥匙、清双敌、依次开门、收集晶体、发送口令并撤离。",
      checklist: ["修桥并完成卷轴支线", "双敌清理与双门推进", "口令确认后带晶体撤离"],
      requireCodeChange: true,
    },
    tutorialSteps: [
      {
        id: "g20-step-1",
        title: "步骤 1：桥段与卷轴支线",
        instruction: "收集桥板并修桥，踩踏板后回收终端卷轴。",
        coach: "先完成核心区前置，后面双门段才会稳定。",
        success: "桥段与支线完成。",
        requiredGoalIds: ["g1", "g2", "g3", "g4"],
      },
      {
        id: "g20-step-2",
        title: "步骤 2：主路双敌与双门",
        instruction: "回主路拿钥匙，连续击退两名敌人并依次开门。",
        coach: "双门一定放在钥匙和双敌之后处理。",
        success: "主路推进阶段完成。",
        requiredGoalIds: ["g5", "g6", "g7", "g8", "g9"],
      },
      {
        id: "g20-step-3",
        title: "步骤 3：终端确认撤离",
        instruction: "收集终端晶体，发送口令并抵达出口。",
        coach: "最后的 say 是可审计确认动作，不能省略。",
        success: "终端超控通关。",
        requiredSnippets: [{ snippet: "hero.say(\"override clear\")" }],
        requiredGoalIds: ["g10", "g11", "g12"],
      },
    ],
    mentor: {
      name: "总控导师",
      avatar: "🧭",
      intro: "把大任务拆成四段：修桥、支线卷轴、双敌双门、口令撤离。每一段都要能独立验证。",
      success: "你已经具备把复杂任务写成完整脚本并逐段排查的能力。",
    },
    scene: {
      theme: "dungeonScene",
      background: "/code-research/calciumtrice-dungeon/scene-terminal-temple-v1.png",
      sourceWidth: 1600,
      sourceHeight: 900,
      grid: { left: 214, top: 188, width: 1140, height: 504 },
      tokenScale: 1.18,
    },
    mapPosition: { left: 78, top: 60 },
    width: 16,
    height: 8,
    terrain: [
      { id: "override-water", kind: "water", label: "地下暗河", x: 4, y: 4 },
      { id: "override-hazard", kind: "hazard", label: "能量裂隙", x: 12, y: 2 },
      { id: "override-wall-a", kind: "wall", label: "黑曜石墙", x: 2, y: 1 },
      { id: "override-wall-b", kind: "wall", label: "黑曜石墙", x: 8, y: 6 },
    ],
    bridges: [{ id: "override-bridge", label: "总控木桥", requiresItemId: "override-plank", x: 4, y: 4 }],
    switches: [{ id: "override-switch", label: "超控踏板", opensDoorId: "override-door-a", x: 5, y: 2 }],
    doors: [
      { id: "override-door-a", label: "终端外门", x: 10, y: 4 },
      { id: "override-door-b", label: "终端内门", requiresItemId: "override-key", x: 12, y: 4 },
    ],
    heroStart: { x: 0, y: 4 },
    exit: { x: 15, y: 4 },
    items: [
      { id: "override-plank", kind: "plank", label: "超控桥板", x: 2, y: 4 },
      { id: "override-scroll", kind: "scroll", label: "终端卷轴", x: 7, y: 2 },
      { id: "override-key", kind: "key", label: "超控钥匙", x: 8, y: 4 },
      { id: "override-crystal", kind: "crystal", label: "终端晶体", x: 13, y: 4 },
    ],
    enemies: [
      { id: "override-guard", label: "终端守卫", kind: "guard", hp: 1, x: 9, y: 4 },
      { id: "override-sentinel", label: "终端哨兵", kind: "sentinel", hp: 1, x: 11, y: 4 },
    ],
    starterCode: `# 任务：完成终端超控
hero.moveRight()
# TODO: 收集桥板并修桥，进入核心区踩踏板
# TODO: 顺手回收终端卷轴，再回主路拿钥匙
# TODO: 连续击退两名敌人，依次开门，收集晶体，发送口令并撤离`,
    solution: `hero.moveRight()
hero.moveRight()
hero.collect()
hero.moveRight()
hero.buildBridge("right")
hero.moveRight()
hero.moveRight()
hero.moveUp()
hero.moveUp()
hero.stepOnSwitch()
hero.moveRight()
hero.moveRight()
hero.collect()
hero.moveLeft()
hero.moveLeft()
hero.moveDown()
hero.moveDown()
hero.moveRight()
hero.moveRight()
hero.moveRight()
hero.collect()
hero.attack()
hero.moveRight()
hero.moveRight()
hero.attack()
hero.moveRight()
hero.openDoor()
hero.moveRight()
hero.moveRight()
hero.collect()
hero.say("override clear")
hero.moveRight()
hero.moveRight()`,
    goals: [
      { id: "g1", kind: "collect", targetId: "override-plank", label: "收集超控桥板" },
      { id: "g2", kind: "buildBridge", targetId: "override-bridge", label: "修复总控木桥" },
      { id: "g3", kind: "activateSwitch", targetId: "override-switch", label: "触发超控踏板" },
      { id: "g4", kind: "collect", targetId: "override-scroll", label: "收集终端卷轴" },
      { id: "g5", kind: "collect", targetId: "override-key", label: "收集超控钥匙" },
      { id: "g6", kind: "defeat", targetId: "override-guard", label: "击退终端守卫" },
      { id: "g7", kind: "defeat", targetId: "override-sentinel", label: "击退终端哨兵" },
      { id: "g8", kind: "openDoor", targetId: "override-door-a", label: "打开终端外门" },
      { id: "g9", kind: "openDoor", targetId: "override-door-b", label: "打开终端内门" },
      { id: "g10", kind: "collect", targetId: "override-crystal", label: "收集终端晶体" },
      { id: "g11", kind: "say", label: "发送口令确认" },
      { id: "g12", kind: "exit", label: "抵达终端出口" },
    ],
    hints: [
      "踏板后别立刻折返，右上还有终端卷轴要顺手带走。",
      "外门先被踏板解锁，真正手动开的是后面的终端内门。",
      "第二个敌人在第一道门后，别把两次 attack 写成一条连续贴脸直线。",
    ],
    briefing: [
      "第一段：修桥并触发踏板，顺手回收终端卷轴。",
      "第二段：回主路拿钥匙，连续处理两名敌人并依次开门。",
      "第三段：收集终端晶体，发送口令确认后抵达出口。",
    ],
    failureTips: {
      bridgeItem: "修桥前必须先 collect 超控桥板。",
      switch: "踏板要站在对应格子上再 stepOnSwitch。",
      doorKey: "终端内门需要先拿到超控钥匙。",
      enemy: "第二名敌人不在第一名敌人身后相邻一格，推进后再 attack。",
      missingGoal: "这关是综合流程，请逐项核对桥、踏板、卷轴、双敌、双门、口令和出口。",
    },
    parSteps: 32,
    xpReward: 320,
    coinReward: 100,
  },
  {
    id: "vault-signal-21",
    title: "密库信标",
    subtitle: "卷轴提示、三段防线、双门与口令确认结合",
    description: "密库关卡继续拉长节奏。先写稳卷轴和钥匙收集，再清掉门前双敌、通过外门、处理第二段防线、打开内门，最后带着信标晶体发送口令撤离。",
    mapTitle: "暗影地牢",
    difficulty: "挑战",
    biome: "dungeon",
    concepts: ["顺序控制", "双门推进", "口令确认"],
    toolbox: [
      "hero.move_right()",
      "hero.move_up()",
      "hero.move_down()",
      "hero.collect()",
      "hero.attack()",
      "hero.open_door()",
      "hero.say(\"...\")",
    ],
    task: {
      mode: "capstone",
      title: "完成密库信标流程",
      summary: "先拿卷轴和钥匙，再连续清掉门前双敌、打开密库外门、处理第二段防线、打开内门，最后收集信标晶体并发送口令撤离。",
      checklist: ["收集卷轴与钥匙", "清掉三段防线并通过双门", "收集信标晶体后发送口令离场"],
      requireCodeChange: true,
    },
    tutorialSteps: [
      {
        id: "g21-step-1",
        title: "步骤 1：先做收集前置",
        instruction: "沿主路先收集卷轴和钥匙，确保后续双门推进不会中断。",
        coach: "先把资源前置条件做完，再进入战斗段，脚本会更稳定。",
        success: "卷轴与钥匙都已到手。",
        requiredGoalIds: ["g1", "g2"],
      },
      {
        id: "g21-step-2",
        title: "步骤 2：清双敌并推进双门",
        instruction: "按顺序击退门前守卫与哨兵，开外门后再处理内环甲虫并打开内门。",
        coach: "这段的关键是顺序：双敌 -> 外门 -> 内环敌人 -> 内门。",
        success: "双门前的战斗推进链路完成。",
        requiredGoalIds: ["g3", "g4", "g5", "g6", "g7"],
      },
      {
        id: "g21-step-3",
        title: "步骤 3：终局确认撤离",
        instruction: "收集信标晶体，发送口令，再走到出口完成撤离。",
        coach: "口令是可审计确认点，完成后再离场。",
        success: "密库信标流程完整通关。",
        requiredGoalIds: ["g8", "g9", "g10"],
      },
    ],
    mentor: {
      name: "密库守夜人",
      avatar: "🛡️",
      intro: "把密库拆成四段：收集、门前双敌、门后防线、晶体确认。不要一口气直冲到底。",
      success: "你已经能把多段战斗、双门推进和口令确认稳定串成一条完整脚本。",
    },
    scene: {
      theme: "dungeonScene",
      background: "/code-research/calciumtrice-dungeon/scene-guard-corridor-v2.png",
      sourceWidth: 1600,
      sourceHeight: 900,
      grid: { left: 184, top: 520, width: 1230, height: 0 },
      tokenScale: 1.18,
    },
    mapPosition: { left: 42, top: 24 },
    width: 16,
    height: 7,
    terrain: [
      { id: "vault-wall-a", kind: "wall", label: "密库石柱", x: 4, y: 2 },
      { id: "vault-wall-b", kind: "wall", label: "密库石柱", x: 4, y: 4 },
      { id: "vault-hazard", kind: "hazard", label: "余烬裂缝", x: 11, y: 2 },
    ],
    doors: [
      { id: "vault-door-a", label: "密库外门", requiresItemId: "vault-key", x: 10, y: 3 },
      { id: "vault-door-b", label: "信标内门", x: 13, y: 3 },
    ],
    heroStart: { x: 0, y: 3 },
    exit: { x: 15, y: 3 },
    items: [
      { id: "vault-scroll", kind: "scroll", label: "信标卷轴", x: 2, y: 3 },
      { id: "vault-key", kind: "key", label: "密库钥匙", x: 6, y: 3 },
      { id: "vault-crystal", kind: "crystal", label: "信标晶体", x: 14, y: 2 },
    ],
    enemies: [
      { id: "vault-guard", label: "密库守卫", kind: "guard", hp: 1, x: 7, y: 3 },
      { id: "vault-sentinel", label: "信标哨兵", kind: "sentinel", hp: 1, x: 8, y: 3 },
      { id: "vault-bug", label: "内环甲虫", kind: "bug", hp: 1, x: 12, y: 3 },
    ],
    starterCode: `# 任务：完成密库信标挑战
hero.moveRight()
# TODO: 补全卷轴与钥匙的收集顺序
# TODO: 再连续清掉门前双敌，打开密库外门
# TODO: 处理第二段防线、打开内门、收集晶体并发送口令撤离`,
    solution: `hero.moveRight()
hero.moveRight()
hero.collect()
hero.moveRight()
hero.moveRight()
hero.moveRight()
hero.moveRight()
hero.collect()
hero.attack()
hero.moveRight()
hero.attack()
hero.moveRight()
hero.moveRight()
hero.openDoor()
hero.moveRight()
hero.moveRight()
hero.attack()
hero.moveRight()
hero.openDoor()
hero.moveRight()
hero.moveRight()
hero.moveUp()
hero.collect()
hero.say("vault clear")
hero.moveDown()
hero.moveRight()`,
    goals: [
      { id: "g1", kind: "collect", targetId: "vault-scroll", label: "收集信标卷轴" },
      { id: "g2", kind: "collect", targetId: "vault-key", label: "收集密库钥匙" },
      { id: "g3", kind: "defeat", targetId: "vault-guard", label: "击退密库守卫" },
      { id: "g4", kind: "defeat", targetId: "vault-sentinel", label: "击退信标哨兵" },
      { id: "g5", kind: "openDoor", targetId: "vault-door-a", label: "打开密库外门" },
      { id: "g6", kind: "defeat", targetId: "vault-bug", label: "击退内环甲虫" },
      { id: "g7", kind: "openDoor", targetId: "vault-door-b", label: "打开信标内门" },
      { id: "g8", kind: "collect", targetId: "vault-crystal", label: "收集信标晶体" },
      { id: "g9", kind: "say", label: "发送口令确认" },
      { id: "g10", kind: "exit", label: "抵达密库出口" },
    ],
    hints: [
      "卷轴和钥匙都在主路上，先把收集链写完整。",
      "双敌紧挨着站位，处理方式是 attack -> moveRight -> attack。",
      "外门后还有第二段防线，别把第一道门当成终点。",
      "信标晶体在右上角，收集后再 say 确认并回到主路离开。",
    ],
    briefing: [
      "第一段先收集卷轴和钥匙，建立后续通行条件。",
      "第二段依次击退门前双敌，打开密库外门推进到内环。",
      "第三段清掉内环甲虫、打开内门，收集晶体并发送口令后撤离到出口。",
    ],
    failureTips: {
      doorKey: "密库外门需要先拿到密库钥匙。",
      enemy: "密库敌人分成前后两段，先清主路双敌，再推进到内环甲虫。",
      missingGoal: "检查卷轴、钥匙、三名敌人、双门、晶体和口令是否全部完成。",
    },
    parSteps: 26,
    xpReward: 315,
    coinReward: 98,
  },
  {
    id: "river-switchback-22",
    title: "河谷折返",
    subtitle: "支线卷轴、双门、双敌与药剂高台撤离",
    description: "把折返再往前推进：先修桥去上层踩板并回收卷轴，再回主路拿钥匙、连续清双敌、打开营地内门，最后去高台收药剂并离开。",
    mapTitle: "河谷营地",
    difficulty: "挑战",
    biome: "river",
    concepts: ["折返路线", "双门前置条件", "主支线切换", "门后收尾确认"],
    toolbox: [
      "hero.build_bridge(\"right\")",
      "hero.step_on_switch()",
      "hero.collect()",
      "hero.attack()",
      "hero.open_door()",
      "hero.say(\"...\")",
    ],
    task: {
      mode: "capstone",
      title: "完成河谷折返进阶流程",
      summary: "先修桥进入上层支线完成踏板与卷轴回收，再折返主路拿钥匙、连续击退双敌、打开营地内门，最后处理门后哨兵、收药剂与代币并发送口令离开。",
      checklist: ["修桥并完成上层支线", "折返主路拿钥匙并清理双敌", "处理门后哨兵，收药剂与代币并发送口令离场"],
      requireCodeChange: true,
    },
    tutorialSteps: [
      {
        id: "g22-step-1",
        title: "步骤 1：先完成支线资源",
        instruction: "收桥板、修桥、踩踏板，并在上层回收卷轴后再回主路拿钥匙。",
        coach: "先做支线再回主线，可以减少路径往返错误。",
        success: "桥与支线卷轴阶段完成。",
        requiredGoalIds: ["g1", "g2", "g3", "g4", "g5"],
      },
      {
        id: "g22-step-2",
        title: "步骤 2：主路战斗与内门",
        instruction: "击退双敌后打开河谷内门，并处理门后哨兵。",
        coach: "保持 attack 与推进交替，避免和敌人错位。",
        success: "战斗段与内门推进完成。",
        requiredGoalIds: ["g6", "g7", "g8", "g9"],
      },
      {
        id: "g22-step-3",
        title: "步骤 3：补给收尾",
        instruction: "收集药剂和代币，发送口令后抵达出口。",
        coach: "收尾阶段要检查资源、口令、出口三个目标都完成。",
        success: "河谷折返完整通关。",
        requiredGoalIds: ["g10", "g11", "g12", "g13"],
      },
    ],
    mentor: {
      name: "河谷领航员",
      avatar: "🌊",
      intro: "这关不只是折返，还要记住外门和内门的区别。先把上层支线做干净，再处理门后的收尾目标。",
      success: "你已经会在河谷地图里处理支线、双门、双敌和门后收尾的完整链路了。",
    },
    scene: {
      theme: "dungeonScene",
      background: "/code-research/calciumtrice-dungeon/scene-river-crossing-v1.png",
      sourceWidth: 1600,
      sourceHeight: 900,
      grid: { left: 250, top: 240, width: 1020, height: 430 },
      tokenScale: 1.2,
    },
    mapPosition: { left: 58, top: 28 },
    width: 15,
    height: 7,
    terrain: [
      { id: "switchback-water", kind: "water", label: "河谷断桥", x: 3, y: 3 },
      { id: "switchback-hazard", kind: "hazard", label: "潮雾裂隙", x: 11, y: 2 },
    ],
    bridges: [{ id: "switchback-bridge", label: "河谷木桥", requiresItemId: "switchback-plank", x: 3, y: 3 }],
    doors: [
      { id: "switchback-door-a", label: "河谷外门", x: 9, y: 3 },
      { id: "switchback-door-b", label: "河谷内门", requiresItemId: "switchback-key", x: 11, y: 3 },
    ],
    switches: [{ id: "switchback-switch", label: "上层踏板", opensDoorId: "switchback-door-a", x: 4, y: 1 }],
    heroStart: { x: 0, y: 3 },
    exit: { x: 14, y: 3 },
    items: [
      { id: "switchback-plank", kind: "plank", label: "河谷桥板", x: 2, y: 3 },
      { id: "switchback-scroll", kind: "scroll", label: "河谷卷轴", x: 5, y: 1 },
      { id: "switchback-key", kind: "key", label: "河谷钥匙", x: 6, y: 3 },
      { id: "switchback-potion", kind: "potion", label: "营地药剂", x: 12, y: 2 },
      { id: "switchback-coin", kind: "coin", label: "河谷代币", x: 13, y: 1 },
    ],
    enemies: [
      { id: "switchback-guard", label: "河谷守卫", kind: "guard", hp: 1, x: 8, y: 3 },
      { id: "switchback-bug", label: "巡河甲虫", kind: "bug", hp: 1, x: 10, y: 3 },
      { id: "switchback-sentinel", label: "营地哨兵", kind: "sentinel", hp: 1, x: 12, y: 3 },
    ],
    starterCode: `# 任务：先开支线，再折返主线
hero.moveRight()
# TODO: 收集桥板并修桥去上层踩踏板
# TODO: 顺手回收河谷卷轴，再折返主路拿钥匙
# TODO: 连续处理双敌、打开营地内门
# TODO: 击退门后哨兵，收药剂与代币并发送口令后抵达出口`,
    solution: `hero.moveRight()
hero.moveRight()
hero.collect()
hero.buildBridge("right")
hero.moveRight()
hero.moveUp()
hero.moveUp()
hero.moveRight()
hero.stepOnSwitch()
hero.moveRight()
hero.collect()
hero.moveLeft()
hero.moveDown()
hero.moveDown()
hero.moveRight()
hero.moveRight()
hero.collect()
hero.moveRight()
hero.attack()
hero.moveRight()
hero.moveRight()
hero.attack()
hero.moveRight()
hero.openDoor()
hero.moveRight()
hero.attack()
hero.moveRight()
hero.moveUp()
hero.collect()
hero.moveRight()
hero.moveUp()
hero.collect()
hero.moveDown()
hero.say("switchback clear")
hero.moveRight()
hero.moveDown()`,
    goals: [
      { id: "g1", kind: "collect", targetId: "switchback-plank", label: "收集河谷桥板" },
      { id: "g2", kind: "buildBridge", targetId: "switchback-bridge", label: "修复河谷木桥" },
      { id: "g3", kind: "activateSwitch", targetId: "switchback-switch", label: "触发上层踏板" },
      { id: "g4", kind: "collect", targetId: "switchback-scroll", label: "收集河谷卷轴" },
      { id: "g5", kind: "collect", targetId: "switchback-key", label: "收集河谷钥匙" },
      { id: "g6", kind: "defeat", targetId: "switchback-guard", label: "击退河谷守卫" },
      { id: "g7", kind: "defeat", targetId: "switchback-bug", label: "击退巡河甲虫" },
      { id: "g8", kind: "openDoor", targetId: "switchback-door-b", label: "打开河谷内门" },
      { id: "g9", kind: "defeat", targetId: "switchback-sentinel", label: "击退营地哨兵" },
      { id: "g10", kind: "collect", targetId: "switchback-potion", label: "收集营地药剂" },
      { id: "g11", kind: "collect", targetId: "switchback-coin", label: "收集河谷代币" },
      { id: "g12", kind: "say", label: "发送河谷确认口令" },
      { id: "g13", kind: "exit", label: "抵达河谷出口" },
    ],
    hints: [
      "上层支线不是只踩板，还要把河谷卷轴一并带走。",
      "踏板会先打开河谷外门，真正需要手动打开的是后面的营地内门。",
      "门后还有哨兵把守，先清掉再上高台收药剂和代币。",
    ],
    briefing: [
      "第一段先修桥并转入上层支线，触发踏板并回收河谷卷轴。",
      "第二段折返主路收集河谷钥匙，连续击退两名敌人。",
      "第三段打开营地内门，清理门后哨兵，收药剂与代币后发送口令撤离。",
    ],
    failureTips: {
      bridgeItem: "修桥前要先 collect 河谷桥板。",
      switch: "踏板要站在对应格子上再 stepOnSwitch。",
      doorKey: "打开营地内门前先确认河谷钥匙已经到手。",
      enemy: "门前双敌和门后哨兵要分段处理，别把三次 attack 写在一段直线里。",
      missingGoal: "请依次核对桥段、卷轴、钥匙、三名敌人、营地内门、药剂、代币、口令和出口。",
    },
    parSteps: 34,
    xpReward: 364,
    coinReward: 112,
  },
  {
    id: "ruins-gate-scan-23",
    title: "遗迹门阵",
    subtitle: "scan + repeat + 上层折线 + 双敌 + 高台撤离",
    description: "扫描后不再只是沿着一条横线推进。先用 repeat 拿钥匙，再切入上层折线回收卷轴，回到主廊收代币、连续清双敌、开门并爬上高台撤离。",
    mapTitle: "网页废墟",
    difficulty: "挑战",
    biome: "ruins",
    concepts: ["scan 观察", "repeat 压缩", "折线路径拆解"],
    toolbox: ["hero.scan_map()", "for _ in range(n):", "hero.collect()", "hero.attack()", "hero.open_door()"],
    task: {
      mode: "capstone",
      title: "完成遗迹门阵流程",
      summary: "先 scan 地图，再用 repeat 拿到钥匙并切入上层折线回收卷轴，回主廊拿代币，连续清双敌、开门、带着终端晶体爬上高台撤离。",
      checklist: ["scan 后完成钥匙与上层卷轴收集", "回主廊完成代币与双敌处理", "开门拿晶体并抵达高台出口"],
      requireCodeChange: true,
    },
    tutorialSteps: [
      {
        id: "g23-step-1",
        title: "步骤 1：扫描并完成双收集",
        instruction: "先 scan_map 观察，再完成钥匙与上层卷轴收集。",
        coach: "scan 后再写路线，能显著降低走位错误率。",
        success: "侦测与前置收集阶段完成。",
        requiredGoalIds: ["g1", "g2", "g3"],
      },
      {
        id: "g23-step-2",
        title: "步骤 2：主廊清敌与开门",
        instruction: "回主廊收代币，依次清理双敌并打开遗迹石门。",
        coach: "保持门前顺序：collect -> attack -> attack -> open_door。",
        success: "主廊推进链路完成。",
        requiredGoalIds: ["g4", "g5", "g6", "g7"],
      },
      {
        id: "g23-step-3",
        title: "步骤 3：高台撤离",
        instruction: "上高台收集终端晶体并抵达出口。",
        coach: "门后不要直冲出口，先补全晶体目标。",
        success: "遗迹门阵完整通关。",
        requiredGoalIds: ["g8", "g9"],
      },
    ],
    mentor: {
      name: "侦测导师",
      avatar: "📡",
      intro: "这关要把横向 repeat 和纵向折线一起想清楚。先扫图，再分段写，不要一口气硬冲。",
      success: "你已经能把 scan、repeat 和折线路线组合成完整脚本了。",
    },
    scene: {
      theme: "dungeonScene",
      background: "/code-research/calciumtrice-dungeon/scene-scan-ruins-v1.png",
      sourceWidth: 1600,
      sourceHeight: 900,
      grid: { left: 230, top: 214, width: 1120, height: 432 },
      tokenScale: 1.16,
    },
    mapPosition: { left: 74, top: 30 },
    width: 16,
    height: 8,
    terrain: [
      { id: "gate-scan-hazard-a", kind: "hazard", label: "遗迹裂隙", x: 6, y: 3 },
      { id: "gate-scan-hazard-b", kind: "hazard", label: "遗迹裂隙", x: 12, y: 5 },
      { id: "gate-scan-wall-a", kind: "wall", label: "断裂石柱", x: 3, y: 2 },
      { id: "gate-scan-wall-b", kind: "wall", label: "断裂石柱", x: 10, y: 6 },
    ],
    doors: [{ id: "gate-scan-door", label: "遗迹石门", requiresItemId: "gate-scan-key", x: 13, y: 4 }],
    heroStart: { x: 0, y: 4 },
    exit: { x: 15, y: 2 },
    items: [
      { id: "gate-scan-key", kind: "key", label: "门阵钥匙", x: 4, y: 4 },
      { id: "gate-scan-scroll", kind: "scroll", label: "门阵卷轴", x: 8, y: 3 },
      { id: "gate-scan-coin", kind: "coin", label: "能量代币", x: 10, y: 4 },
      { id: "gate-scan-crystal", kind: "crystal", label: "终端晶体", x: 14, y: 3 },
    ],
    enemies: [
      { id: "gate-scan-bug", label: "门阵甲虫", kind: "bug", hp: 1, x: 11, y: 4 },
      { id: "gate-scan-sentinel", label: "门阵哨兵", kind: "sentinel", hp: 1, x: 12, y: 3 },
    ],
    starterCode: `# 任务：完成遗迹门阵
hero.scan()
# TODO: 用 repeat 拿到门阵钥匙
# TODO: 切入上层折线回收卷轴，再回主廊拿到代币
# TODO: 连续清敌、开门、爬上高台拿晶体并撤离`,
    solution: `hero.scan()
repeat(4) {
  hero.moveRight()
}
hero.collect()
repeat(3) {
  hero.moveRight()
}
hero.moveUp()
hero.moveRight()
hero.collect()
hero.moveDown()
repeat(2) {
  hero.moveRight()
}
hero.collect()
hero.attack()
hero.moveRight()
hero.moveUp()
hero.attack()
hero.moveRight()
hero.moveDown()
hero.openDoor()
hero.moveRight()
hero.moveRight()
hero.moveUp()
hero.collect()
hero.moveUp()
hero.moveRight()`,
    goals: [
      { id: "g1", kind: "scan", label: "扫描遗迹门阵" },
      { id: "g2", kind: "collect", targetId: "gate-scan-key", label: "收集门阵钥匙" },
      { id: "g3", kind: "collect", targetId: "gate-scan-scroll", label: "收集门阵卷轴" },
      { id: "g4", kind: "collect", targetId: "gate-scan-coin", label: "收集能量代币" },
      { id: "g5", kind: "defeat", targetId: "gate-scan-bug", label: "击退门阵甲虫" },
      { id: "g6", kind: "defeat", targetId: "gate-scan-sentinel", label: "击退门阵哨兵" },
      { id: "g7", kind: "openDoor", targetId: "gate-scan-door", label: "打开遗迹石门" },
      { id: "g8", kind: "collect", targetId: "gate-scan-crystal", label: "收集终端晶体" },
      { id: "g9", kind: "exit", label: "抵达高台出口" },
    ],
    hints: [
      "先 scan，再把路线拆成三段：钥匙、上层卷轴、主廊战斗撤离。",
      "卷轴不在主廊上，拿完后要回到下层继续收代币。",
      "石门后别直接平移离场，还要上高台拿晶体再走向出口。",
    ],
    briefing: [
      "第一段 scan 后用 repeat 拿到门阵钥匙。",
      "第二段切到上层折线收集卷轴，再回主廊拿到能量代币。",
      "第三段连续清敌、开门，爬上高台收集晶体并撤离到出口。",
    ],
    failureTips: {
      collect: "确认英雄已经站在目标资源格子上再 collect。",
      doorKey: "遗迹石门需要先拿到门阵钥匙。",
      enemy: "双敌分布在上下两层，处理完第一个后记得切到上层再 attack 第二个。",
      missingGoal: "这关目标较多，请依次核对 scan、钥匙、卷轴、代币、双敌、石门、晶体与出口。",
    },
    parSteps: 28,
    xpReward: 342,
    coinReward: 106,
  },
  {
    id: "temple-full-stack-24",
    title: "圣殿全链",
    subtitle: "桥、支线卷轴、双门、口令与出口完整压轴",
    description: "把桥、踏板、支线卷轴、钥匙、双敌、双门、晶体和口令确认全部串起来，作为当前章节更完整的压轴流程。",
    mapTitle: "终端圣殿",
    difficulty: "挑战",
    biome: "dungeon",
    concepts: ["综合流程设计", "支线与主线拼接", "结果确认"],
    toolbox: [
      "hero.build_bridge(\"right\")",
      "hero.step_on_switch()",
      "hero.collect()",
      "hero.attack()",
      "hero.open_door()",
      "hero.say(\"...\")",
    ],
    task: {
      mode: "capstone",
      title: "完成圣殿全链流程",
      summary: "先修桥进入核心区踩踏板并回收支线卷轴，再回主路拿钥匙、清双敌、依次开门、收集晶体、发送口令并离场。",
      checklist: ["修桥并完成支线卷轴回收", "回主路收集钥匙并连续清双敌", "依次开门、收集晶体并发送口令撤离"],
      requireCodeChange: true,
    },
    tutorialSteps: [
      {
        id: "g24-step-1",
        title: "步骤 1：桥段与支线卷轴",
        instruction: "收集桥板、修桥、踩踏板，并完成圣殿卷轴回收与钥匙收集。",
        coach: "把支线与主线前置都做完，再进入战斗段更稳。",
        success: "桥与支线前置全部完成。",
        requiredGoalIds: ["g1", "g2", "g3", "g4", "g5"],
      },
      {
        id: "g24-step-2",
        title: "步骤 2：双敌与终端门",
        instruction: "连续击退两名敌人，并打开圣殿终端门。",
        coach: "双敌段落保持 attack 与移动交替，避免空打。",
        success: "战斗段与门控段完成。",
        requiredGoalIds: ["g6", "g7", "g8"],
      },
      {
        id: "g24-step-3",
        title: "步骤 3：晶体口令撤离",
        instruction: "收集圣殿晶体，发送口令并到达出口。",
        coach: "终局顺序固定：collect -> say -> exit。",
        success: "圣殿全链完整通关。",
        requiredGoalIds: ["g9", "g10", "g11"],
      },
    ],
    mentor: {
      name: "总控导师",
      avatar: "🧭",
      intro: "把它拆成四段来写：修桥、支线回收、主路战斗、终端确认。越到后面越要检查前置条件。",
      success: "你已经能把复杂章节任务拆成完整、可验证的多段脚本了。",
    },
    scene: {
      theme: "dungeonScene",
      background: "/code-research/calciumtrice-dungeon/scene-terminal-temple-v1.png",
      sourceWidth: 1600,
      sourceHeight: 900,
      grid: { left: 214, top: 188, width: 1140, height: 504 },
      tokenScale: 1.18,
    },
    mapPosition: { left: 86, top: 40, size: "large" },
    width: 16,
    height: 8,
    terrain: [
      { id: "full-stack-water", kind: "water", label: "圣殿暗河", x: 4, y: 4 },
      { id: "full-stack-hazard", kind: "hazard", label: "能量裂隙", x: 13, y: 2 },
      { id: "full-stack-wall-a", kind: "wall", label: "圣殿石壁", x: 2, y: 1 },
      { id: "full-stack-wall-b", kind: "wall", label: "圣殿石壁", x: 9, y: 6 },
    ],
    bridges: [{ id: "full-stack-bridge", label: "圣殿木桥", requiresItemId: "full-stack-plank", x: 4, y: 4 }],
    switches: [{ id: "full-stack-switch", label: "圣殿踏板", opensDoorId: "full-stack-door-a", x: 5, y: 2 }],
    doors: [
      { id: "full-stack-door-a", label: "圣殿外环门", x: 11, y: 4 },
      { id: "full-stack-door-b", label: "圣殿终端门", requiresItemId: "full-stack-key", x: 13, y: 4 },
    ],
    heroStart: { x: 0, y: 4 },
    exit: { x: 15, y: 4 },
    items: [
      { id: "full-stack-plank", kind: "plank", label: "圣殿桥板", x: 2, y: 4 },
      { id: "full-stack-scroll", kind: "scroll", label: "圣殿卷轴", x: 6, y: 2 },
      { id: "full-stack-key", kind: "key", label: "圣殿钥匙", x: 8, y: 4 },
      { id: "full-stack-crystal", kind: "crystal", label: "圣殿晶体", x: 14, y: 4 },
    ],
    enemies: [
      { id: "full-stack-guard", label: "圣殿守卫", kind: "guard", hp: 1, x: 9, y: 4 },
      { id: "full-stack-sentinel", label: "圣殿哨兵", kind: "sentinel", hp: 1, x: 10, y: 4 },
    ],
    starterCode: `# 任务：完成圣殿全链挑战
hero.moveRight()
# TODO: 收集桥板、修桥并进入核心区踩踏板
# TODO: 顺手回收圣殿卷轴，再折返主路拿钥匙
# TODO: 连续清掉双敌，依次开门、收集晶体、发送口令并离场`,
    solution: `hero.moveRight()
hero.moveRight()
hero.collect()
hero.moveRight()
hero.buildBridge("right")
hero.moveRight()
hero.moveRight()
hero.moveUp()
hero.moveUp()
hero.stepOnSwitch()
hero.moveRight()
hero.collect()
hero.moveLeft()
hero.moveDown()
hero.moveDown()
hero.moveRight()
hero.moveRight()
hero.moveRight()
hero.collect()
hero.attack()
hero.moveRight()
hero.attack()
hero.moveRight()
hero.moveRight()
hero.moveRight()
hero.openDoor()
hero.moveRight()
hero.moveRight()
hero.collect()
hero.say("temple clear")
hero.moveRight()`,
    goals: [
      { id: "g1", kind: "collect", targetId: "full-stack-plank", label: "收集圣殿桥板" },
      { id: "g2", kind: "buildBridge", targetId: "full-stack-bridge", label: "修复圣殿木桥" },
      { id: "g3", kind: "activateSwitch", targetId: "full-stack-switch", label: "触发圣殿踏板" },
      { id: "g4", kind: "collect", targetId: "full-stack-scroll", label: "收集圣殿卷轴" },
      { id: "g5", kind: "collect", targetId: "full-stack-key", label: "收集圣殿钥匙" },
      { id: "g6", kind: "defeat", targetId: "full-stack-guard", label: "击退圣殿守卫" },
      { id: "g7", kind: "defeat", targetId: "full-stack-sentinel", label: "击退圣殿哨兵" },
      { id: "g8", kind: "openDoor", targetId: "full-stack-door-b", label: "打开圣殿终端门" },
      { id: "g9", kind: "collect", targetId: "full-stack-crystal", label: "收集圣殿晶体" },
      { id: "g10", kind: "say", label: "发送口令确认" },
      { id: "g11", kind: "exit", label: "抵达圣殿出口" },
    ],
    hints: [
      "踏板不是支线终点，右边还有一份圣殿卷轴要顺手回收。",
      "圣殿外环门会被踏板打开，真正要手动处理的是后面的终端门。",
      "双敌之后先穿过外环门，再站到终端门旁边 openDoor，最后 say 口令撤离。",
    ],
    briefing: [
      "第一段先修桥并触发踏板，打通圣殿外环通路。",
      "第二段在上层顺手回收圣殿卷轴，再折返主路收集钥匙。",
      "第三段连续击退两名敌人、打开终端门，收集晶体后发送口令并抵达出口。",
    ],
    failureTips: {
      bridgeItem: "修桥前必须先 collect 圣殿桥板。",
      switch: "踏板要站在对应格子上再 stepOnSwitch。",
      doorKey: "圣殿终端门需要先拿到圣殿钥匙。",
      enemy: "双敌仍然需要贴近后逐个 attack，不要试图直接撞过去。",
      missingGoal: "这是综合流程关，请逐项核对桥、踏板、卷轴、钥匙、双敌、终端门、晶体、口令和出口。",
    },
    parSteps: 31,
    xpReward: 355,
    coinReward: 110,
  },
  {
    id: "dungeon-warden-25",
    title: "典狱长回廊",
    subtitle: "钥匙、双敌、双门、口令与终点确认",
    description: "地牢章节的压轴回廊不再只是一路直冲。先收集卷轴和钥匙，再连续清理两名守卫，打开外门后切到上层回收信标，最后打开内门并发送口令撤离。",
    mapTitle: "暗影地牢",
    difficulty: "挑战",
    biome: "dungeon",
    concepts: ["长走廊顺序控制", "双门推进", "repeat 压缩路线", "scan 侦测确认"],
    toolbox: [
      "hero.scan_map()",
      "for _ in range(n):",
      "hero.move_right()",
      "hero.collect()",
      "hero.attack()",
      "hero.open_door()",
      "hero.say(\"...\")",
    ],
    task: {
      mode: "capstone",
      title: "完成典狱长走廊压轴流程",
      summary: "先 scan 再把卷轴提示、拿钥匙、连续战斗、双门、上层信标回收、门后增援清理、晶体回收和口令撤离写成完整脚本。",
      checklist: ["scan 后收集卷轴与钥匙", "连续击退守卫并通过双门", "回收信标和晶体，发送口令撤离"],
      requireCodeChange: true,
    },
    tutorialSteps: [
      {
        id: "g25-step-1",
        title: "步骤 1：扫描与主路取物",
        instruction: "先 scan_map，再收卷轴和钥匙，确保双门推进有完整前置。",
        coach: "扫描后先完成资源前置，可以减少中途返工。",
        success: "典狱回廊前置资源已完成。",
        requiredGoalIds: ["g1", "g2", "g3"],
      },
      {
        id: "g25-step-2",
        title: "步骤 2：双敌与双门推进",
        instruction: "击退两名守卫，打开外门并回收信标，再打开内门。",
        coach: "门控目标较多，推荐按目标清单逐条核对。",
        success: "双门与中段推进完成。",
        requiredGoalIds: ["g4", "g5", "g6", "g7", "g8"],
      },
      {
        id: "g25-step-3",
        title: "步骤 3：内环清理与撤离",
        instruction: "击退内环甲虫，收集晶体，发送口令后撤离到出口。",
        coach: "最后一段要同时检查战斗、晶体、口令、出口四个目标。",
        success: "典狱长回廊完整通关。",
        requiredGoalIds: ["g9", "g10", "g11", "g12"],
      },
    ],
    mentor: {
      name: "巡夜教官",
      avatar: "🛡️",
      intro: "先把路线拆成五段：scan、取物、清敌、门后回收、口令撤离。每一段都要能单独核对。",
      success: "你已经能把地牢章节的长流程、双门、门后增援和口令确认稳定写完并验证了。",
    },
    scene: {
      theme: "dungeonScene",
      background: "/code-research/calciumtrice-dungeon/scene-guard-corridor-v2.png",
      sourceWidth: 1600,
      sourceHeight: 900,
      grid: { left: 184, top: 520, width: 1230, height: 0 },
      tokenScale: 1.18,
    },
    mapPosition: { left: 91, top: 24 },
    width: 17,
    height: 7,
    terrain: [
      { id: "warden-wall-a", kind: "wall", label: "回廊石柱", x: 4, y: 2 },
      { id: "warden-wall-b", kind: "wall", label: "回廊石柱", x: 4, y: 4 },
      { id: "warden-hazard-a", kind: "hazard", label: "裂隙火盆", x: 11, y: 2 },
    ],
    doors: [
      { id: "warden-door-a", label: "典狱长外门", requiresItemId: "warden-key", x: 11, y: 3 },
      { id: "warden-door-b", label: "典狱长内门", x: 14, y: 3 },
    ],
    heroStart: { x: 0, y: 3 },
    exit: { x: 16, y: 3 },
    items: [
      { id: "warden-scroll", kind: "scroll", label: "巡视卷轴", x: 2, y: 3 },
      { id: "warden-key", kind: "key", label: "典狱长钥匙", x: 7, y: 3 },
      { id: "warden-coin", kind: "coin", label: "撤离信标", x: 13, y: 2 },
      { id: "warden-crystal", kind: "crystal", label: "典狱晶体", x: 15, y: 2 },
    ],
    enemies: [
      { id: "warden-guard-a", label: "走廊守卫", kind: "guard", hp: 1, x: 8, y: 3 },
      { id: "warden-guard-b", label: "典狱长亲卫", kind: "sentinel", hp: 1, x: 9, y: 3 },
      { id: "warden-bug", label: "内环甲虫", kind: "bug", hp: 1, x: 15, y: 3 },
    ],
    starterCode: `# 任务：完成典狱长回廊
hero.scan()
# TODO: 收集卷轴并继续拿到钥匙
# TODO: 连续击退两名守卫并通过外门
# TODO: 回收信标、打开内门、处理内环甲虫并带走典狱晶体
# TODO: 发送口令确认后离场`,
    solution: `hero.scan()
hero.moveRight()
hero.moveRight()
hero.collect()
repeat(5) {
  hero.moveRight()
}
hero.collect()
hero.attack()
hero.moveRight()
hero.attack()
hero.moveRight()
hero.moveRight()
hero.openDoor()
hero.moveRight()
hero.moveRight()
hero.moveUp()
hero.moveRight()
hero.collect()
hero.moveDown()
hero.openDoor()
hero.moveRight()
hero.attack()
hero.moveRight()
hero.moveUp()
hero.collect()
hero.moveDown()
hero.say("corridor clear")
hero.moveRight()`,
    goals: [
      { id: "g1", kind: "scan", label: "扫描典狱长回廊" },
      { id: "g2", kind: "collect", targetId: "warden-scroll", label: "收集巡视卷轴" },
      { id: "g3", kind: "collect", targetId: "warden-key", label: "收集典狱长钥匙" },
      { id: "g4", kind: "defeat", targetId: "warden-guard-a", label: "击退走廊守卫" },
      { id: "g5", kind: "defeat", targetId: "warden-guard-b", label: "击退典狱长亲卫" },
      { id: "g6", kind: "openDoor", targetId: "warden-door-a", label: "打开典狱长外门" },
      { id: "g7", kind: "collect", targetId: "warden-coin", label: "收集撤离信标" },
      { id: "g8", kind: "openDoor", targetId: "warden-door-b", label: "打开典狱长内门" },
      { id: "g9", kind: "defeat", targetId: "warden-bug", label: "击退内环甲虫" },
      { id: "g10", kind: "collect", targetId: "warden-crystal", label: "收集典狱晶体" },
      { id: "g11", kind: "say", label: "发送口令确认" },
      { id: "g12", kind: "exit", label: "抵达走廊出口" },
    ],
    hints: [
      "先 scan 再推进，后续每段目标会更清楚。",
      "卷轴和钥匙都在主走廊上，先完成取物再进入战斗段。",
      "双敌连续站位时，顺序仍然是 attack -> moveRight -> attack。",
      "外门后别急着直冲，右上先回收撤离信标，再回主路开内门。",
      "内门后还有一名甲虫守着晶体，处理后再 say 口令确认。",
    ],
    briefing: [
      "第一段先 scan，再收集卷轴并继续向右拿到典狱长钥匙。",
      "第二段依次击退两名守卫，推进到典狱长外门前完成开门。",
      "第三段切到上层回收信标，再回主路打开内门。",
      "第四段处理内环甲虫，收集典狱晶体并发送口令撤离。",
    ],
    failureTips: {
      scan: "建议先 scan，再按阶段推进能更稳。",
      doorKey: "典狱长外门需要先拿到典狱长钥匙。",
      enemy: "双敌和内环甲虫都需要保持相邻格逐个 attack。",
      missingGoal: "检查 scan、卷轴、钥匙、双敌、双门、信标、晶体和口令是否都完成。",
    },
    parSteps: 28,
    xpReward: 378,
    coinReward: 116,
  },
  {
    id: "river-relay-26",
    title: "河谷接力线",
    subtitle: "修桥、卷轴、双门与补给高台回收",
    description: "这一关让河谷章节真正进入多阶段路线。先修桥去上层触发机关并回收卷轴，再回主线拿钥匙、处理守卫、依次开门并去高台带走补给。",
    mapTitle: "河谷营地",
    difficulty: "挑战",
    biome: "river",
    concepts: ["支线先行", "桥与踏板联动", "双门前后的顺序校对"],
    toolbox: ["hero.build_bridge(\"right\")", "hero.step_on_switch()", "hero.collect()", "hero.attack()", "hero.open_door()"],
    task: {
      mode: "capstone",
      title: "完成河谷接力流程",
      summary: "把修桥、踩踏板、拿卷轴、拿钥匙、清敌、依次开门和收集补给写成一条稳定的接力脚本。",
      checklist: ["修桥并完成卷轴支线", "收集钥匙并击退守卫", "依次打开双门收集补给后撤离"],
      requireCodeChange: true,
    },
    tutorialSteps: [
      {
        id: "g26-step-1",
        title: "步骤 1：桥段与卷轴支线",
        instruction: "收桥板并修桥，上高台踩踏板后回收接力卷轴，再回主路拿钥匙。",
        coach: "这关重点是支线先行，避免把钥匙和卷轴步骤打乱。",
        success: "桥段与支线目标完成。",
        requiredGoalIds: ["g1", "g2", "g3", "g4", "g5"],
      },
      {
        id: "g26-step-2",
        title: "步骤 2：主路守卫与双门",
        instruction: "击退守卫后，依次打开外侧石门和营地闸门。",
        coach: "双门是连续门控，顺序错误会导致后续路径被阻断。",
        success: "主路门控推进完成。",
        requiredGoalIds: ["g6", "g7", "g8"],
      },
      {
        id: "g26-step-3",
        title: "步骤 3：补给收尾与离场",
        instruction: "收集营地补给并抵达出口。",
        coach: "收尾阶段要确认补给没有漏拿。",
        success: "河谷接力线完整通关。",
        requiredGoalIds: ["g9", "g10"],
      },
    ],
    mentor: {
      name: "河谷向导",
      avatar: "🌊",
      intro: "这关最容易错的是把支线卷轴和主线钥匙混在一起。先把上层做干净，再回来推进。",
      success: "你已经能把河谷章节的多段机关与补给回收路线串起来了。",
    },
    scene: {
      theme: "dungeonScene",
      background: "/code-research/calciumtrice-dungeon/scene-river-crossing-v1.png",
      sourceWidth: 1600,
      sourceHeight: 900,
      grid: { left: 250, top: 240, width: 1020, height: 430 },
      tokenScale: 1.2,
    },
    mapPosition: { left: 92, top: 54 },
    width: 15,
    height: 7,
    terrain: [
      { id: "relay-water", kind: "water", label: "河谷断桥", x: 3, y: 3 },
      { id: "relay-hazard-a", kind: "hazard", label: "溅流水坑", x: 10, y: 2 },
    ],
    bridges: [{ id: "relay-bridge", label: "河谷木桥", requiresItemId: "relay-plank", x: 3, y: 3 }],
    switches: [{ id: "relay-switch", label: "高台踏板", opensDoorId: "relay-door-a", x: 3, y: 1 }],
    doors: [
      { id: "relay-door-a", label: "外侧石门", x: 9, y: 3 },
      { id: "relay-door-b", label: "营地闸门", requiresItemId: "relay-key", x: 11, y: 3 },
    ],
    heroStart: { x: 0, y: 3 },
    exit: { x: 14, y: 3 },
    items: [
      { id: "relay-plank", kind: "plank", label: "接力桥板", x: 2, y: 3 },
      { id: "relay-scroll", kind: "scroll", label: "接力卷轴", x: 4, y: 1 },
      { id: "relay-key", kind: "key", label: "营地钥匙", x: 7, y: 3 },
      { id: "relay-potion", kind: "potion", label: "营地补给", x: 12, y: 2 },
    ],
    enemies: [{ id: "relay-guard", label: "河谷守卫", kind: "guard", hp: 1, x: 8, y: 3 }],
    starterCode: `# 任务：完成河谷接力线
hero.moveRight()
# TODO: 收集桥板并修桥
# TODO: 去上层触发踏板并回收接力卷轴
# TODO: 回主线拿钥匙、击退守卫、依次开门并去高台拿走补给`,
    solution: `hero.moveRight()
hero.moveRight()
hero.collect()
hero.buildBridge("right")
hero.moveRight()
hero.moveUp()
hero.moveUp()
hero.stepOnSwitch()
hero.moveRight()
hero.collect()
hero.moveDown()
hero.moveDown()
repeat(3) {
  hero.moveRight()
}
hero.collect()
hero.attack()
hero.moveRight()
hero.moveRight()
hero.moveRight()
hero.openDoor()
hero.moveRight()
hero.moveUp()
hero.moveRight()
hero.collect()
hero.moveDown()
hero.moveRight()
hero.moveRight()`,
    goals: [
      { id: "g1", kind: "collect", targetId: "relay-plank", label: "收集接力桥板" },
      { id: "g2", kind: "buildBridge", targetId: "relay-bridge", label: "修复河谷木桥" },
      { id: "g3", kind: "activateSwitch", targetId: "relay-switch", label: "触发高台踏板" },
      { id: "g4", kind: "collect", targetId: "relay-scroll", label: "收集接力卷轴" },
      { id: "g5", kind: "collect", targetId: "relay-key", label: "收集营地钥匙" },
      { id: "g6", kind: "defeat", targetId: "relay-guard", label: "击退河谷守卫" },
      { id: "g7", kind: "openDoor", targetId: "relay-door-a", label: "打开外侧石门" },
      { id: "g8", kind: "openDoor", targetId: "relay-door-b", label: "打开营地闸门" },
      { id: "g9", kind: "collect", targetId: "relay-potion", label: "收集营地补给" },
      { id: "g10", kind: "exit", label: "抵达河谷出口" },
    ],
    hints: [
      "第一道门靠踏板打开，第二道门还需要钥匙，所以两段条件不同。",
      "高台支线不只是踩板，接力卷轴也要带走。",
      "补给在第二道门后的高台，不是主廊直线就能拿到。",
    ],
    briefing: [
      "第一段先收集桥板、修桥并上高台触发踏板，顺手拿到接力卷轴。",
      "第二段回到主线，收集营地钥匙并击退守卫。",
      "第三段依次打开两道门，去高台收集补给后抵达出口。",
    ],
    failureTips: {
      bridgeItem: "修桥前要先 collect 接力桥板。",
      switch: "高台踏板必须站在对应格子上再 stepOnSwitch。",
      doorKey: "营地闸门需要先拿到营地钥匙。",
      missingGoal: "检查桥、踏板、卷轴、钥匙、守卫、双门和补给是否全部完成。",
    },
    parSteps: 27,
    xpReward: 382,
    coinReward: 116,
  },
  {
    id: "ruins-weave-27",
    title: "遗迹织网",
    subtitle: "scan、repeat、折线资源与双层双敌压轴",
    description: "遗迹章节继续强化先观察后编码。先 scan，再用 repeat 压缩位移，切入上层收集折线资源、清理双层双敌、开门并撤离到高台。",
    mapTitle: "网页废墟",
    difficulty: "挑战",
    biome: "ruins",
    concepts: ["scan 先行", "repeat 压缩路线", "双层资源敌人校对", "终局口令确认"],
    toolbox: ["hero.scan_map()", "for _ in range(n):", "hero.collect()", "hero.attack()", "hero.open_door()", "hero.say(\"...\")"],
    task: {
      mode: "capstone",
      title: "完成遗迹织网流程",
      summary: "利用 scan 和 repeat 把长路径压缩出来，再完成折线双收集、双层双战斗、开门、晶体与药剂回收，最后发送口令撤离。",
      checklist: ["scan 后完成三次资源收集", "依次击退双层三名敌人并开门", "回收晶体与药剂，发送口令后抵达高台出口"],
      requireCodeChange: true,
    },
    tutorialSteps: [
      {
        id: "g27-step-1",
        title: "步骤 1：扫描与三资源收集",
        instruction: "先 scan_map，再按主廊与上层折线完成钥匙、卷轴、代币收集。",
        coach: "把长路径拆成两段（主廊 + 上层）更容易调试。",
        success: "前置资源阶段完成。",
        requiredGoalIds: ["g1", "g2", "g3", "g4"],
      },
      {
        id: "g27-step-2",
        title: "步骤 2：双层清敌与开门",
        instruction: "依次击退甲虫和哨兵，然后打开织网石门。",
        coach: "门前清敌顺序要稳定，不要跳过上层敌人。",
        success: "门控前战斗链路完成。",
        requiredGoalIds: ["g5", "g6", "g7"],
      },
      {
        id: "g27-step-3",
        title: "步骤 3：终局口令撤离",
        instruction: "收集晶体、击退黏怪、收药剂并发送口令后离场。",
        coach: "终局目标多，建议执行后对照 checklist 逐项核对。",
        success: "遗迹织网完整通关。",
        requiredGoalIds: ["g8", "g9", "g10", "g11", "g12"],
      },
    ],
    mentor: {
      name: "侦测导师",
      avatar: "🧭",
      intro: "这关不是比谁先跑，而是比谁先看清楚地图再写脚本。先拆主廊，再拆上层折线，最后做终局口令确认。",
      success: "你已经能稳定使用 scan、repeat 和终局口令确认驱动多层次遗迹任务了。",
    },
    scene: {
      theme: "dungeonScene",
      background: "/code-research/calciumtrice-dungeon/scene-scan-ruins-v1.png",
      sourceWidth: 1600,
      sourceHeight: 900,
      grid: { left: 230, top: 214, width: 1120, height: 432 },
      tokenScale: 1.16,
    },
    mapPosition: { left: 89, top: 26 },
    width: 16,
    height: 8,
    terrain: [
      { id: "weave-hazard-a", kind: "hazard", label: "遗迹裂隙", x: 6, y: 3 },
      { id: "weave-hazard-b", kind: "hazard", label: "遗迹裂隙", x: 13, y: 5 },
      { id: "weave-wall-a", kind: "wall", label: "断裂石柱", x: 3, y: 2 },
      { id: "weave-wall-b", kind: "wall", label: "断裂石柱", x: 11, y: 6 },
    ],
    doors: [{ id: "weave-door", label: "织网石门", requiresItemId: "weave-key", x: 13, y: 4 }],
    heroStart: { x: 0, y: 4 },
    exit: { x: 15, y: 2 },
    items: [
      { id: "weave-key", kind: "key", label: "织网钥匙", x: 4, y: 4 },
      { id: "weave-scroll", kind: "scroll", label: "织网卷轴", x: 8, y: 3 },
      { id: "weave-coin", kind: "coin", label: "能量代币", x: 10, y: 4 },
      { id: "weave-crystal", kind: "crystal", label: "遗迹晶体", x: 14, y: 3 },
      { id: "weave-potion", kind: "potion", label: "遗迹药剂", x: 14, y: 1 },
    ],
    enemies: [
      { id: "weave-bug", label: "遗迹甲虫", kind: "bug", hp: 1, x: 11, y: 4 },
      { id: "weave-sentinel", label: "遗迹哨兵", kind: "sentinel", hp: 1, x: 12, y: 3 },
      { id: "weave-slime", label: "遗迹黏怪", kind: "slime", hp: 1, x: 14, y: 2 },
    ],
    starterCode: `# 任务：完成遗迹织网
hero.scan()
# TODO: 用 repeat 收集织网钥匙
# TODO: 切到上层收集织网卷轴，再回主廊拿代币
# TODO: 依次清敌、开门、收集晶体与药剂
# TODO: 发送口令后撤离到高台`,
    solution: `hero.scan()
repeat(4) {
  hero.moveRight()
}
hero.collect()
repeat(3) {
  hero.moveRight()
}
hero.moveUp()
hero.moveRight()
hero.collect()
hero.moveDown()
hero.moveRight()
hero.moveRight()
hero.collect()
hero.attack()
hero.moveRight()
hero.moveUp()
hero.attack()
hero.moveRight()
hero.moveDown()
hero.openDoor()
hero.moveRight()
hero.moveUp()
hero.moveRight()
hero.collect()
hero.attack()
hero.moveUp()
hero.moveUp()
hero.collect()
hero.moveDown()
hero.say("weave clear")
hero.moveRight()`,
    goals: [
      { id: "g1", kind: "scan", label: "扫描遗迹织网" },
      { id: "g2", kind: "collect", targetId: "weave-key", label: "收集织网钥匙" },
      { id: "g3", kind: "collect", targetId: "weave-scroll", label: "收集织网卷轴" },
      { id: "g4", kind: "collect", targetId: "weave-coin", label: "收集能量代币" },
      { id: "g5", kind: "defeat", targetId: "weave-bug", label: "击退遗迹甲虫" },
      { id: "g6", kind: "defeat", targetId: "weave-sentinel", label: "击退遗迹哨兵" },
      { id: "g7", kind: "openDoor", targetId: "weave-door", label: "打开织网石门" },
      { id: "g8", kind: "collect", targetId: "weave-crystal", label: "收集遗迹晶体" },
      { id: "g9", kind: "defeat", targetId: "weave-slime", label: "击退遗迹黏怪" },
      { id: "g10", kind: "collect", targetId: "weave-potion", label: "收集遗迹药剂" },
      { id: "g11", kind: "say", label: "发送织网口令" },
      { id: "g12", kind: "exit", label: "抵达高台出口" },
    ],
    hints: [
      "先 scan，再写 repeat，这样更容易把主廊和上层两段位移拆清楚。",
      "卷轴不在主廊上，拿完后还要回到下层继续推进到代币。",
      "第二个敌人在上层，保持 attack -> moveRight -> moveUp -> attack 的节奏。",
      "晶体后还有一只黏怪守着药剂，清掉后再 say 口令撤离。",
    ],
    briefing: [
      "第一段 scan 后用 repeat 拿到织网钥匙。",
      "第二段切到上层收集织网卷轴，再回主廊拿到能量代币。",
      "第三段依次清敌、开门、收集晶体与药剂，发送口令后撤离到高台出口。",
    ],
    failureTips: {
      collect: "确认英雄已经站在目标资源格子上再 collect。",
      doorKey: "织网石门需要先收集织网钥匙。",
      enemy: "第三个敌人在晶体上方，别漏掉门后黏怪的清理。",
      missingGoal: "逐项检查 scan、四次收集、三次战斗、石门、口令和出口是否都完成。",
    },
    parSteps: 31,
    xpReward: 425,
    coinReward: 128,
  },
  {
    id: "temple-omega-28",
    title: "圣殿终曲",
    subtitle: "全链路压轴：修桥、卷轴、双门、双敌、口令",
    description: "这是当前 Code Research 章节线的总压轴。你需要把修桥、踏板、支线卷轴、钥匙、连续战斗、双门、终端晶体和口令确认整合成一套完整流程。",
    mapTitle: "终端圣殿",
    difficulty: "挑战",
    biome: "dungeon",
    concepts: ["完整流程拆段", "双门双敌校对", "支线与终局验证"],
    toolbox: [
      "hero.build_bridge(\"right\")",
      "hero.step_on_switch()",
      "for _ in range(n):",
      "hero.collect()",
      "hero.attack()",
      "hero.open_door()",
      "hero.say(\"...\")",
    ],
    task: {
      mode: "capstone",
      title: "完成圣殿终曲脚本",
      summary: "先修桥去核心区踩下踏板并回收卷轴，再回主线拿钥匙、连续清敌、依次开门、上高台拿走终端晶体并发送口令离场。",
      checklist: ["修桥并完成卷轴支线", "收集钥匙并连续击退双敌", "依次打开双门、拿晶体并发送口令撤离"],
      requireCodeChange: true,
    },
    tutorialSteps: [
      {
        id: "g28-step-1",
        title: "步骤 1：桥段与外环卷轴",
        instruction: "收桥板、修桥、踩踏板，并在外环回收卷轴后回主线拿钥匙。",
        coach: "前置目标多，先把桥和卷轴支线做完整再战斗。",
        success: "前置支线阶段完成。",
        requiredGoalIds: ["g1", "g2", "g3", "g4", "g5"],
      },
      {
        id: "g28-step-2",
        title: "步骤 2：双敌与双门",
        instruction: "连续击退双敌，依次打开外环石门与终端闸门。",
        coach: "终曲关强调顺序稳定，双门必须在双敌后推进。",
        success: "主路门控战斗阶段完成。",
        requiredGoalIds: ["g6", "g7", "g8", "g9"],
      },
      {
        id: "g28-step-3",
        title: "步骤 3：终端确认离场",
        instruction: "收集终端晶体，发送口令并抵达出口。",
        coach: "终局要同时完成晶体、口令和出口，缺一不可。",
        success: "圣殿终曲完整通关。",
        requiredGoalIds: ["g10", "g11", "g12"],
      },
    ],
    mentor: {
      name: "总控导师",
      avatar: "🏛️",
      intro: "把它当作一次完整通关演练。现在不只是桥和双门，你还要把支线卷轴和终局确认都拆成独立阶段。",
      success: "你已经把当前章节链路推进到了真正的完整压轴关。",
    },
    scene: {
      theme: "dungeonScene",
      background: "/code-research/calciumtrice-dungeon/scene-terminal-temple-v1.png",
      sourceWidth: 1600,
      sourceHeight: 900,
      grid: { left: 214, top: 188, width: 1140, height: 504 },
      tokenScale: 1.18,
    },
    mapPosition: { left: 90, top: 20, size: "large" },
    width: 17,
    height: 8,
    terrain: [
      { id: "omega-water", kind: "water", label: "圣殿暗河", x: 4, y: 4 },
      { id: "omega-hazard", kind: "hazard", label: "能量裂隙", x: 14, y: 2 },
      { id: "omega-wall-a", kind: "wall", label: "圣殿石壁", x: 2, y: 1 },
      { id: "omega-wall-b", kind: "wall", label: "圣殿石壁", x: 11, y: 6 },
    ],
    bridges: [{ id: "omega-bridge", label: "圣殿木桥", requiresItemId: "omega-plank", x: 4, y: 4 }],
    switches: [{ id: "omega-switch", label: "圣殿踏板", opensDoorId: "omega-door-a", x: 5, y: 2 }],
    doors: [
      { id: "omega-door-a", label: "外环石门", x: 11, y: 4 },
      { id: "omega-door-b", label: "终端闸门", requiresItemId: "omega-key", x: 13, y: 4 },
    ],
    heroStart: { x: 0, y: 4 },
    exit: { x: 16, y: 4 },
    items: [
      { id: "omega-plank", kind: "plank", label: "圣殿桥板", x: 2, y: 4 },
      { id: "omega-scroll", kind: "scroll", label: "外环卷轴", x: 7, y: 2 },
      { id: "omega-key", kind: "key", label: "终端钥匙", x: 8, y: 4 },
      { id: "omega-crystal", kind: "crystal", label: "终端晶体", x: 14, y: 3 },
    ],
    enemies: [
      { id: "omega-guard", label: "圣殿守卫", kind: "guard", hp: 1, x: 9, y: 4 },
      { id: "omega-sentinel", label: "终端哨兵", kind: "sentinel", hp: 1, x: 10, y: 4 },
    ],
    starterCode: `# 任务：完成圣殿终曲
hero.moveRight()
# TODO: 收集桥板、修桥并去核心区踩踏板
# TODO: 顺手回收外环卷轴，再回主线收集终端钥匙
# TODO: 连续清理双敌，依次打开双门，上高台收集终端晶体并发送口令离场`,
    solution: `hero.moveRight()
hero.moveRight()
hero.collect()
hero.moveRight()
hero.buildBridge("right")
hero.moveRight()
hero.moveRight()
hero.moveUp()
hero.moveUp()
hero.stepOnSwitch()
hero.moveRight()
hero.moveRight()
hero.collect()
hero.moveLeft()
hero.moveLeft()
hero.moveDown()
hero.moveDown()
repeat(3) {
  hero.moveRight()
}
hero.collect()
hero.attack()
hero.moveRight()
hero.attack()
hero.moveRight()
hero.moveRight()
hero.moveRight()
hero.openDoor()
hero.moveRight()
hero.moveUp()
hero.moveRight()
hero.collect()
hero.say("omega clear")
hero.moveDown()
hero.moveRight()
hero.moveRight()`,
    goals: [
      { id: "g1", kind: "collect", targetId: "omega-plank", label: "收集圣殿桥板" },
      { id: "g2", kind: "buildBridge", targetId: "omega-bridge", label: "修复圣殿木桥" },
      { id: "g3", kind: "activateSwitch", targetId: "omega-switch", label: "触发圣殿踏板" },
      { id: "g4", kind: "collect", targetId: "omega-scroll", label: "收集外环卷轴" },
      { id: "g5", kind: "collect", targetId: "omega-key", label: "收集终端钥匙" },
      { id: "g6", kind: "defeat", targetId: "omega-guard", label: "击退圣殿守卫" },
      { id: "g7", kind: "defeat", targetId: "omega-sentinel", label: "击退终端哨兵" },
      { id: "g8", kind: "openDoor", targetId: "omega-door-a", label: "打开外环石门" },
      { id: "g9", kind: "openDoor", targetId: "omega-door-b", label: "打开终端闸门" },
      { id: "g10", kind: "collect", targetId: "omega-crystal", label: "收集终端晶体" },
      { id: "g11", kind: "say", label: "发送终局口令" },
      { id: "g12", kind: "exit", label: "抵达圣殿出口" },
    ],
    hints: [
      "踏板之后别直接折返，右侧的外环卷轴也要顺手回收。",
      "外环门由踏板打开，真正需要手动处理的是后面的终端闸门。",
      "终端晶体在上层，不是拿到第二道门后就能直线冲到出口。",
    ],
    briefing: [
      "第一段先收集桥板、修桥并进入核心区触发踏板。",
      "第二段在外环支线回收卷轴，再折返主线收集终端钥匙。",
      "第三段连续击退双敌、依次打开双门，上高台收集终端晶体并发送口令撤离。",
    ],
    failureTips: {
      bridgeItem: "修桥前必须先 collect 圣殿桥板。",
      switch: "踏板要站在对应格子上再 stepOnSwitch。",
      doorKey: "终端闸门需要先收集终端钥匙。",
      enemy: "双敌连续挡路时，要保持相邻格逐个 attack，别试图直接冲过去。",
      missingGoal: "这是完整压轴流程，请逐项检查桥、踏板、卷轴、钥匙、双敌、双门、晶体、口令和出口。",
    },
    parSteps: 35,
    xpReward: 418,
    coinReward: 126,
  },
  {
    id: "python-branch-29",
    title: "Python Branch Relay",
    subtitle: "Use variables and if-blocks to gate actions",
    description:
      "This level trains Python-style branching flow. Collect the route key and rune scroll, clear the sentinel, then use a boolean flag to unlock the final gate sequence.",
    mapTitle: "缁堢鍦ｆ",
    difficulty: "挑战",
    biome: "dungeon",
    concepts: ["python variable", "if else branch", "route sequencing"],
    toolbox: [
      "has_key = True",
      "if has_key:",
      "for _ in range(n):",
      "hero.move_right()",
      "hero.collect()",
      "hero.attack()",
      "hero.open_door()",
      "hero.say(\"...\")",
    ],
    task: {
      mode: "guided_build",
      title: "Build the branch route script",
      summary:
        "Take key and scroll first, then clear the guard lane. Use `has_key` and an `if` block to open the gate before exit.",
      checklist: [
        "collect branch key and rune scroll",
        "defeat the sentinel before the gate",
        "use if has_key to open_door and finish exit",
      ],
      requireCodeChange: true,
    },
    tutorialSteps: [
      {
        id: "branch-step-1",
        title: "Step 1: reach the first two resources",
        instruction: "Use `for _ in range(2):` and then `for _ in range(3):` to reach key and scroll efficiently.",
        coach: "This is still movement planning, but now route compression matters for readability.",
        success: "Core lane movement is compact and readable.",
        requiredSnippets: [
          { snippet: "for _ in range(2):" },
          { snippet: "for _ in range(3):" },
        ],
        requiredGoalIds: ["g1", "g2"],
      },
      {
        id: "branch-step-2",
        title: "Step 2: clear guard and collect coin",
        instruction: "Stand adjacent to the sentinel before `hero.attack()`, then advance to collect the energy coin.",
        coach: "Attack is an adjacent action, not a movement command.",
        success: "Guard lane is now open and coin is secured.",
        requiredCommands: [
          { type: "attack", count: 1 },
          { type: "collect", count: 3 },
        ],
        requiredGoalIds: ["g3", "g4"],
      },
      {
        id: "branch-step-3",
        title: "Step 3: finish with Python branch",
        instruction: "Create `has_key = True` and open the door inside `if has_key:` before the final exit.",
        coach: "The branch block makes the key-condition explicit and closer to real Python code style.",
        success: "Branch logic and final exit are both complete.",
        requiredSnippets: [
          { snippet: "has_key = True" },
          { snippet: "if has_key:\n    hero.open_door()" },
        ],
        requiredGoalIds: ["g5", "g6", "g7"],
      },
    ],
    mentor: {
      name: "Branch Mentor",
      avatar: "🧪",
      intro: "This lane introduces branch checkpoints. Keep your code short, then make decisions explicit with Python if-blocks.",
      success: "You just completed a branch-driven script flow with clear Python structure.",
    },
    scene: {
      theme: "dungeonScene",
      background: "/code-research/calciumtrice-dungeon/scene-terminal-temple-v1.png",
      sourceWidth: 1600,
      sourceHeight: 900,
      grid: { left: 214, top: 440, width: 1120, height: 0 },
      tokenScale: 1.24,
    },
    mapPosition: { left: 82, top: 47 },
    width: 12,
    height: 6,
    terrain: [
      { id: "branch-wall-a", kind: "wall", label: "branch wall", x: 3, y: 1 },
      { id: "branch-wall-b", kind: "wall", label: "branch wall", x: 3, y: 5 },
      { id: "branch-rune-a", kind: "rune", label: "branch rune", x: 6, y: 2 },
      { id: "branch-hazard-a", kind: "hazard", label: "branch hazard", x: 9, y: 1 },
    ],
    doors: [{ id: "branch-door", label: "branch gate", requiresItemId: "branch-key", x: 9, y: 3 }],
    heroStart: { x: 0, y: 3 },
    exit: { x: 11, y: 3 },
    items: [
      { id: "branch-key", kind: "key", label: "branch key", x: 2, y: 3 },
      { id: "branch-scroll", kind: "scroll", label: "rune scroll", x: 5, y: 2 },
      { id: "branch-coin", kind: "coin", label: "energy coin", x: 8, y: 3 },
    ],
    enemies: [{ id: "branch-sentinel", label: "branch sentinel", kind: "sentinel", hp: 1, x: 7, y: 3 }],
    starterCode: `# Task: branch relay route
for _ in range(2):
    hero.move_right()
hero.collect()
hero.move_up()
# TODO: move to the scroll lane and collect it
# TODO: return to main lane, clear sentinel, collect coin
has_key = True
if has_key:
    # TODO: open the gate
hero.move_right()
hero.move_right()`,
    solution: `for _ in range(2):
    hero.move_right()
hero.collect()
hero.move_up()
for _ in range(3):
    hero.move_right()
hero.collect()
hero.move_down()
hero.move_right()
hero.attack()
hero.move_right()
hero.move_right()
hero.collect()
has_key = True
if has_key:
    hero.open_door()
hero.move_right()
hero.say("branch clear")
hero.move_right()
hero.move_right()`,
    goals: [
      { id: "g1", kind: "collect", targetId: "branch-key", label: "collect branch key" },
      { id: "g2", kind: "collect", targetId: "branch-scroll", label: "collect rune scroll" },
      { id: "g3", kind: "defeat", targetId: "branch-sentinel", label: "defeat branch sentinel" },
      { id: "g4", kind: "collect", targetId: "branch-coin", label: "collect energy coin" },
      { id: "g5", kind: "openDoor", targetId: "branch-door", label: "open branch gate" },
      { id: "g6", kind: "say", label: "broadcast clear status" },
      { id: "g7", kind: "exit", label: "reach branch exit" },
    ],
    hints: [
      "Use for-range loops to reduce repeated right-moves.",
      "Stand next to the sentinel before attack, do not run into its tile.",
      "Open the gate from the adjacent coin tile with if has_key.",
    ],
    briefing: [
      "Collect the key, then move to upper lane and collect the rune scroll.",
      "Return to main lane, defeat the sentinel, and secure the coin.",
      "Use `has_key` branch to open the gate and finish with a status message before exit.",
    ],
    failureTips: {
      enemy: "You need to stand adjacent to the sentinel before hero.attack().",
      doorKey: "The branch gate requires branch key in inventory.",
      missingGoal: "Check key, scroll, sentinel, coin, gate, say, and exit goals one by one.",
    },
    parSteps: 20,
    xpReward: 238,
    coinReward: 66,
  },
  {
    id: "python-function-30",
    title: "Function Corridor",
    subtitle: "Refactor opening steps into a Python function",
    description:
      "This capstone extends route logic with reusable function blocks. Define a helper function for entry movement, then combine bridge, key, battle, gate, and crystal flow.",
    mapTitle: "缁堢鍦ｆ",
    difficulty: "挑战",
    biome: "dungeon",
    concepts: ["def function", "function call", "flow decomposition", "print status sync"],
    toolbox: [
      "def enter_mid_lane():",
      "enter_mid_lane()",
      "for _ in range(n):",
      "hero.build_bridge(\"right\")",
      "hero.attack()",
      "hero.open_door()",
      "hero.collect()",
      "print(\"...\")",
    ],
    task: {
      mode: "capstone",
      title: "Complete function-based full route",
      summary:
        "Use `def` to abstract the first movement segment. Then continue with bridge, key lane, enemy clear, gate unlock, crystal pickup, and final exit.",
      checklist: [
        "define and call enter_mid_lane()",
        "collect plank and build bridge",
        "collect key, defeat bug, open door, collect crystal, and exit",
      ],
      requireCodeChange: true,
    },
    tutorialSteps: [
      {
        id: "func-step-1",
        title: "Step 1: write and call helper function",
        instruction: "Define `def enter_mid_lane():` and move right twice inside it, then call `enter_mid_lane()`.",
        coach: "Function extraction is a core Python readability skill.",
        success: "Entry movement has been modularized into a reusable helper.",
        requiredSnippets: [
          { snippet: "def enter_mid_lane():" },
          { snippet: "enter_mid_lane()" },
        ],
      },
      {
        id: "func-step-2",
        title: "Step 2: complete bridge and upper-key route",
        instruction: "Collect plank, build bridge, move to upper lane, and collect terminal key.",
        coach: "Treat this as one pipeline segment before returning to the combat lane.",
        success: "Bridge and key sequence is complete.",
        requiredSnippets: [
          { snippet: "hero.build_bridge(\"right\")" },
          { snippet: "for _ in range(3):" },
        ],
        requiredGoalIds: ["g1", "g2", "g3"],
      },
      {
        id: "func-step-3",
        title: "Step 3: clear final lane and exit",
        instruction: "Defeat the bug, open the gate, collect crystal, send status, then reach exit.",
        coach: "Keep command order strict: attack, door, collect, say, exit.",
        success: "Function corridor solved end-to-end.",
        requiredSnippets: [{ snippet: "print(\"relay synced\")" }],
        requiredGoalIds: ["g4", "g5", "g6", "g7", "g8"],
      },
    ],
    mentor: {
      name: "Function Mentor",
      avatar: "🧠",
      intro: "Now we go from linear script to structured script. A small helper function can make complex routes easier to reason about.",
      success: "Great work. You used Python function structure without losing route correctness.",
    },
    scene: {
      theme: "dungeonScene",
      background: "/code-research/calciumtrice-dungeon/scene-terminal-temple-v1.png",
      sourceWidth: 1600,
      sourceHeight: 900,
      grid: { left: 214, top: 434, width: 1120, height: 0 },
      tokenScale: 1.26,
    },
    mapPosition: { left: 91, top: 58 },
    width: 13,
    height: 6,
    terrain: [
      { id: "func-water", kind: "water", label: "function stream", x: 3, y: 3 },
      { id: "func-rune-a", kind: "rune", label: "function rune", x: 6, y: 2 },
      { id: "func-wall-a", kind: "wall", label: "function wall", x: 1, y: 1 },
      { id: "func-hazard-a", kind: "hazard", label: "function hazard", x: 10, y: 1 },
    ],
    bridges: [{ id: "func-bridge", label: "function bridge", requiresItemId: "func-plank", x: 3, y: 3 }],
    doors: [{ id: "func-door", label: "function gate", requiresItemId: "func-key", x: 9, y: 3 }],
    heroStart: { x: 0, y: 3 },
    exit: { x: 12, y: 3 },
    items: [
      { id: "func-plank", kind: "plank", label: "bridge plank", x: 2, y: 3 },
      { id: "func-key", kind: "key", label: "terminal key", x: 6, y: 2 },
      { id: "func-crystal", kind: "crystal", label: "terminal crystal", x: 10, y: 3 },
    ],
    enemies: [{ id: "func-bug", label: "lane bug", kind: "bug", hp: 1, x: 8, y: 3 }],
    starterCode: `# Task: function corridor
def enter_mid_lane():
    # TODO: move right twice

enter_mid_lane()
hero.collect()
hero.build_bridge("right")
# TODO: reach key lane and collect terminal key
# TODO: clear bug, open gate, collect crystal, report and exit`,
    solution: `def enter_mid_lane():
    for _ in range(2):
        hero.move_right()

enter_mid_lane()
hero.collect()
hero.build_bridge("right")
hero.move_right()
hero.move_up()
for _ in range(3):
    hero.move_right()
hero.collect()
hero.move_down()
hero.move_right()
hero.attack()
hero.move_right()
hero.open_door()
hero.move_right()
hero.move_right()
hero.collect()
print("relay synced")
hero.move_right()
hero.move_right()`,
    goals: [
      { id: "g1", kind: "collect", targetId: "func-plank", label: "collect bridge plank" },
      { id: "g2", kind: "buildBridge", targetId: "func-bridge", label: "build function bridge" },
      { id: "g3", kind: "collect", targetId: "func-key", label: "collect terminal key" },
      { id: "g4", kind: "defeat", targetId: "func-bug", label: "defeat lane bug" },
      { id: "g5", kind: "openDoor", targetId: "func-door", label: "open function gate" },
      { id: "g6", kind: "collect", targetId: "func-crystal", label: "collect terminal crystal" },
      { id: "g7", kind: "say", label: "send synced status" },
      { id: "g8", kind: "exit", label: "reach function exit" },
    ],
    hints: [
      "Use a helper function for the first two right moves.",
      "Bridge first, then key lane, then return to combat lane.",
      "Open the gate from adjacent tile after bug is cleared.",
    ],
    briefing: [
      "Define and call `enter_mid_lane()` so opening steps stay clean.",
      "Collect plank, build bridge, then move to upper lane for terminal key.",
      "Return, clear bug, open gate, collect crystal, send status, and exit.",
    ],
    failureTips: {
      bridgeItem: "Build bridge requires collecting bridge plank first.",
      doorKey: "Function gate requires terminal key before open_door.",
      enemy: "Bug blocks the lane; attack from adjacent tile before advancing.",
      missingGoal: "Confirm function route completed all bridge, key, bug, gate, crystal, say, and exit goals.",
    },
    parSteps: 24,
    xpReward: 260,
    coinReward: 78,
  },
  {
    id: "dungeon-def-31",
    title: "Dungeon Function Route",
    subtitle: "Use def + loop to organize entry flow",
    description:
      "Return to the dungeon chapter with stronger Python structure: define a helper function, collect resources, clear enemy, open gate, and finish with status confirmation.",
    mapTitle: "鏆楀奖鍦扮墷",
    difficulty: "挑战",
    biome: "dungeon",
    concepts: ["python def", "for range", "if block sequencing", "boolean variable branch"],
    toolbox: [
      "def get_key():",
      "get_key()",
      "for _ in range(n):",
      "hero.move_right()",
      "hero.collect()",
      "hero.attack()",
      "gate_ready = True",
      "hero.open_door()",
      "hero.say(\"...\")",
    ],
    task: {
      mode: "guided_build",
      title: "Write a structured dungeon script",
      summary:
        "Define `get_key()` for the entry lane, collect side coin, clear sentinel, open gate, collect crystal, then exit.",
      checklist: [
        "define and call get_key()",
        "collect key + coin and defeat sentinel",
        "open gate, collect crystal, and reach exit",
      ],
      requireCodeChange: true,
    },
    tutorialSteps: [
      {
        id: "def31-step-1",
        title: "Step 1: extract key route",
        instruction: "Create `def get_key():` and move right twice inside, then call `get_key()`.",
        coach: "Function extraction keeps route logic cleaner as level complexity increases.",
        success: "Key route is now modular.",
        requiredSnippets: [{ snippet: "def get_key():" }, { snippet: "get_key()" }],
        requiredGoalIds: ["g1"],
      },
      {
        id: "def31-step-2",
        title: "Step 2: side lane and combat",
        instruction: "Move to upper lane for coin, return to main lane, then defeat the sentinel.",
        coach: "Remember: attack works only when standing adjacent to the enemy.",
        success: "Resource lane and combat lane are both cleared.",
        requiredSnippets: [{ snippet: "for _ in range(3):" }],
        requiredGoalIds: ["g2", "g3"],
      },
      {
        id: "def31-step-3",
        title: "Step 3: gate and exit",
        instruction: "Open gate through an if-block, collect crystal, say status, and exit.",
        coach: "Use explicit branch blocks so the key-condition is visible in code.",
        success: "Dungeon function route completed.",
        requiredSnippets: [
          { snippet: "gate_ready = True" },
          { snippet: "if gate_ready:\n    hero.open_door()" },
        ],
        requiredGoalIds: ["g4", "g5", "g6", "g7"],
      },
    ],
    mentor: {
      name: "Dungeon Mentor",
      avatar: "🧭",
      intro: "You already know movement basics. Now code structure quality matters as much as route correctness.",
      success: "Good. You solved it with a function-first Python flow.",
    },
    scene: {
      theme: "dungeonScene",
      background: "/code-research/calciumtrice-dungeon/scene-training-hall-v2.png",
      sourceWidth: 1600,
      sourceHeight: 900,
      grid: { left: 214, top: 460, width: 1120, height: 0 },
      tokenScale: 1.24,
    },
    mapPosition: { left: 54, top: 64 },
    width: 12,
    height: 6,
    terrain: [
      { id: "d31-wall-a", kind: "wall", label: "dungeon wall", x: 3, y: 1 },
      { id: "d31-wall-b", kind: "wall", label: "dungeon wall", x: 3, y: 5 },
      { id: "d31-rune-a", kind: "rune", label: "dungeon rune", x: 6, y: 2 },
      { id: "d31-hazard-a", kind: "hazard", label: "dungeon hazard", x: 10, y: 1 },
    ],
    doors: [{ id: "d31-door", label: "dungeon gate", requiresItemId: "d31-key", x: 9, y: 3 }],
    heroStart: { x: 0, y: 3 },
    exit: { x: 11, y: 3 },
    items: [
      { id: "d31-key", kind: "key", label: "dungeon key", x: 2, y: 3 },
      { id: "d31-coin", kind: "coin", label: "side coin", x: 5, y: 2 },
      { id: "d31-crystal", kind: "crystal", label: "final crystal", x: 10, y: 3 },
    ],
    enemies: [{ id: "d31-sentinel", label: "dungeon sentinel", kind: "sentinel", hp: 1, x: 7, y: 3 }],
    starterCode: `# Task: function-based dungeon route
def get_key():
    # TODO: move right twice and collect key

get_key()
# TODO: move to upper lane, collect side coin, return to main lane
# TODO: clear sentinel, open gate with if block, collect crystal, report and exit`,
    solution: `def get_key():
    for _ in range(2):
        hero.move_right()
    hero.collect()

get_key()
hero.move_up()
for _ in range(3):
    hero.move_right()
hero.collect()
hero.move_down()
hero.move_right()
hero.attack()
hero.move_right()
hero.move_right()
gate_ready = True
if gate_ready:
    hero.open_door()
hero.move_right()
hero.move_right()
hero.collect()
hero.say("dungeon route clear")
hero.move_right()`,
    goals: [
      { id: "g1", kind: "collect", targetId: "d31-key", label: "collect dungeon key" },
      { id: "g2", kind: "collect", targetId: "d31-coin", label: "collect side coin" },
      { id: "g3", kind: "defeat", targetId: "d31-sentinel", label: "defeat dungeon sentinel" },
      { id: "g4", kind: "openDoor", targetId: "d31-door", label: "open dungeon gate" },
      { id: "g5", kind: "collect", targetId: "d31-crystal", label: "collect final crystal" },
      { id: "g6", kind: "say", label: "send route status" },
      { id: "g7", kind: "exit", label: "reach dungeon exit" },
    ],
    hints: [
      "Keep `get_key()` focused on entry only.",
      "Side coin is on the upper lane; collect it before combat.",
      "Gate opening needs key in inventory and adjacent position.",
    ],
    briefing: [
      "Define `get_key()` and complete the entry key sequence first.",
      "Collect side coin from upper lane, then return and clear the sentinel.",
      "Open the gate, collect crystal, send status, and finish at exit.",
    ],
    failureTips: {
      enemy: "Move adjacent to sentinel first, then attack.",
      doorKey: "Dungeon gate requires dungeon key before open_door.",
      missingGoal: "Verify key, coin, sentinel, gate, crystal, status, and exit goals in order.",
    },
    parSteps: 21,
    xpReward: 248,
    coinReward: 72,
  },
  {
    id: "river-bridge-32",
    title: "River Switch Relay",
    subtitle: "Bridge + switch + gate with Python loops",
    description:
      "This mechanism chapter level combines bridge building, switch activation, key routing, gate control, and final combat in one continuous Python script.",
    mapTitle: "鏈哄叧鍥炲粖",
    difficulty: "挑战",
    biome: "river",
    concepts: ["bridge control", "switch routing", "python sequencing", "print status sync"],
    toolbox: [
      "for _ in range(n):",
      "hero.move_right()",
      "hero.move_up()",
      "hero.move_down()",
      "hero.collect()",
      "hero.build_bridge(\"right\")",
      "hero.step_on_switch()",
      "hero.open_door()",
      "hero.attack()",
      "print(\"...\")",
    ],
    task: {
      mode: "capstone",
      title: "Complete the relay mechanism script",
      summary:
        "Collect plank and build bridge, trigger switch, collect key, open gate, defeat bug, collect crystal, then exit.",
      checklist: [
        "collect plank and build bridge",
        "trigger switch and collect terminal key",
        "open gate, defeat bug, collect crystal, and exit",
      ],
      requireCodeChange: true,
    },
    tutorialSteps: [
      {
        id: "r32-step-1",
        title: "Step 1: cross the water lane",
        instruction: "Collect plank and build bridge to enter the relay section.",
        coach: "Bridge action depends on both correct item and adjacency.",
        success: "Water lane is now passable.",
        requiredSnippets: [
          { snippet: "for _ in range(2):\n    hero.move_right()" },
          { snippet: "hero.build_bridge(\"right\")" },
        ],
        requiredGoalIds: ["g1", "g2"],
      },
      {
        id: "r32-step-2",
        title: "Step 2: switch and key lane",
        instruction: "Move to upper lane, step on switch, and collect terminal key.",
        coach: "Switch opens the outer gate route, but you still need key for the inner gate.",
        success: "Mechanism lane setup complete.",
        requiredSnippets: [
          { snippet: "for _ in range(2):" },
          { snippet: "hero.step_on_switch()" },
        ],
        requiredGoalIds: ["g3", "g4"],
      },
      {
        id: "r32-step-3",
        title: "Step 3: final gate and combat",
        instruction: "Open the gate, defeat bug, collect crystal, send status, and exit.",
        coach: "Use strict action order in the final lane to avoid blocking yourself.",
        success: "River switch relay cleared.",
        requiredSnippets: [{ snippet: "print(\"relay synced\")" }],
        requiredGoalIds: ["g5", "g6", "g7", "g8", "g9"],
      },
    ],
    mentor: {
      name: "Mechanism Mentor",
      avatar: "🧩",
      intro: "This is a full relay route. Keep each segment explicit and verify state changes after every control action.",
      success: "Excellent. Your mechanism pipeline stays readable and stable.",
    },
    scene: {
      theme: "dungeonScene",
      background: "/code-research/calciumtrice-dungeon/scene-river-crossing-v1.png",
      sourceWidth: 1600,
      sourceHeight: 900,
      grid: { left: 214, top: 432, width: 1120, height: 0 },
      tokenScale: 1.22,
    },
    mapPosition: { left: 73, top: 70 },
    width: 13,
    height: 7,
    terrain: [
      { id: "r32-water", kind: "water", label: "river lane", x: 3, y: 4 },
      { id: "r32-rune-a", kind: "rune", label: "switch rune", x: 6, y: 2 },
      { id: "r32-wall-a", kind: "wall", label: "relay wall", x: 1, y: 1 },
      { id: "r32-hazard-a", kind: "hazard", label: "relay hazard", x: 11, y: 1 },
    ],
    bridges: [{ id: "r32-bridge", label: "river bridge", requiresItemId: "r32-plank", x: 3, y: 4 }],
    switches: [{ id: "r32-switch", label: "relay switch", x: 6, y: 2 }],
    doors: [{ id: "r32-door", label: "relay gate", requiresItemId: "r32-key", x: 10, y: 4 }],
    heroStart: { x: 0, y: 4 },
    exit: { x: 12, y: 4 },
    items: [
      { id: "r32-plank", kind: "plank", label: "river plank", x: 2, y: 4 },
      { id: "r32-key", kind: "key", label: "terminal key", x: 8, y: 2 },
      { id: "r32-crystal", kind: "crystal", label: "relay crystal", x: 11, y: 4 },
    ],
    enemies: [{ id: "r32-bug", label: "relay bug", kind: "bug", hp: 1, x: 11, y: 4 }],
    starterCode: `# Task: river switch relay
# TODO: collect plank and build bridge
# TODO: go upper lane, trigger switch, collect terminal key
# TODO: open gate, clear bug, collect crystal, report and exit`,
    solution: `for _ in range(2):
    hero.move_right()
hero.collect()
hero.build_bridge("right")
hero.move_right()
hero.move_right()
hero.move_up()
hero.move_up()
for _ in range(2):
    hero.move_right()
hero.step_on_switch()
for _ in range(2):
    hero.move_right()
hero.collect()
hero.move_down()
hero.move_down()
hero.move_right()
hero.open_door()
hero.move_right()
hero.attack()
hero.move_right()
hero.collect()
print("relay synced")
hero.move_right()`,
    goals: [
      { id: "g1", kind: "collect", targetId: "r32-plank", label: "collect river plank" },
      { id: "g2", kind: "buildBridge", targetId: "r32-bridge", label: "build river bridge" },
      { id: "g3", kind: "activateSwitch", targetId: "r32-switch", label: "trigger relay switch" },
      { id: "g4", kind: "collect", targetId: "r32-key", label: "collect terminal key" },
      { id: "g5", kind: "openDoor", targetId: "r32-door", label: "open relay gate" },
      { id: "g6", kind: "defeat", targetId: "r32-bug", label: "defeat relay bug" },
      { id: "g7", kind: "collect", targetId: "r32-crystal", label: "collect relay crystal" },
      { id: "g8", kind: "say", label: "send relay synced status" },
      { id: "g9", kind: "exit", label: "reach relay exit" },
    ],
    hints: [
      "Build bridge from the plank tile before crossing water.",
      "Switch and key are both on upper lane; clear them in one pass.",
      "Gate, bug, crystal, status, and exit are a strict final sequence.",
    ],
    briefing: [
      "Collect plank and build the river bridge to unlock the relay route.",
      "Move to upper lane, activate switch, and collect the terminal key.",
      "Return to main lane, open gate, clear bug, collect crystal, send status, and exit.",
    ],
    failureTips: {
      bridgeItem: "Building bridge requires river plank first.",
      switch: "Stand exactly on relay switch tile before step_on_switch.",
      doorKey: "Relay gate requires terminal key before open_door.",
      enemy: "Defeat relay bug before collecting the crystal.",
      missingGoal: "Check plank, bridge, switch, key, gate, bug, crystal, status, and exit goals.",
    },
    parSteps: 28,
    xpReward: 272,
    coinReward: 84,
  },
  {
    id: "ruins-branch-33",
    title: "Ruins Branch Debug",
    subtitle: "scan + branch + gate sequence",
    description:
      "Practice Python-style branching and scan-first debugging in the ruins route. Collect key and scroll, clear sentinel, open gate, then finish crystal extraction.",
    mapTitle: "閬楄抗渚︽祴",
    difficulty: "挑战",
    biome: "ruins",
    concepts: ["scan_map", "if branch", "boolean gate variable", "route debugging"],
    toolbox: [
      "hero.scan_map()",
      "for _ in range(n):",
      "hero.move_right()",
      "hero.move_up()",
      "hero.move_down()",
      "hero.collect()",
      "hero.step_on_switch()",
      "hero.attack()",
      "hero.open_door()",
      "hero.say(\"...\")",
    ],
    task: {
      mode: "guided_build",
      title: "Build the ruins branch script",
      summary:
        "Scan first, collect key and scroll, trigger switch, clear sentinel, open gate, collect crystal, and report status before exit.",
      checklist: [
        "scan map and collect key + scroll",
        "trigger switch and clear sentinel",
        "open gate, collect crystal, report and exit",
      ],
      requireCodeChange: true,
    },
    tutorialSteps: [
      {
        id: "r33-step-1",
        title: "Step 1: scan and first resources",
        instruction: "Run hero.scan_map(), then use looped movement to collect the key and the upper-lane scroll.",
        coach: "Keep scan at the top so route reasoning stays explicit.",
        success: "Key and scroll segment is complete.",
        requiredSnippets: [{ snippet: "hero.scan_map()" }, { snippet: "for _ in range(3):" }],
        requiredGoalIds: ["g1", "g2", "g3"],
      },
      {
        id: "r33-step-2",
        title: "Step 2: switch and sentinel",
        instruction: "Trigger the switch tile, return to the main lane, and defeat the sentinel from an adjacent tile.",
        coach: "Avoid moving onto enemy tile; attack only works from adjacent position.",
        success: "Control lane is cleared.",
        requiredSnippets: [{ snippet: "hero.step_on_switch()" }, { snippet: "hero.attack()" }],
        requiredGoalIds: ["g4", "g5"],
      },
      {
        id: "r33-step-3",
        title: "Step 3: branch gate and finish",
        instruction: "Use an if-block to open gate, collect crystal, send status, and exit.",
        coach: "Branch statement should make the gate condition visible in your script.",
        success: "Ruins branch challenge completed.",
        requiredSnippets: [
          { snippet: "door_ready = True" },
          { snippet: "if door_ready:\n    hero.open_door()" },
        ],
        requiredGoalIds: ["g6", "g7", "g8", "g9"],
      },
    ],
    mentor: {
      name: "Ruins Mentor",
      avatar: "R",
      intro: "This level favors debugging discipline: scan first, segment route, then execute branch-controlled actions.",
      success: "Great. You completed a clean ruins script with explicit Python structure.",
    },
    scene: {
      theme: "dungeonScene",
      background: "/code-research/calciumtrice-dungeon/scene-scan-ruins-v1.png",
      sourceWidth: 1600,
      sourceHeight: 900,
      grid: { left: 214, top: 432, width: 1120, height: 0 },
      tokenScale: 1.22,
    },
    mapPosition: { left: 85, top: 84 },
    width: 14,
    height: 7,
    terrain: [
      { id: "r33-rune", kind: "rune", label: "ruins rune", x: 5, y: 2 },
      { id: "r33-wall-a", kind: "wall", label: "ruins wall", x: 2, y: 1 },
      { id: "r33-wall-b", kind: "wall", label: "ruins wall", x: 2, y: 6 },
      { id: "r33-hazard", kind: "hazard", label: "ruins hazard", x: 12, y: 1 },
    ],
    switches: [{ id: "r33-switch", label: "ruins switch", x: 5, y: 2 }],
    doors: [{ id: "r33-door", label: "ruins gate", requiresItemId: "r33-key", x: 11, y: 4 }],
    heroStart: { x: 0, y: 4 },
    exit: { x: 13, y: 4 },
    items: [
      { id: "r33-key", kind: "key", label: "ruins key", x: 3, y: 4 },
      { id: "r33-scroll", kind: "scroll", label: "ruins scroll", x: 6, y: 2 },
      { id: "r33-coin", kind: "coin", label: "energy coin", x: 9, y: 4 },
      { id: "r33-crystal", kind: "crystal", label: "ruins crystal", x: 12, y: 4 },
    ],
    enemies: [{ id: "r33-sentinel", label: "ruins sentinel", kind: "sentinel", hp: 1, x: 10, y: 4 }],
    starterCode: `# Task: ruins branch debug
hero.scan_map()
# TODO: collect key and upper-lane scroll
# TODO: trigger switch, clear sentinel
# TODO: open gate in if block, collect crystal, report and exit`,
    solution: `hero.scan_map()
for _ in range(3):
    hero.move_right()
hero.collect()
hero.move_up()
hero.move_up()
for _ in range(2):
    hero.move_right()
hero.step_on_switch()
hero.move_right()
hero.collect()
hero.say("scan ready")
hero.move_down()
hero.move_down()
for _ in range(3):
    hero.move_right()
hero.collect()
hero.attack()
hero.move_right()
door_ready = True
if door_ready:
    hero.open_door()
hero.move_right()
hero.move_right()
hero.collect()
hero.move_right()`,
    goals: [
      { id: "g1", kind: "scan", label: "scan ruins route" },
      { id: "g2", kind: "collect", targetId: "r33-key", label: "collect ruins key" },
      { id: "g3", kind: "collect", targetId: "r33-scroll", label: "collect ruins scroll" },
      { id: "g4", kind: "activateSwitch", targetId: "r33-switch", label: "trigger ruins switch" },
      { id: "g5", kind: "defeat", targetId: "r33-sentinel", label: "defeat ruins sentinel" },
      { id: "g6", kind: "openDoor", targetId: "r33-door", label: "open ruins gate" },
      { id: "g7", kind: "collect", targetId: "r33-crystal", label: "collect ruins crystal" },
      { id: "g8", kind: "say", label: "send ready status" },
      { id: "g9", kind: "exit", label: "reach ruins exit" },
    ],
    hints: [
      "Scan first, then split route into upper lane and main lane segments.",
      "Switch and scroll are on upper lane; finish both before returning down.",
      "Open gate from adjacent tile after sentinel is cleared.",
    ],
    briefing: [
      "Start with scan_map and collect the main-lane key.",
      "Go upper lane to trigger switch and collect scroll, then return to combat lane.",
      "Clear sentinel, open gate with branch block, collect crystal, and exit.",
    ],
    failureTips: {
      switch: "Stand exactly on ruins switch tile before step_on_switch.",
      enemy: "Attack sentinel from adjacent tile before moving forward.",
      doorKey: "Ruins gate requires ruins key before open_door.",
      missingGoal: "Verify scan, key, scroll, switch, sentinel, gate, crystal, say, and exit goals.",
    },
    parSteps: 27,
    xpReward: 286,
    coinReward: 88,
  },
  {
    id: "temple-final-34",
    title: "Temple Logic Finale",
    subtitle: "function + bridge + dual-gate logic",
    description:
      "A deeper temple route focused on Python structure: define helper function, bridge crossing, switch control, keyed gate open, combat, and final crystal extraction.",
    mapTitle: "缁堢鍦ｆ",
    difficulty: "挑战",
    biome: "dungeon",
    concepts: ["def helper", "switch + gate logic", "print debugging"],
    toolbox: [
      "def enter_upper():",
      "enter_upper()",
      "hero.scan_map()",
      "for _ in range(n):",
      "hero.move_right()",
      "hero.move_up()",
      "hero.move_down()",
      "hero.collect()",
      "hero.build_bridge(\"right\")",
      "hero.step_on_switch()",
      "hero.attack()",
      "hero.open_door()",
      "print(\"...\")",
    ],
    task: {
      mode: "capstone",
      title: "Complete temple logic pipeline",
      summary:
        "Use helper function for upper route, cross bridge, trigger switch, collect key, open inner gate, clear guard, collect crystal, and exit.",
      checklist: [
        "define and call enter_upper helper",
        "bridge + switch + key sequence complete",
        "open inner gate, clear guard, collect crystal and exit",
      ],
      requireCodeChange: true,
    },
    tutorialSteps: [
      {
        id: "t34-step-1",
        title: "Step 1: structure your script",
        instruction: "Define enter_upper() and call it after bridge crossing to keep vertical movement reusable.",
        coach: "Helper functions reduce route noise and improve debugging.",
        success: "Function-based structure is ready.",
        requiredSnippets: [{ snippet: "def enter_upper():" }, { snippet: "enter_upper()" }],
      },
      {
        id: "t34-step-2",
        title: "Step 2: control lanes",
        instruction: "Collect plank, build bridge, trigger switch, and collect terminal key in the upper lane.",
        coach: "Finish control lane setup before returning to final gate/combat lane.",
        success: "Control prerequisites completed.",
        requiredSnippets: [{ snippet: "hero.build_bridge(\"right\")" }, { snippet: "hero.step_on_switch()" }],
        requiredGoalIds: ["g1", "g2", "g3", "g4"],
      },
      {
        id: "t34-step-3",
        title: "Step 3: final gate and extraction",
        instruction: "Clear guard, open inner gate, collect crystal, print status, and exit.",
        coach: "Keep final sequence strict so no goal is skipped.",
        success: "Temple logic finale completed.",
        requiredSnippets: [{ snippet: "print(\"omega synced\")" }],
        requiredGoalIds: ["g5", "g6", "g7", "g8", "g9"],
      },
    ],
    mentor: {
      name: "Temple Mentor",
      avatar: "T",
      intro: "This finale tests both route correctness and Python code organization quality.",
      success: "Excellent finish. The script is clean, ordered, and fully goal-complete.",
    },
    scene: {
      theme: "dungeonScene",
      background: "/code-research/calciumtrice-dungeon/scene-terminal-temple-v1.png",
      sourceWidth: 1600,
      sourceHeight: 900,
      grid: { left: 214, top: 430, width: 1120, height: 0 },
      tokenScale: 1.23,
    },
    mapPosition: { left: 97, top: 66, size: "large" },
    width: 15,
    height: 8,
    terrain: [
      { id: "t34-water", kind: "water", label: "temple water lane", x: 3, y: 4 },
      { id: "t34-rune", kind: "rune", label: "temple rune", x: 6, y: 2 },
      { id: "t34-wall-a", kind: "wall", label: "temple wall", x: 1, y: 1 },
      { id: "t34-hazard", kind: "hazard", label: "temple hazard", x: 13, y: 1 },
    ],
    bridges: [{ id: "t34-bridge", label: "temple bridge", requiresItemId: "t34-plank", x: 3, y: 4 }],
    switches: [{ id: "t34-switch", label: "temple switch", opensDoorId: "t34-door-a", x: 6, y: 2 }],
    doors: [
      { id: "t34-door-a", label: "outer gate", x: 10, y: 4 },
      { id: "t34-door-b", label: "inner gate", requiresItemId: "t34-key", x: 12, y: 4 },
    ],
    heroStart: { x: 0, y: 4 },
    exit: { x: 14, y: 4 },
    items: [
      { id: "t34-plank", kind: "plank", label: "temple plank", x: 2, y: 4 },
      { id: "t34-scroll", kind: "scroll", label: "outer scroll", x: 7, y: 2 },
      { id: "t34-key", kind: "key", label: "inner key", x: 8, y: 2 },
      { id: "t34-crystal", kind: "crystal", label: "final crystal", x: 13, y: 4 },
    ],
    enemies: [{ id: "t34-guard", label: "temple guard", kind: "guard", hp: 1, x: 11, y: 4 }],
    starterCode: `# Task: temple logic finale
def enter_upper():
    # TODO: move up twice

hero.scan_map()
# TODO: collect plank, build bridge, and enter upper lane
# TODO: trigger switch, collect scroll + key, return to main lane
# TODO: clear guard, open inner gate, collect crystal, print status, exit`,
    solution: `def enter_upper():
    hero.move_up()
    hero.move_up()

hero.scan_map()
for _ in range(2):
    hero.move_right()
hero.collect()
hero.build_bridge("right")
hero.move_right()
hero.move_right()
hero.move_right()
enter_upper()
hero.move_right()
hero.step_on_switch()
hero.move_right()
hero.collect()
hero.move_right()
hero.collect()
hero.move_down()
hero.move_down()
hero.move_right()
hero.move_right()
hero.attack()
hero.move_right()
hero.open_door()
hero.move_right()
hero.move_right()
hero.collect()
print("omega synced")
hero.move_right()`,
    goals: [
      { id: "g1", kind: "scan", label: "scan temple layout" },
      { id: "g2", kind: "collect", targetId: "t34-plank", label: "collect temple plank" },
      { id: "g3", kind: "buildBridge", targetId: "t34-bridge", label: "build temple bridge" },
      { id: "g4", kind: "activateSwitch", targetId: "t34-switch", label: "trigger temple switch" },
      { id: "g5", kind: "collect", targetId: "t34-key", label: "collect inner key" },
      { id: "g6", kind: "defeat", targetId: "t34-guard", label: "defeat temple guard" },
      { id: "g7", kind: "openDoor", targetId: "t34-door-b", label: "open inner gate" },
      { id: "g8", kind: "collect", targetId: "t34-crystal", label: "collect final crystal" },
      { id: "g9", kind: "say", label: "report final status" },
      { id: "g10", kind: "exit", label: "reach temple exit" },
    ],
    hints: [
      "Bridge first, then upper lane function call.",
      "Switch opens outer gate; key is still required for inner gate.",
      "print(...) can be used as status signal because it maps to hero.say(...).",
    ],
    briefing: [
      "Scan map, collect plank, and build the bridge before lane transition.",
      "Use helper function to reach upper lane, trigger switch, and collect key.",
      "Return to main lane, clear guard, open inner gate, collect crystal, report, and exit.",
    ],
    failureTips: {
      bridgeItem: "Temple bridge requires temple plank first.",
      switch: "Stand on temple switch tile before step_on_switch.",
      doorKey: "Inner gate requires inner key before open_door.",
      enemy: "Clear temple guard before trying to pass the inner lane.",
      missingGoal: "Verify scan, bridge, switch, key, guard, inner gate, crystal, report, and exit goals.",
    },
    parSteps: 32,
    xpReward: 312,
    coinReward: 98,
  },
  {
    id: "ruins-bool-35",
    title: "Ruins Boolean Route",
    subtitle: "scan + bool branch + gate clear",
    description:
      "This chapter extension emphasizes Python boolean branching in a scan-first ruins route with switch, combat, and gate control.",
    mapTitle: "Ruins Lab",
    difficulty: "挑战",
    biome: "ruins",
    concepts: ["scan_map", "boolean variable", "not operator", "if branch route"],
    toolbox: [
      "hero.scan_map()",
      "for _ in range(n):",
      "hero.move_right()",
      "hero.move_up()",
      "hero.move_down()",
      "hero.collect()",
      "hero.step_on_switch()",
      "hero.attack()",
      "hero.open_door()",
      "has_key = True",
      "if not False:",
      "if has_key:",
      "hero.say(\"...\")",
    ],
    task: {
      mode: "guided_build",
      title: "Finish the boolean ruins script",
      summary:
        "Scan first, collect key + scroll, trigger switch, clear sentinel, then use `if has_key` to open the gate and finish extraction.",
      checklist: [
        "scan and collect key + scroll",
        "switch trigger and sentinel clear",
        "if-branch gate open + crystal + exit",
      ],
      requireCodeChange: true,
    },
    tutorialSteps: [
      {
        id: "r35-step-1",
        title: "Step 1: scan and resources",
        instruction: "Use scan_map first, then collect key on the main lane and scroll on the upper lane.",
        coach: "Route clarity starts with scan-first and segmented movement.",
        success: "Resource lanes are complete.",
        requiredSnippets: [{ snippet: "hero.scan_map()" }],
        requiredGoalIds: ["g1", "g2", "g3"],
      },
      {
        id: "r35-step-2",
        title: "Step 2: switch and combat",
        instruction: "Trigger the switch and clear sentinel from an adjacent tile before moving to the gate lane.",
        coach: "Do not walk into enemy tiles; attack from adjacency.",
        success: "Control lane has been stabilized.",
        requiredSnippets: [{ snippet: "hero.step_on_switch()" }],
        requiredGoalIds: ["g4", "g5"],
      },
      {
        id: "r35-step-3",
        title: "Step 3: boolean gate logic",
        instruction: "Declare `has_key = True`, keep `gate_open = True`, then open gate with a `not False` boolean branch.",
        coach: "Keep conditional logic explicit so your intent is easy to review.",
        success: "Boolean route challenge complete.",
        requiredSnippets: [
          { snippet: "has_key = True" },
          { snippet: "gate_open = True" },
          { snippet: "if has_key and not False and gate_open:\n    hero.open_door()" },
        ],
        requiredGoalIds: ["g6", "g7", "g8", "g9", "g10"],
      },
    ],
    mentor: {
      name: "Ruins Coach",
      avatar: "B",
      intro: "This route is about clear branch logic, not just movement speed.",
      success: "Good. You solved the route and kept branch intent explicit.",
    },
    scene: {
      theme: "dungeonScene",
      background: "/code-research/calciumtrice-dungeon/scene-scan-ruins-v1.png",
      sourceWidth: 1600,
      sourceHeight: 900,
      grid: { left: 214, top: 432, width: 1120, height: 0 },
      tokenScale: 1.22,
    },
    mapPosition: { left: 92, top: 88 },
    width: 15,
    height: 7,
    terrain: [
      { id: "r35-rune", kind: "rune", label: "branch rune", x: 5, y: 2 },
      { id: "r35-wall-a", kind: "wall", label: "ruins wall", x: 2, y: 1 },
      { id: "r35-wall-b", kind: "wall", label: "ruins wall", x: 2, y: 6 },
      { id: "r35-hazard", kind: "hazard", label: "ruins hazard", x: 13, y: 1 },
    ],
    switches: [{ id: "r35-switch", label: "branch switch", x: 5, y: 2 }],
    doors: [{ id: "r35-door", label: "branch gate", requiresItemId: "r35-key", x: 11, y: 4 }],
    heroStart: { x: 0, y: 4 },
    exit: { x: 14, y: 4 },
    items: [
      { id: "r35-key", kind: "key", label: "branch key", x: 2, y: 4 },
      { id: "r35-scroll", kind: "scroll", label: "branch scroll", x: 6, y: 2 },
      { id: "r35-coin", kind: "coin", label: "branch coin", x: 8, y: 4 },
      { id: "r35-crystal", kind: "crystal", label: "branch crystal", x: 12, y: 4 },
    ],
    enemies: [{ id: "r35-sentinel", label: "branch sentinel", kind: "sentinel", hp: 1, x: 10, y: 4 }],
    starterCode: `# Task: ruins boolean route
hero.scan_map()
# TODO: collect key on main lane, then scroll on upper lane
# TODO: trigger switch and clear sentinel
# TODO: use has_key boolean branch to open gate and finish`,
    solution: `hero.scan_map()
for _ in range(2):
    hero.move_right()
hero.collect()
hero.move_up()
hero.move_up()
for _ in range(3):
    hero.move_right()
hero.step_on_switch()
hero.move_right()
hero.collect()
hero.move_down()
hero.move_down()
for _ in range(2):
    hero.move_right()
hero.collect()
hero.move_right()
hero.attack()
hero.move_right()
has_key = True
gate_open = True
if has_key and not False and gate_open:
    hero.open_door()
hero.move_right()
hero.move_right()
hero.collect()
hero.say("branch verified")
hero.move_right()
hero.move_right()`,
    goals: [
      { id: "g1", kind: "scan", label: "scan branch route" },
      { id: "g2", kind: "collect", targetId: "r35-key", label: "collect branch key" },
      { id: "g3", kind: "collect", targetId: "r35-scroll", label: "collect branch scroll" },
      { id: "g4", kind: "activateSwitch", targetId: "r35-switch", label: "trigger branch switch" },
      { id: "g5", kind: "defeat", targetId: "r35-sentinel", label: "defeat branch sentinel" },
      { id: "g6", kind: "openDoor", targetId: "r35-door", label: "open branch gate" },
      { id: "g7", kind: "collect", targetId: "r35-coin", label: "collect branch coin" },
      { id: "g8", kind: "collect", targetId: "r35-crystal", label: "collect branch crystal" },
      { id: "g9", kind: "say", label: "broadcast branch status" },
      { id: "g10", kind: "exit", label: "reach branch exit" },
    ],
    hints: [
      "Use scan_map first so hazards and lanes are explicit.",
      "Upper lane covers both switch and scroll in one pass.",
      "Gate open must happen from adjacent tile after sentinel clear.",
    ],
    briefing: [
      "Scan route, collect key, and move to upper lane for switch + scroll.",
      "Return to main lane, collect coin, and defeat sentinel.",
      "Open gate with boolean branch, collect crystal, report status, and exit.",
    ],
    failureTips: {
      switch: "Stand on switch tile before step_on_switch.",
      enemy: "Attack sentinel from adjacent tile before moving forward.",
      doorKey: "Branch gate requires branch key before open_door.",
      missingGoal: "Check scan, key, scroll, switch, sentinel, gate, coin, crystal, status, and exit goals.",
    },
    parSteps: 29,
    xpReward: 320,
    coinReward: 102,
  },
  {
    id: "temple-pipeline-36",
    title: "Temple Pipeline 36",
    subtitle: "function helper + dual gate + print sync",
    description:
      "A larger temple capstone that combines function extraction, bridge crossing, switch control, keyed inner gate opening, and final print-based status sync.",
    mapTitle: "Temple Lab",
    difficulty: "挑战",
    biome: "dungeon",
    concepts: ["def helper", "pipeline sequencing", "print debugging"],
    toolbox: [
      "def enter_upper():",
      "enter_upper()",
      "hero.scan_map()",
      "for _ in range(n):",
      "hero.move_right()",
      "hero.move_up()",
      "hero.move_down()",
      "hero.collect()",
      "hero.build_bridge(\"right\")",
      "hero.step_on_switch()",
      "hero.attack()",
      "hero.open_door()",
      "print(\"...\")",
    ],
    task: {
      mode: "capstone",
      title: "Complete temple pipeline",
      summary:
        "Define helper movement for upper lane, build bridge, trigger switch, collect key, clear guard, open inner gate, collect crystal, print sync, and exit.",
      checklist: [
        "function helper and bridge segment complete",
        "switch + key segment complete",
        "guard clear + inner gate + crystal + sync + exit complete",
      ],
      requireCodeChange: true,
    },
    tutorialSteps: [
      {
        id: "t36-step-1",
        title: "Step 1: define helper flow",
        instruction: "Create `def enter_upper():` and call it after crossing the bridge.",
        coach: "Helper extraction makes complex routes easier to audit.",
        success: "Helper structure is complete.",
        requiredSnippets: [{ snippet: "def enter_upper():" }, { snippet: "enter_upper()" }],
      },
      {
        id: "t36-step-2",
        title: "Step 2: control lane setup",
        instruction: "Collect plank, build bridge, trigger switch, then collect key in upper lane.",
        coach: "Do control setup first; final lane should be clean and linear.",
        success: "Control lane prerequisites complete.",
        requiredSnippets: [{ snippet: "hero.build_bridge(\"right\")" }, { snippet: "hero.step_on_switch()" }],
        requiredGoalIds: ["g1", "g2", "g3", "g4", "g5"],
      },
      {
        id: "t36-step-3",
        title: "Step 3: final lane execution",
        instruction: "Defeat guard, open inner gate, collect crystal, print status, and reach exit.",
        coach: "Final sequence must stay ordered: combat -> gate -> collect -> sync -> exit.",
        success: "Temple pipeline challenge complete.",
        requiredSnippets: [{ snippet: "print(\"pipeline synced\")" }],
        requiredGoalIds: ["g6", "g7", "g8", "g9", "g10"],
      },
    ],
    mentor: {
      name: "Temple Architect",
      avatar: "P",
      intro: "This level checks whether you can keep a long Python script structured and correct.",
      success: "Strong finish. Your full pipeline is stable and readable.",
    },
    scene: {
      theme: "dungeonScene",
      background: "/code-research/calciumtrice-dungeon/scene-terminal-temple-v1.png",
      sourceWidth: 1600,
      sourceHeight: 900,
      grid: { left: 214, top: 430, width: 1120, height: 0 },
      tokenScale: 1.23,
    },
    mapPosition: { left: 98, top: 74, size: "large" },
    width: 16,
    height: 8,
    terrain: [
      { id: "t36-water", kind: "water", label: "temple water lane", x: 3, y: 4 },
      { id: "t36-rune", kind: "rune", label: "temple rune", x: 7, y: 2 },
      { id: "t36-wall-a", kind: "wall", label: "temple wall", x: 1, y: 1 },
      { id: "t36-hazard", kind: "hazard", label: "temple hazard", x: 14, y: 1 },
    ],
    bridges: [{ id: "t36-bridge", label: "temple bridge", requiresItemId: "t36-plank", x: 3, y: 4 }],
    switches: [{ id: "t36-switch", label: "temple switch", opensDoorId: "t36-door-a", x: 7, y: 2 }],
    doors: [
      { id: "t36-door-a", label: "outer gate", x: 10, y: 4 },
      { id: "t36-door-b", label: "inner gate", requiresItemId: "t36-key", x: 13, y: 4 },
    ],
    heroStart: { x: 0, y: 4 },
    exit: { x: 15, y: 4 },
    items: [
      { id: "t36-plank", kind: "plank", label: "temple plank", x: 2, y: 4 },
      { id: "t36-scroll", kind: "scroll", label: "outer scroll", x: 8, y: 2 },
      { id: "t36-key", kind: "key", label: "inner key", x: 9, y: 2 },
      { id: "t36-crystal", kind: "crystal", label: "final crystal", x: 14, y: 4 },
    ],
    enemies: [{ id: "t36-guard", label: "inner guard", kind: "guard", hp: 1, x: 12, y: 4 }],
    starterCode: `# Task: temple pipeline 36
def enter_upper():
    # TODO: move up twice

hero.scan_map()
# TODO: collect plank, build bridge, then call enter_upper()
# TODO: switch + scroll + key on upper lane
# TODO: clear guard, open inner gate, collect crystal, print sync, exit`,
    solution: `def enter_upper():
    hero.move_up()
    hero.move_up()

hero.scan_map()
for _ in range(2):
    hero.move_right()
hero.collect()
hero.build_bridge("right")
for _ in range(4):
    hero.move_right()
enter_upper()
hero.move_right()
hero.step_on_switch()
hero.move_right()
hero.collect()
hero.move_right()
hero.collect()
hero.move_down()
hero.move_down()
hero.move_right()
hero.move_right()
hero.attack()
hero.move_right()
hero.open_door()
hero.move_right()
hero.move_right()
hero.collect()
print("pipeline synced")
hero.move_right()`,
    goals: [
      { id: "g1", kind: "scan", label: "scan temple pipeline" },
      { id: "g2", kind: "collect", targetId: "t36-plank", label: "collect temple plank" },
      { id: "g3", kind: "buildBridge", targetId: "t36-bridge", label: "build temple bridge" },
      { id: "g4", kind: "activateSwitch", targetId: "t36-switch", label: "trigger temple switch" },
      { id: "g5", kind: "collect", targetId: "t36-key", label: "collect inner key" },
      { id: "g6", kind: "defeat", targetId: "t36-guard", label: "defeat inner guard" },
      { id: "g7", kind: "openDoor", targetId: "t36-door-b", label: "open inner gate" },
      { id: "g8", kind: "collect", targetId: "t36-crystal", label: "collect final crystal" },
      { id: "g9", kind: "say", label: "broadcast pipeline sync" },
      { id: "g10", kind: "exit", label: "reach final exit" },
    ],
    hints: [
      "Bridge first, then enter_upper() to start upper-lane controls.",
      "Switch opens outer gate, but inner gate still needs key.",
      "print(...) is accepted as status broadcast and maps to hero.say(...).",
    ],
    briefing: [
      "Scan map, collect plank, and build bridge before lane transition.",
      "Use helper function for upper lane and collect key after switch activation.",
      "Return to final lane: clear guard, open inner gate, collect crystal, sync status, and exit.",
    ],
    failureTips: {
      bridgeItem: "Temple bridge requires temple plank before build_bridge.",
      switch: "Stand on switch tile before step_on_switch.",
      doorKey: "Inner gate requires inner key before open_door.",
      enemy: "Defeat inner guard before trying to pass the inner lane.",
      missingGoal: "Check scan, bridge, switch, key, guard, inner gate, crystal, sync, and exit goals.",
    },
    parSteps: 34,
    xpReward: 336,
    coinReward: 108,
  },
  {
    id: "river-decision-37",
    title: "River Decision 37",
    subtitle: "bridge + switch + key gate + branch",
    description:
      "A higher-difficulty mechanism mission. Build bridge, trigger switch, collect key, clear guard, then open the gate using explicit boolean branch logic.",
    mapTitle: "River Lab",
    difficulty: "挑战",
    biome: "river",
    concepts: ["build_bridge", "step_on_switch", "if has_key branch", "route sequencing"],
    toolbox: [
      "hero.scan_map()",
      "for _ in range(n):",
      "hero.move_right()",
      "hero.move_up()",
      "hero.move_down()",
      "hero.collect()",
      "hero.build_bridge(\"right\")",
      "hero.step_on_switch()",
      "hero.attack()",
      "has_key = True",
      "if has_key:",
      "hero.open_door()",
      "hero.say(\"...\")",
    ],
    task: {
      mode: "capstone",
      title: "Complete river decision pipeline",
      summary:
        "Scan first, collect plank and bridge, trigger switch on upper lane, collect key, clear guard, then branch-open gate and extract crystal.",
      checklist: [
        "scan + bridge segment complete",
        "switch + key segment complete",
        "guard + branch gate + crystal + exit complete",
      ],
      requireCodeChange: true,
    },
    tutorialSteps: [
      {
        id: "r37-step-1",
        title: "Step 1: bridge setup",
        instruction: "Collect plank, build bridge, and cross to the mechanism lane.",
        coach: "Bridge action requires correct item and adjacency.",
        success: "Bridge lane is unlocked.",
        requiredSnippets: [{ snippet: "hero.build_bridge(\"right\")" }],
        requiredGoalIds: ["g1", "g2", "g3"],
      },
      {
        id: "r37-step-2",
        title: "Step 2: control lane",
        instruction: "Move to upper lane, trigger switch, and collect key before returning down.",
        coach: "Control lane should finish before final combat lane starts.",
        success: "Switch and key are both done.",
        requiredSnippets: [{ snippet: "hero.step_on_switch()" }],
        requiredGoalIds: ["g4", "g5", "g6"],
      },
      {
        id: "r37-step-3",
        title: "Step 3: branch gate finish",
        instruction: "Clear guard, open gate in `if has_key:`, collect crystal, report, and exit.",
        coach: "Keep final sequence ordered: attack -> branch open -> collect -> status -> exit.",
        success: "River decision challenge complete.",
        requiredSnippets: [
          { snippet: "has_key = True" },
          { snippet: "if has_key:\n    hero.open_door()" },
        ],
        requiredGoalIds: ["g7", "g8", "g9", "g10", "g11"],
      },
    ],
    mentor: {
      name: "River Instructor",
      avatar: "R",
      intro: "This level focuses on control logic and stable execution order under pressure.",
      success: "Great routing. Your branch logic and mechanism order are both solid.",
    },
    scene: {
      theme: "dungeonScene",
      background: "/code-research/calciumtrice-dungeon/scene-river-crossing-v1.png",
      sourceWidth: 1600,
      sourceHeight: 900,
      grid: { left: 214, top: 432, width: 1120, height: 0 },
      tokenScale: 1.22,
    },
    mapPosition: { left: 86, top: 78 },
    width: 16,
    height: 7,
    terrain: [
      { id: "r37-water", kind: "water", label: "river lane", x: 3, y: 4 },
      { id: "r37-rune", kind: "rune", label: "control rune", x: 7, y: 2 },
      { id: "r37-wall-a", kind: "wall", label: "river wall", x: 1, y: 1 },
      { id: "r37-hazard", kind: "hazard", label: "river hazard", x: 14, y: 1 },
    ],
    bridges: [{ id: "r37-bridge", label: "river bridge", requiresItemId: "r37-plank", x: 3, y: 4 }],
    switches: [{ id: "r37-switch", label: "river switch", x: 7, y: 2 }],
    doors: [{ id: "r37-door", label: "decision gate", requiresItemId: "r37-key", x: 12, y: 4 }],
    heroStart: { x: 0, y: 4 },
    exit: { x: 15, y: 4 },
    items: [
      { id: "r37-plank", kind: "plank", label: "river plank", x: 2, y: 4 },
      { id: "r37-scroll", kind: "scroll", label: "river scroll", x: 8, y: 2 },
      { id: "r37-key", kind: "key", label: "decision key", x: 9, y: 2 },
      { id: "r37-coin", kind: "coin", label: "river coin", x: 10, y: 4 },
      { id: "r37-crystal", kind: "crystal", label: "decision crystal", x: 14, y: 4 },
    ],
    enemies: [{ id: "r37-guard", label: "river guard", kind: "guard", hp: 1, x: 11, y: 4 }],
    starterCode: `# Task: river decision 37
hero.scan_map()
# TODO: collect plank, build bridge, and cross
# TODO: trigger switch and collect key on upper lane
# TODO: clear guard, open gate with if has_key, collect crystal, report, exit`,
    solution: `hero.scan_map()
for _ in range(2):
    hero.move_right()
hero.collect()
hero.build_bridge("right")
for _ in range(4):
    hero.move_right()
hero.move_up()
hero.move_up()
hero.move_right()
hero.step_on_switch()
hero.move_right()
hero.collect()
hero.move_right()
hero.collect()
hero.move_down()
hero.move_down()
hero.move_right()
hero.collect()
hero.attack()
hero.move_right()
has_key = True
if has_key:
    hero.open_door()
hero.move_right()
hero.move_right()
hero.move_right()
hero.collect()
hero.say("river route synced")
hero.move_right()`,
    goals: [
      { id: "g1", kind: "scan", label: "scan river route" },
      { id: "g2", kind: "collect", targetId: "r37-plank", label: "collect river plank" },
      { id: "g3", kind: "buildBridge", targetId: "r37-bridge", label: "build river bridge" },
      { id: "g4", kind: "activateSwitch", targetId: "r37-switch", label: "trigger river switch" },
      { id: "g5", kind: "collect", targetId: "r37-scroll", label: "collect river scroll" },
      { id: "g6", kind: "collect", targetId: "r37-key", label: "collect decision key" },
      { id: "g7", kind: "defeat", targetId: "r37-guard", label: "defeat river guard" },
      { id: "g8", kind: "openDoor", targetId: "r37-door", label: "open decision gate" },
      { id: "g9", kind: "collect", targetId: "r37-crystal", label: "collect decision crystal" },
      { id: "g10", kind: "say", label: "broadcast route sync" },
      { id: "g11", kind: "exit", label: "reach river exit" },
    ],
    hints: [
      "Bridge lane first, then upper control lane.",
      "Switch and key should be cleared before entering final combat lane.",
      "Open gate from adjacent tile and only after key is collected.",
    ],
    briefing: [
      "Scan map, collect plank, build bridge, and cross to control zone.",
      "Trigger switch and collect scroll + key on upper lane, then return down.",
      "Clear guard, open gate via branch, collect crystal, report sync, and exit.",
    ],
    failureTips: {
      bridgeItem: "River bridge requires river plank before build_bridge.",
      switch: "Stand on river switch tile before step_on_switch.",
      doorKey: "Decision gate requires decision key before open_door.",
      enemy: "Clear river guard before attempting to pass the gate lane.",
      missingGoal: "Check scan, bridge, switch, key, guard, gate, crystal, sync, and exit goals.",
    },
    parSteps: 33,
    xpReward: 350,
    coinReward: 112,
  },
  {
    id: "temple-overclock-38",
    title: "Temple Overclock 38",
    subtitle: "function route + dual gate + print sync",
    description:
      "An end-stage temple challenge with long pipeline flow. Use helper function structure, complete control lanes, then execute final gate and crystal extraction sequence.",
    mapTitle: "Temple Core",
    difficulty: "挑战",
    biome: "dungeon",
    concepts: ["def helper", "long pipeline sequencing", "print verification"],
    toolbox: [
      "def enter_upper():",
      "enter_upper()",
      "hero.scan_map()",
      "for _ in range(n):",
      "hero.move_right()",
      "hero.move_up()",
      "hero.move_down()",
      "hero.collect()",
      "hero.build_bridge(\"right\")",
      "hero.step_on_switch()",
      "hero.attack()",
      "hero.open_door()",
      "print(\"...\")",
    ],
    task: {
      mode: "capstone",
      title: "Complete temple overclock pipeline",
      summary:
        "Scan, bridge, helper lane, switch, key, guard, inner gate, crystal, and print sync in one coherent Python script.",
      checklist: [
        "helper structure and bridge segment complete",
        "control lane switch + key complete",
        "guard + inner gate + crystal + print + exit complete",
      ],
      requireCodeChange: true,
    },
    tutorialSteps: [
      {
        id: "t38-step-1",
        title: "Step 1: script structure",
        instruction: "Define enter_upper() and use it right after crossing the bridge.",
        coach: "Function extraction keeps long scripts maintainable.",
        success: "Function structure is established.",
        requiredSnippets: [{ snippet: "def enter_upper():" }, { snippet: "enter_upper()" }],
      },
      {
        id: "t38-step-2",
        title: "Step 2: control lane completion",
        instruction: "Trigger switch and collect scroll + key in upper lane before dropping to final lane.",
        coach: "Complete all prerequisites before final combat/gate sequence.",
        success: "Control prerequisites complete.",
        requiredSnippets: [{ snippet: "hero.step_on_switch()" }],
        requiredGoalIds: ["g1", "g2", "g3", "g4", "g5", "g6"],
      },
      {
        id: "t38-step-3",
        title: "Step 3: overclock finish",
        instruction: "Clear guard, open inner gate, collect crystal, print status, and exit.",
        coach: "Final sequence must remain linear and deterministic.",
        success: "Temple overclock complete.",
        requiredSnippets: [{ snippet: "print(\"overclock synced\")" }],
        requiredGoalIds: ["g7", "g8", "g9", "g10", "g11"],
      },
    ],
    mentor: {
      name: "Temple Core Mentor",
      avatar: "X",
      intro: "This mission tests whether your Python structure remains clean under longer pipelines.",
      success: "Excellent. You shipped a complete, readable, and correct final pipeline.",
    },
    scene: {
      theme: "dungeonScene",
      background: "/code-research/calciumtrice-dungeon/scene-terminal-temple-v1.png",
      sourceWidth: 1600,
      sourceHeight: 900,
      grid: { left: 214, top: 430, width: 1120, height: 0 },
      tokenScale: 1.23,
    },
    mapPosition: { left: 99, top: 82, size: "large" },
    width: 17,
    height: 8,
    terrain: [
      { id: "t38-water", kind: "water", label: "temple water lane", x: 3, y: 4 },
      { id: "t38-rune", kind: "rune", label: "core rune", x: 7, y: 2 },
      { id: "t38-wall-a", kind: "wall", label: "core wall", x: 1, y: 1 },
      { id: "t38-hazard", kind: "hazard", label: "core hazard", x: 15, y: 1 },
    ],
    bridges: [{ id: "t38-bridge", label: "core bridge", requiresItemId: "t38-plank", x: 3, y: 4 }],
    switches: [{ id: "t38-switch", label: "core switch", opensDoorId: "t38-door-a", x: 7, y: 2 }],
    doors: [
      { id: "t38-door-a", label: "outer core gate", x: 11, y: 4 },
      { id: "t38-door-b", label: "inner core gate", requiresItemId: "t38-key", x: 14, y: 4 },
    ],
    heroStart: { x: 0, y: 4 },
    exit: { x: 16, y: 4 },
    items: [
      { id: "t38-plank", kind: "plank", label: "core plank", x: 2, y: 4 },
      { id: "t38-scroll", kind: "scroll", label: "core scroll", x: 8, y: 2 },
      { id: "t38-key", kind: "key", label: "core key", x: 9, y: 2 },
      { id: "t38-coin", kind: "coin", label: "core coin", x: 12, y: 4 },
      { id: "t38-crystal", kind: "crystal", label: "core crystal", x: 15, y: 4 },
    ],
    enemies: [{ id: "t38-guard", label: "core guard", kind: "guard", hp: 1, x: 13, y: 4 }],
    starterCode: `# Task: temple overclock 38
def enter_upper():
    # TODO: move up twice

hero.scan_map()
# TODO: collect plank and build bridge
# TODO: call enter_upper(), trigger switch, collect scroll + key
# TODO: clear guard, open inner gate, collect crystal, print sync, exit`,
    solution: `def enter_upper():
    hero.move_up()
    hero.move_up()

hero.scan_map()
for _ in range(2):
    hero.move_right()
hero.collect()
hero.build_bridge("right")
for _ in range(4):
    hero.move_right()
enter_upper()
hero.move_right()
hero.step_on_switch()
hero.move_right()
hero.collect()
hero.move_right()
hero.collect()
hero.move_down()
hero.move_down()
hero.move_right()
hero.move_right()
hero.move_right()
hero.collect()
hero.attack()
hero.move_right()
hero.open_door()
hero.move_right()
hero.move_right()
hero.collect()
print("overclock synced")
hero.move_right()`,
    goals: [
      { id: "g1", kind: "scan", label: "scan temple core" },
      { id: "g2", kind: "collect", targetId: "t38-plank", label: "collect core plank" },
      { id: "g3", kind: "buildBridge", targetId: "t38-bridge", label: "build core bridge" },
      { id: "g4", kind: "activateSwitch", targetId: "t38-switch", label: "trigger core switch" },
      { id: "g5", kind: "collect", targetId: "t38-scroll", label: "collect core scroll" },
      { id: "g6", kind: "collect", targetId: "t38-key", label: "collect core key" },
      { id: "g7", kind: "defeat", targetId: "t38-guard", label: "defeat core guard" },
      { id: "g8", kind: "openDoor", targetId: "t38-door-b", label: "open inner core gate" },
      { id: "g9", kind: "collect", targetId: "t38-crystal", label: "collect core crystal" },
      { id: "g10", kind: "say", label: "broadcast overclock sync" },
      { id: "g11", kind: "exit", label: "reach core exit" },
    ],
    hints: [
      "Bridge segment first, then helper function to enter control lane.",
      "Switch and key are prerequisites for a stable final lane run.",
      "Open inner gate only after guard is cleared and key is collected.",
    ],
    briefing: [
      "Scan map, collect plank, and build bridge before lane transition.",
      "Use helper function for upper lane and complete switch + scroll + key.",
      "Return to final lane, clear guard, open inner gate, collect crystal, print sync, and exit.",
    ],
    failureTips: {
      bridgeItem: "Core bridge requires core plank before build_bridge.",
      switch: "Stand on core switch tile before step_on_switch.",
      doorKey: "Inner core gate requires core key before open_door.",
      enemy: "Defeat core guard before trying to pass inner gate lane.",
      missingGoal: "Check scan, bridge, switch, key, guard, inner gate, crystal, sync, and exit goals.",
    },
    parSteps: 36,
    xpReward: 368,
    coinReward: 120,
  },
  {
    id: "river-threshold-39",
    title: "River Threshold 39",
    subtitle: "comparison branch + bridge pipeline",
    description:
      "A harder river route that requires comparison-based branch logic. Build bridge, complete control lane, then open gate only when threshold condition is met.",
    mapTitle: "River Threshold",
    difficulty: "挑战",
    biome: "river",
    concepts: ["if/elif/else", "comparison >=", "bridge + switch sequencing"],
    toolbox: [
      "hero.scan_map()",
      "for _ in range(n):",
      "hero.move_right()",
      "hero.move_up()",
      "hero.move_down()",
      "hero.collect()",
      "hero.build_bridge(\"right\")",
      "hero.step_on_switch()",
      "hero.attack()",
      "risk_score = 3",
      "if risk_score > 3:",
      "elif risk_score >= 3:",
      "hero.open_door()",
      "hero.wait_turn()",
      "print(\"...\")",
    ],
    task: {
      mode: "capstone",
      title: "Complete threshold route",
      summary:
        "Scan, bridge, switch, key collection, guard clear, then gate opening through explicit comparison-based if/else logic.",
      checklist: [
        "bridge + control lane complete",
        "key + guard sequence complete",
        "threshold branch gate + crystal + exit complete",
      ],
      requireCodeChange: true,
    },
    tutorialSteps: [
      {
        id: "r39-step-1",
        title: "Step 1: prep lanes",
        instruction: "Collect plank, build bridge, then finish upper control lane with switch + scroll + key.",
        coach: "Control prerequisites should finish before final lane execution.",
        success: "Control lane is fully prepared.",
        requiredSnippets: [{ snippet: "hero.build_bridge(\"right\")" }, { snippet: "hero.step_on_switch()" }],
        requiredGoalIds: ["g1", "g2", "g3", "g4", "g5", "g6"],
      },
      {
        id: "r39-step-2",
        title: "Step 2: combat lane",
        instruction: "Return to main lane, collect coin, and clear guard from adjacent tile.",
        coach: "Do not step onto enemy tiles; attack from adjacency first.",
        success: "Final lane is unlocked.",
        requiredSnippets: [{ snippet: "hero.attack()" }],
        requiredGoalIds: ["g7", "g8"],
      },
      {
        id: "r39-step-3",
        title: "Step 3: threshold branch finish",
        instruction: "Use risk_score if/elif/else branch to open gate, then collect crystal, sync status, and exit.",
        coach: "Keep branch logic explicit and readable for review.",
        success: "Threshold mission complete.",
        requiredSnippets: [
          { snippet: "risk_score = 3" },
          { snippet: "elif risk_score >= 3:\n    hero.open_door()" },
          { snippet: "else:\n    hero.wait_turn()" },
        ],
        requiredGoalIds: ["g9", "g10", "g11", "g12"],
      },
    ],
    mentor: {
      name: "Threshold Analyst",
      avatar: "T",
      intro: "This mission checks whether you can combine route control and explicit comparison logic.",
      success: "Great execution. Your branch logic and path ordering are both stable.",
    },
    scene: {
      theme: "dungeonScene",
      background: "/code-research/calciumtrice-dungeon/scene-river-crossing-v1.png",
      sourceWidth: 1600,
      sourceHeight: 900,
      grid: { left: 214, top: 432, width: 1120, height: 0 },
      tokenScale: 1.22,
    },
    mapPosition: { left: 90, top: 92 },
    width: 16,
    height: 7,
    terrain: [
      { id: "r39-water", kind: "water", label: "threshold water", x: 3, y: 4 },
      { id: "r39-rune", kind: "rune", label: "threshold rune", x: 7, y: 2 },
      { id: "r39-wall-a", kind: "wall", label: "river wall", x: 1, y: 1 },
      { id: "r39-hazard", kind: "hazard", label: "river hazard", x: 14, y: 1 },
    ],
    bridges: [{ id: "r39-bridge", label: "threshold bridge", requiresItemId: "r39-plank", x: 3, y: 4 }],
    switches: [{ id: "r39-switch", label: "threshold switch", x: 7, y: 2 }],
    doors: [{ id: "r39-door", label: "threshold gate", requiresItemId: "r39-key", x: 12, y: 4 }],
    heroStart: { x: 0, y: 4 },
    exit: { x: 15, y: 4 },
    items: [
      { id: "r39-plank", kind: "plank", label: "threshold plank", x: 2, y: 4 },
      { id: "r39-scroll", kind: "scroll", label: "threshold scroll", x: 8, y: 2 },
      { id: "r39-key", kind: "key", label: "threshold key", x: 9, y: 2 },
      { id: "r39-coin", kind: "coin", label: "threshold coin", x: 10, y: 4 },
      { id: "r39-crystal", kind: "crystal", label: "threshold crystal", x: 14, y: 4 },
    ],
    enemies: [{ id: "r39-guard", label: "threshold guard", kind: "guard", hp: 1, x: 11, y: 4 }],
    starterCode: `# Task: river threshold 39
hero.scan_map()
# TODO: bridge setup + switch lane + key
# TODO: clear guard, then gate logic with risk_score comparison
# TODO: collect crystal, sync status, and exit`,
    solution: `hero.scan_map()
for _ in range(2):
    hero.move_right()
hero.collect()
hero.build_bridge("right")
for _ in range(4):
    hero.move_right()
hero.move_up()
hero.move_up()
hero.move_right()
hero.step_on_switch()
hero.move_right()
hero.collect()
hero.move_right()
hero.collect()
hero.move_down()
hero.move_down()
hero.move_right()
hero.collect()
hero.attack()
hero.move_right()
risk_score = 3
if risk_score > 3:
    hero.wait_turn()
elif risk_score >= 3:
    hero.open_door()
else:
    hero.wait_turn()
hero.move_right()
hero.move_right()
hero.move_right()
hero.collect()
print("threshold synced")
hero.move_right()`,
    goals: [
      { id: "g1", kind: "scan", label: "scan threshold route" },
      { id: "g2", kind: "collect", targetId: "r39-plank", label: "collect threshold plank" },
      { id: "g3", kind: "buildBridge", targetId: "r39-bridge", label: "build threshold bridge" },
      { id: "g4", kind: "activateSwitch", targetId: "r39-switch", label: "trigger threshold switch" },
      { id: "g5", kind: "collect", targetId: "r39-scroll", label: "collect threshold scroll" },
      { id: "g6", kind: "collect", targetId: "r39-key", label: "collect threshold key" },
      { id: "g7", kind: "collect", targetId: "r39-coin", label: "collect threshold coin" },
      { id: "g8", kind: "defeat", targetId: "r39-guard", label: "defeat threshold guard" },
      { id: "g9", kind: "openDoor", targetId: "r39-door", label: "open threshold gate" },
      { id: "g10", kind: "collect", targetId: "r39-crystal", label: "collect threshold crystal" },
      { id: "g11", kind: "say", label: "broadcast threshold sync" },
      { id: "g12", kind: "exit", label: "reach threshold exit" },
    ],
    hints: [
      "Bridge and upper-lane prerequisites should be completed first.",
      "Comparison branch should be placed right before opening the gate.",
      "Collect crystal only after gate is opened.",
    ],
    briefing: [
      "Scan route, collect plank, build bridge, and complete switch + scroll + key lane.",
      "Return down, collect coin, and defeat the guard from adjacency.",
      "Use risk threshold branch to open gate, then collect crystal, sync status, and exit.",
    ],
    failureTips: {
      bridgeItem: "Threshold bridge requires threshold plank before build_bridge.",
      switch: "Stand on threshold switch tile before step_on_switch.",
      doorKey: "Threshold gate requires threshold key before open_door.",
      enemy: "Defeat threshold guard before trying to pass the gate lane.",
      missingGoal: "Check scan, bridge, switch, key, coin, guard, gate, crystal, sync, and exit goals.",
    },
    parSteps: 35,
    xpReward: 382,
    coinReward: 124,
  },
  {
    id: "ruins-signal-function-40",
    title: "Ruins Signal Function 40",
    subtitle: "def helper + branch gate finish",
    description:
      "A deeper ruins mission that combines helper-function structure with conditional final-lane execution and dual-gate routing.",
    mapTitle: "Signal Ruins",
    difficulty: "挑战",
    biome: "ruins",
    concepts: ["def helper", "if boolean", "or logical operator", "switch + keyed gate pipeline"],
    toolbox: [
      "def climb_control():",
      "climb_control()",
      "hero.scan_map()",
      "for _ in range(n):",
      "hero.move_right()",
      "hero.move_up()",
      "hero.move_down()",
      "hero.collect()",
      "hero.step_on_switch()",
      "hero.attack()",
      "ready = True",
      "fallback = False",
      "if ready or fallback:",
      "hero.open_door()",
      "hero.say(\"...\")",
    ],
    task: {
      mode: "capstone",
      title: "Complete signal function route",
      summary:
        "Use helper movement for control lane, trigger switch, collect key + scroll, clear guard, then use branch logic to open final gate and extract crystal.",
      checklist: [
        "helper + control lane complete",
        "switch + key + scroll complete",
        "guard + branch gate + crystal + exit complete",
      ],
      requireCodeChange: true,
    },
    tutorialSteps: [
      {
        id: "r40-step-1",
        title: "Step 1: helper structure",
        instruction: "Define and call climb_control() to enter upper lane cleanly.",
        coach: "Use helper extraction to keep long scripts readable.",
        success: "Helper structure is in place.",
        requiredSnippets: [{ snippet: "def climb_control():" }, { snippet: "climb_control()" }],
      },
      {
        id: "r40-step-2",
        title: "Step 2: control prerequisites",
        instruction: "Complete switch activation and collect scroll before returning to final lane.",
        coach: "Control lane should finish before final combat lane starts.",
        success: "Control lane is complete.",
        requiredSnippets: [{ snippet: "hero.step_on_switch()" }],
        requiredGoalIds: ["g1", "g2", "g3", "g4", "g5"],
      },
      {
        id: "r40-step-3",
        title: "Step 3: branch finish",
        instruction:
          "Defeat guard, then use ready/fallback boolean branch (`ready or fallback`) to open gate, collect crystal, sync, and exit.",
        coach: "Keep boolean branch near the gate operation for clarity.",
        success: "Signal function challenge complete.",
        requiredSnippets: [{ snippet: "if ready or fallback:\n    hero.move_right()\n    hero.open_door()" }],
        requiredGoalIds: ["g6", "g7", "g8", "g9", "g10"],
      },
    ],
    mentor: {
      name: "Signal Operator",
      avatar: "S",
      intro: "This challenge tests route decomposition and precise branch execution.",
      success: "Excellent. Your helper structure and branch gate flow are both robust.",
    },
    scene: {
      theme: "dungeonScene",
      background: "/code-research/calciumtrice-dungeon/scene-scan-ruins-v1.png",
      sourceWidth: 1600,
      sourceHeight: 900,
      grid: { left: 214, top: 432, width: 1120, height: 0 },
      tokenScale: 1.22,
    },
    mapPosition: { left: 94, top: 70, size: "large" },
    width: 16,
    height: 8,
    terrain: [
      { id: "r40-rune", kind: "rune", label: "signal rune", x: 6, y: 3 },
      { id: "r40-wall-a", kind: "wall", label: "ruins wall", x: 1, y: 1 },
      { id: "r40-wall-b", kind: "wall", label: "ruins wall", x: 2, y: 7 },
      { id: "r40-hazard", kind: "hazard", label: "ruins hazard", x: 14, y: 1 },
    ],
    switches: [{ id: "r40-switch", label: "signal switch", opensDoorId: "r40-door-a", x: 6, y: 3 }],
    doors: [
      { id: "r40-door-a", label: "outer signal gate", x: 10, y: 5 },
      { id: "r40-door-b", label: "inner signal gate", requiresItemId: "r40-key", x: 13, y: 5 },
    ],
    heroStart: { x: 0, y: 5 },
    exit: { x: 15, y: 5 },
    items: [
      { id: "r40-key", kind: "key", label: "signal key", x: 2, y: 5 },
      { id: "r40-scroll", kind: "scroll", label: "signal scroll", x: 7, y: 3 },
      { id: "r40-coin", kind: "coin", label: "signal coin", x: 9, y: 5 },
      { id: "r40-crystal", kind: "crystal", label: "signal crystal", x: 14, y: 5 },
    ],
    enemies: [{ id: "r40-bug", label: "signal bug", kind: "bug", hp: 1, x: 12, y: 5 }],
    starterCode: `# Task: ruins signal function 40
def climb_control():
    # TODO: move up twice

hero.scan_map()
# TODO: collect key and move to switch lane
# TODO: clear guard, open inner gate via ready branch, collect crystal, and exit`,
    solution: `def climb_control():
    hero.move_up()
    hero.move_up()

hero.scan_map()
for _ in range(2):
    hero.move_right()
hero.collect()
for _ in range(3):
    hero.move_right()
climb_control()
hero.move_right()
hero.step_on_switch()
hero.move_right()
hero.collect()
hero.move_down()
hero.move_down()
hero.move_right()
hero.move_right()
hero.collect()
hero.move_right()
hero.move_right()
hero.attack()
ready = True
fallback = False
if ready or fallback:
    hero.move_right()
    hero.open_door()
hero.move_right()
hero.move_right()
hero.collect()
hero.say("signal synced")
hero.move_right()`,
    goals: [
      { id: "g1", kind: "scan", label: "scan signal ruins" },
      { id: "g2", kind: "collect", targetId: "r40-key", label: "collect signal key" },
      { id: "g3", kind: "activateSwitch", targetId: "r40-switch", label: "trigger signal switch" },
      { id: "g4", kind: "collect", targetId: "r40-scroll", label: "collect signal scroll" },
      { id: "g5", kind: "collect", targetId: "r40-coin", label: "collect signal coin" },
      { id: "g6", kind: "defeat", targetId: "r40-bug", label: "defeat signal bug" },
      { id: "g7", kind: "openDoor", targetId: "r40-door-b", label: "open inner signal gate" },
      { id: "g8", kind: "collect", targetId: "r40-crystal", label: "collect signal crystal" },
      { id: "g9", kind: "say", label: "broadcast signal sync" },
      { id: "g10", kind: "exit", label: "reach signal exit" },
    ],
    hints: [
      "Call climb_control() right before entering upper control lane.",
      "Switch opens outer gate, but inner gate still needs key and branch flow.",
      "Attack bug from adjacent tile before entering inner gate segment.",
      "Use `ready or fallback` branch right before gate open for resilient logic.",
    ],
    briefing: [
      "Scan and collect key on main lane before going into control lane.",
      "Trigger switch and collect scroll, then return to final lane.",
      "Defeat bug, open inner gate in ready/fallback branch flow, collect crystal, sync, and exit.",
    ],
    failureTips: {
      switch: "Stand on signal switch tile before step_on_switch.",
      doorKey: "Inner signal gate requires signal key before open_door.",
      enemy: "Defeat signal bug before advancing to inner gate.",
      missingGoal: "Check scan, key, switch, scroll, coin, bug, gate, crystal, sync, and exit goals.",
    },
    parSteps: 34,
    xpReward: 398,
    coinReward: 128,
  },
  {
    id: "temple-loop-guard-41",
    title: "Temple Loop Guard 41",
    subtitle: "dual combat + numeric branch",
    description:
      "A high-pressure temple route with two enemy clears, dual-gate pathing, and numeric condition logic for final combat sequencing.",
    mapTitle: "Loop Temple",
    difficulty: "挑战",
    biome: "dungeon",
    concepts: ["comparison if", "arithmetic assignment (+)", "multi-enemy sequencing", "bridge + switch + key gate"],
    toolbox: [
      "hero.scan_map()",
      "for _ in range(n):",
      "hero.move_right()",
      "hero.move_up()",
      "hero.move_down()",
      "hero.collect()",
      "hero.build_bridge(\"right\")",
      "hero.step_on_switch()",
      "hero.attack()",
      "enemy_count = 1 + 1",
      "if enemy_count >= 2:",
      "hero.open_door()",
      "print(\"...\")",
    ],
    task: {
      mode: "capstone",
      title: "Complete loop guard route",
      summary:
        "Build bridge, clear upper controls, then defeat dual guards and finish keyed gate segment with explicit comparison logic.",
      checklist: [
        "bridge + upper control lane complete",
        "coin + dual-guard lane complete",
        "gate + crystal + sync + exit complete",
      ],
      requireCodeChange: true,
    },
    tutorialSteps: [
      {
        id: "t41-step-1",
        title: "Step 1: setup lanes",
        instruction: "Collect plank, build bridge, then complete switch + scroll + key on upper lane.",
        coach: "Finish control setup before engaging final combat lane.",
        success: "Control prerequisites are complete.",
        requiredSnippets: [{ snippet: "hero.build_bridge(\"right\")" }, { snippet: "hero.step_on_switch()" }],
        requiredGoalIds: ["g1", "g2", "g3", "g4", "g5", "g6"],
      },
      {
        id: "t41-step-2",
        title: "Step 2: dual guard clear",
        instruction: "Collect coin and defeat both guards in sequence from adjacent tiles.",
        coach: "Treat each enemy as a gate; clear one, then advance to the next.",
        success: "Both guards are cleared.",
        requiredSnippets: [{ snippet: "hero.attack()" }],
        requiredGoalIds: ["g7", "g8", "g9"],
      },
      {
        id: "t41-step-3",
        title: "Step 3: branch gate finish",
        instruction: "Use arithmetic assignment for enemy_count, then run comparison branch, open final gate, collect crystal, sync, and exit.",
        coach: "Comparison branch should appear directly around combat-to-gate handoff.",
        success: "Loop guard challenge complete.",
        requiredSnippets: [
          { snippet: "enemy_count = 1 + 1" },
          { snippet: "if enemy_count >= 2:\n    hero.attack()" },
          { snippet: "print(\"loop guard synced\")" },
        ],
        requiredGoalIds: ["g10", "g11", "g12", "g13"],
      },
    ],
    mentor: {
      name: "Temple Tactician",
      avatar: "L",
      intro: "This route checks whether your Python control flow remains deterministic under pressure.",
      success: "Strong combat flow. Your branch and gate sequencing stayed clean.",
    },
    scene: {
      theme: "dungeonScene",
      background: "/code-research/calciumtrice-dungeon/scene-terminal-temple-v1.png",
      sourceWidth: 1600,
      sourceHeight: 900,
      grid: { left: 214, top: 430, width: 1120, height: 0 },
      tokenScale: 1.23,
    },
    mapPosition: { left: 95, top: 80, size: "large" },
    width: 17,
    height: 8,
    terrain: [
      { id: "t41-water", kind: "water", label: "loop water lane", x: 3, y: 4 },
      { id: "t41-rune", kind: "rune", label: "loop rune", x: 7, y: 2 },
      { id: "t41-wall-a", kind: "wall", label: "loop wall", x: 1, y: 1 },
      { id: "t41-hazard", kind: "hazard", label: "loop hazard", x: 15, y: 1 },
    ],
    bridges: [{ id: "t41-bridge", label: "loop bridge", requiresItemId: "t41-plank", x: 3, y: 4 }],
    switches: [{ id: "t41-switch", label: "loop switch", opensDoorId: "t41-door-a", x: 7, y: 2 }],
    doors: [
      { id: "t41-door-a", label: "outer loop gate", x: 11, y: 4 },
      { id: "t41-door-b", label: "inner loop gate", requiresItemId: "t41-key", x: 14, y: 4 },
    ],
    heroStart: { x: 0, y: 4 },
    exit: { x: 16, y: 4 },
    items: [
      { id: "t41-plank", kind: "plank", label: "loop plank", x: 2, y: 4 },
      { id: "t41-scroll", kind: "scroll", label: "loop scroll", x: 8, y: 2 },
      { id: "t41-key", kind: "key", label: "loop key", x: 9, y: 2 },
      { id: "t41-coin", kind: "coin", label: "loop coin", x: 10, y: 4 },
      { id: "t41-crystal", kind: "crystal", label: "loop crystal", x: 15, y: 4 },
    ],
    enemies: [
      { id: "t41-guard-a", label: "loop guard alpha", kind: "guard", hp: 1, x: 12, y: 4 },
      { id: "t41-guard-b", label: "loop guard beta", kind: "bug", hp: 1, x: 13, y: 4 },
    ],
    starterCode: `# Task: temple loop guard 41
hero.scan_map()
# TODO: bridge + switch + key setup
# TODO: clear both guards and use numeric branch near gate
# TODO: collect crystal, sync, and exit`,
    solution: `hero.scan_map()
for _ in range(2):
    hero.move_right()
hero.collect()
hero.build_bridge("right")
for _ in range(4):
    hero.move_right()
hero.move_up()
hero.move_up()
hero.move_right()
hero.step_on_switch()
hero.move_right()
hero.collect()
hero.move_right()
hero.collect()
hero.move_down()
hero.move_down()
hero.move_right()
hero.collect()
hero.move_right()
enemy_count = 1 + 1
if enemy_count >= 2:
    hero.attack()
hero.move_right()
hero.attack()
hero.move_right()
hero.open_door()
hero.move_right()
hero.move_right()
hero.collect()
print("loop guard synced")
hero.move_right()`,
    goals: [
      { id: "g1", kind: "scan", label: "scan loop temple" },
      { id: "g2", kind: "collect", targetId: "t41-plank", label: "collect loop plank" },
      { id: "g3", kind: "buildBridge", targetId: "t41-bridge", label: "build loop bridge" },
      { id: "g4", kind: "activateSwitch", targetId: "t41-switch", label: "trigger loop switch" },
      { id: "g5", kind: "collect", targetId: "t41-scroll", label: "collect loop scroll" },
      { id: "g6", kind: "collect", targetId: "t41-key", label: "collect loop key" },
      { id: "g7", kind: "collect", targetId: "t41-coin", label: "collect loop coin" },
      { id: "g8", kind: "defeat", targetId: "t41-guard-a", label: "defeat loop guard alpha" },
      { id: "g9", kind: "defeat", targetId: "t41-guard-b", label: "defeat loop guard beta" },
      { id: "g10", kind: "openDoor", targetId: "t41-door-b", label: "open inner loop gate" },
      { id: "g11", kind: "collect", targetId: "t41-crystal", label: "collect loop crystal" },
      { id: "g12", kind: "say", label: "broadcast loop sync" },
      { id: "g13", kind: "exit", label: "reach loop exit" },
    ],
    hints: [
      "Do control setup before entering combat lane.",
      "Use arithmetic assignment + numeric branch to make combat intent explicit.",
      "Open inner gate only after both guards are cleared.",
    ],
    briefing: [
      "Scan, bridge, and complete switch + scroll + key on upper lane.",
      "Collect coin and defeat both guards in order.",
      "Open inner gate, collect crystal, sync status, and exit.",
    ],
    failureTips: {
      bridgeItem: "Loop bridge requires loop plank before build_bridge.",
      switch: "Stand on loop switch tile before step_on_switch.",
      doorKey: "Inner loop gate requires loop key before open_door.",
      enemy: "Defeat both loop guards before trying to pass inner gate lane.",
      missingGoal: "Check scan, bridge, switch, key, coin, guards, gate, crystal, sync, and exit goals.",
    },
    parSteps: 37,
    xpReward: 412,
    coinReward: 132,
  },
  {
    id: "temple-vector-route-42",
    title: "Temple Vector Route 42",
    subtitle: "variable-driven movement + key branch",
    description:
      "A route-planning mission focused on Python variable-driven movement. Use direction variable movement, complete controls, then branch-open the final gate.",
    mapTitle: "Vector Temple",
    difficulty: "挑战",
    biome: "dungeon",
    concepts: ["hero.move(direction_var)", "integer division //", "if has_key branch", "switch + keyed gate"],
    toolbox: [
      "hero.scan_map()",
      "route = \"right\"",
      "entry_steps = 4 // 2",
      "hero.move(route)",
      "for _ in range(n):",
      "hero.move_right()",
      "hero.move_up()",
      "hero.move_down()",
      "hero.collect()",
      "hero.step_on_switch()",
      "hero.attack()",
      "if has_key:",
      "hero.open_door()",
      "print(\"...\")",
    ],
    task: {
      mode: "capstone",
      title: "Complete vector route",
      summary:
        "Use variable-driven movement for entry segment, finish switch + key requirements, clear sentinel, then open gate in has_key branch and extract crystal.",
      checklist: [
        "variable movement segment complete",
        "switch + key + coin lane complete",
        "sentinel + branch gate + crystal + exit complete",
      ],
      requireCodeChange: true,
    },
    tutorialSteps: [
      {
        id: "t42-step-1",
        title: "Step 1: variable movement",
        instruction: "Declare route and entry_steps variables, then use hero.move(route) in range(entry_steps).",
        coach: "Variable-driven commands are useful when route values can change.",
        success: "Vector movement setup complete.",
        requiredSnippets: [
          { snippet: "route = \"right\"" },
          { snippet: "entry_steps = 4 // 2" },
          { snippet: "hero.move(route)" },
        ],
        requiredGoalIds: ["g1", "g2"],
      },
      {
        id: "t42-step-2",
        title: "Step 2: control lane",
        instruction: "Trigger switch and collect scroll before returning to final lane.",
        coach: "Control lane objectives should be completed before combat lane starts.",
        success: "Control lane objectives complete.",
        requiredSnippets: [{ snippet: "hero.step_on_switch()" }],
        requiredGoalIds: ["g3", "g4", "g5"],
      },
      {
        id: "t42-step-3",
        title: "Step 3: branch extraction",
        instruction: "Defeat sentinel, use has_key branch to open gate, collect crystal, sync status, and exit.",
        coach: "Keep the has_key branch close to open_door for readability.",
        success: "Vector route challenge complete.",
        requiredSnippets: [{ snippet: "if has_key:\n    hero.move_right()\n    hero.open_door()" }],
        requiredGoalIds: ["g6", "g7", "g8", "g9", "g10"],
      },
    ],
    mentor: {
      name: "Vector Mentor",
      avatar: "V",
      intro: "This level validates whether your Python variables are driving real runtime behavior.",
      success: "Nice routing. Variable movement and branch gate logic are both correct.",
    },
    scene: {
      theme: "dungeonScene",
      background: "/code-research/calciumtrice-dungeon/scene-terminal-temple-v1.png",
      sourceWidth: 1600,
      sourceHeight: 900,
      grid: { left: 214, top: 430, width: 1120, height: 0 },
      tokenScale: 1.22,
    },
    mapPosition: { left: 88, top: 88, size: "large" },
    width: 17,
    height: 8,
    terrain: [
      { id: "t42-rune", kind: "rune", label: "vector rune", x: 6, y: 3 },
      { id: "t42-wall-a", kind: "wall", label: "vector wall", x: 1, y: 1 },
      { id: "t42-hazard", kind: "hazard", label: "vector hazard", x: 15, y: 1 },
    ],
    switches: [{ id: "t42-switch", label: "vector switch", opensDoorId: "t42-door-a", x: 6, y: 3 }],
    doors: [
      { id: "t42-door-a", label: "outer vector gate", x: 10, y: 5 },
      { id: "t42-door-b", label: "inner vector gate", requiresItemId: "t42-key", x: 14, y: 5 },
    ],
    heroStart: { x: 0, y: 5 },
    exit: { x: 16, y: 5 },
    items: [
      { id: "t42-key", kind: "key", label: "vector key", x: 2, y: 5 },
      { id: "t42-scroll", kind: "scroll", label: "vector scroll", x: 7, y: 3 },
      { id: "t42-coin", kind: "coin", label: "vector coin", x: 11, y: 5 },
      { id: "t42-crystal", kind: "crystal", label: "vector crystal", x: 15, y: 5 },
    ],
    enemies: [{ id: "t42-sentinel", label: "vector sentinel", kind: "sentinel", hp: 1, x: 13, y: 5 }],
    starterCode: `# Task: temple vector route 42
hero.scan_map()
# TODO: route variable + hero.move(route) for entry
# TODO: complete control lane and coin lane
# TODO: defeat sentinel, open gate in has_key branch, collect crystal, and exit`,
    solution: `hero.scan_map()
route = "right"
entry_steps = 4 // 2
for _ in range(entry_steps):
    hero.move(route)
hero.collect()
for _ in range(3):
    hero.move_right()
hero.move_up()
hero.move_up()
hero.move_right()
hero.step_on_switch()
hero.move_right()
hero.collect()
hero.move_down()
hero.move_down()
hero.move_right()
hero.move_right()
hero.move_right()
hero.move_right()
hero.collect()
hero.move_right()
hero.attack()
has_key = True
if has_key:
    hero.move_right()
    hero.open_door()
hero.move_right()
hero.move_right()
hero.collect()
print("vector route synced")
hero.move_right()`,
    goals: [
      { id: "g1", kind: "scan", label: "scan vector temple" },
      { id: "g2", kind: "collect", targetId: "t42-key", label: "collect vector key" },
      { id: "g3", kind: "activateSwitch", targetId: "t42-switch", label: "trigger vector switch" },
      { id: "g4", kind: "collect", targetId: "t42-scroll", label: "collect vector scroll" },
      { id: "g5", kind: "collect", targetId: "t42-coin", label: "collect vector coin" },
      { id: "g6", kind: "defeat", targetId: "t42-sentinel", label: "defeat vector sentinel" },
      { id: "g7", kind: "openDoor", targetId: "t42-door-b", label: "open inner vector gate" },
      { id: "g8", kind: "collect", targetId: "t42-crystal", label: "collect vector crystal" },
      { id: "g9", kind: "say", label: "broadcast vector sync" },
      { id: "g10", kind: "exit", label: "reach vector exit" },
    ],
    hints: [
      "Use route + entry_steps (with //) to drive the opening movement segment.",
      "Finish control lane before engaging sentinel lane.",
      "Open inner gate only after sentinel is cleared and key is collected.",
    ],
    briefing: [
      "Scan and use route + entry_steps variables to collect vector key.",
      "Finish control lane: switch + scroll, then return to coin lane.",
      "Defeat sentinel, open inner gate in has_key branch, collect crystal, sync, and exit.",
    ],
    failureTips: {
      switch: "Stand on vector switch tile before step_on_switch.",
      doorKey: "Inner vector gate requires vector key before open_door.",
      enemy: "Defeat vector sentinel before pushing into inner gate lane.",
      missingGoal: "Check scan, key, switch, scroll, coin, sentinel, gate, crystal, sync, and exit goals.",
    },
    parSteps: 35,
    xpReward: 426,
    coinReward: 136,
  },
  {
    id: "ruins-comparator-43",
    title: "Ruins Comparator 43",
    subtitle: "equality branch + dual combat lane",
    description:
      "An advanced ruins mission focused on equality comparison branch logic and two-stage combat before final keyed gate extraction.",
    mapTitle: "Comparator Ruins",
    difficulty: "挑战",
    biome: "ruins",
    concepts: ["if/else equality", "modulo %", "dual enemy sequencing", "switch + keyed gate"],
    toolbox: [
      "hero.scan_map()",
      "for _ in range(n):",
      "hero.move_right()",
      "hero.move_up()",
      "hero.move_down()",
      "hero.collect()",
      "hero.step_on_switch()",
      "hero.attack()",
      "remaining = 5 % 3",
      "if remaining == 2:",
      "hero.wait_turn()",
      "hero.open_door()",
      "hero.say(\"...\")",
    ],
    task: {
      mode: "capstone",
      title: "Complete comparator route",
      summary:
        "Use equality branch logic during combat transition, then finish keyed gate extraction with complete objective coverage.",
      checklist: [
        "scan + switch + key lane complete",
        "dual combat lane complete",
        "branch gate + crystal + exit complete",
      ],
      requireCodeChange: true,
    },
    tutorialSteps: [
      {
        id: "r43-step-1",
        title: "Step 1: control lane setup",
        instruction: "Collect key, trigger switch, and collect scroll before returning to final lane.",
        coach: "Control setup should finish before combat branch logic starts.",
        success: "Control lane complete.",
        requiredSnippets: [{ snippet: "hero.scan_map()" }, { snippet: "hero.step_on_switch()" }],
        requiredGoalIds: ["g1", "g2", "g3", "g4"],
      },
      {
        id: "r43-step-2",
        title: "Step 2: equality branch combat",
        instruction: "Use modulo expression for remaining, then run remaining == 2 branch before first attack.",
        coach: "Branch logic should be explicit before first combat decision.",
        success: "Combat branch lane complete.",
        requiredSnippets: [
          { snippet: "remaining = 5 % 3" },
          { snippet: "if remaining == 2:\n    hero.attack()" },
        ],
        requiredGoalIds: ["g5", "g6", "g7"],
      },
      {
        id: "r43-step-3",
        title: "Step 3: keyed gate extraction",
        instruction: "Open keyed gate, collect crystal, broadcast sync, and exit.",
        coach: "Do not skip status broadcast; treat it as production run completion signal.",
        success: "Comparator challenge complete.",
        requiredSnippets: [{ snippet: "has_key = True" }, { snippet: "if has_key:\n    hero.open_door()" }],
        requiredGoalIds: ["g8", "g9", "g10", "g11"],
      },
    ],
    mentor: {
      name: "Comparator Coach",
      avatar: "C",
      intro: "This mission measures whether your branch logic stays deterministic in a multi-combat route.",
      success: "Great control. Equality branching and two-stage combat were executed correctly.",
    },
    scene: {
      theme: "dungeonScene",
      background: "/code-research/calciumtrice-dungeon/scene-scan-ruins-v1.png",
      sourceWidth: 1600,
      sourceHeight: 900,
      grid: { left: 214, top: 432, width: 1120, height: 0 },
      tokenScale: 1.22,
    },
    mapPosition: { left: 84, top: 82 },
    width: 16,
    height: 7,
    terrain: [
      { id: "r43-rune", kind: "rune", label: "comparator rune", x: 5, y: 2 },
      { id: "r43-wall-a", kind: "wall", label: "ruins wall", x: 1, y: 1 },
      { id: "r43-hazard", kind: "hazard", label: "ruins hazard", x: 14, y: 1 },
    ],
    switches: [{ id: "r43-switch", label: "comparator switch", opensDoorId: "r43-door-a", x: 5, y: 2 }],
    doors: [
      { id: "r43-door-a", label: "outer comparator gate", x: 9, y: 4 },
      { id: "r43-door-b", label: "inner comparator gate", requiresItemId: "r43-key", x: 13, y: 4 },
    ],
    heroStart: { x: 0, y: 4 },
    exit: { x: 15, y: 4 },
    items: [
      { id: "r43-key", kind: "key", label: "comparator key", x: 2, y: 4 },
      { id: "r43-scroll", kind: "scroll", label: "comparator scroll", x: 6, y: 2 },
      { id: "r43-coin", kind: "coin", label: "comparator coin", x: 7, y: 4 },
      { id: "r43-crystal", kind: "crystal", label: "comparator crystal", x: 14, y: 4 },
    ],
    enemies: [
      { id: "r43-guard", label: "comparator guard", kind: "guard", hp: 1, x: 10, y: 4 },
      { id: "r43-sentinel", label: "comparator sentinel", kind: "sentinel", hp: 1, x: 12, y: 4 },
    ],
    starterCode: `# Task: ruins comparator 43
hero.scan_map()
# TODO: control lane (switch + scroll + key)
# TODO: use remaining == 2 branch before first attack
# TODO: clear second enemy, open gate, collect crystal, sync, exit`,
    solution: `hero.scan_map()
for _ in range(2):
    hero.move_right()
hero.collect()
hero.move_up()
hero.move_up()
for _ in range(3):
    hero.move_right()
hero.step_on_switch()
hero.move_right()
hero.collect()
hero.move_down()
hero.move_down()
hero.move_right()
hero.collect()
hero.move_right()
hero.move_right()
remaining = 5 % 3
if remaining == 2:
    hero.attack()
else:
    hero.wait_turn()
hero.move_right()
hero.move_right()
hero.attack()
hero.move_right()
has_key = True
if has_key:
    hero.open_door()
hero.move_right()
hero.move_right()
hero.collect()
hero.say("comparator synced")
hero.move_right()`,
    goals: [
      { id: "g1", kind: "scan", label: "scan comparator ruins" },
      { id: "g2", kind: "collect", targetId: "r43-key", label: "collect comparator key" },
      { id: "g3", kind: "activateSwitch", targetId: "r43-switch", label: "trigger comparator switch" },
      { id: "g4", kind: "collect", targetId: "r43-scroll", label: "collect comparator scroll" },
      { id: "g5", kind: "collect", targetId: "r43-coin", label: "collect comparator coin" },
      { id: "g6", kind: "defeat", targetId: "r43-guard", label: "defeat comparator guard" },
      { id: "g7", kind: "defeat", targetId: "r43-sentinel", label: "defeat comparator sentinel" },
      { id: "g8", kind: "openDoor", targetId: "r43-door-b", label: "open inner comparator gate" },
      { id: "g9", kind: "collect", targetId: "r43-crystal", label: "collect comparator crystal" },
      { id: "g10", kind: "say", label: "broadcast comparator sync" },
      { id: "g11", kind: "exit", label: "reach comparator exit" },
    ],
    hints: [
      "Control lane first, then combat lane.",
      "Use modulo + equality branch before first attack to keep logic explicit.",
      "Open inner gate only after both enemies are cleared.",
    ],
    briefing: [
      "Scan, collect key, and complete switch + scroll control lane.",
      "Use comparison branch for first attack, then clear second sentinel.",
      "Open inner gate, collect crystal, sync status, and exit.",
    ],
    failureTips: {
      switch: "Stand on comparator switch tile before step_on_switch.",
      doorKey: "Inner comparator gate requires comparator key before open_door.",
      enemy: "Defeat both comparator enemies before crossing the inner gate lane.",
      missingGoal: "Check scan, key, switch, scroll, coin, guards, gate, crystal, sync, and exit goals.",
    },
    parSteps: 36,
    xpReward: 438,
    coinReward: 140,
  },
  {
    id: "temple-harmony-44",
    title: "Temple Harmony 44",
    subtitle: "final python pipeline",
    description:
      "Final chapter capstone. Combine helper function, comparison branch, boolean branch, and full route sequencing to complete a long-form Python mission.",
    mapTitle: "Harmony Core",
    difficulty: "挑战",
    biome: "dungeon",
    concepts: ["def helper", "if comparison", "integer division //", "modulo %", "and logical operator"],
    toolbox: [
      "def enter_control():",
      "enter_control()",
      "hero.scan_map()",
      "for _ in range(n):",
      "hero.move_right()",
      "hero.move_up()",
      "hero.move_down()",
      "hero.collect()",
      "hero.build_bridge(\"right\")",
      "hero.step_on_switch()",
      "hero.attack()",
      "threat_level = 6 // 3",
      "key_score = 5 % 3",
      "if threat_level > 1:",
      "if has_key and key_score == 2 and threat_level > 1:",
      "hero.open_door()",
      "print(\"...\")",
    ],
    task: {
      mode: "capstone",
      title: "Complete harmony final route",
      summary:
        "Execute full mission pipeline: helper structure, bridge, switch lane, dual combat, comparison branch, keyed gate branch, crystal extraction, and synced exit.",
      checklist: [
        "helper + control setup complete",
        "dual combat with comparison branch complete",
        "keyed branch gate + crystal + sync + exit complete",
      ],
      requireCodeChange: true,
    },
    tutorialSteps: [
      {
        id: "t44-step-1",
        title: "Step 1: helper architecture",
        instruction: "Define enter_control() and call it after crossing bridge.",
        coach: "Function decomposition is mandatory for maintainable long scripts.",
        success: "Helper architecture is ready.",
        requiredSnippets: [{ snippet: "def enter_control():" }, { snippet: "enter_control()" }],
      },
      {
        id: "t44-step-2",
        title: "Step 2: control + combat transition",
        instruction: "Finish switch + key control lane, then derive threat_level with // before first attack.",
        coach: "Keep transition from control lane to combat lane explicit in code.",
        success: "Control and first combat stage complete.",
        requiredSnippets: [
          { snippet: "threat_level = 6 // 3" },
          { snippet: "if threat_level > 1:\n    hero.attack()" },
        ],
        requiredGoalIds: ["g1", "g2", "g3", "g4", "g5", "g6", "g7", "g8"],
      },
      {
        id: "t44-step-3",
        title: "Step 3: keyed final branch",
        instruction:
          "Clear second sentinel, compute key_score with %, then open keyed gate via `has_key and key_score == 2 and threat_level > 1`.",
        coach: "Final branch should be concise and deterministic.",
        success: "Harmony final challenge complete.",
        requiredSnippets: [
          { snippet: "key_score = 5 % 3" },
          { snippet: "has_key = True" },
          { snippet: "if has_key and key_score == 2 and threat_level > 1:\n    hero.open_door()" },
        ],
        requiredGoalIds: ["g9", "g10", "g11", "g12", "g13"],
      },
    ],
    mentor: {
      name: "Harmony Architect",
      avatar: "H",
      intro: "This is the final reliability run. Every step must be explicit, ordered, and readable.",
      success: "Excellent finish. Your end-to-end Python pipeline is production-ready.",
    },
    scene: {
      theme: "dungeonScene",
      background: "/code-research/calciumtrice-dungeon/scene-terminal-temple-v1.png",
      sourceWidth: 1600,
      sourceHeight: 900,
      grid: { left: 214, top: 430, width: 1120, height: 0 },
      tokenScale: 1.24,
    },
    mapPosition: { left: 92, top: 90, size: "large" },
    width: 18,
    height: 8,
    terrain: [
      { id: "t44-water", kind: "water", label: "harmony water lane", x: 3, y: 4 },
      { id: "t44-rune", kind: "rune", label: "harmony rune", x: 7, y: 2 },
      { id: "t44-wall-a", kind: "wall", label: "harmony wall", x: 1, y: 1 },
      { id: "t44-hazard", kind: "hazard", label: "harmony hazard", x: 16, y: 1 },
    ],
    bridges: [{ id: "t44-bridge", label: "harmony bridge", requiresItemId: "t44-plank", x: 3, y: 4 }],
    switches: [{ id: "t44-switch", label: "harmony switch", opensDoorId: "t44-door-a", x: 7, y: 2 }],
    doors: [
      { id: "t44-door-a", label: "outer harmony gate", x: 11, y: 4 },
      { id: "t44-door-b", label: "inner harmony gate", requiresItemId: "t44-key", x: 15, y: 4 },
    ],
    heroStart: { x: 0, y: 4 },
    exit: { x: 17, y: 4 },
    items: [
      { id: "t44-plank", kind: "plank", label: "harmony plank", x: 2, y: 4 },
      { id: "t44-scroll", kind: "scroll", label: "harmony scroll", x: 8, y: 2 },
      { id: "t44-key", kind: "key", label: "harmony key", x: 9, y: 2 },
      { id: "t44-coin", kind: "coin", label: "harmony coin", x: 10, y: 4 },
      { id: "t44-potion", kind: "potion", label: "harmony potion", x: 12, y: 4 },
      { id: "t44-crystal", kind: "crystal", label: "harmony crystal", x: 16, y: 4 },
    ],
    enemies: [
      { id: "t44-guard", label: "harmony guard", kind: "guard", hp: 1, x: 12, y: 4 },
      { id: "t44-sentinel", label: "harmony sentinel", kind: "sentinel", hp: 1, x: 14, y: 4 },
    ],
    starterCode: `# Task: temple harmony 44
def enter_control():
    # TODO: move up twice

hero.scan_map()
# TODO: bridge + control lane
# TODO: use threat_level comparison for first combat
# TODO: use has_key branch for final gate, then crystal + sync + exit`,
    solution: `def enter_control():
    hero.move_up()
    hero.move_up()

hero.scan_map()
for _ in range(2):
    hero.move_right()
hero.collect()
hero.build_bridge("right")
for _ in range(4):
    hero.move_right()
enter_control()
hero.move_right()
hero.step_on_switch()
hero.move_right()
hero.collect()
hero.move_right()
hero.collect()
hero.move_down()
hero.move_down()
hero.move_right()
hero.collect()
hero.move_right()
threat_level = 6 // 3
if threat_level > 1:
    hero.attack()
hero.move_right()
hero.collect()
hero.move_right()
hero.attack()
hero.move_right()
has_key = True
key_score = 5 % 3
if has_key and key_score == 2 and threat_level > 1:
    hero.open_door()
hero.move_right()
hero.move_right()
hero.collect()
print("harmony synced")
hero.move_right()`,
    goals: [
      { id: "g1", kind: "scan", label: "scan harmony core" },
      { id: "g2", kind: "collect", targetId: "t44-plank", label: "collect harmony plank" },
      { id: "g3", kind: "buildBridge", targetId: "t44-bridge", label: "build harmony bridge" },
      { id: "g4", kind: "activateSwitch", targetId: "t44-switch", label: "trigger harmony switch" },
      { id: "g5", kind: "collect", targetId: "t44-scroll", label: "collect harmony scroll" },
      { id: "g6", kind: "collect", targetId: "t44-key", label: "collect harmony key" },
      { id: "g7", kind: "collect", targetId: "t44-coin", label: "collect harmony coin" },
      { id: "g8", kind: "defeat", targetId: "t44-guard", label: "defeat harmony guard" },
      { id: "g9", kind: "collect", targetId: "t44-potion", label: "collect harmony potion" },
      { id: "g10", kind: "defeat", targetId: "t44-sentinel", label: "defeat harmony sentinel" },
      { id: "g11", kind: "openDoor", targetId: "t44-door-b", label: "open inner harmony gate" },
      { id: "g12", kind: "collect", targetId: "t44-crystal", label: "collect harmony crystal" },
      { id: "g13", kind: "exit", label: "reach harmony exit" },
    ],
    hints: [
      "Bridge setup and control lane should be complete before combat lane.",
      "Use // to derive threat_level before first combat decision point.",
      "Use % and has_key branch together right before inner gate open.",
    ],
    briefing: [
      "Define helper function, bridge across water, and complete switch + key control lane.",
      "Collect coin, derive threat_level with //, clear first guard, then clear second sentinel and collect potion.",
      "Compute key_score with %, open inner gate in has_key branch, collect crystal, print sync, and exit.",
    ],
    failureTips: {
      bridgeItem: "Harmony bridge requires harmony plank before build_bridge.",
      switch: "Stand on harmony switch tile before step_on_switch.",
      doorKey: "Inner harmony gate requires harmony key before open_door.",
      enemy: "Clear harmony guard and sentinel before crossing inner gate lane.",
      missingGoal: "Check scan, bridge, switch, key, coin, guards, potion, gate, crystal, and exit goals.",
    },
    parSteps: 40,
    xpReward: 460,
    coinReward: 148,
  },
];

export type CodeResearchPythonStage = {
  index: number;
  label: string;
  focus: string;
};

export const codeResearchPythonStageByLevelId: Record<string, CodeResearchPythonStage> = {
  "ruins-branch-33": { index: 1, label: "Stage 1", focus: "function + scan baseline" },
  "temple-final-34": { index: 2, label: "Stage 2", focus: "function reuse in long route" },
  "ruins-bool-35": { index: 3, label: "Stage 3", focus: "boolean flag + not operator" },
  "temple-pipeline-36": { index: 4, label: "Stage 4", focus: "if branch inside mission pipeline" },
  "river-decision-37": { index: 5, label: "Stage 5", focus: "if has_key branch flow" },
  "temple-overclock-38": { index: 6, label: "Stage 6", focus: "function + branch sequencing" },
  "river-threshold-39": { index: 7, label: "Stage 7", focus: "if/elif/else comparisons" },
  "ruins-signal-function-40": { index: 8, label: "Stage 8", focus: "or-condition gate logic" },
  "temple-loop-guard-41": { index: 9, label: "Stage 9", focus: "arithmetic (+) decision branch" },
  "temple-vector-route-42": { index: 10, label: "Stage 10", focus: "integer division // with variables" },
  "ruins-comparator-43": { index: 11, label: "Stage 11", focus: "modulo % with equality branch" },
  "temple-harmony-44": { index: 12, label: "Stage 12", focus: "and-condition final capstone" },
};

export function getCodeResearchPythonStage(levelId: string) {
  return codeResearchPythonStageByLevelId[levelId] ?? null;
}

export function getCodeResearchLevel(levelId: string) {
  return codeResearchLevels.find((level) => level.id === levelId) ?? null;
}

export function getFirstIncompleteCodeResearchLevel(completedIds: string[]) {
  return codeResearchLevels.find((level) => !completedIds.includes(level.id)) ?? codeResearchLevels[0];
}

export function getCodeResearchCompletionSummary(records: Record<string, CodeResearchProgressRecord>) {
  const completedIds = Object.keys(records).filter((id) => records[id]?.completed);
  const stars = completedIds.reduce((total, id) => total + (records[id]?.stars ?? 0), 0);
  return {
    completedIds,
    completedCount: completedIds.length,
    totalCount: codeResearchLevels.length,
    stars,
    maxStars: codeResearchLevels.length * 3,
  };
}
