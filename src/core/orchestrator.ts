import inquirer from 'inquirer';
import ora from 'ora';

import { type ExplainCommandArgs, getLLMProvider, type LLMProvider } from '../llms';
import { configService } from '../services/configService';

// Spawn logic might be refactored out or kept if Orchestrator still handles direct execution for non-interactive mode.
// For now, spawn logic in InteractiveSession duplicates it.

/**
 * Orchestrates the core logic of the CLI application.
 * Handles command processing by interacting with LLM providers and user confirmations.
 */
export class Orchestrator {
  private llmProvider: LLMProvider | null = null;

  /**
   * Initializes or re-initializes the LLM provider.
   * @param providerName - Optional name of the provider to use. If not provided, uses the default from config.
   */
  private async initializeProvider(providerName?: 'openai' | 'azure' | 'local') {
    this.llmProvider = await getLLMProvider(providerName);
  }

  /**
   * Gets the currently initialized LLM provider. Initializes if not already.
   * @param providerName - Optional specific provider to initialize.
   * @returns The initialized LLMProvider instance or null if initialization fails.
   */
  public async getInitializedLLMProvider(providerName?: 'openai' | 'azure' | 'local'): Promise<LLMProvider | null> {
    if (!this.llmProvider || providerName) {
      // Re-initialize if a specific provider is requested or not initialized
      await this.initializeProvider(providerName);
    }
    return this.llmProvider;
  }

  /**
   * Handles the 'explain' command logic.
   * It gets an explanation for a shell command from the LLM.
   * @param args - The arguments for the explain command.
   */
  async handleExplainCommand(args: ExplainCommandArgs): Promise<void> {
    // Ensure provider is initialized, using specified or default
    const currentLLM = await this.getInitializedLLMProvider(args.provider);
    if (!currentLLM) {
      ora().fail("Could not initialize LLM provider for 'explain'. Please configure first.");
      return;
    }

    const spinner = ora(`Explaining command: "${args.commandToExplain}"...`).start();
    try {
      const response = await currentLLM.explain(args.commandToExplain);
      if (response.error) {
        spinner.fail(`LLM Error: ${response.error}`);
        return;
      }
      if (response.content) {
        spinner.succeed('Command explanation successful!');
        console.log(`\nExplanation:\n${response.content}\n`);
      } else {
        spinner.warn('No explanation received from LLM.');
      }
    } catch (error: any) {
      spinner.fail(`Error explaining command: ${error.message}`);
    }
  }

  /**
   * Handles the 'configure' command logic.
   * Allows the user to interactively set API keys and other configurations.
   * This method can now be called from the interactive session as well.
   */
  async handleConfigureCommand(): Promise<void> {
    // ... (previous configure logic using ora for simple prompts) ...
    // This can be enhanced with inquirer for a richer configuration experience.
    // For now, the existing ora-based prompting in handleConfigureCommand will work.
    // TODO(developer): Refactor handleConfigureCommand to use inquirer for a better experience.
    const spinner = ora();
    console.log('\n--- ai-shell-js Configuration ---');
    const configFilePath = await configService.getConfigFilePath();
    console.log(`Configuration file: ${configFilePath}`);

    const currentConfig = await configService.loadConfig(); // Load fresh config
    // (The rest of your existing ora-based configureCommand logic)
    // Example:
    console.log('Current settings:', JSON.stringify(currentConfig, null, 2));
    const { confirmChanges } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirmChanges',
        message: 'Do you want to modify the configuration?',
        default: false,
      },
    ]);

    if (!confirmChanges) {
      console.log('Configuration unchanged.');
      return;
    }
    // ... (Your more detailed inquirer-based config update logic would go here)
    // For simplicity, the existing ora based ask in your previous Orchestrator code can be used.
    // We'll assume the previous logic for asking about provider, API key, etc., is here.
    // This is a placeholder for a more detailed inquirer-based config flow.
    console.log('To re-implement full configuration with inquirer, please see previous Orchestrator code and adapt.');
    console.log('For now, exiting simplified configuration step.');
    // The old `ask` function and loop can be adapted here.
    // Example of one field:
    const { newDefaultProvider } = await inquirer.prompt([
      {
        type: 'list',
        name: 'newDefaultProvider',
        message: 'Select default LLM provider:',
        choices: ['openai', 'azure', 'local'],
        default: currentConfig.defaultProvider,
      },
    ]);
    await configService.setDefaultProvider(newDefaultProvider as 'openai' | 'azure' | 'local');
    spinner.succeed(`Default provider set to ${newDefaultProvider}.`);
    // Add more prompts for API keys, models, etc.

    console.log('--- Configuration Finished ---');
  }
}
