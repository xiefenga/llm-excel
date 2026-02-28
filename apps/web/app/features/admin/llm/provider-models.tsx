import { useState } from "react";
import { Plus, Search } from "lucide-react";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { LLMStatus } from "~/lib/llm-types";
import { useModels } from "~/features/admin/llm/hooks";
import { ModelItem } from "~/features/admin/llm/model-item";
import { AddModelDialog } from "~/features/admin/llm/add-model-dialog";

interface ProviderModelsProps {
  providerId: string;
}

export const ProviderModels = ({ providerId }: ProviderModelsProps) => {
  const { data: models, isLoading } = useModels(providerId);
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);

  const filtered = (models || []).filter(
    (m) =>
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.model_id.toLowerCase().includes(search.toLowerCase())
  );

  const enabled = filtered.filter((m) => m.status === LLMStatus.ENABLED);
  const disabled = filtered.filter((m) => m.status !== LLMStatus.ENABLED);

  return (
    <div className="px-6 py-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold">模型列表</h3>
        <Button size="sm" variant="outline" onClick={() => setAddOpen(true)}>
          <Plus className="size-3.5" />
          添加模型
        </Button>
      </div>

      {/* Search */}
      {(models?.length || 0) > 3 && (
        <div className="relative mb-3">
          <Search className="text-muted-foreground absolute left-2.5 top-1/2 size-4 -translate-y-1/2" />
          <Input
            placeholder="搜索模型..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>
      )}

      {isLoading ? (
        <div className="text-sm text-muted-foreground py-4 text-center">加载中...</div>
      ) : filtered.length === 0 ? (
        <div className="text-sm text-muted-foreground py-4 text-center">
          {search ? "没有匹配的模型" : "暂无模型"}
        </div>
      ) : (
        <div className="grid gap-2">
          {enabled.length > 0 && (
            <div className="grid gap-1.5">
              {enabled.length > 0 && disabled.length > 0 && (
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider py-1">
                  已启用 ({enabled.length})
                </div>
              )}
              {enabled.map((model) => (
                <ModelItem key={model.id} model={model} />
              ))}
            </div>
          )}

          {disabled.length > 0 && (
            <div className="grid gap-1.5">
              {enabled.length > 0 && disabled.length > 0 && (
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider py-1 mt-1">
                  已禁用 ({disabled.length})
                </div>
              )}
              {disabled.map((model) => (
                <ModelItem key={model.id} model={model} />
              ))}
            </div>
          )}
        </div>
      )}

      <AddModelDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        providerId={providerId}
      />
    </div>
  );
};
