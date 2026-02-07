/**
 * 权限系统 - 前端
 */

export enum Permissions {
  // ==================== 会话管理 ====================
  THREAD_READ = "thread:read",
  THREAD_READ_ALL = "thread:read:all",
  THREAD_WRITE = "thread:write",
  THREAD_UPDATE = "thread:update",
  THREAD_DELETE = "thread:delete",
  THREAD_DELETE_ALL = "thread:delete:all",

  // ==================== 文件管理 ====================
  FILE_UPLOAD = "file:upload",
  FILE_READ = "file:read",
  FILE_READ_ALL = "file:read:all",
  FILE_DELETE = "file:delete",
  FILE_DOWNLOAD = "file:download",

  // ==================== Excel 处理 ====================
  EXCEL_PROCESS = "excel:process",
  EXCEL_PREVIEW = "excel:preview",
  EXCEL_DOWNLOAD = "excel:download",

  // ==================== 异常追踪 ====================
  BTRACK_READ = "btrack:read",
  BTRACK_READ_ALL = "btrack:read:all",
  BTRACK_EXPORT = "btrack:export",
  BTRACK_UPDATE = "btrack:update",

  // ==================== 用户管理 ====================
  USER_READ = "user:read",
  USER_CREATE = "user:create",
  USER_UPDATE = "user:update",
  USER_DELETE = "user:delete",
  USER_ASSIGN_ROLE = "user:assign_role",

  // ==================== 角色管理 ====================
  ROLE_READ = "role:read",
  ROLE_CREATE = "role:create",
  ROLE_UPDATE = "role:update",
  ROLE_DELETE = "role:delete",
  ROLE_ASSIGN_PERMISSION = "role:assign_permission",

  // ==================== 权限管理 ====================
  PERMISSION_READ = "permission:read",
  PERMISSION_MANAGE = "permission:manage",

  // ==================== 系统管理 ====================
  SYSTEM_SETTINGS = "system:settings",
  SYSTEM_LOGS = "system:logs",
  SYSTEM_ALL = "system:*",

  // ==================== 超级权限 ====================
  ALL = "*:*",
}

/**
 * 匹配权限通配符模式
 */
function matchPermissionPattern(pattern: string[], target: string[]): boolean {
  if (pattern.length !== target.length) {
    return false;
  }

  for (let i = 0; i < pattern.length; i++) {
    if (pattern[i] !== "*" && pattern[i] !== target[i]) {
      return false;
    }
  }

  return true;
}

/**
 * 检查用户是否拥有指定权限
 *
 * @param userPermissions 用户权限列表
 * @param requiredPermission 必需的权限代码或权限代码列表
 * @param matchAll 如果为 true，需要匹配所有权限；否则匹配任意一个即可
 * @returns 是否拥有权限
 */
export function hasPermission(
  userPermissions: string[],
  requiredPermission: string | string[],
  matchAll: boolean = false
): boolean {
  // 超级权限
  if (userPermissions.includes(Permissions.ALL)) {
    return true;
  }

  const required = Array.isArray(requiredPermission)
    ? requiredPermission
    : [requiredPermission];

  const matchedPermissions = new Set<string>();

  // 检查通配符权限
  for (const userPerm of userPermissions) {
    if (userPerm.includes("*")) {
      const pattern = userPerm.split(":");
      for (const reqPerm of required) {
        const target = reqPerm.split(":");
        if (matchPermissionPattern(pattern, target)) {
          matchedPermissions.add(reqPerm);
        }
      }
    }
  }

  // 精确匹配
  for (const reqPerm of required) {
    if (userPermissions.includes(reqPerm)) {
      matchedPermissions.add(reqPerm);
    }
  }

  // 判断是否满足权限要求
  if (matchAll) {
    return matchedPermissions.size >= required.length;
  } else {
    return matchedPermissions.size > 0;
  }
}

/**
 * 权限守卫 Hook（需要配合用户上下文使用）
 *
 * 使用示例：
 * ```tsx
 * const canExport = usePermission(Permissions.BTRACK_EXPORT);
 *
 * {canExport && (
 *   <Button onClick={handleExport}>导出</Button>
 * )}
 * ```
 *
 * 注意：此 Hook 已废弃，请使用 contexts/user-context.tsx 中的 usePermission
 */
export function usePermission(requiredPermission: string | string[]): boolean {
  console.warn('usePermission from lib/permissions.ts is deprecated. Use usePermission from contexts/user-context.tsx instead.');

  // 临时实现：返回 false
  return false;
}

/**
 * 角色定义
 */
export enum Roles {
  ADMIN = "admin",
  USER = "user",
  GUEST = "guest",
  OPERATOR = "operator",
}

/**
 * 角色显示名称
 */
export const RoleNames: Record<Roles, string> = {
  [Roles.ADMIN]: "系统管理员",
  [Roles.USER]: "普通用户",
  [Roles.GUEST]: "访客",
  [Roles.OPERATOR]: "运营人员",
};
