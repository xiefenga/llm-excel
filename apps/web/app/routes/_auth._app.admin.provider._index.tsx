import { Brain } from "lucide-react";
import { useOutletContext } from "react-router";

import type { LLMProvider } from "~/lib/llm-types";

interface OutletContext {
  providers: LLMProvider[];
}

const AdminProviderIndex = () => {
  const { providers } = useOutletContext<OutletContext>();

  return (
    <div className="flex h-full items-center justify-center text-muted-foreground">
      <div className="text-center">
        <Brain className="mx-auto size-12 opacity-20" />
        <p className="mt-3 text-sm">
          {providers.length === 0
            ? "点击左侧 + 按钮添加第一个 Provider"
            : "选择一个 Provider 查看详情"}
        </p>
      </div>
    </div>
  );
};

export default AdminProviderIndex;
