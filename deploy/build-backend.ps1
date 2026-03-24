# 后端打包脚本 - Windows PowerShell
# 用法: .\deploy\build-backend.ps1

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  后端打包脚本 - game.codebn.cn" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 检查后端目录
if (-not (Test-Path "backend")) {
    Write-Host "错误: 未找到 backend 目录" -ForegroundColor Red
    exit 1
}

# 打包后端
Write-Host "打包后端文件..." -ForegroundColor Yellow
$zipFile = "deploy/backend-deploy.zip"
if (Test-Path $zipFile) {
    Remove-Item $zipFile
}

# 排除不需要的文件
$excludeFiles = @(
    "backend/__pycache__",
    "backend/venv",
    "backend/.env",
    "backend/*.pyc"
)

Compress-Archive -Path "backend/*" -DestinationPath $zipFile -Force

$zipSize = (Get-Item $zipFile).Length / 1MB
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  后端打包完成!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "部署包: $zipFile" -ForegroundColor Cyan
Write-Host "文件大小: $([math]::Round($zipSize, 2)) MB" -ForegroundColor Cyan
Write-Host ""
Write-Host "下一步:" -ForegroundColor Yellow
Write-Host "1. 上传 $zipFile 到服务器 /www/wwwroot/game-backend/" -ForegroundColor White
Write-Host "2. 解压并按照 deploy/backend-deploy.md 部署" -ForegroundColor White
Write-Host ""
