#!/bin/bash
# Setup script for Skills.sh integration
# This script installs the find-skills skill from vercel-labs/skills

set -e

echo "🔧 Setting up Skills.sh integration..."

# Create necessary directories
echo "📁 Creating skill directories..."
mkdir -p skills/managed
mkdir -p skills/workspace
mkdir -p .agents/skills

# Install find-skills if not already installed
if [ ! -d ".agents/skills/find-skills" ]; then
    echo "📦 Installing find-skills skill from vercel-labs/skills..."
    npx -y skills add https://github.com/vercel-labs/skills --skill find-skills --yes
    echo "✅ find-skills skill installed successfully!"
else
    echo "✅ find-skills skill already installed"
fi

# List installed skills
echo ""
echo "📋 Installed skills:"
npx -y skills list

echo ""
echo "✨ Skills.sh integration setup complete!"
echo ""
echo "You can now:"
echo "  - Use 'npx skills find [query]' to search for skills"
echo "  - Use 'npx skills add <package>' to install skills"
echo "  - Ask the agent to find or install skills through natural language"
echo ""
