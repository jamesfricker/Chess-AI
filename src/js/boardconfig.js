var board,
    game = new Chess();



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
    else{
    alert('Game Over');
    console.log('Game Over');
    }
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

// counts number of pieces of a colour
var piecesRemaining = function(colour) {
  var num = 0;
  board.forEach(function(row) {
    row.forEach(function(piece) {
      if (piece['color']==colour) {
        // Subtract piece value if it is opponent's piece
        num += 1;
      }
    });
  });
  return num;
}

// Update the board position after the piece snap
// for castling, en passant, pawn promotion
var onSnapEnd = function() {
  board.position(game.fen());
  if(piecesRemaining("b") < 5  || piecesRemaining("w") < 5){
    playGame(10,10);
  }
};

// Configure board
var cfg = {
  draggable: true,
  position: 'start',
  // Handlers for user actions
  onMoveEnd: onMoveEnd,
  onDragStart: onDragStart,
  onDrop: onDrop,
  onSnapEnd: onSnapEnd
}
board = ChessBoard('board', cfg);
playGame(3,3)