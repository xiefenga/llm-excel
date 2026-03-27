import logging
from typing import List, Optional
from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from app.schemas.response import ApiResponse
from app.api.deps import get_current_user, check_permission, has_permission
from app.core.database import get_db
from app.core.permissions import Permissions
from app.models.user import User
from app.models.thread import Thread, ThreadTurn

router = APIRouter(prefix="/threads", tags=["threads"])
logger = logging.getLogger(__name__)

# ========== 线程管理 API ==========
class ThreadUser(BaseModel):
    id: str
    username: str
    avatar: Optional[str] = None

class ThreadListItem(BaseModel):
    """线程列表项"""
    id: str
    title: Optional[str]
    status: str
    health_status: str = Field(default="normal", description="健康状态: normal(正常)/error(异常)")
    created_at: datetime
    updated_at: datetime
    turn_count: int = Field(default=0, description="消息数量")
    user: Optional[ThreadUser] = None


class ThreadDetail(BaseModel):
    """线程详情"""
    id: str
    title: Optional[str]
    status: str
    created_at: datetime
    updated_at: datetime
    turns: List[dict] = Field(default_factory=list, description="消息列表")


class ThreadListResponse(BaseModel):
    """线程列表响应（分页）"""
    items: List[ThreadListItem]
    total: int
    limit: int
    offset: int


@router.get("", response_model=ApiResponse[ThreadListResponse], summary="获取线程列表", description="获取线程列表（根据权限决定范围），支持按用户ID和健康状态过滤")
async def get_threads(
    user_id: Optional[str] = Query(None, description="按用户ID过滤"),
    health_status: Optional[str] = Query(None, description="健康状态过滤：normal/error"),
    limit: int = Query(20, ge=1, le=100, description="每页数量，1-100"),
    offset: int = Query(0, ge=0, description="偏移量，从0开始"),
    current_user: User = Depends(check_permission(Permissions.THREAD_READ)),
    db: AsyncSession = Depends(get_db)
):
    """
    获取线程列表

    权限要求：
    - thread:read: 查看自己的线程
    - thread:read:all: 查看所有用户的线程

    参数说明：
    - user_id: 如果提供此参数，需要 thread:read:all 权限来查看指定用户的线程
    - health_status: 健康状态过滤，normal 或 error，不提供则返回所有状态
    """
    try:
        logger.debug(
            "获取线程列表请求，用户ID: %s, 请求用户ID: %s, health_status: %s, limit: %d, offset: %d",
            current_user.id, user_id, health_status, limit, offset
        )

        # 检查用户是否有查看所有线程的权限
        can_view_all = await has_permission(
            current_user,
            db,
            Permissions.THREAD_READ_ALL
        )

        # 如果提供了 user_id 参数但没有查看所有线程的权限，返回权限错误
        if user_id and not can_view_all:
            logger.warning(
                "权限不足：用户 %s 尝试查看用户 %s 的线程，但缺少 thread:read:all 权限",
                current_user.id, user_id
            )
            return ApiResponse(
                code=403,
                data=None,
                msg="权限不足：需要 thread:read:all 权限才能查看其他用户的线程"
            )

        # ========== 构建基础过滤条件（用于 COUNT 和 Items 查询）==========

        # 状态过滤：普通用户只能看到活跃线程，管理员可以看到所有状态
        if not can_view_all:
            base_conditions = [Thread.status == "active"]
        else:
            base_conditions = []

        # 用户过滤
        if user_id:
            try:
                user_uuid = UUID(user_id)
                base_conditions.append(Thread.user_id == user_uuid)
            except ValueError:
                logger.warning("无效的用户ID格式: %s", user_id)
                return ApiResponse(
                    code=400,
                    data=None,
                    msg="无效的用户ID格式"
                )
        elif not can_view_all:
            base_conditions.append(Thread.user_id == current_user.id)

        # 健康状态过滤
        if health_status:
            base_conditions.append(Thread.health_status == health_status)

        # ========== 1. 查询总数 ==========
        count_stmt = select(func.count(Thread.id)).where(*base_conditions)
        count_result = await db.execute(count_stmt)
        total = count_result.scalar() or 0

        # ========== 2. 查询列表项（带 turn_count）==========
        # 用子查询获取每个线程的消息数量，避免 GROUP BY 干扰 COUNT
        turn_count_subq = (
            select(ThreadTurn.thread_id, func.count(ThreadTurn.id).label("turn_count"))
            .group_by(ThreadTurn.thread_id)
            .subquery()
        )

        items_stmt = (
            select(Thread, User, turn_count_subq.c.turn_count)
            .outerjoin(turn_count_subq, Thread.id == turn_count_subq.c.thread_id)
            .join(User, Thread.user_id == User.id)
            .where(*base_conditions)
            .order_by(Thread.updated_at.desc())
            .limit(limit)
            .offset(offset)
        )

        items_result = await db.execute(items_stmt)
        rows = items_result.all()

        threads = []
        for thread, user, turn_count in rows:
            threads.append(ThreadListItem(
                id=str(thread.id),
                title=thread.title,
                status=thread.status,
                health_status=thread.health_status,
                created_at=thread.created_at,
                updated_at=thread.updated_at,
                turn_count=turn_count or 0,
                user=ThreadUser(
                    id=str(user.id),
                    username=user.username,
                    avatar=user.avatar
                ) if user else None
            ))

        return ApiResponse(
            code=0,
            data=ThreadListResponse(
                items=threads,
                total=total,
                limit=limit,
                offset=offset,
            ),
            msg="获取成功"
        )
    except Exception as e:
        logger.error("获取线程列表失败: %s", str(e), exc_info=True)
        return ApiResponse(
            code=500,
            data=None,
            msg=f"获取失败: {str(e)}"
        )


@router.get("/{thread_id}", response_model=ApiResponse[ThreadDetail], summary="获取线程详情", description="获取指定线程的详细信息，包含所有消息")
async def get_thread_detail(thread_id: str, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """获取线程详情"""
    try:
        # 转换 thread_id 为 UUID
        try:
            thread_id_uuid = UUID(thread_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="无效的 thread_id 格式")

        # 查询线程
        stmt = select(Thread).where(Thread.id == thread_id_uuid).where(Thread.user_id == current_user.id)
        result = await db.execute(stmt)
        thread = result.scalar_one_or_none()

        if not thread:
            raise HTTPException(status_code=404, detail="线程不存在或无权访问")

        # 查询消息列表，预加载关联的文件
        turns_stmt = (
            select(ThreadTurn)
            .options(selectinload(ThreadTurn.files))
            .where(ThreadTurn.thread_id == thread_id_uuid)
            .order_by(ThreadTurn.turn_number.asc())
        )
        turns_result = await db.execute(turns_stmt)
        turns = turns_result.scalars().all()

        # 构建消息列表
        turns_data = []
        for turn in turns:
            # 从 steps 中提取各步骤的最终状态
            steps = turn.steps or []
            latest_steps = {}
            for step in steps:
                latest_steps[step.get("step")] = step

            turn_data = {
                "id": str(turn.id),
                "turn_number": turn.turn_number,
                "user_query": turn.user_query,
                "status": turn.status,
                "intent_type": turn.intent_type,
                "response_text": turn.response_text,
                "steps": steps,  # 返回完整的步骤数组，便于前端渲染
                "created_at": turn.created_at.isoformat(),
                "completed_at": turn.completed_at.isoformat() if turn.completed_at else None,
            }

            # 获取关联的文件
            if turn.files:
                files_data = []
                for f in turn.files:
                    # 构造可访问的文件 URL（与静态目录挂载保持一致）
                    file_url = "/" + f.file_path.lstrip("/")
                    files_data.append({
                        "id": str(f.id),
                        "filename": f.filename,
                        "path": file_url,
                        "size": f.file_size,
                        "mime_type": f.mime_type,
                        "uploaded_at": f.uploaded_at.isoformat(),
                    })

                turn_data["files"] = files_data

            turns_data.append(turn_data)

        return ApiResponse(
            code=0,
            data=ThreadDetail(
                id=str(thread.id),
                title=thread.title,
                status=thread.status,
                created_at=thread.created_at,
                updated_at=thread.updated_at,
                turns=turns_data,
            ),
            msg="获取成功"
        )
    except HTTPException:
        raise
    except Exception as e:
        return ApiResponse(
            code=500,
            data=None,
            msg=f"获取失败: {str(e)}"
        )


class ThreadUpdateRequest(BaseModel):
    """线程更新请求"""
    title: Optional[str] = Field(None, description="线程标题")


@router.patch("/{thread_id}", response_model=ApiResponse[None], summary="更新线程", description="更新指定线程的信息")
async def update_thread(thread_id: str, request: ThreadUpdateRequest, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """更新线程（如重命名）"""
    try:
        # 转换 thread_id 为 UUID
        try:
            thread_id_uuid = UUID(thread_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="无效的 thread_id 格式")

        # 查询线程
        stmt = select(Thread).where(Thread.id == thread_id_uuid).where(Thread.user_id == current_user.id)
        result = await db.execute(stmt)
        thread = result.scalar_one_or_none()

        if not thread:
            raise HTTPException(status_code=404, detail="线程不存在或无权访问")

        # 更新字段
        if request.title is not None:
            thread.title = request.title

        await db.commit()

        return ApiResponse(
            code=0,
            data=None,
            msg="更新成功"
        )
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        return ApiResponse(
            code=500,
            data=None,
            msg=f"更新失败: {str(e)}"
        )


@router.delete("/{thread_id}", response_model=ApiResponse[None], summary="删除线程", description="删除指定的线程")
async def delete_thread(thread_id: str, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """删除线程"""
    try:
        # 转换 thread_id 为 UUID
        try:
            thread_id_uuid = UUID(thread_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="无效的 thread_id 格式")

        # 查询线程
        stmt = select(Thread).where(Thread.id == thread_id_uuid).where(Thread.user_id == current_user.id)
        result = await db.execute(stmt)
        thread = result.scalar_one_or_none()

        if not thread:
            raise HTTPException(status_code=404, detail="线程不存在或无权访问")

        # 软删除：更新状态
        thread.status = "deleted"
        await db.commit()

        return ApiResponse(
            code=0,
            data=None,
            msg="删除成功"
        )
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        return ApiResponse(
            code=500,
            data=None,
            msg=f"删除失败: {str(e)}"
        )


@router.get("/admin/{thread_id}", response_model=ApiResponse[ThreadDetail], summary="管理员获取线程详情", description="管理员查看任意线程的详细信息（需要 thread:read:all 权限）")
async def get_thread_detail_admin(
    thread_id: str,
    current_user: User = Depends(check_permission(Permissions.THREAD_READ_ALL)),
    db: AsyncSession = Depends(get_db)
):
    """管理员获取线程详情"""
    try:
        # 转换 thread_id 为 UUID
        try:
            thread_id_uuid = UUID(thread_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="无效的 thread_id 格式")

        # 查询线程，不需要用户ID限制
        stmt = select(Thread).where(Thread.id == thread_id_uuid)
        result = await db.execute(stmt)
        thread = result.scalar_one_or_none()

        if not thread:
            raise HTTPException(status_code=404, detail="线程不存在")

        # 查询消息列表，预加载关联的文件
        turns_stmt = (
            select(ThreadTurn)
            .options(selectinload(ThreadTurn.files))
            .where(ThreadTurn.thread_id == thread_id_uuid)
            .order_by(ThreadTurn.turn_number.asc())
        )
        turns_result = await db.execute(turns_stmt)
        turns = turns_result.scalars().all()

        # 构建消息列表
        turns_data = []
        for turn in turns:
            # 从 steps 中提取各步骤的最终状态
            steps = turn.steps or []
            latest_steps = {}
            for step in steps:
                latest_steps[step.get("step")] = step

            turn_data = {
                "id": str(turn.id),
                "turn_number": turn.turn_number,
                "user_query": turn.user_query,
                "status": turn.status,
                "intent_type": turn.intent_type,
                "response_text": turn.response_text,
                "steps": steps,  # 返回完整的步骤数组，便于前端渲染
                "created_at": turn.created_at.isoformat(),
                "completed_at": turn.completed_at.isoformat() if turn.completed_at else None,
            }

            # 获取关联的文件
            if turn.files:
                files_data = []
                for f in turn.files:
                    # 构造可访问的文件 URL（与静态目录挂载保持一致）
                    file_url = "/" + f.file_path.lstrip("/")
                    files_data.append({
                        "id": str(f.id),
                        "filename": f.filename,
                        "path": file_url,
                        "size": f.file_size,
                        "mime_type": f.mime_type,
                        "uploaded_at": f.uploaded_at.isoformat(),
                    })

                turn_data["files"] = files_data

            turns_data.append(turn_data)

        return ApiResponse(
            code=0,
            data=ThreadDetail(
                id=str(thread.id),
                title=thread.title,
                status=thread.status,
                created_at=thread.created_at,
                updated_at=thread.updated_at,
                turns=turns_data,
            ),
            msg="获取成功"
        )
    except HTTPException:
        raise
    except Exception as e:
        return ApiResponse(
            code=500,
            data=None,
            msg=f"获取失败: {str(e)}"
        )