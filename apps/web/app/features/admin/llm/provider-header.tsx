import { Link } from "react-router";
import { FlaskConical } from "lucide-react";
import { toast } from "sonner";

import { Button } from "~/components/ui/button";
import { Switch } from "~/components/ui/switch";
import { ProviderIcon } from "~/components/provider-icon";
import { LLMStatus } from "~/lib/llm-types";
import { useUpdateProvider } from "~/features/admin/llm/hooks";

import type { LLMProvider } from "~/lib/llm-types";

interface ProviderHeaderProps {
  provider: LLMProvider;
}

export const ProviderHeader = ({ provider }: ProviderHeaderProps) => {
  const updateProvider = useUpdateProvider();

  const isEnabled = provider.status === LLMStatus.ENABLED;

  const handleToggle = async (checked: boolean) => {
    try {
      await updateProvider.mutateAsync({
        id: provider.id,
        payload: { status: checked ? LLMStatus.ENABLED : LLMStatus.DISABLED },
      });
      toast.success(checked ? "已启用" : "已禁用");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "操作失败");
    }
  };

  return (
    <div className="flex items-center gap-2 p-6 pb-4">
      <ProviderIcon type={provider.type} size={24} />
      <div className="flex-1 min-w-0">
        <h2 className="text-xl font-semibold truncate">{provider.name}</h2>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <Button asChild size="sm" variant="outline">
          <Link to={`/admin/llm-test?provider=${provider.id}`}>
            <FlaskConical className="mr-1.5 size-3.5" />
            Playground
          </Link>
        </Button>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {isEnabled ? "已启用" : "已禁用"}
          </span>
          <Switch
            checked={isEnabled}
            onCheckedChange={handleToggle}
            disabled={updateProvider.isPending}
          />
        </div>
      </div>
    </div>
  );
};
