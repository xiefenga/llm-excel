import { useState, useEffect, useCallback } from "react";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { Link } from "react-router";
import { toast } from "sonner";

import { Button } from "~/components/ui/button";
import { usePermission } from "~/hooks/use-permission";
import { Permissions } from "~/lib/permissions";
import { LLMStatus } from "~/lib/llm-types";
import type { LLMStageRoute, LLMProvider } from "~/lib/llm-types";
import {
  useProviders,
  useStageRoutes,
  useUpsertStageRoute,
  useDeleteStageRoute,
} from "~/features/admin/llm/hooks";
import { StageRow } from "./stage-row";

/** Stage definitions with labels and descriptions */
export const STAGES = [
  {
    key: "default",
    label: "Default",
    description: "默认阶段，当其他阶段未配置时作为回退",
  },
  {
    key: "analyze",
    label: "Analyze",
    description: "需求分析阶段，解析用户的自然语言需求",
  },
  {
    key: "generate",
    label: "Generate",
    description: "操作生成阶段，生成结构化 JSON 操作指令",
  },
  {
    key: "title",
    label: "Title",
    description: "标题生成阶段，为对话线程生成标题",
  },
] as const;

interface StageRowDraft {
  providerId: string;
  modelId: string;
  dirty: boolean;
}

type DraftMap = Record<string, StageRowDraft>;

const buildDraftFromRoutes = (
  routes: LLMStageRoute[],
  providers: LLMProvider[]
): DraftMap => {
  const map: DraftMap = {};
  for (const stage of STAGES) {
    const route = routes.find((r) => r.stage === stage.key);
    if (route) {
      // Verify the provider exists
      const providerExists = providers.some((p) => p.id === route.provider_id);
      map[stage.key] = {
        providerId: providerExists ? route.provider_id : "",
        modelId: providerExists ? route.model_id : "",
        dirty: false,
      };
    } else {
      map[stage.key] = { providerId: "", modelId: "", dirty: false };
    }
  }
  return map;
};

const StageRoutesPage = () => {
  const canManage = usePermission(Permissions.SYSTEM_SETTINGS);
  const { data: providers = [] } = useProviders();
  const { data: routes = [], isLoading } = useStageRoutes();
  const upsertRoute = useUpsertStageRoute();
  const deleteRoute = useDeleteStageRoute();

  const enabledProviders = providers.filter(
    (p) => p.status === LLMStatus.ENABLED
  );

  const [drafts, setDrafts] = useState<DraftMap>(() =>
    buildDraftFromRoutes(routes, providers)
  );

  // Sync drafts when routes or providers load
  useEffect(() => {
    setDrafts((prev) => {
      const next = buildDraftFromRoutes(routes, providers);
      // Preserve dirty drafts
      for (const key of Object.keys(next)) {
        if (prev[key]?.dirty) {
          next[key] = prev[key];
        }
      }
      return next;
    });
  }, [routes, providers]);

  const updateDraft = useCallback(
    (stage: string, field: "providerId" | "modelId", value: string) => {
      setDrafts((prev) => {
        const current = prev[stage] || {
          providerId: "",
          modelId: "",
          dirty: false,
        };
        const updated = { ...current, [field]: value, dirty: true };
        // Reset modelId when provider changes
        if (field === "providerId") {
          updated.modelId = "";
        }
        return { ...prev, [stage]: updated };
      });
    },
    []
  );

  const handleSave = async (stage: string) => {
    const draft = drafts[stage];
    if (!draft?.providerId || !draft?.modelId) {
      toast.error("请选择 Provider 和 Model");
      return;
    }
    try {
      await upsertRoute.mutateAsync({
        stage,
        payload: {
          provider_id: draft.providerId,
          model_id: draft.modelId,
          is_active: true,
        },
      });
      setDrafts((prev) => ({
        ...prev,
        [stage]: { ...prev[stage], dirty: false },
      }));
      toast.success(`${stage} 阶段路由已保存`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "保存失败");
    }
  };

  const handleDelete = async (stage: string) => {
    try {
      await deleteRoute.mutateAsync(stage);
      setDrafts((prev) => ({
        ...prev,
        [stage]: { providerId: "", modelId: "", dirty: false },
      }));
      toast.success(`${stage} 阶段路由已清除`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "删除失败");
    }
  };

  if (!canManage) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-rose-500" />
          <h2 className="mt-4 text-lg font-semibold">权限不足</h2>
          <p className="mt-2 text-sm text-slate-600">
            您没有权限访问阶段路由配置
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        加载中...
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center gap-3 border-b px-4 py-3">
        <Button asChild size="icon-sm" variant="ghost">
          <Link to="/admin">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <h1 className="text-base font-semibold">阶段路由配置</h1>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Stage rows */}
        <div className="px-6 py-4 space-y-6">
        {STAGES.map((stage) => (
          <StageRow
            key={stage.key}
            stage={stage}
            draft={
              drafts[stage.key] || {
                providerId: "",
                modelId: "",
                dirty: false,
              }
            }
            route={routes.find((r) => r.stage === stage.key)}
            providers={enabledProviders}
            onProviderChange={(v) => updateDraft(stage.key, "providerId", v)}
            onModelChange={(v) => updateDraft(stage.key, "modelId", v)}
            onSave={() => handleSave(stage.key)}
            onDelete={() => handleDelete(stage.key)}
            isSaving={upsertRoute.isPending}
            isDeleting={deleteRoute.isPending}
          />
        ))}
      </div>

      {/* Info */}
      <div className="px-6 pb-6">
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
          <p className="text-xs text-amber-800">
            未单独配置的阶段将自动使用 Default 阶段的 Provider 和模型。
          </p>
        </div>
      </div>
      </div>
    </div>
  );
};

export default StageRoutesPage;
