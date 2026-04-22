function rollDice() {
  if (!currentSession) return;
  const result = Math.floor(Math.random() * 100) + 1;
  currentSession.logs.push({ text: "🎲 " + result, type: "dice" });
  saveData("sessions", sessions);
  renderLogs();
}