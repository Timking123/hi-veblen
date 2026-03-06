@echo off
chcp 65001 >nul
echo ========================================
echo   前端一键启动脚本
echo ========================================
echo.

:: 检查 Node.js 是否安装
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [错误] 未检测到 Node.js，请先安装 Node.js
    pause
    exit /b 1
)

echo [信息] Node.js 版本:
node -v
echo.

:: 主站前端启动
echo [步骤 1/2] 检查主站前端依赖...
if not exist "node_modules" (
    echo [信息] 正在安装主站前端依赖...
    call npm install
    if %errorlevel% neq 0 (
        echo [错误] 主站前端依赖安装失败
        pause
        exit /b 1
    )
)

echo [步骤 2/2] 启动主站前端开发服务器...
echo.
echo ========================================
echo   主站前端将在 http://localhost:5173 启动
echo   按 Ctrl+C 停止服务器
echo ========================================
echo.

npm run dev
