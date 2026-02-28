/**
 * 管理控制台页面
 * 仅管理员可访问
 */

import { Users, Bug, Brain, Route, FlaskConical, AlertCircle, ChevronRight, ArrowLeft } from "lucide-react";
import { Link } from "react-router";

import { Button } from "~/components/ui/button";
import { usePermission, useRole } from "~/hooks/use-permission";
import { Permissions } from "~/lib/permissions";

const AdminPage = () => {
  const isAdmin = useRole("admin");
  const canViewUsers = usePermission(Permissions.USER_READ);
  const canViewBTracks = usePermission(Permissions.BTRACK_READ);
  const canManageSystem = usePermission(Permissions.SYSTEM_SETTINGS);

  if (!isAdmin && !canViewUsers && !canViewBTracks && !canManageSystem) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-rose-500" />
          <h2 className="mt-4 text-lg font-semibold">权限不足</h2>
          <p className="mt-2 text-sm text-slate-600">
            您没有权限访问管理控制台
          </p>
        </div>
      </div>
    );
  }

  const adminCards = [
    {
      title: "用户管理",
      description: "管理系统用户及其角色分配",
      icon: Users,
      href: "/admin/users",
      permission: canViewUsers,
    },
    {
      title: "异常追踪",
      description: "查看和导出系统异常记录",
      icon: Bug,
      href: "/admin/btracks",
      permission: canViewBTracks,
    },
    {
      title: "LLM 配置",
      description: "管理服务提供商、模型和凭证",
      icon: Brain,
      href: "/admin/provider",
      permission: canManageSystem,
    },
    {
      title: "阶段路由",
      description: "配置各处理阶段的 Provider 和模型",
      icon: Route,
      href: "/admin/stages",
      permission: canManageSystem,
    },
    {
      title: "LLM Playground",
      description: "测试 Provider 连通性和模型调用",
      icon: FlaskConical,
      href: "/admin/llm-test",
      permission: canManageSystem,
    },
  ];

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center gap-3 border-b px-4 py-3">
        <Button asChild size="icon-sm" variant="ghost">
          <Link to="/">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <h1 className="text-base font-semibold">管理控制台</h1>
      </div>

      <div className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-3xl px-4 py-6 lg:px-8">

        <div className="grid gap-3">
          {adminCards
            .filter((card) => card.permission)
            .map((card) => {
              const Icon = card.icon;
              return (
                <Link
                  key={card.href}
                  to={card.href}
                  className="group flex items-center gap-4 rounded-lg border bg-white px-4 py-3.5 transition-colors hover:bg-accent/50"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 group-hover:bg-slate-200 transition-colors">
                    <Icon className="h-4.5 w-4.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{card.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {card.description}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-slate-400 transition-colors" />
                </Link>
              );
            })}
        </div>
      </div>
      </div>
    </div>
  );
};

export default AdminPage;
