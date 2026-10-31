# Builds a single runnable jar that contains both the backend and the built frontend.
# Usage: .\build-release.ps1            -> backend\target\lightning-memory-master-<version>.jar
#        java -jar <jar>                -> open http://localhost:8080
param(
  [switch]$SkipTests = $false
)

# Native tools (npm, mvnw) write warnings to stderr; failures are detected via $LASTEXITCODE instead
$ErrorActionPreference = 'Continue'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "=== Building frontend ===" -ForegroundColor Cyan
Push-Location (Join-Path $root 'frontend')
try {
  npm ci
  if ($LASTEXITCODE -ne 0) { throw "npm ci failed" }
  npm run build
  if ($LASTEXITCODE -ne 0) { throw "frontend build failed" }
} finally { Pop-Location }

Write-Host "=== Building backend (release profile) ===" -ForegroundColor Cyan
Push-Location (Join-Path $root 'backend')
try {
  $mvnArgs = @('-B', '-Prelease', 'clean', 'package')
  if ($SkipTests) { $mvnArgs += '-DskipTests' }
  & .\mvnw.cmd @mvnArgs
  if ($LASTEXITCODE -ne 0) { throw "backend build failed" }
} finally { Pop-Location }

$jar = Get-ChildItem (Join-Path $root 'backend\target\*.jar') | Where-Object { $_.Name -notlike '*.original' } | Select-Object -First 1
Write-Host ""
Write-Host "Release jar: $($jar.FullName)" -ForegroundColor Green
Write-Host "Run it with:" -ForegroundColor Green
Write-Host "  `$env:APP_DATA_DIR = '$(Join-Path $root 'backend\data')'   # optional: where your data lives"
Write-Host "  java -jar `"$($jar.FullName)`""
Write-Host "Then open http://localhost:8080"
