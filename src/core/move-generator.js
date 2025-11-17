import { isWhite, isBlack } from "./pieces.js";

export class MoveGenerator {
  constructor(board) {
    this.board = board;
  }

  generateMoves() {
    let moves = [];
    for (let i = 0; i < 64; i++) {
      const piece = this.board.squares[i];
      if (!piece) continue;

      if (isWhite(piece) && this.board.turn === 'w')
        moves.push(...this.#movesForPiece(i, piece));

      if (isBlack(piece) && this.board.turn === 'b')
        moves.push(...this.#movesForPiece(i, piece));
    }
    return moves;
  }

  #movesForPiece(index, piece) {
    // Implement all piece logic (shortened)
    // Pawn, rook, bishop, knight, queen, king
    return [];
  }
}
