import { getCurrentUser, signUp, signIn, signOut } from "./auth.js";
import {
  fetchSessions,
  fetchLogs,
  fetchCharacters,
  upsertSession,
  insertLog,
  upsertCharacter,
  deleteCharacterRemote
} from "./supabase.js";

/* =========================
   Auth 상태
========================= */

async function refreshAuthStatus() {
  const statusEl = document.getElementById("authStatus");
  if (!statusEl) return;

  const user = await getCurrentUser().catch(() => null);

  if (user) {
    statusEl.textContent = `로그인됨: ${user.email}`;
  } else {
    statusEl.textContent = "로그아웃 상태";
  }
}

/* =========================
   Supabase Sync
========================= */

async function syncCurrentSessionToSupabase() {
  const user = await getCurrentUser().catch(() => null);
  const session = window.currentSession;

  if (!user || !session) return;

  await upsertSession(session, user.id);

  for (const char of session.characters || []) {
    await upsertCharacter(char, session.id, user.id);
  }
}

async function syncLatestLogToSupabase(previousLastLogId = null) {
  const user = await getCurrentUser().catch(() => null);
  const session = window.currentSession;

  if (!user || !session || !session.logs?.length) return;

  const latestLog = session.logs[session.logs.length - 1];
  if (!latestLog) return;

  if (previousLastLogId && latestLog.id === previousLastLogId) return;

  await insertLog(latestLog, session.id, user.id);
  await upsertSession(session, user.id);
}

async function loadFromSupabase() {
  const user = await getCurrentUser().catch(() => null);
  if (!user) return;

  const sessions = await fetchSessions(user.id).catch(err => {
    console.error(err);
    return [];
  });

  if (!sessions || sessions.length === 0) return;

  const mappedSessions = [];

  for (const session of sessions) {
    const logs = await fetchLogs(session.id, user.id).catch(err => {
      console.error(err);
      return [];
    });

    const characters = await fetchCharacters(session.id, user.id).catch(err => {
      console.error(err);
      return [];
    });

    mappedSessions.push({
      id: session.id,
      title: session.title || "새 세션",
      subject: session.subject || "",
      goal: session.goal || "",
      coverImage: session.cover_image_path || "",
      selectedCharacterId: session.selected_character_id || null,
      createdAt: session.created_at,
      updatedAt: session.updated_at,
      timer: {
        durationSec: session.timer_duration_sec ?? 1500,
        remainingSec: session.timer_remaining_sec ?? 1500,
        isRunning: session.timer_is_running ?? false,
        lastStartedAt: session.timer_last_started_at
          ? new Date(session.timer_last_started_at).getTime()
          : null
      },
      logs: (logs || []).map(log => ({
        id: log.id,
        type: log.type,
        speakerId: log.speaker_id,
        speakerName: log.speaker_name,
        text: log.text,
        roll: log.roll,
        target: log.target,
        outcome: log.outcome,
        createdAt: log.created_at
      })),
      characters: (characters || []).map(char => ({
        id: char.id,
        name: char.name || "새 탐사자",
        avatar: char.avatar_path || "",
        color: char.color || "#7aa2ff",
        description: char.description || "",
        coc: char.coc || {}
      }))
    });
  }

  window.appState.sessions = mappedSessions;
  window.appState.currentSessionId = mappedSessions[0]?.id || null;
  window.appState.openTabs = mappedSessions.length > 0 ? [mappedSessions[0].id] : [];

  saveAppState(window.appState);
  window.updateCurrentSessionRef();
  window.renderAll();
}

/* =========================
   INIT
========================= */

document.addEventListener("DOMContentLoaded", async () => {
  window.appState = loadAppState();
  document.body.setAttribute("data-theme", loadTheme());

  window.updateCurrentSessionRef();
  window.renderAll();

  if (typeof window.restoreTimerIfNeeded === "function") {
    window.restoreTimerIfNeeded();
  }

  /* =========================
     세션
  ========================= */

  document.getElementById("newSessionBtn")?.addEventListener("click", async () => {
    window.createSession();
    await syncCurrentSessionToSupabase().catch(console.error);
  });

  /* =========================
     로그
  ========================= */

  document.getElementById("addLogBtn")?.addEventListener("click", async () => {
    const session = window.currentSession;
    const before = session?.logs?.[session.logs.length - 1]?.id || null;

    window.addLog();

    await syncLatestLogToSupabase(before).catch(console.error);
  });

  document.getElementById("clearInputBtn")?.addEventListener("click", window.clearComposer);

  document.getElementById("logInput")?.addEventListener("keydown", async event => {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      const session = window.currentSession;
      const before = session?.logs?.[session.logs.length - 1]?.id || null;

      window.addLog();

      await syncLatestLogToSupabase(before).catch(console.error);
    }
  });

  /* =========================
     목표
  ========================= */

  document.getElementById("saveGoalBtn")?.addEventListener("click", async () => {
    window.saveGoal();
    await syncCurrentSessionToSupabase().catch(console.error);
  });

  /* =========================
     타이머
  ========================= */

  document.getElementById("startTimerBtn")?.addEventListener("click", window.startTimer);
  document.getElementById("pauseTimerBtn")?.addEventListener("click", window.pauseTimer);
  document.getElementById("resetTimerBtn")?.addEventListener("click", () => window.resetTimer());

  document.querySelectorAll(".preset-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      window.resetTimer(Number(btn.dataset.seconds));
    });
  });

  /* =========================
     테마
  ========================= */

  document.querySelectorAll(".theme-chip").forEach(btn => {
    btn.addEventListener("click", () => {
      const theme = btn.dataset.themeName;
      document.body.setAttribute("data-theme", theme);
      saveTheme(theme);
    });
  });

  /* =========================
     Auth
  ========================= */

  await refreshAuthStatus();
  await loadFromSupabase();

  document.getElementById("signUpBtn")?.addEventListener("click", async () => {
    const email = document.getElementById("authEmail")?.value.trim();
    const password = document.getElementById("authPassword")?.value.trim();

    if (!email || !password) {
      alert("이메일과 비밀번호를 입력해 주세요.");
      return;
    }

    try {
      await signUp(email, password);
      alert("회원가입 완료");
      await refreshAuthStatus();
    } catch (err) {
      console.error(err);
      alert(err.message || "회원가입 중 오류가 발생했습니다.");
    }
  });

  document.getElementById("signInBtn")?.addEventListener("click", async () => {
    const email = document.getElementById("authEmail")?.value.trim();
    const password = document.getElementById("authPassword")?.value.trim();

    if (!email || !password) {
      alert("이메일과 비밀번호를 입력해 주세요.");
      return;
    }

    try {
      await signIn(email, password);
      alert("로그인됨");
      await refreshAuthStatus();
      await loadFromSupabase();
    } catch (err) {
      console.error(err);
      alert(err.message || "로그인 중 오류가 발생했습니다.");
    }
  });

  document.getElementById("signOutBtn")?.addEventListener("click", async () => {
    try {
      await signOut();
      alert("로그아웃됨");
      await refreshAuthStatus();
    } catch (err) {
      console.error(err);
      alert(err.message || "로그아웃 중 오류가 발생했습니다.");
    }
  });

  /* =========================
     주사위
  ========================= */

  document.getElementById("diceSkill")?.addEventListener("change", window.syncDiceTargetFromSkill);
  document.getElementById("diceMode")?.addEventListener("change", window.populateSkillSelect);

  document.getElementById("rollDiceBtn")?.addEventListener("click", async () => {
    const session = window.currentSession;
    const before = session?.logs?.[session.logs.length - 1]?.id || null;

    window.rollDice();

    await syncLatestLogToSupabase(before).catch(console.error);
  });

  /* =========================
     캐릭터
  ========================= */

  document.getElementById("characterSelect")?.addEventListener("change", event => {
    window.selectedCharacterId = event.target.value;

    if (window.currentSession) {
      window.currentSession.selectedCharacterId = window.selectedCharacterId;
      saveAppState(window.appState);
    }

    const characterSelect = document.getElementById("characterSelect");
    const speakerSelect = document.getElementById("speakerSelect");
    const diceCharacter = document.getElementById("diceCharacter");

    if (characterSelect) characterSelect.value = window.selectedCharacterId;
    if (speakerSelect) speakerSelect.value = window.selectedCharacterId;
    if (diceCharacter) diceCharacter.value = window.selectedCharacterId;

    window.populateSkillSelect();
    window.renderCharacterCard();
  });

  document.getElementById("speakerSelect")?.addEventListener("change", event => {
    window.selectedCharacterId = event.target.value;

    if (window.currentSession) {
      window.currentSession.selectedCharacterId = window.selectedCharacterId;
      saveAppState(window.appState);
    }

    const characterSelect = document.getElementById("characterSelect");
    const speakerSelect = document.getElementById("speakerSelect");
    const diceCharacter = document.getElementById("diceCharacter");

    if (characterSelect) characterSelect.value = window.selectedCharacterId;
    if (speakerSelect) speakerSelect.value = window.selectedCharacterId;
    if (diceCharacter) diceCharacter.value = window.selectedCharacterId;

    window.populateSkillSelect();
    window.renderCharacterCard();
  });

  document.getElementById("diceCharacter")?.addEventListener("change", event => {
    window.selectedCharacterId = event.target.value;

    if (window.currentSession) {
      window.currentSession.selectedCharacterId = window.selectedCharacterId;
      saveAppState(window.appState);
    }

    const characterSelect = document.getElementById("characterSelect");
    const speakerSelect = document.getElementById("speakerSelect");
    const diceCharacter = document.getElementById("diceCharacter");

    if (characterSelect) characterSelect.value = window.selectedCharacterId;
    if (speakerSelect) speakerSelect.value = window.selectedCharacterId;
    if (diceCharacter) diceCharacter.value = window.selectedCharacterId;

    window.populateSkillSelect();
    window.renderCharacterCard();
  });

  document.getElementById("saveCharacterBtn")?.addEventListener("click", async () => {
    window.saveCurrentCharacter();
    await syncCurrentSessionToSupabase().catch(console.error);
  });

  document.getElementById("addCharacterBtn")?.addEventListener("click", async () => {
    window.addCharacter();
    await syncCurrentSessionToSupabase().catch(console.error);
  });

  document.getElementById("deleteCharacterBtn")?.addEventListener("click", async () => {
    const deletedId = window.selectedCharacterId;
    const beforeCount = window.currentSession?.characters?.length ?? 0;

    window.deleteCharacter();

    const afterCount = window.currentSession?.characters?.length ?? 0;
    const user = await getCurrentUser().catch(() => null);

    if (user && deletedId && afterCount < beforeCount) {
      await deleteCharacterRemote(deletedId, user.id).catch(console.error);
      await syncCurrentSessionToSupabase().catch(console.error);
    }
  });

  document.getElementById("avatarInput")?.addEventListener("change", async event => {
    const file = event.target.files?.[0];
    if (file) {
      window.handleAvatarUpload(file);
      await syncCurrentSessionToSupabase().catch(console.error);
    }
    event.target.value = "";
  });

  /* =========================
     기타
  ========================= */

  document.getElementById("exportMarkdownBtn")?.addEventListener("click", window.exportCurrentSessionMarkdown);
});
