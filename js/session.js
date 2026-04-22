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

  if (!currentSession.characters?.length) {
    currentSession.characters = createDefaultCharacters();
  }

  if (!currentSession.selectedCharacterId) {
    currentSession.selectedCharacterId = currentSession.characters[0]?.id || null;
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

  const speakerId = type === "dialogue" ? speakerSelect?.value || null : null;
  const character = currentSession.characters.find(c => c.id === speakerId);

  const log = {
    id: "log_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
    type,
    speakerId: character?.id || null,
    speakerName: character?.name || (type === "system" ? "시스템" : "메모"),
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
    `;

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
      : `<div class="log-avatar-fallback" style="background: linear-gradient(135deg, ${character?.color || 'var(--accent)'}, var(--accent-2));">${escapeHtml((log.speakerName || "?")[0] || "?")}</div>`;

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
  if (!currentSession || !currentSession.characters) return;

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
  if (!diceCharacter || !skillSelect) return;

  const char = getCharacterById(diceCharacter.value);
  skillSelect.innerHTML = "";

  if (!char) return;

  Object.entries(char.stats).forEach(([key, value]) => {
    const option = document.createElement("option");
    option.value = key;
    option.dataset.target = value;
    option.textContent = `${SKILL_LABELS[key] || key} (${value})`;
    skillSelect.appendChild(option);
  });

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
  if (!char) return;

  const nameInput = document.getElementById("characterNameInput");
  const colorInput = document.getElementById("characterColorInput");
  const descInput = document.getElementById("characterDescInput");
  const avatar = document.getElementById("characterAvatarPreview");
  const fallback = document.getElementById("avatarFallback");

  if (!nameInput || !colorInput || !descInput || !avatar || !fallback) return;

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

  document.querySelectorAll(".stat-input").forEach(input => {
    input.value = char.stats[input.dataset.stat] ?? "";
  });
}

function saveCurrentCharacter() {
  const char = getCharacterById(selectedCharacterId);
  if (!char || !currentSession) return;

  const nameInput = document.getElementById("characterNameInput");
  const colorInput = document.getElementById("characterColorInput");
  const descInput = document.getElementById("characterDescInput");

  if (!nameInput || !colorInput || !descInput) return;

  char.name = nameInput.value.trim() || "이름 없음";
  char.color = colorInput.value || "#7aa2ff";
  char.description = descInput.value.trim();

  document.querySelectorAll(".stat-input").forEach(input => {
    const key = input.dataset.stat;
    char.stats[key] = Number(input.value) || 1;
  });

  currentSession.selectedCharacterId = selectedCharacterId;
  persistAndRefresh();
}

function addCharacter() {
  if (!currentSession) return;

  const id = "char_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7);

  currentSession.characters.push({
    id,
    name: "새 캐릭터",
    avatar: "",
    color: "#a78bfa",
    description: "",
    stats: {
      observe: 50,
      insight: 50,
      persuade: 50,
      logic: 50,
      psychology: 50,
      law: 50
    }
  });

  selectedCharacterId = id;
  currentSession.selectedCharacterId = id;
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
