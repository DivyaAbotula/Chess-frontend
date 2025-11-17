export function bestMove(board) {
  let moves = board.generator.generateMoves();

  let bestScore = -Infinity;
  let bestMove = moves[0];

  for (let m of moves) {
    board.movePiece(m);
    let score = -evaluateBoard(board, 3);
    board.undo();

    if (score > bestScore) {
      bestScore = score;
      bestMove = m;
    }
  }
  return bestMove;
}

function evaluateBoard(board, depth) {
  if (depth === 0) return materialScore(board);

  let moves = board.generator.generateMoves();
  let best = -Infinity;

  for (let m of moves) {
    board.movePiece(m);
    best = Math.max(best, -evaluateBoard(board, depth - 1));
    board.undo();
  }

  return best;
}

function materialScore(board) {
  let score = 0;
  for (let p of board.squares) {
    if (!p) continue;
    const value = { p: -1, n: -3, b: -3, r: -5, q: -9, k: 0 }[p.toLowerCase()];
    score += value * (p === p.toUpperCase() ? -1 : 1);
  }
  return score;
}
