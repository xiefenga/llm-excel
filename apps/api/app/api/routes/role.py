"""角色和权限管理相关路由"""

from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, HTTPException, Depends, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_user, check_permission
from app.core.database import get_db
from app.core.permissions import Permissions
from app.models.user import User
from app.models.role import Role, Permission, UserRole
from app.schemas.response import ApiResponse

router = APIRouter(prefix="/roles", tags=["roles"])


# ==================== Schemas ====================


class PermissionInfo(BaseModel):
    """权限信息"""
    id: str
    name: str
    code: str
    description: Optional[str]


class RoleInfo(BaseModel):
    """角色信息"""
    id: str
    name: str
    code: str
    description: Optional[str]
    is_system: bool
    permission_count: int = Field(default=0, description="权限数量")


class RoleDetail(BaseModel):
    """角色详情"""
    id: str
    name: str
    code: str
    description: Optional[str]
    is_system: bool
    permissions: List[PermissionInfo] = Field(default_factory=list)


class UserRoleInfo(BaseModel):
    """用户角色信息"""
    user_id: str
    username: str
    roles: List[RoleInfo] = Field(default_factory=list)


class AssignRoleRequest(BaseModel):
    """分配角色请求"""
    user_id: str = Field(..., description="用户 ID")
    role_ids: List[str] = Field(..., description="角色 ID 列表")


# ==================== APIs ====================


@router.get(
    "",
    response_model=ApiResponse[List[RoleInfo]],
    summary="获取角色列表",
    description="获取所有角色列表（需要 role:read 权限）",
)
async def get_roles(
    current_user: User = Depends(check_permission(Permissions.ROLE_READ)),
    db: AsyncSession = Depends(get_db),
):
    """获取所有角色列表"""
    stmt = (
        select(Role)
        .options(selectinload(Role.permissions))
        .order_by(Role.is_system.desc(), Role.created_at.asc())
    )
    result = await db.execute(stmt)
    roles = result.scalars().all()

    role_list = [
        RoleInfo(
            id=str(role.id),
            name=role.name,
            code=role.code,
            description=role.description,
            is_system=role.is_system,
            permission_count=len(role.permissions),
        )
        for role in roles
    ]

    return ApiResponse(
        code=0,
        data=role_list,
        msg="获取成功"
    )


@router.get(
    "/{role_id}",
    response_model=ApiResponse[RoleDetail],
    summary="获取角色详情",
    description="获取指定角色的详细信息（需要 role:read 权限）",
)
async def get_role_detail(
    role_id: str,
    current_user: User = Depends(check_permission(Permissions.ROLE_READ)),
    db: AsyncSession = Depends(get_db),
):
    """获取角色详情"""
    try:
        role_id_uuid = UUID(role_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="无效的角色 ID"
        )

    stmt = (
        select(Role)
        .options(selectinload(Role.permissions))
        .where(Role.id == role_id_uuid)
    )
    result = await db.execute(stmt)
    role = result.scalar_one_or_none()

    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="角色不存在"
        )

    permissions = [
        PermissionInfo(
            id=str(perm.id),
            name=perm.name,
            code=perm.code,
            description=perm.description,
        )
        for perm in role.permissions
    ]

    return ApiResponse(
        code=0,
        data=RoleDetail(
            id=str(role.id),
            name=role.name,
            code=role.code,
            description=role.description,
            is_system=role.is_system,
            permissions=permissions,
        ),
        msg="获取成功"
    )


@router.get(
    "/user/{user_id}",
    response_model=ApiResponse[UserRoleInfo],
    summary="获取用户角色",
    description="获取指定用户的角色列表（需要 user:read 权限）",
)
async def get_user_roles(
    user_id: str,
    current_user: User = Depends(check_permission(Permissions.USER_READ)),
    db: AsyncSession = Depends(get_db),
):
    """获取用户角色"""
    try:
        user_id_uuid = UUID(user_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="无效的用户 ID"
        )

    stmt = (
        select(User)
        .options(selectinload(User.roles).selectinload(Role.permissions))
        .where(User.id == user_id_uuid)
    )
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="用户不存在"
        )

    roles = [
        RoleInfo(
            id=str(role.id),
            name=role.name,
            code=role.code,
            description=role.description,
            is_system=role.is_system,
            permission_count=len(role.permissions),
        )
        for role in user.roles
    ]

    return ApiResponse(
        code=0,
        data=UserRoleInfo(
            user_id=str(user.id),
            username=user.username,
            roles=roles,
        ),
        msg="获取成功"
    )


@router.post(
    "/assign",
    response_model=ApiResponse[None],
    summary="分配角色",
    description="为用户分配角色（需要 user:assign_role 权限）",
)
async def assign_roles(
    request: AssignRoleRequest,
    current_user: User = Depends(check_permission(Permissions.USER_ASSIGN_ROLE)),
    db: AsyncSession = Depends(get_db),
):
    """为用户分配角色"""
    try:
        user_id_uuid = UUID(request.user_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="无效的用户 ID"
        )

    # 检查用户是否存在
    stmt = select(User).where(User.id == user_id_uuid)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="用户不存在"
        )

    # 检查所有角色是否存在
    role_uuids = []
    for role_id in request.role_ids:
        try:
            role_uuid = UUID(role_id)
            role_uuids.append(role_uuid)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"无效的角色 ID: {role_id}"
            )

    stmt = select(Role).where(Role.id.in_(role_uuids))
    result = await db.execute(stmt)
    roles = result.scalars().all()

    if len(roles) != len(role_uuids):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="部分角色不存在"
        )

    # 删除用户现有的所有角色
    delete_stmt = select(UserRole).where(UserRole.user_id == user_id_uuid)
    result = await db.execute(delete_stmt)
    existing_user_roles = result.scalars().all()
    for ur in existing_user_roles:
        await db.delete(ur)

    # 添加新角色
    for role_uuid in role_uuids:
        user_role = UserRole(
            user_id=user_id_uuid,
            role_id=role_uuid,
        )
        db.add(user_role)

    await db.commit()

    return ApiResponse(
        code=0,
        data=None,
        msg="角色分配成功"
    )


@router.get(
    "/permissions/all",
    response_model=ApiResponse[List[PermissionInfo]],
    summary="获取所有权限",
    description="获取系统中的所有权限（需要 permission:read 权限）",
)
async def get_all_permissions(
    current_user: User = Depends(check_permission(Permissions.PERMISSION_READ)),
    db: AsyncSession = Depends(get_db),
):
    """获取所有权限"""
    stmt = select(Permission).order_by(Permission.code.asc())
    result = await db.execute(stmt)
    permissions = result.scalars().all()

    permission_list = [
        PermissionInfo(
            id=str(perm.id),
            name=perm.name,
            code=perm.code,
            description=perm.description,
        )
        for perm in permissions
    ]

    return ApiResponse(
        code=0,
        data=permission_list,
        msg="获取成功"
    )
