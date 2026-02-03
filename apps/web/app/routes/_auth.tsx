import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useNavigate, Outlet } from "react-router";

import { useCurrentUser } from "~/hooks/use-current-user";

import type { Route } from "./+types/_auth";

export function meta({ }: Route.MetaArgs) {
  return [
    { title: "LLM Excel" },
    { name: "description", content: "使用 LLM 处理 Excel 数据" },
  ];
}

const AuthLayout = () => {
  const navigate = useNavigate();
  const { user, isLoading, isError } = useCurrentUser();

  // 如果认证失败（未登录），跳转到登录页
  useEffect(() => {
    if (isError && !user) {
      navigate("/login", { replace: true });
    }
  }, [isError, user, navigate]);

  // 加载中显示加载状态
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-brand mx-auto mb-4" />
          <p className="text-gray-600">系统加载中...</p>
        </div>
      </div>
    );
  }

  // 如果未登录，不渲染内容（会跳转到登录页）
  if (!user) {
    return null;
  }

  // 已登录，渲染子路由
  return <Outlet />;
};

export default AuthLayout;
