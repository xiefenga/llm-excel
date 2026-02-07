/**
 * 用户管理页面
 * 仅管理员可访问
 */

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Users, Shield, Loader2, AlertCircle } from "lucide-react";
import dayjs from "dayjs";

import { getUsers, getRoles, getUserRoles, assignRoles, type UserListItem, type RoleInfo } from "~/lib/permission-api";
import { usePermission } from "~/hooks/use-permission";
import { Permissions } from "~/lib/permissions";
import { Button } from "~/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Checkbox } from "~/components/ui/checkbox";
import { Label } from "~/components/ui/label";

const UserManagementPage = () => {
  const [offset, setOffset] = useState(0);
  const [selectedUser, setSelectedUser] = useState<UserListItem | null>(null);
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const limit = 20;
  const queryClient = useQueryClient();

  // 权限检查
  const canManageUsers = usePermission(Permissions.USER_READ);
  const canAssignRoles = usePermission(Permissions.USER_ASSIGN_ROLE);

  // 获取用户列表
  const { data: usersData, isLoading: usersLoading, isError: usersError } = useQuery({
    queryKey: ["users", { limit, offset }],
    queryFn: () => getUsers({ limit, offset }),
    enabled: canManageUsers,
  });

  // 获取所有角色
  const { data: roles = [] } = useQuery({
    queryKey: ["roles"],
    queryFn: getRoles,
    enabled: canManageUsers,
  });

  // 获取用户角色
  const { data: userRoles, isLoading: userRolesLoading } = useQuery({
    queryKey: ["userRoles", selectedUser?.id],
    queryFn: () => getUserRoles(selectedUser!.id),
    enabled: !!selectedUser,
  });

  // 分配角色 Mutation
  const assignRolesMutation = useMutation({
    mutationFn: ({ userId, roleIds }: { userId: string; roleIds: string[] }) =>
      assignRoles(userId, roleIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["userRoles", selectedUser?.id] });
      setIsDialogOpen(false);
      setSelectedUser(null);
      setSelectedRoleIds([]);
    },
  });

  const items = usersData?.items ?? [];
  const total = usersData?.total ?? 0;
  const canPrev = offset > 0;
  const canNext = offset + limit < total;

  const handleManageRoles = (user: UserListItem) => {
    setSelectedUser(user);
    setIsDialogOpen(true);
  };

  const handleDialogOpenChange = (open: boolean) => {
    if (!open) {
      setSelectedUser(null);
      setSelectedRoleIds([]);
    }
    setIsDialogOpen(open);
  };

  const handleRoleToggle = (roleId: string) => {
    setSelectedRoleIds((prev) =>
      prev.includes(roleId)
        ? prev.filter((id) => id !== roleId)
        : [...prev, roleId]
    );
  };

  const handleSaveRoles = () => {
    if (!selectedUser) return;

    assignRolesMutation.mutate({
      userId: selectedUser.id,
      roleIds: selectedRoleIds,
    });
  };

  // 当用户角色加载完成时，初始化选中的角色
  useEffect(() => {
    if (userRoles) {
      setSelectedRoleIds(userRoles.roles.map((r) => r.id));
    }
  }, [userRoles]);

  // 权限检查
  if (!canManageUsers) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-rose-500" />
          <h2 className="mt-4 text-lg font-semibold">权限不足</h2>
          <p className="mt-2 text-sm text-slate-600">
            您没有权限访问此页面
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-hidden">
      <div className="h-full overflow-y-auto">
        <div className="flex w-full flex-col gap-6 px-4 py-6 lg:px-8">
          {/* Header */}
          <section className="p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-slate-900">
                  用户管理
                </h1>
                <p className="text-xs text-slate-500">
                  管理系统用户及其角色分配
                </p>
              </div>
            </div>
          </section>

          {/* User List */}
          <section className="grid gap-4">
            {usersLoading && (
              <div className="flex items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white/70 py-16 text-slate-500">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                正在加载用户列表...
              </div>
            )}

            {usersError && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-600">
                获取失败，请稍后重试
              </div>
            )}

            {!usersLoading && items.length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white/70 p-10 text-center text-slate-500">
                暂无用户
              </div>
            )}

            {!usersLoading && items.length > 0 && (
              <div className="overflow-hidden rounded-xl border border-white/70 bg-white/85 shadow-sm">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/80 text-xs uppercase tracking-[0.2em] text-slate-400">
                      <TableHead>用户</TableHead>
                      <TableHead className="text-center">状态</TableHead>
                      <TableHead>角色</TableHead>
                      <TableHead className="text-center">创建时间</TableHead>
                      <TableHead className="text-center">最后登录</TableHead>
                      <TableHead className="text-center">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <img
                              src={user.avatar || "/storage/llm-excel/__SYS__/default_avatar.png"}
                              alt={user.username}
                              className="h-8 w-8 rounded-full object-cover"
                            />
                            <span className="font-medium">{user.username}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <span
                            className={`inline-block rounded-full px-2 py-1 text-xs ${
                              user.status === 0
                                ? "bg-green-100 text-green-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {user.status === 0 ? "正常" : "禁用"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {user.roles.length > 0 ? (
                              user.roles.map((role) => (
                                <span
                                  key={role.id}
                                  className="inline-block rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-700"
                                >
                                  {role.name}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs text-slate-400">无角色</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center text-slate-600">
                          {dayjs(user.created_at).format("YYYY-MM-DD")}
                        </TableCell>
                        <TableCell className="text-center text-slate-600">
                          {user.last_login_at
                            ? dayjs(user.last_login_at).format("YYYY-MM-DD HH:mm")
                            : "-"}
                        </TableCell>
                        <TableCell className="text-center">
                          {canAssignRoles && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleManageRoles(user)}
                            >
                              <Shield className="mr-1 h-4 w-4" />
                              管理角色
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </section>

          {/* Pagination */}
          <section className="flex items-center justify-between px-4 py-3 text-sm text-slate-500">
            <div>
              第 {Math.floor(offset / limit) + 1} 页 · 共{" "}
              {Math.max(Math.ceil(total / limit), 1)} 页
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                disabled={!canPrev}
                onClick={() => setOffset(Math.max(offset - limit, 0))}
              >
                上一页
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={!canNext}
                onClick={() => setOffset(offset + limit)}
              >
                下一页
              </Button>
            </div>
          </section>
        </div>
      </div>

      {/* Role Assignment Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>管理用户角色</DialogTitle>
            <DialogDescription>
              为用户 <strong>{selectedUser?.username}</strong> 分配角色
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {userRolesLoading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
              </div>
            )}

            {!userRolesLoading && roles.map((role) => (
              <div key={role.id} className="flex items-start space-x-3">
                <Checkbox
                  id={`role-${role.id}`}
                  checked={selectedRoleIds.includes(role.id)}
                  onCheckedChange={() => handleRoleToggle(role.id)}
                />
                <div className="flex-1">
                  <Label htmlFor={`role-${role.id}`} className="cursor-pointer">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{role.name}</span>
                      {role.is_system && (
                        <span className="rounded bg-blue-100 px-1.5 py-0.5 text-xs text-blue-700">
                          系统
                        </span>
                      )}
                    </div>
                    {role.description && (
                      <p className="text-sm text-slate-600">{role.description}</p>
                    )}
                    <p className="text-xs text-slate-400">
                      {role.permission_count} 个权限
                    </p>
                  </Label>
                </div>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsDialogOpen(false)}>
              取消
            </Button>
            <Button
              onClick={handleSaveRoles}
              disabled={assignRolesMutation.isPending}
            >
              {assignRolesMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserManagementPage;
