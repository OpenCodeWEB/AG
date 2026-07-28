#!/usr/bin/env bash
# ==============================================================================
# OpenCodeWEBsAG Project Setup Script
# Installs dependencies and prepares the development environment.
# ==============================================================================

set -eo pipefail

echo "🚀 [OpenCodeWEBsAG] Setting up development environment..."

# Install Node.js dependencies
if [ -f "package.json" ]; then
    echo "📦 Installing npm packages..."
    npm ci
    echo "✅ Dependencies installed."
fi

# Create bin directory for built artifacts
mkdir -p bin

echo "✨ [OpenCodeWEBsAG] Setup complete!"
