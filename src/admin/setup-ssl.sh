#!/bin/bash

# ============================================
# SSL 证书申请和配置脚本
# ============================================
# 
# 功能：
# 1. 申请 Let's Encrypt SSL 证书
# 2. 配置自动续期
# 3. 测试证书配置
#
# 使用方法：
#   chmod +x setup-ssl.sh
#   sudo ./setup-ssl.sh --domain admin.huangyanjie.com --email your@email.com
# ============================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 默认配置
DOMAIN=""
EMAIL=""
WEBROOT="/var/www/certbot"
NGINX_CONFIG="/etc/nginx/sites-available/admin"

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 显示帮助信息
show_help() {
    cat << EOF
SSL 证书申请脚本

使用方法：
  ./setup-ssl.sh --domain DOMAIN --email EMAIL [选项]

必需参数：
  --domain DOMAIN    域名（例如：admin.huangyanjie.com）
  --email EMAIL      邮箱地址（用于证书通知）

可选参数：
  --test             使用测试模式（不会真正申请证书）
  --force            强制重新申请证书
  --help             显示此帮助信息

示例：
  ./setup-ssl.sh --domain admin.example.com --email admin@example.com
  ./setup-ssl.sh --domain admin.example.com --email admin@example.com --test

EOF
}

# 检查是否为 root 用户
check_root() {
    if [ "$EUID" -ne 0 ]; then
        log_error "请使用 sudo 运行此脚本"
        exit 1
    fi
}

# 检查依赖
check_dependencies() {
    log_info "检查依赖..."
    
    if ! command -v certbot &> /dev/null; then
        log_error "certbot 未安装"
        log_info "请运行: sudo apt install certbot python3-certbot-nginx"
        exit 1
    fi
    
    if ! command -v nginx &> /dev/null; then
        log_error "nginx 未安装"
        exit 1
    fi
    
    log_success "依赖检查通过"
}

# 检查域名解析
check_dns() {
    log_info "检查域名解析..."
    
    local server_ip=$(curl -s ifconfig.me)
    local domain_ip=$(dig +short "$DOMAIN" | tail -n1)
    
    if [ -z "$domain_ip" ]; then
        log_error "域名 $DOMAIN 无法解析"
        log_info "请先配置域名 A 记录指向服务器 IP: $server_ip"
        exit 1
    fi
    
    if [ "$server_ip" != "$domain_ip" ]; then
        log_warning "域名解析 IP ($domain_ip) 与服务器 IP ($server_ip) 不匹配"
        log_warning "这可能导致证书申请失败"
        read -p "是否继续？(y/N) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    else
        log_success "域名解析正确"
    fi
}

# 创建临时 HTTP 配置
create_temp_nginx_config() {
    log_info "创建临时 Nginx 配置..."
    
    cat > /etc/nginx/sites-available/admin-temp << EOF
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN;

    # Let's Encrypt 验证路径
    location /.well-known/acme-challenge/ {
        root $WEBROOT;
    }

    # 临时允许访问
    location / {
        return 200 'OK';
        add_header Content-Type text/plain;
    }
}
EOF
    
    # 禁用现有配置
    if [ -L /etc/nginx/sites-enabled/admin ]; then
        rm /etc/nginx/sites-enabled/admin
    fi
    
    # 启用临时配置
    ln -sf /etc/nginx/sites-available/admin-temp /etc/nginx/sites-enabled/admin-temp
    
    # 测试配置
    if nginx -t; then
        systemctl reload nginx
        log_success "临时配置已启用"
    else
        log_error "Nginx 配置测试失败"
        exit 1
    fi
}

# 申请证书
request_certificate() {
    log_info "申请 SSL 证书..."
    
    # 创建 webroot 目录
    mkdir -p "$WEBROOT"
    
    local certbot_args=(
        "certonly"
        "--webroot"
        "-w" "$WEBROOT"
        "-d" "$DOMAIN"
        "--email" "$EMAIL"
        "--agree-tos"
        "--no-eff-email"
    )
    
    # 测试模式
    if [ "$TEST_MODE" = true ]; then
        certbot_args+=("--dry-run")
        log_warning "测试模式：不会真正申请证书"
    fi
    
    # 强制模式
    if [ "$FORCE_MODE" = true ]; then
        certbot_args+=("--force-renewal")
    fi
    
    # 执行申请
    if certbot "${certbot_args[@]}"; then
        log_success "证书申请成功"
    else
        log_error "证书申请失败"
        exit 1
    fi
}

# 恢复正式配置
restore_nginx_config() {
    log_info "恢复正式 Nginx 配置..."
    
    # 删除临时配置
    rm -f /etc/nginx/sites-enabled/admin-temp
    rm -f /etc/nginx/sites-available/admin-temp
    
    # 启用正式配置
    if [ -f "$NGINX_CONFIG" ]; then
        ln -sf "$NGINX_CONFIG" /etc/nginx/sites-enabled/admin
        
        # 测试配置
        if nginx -t; then
            systemctl reload nginx
            log_success "正式配置已启用"
        else
            log_error "Nginx 配置测试失败"
            exit 1
        fi
    else
        log_error "正式配置文件不存在: $NGINX_CONFIG"
        log_info "请先运行部署脚本创建配置文件"
        exit 1
    fi
}

# 配置自动续期
setup_auto_renewal() {
    log_info "配置证书自动续期..."
    
    # 测试续期
    if certbot renew --dry-run; then
        log_success "自动续期配置成功"
    else
        log_error "自动续期测试失败"
        exit 1
    fi
    
    # 添加续期后钩子（重载 Nginx）
    local renewal_hook="/etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh"
    mkdir -p "$(dirname "$renewal_hook")"
    
    cat > "$renewal_hook" << 'EOF'
#!/bin/bash
systemctl reload nginx
EOF
    
    chmod +x "$renewal_hook"
    
    log_info "证书将在到期前自动续期"
    log_info "Certbot 会每天检查两次证书状态"
}

# 测试 SSL 配置
test_ssl() {
    log_info "测试 SSL 配置..."
    
    # 等待 Nginx 重载
    sleep 2
    
    # 测试 HTTPS 连接
    if curl -sSf "https://$DOMAIN/health" > /dev/null 2>&1; then
        log_success "HTTPS 连接测试通过"
    else
        log_warning "HTTPS 连接测试失败，请手动检查"
    fi
    
    # 显示证书信息
    log_info "证书信息："
    certbot certificates -d "$DOMAIN"
}

# 显示完成信息
show_completion_info() {
    cat << EOF

${GREEN}============================================
SSL 证书配置完成！
============================================${NC}

${BLUE}证书信息：${NC}
  域名：$DOMAIN
  证书路径：/etc/letsencrypt/live/$DOMAIN/
  有效期：90 天
  自动续期：已启用

${BLUE}访问地址：${NC}
  https://$DOMAIN

${BLUE}证书管理命令：${NC}
  查看证书：sudo certbot certificates
  手动续期：sudo certbot renew
  测试续期：sudo certbot renew --dry-run
  撤销证书：sudo certbot revoke --cert-path /etc/letsencrypt/live/$DOMAIN/cert.pem

${YELLOW}注意事项：${NC}
  1. 证书有效期为 90 天
  2. Certbot 会自动续期（每天检查两次）
  3. 续期后会自动重载 Nginx
  4. 建议定期检查证书状态

${BLUE}测试 SSL 配置：${NC}
  在线测试：https://www.ssllabs.com/ssltest/analyze.html?d=$DOMAIN
  命令行测试：curl -vI https://$DOMAIN

EOF
}

# 主函数
main() {
    local TEST_MODE=false
    local FORCE_MODE=false
    
    # 解析参数
    while [[ $# -gt 0 ]]; do
        case $1 in
            --domain)
                DOMAIN="$2"
                shift 2
                ;;
            --email)
                EMAIL="$2"
                shift 2
                ;;
            --test)
                TEST_MODE=true
                shift
                ;;
            --force)
                FORCE_MODE=true
                shift
                ;;
            --help)
                show_help
                exit 0
                ;;
            *)
                log_error "未知选项: $1"
                show_help
                exit 1
                ;;
        esac
    done
    
    # 检查必需参数
    if [ -z "$DOMAIN" ] || [ -z "$EMAIL" ]; then
        log_error "缺少必需参数"
        show_help
        exit 1
    fi
    
    log_info "开始配置 SSL 证书..."
    log_info "域名: $DOMAIN"
    log_info "邮箱: $EMAIL"
    
    # 检查权限
    check_root
    
    # 检查依赖
    check_dependencies
    
    # 检查域名解析
    check_dns
    
    # 创建临时配置
    create_temp_nginx_config
    
    # 申请证书
    request_certificate
    
    # 如果不是测试模式，恢复正式配置
    if [ "$TEST_MODE" = false ]; then
        restore_nginx_config
        setup_auto_renewal
        test_ssl
        show_completion_info
    else
        log_success "测试模式完成"
        log_info "如果测试通过，请去掉 --test 参数重新运行"
    fi
}

# 执行主函数
main "$@"
