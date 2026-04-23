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
    characters: [createDefaultCocCharacter()],
    selectedCharacterId: null,
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

    // 예전 데이터 보정
    parsed.sessions = parsed.sessions.map(session => ({
      ...session,
      characters: Array.isArray(session.characters) ? session.characters : [],
      selectedCharacterId: session.selectedCharacterId ?? null,
      logs: Array.isArray(session.logs) ? session.logs : [],
      timer: session.timer || {
        durationSec: 1500,
        remainingSec: 1500,
        isRunning: false,
        lastStartedAt: null
      }
    }));

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

export function createDefaultCharacter() {
  return {
    id: "char_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
    name: "새 탐사자",
    avatar: "",
    color: "#7aa2ff",
    description: "",

    coc: {
      info: {
        player: "",
        occupation: "",
        age: "",
        sex: "",
        residence: "",
        birthplace: ""
      },

      attributes: {
        str: 50,
        con: 50,
        siz: 50,
        dex: 50,
        app: 50,
        int: 50,
        pow: 50,
        edu: 50
      },

      derived: {
        hp: { current: 10, max: 10 },
        mp: { current: 10, max: 10 },
        san: { current: 50, max: 99 },
        luck: 50,
        move: 8,
        build: 0,
        db: "0"
      },

      skills: {
        spotHidden: 25,
        listen: 20,
        psychology: 10,
        persuade: 10,
        law: 5,
        libraryUse: 20
      }
    }
  };
}
