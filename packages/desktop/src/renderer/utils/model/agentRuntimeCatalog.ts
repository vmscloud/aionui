/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import type { AcpModelInfo, AcpSessionConfigOption } from '@/common/types/platform/acpTypes';
import { mapAgentAvailableCommandsToSlashCommands } from '@/common/chat/slash/guidSlashCommands';
import type { SlashCommandItem } from '@/common/chat/slash/types';
import type { AgentModeOption } from './agentTypes';

export type AgentRuntimeCatalog = {
  available_models?: unknown;
  available_modes?: unknown;
  available_commands?: unknown;
  config_options?: unknown;
  handshake?: {
    available_commands?: unknown;
  };
};

export type AgentRuntimeSelectOption = {
  value: string;
  label: string;
  description?: string;
};

export type AgentRuntimeDerivedOption = {
  id: string;
  category: string;
  currentValue?: string;
  options: AgentRuntimeSelectOption[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function parseJsonPayload(value: unknown): unknown {
  if (typeof value !== 'string') return value;

  try {
    return JSON.parse(value) as unknown;
  } catch {
    return value;
  }
}

function normalizeConfigOptions(value: unknown): AcpSessionConfigOption[] {
  const payload = parseJsonPayload(value);
  if (Array.isArray(payload)) {
    return payload as AcpSessionConfigOption[];
  }

  if (!isRecord(payload) || !Array.isArray(payload.config_options)) {
    return [];
  }

  return payload.config_options as AcpSessionConfigOption[];
}

function normalizeModelOption(value: unknown): { id: string; label: string; description?: string } | null {
  if (typeof value === 'string' && value.trim()) {
    return { id: value, label: value };
  }

  if (!isRecord(value)) return null;
  const id = typeof value.id === 'string' ? value.id : typeof value.value === 'string' ? value.value : '';
  if (!id) return null;
  const label = typeof value.label === 'string' ? value.label : typeof value.name === 'string' ? value.name : id;
  const description = typeof value.description === 'string' ? value.description : undefined;
  return { id, label, description };
}

function buildModelInfoFromPayload(value: unknown): AcpModelInfo | null {
  const payload = parseJsonPayload(value);
  if (!isRecord(payload) || !Array.isArray(payload.available_models)) {
    return null;
  }

  const available_models = payload.available_models.map(normalizeModelOption).filter((item) => item !== null);
  if (available_models.length === 0) return null;

  const current_model_id =
    typeof payload.current_model_id === 'string'
      ? payload.current_model_id
      : typeof payload.currentModelId === 'string'
        ? payload.currentModelId
        : (available_models[0]?.id ?? null);
  const matchedModel = available_models.find((model) => model.id === current_model_id);
  const current_model_label =
    typeof payload.current_model_label === 'string'
      ? payload.current_model_label
      : typeof payload.currentModelLabel === 'string'
        ? payload.currentModelLabel
        : (matchedModel?.label ?? current_model_id);

  return {
    current_model_id,
    current_model_label,
    available_models,
  };
}

function getConfigOptionCurrentValue(option: AcpSessionConfigOption): string | undefined {
  const optionRecord = option as AcpSessionConfigOption & { currentValue?: string };
  return option.current_value || option.selected_value || optionRecord.currentValue;
}

function buildSelectOptionFromConfigOptions(
  configOptions: AcpSessionConfigOption[],
  category: string,
  fallbackIds: string[] = []
): AgentRuntimeDerivedOption | null {
  const option =
    configOptions.find((item) => item.category === category) ||
    configOptions.find((item) => fallbackIds.includes(item.id));
  if (!option || option.type !== 'select') return null;

  const options = (option.options ?? [])
    .filter((item) => typeof item.value === 'string' && item.value.trim())
    .map((item) => ({
      value: item.value,
      label: item.label || item.name || item.value,
      description: item.description || undefined,
    }));

  return {
    id: option.id,
    category,
    currentValue: getConfigOptionCurrentValue(option),
    options,
  };
}

function buildModelInfoFromConfigOptions(configOptions: AcpSessionConfigOption[]): AcpModelInfo | null {
  const modelOption = configOptions.find((option) => option.category === 'model' && option.type === 'select');
  if (!modelOption?.options || modelOption.options.length === 0) return null;

  const available_models = modelOption.options.map((option) => ({
    id: option.value,
    label: option.label || option.name || option.value,
    description: option.description || undefined,
  }));
  const current_model_id = getConfigOptionCurrentValue(modelOption) || available_models[0]?.id || null;
  const matchedModel = available_models.find((model) => model.id === current_model_id);

  return {
    current_model_id,
    current_model_label: matchedModel?.label ?? current_model_id,
    available_models,
  };
}

export function buildAgentRuntimeModelInfo(agent: AgentRuntimeCatalog | null | undefined): AcpModelInfo | null {
  if (!agent) return null;

  return (
    buildModelInfoFromConfigOptions(normalizeConfigOptions(agent.config_options)) ??
    buildModelInfoFromPayload(agent.available_models)
  );
}

/**
 * Manggo AI custom Hermes agents run `hermes acp`, whose ACP handshake only
 * advertises the current primary provider's models (e.g. openai-codex). Hermes
 * itself can also route to Anthropic (Claude) via its fallback chain, but that
 * is invisible over ACP. To let operators pick Claude from the Manggo UI, we
 * present a curated full catalog (Claude first) for these agents, merged with
 * whatever the ACP session advertised so nothing is lost.
 *
 * This is a UI-side convenience: selecting `anthropic:*` sends the provider-
 * qualified id to Hermes ACP `session/set_model`, which switches the provider.
 */
export const HERMES_CURATED_MODELS: AgentRuntimeSelectOption[] = [
  { value: 'anthropic:claude-sonnet-5', label: 'Claude Sonnet 5', description: 'Anthropic' },
  { value: 'anthropic:claude-opus-4-8', label: 'Claude Opus 4.8', description: 'Anthropic' },
  { value: 'anthropic:claude-sonnet-4-6', label: 'Claude Sonnet 4.6', description: 'Anthropic' },
  { value: 'anthropic:claude-opus-4-7', label: 'Claude Opus 4.7', description: 'Anthropic' },
  { value: 'anthropic:claude-opus-4-6', label: 'Claude Opus 4.6', description: 'Anthropic' },
  { value: 'anthropic:claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5', description: 'Anthropic' },
  { value: 'anthropic:claude-fable-5', label: 'Claude Fable 5', description: 'Anthropic' },
  { value: 'openai-codex:gpt-5.6-sol', label: 'gpt-5.6-sol', description: 'OpenAI Codex' },
  { value: 'openai-codex:gpt-5.6-terra', label: 'gpt-5.6-terra', description: 'OpenAI Codex' },
  { value: 'openai-codex:gpt-5.6-luna', label: 'gpt-5.6-luna', description: 'OpenAI Codex' },
  { value: 'openai-codex:gpt-5.5', label: 'gpt-5.5', description: 'OpenAI Codex' },
  { value: 'openai-codex:gpt-5.4', label: 'gpt-5.4', description: 'OpenAI Codex' },
  { value: 'openai-codex:gpt-5.4-mini', label: 'gpt-5.4-mini', description: 'OpenAI Codex' },
];

const HERMES_DEFAULT_MODEL_ID = 'anthropic:claude-sonnet-5';

/**
 * Build model info for a Manggo custom Hermes agent: curated catalog (Claude
 * first) merged with the ACP-advertised models. Defaults the current selection
 * to Claude while preserving a valid ACP-advertised current model if present.
 */
export function buildHermesCuratedModelInfo(agent: AgentRuntimeCatalog | null | undefined): AcpModelInfo {
  const advertised = agent ? buildAgentRuntimeModelInfo(agent) : null;
  const seen = new Set<string>();
  const available_models: { id: string; label: string; description?: string }[] = [];

  for (const option of HERMES_CURATED_MODELS) {
    if (seen.has(option.value)) continue;
    seen.add(option.value);
    available_models.push({ id: option.value, label: option.label, description: option.description });
  }
  for (const model of advertised?.available_models ?? []) {
    if (seen.has(model.id)) continue;
    seen.add(model.id);
    available_models.push(model);
  }

  const current_model_id = seen.has(HERMES_DEFAULT_MODEL_ID)
    ? HERMES_DEFAULT_MODEL_ID
    : (available_models[0]?.id ?? null);
  const matched = available_models.find((model) => model.id === current_model_id);

  return {
    current_model_id,
    current_model_label: matched?.label ?? current_model_id,
    available_models,
  };
}

function normalizeModeOption(value: unknown): AgentModeOption | null {
  if (typeof value === 'string' && value.trim()) {
    return { value, label: value };
  }

  if (!isRecord(value)) return null;
  const modeValue = typeof value.id === 'string' ? value.id : typeof value.value === 'string' ? value.value : '';
  if (!modeValue) return null;

  return {
    value: modeValue,
    label: typeof value.name === 'string' ? value.name : typeof value.label === 'string' ? value.label : modeValue,
    description: typeof value.description === 'string' ? value.description : undefined,
  };
}

function buildModeStateFromPayload(value: unknown): { currentMode?: string; options: AgentModeOption[] } {
  const payload = parseJsonPayload(value);
  if (!isRecord(payload) || !Array.isArray(payload.available_modes)) {
    return { options: [] };
  }

  return {
    currentMode:
      typeof payload.current_mode_id === 'string'
        ? payload.current_mode_id
        : typeof payload.currentModeId === 'string'
          ? payload.currentModeId
          : undefined,
    options: payload.available_modes.map(normalizeModeOption).filter((item) => item !== null),
  };
}

function buildModeStateFromConfigOptions(configOptions: AcpSessionConfigOption[]): {
  currentMode?: string;
  options: AgentModeOption[];
} {
  const modeOption = configOptions.find((option) => option.category === 'mode' && option.type === 'select');
  if (!modeOption?.options || modeOption.options.length === 0) {
    return { options: [] };
  }

  return {
    currentMode: getConfigOptionCurrentValue(modeOption),
    options: modeOption.options.map((option) => {
      const description = (option as unknown as Record<string, unknown>).description;
      return {
        value: option.value,
        label: option.label || option.name || option.value,
        description: typeof description === 'string' ? description : undefined,
      };
    }),
  };
}

export function buildAgentRuntimeModeState(agent: AgentRuntimeCatalog | null | undefined): {
  currentMode?: string;
  options: AgentModeOption[];
} {
  if (!agent) return { options: [] };

  const fromConfigOptions = buildModeStateFromConfigOptions(normalizeConfigOptions(agent.config_options));
  if (fromConfigOptions.options.length > 0) return fromConfigOptions;

  const fromTopLevelModes = buildModeStateFromPayload(agent.available_modes);
  if (fromTopLevelModes.options.length > 0) return fromTopLevelModes;

  return { options: [] };
}

export function buildAgentRuntimeThoughtLevelOption(
  agent: AgentRuntimeCatalog | null | undefined
): AgentRuntimeDerivedOption | null {
  if (!agent) return null;
  return buildSelectOptionFromConfigOptions(normalizeConfigOptions(agent.config_options), 'thought_level', [
    'thought_level',
    'reasoning_effort',
  ]);
}

export function buildAgentRuntimeSlashCommands(agent: AgentRuntimeCatalog | null | undefined): SlashCommandItem[] {
  if (!agent) return [];

  return mapAgentAvailableCommandsToSlashCommands(agent.available_commands ?? agent.handshake?.available_commands);
}
