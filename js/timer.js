let time = 1500;
let interval = null;

function startTimer() {
  if (interval) return;
  interval = setInterval(() => {
    time--;
    updateTimer();
    if (time <= 0) clearInterval(interval);
  }, 1000);
}

function updateTimer() {
  const min = Math.floor(time / 60);
  const sec = time % 60;
  document.getElementById("timer").textContent =
    min + ":" + (sec < 10 ? "0" : "") + sec;
}