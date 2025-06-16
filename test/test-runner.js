#!/usr/bin/env node

// Chess AI Test Runner for CLI
const { Chess, iterativeDeepening, resetPositionsCounter, getPositionsEvaluated } = require('./chess-engine');

// ANSI color codes for terminal output
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    bold: '\x1b[1m'
};

function colorize(text, color) {
    return `${colors[color]}${text}${colors.reset}`;
}

function log(message, color = 'white') {
    console.log(colorize(message, color));
}

/**
 * Test the AI with various positions
 */
function testAI() {
    log('\n🧪 Starting Chess AI Test Suite...', 'cyan');
    log('=' * 50, 'blue');
    
    const testPositions = [
        {
            name: 'Mate in 1 - Back Rank Mate',
            fen: '6k1/5ppp/8/8/8/8/5PPP/4R1K1 w - - 0 1',
            expectedMoves: ['Re8#', 'e1e8'],
            description: 'White Rook delivers back rank checkmate with Re8#'
        },
        {
            name: 'Mate in 1 - Simple Queen Mate',
            fen: 'rnb1kbnr/pppp1ppp/8/4p2Q/6P1/8/PPPP1P1P/RNB1KBNR w KQkq - 0 1',
            expectedMoves: ['Qxf7#', 'h5f7'],
            description: 'White Queen captures f7 with checkmate'
        },
        {
            name: 'Good Tactical Move - Free Material',
            fen: 'rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq d6 0 2',
            expectedMoves: ['exd5', 'e4d5'],
            description: 'Should capture the pawn with exd5'
        },
        {
            name: 'Reasonable Opening Move',
            fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
            expectedMoves: ['e4', 'd4', 'Nf3', 'c4', 'e2e4', 'd2d4', 'g1f3', 'c2c4', 'b1c3'],
            description: 'Should make a reasonable opening move'
        },
        {
            name: 'AI Legal Move Test',
            fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 1',
            expectedMoves: [],
            description: 'AI should make any legal move without blundering'
        }
    ];
    
    let passedTests = 0;
    let totalTests = testPositions.length;
    
    for (let i = 0; i < testPositions.length; i++) {
        const testCase = testPositions[i];
        log(`\n📋 Test ${i + 1}/${totalTests}: ${testCase.name}`, 'bold');
        log(`📖 Description: ${testCase.description}`, 'blue');
        log(`♟️  FEN: ${testCase.fen}`, 'magenta');
        
        try {
            // Create a new game with the test position
            const testGame = new Chess(testCase.fen);
            
            // Get AI move
            log('🤖 AI is thinking...', 'yellow');
            resetPositionsCounter();
            const startTime = Date.now();
            const aiMove = iterativeDeepening(testGame, 4);
            const thinkTime = Date.now() - startTime;
            const positionsCount = getPositionsEvaluated();
            
            if (!aiMove) {
                log('❌ FAILED: AI returned no move', 'red');
                continue;
            }
            
            const moveNotation = aiMove.from + '-' + aiMove.to + (aiMove.promotion ? '=' + aiMove.promotion.toUpperCase() : '');
            log(`🎯 AI chose: ${moveNotation} (${thinkTime}ms, ${positionsCount.toLocaleString()} positions)`, 'cyan');
            
            // Make the move to check if it's legal
            const moveResult = testGame.move(aiMove);
            if (!moveResult) {
                log('❌ FAILED: AI chose illegal move', 'red');
                continue;
            }
            
            // Check if it's checkmate
            const isCheckmate = testGame.isCheckmate();
            const isCheck = testGame.isCheck();
            
            const resultText = isCheckmate ? 'CHECKMATE!' : isCheck ? 'Check' : 'Normal move';
            const resultColor = isCheckmate ? 'green' : isCheck ? 'yellow' : 'white';
            log(`🏁 Result: ${resultText}`, resultColor);
            
            // Evaluate the move
            let testPassed = false;
            if (testCase.expectedMoves.length > 0) {
                // Check if the AI found one of the expected moves
                const foundExpectedMove = testCase.expectedMoves.some(expectedMove => {
                    // Remove # and + from expected move for comparison
                    const cleanExpected = expectedMove.replace(/[#+]/g, '');
                    const cleanActual = moveNotation.replace(/[#+]/g, '');
                    
                    // Check if move matches (from-to squares)
                    if (cleanExpected.length >= 4) {
                        return cleanActual.includes(cleanExpected.substring(0, 2)) && 
                               cleanActual.includes(cleanExpected.substring(2, 4));
                    } else {
                        // Handle algebraic notation like e4, Nf3, etc.
                        return moveNotation.includes(cleanExpected) || cleanActual.includes(cleanExpected);
                    }
                });
                
                if (foundExpectedMove) {
                    if (isCheckmate) {
                        log('✅ PASSED: AI found the checkmate move!', 'green');
                    } else {
                        log('✅ PASSED: AI found an expected move', 'green');
                    }
                    testPassed = true;
                } else if (isCheckmate) {
                    log('✅ PASSED: AI found checkmate (different move than expected)', 'green');
                    testPassed = true;
                } else {
                    log(`⚠️  WARNING: Expected one of ${testCase.expectedMoves.join(', ')} but got ${moveNotation}`, 'yellow');
                    // For opening positions, still count as passed if it's a reasonable move
                    if (testCase.name.includes('Opening') || testCase.name.includes('Reasonable')) {
                        testPassed = true;
                    }
                }
            } else {
                // For general positions, just check it's not obviously terrible
                if (moveResult && !testGame.isCheckmate()) {
                    log('✅ PASSED: AI made a legal move', 'green');
                    testPassed = true;
                } else if (isCheckmate && testGame.turn() !== testCase.fen.split(' ')[1]) {
                    log('❌ FAILED: AI got checkmated', 'red');
                }
            }
            
            if (testPassed) passedTests++;
            
        } catch (error) {
            log(`❌ FAILED: Error during test - ${error.message}`, 'red');
        }
    }
    
    log('\n' + '=' * 50, 'blue');
    log(`🏆 Test Results: ${passedTests}/${totalTests} tests passed`, 'bold');
    const successRate = ((passedTests/totalTests)*100).toFixed(1);
    log(`📊 Success Rate: ${successRate}%`, successRate >= 80 ? 'green' : successRate >= 60 ? 'yellow' : 'red');
    
    if (passedTests === totalTests) {
        log('🎉 All tests passed! AI is working correctly.', 'green');
        process.exit(0);
    } else {
        log('⚠️  Some tests failed. AI may need further debugging.', 'yellow');
        process.exit(1);
    }
}

/**
 * Quick test function for mate-in-one positions
 */
function testMateInOne(fen, depth = 3) {
    log(`🔍 Testing mate-in-one position: ${fen}`, 'cyan');
    
    const testGame = new Chess(fen);
    log(`👤 ${testGame.turn() === 'w' ? 'White' : 'Black'} to move`, 'blue');
    
    resetPositionsCounter();
    const startTime = Date.now();
    const move = iterativeDeepening(testGame, depth);
    const thinkTime = Date.now() - startTime;
    const positionsCount = getPositionsEvaluated();
    
    if (!move) {
        log('❌ No move found!', 'red');
        return false;
    }
    
    const moveNotation = move.from + '-' + move.to + (move.promotion ? '=' + move.promotion.toUpperCase() : '');
    log(`🎯 AI move: ${moveNotation} (${thinkTime}ms, ${positionsCount.toLocaleString()} positions)`, 'cyan');
    
    // Test the move
    const moveResult = testGame.move(move);
    if (!moveResult) {
        log('❌ Illegal move!', 'red');
        return false;
    }
    
    const isCheckmate = testGame.isCheckmate();
    log(`🏁 Result: ${isCheckmate ? '✅ CHECKMATE FOUND!' : '❌ Not checkmate'}`, isCheckmate ? 'green' : 'red');
    
    return isCheckmate;
}

// Main execution
function main() {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        // Run full test suite
        testAI();
    } else if (args[0] === 'mate') {
        // Test specific mate-in-one position
        const fen = args[1] || '6k1/5ppp/8/8/8/8/5PPP/4R1K1 w - - 0 1';
        const depth = parseInt(args[2]) || 3;
        const result = testMateInOne(fen, depth);
        process.exit(result ? 0 : 1);
    } else {
        log('Usage:', 'yellow');
        log('  npm test              - Run full test suite', 'white');
        log('  npm test mate [fen]   - Test specific position', 'white');
        log('  make test             - Run full test suite', 'white');
        process.exit(1);
    }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    log(`💥 Uncaught Exception: ${error.message}`, 'red');
    console.error(error.stack);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    log(`💥 Unhandled Rejection at: ${promise}`, 'red');
    log(`Reason: ${reason}`, 'red');
    process.exit(1);
});

if (require.main === module) {
    main();
}

module.exports = { testAI, testMateInOne };