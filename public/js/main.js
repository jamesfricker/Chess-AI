// Initialize the chess game and board
var game = new Chess();
var board = null;
var isComputerPlayer = false;
var skill = 3; // Default skill level

// DOM elements
const difficultySelect = document.getElementById('difficulty');
const resetButton = document.getElementById('resetButton');
const computerPlayButton = document.getElementById('computerPlayButton');
const undoButton = document.getElementById('undoButton');
const overlay = document.getElementById('overlay');
const gameOverModal = document.getElementById('gameOverModal');
const gameOverMessage = document.getElementById('gameOverMessage');

// Game configuration
const config = {
    draggable: true,
    position: 'start',
    onDragStart: onDragStart,
    onDrop: onDrop,
    onSnapEnd: onSnapEnd
};

// Initialize the game
function initGame() {
    board = ChessBoard('board', config);
    addEventListeners();
    console.log("Game initialized");
}

// Add event listeners
function addEventListeners() {
    resetButton.addEventListener('click', resetGame);
    computerPlayButton.addEventListener('click', toggleComputerPlay);
    undoButton.addEventListener('click', undoMove);
    difficultySelect.addEventListener('change', setDifficulty);
    document.addEventListener('touchmove', preventScrolling, { passive: false });
}

// Prevent scrolling on mobile
function preventScrolling(event) {
    if (event.target.closest('#board')) {
        event.preventDefault();
    }
}

// Reset the game
function resetGame() {
    console.log("Resetting game");
    game.reset();
    board.position(game.fen());
    isComputerPlayer = false;
    closeGameOverModal();
}

// Set difficulty level
function setDifficulty() {
    skill = parseInt(difficultySelect.value, 10);
    console.log(`Difficulty set to ${skill}`);
}

// Toggle computer play
function toggleComputerPlay() {
    isComputerPlayer = !isComputerPlayer;
    computerPlayButton.textContent = isComputerPlayer ? "Stop Computer" : "Computer v Computer";
    if (isComputerPlayer && !checkGameOver()) {
        makeComputerMove();
    }
}

// Undo last move
function undoMove() {
    game.undo();
    board.position(game.fen());
    if (isComputerPlayer) {
        game.undo(); // Undo twice in computer vs computer mode
        board.position(game.fen());
    }
}

// Check if a move is legal and handle drag start
function onDragStart(source, piece, position, orientation) {
    if (game.game_over() || (game.turn() === 'w' && piece.search(/^b/) !== -1) ||
        (game.turn() === 'b' && piece.search(/^w/) !== -1)) {
        return false;
    }
    highlightLegalMoves(source);
}

// Handle piece drop
function onDrop(source, target) {
    removeHighlights();
    var move = game.move({
        from: source,
        to: target,
        promotion: 'q' // Always promote to queen for simplicity
    });

    if (move === null) return 'snapback';

    // Check for game over after player's move
    if (checkGameOver()) {
        return;
    }

    if (isComputerPlayer) {
        window.setTimeout(makeComputerMove, 250);
    }
}

// Update the board position after the piece snap animation
function onSnapEnd() {
    board.position(game.fen());
    checkGameOver(); // Check for game over after the board updates
}

// Highlight legal moves
function highlightLegalMoves(square) {
    var moves = game.moves({
        square: square,
        verbose: true
    });

    moves.forEach(function (move) {
        $(`#board .square-${move.to}`).addClass('highlight-move');
    });
}

// Remove move highlights
function removeHighlights() {
    $('#board .square-55d63').removeClass('highlight-move');
}

// Add this with the other DOM elements at the top of the file
const moveIndicator = document.getElementById('moveIndicator');
const aiCounter = document.getElementById('aiCounter');

// Add this function to update the move indicator
function updateMoveIndicator() {
    const currentPlayer = game.turn() === 'w' ? 'White' : 'Black';
    moveIndicator.textContent = `${currentPlayer}'s turn`;
    moveIndicator.className = `move-indicator ${game.turn()}-turn`;
    moveIndicator.setAttribute('aria-label', `It's ${currentPlayer}'s turn`);
}

// Modify the initGame function to include the initial move indicator update
function initGame() {
    board = ChessBoard('board', config);
    addEventListeners();
    updateMoveIndicator();
    console.log("Game initialized");
}

// Modify the resetGame function to update the move indicator
function resetGame() {
    console.log("Resetting game");
    window.aiThinking = false;
    game.reset();
    board.position(game.fen());
    isComputerPlayer = false;
    computerPlayButton.textContent = "Computer v Computer";
    closeGameOverModal();
    updateMoveIndicator();
    resetPositionsCounter();
    aiCounter.textContent = "Positions evaluated: 0";
}

// Modify the onDrop function to update the move indicator after a move
function onDrop(source, target) {
    removeHighlights();
    var move = game.move({
        from: source,
        to: target,
        promotion: 'q' // Always promote to queen for simplicity
    });

    if (move === null) return 'snapback';

    updateMoveIndicator();

    // Check for game over after player's move
    if (checkGameOver()) {
        return;
    }

    if (isComputerPlayer) {
        window.setTimeout(makeComputerMove, 250);
    }
}

// Function to update the counter display while thinking
function updateCounterDisplay() {
    if (window.aiThinking) {
        const count = getPositionsEvaluated();
        aiCounter.textContent = `Thinking... Positions evaluated: ${count.toLocaleString()}`;
        setTimeout(updateCounterDisplay, 100); // Update every 100ms
    }
}

// Modify the makeComputerMove function to update the move indicator after the computer's move
function makeComputerMove() {
    if (game.game_over()) return;

    console.log("Computer is thinking...");
    resetPositionsCounter();
    window.aiThinking = true;
    aiCounter.textContent = "Computer is thinking...";
    
    // Start updating the counter display
    setTimeout(updateCounterDisplay, 100);
    
    // Use setTimeout to allow UI updates during calculation
    setTimeout(() => {
        var start = new Date().getTime();
        var move = calcBestMove(skill, game, game.turn())[1];
        window.aiThinking = false;
        
        game.move(move);
        board.position(game.fen());
        updateMoveIndicator();

        var end = new Date().getTime();
        var positionsCount = getPositionsEvaluated();
        aiCounter.textContent = `Positions evaluated: ${positionsCount.toLocaleString()}`;
        console.log(`Computer moved ${move.from}-${move.to} in ${end - start}ms, evaluated ${positionsCount} positions`);

        // Check for game over after computer's move
        if (checkGameOver()) {
            return;
        }

        if (isComputerPlayer) {
            window.setTimeout(makeComputerMove, 250);
        }
    }, 10);
}

// Modify the checkGameOver function to update the move indicator when the game ends
function checkGameOver() {
    if (game.game_over()) {
        let message;
        if (game.in_checkmate()) {
            const winner = game.turn() === 'w' ? 'Black' : 'White';
            message = `${winner} wins by checkmate!`;
        } else if (game.in_draw()) {
            message = 'Game ends in a draw.';
        } else if (game.in_stalemate()) {
            message = 'Game ends in a stalemate.';
        } else if (game.in_threefold_repetition()) {
            message = 'Game ends in a draw by threefold repetition.';
        } else {
            message = 'Game Over';
        }
        moveIndicator.textContent = 'Game Over';
        moveIndicator.className = 'move-indicator';
        moveIndicator.setAttribute('aria-label', 'Game Over');
        showGameOverModal(message);
        return true;
    }
    return false;
}

// Show game over modal
function showGameOverModal(message) {
    console.log(`Game over: ${message}`);
    gameOverMessage.textContent = message;
    overlay.style.display = 'block';
    gameOverModal.style.display = 'block';
    overlay.style.opacity = '1';
    gameOverModal.style.opacity = '1';
}

// Close game over modal
function closeGameOverModal() {
    overlay.style.display = 'none';
    gameOverModal.style.display = 'none';
    overlay.style.opacity = '0';
    gameOverModal.style.opacity = '0';
}

// Initialize the game when the script loads
initGame();
