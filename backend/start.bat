@echo off
chcp 65001 >nul
cls
echo ========================================
echo    编程冒险岛 - 后端服务启动
echo ========================================
echo.
echo [1/2] 检查环境...
python --version
echo.
echo [2/2] 启动服务...
echo.
python run.py
pause






