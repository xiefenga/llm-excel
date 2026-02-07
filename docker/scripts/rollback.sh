#!/bin/bash
# scripts/rollback.sh - 回滚到上一个版本

set -e

# 颜色输出
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

info() { echo -e "${GREEN}[INFO]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }

warn "=========================================="
warn "开始回滚..."
warn "=========================================="

# 1. 回滚数据库迁移
info "步骤 1/3: 回滚数据库迁移..."
docker compose run --rm init-db alembic downgrade -1 || {
    error "数据库回滚失败"
    warn "请手动检查数据库状态"
}

# 2. 恢复配置文件
info "步骤 2/3: 恢复配置文件..."
if [ -f .env.bak ]; then
    mv .env.bak .env
    info "   已恢复 .env 文件"
else
    warn "   未找到 .env.bak 文件"
fi

# 3. 重启应用（使用旧版本）
info "步骤 3/3: 重启应用..."
docker compose up -d api web

info "=========================================="
info "✅ 回滚完成"
info "=========================================="

# 等待应用启动
sleep 5

# 健康检查
if docker compose exec -T api curl -f http://localhost:8000/health &>/dev/null; then
    VERSION_INFO=$(docker compose exec -T api curl -s http://localhost:8000/version 2>/dev/null || echo "{}")
    info "应用已恢复运行"
    echo "$VERSION_INFO" | python3 -m json.tool 2>/dev/null || true
else
    error "应用启动失败，请手动检查"
fi
