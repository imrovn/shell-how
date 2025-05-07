/**
 * Configuration for a specific LLM provider.
 */
export interface LLMProviderConfig {
  apiKey?: string;
  baseUrl?: string; // For local LLMs or Azure
  model?: string;
  apiVersion?: string;
}

/**
 * Main application configuration structure.
 * Defines how the CLI interacts with different LLM providers.
 */
export interface AppConfig {
  defaultProvider: 'openai' | 'azure' | 'local';
  providers: {
    openai?: LLMProviderConfig;
    azure?: LLMProviderConfig;
    local?: LLMProviderConfig;
  };
}

/**
 * Arguments for the 'generate' command.
 */
export interface GenerateCommandArgs {
  prompt: string;
  execute?: boolean;
  provider?: 'openai' | 'azure' | 'local';
}

/**
 * Arguments for the 'explain' command.
 */
export interface ExplainCommandArgs {
  commandToExplain: string;
  provider?: 'openai' | 'azure' | 'local';
}

/**
 * Token usage details from an LLM response.
 */
export interface LLMUsage {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
}

/**
 * Standardized response structure from an LLM provider.
 */
export interface LLMResponse {
  content: string | null;
  error?: string;
  usage?: LLMUsage;
}

/**
 * Interface for LLM provider classes.
 * Ensures all providers offer a consistent way to generate and explain commands.
 */
export interface LLMProvider {
  /**
   * Generates content (e.g., a shell command) based on a prompt.
   * @param prompt - The input prompt to the LLM.
   * @param model - Optional model override for this specific request.
   * @returns A promise resolving to the LLM's response.
   */
  generate(prompt: string, model?: string): Promise<LLMResponse>;

  /**
   * Explains a given shell command.
   * @param command - The shell command to be explained.
   * @param model - Optional model override for this specific request.
   * @returns A promise resolving to the LLM's explanation.
   */
  explain(command: string, model?: string): Promise<LLMResponse>;
}
