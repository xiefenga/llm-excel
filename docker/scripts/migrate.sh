#!/bin/bash
# scripts/migrate.sh - 数据库迁移脚本

set -e

# 颜色输出
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

info() { echo -e "${GREEN}[INFO]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }

NEW_VERSION=$1

if [ -z "$NEW_VERSION" ]; then
    error "使用方法: $0 <版本号>"
    exit 1
fi

info "开始数据库迁移（版本: ${NEW_VERSION}）..."

# 运行迁移容器
docker compose run --rm \
    -e IMAGE_VERSION=$NEW_VERSION \
    --no-deps \
    init-db

info "✅ 数据库迁移完成"
