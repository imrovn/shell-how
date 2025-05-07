import { Command } from 'commander';
import ora from 'ora';

import { Orchestrator } from '../../core/orchestrator';
import type { GenerateCommandArgs } from '../../types/interfaces';
import { GenerateCommandArgsSchema } from '../../types/zodSchemas';

export const generateCommand = new Command('generate')
  .alias('gen')
  .description('Generate a shell command from a natural language prompt.')
  .argument('<prompt>', 'The prompt to generate the command from')
  .option('-e, --execute', 'Execute the generated command after confirmation', false)
  .option('-p, --provider <name>', 'Specify LLM provider (openai, azure, local)')
  /**
   * Action handler for the 'generate' command.
   * Validates arguments and passes them to the Orchestrator.
   * @param prompt - The user's natural language prompt.
   * @param options - Command options (execute, provider).
   */
  .action(async (prompt: string, options: { execute?: boolean; provider?: string }) => {
    const validationResult = GenerateCommandArgsSchema.safeParse({
      prompt,
      execute: options.execute,
      provider: options.provider,
    });

    if (!validationResult.success) {
      ora().fail('Invalid parameters:');
      validationResult.error.errors.forEach((err) => {
        // Providing specific error messages for each invalid parameter.
        console.error(`- Parameter "${err.path.join('.')}": ${err.message}`);
      });
      return;
    }

    const validatedArgs: GenerateCommandArgs = validationResult.data;
    const orchestrator = new Orchestrator();
    await orchestrator.handleGenerateCommand(validatedArgs);
  });
