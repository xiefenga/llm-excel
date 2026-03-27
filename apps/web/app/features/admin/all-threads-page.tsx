/**
 * 全线程列表页面
 * 管理员查看所有用户的聊天线程，支持按用户筛选
 */

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router";
import { MessageSquare, FileText, Calendar, Clock, Loader2, AlertCircle, User, ArrowRight } from "lucide-react";
import dayjs from "dayjs";

import { getAllThreads, getThreadDetailAdmin, type UserThreadItem, type ThreadDetail } from "~/lib/api";
import { getUsers, type UserListItem } from "~/lib/permission-api";
import ReadOnlyChatPanel from "./readonly-chat-panel";
import { usePermission } from "~/hooks/use-permission";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "~/components/ui/breadcrumb";

const AllThreadsPage = () => {
  const [offset, setOffset] = useState(0);
  const limit = 20;
  const [statusFilter, setStatusFilter] = useState<"all" | "normal" | "error">("all");
  const [userFilter, setUserFilter] = useState<string>("all");

  const canViewThreads = usePermission("thread:read:all");

  // 线程详情对话框状态
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [threadUserInfo, setThreadUserInfo] = useState<{ id: string; username: string; avatar: string | null } | null>(null);

  // 获取所有用户列表（用于筛选）
  const { data: usersData } = useQuery({
    queryKey: ["users", { limit: 100, offset: 0 }],
    queryFn: () => getUsers({ limit: 100, offset: 0 }),
    enabled: canViewThreads,
  });

  // 获取所有线程列表
  const { data: threadsData, isLoading, isError } = useQuery({
    queryKey: ["allThreads", { limit, offset, healthStatus: statusFilter, userFilter }],
    queryFn: () =>
      getAllThreads(
        limit,
        offset,
        statusFilter === "all" ? undefined : statusFilter,
        userFilter === "all" ? undefined : userFilter
      ),
    enabled: canViewThreads,
  });

  // 获取线程详情（管理员）
  const { data: threadDetail, isLoading: detailLoading, isError: detailError, refetch: refetchThreadDetail } = useQuery({
    queryKey: ["threadDetailAdmin", selectedThreadId],
    queryFn: () => getThreadDetailAdmin(selectedThreadId!),
    enabled: false, // 手动触发
  });

  // 打开线程详情对话框
  const handleOpenDetail = (threadId: string, user: UserThreadItem["user"]) => {
    setSelectedThreadId(threadId);
    setThreadUserInfo(user ? { id: user.id, username: user.username, avatar: user.avatar } : null);
    setIsDetailDialogOpen(true);
  };

  // 对话框打开/关闭处理
  const handleDetailDialogOpenChange = (open: boolean) => {
    if (!open) {
      setSelectedThreadId(null);
    }
    setIsDetailDialogOpen(open);
  };

  // 筛选条件变化时重置偏移量
  useEffect(() => {
    setOffset(0);
  }, [statusFilter, userFilter]);

  // 当对话框打开时获取线程详情
  useEffect(() => {
    if (isDetailDialogOpen && selectedThreadId) {
      refetchThreadDetail();
    }
  }, [isDetailDialogOpen, selectedThreadId, refetchThreadDetail]);

  if (!canViewThreads) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-rose-500" />
          <h2 className="mt-4 text-lg font-semibold">权限不足</h2>
          <p className="mt-2 text-sm text-slate-600">
            您没有权限查看线程列表
          </p>
          <Button asChild variant="ghost" className="mt-4">
            <Link to="/admin">
              返回管理控制台
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const items = threadsData?.items ?? [];
  const total = threadsData?.total ?? 0;

  const canPrev = offset > 0;
  const canNext = offset + limit < total;

  // 用户列表（用于筛选下拉）
  const users = usersData?.items ?? [];

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center gap-3 border-b px-4 py-3">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink to="/admin">管理</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>会话管理</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-4 lg:px-6">

          {/* 线程列表 */}
          <div className="mb-6">
            <div className="mb-3 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Button asChild variant="ghost" size="sm">
                  <Link to="/admin">
                    <ArrowRight className="mr-1 h-4 w-4 rotate-180" />
                  </Link>
                </Button>
                <h2 className="text-sm font-semibold">会话列表</h2>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">
                  共 {total} 个线程
                </span>
                {/* 用户筛选 */}
                <Select value={userFilter} onValueChange={(v) => setUserFilter(v)}>
                  <SelectTrigger className="h-8 w-[140px]">
                    <SelectValue placeholder="选择用户" />
                  </SelectTrigger>
                  <SelectContent position="popper" side="bottom" sideOffset={4}>
                    <SelectItem value="all">全部用户</SelectItem>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.username}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {/* 状态筛选 */}
                <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
                  <SelectTrigger className="h-8 w-[140px]">
                    <SelectValue placeholder="状态" />
                  </SelectTrigger>
                  <SelectContent position="popper" side="bottom" sideOffset={4}>
                    <SelectItem value="all">全部状态</SelectItem>
                    <SelectItem value="normal">正常</SelectItem>
                    <SelectItem value="error">异常</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {isLoading && (
              <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                加载中...
              </div>
            )}

            {isError && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-600">
                获取失败，请稍后重试
              </div>
            )}

            {!isLoading && items.length === 0 && (
              <div className="py-16 text-center text-sm text-muted-foreground">
                <MessageSquare className="mx-auto mb-3 h-8 w-8 text-slate-300" />
                {statusFilter !== "all" || userFilter !== "all" ? "暂无符合条件的线程" : "暂无聊天线程"}
              </div>
            )}

            {!isLoading && items.length > 0 && (
              <div className="overflow-hidden rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow className="text-xs">
                      <TableHead>用户</TableHead>
                      <TableHead>标题</TableHead>
                      <TableHead className="text-center">状态</TableHead>
                      <TableHead className="text-center">消息数</TableHead>
                      <TableHead className="text-center">创建时间</TableHead>
                      <TableHead className="text-center">最后更新</TableHead>
                      <TableHead className="text-center">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((thread) => (
                      <TableRow key={thread.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">
                              {thread.user?.username || "未知用户"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-[200px] truncate text-sm">
                            {thread.title || "未命名会话"}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <span
                            className={`inline-block rounded-full px-2 py-0.5 text-xs ${
                              thread.health_status === 'normal'
                                ? "bg-green-100 text-green-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {thread.health_status === 'normal' ? '正常' : '异常'}
                          </span>
                        </TableCell>
                        <TableCell className="text-center text-sm">
                          {thread.turn_count}
                        </TableCell>
                        <TableCell className="text-center text-xs text-muted-foreground">
                          <div className="flex items-center justify-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {dayjs(thread.created_at).format("YYYY-MM-DD")}
                          </div>
                        </TableCell>
                        <TableCell className="text-center text-xs text-muted-foreground">
                          <div className="flex items-center justify-center gap-1">
                            <Clock className="h-3 w-3" />
                            {dayjs(thread.updated_at).format("YYYY-MM-DD HH:mm")}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenDetail(thread.id, thread.user)}
                            >
                              <FileText className="mr-1 h-3.5 w-3.5" />
                              详情
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* 分页 */}
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
      </div>

      {/* 线程详情对话框 */}
      <Dialog open={isDetailDialogOpen} onOpenChange={handleDetailDialogOpenChange}>
        <DialogContent className="max-w-5xl h-[85vh] flex flex-col p-0 gap-0 overflow-hidden">
          <DialogHeader className="px-6 py-4 border-b">
            <DialogTitle>{threadDetail?.title || "聊天详情"}</DialogTitle>
            <DialogDescription className="sr-only">
              查看聊天记录
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-hidden bg-slate-50/50">
            {detailLoading && (
              <div className="flex h-full items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                <span className="ml-2 text-sm text-slate-500">加载聊天记录中...</span>
              </div>
            )}

            {detailError && (
              <div className="p-6">
                <div className="rounded-lg border border-rose-200 bg-rose-50 p-4">
                  <div className="flex items-center">
                    <AlertCircle className="h-5 w-5 text-rose-500" />
                    <span className="ml-2 text-sm font-medium text-rose-700">加载失败</span>
                  </div>
                  <p className="mt-1 text-sm text-rose-600">无法加载聊天详情，请稍后重试</p>
                </div>
              </div>
            )}

            {!detailLoading && threadDetail && (
              <div className="h-full w-full flex flex-col">
                <ReadOnlyChatPanel
                  threadTurns={threadDetail.turns}
                  userAvatar={threadUserInfo?.avatar}
                  isLoading={detailLoading}
                />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AllThreadsPage;
