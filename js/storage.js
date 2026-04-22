
const STORAGE_KEY = "hazel_study_room_v2";
const THEME_KEY = "hazel_study_room_theme";

function createDefaultCharacters() {
  return [
    {
      id: "char_g",
      name: "G",
      avatar: "",
      color: "#7aa2ff",
      description: "논리적이고 차분한 해석자",
      stats: { observe: 60, insight: 80, persuade: 45, logic: 75, psychology: 70, law: 78 }
    },
    {
      id: "char_e",
      name: "E",
      avatar: "",
      color: "#ff7f96",
      description: "직설적이고 검증적인 반박자",
      stats: { observe: 55, insight: 68, persuade: 52, logic: 80, psychology: 48, law: 70 }
    }
  ];
}

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
    characters: createDefaultCharacters(),
    logs: [
      {
        id: "log_" + Date.now(),
        type: "system",
        speakerId: null,
        speakerName: "시스템",
        text: "새 세션이 준비되었습니다. 목표를 적고, 캐릭터를 고른 뒤 로그를 시작해 보세요.",
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
