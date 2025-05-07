// src/interactiveSession.ts
import clipboard from 'clipboardy';
import inquirer from 'inquirer';
import ora from 'ora';

import { Orchestrator } from './core/orchestrator';

/**
 * Manages the interactive command-line session.
 */
export class InteractiveSession {
  private orchestrator: Orchestrator;
  private lastGeneratedCommand: string | null = null;

  constructor() {
    this.orchestrator = new Orchestrator();
  }

  /**
   * Starts the main interactive loop.
   */
  public async start(): Promise<void> {
    console.log('Welcome to AI Shell (Interactive Mode)!');
    console.log("Type your command query, or 'explain <command>', or 'quit' to exit.");

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { userInput } = await inquirer.prompt([
        {
          type: 'input',
          name: 'userInput',
          message: '>',
          prefix: '🤖', // Fun prefix for the prompt
        },
      ]);

      if (!userInput.trim()) {
        continue; // Skip empty input
      }

      const inputLower = userInput.trim().toLowerCase();

      if (inputLower === 'quit' || inputLower === 'exit') {
        console.log('Goodbye!');
        break;
      }

      if (inputLower.startsWith('explain ')) {
        const commandToExplain = userInput.trim().substring('explain '.length);
        if (commandToExplain) {
          await this.orchestrator.handleExplainCommand({ commandToExplain });
        } else {
          console.log('Please provide a command to explain. Usage: explain <shell_command>');
        }
      } else if (inputLower === 'config' || inputLower === 'configure') {
        // Offer a way to reach configuration from interactive mode
        await this.orchestrator.handleConfigureCommand();
        console.log('\nContinuing interactive session. Type your command query...');
      } else {
        // Assume it's a prompt for command generation
        // Adapt handleGenerateCommand to return the command or handle interaction internally
        await this.handleGenerationPrompt(userInput.trim());
      }
    }
  }

  /**
   * Handles a user prompt intended for command generation.
   * @param prompt The user's natural language prompt.
   */
  private async handleGenerationPrompt(prompt: string): Promise<void> {
    const spinner = ora(`Processing: "${prompt}"...`).start();
    try {
      // Temporarily adapt Orchestrator's generate method for this flow
      // Ideally, Orchestrator.generate would just return the command string
      const llmProvider = await this.orchestrator.getInitializedLLMProvider(); // Need a way to get provider
      if (!llmProvider) {
        spinner.fail('LLM Provider not initialized. Please configure first.');
        return;
      }
      const response = await llmProvider.generate(prompt);
      spinner.stop();

      if (response.error) {
        console.error(`❌ LLM Error: ${response.error}`);
        this.lastGeneratedCommand = null;
        return;
      }

      if (response.content && !response.content.toLowerCase().startsWith('error:')) {
        console.log(`✅ Suggested command:`);
        console.log(`   ${response.content}`);
        this.lastGeneratedCommand = response.content;
        await this.postGenerationActions();
      } else {
        console.warn(`⚠️ Could not generate command: ${response.content || 'No specific error message.'}`);
        this.lastGeneratedCommand = null;
      }
    } catch (error: any) {
      spinner.fail(`Error generating command: ${error.message}`);
      this.lastGeneratedCommand = null;
    }
  }

  /**
   * Prompts the user for actions after a command has been generated.
   */
  private async postGenerationActions(): Promise<void> {
    if (!this.lastGeneratedCommand) return;

    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'What next?',
        choices: [
          { name: 'Execute command', value: 'execute' },
          { name: 'Copy to clipboard', value: 'copy' },
          { name: 'Refine / Follow-up prompt', value: 'refine' },
          new inquirer.Separator(),
          { name: 'New prompt', value: 'new' },
          { name: 'Quit', value: 'quit' },
        ],
      },
    ]);

    switch (action) {
      case 'execute':
        await this.executeLastCommand();
        break;
      case 'copy':
        try {
          await clipboard.write(this.lastGeneratedCommand);
          console.log('📋 Command copied to clipboard!');
        } catch (error) {
          console.error('Failed to copy to clipboard. You might need to install xclip or xsel on Linux.');
          // TODO(developer): Provide more specific instructions for clipboard troubleshooting.
        }
        break;
      case 'refine':
        const { followUpPrompt } = await inquirer.prompt([
          {
            type: 'input',
            name: 'followUpPrompt',
            message: 'Refine or add to your previous prompt:',
            // TODO(developer): Default could be the previous raw prompt for easier editing
            // default: this.lastUserRawPrompt, (need to store last raw prompt)
          },
        ]);
        if (followUpPrompt) {
          // TODO(developer): Consider prepending the context of the last generated command to the follow-up.
          // For example: `Given the command "${this.lastGeneratedCommand}", now ${followUpPrompt}`
          await this.handleGenerationPrompt(
            `Regarding the previous command ("${this.lastGeneratedCommand}"), now: ${followUpPrompt}`,
          );
        }
        break;
      case 'new':
        // The loop will naturally prompt for new input.
        console.log('Enter your new prompt.');
        break;
      case 'quit':
        console.log('Goodbye!');
        process.exit(0);
    }
    // If not quitting or starting a new prompt that continues the loop,
    // offer post-generation actions again or go to main prompt.
    // For simplicity, after an action, we'll let the main loop re-prompt.
  }

  /**
   * Confirms and executes the last generated command.
   */
  private async executeLastCommand(): Promise<void> {
    if (!this.lastGeneratedCommand) {
      console.log('No command to execute.');
      return;
    }

    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: `Execute this command?\n   ${this.lastGeneratedCommand}\n`,
        default: false,
      },
    ]);

    if (confirm) {
      const executionSpinner = ora(`Executing: ${this.lastGeneratedCommand}`).start();
      try {
        // This reuses the spawn logic from Orchestrator, which is not ideal.
        // TODO(developer): Refactor spawn logic into a shared utility or make Orchestrator's execute public.
        const commandParts = this.lastGeneratedCommand.split(' ');
        const commandToExecute = commandParts[0];
        const commandArgs = commandParts.slice(1);

        const { spawn } = await import('bun'); // Dynamic import if not globally available
        const proc = spawn([commandToExecute, ...commandArgs], {
          stdio: ['inherit', 'pipe', 'pipe'],
        });
        const stdout = await new Response(proc.stdout).text();
        const stderr = await new Response(proc.stderr).text();
        const exitCode = await proc.exitCode;

        if (exitCode === 0) {
          executionSpinner.succeed('Execution successful!');
          if (stdout) console.log('Output:\n', stdout);
        } else {
          executionSpinner.fail(`Execution error (exit code: ${exitCode}).`);
          if (stderr) console.error('Error Output:\n', stderr);
          if (stdout && !stderr) console.log('Output (non-stderr errors possible):\n', stdout);
        }
      } catch (execError: any) {
        executionSpinner.fail(`Error executing command: ${execError.message}`);
      }
    } else {
      console.log('Execution cancelled.');
    }
  }
}
