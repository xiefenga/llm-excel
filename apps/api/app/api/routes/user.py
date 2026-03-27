"""用户管理相关路由"""

from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, HTTPException, Depends, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_user, check_permission
from app.core.database import get_db
from app.core.permissions import Permissions
from app.models.user import User, Account
from app.models.role import Role
from app.models.file import File
from app.models.thread import Thread, ThreadTurn, TurnFile
from app.schemas.response import ApiResponse
from app.api.deps import has_permission

router = APIRouter(prefix="/users", tags=["users"])


# ==================== Schemas ====================


class RoleInfo(BaseModel):
    """角色信息"""
    id: str
    name: str
    code: str


class UserListItem(BaseModel):
    """用户列表项"""
    id: str
    username: str
    avatar: Optional[str]
    status: int
    role_count: int = Field(default=0, description="角色数量")
    roles: List[RoleInfo] = Field(default_factory=list, description="角色列表")
    created_at: str
    last_login_at: Optional[str]


class UserListResponse(BaseModel):
    """用户列表响应"""
    items: List[UserListItem]
    total: int
    limit: int
    offset: int


class UserDetailResponse(BaseModel):
    """用户详细信息响应"""
    id: str
    username: str
    avatar: Optional[str]
    status: int
    email: Optional[str] = Field(None, description="用户邮箱")
    role_count: int = Field(default=0, description="角色数量")
    roles: List[RoleInfo] = Field(default_factory=list, description="角色列表")
    created_at: str
    last_login_at: Optional[str]


# ==================== APIs ====================


@router.get(
    "",
    response_model=ApiResponse[UserListResponse],
    summary="获取用户列表",
    description="获取系统中的所有用户列表（需要 user:read 权限）",
)
async def get_users(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(check_permission(Permissions.USER_READ)),
    db: AsyncSession = Depends(get_db),
):
    """获取用户列表"""
    # 统计总数
    total_stmt = select(func.count()).select_from(User)
    total = await db.scalar(total_stmt)

    # 查询用户列表
    stmt = (
        select(User)
        .options(selectinload(User.roles))
        .order_by(User.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    result = await db.execute(stmt)
    users = result.scalars().all()

    items = [
        UserListItem(
            id=str(user.id),
            username=user.username,
            avatar=user.avatar,
            status=user.status,
            role_count=len(user.roles),
            roles=[
                RoleInfo(
                    id=str(role.id),
                    name=role.name,
                    code=role.code,
                )
                for role in user.roles
            ],
            created_at=user.created_at.isoformat(),
            last_login_at=user.last_login_at.isoformat() if user.last_login_at else None,
        )
        for user in users
    ]

    return ApiResponse(
        code=0,
        data=UserListResponse(
            items=items,
            total=total or 0,
            limit=limit,
            offset=offset,
        ),
        msg="获取成功"
    )


# ==================== 用户文件管理 API ====================


class FileItem(BaseModel):
    """文件列表项"""
    id: str
    filename: str
    file_size: int
    mime_type: Optional[str]
    uploaded_at: str
    download_url: str
    turn_count: int = Field(default=0, description="被使用的聊天轮次数量")


class UserFilesResponse(BaseModel):
    """用户文件列表响应"""
    items: List[FileItem]
    total: int
    limit: int
    offset: int


@router.get(
    "/{user_id}/files",
    response_model=ApiResponse[UserFilesResponse],
    summary="获取用户文件列表",
    description="获取指定用户的所有上传文件（需要 file:read:all 权限）",
)
async def get_user_files(
    user_id: str,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(check_permission(Permissions.FILE_READ_ALL)),
    db: AsyncSession = Depends(get_db),
):
    """获取指定用户的所有上传文件"""
    try:
        # 验证用户ID格式
        try:
            user_uuid = UUID(user_id)
        except ValueError:
            return ApiResponse(
                code=400,
                data=None,
                msg="无效的用户ID格式"
            )

        # 验证用户是否存在
        user_stmt = select(User).where(User.id == user_uuid)
        user_result = await db.execute(user_stmt)
        user = user_result.scalar_one_or_none()

        if not user:
            return ApiResponse(
                code=404,
                data=None,
                msg="用户不存在"
            )

        # 统计用户文件总数
        total_stmt = (
            select(func.count())
            .select_from(File)
            .where(File.user_id == user_uuid)
        )
        total = await db.scalar(total_stmt)

        # 查询用户文件列表，按上传时间倒序
        files_stmt = (
            select(
                File,
                func.count(TurnFile.id).label("turn_count")
            )
            .outerjoin(TurnFile, File.id == TurnFile.file_id)
            .where(File.user_id == user_uuid)
            .group_by(File.id)
            .order_by(File.uploaded_at.desc())
            .limit(limit)
            .offset(offset)
        )
        result = await db.execute(files_stmt)
        rows = result.all()

        items = []
        for file, turn_count in rows:
            items.append(FileItem(
                id=str(file.id),
                filename=file.filename,
                file_size=file.file_size,
                mime_type=file.mime_type,
                uploaded_at=file.uploaded_at.isoformat(),
                download_url=file.file_path,  # file_path 存储的是可访问的URL
                turn_count=turn_count or 0,
            ))

        return ApiResponse(
            code=0,
            data=UserFilesResponse(
                items=items,
                total=total or 0,
                limit=limit,
                offset=offset,
            ),
            msg="获取成功"
        )
    except Exception as e:
        return ApiResponse(
            code=500,
            data=None,
            msg=f"获取失败: {str(e)}"
        )


# ==================== 用户线程统计 API ====================


class UserStatsResponse(BaseModel):
    """用户线程统计信息响应"""
    thread_count: int = Field(default=0, description="线程总数")
    active_thread_count: int = Field(default=0, description="活跃线程数")
    total_turns: int = Field(default=0, description="总消息轮次数")
    file_count: int = Field(default=0, description="文件总数")
    total_file_size: int = Field(default=0, description="总文件大小（字节）")
    last_activity_at: Optional[str] = Field(default=None, description="最后活动时间")


@router.get(
    "/{user_id}/threads/stats",
    response_model=ApiResponse[UserStatsResponse],
    summary="获取用户线程统计信息",
    description="获取指定用户的线程统计数据（需要 thread:read:all 和 file:read:all 权限）",
)
async def get_user_thread_stats(
    user_id: str,
    current_user: User = Depends(check_permission(Permissions.THREAD_READ_ALL)),
    db: AsyncSession = Depends(get_db),
):
    """获取指定用户的线程统计数据"""
    try:
        # 验证用户ID格式
        try:
            user_uuid = UUID(user_id)
        except ValueError:
            return ApiResponse(
                code=400,
                data=None,
                msg="无效的用户ID格式"
            )

        # 验证用户是否存在
        user_stmt = select(User).where(User.id == user_uuid)
        user_result = await db.execute(user_stmt)
        user = user_result.scalar_one_or_none()

        if not user:
            return ApiResponse(
                code=404,
                data=None,
                msg="用户不存在"
            )

        # 检查用户是否同时拥有 FILE_READ_ALL 权限
        if not await has_permission(current_user, db, [Permissions.THREAD_READ_ALL, Permissions.FILE_READ_ALL], match_all=True):
            return ApiResponse(
                code=403,
                data=None,
                msg="权限不足：需要 thread:read:all 和 file:read:all 权限"
            )

        # 统计线程总数
        thread_total_stmt = (
            select(func.count())
            .select_from(Thread)
            .where(Thread.user_id == user_uuid)
        )
        thread_count = await db.scalar(thread_total_stmt) or 0

        # 统计活跃线程数
        active_thread_stmt = (
            select(func.count())
            .select_from(Thread)
            .where(Thread.user_id == user_uuid)
            .where(Thread.status == "active")
        )
        active_thread_count = await db.scalar(active_thread_stmt) or 0

        # 统计总消息轮次数
        total_turns_stmt = (
            select(func.count())
            .select_from(ThreadTurn)
            .join(Thread, Thread.id == ThreadTurn.thread_id)
            .where(Thread.user_id == user_uuid)
        )
        total_turns = await db.scalar(total_turns_stmt) or 0

        # 统计文件总数和总文件大小
        file_stats_stmt = (
            select(
                func.count().label("file_count"),
                func.coalesce(func.sum(File.file_size), 0).label("total_file_size")
            )
            .select_from(File)
            .where(File.user_id == user_uuid)
        )
        file_stats_result = await db.execute(file_stats_stmt)
        file_stats = file_stats_result.one_or_none()

        if file_stats:
            file_count = file_stats.file_count or 0
            total_file_size = file_stats.total_file_size or 0
        else:
            file_count = 0
            total_file_size = 0

        # 获取最后活动时间（线程最后更新时间）
        last_activity_stmt = (
            select(func.max(Thread.updated_at))
            .select_from(Thread)
            .where(Thread.user_id == user_uuid)
        )
        last_activity_at = await db.scalar(last_activity_stmt)

        return ApiResponse(
            code=0,
            data=UserStatsResponse(
                thread_count=thread_count,
                active_thread_count=active_thread_count,
                total_turns=total_turns,
                file_count=file_count,
                total_file_size=total_file_size,
                last_activity_at=last_activity_at.isoformat() if last_activity_at else None,
            ),
            msg="获取成功"
        )
    except Exception as e:
        return ApiResponse(
            code=500,
            data=None,
            msg=f"获取失败: {str(e)}"
        )


@router.get(
    "/{user_id}",
    response_model=ApiResponse[UserDetailResponse],
    summary="获取用户详细信息",
    description="获取指定用户的详细信息（需要 user:read 权限）",
)
async def get_user_detail(
    user_id: str,
    current_user: User = Depends(check_permission(Permissions.USER_READ)),
    db: AsyncSession = Depends(get_db),
):
    """获取用户详细信息"""
    try:
        # 验证用户ID格式
        try:
            user_uuid = UUID(user_id)
        except ValueError:
            return ApiResponse(
                code=400,
                data=None,
                msg="无效的用户ID格式"
            )

        # 查询用户及关联的账户和角色信息
        stmt = (
            select(User)
            .options(selectinload(User.accounts), selectinload(User.roles))
            .where(User.id == user_uuid)
        )
        result = await db.execute(stmt)
        user = result.scalar_one_or_none()

        if not user:
            return ApiResponse(
                code=404,
                data=None,
                msg="用户不存在"
            )

        # 获取邮箱（从 credentials 账户）
        email = None
        for account in user.accounts:
            if account.provider_id == "credentials":
                email = account.account_id
                break

        # 构建响应
        return ApiResponse(
            code=0,
            data=UserDetailResponse(
                id=str(user.id),
                username=user.username,
                avatar=user.avatar,
                status=user.status,
                email=email,
                role_count=len(user.roles),
                roles=[
                    RoleInfo(
                        id=str(role.id),
                        name=role.name,
                        code=role.code,
                    )
                    for role in user.roles
                ],
                created_at=user.created_at.isoformat(),
                last_login_at=user.last_login_at.isoformat() if user.last_login_at else None,
            ),
            msg="获取成功"
        )
    except Exception as e:
        return ApiResponse(
            code=500,
            data=None,
            msg=f"获取失败: {str(e)}"
        )
