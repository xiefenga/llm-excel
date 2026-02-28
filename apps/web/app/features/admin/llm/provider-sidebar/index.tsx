import { useParams } from "react-router";

import { LLMStatus } from "~/lib/llm-types";
import type { LLMProvider } from "~/lib/llm-types";
import { ProviderItem } from "./provider-item";

interface ProviderSidebarProps {
  providers: LLMProvider[];
  isLoading: boolean;
}

export const ProviderSidebar = ({ providers, isLoading }: ProviderSidebarProps) => {
  const { providerId: selectedId } = useParams();

  const enabled = providers.filter((p) => p.status === LLMStatus.ENABLED);
  const disabled = providers.filter((p) => p.status !== LLMStatus.ENABLED);

  return (
    <div className="flex h-full w-70 shrink-0 flex-col border-r">
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
            加载中...
          </div>
        ) : providers.length === 0 ? (
          <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
            暂无 Provider
          </div>
        ) : (
          <>
            {enabled.length > 0 && (
              <div>
                <div className="px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  已启用 ({enabled.length})
                </div>
                {enabled.map((provider) => (
                  <ProviderItem
                    key={provider.id}
                    provider={provider}
                    isSelected={selectedId === provider.id}
                  />
                ))}
              </div>
            )}

            {disabled.length > 0 && (
              <div>
                <div className="px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  已禁用 ({disabled.length})
                </div>
                {disabled.map((provider) => (
                  <ProviderItem
                    key={provider.id}
                    provider={provider}
                    isSelected={selectedId === provider.id}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

