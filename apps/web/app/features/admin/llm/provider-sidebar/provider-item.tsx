import { Link } from "react-router";

import { cn } from "~/lib/utils";
import { ProviderIcon } from "~/components/provider-icon";
import type { LLMProvider } from "~/lib/llm-types";

interface ProviderItemProps {
  provider: LLMProvider;
  isSelected: boolean;
}

export const ProviderItem = ({ provider, isSelected }: ProviderItemProps) => {
  return (
    <Link
      to={`/admin/provider/${provider.id}`}
      className={cn(
        "flex w-full items-center gap-1.5 px-4 py-2.5 text-left text-sm transition-colors",
        isSelected ? "bg-primary/10 text-primary" : "hover:bg-muted"
      )}
    >
      <div className="relative shrink-0">
        <ProviderIcon type={provider.type} size={20} />
      </div>
      <div className={cn("min-w-0 flex-1 truncate", isSelected ? "font-bold" : "font-medium")}>{provider.name}</div>
    </Link>
  );
};

