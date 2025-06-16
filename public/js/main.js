// Initialize the chess game and board
var game = new Chess();
var board = null;
var gameMode = 'none'; // 'playerVsComputer', 'computerVsComputer', 'none'
var skill = 3; // Default skill level

// DOM elements
const difficultySelect = document.getElementById('difficulty');
const resetButton = document.getElementById('resetButton');
const computerPlayButton = document.getElementById('computerPlayButton');
const undoButton = document.getElementById('undoButton');
const overlay = document.getElementById('overlay');
const gameOverModal = document.getElementById('gameOverModal');
const gameOverMessage = document.getElementById('gameOverMessage');
const gameModeOverlay = document.getElementById('gameModeOverlay');
const gameModeModal = document.getElementById('gameModeModal');
const playerVsComputerBtn = document.getElementById('playerVsComputerBtn');
const computerVsComputerBtn = document.getElementById('computerVsComputerBtn');

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
    computerPlayButton.addEventListener('click', showGameModeSelection);
    undoButton.addEventListener('click', undoMove);
    difficultySelect.addEventListener('change', setDifficulty);
    playerVsComputerBtn.addEventListener('click', () => selectGameMode('playerVsComputer'));
    computerVsComputerBtn.addEventListener('click', () => selectGameMode('computerVsComputer'));
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

// Show game mode selection modal
function showGameModeSelection() {
    gameModeOverlay.style.display = 'block';
    gameModeModal.style.display = 'block';
}

// Hide game mode selection modal
function hideGameModeSelection() {
    gameModeOverlay.style.display = 'none';
    gameModeModal.style.display = 'none';
}

// Select game mode and start game
function selectGameMode(mode) {
    gameMode = mode;
    hideGameModeSelection();
    
    if (mode === 'playerVsComputer') {
        computerPlayButton.textContent = "Change Mode";
        console.log('Player vs Computer mode selected');
    } else if (mode === 'computerVsComputer') {
        computerPlayButton.textContent = "Change Mode";
        console.log('Computer vs Computer mode selected');
        // Start computer vs computer immediately
        setTimeout(makeComputerMove, 500);
    }
}


// Undo last move
function undoMove() {
    try {
        const undoResult = game.undo();
        if (!undoResult) {
            console.log('No moves to undo');
            return;
        }
        
        board.position(game.fen());
        updateMoveIndicator();
        
        if (gameMode === 'computerVsComputer') {
            const secondUndo = game.undo(); // Undo twice in computer vs computer mode
            if (secondUndo) {
                board.position(game.fen());
                updateMoveIndicator();
            }
        }
        
        // Update evaluation after undo
        const evaluation = evaluateBoard(game.board(), 'w');
        updateEvaluationDisplay(evaluation);
    } catch (error) {
        console.error('Error during undo:', error);
        alert('Unable to undo move. Please try again.');
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
const evaluationText = document.getElementById('evaluationText');
const evaluationIndicator = document.getElementById('evaluationIndicator');

// Add this function to update the move indicator
function updateMoveIndicator() {
    const currentPlayer = game.turn() === 'w' ? 'White' : 'Black';
    moveIndicator.textContent = `${currentPlayer}'s turn`;
    moveIndicator.className = `move-indicator ${game.turn()}-turn`;
    moveIndicator.setAttribute('aria-label', `It's ${currentPlayer}'s turn`);
}

// Update evaluation display
function updateEvaluationDisplay(evaluation) {
    // Convert evaluation to be from white's perspective
    // Positive = white advantage, Negative = black advantage
    const whiteEval = evaluation;
    
    let displayText;
    let position; // 0-100, where 50 is even, 0 is black winning, 100 is white winning
    
    if (Math.abs(whiteEval) < 50) {
        // Close game
        if (whiteEval > 20) {
            displayText = `White +${(whiteEval/100).toFixed(1)}`;
        } else if (whiteEval < -20) {
            displayText = `Black +${Math.abs(whiteEval/100).toFixed(1)}`;
        } else {
            displayText = "Even";
        }
    } else {
        // Significant advantage
        if (whiteEval > 500) {
            displayText = "White Winning";
        } else if (whiteEval < -500) {
            displayText = "Black Winning";
        } else if (whiteEval > 0) {
            displayText = `White +${(whiteEval/100).toFixed(1)}`;
        } else {
            displayText = `Black +${Math.abs(whiteEval/100).toFixed(1)}`;
        }
    }
    
    // Calculate position on bar (clamp between 0-100)
    position = Math.max(0, Math.min(100, 50 + (whiteEval / 20)));
    
    // Update text
    evaluationText.textContent = `Evaluation: ${displayText}`;
    
    // Update indicator position
    evaluationIndicator.style.left = `${position}%`;
    
    // Update indicator color based on advantage
    if (Math.abs(whiteEval) < 50) {
        evaluationIndicator.style.background = '#666'; // Gray for even
    } else if (whiteEval > 0) {
        evaluationIndicator.style.background = '#fff'; // White advantage
    } else {
        evaluationIndicator.style.background = '#000'; // Black advantage
    }
}

// Initialize the game and show mode selection
function initGame() {
    try {
        board = ChessBoard('board', config);
        if (!board) {
            throw new Error('Failed to initialize chessboard');
        }
        addEventListeners();
        updateMoveIndicator();
        resetPositionsCounter();
        aiCounter.textContent = "Positions evaluated: 0";
        updateEvaluationDisplay(0); // Initialize with even evaluation
        computerPlayButton.textContent = "Select Mode";
        console.log("Game initialized - showing mode selection");
        showGameModeSelection();
    } catch (error) {
        console.error('Failed to initialize game:', error);
        alert('Failed to initialize the chess game. Please refresh the page.');
    }
}

// Reset the game and show mode selection
function resetGame() {
    try {
        console.log("Resetting game");
        window.aiThinking = false;
        game.reset();
        board.position(game.fen());
        gameMode = 'none';
        computerPlayButton.textContent = "Select Mode";
        closeGameOverModal();
        updateMoveIndicator();
        resetPositionsCounter();
        aiCounter.textContent = "Positions evaluated: 0";
        updateEvaluationDisplay(0); // Reset to even evaluation
        showGameModeSelection();
    } catch (error) {
        console.error('Error resetting game:', error);
        alert('Error resetting the game. Please refresh the page.');
    }
}

// Handle piece drop
function onDrop(source, target) {
    removeHighlights();
    
    try {
        // Don't allow moves if no game mode is selected
        if (gameMode === 'none') {
            alert('Please select a game mode first!');
            return 'snapback';
        }

        var move = game.move({
            from: source,
            to: target,
            promotion: 'q' // Always promote to queen for simplicity
        });

        if (move === null) return 'snapback';

        updateMoveIndicator();
        console.log(`Player moved ${move.from}-${move.to}, gameMode: ${gameMode}, current turn: ${game.turn()}`);

        // Update evaluation after player's move
        const evaluation = evaluateBoard(game.board(), 'w');
        updateEvaluationDisplay(evaluation);

        // Check for game over after player's move
        if (checkGameOver()) {
            return;
        }

        // Trigger computer move based on game mode
        if (gameMode === 'playerVsComputer') {
            console.log('Player vs Computer: Triggering computer move...');
            window.setTimeout(makeComputerMove, 250);
        } else if (gameMode === 'computerVsComputer') {
            console.log('Computer vs Computer: Triggering next computer move...');
            window.setTimeout(makeComputerMove, 250);
        }
    } catch (error) {
        console.error('Error during move execution:', error);
        alert('Invalid move. Please try again.');
        return 'snapback';
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

    try {
        console.log("Computer is thinking...");
        resetPositionsCounter();
        window.aiThinking = true;
        aiCounter.textContent = "Computer is thinking...";
        
        // Start updating the counter display
        setTimeout(updateCounterDisplay, 100);
        
        // Use setTimeout to allow UI updates during calculation
        setTimeout(() => {
            var start = new Date().getTime();
            var bestMoveResult = calcBestMove(skill, game, game.turn());
            window.aiThinking = false;
            
            if (!bestMoveResult || !bestMoveResult[1]) {
                console.error('Computer failed to calculate a move');
                alert('Computer encountered an error. Please reset the game.');
                return;
            }
            
            var move = bestMoveResult[1];
            var moveResult = game.move(move);
            
            if (!moveResult) {
                console.error('Computer calculated an invalid move:', move);
                alert('Computer calculated an invalid move. Please reset the game.');
                return;
            }
            
            board.position(game.fen());
            updateMoveIndicator();

            // Update evaluation after computer's move
            const evaluation = evaluateBoard(game.board(), 'w');
            updateEvaluationDisplay(evaluation);

            var end = new Date().getTime();
            var positionsCount = getPositionsEvaluated();
            aiCounter.textContent = `Positions evaluated: ${positionsCount.toLocaleString()}`;
            console.log(`Computer moved ${move.from}-${move.to} in ${end - start}ms, evaluated ${positionsCount} positions`);

            // Check for game over after computer's move
            if (checkGameOver()) {
                return;
            }

            // Continue computer moves in computer vs computer mode
            if (gameMode === 'computerVsComputer') {
                window.setTimeout(makeComputerMove, 250);
            }
        }, 10);
    } catch (error) {
        console.error('Error during computer move:', error);
        alert('Computer encountered an error. Please reset the game.');
        window.aiThinking = false;
    }
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
