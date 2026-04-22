let sessions = loadData("sessions") || [];
let currentSession = null;

function createSession() {
  const session = {
    id: Date.now(),
    logs: []
  };
  sessions.push(session);
  currentSession = session;
  saveData("sessions", sessions);
  renderSessions();
  renderLogs();
}

function renderSessions() {
  const list = document.getElementById("sessionList");
  list.innerHTML = "";
  sessions.forEach(s => {
    const li = document.createElement("li");
    li.textContent = "Session " + s.id;
    li.onclick = () => {
      currentSession = s;
      renderLogs();
    };
    list.appendChild(li);
  });
}

function renderLogs() {
  const container = document.getElementById("logContainer");
  container.innerHTML = "";
  if (!currentSession) return;

  currentSession.logs.forEach(log => {
    const div = document.createElement("div");
    div.textContent = log.text;
    div.className = "log-" + log.type;
    container.appendChild(div);
  });
}

function addLog() {
  const input = document.getElementById("logInput");
  if (!currentSession) return;
  currentSession.logs.push({ text: input.value, type: "user" });
  input.value = "";
  saveData("sessions", sessions);
  renderLogs();
}