import OpenAI, { AzureOpenAI } from 'openai';

import { configService } from '../../services/configService';
import type { LLMProvider, LLMResponse, AppConfig, LLMProviderConfig } from '../../types';

// TODO(developer): Consider moving system prompts to a configuration file or constants for easier management.
const GENERATE_SYSTEM_PROMPT = `You are a terminal assistant. Turn the natural language instructions into a terminal command. By default always only output code, and in a code block. However, if the user is clearly asking a question then answer it very briefly and well. Consider when the user request references a previous request.`;
const EXPLAIN_SYSTEM_PROMPT = `You are a command-line expert. Explain the following shell command clearly and concisely. Focus on its main function and important parameters.`;

/**
 * Implements the LLMProvider interface for Azure OpenAI's API.
 * Handles communication with Azure OpenAI to generate and explain commands.
 */
export class AzureOpenAIProvider implements LLMProvider {
  private client: OpenAI | null = null;
  private appConfig: AppConfig | null = null;
  private activeConfig: LLMProviderConfig | null = null;
  private deploymentName: string | null = null;

  /**
   * Initializes the Azure OpenAI client.
   * Loads configuration and sets up the OpenAI SDK instance.
   * This method is called lazily before the first API request.
   */
  private async initializeClient(): Promise<void> {
    if (this.client && this.activeConfig) return;

    this.appConfig = await configService.loadConfig();
    const azureConfig = this.appConfig.providers.azure;

    if (!azureConfig?.apiKey || !azureConfig?.baseUrl || !azureConfig?.model) {
      throw new Error(
        'API key, endpoint (baseUrl), or deployment name (model) of Azure OpenAI are not configured. Run the `configure` command',
      );
    }

    this.activeConfig = azureConfig;
    this.deploymentName = azureConfig.model;
    const apiVersion = azureConfig?.apiVersion || '2025-03-01-preview';
    const options = {
      apiKey: azureConfig?.apiKey,
      deployment: azureConfig.model,
      apiVersion,
      endpoint: azureConfig?.baseUrl,
    };

    this.client = new AzureOpenAI(options);
  }

  /**
   * Determines the model to be used for an API request.
   * Prioritizes user-provided model, then configured model, then a default.
   * @param userModel - An optional model name specified by the user for a single request.
   * @returns The model name string.
   */
  private getModel(userModel?: string): string {
    return userModel || this.deploymentName || 'gpt-4o'; // Ví dụ tên deployment
  }

  /**
   * Generates a shell command using the OpenAI API.
   * @param promptContent - The natural language prompt for command generation.
   * @param model - Optional model override for this specific request.
   * @returns A promise resolving to the LLM's response containing the command.
   */
  async generate(promptContent: string, model?: string): Promise<LLMResponse> {
    await this.initializeClient();
    if (!this.client) throw new Error('Azure OpenAI client is not initialized.');

    try {
      const completion = await this.client.chat.completions.create({
        model: this.getModel(model),
        messages: [
          { role: 'system', content: GENERATE_SYSTEM_PROMPT },
          { role: 'user', content: promptContent },
        ],
      });
      const responseContent = completion.choices[0]?.message?.content || '';
      return {
        content: responseContent,
        usage: {
          promptTokens: completion.usage?.prompt_tokens,
          completionTokens: completion.usage?.completion_tokens,
          totalTokens: completion.usage?.total_tokens,
        },
      };
    } catch (error: any) {
      // TODO(developer): Implement more specific error handling for different API error codes.
      return { content: null, error: error.message };
    }
  }
  /**
   * Explains a shell command using the OpenAI API.
   * @param command - The shell command to be explained.
   * @param model - Optional model override for this specific request.
   * @returns A promise resolving to the LLM's response containing the explanation.
   */
  async explain(command: string, model?: string): Promise<LLMResponse> {
    await this.initializeClient();
    if (!this.client) throw new Error('Azure OpenAI client not initialized.');

    try {
      const completion = await this.client.chat.completions.create({
        model: this.getModel(model),
        messages: [
          { role: 'system', content: EXPLAIN_SYSTEM_PROMPT },
          { role: 'user', content: `Explain the following command: ${command}` },
        ],
      });
      const responseContent = completion.choices[0]?.message?.content || '';
      return {
        content: responseContent,
        usage: {
          promptTokens: completion.usage?.prompt_tokens,
          completionTokens: completion.usage?.completion_tokens,
          totalTokens: completion.usage?.total_tokens,
        },
      };
    } catch (error: any) {
      return { content: null, error: error.message };
    }
  }
}
