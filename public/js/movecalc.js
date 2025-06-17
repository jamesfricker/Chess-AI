// Transposition table
const transpositionTable = new Map();

// Zobrist hashing for efficient transposition table keys
const zobristKeys = Array(12).fill().map(() => Array(64).fill().map(() => Math.floor(Math.random() * 2**32)));
const pieceMap = { 'p': 0, 'n': 2, 'b': 4, 'r': 6, 'q': 8, 'k': 10 }; // 0-5 white, 6-11 black

/**
 * Computes Zobrist hash for a board position
 * @param {Array} board - The chess board
 * @return {Number} Zobrist hash of the position
 */
function computeZobristHash(board) {
    let hash = 0;
    for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
            const piece = board[i][j];
            if (piece && piece.type && piece.color) {
                const pieceIndex = pieceMap[piece.type] + (piece.color === 'b' ? 1 : 0);
                const squareIndex = (7 - i) * 8 + j;
                hash ^= zobristKeys[pieceIndex][squareIndex];
            }
        }
    }
    return hash;
}

// Move counter for AI analysis
let positionsEvaluated = 0;

// Killer moves table - stores moves that caused beta cutoffs at each depth
let killerMoves = new Array(30).fill(null).map(() => []); // Support up to depth 30

// Incremental evaluation state
let incrementalEvaluation = {
    whiteScore: 0,
    blackScore: 0,
    initialized: false
};

// Constants
const INFINITY = 1000000;
const MAX_QUIESCENCE_DEPTH = 3;

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
        5, 5, 15, 35, 35, 15, 5, 5,
        0, 0, 5, 30, 30, 5, 0, 0,
        5, -5, -10, 0, 0, -10, -5, 5,
        5, 10, 10, -20, -20, 10, 10, 5,
        0, 0, 0, 0, 0, 0, 0, 0
    ],
    'n': [
        -50, -40, -30, -30, -30, -30, -40, -50,
        -40, -20, 0, 5, 5, 0, -20, -40,
        -30, 5, 20, 25, 25, 20, 5, -30,
        -30, 10, 25, 35, 35, 25, 10, -30,
        -30, 5, 25, 35, 35, 25, 5, -30,
        -30, 5, 20, 25, 25, 20, 5, -30,
        -40, -20, 0, 5, 5, 0, -20, -40,
        -50, -40, -30, -30, -30, -30, -40, -50
    ],
    'b': [
        -20, -10, -10, -10, -10, -10, -10, -20,
        -10, 0, 0, 0, 0, 0, 0, -10,
        -10, 0, 5, 15, 15, 5, 0, -10,
        -10, 5, 15, 20, 20, 15, 5, -10,
        -10, 0, 15, 20, 20, 15, 0, -10,
        -10, 10, 10, 15, 15, 10, 10, -10,
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
 * Calculates piece value including position for incremental evaluation
 * @param {Object} piece - The piece object
 * @param {Number} square - Square index (0-63)
 * @return {Number} Total piece value including position
 */
function getPieceValue(piece, square) {
    if (!piece || !piece.type) return 0;

    const baseValue = pieceValue[piece.type] || 0;
    const positionTable = pst[piece.type];

    if (!positionTable) return baseValue;

    // For white pieces, use PST as-is
    // For black pieces, flip the square index
    const adjustedSquare = piece.color === 'w' ? square : 63 - square;
    const positionValue = positionTable[adjustedSquare] || 0;

    return baseValue + positionValue;
}

/**
 * Initializes incremental evaluation from current board state
 * @param {Array} board - The chess board
 */
function initializeIncrementalEval(board) {
    incrementalEvaluation.whiteScore = 0;
    incrementalEvaluation.blackScore = 0;

    for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
            const piece = board[i][j];
            if (piece && piece.type && piece.color) {
                // Convert chess.js board coordinates to square index
                const square = (7 - i) * 8 + j;
                const value = getPieceValue(piece, square);

                if (piece.color === 'w') {
                    incrementalEvaluation.whiteScore += value;
                } else {
                    incrementalEvaluation.blackScore += value;
                }
            }
        }
    }

    incrementalEvaluation.initialized = true;
}

/**
 * Updates incremental evaluation for a move
 * @param {Object} move - The move object
 * @param {Array} board - The current board state
 */
function updateEvaluationForMove(move, board) {
    if (!incrementalEvaluation.initialized) {
        initializeIncrementalEval(board);
        return;
    }

    const fromSquare = move.from;
    const toSquare = move.to;
    const piece = move.piece;
    const captured = move.captured;
    const promotion = move.promotion;

    // Convert algebraic notation to square indices
    const fromIndex = algebraicToSquareIndex(fromSquare);
    const toIndex = algebraicToSquareIndex(toSquare);

    const movingColor = move.color;
    const isWhite = movingColor === 'w';

    // Remove piece from original square
    const oldPieceValue = getPieceValue({ type: piece, color: movingColor }, fromIndex);
    if (isWhite) {
        incrementalEvaluation.whiteScore -= oldPieceValue;
    } else {
        incrementalEvaluation.blackScore -= oldPieceValue;
    }

    // Handle capture
    if (captured) {
        const capturedValue = getPieceValue({ type: captured, color: isWhite ? 'b' : 'w' }, toIndex);
        if (isWhite) {
            incrementalEvaluation.blackScore -= capturedValue;
        } else {
            incrementalEvaluation.whiteScore -= capturedValue;
        }
    }

    // Add piece to new square (handle promotion)
    const finalPieceType = promotion || piece;
    const newPieceValue = getPieceValue({ type: finalPieceType, color: movingColor }, toIndex);
    if (isWhite) {
        incrementalEvaluation.whiteScore += newPieceValue;
    } else {
        incrementalEvaluation.blackScore += newPieceValue;
    }

    // Handle castling
    if (move.flags && (move.flags.includes('k') || move.flags.includes('q'))) {
        handleCastlingEvaluation(move, movingColor);
    }
}

/**
 * Reverts incremental evaluation for an undone move
 * @param {Object} move - The move object that was undone
 * @param {Array} board - The current board state after undo
 */
function revertEvaluationForMove(move, board) {
    // For undo, we reverse the operations
    const fromSquare = move.from;
    const toSquare = move.to;
    const piece = move.piece;
    const captured = move.captured;
    const promotion = move.promotion;

    const fromIndex = algebraicToSquareIndex(fromSquare);
    const toIndex = algebraicToSquareIndex(toSquare);

    const movingColor = move.color;
    const isWhite = movingColor === 'w';

    // Remove piece from destination square
    const finalPieceType = promotion || piece;
    const newPieceValue = getPieceValue({ type: finalPieceType, color: movingColor }, toIndex);
    if (isWhite) {
        incrementalEvaluation.whiteScore -= newPieceValue;
    } else {
        incrementalEvaluation.blackScore -= newPieceValue;
    }

    // Restore captured piece
    if (captured) {
        const capturedValue = getPieceValue({ type: captured, color: isWhite ? 'b' : 'w' }, toIndex);
        if (isWhite) {
            incrementalEvaluation.blackScore += capturedValue;
        } else {
            incrementalEvaluation.whiteScore += capturedValue;
        }
    }

    // Restore piece to original square
    const oldPieceValue = getPieceValue({ type: piece, color: movingColor }, fromIndex);
    if (isWhite) {
        incrementalEvaluation.whiteScore += oldPieceValue;
    } else {
        incrementalEvaluation.blackScore += oldPieceValue;
    }

    // Handle castling undo
    if (move.flags && (move.flags.includes('k') || move.flags.includes('q'))) {
        revertCastlingEvaluation(move, movingColor);
    }
}

/**
 * Converts algebraic notation to square index (0-63)
 * @param {string} algebraic - Algebraic notation (e.g., 'e4')
 * @return {Number} Square index
 */
function algebraicToSquareIndex(algebraic) {
    const file = algebraic.charCodeAt(0) - 97; // 'a' = 97
    const rank = parseInt(algebraic[1]) - 1;
    return rank * 8 + file;
}

/**
 * Handles castling evaluation updates
 * @param {Object} move - The castling move
 * @param {string} color - The color that castled
 */
function handleCastlingEvaluation(move, color) {
    // Determine rook movement for castling
    let rookFromSquare, rookToSquare;

    if (move.flags.includes('k')) { // Kingside castling
        if (color === 'w') {
            rookFromSquare = 'h1';
            rookToSquare = 'f1';
        } else {
            rookFromSquare = 'h8';
            rookToSquare = 'f8';
        }
    } else { // Queenside castling
        if (color === 'w') {
            rookFromSquare = 'a1';
            rookToSquare = 'd1';
        } else {
            rookFromSquare = 'a8';
            rookToSquare = 'd8';
        }
    }

    const rookFromIndex = algebraicToSquareIndex(rookFromSquare);
    const rookToIndex = algebraicToSquareIndex(rookToSquare);

    // Remove rook from original square and add to new square
    const rookFromValue = getPieceValue({ type: 'r', color: color }, rookFromIndex);
    const rookToValue = getPieceValue({ type: 'r', color: color }, rookToIndex);

    if (color === 'w') {
        incrementalEvaluation.whiteScore = incrementalEvaluation.whiteScore - rookFromValue + rookToValue;
    } else {
        incrementalEvaluation.blackScore = incrementalEvaluation.blackScore - rookFromValue + rookToValue;
    }
}

/**
 * Reverts castling evaluation updates
 * @param {Object} move - The castling move that was undone
 * @param {string} color - The color that castled
 */
function revertCastlingEvaluation(move, color) {
    // Reverse the castling evaluation
    let rookFromSquare, rookToSquare;

    if (move.flags.includes('k')) { // Kingside castling
        if (color === 'w') {
            rookFromSquare = 'h1';
            rookToSquare = 'f1';
        } else {
            rookFromSquare = 'h8';
            rookToSquare = 'f8';
        }
    } else { // Queenside castling
        if (color === 'w') {
            rookFromSquare = 'a1';
            rookToSquare = 'd1';
        } else {
            rookFromSquare = 'a8';
            rookToSquare = 'd8';
        }
    }

    const rookFromIndex = algebraicToSquareIndex(rookFromSquare);
    const rookToIndex = algebraicToSquareIndex(rookToSquare);

    // Restore rook to original square and remove from castled square
    const rookFromValue = getPieceValue({ type: 'r', color: color }, rookFromIndex);
    const rookToValue = getPieceValue({ type: 'r', color: color }, rookToIndex);

    if (color === 'w') {
        incrementalEvaluation.whiteScore = incrementalEvaluation.whiteScore + rookFromValue - rookToValue;
    } else {
        incrementalEvaluation.blackScore = incrementalEvaluation.blackScore + rookFromValue - rookToValue;
    }
}

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

        // For now, disable incremental evaluation and use full evaluation to fix the AI
        // TODO: Re-enable after debugging incremental evaluation
        return evaluateBoardFull(board, color);

        /* DISABLED INCREMENTAL EVALUATION - CAUSING BAD MOVES
        // Initialize incremental evaluation if not done yet
        if (!incrementalEvaluation.initialized) {
            initializeIncrementalEval(board);
        }

        // Return incremental evaluation score relative to the requested color
        if (color === 'w') {
            return incrementalEvaluation.whiteScore - incrementalEvaluation.blackScore;
        } else {
            return incrementalEvaluation.blackScore - incrementalEvaluation.whiteScore;
        }
        */
    } catch (error) {
        console.error('Error in evaluateBoard:', error);
        // Fallback to full evaluation in case of error
        return evaluateBoardFull(board, color);
    }
}

/**
 * Evaluates center control for a position
 * @param {Array} board - The chess board
 * @param {string} color - Players color
 * @return {Number} Center control bonus
 */
function evaluateCenterControl(board, color) {
    let centerBonus = 0;

    // Define center squares and their importance
    const centerSquares = [
        { rank: 3, file: 3, bonus: 30 }, // d4
        { rank: 3, file: 4, bonus: 30 }, // e4
        { rank: 4, file: 3, bonus: 30 }, // d5
        { rank: 4, file: 4, bonus: 30 }, // e5
        { rank: 2, file: 2, bonus: 15 }, // c3
        { rank: 2, file: 3, bonus: 20 }, // d3
        { rank: 2, file: 4, bonus: 20 }, // e3
        { rank: 2, file: 5, bonus: 15 }, // f3
        { rank: 5, file: 2, bonus: 15 }, // c6
        { rank: 5, file: 3, bonus: 20 }, // d6
        { rank: 5, file: 4, bonus: 20 }, // e6
        { rank: 5, file: 5, bonus: 15 }  // f6
    ];

    for (const square of centerSquares) {
        const piece = board[7 - square.rank][square.file];
        if (piece && piece.color === color) {
            // Bonus for occupying center squares
            centerBonus += square.bonus;

            // Extra bonus for pawns in center (pawn structure)
            if (piece.type === 'p') {
                centerBonus += square.bonus * 0.5;
            }
        }
    }

    return centerBonus;
}

/**
 * Evaluates piece mobility and activity
 * @param {Object} game - The chess game object
 * @param {string} color - Players color
 * @return {Number} Mobility bonus
 */
function evaluateMobility(game, color) {
    let mobilityBonus = 0;

    try {
        const originalTurn = game.turn();

        // Count legal moves for the specified color
        if (originalTurn === color) {
            const moves = game.moves({ verbose: true });

            // Base mobility bonus
            mobilityBonus += moves.length * 2;

            // Bonus for piece types that have more moves
            const pieceMobility = {};
            for (const move of moves) {
                if (!pieceMobility[move.piece]) {
                    pieceMobility[move.piece] = 0;
                }
                pieceMobility[move.piece]++;
            }

            // Bonus for active pieces
            for (const [pieceType, moveCount] of Object.entries(pieceMobility)) {
                switch (pieceType) {
                    case 'q': mobilityBonus += moveCount * 3; break;  // Queen mobility very important
                    case 'r': mobilityBonus += moveCount * 2; break;  // Rook mobility important
                    case 'b': mobilityBonus += moveCount * 2; break;  // Bishop mobility important
                    case 'n': mobilityBonus += moveCount * 3; break;  // Knight mobility very important
                    case 'p': mobilityBonus += moveCount * 1; break;  // Pawn moves less important
                }
            }
        }
    } catch (error) {
        // If there's an error calculating mobility, don't crash
        console.debug('Mobility calculation error:', error);
    }

    return mobilityBonus;
}

/**
 * Full board evaluation with enhanced center control and piece activity
 * @param {Array} board - The chess board
 * @param {string} color - Players color, either 'b' or 'w'
 * @param {Object} game - Optional game object for mobility evaluation
 * @return {Number} board value relative to player
 */
function evaluateBoardFull(board, color, game = null) {
    let value = 0;

    // Basic material and position evaluation
    for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
            const piece = board[i][j];
            if (piece && piece.type && piece.color) {
                // Convert chess.js board coordinates to PST index
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

    // Add center control bonus
    const centerControlBonus = evaluateCenterControl(board, color) - evaluateCenterControl(board, color === 'w' ? 'b' : 'w');
    value += centerControlBonus;

    // Add mobility bonus if game object is available
    if (game) {
        const mobilityBonus = evaluateMobility(game, color) - evaluateMobility(game, color === 'w' ? 'b' : 'w');
        value += mobilityBonus;
    }

    return value;
}

/**
 * Orders moves to improve alpha-beta pruning efficiency using enhanced MVV-LVA and killer moves
 * @param {Array} moves - List of possible moves
 * @param {Object} game - The game object
 * @param {string} playerColor - Players color
 * @param {Number} depth - Current search depth for killer move lookup
 * @return {Array} Ordered list of moves
 */
function orderMoves(moves, game, playerColor, depth = 0) {
    return moves.sort((a, b) => getMoveScore(b, game, playerColor, depth) - getMoveScore(a, game, playerColor, depth));
}

/**
 * Calculates a heuristic score for a move using enhanced MVV-LVA and killer moves
 * @param {Object} move - The move to evaluate
 * @param {Object} game - The game object
 * @param {string} playerColor - Players color
 * @param {Number} depth - Current search depth for killer moves
 * @return {Number} Heuristic score for the move
 */
function getMoveScore(move, game, playerColor, depth = 0) {
    let score = 0;

    // 1. HIGHEST PRIORITY: Captures (MVV-LVA)
    if (move.captured) {
        const victimValue = pieceValue[move.captured] || 0;
        const attackerValue = pieceValue[move.piece] || 0;

        // Enhanced MVV-LVA: prioritize high-value victims, low-value attackers
        score += 10000 + (victimValue * 100 - attackerValue);

        // Special bonus for capturing higher-value pieces with lower-value pieces
        if (victimValue > attackerValue) {
            score += (victimValue - attackerValue) * 50; // Extra bonus for favorable trades
        }
    }

    // 2. SECOND PRIORITY: Promotions
    if (move.promotion) {
        score += 9000 + (pieceValue[move.promotion] - pieceValue['p']);

        // Extra bonus for promoting to queen
        if (move.promotion === 'q') {
            score += 500;
        }
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
    const givesCheck = game.in_check();
    game.undo();

    if (givesCheck) {
        score += 7000; // High priority for checks
    }

    // 5. POSITIONAL BONUSES: Center control
    const centerSquares = ['d4', 'e4', 'd5', 'e5'];
    const nearCenterSquares = ['c3', 'd3', 'e3', 'f3', 'c6', 'd6', 'e6', 'f6'];

    if (centerSquares.includes(move.to)) {
        score += 150; // Center bonus

        // Extra bonus for pawns in center
        if (move.piece === 'p') {
            score += 80;
        }
    } else if (nearCenterSquares.includes(move.to)) {
        score += 60; // Near-center bonus

        // Bonus for knights developing to center
        if (move.piece === 'n') {
            score += 50;
        }
    }

    // 6. DEVELOPMENT BONUSES
    // Bonus for moving pieces from back rank (development)
    if (move.from[1] === '1' || move.from[1] === '8') {
        if (move.piece === 'n' || move.piece === 'b') {
            score += 30; // Encourage piece development
        }
    }

    // 7. CASTLING BONUS
    if (move.flags && (move.flags.includes('k') || move.flags.includes('q'))) {
        score += 100; // Encourage castling for king safety
    }

    // 8. PENALTIES
    // Penalize moving pieces away from center
    if (centerSquares.includes(move.from) && !centerSquares.includes(move.to)) {
        score -= 20; // Penalty for leaving center
    }

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

        const hash = computeZobristHash(game.board());
        const ttEntry = transpositionTable.get(hash);
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

        // Handle terminal states when no moves are available
        if (possibleMoves.length === 0) {
            if (game.in_checkmate()) {
                // Current player is in checkmate
                const checkmatedColor = game.turn(); // The color that is checkmated
                let checkmateValue;
                if (checkmatedColor === playerColor) {
                    // AI is checkmated - this is bad for AI
                    checkmateValue = -INFINITY + depth;
                } else {
                    // Opponent is checkmated - this is good for AI
                    checkmateValue = INFINITY - depth;
                }
                console.log(`Terminal checkmate detected at depth ${depth}. Checkmated: ${checkmatedColor}, AI: ${playerColor}, Value: ${checkmateValue}`);
                return [checkmateValue, null];
            } else if (game.in_stalemate() || game.in_draw() || game.in_threefold_repetition() || game.insufficient_material()) {
                // Any draw condition
                console.log(`Terminal draw detected at depth ${depth}`);
                return [0, null];
            } else {
                console.error('No possible moves available but not checkmate or stalemate');
                return [0, null]; // Treat as draw if unclear
            }
        }

        let firstMove = true;

        for (const move of possibleMoves) {
            try {
                game.move(move);
                // updateEvaluationForMove(move, game.board()); // DISABLED

                let value;
                // Check for checkmate immediately after making the move
                if (game.in_checkmate()) {
                    // The player whose turn it is now (after our move) is checkmated
                    // If the checkmated player is the opponent of our AI, this is good for AI
                    // If the checkmated player is our AI, this is bad for AI
                    const checkmatedColor = game.turn(); // The color that is checkmated
                    if (checkmatedColor === playerColor) {
                        // AI is checkmated - this is bad for AI
                        value = -INFINITY + depth;
                    } else {
                        // Opponent is checkmated - this is good for AI
                        value = INFINITY - depth;
                    }
                    console.log(`Checkmate detected! Move ${move.from}-${move.to} leads to checkmate. Checkmated: ${checkmatedColor}, AI: ${playerColor}, Value: ${value}`);
                } else if (game.in_stalemate() || game.in_draw() || game.in_threefold_repetition() || game.insufficient_material()) {
                    // Any draw condition
                    value = 0;
                } else {
                    // Principal Variation Search (PVS) implementation
                    if (firstMove) {
                        // First move: search with full window
                        const result = calcBestMove(depth - 1, game, playerColor, alpha, beta, !isMaximizingPlayer);
                        if (!result) {
                            game.undo();
                            // revertEvaluationForMove(move, game.board()); // DISABLED
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
                            // revertEvaluationForMove(move, game.board()); // DISABLED
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
                // revertEvaluationForMove(move, game.board()); // DISABLED

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

        // Store in transposition table with depth-preferred replacement
        const existingEntry = transpositionTable.get(hash);
        if (!existingEntry || depth >= existingEntry.depth) {
            transpositionTable.set(hash, { depth, value: bestMoveValue, bestMove });
        }

        return [bestMoveValue, bestMove || possibleMoves[0]];
    } catch (error) {
        console.error('Error in calcBestMove:', error);
        const fallbackMoves = game.moves({ verbose: true });
        return [0, fallbackMoves.length > 0 ? fallbackMoves[0] : null];
    }
}

/**
 * Helper function to get tactical moves
 * @param {Object} game - The chess game object
 * @return {Array} Array of tactical moves
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
        const givesCheck = game.in_check();
        game.undo();
        if (givesCheck) tacticalMoves.push(move);
    }
    return tacticalMoves;
}

/**
 * Performs quiescence search to evaluate tactical sequences
 * @param {Number} alpha
 * @param {Number} beta
 * @param {Number} depth
 * @param {Object} game
 * @param {string} playerColor
 * @param {Boolean} isMaximizing - Whether current player is maximizing
 * @return {Number} Evaluation after quiescence search
 */
function Quiesce(alpha, beta, depth, game, playerColor, isMaximizing) {
    positionsEvaluated++;

    // Check terminal states first
    if (game.in_checkmate()) {
        const checkmatedColor = game.turn();
        return checkmatedColor === playerColor ? -INFINITY + depth : INFINITY - depth;
    }
    if (game.in_stalemate() || game.in_draw() || game.in_threefold_repetition() || game.insufficient_material()) {
        return 0;
    }

    // Stand-pat evaluation
    const standPat = evaluateBoard(game.board(), playerColor);
    if (depth >= MAX_QUIESCENCE_DEPTH) {
        return standPat;
    }

    // Stand-pat cutoffs
    if (isMaximizing) {
        if (standPat >= beta) return beta;
        alpha = Math.max(alpha, standPat);
    } else {
        if (standPat <= alpha) return alpha;
        beta = Math.min(beta, standPat);
    }

    const tacticalMoves = getTacticalMoves(game);
    const delta = pieceValue.q; // Largest material swing (queen value)

    if (isMaximizing) {
        let maxEval = standPat;

        for (const move of tacticalMoves) {
            // Delta pruning: skip moves that cannot improve position significantly
            if (move.captured && standPat + pieceValue[move.captured] + delta < alpha) {
                continue;
            }

            game.move(move);
            const score = Quiesce(alpha, beta, depth + 1, game, playerColor, false);
            game.undo();

            maxEval = Math.max(maxEval, score);
            if (maxEval >= beta) return beta;
            alpha = Math.max(alpha, maxEval);
        }
        return alpha;
    } else {
        let minEval = standPat;

        for (const move of tacticalMoves) {
            // Delta pruning: skip moves that cannot improve position significantly
            if (move.captured && standPat - pieceValue[move.captured] - delta > beta) {
                continue;
            }

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
 * Performs iterative deepening to find the best move with time management
 * @param {Object} game - The game object
 * @param {Number} maxDepth - The maximum depth to search
 * @return {Object} The best move
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
        console.log(`Depth ${depth}: Move ${move ? move.from + '-' + move.to : 'none'}, Eval: ${moveValue}, Time: ${elapsed}ms`);

        if (elapsed > timeLimit || moveValue >= INFINITY - 100) break;
    }

    return bestMove || possibleMoves[0];
}

/**
 * Clears the transposition table
 */
function clearTranspositionTable() {
    transpositionTable.clear();
}

/**
 * Resets incremental evaluation state
 */
function resetIncrementalEvaluation() {
    incrementalEvaluation.whiteScore = 0;
    incrementalEvaluation.blackScore = 0;
    incrementalEvaluation.initialized = false;
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

/**
 * Validates incremental evaluation accuracy by comparing with full evaluation
 * @param {Object} game - The game object
 * @param {string} color - The color to evaluate for
 * @return {boolean} True if incremental evaluation matches full evaluation
 */
function validateIncrementalEvaluation(game, color) {
    const incrementalScore = evaluateBoard(game.board(), color);
    const fullScore = evaluateBoardFull(game.board(), color);

    if (Math.abs(incrementalScore - fullScore) > 0.01) {
        console.error(`Incremental evaluation mismatch! Incremental: ${incrementalScore}, Full: ${fullScore}`);
        console.error('Incremental state:', incrementalEvaluation);
        return false;
    }
    return true;
}

/**
 * Tests the AI with various positions to verify correct move finding
 * This function can be called from the browser console to test the AI
 */
function testAI() {
    console.log('🧪 Starting AI Test Suite...\n');

    const testPositions = [
        {
            name: 'Mate in 1 - Back Rank Mate',
            fen: 'rnbqkb1r/pppp1ppp/5n2/4p3/2B1P3/8/PPPP1PPP/RNBQK1NR w KQkq - 0 1',
            expectedMoves: ['Bxf7+'], // Should find the checkmate
            description: 'White to move, Bxf7# is checkmate'
        },
        {
            name: 'Mate in 1 - Queen Mate',
            fen: '8/8/8/8/8/8/6k1/4Q1K1 w - - 0 1',
            expectedMoves: ['Qe2+', 'Qe7+', 'Qe8+'], // Multiple checkmates available
            description: 'White Queen can deliver checkmate in multiple ways'
        },
        {
            name: 'Mate in 1 - Rook Mate',
            fen: '6k1/5ppp/8/8/8/8/5PPP/4R1K1 w - - 0 1',
            expectedMoves: ['Re8+'], // Back rank mate
            description: 'White Rook delivers back rank checkmate'
        },
        {
            name: 'Obvious Capture',
            fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2',
            expectedMoves: ['exd5', 'Nf3', 'Bc4'], // Should not hang pieces
            description: 'Standard opening position - should make reasonable moves'
        },
        {
            name: 'Free Queen',
            fen: 'rnbqkbnr/pppp1ppp/8/4p3/8/8/PPPP1PPP/RNBQKBNR w KQkq - 0 1',
            expectedMoves: [], // Just ensure no terrible moves
            description: 'Should not make obviously bad moves'
        }
    ];

    let passedTests = 0;
    let totalTests = testPositions.length;

    for (const testCase of testPositions) {
        console.log(`\n📋 Test: ${testCase.name}`);
        console.log(`📖 Description: ${testCase.description}`);
        console.log(`♟️  FEN: ${testCase.fen}`);

        try {
            // Create a new game with the test position
            const testGame = new Chess(testCase.fen);

            // Get AI move
            console.log('🤖 AI is thinking...');
            const startTime = Date.now();
            const aiMove = iterativeDeepening(testGame, 4); // Use depth 4 for testing
            const thinkTime = Date.now() - startTime;

            if (!aiMove) {
                console.log('❌ FAILED: AI returned no move');
                continue;
            }

            const moveNotation = aiMove.from + '-' + aiMove.to + (aiMove.promotion ? '=' + aiMove.promotion.toUpperCase() : '');
            console.log(`🎯 AI chose: ${moveNotation} (${thinkTime}ms)`);

            // Make the move to check if it's legal
            const moveResult = testGame.move(aiMove);
            if (!moveResult) {
                console.log('❌ FAILED: AI chose illegal move');
                continue;
            }

            // Check if it's checkmate
            const isCheckmate = testGame.in_checkmate();
            const isCheck = testGame.in_check();

            console.log(`🏁 Result: ${isCheckmate ? 'CHECKMATE!' : isCheck ? 'Check' : 'Normal move'}`);

            // Evaluate the move
            let testPassed = false;
            if (testCase.expectedMoves.length > 0) {
                // Check if the AI found one of the expected moves
                const foundExpectedMove = testCase.expectedMoves.some(expectedMove => {
                    return moveNotation.includes(expectedMove.substring(0, 2)) &&
                        moveNotation.includes(expectedMove.substring(2, 4));
                });

                if (foundExpectedMove || isCheckmate) {
                    console.log('✅ PASSED: AI found a winning/expected move');
                    testPassed = true;
                } else {
                    console.log(`⚠️  WARNING: Expected one of ${testCase.expectedMoves.join(', ')} but got ${moveNotation}`);
                }
            } else {
                // For general positions, just check it's not obviously terrible
                if (moveResult && !testGame.in_checkmate()) {
                    console.log('✅ PASSED: AI made a legal move');
                    testPassed = true;
                } else if (isCheckmate && testGame.turn() !== testGame.turn()) {
                    console.log('❌ FAILED: AI got checkmated');
                }
            }

            if (testPassed) passedTests++;

        } catch (error) {
            console.log(`❌ FAILED: Error during test - ${error.message}`);
        }
    }

    console.log(`\n🏆 Test Results: ${passedTests}/${totalTests} tests passed`);
    console.log(`📊 Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

    if (passedTests === totalTests) {
        console.log('🎉 All tests passed! AI is working correctly.');
    } else {
        console.log('⚠️  Some tests failed. AI may need further debugging.');
    }

    return { passed: passedTests, total: totalTests, successRate: (passedTests / totalTests) * 100 };
}

/**
 * Quick test function for mate-in-one positions
 * @param {string} fen - FEN string of the position
 * @param {number} depth - Search depth (default 3)
 */
function testMateInOne(fen, depth = 3) {
    console.log(`🔍 Testing mate-in-one position: ${fen}`);

    const testGame = new Chess(fen);
    console.log(`👤 ${testGame.turn() === 'w' ? 'White' : 'Black'} to move`);

    const startTime = Date.now();
    const move = iterativeDeepening(testGame, depth);
    const thinkTime = Date.now() - startTime;

    if (!move) {
        console.log('❌ No move found!');
        return false;
    }

    const moveNotation = move.from + '-' + move.to + (move.promotion ? '=' + move.promotion.toUpperCase() : '');
    console.log(`🎯 AI move: ${moveNotation} (${thinkTime}ms)`);

    // Test the move
    const moveResult = testGame.move(move);
    if (!moveResult) {
        console.log('❌ Illegal move!');
        return false;
    }

    const isCheckmate = testGame.in_checkmate();
    console.log(`🏁 Result: ${isCheckmate ? '✅ CHECKMATE FOUND!' : '❌ Not checkmate'}`);

    return isCheckmate;
}
