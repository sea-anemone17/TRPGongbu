function saveData(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

function loadData(key) {
  return JSON.parse(localStorage.getItem(key) || "null");
}