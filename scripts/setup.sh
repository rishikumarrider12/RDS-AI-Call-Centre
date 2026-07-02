#!/usr/bin/env bash
set -euo pipefail

echo "🚀 Setting up RDS AI Call Centre..."

echo "📦 Installing dependencies..."
npm install

echo "🔧 Generating environment file..."
if [ ! -f .env.local ]; then
  cp .env.example .env.local
  echo "✅ Created .env.local from .env.example"
else
  echo "ℹ️  .env.local already exists"
fi

echo "✅ Setup complete!"
echo "   Run 'npm run dev' to start development servers."
