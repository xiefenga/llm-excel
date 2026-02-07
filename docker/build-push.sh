#!/bin/bash
set -e

# 镜像构建和推送脚本
# 使用方法：
#   cd docker && ./build-push.sh [docker-hub-username] [version]
# 示例：
#   cd docker && ./build-push.sh                         # 使用默认用户名和 package.json 版本
#   cd docker && ./build-push.sh 0x1461a0                # 指定用户名，自动读取版本
#   cd docker && ./build-push.sh 0x1461a0 1.0.0          # 指定用户名和版本
#   cd docker && ./build-push.sh 0x1461a0 latest         # 使用 latest 标签

# 默认 Docker Hub 用户名
DEFAULT_DOCKER_USERNAME="0x1461a0"

# 检查参数
if [ $# -gt 2 ]; then
    echo "使用方法: $0 [docker-hub-username] [version]"
    echo "示例:"
    echo "  $0                           # 使用默认用户名 (${DEFAULT_DOCKER_USERNAME}) 和 package.json 版本"
    echo "  $0 0x1461a0                  # 指定用户名，自动使用 package.json 版本"
    echo "  $0 0x1461a0 1.0.0            # 指定用户名和版本"
    echo "  $0 0x1461a0 latest           # 使用 latest 标签"
    exit 1
fi

# 解析参数
if [ $# -eq 0 ]; then
    DOCKER_USERNAME=$DEFAULT_DOCKER_USERNAME
elif [ $# -eq 1 ]; then
    DOCKER_USERNAME=$1
else
    DOCKER_USERNAME=$1
    VERSION=$2
fi

# 项目根目录（脚本在 docker/ 目录下）
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# 如果没有提供版本参数，从 package.json 读取
if [ -z "$VERSION" ]; then
    # 从 package.json 读取版本
    if [ -f "$PROJECT_ROOT/package.json" ]; then
        VERSION=$(grep -o '"version": *"[^"]*"' "$PROJECT_ROOT/package.json" | sed 's/"version": *"\(.*\)"/\1/')
        if [ -z "$VERSION" ]; then
            echo "❌ 错误：无法从 package.json 读取版本号"
            exit 1
        fi
        echo "✓ 从 package.json 读取到版本: v${VERSION}"
    else
        echo "❌ 错误：找不到 package.json 文件"
        exit 1
    fi
fi

# 镜像名称
API_IMAGE="${DOCKER_USERNAME}/selgetabel-api"
WEB_IMAGE="${DOCKER_USERNAME}/selgetabel-web"

echo "=========================================="
echo "构建并推送镜像"
echo "=========================================="
echo "项目根目录: ${PROJECT_ROOT}"
echo "Docker Hub 用户名: ${DOCKER_USERNAME}"
echo "版本标签: v${VERSION}"
echo "API 镜像: ${API_IMAGE}:${VERSION}"
echo "Web 镜像: ${WEB_IMAGE}:${VERSION}"
echo "=========================================="
echo ""

# 检查是否已登录 Docker Hub
echo "检查 Docker Hub 登录状态..."
if ! docker info 2>/dev/null | grep -q "Username"; then
    echo "请先登录 Docker Hub:"
    docker login
fi

echo ""
echo "1/4 构建 API 镜像..."
docker build -f "${PROJECT_ROOT}/apps/api/Dockerfile" -t ${API_IMAGE}:${VERSION} "${PROJECT_ROOT}"

echo ""
echo "2/4 构建 Web 镜像..."
docker build -f "${PROJECT_ROOT}/apps/web/Dockerfile" -t ${WEB_IMAGE}:${VERSION} "${PROJECT_ROOT}"

echo ""
echo "3/4 推送 API 镜像..."
docker push ${API_IMAGE}:${VERSION}

echo ""
echo "4/4 推送 Web 镜像..."
docker push ${WEB_IMAGE}:${VERSION}

# 如果版本不是 latest，询问是否也推送 latest 标签
if [ "${VERSION}" != "latest" ]; then
    echo ""
    read -p "是否也推送 latest 标签? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "标记并推送 latest 标签..."
        docker tag ${API_IMAGE}:${VERSION} ${API_IMAGE}:latest
        docker tag ${WEB_IMAGE}:${VERSION} ${WEB_IMAGE}:latest
        docker push ${API_IMAGE}:latest
        docker push ${WEB_IMAGE}:latest
    fi
fi

echo ""
echo "=========================================="
echo "✅ 镜像构建和推送完成！"
echo "=========================================="
echo "API 镜像: ${API_IMAGE}:${VERSION}"
echo "Web 镜像: ${WEB_IMAGE}:${VERSION}"
echo ""
echo "生产部署命令:"
echo "  cd docker"
echo "  # 编辑 .env 文件设置版本："
echo "  # IMAGE_VERSION=${VERSION}"
echo "  docker compose up -d"
echo ""
echo "或直接使用环境变量："
echo "  export IMAGE_VERSION=${VERSION}"
echo "  docker compose up -d"
echo "=========================================="
