export const PIECES = {
  WHITE: {
    PAWN: 'P', ROOK: 'R', KNIGHT: 'N', BISHOP: 'B', QUEEN: 'Q', KING: 'K'
  },
  BLACK: {
    PAWN: 'p', ROOK: 'r', KNIGHT: 'n', BISHOP: 'b', QUEEN: 'q', KING: 'k'
  }
};

export function isWhite(piece) {
  return piece && piece === piece.toUpperCase();
}

export function isBlack(piece) {
  return piece && piece === piece.toLowerCase();
}
