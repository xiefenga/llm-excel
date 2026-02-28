import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "~/components/ui/button";
import { Switch } from "~/components/ui/switch";
import { LLMStatus } from "~/lib/llm-types";
import type { LLMModel } from "~/lib/llm-types";
import { useUpdateModel, useDeleteModel } from "~/features/admin/llm/hooks";

interface ModelItemProps {
  model: LLMModel;
}

export const ModelItem = ({ model }: ModelItemProps) => {
  const updateModel = useUpdateModel(model.provider_id);
  const deleteModelMutation = useDeleteModel(model.provider_id);

  const isEnabled = model.status === LLMStatus.ENABLED;
  const maxTokens = model.limits?.max_tokens as number | undefined;

  const handleToggle = async (checked: boolean) => {
    try {
      await updateModel.mutateAsync({
        id: model.id,
        payload: { status: checked ? LLMStatus.ENABLED : LLMStatus.DISABLED },
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "操作失败");
    }
  };

  const handleDelete = async () => {
    if (!confirm(`确定要删除模型 "${model.name}" 吗？`)) {
      return;
    }
    try {
      await deleteModelMutation.mutateAsync(model.id);
      toast.success("删除成功");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "删除失败");
    }
  };

  return (
    <div className="flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors hover:bg-accent/30">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate">{model.name}</span>
          <code className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-xs font-mono text-muted-foreground">
            {model.model_id}
          </code>
        </div>
        {maxTokens && (
          <p className="text-xs text-muted-foreground mt-0.5">
            Max Tokens: {maxTokens.toLocaleString()}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Switch
          checked={isEnabled}
          onCheckedChange={handleToggle}
          disabled={updateModel.isPending}
        />
        <Button
          size="icon-sm"
          variant="ghost"
          className="text-muted-foreground hover:text-destructive"
          onClick={handleDelete}
          disabled={deleteModelMutation.isPending}
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>
    </div>
  );
};
