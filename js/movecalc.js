
/**
 * Evaluates current chess board relative to player
 * @param {string} color - Players color, either 'b' or 'w'
 * @return {Number} board value relative to player
 */
var evaluateBoard = function(board, color) {
  // Sets the value for each piece using standard piece value
  for (var key in table){
      //console.log(game.fen(),key)
      if(game.fen()=== key)
      {
        console.log("Looked at this Game before!")
        return [evaluateBoard(game.board(),playerColor),table[game.fen()]];
      }
    }
  var pieceValue = {
    'p': 100,
    'n': 350,
    'b': 350,
    'r': 525,
    'q': 1000,
    'k': 10000
  };
  // Loop through all pieces on the board and sum up total
  var value = 0;
  board.forEach(function(row) {
    row.forEach(function(piece) {
      if (piece) {
        // Subtract piece value if it is opponent's piece
        value += pieceValue[piece['type']]
                 * (piece['color'] === color ? 1 : -1);
      }
    });
  });
  return value;
};


/**
 * Calculates the best move using Minimax with Alpha Beta Pruning.
 * @param {Number} depth - How many moves ahead to evaluate
 * @param {Object} game - The game to evaluate
 * @param {string} playerColor - Players color, either 'b' or 'w'
 * @param {Number} alpha
 * @param {Number} beta
 * @param {Boolean} isMaximizingPlayer - If current turn is maximizing or minimizing player
 * @return {Array} The best move value, and the best move
 */
var calcBestMove = function(depth, game, playerColor,
                            alpha=Number.NEGATIVE_INFINITY,
                            beta=Number.POSITIVE_INFINITY,
                            isMaximizingPlayer=true) {
  var value = 0;
  // Base case: evaluate board
  if (depth === 0) {
    value = evaluateBoard(game.board(), playerColor);
    return [value, null];
  }


  // Recursive case: search possible moves
  var bestMove = null; // best move not set yet
  var possibleMoves = game.moves();
  // Set random order for possible moves
  if(totalMoves<10){
    possibleMoves.sort(function(a, b){return 0.5 - Math.random()});
  }
  else{
    possibleMoves.sort(function(a, b)
      {
        game.move(a);
        v1 = evaluateBoard(game.board(),playerColor);
        game.undo();

        game.move(b);
        v2 = evaluateBoard(game.board(),playerColor);
        game.undo();

        if (v2 > v1) {
          return 1;
        }
        if (v1 > v2) {
            return -1;
        }
        return 0;
      });
  }
  // Set a default best move value
  var bestMoveValue = isMaximizingPlayer ? Number.NEGATIVE_INFINITY
                                         : Number.POSITIVE_INFINITY;
  //var captureMoves = game.moves({verbose:true}).filter(obj=>{return obj.flags.indexOf("c")!=-1});
  //console.log(possibleMoves,game.moves({verbose:true}).filter(obj=>{return obj.flags.indexOf("c")!=-1}));
  // Search through all possible moves
  var v_b = evaluateBoard(game.board(),playerColor);

  for (var i = 0; i < possibleMoves.length; i++) {
    var move = possibleMoves[i];
    // Make the move, but undo before exiting loop
    // Recursively get the value from this move
    game.move(move);
    var v_a = evaluateBoard(game.board(),playerColor);
    if(depth == 1 & v_b!=v_a){
      value = -Quiesce(-beta,-alpha,0);
    }
    else{
      value = calcBestMove(depth-1, game, playerColor, alpha, beta, !isMaximizingPlayer)[0];
    }

    //console.log(move,i,possibleMoves.length,depth);
  /*
    if(move.flags.indexOf("c")!=-1 && depth==3){
      value = -Quiesce(-beta,-alpha);
    }
    else{

*/
    //}
    if(game.in_checkmate() == true){
      value = 10000000;
    }
    // Log the value of this move

    //console.log(isMaximizingPlayer ? 'Max: ' : 'Min: ', depth, move, value,
    //            bestMove, bestMoveValue);

    if (isMaximizingPlayer) {
      // Look for moves that maximize position
      if (value > bestMoveValue) {
        bestMoveValue = value;
        bestMove = move;
      }
      alpha = Math.max(alpha, value);
    } else {
      // Look for moves that minimize position
      if (value < bestMoveValue) {
        bestMoveValue = value;
        bestMove = move;
      }
      beta = Math.min(beta, value);
    }
    // Undo previous move
    game.undo();
    // Check for alpha beta pruning
    if (beta <= alpha) {
      //console.log('Prune', alpha, beta);
      break;
    }

  }
  // Log the best move at the current depth
  //console.log('Depth: ' + depth + ' | Best Move: ' + bestMove + ' | ' + bestMoveValue + ' | A: ' + alpha + ' | B: ' + beta);
  // Return the best move, or the only move
  //table[[game.fen(),depth]] = [bestMoveValue,bestMove];
  return [bestMoveValue, bestMove || possibleMoves[0]];
}

// not working properly
var interativeDeepening = function(game,skill)
{
  table = {};
  var bestmove;
  for(var distance = 1; distance <= skill; distance++) {
    //console.log("Checking at Distance ="+distance);
    bestmove = calcBestMove(distance,game,game.turn())[1];
  }

  return bestmove;
}

var Quiesce = function(alpha,beta,depth)
{
  var stand_pat = evaluateBoard(game.board(),game.turn());

  if(depth == 5){
    if( stand_pat >= beta )
          return beta;
    return alpha;
  }
  var score;
  //console.log("Testing for a Quiet State",alpha,beta,stand_pat);


  if( stand_pat >= beta )
        return beta;
    if( alpha < stand_pat )
        alpha = stand_pat;

  var possibleMoves = game.moves({verbose:true});
  for (var i = 0; i<possibleMoves.length;i++){
    var move = possibleMoves[i];
    //console.log(move,i,possibleMoves.length);
    game.move(move);

    if(game.in_checkmate() == true){
      score =  -10000000;
    }
    else if(move.flags.indexOf("c")!=-1)
    {
      score = -Quiesce(-beta,-alpha,depth+1);
    }
      game.undo();
      if( score >= beta )
            return beta;
        if( score > alpha )
           alpha = score;
    }



  return alpha;
}
