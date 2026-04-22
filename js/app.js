document.addEventListener("DOMContentLoaded", () => {
  appState = loadAppState();
  document.body.setAttribute("data-theme", loadTheme());

  updateCurrentSessionRef();
  renderAll();

  if (typeof restoreTimerIfNeeded === "function") {
    restoreTimerIfNeeded();
  }

  document.getElementById("newSessionBtn")?.addEventListener("click", createSession);
  document.getElementById("addLogBtn")?.addEventListener("click", addLog);
  document.getElementById("clearInputBtn")?.addEventListener("click", clearComposer);
  document.getElementById("saveGoalBtn")?.addEventListener("click", saveGoal);

  document.getElementById("startTimerBtn")?.addEventListener("click", startTimer);
  document.getElementById("pauseTimerBtn")?.addEventListener("click", pauseTimer);
  document.getElementById("resetTimerBtn")?.addEventListener("click", () => resetTimer());

  document.querySelectorAll(".preset-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      resetTimer(Number(btn.dataset.seconds));
    });
  });

  document.querySelectorAll(".theme-chip").forEach(btn => {
    btn.addEventListener("click", () => {
      const theme = btn.dataset.themeName;
      document.body.setAttribute("data-theme", theme);
      saveTheme(theme);
    });
  });

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

  document.getElementById("diceSkill")?.addEventListener("change", syncDiceTargetFromSkill);
  document.getElementById("rollDiceBtn")?.addEventListener("click", rollDice);

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

  document.getElementById("saveCharacterBtn")?.addEventListener("click", saveCurrentCharacter);
  document.getElementById("addCharacterBtn")?.addEventListener("click", addCharacter);

  document.getElementById("avatarInput")?.addEventListener("change", event => {
    const file = event.target.files?.[0];
    if (file) handleAvatarUpload(file);
    event.target.value = "";
  });

  document.getElementById("logInput")?.addEventListener("keydown", event => {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      addLog();
    }
  });
});

function deleteCharacter() {
  if (!currentSession || !selectedCharacterId) return;

  if (!confirm("이 캐릭터를 삭제하시겠습니까?")) return;

  currentSession.characters = currentSession.characters.filter(
    c => c.id !== selectedCharacterId
  );

  // 선택 캐릭터 재설정
  const next = currentSession.characters[0];
  selectedCharacterId = next ? next.id : null;

  currentSession.selectedCharacterId = selectedCharacterId;

  saveAppState(appState);
  renderAll();
}
