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
  };

  const API_ROOT = "/api/typing";

  const GAME_WORDS = {
    english: [
      "duck",
      "typing",
      "speed",
      "focus",
      "planet",
      "keyboard",
      "river",
      "future",
      "lesson",
      "rocket",
      "memory",
      "window",
      "forest",
      "practice",
      "winner",
      "target",
    ],
    chars: "asdfjkl;qwertyuiopzxcvbnm1234567890".split(""),
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
    ],
    raceText:
      "春天来了，阳光透过稀疏的云层洒在大地上。保持节奏，减少错误，速度自然会稳定提升。",
    immersive:
      "The best typing practice is calm, repeatable and honest. Keep your eyes on the text, let your hands find the keys, and correct mistakes without rushing.",
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
    serverHistory: [],
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
    session: loadJson(STORE.session, { token: "", source: "school", user: null }),
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
    app.addEventListener("keydown", handleKeydown);
    app.addEventListener("compositionstart", handleCompositionStart);
    app.addEventListener("compositionend", handleCompositionEnd);
    window.addEventListener("error", handleRuntimeError);
    window.addEventListener("unhandledrejection", handleRuntimeError);
    warmupSpeechVoices();

    try {
      importExternalSession();
      const [catalog, assetMap, audioMap] = await Promise.all([
        fetch(`./data/catalog.json?ts=${Date.now()}`).then((response) => response.json()),
        loadAssetMap(),
        loadWordAudioMap(),
      ]);
      state.catalog = catalog;
      state.assetMap = assetMap;
      state.audioMap = audioMap;
      await syncServerState();
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

  async function loadAssetMap() {
    try {
      const response = await fetch(`./data/asset-map.json?ts=${Date.now()}`);
      if (!response.ok) return {};
      const payload = await response.json();
      return payload && typeof payload === "object" ? payload : {};
    } catch {
      return {};
    }
  }

  async function loadWordAudioMap() {
    try {
      const response = await fetch(`./data/audio/word-audio-map.json?ts=${Date.now()}`);
      if (!response.ok) return {};
      const payload = await response.json();
      return payload && typeof payload === "object" ? payload : {};
    } catch {
      return {};
    }
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

  async function syncServerState() {
    try {
      const health = await apiGet("/health");
      state.apiOnline = Boolean(health?.ok);
      state.ttsServiceAvailable = Boolean(health?.tts);
      if (!state.apiOnline) return;

      await syncSessionToServer();
      const rankings = await apiGet("/rankings", { limit: 120 });
      state.remoteRankings = Array.isArray(rankings?.rankings) ? rankings.rankings : [];

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

  async function syncHistoryFromServer() {
    const params = {
      token: state.session.token,
      user_id: currentUserId(),
      username: currentUsername(),
      limit: 120,
    };
    const payload = await apiGet("/history", params);
    state.serverHistory = Array.isArray(payload?.history) ? payload.history : [];
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
      const payload = await apiPost("/scores", {
        ...record,
        token: state.session.token,
        user_id: currentUserId(),
        username: currentUsername(),
      });
      if (Array.isArray(payload?.rankings)) {
        state.remoteRankings = payload.rankings;
      }
      if (Array.isArray(payload?.history)) state.serverHistory = payload.history;
      else if (state.session.token) await syncHistoryFromServer();
      render();
    } catch {
      state.apiOnline = false;
    }
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
      focusBindSoon("trainer-input");
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
    return renderNotFound();
  }

  function renderHome() {
    const stats = state.catalog.stats || {};
    const history = primaryHistoryRecords();
    const done = history.length;
    const best = history.reduce((max, item) => Math.max(max, Number(item.speed || 0)), 0);
    return `
      <section class="hero-band">
        <div class="hero-copy">
          <span class="eyebrow">LEQIXIANG TYPING LAB</span>
          <h1>乐启享打字训练中心</h1>
          <p>面向课堂和比赛场景的打字训练平台，覆盖指法、中文、英文、编程、数字录入、单词朗读默写、速度测试和排行榜。</p>
          <div class="tag-row">
            <a class="pill-button" href="${link("/courses")}">开始练习</a>
            <a class="ghost-button" href="${link("/games")}">玩游戏</a>
            <a class="ghost-button" href="${link("/contest")}">进入比赛</a>
          </div>
        </div>
        <div class="hero-stats">
          <div class="stat-tile"><span>课程分类</span><strong>${stats.categories || 0}</strong></div>
          <div class="stat-tile"><span>课时索引</span><strong>${stats.lessons || 0}</strong></div>
          <div class="stat-tile"><span>训练记录</span><strong>${done}</strong></div>
          <div class="stat-tile"><span>最佳速度</span><strong>${best}</strong></div>
        </div>
      </section>
      <section class="section-title">
        <div>
          <h2>入口</h2>
          <p>课程训练、游戏闯关、听音默写、竞赛排行统一入口。</p>
        </div>
      </section>
      <div class="grid category-grid">
        ${quickEntry("打字练习", "系统课程、章节、课时练习、键盘提示", "/courses", "键")}
        ${quickEntry("打字测试", "中文文章、英文文章、速度和准确率统计", "/speed-test", "速")}
        ${quickEntry("打字游戏", "射击、竞速、闯关、地鼠等互动玩法", "/games", "玩")}
        ${quickEntry("打字比赛", "房间、倒计时、同步竞速和成绩榜", "/contest", "赛")}
      </div>
      ${renderRecentHistory()}
    `;
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
    if (!state.trainer || state.trainer.lessonId !== lessonId || state.trainer.source !== source || String(state.trainer.meta?.categoryId || "") !== String(meta.categoryId || "")) {
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
      const detail = await loadLessonDetail(lessonId);
      state.trainer = buildTrainer(detail, meta, source);
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
    const backLink = trainer.source === "speed-test" ? link("/speed-test") : link(`/courses/${trainer.detail.categoryId || trainer.meta.categoryId || ""}`);
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
          <textarea class="typing-input training-input ${textBoard ? "hanzi-capture text-board-capture" : ""}" data-bind="trainer-input" lang="zh-CN" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="点击这里或按键开始，中文输入法可直接上屏..." ${trainer.finished ? "readonly" : ""}>${html(trainer.input)}</textarea>
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
    const compactRows = typeof window !== "undefined" && window.innerHeight <= 820;
    const perRow = chinese ? 20 : compactRows ? 24 : 28;
    const text = trainer.text || "";
    const inputLength = clamp((trainer.input || "").length, 0, text.length);
    const totalRows = Math.max(1, Math.ceil(text.length / perRow));
    const activeRow = clamp(Math.floor(inputLength / perRow), 0, totalRows - 1);
    const visibleRows = compactRows ? 2 : 3;
    const startRow = clamp(activeRow <= 1 ? 0 : activeRow - 1, 0, Math.max(0, totalRows - visibleRows));
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
      const currentAttr = current ? ' data-current="true"' : "";
      const value = mode === "input" ? actual : expected;
      return `<span class="${cls}" data-index="${index}"${currentAttr}>${html(displayHanziCell(value))}</span>`;
    }).join("");
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
      ${metric("用时", `${metrics.elapsed}`, "秒")}
      ${metric("进度", `${metrics.progress}%`, "")}
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
                  .map((char) => `<span class="key ${char === key ? "active" : ""}">${html(char)}</span>`)
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
                .map(([char, label, span = 1]) => `<span class="key ${char === key ? "active" : ""}" style="--span:${span}">${label}</span>`)
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
    return `
      <div class="settings-mini" aria-label="练习设置">
        <div class="settings-mini-title">练习设置</div>
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
      <section class="section-title">
        <div>
          <h2>打字测试</h2>
          <p>选择中文或英文测试文章，完成后保存速度、准确率和用时。</p>
        </div>
      </section>
      ${speedTests
        .map(
          (group) => `
            ${(group.courses || [])
              .map(
                (course) => `
                  <section class="panel" style="margin-bottom:16px">
                    <div class="section-title" style="margin-top:0">
                      <div><h3>${html(course.title)}</h3><p>共 ${(course.lessons || []).length} 篇文章</p></div>
                    </div>
                    <div class="grid course-grid">
                      ${(course.lessons || [])
                        .map((lesson) => {
                          const progress = state.progress[lesson.lessonId];
                          return `
                            <a class="card" href="${link(`/lesson/${lesson.lessonId}`, { source: "speed-test", courseId: course.courseId })}">
                              <div class="card-title-row">
                                <span class="lesson-index">${lesson.index}</span>
                                <strong>${progress?.speed || 0}</strong>
                              </div>
                              <h3>${html(lesson.title)}</h3>
                              <p class="tiny">${progress?.complete ? `最佳 ${progress.speed} 字/分 · ${progress.accuracy}%` : "未测试"}</p>
                            </a>
                          `;
                        })
                        .join("")}
                    </div>
                  </section>
                `
              )
              .join("")}
          `
        )
        .join("")}
    `;
  }

  function renderGames() {
    const games = state.catalog.games || [];
    return `
      <section class="hero-band">
        <div class="hero-copy">
          <span class="eyebrow">GAME ZONE</span>
          <h1>打字游戏专区</h1>
          <p>8 个互动玩法覆盖射击、竞速、闯关、地鼠、守卫、沉浸、跳跃和捕鱼，训练反应与准确率。</p>
        </div>
        <div class="hero-stats">
          <div class="stat-tile"><span>玩法</span><strong>${games.length}</strong></div>
          <div class="stat-tile"><span>最高分</span><strong>${bestGameScore()}</strong></div>
        </div>
      </section>
      <section class="section-title">
        <div><h2>游戏列表</h2><p>点击进入互动训练。</p></div>
      </section>
      <div class="grid game-grid">
        ${games.map(renderGameCard).join("")}
      </div>
    `;
  }

  function renderGameCard(game) {
    return `
      <a class="card" href="${link(`/games/${game.id}`)}">
        <div class="card-media">${game.image ? `<img src="${html(toAssetUrl(game.image))}" alt="${html(game.title)}">` : ""}</div>
        <h3>${html(game.title)}</h3>
        <div class="tag-row">${(game.tags || []).map((tag) => `<span class="tag">${html(tag)}</span>`).join("")}</div>
        <p class="tiny">适合课堂快速热身和反应训练</p>
      </a>
    `;
  }

  function renderGameRoute(gameId) {
    const game = (state.catalog.games || []).find((item) => item.id === gameId);
    if (!game) return renderNotFound();
    if (!state.game || state.game.id !== gameId) initGame(game);
    return renderGame(game);
  }

  function initGame(game) {
    stopGameTimer();
    state.game = {
      id: game.id,
      mode: game.mode,
      title: game.title,
      running: false,
      finished: false,
      score: 0,
      health: 5,
      timeLeft: 60,
      input: "",
      targets: [],
      progress: 0,
      text: game.mode === "immersive" ? GAME_WORDS.immersive : GAME_WORDS.raceText,
      startedAt: null,
    };
  }

  function renderGame(game) {
    const g = state.game;
    const raceMode = isRaceMode(g.mode);
    return `
      <section class="section-title">
        <div>
          <h2>${html(game.title)}</h2>
          <p>${(game.tags || []).map(html).join(" / ")} · 互动训练</p>
        </div>
        <div class="tag-row">
          <a class="ghost-button" href="${link("/games")}">返回游戏</a>
          <button class="solid-button" data-action="start-game">${g.running ? "重新开始" : "开始"}</button>
        </div>
      </section>
      <section class="panel">
        <div class="game-hud">
          <div class="tag-row" data-game-hud>${renderGameHud(g)}</div>
          ${
            raceMode
              ? `<textarea class="field game-input race-input" data-bind="game-input" lang="zh-CN" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="照着下方文字输入，系统会即时标红错字" ${!g.running || g.finished ? "disabled" : ""}>${html(g.input)}</textarea>`
              : `<input class="field game-input" data-bind="game-input" value="${html(g.input)}" lang="zh-CN" inputmode="text" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="输入目标后自动命中，中文可直接输入" ${!g.running || g.finished ? "disabled" : ""}>`
          }
        </div>
        ${renderGameStage(game, g)}
        ${g.finished ? `<div class="empty" style="margin-top:12px">游戏结束，得分 ${g.score} 已保存。</div>` : ""}
      </section>
    `;
  }

  function renderGameHud(g) {
    const race = isRaceMode(g.mode) ? raceStats(g) : null;
    return `
      <span class="tag">分数 ${g.score}</span>
      <span class="tag">时间 ${g.timeLeft}s</span>
      <span class="tag">生命 ${g.health}</span>
      ${race ? `<span class="tag">正确 ${race.correctPrefix}/${g.text.length}</span><span class="tag">准确率 ${race.accuracy}%</span>` : ""}
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

  function renderGameStage(game, g) {
    if (isRaceMode(game.mode)) {
      const stats = raceStats(g);
      return `
        <div class="race-track">
          <div class="track" data-game-track><span class="car" style="--value:${stats.progress}%">车</span></div>
          <div class="race-feedback" data-game-feedback>${renderRaceFeedback(g, stats)}</div>
          <div class="typing-target" data-game-target>${renderTargetText(g.text, g.input)}</div>
        </div>
      `;
    }
    if (game.mode === "mole") {
      const holes = Array.from({ length: 12 }, (_, index) => g.targets.find((target) => target.slot === index));
      return `
        <div class="game-stage">
          <div class="mole-grid">
            ${holes
              .map((target) => `<div class="mole-hole ${target ? "active" : ""}">${target ? html(target.label) : ""}</div>`)
              .join("")}
          </div>
        </div>
      `;
    }
    return `
      <div class="game-stage">
        ${g.targets
          .map(
            (target) =>
              `<span class="target-chip ${target.y > 74 ? "danger" : ""}" style="--x:${target.x}%; --y:${target.y}%">${html(target.label)}</span>`
          )
          .join("")}
      </div>
    `;
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

  function spawnTarget(mode) {
    const g = state.game;
    if (!g) return;
    if (mode === "mole") {
      const used = new Set(g.targets.map((target) => target.slot));
      const slots = Array.from({ length: 12 }, (_, index) => index).filter((slot) => !used.has(slot));
      if (!slots.length) return;
      const label = randomItem(GAME_WORDS.chars);
      g.targets.push({ id: crypto.randomUUID(), label, answer: label, slot: randomItem(slots), ttl: 5 });
      return;
    }
    if (mode === "fighter") {
      const [label, answer] = randomItem(GAME_WORDS.pinyin);
      g.targets.push({ id: crypto.randomUUID(), label, answer, x: rand(5, 86), y: rand(2, 18), speed: 9 });
      return;
    }
    const wordPool = mode === "defense" ? GAME_WORDS.chars : GAME_WORDS.english;
    const label = randomItem(wordPool);
    g.targets.push({ id: crypto.randomUUID(), label, answer: label, x: rand(5, 86), y: rand(2, 18), speed: rand(7, 13) });
  }

  function tickGame(mode) {
    const g = state.game;
    if (!g || !g.running || g.finished) return;
    g.timeLeft -= 1;
    if (mode === "mole") {
      g.targets.forEach((target) => (target.ttl -= 1));
      const misses = g.targets.filter((target) => target.ttl <= 0).length;
      g.targets = g.targets.filter((target) => target.ttl > 0);
      g.health -= misses;
      while (g.targets.length < 4) spawnTarget(mode);
    } else {
      g.targets.forEach((target) => (target.y += target.speed));
      const misses = g.targets.filter((target) => target.y > 92).length;
      g.targets = g.targets.filter((target) => target.y <= 92);
      g.health -= misses;
      while (g.targets.length < 6) spawnTarget(mode);
    }
    if (g.timeLeft <= 0 || g.health <= 0) finishGame();
  }

  function updateGameInput(value, options = {}) {
    const g = state.game;
    if (!g || !g.running || g.finished) return;
    if (state.composing || options.composing) return;
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
    const raw = value.trim();
    const normalized = raw.toLowerCase();
    const hit = g.targets.find((target) => targetMatches(target, raw, normalized));
    if (hit) {
      g.targets = g.targets.filter((target) => target.id !== hit.id);
      g.score += 10 + Math.max(0, g.timeLeft);
      g.input = "";
      if (state.settings.keyAudio) playHitSound();
    }
    render();
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
    saveHistory({
      mode: "game",
      title: g.title,
      speed: g.score,
      accuracy: Math.max(0, g.health) * 20,
      chars: g.score,
      seconds: Math.max(1, 60 - g.timeLeft),
      date: new Date().toISOString(),
    });
    if (state.settings.completeAudio) playSuccessSound();
    renderWhenInputSafe();
  }

  function renderContest() {
    if (!state.contest) initContest();
    const contest = state.contest;
    return `
      <section class="section-title contest-title">
        <div>
          <h2>打字比赛</h2>
          <p>创建比赛房间，选择文章，和对手同步竞速。</p>
        </div>
      </section>
      <div class="contest-grid">
        <aside class="panel contest-settings-panel">
          <h3>比赛设置</h3>
          <label class="tiny">选择文章</label>
          <select class="field" data-action="contest-lesson" ${contest.running ? "disabled" : ""}>
            ${contestLessonOptions(contest.selectedLessonId)}
          </select>
          <div class="tag-row" style="margin-top:12px">
            <button class="solid-button" data-action="start-contest">${contest.running ? "重新开始" : "开始比赛"}</button>
            <button class="ghost-button" data-action="reset-contest">重置</button>
          </div>
          <div class="rank-list" data-contest-rivals style="margin-top:16px">
            ${renderContestRivals(contest)}
          </div>
        </aside>
        <section class="panel contest-main-panel">
          <div class="game-hud" data-contest-hud>
            ${renderContestHud(contest)}
          </div>
          <div class="typing-target contest-target" data-contest-target>${contest.text ? renderTargetText(contest.text, contest.input) : "请选择文章并开始比赛。"}</div>
          <textarea class="typing-input contest-input" data-bind="contest-input" lang="zh-CN" autocomplete="off" spellcheck="false" ${!contest.running || contest.finished ? "readonly" : ""} placeholder="比赛开始后输入，中文输入法可直接上屏...">${html(contest.input)}</textarea>
          ${contest.finished ? `<div class="empty" style="margin-top:12px">比赛结束，成绩已进入荣誉榜。</div>` : ""}
        </section>
      </div>
    `;
  }

  function renderContestHud(contest) {
    return `
      <div class="tag-row">
        <span class="tag">倒计时 ${contest.timeLeft}s</span>
        <span class="tag">进度 ${contestProgress(contest)}%</span>
        <span class="tag">速度 ${contestMetrics(contest).speed} 字/分</span>
        ${contest.roomId ? `<span class="tag">房间 ${html(contest.roomId)}</span>` : ""}
      </div>
    `;
  }

  function renderContestRivals(contest) {
    return contest.rivals
      .map(
        (rival) => `
          <div>
            <div class="split-row"><strong>${html(rival.name)}</strong><span>${rival.progress}%</span></div>
            <div class="progress" style="--value:${rival.progress}%"><i></i></div>
          </div>
        `
      )
      .join("");
  }

  function initContest() {
    const options = contestLessons();
    state.contest = {
      selectedLessonId: options[0]?.lessonId || "",
      selectedSource: options[0]?.source || "speed-test",
      text: "",
      title: options[0]?.title || "打字比赛",
      input: "",
      running: false,
      finished: false,
      timeLeft: 90,
      startedAt: null,
      rivals: [
        { name: "闪电同学", progress: 0, pace: 1.15 },
        { name: "稳稳同学", progress: 0, pace: 0.85 },
        { name: "冲刺同学", progress: 0, pace: 1.0 },
      ],
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

  async function startContest() {
    const contest = state.contest;
    const meta = contestLessons().find((lesson) => lesson.lessonId === contest.selectedLessonId);
    if (!meta) return;
    stopContestTimer();
    let detail = null;
    try {
      detail = await loadLessonDetail(meta.lessonId);
    } catch {
      detail = null;
    }
    const text = composeLessonText(detail?.data || {}, meta);
    Object.assign(contest, {
      text,
      title: meta.title,
      input: "",
      running: true,
      finished: false,
      timeLeft: 90,
      startedAt: nowSeconds(),
      rivals: contest.rivals.map((rival) => ({ ...rival, progress: 0 })),
    });
    state.suppressAutoScrollUntil = Date.now() + 600;
    syncContestRoom(contest, meta);
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

  async function syncContestRoom(contest, meta) {
    if (!state.apiOnline) return;
    try {
      await syncSessionToServer();
      const payload = await apiPost("/contest/rooms", {
        token: state.session.token,
        username: currentUsername(),
        title: contest.title,
        lessonId: meta?.lessonId || contest.selectedLessonId,
        courseId: meta?.courseId || "",
        source: meta?.source || contest.selectedSource,
      });
      if (payload?.room?.id) {
        contest.roomId = payload.room.id;
        updateContestDom({ updateTarget: false });
      }
    } catch {
      state.apiOnline = false;
    }
  }

  function tickContest() {
    const contest = state.contest;
    if (!contest || !contest.running || contest.finished) return;
    contest.timeLeft -= 1;
    contest.rivals = contest.rivals.map((rival) => ({
      ...rival,
      progress: clamp(rival.progress + Math.round(rand(1, 4) * rival.pace), 0, 100),
    }));
    if (contest.timeLeft <= 0 || contestProgress(contest) >= 100) finishContest();
    else updateContestDom({ updateTarget: false });
  }

  function updateContestInput(value, options = {}) {
    const contest = state.contest;
    if (!contest || !contest.running || contest.finished) return;
    if (state.composing || options.composing) return;
    const previous = contest.input;
    contest.input = String(value || "").slice(0, contest.text.length);
    if (previous === contest.input) return;
    if (state.settings.keyAudio && contest.input.length > previous.length) {
      keyClick(contest.input[contest.input.length - 1], contest.text[contest.input.length - 1]);
    }
    if (contestProgress(contest) >= 100) finishContest();
    else updateContestDom({ preserveScroll: true });
  }

  function updateContestDom(options = {}) {
    const contest = state.contest;
    if (!contest || state.route.parts[0] !== "contest") return;
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
    const metrics = contestMetrics(contest);
    saveHistory({
      mode: "contest",
      title: contest.title,
      speed: metrics.speed,
      accuracy: metrics.accuracy,
      chars: contest.input.length,
      seconds: Math.max(1, 90 - contest.timeLeft),
      date: new Date().toISOString(),
    });
    if (state.settings.completeAudio) playSuccessSound();
    render();
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

  function renderRank() {
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

  function renderNotFound() {
    return `
      <section class="section-title">
        <div><h2>页面不存在</h2><p>${html(state.route.path)}</p></div>
        <a class="ghost-button" href="${link("/")}">返回首页</a>
      </section>
    `;
  }

  function findLessonMeta(lessonId, source) {
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
    const mapped = state.assetMap?.[url] || (url.startsWith("/") ? state.assetMap?.[`https://www.daziya.com${url}`] : "");
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
      if (event.target.closest(".hanzi-board")) focusBindSoon("trainer-input");
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
      focusBindSoon("trainer-input");
      scrollCurrentCharIntoView({ force: true });
      if (state.trainer?.mode === "word" || state.trainer?.mode === "dictation") {
        setTimeout(speakCurrent, 120);
      }
    }
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
    if (action === "start-game") startGame();
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
      syncServerState().then(render);
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
      commitInputValue(bind, target.value, { composing: true });
      return;
    }
    if (bind === "search") {
      state.search = target.value;
      render();
    }
    if (bind === "trainer-input") {
      updateTrainerInput(target.value);
    }
    if (bind === "game-input") {
      updateGameInput(target.value);
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
      commitInputValue(bind, target.value);
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
    return bind === "trainer-input" || bind === "contest-input" || bind === "game-input";
  }

  function commitInputValue(bind, value, options = {}) {
    if (bind === "trainer-input") updateTrainerInput(value, options);
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
    if (state.route.parts[0] !== "games") return;
    const g = state.game;
    if (!g || !g.running || g.finished) return;
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
    const text = app.querySelector('[data-bind="custom-text"]')?.value?.trim();
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
    state.trainer = {
      lessonId: `custom-${item.id}`,
      source: "custom",
      detail: { lessonName: item.title, categoryTitle: "自定义课程" },
      meta: { title: item.title },
      text: item.text,
      input: "",
      startedAt: null,
      paused: false,
      finished: false,
      saved: false,
    };
    location.hash = link(`/lesson/custom-${item.id}`, { source: "custom" });
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
    urls.push(`https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(word)}&type=2`);
    urls.push(`https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(word)}&type=1`);
    urls.push(`https://fanyi.baidu.com/gettts?lan=en&text=${encodeURIComponent(word)}&spd=3&source=web`);
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
  }
})();
