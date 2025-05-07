import { promises as fs } from 'fs';
import ora from 'ora';
import os from 'os';
import path from 'path';
import { z } from 'zod';

import type { AppConfig, LLMProviderConfig } from '../types/interfaces';
import { AppConfigSchema } from '../types/zodSchemas';

const CONFIG_DIR_NAME = '.ai-shell-js';
const CONFIG_FILE_NAME = 'config.json';
const CONFIG_DIR_PATH = path.join(os.homedir(), CONFIG_DIR_NAME);
const CONFIG_FILE_PATH = path.join(CONFIG_DIR_PATH, CONFIG_FILE_NAME);

const defaultConfig: AppConfig = {
  defaultProvider: 'openai',
  providers: {
    openai: { model: 'gpt-3.5-turbo' },
    azure: {},
    local: { baseUrl: 'http://localhost:1234/v1', model: 'local-model' },
  },
};

/**
 * Manages application configuration, including loading and saving settings.
 * Configuration is stored in a JSON file in the user's home directory.
 */
export class ConfigService {
  /**
   * Ensures the configuration directory exists.
   * Creates it if it's not present.
   */
  private async ensureConfigDirExists(): Promise<void> {
    try {
      await fs.access(CONFIG_DIR_PATH);
    } catch {
      await fs.mkdir(CONFIG_DIR_PATH, { recursive: true });
    }
  }

  /**
   * Loads the application configuration from the JSON file.
   * If the file doesn't exist or is invalid, it creates/uses a default configuration.
   * @returns A promise resolving to the loaded or default AppConfig.
   */
  async loadConfig(): Promise<AppConfig> {
    const spinner = ora('Loading configuration...').start();
    try {
      await this.ensureConfigDirExists();
      const fileContent = await fs.readFile(CONFIG_FILE_PATH, 'utf-8');
      const parsedJson = JSON.parse(fileContent);
      const validationResult = AppConfigSchema.safeParse(parsedJson);

      if (validationResult.success) {
        spinner.succeed('Configuration loaded successfully.');
        const loadedConfig = validationResult.data;
        // Deep merge ensures that new default provider settings are respected
        // if they are not present in the loaded configuration.
        return {
          ...defaultConfig,
          ...loadedConfig,
          providers: {
            openai: { ...defaultConfig.providers.openai, ...loadedConfig.providers?.openai },
            azure: { ...defaultConfig.providers.azure, ...loadedConfig.providers?.azure },
            local: { ...defaultConfig.providers.local, ...loadedConfig.providers?.local },
          },
        };
      } else {
        spinner.warn(`Invalid configuration: ${validationResult.error.message}. Using default configuration.`);
        // TODO(developer): Consider backing up the invalid config file before overwriting.
        await this.saveConfig(defaultConfig);
        return defaultConfig;
      }
    } catch (error) {
      spinner.warn('Configuration file not found or error reading/parsing. Using and creating default configuration.');
      await this.saveConfig(defaultConfig);
      return defaultConfig;
    }
  }

  /**
   * Saves the provided application configuration to the JSON file.
   * Validates the configuration before saving.
   * @param config - The AppConfig object to save.
   */
  async saveConfig(config: AppConfig): Promise<void> {
    const spinner = ora('Saving configuration...').start();
    try {
      const validatedConfig = AppConfigSchema.parse(config);
      await this.ensureConfigDirExists();
      await fs.writeFile(CONFIG_FILE_PATH, JSON.stringify(validatedConfig, null, 2));
      spinner.succeed('Configuration saved successfully.');
    } catch (error: any) {
      spinner.fail(`Error saving configuration: ${error.message}`);
      if (error instanceof z.ZodError) {
        console.error('Zod validation error details:', error.errors);
      }
    }
  }

  /**
   * Gets the full path to the configuration file.
   * @returns A promise resolving to the configuration file path.
   */
  async getConfigFilePath(): Promise<string> {
    return CONFIG_FILE_PATH;
  }

  /**
   * Updates the configuration for a specific LLM provider.
   * @param providerName - The name of the provider to update ('openai', 'azure', 'local').
   * @param updateData - A partial LLMProviderConfig object with new settings.
   */
  async updateProviderConfig(
    providerName: 'openai' | 'azure' | 'local',
    updateData: Partial<LLMProviderConfig>,
  ): Promise<void> {
    const currentConfig = await this.loadConfig();
    const providerConfig = currentConfig.providers[providerName] || {};

    currentConfig.providers[providerName] = {
      ...providerConfig,
      ...updateData,
    } as LLMProviderConfig;
    await this.saveConfig(currentConfig);
  }

  /**
   * Sets the default LLM provider for the application.
   * @param providerName - The name of the provider to set as default.
   */
  async setDefaultProvider(providerName: 'openai' | 'azure' | 'local'): Promise<void> {
    const currentConfig = await this.loadConfig();
    currentConfig.defaultProvider = providerName;
    await this.saveConfig(currentConfig);
  }
}

export const configService = new ConfigService();
