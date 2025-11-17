export function attachUIEvents(app) {
  document.getElementById("new-game")
    .onclick = () => app.newGame();

  document.getElementById("undo")
    .onclick = () => app.undo();

  document.getElementById("ai-move")
    .onclick = () => app.requestAIMove();
}
