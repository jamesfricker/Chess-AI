// Computer makes a move with algorithm choice and skill/depth level
var makeMove = function(skill=3) {
  // exit if the game is over
  if (game.game_over() === true) {
    console.log('game over');
    return;
  }
  // Calculate the best move, using chosen algorithm
  
  var move = calcBestMove(skill, game, game.turn())[1];
  
  // Make the calculated move
  game.move(move);
  // Update board positions
  board.position(game.fen());
}

// Computer vs Computer
var playGame = function() {
  if (game.game_over() === true) {
    console.log('game over');
    return;
  }
  skillW = 3;
  skillB = 4;
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
};
