import { configService } from '../services/configService.ts';
import type { LLMProvider } from '../types';
import { AzureOpenAIProvider } from './providers/azureOpenai.ts';
import { LocalLLMProvider } from './providers/localLlm.ts';
import { OpenAIProvider } from './providers/oppenai.ts';

export * from '../types/interfaces.ts';

/**
 * Factory function to get an instance of an LLM provider.
 * Selects the provider based on the provided name or the default setting in the configuration.
 * @param providerName - Optional name of the provider to instantiate ('openai', 'azure', 'local').
 * @returns A promise resolving to an instance of an LLMProvider.
 */
export async function getLLMProvider(providerName?: 'openai' | 'azure' | 'local'): Promise<LLMProvider> {
  const config = await configService.loadConfig();
  const selectedProvider = providerName || config.defaultProvider;

  switch (selectedProvider) {
    case 'openai':
      return new OpenAIProvider();
    case 'azure':
      return new AzureOpenAIProvider();
    case 'local':
      return new LocalLLMProvider();
    default:
      // This case should ideally not be reached if config validation is robust.
      console.warn(`Unsupported provider "${selectedProvider}". Falling back to OpenAI.`);
      return new OpenAIProvider();
  }
}
