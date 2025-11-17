export function parseFEN(fen) {
  const [piecePlacement, turn, castling, ep, half, full] = fen.split(" ");
  const squares = [];

  piecePlacement.split("/").forEach((row) => {
    for (let c of row) {
      if (isNaN(c)) squares.push(c);
      else squares.push(...Array(Number(c)).fill(null));
    }
  });

  return {
    squares,
    turn,
    castling,
    enPassant: ep === "-" ? null : ep,
    halfMoves: parseInt(half),
    fullMoves: parseInt(full),
  };
}

export const START_FEN =
  "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
