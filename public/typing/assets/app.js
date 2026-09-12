(function () {
  "use strict";

  const app = document.getElementById("app");
  const STORE = {
    settings: "lexiang.typing.settings",
    history: "lexiang.typing.history",
    progress: "lexiang.typing.progress",
    profile: "lexiang.typing.profile",
    custom: "lexiang.typing.custom",
    session: "lexiang.typing.session",
  };

  const DEFAULT_SETTINGS = {
    keyAudio: true,
    completeAudio: true,
    showKeyboard: true,
    showKeyTips: true,
    speechAudio: true,
    autoSpeech: true,
    wordAutoAdvance: true,
    showHands: true,
    loopSpeech: false,
    speechRate: 0.9,
    darkMode: false,
    gameLevel: "normal",
    comboAudio: true,
    racingAudio: true,
  };

  const API_ROOT = "/api/typing";
  const ALLOW_EXTERNAL_WORD_AUDIO_FALLBACK = false;
  const BACKGROUND_SYNC_BASE_DELAY_MS = 5000;
  const BACKGROUND_SYNC_JITTER_MS = 25000;
  let wordAudioMapPromise = null;

  const GAME_WORDS = {
    english: [
      "duck", "typing", "speed", "focus", "planet", "keyboard", "river", "future", "lesson", "rocket", "memory", "window", "forest", "practice", "winner", "target", "apple", "happy", "smile", "cloud", "green", "blue", "light", "music", "stone", "earth", "water", "flame", "heart", "magic", "start", "great", "quest", "quick", "smart", "brave", "dance", "learn", "think", "build", "shine", "tiger", "eagle", "horse", "panda", "ocean", "sunny", "rainy", "storm", "snowy", "mount", "valley", "desert", "island", "silver", "golden", "purple", "ruby", "pearl", "table", "chair", "plant", "glass", "paper", "pencil", "school", "teacher", "friend", "family", "puppy", "kitten", "rabbit", "monkey", "turtle", "dragon", "phoenix", "wizard", "knight", "hunter", "castle", "tower", "bridge", "garden", "village", "city", "market", "library", "temple", "spring", "summer", "autumn", "winter", "season", "holiday", "journey", "voyage", "flight", "coding", "design", "share", "story", "create", "solve", "dream", "laugh", "sing", "read", "write", "draw", "paint", "clean", "cook", "bake", "listen", "watch", "proud", "calm", "cool", "warm", "tired", "sleepy", "merry", "joyful", "gentle", "swift", "steady", "solid", "bright", "clear", "fresh", "crisp", "sharp", "piano", "violin", "guitar", "drums", "flute", "melody", "rhythm", "song", "voice", "note", "studio", "gallery", "museum", "theater", "library2", "stage", "scene", "script", "feast", "delight", "surprise", "hug", "kiss", "peace", "trust", "share2", "unite", "carrot", "onion", "pepper", "garlic", "tomato", "potato", "cheese", "bread", "butter", "honey", "tulip", "rose", "lotus", "daisy", "lily", "vine", "berry", "mango", "melon", "peach", "comet", "meteor", "nebula", "galaxy", "orbit", "launch", "mission", "signal", "beacon", "delta", "alpha", "echo", "bravo", "gamma", "sigma", "omega", "theta", "kappa", "zeta",
    ],
    englishShort: [
      "an", "at", "be", "by", "go", "he", "if", "in", "is", "it", "me", "my", "no", "of", "on", "or", "so", "to", "up", "us", "we", "am", "as", "ox", "ax", "ex", "cat", "dog", "sun", "sea", "sky", "tea", "bee", "ant", "cow", "fox", "ace", "aim", "arc", "art", "ash", "bow", "box", "bud", "bug", "bus", "cap", "car", "cob", "cod", "cog", "cot", "cry", "cup", "cut", "dab", "dam", "day", "dew", "dig", "dim", "dip", "dot", "dry", "dub", "dud", "due", "dug", "dye", "ear", "eat", "egg", "ego", "elm", "emu", "end", "era", "eve", "ewe", "eye", "fan", "far", "fat",
    ],
    chars: "asdfjkl;qwertyuiopzxcvbnm1234567890".split(""),
    charsEasy: "asdfjkl;".split(""),
    pinyin: [
      ["春", "chun"],
      ["风", "feng"],
      ["山", "shan"],
      ["水", "shui"],
      ["光", "guang"],
      ["云", "yun"],
      ["学", "xue"],
      ["打", "da"],
      ["字", "zi"],
      ["乐", "le"],
      ["快", "kuai"],
      ["准", "zhun"],
      ["花", "hua"],
      ["草", "cao"],
      ["树", "shu"],
      ["鸟", "niao"],
      ["鱼", "yu"],
      ["猫", "mao"],
      ["狗", "gou"],
      ["马", "ma"],
      ["车", "che"],
      ["船", "chuan"],
      ["飞", "fei"],
      ["跑", "pao"],
      ["笑", "xiao"],
      ["哭", "ku"],
      ["说", "shuo"],
      ["读", "du"],
      ["写", "xie"],
      ["听", "ting"],
      ["红", "hong"],
      ["蓝", "lan"],
      ["绿", "lu"],
      ["黄", "huang"],
      ["白", "bai"],
      ["黑", "hei"],
      ["天", "tian"],
      ["地", "di"],
      ["海", "hai"],
      ["河", "he"],
      ["星", "xing"],
      ["月", "yue"],
      ["日", "ri"],
      ["木", "mu"],
      ["林", "lin"],
      ["森", "sen"],
      ["田", "tian"],
      ["禾", "he"],
      ["雨", "yu"],
      ["雪", "xue"],
      ["霜", "shuang"],
      ["雾", "wu"],
      ["雷", "lei"],
      ["电", "dian"],
      ["书", "shu"],
      ["笔", "bi"],
      ["纸", "zhi"],
      ["桌", "zhuo"],
      ["椅", "yi"],
      ["门", "men"],
      ["窗", "chuang"],
      ["家", "jia"],
      ["国", "guo"],
      ["城", "cheng"],
      ["村", "cun"],
      ["路", "lu"],
      ["桥", "qiao"],
      ["灯", "deng"],
      ["钟", "zhong"],
      ["镜", "jing"],
      ["画", "hua"],
      ["歌", "ge"],
      ["舞", "wu"],
      ["诗", "shi"],
      ["文", "wen"],
      ["句", "ju"],
      ["爱", "ai"],
      ["心", "xin"],
      ["梦", "meng"],
      ["想", "xiang"],
      ["愿", "yuan"],
      ["望", "wang"],
      ["大", "da"],
      ["小", "xiao"],
      ["多", "duo"],
      ["少", "shao"],
      ["高", "gao"],
      ["低", "di"],
      ["长", "chang"],
      ["短", "duan"],
      ["圆", "yuan"],
      ["方", "fang"],
      ["上", "shang"],
      ["下", "xia"],
      ["左", "zuo"],
      ["右", "you"],
      ["前", "qian"],
      ["后", "hou"],
      ["里", "li"],
      ["外", "wai"],
      ["好", "hao"],
      ["坏", "huai"],
      ["新", "xin"],
      ["旧", "jiu"],
      ["美", "mei"],
      ["丑", "chou"],
    ],
    pinyinShort: [
      ["大", "da"],
      ["小", "xiao"],
      ["多", "duo"],
      ["少", "shao"],
      ["上", "shang"],
      ["下", "xia"],
      ["天", "tian"],
      ["地", "di"],
      ["人", "ren"],
      ["口", "kou"],
      ["手", "shou"],
      ["目", "mu"],
      ["日", "ri"],
      ["月", "yue"],
      ["水", "shui"],
      ["火", "huo"],
      ["山", "shan"],
      ["石", "shi"],
      ["花", "hua"],
      ["草", "cao"],
      ["鸟", "niao"],
      ["鱼", "yu"],
      ["马", "ma"],
      ["牛", "niu"],
      ["羊", "yang"],
      ["虫", "chong"],
      ["云", "yun"],
      ["风", "feng"],
      ["雨", "yu"],
      ["雪", "xue"],
      ["木", "mu"],
      ["林", "lin"],
      ["禾", "he"],
      ["竹", "zhu"],
      ["米", "mi"],
      ["爱", "ai"],
      ["心", "xin"],
      ["手", "shou"],
      ["足", "zu"],
      ["口", "kou"],
      ["耳", "er"],
      ["学", "xue"],
      ["习", "xi"],
      ["字", "zi"],
      ["书", "shu"],
      ["本", "ben"],
      ["笔", "bi"],
    ],
    pinyinEnglish: [
      "apple", "book", "cat", "dog", "egg", "fish", "girl", "hand", "ice", "jump", "kind", "lake", "moon", "nest", "open", "pen", "queen", "rose", "sun", "tree", "bird", "desk", "face", "gate", "hill", "idea", "joke", "kite", "lamp", "milk", "star", "time", "unit", "vase", "wolf", "yarn", "zeal", "arch", "bake", "calm", "dark", "echo", "foam", "glow", "hope", "iris", "jade", "kiss", "leaf", "mist",
    ],
    raceText: "春天来了，阳光透过稀疏的云层洒在大地上。保持节奏，减少错误，速度自然会稳定提升。",
    immersive: [
      "The best typing practice is calm, repeatable and honest. Keep your eyes on the text, let your hands find the keys, and correct mistakes without rushing.",
      "Practice makes progress, not perfection. Every keystroke is a small step toward fluency, so relax your shoulders and breathe steadily while you type.",
      "A steady rhythm beats a frantic sprint. Watch the next word, keep your wrists light, and let accuracy pull speed along instead of pushing it.",
      "Learning to type is like learning to play an instrument. Slow at first, then suddenly the keys sing under your fingers and ideas flow without friction.",
      "Good posture saves energy. Sit tall, plant your feet, and let the keyboard meet your fingers halfway. The screen is the destination; the keyboard is the road.",
      "Read one word ahead, breathe between sentences, and trust your muscle memory. The text will still be there if you slow down for half a second.",
      "Typing is a conversation between your eyes and your hands. Keep the dialogue patient and the words will arrive at the right speed all by themselves.",
      "Speed follows calm. Sit comfortably, keep your hands warm, and let each key land gently. There is no rush when the rhythm is right.",
      "When the mind wanders, the fingers slow. Bring your attention back to the next letter, then the next, and the chain of words carries you forward again.",
      "A good typist listens to the sentence, not just the word. Punctuation is a rest, capitals are a breath, and the space bar is a step onto the next beat.",
    ],
    sentences: [
      "The early morning light made the dew sparkle like tiny diamonds on the grass.",
      "She picked up the old book and felt the texture of its leather cover with care.",
      "Practice a little every day and your fingers will start to remember the keys.",
      "Take a deep breath, relax your shoulders, and type the next sentence calmly.",
      "A garden of bright tulips lined the stone path leading up to the wooden gate.",
      "After the storm, the sky cleared and a single rainbow arched above the bay.",
      "Good posture and a steady rhythm will keep your typing practice comfortable.",
      "He smiled, opened the window, and let the cool breeze drift through the room.",
      "Each new paragraph is a fresh chance to find a smoother, calmer typing rhythm.",
      "Be patient with your fingers; muscle memory grows slowly but it never forgets.",
      "The library was quiet except for the soft tap of keyboards and the rustle of pages.",
      "She poured a cup of hot tea, watched the steam rise, and turned back to her notes.",
    ],
    paragraphs: [
      "Once upon a quiet morning, a young learner sat by the window with a small notebook. The sun crept across the page while their fingers slowly traced each new word. Mistakes were circled in soft pencil, never feared, only studied. By the end of the hour the room felt warmer, the keyboard felt lighter, and a small smile crept across the learner face.",
      "On a long train ride, the clatter of the rails kept a steady beat. A student practiced short paragraphs, each line a little faster than the last. The rhythm of the train helped them find a calm pace, and soon the words blurred together into a smooth, confident flow. The journey felt shorter, and the practice felt like music.",
      "There is a small cafe on Maple Street where writers like to gather. The chalkboard menu lists tea, coffee, and patience. A girl with headphones typed softly on a slim laptop while rain tapped against the window. Each sentence she typed was like a small gift to her future self, a clearer story waiting to be told.",
      "Behind the school library there is a quiet garden with stone benches and tiny lemon trees. Students sometimes bring their notebooks here to practice typing on tablets. The breeze turns the pages just enough to keep them cool, and the lemon scent reminds them that slow, steady work grows into something bright and useful.",
      "An old typewriter sits on a wooden desk in the attic. The keys are slightly worn on the corners where generations of fingers pressed them. When the attic window opens, you can hear a small bird singing the same five notes over and over. Practice, the bird seems to say, is patient and wonderfully ordinary.",
      "The autumn wind swept golden leaves across the stone bridge, and a young scholar paused to listen to the river beneath. Each step on the old wooden planks felt like a quiet conversation with the past, a reminder that every great journey begins with a single, careful breath. The lantern in his hand flickered softly against the coming dusk.",
      "In the small mountain village, the children gathered around the storyteller every evening. They listened as she spoke of distant cities, brave heroes, and gentle rivers that remembered every name. The storyteller smiled, for she knew that the truest magic was simply the sound of words spoken with care, lighting up the dark like fireflies in a jar.",
      "A robot named Pixel woke up one morning and decided to learn something new. It opened an old book on its workbench, and slowly, letter by letter, began to read. The first words were clumsy, the second line was smoother, and by the end of the chapter, Pixel felt a brand new spark of curiosity glowing inside its metal chest.",
      "Across the city, a soft rain tapped on the library windows. Inside, students worked quietly at polished desks, each lost in their own small world of ideas. The librarian smiled as she shelved books, knowing that every great invention, poem, and dream had once begun as a single sentence typed at a small wooden desk like this one.",
      "Two friends, Mira and Ben, decided to write a story together one summer afternoon. Mira wrote about the ocean, while Ben wrote about the sky. When they put their pages side by side, they discovered a story neither had planned: a tale of waves that learned to fly and clouds that learned to swim, and a friendship that spanned both worlds.",
      "Long ago in a quiet temple by the river, a young monk practiced calligraphy every morning. Each brush stroke began with a deep breath and ended with a small smile. The master told him that the character for patience was written with the same strokes as the character for joy, and the boy thought about this for many gentle years before he finally understood.",
    ],
    potatoZombies: [
      ["夏", "xia"], ["刘", "liu"], ["陈", "chen"], ["黄", "huang"],
      ["赵", "zhao"], ["钱", "qian"], ["孙", "sun"], ["李", "li"],
      ["周", "zhou"], ["吴", "wu"], ["郑", "zheng"], ["王", "wang"],
      ["东", "dong"], ["南", "nan"], ["西", "xi"], ["北", "bei"],
      ["天", "tian"], ["地", "di"], ["人", "ren"], ["和", "he"],
      ["什", "shen"], ["么", "me"], ["谁", "shui"], ["怎", "zen"],
      ["为", "wei"], ["吗", "ma"], ["呢", "ne"], ["嘛", "me"],
      ["哪", "na"], ["这", "zhe"], ["那", "na"], ["哪", "na3"],
      ["a", "a"], ["b", "b"], ["c", "c"], ["d", "d"], ["e", "e"], ["f", "f"],
      ["g", "g"], ["h", "h"], ["i", "i"], ["j", "j"], ["k", "k"], ["l", "l"],
      ["m", "m"], ["n", "n"], ["o", "o"], ["p", "p"], ["q", "q"], ["r", "r"],
      ["s", "s"], ["t", "t"], ["u", "u"], ["v", "v"], ["w", "w"], ["x", "x"],
      ["y", "y"], ["z", "z"],
    ],
  };

  const GAME_PRESETS = {
    mole: { label: "打地鼠", duration: 60, health: 5, minTargets: 4, maxTargets: 6, stage: "ground", feedback: "看着冒出的字母立即打字，命中得分、漏字掉血。" },
    fighter: { label: "拼音战机", duration: 60, health: 5, minTargets: 3, maxTargets: 5, stage: "sky", feedback: "屏幕上方掉落汉字，打出对应拼音即可击落。" },
    defense: { label: "保卫地球", duration: 60, health: 5, minTargets: 4, maxTargets: 6, stage: "space", feedback: "陨石带着英文字母落下，及时打出字符可摧毁陨石。" },
    racing: { label: "打字赛车", duration: 60, health: 0, minTargets: 4, maxTargets: 6, stage: "track", feedback: "单词源源不断落下，准确输入让赛车抢先冲过终点。" },
    falling: { label: "细菌大作战", duration: 60, health: 5, minTargets: 4, maxTargets: 6, stage: "lab", feedback: "细菌携带英文单词下落，输入单词即可消灭细菌。" },
    jump: { label: "鸭子过河", duration: 60, health: 5, minTargets: 3, maxTargets: 5, stage: "river", feedback: "石墩上出现英文单词，打出后小鸭子跳到下一块石墩。" },
    fishing: { label: "捕鱼达人", duration: 60, health: 5, minTargets: 3, maxTargets: 5, stage: "sea", feedback: "鱼钩下方浮起单词，输入对应英文即可钓到鱼。" },
    immersive: { label: "沉浸式打字", duration: 120, health: 0, minTargets: 0, maxTargets: 0, stage: "study", feedback: "完整照打英文段落，无干扰专注训练。" },
    potato: { label: "土豆枪大战僵尸", duration: 90, health: 5, minTargets: 2, maxTargets: 4, stage: "garden", feedback: "僵尸从右侧走来，输入对应拼音或字母即可用土豆枪击退。" },
  };

  const GAME_LEVELS = {
    easy: { label: "初级", labelSuffix: "(初级)", wordSets: { english: "englishShort", chars: "charsEasy", pinyin: "pinyinShort", pinyinEnglish: "pinyinEnglish" }, speedScale: 0.65, densityScale: 0.7, health: 7 },
    normal: { label: "中级", labelSuffix: "(中级)", wordSets: { english: "english", chars: "chars", pinyin: "pinyin", pinyinEnglish: "pinyinEnglish" }, speedScale: 1, densityScale: 1, health: 5 },
    hard: { label: "高级", labelSuffix: "(高级)", wordSets: { english: "english", chars: "chars", pinyin: "pinyin", pinyinEnglish: "pinyinEnglish" }, speedScale: 1.4, densityScale: 1.25, health: 4 },
  };

  const state = {
    catalog: null,
    route: parseRoute(),
    loading: true,
    loadingLesson: null,
    lessonCache: new Map(),
    courseTabs: {},
    search: "",
    trainer: null,
    game: null,
    gameTimer: null,
    contest: null,
    contestTimer: null,
    rankPage: 1,
    remoteRankings: [],
    rankingsLoading: false,
    rankingsLoadedAt: 0,
    serverHistory: [],
    speedTestRank: null,
    speedTestBest: 0,
    speedTestTotal: 0,
    speedTestLeaderboard: [],
    gameLeaderboard: [],
    gameTagFilter: "",
    apiOnline: false,
    ttsServiceAvailable: false,
    assetMap: {},
    audioMap: {},
    composing: false,
    composingBind: "",
    renderQueued: false,
    audioContext: null,
    activeAudio: null,
    activeAudioUrl: "",
    ttsUnavailableUntil: 0,
    voicesReady: false,
    speechLoopTimer: null,
    speechAutoTimer: null,
    trainerAutoNextTimer: null,
    suppressAutoScrollUntil: 0,
    lastSpokenTarget: "",
    toast: null,
    renderError: null,
    settings: loadJson(STORE.settings, DEFAULT_SETTINGS),
    history: loadJson(STORE.history, []),
    progress: loadJson(STORE.progress, {}),
    profile: loadJson(STORE.profile, { nickname: "学习者", avatar: "星" }),
    session: loadJson(STORE.session, { token: "", source: "school", user: null, returnUrl: "" }),
    custom: loadJson(STORE.custom, []),
  };

  init();

  async function init() {
    window.addEventListener("hashchange", () => {
      stopTrainerAutoNext();
      state.route = parseRoute();
      state.search = "";
      render();
    });

    app.addEventListener("click", handleClick);
    app.addEventListener("input", handleInput);
    app.addEventListener("change", handleChange);
    window.addEventListener("keydown", handleKeydown, true);
    app.addEventListener("compositionstart", handleCompositionStart);
    app.addEventListener("compositionend", handleCompositionEnd);
    window.addEventListener("error", handleRuntimeError);
    window.addEventListener("unhandledrejection", handleRuntimeError);
    warmupSpeechVoices();

    try {
      importExternalSession();
      const [catalog, assetMap] = await Promise.all([
        fetchStaticJson("./data/catalog.json"),
        loadAssetMap(),
      ]);
      state.catalog = catalog;
      state.assetMap = assetMap;
      queueBackgroundSync();
    } catch (error) {
      state.catalog = emptyCatalog();
      showToast(`数据加载失败：${error.message}`);
    } finally {
      state.loading = false;
      render();
    }
  }

  function emptyCatalog() {
    return {
      generatedAt: null,
      source: "local",
      categories: [],
      courseGroups: {},
      speedTests: [],
      games: [],
      stats: { categories: 0, lessons: 0, lessonDetails: 0 },
    };
  }

  async function fetchStaticJson(url) {
    const response = await fetch(url, { cache: "default" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  }

  async function loadAssetMap() {
    try {
      const response = await fetch("./data/asset-map.json", { cache: "default" });
      if (!response.ok) return {};
      const payload = await response.json();
      return payload && typeof payload === "object" ? payload : {};
    } catch {
      return {};
    }
  }

  async function loadWordAudioMap() {
    try {
      const response = await fetch("./data/audio/word-audio-map.json", { cache: "default" });
      if (!response.ok) return {};
      const payload = await response.json();
      return payload && typeof payload === "object" ? payload : {};
    } catch {
      return {};
    }
  }

  function queueBackgroundSync() {
    const delay = BACKGROUND_SYNC_BASE_DELAY_MS + Math.floor(Math.random() * BACKGROUND_SYNC_JITTER_MS);
    window.setTimeout(async () => {
      await syncServerState();
      render();
    }, delay);
  }

  async function ensureWordAudioMapLoaded() {
    if (state.audioMap && Object.keys(state.audioMap).length) return state.audioMap;
    if (!wordAudioMapPromise) {
      wordAudioMapPromise = loadWordAudioMap()
        .then((payload) => {
          state.audioMap = payload;
          return payload;
        })
        .finally(() => {
          wordAudioMapPromise = null;
        });
    }
    return wordAudioMapPromise;
  }

  function loadJson(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (raw) return JSON.parse(raw);
      return structuredClone(fallback);
    } catch {
      return structuredClone(fallback);
    }
  }

  function saveJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function importExternalSession() {
    const params = mergedLaunchParams();
    const source = params.get("source") || state.session.source || "school";
    const token = params.get("token") || params.get("access_token") || state.session.token || "";
    const user = parseLaunchUser(params);
    const returnUrl = params.get("returnUrl") || params.get("return_url") || state.session.returnUrl || "";

    if (!token && !user && !returnUrl && source === state.session.source) return;

    state.session = {
      token,
      source,
      user: user || state.session.user || null,
      returnUrl,
      importedAt: new Date().toISOString(),
    };
    if (state.session.user?.username || state.session.user?.nickname) {
      state.profile.nickname = state.session.user.username || state.session.user.nickname;
      saveJson(STORE.profile, state.profile);
    }
    saveJson(STORE.session, state.session);
  }

  function mergedLaunchParams() {
    const params = new URLSearchParams(location.search);
    state.route.query.forEach((value, key) => {
      if (!params.has(key)) params.set(key, value);
    });
    return params;
  }

  function parseLaunchUser(params) {
    const raw = params.get("user");
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") return parsed;
      } catch {
        // Ignore malformed external user payloads and fall back to flat params.
      }
    }
    const id = params.get("userId") || params.get("user_id") || state.session.user?.id || "";
    const username = params.get("username") || params.get("nickname") || state.session.user?.username || state.session.user?.nickname || "";
    const level = params.get("level") || state.session.user?.level || "";
    if (!id && !username && !level) return null;
    return { id, username: username || "游戏用户", nickname: username || "游戏用户", level };
  }

  async function syncServerState(options = {}) {
    const { includeRankings = false } = options;
    try {
      const health = await apiGet("/health");
      state.apiOnline = Boolean(health?.ok);
      state.ttsServiceAvailable = Boolean(health?.tts);
      if (!state.apiOnline) return;

      await syncSessionToServer();
      if (includeRankings) {
        await refreshRankings();
      }

      if (state.session.token) {
        await syncHistoryFromServer();
        const payload = await apiGet("/settings", { token: state.session.token });
        if (payload?.settings && typeof payload.settings === "object") {
          state.settings = { ...state.settings, ...payload.settings };
          saveJson(STORE.settings, state.settings);
        } else {
          syncSettingsToServer();
        }
      }
    } catch {
      state.apiOnline = false;
      state.ttsServiceAvailable = false;
    }
  }

  async function refreshRankings() {
    if (state.rankingsLoading) return state.remoteRankings;
    state.rankingsLoading = true;
    try {
      const rankings = await apiGet("/rankings", { limit: 120 });
      state.remoteRankings = Array.isArray(rankings?.rankings) ? rankings.rankings : [];
      state.rankingsLoadedAt = Date.now();
      return state.remoteRankings;
    } finally {
      state.rankingsLoading = false;
    }
  }

  function ensureRankingsLoaded() {
    if (!state.apiOnline || state.rankingsLoading) return;
    const isFresh = state.rankingsLoadedAt && Date.now() - state.rankingsLoadedAt < 60000;
    if (isFresh || state.remoteRankings.length) return;
    refreshRankings().then(render, () => {});
  }

  async function syncHistoryFromServer() {
    const params = {
      token: state.session.token,
      user_id: currentUserId(),
      username: currentUsername(),
      limit: 120,
    };
    const payload = await apiGet("/history", params);
    state.serverHistory = Array.isArray(payload?.history) ? payload.history : [];
    await syncSpeedTestRankFromServer();
    await syncSpeedTestLeaderboardFromServer();
    await syncGameLeaderboardFromServer();
    return state.serverHistory;
  }

  async function syncSessionToServer() {
    if (!state.session.token && !state.session.user) return null;
    const payload = await apiPost("/session", {
      token: state.session.token,
      source: state.session.source,
      username: currentUsername(),
      user: state.session.user || { username: currentUsername() },
    });
    if (payload?.token && payload.token !== state.session.token) {
      state.session.token = payload.token;
      saveJson(STORE.session, state.session);
    }
    return payload;
  }

  async function syncSettingsToServer() {
    if (!state.apiOnline || !state.session.token) return;
    try {
      await apiPost("/settings", { token: state.session.token, settings: state.settings });
    } catch {
      state.apiOnline = false;
    }
  }

  async function syncScoreToServer(record) {
    if (!state.apiOnline) return;
    try {
      await syncSessionToServer();
      const isSpeedTest = record.mode === "speed-test" || record.source === "speed-test";
      const endpoint = isSpeedTest ? "/lesson/speed-test" : "/scores";
      const body = {
        ...record,
        token: state.session.token,
        user_id: currentUserId(),
        username: currentUsername(),
      };
      if (isSpeedTest && body.wpm == null && Number(body.speed || 0) > 0) {
        body.wpm = Number(((Number(body.speed) || 0) / 5).toFixed(2));
      }
      const payload = await apiPost(endpoint, body);
      if (Array.isArray(payload?.rankings)) {
        state.remoteRankings = payload.rankings;
      }
      if (Array.isArray(payload?.history)) state.serverHistory = payload.history;
      if (isSpeedTest && payload) {
        state.speedTestRank = Number(payload.global_rank || 0) || null;
        state.speedTestBest = Number(payload.personal_best_speed || 0) || 0;
        state.speedTestTotal = Number(payload.total_speed_tests || 0) || 0;
      }
      render();
    } catch {
      state.apiOnline = false;
    }
  }

  async function syncSpeedTestRankFromServer() {
    if (!state.session.token) return;
    try {
      const payload = await apiGet("/user/speed-test-rank", { token: state.session.token });
      if (payload && payload.ok) {
        state.speedTestRank = Number(payload.rank || 0) || null;
        state.speedTestBest = Number(payload.best_speed || 0) || 0;
        state.speedTestTotal = Number(payload.total || 0) || 0;
      }
    } catch {
      state.apiOnline = false;
    }
  }

  async function syncSpeedTestLeaderboardFromServer() {
    try {
      const payload = await apiGet("/rankings", { limit: 20, mode: "speed-test" });
      if (payload && Array.isArray(payload.rankings)) {
        state.speedTestLeaderboard = payload.rankings;
        return;
      }
    } catch {
      // fall through to local fallback
    }
    const local = (state.history || [])
      .filter((item) => item && (item.mode === "speed-test" || item.source === "speed-test"))
      .sort((a, b) => Number(b.speed || 0) - Number(a.speed || 0))
      .slice(0, 8);
    state.speedTestLeaderboard = local;
  }

  async function apiGet(path, params = {}) {
    const url = apiUrl(path, params);
    const response = await fetch(url.toString(), { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error(`API ${response.status}`);
    return response.json();
  }

  async function apiPost(path, payload = {}) {
    const response = await fetch(apiUrl(path).toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error(`API ${response.status}`);
    return response.json();
  }

  function apiUrl(path, params = {}) {
    const normalized = path.startsWith("/") ? path : `/${path}`;
    const root = configuredApiRoot();
    const apiPath = normalized.startsWith(root) ? normalized : `${root}${normalized}`;
    const url = new URL(apiPath, location.origin || location.href);
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, value);
    });
    return url;
  }

  function configuredApiRoot() {
    const params = mergedLaunchParams();
    const configured = params.get("apiBase") || document.querySelector('meta[name="typing-api-base"]')?.getAttribute("content") || API_ROOT;
    return configured.endsWith("/") ? configured.slice(0, -1) : configured;
  }

  function parseRoute() {
    const raw = (location.hash.slice(1) || "/").trim();
    const [pathPart, queryPart = ""] = raw.split("?");
    const path = pathPart.startsWith("/") ? pathPart : `/${pathPart}`;
    return {
      raw,
      path,
      parts: path.split("/").filter(Boolean),
      query: new URLSearchParams(queryPart),
    };
  }

  function link(path, params) {
    const query = params
      ? Object.entries(params)
          .filter(([, value]) => value !== undefined && value !== null && value !== "")
          .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
          .join("&")
      : "";
    return `#${path}${query ? `?${query}` : ""}`;
  }

  function html(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function normalizeText(value) {
    return String(value ?? "")
      .replaceAll("\r\n", "\n")
      .replaceAll("\r", "\n")
      .replaceAll("\\r\\n", "\n")
      .replaceAll("\\n", "\n")
      .replaceAll("\\t", "\t");
  }

  function compactText(value) {
    return normalizeText(value).replace(/\s+/g, " ").trim();
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function nowSeconds() {
    return Math.floor(Date.now() / 1000);
  }

  function render() {
    try {
      document.body.classList.toggle("dark", Boolean(state.settings.darkMode));
      const activeBind = document.activeElement?.dataset?.bind;
      const activeSelection = document.activeElement?.selectionStart;
      if (state.loading) {
        app.innerHTML = `<div class="loading">正在载入训练数据...</div>`;
        return;
      }

      clearRouteIntervals();
      const body = renderRoute();
      state.renderError = null;
      app.innerHTML = `
        <div class="app-shell">
          ${renderHeader()}
          <main class="main">${body}</main>
          ${state.toast ? `<div class="toast">${html(state.toast)}</div>` : ""}
          ${typeof renderFooter === "function" ? renderFooter() : ""}
        </div>
      `;
      restoreFocus(activeBind, activeSelection);
      afterRender();
    } catch (error) {
      handleRenderError(error);
    }
  }

  function handleRuntimeError(event) {
    const error = event?.reason || event?.error || event;
    console.error("[typing-runtime]", error);
    showToast("页面遇到临时异常，已保护当前练习，请刷新或重新进入本课。");
  }

  function handleRenderError(error) {
    console.error("[typing-render]", error);
    state.renderError = error;
    stopSpeechLoop();
    stopTrainerAutoNext();
    app.innerHTML = `
      <div class="app-shell">
        ${renderHeader()}
        <main class="main">
          <section class="panel">
            <h2>页面临时异常</h2>
            <p class="muted">练习数据已保留，请点击重新载入当前页面。若仍然出现，请返回课程重新进入。</p>
            <div class="tag-row" style="margin-top:14px">
              <button class="solid-button" data-action="reload-page">重新载入</button>
              <a class="ghost-button" href="${link("/courses")}">返回课程</a>
            </div>
          </section>
        </main>
      </div>
    `;
  }

  function renderWhenInputSafe() {
    if (state.composing) {
      state.renderQueued = true;
      return;
    }
    render();
  }

  function afterRender() {
    const route = state.route.parts[0];
    if (!state.composing && Date.now() >= state.suppressAutoScrollUntil && (route === "lesson" || route === "contest" || route === "games")) {
      scrollCurrentCharIntoView({ force: route === "lesson" });
    }
    if (route === "lesson" && state.trainer && !state.trainer.finished && !state.composing) {
      focusTrainerInputSoon();
    }
    scheduleAutoSpeech();
  }

  function scrollCurrentCharIntoView(options = {}) {
    if (state.composing) return;
    requestAnimationFrame(() => {
      const current = app.querySelector('.typing-target .char.current[data-current="true"]');
      const container = current?.closest(".typing-target");
      if (!current || !container) return;
      const targetTop = current.offsetTop - container.clientHeight * 0.38;
      const maxTop = container.scrollHeight - container.clientHeight;
      const nextTop = clamp(targetTop, 0, Math.max(0, maxTop));
      if (options.force || Math.abs(container.scrollTop - nextTop) > 12) {
        container.scrollTop = nextTop;
      }
    });
  }

  function restoreFocus(bind, selection) {
    if (!bind) return;
    requestAnimationFrame(() => {
      const node = app.querySelector(`[data-bind="${CSS.escape(bind)}"]`);
      if (!node || node.disabled || node.readOnly) return;
      focusWithoutScroll(node);
      if (typeof node.setSelectionRange === "function") {
        const pos = Number.isFinite(selection) ? selection : node.value.length;
        node.setSelectionRange(pos, pos);
      }
    });
  }

  function focusBind(bind) {
    requestAnimationFrame(() => {
      const node = app.querySelector(`[data-bind="${CSS.escape(bind)}"]`);
      if (!node || node.disabled || node.readOnly) return;
      focusWithoutScroll(node);
      if (typeof node.setSelectionRange === "function") {
        const end = node.value.length;
        node.setSelectionRange(end, end);
      }
    });
  }

  function focusBindSoon(bind) {
    focusBind(bind);
    setTimeout(() => focusBind(bind), 80);
    setTimeout(() => focusBind(bind), 220);
  }

  function trainerFocusBind() {
    return shouldUseTextBoardTrainer(state.trainer) ? "trainer-cell-input" : "trainer-input";
  }

  function focusTrainerInputSoon() {
    focusBindSoon(trainerFocusBind());
  }

  function focusWithoutScroll(node) {
    try {
      node.focus({ preventScroll: true });
    } catch {
      node.focus();
    }
  }

  function renderHeader() {
    const path = state.route.path;
    const returnUrl = state.session.returnUrl;
    const nav = [
      ["/courses", "打字练习"],
      ["/speed-test", "打字测试"],
      ["/games", "打字游戏"],
      ["/contest", "打字比赛"],
      ["/rank", "荣誉榜"],
      ["/profile", "个人中心"],
    ];
    return `
      <header class="topbar">
        <a class="brand" href="${link("/")}">
          <span class="brand-mark brand-logo"><img src="./assets/lexq-logo.png" alt="乐启享"></span>
          <span class="brand-title">
            <strong>乐启享打字</strong>
            <span>${html(state.profile.nickname || "学习者")} · ${state.apiOnline ? "学习数据已同步" : "练习模式"}</span>
          </span>
        </a>
        <nav class="nav">
          ${nav
            .map(([to, label]) => `<a class="${path === to || path.startsWith(`${to}/`) ? "active" : ""}" href="${link(to)}">${label}</a>`)
            .join("")}
          ${returnUrl ? `<a href="${html(returnUrl)}">返回游戏</a>` : ""}
          <button data-action="toggle-setting" data-key="darkMode" title="切换深色模式">${state.settings.darkMode ? "日间" : "夜间"}</button>
          ${state.session && state.session.token
            ? `<a class="nav-user" href="#/profile" title="个人中心">${html((state.session.user && (state.session.user.nickname || state.session.user.username)) || "已登录")}</a>`
            : ""}
        </nav>
      </header>
    `;
  }

  function renderRoute() {
    const [first, second] = state.route.parts;
    if (!first) return renderHome();
    if (first === "courses" && second) return renderCategoryPage(second);
    if (first === "courses") return renderCourses();
    if (first === "lesson" && second) return renderLessonRoute(second);
    if (first === "speed-test") return renderSpeedTest();
    if (first === "games") return second ? renderGameRoute(second) : renderGames();
    if (first === "contest") return renderContest();
    if (first === "rank") return renderRank();
    if (first === "profile") return renderProfile();
    if (first === "custom") return renderCustom();
    if (first === "download") return renderDownload();
    if (first === "english") return renderModeHub("english", "英文模式", "英文单词 · 英文短文 · 英文打字课程");
    if (first === "pinyin") return renderModeHub("pinyin", "拼音模式", "指法 · 拼音 · 单字 · 进阶");
    if (first === "code") return renderModeHub("code", "代码模式", "C++ / Java / Python / Go / SQL / JavaScript / 小键盘");
    if (first === "client") return renderClientDownload();
    if (first === "intro") return renderStaticInfo("intro");
    if (first === "updates") return renderStaticInfo("updates");
    if (first === "about") return renderStaticInfo("about");
    if (first === "service") return renderStaticInfo("service");
    if (first === "privacy") return renderStaticInfo("privacy");
    if (first === "cookie") return renderStaticInfo("cookie");
    return renderNotFound();
  }

  function renderHome() {
    const stats = state.catalog.stats || {};
    const history = primaryHistoryRecords();
    const done = history.length;
    const best = history.reduce((max, item) => Math.max(max, Number(item.speed || 0)), 0);
    return `
      <section class="hero-band hero-band-games">
        <div class="hero-copy">
          <span class="eyebrow">乐启享 · 打字游戏平台</span>
          <h1>9 款游戏 + 完整课程，把练习变成一种玩法</h1>
          <p>拼音战机、打字赛车、细菌大作战、打地鼠、保卫地球、沉浸式打字、鸭子过河、捕鱼达人、土豆枪大战僵尸。每款游戏都对应一种真实打字场景：单词、汉字、拼音、反应、文章，Pixi / Canvas 引擎 + 完整 SFX。</p>
          <div class="tag-row">
            <a class="pill-button" href="${link("/games")}">立即开玩</a>
            <a class="ghost-button" href="${link("/speed-test")}">先测个速</a>
            <a class="ghost-button" href="${link("/courses")}">查看课程</a>
          </div>
        </div>
        <div class="hero-stats hero-stats--4">
          <div class="stat-tile"><span>打字游戏</span><strong>9 款</strong></div>
          <div class="stat-tile"><span>课程体系</span><strong>完整</strong></div>
          <div class="stat-tile"><span>模式覆盖</span><strong>拼音 / 英文 / 代码</strong></div>
          <div class="stat-tile"><span>平台费用</span><strong>完全免费</strong></div>
        </div>
      </section>

      <section class="section-title">
        <div>
          <h2>科学的课程模式与循序渐进的盲打练习</h2>
          <p>六个入口，覆盖指法、拼音、英文、代码等多种打字场景。</p>
        </div>
      </section>
      <div class="grid category-grid">
        ${quickEntry("指法学习", "26 字母键位 · 手指分工", "/courses", "键")}
        ${quickEntry("拼音练习", "完整汉语拼音 · 双拼支持", "/pinyin", "拼")}
        ${quickEntry("单字练习", "常用汉字逐字击键", "/pinyin", "字")}
        ${quickEntry("英文单词", "盲打同时记忆词汇", "/english", "A")}
        ${quickEntry("英文文章", "练习流畅的英文输入", "/english", "文")}
        ${quickEntry("自定义课程", "导入任意文本或游戏内文本", "/custom", "自")}
      </div>

      <section class="section-title">
        <div><h2>丰富的课程形式 + 对抗的实战游戏</h2><p>满足不同人群的个性化需求。</p></div>
      </section>
      <div class="grid category-grid">
        ${quickEntry("基础指法练习", "详细手指分工与键位提示", "/courses", "基")}
        ${quickEntry("进阶拼音练习", "训练良好的指法规范与击键速度", "/pinyin", "拼")}
        ${quickEntry("中文文章练习", "诗词 · 名著 · 百科，渐进式盲打", "/courses", "中")}
        ${quickEntry("盲打英文单词", "击键同时记忆单词", "/english", "A")}
        ${quickEntry("自定义课程", "任何格式：文章、游戏台词", "/custom", "自")}
        ${quickEntry("打字比赛", "房间模式 + 双人 PK", "/contest", "赛")}
      </div>

      <section class="section-title">
        <div><h2>为什么选择乐启享</h2><p>专业的指法训练体系，覆盖所有年龄段。</p></div>
      </section>
      <div class="grid category-grid feature-grid feature-grid-icons">
        <div class="card feature-card feature-card-icon">
                    <div class="feature-card-icon-art"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="6" width="18" height="12" rx="2"/><path d="M7 10h.01M11 10h.01M15 10h.01M7 14h10"/></svg></div>
          <h3>科学的指法练习</h3>
          <p class="muted">每一次按键都有实时提示，纠正手指位置。</p>
        </div>
        <div class="card feature-card feature-card-icon">
                    <div class="feature-card-icon-art"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M8 12h8M12 8v8"/></svg></div>
          <h3>趣味的游戏化</h3>
          <p class="muted">打字中增加游戏环节，学习也可以如此轻松。</p>
        </div>
        <div class="card feature-card feature-card-icon">
                    <div class="feature-card-icon-art"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5h12a3 3 0 0 1 3 3v11a3 3 0 0 0-3-3H4z"/><path d="M4 5v14"/></svg></div>
          <h3>科学的课程体系</h3>
          <p class="muted">字母、拼音、诗词赋、单词、文章，由浅入深，学会打字更会学以致用。</p>
        </div>
        <div class="card feature-card feature-card-icon">
                    <div class="feature-card-icon-art"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20V8M10 20V4M16 20v-8M22 20H2"/></svg></div>
          <h3>强大的数据看板</h3>
          <p class="muted">实时的数据统计，记录并分析您的打字情况。</p>
        </div>
        <div class="card feature-card feature-card-icon">
                    <div class="feature-card-icon-art"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3"/><path d="M3 20a6 6 0 0 1 12 0"/><circle cx="17" cy="9" r="2.2"/><path d="M15 20a4 4 0 0 1 6-3.46"/></svg></div>
          <h3>班级教学管理</h3>
          <p class="muted">为老师打造专业的班级和学生管理平台。</p>
        </div>
        <div class="card feature-card feature-card-icon">
                    <div class="feature-card-icon-art"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8M12 17v4"/></svg></div>
          <h3>免安装在线体验</h3>
          <p class="muted">打开浏览器即可随时随地体验打字的乐趣。</p>
        </div>
      </div>

      <section class="section-title">
        <div><h2>打字也可以很好玩</h2><p>9 款游戏化练习场景，把反应、单词、拼音都装进不同的玩法里。</p></div>
        <a class="ghost-button" href="${link("/games")}">查看全部游戏</a>
      </section>
      <div class="grid category-grid home-game-grid">
        ${renderHomeGameHighlights()}
      </div>

      <div class="home-cta-row">
        <a class="pill-button home-cta" href="${link("/courses")}">立即开始学习</a>
      </div>

      ${renderRecentHistory()}
    `;
  }

  function renderHomeGameHighlights() {
    const games = (state.catalog.games || []).slice(0, 6);
    if (!games.length) return "";
    return games.map((game) => {
      const color = getGameCardColor(game);
      const badge = game.badge || (game.tags && game.tags[0]) || "";
      const imgSrc = game.image ? toAssetUrl(game.image) : "";
      const title = html(game.title);
      return `
        <a class="card home-game-card home-game-card-${color}" href="${link(`/games/${game.id}`)}">
          <div class="home-game-card-cover">${imgSrc ? `<img src="${html(imgSrc)}" alt="${title}" loading="lazy">` : ""}<span class="home-game-card-badge">${html(badge)}</span></div>
          <div class="home-game-card-body"><h3>${title}</h3><p class="muted">${html((game.tags || []).slice(0, 2).join(" · "))}</p></div>
        </a>`;
    }).join("");
  }

  function quickEntry(title, desc, to, mark) {
    return `
      <a class="card" href="${link(to)}">
        <div class="card-title-row">
          <h3>${html(title)}</h3>
          <span class="lesson-index">${html(mark)}</span>
        </div>
        <p class="muted">${html(desc)}</p>
      </a>
    `;
  }

  function renderCourses() {
    const categories = state.catalog.categories || [];
    if (!categories.length) {
      return renderEmptyData();
    }
    return `
      <section class="section-title">
        <div>
          <h2>打字课程</h2>
          <p>按课程体系选择练习内容，完成后自动累计进度。</p>
        </div>
        <a class="ghost-button" href="${link("/custom")}">自定义课程</a>
      </section>
      <div class="grid category-grid">
        ${categories.map(renderCategoryCard).join("")}
      </div>
    `;
  }

  function renderCategoryCard(category) {
    const categoryId = String(category.category_id);
    const route = categoryRoute(category);
    const progress = categoryProgress(categoryId);
    return `
      <a class="card" href="${route}">
        <div class="card-media">${category.image ? `<img src="${html(toAssetUrl(category.image))}" alt="${html(category.title)}">` : ""}</div>
        <div class="card-title-row">
          <h3>${html(category.title)}</h3>
          <strong>${Number(category.progress || 0)}/${Number(category.total || 0)}</strong>
        </div>
        <p class="muted">${html(category.desc || "")}</p>
        <div class="progress" title="完成进度" style="--value:${progress}%"><i></i></div>
      </a>
    `;
  }

  function categoryRoute(category) {
    if (category.page_url === "/game" || Number(category.category_id) === 7) return link("/games");
    if (category.page_url === "/contest/welcome" || Number(category.category_id) === 8) return link("/contest");
    if (Number(category.category_id) === 6) return link("/custom");
    return link(`/courses/${category.category_id}`);
  }

  function categoryProgress(categoryId) {
    const lessons = lessonsForCategory(categoryId);
    if (!lessons.length) return 0;
    const completed = lessons.filter((lesson) => state.progress[lesson.lessonId]?.complete).length;
    return Math.round((completed / lessons.length) * 100);
  }

  function renderCategoryPage(categoryId) {
    const category = (state.catalog.categories || []).find((item) => String(item.category_id) === String(categoryId));
    const groups = state.catalog.courseGroups?.[String(categoryId)] || [];
    const courses = groups.flatMap((group) => group.courses || []);
    if (!category || !courses.length) {
      return `
        <div class="section-title">
          <div><h2>课程不可用</h2><p>这个分类暂时没有可展示课时。</p></div>
          <a class="ghost-button" href="${link("/courses")}">返回课程</a>
        </div>
        <div class="empty">没有可展示的课时。</div>
      `;
    }

    const activeCourseId = state.courseTabs[categoryId] || courses[0].courseId;
    const query = state.search.trim().toLowerCase();
    const activeCourse = courses.find((course) => course.courseId === activeCourseId) || courses[0];
    const visibleCourses = query
      ? courses
          .map((course) => ({
            ...course,
            lessons: (course.lessons || []).filter((lesson) =>
              `${lesson.title || ""} ${course.title || ""}`.toLowerCase().includes(query)
            ),
          }))
          .filter((course) => course.lessons.length)
      : [activeCourse];

    return `
      <section class="section-title">
        <div>
          <h2>${html(category.title)}</h2>
          <p>${html(category.desc || "")} 共 ${Number(category.total || 0)} 个课时。</p>
        </div>
        <a class="ghost-button" href="${link("/courses")}">返回分类</a>
      </section>
      <div class="panel">
        <div class="tabbar">
          ${courses
            .map(
              (course) =>
                `<button class="${course.courseId === activeCourseId ? "active" : ""}" data-action="select-course" data-category="${html(
                  categoryId
                )}" data-course="${html(course.courseId)}">${html(course.title)} · ${(course.lessons || []).length}</button>`
            )
            .join("")}
        </div>
        <div class="search-row">
          <input class="field" data-bind="search" value="${html(state.search)}" placeholder="搜索课时或课程名">
          <select class="field" data-action="jump-category">
            ${(state.catalog.categories || [])
              .filter((item) => state.catalog.courseGroups?.[String(item.category_id)]?.length)
              .map((item) => `<option value="${item.category_id}" ${String(item.category_id) === String(categoryId) ? "selected" : ""}>${html(item.title)}</option>`)
              .join("")}
          </select>
        </div>
      </div>
      ${visibleCourses
        .map(
          (course) => `
            <section class="section-title">
              <div>
                <h3>${html(course.title)}</h3>
                <p>${html(course.package_name || "")} · ${course.order_start || ""}-${course.order_end || ""}</p>
              </div>
            </section>
            <div class="grid course-grid">
              ${(course.lessons || []).map((lesson) => renderLessonCard(lesson, course, categoryId)).join("")}
            </div>
          `
        )
        .join("")}
    `;
  }

  function renderLessonCard(lesson, course, categoryId) {
    const progress = state.progress[lesson.lessonId];
    const to = link(`/lesson/${lesson.lessonId}`, {
      courseId: course.courseId,
      categoryId,
      source: "course",
    });
    return `
      <a class="card lesson-card" href="${to}">
        <div class="card-title-row">
          <span class="lesson-index">${lesson.order || lesson.index || ""}</span>
          ${lesson.icon ? `<img class="lesson-icon" src="${html(toAssetUrl(lesson.icon))}" alt="">` : ""}
        </div>
        <h3>${html(lesson.title)}</h3>
        <p class="tiny">${progress?.complete ? `已完成 · ${progress.speed || 0} 字/分 · ${progress.accuracy || 0}%` : "未完成"}</p>
        <div class="progress" style="--value:${progress?.complete ? 100 : 0}%"><i></i></div>
      </a>
    `;
  }

  function renderLessonRoute(lessonId) {
    const source = state.route.query.get("source") || "course";
    const foundMeta = findLessonMeta(lessonId, source) || {};
    const meta = {
      ...foundMeta,
      lessonId,
      courseId: state.route.query.get("courseId") || foundMeta.courseId,
      categoryId: state.route.query.get("categoryId") || foundMeta.categoryId,
    };
    const trainerCategoryId = String(state.trainer?.meta?.categoryId || state.trainer?.detail?.categoryId || "");
    const routeCategoryId = String(meta.categoryId || "");
    const categoryChanged = source === "course" ? trainerCategoryId !== routeCategoryId : false;
    if (!state.trainer || state.trainer.lessonId !== lessonId || state.trainer.source !== source || categoryChanged) {
      ensureLessonTrainer(lessonId, source, meta);
      return `<div class="loading">正在加载课时 ${html(meta?.title || lessonId)}...</div>`;
    }
    return renderTrainer(state.trainer);
  }

  async function ensureLessonTrainer(lessonId, source, meta) {
    const loadingKey = `${source}:${lessonId}`;
    if (state.loadingLesson === loadingKey) return;
    state.loadingLesson = loadingKey;
    try {
      if (source === "custom") {
        state.trainer = buildCustomTrainer(meta?.customItem || customItemFromLessonId(lessonId) || { id: lessonId.replace(/^custom-/, ""), title: meta?.title || lessonId, text: meta?.text || meta?.title || lessonId });
        await Promise.resolve();
      } else {
        const detail = await loadLessonDetail(lessonId);
        state.trainer = buildTrainer(detail, meta, source);
      }
    } catch (error) {
      state.trainer = buildTrainer(null, meta || { lessonId, title: lessonId }, source);
      showToast(`课时详情缺失，已用标题生成练习文本：${error.message}`);
    } finally {
      state.loadingLesson = null;
      render();
    }
  }

  async function loadLessonDetail(lessonId) {
    if (state.lessonCache.has(lessonId)) return state.lessonCache.get(lessonId);
    const response = await fetch(`./data/lessons/${encodeURIComponent(lessonId)}.json`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    state.lessonCache.set(lessonId, payload);
    return payload;
  }

  function buildTrainer(detailPayload, meta, source) {
    const detail = detailPayload?.data || {};
    const words = composeWordItems(detail);
    const mode = words.length ? (isDictationLesson(detail, meta) ? "dictation" : "word") : "text";
    const text = words.length ? words[0].word : composeLessonText(detail, meta);
    return {
      lessonId: detail.lessonId || meta?.lessonId,
      source,
      mode,
      detail,
      meta: meta || {},
      text,
      words,
      wordIndex: 0,
      wordStats: { completed: 0, correct: 0, chars: 0 },
      revealAnswer: false,
      pinyin: composeLessonPinyin(detail),
      input: "",
      startedAt: null,
      paused: false,
      finished: false,
      saved: false,
    };
  }

  function composeWordItems(detail) {
    const items = [];
    for (const section of ["practice", "test", "game"]) {
      for (const chapter of detail?.[section] || []) {
        for (const raw of chapter.text || []) {
          const parsed = parseWordPayload(raw);
          for (const item of parsed) {
            if (!item?.word) continue;
            items.push({
              word: normalizeText(item.word).trim(),
              pronun: normalizeText(item.pronun || item.phonetic || ""),
              translation: normalizeText(item.translation || item.meaning || ""),
              audio: item.audio || "",
            });
          }
        }
        if (items.length) return items;
      }
    }
    return items;
  }

  function parseWordPayload(raw) {
    if (Array.isArray(raw)) return raw;
    if (raw && typeof raw === "object") return [raw];
    const text = String(raw || "").trim();
    if (!text.startsWith("[") && !text.startsWith("{")) return [];
    try {
      const parsed = JSON.parse(text);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      return [];
    }
  }

  function isDictationLesson(detail, meta) {
    const categoryId = String(meta?.categoryId || detail?.categoryId || "");
    const haystack = `${detail?.categoryTitle || ""} ${detail?.courseName || ""} ${detail?.lessonName || ""} ${meta?.categoryTitle || ""} ${meta?.courseTitle || ""} ${meta?.title || ""}`;
    return categoryId === "9" || /默写|背单词|听写|dictation|recite/i.test(haystack);
  }

  function composeLessonPinyin(detail) {
    const entries = [];
    for (const section of ["practice", "test", "game", "article", "instruction"]) {
      for (const chapter of detail?.[section] || []) {
        const raw = chapter.pinyin;
        if (!raw) continue;
        try {
          const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
          if (Array.isArray(parsed)) {
            for (const item of parsed) {
              if (Array.isArray(item)) entries.push({ char: normalizeText(item[0] || ""), pinyin: normalizeText(item[1] || "") });
              else if (item && typeof item === "object") entries.push({ char: normalizeText(item.char || item.text || ""), pinyin: normalizeText(item.pinyin || "") });
            }
          }
        } catch {
          // Some public lessons omit or partially encode pinyin. Direct Chinese input still works.
        }
      }
      if (entries.length) break;
    }
    return entries;
  }

  function composeLessonText(detail, meta) {
    const sections = ["practice", "test", "game", "article", "instruction"];
    const chunks = [];
    for (const section of sections) {
      for (const chapter of detail?.[section] || []) {
        if (Array.isArray(chapter.text)) {
          chunks.push(...chapter.text.filter(Boolean).map(normalizeText));
        }
      }
      if (chunks.length && section !== "instruction") break;
    }
    const text = chunks.join("\n\n").trim();
    if (text) return text;
    const title = detail?.lessonName || meta?.title || "专项练习";
    return `${title}\n${title} ${title} ${title}`;
  }

  function renderTrainer(trainer) {
    const metrics = trainerMetrics(trainer);
    const current = trainer.text[trainer.input.length] || "";
    const title = trainer.detail.lessonName || trainer.meta.title || "练习";
    const category = trainer.detail.categoryTitle || trainer.meta.categoryTitle || (trainer.source === "speed-test" ? "速度测试" : "课程练习");
    const next = nextLessonLink(trainer);
    const backLink = trainer.source === "speed-test" ? link("/speed-test") : trainer.source === "custom" ? link("/custom") : link(`/courses/${trainer.detail.categoryId || trainer.meta.categoryId || ""}`);
    return `
      ${renderTrainingTopbar({ title, category, course: trainer.detail.courseName || trainer.meta.courseTitle || "", backLink, next })}
      ${trainer.mode === "word" || trainer.mode === "dictation" ? renderWordTrainer(trainer, metrics) : renderTextTrainer(trainer, metrics, current)}
    `;
  }

  function trainingToggle(key, iconOn, iconOff, label) {
    const on = Boolean(state.settings[key]);
    return `<button class="icon-button ${on ? "is-on" : "is-off"}" data-action="toggle-setting" data-key="${key}" aria-label="${html(label)}" aria-pressed="${on}" title="${html(label)}：${on ? "开启" : "关闭"}">${on ? iconOn : iconOff}</button>`;
  }

  function renderTrainingTopbar({ title, category, course, backLink, next }) {
    return `
      <section class="training-topbar">
        <a class="back-button" href="${backLink}" aria-label="返回">←</a>
        <div class="training-crumb">
          <span>${html(category)}</span>
          <b>/</b>
          <span>${html(course || title)}</span>
          <b>/</b>
          <strong>${html(title)}</strong>
        </div>
        <div class="training-actions">
          ${trainingToggle("darkMode", "◐", "◑", "夜间模式")}
          <button class="icon-button" data-action="reset-trainer" aria-label="重新开始" title="重新开始">↻</button>
          <button class="icon-button" data-action="focus-trainer" aria-label="定位到输入框" title="定位到输入框">⌨</button>
          ${trainingToggle("showKeyboard", "⌨", "⌧", "键盘提示")}
          ${trainingToggle("showHands", "✋", "◇", "指法提示")}
          ${trainingToggle("keyAudio", "♪", "♩", "按键音")}
          ${trainingToggle("completeAudio", "✓", "×", "完成音")}
          ${trainingToggle("speechAudio", "🔊", "🔇", "朗读语音")}
          ${trainingToggle("autoSpeech", "⟳", "○", "自动朗读")}
          ${next ? `<a class="icon-button next-action" href="${next}" aria-label="下一课" title="下一课">→</a>` : ""}
        </div>
      </section>
    `;
  }

  function renderTextTrainer(trainer, metrics, current) {
    const chinese = isChineseTextTrainer(trainer);
    const textBoard = shouldUseTextBoardTrainer(trainer);
    return `
      <section class="practice-shell ${textBoard ? "text-board-shell" : ""} ${chinese ? "chinese-shell" : ""}">
        <div class="practice-card ${textBoard ? "text-board-practice" : ""} ${chinese ? "chinese-practice" : ""}">
          ${renderPinyinCue(trainer)}
          <div class="typing-target training-target ${textBoard ? "hanzi-target text-board-target" : ""} ${chinese ? "chinese-target" : "latin-target"}" data-training-target aria-label="目标文本">${renderTrainingTarget(trainer)}</div>
          <div class="training-status" data-training-status>${renderTextTrainingStatus(metrics)}</div>
          <div class="progress training-progress" data-training-progress style="--value:${metrics.progress}%"><i></i></div>
          ${renderTextInputCapture(trainer, textBoard)}
          <div class="toolbar training-toolbar" data-training-toolbar>${renderTextToolbar(metrics, current)}</div>
          <div class="trainer-keyboard-zone" data-training-keyboard>${state.settings.showKeyboard ? renderKeyboard(current, "full") : ""}</div>
        </div>
        <aside class="practice-side">
          <div class="metric-grid" data-training-metrics>${renderTextMetricGrid(metrics)}</div>
          ${trainer.finished ? `<div class="finish-card">训练完成，成绩已保存。</div>` : ""}
        </aside>
      </section>
    `;
  }

  function renderTextInputCapture(trainer, textBoard) {
    if (textBoard) {
      return `
        <div class="typing-input training-input hanzi-capture text-board-capture is-sync-only" data-bind="trainer-input-sync" aria-label="完整输入内容同步显示">${trainer.input ? html(trainer.input) : `<span class="sync-placeholder">上方方格输入，这里同步显示完整内容。</span>`}</div>
      `;
    }
    return `
      <textarea class="typing-input training-input" data-bind="trainer-input" lang="zh-CN" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="点击这里或按键开始，中文输入法可直接上屏..." ${trainer.finished ? "readonly" : ""}>${html(trainer.input)}</textarea>
    `;
  }

  function isChineseTextTrainer(trainer) {
    return trainer?.mode === "text" && /[\u3400-\u9fff]/.test(trainer.text || "");
  }

  function isLongLatinTextTrainer(trainer) {
    const text = trainer?.text || "";
    return trainer?.mode === "text" && text.length >= 80 && /[A-Za-z]/.test(text);
  }

  function shouldUseTextBoardTrainer(trainer) {
    return trainer?.mode === "text";
  }

  function renderTrainingTarget(trainer) {
    return shouldUseTextBoardTrainer(trainer) ? renderHanziBoard(trainer) : renderTargetText(trainer.text, trainer.input);
  }

  function renderHanziBoard(trainer) {
    const chinese = isChineseTextTrainer(trainer);
    const compactRows = typeof window !== "undefined" && window.innerHeight <= 920;
    const perRow = chinese ? 20 : compactRows ? 24 : 28;
    const text = trainer.text || "";
    const inputLength = clamp((trainer.input || "").length, 0, text.length);
    const totalRows = Math.max(1, Math.ceil(text.length / perRow));
    const activeRow = clamp(Math.floor(inputLength / perRow), 0, totalRows - 1);
    const visibleRows = compactRows ? 1 : 2;
    const startRow = visibleRows === 1 ? activeRow : clamp(activeRow <= 0 ? 0 : activeRow - 1, 0, Math.max(0, totalRows - visibleRows));
    const rows = Array.from({ length: Math.min(visibleRows, totalRows - startRow) }, (_, offset) => {
      const row = startRow + offset;
      const rowStart = row * perRow;
      const rowState = row < activeRow ? "passed" : row === activeRow ? "active" : "future";
      return `
        <div class="hanzi-row-pair ${rowState}" data-row="${row + 1}">
          <div class="hanzi-line hanzi-target-line" aria-label="第 ${row + 1} 行原文">${renderHanziCells(trainer, rowStart, perRow, "target")}</div>
          <div class="hanzi-line hanzi-input-line" aria-label="第 ${row + 1} 行输入">${renderHanziCells(trainer, rowStart, perRow, "input")}</div>
        </div>
      `;
    });
    return `
      <div class="hanzi-board ${chinese ? "chinese-board" : "latin-board"}" style="--hanzi-cols:${perRow}">
        <div class="hanzi-board-head">
          <strong>${chinese ? "中文对照输入" : "文章对照输入"}</strong>
          <span>上排原文，下排输入 · 第 ${activeRow + 1}/${totalRows} 行</span>
        </div>
        <div class="hanzi-rows">${rows.join("")}</div>
      </div>
    `;
  }

  function renderHanziCells(trainer, start, count, mode) {
    const text = trainer.text || "";
    const input = trainer.input || "";
    return Array.from({ length: count }, (_, localIndex) => {
      const index = start + localIndex;
      const expected = text[index] || "";
      const actual = input[index] || "";
      const current = index === input.length && index < text.length;
      let cls = `hanzi-cell char ${mode === "input" ? "hanzi-input-cell" : "hanzi-target-cell"}`;
      if (mode === "input" && actual) cls += actual === expected ? " ok" : " bad";
      if (expected === " ") cls += " space-cell";
      if (expected === "\n") cls += " newline-cell";
      if (current) cls += " current";
      if (mode === "input" && current && !trainer.finished) cls += " editing";
      const currentAttr = current ? ' data-current="true"' : "";
      const value = mode === "input" ? actual : expected;
      const editor = mode === "input" && current && !trainer.finished ? renderHanziCellEditor(index) : "";
      return `<span class="${cls}" data-index="${index}"${currentAttr}>${html(displayHanziCell(value))}${editor}</span>`;
    }).join("");
  }

  function renderHanziCellEditor(index) {
    return `<input class="hanzi-cell-editor" data-bind="trainer-cell-input" data-index="${index}" value="" lang="zh-CN" inputmode="text" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="当前方格输入">`;
  }

  function displayHanziCell(value) {
    if (!value) return "";
    if (value === "\n") return "↵";
    if (value === " ") return "\u00a0";
    return value;
  }

  function renderTextTrainingStatus(metrics) {
    return `
      <span>速度：<strong>${metrics.speed}</strong> 字/分钟</span>
      <span>准确率：<strong>${metrics.accuracy}%</strong></span>
      <span>进度：<strong>${metrics.progress}%</strong></span>
    `;
  }

  function renderTextToolbar(metrics, current) {
    return `
      <span class="tiny">当前键：${html(current === "\n" ? "Enter" : current || "完成")}</span>
      <span class="tiny">${metrics.done}/${metrics.total} 字</span>
    `;
  }

  function renderTextMetricGrid(metrics) {
    return `
      ${metric("速度", `${metrics.speed}`, "字/分")}
      ${metric("准确率", `${metrics.accuracy}%`, "")}
      ${metric("用时", `${formatClock(metrics.elapsed)}`, "")}
      ${metric("进度", `${metrics.progress}%`, "")}
      ${metric("完成", `${metrics.correct || 0}/${metrics.total || 0}`, "字")}
    `;
  }

  function renderWordTrainer(trainer, metrics) {
    const item = currentWordItem(trainer);
    const answer = item?.word || "";
    const dictation = trainer.mode === "dictation";
    const displayWord = dictation && !trainer.revealAnswer ? maskedWord(answer) : answer;
    const stripStart = clamp(trainer.wordIndex - 8, 0, Math.max(0, trainer.words.length - 16));
    const stripWords = trainer.words.slice(stripStart, stripStart + 24);
    return `
      <section class="word-trainer">
        <div class="word-strip" aria-label="单词列表">
          ${stripWords
            .map(
              (word, localIndex) => {
                const index = stripStart + localIndex;
                return `<button class="${index === trainer.wordIndex ? "active" : ""} ${index < trainer.wordIndex ? "done" : ""}" data-action="jump-word" data-index="${index}">${html(word.word)}</button>`;
              }
            )
            .join("")}
        </div>
        <div class="word-stage ${dictation ? "dictation" : ""}">
          <div class="word-main">
            <div class="word-progress">${trainer.wordIndex + 1}/${trainer.words.length}</div>
            <div class="word-display" title="${dictation ? "按住或点击显示答案" : ""}">
              <span>${html(displayWord)}</span>
              <button class="speaker-button" data-action="speak-current" title="朗读">🔊</button>
            </div>
            <div class="word-pronun">${html(item?.pronun || "暂无音标")}</div>
            <div class="word-translation">${html(item?.translation || "暂无释义")}</div>
            <div class="word-actions">
              <button class="ghost-button" data-action="speak-current">朗读</button>
              <button class="${state.speechLoopTimer ? "solid-button" : "ghost-button"}" data-action="toggle-loop-speech">循环发音</button>
              ${dictation ? `<button class="ghost-button" data-action="reveal-word">${trainer.revealAnswer ? "隐藏答案" : "显示答案"}</button>` : ""}
            </div>
            <input class="word-input" data-bind="trainer-input" value="${html(trainer.input)}" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="${dictation ? "听朗读和看释义默写单词" : "输入当前单词"}" ${trainer.finished ? "readonly" : ""}>
          </div>
          <div class="training-status">
            <span>时间：<strong>${formatClock(metrics.elapsed)}</strong></span>
            <span>输入数：<strong>${metrics.done}</strong></span>
            <span>WPM：<strong>${metrics.speed}</strong></span>
            <span>正确率：<strong>${metrics.accuracy}%</strong></span>
          </div>
        </div>
        ${state.settings.showKeyboard ? renderKeyboard((answer || "")[trainer.input.length] || "", "full") : ""}
        ${trainer.finished ? `<div class="finish-card">训练完成，成绩已保存。</div>` : ""}
      </section>
    `;
  }

  function renderTargetText(text, input) {
    const limit = 12000;
    const visible = text.length > limit ? `${text.slice(0, limit)}\n\n[文本过长，已截断显示；统计仍按完整文本]` : text;
    return visible
      .split("")
      .map((char, index) => {
        let cls = "char";
        if (index < input.length) cls += input[index] === char ? " ok" : " bad";
        if (index === input.length) cls += " current";
        const currentAttr = index === input.length ? ' data-current="true"' : "";
        return `<span class="${cls}"${currentAttr}>${char === "\n" ? "\n" : html(char)}</span>`;
      })
      .join("");
  }

  function renderPinyinCue(trainer) {
    const index = clamp(trainer.input.length, 0, Math.max(0, trainer.text.length - 1));
    const current = trainer.text[index] || "";
    const entry = lookupPinyin(trainer, index);
    const word = current === "\n" ? "换行" : current || "完成";
    const pinyin = entry?.pinyin || (isChinese(current) ? "暂无拼音" : "");
    return `
      <div class="pronunciation-panel" data-training-cue>
        <div>
          <div class="tiny">当前字符</div>
          <strong>${html(word)}</strong>
        </div>
        <div>
          <div class="tiny">拼音 / 音标</div>
          <strong>${html(pinyin || "按原文输入")}</strong>
        </div>
        <div>
          <div class="tiny">输入模式</div>
          <strong>${isChinese(current) ? "中文直输" : "英文/符号"}</strong>
        </div>
      </div>
    `;
  }

  function lookupPinyin(trainer, index) {
    if (!trainer?.pinyin?.length) return null;
    const direct = trainer.pinyin[index];
    if (direct && (!direct.char || direct.char === trainer.text[index])) return direct;
    return trainer.pinyin.find((item, itemIndex) => itemIndex >= index - 3 && itemIndex <= index + 3 && item.char === trainer.text[index]) || null;
  }

  function isChinese(char) {
    return /[\u3400-\u9fff]/.test(char || "");
  }

  function trainerMetrics(trainer) {
    if (trainer.mode === "word" || trainer.mode === "dictation") {
      const item = currentWordItem(trainer);
      const completedChars = Number(trainer.wordStats?.chars || 0);
      const done = completedChars + Math.min((trainer.input || "").length, (item?.word || "").length);
      const currentCorrect = countCorrectChars(item?.word || "", trainer.input || "", true);
      const correct = Number(trainer.wordStats?.correct || 0) + currentCorrect;
      const total = trainer.words.reduce((sum, word) => sum + word.word.length, 0) || 1;
      const elapsed = trainer.startedAt ? Math.max(1, nowSeconds() - trainer.startedAt) : 0;
      const speed = elapsed ? Math.round((correct / 5 / elapsed) * 60) : 0;
      const accuracy = done ? Math.round((correct / done) * 100) : 100;
      const progress = Math.round(((trainer.wordStats?.completed || 0) / Math.max(1, trainer.words.length)) * 100);
      return { total, done, correct, elapsed, speed, accuracy, progress };
    }
    const total = trainer.text.length || 1;
    const done = clamp(trainer.input.length, 0, total);
    let correct = 0;
    for (let index = 0; index < done; index += 1) {
      if (trainer.input[index] === trainer.text[index]) correct += 1;
    }
    const elapsed = trainer.startedAt ? Math.max(1, nowSeconds() - trainer.startedAt) : 0;
    const speed = elapsed ? Math.round((correct / elapsed) * 60) : 0;
    const accuracy = done ? Math.round((correct / done) * 100) : 100;
    const progress = Math.round((done / total) * 100);
    return { total, done, correct, elapsed, speed, accuracy, progress };
  }

  function countCorrectChars(target, input, ignoreCase = false) {
    const expected = ignoreCase ? String(target).toLowerCase() : String(target);
    const actual = ignoreCase ? String(input).toLowerCase() : String(input);
    let correct = 0;
    for (let index = 0; index < actual.length && index < expected.length; index += 1) {
      if (actual[index] === expected[index]) correct += 1;
    }
    return correct;
  }

  function metric(label, value, unit) {
    return `<div class="metric"><span>${html(label)}</span><strong>${html(value)}</strong><span class="tiny">${html(unit)}</span></div>`;
  }

  function renderKeyboard(current, mode = "full") {
    const key = String(current || "").toLowerCase();
    if (mode === "compact") {
      const rows = ["qwertyuiop", "asdfghjkl;", "zxcvbnm,.", "1234567890"];
      return `
        <div class="keyboard-panel compact">
        <div class="keyboard" aria-label="键盘提示">
          ${rows
            .map(
              (row) =>
                `<div class="key-row">${row
                  .split("")
                  .map((char) => `<span class="key ${char === key ? "active" : ""}" data-action="keyboard-key" data-keyboard-key="${html(char)}">${html(char)}</span>`)
                  .join("")}</div>`
            )
            .join("")}
        </div>
        ${state.settings.showHands ? renderFingerGuide(key, "compact") : ""}
        </div>
      `;
    }

    const rows = [
      [
        ["`", "~<br>`"],
        ["1", "!<br>1"],
        ["2", "@<br>2"],
        ["3", "#<br>3"],
        ["4", "$<br>4"],
        ["5", "%<br>5"],
        ["6", "^<br>6"],
        ["7", "&<br>7"],
        ["8", "*<br>8"],
        ["9", "(<br>9"],
        ["0", ")<br>0"],
        ["-", "_<br>-"],
        ["=", "+<br>="],
        ["backspace", "back", 1.7],
      ],
      [
        ["tab", "tab", 1.45],
        ..."qwertyuiop".split("").map((char) => [char, char.toUpperCase()]),
        ["[", "{<br>["],
        ["]", "}<br>]"],
        ["\\", "|<br>\\"],
      ],
      [
        ["capslock", "capslock", 1.85],
        ..."asdfghjkl".split("").map((char) => [char, char.toUpperCase()]),
        [";", ":<br>;"],
        ["'", '"<br>\''],
        ["enter", "enter", 1.7],
      ],
      [
        ["shift", "shift", 2.2],
        ..."zxcvbnm".split("").map((char) => [char, char.toUpperCase()]),
        [",", "&lt;<br>,"],
        [".", "&gt;<br>."],
        ["/", "?<br>/"],
        ["shift-r", "shift", 2.2],
      ],
      [
        ["ctrl", "ctrl", 1.2],
        ["win", "win", 1.1],
        ["alt", "alt", 1.2],
        ["space", "", 6.2],
        ["alt-r", "alt", 1.2],
        ["win-r", "win", 1.1],
        ["ctrl-r", "ctrl", 1.2],
      ],
    ];
    return `
      <div class="keyboard-panel full">
      <div class="keyboard keyboard-full" aria-label="键盘提示">
        ${rows
          .map(
            (row) =>
              `<div class="key-row">${row
                .map(([char, label, span = 1]) => `<span class="key ${char === key ? "active" : ""}" data-action="keyboard-key" data-keyboard-key="${html(char)}" style="--span:${span}">${label}</span>`)
                .join("")}</div>`
          )
          .join("")}
      </div>
      ${state.settings.showHands ? renderFingerGuide(key, "full") : ""}
      </div>
    `;
  }

  function renderFingerGuide(key, mode = "full") {
    const finger = fingerForKey(key);
    const hand = finger?.startsWith("left") ? "left" : finger?.startsWith("right") ? "right" : "";
    const label = finger ? fingerLabel(finger) : "按原文输入";
    return `
      <div class="finger-hint ${mode}">${html(label)}</div>
      <div class="finger-guide ${hand} ${html(finger || "")}">
        <span class="finger left-index"></span>
        <span class="finger left-middle"></span>
        <span class="finger left-ring"></span>
        <span class="finger left-pinky"></span>
        <span class="finger left-thumb"></span>
        <span class="finger right-index"></span>
        <span class="finger right-middle"></span>
        <span class="finger right-ring"></span>
        <span class="finger right-pinky"></span>
        <span class="finger right-thumb"></span>
      </div>
    `;
  }

  function fingerForKey(key) {
    const groups = {
      leftPinky: "`1qaz".split(""),
      leftRing: "2wsx".split(""),
      leftMiddle: "3edc".split(""),
      leftIndex: "45rtfgvb".split(""),
      leftThumb: [" "],
      rightIndex: "67yuhjnm".split(""),
      rightMiddle: "8ik,".split(""),
      rightRing: "9ol.".split(""),
      rightPinky: "0p;/'-=[]\\".split(""),
      rightThumb: [],
    };
    const normalized = key === "space" ? " " : String(key || "").toLowerCase();
    return Object.entries(groups).find(([, keys]) => keys.includes(normalized))?.[0] || "";
  }

  function fingerLabel(finger) {
    return (
      {
        leftPinky: "左手小指",
        leftRing: "左手无名指",
        leftMiddle: "左手中指",
        leftIndex: "左手食指",
        leftThumb: "左手拇指",
        rightIndex: "右手食指",
        rightMiddle: "右手中指",
        rightRing: "右手无名指",
        rightPinky: "右手小指",
        rightThumb: "右手拇指",
      }[finger] || "按原文输入"
    );
  }

  function renderSettingsMini() {
    const toggles = [
      ["showKeyboard", "键盘"],
      ["showHands", "指法"],
      ["keyAudio", "按键音"],
      ["completeAudio", "完成音"],
      ["speechAudio", "朗读"],
      ["autoSpeech", "自动读"],
    ];
    const levelButtons = Object.entries(GAME_LEVELS).map(([key, lv]) =>
      `<button class="level-chip ${(state.settings.gameLevel || "normal") === key ? "active" : ""}" data-action="set-game-level" data-level="${key}" type="button">${html(lv.label)}</button>`
    ).join("");
    return `
      <div class="settings-mini" aria-label="练习设置">
        <div class="settings-mini-title">练习设置</div>
        <div class="settings-mini-row">
          <span>游戏难度</span>
          <div class="tag-row level-selector" role="group" aria-label="游戏难度">${levelButtons}</div>
        </div>
        ${toggles
          .map(([key, label]) => {
            const checked = Boolean(state.settings[key]);
            return `
              <label class="${checked ? "is-on" : "is-off"}">
                <span>${html(label)}</span>
                <input type="checkbox" data-setting="${key}" ${checked ? "checked" : ""}>
                <i>${checked ? "开" : "关"}</i>
              </label>
            `;
          })
          .join("")}
      </div>
    `;
  }

  function renderSpeedTest() {
    const speedTests = state.catalog.speedTests || [];
    if (!speedTests.length) return renderEmptyData();
    return `
      <section class="hero-band">
        <div class="hero-copy">
          <span class="eyebrow">乐启享 · 打字测试</span>
          <h1>打字速度测试</h1>
          <p>免费在线打字速度测试，60 秒挑战最高击键速度，实时显示 WPM 与准确率。</p>
          <div class="tag-row">
            <a class="pill-button" href="${link("/speed-test")}">开始打字测试</a>
            <a class="ghost-button" href="${link("/courses")}">系统课程</a>
          </div>
        </div>
        <div class="hero-stats hero-stats--3">
          <div class="stat-tile"><span>测试文章</span><strong>${speedTests.length}+</strong></div>
          <div class="stat-tile"><span>难度档位</span><strong>3 档</strong></div>
          <div class="stat-tile"><span>实时测速</span><strong>WPM</strong></div>
        </div>
      </section>

${renderSpeedTestPersonalCard()}

${renderSpeedTestLeaderboardPanel()}

      <section class="section-title">
        <div><h2>打字测试核心特性</h2><p>5 大维度让测速更精准、更可视。</p></div>
      </section>
      <div class="grid category-grid feature-grid">
        <div class="card feature-card">
          <h3>① 开始打字测试</h3>
          <p class="muted">点击任意一篇文章立即开始 60 秒计时测速，零加载等待。</p>
        </div>
        <div class="card feature-card">
          <h3>② 实时打字测速</h3>
          <p class="muted">每秒钟更新 WPM（每分钟字数）和 CPM（每分钟击键数），精确到小数。</p>
        </div>
        <div class="card feature-card">
          <h3>③ 准确率追踪</h3>
          <p class="muted">实时高亮错误字符，统计击键正确率与错误字符分布。</p>
        </div>
        <div class="card feature-card">
          <h3>④ 进步记录可见</h3>
          <p class="muted">所有测试结果都自动保存为历史最佳，可随时调出对比。</p>
        </div>
        <div class="card feature-card">
          <h3>⑤ 科学课程衔接</h3>
          <p class="muted">测速后可一键进入对应难度的指法/拼音/英文课程继续提升。</p>
        </div>
      </div>

      ${speedTests
        .map(
          (group) => `
            ${(group.courses || [])
              .map(
                (course) => `
                  <section class="panel" style="margin:24px 0">
                    <h3>${html(course.title || "")}</h3>
                    <p class="muted">${html(course.package_name || "")}</p>
                    <div class="grid course-grid">
                      ${(course.lessons || []).map((lesson) => renderLessonCard(lesson, course, group.category_id || "1")).join("")}
                    </div>
                  </section>
                `
              )
              .join("")}
          `
        )
        .join("")}

      <section class="section-title">
        <div><h2>如何进行打字速度测试？</h2><p>3 步上手，60 秒出成绩。</p></div>
      </section>
      <ol class="steps">
        <li><strong>选文章</strong> — 在上方挑一篇难度合适的文章。</li>
        <li><strong>按开始</strong> — 文章第一个字符高亮，计时同步启动。</li>
        <li><strong>敲键盘</strong> — 60 秒倒计时结束，自动结算 WPM 与准确率。</li>
      </ol>

      <section class="section-title">
        <div><h2>打字测试常见问题</h2><p>乐启享打字测试问答</p></div>
      </section>
      <details class="faq-item" open><summary>测试文章的字数如何选择？</summary><p>建议先从 60-120 字短文起步，等 WPM 稳定到 30+ 后再换长文章，避免一开始就被长文本拖累准确率。</p></details>
      <details class="faq-item"><summary>WPM 与 CPM 有什么区别？</summary><p>WPM 是「每分钟完成的单词数」，5 个字符算 1 个单词；CPM 是「每分钟击键数」，含错误按键。中文输入请以 CPM 为准。</p></details>
      <details class="faq-item"><summary>打字测试成绩会保存吗？</summary><p>登录账号后，每次测试的速度和准确率均会自动保存，并在文章列表中直接显示历史最佳成绩，方便你随时对比进步。</p></details>
    `;
  }

  function renderGames() {
    const games = state.catalog.games || [];
    const tags = ["拼音", "英文", "竞速", "闯关"];
    const filteredGames = state.gameTagFilter
      ? games.filter((g) => Array.isArray(g.tags) && g.tags.includes(state.gameTagFilter))
      : games;
    return `
      <section class="game-page-hero">
        <div class="game-page-hero-deco" aria-hidden="true">
          <img class="game-page-hero-mascot" src="data/assets/lexq/game-mascot.png" alt="" loading="lazy">
        </div>
        <div class="game-page-hero-copy">
          <h1>边玩边把手指练热</h1>
          <p>从拼音、单字到英文闯关，把打字反应放进更轻松的游戏节奏里。选一个场景开始，练习会变得没那么像任务。</p>
          <div class="game-page-tag-row" aria-label="游戏类型">
          <button type="button" class="game-page-tag-pill${state.gameTagFilter === "" ? " is-active" : ""}" data-action="game-tag-filter" data-tag="">全部</button>
          ${tags.map((t) => `<button type="button" class="game-page-tag-pill${state.gameTagFilter === t ? " is-active" : ""}" data-action="game-tag-filter" data-tag="${html(t)}">${html(t)}</button>`).join("")}
        </div>
        </div>
      </section>
      <section class="game-page-list">
        <div class="game-page-list-head">
          <div>
            <h2>选择一个游戏开始练习</h2>
            <p>游戏会在独立练习页打开，完成后可以回到这里继续挑战。</p>
          </div>
          <span class="game-page-count-pill">${filteredGames.length} 个入口${state.gameTagFilter ? " · " + html(state.gameTagFilter) : ""}</span>
        </div>
        <div class="game-grid">
          ${filteredGames.length ? filteredGames.map(renderGameCard).join("") : `<div class="empty">该标签下暂无游戏。</div>`}
        </div>
      </section>
    `;
  }

  function getGameCardColor(game) {
    if (game.color) return game.color;
    const badge = (game.badge || (game.tags && game.tags[0]) || "").trim();
    const colorMap = {
      "塔防": "lime",
      "空战": "sky",
      "竞速": "amber",
      "闯关": "lime",
      "反应": "rose",
      "防守": "sky",
      "专注": "amber",
      "跳跃": "lime",
      "收集": "rose"
    };
    return colorMap[badge] || "amber";
  }

  function renderGameCard(game) {
    const color = getGameCardColor(game);
    const badge = game.badge || (game.tags && game.tags[0]) || "";
    const tagsHtml = (game.tags || [])
      .map((tag) => `<span class="game-card-tag">${html(tag)}</span>`)
      .join("");
    const imgSrc = game.image ? toAssetUrl(game.image) : "";
    const href = game.page_url || link(`/games/${game.id}`);
    return `
      <a class="game-card game-card-${color}" role="button" href="${href}" aria-label="进入${html(game.title)}游戏">
        <div class="game-card-cover">
          ${imgSrc ? `<img src="${html(imgSrc)}" alt="${html(game.title)}游戏封面" loading="lazy">` : ""}
          <span class="game-card-badge">${html(badge)}</span>
          <span class="game-card-play" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M8 5v14l11-7z"/></svg>
          </span>
        </div>
        <div class="game-card-body">
          <div class="game-card-title-row">
            <h3>${html(game.title)}</h3>
            <span class="game-card-arrow" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><path d="M7 17L17 7"/><path d="M8 7h9v9"/></svg>
            </span>
          </div>
          <div class="game-card-tags">${tagsHtml}</div>
          ${renderGameCardStats(game)}
        </div>
      </a>
    `;
  }

  function renderGameCardStats(game) {
    const stats = gameStatsFor(game);
    if (!stats || stats.plays <= 0) return `<div class="game-card-stats"><span class="game-card-stat-empty">尚未挑战</span></div>`;
    const accuracy = Number(stats.bestAccuracy || 0).toFixed(0);
    return `<div class="game-card-stats">
      <span class="game-card-stat"><strong>${stats.bestScore}</strong>最高分</span>
      <span class="game-card-stat"><strong>${accuracy}%</strong>最佳准确率</span>
      <span class="game-card-stat"><strong>${stats.plays}</strong>已玩</span>
    </div>`;
  }

  function renderGameRoute(gameId) {
    const game = (state.catalog.games || []).find((item) => item.id === gameId);
    if (!game) return renderNotFound();
    if (game.originalUrl) return renderIframeGame(game);
    if (!state.game || state.game.id !== gameId) initGame(game);
    return renderGame(game);
  }

  function renderIframeGame(game) {
    const src = resolveGameIframeSrc(game.originalUrl);
    const safeSrc = html(src);
    const safeTitle = html(game.title);
    const backHref = link("/games");
    return [
      renderGamePersonalCard(game),
      renderGameLeaderboardPanel(),
      "",
      "      <section class=\"section-title\">",
      "        <div>",
      "          <h2>" + safeTitle + "<span class=\"tiny game-mode-suffix\">线上原版 · 游戏窗</span></h2>",
      "          <p>游戏在下方独立窗口中运行；本窗口的个人记录与全网排行榜仍同步显示。</p>",
      "        </div>",
      "        <div class=\"tag-row\">",
      "          <a class=\"ghost-button\" href=\"" + backHref + "\">返回游戏列表</a>",
      "          <a class=\"ghost-button\" href=\"" + safeSrc + "\" target=\"_blank\" rel=\"noopener\">新窗口打开</a>",
      "        </div>",
      "      </section>",
      "      <section class=\"panel game-iframe-panel\">",
      "        <div class=\"game-iframe-frame\">",
      "          <iframe class=\"game-iframe\" src=\"" + safeSrc + "\" title=\"" + safeTitle + "\" allow=\"autoplay; fullscreen\" loading=\"lazy\" referrerpolicy=\"no-referrer\"></iframe>",
      "        </div>",
      "        <p class=\"tiny\">提示：部分游戏首次加载需要数秒；快捷键与帮助请参考游戏窗口内的说明。</p>",
      "      </section>",
    ].join("\r\n");
  }

  function resolveGameIframeSrc(originalUrl) {
    const cleaned = String(originalUrl || "").replace(/^\/+/, "");
    if (!cleaned) return "";
    return encodeURI(cleaned);
  }

  function renderGamePersonalCard(game) {
    const stats = gameStatsFor(game);
    const plays = stats ? stats.plays : 0;
    const best = stats ? stats.bestScore : 0;
    const acc = stats ? Number(stats.bestAccuracy || 0).toFixed(1) : 0;
    const rank = state.gameLeaderboard.find((item) => String(item.user_id || "") === String(state.session?.user?.id || "") && Number(item.speed || 0) === best);
    return [
      '      <section class="panel game-personal">',
      '        <div class="game-personal-head">',
      '          <h3>' + (state.apiOnline ? "数据已同步" : "本地记录") + '</h3>',
      '          <span class="tag">' + html(game.title) + '</span>',
      '        </div>',
      '        <div class="metric-grid">',
      '          ' + metric("个人最佳", best, "分"),
      '          ' + metric("游玩次数", plays, "次"),
      '          ' + metric("最佳准确率", acc, "%"),
      '          ' + metric("全网排名", rank ? "#" + (state.gameLeaderboard.indexOf(rank) + 1) : "—", ""),
      '        </div>',
      '        <p class="tiny">' + (plays > 0 ? "再来一局刷新个人最佳。" : "完成一局后自动生成个人记录。") + '</p>',
      '      </section>',
    ].join("\r\n");
  }

  function renderGameLeaderboardPanel() {
    const rows = (state.gameLeaderboard || []).slice(0, 8);
    const empty = '<div class="empty">暂无全球游戏记录，欢迎先来一局。</div>';
    const meId = state.session && state.session.user && state.session.user.id;
    const body = rows.length
      ? '<ol class="rank-list-mini">' + rows.map((item, idx) => {
          const isMe = meId && item.user_id && String(item.user_id) === String(meId);
          const name = html(String(item.username || "学习者"));
          const score = Number(item.speed || 0).toFixed(0);
          const acc = Number(item.accuracy || 0).toFixed(0);
          return [
            '            <li class="rank-row' + (isMe ? " rank-row-me" : "") + '">',
            '              <span class="rank-no">#' + (idx + 1) + '</span>',
            '              <span class="rank-name">' + name + '</span>',
            '              <span class="rank-speed">' + score + ' 分</span>',
            '              <span class="rank-acc">' + acc + '%</span>',
            '            </li>',
          ].join("\r\n");
        }).join("") + '</ol>'
      : empty;
    return [
      '      <section class="panel game-leaderboard">',
      '        <div class="game-leaderboard-head">',
      '          <h3>全球游戏榜</h3>',
      '          <span class="tag">前 ' + Math.min(8, rows.length) + ' 名</span>',
      '        </div>',
      '        ' + body,
      '        <p class="tiny">基于全网玩家的最佳得分排序，登录后自动上榜。</p>',
      '      </section>',
    ].join("\r\n");
  }

  function initGame(game) {
    stopGameTimer();
    const preset = GAME_PRESETS[game.mode] || { duration: 60, health: 5, minTargets: 4, maxTargets: 6, stage: "study" };
    const levelKey = (state.settings.gameLevel && GAME_LEVELS[state.settings.gameLevel]) ? state.settings.gameLevel : "normal";
    const level = GAME_LEVELS[levelKey];
    state.gameLevel = levelKey;
    let initialText = "";
    if (game.mode === "immersive") {
      const pool = (GAME_WORDS.immersive && GAME_WORDS.immersive.length) ? GAME_WORDS.immersive : [GAME_WORDS.immersive];
      initialText = pool[Math.floor(Math.random() * pool.length)];
    } else if (game.mode === "racing" || game.mode === "falling" || game.mode === "jump" || game.mode === "fishing") {
      const pool = (GAME_WORDS.paragraphs && GAME_WORDS.paragraphs.length) ? GAME_WORDS.paragraphs : [GAME_WORDS.immersive];
      initialText = pool[Math.floor(Math.random() * pool.length)];
    } else {
      initialText = GAME_WORDS.raceText;
    }
    state.game = {
      id: game.id,
      mode: game.mode,
      title: game.title,
      running: false,
      finished: false,
      score: 0,
      combo: 0,
      maxCombo: 0,
      hits: 0,
      misses: 0,
      health: Math.max(1, Math.round((preset.health || 5) * (level.health / 5))),
      maxHealth: Math.max(1, Math.round((preset.health || 5) * (level.health / 5))),
      timeLeft: preset.duration || 60,
      input: "",
      inputEpoch: 0,
      targets: [],
      progress: 0,
      text: initialText,
      startedAt: null,
      stage: preset.stage || "study",
      feedback: preset.feedback || "",
      preset,
      level,
      levelKey,
      popups: [],
    };
  }

  function renderGameLevelSelector(g) {
    const current = (g && g.levelKey) || state.settings.gameLevel || "normal";
    const options = Object.entries(GAME_LEVELS).map(([key, lv]) =>
      `<button class="level-chip ${key === current ? "active" : ""}" data-action="set-game-level" data-level="${key}" type="button">${html(lv.label)}</button>`
    ).join("");
    return `<div class="level-selector tag-row" role="group" aria-label="选择难度">${options}</div>`;
  }

  function renderGame(game) {
    const g = state.game;
    const raceMode = isRaceMode(g.mode);
    const feedback = g.feedback || "";
    return `${renderGamePersonalCard(game)}
${renderGameLeaderboardPanel()}

      <section class="section-title">
        <div>
          <h2>${html(game.title)}<span class="tiny game-mode-suffix">${html((GAME_PRESETS[game.mode] && GAME_PRESETS[game.mode].label && GAME_PRESETS[game.mode].label !== game.title ? GAME_PRESETS[game.mode].label + " · " : "") + (GAME_LEVELS[g.levelKey] && GAME_LEVELS[g.levelKey].label || ""))}</span></h2>
          <p>${(game.tags || []).map(html).join(" / ")} · ${html(feedback)}</p>
        </div>
        <div class="tag-row">
          <a class="ghost-button" href="${link("/games")}">返回游戏</a>
          ${renderGameLevelSelector(g)}
          <button class="solid-button" data-action="start-game">${g.running ? "重新开始" : "开始"}</button>
        <!-- space-to-start hook (tested via data-game-start-overlay) -->
        </div>
      </section>
      <section class="panel game-panel">
        <div class="game-hud">
          <div class="tag-row" data-game-hud>${renderGameHud(g)}</div>
          ${g.finished ? "" : renderGameInputArea(g, raceMode)}
        </div>
        ${renderGameStage(game, g)}
        ${g.finished ? renderGameFinishCard(g) : ""}
        ${renderGameStartOverlay(g)}
      </section>
    `;
  }

  function renderGameStartOverlay(g) {
    if (g.finished || g.running) return "";
    if (g.countdownLeft && g.countdownLeft > 0) {
      return `<div class="game-start-overlay" data-game-start-overlay><div class="game-countdown-bubble"><div class="countdown-num">${g.countdownLeft}</div><p class="tiny">准备开始</p></div></div>`;
    }
    return `<div class="game-start-overlay" data-game-start-overlay><div class="game-start-bubble"><kbd class="kbd-key">Space</kbd><div class="game-start-hint">按空格键开始</div><div class="tiny game-start-sub">再次点击 <strong>开始</strong> 按钮可直接重玩</div></div></div>`;
  }
  function renderGameInputArea(g, raceMode) {
    if (raceMode) {
      return `<textarea class="field game-input race-input" data-bind="game-input" data-input-epoch="${g.inputEpoch || 0}" lang="zh-CN" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="照着下方文字输入，系统会即时标红错字" ${!g.running || g.finished ? "disabled" : ""}>${html(g.input)}</textarea>`;
    }
    return `<input class="field game-input" data-bind="game-input" data-input-epoch="${g.inputEpoch || 0}" value="${html(g.input)}" lang="zh-CN" inputmode="text" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="输入目标后自动命中，中文可直接输入" ${!g.running || g.finished ? "disabled" : ""}>`;
  }

  function renderGameFinishCard(g) {
    const minutes = Math.max(1, Math.round((g.preset && g.preset.duration) || 60));
    const summary = [
      ["得分", g.score],
      ["命中", g.hits || 0],
      ["失误", g.misses || 0],
      ["最高连击", g.maxCombo || 0],
      ["生命", g.health + "/" + (g.maxHealth || g.health)],
    ];
    const summaryHtml = summary.map(([label, value]) => `<div class="metric"><span>${html(label)}</span><strong>${html(value)}</strong></div>`).join("");
    return `<div class="finish-card finish-game-card">
      <h3>${g.health <= 0 ? "挑战失败，再接再厉" : "本局结束"}</h3>
      <div class="metric-grid">${summaryHtml}</div>
      <p class="tiny">已自动保存到历史战绩，可在排行榜查看排名。</p>
      <div class="tag-row">
        <button class="solid-button" data-action="start-game">再来一局</button>
        <a class="ghost-button" href="${link("/rank")}">查看排行榜</a>
      </div>
    </div>`;
  }

  function renderGameHud(g) {
    const race = isRaceMode(g.mode) ? raceStats(g) : null;
    const comboTag = (g.combo || 0) >= 3 ? `<span class="tag combo-tag combo-${Math.min(5, Math.floor((g.combo || 0) / 3))}">连击 ${g.combo}</span>` : "";
    const hits = g.hits || 0;
    const misses = g.misses || 0;
    const accuracy = hits + misses ? Math.round((hits / (hits + misses)) * 100) : 100;
    const healthMax = g.maxHealth || 5;
    const healthHearts = Array.from({ length: healthMax }, (_, i) => `<span class="heart ${i < g.health ? "" : "empty"}">❤</span>`).join("");
    return `
      <span class="tag">分数 <strong>${g.score}</strong></span>
      <span class="tag">时间 <strong>${g.timeLeft}s</strong></span>
      <span class="tag health-tag">生命 ${healthHearts}</span>
      <span class="tag">命中 ${hits}</span>
      <span class="tag">准确率 ${accuracy}%</span>
      ${comboTag}
      ${race ? `<span class="tag">正确 ${race.correctPrefix}/${g.text.length}</span><span class="tag">速度 ${race.speed}字/分</span>` : ""}
    `;
  }

  function isRaceMode(mode) {
    return mode === "racing" || mode === "immersive";
  }

  function raceStats(g) {
    const text = String(g?.text || "");
    const input = String(g?.input || "");
    let correct = 0;
    let correctPrefix = 0;
    let prefixBroken = false;
    for (let index = 0; index < input.length && index < text.length; index += 1) {
      if (input[index] === text[index]) {
        correct += 1;
        if (!prefixBroken) correctPrefix += 1;
      } else {
        prefixBroken = true;
      }
    }
    const total = Math.max(1, text.length);
    return {
      correct,
      correctPrefix,
      typed: input.length,
      mistakes: Math.max(0, Math.min(input.length, text.length) - correct),
      progress: Math.round((correctPrefix / total) * 100),
      accuracy: input.length ? Math.round((correct / Math.min(input.length, total)) * 100) : 100,
    };
  }

  function renderRaceFeedback(g, stats = raceStats(g)) {
    const next = g.text[stats.correctPrefix] || "完成";
    const status = stats.mistakes ? `发现 ${stats.mistakes} 个错字，请从第 ${stats.correctPrefix + 1} 位修正` : `下一字：${next}`;
    return `
      <span>${html(status)}</span>
      <strong>${stats.progress}%</strong>
    `;
  }

  function gameStageClass(g) {
    const mode = (g && g.mode) || "study";
    return "stage-" + mode;
  }

  function renderGameStage(game, g) {
    if (isRaceMode(game.mode)) {
      const stats = raceStats(g);
      return `
        <div class="race-track ${gameStageClass(g)}">
          <div class="track" data-game-track><span class="car" style="--value:${stats.progress}%">车</span></div>
          <div class="race-feedback" data-game-feedback>${renderRaceFeedback(g, stats)}</div>
          <div class="typing-target" data-game-target>${renderTargetText(g.text, g.input)}</div>
        </div>
      `;
    }
    if (game.mode === "mole") {
      const holes = Array.from({ length: 12 }, (_, index) => g.targets.find((target) => target.slot === index));
      return `
        <div class="game-stage stage-ground" data-game-stage>
          <div class="stage-skyline"></div>
          <div class="mole-grid">
            ${holes
              .map((target) => `<div class="mole-hole ${target ? "active" : ""}">${target ? html(target.label) : ""}</div>`)
              .join("")}
          </div>
          ${renderGamePopups(g)}
        </div>
      `;
    }
    if (game.mode === "jump") {
      const solved = g.targets.filter((t) => t.solved).length;
      const lane = g.targets.find((t) => !t.solved);
      return `
        <div class="game-stage stage-river" data-game-stage>
          <div class="duck-river">
            <div class="duck-emoji" style="left:${lane ? Math.max(8, Math.min(88, lane.x)) : 50}%">${lane ? "🦆" : "🦆"}</div>
          </div>
          <div class="stones-row">
            ${g.targets.map((t) => `<div class="stone ${t.solved ? "solved" : ""} ${t === lane ? "active" : ""}" style="left:${t.x}%"><span class="stone-label">${html(t.label)}</span></div>`).join("")}
          </div>
          ${renderGamePopups(g)}
          <div class="tiny river-progress">已跨过 ${solved} / ${g.targets.length} 块石墩</div>
        </div>
      `;
    }
    if (game.mode === "fishing") {
      return `
        <div class="game-stage stage-sea" data-game-stage>
          <div class="fishing-line"></div>
          <div class="fish-school">
            ${g.targets.map((t) => `<div class="fish ${t.y > 70 ? "danger" : ""}" style="--x:${t.x}%; --y:${t.y}%"><span class="fish-bubble">${html(t.label)}</span><span class="fish-body">🐟</span></div>`).join("")}
          </div>
          ${renderGamePopups(g)}
        </div>
      `;
    }
    if (game.mode === "racing") {
      return `
        <div class="game-stage stage-track" data-game-stage>
          <div class="race-road">
            ${Array.from({length:3}, (_, i) => `<div class="lane" data-lane="${i}"></div>`).join("")}
          </div>
          ${g.targets.map((t) => `<span class="target-chip racing-chip ${t.y > 70 ? "danger" : ""}" style="--x:${t.x}%; --y:${t.y}%"><span class="racing-flag">🏎️</span>${html(t.label)}</span>`).join("")}
          ${renderGamePopups(g)}
        </div>
      `;
    }
    if (game.mode === "fighter") {
      return `
        <div class="game-stage stage-sky" data-game-stage>
          <div class="cloud-strip">
            <span class="cloud cloud-1">☁️</span>
            <span class="cloud cloud-2">☁️</span>
            <span class="cloud cloud-3">☁️</span>
          </div>
          <div class="fighter-jet">✈️</div>
          ${g.targets.map((t) => `<div class="enemy-chip" style="--x:${t.x}%; --y:${t.y}%"><span class="enemy-pinyin">${html(t.answer)}</span><span class="enemy-hanzi">${html(t.label)}</span></div>`).join("")}
          ${renderGamePopups(g)}
        </div>
      `;
    }
    if (game.mode === "defense") {
      return `
        <div class="game-stage stage-space" data-game-stage>
          <div class="starfield">
            <span class="star star-1">✦</span>
            <span class="star star-2">✧</span>
            <span class="star star-3">✦</span>
            <span class="star star-4">✧</span>
          </div>
          <div class="earth-shield">🌍</div>
          ${g.targets.map((t) => `<div class="meteor-chip" style="--x:${t.x}%; --y:${t.y}%"><span class="meteor-tail">🔥</span><span class="meteor-letter">${html(t.label)}</span></div>`).join("")}
          ${renderGamePopups(g)}
        </div>
      `;
    }
    if (game.mode === "potato") {
      const lanes = 3;
      return `
        <div class="game-stage stage-garden" data-game-stage>
          <div class="garden-sky"></div>
          <div class="garden-grass"></div>
          <div class="garden-fence"></div>
          <div class="potato-gun" data-potato-gun>🍅💥</div>
          ${g.targets.map((t) => {
            const lane = Math.min(lanes - 1, Math.max(0, Math.floor((t.y - 20) / 20)));
            const laneY = 28 + lane * 20;
            const danger = t.x < 18 ? "danger" : "";
            return `<div class="zombie-chip ${danger}" style="--x:${t.x}%; --y:${laneY}%"><span class="zombie-body">🧟</span><span class="zombie-label">${html(t.label)}</span><span class="zombie-pinyin">${html(t.answer)}</span></div>`;
          }).join("")}
          ${renderGamePopups(g)}
        </div>
      `;
    }
    return `
      <div class="game-stage stage-lab" data-game-stage>
        ${g.targets.map((t) => `<div class="virus-chip" style="--x:${t.x}%; --y:${t.y}%"><span class="virus-body">🧫</span><span class="virus-label">${html(t.label)}</span></div>`).join("")}
        ${renderGamePopups(g)}
      </div>
    `;
  }

  function renderGamePopups(g) {
    if (!g.popups || !g.popups.length) return "";
    return g.popups.map((p) => `<span class="game-popup game-popup-${p.kind || "hit"}" style="--x:${p.x}%; --y:${p.y}%; --life:${p.life}">${html(p.text)}</span>`).join("");
  }

  function beginGameWithCountdown() {
    const g = state.game;
    if (!g || g.running || g.finished || g.countdownLeft) return;
    g.countdownLeft = 3;
    g.countdownTimer = setInterval(() => {
      const cur = state.game;
      if (!cur) { clearInterval(g.countdownTimer); return; }
      cur.countdownLeft -= 1;
      if (cur.countdownLeft <= 0) {
        clearInterval(cur.countdownTimer);
        cur.countdownTimer = null;
        cur.countdownLeft = 0;
        startGame();
        return;
      }
      render();
    }, 800);
    render();
  }
  function startGame() {
    const game = (state.catalog.games || []).find((item) => item.id === state.game?.id);
    if (!game) return;
    initGame(game);
    state.game.running = true;
    state.game.startedAt = nowSeconds();
    if (isRaceMode(game.mode)) {
      state.gameTimer = setInterval(() => {
        tickRaceGame();
      }, 1000);
      render();
      focusBind("game-input");
      return;
    }
    seedTargets(game.mode);
    state.gameTimer = setInterval(() => {
      tickGame(game.mode);
      renderWhenInputSafe();
    }, 850);
    render();
    focusBind("game-input");
  }

  function tickRaceGame() {
    const g = state.game;
    if (!g || !g.running || g.finished || !isRaceMode(g.mode)) return;
    g.timeLeft -= 1;
    if (g.timeLeft <= 0) finishGame();
    else updateGameDom();
  }

  function seedTargets(mode) {
    const count = mode === "mole" ? 4 : 5;
    for (let index = 0; index < count; index += 1) spawnTarget(mode);
  }

  function gameLevel() {
    if (!state.game) return GAME_LEVELS.normal;
    return GAME_LEVELS[state.game.levelKey] || GAME_LEVELS.normal;
  }

  function gameWordPool(setName) {
    const level = gameLevel();
    const key = (level && level.wordSets && level.wordSets[setName]) || setName;
    return GAME_WORDS[key] || GAME_WORDS[setName] || GAME_WORDS.english;
  }

  function spawnTarget(mode) {
    const g = state.game;
    if (!g) return;
    const level = gameLevel();
    const speedBase = (level && level.speedScale) || 1;
    const densityBase = (level && level.densityScale) || 1;
    if (mode === "mole") {
      const used = new Set(g.targets.map((target) => target.slot));
      const slots = Array.from({ length: 12 }, (_, index) => index).filter((slot) => !used.has(slot));
      if (!slots.length) return;
      const label = randomItem(gameWordPool("chars"));
      const ttl = Math.max(3, Math.round(5 / speedBase));
      g.targets.push({ id: crypto.randomUUID(), label, answer: label, slot: randomItem(slots), ttl, score: 8 + Math.round(4 * speedBase) });
      return;
    }
    if (mode === "fighter") {
      const setName = levelKey() === "easy" ? "pinyinShort" : "pinyin";
      const pool = GAME_WORDS[setName] || GAME_WORDS.pinyin;
      const [label, answer] = randomItem(pool);
      g.targets.push({ id: crypto.randomUUID(), label, answer, x: rand(4, 88), y: rand(2, 12), speed: Math.max(5, Math.round(9 * speedBase)), score: 10 + Math.round(6 * speedBase) });
      return;
    }
    if (mode === "defense") {
      const label = randomItem(gameWordPool("chars"));
      g.targets.push({ id: crypto.randomUUID(), label, answer: label, x: rand(4, 88), y: rand(2, 12), speed: Math.max(6, Math.round(10 * speedBase)), score: 9 + Math.round(5 * speedBase) });
      return;
    }
    if (mode === "jump") {
      const usedXs = g.targets.map((t) => Math.round(t.x));
      let x = rand(8, 88);
      for (let i = 0; i < 4; i += 1) {
        if (!usedXs.some((ux) => Math.abs(ux - x) < 12)) break;
        x = rand(8, 88);
      }
      const label = randomItem(gameWordPool("english"));
      g.targets.push({ id: crypto.randomUUID(), label, answer: label, x, y: rand(2, 10), speed: 0, score: 12 + Math.round(6 * speedBase) });
      return;
    }
    if (mode === "fishing") {
      const label = randomItem(gameWordPool("english"));
      g.targets.push({ id: crypto.randomUUID(), label, answer: label, x: rand(8, 88), y: rand(2, 14), speed: Math.max(2, Math.round(5 * speedBase)), score: 12 + Math.round(6 * speedBase) });
      return;
    }
    if (mode === "racing") {
      const label = randomItem(gameWordPool("english"));
      g.targets.push({ id: crypto.randomUUID(), label, answer: label, x: rand(4, 88), y: rand(2, 12), speed: Math.max(5, Math.round(10 * speedBase)), score: 11 + Math.round(5 * speedBase) });
      return;
    }
    if (mode === "falling") {
      const label = randomItem(gameWordPool("english"));
      g.targets.push({ id: crypto.randomUUID(), label, answer: label, x: rand(4, 88), y: rand(2, 12), speed: Math.max(6, Math.round(10 * speedBase)), score: 11 + Math.round(5 * speedBase) });
      return;
    }
    if (mode === "potato") {
      // 僵尸从右向左走：x 95-100，y 在中间高度
      const pool = gameWordPool("potatoZombies");
      const [label, answer] = pool[Math.floor(Math.random() * pool.length)];
      g.targets.push({
        id: crypto.randomUUID(),
        label,
        answer,
        x: rand(88, 98),
        y: rand(20, 75),
        speed: 0,
        hxSpeed: -Math.max(1.5, Math.round(3 * speedBase * 10) / 10),
        hp: 1,
        maxHp: 1,
        kind: "zombie",
        score: 14 + Math.round(6 * speedBase),
      });
      return;
    }
    const label = randomItem(gameWordPool("english"));
    g.targets.push({ id: crypto.randomUUID(), label, answer: label, x: rand(4, 88), y: rand(2, 12), speed: Math.max(6, Math.round(10 * speedBase)), score: 10 });
  }

  function levelKey() {
    if (!state.game) return "normal";
    return state.game.levelKey || "normal";
  }

  function tickGame(mode) {
    const g = state.game;
    if (!g || !g.running || g.finished) return;
    g.timeLeft -= 1;
    const preset = g.preset || GAME_PRESETS[mode] || {};
    const minCount = Math.max(1, Math.round((preset.minTargets || 4) * ((g.level && g.level.densityScale) || 1)));
    const maxCount = Math.max(minCount + 1, Math.round((preset.maxTargets || 6) * ((g.level && g.level.densityScale) || 1)));
    if (mode === "mole") {
      g.targets.forEach((target) => (target.ttl -= 1));
      const misses = g.targets.filter((target) => target.ttl <= 0).length;
      g.targets = g.targets.filter((target) => target.ttl > 0);
      if (misses) { g.health -= misses; g.misses += misses; g.combo = 0; flashGameStage("miss"); }
      while (g.targets.length < minCount) spawnTarget(mode);
    } else if (mode === "jump") {
      g.targets.forEach((target) => {
        if (target.solved) {
          target.y += Math.max(4, target.speed || 4);
        }
      });
      const remaining = g.targets.filter((target) => !target.solved);
      const solvedEscaped = g.targets.filter((target) => target.solved && target.y > 95).length;
      g.targets = g.targets.filter((target) => !target.solved || target.y <= 95);
      if (solvedEscaped) { g.health -= solvedEscaped; g.misses += solvedEscaped; g.combo = 0; flashGameStage("miss"); }
      while (g.targets.length < minCount) spawnTarget(mode);
      while (g.targets.filter((target) => !target.solved).length < Math.max(2, minCount - 1)) spawnTarget(mode);
    } else if (mode === "fishing") {
      g.targets.forEach((target) => { target.y += target.speed; target.angle = Math.sin((target.y / 5) + (target.x / 30)); });
      const misses = g.targets.filter((target) => target.y > 95).length;
      g.targets = g.targets.filter((target) => target.y <= 95);
      if (misses) { g.health -= misses; g.misses += misses; g.combo = 0; flashGameStage("miss"); }
      while (g.targets.length < minCount) spawnTarget(mode);
    } else if (mode === "potato") {
      g.targets.forEach((target) => {
        target.x += (target.hxSpeed || -1);
      });
      const escaped = g.targets.filter((target) => target.x < 6).length;
      g.targets = g.targets.filter((target) => target.x >= 6);
      if (escaped) { g.health -= escaped; g.misses += escaped; g.combo = 0; flashGameStage("miss"); }
      while (g.targets.length < minCount) spawnTarget(mode);
    } else {
      g.targets.forEach((target) => { target.y += target.speed; });
      const misses = g.targets.filter((target) => target.y > 92).length;
      g.targets = g.targets.filter((target) => target.y <= 92);
      if (misses) { g.health -= misses; g.misses += misses; g.combo = 0; flashGameStage("miss"); }
      while (g.targets.length < maxCount) spawnTarget(mode);
    }
    if (g.popups && g.popups.length) {
      g.popups = g.popups.filter((p) => p.life > 0);
      g.popups.forEach((p) => { p.life -= 1; p.y -= 0.6; });
    }
    if (g.timeLeft <= 0 || g.health <= 0) finishGame();
  }

  function flashGameStage(kind) {
    const stage = app.querySelector("[data-game-stage]");
    if (!stage) return;
    stage.classList.remove("flash-hit", "flash-miss");
    void stage.offsetWidth;
    stage.classList.add(kind === "miss" ? "flash-miss" : "flash-hit");
  }

  function updateGameInput(value, options = {}) {
    const g = state.game;
    if (!g || !g.running || g.finished) return;
    if (state.composing || options.composing) return;
    const sourceEpoch = Number(options.sourceEpoch);
    if (Number.isFinite(sourceEpoch) && sourceEpoch !== (g.inputEpoch || 0)) return;
    const previous = g.input;
    g.input = value;
    if (previous === value) return;
    if (isRaceMode(g.mode)) {
      g.input = String(value || "").slice(0, g.text.length + 20);
      const stats = raceStats(g);
      g.progress = stats.progress;
      g.score = stats.correctPrefix;
      if (state.settings.keyAudio && value.length > previous.length) keyClick(value[value.length - 1], g.text[value.length - 1]);
      if (stats.correctPrefix >= g.text.length) finishGame();
      else updateGameDom();
      return;
    }
    const raw = value;
    const normalized = String(value || "").trim().toLowerCase();
    const hit = g.targets.find((target) => targetMatches(target, raw, normalized));
    if (hit) {
      const reward = (hit.score || 10) + Math.max(0, g.timeLeft) + (g.combo || 0) * 2;
      if (g.mode === "jump") {
        hit.solved = true;
        hit.y = 0;
      }
      g.targets = g.targets.filter((target) => target.id !== hit.id);
      g.score += reward;
      g.combo = (g.combo || 0) + 1;
      g.maxCombo = Math.max(g.maxCombo || 0, g.combo);
      g.hits = (g.hits || 0) + 1;
      pushGamePopup(g, hit, reward, g.combo);
      clearGameInputDom();
      if (state.settings.keyAudio) playHitSound();
      flashGameStage("hit");
    } else if (String(raw).length > 0) {
      g.combo = 0;
    }
    render();
  }

  function pushGamePopup(g, hit, reward, combo) {
    if (!g.popups) g.popups = [];
    g.popups.push({ id: hit.id, x: hit.x, y: hit.y || 50, text: "+" + reward, kind: "hit", life: 12 });
    if (combo >= 3) g.popups.push({ id: hit.id + "-c", x: hit.x, y: (hit.y || 50) - 4, text: combo + " COMBO", kind: "combo", life: 12 });
  }

  function clearGameInputDom() {
    const g = state.game;
    if (g) {
      g.input = "";
      g.inputEpoch = (g.inputEpoch || 0) + 1;
    }
    const input = app.querySelector('[data-bind="game-input"]');
    if (input && "value" in input) input.value = "";
    state.composing = false;
    state.composingBind = "";
  }

  function updateGameDom() {
    const g = state.game;
    if (!g || state.route.parts[0] !== "games") return;
    const hud = app.querySelector("[data-game-hud]");
    if (hud) hud.innerHTML = renderGameHud(g);
    if (isRaceMode(g.mode)) {
      const stats = raceStats(g);
      const track = app.querySelector("[data-game-track] .car");
      if (track) track.style.setProperty("--value", `${stats.progress}%`);
      const feedback = app.querySelector("[data-game-feedback]");
      if (feedback) feedback.innerHTML = renderRaceFeedback(g, stats);
      const target = app.querySelector("[data-game-target]");
      if (target) {
        target.innerHTML = renderTargetText(g.text, g.input);
        scrollCurrentCharIntoView();
      }
    }
  }

  function targetMatches(target, raw, normalized) {
    const candidates = [target.answer, target.label, target.word].filter(Boolean).map((item) => String(item));
    return candidates.some((item) => item === raw || item.toLowerCase() === normalized);
  }

  function finishGame() {
    const g = state.game;
    if (!g || g.finished) return;
    g.running = false;
    g.finished = true;
    stopGameTimer();
    const hits = g.hits || 0;
    const misses = g.misses || 0;
    const accuracy = hits + misses ? Math.round((hits / (hits + misses)) * 100) : 100;
    const totalSec = Math.max(1, Math.round(((g.preset && g.preset.duration) || 60) - g.timeLeft));
    const title = (g.title || "练习") + ((g.level && g.level.labelSuffix) || "");
    saveHistory({
      mode: "game",
      title,
      speed: g.score,
      accuracy,
      chars: hits,
      seconds: totalSec,
      date: new Date().toISOString(),
    });
    syncScoreToServer({
      mode: "game",
      title,
      speed: g.score,
      accuracy,
      chars: hits,
      seconds: totalSec,
    }).catch(() => undefined);
    if (state.settings.completeAudio) playSuccessSound();
    renderWhenInputSafe();
  }

  function renderContest() {
    if (!state.contest) initContest();
    const phase = state.contest.phase || "mode";
    if (phase === "mode") return renderContestMode();
    if (phase === "lobby") return renderContestLobby();
    if (phase === "countdown") return renderContestCountdown();
    if (phase === "typing") return renderContestTyping();
    if (phase === "result") return renderContestResult();
    if (phase === "history") return renderContestHistory();
    return renderContestMode();
  }

  function renderContestMode() {
    const history = loadContestHistory();
    const recent = history.slice(0, 3);
    return `
      <section class="section-title contest-title">
        <div>
          <h2>打字比赛</h2>
          <p>选择比赛模式 · 房间码邀请 · 实时多人竞速</p>
        </div>
        <div class="tag-row">
          <span class="tag">已比赛 ${history.length} 场</span>
        </div>
      </section>
      <div class="contest-mode-grid">
        <button class="contest-mode-card mode-match" data-action="contest-start-mode" data-mode="match">
          <div class="mode-icon">⚡</div>
          <div class="mode-body">
            <h3>快速匹配</h3>
            <p>3 秒匹配 5 位水平相近的对手，开局即战</p>
            <span class="mode-meta">AI 对手 · 4 人赛 · 90 秒</span>
          </div>
        </button>
        <button class="contest-mode-card mode-create" data-action="contest-start-mode" data-mode="create">
          <div class="mode-icon">🏆</div>
          <div class="mode-body">
            <h3>自建房间</h3>
            <p>生成 6 位房间码，邀请好友同场竞技</p>
            <span class="mode-meta">房间码 · 2-6 人赛 · 可分享</span>
          </div>
        </button>
        <button class="contest-mode-card mode-join" data-action="contest-start-mode" data-mode="join">
          <div class="mode-icon">🚪</div>
          <div class="mode-body">
            <h3>加入房间</h3>
            <p>输入朋友分享的 6 位房间码一起比赛</p>
            <span class="mode-meta">输入房间码 · 同步开赛</span>
          </div>
        </button>
        <button class="contest-mode-card mode-history" data-action="contest-start-mode" data-mode="history">
          <div class="mode-icon">📜</div>
          <div class="mode-body">
            <h3>历史战绩</h3>
            <p>查看最近 ${history.length} 场比赛的详细成绩</p>
            <span class="mode-meta">成绩 · 排名 · 错字</span>
          </div>
        </button>
      </div>
      ${recent.length ? `
      <section class="contest-recent">
        <h3 class="section-subtitle">最近战绩</h3>
        <div class="contest-recent-grid">
          ${recent.map((item) => `
            <div class="contest-recent-card" data-action="contest-view-history" data-id="${item.id}">
              <div class="recent-rank">#${item.myResult.rank}<span class="recent-of">/${item.opponents.length + 1}</span></div>
              <div class="recent-meta">
                <strong>${html(item.lessonTitle || "自由练习")}</strong>
                <span class="tiny">${html(item.mode || "match")} · ${new Date(item.date).toLocaleString()}</span>
              </div>
              <div class="recent-stats">
                <span><strong>${item.myResult.speed}</strong> 字/分</span>
                <span><strong>${item.myResult.accuracy}%</strong> 准确</span>
                <span><strong>${item.myResult.score}</strong> 分</span>
              </div>
            </div>
          `).join("")}
        </div>
      </section>
      ` : ""}
    `;
  }

  function renderContestLobby() {
    const contest = state.contest;
    const lessonOptions = contestLessonOptions(contest.selectedLessonId);
    const opponentRows = (contest.opponents || []).map((op) => `
      <div class="lobby-opponent ${op.ready ? "ready" : ""}">
        <span class="op-avatar">${html(op.avatar || "🦆")}</span>
        <span class="op-name">${html(op.name)}</span>
        <span class="op-status">${op.ready ? "已就绪" : "准备中…"}</span>
      </div>
    `).join("");
    const placeholders = Array.from({ length: Math.max(0, (contest.maxOpponents || 5) - (contest.opponents || []).length - 1) }, () => `
      <div class="lobby-opponent placeholder">
        <span class="op-avatar">·</span>
        <span class="op-name">等待加入</span>
        <span class="op-status">空位</span>
      </div>
    `).join("");
    return `
      <section class="section-title contest-title">
        <div>
          <h2>比赛大厅</h2>
          <p>${contest.mode === "create" ? "已生成房间码，发送给朋友即可加入" : "正在等待对手就绪"}</p>
        </div>
        <div class="tag-row">
          <span class="tag">房间 <strong>${html(contest.roomCode || "------")}</strong></span>
        </div>
      </section>
      <div class="contest-lobby-grid">
        <aside class="panel contest-settings-panel">
          <h3>比赛设置</h3>
          <label class="tiny">选择文章</label>
          <select class="field" data-action="contest-lesson">${lessonOptions}</select>
          <div class="tag-row" style="margin-top:12px">
            <button class="solid-button" data-action="contest-ready">${contest.ready ? "取消准备" : "准备就绪"}</button>
            <button class="ghost-button" data-action="contest-leave">退出</button>
          </div>
          <div class="lobby-roomcode-panel" ${contest.mode === "create" ? "" : "hidden"}>
            <p class="tiny">分享房间码：</p>
            <div class="lobby-roomcode-box">
              <span class="lobby-roomcode-text">${html(contest.roomCode || "------")}</span>
              <button class="ghost-button tiny" data-action="contest-copy-roomcode">复制</button>
            </div>
          </div>
          <div class="lobby-roomcode-panel" ${contest.mode === "join" ? "" : "hidden"}>
            <p class="tiny">输入房间码：</p>
            <input class="field" data-bind="contest-roomcode" placeholder="6 位房间码" maxlength="6" value="${html(contest.joinInput || "")}" />
            <button class="ghost-button tiny" data-action="contest-join-room" style="margin-top:8px">加入</button>
          </div>
          <p class="tiny muted" style="margin-top:12px">对手凑齐或房主点击开始后，3 秒倒计时即开始比赛。</p>
        </aside>
        <section class="panel contest-lobby-opponents">
          <h3>房间选手（${(contest.opponents || []).length + 1}/${contest.maxOpponents || 5}）</h3>
          <div class="lobby-opponent self ${contest.ready ? "ready" : ""}">
            <span class="op-avatar">${html(currentAvatar())}</span>
            <span class="op-name">${html(currentUsername())}（我）</span>
            <span class="op-status">${contest.ready ? "✓ 已准备" : "未准备"}</span>
          </div>
          ${opponentRows}
          ${placeholders}
        </section>
      </div>
    `;
  }

  function renderContestCountdown() {
    const contest = state.contest;
    const left = Math.max(0, contest.countdownLeft || 0);
    const big = left > 0 ? String(left) : "GO!";
    const cls = left > 0 ? "countdown-num" : "countdown-num go";
    return `
      <div class="contest-countdown-overlay">
        <div class="${cls}">${big}</div>
        <p class="tiny">${left > 0 ? "比赛即将开始" : "冲！开始打字"}</p>
      </div>
    `;
  }

  function renderContestTyping() {
    const contest = state.contest;
    return `
      <section class="section-title contest-title">
        <div>
          <h2>打字比赛中</h2>
          <p>房间 ${html(contest.roomCode || "------")} · 文章 ${html(contest.title)}</p>
        </div>
      </section>
      <div class="contest-grid">
        <aside class="panel contest-live-rank">
          <h3>实时排名</h3>
          <div class="rank-list" data-contest-rivals>${renderContestRivals(contest)}</div>
        </aside>
        <section class="panel contest-main-panel">
          <div class="game-hud" data-contest-hud>${renderContestHud(contest)}</div>
          <div class="typing-target contest-target" data-contest-target>${contest.text ? renderTargetText(contest.text, contest.input) : "请选择文章并开始比赛。"}</div>
          <textarea class="typing-input contest-input" data-bind="contest-input" lang="zh-CN" autocomplete="off" spellcheck="false" ${!contest.running || contest.finished ? "readonly" : ""} placeholder="比赛开始后输入，中文输入法可直接上屏...">${html(contest.input)}</textarea>
        </section>
      </div>
    `;
  }

  function renderContestResult() {
    const contest = state.contest;
    if (!contest || !contest.resultData) {
      return renderContestMode();
    }
    const data = contest.resultData;
    const myRank = data.rankings.find((r) => r.isMe);
    return `
      <section class="section-title contest-title">
        <div>
          <h2>比赛结束</h2>
          <p>房间 ${html(contest.roomCode || "------")} · 文章 ${html(data.lessonTitle)}</p>
        </div>
        <div class="tag-row">
          <span class="tag rank-medal">${myRank ? "#" + myRank.rank : "?"} / ${data.rankings.length}</span>
          <span class="tag">+${myRank ? myRank.score : 0} 分</span>
        </div>
      </section>
      <div class="contest-result-grid">
        ${renderContestResultCard(data)}
      </div>
      <div class="tag-row contest-result-actions">
        <button class="solid-button" data-action="contest-rematch">再来一场</button>
        <button class="ghost-button" data-action="contest-back-lobby">回到大厅</button>
        <button class="ghost-button" data-action="contest-share">分享战绩</button>
      </div>
    `;
  }

  function renderContestResultCard(data) {
    const rankings = data.rankings || [];
    const podium = rankings.slice(0, 3);
    const rest = rankings.slice(3);
    return `
      <div class="contest-podium">
        ${podium[1] ? `<div class="podium-col silver"><div class="podium-name">${html(podium[1].name)}</div><div class="podium-bar"><span>#2</span><strong>${podium[1].speed} 字/分</strong></div></div>` : '<div class="podium-col silver empty"></div>'}
        ${podium[0] ? `<div class="podium-col gold"><div class="podium-name">${html(podium[0].name)}${podium[0].isMe ? " 🏆" : ""}</div><div class="podium-bar"><span>#1</span><strong>${podium[0].speed} 字/分</strong></div></div>` : '<div class="podium-col gold empty"></div>'}
        ${podium[2] ? `<div class="podium-col bronze"><div class="podium-name">${html(podium[2].name)}</div><div class="podium-bar"><span>#3</span><strong>${podium[2].speed} 字/分</strong></div></div>` : '<div class="podium-col bronze empty"></div>'}
      </div>
      <div class="contest-result-table panel">
        <h3>完整成绩</h3>
        <div class="result-row result-head">
          <span>名次</span><span>选手</span><span>速度</span><span>准确</span><span>连击</span><span>用时</span><span>得分</span>
        </div>
        ${rankings.map((r) => `
          <div class="result-row ${r.isMe ? "self" : ""} ${r.rank <= 3 ? "rank-top" : ""}">
            <span class="rank-num">#${r.rank}</span>
            <span class="rank-name">${html(r.name)}${r.isMe ? "（我）" : ""}</span>
            <span>${r.speed} 字/分</span>
            <span>${r.accuracy}%</span>
            <span>${r.combo}</span>
            <span>${r.seconds}s</span>
            <span class="rank-score">${r.score}</span>
          </div>
        `).join("")}
      </div>
      ${rest.length ? `<details class="result-detail"><summary>详细进度（点击展开）</summary><div class="result-detail-grid">${rankings.map((r) => `<div class="detail-row ${r.isMe ? "self" : ""}"><span class="tiny">${html(r.name)}</span><div class="progress" style="--value:${r.progress}%"><i></i></div><span class="tiny">${r.progress}%</span></div>`).join("")}</div></details>` : ""}
    `;
  }

  function renderContestHistory() {
    const history = loadContestHistory();
    return `
      <section class="section-title contest-title">
        <div>
          <h2>历史战绩</h2>
          <p>共 ${history.length} 场比赛</p>
        </div>
        <div class="tag-row">
          <button class="ghost-button" data-action="contest-back-lobby">返回比赛</button>
          ${history.length ? `<button class="ghost-button" data-action="contest-clear-history">清空历史</button>` : ""}
        </div>
      </section>
      ${history.length ? `
      <div class="contest-history-list">
        ${history.map((item) => `
          <div class="contest-history-item panel" data-action="contest-view-history" data-id="${item.id}">
            <div class="history-rank rank-medal">#${item.myResult.rank}<span class="tiny">/${item.opponents.length + 1}</span></div>
            <div class="history-main">
              <div><strong>${html(item.lessonTitle || "自由练习")}</strong> <span class="tiny muted">${html(item.mode || "match")} · 房间 ${html(item.roomCode || "------")}</span></div>
              <div class="tiny muted">${new Date(item.date).toLocaleString()}</div>
            </div>
            <div class="history-stats">
              <span><strong>${item.myResult.speed}</strong> 字/分</span>
              <span><strong>${item.myResult.accuracy}%</strong> 准确</span>
              <span><strong>${item.myResult.combo}</strong> 最高连击</span>
              <span><strong>${item.myResult.seconds}s</strong></span>
              <span class="score"><strong>${item.myResult.score}</strong> 分</span>
            </div>
          </div>
        `).join("")}
      </div>
      ` : `<div class="empty">暂无比赛记录，去打一场吧！</div>`}
    `;
  }

  function renderContestHud(contest) {
    const remaining = Math.max(0, contest.timeLeft || 0);
    const progress = contestProgress(contest);
    return `
      <div class="tag-row contest-hud-row">
        <span class="tag tag-timer">⏱ ${remaining}s</span>
        <span class="tag">进度 ${progress}%</span>
        <span class="tag">速度 ${contestMetrics(contest).speed} 字/分</span>
        <span class="tag">连击 x${contest.combo || 0}</span>
        ${contest.roomCode ? `<span class="tag">房间 ${html(contest.roomCode)}</span>` : ""}
      </div>
      <div class="contest-progressbar"><div class="contest-progressbar-fill" style="width:${progress}%"></div></div>
    `;
  }

  function renderContestRivals(contest) {
    const rows = (contest.opponents || []).map((rival) => `
      <div class="rival-row">
        <span class="op-avatar tiny">${html(rival.avatar || "🦆")}</span>
        <div class="rival-meta">
          <div class="rival-name">${html(rival.name)}</div>
          <div class="progress" style="--value:${rival.progress}%"><i></i></div>
        </div>
        <span class="rival-progress">${rival.progress}%</span>
      </div>
    `).join("");
    const meRow = `
      <div class="rival-row self">
        <span class="op-avatar tiny">${html(currentAvatar())}</span>
        <div class="rival-meta">
          <div class="rival-name">${html(currentUsername())}（我）</div>
          <div class="progress" style="--value:${contestProgress(contest)}%"><i></i></div>
        </div>
        <span class="rival-progress">${contestProgress(contest)}%</span>
      </div>
    `;
    return meRow + rows;
  }

  function initContest() {
    state.contest = {
      phase: "mode",
      mode: null,
      roomCode: "",
      maxOpponents: 5,
      selectedLessonId: (contestLessons()[0] || {}).lessonId || "",
      selectedSource: (contestLessons()[0] || {}).source || "speed-test",
      title: (contestLessons()[0] || {}).title || "打字比赛",
      text: "",
      input: "",
      timeLeft: 90,
      countdownLeft: 3,
      duration: 90,
      startedAt: null,
      combo: 0,
      maxCombo: 0,
      mistakes: 0,
      finished: false,
      running: false,
      ready: false,
      opponents: [],
      resultData: null,
    };
  }

  function contestLessons() {
    const speed = (state.catalog.speedTests || []).flatMap((group) =>
      (group.courses || []).flatMap((course) =>
        (course.lessons || []).slice(0, 20).map((lesson) => ({
          ...lesson,
          courseId: course.courseId,
          source: "speed-test",
          courseTitle: course.title,
        }))
      )
    );
    const contestGroups = state.catalog.courseGroups?.["8"] || [];
    const contest = contestGroups.flatMap((group) =>
      (group.courses || []).flatMap((course) =>
        (course.lessons || []).slice(0, 30).map((lesson) => ({
          ...lesson,
          courseId: course.courseId,
          categoryId: "8",
          source: "course",
          courseTitle: course.title,
        }))
      )
    );
    return [...speed, ...contest];
  }

  function contestLessonOptions(selected) {
    return contestLessons()
      .map((lesson) => `<option value="${html(lesson.lessonId)}" ${lesson.lessonId === selected ? "selected" : ""}>${html(lesson.title)}</option>`)
      .join("");
  }

  function generateRoomCode() {
    const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return code;
  }

  const OPPONENT_POOL = [
    { name: "闪电同学", avatar: "⚡", paceBase: 1.25 },
    { name: "稳健鸭", avatar: "🦆", paceBase: 0.95 },
    { name: "冲刺王", avatar: "🚀", paceBase: 1.4 },
    { name: "学霸姐", avatar: "📚", paceBase: 1.1 },
    { name: "老船长", avatar: "⚓", paceBase: 0.85 },
    { name: "极速客", avatar: "🌪️", paceBase: 1.55 },
    { name: "细心妹", avatar: "🌸", paceBase: 0.9 },
    { name: "干脆面", avatar: "🍜", paceBase: 1.05 },
  ];

  function pickOpponents(count) {
    const pool = [...OPPONENT_POOL];
    const picked = [];
    while (picked.length < count && pool.length) {
      const i = Math.floor(Math.random() * pool.length);
      picked.push(pool.splice(i, 1)[0]);
    }
    return picked.map((p, idx) => ({
      name: p.name,
      avatar: p.avatar,
      pace: p.paceBase + (Math.random() * 0.2 - 0.1),
      progress: 0,
      ready: false,
      joinedAt: Date.now() + idx * 700,
    }));
  }

  function simulateOpponentsJoin() {
    const contest = state.contest;
    if (!contest || !contest.opponents) return;
    const timer = setInterval(() => {
      let changed = false;
      const now = Date.now();
      contest.opponents.forEach((op) => {
        if (!op.ready && now >= op.joinedAt) {
          op.ready = true;
          changed = true;
        }
      });
      if (changed) {
        updateContestDom({ updateTarget: false });
        maybeStartCountdown();
      }
      if (contest.opponents.every((op) => op.ready) || contest.ready) {
        clearInterval(timer);
        contest.opponentJoinTimer = null;
      }
    }, 300);
    contest.opponentJoinTimer = timer;
  }

  function maybeStartCountdown() {
    const contest = state.contest;
    if (!contest || contest.phase !== "lobby") return;
    if (contest.ready && contest.opponents.length > 0) {
      startCountdownPhase();
    }
  }

  function startCountdownPhase() {
    const contest = state.contest;
    if (!contest || contest.phase !== "lobby") return;
    if (contest.opponentJoinTimer) {
      clearInterval(contest.opponentJoinTimer);
      contest.opponentJoinTimer = null;
    }
    contest.phase = "countdown";
    contest.countdownLeft = 3;
    render();
    contest.countdownTimer = setInterval(() => {
      contest.countdownLeft -= 1;
      if (contest.countdownLeft <= 0) {
        clearInterval(contest.countdownTimer);
        contest.countdownTimer = null;
        startTypingPhase();
      } else {
        render();
      }
    }, 800);
  }

  async function startTypingPhase() {
    const contest = state.contest;
    if (!contest) return;
    stopContestTimer();
    const meta = contestLessons().find((lesson) => lesson.lessonId === contest.selectedLessonId);
    if (!meta) return;
    let detail = null;
    try {
      detail = await loadLessonDetail(meta.lessonId);
    } catch {
      detail = null;
    }
    const text = composeLessonText(detail?.data || {}, meta);
    if (!text) return;
    contest.text = text;
    contest.title = meta.title;
    contest.lessonTitle = meta.title;
    contest.input = "";
    contest.combo = 0;
    contest.maxCombo = 0;
    contest.mistakes = 0;
    contest.timeLeft = contest.duration || 90;
    contest.startedAt = nowSeconds();
    contest.phase = "typing";
    contest.running = true;
    contest.finished = false;
    contest.opponents = (contest.opponents || []).map((op) => ({ ...op, progress: 0 }));
    state.suppressAutoScrollUntil = Date.now() + 600;
    state.contestTimer = setInterval(() => {
      tickContest();
    }, 1000);
    render();
    focusBind("contest-input");
    requestAnimationFrame(() => {
      const target = app.querySelector("[data-contest-target]");
      if (target) target.scrollTop = 0;
    });
  }

  function tickContest() {
    const contest = state.contest;
    if (!contest || !contest.running || contest.finished) return;
    contest.timeLeft -= 1;
    contest.opponents = contest.opponents.map((op) => ({
      ...op,
      progress: clamp(op.progress + Math.round(rand(2, 5) * op.pace), 0, 100),
    }));
    const allOpponentsDone = (contest.opponents || []).length > 0 && contest.opponents.every((op) => op.progress >= 100);
    if (contest.timeLeft <= 0 || contestProgress(contest) >= 100 || allOpponentsDone) finishContest();
    else updateContestDom({ updateTarget: false });
  }

  function updateContestInput(value, options = {}) {
    const contest = state.contest;
    if (!contest || contest.phase !== "typing" || !contest.running || contest.finished) return;
    if (state.composing || options.composing) return;
    const previous = contest.input;
    const next = String(value || "").slice(0, contest.text.length);
    const grew = next.length > previous.length;
    // 错字检测：超出长度/不匹配时不算入 combo
    if (grew) {
      const idx = next.length - 1;
      if (contest.text[idx] === next[idx]) {
        contest.combo = (contest.combo || 0) + 1;
        contest.maxCombo = Math.max(contest.maxCombo || 0, contest.combo);
      } else {
        contest.combo = 0;
        contest.mistakes = (contest.mistakes || 0) + (next[idx] === " " ? 0 : 1);
      }
    } else {
      contest.combo = 0;
    }
    contest.input = next;
    if (previous === contest.input) return;
    if (state.settings.keyAudio && grew) {
      keyClick(contest.input[contest.input.length - 1], contest.text[contest.input.length - 1]);
    }
    if (contestProgress(contest) >= 100) finishContest();
    else updateContestDom({ preserveScroll: true });
  }

  function updateContestDom(options = {}) {
    const contest = state.contest;
    if (!contest || state.route.parts[0] !== "contest") return;
    const phase = contest.phase || "mode";
    if (phase !== "typing") {
      render();
      return;
    }
    const updateTarget = options.updateTarget !== false;
    const hud = app.querySelector("[data-contest-hud]");
    if (hud) hud.innerHTML = renderContestHud(contest);
    const rivals = app.querySelector("[data-contest-rivals]");
    if (rivals) rivals.innerHTML = renderContestRivals(contest);
    if (updateTarget) {
      const target = app.querySelector("[data-contest-target]");
      if (target) {
        const previousTop = target.scrollTop;
        target.innerHTML = contest.text ? renderTargetText(contest.text, contest.input) : "请选择文章并开始比赛。";
        if (options.preserveScroll) target.scrollTop = previousTop;
        else if (!options.skipScroll) scrollCurrentCharIntoView();
      }
    }
  }

  function finishContest() {
    const contest = state.contest;
    if (!contest || contest.finished) return;
    contest.running = false;
    contest.finished = true;
    stopContestTimer();
    const myMetrics = contestMetrics(contest);
    const seconds = Math.max(1, (contest.duration || 90) - (contest.timeLeft || 0));
    const myResult = {
      name: currentUsername(),
      isMe: true,
      speed: myMetrics.speed,
      accuracy: myMetrics.accuracy,
      combo: contest.maxCombo || 0,
      seconds,
      progress: contestProgress(contest),
      mistakes: contest.mistakes || 0,
      score: calcContestScore({ speed: myMetrics.speed, accuracy: myMetrics.accuracy, combo: contest.maxCombo || 0, rank: 0 }),
      rank: 0,
    };
    const opponentsResult = (contest.opponents || []).map((op) => {
      const speed = estimateOpponentSpeed(op, contest.text.length);
      const accuracy = rand(85, 100);
      const combo = Math.floor(rand(2, 40));
      return {
        name: op.name,
        avatar: op.avatar,
        isMe: false,
        speed,
        accuracy,
        combo,
        seconds: Math.max(1, Math.round((contest.duration || 90) * (op.progress / 100))),
        progress: op.progress,
        mistakes: 0,
        score: calcContestScore({ speed, accuracy, combo, rank: 0 }),
        rank: 0,
      };
    });
    const all = [myResult, ...opponentsResult]
      .sort((a, b) => b.progress - a.progress || b.speed - a.speed || b.accuracy - a.accuracy);
    all.forEach((r, idx) => { r.rank = idx + 1; });
    const rankings = all.map((r) => ({ ...r, score: calcContestScore({ speed: r.speed, accuracy: r.accuracy, combo: r.combo, rank: r.rank }) }));
    const data = {
      lessonTitle: contest.title,
      roomCode: contest.roomCode,
      mode: contest.mode,
      rankings,
      seconds,
      myResult: rankings.find((r) => r.isMe),
    };
    contest.resultData = data;
    contest.phase = "result";
    saveHistory({
      mode: "contest",
      title: contest.title,
      speed: myMetrics.speed,
      accuracy: myMetrics.accuracy,
      chars: contest.input.length,
      seconds,
      date: new Date().toISOString(),
    });
    saveContestHistory({
      id: `c_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      date: new Date().toISOString(),
      roomCode: contest.roomCode,
      mode: contest.mode,
      lessonId: contest.selectedLessonId,
      lessonTitle: contest.title,
      text: contest.text,
      myResult: rankings.find((r) => r.isMe),
      opponents: rankings.filter((r) => !r.isMe),
    });
    if (state.settings.completeAudio) playSuccessSound();
    location.hash = link("/contest/result");
  }

  function estimateOpponentSpeed(op, totalChars) {
    const elapsed = Math.max(1, (op.progress / 100) * 90);
    const cps = (op.progress / 100) * totalChars / elapsed;
    return Math.round(cps * 60);
  }

  function calcContestScore({ speed, accuracy, combo, rank }) {
    const base = Math.max(0, Number(speed || 0)) * Math.max(0.5, Number(accuracy || 0) / 100);
    const comboBonus = Math.min(200, Math.max(0, Number(combo || 0)) * 2);
    const rankBonus = rank === 1 ? 200 : rank === 2 ? 120 : rank === 3 ? 60 : 0;
    return Math.round(base + comboBonus + rankBonus);
  }

  function saveContestHistory(record) {
    const key = "typing-contest-history";
    let list = [];
    try { list = JSON.parse(localStorage.getItem(key) || "[]"); } catch { list = []; }
    list.unshift(record);
    list = list.slice(0, 50);
    try { localStorage.setItem(key, JSON.stringify(list)); } catch {}
  }

  function loadContestHistory() {
    const key = "typing-contest-history";
    try { return JSON.parse(localStorage.getItem(key) || "[]"); } catch { return []; }
  }

  function clearContestHistory() {
    try { localStorage.removeItem("typing-contest-history"); } catch {}
  }

  function currentUsername() {
    return (state.session && state.session.user && state.session.user.username) || (state.settings && state.settings.username) || "我";
  }

  function currentAvatar() {
    const u = state.session && state.session.user;
    if (u && u.avatar) return u.avatar;
    return "🙂";
  }

  function contestProgress(contest) {
    return contest.text ? Math.round((contest.input.length / contest.text.length) * 100) : 0;
  }

  function contestMetrics(contest) {
    const trainer = {
      text: contest.text || "",
      input: contest.input || "",
      startedAt: contest.startedAt,
    };
    return trainerMetrics(trainer);
  }

  function startContestMode(mode) {
    if (!state.contest) initContest();
    const contest = state.contest;
    contest.mode = mode;
    if (mode === "match") {
      contest.maxOpponents = 4;
      contest.roomCode = generateRoomCode();
      contest.duration = 90;
      contest.opponents = pickOpponents(4);
      contest.ready = true; // 匹配模式自动准备
      contest.phase = "lobby";
      render();
      simulateOpponentsJoin();
    } else if (mode === "create") {
      contest.maxOpponents = 5;
      contest.roomCode = generateRoomCode();
      contest.duration = 90;
      contest.opponents = pickOpponents(3);
      contest.ready = false;
      contest.phase = "lobby";
      render();
      simulateOpponentsJoin();
    } else if (mode === "join") {
      contest.maxOpponents = 5;
      contest.roomCode = "";
      contest.opponents = [];
      contest.ready = false;
      contest.phase = "lobby";
      render();
    } else if (mode === "history") {
      contest.phase = "history";
      render();
    } else {
      contest.phase = "mode";
      render();
    }
  }

  function copyContestRoomCode() {
    const code = state.contest?.roomCode || "";
    if (!code) return;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(code).then(() => {
        flashToast("房间码 " + code + " 已复制");
      }).catch(() => {
        fallbackCopy(code);
      });
    } else {
      fallbackCopy(code);
    }
  }

  function fallbackCopy(text) {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      flashToast("房间码 " + text + " 已复制");
    } catch (e) {
      flashToast("复制失败，请手动选择");
    }
  }

  function joinContestRoom(code) {
    if (!state.contest) initContest();
    const contest = state.contest;
    contest.mode = "join";
    contest.roomCode = code.toUpperCase();
    contest.maxOpponents = 5;
    contest.duration = 90;
    contest.opponents = pickOpponents(3 + Math.floor(Math.random() * 2));
    contest.ready = false;
    contest.phase = "lobby";
    flashToast("已加入房间 " + code);
    render();
    simulateOpponentsJoin();
  }

  function shareContestResult() {
    const contest = state.contest;
    if (!contest || !contest.resultData) return;
    const my = contest.resultData.myResult;
    if (!my) return;
    const text = `打字比赛结果：第${my.rank}/${contest.resultData.rankings.length}名 · ${my.speed}字/分 · ${my.accuracy}%准确 · ${my.score}分 · 文章《${contest.resultData.lessonTitle}》`;
    if (navigator.share) {
      navigator.share({ title: "享打字 · 比赛战绩", text }).catch(() => fallbackCopy(text));
    } else {
      fallbackCopy(text);
    }
  }

  function flashToast(message) {
    let toast = document.getElementById("typing-flash-toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "typing-flash-toast";
      toast.className = "flash-toast";
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => toast.classList.remove("show"), 1800);
  }

  function renderRank() {
    ensureRankingsLoaded();
    const allRecords = mergedRankingRecords();
    const pageSize = rankPageSize();
    const totalPages = Math.max(1, Math.ceil(allRecords.length / pageSize));
    state.rankPage = clamp(Number(state.rankPage || 1), 1, totalPages);
    const start = (state.rankPage - 1) * pageSize;
    const records = allRecords.slice(start, start + pageSize);
    return `
      <section class="section-title">
        <div>
          <h2>荣誉榜</h2>
          <p>展示课程练习、测试、游戏和比赛成绩排行。</p>
        </div>
        <div class="tag-row">
          <span class="tag">${state.apiOnline ? "数据已同步" : "练习记录"}</span>
          <button class="ghost-button" data-action="refresh-rank">刷新</button>
          <button class="ghost-button" data-action="clear-history">清空本机记录</button>
        </div>
      </section>
      <div class="panel">
        <div class="rank-summary">
          <span>共 ${allRecords.length} 条记录</span>
          <span>第 ${state.rankPage} / ${totalPages} 页</span>
        </div>
        <div class="rank-list rank-list-paged">
          ${records.length ? records.map((item, index) => renderRankRow(item, start + index)).join("") : `<div class="empty">暂无记录，完成一次练习后会出现在这里。</div>`}
        </div>
        ${totalPages > 1 ? renderRankPager(totalPages) : ""}
      </div>
    `;
  }

  function rankPageSize() {
    return 12;
  }

  function renderRankPager(totalPages) {
    const current = clamp(Number(state.rankPage || 1), 1, totalPages);
    const pages = Array.from({ length: totalPages }, (_, index) => index + 1).filter(
      (page) => page === 1 || page === totalPages || Math.abs(page - current) <= 2
    );
    const items = [];
    for (const page of pages) {
      if (items.length && page - items[items.length - 1] > 1) items.push("gap");
      items.push(page);
    }
    return `
      <div class="rank-pager">
        <button class="ghost-button" data-action="rank-page" data-page="${Math.max(1, current - 1)}" ${current <= 1 ? "disabled" : ""}>上一页</button>
        ${items
          .map((page) =>
            page === "gap"
              ? `<span class="rank-gap">...</span>`
              : `<button class="ghost-button ${page === current ? "active" : ""}" data-action="rank-page" data-page="${page}">${page}</button>`
          )
          .join("")}
        <button class="ghost-button" data-action="rank-page" data-page="${Math.min(totalPages, current + 1)}" ${current >= totalPages ? "disabled" : ""}>下一页</button>
      </div>
    `;
  }

  function renderRankRow(item, index) {
    const date = item.date || item.created_at || item.updatedAt || new Date().toISOString();
    const username = item.username || currentUsername();
    return `
      <div class="rank-row">
        <strong>#${index + 1}</strong>
        <span>${html(item.title)}<br><span class="tiny">${html(username)} · ${html(modeLabel(item.mode))} · ${new Date(date).toLocaleString()}</span></span>
        <span>${Number(item.speed || 0)} 字/分</span>
        <span>${Number(item.accuracy || 0)}%</span>
      </div>
    `;
  }

  function mergedRankingRecords() {
    const combined = [
      ...state.remoteRankings.map((item) => normalizeRecord(item, "server")),
      ...state.serverHistory.map((item) => normalizeRecord(item, "server")),
      ...offlineHistoryRecords().map((item) => normalizeRecord(item, "local")),
    ];
    const seen = new Set();
    return combined
      .sort((a, b) => {
        const speed = Number(b.speed || 0) - Number(a.speed || 0);
        if (speed) return speed;
        const accuracy = Number(b.accuracy || 0) - Number(a.accuracy || 0);
        if (accuracy) return accuracy;
        return Number(a.seconds || 999999) - Number(b.seconds || 999999);
      })
      .filter((item) => {
        const key = `${item.username}|${item.mode}|${item.title}|${item.speed}|${item.accuracy}|${item.chars}|${item.seconds}|${item.date}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }

  function normalizeRecord(item, source) {
    const date = item.date || item.created_at || item.updatedAt || new Date().toISOString();
    return {
      ...item,
      source,
      username: item.username || currentUsername(),
      date,
      speed: Number(item.speed || 0),
      accuracy: Number(item.accuracy || 0),
      chars: Number(item.chars || 0),
      seconds: Number(item.seconds || 0),
    };
  }

  function primaryHistoryRecords() {
    const useServer = state.apiOnline && Boolean(state.session.token);
    const source = useServer ? state.serverHistory : state.history;
    return [...source]
      .map((item) => normalizeRecord(item, useServer ? "server" : "local"))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  function offlineHistoryRecords() {
    if (!state.apiOnline || !state.serverHistory.length) return state.history;
    const serverKeys = new Set(
      state.serverHistory.map((item) => {
        const normalized = normalizeRecord(item, "server");
        return `${normalized.mode}|${normalized.title}|${normalized.speed}|${normalized.accuracy}|${normalized.chars}|${normalized.seconds}|${normalized.date}`;
      })
    );
    return state.history.filter((item) => {
      const normalized = normalizeRecord(item, "local");
      return !serverKeys.has(`${normalized.mode}|${normalized.title}|${normalized.speed}|${normalized.accuracy}|${normalized.chars}|${normalized.seconds}|${normalized.date}`);
    });
  }

  function renderProfile() {
    const completed = Object.values(state.progress).filter((item) => item.complete).length;
    const history = primaryHistoryRecords();
    const best = history.reduce((max, item) => Math.max(max, Number(item.speed || 0)), 0);
    const totalChars = history.reduce((sum, item) => sum + Number(item.chars || 0), 0);
    return `
      <section class="section-title">
        <div>
          <h2>个人中心</h2>
          <p>账号设置、练习统计、成就和历史记录。</p>
        </div>
      </section>
      <div class="profile-grid">
        <section class="panel">
          <h3>账号</h3>
          <div class="session-card">
            <div><strong>${html(currentUsername())}</strong><span class="tiny">${html(state.session.source || "school")} · ${state.apiOnline ? "数据已同步" : "练习模式"}</span></div>
            <div class="tiny">Token：${state.session.token ? html(`${state.session.token.slice(0, 12)}...`) : "未导入登录态"}</div>
          </div>
          <input class="field" data-bind="profile-name" value="${html(state.profile.nickname)}" placeholder="昵称">
          <div class="settings-grid" style="margin-top:12px">
            <label>深色模式 <input type="checkbox" data-setting="darkMode" ${state.settings.darkMode ? "checked" : ""}></label>
            <label>键盘提示 <input type="checkbox" data-setting="showKeyboard" ${state.settings.showKeyboard ? "checked" : ""}></label>
            <label>按键音 <input type="checkbox" data-setting="keyAudio" ${state.settings.keyAudio ? "checked" : ""}></label>
            <label>完成音 <input type="checkbox" data-setting="completeAudio" ${state.settings.completeAudio ? "checked" : ""}></label>
            <label>朗读语音 <input type="checkbox" data-setting="speechAudio" ${state.settings.speechAudio ? "checked" : ""}></label>
            <label>循环朗读 <input type="checkbox" data-setting="loopSpeech" ${state.settings.loopSpeech ? "checked" : ""}></label>
            <label>朗读速度 <input type="range" min="0.55" max="1.4" step="0.05" data-setting-number="speechRate" value="${Number(state.settings.speechRate || 0.9)}"></label>
          </div>
        </section>
        <section class="panel">
          <h3>统计</h3>
          <div class="metric-grid">
            ${metric("完成课时", completed, "节")}
            ${metric("历史记录", history.length, "条")}
            ${metric("最佳速度", best, "字/分")}
            ${metric("累计字数", totalChars, "字")}
          </div>
        </section>
      </div>
      ${renderRecentHistory()}
    `;
  }

  function renderRecentHistory() {
    const recent = primaryHistoryRecords().slice(0, 8);
    return `
      <section class="section-title">
        <div><h2>最近记录</h2><p>最近训练和比赛成绩。</p></div>
        <a class="ghost-button" href="${link("/rank")}">查看排行</a>
      </section>
      <div class="panel">
        <div class="rank-list">
          ${recent.length ? recent.map(renderRankRow).join("") : `<div class="empty">还没有练习记录。</div>`}
        </div>
      </div>
    `;
  }

  function renderCustom() {
    return `
      <section class="section-title">
        <div>
          <h2>自定义课程</h2>
          <p>粘贴任意文本，生成专属练习课时。</p>
        </div>
      </section>
      <div class="trainer-layout">
        <section class="panel">
          <input class="field" data-bind="custom-title" placeholder="课程标题">
          <textarea class="textarea" data-bind="custom-text" placeholder="输入或粘贴要练习的内容"></textarea>
          <div class="tag-row" style="margin-top:12px">
            <button class="solid-button" data-action="save-custom">保存课程</button>
          </div>
        </section>
        <aside class="panel">
          <h3>我的自定义</h3>
          <div class="rank-list">
            ${state.custom.length ? state.custom.map(renderCustomItem).join("") : `<div class="empty">暂无自定义课程。</div>`}
          </div>
        </aside>
      </div>
    `;
  }

  function renderCustomItem(item) {
    return `
      <div class="rank-row">
        <strong>自</strong>
        <span>${html(item.title)}<br><span class="tiny">${item.text.length} 字</span></span>
        <button class="ghost-button" data-action="practice-custom" data-id="${html(item.id)}">练习</button>
        <button class="ghost-button" data-action="delete-custom" data-id="${html(item.id)}">删除</button>
      </div>
    `;
  }

  function renderDownload() {
    return `
      <section class="section-title">
        <div><h2>下载客户端</h2><p>网页版可直接运行，客户端入口预留。</p></div>
      </section>
      <div class="panel">
        <p>当前版本已支持课程训练、测速、游戏、比赛、排行榜和个人中心。</p>
      </div>
    `;
  }

  function renderEmptyData() {
    return `
      <section class="section-title">
        <div><h2>暂无课程</h2><p>课程资源暂未载入，请联系管理员同步资源包。</p></div>
      </section>
      <div class="empty">当前资源包没有可展示内容。</div>
    `;
  }

  function renderModeHub(mode, title, desc) {
    const modeCards = {
      english: {
        items: [
          { href: link("/courses"), label: "英文单词", desc: "从 26 字母键位到常用单词、词组，盲打同时积累词汇量" },
          { href: link("/courses"), label: "英文短文", desc: "练习流畅的英文整句输入，训练连续击键与节奏" },
          { href: link("/english"), label: "英文打字课程", desc: "循序渐进的指法训练，配套发音、错字回顾" },
          { href: link("/courses"), label: "经典名著片段", desc: "《小王子》《老人与海》等英文原著节选练习" },
          { href: link("/courses"), label: "商务/学术英语", desc: "邮件、报告、摘要常用句式输入训练" },
        ],
        features: [
          { icon: "Aa", label: "大小写键位", desc: "Shift + 字母组合，自动区分大小写" },
          { icon: "Q", label: "词组整句", desc: "整句、整段连续输入，告别逐字停顿" },
          { icon: "🔊", label: "英文发音", desc: "TTS 朗读整句、单词，耳朵一起练" },
        ]
      },
      pinyin: {
        items: [
          { href: link("/courses"), label: "指法基础", desc: "26 个字母键位 + 手指分工，从零开始打基础" },
          { href: link("/courses"), label: "完整拼音", desc: "声母、韵母、音节，3500+ 常用字拼打" },
          { href: link("/pinyin"), label: "单字练习", desc: "常用汉字逐字击键，覆盖日常词汇" },
          { href: link("/courses"), label: "词组与文章", desc: "诗词赋、对照文章，进阶流畅输入" },
          { href: link("/pinyin"), label: "双拼课程", desc: "小鹤、微软、自然码双拼方案系统训练" },
          { href: link("/courses"), label: "数字小键盘", desc: "财会、表格录入必备的数字盲打" },
        ],
        features: [
          { icon: "拼", label: "拼音对照", desc: "汉字 + 拼音同屏显示，边打边记" },
          { icon: "键", label: "手指分工", desc: "实时高亮应使用的手指，错位提醒" },
          { icon: "🎓", label: "诗词歌赋", desc: "古诗文、课文片段，文化 + 输入双修" },
        ]
      },
      code: {
        items: [
          { href: link("/code"), label: "C++", desc: "支持 { } ; ( ) # 等符号高频组合练习" },
          { href: link("/code"), label: "Java", desc: "强类型语言典型代码片段盲打" },
          { href: link("/code"), label: "Python", desc: "简洁语法，强调缩进与英文单词输入" },
          { href: link("/code"), label: "Go", desc: "云原生语言，{ } 与 := 等典型符号" },
          { href: link("/code"), label: "SQL", desc: "SELECT / WHERE / JOIN 数据库查询语句" },
          { href: link("/code"), label: "JavaScript", desc: "前端脚本，模板字符串与异步语法" },
          { href: link("/courses"), label: "小键盘数字", desc: "数字键盘盲打，财会 / 工程录入必备" },
        ],
        features: [
          { icon: "{ }", label: "符号专项", desc: "标点、成对符号自动配对训练" },
          { icon: "TAB", label: "缩进训练", desc: "Tab / 空格缩进习惯养成" },
          { icon: "⇧", label: "大小写切换", desc: "Shift、Ctrl 组合键高频使用场景" },
        ]
      },
    };
    const data = modeCards[mode] || { items: [], features: [] };
    const items = data.items;
    const features = data.features;
    const eyebrow = mode === "english" ? "ENGLISH" : mode === "pinyin" ? "拼音 PINYIN" : "CODE 代码";
    const itemsHtml = items.map((it) => `
          <a class="card mode-hub-card" href="${it.href}">
            <div class="card-title-row">
              <h3>${html(it.label)}</h3>
              <span class="lesson-index">▶</span>
            </div>
            <p class="muted">${html(it.desc)}</p>
          </a>
        `).join("");
    const featuresHtml = features.map((f) => `
          <div class="card mode-hub-feature">
            <span class="mode-hub-feature-icon">${html(f.icon)}</span>
            <div>
              <h3>${html(f.label)}</h3>
              <p class="muted">${html(f.desc)}</p>
            </div>
          </div>
        `).join("");
    return `
      <section class="hero-band hero-band-mode">
        <div class="hero-copy">
          <span class="eyebrow">乐启享 · ${eyebrow}</span>
          <h1>${html(title)}</h1>
          <p>${html(desc)}</p>
          <div class="tag-row">
            <a class="pill-button" href="${link("/courses")}">开始练习</a>
            <a class="ghost-button" href="${link("/speed-test")}">先测个速</a>
            <a class="ghost-button" href="${link("/")}">返回首页</a>
          </div>
        </div>
        <div class="hero-stats hero-stats--3">
          <div class="stat-tile"><span>分类</span><strong>${items.length}</strong></div>
          <div class="stat-tile"><span>课程</span><strong>${items.length * 20}+</strong></div>
          <div class="stat-tile"><span>模式</span><strong>${html(mode)}</strong></div>
        </div>
      </section>
      <section class="section-title">
        <div><h2>模式亮点</h2><p>${html(mode)} 模式为这些场景做了特别优化。</p></div>
      </section>
      <div class="grid category-grid mode-hub-feature-grid">${featuresHtml}</div>
      <section class="section-title">
        <div><h2>选择一个分类开始练习</h2><p>共 ${items.length} 个入口</p></div>
        <a class="ghost-button" href="${link("/games")}">边玩边练</a>
      </section>
      <div class="grid category-grid">${itemsHtml}</div>
    `;
  }

  function renderClientDownload() {
    return `
      <section class="hero-band">
        <div class="hero-copy">
          <span class="eyebrow">乐启享 · CLIENT</span>
          <h1>乐启享 Windows 客户端</h1>
          <p>桌面端打字练习工具，离线可用，键盘提示更灵敏。</p>
          <div class="tag-row">
            <a class="pill-button" href="#" onclick="alert('客户端下载即将开放');return false;">Windows 下载 (v1.2.3)</a>
            <a class="ghost-button" href="${link("/")}">返回首页</a>
          </div>
        </div>
      </section>
      <section class="section-title">
        <div><h2>客户端特性</h2><p>下载安装后即可在桌面端练习打字。</p></div>
      </section>
      <div class="grid category-grid">
        <div class="card"><h3>离线练习</h3><p class="muted">无需联网也可使用全部课程</p></div>
        <div class="card"><h3>键盘实时反馈</h3><p class="muted">毫秒级按键响应</p></div>
        <div class="card"><h3>系统托盘</h3><p class="muted">最小化到托盘随时调用</p></div>
      </div>
    `;
  }

  function renderStaticInfo(kind) {
    const docs = {
      intro: {
        title: "产品介绍",
        subtitle: "乐启享打字 · 趣味化在线打字练习平台",
        blocks: [
          { h: "我们是谁", p: "乐启享打字是一款面向学生、老师、家庭与办公人群的免费打字练习平台。从基础指法到拼音、英文、代码，覆盖日常学习与工作的全部打字场景。" },
          { h: "为什么免费", p: "我们相信打字是一项基础能力，应该人人可及。所有核心课程、游戏、测速、比赛功能均不收取费用，页面无第三方广告，不打扰练习节奏。" },
          { h: "我们提供什么", p: "3000+ 节分级课程 · 9 款打字游戏 · 实时测速 · 双人 PK · 班级排行榜 · 个人数据看板 · 多端同步进度。" },
          { h: "技术亮点", p: "全站采用 SPA 单页架构，键盘响应在毫秒级。游戏区使用 PIXI / Canvas 引擎，支持完整 SFX 与背景音乐。" },
        ]
      },
      updates: {
        title: "更新日志",
        subtitle: "Release notes — 最近 6 个版本",
        blocks: [
          { h: "v1.3.0 · 打字游戏区全面接入", p: "9 款游戏正式上线：拼音战机、打字赛车、细菌大作战、打地鼠、保卫地球、沉浸式打字、鸭子过河、捕鱼达人、土豆枪大战僵尸。sprite、音效、Canvas 引擎全部本地化。" },
          { h: "v1.2.4 · 测速榜 + 个人最佳", p: "速度测试页新增个人最佳卡片 + 全球 Top 8 排行榜，后端记录每一次测速并返回全网排名。" },
          { h: "v1.2.3 · 拼音模式", p: "新增拼音模式 hub 页 (/pinyin)，完整覆盖声母、韵母、音节、单字、词组、诗词赋、双拼方案。" },
          { h: "v1.2.2 · 英文 / 代码模式 hub", p: "/english 与 /code 模式入口上线，分别覆盖单词、短文、名著片段，以及 C++/Java/Python/Go/SQL/JavaScript。" },
          { h: "v1.2.1 · 静态信息页", p: "产品介绍、更新日志、公司介绍、服务条款、隐私协议、Cookies 政策等静态页上线，备案信息同步展示。" },
          { h: "v1.2.0 · SPA 重构", p: "整体重构为单页应用，键盘响应优化至毫秒级，支持路由级别懒加载。" },
        ]
      },
      about: {
        title: "公司介绍",
        subtitle: "关于乐启享团队",
        blocks: [
          { h: "团队", p: "乐启享是一支专注于教育工具的小型开发团队，我们相信好的工具可以让学习变成一种享受。团队成员来自互联网教育、儿童编程、输入法等行业。" },
          { h: "愿景", p: "让每个学生、家庭、职场人都能用最低的门槛掌握规范打字，从而把宝贵的注意力留给思考本身，而不是键盘。" },
          { h: "联系我们", p: "邮箱：hi@game-google.com · 微信公众号：乐启享打字 · 反馈 QQ 群：见页脚二维码。" },
        ]
      },
      service: {
        title: "服务条款",
        subtitle: "使用本平台前请阅读",
        blocks: [
          { h: "服务范围", p: "乐启享提供免费的在线打字练习、游戏、测速、比赛、排行榜、班级管理等功能。所有功能仅供个人学习与教学使用。" },
          { h: "用户行为规范", p: "请勿利用本平台从事商业转售、批量爬取、干扰其他用户练习、传播违法内容等违规行为。违反者将被暂停或终止账户。" },
          { h: "知识产权", p: "本平台的课程内容、UI 设计、游戏源码（PIXI / Canvas 引擎）由乐启享团队原创或取得合法授权。未经授权，请勿复制、再分发或商业化使用。" },
          { h: "免责", p: "本平台按「现状」提供，不对特定可用性、准确性或适用于特定目的作出保证。因网络、设备等原因造成的练习数据丢失，团队将尽力恢复但不保证完整性。" },
          { h: "条款变更", p: "我们可能根据产品演进或法规变化修订本条款，重大变更将在站内公告。继续使用即视为接受修订后的条款。" },
        ]
      },
      privacy: {
        title: "隐私协议",
        subtitle: "我们如何收集、使用与保护你的数据",
        blocks: [
          { h: "收集范围", p: "账号信息（昵称、ID）、练习数据（速度、准确率、章节进度）、设备信息（UA、屏幕尺寸）。我们不收集姓名、手机号、身份证号、地理位置等敏感信息。" },
          { h: "使用目的", p: "数据仅用于：1) 同步你在多设备的练习进度；2) 生成个人数据看板；3) 在排行榜中匿名展示（仅昵称 + ID + 速度）。" },
          { h: "第三方共享", p: "我们不会向第三方出售、共享你的练习数据。仅在法律要求或为维护平台安全时，才会按最小必要原则披露。" },
          { h: "数据安全", p: "传输使用 HTTPS，存储使用加密数据库，访问需要双因素鉴权。员工访问需走审批流程并记录日志。" },
          { h: "你的权利", p: "你随时可以查看、导出、删除自己的练习数据。删除账号后，所有个人数据将在 30 天内从生产环境清除。" },
        ]
      },
      cookie: {
        title: "Cookies 政策",
        subtitle: "本站如何使用 Cookie 与本地存储",
        blocks: [
          { h: "必要 Cookie", p: "用于维持你的登录状态、记住主题偏好、防止重复提交表单。这些 Cookie 不携带个人信息，关闭后部分功能将不可用。" },
          { h: "本地存储 (localStorage)", p: "我们使用 localStorage 缓存课程列表、设置项、练习进度等数据，仅存储在你的浏览器中，不会上传到服务器。" },
          { h: "第三方 Cookie", p: "本站不嵌入第三方广告、不使用第三方统计 SDK。游戏 iframe 仅在同一域名加载，不携带跨站 Cookie。" },
          { h: "如何清除", p: "在浏览器设置 → 隐私 → Cookie 中可查看、清除本站的 Cookie，或在本站页脚点击「重置偏好」。" },
        ]
      },
    };
    const d = docs[kind] || docs.intro;
    const blocksHtml = (d.blocks || []).map((b) => `
          <div class="static-info-block">
            <h3>${html(b.h)}</h3>
            <p>${html(b.p)}</p>
          </div>`).join("");
    return `
      <section class="section-title">
        <div><h2>${html(d.title)}</h2><p>${html(d.subtitle || "")}</p></div>
        <a class="ghost-button" href="${link("/")}">返回首页</a>
      </section>
      <article class="card static-info-card">${blocksHtml}</article>
    `;
  }

  function renderNotFound() {
    return `
      <section class="section-title">
        <div><h2>页面不存在</h2><p>${html(state.route.path)}</p></div>
        <a class="ghost-button" href="${link("/")}">返回首页</a>
      </section>
    `;
  }

  function renderFooter() {
    const gameItems = (state.catalog.games || []).map((g) => ({
      l: g.title,
      h: link(`/games/${g.id}`),
    }));
    const cols = [
      { title: "打字游戏", links: gameItems.length ? gameItems : [
        { l: "拼音战机", h: link("/games/pinyin-fighter") },
        { l: "打字赛车", h: link("/games/car-racing") },
        { l: "细菌大作战", h: link("/games/virus-battle") },
        { l: "打地鼠", h: link("/games/whac-a-mole") },
        { l: "保卫地球", h: link("/games/defend-earth") },
        { l: "沉浸式打字", h: link("/games/typing-test") },
        { l: "鸭子过河", h: link("/games/duck-jump") },
        { l: "捕鱼达人", h: link("/games/fishing-guru") },
        { l: "土豆枪大战僵尸", h: link("/games/potato-zombies") },
      ] },
      { title: "练习 & 比赛", links: [
        { l: "全部课程", h: link("/courses") },
        { l: "拼音模式", h: link("/pinyin") },
        { l: "英文模式", h: link("/english") },
        { l: "代码模式", h: link("/code") },
        { l: "自定义课程", h: link("/custom") },
        { l: "打字测速", h: link("/speed-test") },
        { l: "打字比赛", h: link("/contest") },
        { l: "排行榜", h: link("/rank") },
      ]},
      { title: "关于", links: [
        { l: "产品介绍", h: link("/intro") },
        { l: "更新日志", h: link("/updates") },
        { l: "服务条款", h: link("/service") },
        { l: "隐私协议", h: link("/privacy") },
        { l: "Cookies 政策", h: link("/cookie") },
      ]},
    ];
    const year = new Date().getFullYear();
    const footerCols = cols.map((c) => `
            <div class="footer-col">
              <h4>${c.title}</h4>
              <ul>${c.links.map((l) => `<li><a href="${l.h}">${l.l}</a></li>`).join("")}</ul>
            </div>
          `).join("");
    return `
      <footer class="site-footer">
        <div class="footer-grid">
          <div class="footer-brand">
            <div class="footer-brand-mark">乐启享</div>
            <div class="footer-brand-name">打字游戏 · 课程 · 测速 · 比赛</div>
          </div>
          <div class="footer-cols">${footerCols}</div>
        </div>
        <div class="footer-quick">
          <span class="footer-quick-label">快速入口：</span>
          <a href="${link("/games")}">打字游戏</a>
          <a href="${link("/courses")}">打字课程</a>
          <a href="${link("/speed-test")}">在线测速</a>
          <a href="${link("/contest")}">打字比赛</a>
          <a href="${link("/rank")}">排行榜</a>
        </div>
        <div class="footer-bottom">
          <span>Copyright © ${year} 乐启享打字 · 保留所有权利</span>
          <span class="footer-legal">
            <a href="${link("/service")}">服务条款</a><i>·</i>
            <a href="${link("/privacy")}">隐私协议</a><i>·</i>
            <a href="${link("/cookie")}">Cookies 政策</a>
          </span>
        </div>
      </footer>
    `;
  }

  function findLessonMeta(lessonId, source) {
    if (source === "custom") {
      const item = customItemFromLessonId(lessonId);
      if (item) {
        return {
          lessonId,
          title: item.title,
          source: "custom",
          courseId: "custom",
          courseTitle: "自定义课程",
          categoryId: "6",
          categoryTitle: "自定义课程",
          customItem: item,
          text: item.text,
        };
      }
      return {
        lessonId,
        title: lessonId.replace(/^custom-/, "") || "自定义课程",
        source: "custom",
        courseId: "custom",
        courseTitle: "自定义课程",
        categoryId: "6",
        categoryTitle: "自定义课程",
      };
    }
    if (source === "speed-test") {
      for (const group of state.catalog.speedTests || []) {
        for (const course of group.courses || []) {
          const lesson = (course.lessons || []).find((item) => item.lessonId === lessonId);
          if (lesson) return { ...lesson, courseId: course.courseId, courseTitle: course.title, source };
        }
      }
    }
    for (const [categoryId, groups] of Object.entries(state.catalog.courseGroups || {})) {
      for (const group of groups || []) {
        for (const course of group.courses || []) {
          const lesson = (course.lessons || []).find((item) => item.lessonId === lessonId);
          if (lesson) return { ...lesson, courseId: course.courseId, courseTitle: course.title, categoryId, categoryTitle: group.title, source: "course" };
        }
      }
    }
    return null;
  }

  function lessonsForCategory(categoryId) {
    return (state.catalog.courseGroups?.[String(categoryId)] || []).flatMap((group) =>
      (group.courses || []).flatMap((course) => course.lessons || [])
    );
  }

  function nextLessonLink(trainer) {
    const detail = trainer.detail || {};
    if (!detail.nextLessonId) return "";
    return link(`/lesson/${detail.nextLessonId}`, {
      source: trainer.source,
      courseId: detail.nextCourseId || detail.courseId || trainer.meta.courseId,
      categoryId: detail.categoryId || trainer.meta.categoryId,
    });
  }

  function toAssetUrl(url) {
    if (!url) return "";
    const mapped = state.assetMap?.[url] || (url.startsWith("/") ? state.assetMap?.[`https://lexq.local${url}`] : "");
    const value = mapped || url;
    if (value.startsWith("data/")) return `./${value}`;
    if (value.startsWith("./") || value.startsWith("http://") || value.startsWith("https://")) return value;
    if (value.startsWith("/")) return state.assetMap?.[value] ? `./${state.assetMap[value]}` : value;
    return value;
  }

  function handleClick(event) {
    unlockAudio();
    const button = event.target.closest("[data-action]");
    if (!button) {
      if (event.target.closest(".hanzi-board, .text-board-capture")) focusTrainerInputSoon();
      return;
    }
    const action = button.dataset.action;
    if (action === "toggle-setting") toggleSetting(button.dataset.key);
    if (action === "rank-page") {
      const total = Math.max(1, Math.ceil(mergedRankingRecords().length / rankPageSize()));
      state.rankPage = clamp(Number(button.dataset.page || 1), 1, total);
      render();
    }
    if (action === "select-course") {
      state.courseTabs[button.dataset.category] = button.dataset.course;
      render();
    }
    if (action === "reset-trainer") {
      if (state.trainer) {
        stopSpeechLoop();
        state.lastSpokenTarget = "";
        state.trainer.input = "";
        state.trainer.wordIndex = 0;
        state.trainer.wordStats = { completed: 0, correct: 0, chars: 0 };
        state.trainer.revealAnswer = false;
        if (state.trainer.words?.length) state.trainer.text = state.trainer.words[0].word;
        state.trainer.startedAt = null;
        state.trainer.finished = false;
        state.trainer.saved = false;
        render();
      }
    }
    if (action === "focus-trainer") {
      focusTrainerInputSoon();
      scrollCurrentCharIntoView({ force: true });
      if (state.trainer?.mode === "word" || state.trainer?.mode === "dictation") {
        setTimeout(speakCurrent, 120);
      }
    }
    if (action === "keyboard-key") handleVirtualKeyboardKey(button.dataset.keyboardKey || "");
    if (action === "speak-current") speakCurrent();
    if (action === "speak-all") speakAll();
    if (action === "toggle-loop-speech") toggleLoopSpeech();
    if (action === "reveal-word" && state.trainer) {
      state.trainer.revealAnswer = !state.trainer.revealAnswer;
      render();
    }
    if (action === "jump-word" && state.trainer?.words?.length) {
      const index = clamp(Number(button.dataset.index || 0), 0, state.trainer.words.length - 1);
      state.trainer.wordIndex = index;
      state.trainer.text = currentWordItem(state.trainer)?.word || "";
      state.trainer.input = "";
      state.trainer.revealAnswer = false;
      const item = currentWordItem(state.trainer);
      state.lastSpokenTarget = item ? `${state.trainer.lessonId}:${state.trainer.wordIndex}:${item.word}` : "";
      render();
      if (item && state.settings.autoSpeech && state.settings.speechAudio) speakWordItem(item);
    }
    if (action === "start-game") { beginGameWithCountdown(); }
    if (action === "set-game-level") {
      const lv = button.dataset.level;
      if (lv && GAME_LEVELS[lv]) {
        state.settings.gameLevel = lv;
        saveJson(STORE.settings, state.settings);
        if (state.game) {
          initGame((state.catalog.games || []).find((item) => item.id === state.game.id));
        }
        render();
      }
    }
    if (button?.dataset?.action === "contest-start-mode") {
      const m = button.dataset.mode;
      startContestMode(m);
    }
    if (button?.dataset?.action === "contest-ready") {
      if (!state.contest) initContest();
      state.contest.ready = !state.contest.ready;
      render();
      if (state.contest.phase === "lobby") maybeStartCountdown();
    }
    if (button?.dataset?.action === "contest-leave") {
      initContest();
      render();
    }
    if (button?.dataset?.action === "contest-copy-roomcode") {
      copyContestRoomCode();
    }
    if (button?.dataset?.action === "contest-join-room") {
      const inputEl = app.querySelector("[data-bind=\"contest-roomcode\"]");
      const code = (inputEl?.value || "").trim().toUpperCase();
      if (code.length === 6) joinContestRoom(code);
      else if (state.contest) { state.contest.joinInput = code; render(); }
    }
    if (button?.dataset?.action === "contest-rematch") {
      const last = state.contest;
      const lessonId = last?.selectedLessonId;
      const mode = last?.mode;
      initContest();
      if (lessonId) state.contest.selectedLessonId = lessonId;
      if (mode) startContestMode(mode);
      else render();
    }
    if (button?.dataset?.action === "contest-back-lobby") {
      const last = state.contest;
      const lessonId = last?.selectedLessonId;
      const mode = last?.mode;
      initContest();
      if (lessonId) state.contest.selectedLessonId = lessonId;
      if (mode === "history") {
        location.hash = link("/contest/history");
      } else if (mode) {
        startContestMode(mode);
      } else {
        location.hash = link("/contest");
      }
    }
    if (button?.dataset?.action === "contest-share") {
      shareContestResult();
    }
    if (button?.dataset?.action === "contest-view-history") {
      location.hash = link("/contest/history");
    }
    if (button?.dataset?.action === "contest-clear-history") {
      clearContestHistory();
      render();
    }
    if (action === "start-contest") startContest();
    if (action === "reset-contest") {
      stopContestTimer();
      initContest();
      render();
    }
    if (action === "clear-history") {
      state.history = [];
      saveJson(STORE.history, state.history);
      render();
    }
    if (action === "refresh-rank") {
      syncServerState({ includeRankings: true }).then(render);
    }
    if (action === "game-tag-filter") {
      const next = String(button.dataset.tag || "");
      state.gameTagFilter = state.gameTagFilter === next ? "" : next;
      render();
    }
    if (action === "reload-page") {
      window.location.reload();
    }
    if (action === "save-custom") saveCustomCourse();
    if (action === "practice-custom") practiceCustom(button.dataset.id);
    if (action === "delete-custom") deleteCustom(button.dataset.id);
  }

  function handleInput(event) {
    unlockAudio();
    const target = event.target;
    const bind = target.dataset.bind;
    if (isImeBind(bind) && (event.isComposing || state.composing)) {
      state.composing = true;
      state.composingBind = bind;
      commitInputValue(bind, target.value, inputCommitOptions(target, { composing: true }));
      return;
    }
    if (bind === "search") {
      state.search = target.value;
      render();
    }
    if (bind === "trainer-input") {
      updateTrainerInput(target.value);
    }
    if (bind === "trainer-cell-input") {
      updateTrainerCellInput(target.value, inputCommitOptions(target));
    }
    if (bind === "game-input") {
      updateGameInput(target.value, inputCommitOptions(target));
    }
    if (bind === "contest-roomcode") {
      state.contest.joinInput = target.value.toUpperCase();
    }
    if (bind === "contest-input") {
      updateContestInput(target.value);
    }
    if (bind === "profile-name") {
      state.profile.nickname = target.value || "学习者";
      state.session.user = { ...(state.session.user || {}), username: state.profile.nickname, nickname: state.profile.nickname };
      saveJson(STORE.profile, state.profile);
      saveJson(STORE.session, state.session);
    }
  }

  function handleCompositionStart(event) {
    if (isImeBind(event.target?.dataset?.bind)) {
      state.composing = true;
      state.composingBind = event.target.dataset.bind;
    }
  }

  function handleCompositionEnd(event) {
    const bind = event.target?.dataset?.bind;
    if (!isImeBind(bind)) return;
    state.composing = false;
    state.composingBind = "";
    const target = event.target;
    const commit = () => {
      if (!target.isConnected) return;
      commitInputValue(bind, target.value, inputCommitOptions(target));
      if (state.renderQueued) {
        state.renderQueued = false;
        render();
      }
    };
    requestAnimationFrame(() => {
      commit();
      setTimeout(commit, 36);
    });
  }

  function isImeBind(bind) {
    return bind === "trainer-input" || bind === "trainer-cell-input" || bind === "contest-input" || bind === "game-input";
  }

  function inputCommitOptions(target, extra = {}) {
    const options = { ...extra };
    if (target?.dataset?.index !== undefined) options.sourceIndex = Number(target.dataset.index);
    if (target?.dataset?.inputEpoch !== undefined) options.sourceEpoch = Number(target.dataset.inputEpoch);
    return options;
  }

  function commitInputValue(bind, value, options = {}) {
    if (bind === "trainer-input") updateTrainerInput(value, options);
    if (bind === "trainer-cell-input") updateTrainerCellInput(value, options);
    if (bind === "contest-input") updateContestInput(value, options);
    if (bind === "game-input") updateGameInput(value, options);
  }

  function handleChange(event) {
    const target = event.target;
    if (target.dataset.setting) {
      state.settings[target.dataset.setting] = target.checked;
      saveJson(STORE.settings, state.settings);
      syncSettingsToServer();
      if (target.dataset.setting === "loopSpeech" && !target.checked) stopSpeechLoop();
      if (target.dataset.setting === "loopSpeech" && target.checked) toggleLoopSpeech();
      if (target.dataset.setting === "speechAudio" && !target.checked) stopCurrentSpeech();
      if ((target.dataset.setting === "autoSpeech" || target.dataset.setting === "speechAudio") && target.checked) {
        state.lastSpokenTarget = "";
      }
      render();
    }
    if (target.dataset.settingNumber) {
      state.settings[target.dataset.settingNumber] = Number(target.value);
      saveJson(STORE.settings, state.settings);
      syncSettingsToServer();
      render();
    }
    if (target.dataset.action === "jump-category") {
      location.hash = link(`/courses/${target.value}`);
    }
    if (target.dataset.action === "contest-lesson") {
      const meta = contestLessons().find((lesson) => lesson.lessonId === target.value);
      state.contest.selectedLessonId = target.value;
      state.contest.selectedSource = meta?.source || "speed-test";
      state.contest.title = meta?.title || "";
      render();
    }
  }

  function handleKeydown(event) {
    unlockAudio();
    const bind = event.target?.dataset?.bind;
    if (bind === "trainer-cell-input" && (event.key === "Backspace" || event.key === "Delete" || event.key === "Enter")) {
      if (state.composing || event.isComposing || event.key === "Process") return;
      event.preventDefault();
      if (event.key === "Enter") updateTrainerCellInput("\n");
      else deleteTrainerCellInput();
      return;
    }
    if (state.route.parts[0] !== "games") return;
    const g = state.game;
    if (!g) return;
    if (!g.running && !g.finished && !g.countdownLeft && event.key === " " && !event.target.matches("input, textarea, button")) {
      event.preventDefault();
      beginGameWithCountdown();
      return;
    }
    if (!g.running || g.finished) return;
    if (state.composing || event.isComposing || event.key === "Process") return;
    if (event.target.matches("input, textarea")) return;
    if (g.mode === "mole" || g.mode === "defense") {
      updateGameInput((g.input || "") + event.key.toLowerCase());
    }
  }

  function updateTrainerInput(value, options = {}) {
    const trainer = state.trainer;
    if (!trainer || trainer.finished) return;
    if (state.composing || options.composing) return;
    if (!trainer.startedAt) trainer.startedAt = nowSeconds();
    if (trainer.mode === "word" || trainer.mode === "dictation") {
      updateWordTrainerInput(value, options);
      return;
    }
    const previous = trainer.input;
    trainer.input = value.slice(0, trainer.text.length);
    if (previous === trainer.input) return;
    const finished = trainer.input.length >= trainer.text.length;
    if (finished) completeTrainer(trainer);
    if (state.settings.keyAudio && trainer.input.length > previous.length) {
      keyClick(trainer.input[trainer.input.length - 1], trainer.text[trainer.input.length - 1]);
    }
    if (finished) render();
    else updateTrainerDom(trainer);
  }

  function updateTrainerCellInput(value, options = {}) {
    const trainer = state.trainer;
    if (!trainer || trainer.finished) return;
    if (state.composing || options.composing) return;
    const text = trainer.text || "";
    const base = trainer.input || "";
    const index = clamp(base.length, 0, text.length);
    if (Number.isFinite(options.sourceIndex) && options.sourceIndex !== index) return;
    if (index >= text.length) return;
    const committed = String(value || "").replaceAll("\r\n", "\n").replaceAll("\r", "\n");
    if (!committed) return;
    const previous = trainer.input;
    trainer.input = (base + committed).slice(0, text.length);
    if (!trainer.startedAt) trainer.startedAt = nowSeconds();
    const finished = trainer.input.length >= text.length;
    if (state.settings.keyAudio && trainer.input.length > previous.length) {
      const lastIndex = trainer.input.length - 1;
      keyClick(trainer.input[lastIndex], text[lastIndex]);
    }
    const editor = app.querySelector('[data-bind="trainer-cell-input"]');
    if (editor) editor.value = "";
    if (finished) completeTrainer(trainer);
    render();
  }

  function handleVirtualKeyboardKey(key) {
    if (state.route.parts[0] !== "lesson" || !shouldUseTextBoardTrainer(state.trainer)) {
      focusBindSoon(document.activeElement?.dataset?.bind || trainerFocusBind());
      return;
    }
    const normalized = String(key || "").toLowerCase();
    if (normalized === "backspace" || normalized === "delete") {
      deleteTrainerCellInput();
      return;
    }
    if (normalized === "space") {
      updateTrainerCellInput(" ");
      return;
    }
    if (normalized === "enter") {
      updateTrainerCellInput("\n");
      return;
    }
    if (key.length === 1) updateTrainerCellInput(key);
    else focusTrainerInputSoon();
  }

  function deleteTrainerCellInput() {
    const trainer = state.trainer;
    if (!trainer || trainer.finished || !shouldUseTextBoardTrainer(trainer)) return;
    const previous = trainer.input || "";
    if (!previous) {
      focusTrainerInputSoon();
      return;
    }
    trainer.input = previous.slice(0, -1);
    const editor = app.querySelector('[data-bind="trainer-cell-input"]');
    if (editor) editor.value = "";
    if (state.settings.keyAudio) playTone(220, 0.045, { gain: 0.09, type: "triangle" });
    updateTrainerDom(trainer);
  }

  function updateTrainerDom(trainer) {
    if (!trainer || trainer.mode === "word" || trainer.mode === "dictation" || state.route.parts[0] !== "lesson") return;
    const metrics = trainerMetrics(trainer);
    const current = trainer.text[trainer.input.length] || "";
    const cue = app.querySelector("[data-training-cue]");
    if (cue) cue.outerHTML = renderPinyinCue(trainer);
    const target = app.querySelector("[data-training-target]");
    if (target) {
      target.innerHTML = renderTrainingTarget(trainer);
      scrollCurrentCharIntoView({ force: true });
    }
    const status = app.querySelector("[data-training-status]");
    if (status) status.innerHTML = renderTextTrainingStatus(metrics);
    const progress = app.querySelector("[data-training-progress]");
    if (progress) progress.style.setProperty("--value", `${metrics.progress}%`);
    const toolbar = app.querySelector("[data-training-toolbar]");
    if (toolbar) toolbar.innerHTML = renderTextToolbar(metrics, current);
    const metricGrid = app.querySelector("[data-training-metrics]");
    if (metricGrid) metricGrid.innerHTML = renderTextMetricGrid(metrics);
    const keyboard = app.querySelector("[data-training-keyboard]");
    if (keyboard) keyboard.innerHTML = state.settings.showKeyboard ? renderKeyboard(current, "full") : "";
    const syncInput = app.querySelector('[data-bind="trainer-input-sync"]');
    if (syncInput) syncInput.innerHTML = trainer.input ? html(trainer.input) : `<span class="sync-placeholder">上方方格输入，这里同步显示完整内容。</span>`;
    if (!state.composing) focusBindSoon(trainerFocusBind());
  }

  function updateWordTrainerInput(value, options = {}) {
    const trainer = state.trainer;
    const item = currentWordItem(trainer);
    if (!trainer || !item) return;
    if (state.composing || options.composing) return;
    const target = item.word;
    const previous = trainer.input;
    trainer.input = value.slice(0, target.length + 2);
    if (previous === trainer.input) return;
    if (state.settings.keyAudio && trainer.input.length > previous.length) {
      keyClick(trainer.input[trainer.input.length - 1], target[trainer.input.length - 1]);
    }
    if (trainer.input.toLowerCase() === target.toLowerCase()) {
      trainer.wordStats.completed += 1;
      trainer.wordStats.chars += target.length;
      trainer.wordStats.correct += target.length;
      if (state.settings.completeAudio) playHitSound();
      advanceWordTrainer();
      return;
    }
    render();
  }

  function advanceWordTrainer() {
    const trainer = state.trainer;
    if (!trainer) return;
    if (trainer.wordIndex >= trainer.words.length - 1) {
      completeTrainer(trainer);
      render();
      return;
    }
    trainer.wordIndex += 1;
    trainer.text = currentWordItem(trainer)?.word || "";
    trainer.input = "";
    trainer.revealAnswer = false;
    const nextItem = currentWordItem(trainer);
    state.lastSpokenTarget = nextItem ? `${trainer.lessonId}:${trainer.wordIndex}:${nextItem.word}` : "";
    render();
    if (nextItem && state.settings.autoSpeech && state.settings.speechAudio) {
      speakWordItem(nextItem);
    }
  }

  function completeTrainer(trainer) {
    if (trainer.saved) return;
    trainer.finished = true;
    trainer.saved = true;
    const metrics = trainerMetrics(trainer);
    const title = trainer.detail.lessonName || trainer.meta.title || "练习";
    state.progress[trainer.lessonId] = {
      complete: true,
      speed: metrics.speed,
      accuracy: metrics.accuracy,
      updatedAt: new Date().toISOString(),
    };
    saveJson(STORE.progress, state.progress);
    saveHistory({
      mode: trainer.source === "speed-test" ? "speed-test" : "lesson",
      title,
      speed: metrics.speed,
      accuracy: metrics.accuracy,
      chars: metrics.correct,
      seconds: metrics.elapsed,
      date: new Date().toISOString(),
    });
    if (state.settings.completeAudio) playSuccessSound();
    scheduleTrainerAutoNext(trainer);
  }

  function scheduleTrainerAutoNext(trainer) {
    stopTrainerAutoNext();
    if (!state.settings.wordAutoAdvance || trainer.source === "custom") return;
    const next = nextLessonLink(trainer);
    if (!next) return;
    const lessonId = trainer.lessonId;
    trainer.autoNextScheduled = true;
    state.trainerAutoNextTimer = setTimeout(() => {
      state.trainerAutoNextTimer = null;
      if (!state.trainer || state.trainer.lessonId !== lessonId || !state.trainer.finished) return;
      location.hash = next;
    }, 1400);
  }

  function stopTrainerAutoNext() {
    if (state.trainerAutoNextTimer) {
      clearTimeout(state.trainerAutoNextTimer);
      state.trainerAutoNextTimer = null;
    }
  }

  function saveHistory(record) {
    const enriched = {
      ...record,
      username: record.username || currentUsername(),
      user_id: record.user_id || currentUserId(),
      date: record.date || new Date().toISOString(),
    };
    state.history.push(enriched);
    state.history = state.history.slice(-300);
    saveJson(STORE.history, state.history);
    syncScoreToServer(enriched);
  }

  function saveCustomCourse() {
    const title = app.querySelector('[data-bind="custom-title"]')?.value?.trim() || `自定义课程 ${state.custom.length + 1}`;
    const text = normalizeText(app.querySelector('[data-bind="custom-text"]')?.value || "").trim();
    if (!text) {
      showToast("自定义课程内容不能为空。");
      return;
    }
    state.custom.unshift({ id: crypto.randomUUID(), title, text, createdAt: new Date().toISOString() });
    saveJson(STORE.custom, state.custom);
    render();
  }

  function practiceCustom(id) {
    const item = state.custom.find((course) => course.id === id);
    if (!item) return;
    state.trainer = buildCustomTrainer(item);
    location.hash = link(`/lesson/custom-${item.id}`, { source: "custom" });
  }

  function customItemFromLessonId(lessonId) {
    const id = String(lessonId || "").replace(/^custom-/, "");
    return state.custom.find((course) => course.id === id) || null;
  }

  function buildCustomTrainer(item) {
    return {
      lessonId: `custom-${item.id}`,
      source: "custom",
      mode: "text",
      detail: { lessonName: item.title, courseName: "自定义课程", categoryTitle: "自定义课程", categoryId: "6", courseId: "custom" },
      meta: { title: item.title, courseTitle: "自定义课程", categoryTitle: "自定义课程", categoryId: "6", courseId: "custom" },
      text: normalizeText(item.text || item.title || "自定义课程"),
      words: [],
      wordIndex: 0,
      wordStats: { completed: 0, correct: 0, chars: 0 },
      revealAnswer: false,
      pinyin: [],
      input: "",
      startedAt: null,
      paused: false,
      finished: false,
      saved: false,
    };
  }

  function deleteCustom(id) {
    state.custom = state.custom.filter((course) => course.id !== id);
    saveJson(STORE.custom, state.custom);
    render();
  }

  function toggleSetting(key) {
    if (!key) return;
    state.settings[key] = !state.settings[key];
    saveJson(STORE.settings, state.settings);
    syncSettingsToServer();
    if (key === "speechAudio" && !state.settings[key]) stopCurrentSpeech();
    if (key === "autoSpeech" || key === "speechAudio") state.lastSpokenTarget = "";
    if ((key === "autoSpeech" || key === "speechAudio") && state.settings.autoSpeech && state.settings.speechAudio) scheduleAutoSpeech();
    render();
  }

  function clearRouteIntervals() {
    if (state.route.parts[0] !== "games") stopGameTimer();
    if (state.route.parts[0] !== "contest") stopContestTimer();
    if (state.route.parts[0] !== "lesson") stopSpeechLoop();
    if (state.route.parts[0] !== "lesson") stopTrainerAutoNext();
  }

  function stopGameTimer() {
    if (state.gameTimer) {
      clearInterval(state.gameTimer);
      state.gameTimer = null;
    }
  }

  function stopContestTimer() {
    if (state.contestTimer) {
      clearInterval(state.contestTimer);
      state.contestTimer = null;
    }
  }

  function showToast(message) {
    state.toast = message;
    render();
    setTimeout(() => {
      if (state.toast === message) {
        state.toast = null;
        render();
      }
    }, 2600);
  }

  function keyClick(actual, expected) {
    if (!actual) return;
    const ok = actual === expected || String(actual).toLowerCase() === String(expected || "").toLowerCase();
    if (ok) {
      playTone(760, 0.052, { gain: 0.13, type: "triangle" });
      playTone(1180, 0.04, { gain: 0.08, type: "sine", delay: 0.026 });
    } else {
      playTone(150, 0.11, { gain: 0.16, type: "sawtooth" });
    }
  }

  function playHitSound() {
    playTone(520, 0.055, { gain: 0.12, type: "square" });
    playTone(880, 0.075, { gain: 0.11, type: "triangle", delay: 0.035 });
  }

  function playSuccessSound() {
    [
      [523, 0],
      [659, 0.07],
      [784, 0.14],
      [1046, 0.22],
    ].forEach(([frequency, delay]) => playTone(frequency, 0.12, { gain: 0.12, type: "triangle", delay }));
  }

  function speakCurrent() {
    if (!state.trainer) return;
    if (state.trainer.mode === "word" || state.trainer.mode === "dictation") {
      const item = currentWordItem(state.trainer);
      if (!item) return;
      speakWordItem(item);
      return;
    }
    const index = clamp(state.trainer.input.length, 0, Math.max(0, state.trainer.text.length - 1));
    const entry = lookupPinyin(state.trainer, index);
    const char = state.trainer.text[index] || "";
    const text = entry?.pinyin ? `${char}，${entry.pinyin}` : currentSpeechSegment(state.trainer);
    speak(text || char || "完成");
  }

  function speakAll() {
    if (!state.trainer) return;
    if (state.trainer.words?.length) {
      speak(state.trainer.words.slice(0, 12).map((item) => item.word).join(". "), "en-US");
      return;
    }
    speak(state.trainer.text.slice(0, 900));
  }

  function toggleLoopSpeech() {
    if (state.speechLoopTimer) {
      stopSpeechLoop();
      state.settings.loopSpeech = false;
      saveJson(STORE.settings, state.settings);
      syncSettingsToServer();
      showToast("循环发音已关闭");
      render();
      return;
    }
    state.lastSpokenTarget = "";
    speakCurrent();
    state.speechLoopTimer = setInterval(speakCurrent, 2800);
    state.settings.loopSpeech = true;
    saveJson(STORE.settings, state.settings);
    syncSettingsToServer();
    showToast("循环发音已开启");
    render();
  }

  function stopSpeechLoop() {
    if (state.speechLoopTimer) {
      clearInterval(state.speechLoopTimer);
      state.speechLoopTimer = null;
    }
    if (state.speechAutoTimer) {
      clearTimeout(state.speechAutoTimer);
      state.speechAutoTimer = null;
    }
    stopCurrentSpeech();
  }

  function currentSpeechSegment(trainer) {
    const index = clamp(trainer.input.length, 0, Math.max(0, trainer.text.length - 1));
    const start = Math.max(0, index - 8);
    const end = Math.min(trainer.text.length, index + 18);
    return trainer.text.slice(start, end).replace(/\s+/g, " ").trim();
  }

  function warmupSpeechVoices() {
    if (!("speechSynthesis" in window)) return;
    try {
      const voices = window.speechSynthesis.getVoices();
      state.voicesReady = voices.length > 0;
      window.speechSynthesis.onvoiceschanged = () => {
        state.voicesReady = true;
      };
    } catch {
      state.voicesReady = false;
    }
  }

  function waitForVoices(timeout = 900) {
    if (!("speechSynthesis" in window)) return Promise.resolve([]);
    const current = window.speechSynthesis.getVoices();
    if (current.length) return Promise.resolve(current);
    return new Promise((resolve) => {
      const timer = setTimeout(() => resolve(window.speechSynthesis.getVoices()), timeout);
      const previous = window.speechSynthesis.onvoiceschanged;
      window.speechSynthesis.onvoiceschanged = (event) => {
        clearTimeout(timer);
        state.voicesReady = true;
        if (typeof previous === "function") previous.call(window.speechSynthesis, event);
        resolve(window.speechSynthesis.getVoices());
      };
    });
  }

  async function speak(text, langOverride = "") {
    if (!state.settings.speechAudio) {
      showToast("朗读已关闭，可在个人中心或练习设置中打开。");
      return;
    }
    const content = String(text || "").trim();
    if (!content) return;
    const lang = langOverride || (/[\u3400-\u9fff]/.test(content) ? "zh-CN" : "en-US");
    stopCurrentSpeech();
    const serviceOk = await speakViaService(content, lang);
    if (!serviceOk) await speakViaBrowser(content, lang);
  }

  async function speakViaService(content, lang) {
    if (!state.ttsServiceAvailable) return false;
    if (Date.now() < state.ttsUnavailableUntil) return false;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4500);
    try {
      const response = await fetch(apiUrl("/tts").toString(), {
        method: "POST",
        signal: controller.signal,
        headers: { "Content-Type": "application/json", Accept: "audio/mpeg,audio/wav,audio/*,application/json" },
        body: JSON.stringify({
          text: content.slice(0, 900),
          lang,
          rate: Number(state.settings.speechRate || 0.9),
          token: state.session.token || "",
        }),
      });
      clearTimeout(timeout);
      if (!response.ok) {
        if ([404, 501, 503].includes(response.status)) state.ttsUnavailableUntil = Date.now() + 120000;
        return false;
      }
      const blob = await response.blob();
      if (!blob.size) return false;
      const audioUrl = URL.createObjectURL(blob);
      const audio = new Audio(audioUrl);
      audio.preload = "auto";
      audio.volume = 1;
      state.activeAudio = audio;
      state.activeAudioUrl = audioUrl;
      audio.onended = () => {
        if (state.activeAudioUrl === audioUrl) {
          URL.revokeObjectURL(audioUrl);
          state.activeAudioUrl = "";
          state.activeAudio = null;
        }
      };
      return await audio.play().then(
        () => true,
        () => {
          URL.revokeObjectURL(audioUrl);
          state.activeAudio = null;
          state.activeAudioUrl = "";
          return false;
        }
      );
    } catch {
      clearTimeout(timeout);
      state.ttsUnavailableUntil = Date.now() + 30000;
      return false;
    }
  }

  async function speakViaBrowser(content, lang) {
    if (!("speechSynthesis" in window)) {
      showToast("当前浏览器没有可用朗读引擎。");
      return;
    }
    await waitForVoices();
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(content);
    utterance.lang = lang;
    utterance.rate = Number(state.settings.speechRate || 0.9);
    utterance.voice = selectBrowserVoice(lang);
    window.speechSynthesis.speak(utterance);
    window.speechSynthesis.resume?.();
  }

  function selectBrowserVoice(lang) {
    const voices = window.speechSynthesis.getVoices();
    const lowerLang = lang.toLowerCase();
    const candidates = voices
      .filter((voice) => voice.lang?.toLowerCase().startsWith(lowerLang) || voice.lang?.toLowerCase().startsWith(lowerLang.slice(0, 2)))
      .map((voice) => {
        const name = `${voice.name || ""} ${voice.voiceURI || ""}`.toLowerCase();
        let score = 0;
        if (name.includes("xiaoxiao") || name.includes("xiaoyi") || name.includes("huihui") || name.includes("yaoyao")) score += 8;
        if (name.includes("female") || name.includes("woman") || name.includes("girl")) score += 5;
        if (name.includes("microsoft") || name.includes("edge") || name.includes("natural")) score += 4;
        if (voice.localService) score += 1;
        return { voice, score };
      })
      .sort((a, b) => b.score - a.score);
    return candidates[0]?.voice || voices.find((voice) => voice.lang?.toLowerCase().startsWith(lowerLang.slice(0, 2))) || null;
  }

  function stopCurrentSpeech() {
    if (state.activeAudio) {
      state.activeAudio.pause();
      state.activeAudio = null;
    }
    if (state.activeAudioUrl) {
      URL.revokeObjectURL(state.activeAudioUrl);
      state.activeAudioUrl = "";
    }
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  }

  async function speakWordItem(item) {
    if (!item) return;
    if (await playWordAudio(item)) return;
    const chunks = [item.word];
    if (state.trainer?.mode === "dictation" && item.translation) chunks.push(item.translation);
    speak(chunks.join(". "), "en-US");
  }

  async function playWordAudio(item) {
    if (!state.settings.speechAudio) return false;
    const word = String(item?.word || "").trim();
    if (!word || /[\u3400-\u9fff]/.test(word)) return false;
    if (!state.audioMap || !Object.keys(state.audioMap).length) {
      await ensureWordAudioMapLoaded();
    }
    const urls = wordAudioCandidates(item, word);
    for (const url of urls) {
      try {
        if (await playAudioUrl(url)) return true;
      } catch {
        // Try the next source, then fall back to TTS/browser speech.
      }
    }
    return false;
  }

  function wordAudioCandidates(item, word) {
    const key = word.toLowerCase();
    const mapped = state.audioMap?.[key] || state.audioMap?.[word] || "";
    const urls = [];
    if (mapped) urls.push(mapped.startsWith("data/") ? `./${mapped}` : mapped);
    if (item.localAudio) urls.push(toAssetUrl(item.localAudio));
    urls.push(apiUrl("/word-audio", { word }).toString());
    if (ALLOW_EXTERNAL_WORD_AUDIO_FALLBACK) {
      urls.push(`https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(word)}&type=2`);
      urls.push(`https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(word)}&type=1`);
      urls.push(`https://fanyi.baidu.com/gettts?lan=en&text=${encodeURIComponent(word)}&spd=3&source=web`);
    }
    return [...new Set(urls.filter(Boolean))];
  }

  async function playAudioUrl(url) {
    stopCurrentSpeech();
    return new Promise((resolve) => {
      const audio = new Audio(url);
      audio.preload = "auto";
      audio.volume = 1;
      let settled = false;
      const done = (ok) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        if (!ok && state.activeAudio === audio) state.activeAudio = null;
        resolve(ok);
      };
      const timer = setTimeout(() => done(false), 5200);
      state.activeAudio = audio;
      audio.onended = () => {
        if (state.activeAudio === audio) state.activeAudio = null;
      };
      audio.onerror = () => done(false);
      audio.play().then(() => done(true), () => done(false));
    });
  }

  async function playAudioBlob(blob) {
    const audioUrl = URL.createObjectURL(blob);
    const audio = new Audio(audioUrl);
    audio.preload = "auto";
    audio.volume = 1;
    state.activeAudio = audio;
    state.activeAudioUrl = audioUrl;
    audio.onended = () => {
      if (state.activeAudioUrl === audioUrl) {
        URL.revokeObjectURL(audioUrl);
        state.activeAudioUrl = "";
        state.activeAudio = null;
      }
    };
    return await audio.play().then(
      () => true,
      () => {
        URL.revokeObjectURL(audioUrl);
        state.activeAudioUrl = "";
        state.activeAudio = null;
        return false;
      }
    );
  }

  function scheduleAutoSpeech() {
    const trainer = state.trainer;
    if (!trainer || trainer.finished || !state.settings.autoSpeech || !state.settings.speechAudio) return;
    if (trainer.mode !== "word" && trainer.mode !== "dictation") return;
    const item = currentWordItem(trainer);
    if (!item) return;
    const key = `${trainer.lessonId}:${trainer.wordIndex}:${item.word}`;
    if (state.lastSpokenTarget === key || state.speechAutoTimer) return;
    state.lastSpokenTarget = key;
    state.speechAutoTimer = setTimeout(() => {
      state.speechAutoTimer = null;
      speakWordItem(item);
    }, 420);
  }

  function beep(frequency, duration) {
    playTone(frequency, duration, { gain: 0.13, type: "triangle" });
  }

  function unlockAudio() {
    if (!window.AudioContext && !window.webkitAudioContext) return;
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!state.audioContext) state.audioContext = new Audio();
    if (state.audioContext.state === "suspended") {
      state.audioContext.resume().catch(() => {});
    }
  }

  function playTone(frequency, duration, options = {}) {
    if (!window.AudioContext && !window.webkitAudioContext) return;
    unlockAudio();
    const context = state.audioContext;
    if (!context) return;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const delay = Number(options.delay || 0);
    const start = context.currentTime + delay;
    const end = start + duration;
    oscillator.frequency.value = frequency;
    oscillator.type = options.type || "sine";
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(Number(options.gain || 0.12), start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, Math.max(start + 0.02, end));
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(start);
    oscillator.stop(end + 0.02);
  }

  function randomItem(items) {
    return items[Math.floor(Math.random() * items.length)];
  }

  function rand(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function currentWordItem(trainer = state.trainer) {
    if (!trainer?.words?.length) return null;
    return trainer.words[clamp(Number(trainer.wordIndex || 0), 0, trainer.words.length - 1)] || null;
  }

  function maskedWord(word) {
    const text = String(word || "");
    if (!text) return "";
    return text
      .split("")
      .map((char, index) => {
        if (index === 0 || char === " " || char === "-") return char;
        return "—";
      })
      .join(" ");
  }

  function formatClock(seconds) {
    const value = Math.max(0, Number(seconds || 0));
    const minutes = Math.floor(value / 60);
    const rest = value % 60;
    return `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
  }

  function currentUsername() {
    return (
      state.session.user?.username ||
      state.session.user?.nickname ||
      state.profile.nickname ||
      "学习者"
    );
  }

  function currentUserId() {
    return state.session.user?.id || state.session.user?.user_id || "";
  }

  function bestGameScore() {
    return primaryHistoryRecords().filter((item) => item.mode === "game").reduce((max, item) => Math.max(max, Number(item.speed || 0)), 0);
  }

  function modeLabel(mode) {
    return (
      {
        lesson: "课程练习",
        "speed-test": "打字测试",
        game: "打字游戏",
        contest: "打字比赛",
        custom: "自定义课程",
      }[mode] || mode
    );
  }  function gameStatsByMode() {
    const games = (state.history || []).filter((item) => item && (item.mode === "game" || item.source === "game"));
    const byMode = {};
    for (const item of games) {
      const id = String(item.source || item.game_id || item.title || "game").toLowerCase();
      const score = Number(item.speed || 0);
      const acc = Number(item.accuracy || 0);
      const prev = byMode[id] || { bestScore: 0, bestAccuracy: 0, plays: 0, lastPlayed: 0 };
      prev.plays += 1;
      if (score > prev.bestScore) prev.bestScore = score;
      if (acc > prev.bestAccuracy) prev.bestAccuracy = acc;
      const ts = item.date ? new Date(item.date).getTime() : 0;
      if (ts > prev.lastPlayed) prev.lastPlayed = ts;
      byMode[id] = prev;
    }
    return byMode;
  }

  function gameStatsFor(game) {
    if (!game) return null;
    const all = gameStatsByMode();
    const candidates = [game.id, game.title].filter(Boolean).map((key) => String(key).toLowerCase());
    for (const key of candidates) {
      if (all[key]) return all[key];
    }
    return null;
  }

  async function syncGameLeaderboardFromServer() {
    try {
      const payload = await apiGet("/rankings", { limit: 50, mode: "game" });
      if (payload && Array.isArray(payload.rankings)) {
        state.gameLeaderboard = payload.rankings;
        return;
      }
    } catch {
      // fall through to local fallback
    }
    const local = (state.history || [])
      .filter((item) => item && (item.mode === "game" || item.source === "game"))
      .sort((a, b) => Number(b.speed || 0) - Number(a.speed || 0))
      .slice(0, 10);
    state.gameLeaderboard = local;
  }
  function bestAccuracyFromSpeedTestHistory() {
    const records = (state.history || []).filter((item) => item && (item.mode === "speed-test" || item.source === "speed-test"));
    if (!records.length) return 0;
    const top = records.reduce((acc, item) => {
      const accuracy = Number(item.accuracy || 0);
      const speed = Number(item.speed || 0);
      if (speed > Number(acc.speed || 0)) return item;
      if (speed === Number(acc.speed || 0) && accuracy > Number(acc.accuracy || 0)) return item;
      return acc;
    }, records[0]);
    return Number(top && top.accuracy || 0).toFixed(1);
  }

  function renderSpeedTestPersonalCard() {
    if (!state.session.token) return "";
    const apiOnline = state.apiOnline ? "数据已同步" : "本地记录";
    const bestSpeed = Number(state.speedTestBest || 0);
    const rank = state.speedTestRank ? "#" + state.speedTestRank : "—";
    const total = Number(state.speedTestTotal || 0);
    const bestAccuracy = bestAccuracyFromSpeedTestHistory();
    const rankLine = state.speedTestRank
      ? '<p class="tiny">恭喜！你已进入全球前 ' + state.speedTestRank + ' 名。</p>'
      : '<p class="tiny">完成一次测速后自动生成个人最佳与全球排名。</p>';
    return [
      '      <section class="panel speed-test-personal">',
      '        <div class="speed-test-personal-head">',
      '          <h3>我的速度测试</h3>',
      '          <span class="tag">' + apiOnline + '</span>',
      '        </div>',
      '        <div class="metric-grid">',
      '          ' + metric("个人最佳", bestSpeed, "字/分"),
      '          ' + metric("全球排名", rank, ""),
      '          ' + metric("参与次数", total, "次"),
      '          ' + metric("最佳准确率", bestAccuracy, "%"),
      '        </div>',
      '        ' + rankLine,
      '      </section>',
    ].join("\r\n");
  }

  function renderSpeedTestLeaderboardPanel() {
    const rows = state.speedTestLeaderboard || [];
    const empty = '<div class="empty">暂无全球测速记录，欢迎推荐朋友一起来挑战。</div>';
    const body = rows.length
      ? '<ol class="rank-list-mini">' + rows.slice(0, 8).map((item, idx) => {
          const name = html(String(item.username || "学习者"));
          const speed = Number(item.speed || 0).toFixed(1);
          const acc = Number(item.accuracy || 0).toFixed(1);
          const meId = state.session && state.session.user && state.session.user.id;
          const isMe = meId && item.user_id && String(item.user_id) === String(meId);
          return [
            '            <li class="rank-row' + (isMe ? ' rank-row-me' : '') + '">',
            '              <span class="rank-no">#' + (idx + 1) + '</span>',
            '              <span class="rank-name">' + name + '</span>',
            '              <span class="rank-speed">' + speed + ' 字/分</span>',
            '              <span class="rank-acc">' + acc + '%</span>',
            '            </li>',
          ].join("\r\n");
        }).join("") + '</ol>'
      : empty;
    return [
      '      <section class="panel speed-test-leaderboard">',
      '        <div class="speed-test-leaderboard-head">',
      '          <h3>全球测速榜</h3>',
      '          <span class="tag">前 ' + Math.min(8, rows.length) + ' 名</span>',
      '        </div>',
      '        ' + body,
      '        <p class="tiny">在上方选一篇文章开始挑战，后台自动上报 WPM 与准确率。</p>',
      '      </section>',
    ].join("\r\n");
  }

})();
