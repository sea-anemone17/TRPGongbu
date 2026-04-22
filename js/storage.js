
const STORAGE_KEY = "hazel_study_room_v2";
const THEME_KEY = "hazel_study_room_theme";

function createDefaultSession() {
  const now = new Date().toISOString();
  return {
    id: "session_" + Date.now(),
    title: "첫 세션",
    subject: "자유 세션",
    coverImage: "",
    goal: "이번 세션의 학습 목표를 정해 주세요.",
    createdAt: now,
    updatedAt: now,
    notes: "",
    timer: {
      durationSec: 1500,
      remainingSec: 1500,
      isRunning: false,
      lastStartedAt: null
    },
    characters: null
    logs: [
      {
        id: "log_" + Date.now(),
        type: "system",
        speakerId: null,
        speakerName: "시스템",
        text: "새 세션이 준비되었습니다. 먼저 캐릭터를 추가해 주세요.",
        createdAt: now
      }
    ]
  };
}

function createDefaultState() {
  const session = createDefaultSession();
  return {
    sessions: [session],
    currentSessionId: session.id,
    openTabs: [session.id]
  };
}

function loadAppState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createDefaultState();

    const parsed = JSON.parse(raw);
    if (!parsed.sessions?.length) return createDefaultState();

    if (!parsed.currentSessionId) {
      parsed.currentSessionId = parsed.sessions[0].id;
    }

    if (!Array.isArray(parsed.openTabs) || parsed.openTabs.length === 0) {
      parsed.openTabs = [parsed.currentSessionId];
    }

    return parsed;
  } catch (err) {
    console.error("loadAppState error:", err);
    return createDefaultState();
  }
}

function saveAppState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function saveTheme(theme) {
  localStorage.setItem(THEME_KEY, theme);
}

function loadTheme() {
  return localStorage.getItem(THEME_KEY) || "dark";
}
