#!/bin/bash
# scripts/upgrade.sh - 版本升级主脚本
#
# 使用方法：
#   ./scripts/upgrade.sh <版本号>
#
# 示例：
#   ./scripts/upgrade.sh 0.2.0

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

info() { echo -e "${GREEN}[INFO]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }
step() { echo -e "${BLUE}[STEP]${NC} $1"; }

# 检查参数
NEW_VERSION=$1

if [ -z "$NEW_VERSION" ]; then
    error "使用方法: $0 <版本号>"
    echo ""
    echo "示例:"
    echo "  $0 0.2.0"
    echo "  $0 1.0.0"
    exit 1
fi

# 确认升级
echo ""
echo "=========================================="
info "准备升级到版本: ${NEW_VERSION}"
echo "=========================================="
echo ""

read -p "是否继续? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    warn "升级已取消"
    exit 0
fi

echo ""

# 步骤 1: 备份数据库
step "步骤 1/7: 备份数据库..."
if [ -f "./scripts/backup.sh" ]; then
    bash ./scripts/backup.sh || {
        error "备份失败，升级终止"
        exit 1
    }
else
    warn "未找到备份脚本，跳过备份"
fi

# 步骤 2: 拉取新镜像
step "步骤 2/7: 拉取新镜像..."
export IMAGE_VERSION=$NEW_VERSION
docker compose pull || {
    error "镜像拉取失败"
    exit 1
}

# 步骤 3: 执行数据库迁移
step "步骤 3/7: 执行数据库迁移..."
if [ -f "./scripts/migrate.sh" ]; then
    bash ./scripts/migrate.sh $NEW_VERSION || {
        error "数据库迁移失败，开始回滚..."
        bash ./scripts/rollback.sh
        exit 1
    }
else
    # 直接运行迁移容器
    docker compose run --rm \
        -e IMAGE_VERSION=$NEW_VERSION \
        init-db || {
        error "数据库迁移失败，开始回滚..."
        bash ./scripts/rollback.sh
        exit 1
    }
fi

# 步骤 4: 验证迁移
step "步骤 4/7: 验证迁移结果..."
if [ -f "./scripts/verify.sh" ]; then
    bash ./scripts/verify.sh || {
        error "迁移验证失败，开始回滚..."
        bash ./scripts/rollback.sh
        exit 1
    }
else
    warn "未找到验证脚本，跳过验证"
fi

# 步骤 5: 更新配置文件
step "步骤 5/7: 更新配置文件..."
if [ -f ".env" ]; then
    # 备份当前配置
    cp .env .env.bak

    # 更新版本号
    if grep -q "IMAGE_VERSION=" .env; then
        sed -i.tmp "s/IMAGE_VERSION=.*/IMAGE_VERSION=${NEW_VERSION}/" .env
        rm -f .env.tmp
        info "   已更新 .env: IMAGE_VERSION=${NEW_VERSION}"
    else
        echo "IMAGE_VERSION=${NEW_VERSION}" >> .env
        info "   已添加 .env: IMAGE_VERSION=${NEW_VERSION}"
    fi
else
    warn "未找到 .env 文件"
fi

# 步骤 6: 重启应用
step "步骤 6/7: 重启应用..."
docker compose up -d

info "提示: 如果此版本包含新的默认数据，请手动运行："
info "  ./scripts/init-data.sh --all"

# 步骤 7: 健康检查
step "步骤 7/7: 健康检查..."
info "等待应用启动..."
sleep 10

MAX_RETRIES=30
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if docker compose exec -T api curl -f http://localhost:8000/health &>/dev/null; then
        # 获取版本信息
        VERSION_INFO=$(docker compose exec -T api curl -s http://localhost:8000/version 2>/dev/null || echo "{}")

        echo ""
        echo "=========================================="
        info "✅ 升级成功！"
        echo "=========================================="
        echo "版本信息:"
        echo "$VERSION_INFO" | python3 -m json.tool 2>/dev/null || echo "  版本: ${NEW_VERSION}"
        echo "=========================================="
        echo ""

        # 清理备份
        rm -f .env.bak

        exit 0
    fi

    RETRY_COUNT=$((RETRY_COUNT + 1))
    sleep 2
done

# 健康检查失败
error "应用启动失败（健康检查超时）"
error "开始回滚..."

if [ -f "./scripts/rollback.sh" ]; then
    bash ./scripts/rollback.sh
else
    warn "未找到回滚脚本，请手动回滚"
fi

exit 1
