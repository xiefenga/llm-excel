import { useState, useEffect } from "react";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

import { Button } from "~/components/ui/button";
import {
  Field,
  FieldContent,
  FieldGroup,
  FieldLabel,
} from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import type { LLMProvider } from "~/lib/llm-types";
import { getProviderTypeConfig } from "~/lib/llm-provider-config";
import {
  useCredentials,
  useCreateCredential,
  useUpdateCredential,
  useUpdateProvider,
} from "~/features/admin/llm/hooks";

interface ProviderCredentialsProps {
  provider: LLMProvider;
}

export const ProviderCredentials = ({ provider }: ProviderCredentialsProps) => {
  const providerId = provider.id;
  const typeConfig = getProviderTypeConfig(provider.type);
  const { data: credentials } = useCredentials(providerId);
  const createCredential = useCreateCredential();
  const updateCredential = useUpdateCredential(providerId);
  const updateProvider = useUpdateProvider();

  const credential = credentials?.[0];

  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [keyDirty, setKeyDirty] = useState(false);

  const [baseUrl, setBaseUrl] = useState(provider.base_url || "");
  const [urlDirty, setUrlDirty] = useState(false);

  // Backfill masked key when credential loads
  useEffect(() => {
    if (credential?.secret_masked && !keyDirty) {
      setApiKey(credential.secret_masked);
    }
  }, [credential?.secret_masked]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset form when provider changes
  useEffect(() => {
    setApiKey("");
    setShowKey(false);
    setKeyDirty(false);
    setBaseUrl(provider.base_url || "");
    setUrlDirty(false);
  }, [providerId, provider.base_url]);

  const handleSaveKey = async () => {
    if (!apiKey.trim()) {
      toast.error("请输入 API Key");
      return;
    }
    try {
      if (credential) {
        await updateCredential.mutateAsync({
          id: credential.id,
          payload: { secret_value: apiKey.trim() },
        });
      } else {
        await createCredential.mutateAsync({
          provider_id: providerId,
          secret_type: "api_key",
          secret_value: apiKey.trim(),
        });
      }
      toast.success("凭证保存成功");
      setKeyDirty(false);
      setShowKey(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "保存失败");
    }
  };

  const handleSaveUrl = async () => {
    try {
      await updateProvider.mutateAsync({
        id: providerId,
        payload: { base_url: baseUrl.trim() || null },
      });
      toast.success("Base URL 已更新");
      setUrlDirty(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "保存失败");
    }
  };

  const isKeySaving = createCredential.isPending || updateCredential.isPending;

  return (
    <div className="px-6 py-4">
      <h3 className="text-sm font-semibold mb-4">凭证配置</h3>

      <FieldGroup>
        {/* API Key - only for providers that need it */}
        {typeConfig.needsApiKey && (
          <Field orientation="horizontal">
            <FieldLabel className="w-24 shrink-0 pt-2">API Key</FieldLabel>
            <FieldContent>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    type={showKey ? "text" : "password"}
                    placeholder="请输入 API Key"
                    value={apiKey}
                    onFocus={() => {
                      if (!keyDirty && credential?.secret_masked) {
                        setApiKey("");
                        setKeyDirty(true);
                      }
                    }}
                    onChange={(e) => {
                      setApiKey(e.target.value);
                      setKeyDirty(true);
                    }}
                    className="pr-9"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
                <Button
                  onClick={handleSaveKey}
                  disabled={!keyDirty || !apiKey.trim() || isKeySaving}
                  size="sm"
                >
                  {isKeySaving ? "保存中..." : "保存"}
                </Button>
              </div>
            </FieldContent>
          </Field>
        )}

        {/* Base URL */}
        <Field orientation="horizontal">
          <FieldLabel className="w-24 shrink-0 pt-2">Base URL</FieldLabel>
          <FieldContent>
            <div className="flex gap-2">
              <Input
                placeholder={typeConfig.baseUrlPlaceholder}
                value={baseUrl}
                onChange={(e) => {
                  setBaseUrl(e.target.value);
                  setUrlDirty(true);
                }}
                className="flex-1"
              />
              <Button
                onClick={handleSaveUrl}
                disabled={!urlDirty || updateProvider.isPending}
                size="sm"
              >
                {updateProvider.isPending ? "保存中..." : "保存"}
              </Button>
            </div>
          </FieldContent>
        </Field>
      </FieldGroup>
    </div>
  );
};
