# Chess AI Makefile

.PHONY: help install test test-mate clean dev start

# Default target
help:
	@echo "Chess AI - Available Commands:"
	@echo ""
	@echo "  make install    - Install dependencies"
	@echo "  make test       - Run full AI test suite"
	@echo "  make test-mate  - Test mate-in-one positions"
	@echo "  make dev        - Start development server"
	@echo "  make start      - Start production server"
	@echo "  make clean      - Clean node_modules and reinstall"
	@echo ""

# Install dependencies
install:
	@echo "📦 Installing dependencies..."
	npm install
	@echo "✅ Dependencies installed successfully!"

# Run full test suite
test:
	@echo "🧪 Running Chess AI Test Suite..."
	@echo "==============================="
	npm test
	@echo "==============================="

# Test specific mate-in-one positions
test-mate:
	@echo "🔍 Testing mate-in-one positions..."
	@echo "Position 1: Back rank mate (Re8#)"
	node test/test-runner.js mate "6k1/5ppp/8/8/8/8/5PPP/4R1K1 w - - 0 1"
	@echo ""
	@echo "Position 2: Simple Queen mate (Qh5#)"
	node test/test-runner.js mate "rnb1kbnr/pppp1ppp/8/4p2Q/6P1/8/PPPP1P1P/RNB1KBNR w KQkq - 0 1"
	@echo ""
	@echo "Position 3: Another back rank mate (Ra8#)"
	node test/test-runner.js mate "r6k/6pp/8/8/8/8/6PP/R6K w - - 0 1"

# Development server
dev:
	@echo "🚀 Starting development server..."
	npm run dev

# Production server
start:
	@echo "🌐 Starting production server..."
	npm start

# Clean and reinstall
clean:
	@echo "🧹 Cleaning node_modules..."
	rm -rf node_modules package-lock.json
	@echo "📦 Reinstalling dependencies..."
	npm install
	@echo "✅ Clean installation completed!"

# Quick performance test
perf:
	@echo "⚡ Running performance test..."
	@echo "Testing AI speed on various positions..."
	time node test/test-runner.js

# Validate AI behavior
validate: test
	@echo "✅ AI validation completed!"

# Install and test (useful for CI)
ci: install test
	@echo "🎉 CI pipeline completed successfully!"