# Python 冒险岛 - 停止脚本
# 使用方法: .\stop-game.ps1

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "   Python 冒险岛 - 停止中..." -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# 停止前端（端口3000）
Write-Host "🛑 正在停止前端服务器..." -ForegroundColor Yellow
$frontend = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique

if ($frontend) {
    foreach ($pid in $frontend) {
        try {
            Stop-Process -Id $pid -Force -ErrorAction Stop
            Write-Host "  ✓ 已停止进程 PID: $pid" -ForegroundColor Green
        } catch {
            Write-Host "  ✗ 无法停止进程 PID: $pid" -ForegroundColor Red
        }
    }
    Write-Host "✓ 前端服务器已停止" -ForegroundColor Green
} else {
    Write-Host "  前端未运行" -ForegroundColor Gray
}

Write-Host ""

# 停止后端（端口8000）
Write-Host "🛑 正在停止后端服务器..." -ForegroundColor Yellow
$backend = Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique

if ($backend) {
    foreach ($pid in $backend) {
        try {
            Stop-Process -Id $pid -Force -ErrorAction Stop
            Write-Host "  ✓ 已停止进程 PID: $pid" -ForegroundColor Green
        } catch {
            Write-Host "  ✗ 无法停止进程 PID: $pid" -ForegroundColor Red
        }
    }
    Write-Host "✓ 后端服务器已停止" -ForegroundColor Green
} else {
    Write-Host "  后端未运行" -ForegroundColor Gray
}

Write-Host ""
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "   游戏已完全停止！" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "提示: 使用 .\start-game.ps1 重新启动游戏" -ForegroundColor Gray
Write-Host ""
