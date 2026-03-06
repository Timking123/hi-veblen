@echo off
chcp 65001 >nul
echo ========================================
echo   后端一键启动脚本
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

:: 切换到后端目录
cd /d "%~dp0src\admin\backend"

:: 检查并安装依赖
echo [步骤 1/3] 检查后端依赖...
if not exist "node_modules" (
    echo [信息] 正在安装后端依赖...
    call npm install
    if %errorlevel% neq 0 (
        echo [错误] 后端依赖安装失败
        pause
        exit /b 1
    )
)

:: 检查 .env 文件
echo [步骤 2/3] 检查环境配置...
if not exist ".env" (
    if exist ".env.example" (
        echo [信息] 正在从 .env.example 创建 .env 文件...
        copy ".env.example" ".env" >nul
        echo [警告] 请检查并修改 .env 文件中的配置
    ) else (
        echo [警告] 未找到 .env 文件，使用默认配置
    )
)

:: 启动后端服务
echo [步骤 3/3] 启动后端开发服务器...
echo.
echo ========================================
echo   后端 API 将在 http://localhost:3001 启动
echo   按 Ctrl+C 停止服务器
echo ========================================
echo.

npm run dev
