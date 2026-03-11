#!/bin/bash
#
# Eyewind Creative Studio - 服务器部署/更新脚本
# 用法:
#   ./scripts/deploy.sh              # 完整部署（代码+构建+重启）
#   ./scripts/deploy.sh --code-only  # 仅同步代码，不构建不重启
#   ./scripts/deploy.sh --restart    # 仅重启服务
#   ./scripts/deploy.sh --build      # 仅远程构建+重启
#   ./scripts/deploy.sh --status     # 查看服务器状态
#   ./scripts/deploy.sh --logs       # 查看后端日志
#

set -e

# ====== 配置 ======
SERVER_HOST="106.53.153.117"
SERVER_USER="root"
SERVER_DIR="/root/eyewind-creative-studio"
SERVER_PORT="3008"
SSH_OPTS="-o StrictHostKeyChecking=no -o PreferredAuthentications=password -o PubkeyAuthentication=no"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# 颜色输出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

info()  { echo -e "${GREEN}[INFO]${NC} $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# ====== SSH 辅助 ======
remote_exec() {
    ssh $SSH_OPTS "${SERVER_USER}@${SERVER_HOST}" "$1"
}

# ====== 同步代码 ======
sync_code() {
    info "同步代码到服务器 ${SERVER_HOST}:${SERVER_DIR} ..."
    rsync -avz --delete \
        --exclude node_modules \
        --exclude .git \
        --exclude dist \
        --exclude "server/db/*.sqlite" \
        --exclude "server/db/*.db" \
        --exclude "server/db/*.json" \
        --exclude "server/uploads/*" \
        --exclude ".env*" \
        --exclude ".DS_Store" \
        -e "ssh ${SSH_OPTS}" \
        "${PROJECT_DIR}/" \
        "${SERVER_USER}@${SERVER_HOST}:${SERVER_DIR}/"
    info "代码同步完成"
}

# ====== 远程安装依赖 ======
install_deps() {
    info "安装/更新 npm 依赖 ..."
    remote_exec "cd ${SERVER_DIR} && npm install --production=false 2>&1 | tail -5"
    info "依赖安装完成"
}

# ====== 远程构建前端 ======
build_frontend() {
    info "构建前端 ..."
    remote_exec "cd ${SERVER_DIR} && npm run build 2>&1 | tail -10"
    info "前端构建完成"
}

# ====== 重启服务 ======
restart_services() {
    info "重启后端服务 ..."
    remote_exec "cd ${SERVER_DIR} && pm2 restart eyewind-api && sleep 1 && pm2 ls"
    info "服务重启完成"
}

# ====== 查看状态 ======
show_status() {
    info "服务器状态:"
    remote_exec "echo '--- PM2 进程 ---' && pm2 ls && echo '' && echo '--- 系统资源 ---' && free -h && echo '' && df -h / && echo '' && echo '--- Nginx ---' && systemctl status nginx --no-pager -l | head -5"
}

# ====== 查看日志 ======
show_logs() {
    info "后端日志 (最近 50 行):"
    remote_exec "pm2 logs eyewind-api --lines 50 --nostream"
}

# ====== 完整部署 ======
full_deploy() {
    info "========== 开始完整部署 =========="
    sync_code
    install_deps
    build_frontend
    restart_services
    echo ""
    info "========== 部署完成 =========="
    info "访问地址: http://${SERVER_HOST}"
    echo ""
    show_status
}

# ====== 主入口 ======
case "${1:-}" in
    --code-only)
        sync_code
        ;;
    --restart)
        restart_services
        ;;
    --build)
        build_frontend
        restart_services
        ;;
    --status)
        show_status
        ;;
    --logs)
        show_logs
        ;;
    --help|-h)
        echo "用法: $0 [选项]"
        echo ""
        echo "选项:"
        echo "  (无参数)      完整部署: 同步代码 + 安装依赖 + 构建 + 重启"
        echo "  --code-only   仅同步代码到服务器"
        echo "  --build       远程构建前端 + 重启服务"
        echo "  --restart     仅重启后端服务"
        echo "  --status      查看服务器状态"
        echo "  --logs        查看后端日志"
        echo "  --help        显示帮助"
        ;;
    *)
        full_deploy
        ;;
esac
