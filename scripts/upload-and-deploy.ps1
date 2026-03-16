# Windows PowerShell 脚本
# 创建部署包并上传到服务器

param(
    [string]$ServerHost = "120.25.234.223",
    [string]$ServerUser = "root"
)

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  创建部署包并上传到服务器" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# 检查是否安装了 7-Zip 或其他压缩工具
$7zipPath = "C:\Program Files\7-Zip\7z.exe"
if (-not (Test-Path $7zipPath)) {
    Write-Host "错误: 未找到 7-Zip，请先安装 7-Zip" -ForegroundColor Red
    Write-Host "下载地址: https://www.7-zip.org/" -ForegroundColor Yellow
    exit 1
}

# 创建部署包名称
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$packageName = "deploy-package-$timestamp.tar.gz"
$tempDir = ".deploy-temp"

Write-Host "[步骤 1] 准备文件..." -ForegroundColor Green

# 创建临时目录
if (Test-Path $tempDir) {
    Remove-Item -Recurse -Force $tempDir
}
New-Item -ItemType Directory -Path $tempDir | Out-Null

# 复制文件（排除不需要的目录）
Write-Host "复制源代码..." -ForegroundColor Gray
$excludeDirs = @("node_modules", "dist", ".git", ".deploy-temp", "*.tar.gz", "*.zip")

Get-ChildItem -Path . -Exclude $excludeDirs | ForEach-Object {
    if ($_.Name -notin @("node_modules", "dist", ".git", ".deploy-temp") -and 
        $_.Extension -notin @(".tar.gz", ".zip")) {
        Copy-Item -Path $_.FullName -Destination $tempDir -Recurse -Force
    }
}

Write-Host ""
Write-Host "[步骤 2] 压缩文件..." -ForegroundColor Green

# 使用 7-Zip 创建 tar.gz
& $7zipPath a -ttar "$tempDir.tar" "$tempDir\*" | Out-Null
& $7zipPath a -tgzip $packageName "$tempDir.tar" | Out-Null
Remove-Item "$tempDir.tar" -Force

# 清理临时目录
Remove-Item -Recurse -Force $tempDir

$fileSize = (Get-Item $packageName).Length / 1MB
Write-Host "✓ 部署包创建完成: $packageName" -ForegroundColor Green
Write-Host "  文件大小: $([math]::Round($fileSize, 2)) MB" -ForegroundColor Gray

Write-Host ""
Write-Host "[步骤 3] 上传到服务器..." -ForegroundColor Green

# 检查是否安装了 SCP（通过 OpenSSH 或 Git）
$scpCommand = Get-Command scp -ErrorAction SilentlyContinue

if ($scpCommand) {
    Write-Host "使用 SCP 上传..." -ForegroundColor Gray
    scp $packageName "${ServerUser}@${ServerHost}:/tmp/"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ 上传成功！" -ForegroundColor Green
        
        Write-Host ""
        Write-Host "==========================================" -ForegroundColor Cyan
        Write-Host "  在服务器上执行以下命令" -ForegroundColor Cyan
        Write-Host "==========================================" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "cd /var/www/portfolio" -ForegroundColor Yellow
        Write-Host "tar -xzf /tmp/$packageName" -ForegroundColor Yellow
        Write-Host "bash scripts/fix-deployment.sh" -ForegroundColor Yellow
        Write-Host ""
        
        # 询问是否自动执行部署
        $response = Read-Host "是否自动在服务器上执行部署？(y/n)"
        if ($response -eq "y" -or $response -eq "Y") {
            Write-Host ""
            Write-Host "[步骤 4] 在服务器上执行部署..." -ForegroundColor Green
            
            ssh "${ServerUser}@${ServerHost}" @"
cd /var/www/portfolio
tar -xzf /tmp/$packageName
bash scripts/fix-deployment.sh
"@
        }
    } else {
        Write-Host "✗ 上传失败" -ForegroundColor Red
        Write-Host ""
        Write-Host "请手动上传 $packageName 到服务器 /tmp/ 目录" -ForegroundColor Yellow
    }
} else {
    Write-Host "⚠ 未找到 SCP 命令" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "请使用 FTP 工具（如 WinSCP、FileZilla）手动上传：" -ForegroundColor Yellow
    Write-Host "  文件: $packageName" -ForegroundColor Gray
    Write-Host "  目标: ${ServerUser}@${ServerHost}:/tmp/" -ForegroundColor Gray
    Write-Host ""
    Write-Host "上传后，在服务器上执行：" -ForegroundColor Yellow
    Write-Host "  cd /var/www/portfolio" -ForegroundColor Gray
    Write-Host "  tar -xzf /tmp/$packageName" -ForegroundColor Gray
    Write-Host "  bash scripts/fix-deployment.sh" -ForegroundColor Gray
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  完成！" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
