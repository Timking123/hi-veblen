# 域名配置指南

## 概述

本指南说明如何配置域名 DNS 解析，使你的网站可以通过域名访问。

## 前提条件

- 已购买域名（本例使用 hi-veblen.com）
- 已获取阿里云服务器公网 IP 地址

## 阿里云域名 DNS 配置

### 步骤 1: 登录阿里云控制台

1. 访问 https://dns.console.aliyun.com
2. 登录你的阿里云账号

### 步骤 2: 选择域名

1. 在域名列表中找到你的域名（hi-veblen.com）
2. 点击"解析设置"

### 步骤 3: 添加 A 记录

#### 配置主域名

点击"添加记录"，填写以下信息：

```
记录类型: A
主机记录: @
解析线路: 默认
记录值: <你的服务器公网IP>
TTL: 600（10分钟）
```

说明：
- `@` 表示主域名（hi-veblen.com）
- 记录值填写你的阿里云 ECS 服务器公网 IP
- TTL 600 表示 DNS 缓存时间为 10 分钟

#### 配置 www 子域名（可选）

如果需要支持 www.hi-veblen.com，再添加一条记录：

```
记录类型: A
主机记录: www
解析线路: 默认
记录值: <你的服务器公网IP>
TTL: 600
```

### 步骤 4: 保存配置

点击"确认"保存配置。

## 验证 DNS 解析

### 方法 1: 使用验证脚本

```bash
bash scripts/verify-domain.sh hi-veblen.com <你的服务器IP>
```

### 方法 2: 使用 dig 命令

```bash
dig hi-veblen.com

# 输出示例：
# hi-veblen.com.  600  IN  A  <你的服务器IP>
```

### 方法 3: 使用 ping 命令

```bash
ping hi-veblen.com

# 输出示例：
# PING hi-veblen.com (<你的服务器IP>) 56(84) bytes of data.
```

### 方法 4: 在线工具

访问 https://tool.chinaz.com/dns 输入域名查询。

## DNS 解析生效时间

- **TTL 时间**: 通常 5-10 分钟
- **全球生效**: 可能需要 24-48 小时
- **加速方法**: 清除本地 DNS 缓存

### 清除本地 DNS 缓存

**Windows**:
```cmd
ipconfig /flushdns
```

**macOS**:
```bash
sudo dscacheutil -flushcache
sudo killall -HUP mDNSResponder
```

**Linux**:
```bash
sudo systemd-resolve --flush-caches
```

## 常见问题

### Q1: DNS 解析不生效？

**可能原因**：
1. DNS 缓存未清除
2. 配置错误（检查记录值是否正确）
3. 域名未实名认证（阿里云要求）

**解决方法**：
1. 清除本地 DNS 缓存
2. 检查阿里云控制台配置
3. 完成域名实名认证

### Q2: 部分地区无法访问？

**可能原因**：
1. DNS 解析未全球生效
2. 服务器防火墙限制

**解决方法**：
1. 等待 24-48 小时
2. 检查服务器安全组规则

### Q3: HTTPS 无法访问？

**可能原因**：
1. SSL 证书未申请
2. Nginx 配置错误
3. 端口 443 未开放

**解决方法**：
1. 执行 `bash scripts/setup-ssl.sh` 申请证书
2. 检查 nginx.conf 配置
3. 开放端口 443：`sudo ufw allow 443/tcp`

## 其他域名服务商配置

### 腾讯云 DNSPod

1. 登录 https://console.dnspod.cn
2. 选择域名 -> 添加记录
3. 配置同上（记录类型 A，主机记录 @，记录值为服务器 IP）

### Cloudflare

1. 登录 https://dash.cloudflare.com
2. 选择域名 -> DNS -> Add record
3. Type: A, Name: @, IPv4 address: <服务器IP>
4. 注意：Cloudflare 默认开启代理，可能影响 SSL 证书申请

### GoDaddy

1. 登录 https://dcc.godaddy.com
2. 选择域名 -> DNS -> Add
3. Type: A, Host: @, Points to: <服务器IP>

## 下一步

配置完成后：

1. 等待 DNS 解析生效（5-10 分钟）
2. 验证域名解析：`bash scripts/verify-domain.sh hi-veblen.com <服务器IP>`
3. 申请 SSL 证书：`bash scripts/setup-ssl.sh`
4. 执行部署：`bash scripts/deploy.sh`
5. 访问网站：https://hi-veblen.com

## 参考资料

- [阿里云 DNS 文档](https://help.aliyun.com/product/29697.html)
- [Let's Encrypt 文档](https://letsencrypt.org/docs/)
- [DNS 记录类型说明](https://www.cloudflare.com/learning/dns/dns-records/)
