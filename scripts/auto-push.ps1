# Auto commit and push to GitHub (PowerShell version)
# Usage:
#   .\scripts\auto-push.ps1
#   .\scripts\auto-push.ps1 "Custom commit message"

param(
    [string]$CommitMessage = ""
)

$ErrorActionPreference = "Stop"

function Write-ColorOutput {
    param(
        [string]$Message,
        [string]$Color = "White"
    )
    Write-Host $Message -ForegroundColor $Color
}

function Write-Info {
    param([string]$Message)
    Write-ColorOutput "[INFO] $Message" "Green"
}

function Write-Warn {
    param([string]$Message)
    Write-ColorOutput "[WARN] $Message" "Yellow"
}

function Write-Step {
    param([string]$Message)
    Write-ColorOutput "[STEP] $Message" "Cyan"
}

Write-Host "========================================" -ForegroundColor White
Write-Host "  Auto Commit and Push to GitHub" -ForegroundColor White
Write-Host "========================================" -ForegroundColor White
Write-Host ""

try {
    # 1. Check working directory status
    Write-Step "1. Checking working directory status..."
    $status = git status --porcelain
    if ([string]::IsNullOrWhiteSpace($status)) {
        Write-Warn "No changes to commit"
        exit 0
    }

    # 2. Show changed files
    Write-Step "2. Showing changed files..."
    git status --short
    Write-Host ""

    # 3. Add all changes
    Write-Step "3. Adding all changes to staging area..."
    git add .
    Write-Info "All changes added"
    Write-Host ""

    # 4. Generate commit message
    Write-Step "4. Generating commit message..."
    if ([string]::IsNullOrWhiteSpace($CommitMessage)) {
        $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        $CommitMessage = "Update - $timestamp"
    }
    Write-Info "Commit message: $CommitMessage"
    Write-Host ""

    # 5. Commit changes
    Write-Step "5. Committing changes..."
    git commit -m $CommitMessage
    Write-Info "Commit successful"
    Write-Host ""

    # 6. Push to GitHub
    Write-Step "6. Pushing to GitHub..."
    git push origin main
    Write-Info "Push successful"
    Write-Host ""

    Write-Host "========================================" -ForegroundColor White
    Write-Host "  Upload Complete!" -ForegroundColor White
    Write-Host "========================================" -ForegroundColor White
    Write-Host ""
    Write-Info "View commit history: git log --oneline -5"

} catch {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "  Upload Failed!" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Error: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Possible reasons:" -ForegroundColor Yellow
    Write-Host "1. Network connection issue" -ForegroundColor Yellow
    Write-Host "2. Git authentication failed" -ForegroundColor Yellow
    Write-Host "3. Conflicts need to be resolved" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}
