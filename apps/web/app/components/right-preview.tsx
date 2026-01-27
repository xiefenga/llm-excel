import React from 'react'
import { ResizablePanel } from './ui/resizable';

const RightPreview = () => {
  return (
    <ResizablePanel defaultSize={60}>
      <div className="bg-white flex flex-col overflow-hidden flex-1 h-full">
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
  )
}

export default RightPreview