var board,
    game = new Chess();

isComputer = false;
totalMoves = 0;

var resetGame = function()
{
    game.reset();
    board = ChessBoard('board', cfg);
    isComputer = false;
    alert("Reset the Game")
    totalMoves = 0;
}
// Actions after any move
var onMoveEnd = function(oldPos, newPos) {
  // Alert if game is over
  if (game.game_over() === true) {
    if(game.in_checkmate() == true){
      alert('Checkmate');
      console.log('Checkmate');
    }
    else if(game.in_draw() == true){
      alert('Draw');
      console.log('Draw');
    }
    else if(game.in_stalemate() == true){
      alert('Stalemate');
      console.log('Stalemate');
    }
    else if(game.in_threefold_repetition() == true){
      alert('Threefold Repetition');
      console.log('Threefold Repetition');
    }
    else{
    alert('Game Over');
    console.log('Game Over');
    }
    totalMoves+=1;
  }

  // Log the current game position
  console.log(game.fen());
};

// Check before pick pieces that it is white and game is not over
var onDragStart = function(source, piece, position, orientation) {
  if (game.game_over() === true || piece.search(/^b/) !== -1) {
    return false;
  }
};


// Update the board position after the piece snap
// for castling, en passant, pawn promotion
var onSnapEnd = function() {
  board.position(game.fen());
};

// Configure board
var cfg = {
  draggable: true,
  position: 'start',
  moveSpeed: 50,

  // Handlers for user actions
  onMoveEnd: onMoveEnd,
  onDragStart: onDragStart,
  onDrop: onDrop,
  onSnapEnd: onSnapEnd
}

var undoMove = function()
{
  game.undo();
  board.position(game.fen());
}
board = ChessBoard('board', cfg);
