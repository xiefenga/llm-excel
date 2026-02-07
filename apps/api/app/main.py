"""LLM Excel API 服务入口"""

from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, RedirectResponse
from dotenv import load_dotenv

from app.api.main import api_router
from app.schemas.response import ApiResponse
from app.core.database import get_db
from app.core.init_permissions import init_permissions
from app.core.version_check import verify_versions_on_startup

# 导入版本信息
try:
    from app.__version__ import __version__, __build_time__
except ImportError:
    # 如果版本文件不存在（开发环境未生成），使用默认值
    __version__ = "0.0.0-dev"
    __build_time__ = "unknown"

load_dotenv()


OPENAPI_DESCRIPTION = """

🚀 **使用大语言模型智能处理 Excel 数据**

## 功能特性

- 📤 **文件上传**: 支持多文件上传，自动解析 Excel 表结构
- 🤖 **智能处理**: 使用自然语言描述数据处理需求，LLM 自动生成处理逻辑
- 📊 **多种操作**: 支持筛选、排序、分组聚合、新增列、跨表关联等
- 📥 **结果导出**: 处理结果可导出为 Excel 文件

"""

@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期"""
    # 启动时初始化权限系统
    print(f"🚀 Selgetabel API v{__version__} 启动中...")
    print(f"   构建时间: {__build_time__}")

    async for db in get_db():
        try:
            # 版本检查（非严格模式，只打印警告）
            await verify_versions_on_startup(db, strict=False)

            # 权限系统初始化
            await init_permissions(db)
        except Exception as e:
            print(f"❌ 初始化失败: {e}")
        break
    print("✅ 应用初始化完成")

    yield

    # 关闭时清理
    print("👋 应用正在关闭...")


app = FastAPI(
    title="LLM Excel API",
    description=OPENAPI_DESCRIPTION,
    version=__version__,  # 使用动态版本
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def add_version_header(request: Request, call_next):
    """在所有响应中添加版本头"""
    response = await call_next(request)
    response.headers["X-App-Version"] = __version__
    return response


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """统一处理 HTTPException，返回统一格式的响应"""
    return JSONResponse(
        status_code=exc.status_code,
        content=ApiResponse(
            code=exc.status_code,
            data=None,
            msg=exc.detail
        ).model_dump()
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """统一处理其他异常，返回统一格式的响应"""
    return JSONResponse(
        status_code=500,
        content=ApiResponse(
            code=500,
            data=None,
            msg=f"服务器内部错误: {str(exc)}"
        ).model_dump()
    )


@app.get("/", include_in_schema=False)
async def root():
    """根路径重定向到 API 文档"""
    return RedirectResponse(url="/docs")


@app.get("/health", include_in_schema=False)
async def health_check():
    """健康检查端点（用于 Docker 健康检查）"""
    return {
        "status": "ok",
        "version": __version__,
    }


@app.get("/version", include_in_schema=False)
async def get_version():
    """获取应用版本信息"""
    return {
        "app": {
            "name": "Selgetabel",
            "version": __version__,
            "build_time": __build_time__,
        }
    }


app.include_router(api_router)

