#!/bin/bash
# init-database.sh - 数据库初始化脚本
# 用途：创建数据库表结构和默认管理员账户

set -e

DB_PATH="./src/admin/backend/data/admin.db"
SCHEMA_FILE="./src/admin/backend/src/schema.sql"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_info "初始化数据库..."

# 创建数据目录
mkdir -p ./src/admin/backend/data

# 检查数据库是否已存在
if [ -f "$DB_PATH" ]; then
    log_info "数据库已存在，跳过初始化"
    exit 0
fi

# 检查 sqlite3 是否已安装
if ! command -v sqlite3 &> /dev/null; then
    log_error "sqlite3 未安装"
    log_info "安装方法: sudo apt-get install sqlite3"
    exit 1
fi

# 创建数据库并执行 schema
log_info "创建数据库表结构..."
sqlite3 "$DB_PATH" < "$SCHEMA_FILE"

log_info "✓ 数据库表结构创建完成"

# 创建默认管理员账户
log_info "创建默认管理员账户..."

# 加载环境变量
if [ -f "./src/admin/backend/.env.production" ]; then
    source ./src/admin/backend/.env.production
fi

USERNAME="${ADMIN_USERNAME:-veblen}"
PASSWORD="${ADMIN_PASSWORD:-123456}"

# 使用 Node.js 创建密码哈希并插入数据库
cd src/admin/backend
node -e "
const bcrypt = require('bcrypt');
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./data/admin.db');

const username = '$USERNAME';
const password = '$PASSWORD';

bcrypt.hash(password, 10, (err, hash) => {
    if (err) {
        console.error('密码哈希失败:', err);
        process.exit(1);
    }
    
    db.run('INSERT INTO admins (username, password_hash) VALUES (?, ?)', 
        [username, hash], 
        (err) => {
            if (err) {
                console.error('创建管理员失败:', err);
                process.exit(1);
            }
            console.log('✓ 默认管理员账户创建完成');
            console.log('用户名:', username);
            console.log('密码:', password);
            console.log('⚠️  请在首次登录后立即修改密码！');
            db.close();
        }
    );
});
" || {
    log_error "创建管理员账户失败"
    cd ../..
    exit 1
}

cd ../..

# 设置数据库文件权限
chmod 644 "$DB_PATH"

log_info "✓ 数据库初始化完成"
