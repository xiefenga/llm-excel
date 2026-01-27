import { useNavigate } from "react-router";
import { useState, useRef, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { FileSpreadsheet, Loader2, X, Cloud, Info, Check, RefreshCw, Sparkles } from "lucide-react";

import { Button } from "~/components/ui/button";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "~/components/ui/resizable";

import ChatInput from "~/components/chat-input";
import ExcelPreview from "~/components/excel-preview";
import MessageList from "~/components/llm-chat/message-list";

import { useExcelChat } from "~/hooks/use-excel-chat";

import { cn } from "~/lib/utils";
import { uploadFiles } from "~/lib/api";
import { type FileItem } from "~/components/file-item-badge";

const ThreadChat = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [fileItems, setFileItems] = useState<FileItem[]>([]);
  const [selectedFileIndex, setSelectedFileIndex] = useState<number>(0);
  const [leftPanelTab, setLeftPanelTab] = useState<"input" | "output">("input");
  const [outputFile, setOutputFile] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 获取所有成功上传的文件 IDs
  const fileIds = fileItems.filter(item => item.status === "success" && item.fileId).map(item => item.fileId!);

  const queryClient = useQueryClient()

  const { messages, resetChat, sendMessage, threadId } = useExcelChat({
    onStart: () => {
      setQuery("");
    },
    onExecuteSuccess: (newOutputFile, formulas, newThreadId) => {
      setLeftPanelTab("output");
      setOutputFile(newOutputFile);
      // 如果有新的 thread_id，跳转到详情页
      if (newThreadId && !threadId) {
        navigate(`/threads/${newThreadId}`);
      }
    },
    onRefreshThread: () => {
      queryClient.invalidateQueries({ queryKey: ['threads'] })
    },
  });

  // 确保选中的文件索引始终有效
  useEffect(() => {
    if (fileItems.length > 0 && selectedFileIndex >= fileItems.length) {
      setSelectedFileIndex(0);
    }
  }, [fileItems.length, selectedFileIndex]);

  useEffect(() => {
    if (!outputFile && leftPanelTab === "output") {
      setLeftPanelTab("input");
    }
  }, [outputFile, leftPanelTab]);

  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage && lastMessage.role === "assistant") {
      setLeftPanelTab("output");
    }
  }, [messages]);

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

    setFileItems(prev => {
      const updated = prev.filter((_, idx) => idx !== index);
      if (index === selectedFileIndex && updated.length > 0) {
        setSelectedFileIndex(Math.max(0, index - 1));
      }
      return updated;
    });
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
          {/* left: Excel Preview */}
          <ResizablePanel defaultSize={60}>
            <div className="border-r border-gray-200 bg-white flex flex-col overflow-hidden flex-1 h-full">
              {/* 顶层 Tab 切换 */}
              <div className="border-b border-gray-200 flex bg-linear-to-r from-white to-emerald-50/30">
                <button
                  onClick={() => setLeftPanelTab("input")}
                  className={cn(
                    "px-6 py-3 text-sm font-medium border-b-2 transition-all",
                    leftPanelTab === "input"
                      ? "border-emerald-600 text-emerald-900 bg-emerald-50/50"
                      : "border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50/50"
                  )}
                >
                  输入文件
                </button>
                <button
                  onClick={() => setLeftPanelTab("output")}
                  className={cn(
                    "px-6 py-3 text-sm font-medium border-b-2 transition-all",
                    leftPanelTab === "output"
                      ? "border-emerald-600 text-emerald-900 bg-emerald-50/50"
                      : "border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50/50",
                    !outputFile && "opacity-50 cursor-not-allowed"
                  )}
                  disabled={!outputFile}
                >
                  处理结果
                </button>
              </div>

              {/* 输入文件 Tab 内容 */}
              {leftPanelTab === "input" && (
                <>
                  {/* 文件 Tab 列表 */}
                  <div className="border-b border-gray-200 overflow-x-auto bg-white">
                    <div className="flex min-w-0">
                      {fileItems.map((fileItem, idx) => (
                        <div
                          key={idx}
                          className={cn(
                            "flex items-center border-b-2 transition-colors",
                            selectedFileIndex === idx
                              ? "border-emerald-600 bg-emerald-50/30"
                              : "border-transparent"
                          )}
                        >
                          <button
                            onClick={() => setSelectedFileIndex(idx)}
                            className={cn(
                              "px-4 py-3 flex items-center gap-2 whitespace-nowrap min-w-0 flex-1",
                              selectedFileIndex === idx
                                ? "text-emerald-900"
                                : "text-gray-600 hover:text-gray-900 hover:bg-gray-50/50"
                            )}
                          >
                            <FileSpreadsheet className="w-4 h-4 shrink-0" />
                            <span className="text-sm font-medium truncate">{fileItem.file.name}</span>
                            {fileItem.status === "uploading" && (
                              <Loader2 className="w-3 h-3 shrink-0 animate-spin ml-1" />
                            )}
                            {fileItem.status === "success" && (
                              <Check className="w-3 h-3 shrink-0 text-emerald-600 ml-1" />
                            )}
                            {fileItem.status === "error" && (
                              <X className="w-3 h-3 shrink-0 text-red-500 ml-1" />
                            )}
                          </button>
                          {fileItem.status !== "uploading" && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                removeFile(idx);
                              }}
                              className="px-2 py-3 text-gray-400 hover:text-red-500 transition-colors shrink-0"
                              title="删除文件"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* 预览内容区域 */}
                  <div className="flex-1 overflow-y-auto p-4 h-0 bg-linear-to-br from-white to-gray-50/50">
                    {fileItems[selectedFileIndex] && (() => {
                      const currentFile = fileItems[selectedFileIndex];
                      return (
                        <div className="h-full">
                          {currentFile.status === "uploading" && (
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 text-sm text-gray-700">
                                <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                                <span>正在上传...</span>
                              </div>
                              <div className="relative h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                  className="absolute top-0 left-0 h-full bg-linear-to-r from-emerald-500 to-teal-500 transition-all duration-300 ease-out"
                                  style={{ width: `${currentFile.progress}%` }}
                                />
                              </div>
                              <p className="text-xs text-gray-500">{currentFile.progress}%</p>
                            </div>
                          )}

                          {currentFile.status === "success" && (
                            <ExcelPreview
                              className="w-full h-full"
                              fileUrl={`/api${currentFile.path!}`}
                            />
                          )}

                          {currentFile.status === "error" && (
                            <div className="space-y-3">
                              <div className="flex items-center gap-2 text-sm text-red-700">
                                <X className="w-4 h-4" />
                                <span>上传失败</span>
                              </div>
                              <div className="text-xs text-gray-600 bg-red-50 border border-red-200 rounded-lg p-3">
                                {currentFile.error || "上传失败，请重试"}
                              </div>
                              <Button
                                onClick={() => retryUploadFile(selectedFileIndex)}
                                className="w-full bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white"
                                size="sm"
                              >
                                <RefreshCw className="w-4 h-4 mr-2" />
                                重试上传
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </>
              )}

              {/* 处理结果 Tab 内容 */}
              {leftPanelTab === "output" && (
                <div className="flex-1 overflow-y-auto p-4 h-0 bg-linear-to-br from-white to-emerald-50/30">
                  {outputFile && (
                    <ExcelPreview
                      className="w-full h-full"
                      fileUrl={`/api/${outputFile}`}
                    />
                  )}
                  {!outputFile && (
                    <div className="flex items-center justify-center h-full text-gray-500">
                      <div className="text-center">
                        <FileSpreadsheet className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                        <p className="text-sm">暂无处理结果</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </ResizablePanel>
          <ResizableHandle withHandle />
          {/* right: LLM Chat */}
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
              <div className="w-full p-6 bg-white/80 backdrop-blur-sm border-t border-gray-200">
                <ChatInput
                  fileItems={fileItems}
                  onRemoveFile={removeFileById}
                  text={query}
                  onTextChange={setQuery}
                  onSubmit={() => sendMessage({ text: query, files: fileIds })}
                  onPasteFiles={onPasteFiles}
                  placeholder={fileIds.length > 0 ? "请输入对于上传文件的任何分析处理需求..." : "请先上传 Excel 文件..."}
                />
              </div>
            </div>
          </ResizablePanel>
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

export default ThreadChat;
