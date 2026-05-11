import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";

export const runtime = "nodejs";

type TypingDb = {
  sessions: Record<string, { token: string; user_id: string; username: string; raw_user: unknown; created_at: string; updated_at: string }>;
  settings: Record<string, { payload: Record<string, unknown>; updated_at: string }>;
  scores: Array<Record<string, unknown>>;
  rooms: Array<Record<string, unknown>>;
};

const DB_PATH = path.join(process.cwd(), ".typing-data", "typing-db.json");
const WORD_AUDIO_DIR = path.join(process.cwd(), ".typing-data", "audio", "words");
let dbWriteQueue: Promise<void> = Promise.resolve();
const DEFAULT_PRODUCTION_PROXY_ROOT = "http://127.0.0.1:8000/api/typing";

function now() {
  return new Date().toISOString();
}

function backendProxyRoot() {
  if (process.env.TYPING_API_PROXY_DISABLED === "true") return "";
  const configured = process.env.TYPING_API_PROXY_URL?.trim();
  const fallback = process.env.NODE_ENV === "production" ? DEFAULT_PRODUCTION_PROXY_ROOT : "";
  return (configured || fallback).replace(/\/+$/, "");
}

function responseHeaders(headers: Headers) {
  const safe = new Headers(headers);
  for (const key of ["connection", "content-encoding", "content-length", "keep-alive", "transfer-encoding"]) {
    safe.delete(key);
  }
  return safe;
}

async function proxyToBackend(request: NextRequest, pathName: string, payload?: Record<string, unknown>) {
  const root = backendProxyRoot();
  if (!root) return null;

  const url = new URL(`${root}${pathName}`);
  request.nextUrl.searchParams.forEach((value, key) => url.searchParams.append(key, value));
  const headers = new Headers();
  const accept = request.headers.get("accept");
  const authorization = request.headers.get("authorization");
  if (accept) headers.set("accept", accept);
  if (authorization) headers.set("authorization", authorization);

  const init: RequestInit = {
    method: request.method,
    headers,
    cache: "no-store",
  };
  if (request.method !== "GET" && request.method !== "HEAD") {
    headers.set("content-type", "application/json");
    init.body = JSON.stringify(payload || {});
  }

  try {
    const response = await fetch(url, init);
    return new NextResponse(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders(response.headers),
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "typing backend unavailable" },
      { status: process.env.NODE_ENV === "production" ? 502 : 503 }
    );
  }
}

function emptyDb(): TypingDb {
  return { sessions: {}, settings: {}, scores: [], rooms: [] };
}

async function loadDb(): Promise<TypingDb> {
  try {
    const raw = await fs.readFile(DB_PATH, "utf8");
    return { ...emptyDb(), ...JSON.parse(raw) };
  } catch {
    return emptyDb();
  }
}

async function saveDb(db: TypingDb) {
  await fs.mkdir(path.dirname(DB_PATH), { recursive: true });
  const tempPath = `${DB_PATH}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tempPath, JSON.stringify(db, null, 2), "utf8");
  await fs.rename(tempPath, DB_PATH);
}

async function mutateDb<T>(mutator: (db: TypingDb) => T | Promise<T>): Promise<T> {
  const operation = dbWriteQueue.then(async () => {
    const db = await loadDb();
    const result = await mutator(db);
    await saveDb(db);
    return result;
  });
  dbWriteQueue = operation.then(
    () => undefined,
    () => undefined
  );
  return operation;
}

function routePath(parts?: string[]) {
  return `/${(parts || []).join("/")}`;
}

function usernameFrom(payload: Record<string, unknown>, user: Record<string, unknown>) {
  return String(user.username || user.nickname || payload.username || "学习者").trim();
}

function userIdFrom(user: Record<string, unknown>, payload: Record<string, unknown>) {
  return String(user.id || user.user_id || payload.user_id || "");
}

function listScores(db: TypingDb, limit = 50, mode = "") {
  return [...db.scores]
    .filter((item) => !mode || item.mode === mode)
    .sort((a, b) => {
      const speed = Number(b.speed || 0) - Number(a.speed || 0);
      if (speed) return speed;
      const accuracy = Number(b.accuracy || 0) - Number(a.accuracy || 0);
      if (accuracy) return accuracy;
      return Number(a.seconds || 999999) - Number(b.seconds || 999999);
    })
    .slice(0, Math.max(1, Math.min(limit, 200)));
}

function listHistory(db: TypingDb, limit = 80, token = "", userId = "", username = "") {
  const safeLimit = Math.max(1, Math.min(limit, 300));
  return [...db.scores]
    .filter((item) => {
      if (token && item.token === token) return true;
      if (userId && item.user_id === userId) return true;
      if (username && item.username === username) return true;
      return false;
    })
    .sort((a, b) => {
      const aTime = new Date(String(a.created_at || a.date || 0)).getTime();
      const bTime = new Date(String(b.created_at || b.date || 0)).getTime();
      return bTime - aTime;
    })
    .slice(0, safeLimit);
}

function clampNumber(value: unknown, min: number, max: number, fallback: number) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, number));
}

function qwenLanguageType(lang: string, text: string) {
  return lang.toLowerCase().startsWith("zh") || /[\u3400-\u9fff]/.test(text) ? "Chinese" : "English";
}

function ttsConfigured() {
  return Boolean(
    process.env.MINIMAX_API_KEY?.trim() || process.env.QWEN_API_KEY?.trim() || process.env.DASHSCOPE_API_KEY?.trim()
  );
}

function normalizeWord(value: string) {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}

function wordAudioPath(word: string) {
  const slug = word.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48) || "word";
  const digest = crypto.createHash("sha1").update(word).digest("hex").slice(0, 10);
  return path.join(WORD_AUDIO_DIR, `${slug}-${digest}.mp3`);
}

function wordAudioUrls(word: string) {
  const encoded = encodeURIComponent(word);
  return [
    `https://dict.youdao.com/dictvoice?audio=${encoded}&type=2`,
    `https://dict.youdao.com/dictvoice?audio=${encoded}&type=1`,
    `https://fanyi.baidu.com/gettts?lan=en&text=${encoded}&spd=3&source=web`,
  ];
}

function externalWordAudioFallbackEnabled() {
  return String(process.env.TYPING_EXTERNAL_WORD_AUDIO_FALLBACK || "").toLowerCase() === "true";
}

function looksLikeAudio(audio: Buffer, contentType: string | null) {
  const lower = (contentType || "").toLowerCase();
  return Boolean(
    audio.length &&
      (lower.includes("audio") ||
        audio.subarray(0, 3).toString("binary") === "ID3" ||
        audio.subarray(0, 2).equals(Buffer.from([0xff, 0xfb])) ||
        audio.subarray(0, 2).equals(Buffer.from([0xff, 0xf3])) ||
        audio.subarray(0, 2).equals(Buffer.from([0xff, 0xf2])))
  );
}

function audioBody(audio: Buffer): ArrayBuffer {
  return audio.buffer.slice(audio.byteOffset, audio.byteOffset + audio.byteLength) as ArrayBuffer;
}

async function getWordAudio(word: string) {
  const normalized = normalizeWord(word);
  if (!normalized || /[\u3400-\u9fff]/.test(normalized)) return null;
  const target = wordAudioPath(normalized);
  try {
    return { audio: await fs.readFile(target), contentType: "audio/mpeg" };
  } catch {
    // Cache miss: optionally download from public dictionary if explicitly enabled.
  }
  if (!externalWordAudioFallbackEnabled()) return null;
  let audio: Buffer | null = null;
  let contentType = "audio/mpeg";
  for (const url of wordAudioUrls(normalized)) {
    try {
      const response = await fetch(url, { headers: { "User-Agent": "LeQiXiangTyping/1.0" } });
      if (!response.ok) continue;
      const candidate = Buffer.from(await response.arrayBuffer());
      if (!looksLikeAudio(candidate, response.headers.get("content-type"))) continue;
      audio = candidate;
      contentType = response.headers.get("content-type") || "audio/mpeg";
      break;
    } catch {
      // Try the next public pronunciation source.
    }
  }
  if (!audio) return null;
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, audio);
  return { audio, contentType };
}

function decodeAudioValue(value: unknown): Buffer | null {
  if (typeof value !== "string" || !value) return null;
  const candidate = value.startsWith("data:") && value.includes(",") ? value.split(",", 2)[1] : value;
  if (/^[0-9a-fA-F]+$/.test(candidate) && candidate.length % 2 === 0) return Buffer.from(candidate, "hex");
  try {
    return Buffer.from(candidate, "base64");
  } catch {
    return null;
  }
}

async function synthesizeMinimax(text: string, lang: string, rate: number) {
  const apiKey = process.env.MINIMAX_API_KEY?.trim();
  if (!apiKey) return null;

  let endpoint = process.env.MINIMAX_TTS_ENDPOINT?.trim() || "https://api.minimax.io/v1/t2a_v2";
  const groupId = process.env.MINIMAX_GROUP_ID?.trim();
  if (groupId && !endpoint.includes("GroupId=")) {
    endpoint += `${endpoint.includes("?") ? "&" : "?"}GroupId=${encodeURIComponent(groupId)}`;
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.MINIMAX_TTS_MODEL || "speech-2.8-hd",
      text,
      stream: false,
      language_boost: lang.toLowerCase().startsWith("zh") ? "Chinese" : "auto",
      output_format: "hex",
      voice_setting: {
        voice_id: process.env.MINIMAX_TTS_VOICE || "female-shaonv",
        speed: rate,
        vol: 1,
        pitch: 0,
      },
      audio_setting: {
        sample_rate: 32000,
        bitrate: 128000,
        format: "mp3",
        channel: 1,
      },
    }),
  });
  if (!response.ok) return null;
  const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null;
  const baseResp = payload?.base_resp as Record<string, unknown> | undefined;
  if (baseResp?.status_code !== undefined && Number(baseResp.status_code) !== 0) return null;
  const data = payload?.data as Record<string, unknown> | undefined;
  const audio = decodeAudioValue(data?.audio || payload?.audio);
  return audio ? { audio, contentType: "audio/mpeg" } : null;
}

async function synthesizeQwen(text: string, lang: string, rate: number) {
  const apiKey = (process.env.QWEN_API_KEY || process.env.DASHSCOPE_API_KEY || "").trim();
  if (!apiKey) return null;

  const endpoint =
    process.env.QWEN_TTS_ENDPOINT?.trim() || "https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation";
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.QWEN_TTS_MODEL || "qwen3-tts-flash",
      input: {
        text,
        voice: process.env.QWEN_TTS_VOICE || "Cherry",
        language_type: qwenLanguageType(lang, text),
      },
      parameters: {
        speed: rate,
      },
    }),
  });
  if (!response.ok) return null;
  const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null;
  const output = payload?.output as Record<string, unknown> | undefined;
  const audioPayload = output?.audio as Record<string, unknown> | string | undefined;
  if (audioPayload && typeof audioPayload === "object" && typeof audioPayload.url === "string") {
    const audioResponse = await fetch(audioPayload.url);
    if (!audioResponse.ok) return null;
    return {
      audio: Buffer.from(await audioResponse.arrayBuffer()),
      contentType: audioResponse.headers.get("content-type") || "audio/mpeg",
    };
  }
  const audio = decodeAudioValue(typeof audioPayload === "object" ? audioPayload.data : audioPayload);
  return audio ? { audio, contentType: "audio/mpeg" } : null;
}

async function synthesizeSpeech(payload: Record<string, unknown>) {
  const text = String(payload.text || "").trim().slice(0, 900);
  if (!text) return { error: "empty text" };
  const lang = String(payload.lang || "auto");
  const rate = clampNumber(payload.rate, 0.5, 1.5, 0.9);
  for (const provider of [synthesizeMinimax, synthesizeQwen]) {
    try {
      const result = await provider(text, lang, rate);
      if (result) return result;
    } catch {
      // Fall through to the next provider, then to browser TTS in the client.
    }
  }
  return { error: "tts service is not configured" };
}

export async function GET(request: NextRequest, context: { params: Promise<{ path?: string[] }> }) {
  const params = await context.params;
  const pathName = routePath(params.path);
  const proxied = await proxyToBackend(request, pathName);
  if (proxied) return proxied;

  const query = request.nextUrl.searchParams;
  const db = await loadDb();

  if (pathName === "/health") {
    return NextResponse.json({ ok: true, time: now(), tts: ttsConfigured() });
  }

  if (pathName === "/me") {
    const token = query.get("token") || "";
    const session = token ? db.sessions[token] : null;
    return NextResponse.json({ ok: true, user: session ? { id: session.user_id, username: session.username, raw: session.raw_user } : null });
  }

  if (pathName === "/rankings") {
    return NextResponse.json({
      ok: true,
      rankings: listScores(db, Number(query.get("limit") || 50), query.get("mode") || ""),
    });
  }

  if (pathName === "/history") {
    const token = query.get("token") || "";
    const session = token ? db.sessions[token] : null;
    return NextResponse.json({
      ok: true,
      history: listHistory(
        db,
        Number(query.get("limit") || 80),
        token,
        query.get("user_id") || session?.user_id || "",
        query.get("username") || session?.username || ""
      ),
    });
  }

  if (pathName === "/settings") {
    const token = query.get("token") || "";
    return NextResponse.json({ ok: true, settings: token && db.settings[token] ? db.settings[token].payload : null });
  }

  if (pathName === "/word-audio") {
    const result = await getWordAudio(query.get("word") || "");
    if (!result) return NextResponse.json({ ok: false, error: "audio not found" }, { status: 404 });
    return new NextResponse(audioBody(result.audio), {
      status: 200,
      headers: {
        "Content-Type": result.contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  }

  return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });
}

export async function POST(request: NextRequest, context: { params: Promise<{ path?: string[] }> }) {
  const params = await context.params;
  const pathName = routePath(params.path);
  const payload = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const proxied = await proxyToBackend(request, pathName, payload);
  if (proxied) return proxied;

  if (pathName === "/tts") {
    const result = await synthesizeSpeech(payload);
    if ("error" in result) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 503 });
    }
    return new NextResponse(audioBody(result.audio), {
      status: 200,
      headers: {
        "Content-Type": result.contentType,
        "Cache-Control": "no-store",
      },
    });
  }

  if (pathName === "/session") {
    const result = await mutateDb((db) => {
      const user = typeof payload.user === "object" && payload.user ? (payload.user as Record<string, unknown>) : {};
      const username = usernameFrom(payload, user);
      const token = String(payload.token || `school-${username}-${Date.now()}`);
      const previous = db.sessions[token];
      db.sessions[token] = {
        token,
        user_id: userIdFrom(user, payload),
        username,
        raw_user: user,
        created_at: previous?.created_at || now(),
        updated_at: now(),
      };
      return { token, user: { id: db.sessions[token].user_id, username } };
    });
    return NextResponse.json({ ok: true, ...result });
  }

  if (pathName === "/scores") {
    const result = await mutateDb((db) => {
      const token = String(payload.token || "");
      const session = token ? db.sessions[token] : null;
      const record = {
        id: db.scores.length + 1,
        token,
        user_id: String(session?.user_id || payload.user_id || ""),
        username: String(payload.username || session?.username || "学习者"),
        mode: String(payload.mode || "lesson"),
        title: String(payload.title || "练习"),
        speed: Number(payload.speed || 0),
        accuracy: Number(payload.accuracy || 0),
        chars: Number(payload.chars || 0),
        seconds: Number(payload.seconds || 0),
        created_at: String(payload.date || now()),
      };
      db.scores.push(record);
      db.scores = db.scores.slice(-1000);
      return { score: record, rankings: listScores(db, 50), history: listHistory(db, 80, token, String(record.user_id || ""), String(record.username || "")) };
    });
    return NextResponse.json({ ok: true, ...result });
  }

  if (pathName === "/settings") {
    await mutateDb((db) => {
      const token = String(payload.token || "");
      if (token) {
        db.settings[token] = {
          payload: typeof payload.settings === "object" && payload.settings ? (payload.settings as Record<string, unknown>) : {},
          updated_at: now(),
        };
      }
    });
    return NextResponse.json({ ok: true });
  }

  if (pathName === "/contest/rooms") {
    const room = await mutateDb((db) => {
      const token = String(payload.token || "");
      const session = token ? db.sessions[token] : null;
      const room = {
        id: `ROOM-${Date.now()}`,
        owner_token: token,
        owner_name: String(session?.username || payload.username || "学习者"),
        title: String(payload.title || "打字比赛"),
        lesson_id: String(payload.lessonId || ""),
        status: "waiting",
        payload,
        created_at: now(),
        updated_at: now(),
      };
      db.rooms.push(room);
      db.rooms = db.rooms.slice(-300);
      return room;
    });
    return NextResponse.json({ ok: true, room });
  }

  return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });
}
