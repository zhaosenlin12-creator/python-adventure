@echo off
echo ========================================
echo   启动宠物系统
echo ========================================
echo.

echo 1. 修复数据...
cd backend
python fix_food_and_coins.py
echo.

echo 2. 启动后端服务器...
start "Backend Server" cmd /k "python -m uvicorn app.main:app --reload --port 8000"
echo    后端已启动在 http://localhost:8000
echo.

timeout /t 3 /nobreak >nul

echo 3. 启动前端...
cd ..
start "Frontend Server" cmd /k "npm run dev"
echo    前端已启动在 http://localhost:3000
echo.

echo ========================================
echo   ✅ 启动完成！
echo ========================================
echo.
echo 测试账号: senlin8dog
echo 密码: 123456
echo.
echo 请在浏览器打开: http://localhost:3000
echo.
echo 按任意键关闭此窗口...
pause >nul
