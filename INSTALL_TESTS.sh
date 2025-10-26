#!/bin/bash

# Testing Infrastructure Installation Script
# AI Photo Editor - Test Setup
# Run this script to install all testing dependencies

echo "================================================"
echo "AI Photo Editor - Testing Infrastructure Setup"
echo "================================================"
echo ""

# Check if pnpm is available
if command -v pnpm &> /dev/null
then
    PACKAGE_MANAGER="pnpm"
    INSTALL_CMD="pnpm add -D"
    echo "Detected: pnpm"
else
    PACKAGE_MANAGER="npm"
    INSTALL_CMD="npm install --save-dev"
    echo "Detected: npm"
fi

echo ""
echo "Installing testing dependencies..."
echo ""

# Install Vitest and core testing libraries
$INSTALL_CMD vitest @vitest/ui @vitest/coverage-v8

# Install React Testing Library
$INSTALL_CMD @testing-library/react @testing-library/jest-dom @testing-library/user-event

# Install happy-dom (faster than jsdom for React)
$INSTALL_CMD happy-dom

# Playwright is already installed, but ensure it's configured
echo ""
echo "Installing Playwright browsers..."
npx playwright install --with-deps chromium

echo ""
echo "================================================"
echo "Installation complete!"
echo "================================================"
echo ""
echo "Next steps:"
echo "1. Review the testing setup:"
echo "   - vitest.config.ts"
echo "   - tests/setup.ts"
echo ""
echo "2. Run your first tests:"
echo "   $PACKAGE_MANAGER test"
echo ""
echo "3. Run tests in watch mode:"
echo "   $PACKAGE_MANAGER run test:watch"
echo ""
echo "4. View test coverage:"
echo "   $PACKAGE_MANAGER run test:coverage"
echo ""
echo "5. Read the documentation:"
echo "   - TESTING_QUICK_START.md"
echo "   - TEST_COVERAGE_ASSESSMENT.md"
echo ""
echo "Happy testing!"
