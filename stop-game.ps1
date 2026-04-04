# Python 冒险岛 - 停止脚本
# 使用方法: .\stop-game.ps1

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "   Python 冒险岛 - 停止中..." -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendPath = Join-Path $projectRoot "backend"

function Stop-OwnedProcessesByPort {
    param(
        [int[]]$Ports,
        [string]$Label
    )

    Write-Host "正在停止$Label..." -ForegroundColor Yellow
    $processIds = Get-NetTCPConnection -ErrorAction SilentlyContinue |
        Where-Object { $Ports -contains $_.LocalPort -and $_.State -eq 'Listen' } |
        Select-Object -ExpandProperty OwningProcess -Unique

    if ($processIds) {
        foreach ($processId in $processIds) {
            try {
                Stop-Process -Id $processId -Force -ErrorAction Stop
                Write-Host "  已停止进程 PID: $processId" -ForegroundColor Green
            } catch {
                Write-Host "  无法停止进程 PID: $processId" -ForegroundColor Red

                $spawnChildren = Get-CimInstance Win32_Process -ErrorAction SilentlyContinue |
                    Where-Object {
                        $_.Name -eq "python.exe" -and
                        $_.CommandLine -match [regex]::Escape("spawn_main(parent_pid=$processId")
                    } |
                    Select-Object -ExpandProperty ProcessId -Unique

                foreach ($childId in $spawnChildren) {
                    try {
                        Stop-Process -Id $childId -Force -ErrorAction Stop
                        Write-Host "  已停止派生子进程 PID: $childId" -ForegroundColor Green
                    } catch {
                        Write-Host "  无法停止派生子进程 PID: $childId" -ForegroundColor Red
                    }
                }
            }
        }
        Write-Host "$Label已停止" -ForegroundColor Green
    } else {
        Write-Host "  $Label未运行" -ForegroundColor Gray
    }
}

function Stop-LauncherPowershells {
    param(
        [string]$CommandPattern,
        [string]$Label
    )

    $launcherIds = Get-CimInstance Win32_Process -ErrorAction SilentlyContinue |
        Where-Object {
            $_.Name -eq "powershell.exe" -and
            $_.CommandLine -match $CommandPattern
        } |
        Select-Object -ExpandProperty ProcessId -Unique

    function Get-DescendantProcessIds {
        param([int]$ParentId)

        $directChildren = Get-CimInstance Win32_Process -ErrorAction SilentlyContinue |
            Where-Object { $_.ParentProcessId -eq $ParentId } |
            Select-Object -ExpandProperty ProcessId

        $allChildren = @()
        foreach ($childId in $directChildren) {
            $allChildren += $childId
            $allChildren += Get-DescendantProcessIds -ParentId $childId
        }

        return $allChildren
    }

    foreach ($launcherId in $launcherIds) {
        $descendantIds = Get-DescendantProcessIds -ParentId $launcherId | Select-Object -Unique
        foreach ($descendantId in ($descendantIds | Sort-Object -Descending)) {
            try {
                Stop-Process -Id $descendantId -Force -ErrorAction Stop
                Write-Host "  已停止$Label子进程 PID: $descendantId" -ForegroundColor Green
            } catch {
                Write-Host "  无法停止$Label子进程 PID: $descendantId" -ForegroundColor Red
            }
        }

        try {
            Stop-Process -Id $launcherId -Force -ErrorAction Stop
            Write-Host "  已停止$Label启动器 PID: $launcherId" -ForegroundColor Green
        } catch {
            Write-Host "  无法停止$Label启动器 PID: $launcherId" -ForegroundColor Red
        }
    }
}

# 停止前端（兼容 3000/3003）
Stop-OwnedProcessesByPort -Ports @(3000, 3003) -Label "前端服务器"
Stop-LauncherPowershells -CommandPattern [regex]::Escape("Set-Location '$projectRoot'; npm run dev -- -p 3003 -H 0.0.0.0") -Label "前端"

Write-Host ""

# 停止后端（端口8000）
Stop-LauncherPowershells -CommandPattern [regex]::Escape("Set-Location '$backendPath'; python run.py") -Label "后端"
Stop-OwnedProcessesByPort -Ports @(8000) -Label "后端服务器"

Write-Host ""
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "   游戏已完全停止！" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "提示: 使用 .\start-game.ps1 重新启动游戏" -ForegroundColor Gray
Write-Host ""
