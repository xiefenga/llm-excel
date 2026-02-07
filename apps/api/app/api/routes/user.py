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
from app.models.user import User
from app.models.role import Role
from app.schemas.response import ApiResponse

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
