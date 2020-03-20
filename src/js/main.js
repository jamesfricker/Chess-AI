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
  var start = new Date().getTime();

  if (game.game_over() === true) {
    console.log('game over');
    return;
  }
  var pc = game.turn() === 'w' ? "w" : "b";

  var move = calcBestMove(skill, game, pc)[1];
  //var move = interativeDeepening(game,skill);

  // Make the calculated move
  game.move(move);
  console.log(move.from,move.to);
  // Update board positions
  var end = new Date().getTime();
  var time = end - start;
  console.log('Time to move: ' + time);
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

  var skill = game.turn() === 'w' ? skillW : skillB;
  makeMove(skill);
  table = {};
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
  //console.log(move)

  window.setTimeout(function() {
  makeMove();
  }, 250);
};
