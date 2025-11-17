export class Board {
  constructor() {
    this.squares = new Array(64).fill(null);
    this.history = [];
  }

  loadPosition(fenObj) {
    this.squares = fenObj.squares;
    this.turn = fenObj.turn;
    this.castling = fenObj.castling;
    this.enPassant = fenObj.enPassant;
    this.halfMoves = fenObj.halfMoves;
    this.fullMoves = fenObj.fullMoves;
  }

  movePiece(move) {
    this.history.push(JSON.parse(JSON.stringify(this.squares)));
    this.squares[move.to] = this.squares[move.from];
    this.squares[move.from] = null;
  }

  undo() {
    if (this.history.length > 0) {
      this.squares = this.history.pop();
    }
  }
}
