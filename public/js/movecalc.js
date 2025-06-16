// Transposition table
const transpositionTable = new Map();

// Move counter for AI analysis
let positionsEvaluated = 0;

// Constants
const INFINITY = 1000000;
const MAX_QUIESCENCE_DEPTH = 5;

// Piece values
const pieceValue = {
    'p': 100,
    'n': 320,
    'b': 330,
    'r': 500,
    'q': 900,
    'k': 20000
};

// Piece-Square tables for positional evaluation
const pst = {
    'p': [
        0, 0, 0, 0, 0, 0, 0, 0,
        50, 50, 50, 50, 50, 50, 50, 50,
        10, 10, 20, 30, 30, 20, 10, 10,
        5, 5, 10, 25, 25, 10, 5, 5,
        0, 0, 0, 20, 20, 0, 0, 0,
        5, -5, -10, 0, 0, -10, -5, 5,
        5, 10, 10, -20, -20, 10, 10, 5,
        0, 0, 0, 0, 0, 0, 0, 0
    ],
    'n': [
        -50, -40, -30, -30, -30, -30, -40, -50,
        -40, -20, 0, 0, 0, 0, -20, -40,
        -30, 0, 10, 15, 15, 10, 0, -30,
        -30, 5, 15, 20, 20, 15, 5, -30,
        -30, 0, 15, 20, 20, 15, 0, -30,
        -30, 5, 10, 15, 15, 10, 5, -30,
        -40, -20, 0, 5, 5, 0, -20, -40,
        -50, -40, -30, -30, -30, -30, -40, -50
    ],
    'b': [
        -20, -10, -10, -10, -10, -10, -10, -20,
        -10, 0, 0, 0, 0, 0, 0, -10,
        -10, 0, 5, 10, 10, 5, 0, -10,
        -10, 5, 5, 10, 10, 5, 5, -10,
        -10, 0, 10, 10, 10, 10, 0, -10,
        -10, 10, 10, 10, 10, 10, 10, -10,
        -10, 5, 0, 0, 0, 0, 5, -10,
        -20, -10, -10, -10, -10, -10, -10, -20
    ],
    'r': [
        0, 0, 0, 0, 0, 0, 0, 0,
        5, 10, 10, 10, 10, 10, 10, 5,
        -5, 0, 0, 0, 0, 0, 0, -5,
        -5, 0, 0, 0, 0, 0, 0, -5,
        -5, 0, 0, 0, 0, 0, 0, -5,
        -5, 0, 0, 0, 0, 0, 0, -5,
        -5, 0, 0, 0, 0, 0, 0, -5,
        0, 0, 0, 5, 5, 0, 0, 0
    ],
    'q': [
        -20, -10, -10, -5, -5, -10, -10, -20,
        -10, 0, 0, 0, 0, 0, 0, -10,
        -10, 0, 5, 5, 5, 5, 0, -10,
        -5, 0, 5, 5, 5, 5, 0, -5,
        0, 0, 5, 5, 5, 5, 0, -5,
        -10, 5, 5, 5, 5, 5, 0, -10,
        -10, 0, 5, 0, 0, 0, 0, -10,
        -20, -10, -10, -5, -5, -10, -10, -20
    ],
    'k': [
        -30, -40, -40, -50, -50, -40, -40, -30,
        -30, -40, -40, -50, -50, -40, -40, -30,
        -30, -40, -40, -50, -50, -40, -40, -30,
        -30, -40, -40, -50, -50, -40, -40, -30,
        -20, -30, -30, -40, -40, -30, -30, -20,
        -10, -20, -20, -20, -20, -20, -20, -10,
        20, 20, 0, 0, 0, 0, 20, 20,
        20, 30, 10, 0, 0, 10, 30, 20
    ]
};

/**
 * Evaluates current chess board relative to player
 * @param {Array} board - The chess board
 * @param {string} color - Players color, either 'b' or 'w'
 * @return {Number} board value relative to player
 */
function evaluateBoard(board, color) {
    try {
        if (!board || !color) {
            console.error('Invalid board or color in evaluateBoard');
            return 0;
        }
        
        let value = 0;
        for (let i = 0; i < 8; i++) {
            for (let j = 0; j < 8; j++) {
                const piece = board[i][j];
                if (piece && piece.type && piece.color) {
                    // Convert chess.js board coordinates to PST index
                    // chess.js: board[0][0] = a8, board[7][7] = h1
                    // PST: index 0 = a1, index 63 = h8
                    const pstIndex = (7 - i) * 8 + j;
                    const pieceTypeValue = pieceValue[piece.type];
                    const positionTable = pst[piece.type];
                    
                    if (pieceTypeValue && positionTable && pstIndex >= 0 && pstIndex < 64) {
                        // For white pieces, use PST as-is
                        // For black pieces, flip the index (black's perspective)
                        const adjustedIndex = piece.color === 'w' ? pstIndex : 63 - pstIndex;
                        const positionValue = positionTable[adjustedIndex] || 0;
                        value += (pieceTypeValue + positionValue) * (piece.color === color ? 1 : -1);
                    }
                }
            }
        }
        return value;
    } catch (error) {
        console.error('Error in evaluateBoard:', error);
        return 0;
    }
}

/**
 * Orders moves to improve alpha-beta pruning efficiency
 * @param {Array} moves - List of possible moves
 * @param {Object} game - The game object
 * @param {string} playerColor - Players color
 * @return {Array} Ordered list of moves
 */
function orderMoves(moves, game, playerColor) {
    return moves.sort((a, b) => {
        const aScore = getMoveScore(a, game, playerColor);
        const bScore = getMoveScore(b, game, playerColor);
        return bScore - aScore;
    });
}

/**
 * Calculates a heuristic score for a move
 * @param {Object} move - The move to evaluate
 * @param {Object} game - The game object
 * @param {string} playerColor - Players color
 * @return {Number} Heuristic score for the move
 */
function getMoveScore(move, game, playerColor) {
    let score = 0;
    if (move.captured) score += 10 * pieceValue[move.captured];
    if (move.promotion) score += pieceValue[move.promotion] - pieceValue['p'];
    if (game.in_check()) score += 50;
    return score;
}

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
function calcBestMove(depth, game, playerColor, alpha = -INFINITY, beta = INFINITY, isMaximizingPlayer = true) {
    try {
        positionsEvaluated++;
        
        const fen = game.fen();
        const ttEntry = transpositionTable.get(fen);
        if (ttEntry && ttEntry.depth >= depth) {
            return [ttEntry.value, ttEntry.bestMove];
        }

        if (depth === 0) {
            return [evaluateBoard(game.board(), playerColor), null];
        }

        let bestMove = null;
        let bestMoveValue = isMaximizingPlayer ? -INFINITY : INFINITY;

        const possibleMoves = orderMoves(game.moves({ verbose: true }), game, playerColor);
        
        if (possibleMoves.length === 0) {
            console.error('No possible moves available');
            return [bestMoveValue, null];
        }

        for (const move of possibleMoves) {
            try {
                game.move(move);

                let value;
                // Check for checkmate immediately after making the move
                if (game.in_checkmate()) {
                    value = isMaximizingPlayer ? INFINITY : -INFINITY;
                    console.log(`Checkmate detected! Move ${move.from}-${move.to} leads to checkmate. Value: ${value} (isMaximizingPlayer: ${isMaximizingPlayer})`);
                } else if (depth === 1 && move.captured) {
                    value = -Quiesce(-beta, -alpha, 0, game, playerColor);
                } else {
                    const result = calcBestMove(depth - 1, game, playerColor, alpha, beta, !isMaximizingPlayer);
                    if (!result) {
                        game.undo();
                        continue;
                    }
                    value = result[0];
                }

                game.undo();

                if (isMaximizingPlayer) {
                    if (value > bestMoveValue) {
                        bestMoveValue = value;
                        bestMove = move;
                    }
                    alpha = Math.max(alpha, value);
                } else {
                    if (value < bestMoveValue) {
                        bestMoveValue = value;
                        bestMove = move;
                    }
                    beta = Math.min(beta, value);
                }

                if (beta <= alpha) {
                    break;
                }
            } catch (moveError) {
                console.error('Error processing move:', move, moveError);
                continue;
            }
        }

        transpositionTable.set(fen, { depth, value: bestMoveValue, bestMove });

        return [bestMoveValue, bestMove || possibleMoves[0]];
    } catch (error) {
        console.error('Error in calcBestMove:', error);
        const fallbackMoves = game.moves({ verbose: true });
        return [0, fallbackMoves.length > 0 ? fallbackMoves[0] : null];
    }
}

/**
 * Performs quiescence search to evaluate tactical sequences
 * @param {Number} alpha
 * @param {Number} beta
 * @param {Number} depth
 * @param {Object} game
 * @param {string} playerColor
 * @return {Number} Evaluation after quiescence search
 */
function Quiesce(alpha, beta, depth, game, playerColor) {
    try {
        positionsEvaluated++;
        
        const standPat = evaluateBoard(game.board(), playerColor);

        if (depth === MAX_QUIESCENCE_DEPTH) {
            return standPat;
        }

        if (standPat >= beta) {
            return beta;
        }
        if (alpha < standPat) {
            alpha = standPat;
        }

        const captureMoves = game.moves({ verbose: true }).filter(move => move.captured);

        for (const move of captureMoves) {
            try {
                game.move(move);

                let score;
                if (game.in_checkmate()) {
                    score = INFINITY;
                    console.log(`Quiesce: Checkmate detected! Move ${move.from}-${move.to} leads to checkmate in quiescence search.`);
                } else {
                    score = -Quiesce(-beta, -alpha, depth + 1, game, playerColor);
                }

                game.undo();

                if (score >= beta) {
                    return beta;
                }
                if (score > alpha) {
                    alpha = score;
                }
            } catch (moveError) {
                console.error('Error in Quiesce move processing:', move, moveError);
                continue;
            }
        }

        return alpha;
    } catch (error) {
        console.error('Error in Quiesce:', error);
        return evaluateBoard(game.board(), playerColor);
    }
}

/**
 * Performs iterative deepening to find the best move
 * @param {Object} game - The game object
 * @param {Number} maxDepth - The maximum depth to search
 * @return {Object} The best move
 */
function iterativeDeepening(game, maxDepth) {
    transpositionTable.clear();
    let bestMove;
    let bestMoveValue = -INFINITY;
    let actualDepthReached = 0;

    // Get a fallback move in case of issues
    const possibleMoves = game.moves({ verbose: true });
    if (possibleMoves.length === 0) {
        console.error('No legal moves available in iterativeDeepening');
        return null;
    }

    for (let depth = 1; depth <= maxDepth; depth++) {
        try {
            const [moveValue, move] = calcBestMove(depth, game, game.turn());
            actualDepthReached = depth;

            if (moveValue > bestMoveValue || !bestMove) {
                bestMoveValue = moveValue;
                bestMove = move;
            }

            console.log(`Iterative deepening: depth ${depth}, best move: ${move ? move.from + '-' + move.to : 'none'}, eval: ${moveValue}`);

            // If we've found a winning move, no need to search deeper
            if (moveValue === INFINITY) {
                console.log(`Found winning move at depth ${depth}, stopping search early`);
                break;
            }
        } catch (error) {
            console.error(`Error at depth ${depth}:`, error);
            break;
        }
    }

    // Ensure we always return a valid move
    if (!bestMove) {
        console.warn('No best move found, using fallback');
        bestMove = possibleMoves[0];
    }

    console.log(`Iterative deepening completed: reached depth ${actualDepthReached}/${maxDepth}, best move: ${bestMove ? bestMove.from + '-' + bestMove.to : 'none'}`);
    return bestMove;
}

/**
 * Clears the transposition table
 */
function clearTranspositionTable() {
    transpositionTable.clear();
}

/**
 * Resets the positions evaluated counter
 */
function resetPositionsCounter() {
    positionsEvaluated = 0;
}

/**
 * Gets the current positions evaluated count
 */
function getPositionsEvaluated() {
    return positionsEvaluated;
}
