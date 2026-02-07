#!/bin/bash
# scripts/init-data.sh - 初始化默认数据脚本
#
# 使用方法：
#   ./scripts/init-data.sh [--db] [--minio] [--all]
#
# 示例：
#   ./scripts/init-data.sh --all           # 初始化数据库和 MinIO 数据
#   ./scripts/init-data.sh --db            # 只初始化数据库数据
#   ./scripts/init-data.sh --minio         # 只初始化 MinIO 数据

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

# 默认参数
INIT_DB=false
INIT_MINIO=false

# 解析参数
if [ $# -eq 0 ]; then
    error "使用方法: $0 [--db] [--minio] [--all]"
    echo ""
    echo "选项:"
    echo "  --db       初始化数据库默认数据"
    echo "  --minio    初始化 MinIO 默认文件"
    echo "  --all      初始化所有默认数据"
    echo ""
    echo "示例:"
    echo "  $0 --all     # 初始化所有"
    echo "  $0 --db      # 只初始化数据库"
    echo "  $0 --minio   # 只初始化 MinIO"
    exit 1
fi

for arg in "$@"; do
    case $arg in
        --db)
            INIT_DB=true
            ;;
        --minio)
            INIT_MINIO=true
            ;;
        --all)
            INIT_DB=true
            INIT_MINIO=true
            ;;
        *)
            error "未知选项: $arg"
            exit 1
            ;;
    esac
done

echo ""
echo "=========================================="
info "初始化默认数据"
echo "=========================================="
echo ""

# 初始化数据库数据
if [ "$INIT_DB" = true ]; then
    step "初始化数据库默认数据..."

    # 检查是否有数据文件
    if [ ! -d "./db_data" ] || [ -z "$(ls -A ./db_data/*.sql 2>/dev/null)" ]; then
        warn "未找到数据库数据文件 (./db_data/*.sql)"
        warn "跳过数据库数据初始化"
    else
        info "找到数据文件:"
        ls ./db_data/*.sql 2>/dev/null | while read file; do
            info "  - $(basename $file)"
        done

        echo ""
        read -p "是否继续初始化数据库数据? (y/n) " -n 1 -r
        echo ""
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            docker compose run --rm init-db-data || {
                error "数据库数据初始化失败"
                exit 1
            }
            info "✅ 数据库数据初始化完成"
        else
            warn "已跳过数据库数据初始化"
        fi
    fi
    echo ""
fi

# 初始化 MinIO 数据
if [ "$INIT_MINIO" = true ]; then
    step "初始化 MinIO 默认文件..."

    # 检查是否有文件
    if [ ! -d "./minio_data" ] || [ -z "$(find ./minio_data -type f ! -name 'README.md' ! -name '.gitkeep' 2>/dev/null)" ]; then
        warn "未找到 MinIO 数据文件 (./minio_data/)"
        warn "跳过 MinIO 数据初始化"
    else
        info "找到数据文件:"
        find ./minio_data -type f ! -name 'README.md' ! -name '.gitkeep' 2>/dev/null | while read file; do
            info "  - ${file#./minio_data/}"
        done

        echo ""
        read -p "是否继续初始化 MinIO 数据? (y/n) " -n 1 -r
        echo ""
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            docker compose run --rm init-minio || {
                error "MinIO 数据初始化失败"
                exit 1
            }
            info "✅ MinIO 数据初始化完成"
        else
            warn "已跳过 MinIO 数据初始化"
        fi
    fi
    echo ""
fi

echo "=========================================="
info "初始化完成"
echo "=========================================="
