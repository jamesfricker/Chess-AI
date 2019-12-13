// counts number of pieces of a colour
var piecesRemaining = function(board,colour) {
  var num = 0;
  board.forEach(function(row) {
    row.forEach(function(piece) {
      if (piece!=null && piece['color']==colour) {
        num += 1;
      }
    });
  });
  return num;
}


// Computer makes a move with algorithm choice and skill/depth level
var makeMove = function(skill=3) {
  // exit if the game is over
  if (game.game_over() === true) {
    console.log('game over');
    return;
  }
  // Calculate the best move, using chosen algorithm
  if(piecesRemaining(game.board(),'w')<4)
  {
    skill = 5;
  }
  var move = calcBestMove(skill, game, game.turn())[1];
  
  // Make the calculated move
  game.move(move);
  // Update board positions
  board.position(game.fen());
}

var computerPlay = function()
{
  isComputer = true;
  playGame();
}


// Computer vs Computer
var playGame = function() {
  if(isComputer == false){
    return 0;
  }
  if (game.game_over() === true) {
    console.log('game over');
    return;
  }
  skillW = 3;
  skillB = 3;
  if(piecesRemaining(game.board(),"w")<5)
  {
    skillB = 5;
  }
  if(piecesRemaining(game.board(),"b")<5)
  {
    skillW = 5;
  }
  var skill = game.turn() === 'w' ? skillW : skillB;
  makeMove(skill);

  // timeout so animation can finish
  window.setTimeout(function() {
    playGame();
  }, 250);
};

// Handles what to do after human makes move.
// Computer automatically makes next move
var onDrop = function(source, target) {
  // see if the move is legal
  var move = game.move({
    from: source,
    to: target,
    promotion: 'q' // NOTE: always promote to a queen for example simplicity
  });
  // If illegal move, snapback
  if (move === null) return 'snapback';

  // Log the move
  console.log(move)

  window.setTimeout(function() {
  makeMove();
  }, 250);
};
