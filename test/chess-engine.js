// Node.js compatible version of chess engine for testing
const { Chess } = require('chess.js');

// Transposition table
const transpositionTable = new Map();

// Move counter for AI analysis
let positionsEvaluated = 0;

// Killer moves table - stores moves that caused beta cutoffs at each depth
let killerMoves = new Array(30).fill(null).map(() => []); // Support up to depth 30

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
 * Full board evaluation
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
                    const pstIndex = (7 - i) * 8 + j;
                    const pieceTypeValue = pieceValue[piece.type];
                    const positionTable = pst[piece.type];
                    
                    if (pieceTypeValue && positionTable && pstIndex >= 0 && pstIndex < 64) {
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
 * Orders moves using MVV-LVA heuristic and killer moves
 */
function orderMoves(moves, game, playerColor, depth = 0) {
    return moves.sort((a, b) => getMoveScore(b, game, playerColor, depth) - getMoveScore(a, game, playerColor, depth));
}

/**
 * Calculates move score using MVV-LVA, killer moves and other heuristics
 */
function getMoveScore(move, game, playerColor, depth = 0) {
    let score = 0;

    // 1. HIGHEST PRIORITY: Captures (MVV-LVA)
    if (move.captured) {
        const victimValue = pieceValue[move.captured] || 0;
        const attackerValue = pieceValue[move.piece] || 0;
        score += 10000 + (victimValue * 100 - attackerValue);
    }

    // 2. SECOND PRIORITY: Promotions
    if (move.promotion) {
        score += 9000 + (pieceValue[move.promotion] - pieceValue['p']);
    }

    // 3. THIRD PRIORITY: Killer moves (non-captures that caused beta cutoffs)
    if (!move.captured && depth >= 0 && depth < killerMoves.length) {
        const killers = killerMoves[depth];
        const isKillerMove = killers.some(killer => 
            killer && killer.from === move.from && killer.to === move.to
        );
        
        if (isKillerMove) {
            score += 8000; // High priority for killer moves
        }
    }

    // 4. FOURTH PRIORITY: Checks
    game.move(move);
    if (game.isCheck()) score += 7000;
    game.undo();

    // 5. Center square bonus - encourage moves to center
    const centerSquares = ['d4', 'e4', 'd5', 'e5'];
    const nearCenterSquares = ['c3', 'd3', 'e3', 'f3', 'c6', 'd6', 'e6', 'f6'];
    
    if (centerSquares.includes(move.to)) {
        score += 80; // Strong bonus for central squares
        
        // Extra bonus for pawns in center (opening theory)
        if (move.piece === 'p') {
            score += 40;
        }
    } else if (nearCenterSquares.includes(move.to)) {
        score += 30; // Moderate bonus for near-center squares
        
        // Bonus for knights developing to center
        if (move.piece === 'n') {
            score += 25;
        }
    }
    
    // Penalize moving pieces away from center
    if (centerSquares.includes(move.from)) {
        score -= 10; // Small penalty for leaving center
    }

    return score;
}

/**
 * Helper function to get tactical moves
 */
function getTacticalMoves(game) {
    const allMoves = game.moves({ verbose: true });
    const tacticalMoves = [];
    for (const move of allMoves) {
        if (move.captured || move.promotion) {
            tacticalMoves.push(move);
            continue;
        }
        game.move(move);
        const givesCheck = game.isCheck();
        game.undo();
        if (givesCheck) tacticalMoves.push(move);
    }
    return tacticalMoves;
}

/**
 * Quiescence search with proper minimax perspective
 */
function Quiesce(alpha, beta, depth, game, playerColor, isMaximizing) {
    positionsEvaluated++;

    // Check terminal states first
    if (game.isCheckmate()) {
        const checkmatedColor = game.turn();
        return checkmatedColor === playerColor ? -INFINITY + depth : INFINITY - depth;
    }
    if (game.isStalemate() || game.isDraw() || game.isThreefoldRepetition() || game.isInsufficientMaterial()) {
        return 0;
    }

    const evaluation = evaluateBoard(game.board(), playerColor);
    if (depth >= MAX_QUIESCENCE_DEPTH) {
        return evaluation;
    }

    const tacticalMoves = getTacticalMoves(game);

    if (isMaximizing) {
        let maxEval = evaluation;
        if (maxEval >= beta) return beta;
        alpha = Math.max(alpha, maxEval);

        for (const move of tacticalMoves) {
            game.move(move);
            const score = Quiesce(alpha, beta, depth + 1, game, playerColor, false);
            game.undo();

            maxEval = Math.max(maxEval, score);
            if (maxEval >= beta) return beta;
            alpha = Math.max(alpha, maxEval);
        }
        return alpha;
    } else {
        let minEval = evaluation;
        if (minEval <= alpha) return alpha;
        beta = Math.min(beta, minEval);

        for (const move of tacticalMoves) {
            game.move(move);
            const score = Quiesce(alpha, beta, depth + 1, game, playerColor, true);
            game.undo();

            minEval = Math.min(minEval, score);
            if (minEval <= alpha) return alpha;
            beta = Math.min(beta, minEval);
        }
        return beta;
    }
}

/**
 * Minimax with Alpha-Beta pruning
 */
function calcBestMove(depth, game, playerColor, alpha = -INFINITY, beta = INFINITY, isMaximizingPlayer = true) {
    try {
        positionsEvaluated++;
        
        const fen = game.fen();
        const ttEntry = transpositionTable.get(fen);
        if (ttEntry && ttEntry.depth >= depth) {
            return [ttEntry.value, ttEntry.bestMove];
        }

        if (depth <= 0) {
            const isMaximizing = (game.turn() === playerColor);
            return [Quiesce(alpha, beta, 0, game, playerColor, isMaximizing), null];
        }

        let bestMove = null;
        let bestMoveValue = isMaximizingPlayer ? -INFINITY : INFINITY;

        const possibleMoves = orderMoves(game.moves({ verbose: true }), game, playerColor, depth);
        
        // Handle terminal states
        if (possibleMoves.length === 0) {
            if (game.isCheckmate()) {
                const checkmatedColor = game.turn();
                let checkmateValue;
                if (checkmatedColor === playerColor) {
                    checkmateValue = -INFINITY + depth;
                } else {
                    checkmateValue = INFINITY - depth;
                }
                return [checkmateValue, null];
            } else if (game.isStalemate() || game.isDraw() || game.isThreefoldRepetition() || game.isInsufficientMaterial()) {
                return [0, null];
            } else {
                return [0, null];
            }
        }

        let firstMove = true;
        
        for (const move of possibleMoves) {
            try {
                game.move(move);

                let value;
                if (game.isCheckmate()) {
                    const checkmatedColor = game.turn();
                    if (checkmatedColor === playerColor) {
                        value = -INFINITY + depth;
                    } else {
                        value = INFINITY - depth;
                    }
                } else if (game.isStalemate() || game.isDraw() || game.isThreefoldRepetition() || game.isInsufficientMaterial()) {
                    value = 0;
                } else {
                    // Principal Variation Search (PVS) implementation
                    if (firstMove) {
                        // First move: search with full window
                        const result = calcBestMove(depth - 1, game, playerColor, alpha, beta, !isMaximizingPlayer);
                        if (!result) {
                            game.undo();
                            continue;
                        }
                        value = result[0];
                        firstMove = false;
                    } else {
                        // Subsequent moves: use null-window search first
                        let nullWindowAlpha, nullWindowBeta;
                        if (isMaximizingPlayer) {
                            nullWindowAlpha = alpha;
                            nullWindowBeta = alpha + 1;
                        } else {
                            nullWindowAlpha = beta - 1;
                            nullWindowBeta = beta;
                        }
                        
                        const nullResult = calcBestMove(depth - 1, game, playerColor, nullWindowAlpha, nullWindowBeta, !isMaximizingPlayer);
                        if (!nullResult) {
                            game.undo();
                            continue;
                        }
                        value = nullResult[0];
                        
                        // Re-search with full window only if null-window search fails high/low
                        if ((isMaximizingPlayer && value >= nullWindowBeta) || 
                            (!isMaximizingPlayer && value <= nullWindowAlpha)) {
                            const fullResult = calcBestMove(depth - 1, game, playerColor, alpha, beta, !isMaximizingPlayer);
                            if (fullResult) {
                                value = fullResult[0];
                            }
                        }
                    }
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
                    // Store killer move if it's a non-capture that caused beta cutoff
                    if (!move.captured && depth >= 0 && depth < killerMoves.length) {
                        killerMoves[depth].unshift(move); // Add to front
                        if (killerMoves[depth].length > 2) {
                            killerMoves[depth].pop(); // Keep only top 2 killers
                        }
                    }
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
 * Iterative deepening with time management
 */
function iterativeDeepening(game, maxDepth) {
    transpositionTable.clear();
    let bestMove = null;
    const aiColor = game.turn();
    const possibleMoves = game.moves({ verbose: true });
    if (possibleMoves.length === 0) return null;

    const startTime = Date.now();
    const timeLimit = 5000; // 5 seconds max per move

    for (let depth = 1; depth <= maxDepth; depth++) {
        const [moveValue, move] = calcBestMove(depth, game, aiColor);
        if (move) bestMove = move;

        const elapsed = Date.now() - startTime;

        if (elapsed > timeLimit || moveValue >= INFINITY - 100) break;
    }

    return bestMove || possibleMoves[0];
}

/**
 * Reset positions counter
 */
function resetPositionsCounter() {
    positionsEvaluated = 0;
}

/**
 * Get positions evaluated count
 */
function getPositionsEvaluated() {
    return positionsEvaluated;
}

module.exports = {
    Chess,
    iterativeDeepening,
    resetPositionsCounter,
    getPositionsEvaluated,
    evaluateBoard,
    INFINITY
};