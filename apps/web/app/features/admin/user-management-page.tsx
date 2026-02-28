/**
 * 用户管理页面
 * 仅管理员可访问
 */

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Shield, Loader2, AlertCircle, ArrowLeft } from "lucide-react";
import { Link } from "react-router";
import dayjs from "dayjs";

import { getUsers, getRoles, getUserRoles, assignRoles, type UserListItem } from "~/lib/permission-api";
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

  const canManageUsers = usePermission(Permissions.USER_READ);
  const canAssignRoles = usePermission(Permissions.USER_ASSIGN_ROLE);

  const { data: usersData, isLoading: usersLoading, isError: usersError } = useQuery({
    queryKey: ["users", { limit, offset }],
    queryFn: () => getUsers({ limit, offset }),
    enabled: canManageUsers,
  });

  const { data: roles = [] } = useQuery({
    queryKey: ["roles"],
    queryFn: getRoles,
    enabled: canManageUsers,
  });

  const { data: userRoles, isLoading: userRolesLoading } = useQuery({
    queryKey: ["userRoles", selectedUser?.id],
    queryFn: () => getUserRoles(selectedUser!.id),
    enabled: !!selectedUser,
  });

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

  useEffect(() => {
    if (userRoles) {
      setSelectedRoleIds(userRoles.roles.map((r) => r.id));
    }
  }, [userRoles]);

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
    <div className="flex h-full flex-col overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center gap-3 border-b px-4 py-3">
        <Button asChild size="icon-sm" variant="ghost">
          <Link to="/admin">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <h1 className="text-base font-semibold">用户管理</h1>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-4 lg:px-6">
          {usersLoading && (
            <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              加载中...
            </div>
          )}

          {usersError && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-600">
              获取失败，请稍后重试
            </div>
          )}

          {!usersLoading && items.length === 0 && (
            <div className="py-16 text-center text-sm text-muted-foreground">
              暂无用户
            </div>
          )}

          {!usersLoading && items.length > 0 && (
            <div className="overflow-hidden rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow className="text-xs">
                    <TableHead>用户</TableHead>
                    <TableHead className="text-center">状态</TableHead>
                    <TableHead>角色</TableHead>
                    <TableHead className="text-center">创建时间</TableHead>
                    <TableHead className="text-center">最后登录</TableHead>
                    {canAssignRoles && (
                      <TableHead className="text-center">操作</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <img
                            src={user.avatar || "/storage/llm-excel/__SYS__/default_avatar.png"}
                            alt={user.username}
                            className="h-7 w-7 rounded-full object-cover"
                          />
                          <span className="text-sm font-medium">{user.username}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-xs ${
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
                                className="inline-block rounded bg-blue-100 px-1.5 py-0.5 text-xs text-blue-700"
                              >
                                {role.name}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-muted-foreground">无角色</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center text-xs text-muted-foreground">
                        {dayjs(user.created_at).format("YYYY-MM-DD")}
                      </TableCell>
                      <TableCell className="text-center text-xs text-muted-foreground">
                        {user.last_login_at
                          ? dayjs(user.last_login_at).format("YYYY-MM-DD HH:mm")
                          : "-"}
                      </TableCell>
                      {canAssignRoles && (
                        <TableCell className="text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleManageRoles(user)}
                          >
                            <Shield className="mr-1 h-3.5 w-3.5" />
                            角色
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {total > limit && (
            <div className="flex items-center justify-between pt-3 text-xs text-muted-foreground">
              <span>
                第 {Math.floor(offset / limit) + 1} / {Math.ceil(total / limit)} 页
              </span>
              <div className="flex gap-1.5">
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
            </div>
          )}
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
