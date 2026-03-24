@echo off
echo ========================================
echo 更新服务器 Pyodide 修复文件
echo ========================================

echo.
echo [1/3] 上传 usePyodide.ts 到服务器...
scp hooks/usePyodide.ts root@120.26.114.244:/www/wwwroot/game.codebn.cn/hooks/usePyodide.ts

if %ERRORLEVEL% NEQ 0 (
    echo ❌ 上传失败！
    pause
    exit /b 1
)

echo ✅ 文件上传成功！
echo.
echo [2/3] 重启服务器应用...
ssh root@120.26.114.244 "cd /www/wwwroot/game.codebn.cn && pm2 restart game-google"

if %ERRORLEVEL% NEQ 0 (
    echo ❌ 重启失败！
    pause
    exit /b 1
)

echo ✅ 应用重启成功！
echo.
echo [3/3] 完成！
echo.
echo 🎉 Pyodide 修复已部署到服务器
echo 📝 请访问 http://game.codebn.cn:3003 测试编辑器
echo.
pause
