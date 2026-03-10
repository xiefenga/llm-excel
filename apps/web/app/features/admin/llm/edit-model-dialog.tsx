import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { useUpdateModel } from "~/features/admin/llm/hooks";
import type { LLMModel } from "~/lib/llm-types";

interface EditModelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  model: LLMModel;
  providerType: string;
}

export const EditModelDialog = ({ open, onOpenChange, model, providerType }: EditModelDialogProps) => {
  const [name, setName] = useState("");
  const [modelId, setModelId] = useState("");
  const [maxTokens, setMaxTokens] = useState("");

  const updateModel = useUpdateModel(model.provider_id);


  // 当对话框打开时，初始化表单数据
  useEffect(() => {
    if (open && model) {
      setName(model.name);
      setModelId(model.model_id);
      setMaxTokens(model.limits?.max_tokens?.toString() || "");
    }
  }, [open, model]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("请输入模型名称");
      return;
    }
    if (!modelId.trim()) {
      toast.error("请输入模型 ID");
      return;
    }

    try {
      const limits: Record<string, unknown> = {};
      if (maxTokens.trim()) {
        const parsed = parseInt(maxTokens, 10);
        if (!isNaN(parsed) && parsed > 0) {
          limits.max_tokens = parsed;
        }
      }


      await updateModel.mutateAsync({
        id: model.id,
        payload: {
          name: name.trim(),
          model_id: modelId.trim(),
          limits: Object.keys(limits).length > 0 ? limits : undefined,
        },
      });
      toast.success("模型更新成功");
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "更新失败");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>编辑模型</DialogTitle>
            <DialogDescription>修改模型配置信息</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-model-name">名称</Label>
              <Input
                id="edit-model-name"
                placeholder="例如: GPT-4o"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-model-id">模型 ID</Label>
              <Input
                id="edit-model-id"
                placeholder="例如: gpt-4o"
                value={modelId}
                onChange={(e) => setModelId(e.target.value)}
              />
              <p className="text-muted-foreground text-xs">
                API 调用时使用的模型标识符
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-model-max-tokens">Max Tokens</Label>
              <Input
                id="edit-model-max-tokens"
                type="number"
                placeholder="例如: 128000"
                value={maxTokens}
                onChange={(e) => setMaxTokens(e.target.value)}
              />
              <p className="text-muted-foreground text-xs">
                可选，模型最大 Token 数
              </p>
            </div>

          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button type="submit" disabled={updateModel.isPending}>
              {updateModel.isPending ? "保存中..." : "保存"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
