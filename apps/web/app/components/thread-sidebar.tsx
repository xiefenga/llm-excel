import { toast } from 'sonner'
import { useState } from "react";
import { match } from "ts-pattern";
import { Link, useNavigate, useParams } from "react-router";
import { useMutation, useQuery } from '@tanstack/react-query'
import { FileSpreadsheet, Loader2, Clock, History, MoreHorizontal, Pencil, Trash2 } from "lucide-react";

import { cn, formatRelativeTime } from "~/lib/utils";
import { deleteThread, getThreads, renameThread } from '~/lib/api'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";

interface Props {
  isOpen: boolean;
  onClose?: () => void;
}

const ThreadSidebar = ({ isOpen, onClose }: Props) => {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [threadToDelete, setThreadToDelete] = useState<string | null>(null);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [threadToRename, setThreadToRename] = useState<{ id: string; title: string } | null>(null);
  const [newTitle, setNewTitle] = useState('');

  const navigate = useNavigate();
  const params = useParams();

  const { data: threads, isLoading, refetch } = useQuery({
    queryKey: ['threads'],
    queryFn: () => getThreads()
  })

  const { mutateAsync: mutateThreadDelete } = useMutation({
    mutationFn: (threadId: string) => deleteThread(threadId),
    onMutate: async (threadId: string) => {
      setDeletingId(threadId)
    },
    onSuccess: (_, threadId) => {
      toast.success("删除成功")
      refetch()
      if (params.id === threadId) {
        navigate("/threads");
      }
    },
    onSettled: () => {
      setDeletingId(null)
      setDeleteConfirmOpen(false)
      setThreadToDelete(null)
    },
    onError: () => {
      toast.error("删除失败")
    }
  })

  const { mutateAsync: mutateThreadRename, isPending: isRenaming } = useMutation({
    mutationFn: ({ threadId, title }: { threadId: string; title: string }) =>
      renameThread(threadId, title),
    onSuccess: () => {
      toast.success("重命名成功")
      refetch()
      setRenameDialogOpen(false)
      setThreadToRename(null)
      setNewTitle('')
    },
    onError: () => {
      toast.error("重命名失败")
    }
  })

  const handleDeleteClick = (e: React.MouseEvent, threadId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setThreadToDelete(threadId);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (threadToDelete) {
      await mutateThreadDelete(threadToDelete);
    }
  };

  const handleRenameClick = (e: React.MouseEvent, thread: { id: string; title: string }) => {
    e.preventDefault();
    e.stopPropagation();
    setThreadToRename(thread);
    setNewTitle(thread.title || '');
    setRenameDialogOpen(true);
  };

  const handleConfirmRename = async () => {
    if (threadToRename && newTitle.trim()) {
      await mutateThreadRename({ threadId: threadToRename.id, title: newTitle.trim() });
    }
  };

  return (
    <>
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-white/95 backdrop-blur-sm border-r border-gray-200 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 h-full",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-100">
            <div className="flex items-center gap-2 text-gray-600">
              <History className="w-4 h-4" />
              <span className="text-sm font-medium">历史任务</span>
            </div>
          </div>

          {/* Task List */}
          <div className="flex-1 overflow-y-auto">
            {match({ isLoading, threadCount: threads?.length })
              .with({ isLoading: true }, () => (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="w-5 h-5 animate-spin text-brand" />
                </div>
              ))
              .with({ isLoading: false, threadCount: 0 }, () => (
                <div className="p-4 text-center text-gray-500 h-full">
                  <FileSpreadsheet className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                  <p className="text-xs">还没有任务记录</p>
                </div>
              ))
              .with({ isLoading: false, }, () => (
                <div className="p-2 space-y-1">
                  {threads?.map((thread) => {
                    const isActive = params.id === thread.id;

                    const displayTitle = match(thread)
                      .when(
                        (t) => t.title !== null && t.title !== "",
                        (t) => t.title!
                      )
                      .when(
                        (t) => t.turn_count > 0,
                        (t) => `任务 #${t.turn_count}`
                      )
                      .otherwise(() => "新任务");

                    return (
                      <Link
                        key={thread.id}
                        to={`/threads/${thread.id}`}
                        onClick={onClose}
                        className={cn(
                          "group relative flex items-center gap-2 px-3 py-2.5 rounded-lg transition-all",
                          isActive
                            ? "bg-brand-muted/70 text-brand-dark"
                            : "hover:bg-gray-50 text-gray-700"
                        )}
                      >
                        {/* 任务信息 */}
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-medium truncate">
                            {displayTitle}
                          </h3>
                          <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                            <Clock className="w-3 h-3" />
                            <span>{formatRelativeTime(thread.updated_at)}</span>
                          </div>
                        </div>

                        {/* 更多按钮 */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              onClick={(e) => e.preventDefault()}
                              className={cn(
                                "opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-all shrink-0",
                                (deletingId === thread.id) && "opacity-100"
                              )}
                            >
                              {deletingId === thread.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <MoreHorizontal className="w-4 h-4" />
                              )}
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-32">
                            <DropdownMenuItem
                              onClick={(e) => handleRenameClick(e, { id: thread.id, title: displayTitle })}
                              className="gap-2 cursor-pointer"
                            >
                              <Pencil className="w-4 h-4" />
                              <span>重命名</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => handleDeleteClick(e, thread.id)}
                              className="gap-2 cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                              <span>删除</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </Link>
                    );
                  })}
                </div>
              ))
              .exhaustive()}
          </div>
        </div>
      </div>

      {/* 删除确认弹窗 */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除这个任务吗？此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {deletingId ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  删除中...
                </>
              ) : (
                '删除'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 重命名弹窗 */}
      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>重命名任务</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="请输入新名称"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newTitle.trim()) {
                  handleConfirmRename();
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameDialogOpen(false)}>
              取消
            </Button>
            <Button
              onClick={handleConfirmRename}
              disabled={!newTitle.trim() || isRenaming}
            >
              {isRenaming ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  保存中...
                </>
              ) : (
                '保存'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default ThreadSidebar;
