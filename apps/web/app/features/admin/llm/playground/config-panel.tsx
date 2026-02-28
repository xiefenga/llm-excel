import { Label } from "~/components/ui/label";
import { Input } from "~/components/ui/input";
import { ProviderIcon } from "~/components/provider-icon";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";

import type { LLMProvider, LLMModel } from "~/lib/llm-types";

interface ConfigPanelProps {
  providers: LLMProvider[];
  models: LLMModel[];
  selectedProviderId: string;
  selectedModelId: string;
  temperature: number;
  maxTokens: string;
  onProviderChange: (id: string) => void;
  onModelChange: (modelId: string) => void;
  onTemperatureChange: (value: number) => void;
  onMaxTokensChange: (value: string) => void;
  disabled?: boolean;
}

export const ConfigPanel = ({
  providers,
  models,
  selectedProviderId,
  selectedModelId,
  temperature,
  maxTokens,
  onProviderChange,
  onModelChange,
  onTemperatureChange,
  onMaxTokensChange,
  disabled,
}: ConfigPanelProps) => {
  return (
    <div className="flex h-full w-72 shrink-0 flex-col border-r bg-muted/30">
      <div className="border-b px-4 py-3">
        <h2 className="text-sm font-semibold">配置</h2>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto p-4">
        {/* Provider 选择 */}
        <div className="space-y-2">
          <Label className="text-xs">Provider</Label>
          <Select
            value={selectedProviderId}
            onValueChange={onProviderChange}
            disabled={disabled}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="选择 Provider..." />
            </SelectTrigger>
            <SelectContent>
              {providers.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedProviderId && (
            <div className="flex items-center gap-2 rounded-md bg-muted px-2.5 py-1.5">
              <ProviderIcon
                type={providers.find((p) => p.id === selectedProviderId)?.type || ""}
                size={16}
              />
              <span className="text-xs text-muted-foreground">
                {providers.find((p) => p.id === selectedProviderId)?.type}
              </span>
            </div>
          )}
        </div>

        {/* Model 选择 */}
        <div className="space-y-2">
          <Label className="text-xs">Model</Label>
          <Select
            value={selectedModelId}
            onValueChange={onModelChange}
            disabled={disabled || !selectedProviderId}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="选择 Model..." />
            </SelectTrigger>
            <SelectContent>
              {models.map((m) => (
                <SelectItem key={m.id} value={m.model_id}>
                  {m.name} ({m.model_id})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Temperature */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Temperature</Label>
            <span className="text-xs tabular-nums text-muted-foreground">
              {temperature.toFixed(1)}
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="2"
            step="0.1"
            value={temperature}
            onChange={(e) => onTemperatureChange(parseFloat(e.target.value))}
            className="w-full accent-primary"
            disabled={disabled}
          />
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>精确</span>
            <span>创造</span>
          </div>
        </div>

        {/* Max Tokens */}
        <div className="space-y-2">
          <Label className="text-xs">Max Tokens</Label>
          <Input
            type="number"
            placeholder="不限制"
            value={maxTokens}
            onChange={(e) => onMaxTokensChange(e.target.value)}
            disabled={disabled}
            className="text-sm"
          />
        </div>
      </div>
    </div>
  );
};
