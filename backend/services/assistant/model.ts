import { openai, type OpenAIResponsesProviderOptions } from '@ai-sdk/openai';
import type { LanguageModel } from 'ai';
import type { UserRole } from '../../types/index.js';

export const DEFAULT_ASSISTANT_MODEL = 'gpt-6-luna';

export const assistantModel = (): LanguageModel => openai(process.env.ASSISTANT_MODEL || DEFAULT_ASSISTANT_MODEL);

export const assistantProviderOptions = (role: UserRole) => ({
  openai: {
    store: false,
    // With store:false, reasoning can't be referenced by id across tool steps; it has to travel encrypted.
    include: ['reasoning.encrypted_content'],
    reasoningEffort: 'low',
    reasoningSummary: null,
    promptCacheKey: `hrbuddy:${role}`,
  } satisfies OpenAIResponsesProviderOptions,
});

export const webSearchTool = (): ReturnType<typeof openai.tools.webSearch> => openai.tools.webSearch({ searchContextSize: 'low' });
