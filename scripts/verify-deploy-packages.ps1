param(
    [string[]]$Packages = @(
        "deploy/backend-deploy.zip",
        "deploy/game-deploy.zip"
    )
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.IO.Compression.FileSystem

foreach ($package in $Packages) {
    if (-not (Test-Path -LiteralPath $package)) {
        throw "Deployment package not found: $package"
    }

    $archive = [System.IO.Compression.ZipFile]::OpenRead((Resolve-Path -LiteralPath $package))
    try {
        foreach ($entry in $archive.Entries) {
            if (-not $entry.FullName.EndsWith(".sh", [System.StringComparison]::OrdinalIgnoreCase)) {
                continue
            }

            $stream = $entry.Open()
            try {
                $buffer = New-Object byte[] $entry.Length
                $offset = 0
                while ($offset -lt $buffer.Length) {
                    $read = $stream.Read($buffer, $offset, $buffer.Length - $offset)
                    if ($read -eq 0) {
                        break
                    }
                    $offset += $read
                }
            } finally {
                $stream.Dispose()
            }

            if ($buffer -contains 13) {
                throw "$package contains a shell script with CRLF line endings: $($entry.FullName)"
            }
        }

        if ($package.EndsWith("backend-deploy.zip", [System.StringComparison]::OrdinalIgnoreCase)) {
            $backendScript = $archive.Entries |
                Where-Object { $_.FullName.Replace('\', '/') -eq "deploy/post-upload-backend.sh" } |
                Select-Object -First 1
            if ($null -eq $backendScript) {
                throw "$package is missing deploy/post-upload-backend.sh"
            }

            $reader = New-Object System.IO.StreamReader($backendScript.Open())
            try {
                $scriptText = $reader.ReadToEnd()
            } finally {
                $reader.Dispose()
            }

            if ($scriptText -match 'rm\s+-f\s+.*-wal.*-shm') {
                throw "$package contains unsafe manual deletion of active SQLite WAL/SHM files"
            }

            if ($scriptText -notmatch 'pm2 start npm --name game --max-memory-restart 512M') {
                throw "$package does not enforce the expected 512M PM2 memory restart limit"
            }
        }

        if ($package.EndsWith("game-deploy.zip", [System.StringComparison]::OrdinalIgnoreCase)) {
            $runtimeSignatureEntry = $archive.Entries |
                Where-Object { $_.FullName.Replace('\', '/') -eq "deploy/FRONTEND_RUNTIME_SIGNATURE.txt" } |
                Select-Object -First 1
            if ($null -eq $runtimeSignatureEntry) {
                throw "$package is missing deploy/FRONTEND_RUNTIME_SIGNATURE.txt"
            }

            $runtimeSignatureReader = New-Object System.IO.StreamReader($runtimeSignatureEntry.Open())
            try {
                $runtimeSignature = $runtimeSignatureReader.ReadToEnd().Trim()
            } finally {
                $runtimeSignatureReader.Dispose()
            }

            if ($runtimeSignature -ne "player-collision-bottom-aligned-v1") {
                throw "$package contains an unexpected frontend runtime signature: $runtimeSignature"
            }
        }
    } finally {
        $archive.Dispose()
    }
}

Write-Host "PASS: deployment package shell scripts are LF-only and database-safe" -ForegroundColor Green
