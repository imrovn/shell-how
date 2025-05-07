import { z } from 'zod';

/**
 * Zod schema for validating LLM provider configuration data.
 * Used when loading or saving provider-specific settings.
 */
export const LLMProviderConfigSchema = z.object({
  apiKey: z.string().optional(),
  baseUrl: z.string().url().optional(),
  model: z.string().optional(),
});

/**
 * Zod schema for validating the main application configuration.
 * Ensures the structure of the config file is correct.
 */
export const AppConfigSchema = z.object({
  defaultProvider: z.enum(['openai', 'azure', 'local']).default('openai'),
  providers: z.object({
    openai: LLMProviderConfigSchema.optional(),
    azure: LLMProviderConfigSchema.optional(),
    local: LLMProviderConfigSchema.optional(),
  }),
});

/**
 * Zod schema for validating arguments for the 'generate' command.
 * Ensures CLI inputs for this command are valid.
 */
export const GenerateCommandArgsSchema = z.object({
  prompt: z.string().min(1, 'Prompt cannot be empty'),
  execute: z.boolean().optional().default(false),
  provider: z.enum(['openai', 'azure', 'local']).optional(),
});

/**
 * Zod schema for validating arguments for the 'explain' command.
 * Ensures CLI inputs for this command are valid.
 */
export const ExplainCommandArgsSchema = z.object({
  commandToExplain: z.string().min(1, 'Command to explain cannot be empty'),
  provider: z.enum(['openai', 'azure', 'local']).optional(),
});
