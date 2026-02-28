import { ProviderIcon as LobehubProviderIcon } from "@lobehub/icons";


import type { ReactNode } from "react";

interface ProviderIconProps {
  type: string;
  size?: number;
}

const CUSTOM_ICONS: Record<string, (size: number) => ReactNode> = {
};

export const ProviderIcon = ({ type, size = 20 }: ProviderIconProps) => {
  const custom = CUSTOM_ICONS[type];
  if (custom) {
    return <>{custom(size)}</>;
  }
  return <LobehubProviderIcon provider={type} size={size} type="color" />;
};
