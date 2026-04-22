import { getCurrentUser, signUp, signIn, signOut } from "./auth.js";
import {
  upsertSession,
  insertLog,
  upsertCharacter,
  deleteCharacterRemote
} from "./supabase.js";

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

async function syncCurrentSessionToSupabase() {
  const user = await getCurrentUser().catch(() => null);
  if (!user || !currentSession) return;

  await upsertSession(currentSession, user.id);

  for (const char of currentSession.characters || []) {
    await upsertCharacter(char, currentSession.id, user.id);
  }
}

async function syncLatestLogToSupabase(previousLastLogId = null) {
  const user = await getCurrentUser().catch(() => null);
  if (!user || !currentSession || !currentSession.logs?.length) return;

  const latestLog = currentSession.logs[currentSession.logs.length - 1];
  if (!latestLog) return;

  if (previousLastLogId && latestLog.id === previousLastLogId) return;

  await insertLog(latestLog, currentSession.id, user.id);
  await upsertSession(currentSession, user.id);
}

document.addEventListener("DOMContentLoaded", async () => {
  appState = loadAppState();
  document.body.setAttribute("data-theme", loadTheme());

  updateCurrentSessionRef();
  renderAll();

  if (typeof restoreTimerIfNeeded === "function") {
    restoreTimerIfNeeded();
  }

  // 새 세션 생성
  document.getElementById("newSessionBtn")?.addEventListener("click", async () => {
    createSession();
    await syncCurrentSessionToSupabase().catch(console.error);
  });

  // 로그 추가
  document.getElementById("addLogBtn")?.addEventListener("click", async () => {
    const before = currentSession?.logs?.[currentSession.logs.length - 1]?.id || null;
    addLog();
    await syncLatestLogToSupabase(before).catch(console.error);
  });

  // 입력창 비우기
  document.getElementById("clearInputBtn")?.addEventListener("click", clearComposer);

  // 목표 저장
  document.getElementById("saveGoalBtn")?.addEventListener("click", async () => {
    saveGoal();
    await syncCurrentSessionToSupabase().catch(console.error);
  });

  // 타이머
  document.getElementById("startTimerBtn")?.addEventListener("click", startTimer);
  document.getElementById("pauseTimerBtn")?.addEventListener("click", pauseTimer);
  document.getElementById("resetTimerBtn")?.addEventListener("click", () => resetTimer());

  document.querySelectorAll(".preset-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      resetTimer(Number(btn.dataset.seconds));
    });
  });

  // 테마
  document.querySelectorAll(".theme-chip").forEach(btn => {
    btn.addEventListener("click", () => {
      const theme = btn.dataset.themeName;
      document.body.setAttribute("data-theme", theme);
      saveTheme(theme);
    });
  });

  // 주사위 캐릭터 변경
  document.getElementById("diceCharacter")?.addEventListener("change", event => {
    selectedCharacterId = event.target.value;

    if (currentSession) {
      currentSession.selectedCharacterId = selectedCharacterId;
      saveAppState(appState);
    }

    const characterSelect = document.getElementById("characterSelect");
    const speakerSelect = document.getElementById("speakerSelect");

    if (characterSelect) characterSelect.value = selectedCharacterId;
    if (speakerSelect) speakerSelect.value = selectedCharacterId;

    populateSkillSelect();
    renderCharacterCard();
  });

  // 기능 선택 변경
  document.getElementById("diceSkill")?.addEventListener("change", syncDiceTargetFromSkill);

  // 주사위 굴리기
  document.getElementById("rollDiceBtn")?.addEventListener("click", async () => {
    const before = currentSession?.logs?.[currentSession.logs.length - 1]?.id || null;
    rollDice();
    await syncLatestLogToSupabase(before).catch(console.error);
  });

  // 마크다운 export
  document.getElementById("exportMarkdownBtn")?.addEventListener("click", exportCurrentSessionMarkdown);

  // 캐릭터 선택 변경
  document.getElementById("characterSelect")?.addEventListener("change", event => {
    selectedCharacterId = event.target.value;

    if (currentSession) {
      currentSession.selectedCharacterId = selectedCharacterId;
      saveAppState(appState);
    }

    const speakerSelect = document.getElementById("speakerSelect");
    const diceCharacter = document.getElementById("diceCharacter");

    if (speakerSelect) speakerSelect.value = selectedCharacterId;
    if (diceCharacter) diceCharacter.value = selectedCharacterId;

    populateSkillSelect();
    renderCharacterCard();
  });

  // 화자 선택 변경
  document.getElementById("speakerSelect")?.addEventListener("change", event => {
    selectedCharacterId = event.target.value;

    if (currentSession) {
      currentSession.selectedCharacterId = selectedCharacterId;
      saveAppState(appState);
    }

    const characterSelect = document.getElementById("characterSelect");
    const diceCharacter = document.getElementById("diceCharacter");

    if (characterSelect) characterSelect.value = selectedCharacterId;
    if (diceCharacter) diceCharacter.value = selectedCharacterId;

    populateSkillSelect();
    renderCharacterCard();
  });

  // 캐릭터 저장
  document.getElementById("saveCharacterBtn")?.addEventListener("click", async () => {
    saveCurrentCharacter();
    await syncCurrentSessionToSupabase().catch(console.error);
  });

  // 캐릭터 추가
  document.getElementById("addCharacterBtn")?.addEventListener("click", async () => {
    addCharacter();
    await syncCurrentSessionToSupabase().catch(console.error);
  });

  // 캐릭터 삭제
  document.getElementById("deleteCharacterBtn")?.addEventListener("click", async () => {
    const deletedId = selectedCharacterId;
    const beforeCount = currentSession?.characters?.length ?? 0;

    deleteCharacter();

    const afterCount = currentSession?.characters?.length ?? 0;
    const user = await getCurrentUser().catch(() => null);

    // 실제로 삭제가 일어났을 때만 원격 삭제
    if (user && deletedId && afterCount < beforeCount) {
      await deleteCharacterRemote(deletedId, user.id).catch(console.error);
      await syncCurrentSessionToSupabase().catch(console.error);
    }
  });

  // 프사 업로드
  document.getElementById("avatarInput")?.addEventListener("change", async event => {
    const file = event.target.files?.[0];
    if (file) {
      handleAvatarUpload(file);
      // 현재는 localStorage 기반 즉시 반영
      // 나중에 Storage 업로드까지 붙이면 여기서 처리
      await syncCurrentSessionToSupabase().catch(console.error);
    }
    event.target.value = "";
  });

  // Ctrl/Cmd + Enter 로 로그 추가
  document.getElementById("logInput")?.addEventListener("keydown", async event => {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      const before = currentSession?.logs?.[currentSession.logs.length - 1]?.id || null;
      addLog();
      await syncLatestLogToSupabase(before).catch(console.error);
    }
  });
});
