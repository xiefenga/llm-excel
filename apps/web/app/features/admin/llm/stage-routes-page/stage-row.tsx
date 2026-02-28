import { Trash2, Save } from "lucide-react";

import { Button } from "~/components/ui/button";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "~/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import type { LLMStageRoute, LLMProvider } from "~/lib/llm-types";
import { ModelSelect } from "./model-select";

import type { STAGES } from "./index";

interface StageRowDraft {
  providerId: string;
  modelId: string;
  dirty: boolean;
}

interface StageRowProps {
  stage: (typeof STAGES)[number];
  draft: StageRowDraft;
  route?: LLMStageRoute;
  providers: LLMProvider[];
  onProviderChange: (value: string) => void;
  onModelChange: (value: string) => void;
  onSave: () => void;
  onDelete: () => void;
  isSaving: boolean;
  isDeleting: boolean;
}

export const StageRow = ({
  stage,
  draft,
  route,
  providers,
  onProviderChange,
  onModelChange,
  onSave,
  onDelete,
  isSaving,
  isDeleting,
}: StageRowProps) => {
  const hasRoute = !!route;

  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h4 className="text-sm font-semibold">{stage.label}</h4>
          <p className="text-xs text-muted-foreground">{stage.description}</p>
        </div>
        <div className="flex gap-1.5">
          {draft.dirty && (
            <Button
              size="sm"
              onClick={onSave}
              disabled={!draft.providerId || !draft.modelId || isSaving}
            >
              <Save className="size-3.5" />
              {isSaving ? "保存中..." : "保存"}
            </Button>
          )}
          {hasRoute && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onDelete}
              disabled={isDeleting}
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="size-3.5" />
            </Button>
          )}
        </div>
      </div>

      <FieldGroup>
        <Field orientation="horizontal">
          <FieldLabel className="w-20 shrink-0 pt-2">Provider</FieldLabel>
          <FieldContent>
            <Select
              value={draft.providerId}
              onValueChange={onProviderChange}
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
          </FieldContent>
        </Field>

        <Field orientation="horizontal">
          <FieldLabel className="w-20 shrink-0 pt-2">Model</FieldLabel>
          <FieldContent>
            <ModelSelect
              providerId={draft.providerId}
              value={draft.modelId}
              onChange={onModelChange}
            />
            {!draft.providerId && (
              <FieldDescription>请先选择 Provider</FieldDescription>
            )}
          </FieldContent>
        </Field>
      </FieldGroup>
    </div>
  );
};
