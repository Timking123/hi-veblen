@echo off
chcp 65001 >nul
echo ========================================
echo   管理后台前端一键启动脚本
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

:: 切换到管理后台前端目录
cd /d "%~dp0src\admin\frontend"

:: 检查并安装依赖
echo [步骤 1/2] 检查管理后台前端依赖...
if not exist "node_modules" (
    echo [信息] 正在安装管理后台前端依赖...
    call npm install
    if %errorlevel% neq 0 (
        echo [错误] 管理后台前端依赖安装失败
        pause
        exit /b 1
    )
)

:: 启动管理后台前端
echo [步骤 2/2] 启动管理后台前端开发服务器...
echo.
echo ========================================
echo   管理后台前端将在 http://localhost:5174 启动
echo   按 Ctrl+C 停止服务器
echo ========================================
echo.

npm run dev
