/**
 * 用户文件列表页面
 * 管理员查看指定用户的所有上传文件
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router";
import { ArrowRight, File, Download, Calendar, HardDrive, Loader2, AlertCircle } from "lucide-react";
import { Checkbox } from "~/components/ui/checkbox";
import dayjs from "dayjs";

import { getUserFiles, type UserFileItem } from "~/lib/api";
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
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "~/components/ui/breadcrumb";

const UserFilesPage = () => {
  const { userId } = useParams<{ userId: string }>();
  const [offset, setOffset] = useState(0);
  const limit = 20;
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const canViewFiles = usePermission("file:read:all");


  // 获取用户文件列表
  const { data: filesData, isLoading, isError } = useQuery({
    queryKey: ["userFiles", userId, { limit, offset }],
    queryFn: () => getUserFiles(userId!, limit, offset),
    enabled: !!userId && canViewFiles,
  });

  // 格式化文件大小
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  // 获取文件类型图标
  const getFileType = (filename: string): string => {
    const ext = filename.split('.').pop()?.toLowerCase();
    if (!ext) return "文件";

    const typeMap: Record<string, string> = {
      'xlsx': 'Excel',
      'xls': 'Excel',
      'csv': 'CSV',
      'pdf': 'PDF',
      'doc': 'Word',
      'docx': 'Word',
      'txt': '文本',
      'json': 'JSON',
      'jpg': '图片',
      'jpeg': '图片',
      'png': '图片',
      'gif': '图片',
    };

    return typeMap[ext] || "文件";
  };

  // 批量下载
  const handleBatchDownload = () => {
    selectedIds.forEach((id) => {
      const file = items.find((f) => f.id === id);
      if (file) {
        const a = document.createElement("a");
        a.href = file.download_url;
        a.download = file.filename;
        a.target = "_blank";
        a.click();
      }
    });
  };

  const toggleAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(items.map((f) => f.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const toggleOne = (id: string, checked: boolean) => {
    const next = new Set(selectedIds);
    if (checked) {
      next.add(id);
    } else {
      next.delete(id);
    }
    setSelectedIds(next);
  };

  if (!canViewFiles) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-rose-500" />
          <h2 className="mt-4 text-lg font-semibold">权限不足</h2>
          <p className="mt-2 text-sm text-slate-600">
            您没有权限查看用户文件
          </p>
          <Button asChild variant="ghost" className="mt-4">
            <Link to="/admin/users">
              返回用户管理
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-amber-500" />
          <h2 className="mt-4 text-lg font-semibold">用户ID缺失</h2>
          <p className="mt-2 text-sm text-slate-600">
            未提供用户ID
          </p>
          <Button asChild variant="ghost" className="mt-4">
            <Link to="/admin/users">
              返回用户管理
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const items = filesData?.items ?? [];
  const total = filesData?.total ?? 0;
  const canPrev = offset > 0;
  const canNext = offset + limit < total;

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
              <BreadcrumbLink to="/admin/users">用户管理</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>文件</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-4 lg:px-6">

          {/* 文件列表 */}
          <div className="mb-6">
            <div className="mb-3 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Button asChild variant="ghost" size="sm">
                  <Link to="/admin/users">
                    <ArrowRight className="mr-1 h-4 w-4 rotate-180" />
                  </Link>
                </Button>
                <h2 className="text-sm font-semibold">文件列表</h2>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">
                  共 {total} 个文件
                </span>
                {selectedIds.size > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleBatchDownload}
                  >
                    <Download className="mr-1 h-3.5 w-3.5" />
                    批量下载 ({selectedIds.size})
                  </Button>
                )}
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
                <File className="mx-auto mb-3 h-8 w-8 text-slate-300" />
                该用户暂无上传文件
              </div>
            )}

            {!isLoading && items.length > 0 && (
              <div className="overflow-hidden rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow className="text-xs">
                      <TableHead className="w-10">
                        <Checkbox
                          checked={items.length > 0 && selectedIds.size === items.length}
                          onCheckedChange={toggleAll}
                        />
                      </TableHead>
                      <TableHead>文件名</TableHead>
                      <TableHead className="text-center">类型</TableHead>
                      <TableHead className="text-center">大小</TableHead>
                      <TableHead className="text-center">使用次数</TableHead>
                      <TableHead className="text-center">上传时间</TableHead>
                      <TableHead className="text-center">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((file) => (
                      <TableRow key={file.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedIds.has(file.id)}
                            onCheckedChange={(checked) => toggleOne(file.id, !!checked)}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <File className="h-4 w-4 text-slate-500" />
                            <div className="max-w-[250px] truncate text-sm">
                              {file.filename}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="inline-block rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">
                            {getFileType(file.filename)}
                          </span>
                        </TableCell>
                        <TableCell className="text-center text-sm">
                          <div className="flex items-center justify-center gap-1">
                            <HardDrive className="h-3 w-3" />
                            {formatFileSize(file.file_size)}
                          </div>
                        </TableCell>
                        <TableCell className="text-center text-sm">
                          {file.turn_count}
                        </TableCell>
                        <TableCell className="text-center text-xs text-muted-foreground">
                          <div className="flex items-center justify-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {dayjs(file.uploaded_at).format("YYYY-MM-DD HH:mm")}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => window.open(file.download_url, '_blank')}
                            >
                              <Download className="mr-1 h-3.5 w-3.5" />
                              下载
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
    </div>
  );
};

export default UserFilesPage;