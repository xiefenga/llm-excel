import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { getCurrentUser } from "~/api/auth";
import { useAuthStore } from "~/stores/auth";

/**
 * 使用 react-query 获取当前用户信息
 * 自动缓存、重试和错误处理
 * 
 * 逻辑：
 * 1. 如果 store 中已有用户信息，直接返回（避免不必要的请求）
 * 2. 如果 store 中没有用户信息，使用 react-query 获取
 * 3. react-query 会自动处理缓存、重试和错误处理
 */
export function useCurrentUser() {
  const { user, setUser, clearUser } = useAuthStore();

  const query = useQuery({
    queryKey: ["currentUser"],
    queryFn: async () => {
      const userInfo = await getCurrentUser();
      setUser(userInfo);
      return userInfo;
    },
    enabled: !user, // 如果 store 中已有用户信息，不执行查询
    retry: 1, // 失败时重试 1 次
    retryDelay: 1000, // 重试延迟 1 秒
    staleTime: 5 * 60 * 1000, // 5 分钟内数据视为新鲜
    gcTime: 10 * 60 * 1000, // 10 分钟后清理缓存
  });

  // 如果查询失败（未登录），清除用户信息
  useEffect(() => {
    if (query.isError && user) {
      clearUser();
    }
  }, [query.isError, user, clearUser]);

  // 如果查询成功，更新 store（双重保险）
  useEffect(() => {
    if (query.data) {
      setUser(query.data);
    }
  }, [query.data, setUser]);

  // 返回用户信息：优先使用 store 中的，其次使用 query 返回的
  return {
    user: user || query.data || null,
    isLoading: !user && (query.isLoading || query.isFetching), // 只有在没有用户信息时才显示加载状态
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}
