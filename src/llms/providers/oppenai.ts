import OpenAI from 'openai';

import { configService } from '../../services/configService';
import type { LLMProvider, LLMResponse, AppConfig, LLMProviderConfig } from '../../types';

// TODO(developer): Consider moving system prompts to a configuration file or constants for easier management.
const GENERATE_SYSTEM_PROMPT = `You are a command-line expert. Generate a concise and accurate shell command based on the following request. Return only the command itself, with no additional explanation or markdown. If you cannot generate a command, return "Error: Cannot generate command.".`;
const EXPLAIN_SYSTEM_PROMPT = `You are a command-line expert. Explain the following shell command clearly and concisely. Focus on its main function and important parameters.`;

/**
 * Implements the LLMProvider interface for OpenAI's API.
 * Handles communication with OpenAI to generate and explain commands.
 */
export class OpenAIProvider implements LLMProvider {
  private openai: OpenAI | null = null;
  private activeConfig: LLMProviderConfig | null = null;
  private appConfig: AppConfig | null = null;

  /**
   * Initializes the OpenAI client.
   * Loads configuration and sets up the OpenAI SDK instance.
   * This method is called lazily before the first API request.
   */
  private async initializeClient(): Promise<void> {
    if (this.openai && this.activeConfig) return;

    this.appConfig = await configService.loadConfig();
    const openaiSpecificConfig = this.appConfig.providers.openai;

    if (!openaiSpecificConfig?.apiKey) {
      throw new Error('API key for OpenAI is not configured. Run the `configure` command.');
    }
    this.activeConfig = openaiSpecificConfig;
    this.openai = new OpenAI({ apiKey: this.activeConfig.apiKey });
  }

  /**
   * Determines the model to be used for an API request.
   * Prioritizes user-provided model, then configured model, then a default.
   * @param userModel - An optional model name specified by the user for a single request.
   * @returns The model name string.
   */
  private getModel(userModel?: string): string {
    return userModel || this.activeConfig?.model || 'gpt-3.5-turbo';
  }

  /**
   * Generates a shell command using the OpenAI API.
   * @param promptContent - The natural language prompt for command generation.
   * @param model - Optional model override for this specific request.
   * @returns A promise resolving to the LLM's response containing the command.
   */
  async generate(promptContent: string, model?: string): Promise<LLMResponse> {
    await this.initializeClient();
    if (!this.openai) throw new Error('OpenAI client not initialized.'); // Should not happen if initializeClient works

    try {
      const completion = await this.openai.chat.completions.create({
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
    if (!this.openai) throw new Error('OpenAI client not initialized.');

    try {
      const completion = await this.openai.chat.completions.create({
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
