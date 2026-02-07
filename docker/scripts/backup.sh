#!/bin/bash
# scripts/backup.sh - 数据库备份脚本

set -e

# 颜色输出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

info() { echo -e "${GREEN}[INFO]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }

# 备份目录
BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/backup_${TIMESTAMP}.sql"

# 创建备份目录
mkdir -p $BACKUP_DIR

info "开始备份数据库..."
info "   备份文件: ${BACKUP_FILE}"

# 读取数据库配置
source .env 2>/dev/null || true
POSTGRES_USER=${POSTGRES_USER:-llmexcel}
POSTGRES_DB=${POSTGRES_DB:-llmexcel}

# 执行备份
docker compose exec -T postgres pg_dump \
    -U ${POSTGRES_USER} \
    ${POSTGRES_DB} \
    > $BACKUP_FILE

# 压缩备份
gzip $BACKUP_FILE

info "✅ 备份完成: ${BACKUP_FILE}.gz"

# 清理旧备份（保留最近 10 个）
OLD_BACKUPS=$(ls -t ${BACKUP_DIR}/backup_*.sql.gz 2>/dev/null | tail -n +11)
if [ -n "$OLD_BACKUPS" ]; then
    echo "$OLD_BACKUPS" | xargs rm -f
    info "   清理旧备份: $(echo "$OLD_BACKUPS" | wc -l) 个文件"
fi

# 显示备份列表
info "当前备份列表:"
ls -lh ${BACKUP_DIR}/backup_*.sql.gz 2>/dev/null | tail -5 | awk '{print "   " $9 " (" $5 ")"}'
