@echo off
REM ============================================================================
REM 音频优化脚本 (Windows)
REM 
REM 此脚本将音频文件转换为 MP3 格式，比特率 128kbps，并进行优化
REM 
REM 使用方法:
REM   optimize-audio.bat <input_directory> <output_directory>
REM 
REM 示例:
REM   optimize-audio.bat .\raw-audio .\public\audio
REM 
REM 要求:
REM   - 安装 ffmpeg 并添加到 PATH
REM   - 输入目录包含 WAV、OGG 或其他音频格式文件
REM ============================================================================

setlocal enabledelayedexpansion

REM 检查参数
if "%~1"=="" (
    echo 错误: 缺少参数
    echo 使用方法: %~nx0 ^<input_directory^> ^<output_directory^>
    echo 示例: %~nx0 .\raw-audio .\public\audio
    exit /b 1
)

if "%~2"=="" (
    echo 错误: 缺少参数
    echo 使用方法: %~nx0 ^<input_directory^> ^<output_directory^>
    echo 示例: %~nx0 .\raw-audio .\public\audio
    exit /b 1
)

set "INPUT_DIR=%~1"
set "OUTPUT_DIR=%~2"

REM 检查输入目录
if not exist "%INPUT_DIR%" (
    echo 错误: 输入目录不存在: %INPUT_DIR%
    exit /b 1
)

REM 检查 ffmpeg
where ffmpeg >nul 2>nul
if %errorlevel% neq 0 (
    echo 错误: 未找到 ffmpeg
    echo 请先安装 ffmpeg: https://ffmpeg.org/download.html
    echo 并将 ffmpeg 添加到系统 PATH
    exit /b 1
)

echo ==================================
echo 音频优化脚本
echo ==================================
echo.
echo 输入目录: %INPUT_DIR%
echo 输出目录: %OUTPUT_DIR%
echo.

REM 创建输出目录
if not exist "%OUTPUT_DIR%" mkdir "%OUTPUT_DIR%"

REM 计数器
set SUCCESS_COUNT=0
set FAIL_COUNT=0
set TOTAL_COUNT=0

REM 处理背景音乐
echo 处理背景音乐...
set "MUSIC_INPUT=%INPUT_DIR%\music"
set "MUSIC_OUTPUT=%OUTPUT_DIR%\music"

if exist "%MUSIC_INPUT%" (
    if not exist "%MUSIC_OUTPUT%" mkdir "%MUSIC_OUTPUT%"
    
    for %%f in ("%MUSIC_INPUT%\*.wav" "%MUSIC_INPUT%\*.ogg" "%MUSIC_INPUT%\*.flac" "%MUSIC_INPUT%\*.m4a") do (
        if exist "%%f" (
            set /a TOTAL_COUNT+=1
            echo 处理: %%~nxf ...
            
            REM 音乐: 立体声, 128kbps
            ffmpeg -i "%%f" -ac 2 -b:a 128k -ar 44100 -af "loudnorm" -y "%MUSIC_OUTPUT%\%%~nf.mp3" >nul 2>&1
            
            if !errorlevel! equ 0 (
                echo   [成功] 大小: 
                dir /b "%MUSIC_OUTPUT%\%%~nf.mp3" | find /v "" >nul
                set /a SUCCESS_COUNT+=1
            ) else (
                echo   [失败]
                set /a FAIL_COUNT+=1
            )
        )
    )
) else (
    echo   跳过: 未找到 music 目录
)

echo.

REM 处理音效
echo 处理音效...
set "SFX_INPUT=%INPUT_DIR%\sfx"
set "SFX_OUTPUT=%OUTPUT_DIR%\sfx"

if exist "%SFX_INPUT%" (
    if not exist "%SFX_OUTPUT%" mkdir "%SFX_OUTPUT%"
    
    for %%f in ("%SFX_INPUT%\*.wav" "%SFX_INPUT%\*.ogg" "%SFX_INPUT%\*.flac" "%SFX_INPUT%\*.m4a") do (
        if exist "%%f" (
            set /a TOTAL_COUNT+=1
            echo 处理: %%~nxf ...
            
            REM 音效: 单声道, 128kbps, 移除静音
            ffmpeg -i "%%f" -ac 1 -b:a 128k -ar 44100 -af "silenceremove=1:0:-50dB,loudnorm" -y "%SFX_OUTPUT%\%%~nf.mp3" >nul 2>&1
            
            if !errorlevel! equ 0 (
                echo   [成功]
                set /a SUCCESS_COUNT+=1
            ) else (
                echo   [失败]
                set /a FAIL_COUNT+=1
            )
        )
    )
) else (
    echo   跳过: 未找到 sfx 目录
)

echo.
echo ==================================
echo 完成: %SUCCESS_COUNT%/%TOTAL_COUNT% 个文件
if %FAIL_COUNT% gtr 0 (
    echo 失败: %FAIL_COUNT% 个文件
)
echo ==================================
echo.

echo 优化建议:
echo 1. 检查输出文件的音质是否满足要求
echo 2. 音乐文件应 ^< 1 MB
echo 3. 音效文件应 ^< 50 KB
echo 4. 使用音频播放器测试循环播放（音乐）
echo 5. 在游戏中测试所有音频文件
echo.

endlocal
exit /b 0
