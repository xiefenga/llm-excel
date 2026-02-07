"""权限系统初始化脚本"""

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.role import Role, Permission, RolePermission
from app.core.permissions import Permissions, ROLE_PERMISSIONS, PERMISSION_DESCRIPTIONS


async def init_permissions(db: AsyncSession):
    """
    初始化权限系统数据

    1. 创建所有权限
    2. 创建系统角色
    3. 为角色分配权限
    """
    print("开始初始化权限系统...")

    # ==================== 1. 创建所有权限 ====================
    print("  步骤 1/3: 创建权限...")
    permission_map = {}
    created_permissions_count = 0

    # 获取所有权限常量
    for attr_name in dir(Permissions):
        if not attr_name.startswith("_"):
            perm_code = getattr(Permissions, attr_name)

            # 检查权限是否已存在
            stmt = select(Permission).where(Permission.code == perm_code)
            result = await db.execute(stmt)
            permission = result.scalar_one_or_none()

            if not permission:
                # 创建权限
                permission_name = attr_name.replace("_", " ").title()
                permission_desc = PERMISSION_DESCRIPTIONS.get(
                    perm_code,
                    f"Permission for {perm_code}"
                )

                permission = Permission(
                    name=permission_name,
                    code=perm_code,
                    description=permission_desc,
                )
                db.add(permission)
                await db.flush()
                created_permissions_count += 1
                print(f"    ✅ 创建权限: {perm_code}")

            permission_map[perm_code] = permission

    await db.commit()
    print(f"  ✅ 权限创建完成，新增 {created_permissions_count} 个权限")

    # ==================== 2. 创建系统角色 ====================
    print("  步骤 2/3: 创建系统角色...")
    system_roles = {
        "admin": {
            "name": "系统管理员",
            "description": "拥有所有权限，可管理用户、角色、权限",
        },
        "user": {
            "name": "普通用户",
            "description": "基础用户权限，可使用核心功能",
        },
        "guest": {
            "name": "访客",
            "description": "只读权限，用于演示或试用",
        },
        "operator": {
            "name": "运营人员",
            "description": "可查看所有数据，管理异常记录",
        },
    }

    created_roles_count = 0
    role_map = {}

    for role_code, role_info in system_roles.items():
        # 检查角色是否已存在
        stmt = select(Role).where(Role.code == role_code)
        result = await db.execute(stmt)
        role = result.scalar_one_or_none()

        if not role:
            # 创建角色
            role = Role(
                name=role_info["name"],
                code=role_code,
                description=role_info["description"],
                is_system=True,
            )
            db.add(role)
            await db.flush()
            created_roles_count += 1
            print(f"    ✅ 创建角色: {role_code} ({role_info['name']})")

        role_map[role_code] = role

    await db.commit()
    print(f"  ✅ 角色创建完成，新增 {created_roles_count} 个角色")

    # ==================== 3. 为角色分配权限 ====================
    print("  步骤 3/3: 分配权限给角色...")
    assigned_permissions_count = 0

    for role_code, permission_codes in ROLE_PERMISSIONS.items():
        if role_code not in role_map:
            continue

        role = role_map[role_code]

        for perm_code in permission_codes:
            if perm_code not in permission_map:
                continue

            permission = permission_map[perm_code]

            # 检查角色-权限关联是否已存在
            stmt = select(RolePermission).where(
                RolePermission.role_id == role.id,
                RolePermission.permission_id == permission.id,
            )
            result = await db.execute(stmt)
            role_perm = result.scalar_one_or_none()

            if not role_perm:
                role_perm = RolePermission(
                    role_id=role.id,
                    permission_id=permission.id,
                )
                db.add(role_perm)
                assigned_permissions_count += 1

    await db.commit()
    print(f"  ✅ 权限分配完成，新增 {assigned_permissions_count} 个角色-权限关联")

    print("✅ 权限系统初始化完成！")
    print()
    print("角色权限概览：")
    for role_code, permission_codes in ROLE_PERMISSIONS.items():
        role = role_map.get(role_code)
        if role:
            print(f"  - {role.name} ({role_code}): {len(permission_codes)} 个权限")


async def check_permission_system(db: AsyncSession):
    """检查权限系统状态"""
    # 统计权限数量
    stmt = select(Permission)
    result = await db.execute(stmt)
    permissions = result.scalars().all()

    # 统计角色数量
    stmt = select(Role)
    result = await db.execute(stmt)
    roles = result.scalars().all()

    # 统计角色-权限关联数量
    stmt = select(RolePermission)
    result = await db.execute(stmt)
    role_permissions = result.scalars().all()

    print("权限系统状态：")
    print(f"  - 权限总数: {len(permissions)}")
    print(f"  - 角色总数: {len(roles)}")
    print(f"  - 角色-权限关联: {len(role_permissions)}")

    # 显示各角色的权限数量
    for role in roles:
        stmt = select(RolePermission).where(RolePermission.role_id == role.id)
        result = await db.execute(stmt)
        role_perms = result.scalars().all()
        print(f"  - {role.name} ({role.code}): {len(role_perms)} 个权限")
