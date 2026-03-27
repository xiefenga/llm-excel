/**
 * 用户管理页面
 * 仅管理员可访问
 */

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, AlertCircle, ArrowLeft, MessageSquare, File, BarChart3, ChevronDown, ChevronUp } from "lucide-react";
import { Link } from "react-router";
import dayjs from "dayjs";

import { getUsers, getRoles, getUserRoles, assignRoles, type UserListItem } from "~/lib/permission-api";
import { getUserThreadStats, getUserDetail, type UserDetail } from "~/lib/api";
import { usePermission } from "~/hooks/use-permission";
import UserInfoCard from "./user-info-card";
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
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";

const UserManagementPage = () => {
  const [offset, setOffset] = useState(0);
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
  const [isStatsDialogOpen, setIsStatsDialogOpen] = useState(false);
  const [statsUser, setStatsUser] = useState<UserListItem | null>(null);

  const limit = 20;
  const queryClient = useQueryClient();

  const canManageUsers = usePermission("user:read");
  const canAssignRoles = usePermission("user:assign_role");
  const canViewThreads = usePermission("thread:read:all");
  const canViewFiles = usePermission("file:read:all");

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
    queryKey: ["userRoles", statsUser?.id],
    queryFn: () => getUserRoles(statsUser!.id),
    enabled: !!statsUser,
  });

  const assignRolesMutation = useMutation({
    mutationFn: ({ userId, roleIds }: { userId: string; roleIds: string[] }) =>
      assignRoles(userId, roleIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["userDetail", statsUser?.id] });
      queryClient.invalidateQueries({ queryKey: ["userRoles", statsUser?.id] });
      setSelectedRoleIds([]);
    },
  });

  // 获取用户统计信息
  const { data: userStats, isLoading: statsLoading, isError: statsError, refetch: refetchStats } = useQuery({
    queryKey: ["userStats", statsUser?.id],
    queryFn: () => getUserThreadStats(statsUser!.id),
    enabled: false, // 手动触发
  });

  // 获取用户详细信息
  const { data: userDetail, isLoading: detailLoading, isError: detailError, refetch: refetchDetail } = useQuery({
    queryKey: ["userDetail", statsUser?.id],
    queryFn: () => getUserDetail(statsUser!.id),
    enabled: false, // 手动触发
  });

  // 格式化文件大小
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  const items = usersData?.items ?? [];
  const total = usersData?.total ?? 0;
  const canPrev = offset > 0;
  const canNext = offset + limit < total;

  const handleShowStats = (user: UserListItem) => {
    setStatsUser(user);
    setIsStatsDialogOpen(true);
  };

  const handleStatsDialogOpenChange = (open: boolean) => {
    if (!open) {
      setStatsUser(null);
    }
    setIsStatsDialogOpen(open);
  };

  const handleRoleToggle = (roleId: string) => {
    setSelectedRoleIds((prev) =>
      prev.includes(roleId)
        ? prev.filter((id) => id !== roleId)
        : [...prev, roleId]
    );
  };

  const handleSaveRoles = () => {
    if (!statsUser) return;
    assignRolesMutation.mutate({
      userId: statsUser.id,
      roleIds: selectedRoleIds,
    });
  };

  useEffect(() => {
    if (userRoles) {
      setSelectedRoleIds(userRoles.roles.map((r) => r.id));
    }
  }, [userRoles]);

  useEffect(() => {
    if (isStatsDialogOpen && statsUser) {
      refetchStats();
      refetchDetail();
    }
  }, [isStatsDialogOpen, statsUser, refetchStats, refetchDetail]);

  useEffect(() => {
    if (!isStatsDialogOpen) {
      setSelectedRoleIds([]);
    }
  }, [isStatsDialogOpen]);

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
                    <TableHead className="text-center">创建时间</TableHead>
                    <TableHead className="text-center">最后登录</TableHead>
                    {(canAssignRoles || canViewThreads || canViewFiles) && (
                      <TableHead className="text-center">操作</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
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
                      <TableCell className="text-center text-xs text-muted-foreground">
                        {dayjs(user.created_at).format("YYYY-MM-DD")}
                      </TableCell>
                      <TableCell className="text-center text-xs text-muted-foreground">
                        {user.last_login_at
                          ? dayjs(user.last_login_at).format("YYYY-MM-DD HH:mm")
                          : "-"}
                      </TableCell>
                      {(canAssignRoles || canViewThreads || canViewFiles) && (
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            {canViewThreads && (
                              <Button
                                variant="ghost"
                                size="sm"
                                asChild
                              >
                                <Link to={`/admin/users/${user.id}/threads`}>
                                  <MessageSquare className="mr-1 h-3.5 w-3.5" />
                                  会话
                                </Link>
                              </Button>
                            )}
                            {canViewFiles && (
                              <Button
                                variant="ghost"
                                size="sm"
                                asChild
                              >
                                <Link to={`/admin/users/${user.id}/files`}>
                                  <File className="mr-1 h-3.5 w-3.5" />
                                  文件
                                </Link>
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleShowStats(user)}
                            >
                              <BarChart3 className="mr-1 h-3.5 w-3.5" />
                              用户信息
                            </Button>
                          </div>
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

      {/* 用户信息对话框 */}
      <Dialog open={isStatsDialogOpen} onOpenChange={handleStatsDialogOpenChange}>
        <DialogContent className="w-auto min-w-[750px] max-w-[95vw] max-h-[90vh] overflow-hidden px-6">
          <DialogHeader>
            <DialogTitle>用户信息</DialogTitle>
          </DialogHeader>

          <div className="flex flex-row gap-6 py-4">
            {/* 左侧：用户信息卡片（含角色分配下拉） */}
            <div className="w-[400px]">
              {statsUser && (detailLoading || userDetail) && (
                <UserInfoCard
                  user={userDetail}
                  isLoading={detailLoading}
                  canAssignRoles={canAssignRoles}
                  availableRoles={roles}
                  selectedRoleIds={selectedRoleIds}
                  onToggleRole={handleRoleToggle}
                  onSaveRoles={handleSaveRoles}
                  isSaving={assignRolesMutation.isPending}
                />
              )}
            </div>

            {/* 右侧：数据统计 */}
            <div className="w-[280px] space-y-4">
              {statsLoading && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                </div>
              )}

              {(statsError || detailError) && (
                <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-600">
                  获取用户信息失败，请稍后重试
                </div>
              )}

              {!statsLoading && userStats && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg border bg-slate-50 p-3">
                      <div className="text-xs text-slate-500">线程总数</div>
                      <div className="text-lg font-semibold">{userStats.thread_count}</div>
                    </div>
                    <div className="rounded-lg border bg-slate-50 p-3">
                      <div className="text-xs text-slate-500">活跃线程</div>
                      <div className="text-lg font-semibold">{userStats.active_thread_count}</div>
                    </div>
                    <div className="rounded-lg border bg-slate-50 p-3">
                      <div className="text-xs text-slate-500">总消息数</div>
                      <div className="text-lg font-semibold">{userStats.total_turns}</div>
                    </div>
                    <div className="rounded-lg border bg-slate-50 p-3">
                      <div className="text-xs text-slate-500">文件总数</div>
                      <div className="text-lg font-semibold">{userStats.file_count}</div>
                    </div>
                  </div>

                  <div className="rounded-lg border bg-slate-50 p-3">
                    <div className="text-xs text-slate-500">总文件大小</div>
                    <div className="text-lg font-semibold">{formatFileSize(userStats.total_file_size)}</div>
                  </div>

                  {userStats.last_activity_at && (
                    <div className="rounded-lg border bg-slate-50 p-3">
                      <div className="text-xs text-slate-500">最后活动时间</div>
                      <div className="text-sm font-medium">
                        {dayjs(userStats.last_activity_at).format("YYYY-MM-DD HH:mm")}
                      </div>
                    </div>
                  )}

                  {!userStats.last_activity_at && (
                    <div className="rounded-lg border bg-slate-50 p-3">
                      <div className="text-xs text-slate-500">最后活动时间</div>
                      <div className="text-sm font-medium text-slate-400">暂无活动</div>
                    </div>
                  )}
                </div>
              )}

              {!statsLoading && !userStats && !statsError && (
                <div className="py-8 text-center text-sm text-slate-400">
                  暂无统计信息
                </div>
              )}
            </div>
          </div>

        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserManagementPage;
