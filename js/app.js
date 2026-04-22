document.getElementById("themeSelector").addEventListener("change", e => {
  document.body.setAttribute("data-theme", e.target.value);
});

renderSessions();