let appState = null;
let currentSession = null;
let selectedCharacterId = null;

const LOG_TYPE_LABELS = {
  dialogue: "답멘",
  system: "시스템",
  note: "메모",
  roll: "판정"
};

const SKILL_LABELS = {
  observe: "관찰",
  insight: "통찰",
  persuade: "설득",
  logic: "논리",
  psychology: "심리학",
  law: "법학"
};

function ensureCocCharacter(char) {
  if (!char.coc) {
    char.coc = {
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
    };
  }

  if (!char.coc.info) char.coc.info = {};
  if (!char.coc.attributes) char.coc.attributes = {};
  if (!char.coc.derived) char.coc.derived = {};
  if (!char.coc.skills) char.coc.skills = {};

  char.coc.attributes = {
    str: 50,
    con: 50,
    siz: 50,
    dex: 50,
    app: 50,
    int: 50,
    pow: 50,
    edu: 50,
    ...char.coc.attributes
  };

  char.coc.derived = {
    hp: { current: 10, max: 10, ...(char.coc.derived.hp || {}) },
    mp: { current: 10, max: 10, ...(char.coc.derived.mp || {}) },
    san: { current: 50, max: 99, ...(char.coc.derived.san || {}) },
    luck: 50,
    move: 8,
    build: 0,
    db: "0",
    ...char.coc.derived
  };

  char.coc.skills = {
    spotHidden: 25,
    listen: 20,
    psychology: 10,
    persuade: 10,
    law: 5,
    libraryUse: 20,
    ...char.coc.skills
  };

  return char;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getCurrentSession() {
  return appState?.sessions?.find(s => s.id === appState.currentSessionId) || null;
}

function updateCurrentSessionRef() {
  currentSession = getCurrentSession();
  if (!currentSession) return;

  if (!Array.isArray(currentSession.characters)) {
    currentSession.characters = [];
  }

  if (!Array.isArray(currentSession.logs)) {
    currentSession.logs = [];
  }

  currentSession.characters = currentSession.characters.map(char => ensureCocCharacter(char));

  if (
    currentSession.selectedCharacterId &&
    !currentSession.characters.some(c => c.id === currentSession.selectedCharacterId)
  ) {
    currentSession.selectedCharacterId =
      currentSession.characters[0]?.id || null;
  }

  if (
    !currentSession.selectedCharacterId &&
    currentSession.characters.length > 0
  ) {
    currentSession.selectedCharacterId = currentSession.characters[0].id;
  }

  selectedCharacterId = currentSession.selectedCharacterId;
}

function persistAndRefresh() {
  if (currentSession) {
    currentSession.updatedAt = new Date().toISOString();
    currentSession.selectedCharacterId = selectedCharacterId;
  }
  saveAppState(appState);
  renderAll();
}

function createSession() {
  const titleInput = document.getElementById("sessionTitleInput");
  const subjectInput = document.getElementById("sessionSubjectInput");
  const session = createDefaultSession();

  const customTitle = titleInput?.value.trim() || "";
  const customSubject = subjectInput?.value.trim() || "";

  if (customTitle) session.title = customTitle;
  if (customSubject) session.subject = customSubject;

  session.selectedCharacterId = session.characters[0]?.id || null;

  appState.sessions.unshift(session);

  if (!appState.openTabs.includes(session.id)) {
    appState.openTabs.push(session.id);
  }

  appState.currentSessionId = session.id;
  updateCurrentSessionRef();
  selectedCharacterId = session.selectedCharacterId;

  saveAppState(appState);

  if (titleInput) titleInput.value = "";
  if (subjectInput) subjectInput.value = "";

  renderAll();
}

function selectSession(sessionId) {
  openSessionInTab(sessionId);
}

function addLog() {
  if (!currentSession) return;

  const input = document.getElementById("logInput");
  const typeEl = document.getElementById("logType");
  const speakerSelect = document.getElementById("speakerSelect");

  const text = input?.value.trim() || "";
  const type = typeEl?.value || "dialogue";

  if (!text) return;

  if (!Array.isArray(currentSession.logs)) {
    currentSession.logs = [];
  }

  // 답멘인데 캐릭터 없으면 막기
  if (type === "dialogue" && currentSession.characters.length === 0) {
    alert("먼저 캐릭터를 추가해 주세요.");
    return;
  }

  const speakerId = type === "dialogue"
    ? speakerSelect?.value || null
    : null;

  const character = currentSession.characters.find(c => c.id === speakerId);

  const log = {
    id: "log_" + Date.now(),
    type,
    speakerId: character?.id || null,
    speakerName:
      type === "dialogue"
        ? (character?.name || "삭제된 캐릭터")
        : (type === "system" ? "시스템" : "메모"),
    text,
    createdAt: new Date().toISOString()
  };

  currentSession.logs.push(log);

  if (input) input.value = "";

  persistAndRefresh();
}

function clearComposer() {
  const input = document.getElementById("logInput");
  if (input) input.value = "";
}

function saveGoal() {
  if (!currentSession) return;
  const goalInput = document.getElementById("goalInput");
  currentSession.goal = goalInput?.value.trim() || "";
  persistAndRefresh();
}

function getCharacterById(id) {
  return currentSession?.characters?.find(c => c.id === id) || null;
}

function renderSessionList() {
  const wrap = document.getElementById("sessionList");
  if (!wrap) return;

  wrap.innerHTML = "";

  appState.sessions.forEach(session => {
    const card = document.createElement("button");
    card.className = "session-card" + (session.id === appState.currentSessionId ? " active" : "");
    card.type = "button";

    const coverHtml = session.coverImage
      ? `<img class="session-cover" src="${session.coverImage}" alt="cover" />`
      : `<div class="session-cover fallback">${escapeHtml((session.title || "S")[0] || "S")}</div>`;

    card.innerHTML = `
      ${coverHtml}
      <div class="session-meta">
        <h4>${escapeHtml(session.title)}</h4>
        <p>${escapeHtml(session.subject || "태그 없음")}</p>
      </div>
      <button class="session-delete-btn" type="button" title="세션 삭제">🗑</button>
    `;

    const deleteBtn = card.querySelector(".session-delete-btn");
    deleteBtn?.addEventListener("click", (event) => {
      event.stopPropagation();
      deleteSession(session.id);
    });
    

    card.addEventListener("click", () => openSessionInTab(session.id));
    wrap.appendChild(card);
  });
}

function resolveLogTone(log) {
  if (!currentSession || log.type !== "dialogue") return "";
  const idx = currentSession.characters.findIndex(c => c.id === log.speakerId);
  return idx % 2 === 0 ? "user-tone" : "partner-tone";
}

function renderLogs() {
  const container = document.getElementById("logContainer");
  if (!container) return;

  container.innerHTML = "";

  if (!currentSession?.logs?.length) {
    container.innerHTML = `<div class="empty-state">아직 로그가 없습니다. 첫 장면을 시작해 보세요.</div>`;
    return;
  }

  currentSession.logs.forEach(log => {
    const card = document.createElement("div");
    card.className = `log-card ${log.type} ${resolveLogTone(log)}`.trim();

    const character = getCharacterById(log.speakerId);
    const avatarHtml = character?.avatar
      ? `<img class="log-avatar" src="${character.avatar}" alt="avatar" />`
      : `<div class="log-avatar-fallback">${escapeHtml((log.speakerName || "?")[0] || "?")}</div>`;

    const subText = LOG_TYPE_LABELS[log.type] || log.type;
    const body = escapeHtml(log.text);

    let extra = "";
    if (log.type === "roll") {
      const outcomeLabel = {
        critical: "크리티컬",
        extreme: "극단적 성공",
        hard: "어려운 성공",
        success: "성공",
        failure: "실패",
        fumble: "펌블"
      }[log.outcome] || "판정";

      extra = `<div class="roll-badge ${log.outcome}">${outcomeLabel}</div>`;
    }

    card.innerHTML = `
      <div class="log-header">
        <div class="log-left">
          ${avatarHtml}
          <div>
            <div class="log-speaker">${escapeHtml(log.speakerName || "시스템")}</div>
            <div class="log-sub">${escapeHtml(subText)}</div>
          </div>
        </div>
        <div class="log-time">${new Date(log.createdAt).toLocaleTimeString("ko-KR", {
          hour: "2-digit",
          minute: "2-digit"
        })}</div>
      </div>
      <div class="log-body">${body}</div>
      ${extra}
    `;

    container.appendChild(card);
  });

  container.scrollTop = container.scrollHeight;
}

function renderSessionHeader() {
  const titleEl = document.getElementById("currentSessionTitle");
  const metaEl = document.getElementById("currentSessionMeta");
  const goalInput = document.getElementById("goalInput");

  if (!titleEl || !metaEl) return;

  if (!currentSession) {
    titleEl.textContent = "세션이 없습니다.";
    metaEl.textContent = "새 세션을 만들어 주세요.";
    if (goalInput) goalInput.value = "";
    return;
  }

  titleEl.textContent = currentSession.title;
  metaEl.textContent = `${currentSession.subject || "태그 없음"} · 캐릭터 ${currentSession.characters.length}명`;

  if (goalInput) {
    goalInput.value = currentSession.goal || "";
  }
}

function populateCharacterSelects() {
  if (!currentSession || !Array.isArray(currentSession.characters)) return;

  const ids = ["speakerSelect", "characterSelect", "diceCharacter"];

  ids.forEach(id => {
    const select = document.getElementById(id);
    if (!select) return;

    select.innerHTML = "";

    currentSession.characters.forEach(char => {
      const option = document.createElement("option");
      option.value = char.id;
      option.textContent = char.name;
      select.appendChild(option);
    });
  });

  if (currentSession.characters.length === 0) {
    const skillSelect = document.getElementById("diceSkill");
    const targetInput = document.getElementById("diceTarget");

    if (skillSelect) skillSelect.innerHTML = "";
    if (targetInput) targetInput.value = "";

    return;
  }

  // 캐릭터 있을 때만 실행
  ["speakerSelect", "characterSelect", "diceCharacter"].forEach(id => {
    const select = document.getElementById(id);
    if (select && selectedCharacterId) {
      select.value = selectedCharacterId;
    }
  });

  populateSkillSelect();
}

function populateSkillSelect() {
  const diceCharacter = document.getElementById("diceCharacter");
  const skillSelect = document.getElementById("diceSkill");
  const modeSelect = document.getElementById("diceMode");

  if (!diceCharacter || !skillSelect) return;

  const char = getCharacterById(diceCharacter.value);
  const mode = modeSelect?.value || "skill";

  skillSelect.innerHTML = "";

  if (!char) return;

  ensureCocCharacter(char);

  if (mode === "attribute") {
    const attributeLabels = {
      str: "STR",
      con: "CON",
      siz: "SIZ",
      dex: "DEX",
      app: "APP",
      int: "INT",
      pow: "POW",
      edu: "EDU"
    };

    Object.entries(char.coc.attributes).forEach(([key, value]) => {
      const option = document.createElement("option");
      option.value = key;
      option.dataset.target = value;
      option.textContent = `${attributeLabels[key] || key} (${value})`;
      skillSelect.appendChild(option);
    });
  } else {
    const skillLabels = {
      spotHidden: "관찰력",
      listen: "듣기",
      psychology: "심리학",
      persuade: "설득",
      law: "법률",
      libraryUse: "자료조사"
    };

    Object.entries(char.coc.skills).forEach(([key, value]) => {
      const option = document.createElement("option");
      option.value = key;
      option.dataset.target = value;
      option.textContent = `${skillLabels[key] || key} (${value})`;
      skillSelect.appendChild(option);
    });
  }

  syncDiceTargetFromSkill();
}

function syncDiceTargetFromSkill() {
  const skillSelect = document.getElementById("diceSkill");
  const targetInput = document.getElementById("diceTarget");
  if (!skillSelect || !targetInput) return;

  const selected = skillSelect.options[skillSelect.selectedIndex];
  targetInput.value = selected?.dataset.target || "";
}

function renderCharacterCard() {
  const char = getCharacterById(selectedCharacterId);

  const nameInput = document.getElementById("characterNameInput");
  const colorInput = document.getElementById("characterColorInput");
  const descInput = document.getElementById("characterDescInput");
  const avatar = document.getElementById("characterAvatarPreview");
  const fallback = document.getElementById("avatarFallback");

  const playerInput = document.getElementById("playerInput");
  const jobInput = document.getElementById("jobInput");
  const hpInput = document.getElementById("hpInput");
  const mpInput = document.getElementById("mpInput");
  const sanInput = document.getElementById("sanInput");
  const luckInput = document.getElementById("luckInput");

  const skillSpotHiddenInput = document.getElementById("skillSpotHiddenInput");
  const skillListenInput = document.getElementById("skillListenInput");
  const skillPsychologyInput = document.getElementById("skillPsychologyInput");
  const skillPersuadeInput = document.getElementById("skillPersuadeInput");
  const skillLawInput = document.getElementById("skillLawInput");
  const skillLibraryUseInput = document.getElementById("skillLibraryUseInput");

  if (
    !nameInput || !colorInput || !descInput || !avatar || !fallback ||
    !playerInput || !jobInput || !hpInput || !mpInput || !sanInput || !luckInput ||
    !skillSpotHiddenInput || !skillListenInput || !skillPsychologyInput ||
    !skillPersuadeInput || !skillLawInput || !skillLibraryUseInput
  ) {
    return;
  }

  if (!char) {
    nameInput.value = "";
    colorInput.value = "#7aa2ff";
    descInput.value = "";

    playerInput.value = "";
    jobInput.value = "";
    hpInput.value = "";
    mpInput.value = "";
    sanInput.value = "";
    luckInput.value = "";

    skillSpotHiddenInput.value = "";
    skillListenInput.value = "";
    skillPsychologyInput.value = "";
    skillPersuadeInput.value = "";
    skillLawInput.value = "";
    skillLibraryUseInput.value = "";

    avatar.removeAttribute("src");
    avatar.style.display = "none";
    fallback.style.display = "grid";
    fallback.textContent = "?";
    fallback.style.background = `linear-gradient(135deg, #7aa2ff, var(--accent-2))`;

    document.querySelectorAll('.stat-input[data-stat]').forEach(input => {
      input.value = "";
    });
    return;
  }

  ensureCocCharacter(char);

  nameInput.value = char.name || "";
  colorInput.value = char.color || "#7aa2ff";
  descInput.value = char.description || "";

  if (char.avatar) {
    avatar.src = char.avatar;
    avatar.style.display = "block";
    fallback.style.display = "none";
  } else {
    avatar.removeAttribute("src");
    avatar.style.display = "none";
    fallback.style.display = "grid";
    fallback.textContent = (char.name || "?")[0] || "?";
    fallback.style.background = `linear-gradient(135deg, ${char.color || "#7aa2ff"}, var(--accent-2))`;
  }

  playerInput.value = char.coc.info.player || "";
  jobInput.value = char.coc.info.occupation || "";

  document.querySelectorAll('.stat-input[data-stat]').forEach(input => {
    const key = input.dataset.stat;
    input.value = char.coc.attributes[key] ?? "";
  });

  hpInput.value = char.coc.derived.hp.current ?? 0;
  mpInput.value = char.coc.derived.mp.current ?? 0;
  sanInput.value = char.coc.derived.san.current ?? 0;
  luckInput.value = char.coc.derived.luck ?? 0;

  skillSpotHiddenInput.value = char.coc.skills.spotHidden ?? 0;
  skillListenInput.value = char.coc.skills.listen ?? 0;
  skillPsychologyInput.value = char.coc.skills.psychology ?? 0;
  skillPersuadeInput.value = char.coc.skills.persuade ?? 0;
  skillLawInput.value = char.coc.skills.law ?? 0;
  skillLibraryUseInput.value = char.coc.skills.libraryUse ?? 0;
}

function saveCurrentCharacter() {
  const char = getCharacterById(selectedCharacterId);
  if (!char || !currentSession) return;

  ensureCocCharacter(char);

  const nameInput = document.getElementById("characterNameInput");
  const colorInput = document.getElementById("characterColorInput");
  const descInput = document.getElementById("characterDescInput");

  const playerInput = document.getElementById("playerInput");
  const jobInput = document.getElementById("jobInput");
  const hpInput = document.getElementById("hpInput");
  const mpInput = document.getElementById("mpInput");
  const sanInput = document.getElementById("sanInput");
  const luckInput = document.getElementById("luckInput");

  const skillSpotHiddenInput = document.getElementById("skillSpotHiddenInput");
  const skillListenInput = document.getElementById("skillListenInput");
  const skillPsychologyInput = document.getElementById("skillPsychologyInput");
  const skillPersuadeInput = document.getElementById("skillPersuadeInput");
  const skillLawInput = document.getElementById("skillLawInput");
  const skillLibraryUseInput = document.getElementById("skillLibraryUseInput");

  if (
    !nameInput || !colorInput || !descInput ||
    !playerInput || !jobInput || !hpInput || !mpInput || !sanInput || !luckInput ||
    !skillSpotHiddenInput || !skillListenInput || !skillPsychologyInput ||
    !skillPersuadeInput || !skillLawInput || !skillLibraryUseInput
  ) {
    return;
  }

  char.name = nameInput.value.trim() || "이름 없음";
  char.color = colorInput.value || "#7aa2ff";
  char.description = descInput.value.trim();

  char.coc.info.player = playerInput.value.trim();
  char.coc.info.occupation = jobInput.value.trim();

  document.querySelectorAll('.stat-input[data-stat]').forEach(input => {
    const key = input.dataset.stat;
    char.coc.attributes[key] = Number(input.value) || 0;
  });

  char.coc.derived.hp.current = Number(hpInput.value) || 0;
  char.coc.derived.mp.current = Number(mpInput.value) || 0;
  char.coc.derived.san.current = Number(sanInput.value) || 0;
  char.coc.derived.luck = Number(luckInput.value) || 0;

  char.coc.skills.spotHidden = Number(skillSpotHiddenInput.value) || 0;
  char.coc.skills.listen = Number(skillListenInput.value) || 0;
  char.coc.skills.psychology = Number(skillPsychologyInput.value) || 0;
  char.coc.skills.persuade = Number(skillPersuadeInput.value) || 0;
  char.coc.skills.law = Number(skillLawInput.value) || 0;
  char.coc.skills.libraryUse = Number(skillLibraryUseInput.value) || 0;

  currentSession.selectedCharacterId = selectedCharacterId;
  persistAndRefresh();
}

function addCharacter() {
  if (!currentSession) return;

  const char = createDefaultCocCharacter();

  currentSession.characters.push(char);

  selectedCharacterId = char.id;
  currentSession.selectedCharacterId = char.id;

  persistAndRefresh();
}

function handleAvatarUpload(file) {
  const char = getCharacterById(selectedCharacterId);
  if (!char || !file) return;

  const reader = new FileReader();
  reader.onload = event => {
    char.avatar = event.target.result;
    persistAndRefresh();
  };
  reader.readAsDataURL(file);
}

function deleteCharacter() {
  if (!currentSession || !selectedCharacterId) return;
  if (currentSession.characters.length <= 1) {
    alert("캐릭터는 최소 1명 이상 있어야 합니다.");
    return;
  }

  const target = getCharacterById(selectedCharacterId);
  const ok = confirm(`"${target?.name || "이 캐릭터"}"를 삭제하시겠습니까?`);
  if (!ok) return;

  currentSession.characters = currentSession.characters.filter(
    c => c.id !== selectedCharacterId
  );

  const next = currentSession.characters[0] || null;
  selectedCharacterId = next ? next.id : null;
  currentSession.selectedCharacterId = selectedCharacterId;

  persistAndRefresh();
}

function renderAll() {
  updateCurrentSessionRef();
  renderSessionList();
  renderTabs();
  renderSessionHeader();

  if (!currentSession) {
    renderLogs();
    return;
  }

  populateCharacterSelects();
  renderCharacterCard();
  renderLogs();
  renderTimer();
}

function openSessionInTab(sessionId) {
  if (!appState.openTabs.includes(sessionId)) {
    appState.openTabs.push(sessionId);
  }

  appState.currentSessionId = sessionId;
  updateCurrentSessionRef();
  saveAppState(appState);
  renderAll();
}

function closeTab(sessionId) {
  if (!appState.openTabs.includes(sessionId)) return;
  if (appState.openTabs.length === 1) return;

  appState.openTabs = appState.openTabs.filter(id => id !== sessionId);

  if (appState.currentSessionId === sessionId) {
    appState.currentSessionId = appState.openTabs[appState.openTabs.length - 1];
  }

  updateCurrentSessionRef();
  saveAppState(appState);
  renderAll();
}

function shortenTabTitle(title, max = 18) {
  if (title.length <= max) return title;
  return title.slice(0, max) + "...";
}

function deleteSession(sessionId) {
  if (!confirm("이 세션을 삭제하시겠습니까?")) return;

  // sessions에서 제거
  appState.sessions = appState.sessions.filter(s => s.id !== sessionId);

  // openTabs에서도 제거
  appState.openTabs = appState.openTabs.filter(id => id !== sessionId);

  // currentSession 재설정
  if (appState.currentSessionId === sessionId) {
    const next = appState.openTabs[0] || appState.sessions[0];
    appState.currentSessionId = next ? (next.id || next) : null;
  }

  // 세션이 하나도 없으면 새로 생성
  if (appState.sessions.length === 0) {
    const newSession = createDefaultSession();
    appState.sessions.push(newSession);
    appState.currentSessionId = newSession.id;
    appState.openTabs = [newSession.id];
  }

  updateCurrentSessionRef();
  saveAppState(appState);
  renderAll();
}

function renderTabs() {
  const bar = document.getElementById("tabBar");
  if (!bar) return;

  bar.innerHTML = "";

  appState.openTabs.forEach(sessionId => {
    const session = appState.sessions.find(s => s.id === sessionId);
    if (!session) return;

    const tab = document.createElement("div");
    tab.className = "tab-item" + (sessionId === appState.currentSessionId ? " active" : "");

    const title = document.createElement("span");
    title.className = "tab-title";
    title.textContent = shortenTabTitle(session.title);
    title.title = session.title;

    title.addEventListener("click", () => {
      appState.currentSessionId = sessionId;
      updateCurrentSessionRef();
      saveAppState(appState);
      renderAll();
    });

    const closeBtn = document.createElement("button");
    closeBtn.className = "tab-close";
    closeBtn.type = "button";
    closeBtn.textContent = "✕";

    closeBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      closeTab(sessionId);
    });

    tab.appendChild(title);
    tab.appendChild(closeBtn);
    bar.appendChild(tab);
  });
}

function downloadFile(filename, content, mimeType = "text/plain") {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();

  URL.revokeObjectURL(url);
}

function convertSessionToMarkdown(session) {
  if (!session) return "";

  const lines = [];

  lines.push(`# ${session.title || "제목 없는 세션"}`);
  lines.push("");
  lines.push(`- 과목: ${session.subject || "없음"}`);
  lines.push(`- 목표: ${session.goal || "없음"}`);
  lines.push(`- 생성일: ${session.createdAt || ""}`);
  lines.push("");
  lines.push("---");
  lines.push("");

  session.logs.forEach(log => {
    const time = log.createdAt
      ? new Date(log.createdAt).toLocaleTimeString("ko-KR", {
          hour: "2-digit",
          minute: "2-digit"
        })
      : "";

    const label = LOG_TYPE_LABELS[log.type] || log.type;
    const speaker = log.speakerName || "시스템";

    lines.push(`## ${speaker} [${label}] ${time}`);
    lines.push(log.text || "");

    if (log.type === "roll") {
      const outcomeLabel = {
        critical: "크리티컬",
        extreme: "극단적 성공",
        hard: "어려운 성공",
        success: "성공",
        failure: "실패",
        fumble: "펌블"
      }[log.outcome] || "판정";

      lines.push(`→ ${outcomeLabel}`);
    }

    lines.push("");
  });

  return lines.join("\\n");
}

function exportCurrentSessionMarkdown() {
  if (!currentSession) return;

  const md = convertSessionToMarkdown(currentSession);
  const safeTitle = (currentSession.title || "session")
    .replace(/[\\\\/:*?"<>|]/g, "_");

  downloadFile(`${safeTitle}.md`, md, "text/markdown");
}

window.addLog = addLog;
window.createSession = createSession;
window.saveGoal = saveGoal;
window.clearComposer = clearComposer;
window.renderAll = renderAll;
window.updateCurrentSessionRef = updateCurrentSessionRef;
window.populateSkillSelect = populateSkillSelect;
window.renderCharacterCard = renderCharacterCard;
window.saveCurrentCharacter = saveCurrentCharacter;
window.addCharacter = addCharacter;
window.deleteCharacter = deleteCharacter;
window.handleAvatarUpload = handleAvatarUpload;
window.exportCurrentSessionMarkdown = exportCurrentSessionMarkdown;

Object.defineProperty(window, "currentSession", {
  get: () => currentSession,
  set: v => currentSession = v
});

Object.defineProperty(window, "appState", {
  get: () => appState,
  set: v => appState = v
});

Object.defineProperty(window, "selectedCharacterId", {
  get: () => selectedCharacterId,
  set: v => selectedCharacterId = v
});
