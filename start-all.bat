@echo off
chcp 65001 >nul
echo ========================================
echo   全部服务一键启动脚本
echo ========================================
echo.
echo 此脚本将在新窗口中启动以下服务：
echo   1. 主站前端 (http://localhost:5173)
echo   2. 管理后台前端 (http://localhost:5174)
echo   3. 后端 API (http://localhost:3001)
echo.
echo ========================================
echo.

:: 启动主站前端（新窗口）
echo [启动] 主站前端...
start "主站前端 - localhost:5173" cmd /k "cd /d %~dp0 && npm run dev"

:: 等待 2 秒
timeout /t 2 /nobreak >nul

:: 启动管理后台前端（新窗口）
echo [启动] 管理后台前端...
start "管理后台前端 - localhost:5174" cmd /k "cd /d %~dp0src\admin\frontend && npm run dev"

:: 等待 2 秒
timeout /t 2 /nobreak >nul

:: 启动后端（新窗口）
echo [启动] 后端 API...
start "后端 API - localhost:3001" cmd /k "cd /d %~dp0src\admin\backend && npm run dev"

echo.
echo ========================================
echo   所有服务已在新窗口中启动
echo   关闭各窗口即可停止对应服务
echo ========================================
echo.
pause
