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
    let value = 0;
    for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
            const piece = board[i][j];
            if (piece) {
                const pieceIndex = i * 8 + j;
                const positionValue = pst[piece.type][color === 'w' ? pieceIndex : 63 - pieceIndex];
                value += (pieceValue[piece.type] + positionValue) * (piece.color === color ? 1 : -1);
            }
        }
    }
    return value;
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

    for (const move of possibleMoves) {
        game.move(move);

        let value;
        if (depth === 1 && move.captured) {
            value = -Quiesce(-beta, -alpha, 0, game, playerColor);
        } else {
            value = calcBestMove(depth - 1, game, playerColor, alpha, beta, !isMaximizingPlayer)[0];
        }

        game.undo();

        if (game.in_checkmate()) {
            value = isMaximizingPlayer ? INFINITY : -INFINITY;
        }

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
    }

    transpositionTable.set(fen, { depth, value: bestMoveValue, bestMove });

    return [bestMoveValue, bestMove || possibleMoves[0]];
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
        game.move(move);

        let score;
        if (game.in_checkmate()) {
            score = INFINITY;
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
    }

    return alpha;
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

    for (let depth = 1; depth <= maxDepth; depth++) {
        const [moveValue, move] = calcBestMove(depth, game, game.turn());

        if (moveValue > bestMoveValue || !bestMove) {
            bestMoveValue = moveValue;
            bestMove = move;
        }

        // If we've found a winning move, no need to search deeper
        if (moveValue === INFINITY) {
            break;
        }
    }

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
