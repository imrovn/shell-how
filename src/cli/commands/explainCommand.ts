import { Command } from 'commander';
import ora from 'ora';

import { Orchestrator } from '../../core/orchestrator';
import { ExplainCommandArgsSchema, type ExplainCommandArgs } from '../../types';

export const explainCommand = new Command('explain')
  .alias('ex')
  .description('Explain a shell command.')
  .argument('<shell_command>', 'The shell command to explain')
  .option('-p, --provider <name>', 'Specify the LLM provider (openai, azure, local)')
  /**
   * Handles the "explain" command action.
   *
   * @param shellCommand - The shell command to explain.
   * @param options - Options for the command.
   * @param options.provider - Specifies the LLM provider (e.g., openai, azure, local).
   */
  .action(async (shellCommand: string, options: { provider?: string }) => {
    const validationResult = ExplainCommandArgsSchema.safeParse({
      commandToExplain: shellCommand,
      provider: options.provider,
    });

    if (!validationResult.success) {
      ora().fail('Invalid parameters:');
      validationResult.error.errors.forEach((err) => {
        console.error(`- ${err.path.join('.')}: ${err.message}`);
      });
      return;
    }

    const orchestrator = new Orchestrator();
    await orchestrator.handleExplainCommand(validationResult.data as ExplainCommandArgs);
  });
