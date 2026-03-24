@echo off
chcp 65001 >nul
echo ========================================
echo 🚀 更新服务器前端 Pyodide 修复
echo ========================================
echo.

echo [1/4] 📦 构建生产版本...
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo ❌ 构建失败！
    pause
    exit /b 1
)
echo ✅ 构建完成
echo.

echo [2/4] 📁 打包前端文件...
tar -czf frontend-pyodide-fix.tar.gz .next public
if %ERRORLEVEL% NEQ 0 (
    echo ❌ 打包失败！请确保已安装 tar 命令
    pause
    exit /b 1
)
echo ✅ 打包完成
echo.

echo [3/4] ⬆️  上传到服务器...
scp frontend-pyodide-fix.tar.gz root@120.26.114.244:/tmp/
if %ERRORLEVEL% NEQ 0 (
    echo ❌ 上传失败！
    pause
    exit /b 1
)
echo ✅ 上传完成
echo.

echo [4/4] 🔄 部署并重启服务...
ssh root@120.26.114.244 "cd /www/wwwroot/game.codebn.cn && tar -xzf /tmp/frontend-pyodide-fix.tar.gz && pm2 restart game-google && rm /tmp/frontend-pyodide-fix.tar.gz"
if %ERRORLEVEL% NEQ 0 (
    echo ❌ 部署失败！
    pause
    exit /b 1
)
echo ✅ 部署完成
echo.

echo 🎉 Pyodide 修复已成功部署！
echo 📝 请访问 http://game.codebn.cn:3003 测试编辑器
echo.

rem 清理本地打包文件
del frontend-pyodide-fix.tar.gz

pause
