/**
 * 管理控制台页面
 * 仅管理员可访问
 */

import { Users, Bug, Shield, AlertCircle } from "lucide-react";
import { Link } from "react-router";

import { usePermission, useRole } from "~/hooks/use-permission";
import { Permissions } from "~/lib/permissions";

const AdminPage = () => {
  const isAdmin = useRole("admin");
  const canViewUsers = usePermission(Permissions.USER_READ);
  const canViewBTracks = usePermission(Permissions.BTRACK_READ);

  // 权限检查
  if (!isAdmin && !canViewUsers && !canViewBTracks) {
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
      color: "blue",
      permission: canViewUsers,
    },
    {
      title: "异常追踪",
      description: "查看和导出系统异常记录",
      icon: Bug,
      href: "/admin/btracks",
      color: "rose",
      permission: canViewBTracks,
    },
    {
      title: "角色权限",
      description: "查看系统角色和权限配置",
      icon: Shield,
      href: "/admin/roles",
      color: "purple",
      permission: isAdmin, // 暂时只有管理员可以查看
      disabled: true, // 暂未实现
    },
  ];

  return (
    <div className="h-full overflow-hidden">
      <div className="h-full overflow-y-auto">
        <div className="flex w-full flex-col gap-8 px-4 py-6 lg:px-8">
          {/* Header */}
          <section className="p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-lg">
                <Shield className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">
                  管理控制台
                </h1>
                <p className="text-sm text-slate-500">
                  系统管理和监控中心
                </p>
              </div>
            </div>
          </section>

          {/* Admin Cards */}
          <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {adminCards
              .filter((card) => card.permission)
              .map((card) => {
                const Icon = card.icon;
                const colorClasses = {
                  blue: "from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700",
                  rose: "from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700",
                  purple: "from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700",
                };

                if (card.disabled) {
                  return (
                    <div
                      key={card.href}
                      className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm opacity-50 cursor-not-allowed"
                    >
                      <div className="absolute right-0 top-0 h-32 w-32 translate-x-8 -translate-y-8 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 opacity-50" />
                      <div className="relative z-10 flex flex-col gap-4">
                        <div className={`inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${colorClasses[card.color as keyof typeof colorClasses]} text-white shadow-md`}>
                          <Icon className="h-6 w-6" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-slate-900">
                            {card.title}
                          </h3>
                          <p className="mt-1 text-sm text-slate-600">
                            {card.description}
                          </p>
                          <p className="mt-2 text-xs text-slate-400">
                            即将推出...
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                }

                return (
                  <Link
                    key={card.href}
                    to={card.href}
                    className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:shadow-lg hover:border-slate-300"
                  >
                    <div className={`absolute right-0 top-0 h-32 w-32 translate-x-8 -translate-y-8 rounded-full bg-gradient-to-br ${colorClasses[card.color as keyof typeof colorClasses]} opacity-10 transition-transform group-hover:scale-110`} />
                    <div className="relative z-10 flex flex-col gap-4">
                      <div className={`inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${colorClasses[card.color as keyof typeof colorClasses]} text-white shadow-md transition-transform group-hover:scale-110`}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900 group-hover:text-slate-700">
                          {card.title}
                        </h3>
                        <p className="mt-1 text-sm text-slate-600">
                          {card.description}
                        </p>
                      </div>
                    </div>
                  </Link>
                );
              })}
          </section>

          {/* Info */}
          <section className="rounded-xl border border-blue-200 bg-blue-50 p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <h4 className="text-sm font-medium text-blue-900">
                  管理员权限
                </h4>
                <p className="mt-1 text-sm text-blue-700">
                  您正在访问系统管理功能。请谨慎操作，所有操作都会被记录。
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default AdminPage;
