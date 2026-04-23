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
  const target = Number(targetInput.value);

  const skillLabels = {
    spotHidden: "관찰력",
    listen: "듣기",
    psychology: "심리학",
    persuade: "설득",
    law: "법률",
    libraryUse: "자료조사"
  };

  const skillName = skillLabels[skillKey] || "기능";

  if (!character) {
    alert("캐릭터를 선택해 주세요.");
    return;
  }

  if (!target || target < 1) {
    alert("기능치를 입력해 주세요.");
    return;
  }

  if (!Array.isArray(currentSession.logs)) {
    currentSession.logs = [];
  }

  const roll = Math.floor(Math.random() * 100) + 1;
  const outcome = evaluateRoll(roll, target);

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

  persistAndRefresh();
}
