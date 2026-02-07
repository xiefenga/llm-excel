/**
 * 权限相关 Hooks
 * 基于现有的 useCurrentUser 实现
 */

import { useCurrentUser } from "~/hooks/use-current-user";

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
 */
export function hasPermission(
  userPermissions: string[],
  requiredPermission: string | string[],
  matchAll: boolean = false
): boolean {
  // 超级权限
  if (userPermissions.includes("*:*")) {
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
 * 权限守卫 Hook
 *
 * @param requiredPermission 必需的权限代码或权限代码列表
 * @param matchAll 如果为 true，需要匹配所有权限；否则匹配任意一个即可
 * @returns 是否拥有权限
 *
 * @example
 * ```tsx
 * const canExport = usePermission("btrack:export");
 *
 * {canExport && (
 *   <Button onClick={handleExport}>导出</Button>
 * )}
 * ```
 */
export function usePermission(
  requiredPermission: string | string[],
  matchAll: boolean = false
): boolean {
  const { user } = useCurrentUser();

  if (!user || !user.permissions) {
    return false;
  }

  return hasPermission(user.permissions, requiredPermission, matchAll);
}

/**
 * 角色守卫 Hook
 *
 * @param requiredRole 必需的角色代码或角色代码列表
 * @returns 是否拥有角色
 *
 * @example
 * ```tsx
 * const isAdmin = useRole("admin");
 *
 * {isAdmin && (
 *   <Button onClick={handleManage}>管理</Button>
 * )}
 * ```
 */
export function useRole(requiredRole: string | string[]): boolean {
  const { user } = useCurrentUser();

  if (!user || !user.roles) {
    return false;
  }

  const required = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
  return required.some((r) => user.roles?.includes(r));
}
