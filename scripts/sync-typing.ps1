param(
    [string]$Target = "C:\kaifa\Obsidian\senlin-kaifa\game-google\public\typing"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$resolvedTarget = Resolve-Path -LiteralPath $Target
$expectedRoot = Resolve-Path -LiteralPath "C:\kaifa\Obsidian\senlin-kaifa\game-google\public"
if (-not $resolvedTarget.Path.StartsWith($expectedRoot.Path, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Refusing to validate typing assets outside public directory: $($resolvedTarget.Path)"
}

$requiredPaths = @(
    "index.html",
    "assets\app.js",
    "assets\styles.css",
    "data\catalog.json",
    "data\asset-map.json"
)

foreach ($relativePath in $requiredPaths) {
    $path = Join-Path $resolvedTarget.Path $relativePath
    if (-not (Test-Path -LiteralPath $path)) {
        throw "Typing asset missing: $path"
    }
}

$databaseFiles = Get-ChildItem -LiteralPath (Join-Path $resolvedTarget.Path "data") -Recurse -Force -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -match '\.db($|-journal$|-shm$|-wal$)' }
foreach ($file in $databaseFiles) {
    Remove-Item -LiteralPath $file.FullName -Force
}

Write-Host "Typing assets are self-contained in $($resolvedTarget.Path)"
