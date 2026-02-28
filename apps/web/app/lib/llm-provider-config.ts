/**
 * Per-provider-type configuration.
 * Drives which fields are shown in the credentials form
 * and provides defaults for the add-provider dialog.
 */

export interface ProviderTypeConfig {
  label: string;
  needsApiKey: boolean;
  defaultBaseUrl: string;
  baseUrlPlaceholder: string;
}

const defaults: ProviderTypeConfig = {
  label: "Custom",
  needsApiKey: true,
  defaultBaseUrl: "",
  baseUrlPlaceholder: "https://api.example.com/v1",
};

const configs: Record<string, ProviderTypeConfig> = {
  openai: {
    label: "OpenAI",
    needsApiKey: true,
    defaultBaseUrl: "https://api.openai.com/v1",
    baseUrlPlaceholder: "https://api.openai.com/v1",
  },
  anthropic: {
    label: "Anthropic",
    needsApiKey: true,
    defaultBaseUrl: "https://api.anthropic.com",
    baseUrlPlaceholder: "https://api.anthropic.com",
  },
  google: {
    label: "Google",
    needsApiKey: true,
    defaultBaseUrl: "https://generativelanguage.googleapis.com",
    baseUrlPlaceholder: "https://generativelanguage.googleapis.com",
  },
  azure: {
    label: "Azure OpenAI",
    needsApiKey: true,
    defaultBaseUrl: "",
    baseUrlPlaceholder: "https://{resource}.openai.azure.com",
  },
  ollama: {
    label: "Ollama",
    needsApiKey: false,
    defaultBaseUrl: "http://localhost:11434",
    baseUrlPlaceholder: "http://localhost:11434",
  },
  custom: {
    label: "Custom",
    needsApiKey: true,
    defaultBaseUrl: "",
    baseUrlPlaceholder: "https://api.example.com/v1",
  },
};

export function getProviderTypeConfig(type: string): ProviderTypeConfig {
  return configs[type] ?? defaults;
}

export const PROVIDER_TYPES = Object.entries(configs).map(([value, cfg]) => ({
  value,
  label: cfg.label,
}));
