import { useNavigate } from "react-router";
import { useState, useRef, useEffect } from "react";
import { Cloud, Info, Sparkles } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "~/components/ui/resizable";

import ChatInput from "~/components/chat-input";
import MessageList from "~/components/llm-chat/message-list";

import { useExcelChat, type ChatMessage, type UserMessage } from "~/hooks/use-excel-chat";

import { getThreadDetail, uploadFiles } from "~/lib/api";


import { type FileItem } from "~/components/file-item-badge";
import type { Route } from "./+types/_auth._app.threads.($id)";

export function meta({ }: Route.MetaArgs) {
  return [
    { title: "新对话 - LLM Excel" },
    { name: "description", content: "使用 LLM 处理 Excel 数据" },
  ];
}

const ThreadChatPage = ({ params: { id: threadId } }: Route.ComponentProps) => {

  const initThreadId = useRef<string>('')

  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [fileItems, setFileItems] = useState<FileItem[]>([]);
  const [outputFile, setOutputFile] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 获取所有成功上传的文件 IDs
  const fileIds = fileItems.filter(item => item.status === "success" && item.fileId).map(item => item.fileId!);

  const queryClient = useQueryClient()

  const { messages, resetChat, sendMessage, setMessages, clearMessages } = useExcelChat({
    onStart: () => {
      setQuery("");
      setFileItems([])
    },
    onExecuteSuccess: (newOutputFile, formulas, newThreadId) => {
      setOutputFile(newOutputFile);
      // 如果有新的 thread_id，跳转到详情页
      if (newThreadId && !threadId) {
        initThreadId.current = newThreadId
        navigate(`/threads/${newThreadId}`);
      }
    },
    onRefreshThread: () => {
      queryClient.invalidateQueries({ queryKey: ['threads'] })
    },
  });

  const { mutate } = useMutation({
    mutationFn: (threadId: string) => getThreadDetail(threadId),
    onSuccess: (thread) => {
      console.log(thread)
      const messages: ChatMessage[] = [];

      thread.turns.forEach((turn) => {
        // 添加用户消息
        messages.push({
          id: `${turn.id}-user`,
          role: "user",
          content: turn.user_query,
          files: turn.files
        } satisfies UserMessage);

        // 确定 assistant 消息的状态
        let status: "pending" | "streaming" | "done" | "error" = "done";
        let processState: "loading" | "analyzing" | "generating" | "executing" = "executing";

        if (turn.status === "failed") {
          status = "error";
        } else if (turn.status === "processing") {
          status = "streaming";
        } else if (turn.status === "pending") {
          status = "pending";
        }

        // 根据已有数据确定处理阶段
        if (turn.result?.output_file || turn.result?.formulas) {
          processState = "executing";
        } else if (turn.operations_json) {
          processState = "generating";
        } else if (turn.analysis) {
          processState = "analyzing";
        } else {
          processState = "loading";
        }

        // 添加助手消息
        const assistantMessage: ChatMessage = {
          id: `${turn.id}-assistant`,
          role: "assistant",
          processState,
          status,
          analysis: turn.analysis || undefined,
          operations: turn.operations_json || undefined,
          outputFile: turn.result?.output_file_path || turn.result?.output_file || undefined,
          formulas: turn.result?.formulas ? JSON.stringify(turn.result.formulas) : undefined,
          error: turn.error_message || undefined,
          steps: {
            loading: turn.status === "completed" ? "done" : turn.status === "failed" ? "error" : "start",
            analyzing: turn.analysis ? "done" : undefined,
            generating: turn.operations_json ? "done" : undefined,
            executing: turn.result ? "done" : undefined,
          },
        };

        messages.push(assistantMessage);
      });

      setMessages(messages);
    }
  })

  useEffect(() => {
    if (threadId) {
      // 直接切换历史会话
      if (!initThreadId.current) {
        clearMessages()
        mutate(threadId)
      } else {
        initThreadId.current = ''
      }
    } else {
      clearMessages()
    }
  }, [threadId, mutate, clearMessages])

  // 上传单个文件
  const uploadSingleFile = async (fileItem: FileItem, index: number) => {
    setFileItems(prev => {
      const updated = [...prev];
      updated[index] = { ...fileItem, status: "uploading", progress: 0 };
      return updated;
    });

    try {
      const result = await uploadFiles([fileItem.file], (progress) => {
        setFileItems(prev => {
          const updated = [...prev];
          updated[index] = { ...updated[index], progress };
          return updated;
        });
      });

      if (result && result.length > 0) {
        setFileItems(prev => {
          const updated = [...prev];
          updated[index] = {
            ...updated[index],
            status: "success",
            progress: 100,
            fileId: result[0].id,
            path: result[0].path,
          };
          return updated;
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "上传失败";
      setFileItems(prev => {
        const updated = [...prev];
        updated[index] = {
          ...updated[index],
          status: "error",
          error: errorMessage,
        };
        return updated;
      });
    }
  };

  // 上传多个文件
  const uploadFilesBatch = async (files: File[]) => {
    const newFileItems: FileItem[] = files.map(file => ({
      file,
      status: "uploading" as const,
      progress: 0,
    }));

    setFileItems(prev => [...prev, ...newFileItems]);

    const startIndex = fileItems.length;
    for (let i = 0; i < files.length; i++) {
      await uploadSingleFile(newFileItems[i], startIndex + i);
    }
  };

  // 重试上传文件
  const retryUploadFile = async (index: number) => {
    const fileItem = fileItems[index];
    if (fileItem) {
      await uploadSingleFile(fileItem, index);
    }
  };

  // 删除文件（通过索引）
  const removeFile = (index: number) => {
    const fileItem = fileItems[index];
    if (fileItem?.status === "uploading") {
      return;
    }

    setFileItems(prev => prev.filter((_, idx) => idx !== index));
  };

  // 删除文件（通过 fileId）
  const removeFileById = (fileId: string) => {
    const index = fileItems.findIndex(item => item.fileId === fileId);
    if (index !== -1) {
      removeFile(index);
    }
  };

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    const excelFiles = selectedFiles.filter(
      (f) => f.name.endsWith(".xlsx") || f.name.endsWith(".xls")
    );

    if (excelFiles.length > 0) {
      await uploadFilesBatch(excelFiles);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const droppedFiles = Array.from(e.dataTransfer.files);
    const excelFiles = droppedFiles.filter(
      (f) => f.name.endsWith(".xlsx") || f.name.endsWith(".xls")
    );
    if (excelFiles.length > 0) {
      await uploadFilesBatch(excelFiles);
    }
  };

  const onPasteFiles = async (files: File[], e: React.ClipboardEvent) => {
    const excelFiles = files.filter(
      (f) => f.name.endsWith(".xlsx") || f.name.endsWith(".xls")
    );

    if (excelFiles.length > 0) {
      e.preventDefault();
      await uploadFilesBatch(excelFiles);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleUploadAreaClick = () => {
    fileInputRef.current?.click();
  };


  return (
    <div className="h-full flex flex-col">
      <main className="flex-1 h-0 flex w-full overflow-hidden">
        <ResizablePanelGroup direction="horizontal" className="h-full w-full">
          {/* left: LLM Chat*/}
          <ResizablePanel defaultSize={40}>
            <div className="h-full flex flex-col w-full bg-linear-to-br from-white via-emerald-50/20 to-teal-50/20">
              <div className="flex-1 overflow-y-auto px-6 py-4">
                <MessageList
                  messages={messages}
                  emptyPlaceholder={
                    <div className="flex-1 flex flex-col px-6 mt-2 gap-6 overflow-y-auto">
                      <div className="flex-1 flex flex-col gap-4">
                        {/* Welcome Message */}
                        <div className="text-center py-8">
                          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-linear-to-br from-emerald-100 to-teal-100 mb-4">
                            <Sparkles className="w-8 h-8 text-emerald-600" />
                          </div>
                          <h2 className="text-2xl font-bold bg-linear-to-r from-emerald-700 to-teal-700 bg-clip-text text-transparent mb-2">
                            开始你的 Excel 智能分析
                          </h2>
                          <p className="text-gray-600 text-sm">
                            上传文件后，用自然语言描述你的需求
                          </p>
                        </div>

                        {/* Upload Area */}
                        <div
                          onClick={handleUploadAreaClick}
                          onDragOver={handleDragOver}
                          onDrop={handleDrop}
                          className="bg-white border-2 border-dashed border-gray-300 rounded-2xl p-12 flex flex-col items-center justify-center gap-4 cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/30 transition-all min-h-[280px] shadow-sm hover:shadow-md"
                        >
                          <div className="w-20 h-20 rounded-full bg-linear-to-br from-emerald-100 to-teal-100 flex items-center justify-center">
                            <Cloud className="w-10 h-10 text-emerald-600" />
                          </div>
                          <div className="text-center">
                            <p className="text-gray-700 font-medium mb-1">
                              点击此处或拖拽文件上传
                            </p>
                            <p className="text-gray-500 text-sm">
                              支持 .xlsx、.xls、.csv 格式
                            </p>
                          </div>
                        </div>

                        {/* Upload Instructions */}
                        <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                              <Info className="w-5 h-5 text-emerald-600" />
                            </div>
                            <div className="flex-1">
                              <h3 className="font-semibold text-gray-900 mb-2">使用说明</h3>
                              <ul className="text-sm text-gray-600 space-y-2">
                                <li className="flex items-start gap-2">
                                  <span className="text-emerald-600 font-bold mt-0.5">✓</span>
                                  <span>支持上传多个 Excel 文件，系统会自动识别表结构</span>
                                </li>
                                <li className="flex items-start gap-2">
                                  <span className="text-emerald-600 font-bold mt-0.5">✓</span>
                                  <span>用自然语言描述需求，AI 会自动生成处理方案</span>
                                </li>
                                <li className="flex items-start gap-2">
                                  <span className="text-emerald-600 font-bold mt-0.5">✓</span>
                                  <span>支持多轮对话，可以基于前一轮结果继续处理</span>
                                </li>
                              </ul>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  }
                />
              </div>

              {/* input */}
              <ChatInput
                fileItems={fileItems}
                onRemoveFile={removeFileById}
                className="p-6 pt-2 bg-white/80 backdrop-blur-sm"
                text={query}
                onTextChange={setQuery}
                onSubmit={() => sendMessage({ text: query, files: fileItems.map(item => ({ id: item.fileId!, filename: item.file.name, path: item.path! })) })}
                onPasteFiles={onPasteFiles}
                placeholder={fileIds.length > 0 ? "请输入对于上传文件的任何分析处理需求..." : "请先上传 Excel 文件..."}
              />
            </div>
          </ResizablePanel>
          <ResizableHandle withHandle />
        </ResizablePanelGroup>
      </main>

      <input
        multiple
        type="file"
        className="hidden"
        ref={fileInputRef}
        onChange={onFileChange}
        accept=".xlsx,.xls,.csv"
      />
    </div>
  );
};


export default ThreadChatPage;
