Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Backend packaging script - game.codebn.cn" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

if (-not (Test-Path "backend")) {
    Write-Host "Error: backend directory not found." -ForegroundColor Red
    exit 1
}

$zipFile = "deploy/backend-deploy.zip"
$stageDir = "deploy/backend-dist"
$excludedDirectories = @("__pycache__", "venv", ".venv", ".hypothesis", ".pytest_cache", "uploads", "logs", "tests", "db_backups", ".tmp-runtime")
$dbArtifactPattern = '\.(db|sqlite|sqlite3)($|[.\-])'
$runtimeDeployFiles = @(
    "backup-database.sh",
    "compare-database-candidates.sh",
    "DEPLOY_SERVER_EXACT.md",
    "database-safety-preflight.sh",
    "migrate-production-database.sh",
    "post-upload-backend.sh",
    "resolve-db-path.sh",
    "restore-database.sh",
    "restore-from-db-candidate.sh",
    "server-disk-audit.sh",
    "server-safe-cleanup.sh",
    "update-backend.sh",
    "PRODUCTION_DATABASE_SAFETY.md"
)

Write-Host "Preparing backend package..." -ForegroundColor Yellow

if (Test-Path $zipFile) {
    Remove-Item -LiteralPath $zipFile -Force
}
if (Test-Path $stageDir) {
    Remove-Item -LiteralPath $stageDir -Recurse -Force
}

New-Item -ItemType Directory -Path $stageDir | Out-Null

Get-ChildItem -Path "backend" -Force | ForEach-Object {
    Copy-Item -LiteralPath $_.FullName -Destination $stageDir -Recurse -Force
}

$stageDeployDir = Join-Path $stageDir "deploy"
New-Item -ItemType Directory -Path $stageDeployDir | Out-Null
foreach ($file in $runtimeDeployFiles) {
    $source = Join-Path "deploy" $file
    if (-not (Test-Path $source)) {
        throw "Required deploy helper missing: $source"
    }
    Copy-Item -LiteralPath $source -Destination $stageDeployDir -Force
}

Get-ChildItem -Path $stageDir -Recurse -Directory -Force |
    Where-Object {
        $_.Name -in $excludedDirectories -or
        $_.Name -like '_archive_*' -or
        $_.Name -like '.tmp-*'
    } |
    Remove-Item -Recurse -Force

Get-ChildItem -Path $stageDir -Recurse -File -Force |
    Where-Object {
        $_.Extension -eq ".pyc" -or
        $_.Name -eq ".env" -or
        $_.Extension -eq ".log" -or
        $_.Name -like '.tmp-*' -or
        $_.Name -match $dbArtifactPattern
    } |
    Remove-Item -Force

Compress-Archive -Path "$stageDir\*" -DestinationPath $zipFile -Force
Remove-Item -LiteralPath $stageDir -Recurse -Force

$zipSize = (Get-Item -LiteralPath $zipFile).Length / 1MB
$zipHash = (Get-FileHash -LiteralPath $zipFile -Algorithm SHA256).Hash.ToLowerInvariant()
$releaseDir = "release"
$shaFile = Join-Path $releaseDir "SHA256SUMS.txt"

if (-not (Test-Path $releaseDir)) {
    New-Item -ItemType Directory -Path $releaseDir | Out-Null
}

$shaLines = @()
if (Test-Path $shaFile) {
    $shaLines = Get-Content $shaFile | Where-Object { $_ -and ($_ -notmatch '\s+backend-deploy\.zip$') }
}
$shaLines = @("$zipHash  backend-deploy.zip") + $shaLines
Set-Content -LiteralPath $shaFile -Value $shaLines

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Backend package completed" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Package: $zipFile" -ForegroundColor Cyan
Write-Host "Size: $([math]::Round($zipSize, 2)) MB" -ForegroundColor Cyan
Write-Host "SHA256: $zipHash" -ForegroundColor Cyan
Write-Host "Included runtime deploy helpers: $($runtimeDeployFiles -join ', ')" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Upload $zipFile to /www/wwwroot/game-backend/ on the server." -ForegroundColor White
Write-Host "2. Extract directly into /www/wwwroot/game-backend/ without nesting another backend/ folder." -ForegroundColor White
Write-Host "3. Run bash deploy/backup-database.sh and bash deploy/database-safety-preflight.sh before restart." -ForegroundColor White
Write-Host ""
