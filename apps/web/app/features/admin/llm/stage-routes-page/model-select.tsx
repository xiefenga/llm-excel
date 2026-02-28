import { LLMStatus } from "~/lib/llm-types";
import { useModels } from "~/features/admin/llm/hooks";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";

export const ModelSelect = ({
  providerId,
  value,
  onChange,
}: {
  providerId: string;
  value: string;
  onChange: (value: string) => void;
}) => {
  const { data: models, isLoading } = useModels(providerId || undefined);
  const enabledModels =
    models?.filter((m) => m.status === LLMStatus.ENABLED) || [];

  return (
    <Select
      value={value}
      onValueChange={onChange}
      disabled={!providerId || isLoading}
    >
      <SelectTrigger className="w-full">
        <SelectValue
          placeholder={isLoading ? "加载中..." : "选择模型..."}
        />
      </SelectTrigger>
      <SelectContent>
        {enabledModels.map((m) => (
          <SelectItem key={m.id} value={m.id}>
            {m.name} ({m.model_id})
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
