export function enableDrag(board, renderer, generator, moveCallback) {
  let selected = null;

  document.addEventListener("mousedown", (e) => {
    if (e.target.classList.contains("piece")) {
      selected = e.target.parentElement.dataset.index;
    }
  });

  document.addEventListener("mouseup", (e) => {
    if (!selected) return;

    const dropSquare = e.target.closest(".square")?.dataset.index;
    if (!dropSquare) return;

    const legalMoves = generator.generateMoves();
    const move = legalMoves.find(
      (m) => m.from == selected && m.to == dropSquare
    );

    if (move) moveCallback(move);

    selected = null;
  });
}
