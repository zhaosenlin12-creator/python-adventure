# Python 冒险岛 - 一键启动脚本
# 使用方法: .\start-game.ps1

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "   Python 冒险岛 - 启动中..." -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# 获取本机IP地址
try {
    $ipAddress = (Get-NetIPAddress -AddressFamily IPv4 | 
        Where-Object { 
            $_.InterfaceAlias -notlike "*Loopback*" -and 
            $_.IPAddress -notlike "169.254.*" 
        } | 
        Select-Object -First 1).IPAddress
    
    if ($ipAddress) {
        Write-Host "📡 本机IP地址: $ipAddress" -ForegroundColor Green
    } else {
        $ipAddress = "localhost"
        Write-Host "⚠️  未检测到网络IP，使用localhost" -ForegroundColor Yellow
    }
} catch {
    $ipAddress = "localhost"
    Write-Host "⚠️  IP检测失败，使用localhost" -ForegroundColor Yellow
}
Write-Host ""

# 检查是否已经有进程在运行
$frontendRunning = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
$backendRunning = Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue

if ($frontendRunning) {
    Write-Host "⚠️  前端已在运行 (端口3000)" -ForegroundColor Yellow
}

if ($backendRunning) {
    Write-Host "⚠️  后端已在运行 (端口8000)" -ForegroundColor Yellow
}

if ($frontendRunning -and $backendRunning) {
    Write-Host ""
    Write-Host "游戏已经在运行！" -ForegroundColor Green
    Write-Host "访问: http://localhost:3000" -ForegroundColor Cyan
    Write-Host ""
    $openBrowser = Read-Host "是否打开浏览器？(Y/N)"
    if ($openBrowser -eq "Y" -or $openBrowser -eq "y") {
        Start-Process "http://localhost:3000"
    }
    exit
}

# 启动后端
if (-not $backendRunning) {
    Write-Host "🚀 启动后端服务器..." -ForegroundColor Green
    $backendPath = Join-Path $PSScriptRoot "backend"
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$backendPath'; Write-Host '后端服务器启动中...' -ForegroundColor Cyan; python run.py"
    Write-Host "✓ 后端服务器已启动" -ForegroundColor Green
    Start-Sleep -Seconds 3
}

# 启动前端
if (-not $frontendRunning) {
    Write-Host "🚀 启动前端服务器 (监听所有网络接口)..." -ForegroundColor Green
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot'; Write-Host '前端服务器启动中...' -ForegroundColor Cyan; npm run dev -- -H 0.0.0.0"
    Write-Host "✓ 前端服务器已启动" -ForegroundColor Green
    Start-Sleep -Seconds 5
}

# 等待服务启动
Write-Host ""
Write-Host "⏳ 等待服务启动..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

# 打开浏览器
Write-Host ""
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "   游戏启动成功！" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "访问地址:" -ForegroundColor White
Write-Host "  本机访问:" -ForegroundColor Yellow
Write-Host "    游戏主页: http://localhost:3000" -ForegroundColor Cyan
Write-Host "    后端API: http://localhost:8000" -ForegroundColor Cyan
Write-Host "    API文档: http://localhost:8000/docs" -ForegroundColor Cyan
Write-Host ""
Write-Host "  局域网访问:" -ForegroundColor Yellow
Write-Host "    游戏主页: http://${ipAddress}:3000" -ForegroundColor Green
Write-Host "    后端API: http://${ipAddress}:8000" -ForegroundColor Green
Write-Host "    API文档: http://${ipAddress}:8000/docs" -ForegroundColor Green
Write-Host ""
Write-Host "  💡 提示: 其他设备可通过局域网地址访问" -ForegroundColor Gray
Write-Host ""
Write-Host "提示: 使用 .\stop-game.ps1 停止游戏" -ForegroundColor Gray
Write-Host ""

# 自动打开浏览器
Write-Host "🌐 正在打开浏览器..." -ForegroundColor Green
Start-Sleep -Seconds 2
Start-Process "http://localhost:3000"

Write-Host ""
Write-Host "✓ 完成！开始游戏吧！" -ForegroundColor Green
Write-Host ""
