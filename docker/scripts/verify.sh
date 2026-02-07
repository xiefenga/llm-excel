#!/bin/bash
# scripts/verify.sh - 验证迁移结果和版本一致性

set -e

# 颜色输出
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

info() { echo -e "${GREEN}[INFO]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }

info "验证数据库版本一致性..."

# 1. 检查数据库当前版本
info "检查数据库版本..."
DB_VERSION=$(docker compose run --rm init-db alembic current 2>/dev/null | grep -oP '[a-f0-9]{12}' | head -1)

if [ -z "$DB_VERSION" ]; then
    error "无法获取数据库版本！"
    error "请确保数据库已初始化"
    exit 1
fi

info "   数据库版本: ${DB_VERSION}"

# 2. 检查代码迁移版本
info "检查代码迁移版本..."
CODE_VERSION=$(docker compose run --rm init-db alembic heads 2>/dev/null | grep -oP '[a-f0-9]{12}' | head -1)

if [ -z "$CODE_VERSION" ]; then
    error "无法获取代码迁移版本！"
    exit 1
fi

info "   代码版本: ${CODE_VERSION}"

# 3. 比较版本
if [ "$DB_VERSION" != "$CODE_VERSION" ]; then
    error "版本不匹配！"
    error "  数据库版本: ${DB_VERSION}"
    error "  代码版本: ${CODE_VERSION}"
    exit 1
fi

# 4. 检查应用版本
info "检查应用版本..."
APP_VERSION=$(docker compose run --rm api python -c "
try:
    from app.__version__ import __version__
    print(__version__)
except:
    print('unknown')
" 2>/dev/null)

if [ -n "$APP_VERSION" ] && [ "$APP_VERSION" != "unknown" ]; then
    info "   应用版本: ${APP_VERSION}"
fi

info "=========================================="
info "✅ 版本验证通过"
info "=========================================="
