import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Download } from "lucide-react";
import { Link } from "react-router";

import { getBTracks, exportBTracks } from "~/lib/api";
import { Button } from "~/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import dayjs from "dayjs";
import { usePermission } from "~/hooks/use-permission";
import { Permissions } from "~/lib/permissions";

const toPrettyJson = (value: unknown) => {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
};

const BTrackPage = () => {
  const [offset, setOffset] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const limit = 20;

  const fixedParam = undefined;

  // 权限检查
  const canExport = usePermission(Permissions.BTRACK_EXPORT);
  const canViewAll = usePermission(Permissions.BTRACK_READ_ALL);

  const { data, isLoading, isFetching, isError, error, refetch } = useQuery({
    queryKey: ["btracks", { limit, offset, fixed: fixedParam }],
    queryFn: () => getBTracks({ limit, offset, fixed: fixedParam }),
  });

  const items = data?.items ?? [];

  const canPrev = offset > 0;
  const canNext = data ? offset + limit < data.total : false;

  const totalPages = data ? Math.max(Math.ceil(data.total / limit), 1) : 1;

  const handleExport = async () => {
    try {
      setIsExporting(true);
      await exportBTracks({ fixed: fixedParam });
    } catch (err) {
      alert((err as Error).message || "导出失败");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center gap-3 border-b px-4 py-3">
        <Button asChild size="icon-sm" variant="ghost">
          <Link to="/admin">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <h1 className="flex-1 text-base font-semibold">异常追踪</h1>
        {canExport && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={isExporting || isLoading}
          >
            {isExporting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                导出中...
              </>
            ) : (
              <>
                <Download className="h-3.5 w-3.5" />
                导出
              </>
            )}
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="flex w-full flex-col gap-4 px-4 py-4 lg:px-6">

          <section className="grid gap-4">
            {isLoading && (
              <div className="flex items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white/70 py-16 text-slate-500">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                正在加载异常轨迹...
              </div>
            )}

            {isError && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-600">
                {(error as Error)?.message || "获取失败，请稍后重试"}
              </div>
            )}

            {!isLoading && items.length === 0 && !isError && (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white/70 p-10 text-center text-slate-500">
                暂无异常记录
              </div>
            )}

            {!isLoading && items.length > 0 && (
              <div className="overflow-hidden rounded-xl border border-white/70 bg-white/85 shadow-sm">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/80 text-xs uppercase tracking-[0.2em] text-slate-400">
                      <TableHead className="text-center">用户</TableHead>
                      <TableHead className="text-center">执行流程</TableHead>
                      <TableHead className="text-center">提示词</TableHead>
                      <TableHead className="text-center">错误信息</TableHead>
                      <TableHead className="text-center">修复状态</TableHead>
                      <TableHead className="text-center">创建时间</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => (
                      <TableRow key={item.id} className="align-top">
                        <TableCell className="text-slate-500">
                          <div
                            className="max-w-[180px] truncate"
                            title={item.reporter_name}
                          >
                            {item.reporter_name}
                          </div>
                        </TableCell>
                        <TableCell>
                          {(() => {
                            const text = toPrettyJson(item.steps);
                            return (
                              <div
                                className="max-w-[320px] truncate rounded-md bg-slate-50 p-2 text-xs text-slate-600"
                                title={text}
                              >
                                {text}
                              </div>
                            );
                          })()}
                        </TableCell>
                        <TableCell>
                          <div
                            className="max-w-[320px] truncate rounded-md bg-slate-50 p-2 text-xs text-slate-600"
                            title={item.generation_prompt}
                          >
                            {item.generation_prompt}
                          </div>
                        </TableCell>
                        <TableCell>
                          {(() => {
                            const text = toPrettyJson(item.errors);
                            return (
                              <div
                                className="max-w-[260px] truncate rounded-md bg-rose-50/70 p-2 text-xs text-rose-600"
                                title={text}
                              >
                                {text}
                              </div>
                            );
                          })()}
                        </TableCell>
                        <TableCell className="text-slate-500 text-center">
                          {item.fixed ? "已修复" : "未修复"}
                        </TableCell>
                        <TableCell className="text-slate-500">
                          <div className="max-w-[180px] truncate" title={item.created_at}>
                            {dayjs(item.created_at).format("YYYY-MM-DD HH:mm:ss")}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </section>

          <section className="flex items-center justify-between px-4 py-3 text-sm text-slate-500">
            <div>
              第 {Math.floor(offset / limit) + 1} 页 · 共 {totalPages} 页
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
    </div>
  );
};

export default BTrackPage;
