/**
 * 用户上下文
 * 管理用户信息、角色和权限
 */

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { getUserInfo } from "~/lib/api";

export interface UserInfo {
  id: string;
  username: string;
  avatar: string | null;
  status: number;
  accounts: {
    email: string;
  };
  roles: string[];
  permissions: string[];
  created_at: string;
  last_login_at: string | null;
}

interface UserContextType {
  user: UserInfo | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  hasPermission: (permission: string | string[], matchAll?: boolean) => boolean;
  hasRole: (role: string | string[]) => boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

interface UserProviderProps {
  children: ReactNode;
}

export function UserProvider({ children }: UserProviderProps) {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchUser = async () => {
    try {
      setLoading(true);
      setError(null);
      const userInfo = await getUserInfo();
      setUser(userInfo);
    } catch (err) {
      setError(err as Error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  const hasPermission = (
    permission: string | string[],
    matchAll: boolean = false
  ): boolean => {
    if (!user || !user.permissions) {
      return false;
    }

    const userPermissions = user.permissions;

    // 超级权限
    if (userPermissions.includes("*:*")) {
      return true;
    }

    const required = Array.isArray(permission) ? permission : [permission];
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
  };

  const hasRole = (role: string | string[]): boolean => {
    if (!user || !user.roles) {
      return false;
    }

    const required = Array.isArray(role) ? role : [role];
    return required.some((r) => user.roles.includes(r));
  };

  return (
    <UserContext.Provider
      value={{
        user,
        loading,
        error,
        refetch: fetchUser,
        hasPermission,
        hasRole,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

/**
 * 使用用户上下文
 */
export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}

/**
 * 权限守卫 Hook
 */
export function usePermission(permission: string | string[], matchAll: boolean = false): boolean {
  const { hasPermission } = useUser();
  return hasPermission(permission, matchAll);
}

/**
 * 角色守卫 Hook
 */
export function useRole(role: string | string[]): boolean {
  const { hasRole } = useUser();
  return hasRole(role);
}

// 辅助函数
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
