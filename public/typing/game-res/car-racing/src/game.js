const TRACK_LENGTH = 1500;
const MAX_SPEED = 220 / 3.6;
const MIN_SPEED = 30 / 3.6;
const OPPONENT_COUNT = 3;
const LANE_COUNT = 4;
const PLAYER_LANE = 1;
const ROAD_TILE_SIDE_SHOULDER_RATIO = 24 / 128;
const CRUISE_SPEED = 72 / 3.6;
const SPEED_DECAY_ABOVE_CRUISE_PER_SEC = 1.1;
const SPEED_RECOVER_TO_CRUISE_PER_SEC = 0.45;
const CORRECT_CHAR_BOOST = 0.56;
const WORD_FINISH_BOOST_BASE = 3.3;
const WORD_FINISH_BOOST_COMBO = 0.2;
const OPPONENT_SPEED_RANGE_KMH = [
  [100, 130],
  [120, 150],
  [140, 200],
];
const DECOR_COUNT = 54;
const DECOR_Y_SCALE = 2.7;
const DECOR_CULL_PADDING = 180;
const DECOR_SIDE_PADDING = 16;
const DECOR_ROAD_GAP = 26;
const LOOP_SOUND_COOLDOWN_MS = 180;
const SOUND_PATHS = {
  bgm: "./sounds/bgm.ogg",
  win: "./sounds/win.wav",
  lost: "./sounds/lost.wav",
  loops: [
    "./sounds/loop_0.wav",
    "./sounds/loop_1.wav",
    "./sounds/loop_2.wav",
    "./sounds/loop_3.wav",
    "./sounds/loop_4.wav",
    "./sounds/loop_5.wav",
  ],
};
const PHRASE_API_URL = "https://daziya-api.cutterman.cn/typing/lesson/random-chinese-phrase";
const PHRASE_API_TIMEOUT_MS = 5000;
const DEFAULT_TARGET_GROUPS = [
  [
    "希望",
    "合作",
    "勤奋",
    "坚强",
    "美丽",
    "自信",
    "快乐",
    "勇敢",
    "坚定",
    "温暖",
    "舒服",
    "优秀",
    "幸福",
  ],
  [
    "共和国",
    "自行车",
    "沉甸甸",
    "百家姓",
    "俱乐部",
    "显微镜",
    "太平洋",
    "宇航员",
    "敬亭山",
    "葡萄干",
    "里程碑",
    "弓弩手",
  ],
  ["取长补短", "和风细雨", "春暖花开", "一马当先", "全神贯注", "聚精会神", "乘风破浪", "勇往直前"],
];
const FALLBACK_PINYIN_MAP = {
  希望: "xiwang",
  合作: "hezuo",
  勤奋: "qinfen",
  坚强: "jianqiang",
  美丽: "meili",
  自信: "zixin",
  快乐: "kuaile",
  勇敢: "yonggan",
  共和国: "gongheguo",
  自行车: "zixingche",
  沉甸甸: "chendiandian",
  俱乐部: "julebu",
  取长补短: "quchangbuduan",
  全神贯注: "quanshenguanzhu",
  乘风破浪: "chengfengpolang",
};
const DECOR_TYPES = [
  { key: "treeLarge", width: [48, 84], ratio: 1.35, weight: 18 },
  { key: "treeSmall", width: [40, 70], ratio: 1.25, weight: 15 },
  { key: "rock1", width: [24, 42], ratio: 0.85, weight: 13 },
  { key: "rock2", width: [24, 42], ratio: 0.85, weight: 13 },
  { key: "rock3", width: [24, 42], ratio: 0.85, weight: 12 },
  { key: "tentBlue", width: [42, 74], ratio: 1.05, weight: 10 },
  { key: "tentRed", width: [42, 74], ratio: 1.05, weight: 10 },
  { key: "tiresWhite", width: [28, 46], ratio: 0.65, weight: 8 },
  { key: "tiresRed", width: [28, 46], ratio: 0.65, weight: 8 },
  { key: "barrelBlue", width: [18, 28], ratio: 1.05, weight: 7 },
  { key: "barrelRed", width: [18, 28], ratio: 1.05, weight: 7 },
  { key: "cone", width: [16, 24], ratio: 1.1, weight: 6 },
];
const cnchar = window.cnchar;
const cncharPoly = window.cncharPoly;

if (cnchar && cncharPoly && typeof cnchar.use === "function") {
  cnchar.use(cncharPoly);
}

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const speedValueEl = document.getElementById("speedValue");
const progressValueEl = document.getElementById("progressValue");
const rankValueEl = document.getElementById("rankValue");
const comboValueEl = document.getElementById("comboValue");
const targetWordEl = document.getElementById("targetWord");
const typedWordEl = document.getElementById("typedWord");
const typingHintEl = document.querySelector(".hint");
const resultMaskEl = document.getElementById("resultMask");
const resultTitleEl = document.getElementById("resultTitle");
const resultDescEl = document.getElementById("resultDesc");
const restartBtnEl = document.getElementById("restartBtn");

const assets = {};
const state = {
  gameOver: false,
  lastTime: 0,
  roadOffset: 0,
  currentText: "",
  currentPinyin: "",
  typedIndex: 0,
  inputCount: 0,
  correctCount: 0,
  audioStarted: false,
  lastLoopSoundAt: 0,
  lastLoopSoundLevel: -1,
  decorations: [],
  player: {
    lane: PLAYER_LANE,
    speed: CRUISE_SPEED,
    distance: 0,
    combo: 0,
  },
  opponents: [],
};
let targetGroups = DEFAULT_TARGET_GROUPS.map(group => [...group]);

const drawConfig = {
  playerY: 0,
  laneWidth: 0,
  roadLeft: 0,
  roadWidth: 0,
  laneAreaLeft: 0,
  laneAreaWidth: 0,
};

const randomTarget = () => {
  const group = targetGroups[Math.floor(Math.random() * targetGroups.length)];
  return group[Math.floor(Math.random() * group.length)];
};
const randomInRange = (min, max) => min + Math.random() * (max - min);
const randomInt = (min, max) => Math.floor(randomInRange(min, max + 1));
const shuffle = list => {
  const arr = [...list];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};
const pickWeightedDecorType = () => {
  const totalWeight = DECOR_TYPES.reduce((sum, item) => sum + item.weight, 0);
  let ticket = Math.random() * totalWeight;
  for (let i = 0; i < DECOR_TYPES.length; i += 1) {
    ticket -= DECOR_TYPES[i].weight;
    if (ticket <= 0) {
      return DECOR_TYPES[i];
    }
  }
  return DECOR_TYPES[DECOR_TYPES.length - 1];
};

const parseTargetTextGroups = payload => {
  if (!payload || payload.errno !== 0) {
    return [];
  }
  const text = payload?.data?.text;
  if (typeof text !== "string") {
    return [];
  }
  const words = text
    .split(/\s+/)
    .map(item => item.trim())
    .filter(Boolean);
  if (!words.length) {
    return [];
  }
  // Keep the same 3-tier structure used by local fallback.
  const groups = [[], [], []];
  words.forEach(word => {
    if (word.length <= 2) {
      groups[0].push(word);
    } else if (word.length <= 4) {
      groups[1].push(word);
    } else {
      groups[2].push(word);
    }
  });
  return groups.filter(group => group.length > 0);
};

const loadTargetGroupsFromServer = async () => {
  const controller = typeof AbortController === "function" ? new AbortController() : null;
  const timer = controller
    ? window.setTimeout(() => {
        controller.abort();
      }, PHRASE_API_TIMEOUT_MS)
    : null;
  try {
    const response = await fetch(PHRASE_API_URL, {
      method: "GET",
      cache: "no-store",
      signal: controller?.signal,
    });
    if (!response.ok) {
      return;
    }
    const payload = await response.json();
    const groups = parseTargetTextGroups(payload);
    if (groups.length > 0) {
      targetGroups = groups;
    }
  } catch {
    targetGroups = DEFAULT_TARGET_GROUPS.map(group => [...group]);
  } finally {
    if (timer) {
      window.clearTimeout(timer);
    }
  }
};

const createAudio = (src, { volume = 1, loop = false } = {}) => {
  const audio = new Audio(src);
  audio.preload = "auto";
  audio.volume = volume;
  audio.loop = loop;
  return audio;
};

const initAudio = () => {
  assets.sounds = {
    bgm: createAudio(SOUND_PATHS.bgm, { volume: 0.36, loop: true }),
    win: createAudio(SOUND_PATHS.win, { volume: 0.65 }),
    lost: createAudio(SOUND_PATHS.lost, { volume: 0.65 }),
    loops: SOUND_PATHS.loops.map(src => createAudio(src, { volume: 0.55 })),
  };
};

const safePlay = (audio, reset = true) => {
  if (!audio) {
    return;
  }
  if (reset) {
    audio.currentTime = 0;
  }
  const playTask = audio.play();
  if (playTask && typeof playTask.catch === "function") {
    playTask.catch(() => {});
  }
};

const safePause = audio => {
  if (!audio) {
    return;
  }
  audio.pause();
};

const ensureAudioStarted = () => {
  if (!assets.sounds || state.audioStarted) {
    return;
  }
  state.audioStarted = true;
  safePlay(assets.sounds.bgm, false);
};

const getLoopSoundLevel = speed => {
  const loopCount = assets.sounds?.loops?.length ?? 0;
  if (!loopCount) {
    return -1;
  }
  const ratio = (speed - CRUISE_SPEED) / (MAX_SPEED - CRUISE_SPEED);
  const normalized = Math.max(0, Math.min(1, ratio));
  return Math.min(loopCount - 1, Math.floor(normalized * loopCount));
};

const playAccelerationLoopSound = () => {
  const level = getLoopSoundLevel(state.player.speed);
  if (level < 0) {
    return;
  }
  const now = performance.now();
  const isCooldown = now - state.lastLoopSoundAt < LOOP_SOUND_COOLDOWN_MS;
  const isSameLevel = level === state.lastLoopSoundLevel;
  if (isCooldown && isSameLevel) {
    return;
  }
  state.lastLoopSoundAt = now;
  state.lastLoopSoundLevel = level;
  safePlay(assets.sounds.loops[level]);
};

const generateDecorations = () => {
  const width = window.innerWidth;
  const leftMin = DECOR_SIDE_PADDING;
  const leftMax = drawConfig.roadLeft - DECOR_ROAD_GAP;
  const rightMin = drawConfig.roadLeft + drawConfig.roadWidth + DECOR_ROAD_GAP;
  const rightMax = width - DECOR_SIDE_PADDING;
  if (leftMax <= leftMin || rightMax <= rightMin) {
    state.decorations = [];
    return;
  }

  const span = TRACK_LENGTH + 320;
  const baseStep = span / DECOR_COUNT;
  state.decorations = Array.from({ length: DECOR_COUNT }, (_, index) => {
    const type = pickWeightedDecorType();
    const isLeft = Math.random() < 0.5;
    const x = isLeft ? randomInRange(leftMin, leftMax) : randomInRange(rightMin, rightMax);
    const distance = Math.max(0, index * baseStep + randomInRange(-18, 18));
    const widthPx = randomInt(type.width[0], type.width[1]);
    return {
      typeKey: type.key,
      x,
      distance,
      width: widthPx,
      height: widthPx * type.ratio,
      wobble: Math.random() * Math.PI * 2,
    };
  }).sort((a, b) => a.distance - b.distance);
};

const normalizePinyin = value =>
  String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z]/g, "");

const pickFirstPinyinCandidate = value => {
  const parts = String(value ?? "")
    .split(/[|/,;\s]+/)
    .filter(Boolean);
  return parts[0] ?? "";
};

const getTargetPinyin = targetText => {
  if (targetText && typeof targetText.spell === "function") {
    const lettersOnly = normalizePinyin(targetText.spell("low"));
    if (lettersOnly) {
      return lettersOnly;
    }
  }

  if (cnchar && typeof cnchar.spell === "function") {
    const rawPinyin = cnchar.spell(targetText, "poly", "low", "array");
    const merged = Array.isArray(rawPinyin)
      ? rawPinyin.map(item => pickFirstPinyinCandidate(item)).join("")
      : pickFirstPinyinCandidate(rawPinyin);
    const lettersOnly = normalizePinyin(merged);
    if (lettersOnly) {
      return lettersOnly;
    }
  }
  return FALLBACK_PINYIN_MAP[targetText] ?? "";
};

const assignNextTarget = () => {
  if (!targetGroups.length || !targetGroups.some(group => group.length > 0)) {
    targetGroups = DEFAULT_TARGET_GROUPS.map(group => [...group]);
  }
  const targetText = randomTarget();
  state.currentText = targetText;
  state.currentPinyin = getTargetPinyin(targetText);
};

const loadImage = src =>
  new Promise(resolve => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = src;
  });

const setupCanvas = () => {
  const dpr = window.devicePixelRatio || 1;
  const width = window.innerWidth;
  const height = window.innerHeight;
  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  drawConfig.playerY = height * 0.75;
  const maxRoadWidth = width - 34;
  const preferredRoadWidth = Math.min(760, width * 0.82);
  const minRoadWidth = Math.min(maxRoadWidth, 360);
  drawConfig.roadWidth = Math.max(minRoadWidth, preferredRoadWidth);
  drawConfig.roadLeft = (width - drawConfig.roadWidth) / 2;
  const laneInset = drawConfig.roadWidth * ROAD_TILE_SIDE_SHOULDER_RATIO;
  drawConfig.laneAreaLeft = drawConfig.roadLeft + laneInset;
  drawConfig.laneAreaWidth = drawConfig.roadWidth - laneInset * 2;
  drawConfig.laneWidth = drawConfig.laneAreaWidth / LANE_COUNT;
};

const resetOpponents = () => {
  const opponentLanes = [0, 2, 3];
  const shuffledRanges = shuffle(OPPONENT_SPEED_RANGE_KMH);
  state.opponents = Array.from({ length: OPPONENT_COUNT }, (_, index) => {
    const range = shuffledRanges[index] ?? shuffledRanges[shuffledRanges.length - 1];
    const [minKmh, maxKmh] = range;
    const cruiseSpeed = randomInRange(minKmh, maxKmh) / 3.6;
    return {
    id: index,
    lane: opponentLanes[index] ?? ((index + 1) % LANE_COUNT),
    cruiseSpeed,
    speed: cruiseSpeed,
    distance: 5 + index * 10,
    wobble: Math.random() * Math.PI * 2,
  };
  });
};

const resetGame = () => {
  state.gameOver = false;
  state.lastTime = 0;
  state.roadOffset = 0;
  state.player.distance = 0;
  state.player.speed = CRUISE_SPEED;
  state.player.combo = 0;
  assignNextTarget();
  state.typedIndex = 0;
  state.inputCount = 0;
  state.correctCount = 0;
  state.lastLoopSoundAt = 0;
  state.lastLoopSoundLevel = -1;
  resetOpponents();
  generateDecorations();
  updateTypingPanel();
  if (typingHintEl) {
    typingHintEl.textContent = "看汉字，输入对应拼音字母。整词命中会获得额外冲刺，按 Enter 重新开始。";
  }
  updateHud();
  resultMaskEl.classList.add("hidden");
  ensureAudioStarted();
  safePause(assets.sounds?.win);
  safePause(assets.sounds?.lost);
  safePlay(assets.sounds?.bgm, false);
};

const getLaneX = lane => drawConfig.laneAreaLeft + drawConfig.laneWidth * (lane + 0.5);

const updateTypingPanel = () => {
  const done = state.currentPinyin.slice(0, state.typedIndex);
  const todo = state.currentPinyin.slice(state.typedIndex);
  typedWordEl.innerHTML = `<span style="color:#6ed1ff;">${done}</span><span style="color:#9db0c3;">${todo}</span>`;
  targetWordEl.textContent = state.currentText;
};

const getRank = () => {
  const racers = [{ type: "player", distance: state.player.distance }];
  state.opponents.forEach(opponent => racers.push({ type: "opponent", distance: opponent.distance }));
  racers.sort((a, b) => b.distance - a.distance);
  const rank = racers.findIndex(item => item.type === "player") + 1;
  return rank;
};

const updateHud = () => {
  const speedKmh = Math.round(state.player.speed * 3.6);
  const progress = Math.min(100, (state.player.distance / TRACK_LENGTH) * 100);
  speedValueEl.textContent = `${speedKmh} km/h`;
  progressValueEl.textContent = `${progress.toFixed(1)}%`;
  rankValueEl.textContent = `${getRank()} / ${OPPONENT_COUNT + 1}`;
  comboValueEl.textContent = `x${state.player.combo}`;
};

const drawRoad = height => {
  const { roadLeft, roadWidth } = drawConfig;
  const laneAreaLeft = drawConfig.laneAreaLeft;
  const laneAreaWidth = drawConfig.laneAreaWidth;
  const shoulder = 90;
  ctx.fillStyle = "#2c6a3a";
  ctx.fillRect(0, 0, roadLeft - shoulder, height);
  ctx.fillRect(roadLeft + roadWidth + shoulder, 0, roadLeft - shoulder, height);

  if (assets.roadTile) {
    const tileWidth = roadWidth;
    const tileHeight = 220;
    state.roadOffset += (70 + state.player.speed * 9) / 60;
    const offset = state.roadOffset % tileHeight;
    for (let y = -tileHeight + offset; y < height + tileHeight; y += tileHeight) {
      ctx.drawImage(assets.roadTile, roadLeft, y, tileWidth, tileHeight);
    }
  } else {
    ctx.fillStyle = "#4a4f58";
    ctx.fillRect(roadLeft, 0, roadWidth, height);
  }

  // Lane separators are already part of the tile texture.

  if (TRACK_LENGTH - state.player.distance < 120) {
    const y = drawConfig.playerY - (TRACK_LENGTH - state.player.distance) * 3;
    ctx.fillStyle = "#ffffff";
    for (let i = 0; i < 18; i += 1) {
      const x = roadLeft + (i % 2 === 0 ? 0 : roadWidth / 18) + (i * roadWidth) / 18;
      ctx.fillRect(x, y, roadWidth / 18, 12);
    }
  }
};

const drawDecorations = height => {
  state.decorations.forEach(item => {
    const delta = item.distance - state.player.distance;
    const y = drawConfig.playerY - delta * DECOR_Y_SCALE;
    if (y < -DECOR_CULL_PADDING || y > height + DECOR_CULL_PADDING) {
      return;
    }
    const sprite = assets.decor?.[item.typeKey];
    const wobbleX = Math.sin(item.wobble + state.player.distance * 0.03) * 2.2;
    const x = item.x + wobbleX;
    const drawX = x - item.width / 2;
    const drawY = y - item.height;
    if (sprite) {
      ctx.drawImage(sprite, drawX, drawY, item.width, item.height);
      return;
    }
    ctx.fillStyle = "#51724a";
    ctx.fillRect(drawX, drawY, item.width, item.height);
  });
};

const drawPlayer = () => {
  const x = getLaneX(state.player.lane);
  const y = drawConfig.playerY;
  const width = Math.max(34, Math.min(58, drawConfig.laneWidth * 0.68));
  const height = width * 1.78;
  if (assets.playerCar) {
    ctx.drawImage(assets.playerCar, x - width / 2, y - height / 2, width, height);
    return;
  }
  ctx.fillStyle = "#ff4b4b";
  ctx.fillRect(x - width / 2, y - height / 2, width, height);
};

const drawOpponents = () => {
  const carWidth = Math.max(32, Math.min(54, drawConfig.laneWidth * 0.64));
  const carHeight = carWidth * 1.78;
  const wobbleRange = Math.min(3, drawConfig.laneWidth * 0.07);
  state.opponents.forEach((opponent, index) => {
    const delta = opponent.distance - state.player.distance;
    const y = drawConfig.playerY - delta * 2.7;
    if (y < -120 || y > window.innerHeight + 120) {
      return;
    }
    const x = getLaneX(opponent.lane) + Math.sin(opponent.wobble) * wobbleRange;
    const sprite = assets.opponentCars[index % assets.opponentCars.length];
    if (sprite) {
      ctx.drawImage(sprite, x - carWidth / 2, y - carHeight / 2, carWidth, carHeight);
      return;
    }
    ctx.fillStyle = "#4ea5ff";
    ctx.fillRect(x - carWidth / 2, y - carHeight / 2, carWidth, carHeight);
  });
};

const drawProgressBar = width => {
  const x = Math.max(16, (width - 420) / 2);
  const y = 20;
  const w = Math.min(420, width - 32);
  const h = 10;
  ctx.fillStyle = "rgba(255,255,255,0.2)";
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = "#57c6ff";
  ctx.fillRect(x, y, w * Math.min(1, state.player.distance / TRACK_LENGTH), h);
};

const drawFrame = () => {
  const width = window.innerWidth;
  const height = window.innerHeight;
  ctx.clearRect(0, 0, width, height);
  drawRoad(height);
  drawDecorations(height);
  drawOpponents();
  drawPlayer();
  drawProgressBar(width);
};

const finishRace = winner => {
  state.gameOver = true;
  const rank = getRank();
  const accuracy = state.inputCount === 0 ? 100 : (state.correctCount / state.inputCount) * 100;
  const isPlayerWin = winner === "player";

  resultTitleEl.textContent = isPlayerWin ? "你赢了！" : "比赛结束";
  resultDescEl.textContent = [
    `最终名次：第 ${rank} 名`,
    `最高速度：${Math.round(MAX_SPEED * 3.6)} km/h`,
    `输入准确率：${accuracy.toFixed(1)}%`,
    "按 Enter 或点击按钮重新开始",
  ].join("\n");
  resultMaskEl.classList.remove("hidden");
  safePause(assets.sounds?.bgm);
  safePause(assets.sounds?.win);
  safePause(assets.sounds?.lost);
  if (isPlayerWin) {
    safePlay(assets.sounds?.win);
  } else {
    safePlay(assets.sounds?.lost);
  }
};

const update = dt => {
  const player = state.player;
  if (player.speed > CRUISE_SPEED) {
    player.speed = Math.max(CRUISE_SPEED, player.speed - SPEED_DECAY_ABOVE_CRUISE_PER_SEC * dt);
  } else if (player.speed < CRUISE_SPEED) {
    player.speed = Math.min(CRUISE_SPEED, player.speed + SPEED_RECOVER_TO_CRUISE_PER_SEC * dt);
  }
  player.speed = Math.min(MAX_SPEED, Math.max(MIN_SPEED, player.speed));
  player.distance += player.speed * dt;

  state.opponents.forEach(opponent => {
    opponent.speed = opponent.cruiseSpeed;
    opponent.distance += opponent.speed * dt;
    opponent.wobble += dt * 3;
  });

  const playerFinished = player.distance >= TRACK_LENGTH;
  if (playerFinished) {
    finishRace("player");
    return;
  }

  const opponentFinished = state.opponents.some(opponent => opponent.distance >= TRACK_LENGTH);
  if (opponentFinished) {
    finishRace("opponent");
    return;
  }

  updateHud();
};

const gameLoop = timestamp => {
  if (!state.lastTime) {
    state.lastTime = timestamp;
  }
  const dt = Math.min(0.05, (timestamp - state.lastTime) / 1000);
  state.lastTime = timestamp;

  if (!state.gameOver) {
    update(dt);
  }
  drawFrame();
  requestAnimationFrame(gameLoop);
};

const handleWordSuccess = () => {
  state.player.combo += 1;
  state.player.speed = Math.min(
    MAX_SPEED,
    state.player.speed + WORD_FINISH_BOOST_BASE + state.player.combo * WORD_FINISH_BOOST_COMBO,
  );
  assignNextTarget();
  state.typedIndex = 0;
  updateTypingPanel();
  if (typingHintEl) {
    typingHintEl.textContent = "整词命中！获得冲刺加速。";
  }
  updateHud();
};

const handleWordError = () => {
  // No penalty on wrong input.
};

const handleKeyDown = event => {
  ensureAudioStarted();
  if (state.gameOver && event.key === "Enter") {
    resetGame();
    return;
  }

  const keyFromValue = typeof event.key === "string" ? event.key.toLowerCase() : "";
  const keyFromCode =
    typeof event.code === "string" && /^Key[A-Z]$/.test(event.code) ? event.code.slice(3).toLowerCase() : "";
  const key = /^[a-z]$/.test(keyFromValue) ? keyFromValue : keyFromCode;

  if (!/^[a-z]$/.test(key) || state.gameOver) {
    return;
  }

  if (!state.currentPinyin) {
    assignNextTarget();
    state.typedIndex = 0;
    updateTypingPanel();
    return;
  }

  event.preventDefault();
  state.inputCount += 1;
  const expected = state.currentPinyin[state.typedIndex];
  if (key === expected) {
    state.correctCount += 1;
    state.typedIndex += 1;
    state.player.speed = Math.min(MAX_SPEED, state.player.speed + CORRECT_CHAR_BOOST);
    playAccelerationLoopSound();
    if (typingHintEl) {
      typingHintEl.textContent = "命中！继续输入拼音完成词条。";
    }
    if (state.typedIndex >= state.currentPinyin.length) {
      handleWordSuccess();
    } else {
      updateTypingPanel();
      updateHud();
    }
    return;
  }
  handleWordError();
};

const loadAssets = async () => {
  assets.playerCar = await loadImage("./assets/PNG/Cars/car_red_1.png");
  assets.opponentCars = [
    await loadImage("./assets/PNG/Cars/car_blue_1.png"),
    await loadImage("./assets/PNG/Cars/car_green_1.png"),
    await loadImage("./assets/PNG/Cars/car_yellow_1.png"),
  ].filter(Boolean);
  assets.roadTile = await loadImage("./assets/PNG/Tiles/Asphalt road/road_asphalt01.png");
  assets.decor = {
    treeLarge: await loadImage("./assets/PNG/Objects/tree_large.png"),
    treeSmall: await loadImage("./assets/PNG/Objects/tree_small.png"),
    rock1: await loadImage("./assets/PNG/Objects/rock1.png"),
    rock2: await loadImage("./assets/PNG/Objects/rock2.png"),
    rock3: await loadImage("./assets/PNG/Objects/rock3.png"),
    tentBlue: await loadImage("./assets/PNG/Objects/tent_blue.png"),
    tentRed: await loadImage("./assets/PNG/Objects/tent_red.png"),
    tiresWhite: await loadImage("./assets/PNG/Objects/tires_white.png"),
    tiresRed: await loadImage("./assets/PNG/Objects/tires_red.png"),
    barrelBlue: await loadImage("./assets/PNG/Objects/barrel_blue.png"),
    barrelRed: await loadImage("./assets/PNG/Objects/barrel_red.png"),
    cone: await loadImage("./assets/PNG/Objects/cone_straight.png"),
  };
};

const init = async () => {
  setupCanvas();
  initAudio();
  await loadAssets();
  await loadTargetGroupsFromServer();
  resetGame();

  window.addEventListener("resize", () => {
    setupCanvas();
    generateDecorations();
  });
  window.addEventListener("keydown", handleKeyDown);
  document.addEventListener("keydown", handleKeyDown);
  window.addEventListener("pointerdown", ensureAudioStarted, { passive: true });
  restartBtnEl.addEventListener("click", resetGame);
  requestAnimationFrame(gameLoop);
};

init();
