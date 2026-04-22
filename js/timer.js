
let timerInterval = null;

function getTimerState() {
  return currentSession?.timer || null;
}

function renderTimer() {
  const timer = getTimerState();
  if (!timer) return;
  const min = Math.floor(timer.remainingSec / 60);
  const sec = timer.remainingSec % 60;
  document.getElementById("timerDisplay").textContent = `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

function stopTimerTick() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function tickTimer() {
  const timer = getTimerState();
  if (!timer) return;
  if (timer.remainingSec > 0) {
    timer.remainingSec -= 1;
    currentSession.updatedAt = new Date().toISOString();
    saveAppState(appState);
    renderTimer();
  } else {
    timer.isRunning = false;
    timer.lastStartedAt = null;
    stopTimerTick();
    saveAppState(appState);
    currentSession.logs.push({
      id: "log_" + Date.now(),
      type: "system",
      speakerId: null,
      speakerName: "시스템",
      text: "타이머가 종료되었습니다.",
      createdAt: new Date().toISOString()
    });
    renderAll();
  }
}

function startTimer() {
  const timer = getTimerState();
  if (!timer || timer.isRunning) return;
  timer.isRunning = true;
  timer.lastStartedAt = Date.now();
  stopTimerTick();
  timerInterval = setInterval(tickTimer, 1000);
  saveAppState(appState);
}

function pauseTimer() {
  const timer = getTimerState();
  if (!timer) return;
  timer.isRunning = false;
  timer.lastStartedAt = null;
  stopTimerTick();
  saveAppState(appState);
}

function resetTimer(seconds = null) {
  const timer = getTimerState();
  if (!timer) return;
  pauseTimer();
  timer.durationSec = seconds ?? timer.durationSec;
  timer.remainingSec = seconds ?? timer.durationSec;
  saveAppState(appState);
  renderTimer();
}
