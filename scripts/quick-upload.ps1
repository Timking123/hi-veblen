# 快速上传关键文件到服务器
# 不需要打包，直接上传修改的文件

param(
    [string]$ServerHost = "120.25.234.223",
    [string]$ServerUser = "root",
    [string]$ServerPath = "/var/www/portfolio"
)

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  快速上传关键文件" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# 检查 SCP 命令
$scpCommand = Get-Command scp -ErrorAction SilentlyContinue
if (-not $scpCommand) {
    Write-Host "错误: 未找到 SCP 命令" -ForegroundColor Red
    Write-Host "请安装 Git for Windows 或 OpenSSH" -ForegroundColor Yellow
    exit 1
}

# 需要上传的关键文件
$filesToUpload = @(
    "scripts/fix-deployment.sh",
    "package.json",
    ".github/workflows/ci.yml",
    ".github/workflows/deploy-gh-pages.yml",
    ".github/workflows/deploy.yml"
)

Write-Host "正在上传文件..." -ForegroundColor Green
Write-Host ""

$successCount = 0
$failCount = 0

foreach ($file in $filesToUpload) {
    if (Test-Path $file) {
        Write-Host "上传: $file" -ForegroundColor Gray
        
        # 获取文件的目录路径
        $fileDir = Split-Path $file -Parent
        $remoteDir = "$ServerPath/$fileDir"
        
        # 确保远程目录存在
        ssh "${ServerUser}@${ServerHost}" "mkdir -p $remoteDir" 2>$null
        
        # 上传文件
        scp $file "${ServerUser}@${ServerHost}:$ServerPath/$file" 2>$null
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  ✓ 成功" -ForegroundColor Green
            $successCount++
        } else {
            Write-Host "  ✗ 失败" -ForegroundColor Red
            $failCount++
        }
    } else {
        Write-Host "跳过: $file (文件不存在)" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "上传完成: $successCount 成功, $failCount 失败" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

if ($successCount -gt 0) {
    Write-Host ""
    $response = Read-Host "是否在服务器上执行部署？(y/n)"
    
    if ($response -eq "y" -or $response -eq "Y") {
        Write-Host ""
        Write-Host "正在服务器上执行部署..." -ForegroundColor Green
        Write-Host ""
        
        ssh "${ServerUser}@${ServerHost}" @"
cd $ServerPath
chmod +x scripts/fix-deployment.sh
bash scripts/fix-deployment.sh
"@
        
        Write-Host ""
        Write-Host "✓ 部署完成！" -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "请手动在服务器上执行：" -ForegroundColor Yellow
        Write-Host "  cd $ServerPath" -ForegroundColor Gray
        Write-Host "  bash scripts/fix-deployment.sh" -ForegroundColor Gray
    }
}

Write-Host ""
