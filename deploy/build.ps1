# 游戏构建脚本 - Windows PowerShell
# 用法: .\deploy\build.ps1

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  游戏构建脚本 - game.codebn.cn" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 检查是否在项目根目录
if (-not (Test-Path "package.json")) {
    Write-Host "错误: 请在项目根目录运行此脚本" -ForegroundColor Red
    exit 1
}

# 步骤1: 安装依赖
Write-Host "[1/5] 检查依赖..." -ForegroundColor Yellow
if (-not (Test-Path "node_modules")) {
    Write-Host "安装依赖中..." -ForegroundColor Yellow
    npm install
}

# 步骤2: 构建项目
Write-Host "[2/5] 构建项目..." -ForegroundColor Yellow
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "构建失败!" -ForegroundColor Red
    exit 1
}

# 步骤3: 创建部署目录
Write-Host "[3/5] 准备部署文件..." -ForegroundColor Yellow
$deployDir = "deploy/dist"
if (Test-Path $deployDir) {
    Remove-Item -Recurse -Force $deployDir
}
New-Item -ItemType Directory -Path $deployDir | Out-Null

# 步骤4: 复制必要文件
Write-Host "[4/5] 复制文件..." -ForegroundColor Yellow

# 复制构建产物
Copy-Item -Recurse ".next" "$deployDir/.next"
Copy-Item -Recurse "public" "$deployDir/public"
Copy-Item "package.json" "$deployDir/"
Copy-Item "package-lock.json" "$deployDir/"
Copy-Item "next.config.ts" "$deployDir/"
Copy-Item "tsconfig.json" "$deployDir/"

# 复制源代码目录（服务器构建需要）
Copy-Item -Recurse "app" "$deployDir/app"
Copy-Item -Recurse "components" "$deployDir/components"
Copy-Item -Recurse "lib" "$deployDir/lib"
Copy-Item -Recurse "store" "$deployDir/store"
Copy-Item -Recurse "hooks" "$deployDir/hooks"
Copy-Item -Recurse "types" "$deployDir/types"

# 复制部署脚本
Copy-Item "deploy/deploy.sh" "$deployDir/"
Copy-Item "deploy/deploy-secure-frontend.sh" "$deployDir/"
Copy-Item "deploy/ecosystem.config.js" "$deployDir/"

# 步骤5: 打包
Write-Host "[5/5] 打包文件..." -ForegroundColor Yellow
$zipFile = "deploy/game-deploy.zip"
if (Test-Path $zipFile) {
    Remove-Item $zipFile
}

# 使用PowerShell压缩
Compress-Archive -Path "$deployDir/*" -DestinationPath $zipFile -Force

# 清理临时目录
Remove-Item -Recurse -Force $deployDir

# 完成
$zipSize = (Get-Item $zipFile).Length / 1MB
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  构建完成!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "部署包: $zipFile" -ForegroundColor Cyan
Write-Host "文件大小: $([math]::Round($zipSize, 2)) MB" -ForegroundColor Cyan
Write-Host ""
Write-Host "下一步:" -ForegroundColor Yellow
Write-Host "1. 上传 $zipFile 到服务器 /www/wwwroot/game/" -ForegroundColor White
Write-Host "2. 在服务器解压并运行 ./deploy.sh" -ForegroundColor White
Write-Host ""
