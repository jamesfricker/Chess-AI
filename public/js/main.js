var board,
    game = new Chess();

isComputer = false;
totalMoves = 0;
var table = {};
var skill = 3; // Default skill level

var resetGame = function () {
    game.reset();
    board.position(game.fen());
    isComputer = false;
    totalMoves = 0;
    closeGameOverModal();
}

// Set the difficulty level
var setDifficulty = function (level) {
    skill = parseInt(level, 10);
}

// Actions after any move
var onMoveEnd = function (oldPos, newPos) {
    removeHighlights();
    // Alert if game is over
    if (game.game_over() === true) {
        var message = '';
        if (game.in_checkmate() === true) {
            message = 'Checkmate';
        } else if (game.in_draw() === true) {
            message = 'Draw';
        } else if (game.in_stalemate() === true) {
            message = 'Stalemate';
        } else if (game.in_threefold_repetition() === true) {
            message = 'Threefold Repetition';
        } else {
            message = 'Game Over';
        }
        totalMoves += 1;
        showGameOverModal(message);
    }
};

// Check before pick pieces that it is white and game is not over
var onDragStart = function (source, piece, position, orientation) {
    removeHighlights();
    if (game.game_over() === true || piece.search(/^b/) !== -1) {
        return false;
    }
    highlightMoves(source);
};

// Update the board position after the piece snap
// for castling, en passant, pawn promotion
var onSnapEnd = function () {
    board.position(game.fen());
};

// Highlight legal moves
var highlightMoves = function (square) {
    var moves = game.moves({
        square: square,
        verbose: true
    });

    if (moves.length === 0) return;

    moves.forEach(function (move) {
        var squareEl = $('#board .square-' + move.to);
        squareEl.addClass('highlight-move');
    });
}

// Remove highlighted squares
var removeHighlights = function () {
    $('#board .square-55d63').removeClass('highlight-move');
}

// Handles what to do after human makes move.
// Computer automatically makes next move
var onDrop = function (source, target) {
    removeHighlights();
    // see if the move is legal
    var move = game.move({
        from: source,
        to: target,
        promotion: 'q' // NOTE: always promote to a queen for example simplicity
    });
    // If illegal move, snapback
    if (move === null) return 'snapback';

    // Log the move
    // console.log(move)

    window.setTimeout(function () {
        makeMove();
    }, 250);
};

// Computer makes a move with algorithm choice and skill/depth level
var makeMove = function () {
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
    console.log(move.from, move.to);
    // Update board positions
    var end = new Date().getTime();
    var time = end - start;
    console.log('Time to move: ' + time);
    board.position(game.fen());
}

var computerPlay = function () {
    isComputer = true;
    playGame();
}

// Computer vs Computer
var playGame = function () {
    if (isComputer == false) {
        return 0;
    }
    if (game.game_over() === true) {
        console.log('game over');
        return;
    }
    skillW = skill; // Use the selected skill level
    skillB = skill; // Use the selected skill level

    var skillLevel = game.turn() === 'w' ? skillW : skillB;
    makeMove(skillLevel);
    table = {};
    // timeout so animation can finish
    window.setTimeout(function () {
        playGame();
    }, 250);
};

var undoMove = function () {
    game.undo();
    board.position(game.fen());
}

// Configure board
var cfg = {
    draggable: true,
    position: 'start',
    moveSpeed: 50,

    // Handlers for user actions
    onMoveEnd: onMoveEnd,
    onDragStart: onDragStart,
    onDrop: onDrop,
    onSnapEnd: onSnapEnd
}

board = ChessBoard('board', cfg);

// Add event listeners for buttons and dropdown
document.getElementById('resetButton').addEventListener('click', resetGame);
document.getElementById('computerPlayButton').addEventListener('click', computerPlay);
document.getElementById('undoButton').addEventListener('click', undoMove);
document.getElementById('difficulty').addEventListener('change', function () {
    setDifficulty(this.value);
});

function showGameOverModal(message) {
    document.getElementById('gameOverMessage').textContent = message;
    document.getElementById('overlay').classList.add('show');
    document.getElementById('gameOverModal').classList.add('show');
}

function closeGameOverModal() {
    document.getElementById('overlay').classList.remove('show');
    document.getElementById('gameOverModal').classList.remove('show');
}

// Prevent default touch behavior to stop scrolling
document.getElementById('board').addEventListener('touchstart', function (e) {
    e.preventDefault();
}, { passive: false });

document.getElementById('board').addEventListener('touchmove', function (e) {
    e.preventDefault();
}, { passive: false });
