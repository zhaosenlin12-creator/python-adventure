Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Remove-TreeSafely {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path
    )

    if (-not (Test-Path $Path)) {
        return
    }

    try {
        Remove-Item -LiteralPath $Path -Recurse -Force -ErrorAction Stop
    } catch {
        Get-ChildItem -LiteralPath $Path -Recurse -Force -File -ErrorAction SilentlyContinue | ForEach-Object {
            $_.Attributes = 'Normal'
        }
        Get-ChildItem -LiteralPath $Path -Recurse -Force -Directory -ErrorAction SilentlyContinue |
            Sort-Object { $_.FullName.Length } -Descending |
            ForEach-Object {
                try {
                    $_.Attributes = 'Directory'
                } catch {
                }
            }
        cmd /c rmdir /s /q "$Path" | Out-Null
        if (Test-Path $Path) {
            throw
        }
    }
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Frontend packaging script - game.codebn.cn" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

if (-not (Test-Path "package.json")) {
    Write-Host "Error: package.json not found. Run this script from the repo root." -ForegroundColor Red
    exit 1
}

$zipFile = "deploy/game-deploy.zip"
$stageDir = "deploy/frontend-dist"
$runtimeDeployFiles = @(
    "post-upload-frontend.sh",
    "DEPLOY_SERVER_EXACT.md",
    "FRONTEND_RELEASE.txt",
    "FRONTEND_RUNTIME_SIGNATURE.txt",
    "ecosystem.config.js"
)

function Convert-ShellScriptsToLf {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Root
    )

    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    Get-ChildItem -LiteralPath $Root -Recurse -File -Filter "*.sh" | ForEach-Object {
        $content = [System.IO.File]::ReadAllText($_.FullName)
        $content = $content.Replace("`r`n", "`n").Replace("`r", "`n")
        [System.IO.File]::WriteAllText($_.FullName, $content, $utf8NoBom)
    }
}

Write-Host "[1/5] Install dependencies if needed..." -ForegroundColor Yellow
if (-not (Test-Path "node_modules")) {
    npm install
}

Write-Host "[2/5] Build frontend..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Frontend build failed." -ForegroundColor Red
    exit 1
}

Write-Host "[3/5] Prepare staging directory..." -ForegroundColor Yellow
if (Test-Path $zipFile) {
    Remove-Item -LiteralPath $zipFile -Force
}
if (Test-Path $stageDir) {
    Remove-TreeSafely -Path $stageDir
}
New-Item -ItemType Directory -Path $stageDir | Out-Null

Write-Host "[4/5] Copy runtime files..." -ForegroundColor Yellow
Copy-Item -LiteralPath ".next" -Destination (Join-Path $stageDir ".next") -Recurse -Force
Copy-Item -LiteralPath "public" -Destination (Join-Path $stageDir "public") -Recurse -Force
Copy-Item -LiteralPath "package.json" -Destination $stageDir -Force
Copy-Item -LiteralPath "package-lock.json" -Destination $stageDir -Force
Copy-Item -LiteralPath "next.config.ts" -Destination $stageDir -Force
Copy-Item -LiteralPath "tsconfig.json" -Destination $stageDir -Force

if (Test-Path "proxy.ts") {
    Copy-Item -LiteralPath "proxy.ts" -Destination $stageDir -Force
}

foreach ($dir in @("app", "components", "lib", "store", "hooks", "types")) {
    if (Test-Path $dir) {
        Copy-Item -LiteralPath $dir -Destination (Join-Path $stageDir $dir) -Recurse -Force
    }
}

if (Test-Path (Join-Path $stageDir ".next/dev")) {
    Remove-Item -LiteralPath (Join-Path $stageDir ".next/dev") -Recurse -Force
}
if (Test-Path (Join-Path $stageDir ".next/cache")) {
    Remove-Item -LiteralPath (Join-Path $stageDir ".next/cache") -Recurse -Force
}
if (Test-Path (Join-Path $stageDir ".next/diagnostics")) {
    Remove-Item -LiteralPath (Join-Path $stageDir ".next/diagnostics") -Recurse -Force
}
if (Test-Path (Join-Path $stageDir ".next/dev-server.log")) {
    Remove-Item -LiteralPath (Join-Path $stageDir ".next/dev-server.log") -Force
}
if (Test-Path (Join-Path $stageDir "public/sounds.rar")) {
    Remove-Item -LiteralPath (Join-Path $stageDir "public/sounds.rar") -Force
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

Convert-ShellScriptsToLf -Root $stageDir

Write-Host "[5/5] Create deployment zip..." -ForegroundColor Yellow
Compress-Archive -Path "$stageDir\*" -DestinationPath $zipFile -Force
Remove-TreeSafely -Path $stageDir

& powershell -NoProfile -ExecutionPolicy Bypass -File "scripts/verify-deploy-packages.ps1" -Packages $zipFile
if ($LASTEXITCODE -ne 0) {
    throw "Frontend deployment package verification failed."
}

$zipSize = (Get-Item -LiteralPath $zipFile).Length / 1MB
$zipHash = (Get-FileHash -LiteralPath $zipFile -Algorithm SHA256).Hash.ToLowerInvariant()
$releaseDir = "release"
$shaFile = Join-Path $releaseDir "SHA256SUMS.txt"

if (-not (Test-Path $releaseDir)) {
    New-Item -ItemType Directory -Path $releaseDir | Out-Null
}

$shaLines = @()
if (Test-Path $shaFile) {
    $shaLines = Get-Content $shaFile | Where-Object { $_ -and ($_ -notmatch '\s+game-deploy\.zip$') }
}
$shaLines = @("$zipHash  game-deploy.zip") + $shaLines
Set-Content -LiteralPath $shaFile -Value $shaLines

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Frontend package completed" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Package: $zipFile" -ForegroundColor Cyan
Write-Host "Size: $([math]::Round($zipSize, 2)) MB" -ForegroundColor Cyan
Write-Host "SHA256: $zipHash" -ForegroundColor Cyan
Write-Host "Included runtime deploy helpers: $($runtimeDeployFiles -join ', ')" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Upload $zipFile to /www/wwwroot/game/ on the server." -ForegroundColor White
Write-Host "2. As root, run: rm -rf /www/wwwroot/game/.next && unzip -oq game-deploy.zip" -ForegroundColor White
Write-Host "3. As root, run: chmod +x deploy/*.sh && bash deploy/post-upload-frontend.sh" -ForegroundColor White
Write-Host "4. Expected release marker: v20261003-collision-deploy-r2" -ForegroundColor White
Write-Host ""
