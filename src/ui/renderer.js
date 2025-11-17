export function renderBoard(boardState) {
  const boardEl = document.getElementById("board");
  boardEl.innerHTML = "";

  for (let i = 0; i < 64; i++) {
    const square = document.createElement("div");
    square.className = `square ${((i + Math.floor(i/8)) % 2 === 0) ? "light" : "dark"}`;
    square.dataset.index = i;

    const piece = boardState[i];
    if (piece) {
      const img = document.createElement("img");
      img.className = "piece";
      img.src = `./assets/pieces/${piece}.svg`;
      square.appendChild(img);
    }

    boardEl.appendChild(square);
  }
}
