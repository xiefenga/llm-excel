import { useOutletContext } from "react-router";

import { Brain } from "lucide-react";
import { ProviderHeader } from "~/features/admin/llm/provider-header";
import { ProviderCredentials } from "~/features/admin/llm/provider-credentials";
import { ProviderModels } from "~/features/admin/llm/provider-models";

import type { LLMProvider } from "~/lib/llm-types";
import type { Route } from './+types/_auth._app.admin.provider.$providerId'

interface OutletContext {
  providers: LLMProvider[];
}

const AdminProviderDetail = ({ params: { providerId }}: Route.ComponentProps) => {
  const { providers } = useOutletContext<OutletContext>();

  const provider = providers.find((p) => p.id === providerId);

  if (!provider) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        <div className="text-center">
          <Brain className="mx-auto size-12 opacity-20" />
          <p className="mt-3 text-sm">Provider 不存在或已被删除</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <ProviderHeader provider={provider} />
      <ProviderCredentials provider={provider} />
      <ProviderModels providerId={provider.id} />
    </div>
  );
};

export default AdminProviderDetail;
