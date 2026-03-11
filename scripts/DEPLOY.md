# Eyewind Creative Studio - 部署文档
> $=Q{4z69HtX)AZej

## 服务器信息

| 项目 | 值 |
|------|------|
| IP | `106.53.153.117` |
| OS | OpenCloudOS 9.4 |
| 用户 | `root` |
| 项目目录 | `/root/eyewind-creative-studio` |
| 访问地址 | http://106.53.153.117 |

## 架构

```
客户端 → Nginx (:80)
           ├── /             → dist/           前端静态文件 (SPA)
           ├── /api/*        → Express (:3008) 后端 API
           ├── /uploads/*    → Express (:3008) 上传文件
           ├── /ai-gateway/* → ai-gateway.eyewind.com
           ├── /ark-api/*    → ark.cn-beijing.volces.com
           └── /ark-image/*  → ark.cn-beijing.volces.com
```

## 技术栈

- **前端**: React 18 + Vite + Tailwind CSS
- **后端**: Express.js (Node.js v20)
- **数据库**: SQLite (`server/db/nexus.sqlite`)
- **进程管理**: PM2 (开机自启)
- **Web 服务**: Nginx 1.26 (反向代理 + 静态文件)

## 快速更新部署

本地开发完成后，运行部署脚本即可更新服务器：

```bash
# 完整部署（同步代码 + 安装依赖 + 构建 + 重启）
./scripts/deploy.sh

# 仅同步代码（不构建不重启）
./scripts/deploy.sh --code-only

# 仅构建前端并重启
./scripts/deploy.sh --build

# 仅重启后端服务
./scripts/deploy.sh --restart

# 查看服务器状态
./scripts/deploy.sh --status

# 查看后端日志
./scripts/deploy.sh --logs
```

> 注意：脚本使用密码认证，执行时会提示输入 SSH 密码。建议配置 SSH 密钥登录以免输入密码。

## 服务器关键文件

```
/root/eyewind-creative-studio/
├── dist/                    # 前端构建产物（Nginx 直接服务）
├── server/
│   ├── server.js            # Express 后端入口
│   ├── db/
│   │   ├── database.js      # 数据库抽象层
│   │   └── nexus.sqlite     # SQLite 数据库文件（⚠️ 需备份）
│   └── uploads/             # 用户上传文件目录
├── ecosystem.config.cjs     # PM2 配置文件
└── package.json
```

```
/etc/nginx/conf.d/eyewind.conf   # Nginx 站点配置
```

## 服务管理

### PM2 (后端 API)

```bash
pm2 ls                      # 查看进程状态
pm2 logs eyewind-api        # 实时日志
pm2 restart eyewind-api     # 重启
pm2 stop eyewind-api        # 停止
pm2 delete eyewind-api      # 删除进程
pm2 start ecosystem.config.cjs  # 重新创建进程
pm2 save                    # 保存进程列表（开机恢复用）
```

### Nginx

```bash
systemctl status nginx      # 查看状态
systemctl restart nginx     # 重启
systemctl reload nginx      # 重载配置（不断连接）
nginx -t                    # 测试配置语法
```

## 环境变量

在 `ecosystem.config.cjs` 中配置：

```javascript
env: {
    PORT: 3008,                  // 后端端口
    JWT_SECRET: '...',           // JWT 签名密钥
}
```

修改后执行：`pm2 delete eyewind-api && pm2 start ecosystem.config.cjs && pm2 save`

## 数据备份

SQLite 数据库和上传文件是需要备份的关键数据：

```bash
# 备份数据库
cp /root/eyewind-creative-studio/server/db/nexus.sqlite /root/backup/nexus-$(date +%Y%m%d).sqlite

# 备份上传文件
tar czf /root/backup/uploads-$(date +%Y%m%d).tar.gz /root/eyewind-creative-studio/server/uploads/
```

## 首次部署步骤（参考）

如需在新服务器上部署，依次执行：

```bash
# 1. 安装 Node.js 20
cd /tmp
curl -fsSL https://npmmirror.com/mirrors/node/v20.18.0/node-v20.18.0-linux-x64.tar.xz -o node.tar.xz
tar -xf node.tar.xz
cp -r node-v20.18.0-linux-x64/{bin,lib,include,share} /usr/local/

# 2. 安装 Nginx + PM2
dnf install -y nginx
npm install -g pm2

# 3. 配置 npm 国内镜像
npm config set registry https://registry.npmmirror.com

# 4. 上传代码（从本地执行）
./scripts/deploy.sh

# 5. 服务器上安装依赖并构建
cd ~/eyewind-creative-studio
npm install
npm run build

# 6. 启动后端
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup

# 7. 配置 Nginx
# 将 Nginx 配置写入 /etc/nginx/conf.d/eyewind.conf（见本文档架构部分）
nginx -t && systemctl enable nginx && systemctl restart nginx

# 8. 开放权限
chmod 755 /root
```

## 域名与 HTTPS（可选）

绑定域名后，使用 Certbot 启用 HTTPS：

```bash
# 安装 Certbot
dnf install -y certbot python3-certbot-nginx

# 申请证书（替换为你的域名）
certbot --nginx -d your-domain.com

# 自动续期
certbot renew --dry-run
```
