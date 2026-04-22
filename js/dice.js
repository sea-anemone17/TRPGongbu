
function evaluateRoll(roll, target) {
  if (roll === 100) return "fumble";
  if (roll === 1) return "critical";
  if (roll <= target / 5) return "extreme";
  if (roll <= target / 2) return "hard";
  if (roll <= target) return "success";
  return "failure";
}

function rollDice() {
  if (!currentSession) return;

  const charSelect = document.getElementById("diceCharacter");
  const skillSelect = document.getElementById("diceSkill");
  const targetInput = document.getElementById("diceTarget");

  const character = getCharacterById(charSelect.value);
  const skillKey = skillSelect.value;
  const skillName = SKILL_LABELS[skillKey] || "기능";
  const target = Number(targetInput.value);

  if (!character) return alert("캐릭터를 선택해 주세요.");
  if (!target || target < 1) return alert("기능치를 입력해 주세요.");

  const roll = Math.floor(Math.random() * 100) + 1;
  const outcome = evaluateRoll(roll, target);

  const outcomeLabel = {
    critical: "크리티컬",
    extreme: "극단적 성공",
    hard: "어려운 성공",
    success: "성공",
    failure: "실패",
    fumble: "펌블"
  }[outcome];

  currentSession.logs.push({
    id: "log_" + Date.now(),
    type: "roll",
    speakerId: character.id,
    speakerName: character.name,
    text: `${skillName} 판정 · 주사위 ${roll} / 기능치 ${target}`,
    createdAt: new Date().toISOString(),
    roll,
    target,
    outcome
  });

  saveAppState(appState);
  renderAll();
}
