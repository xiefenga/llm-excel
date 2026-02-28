import { Link, Outlet } from "react-router";
import { AlertCircle, ArrowLeft } from "lucide-react";

import { Button } from "~/components/ui/button";
import { usePermission } from "~/hooks/use-permission";
import { Permissions } from "~/lib/permissions";
import { useProviders } from "~/features/admin/llm/hooks";
import { ProviderSidebar } from "~/features/admin/llm/provider-sidebar";

const AdminProviderLayout = () => {
  const canManage = usePermission(Permissions.SYSTEM_SETTINGS);
  const { data: providers = [], isLoading } = useProviders();

  if (!canManage) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-rose-500" />
          <h2 className="mt-4 text-lg font-semibold">权限不足</h2>
          <p className="mt-2 text-sm text-slate-600">
            您没有权限访问 LLM 配置管理
          </p>
        </div>
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
        <h1 className="text-base font-semibold">LLM 配置</h1>
      </div>

      {/* Split layout */}
      <div className="flex flex-1 overflow-hidden">
        <ProviderSidebar providers={providers} isLoading={isLoading} />
        <div className="flex-1 overflow-hidden">
          <Outlet context={{ providers }} />
        </div>
      </div>
    </div>
  );
};

export default AdminProviderLayout;
