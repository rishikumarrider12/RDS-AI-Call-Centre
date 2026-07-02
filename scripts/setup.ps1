#!/usr/bin/env pwsh
# Setup script for RDS AI Call Centre development environment (Windows PowerShell)

param()

$ErrorActionPreference = 'Stop'

Write-Host "🚀 Setting up RDS AI Call Centre..."

Write-Host "📦 Installing dependencies..."
npm install

Write-Host "🔧 Generating environment file..."
if (-not (Test-Path -LiteralPath ".env.local")) {
  Copy-Item -LiteralPath ".env.example" -Destination ".env.local"
  Write-Host "✅ Created .env.local from .env.example"
} else {
  Write-Host "ℹ️  .env.local already exists"
}

Write-Host "✅ Setup complete!"
Write-Host "   Run 'npm run dev' to start development servers."
