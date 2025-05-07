import { Command } from 'commander';

// import { generateCommand } from './commands/generateCommand'; // Optional: keep for non-interactive
// import { explainCommand } from './commands/explainCommand';   // Optional: keep for non-interactive
import { configureCommand } from './commands/configureCommand';

// Keep configure
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { version } = import('../../package.json');

/**
 * Sets up the command-line interface definitions using Commander.js.
 * For an interactive experience, run the app without subcommands.
 * @returns The configured Commander program instance.
 */
export function setupCLI(): Command {
  const program = new Command();

  program
    .name('ai-shell-js')
    .description('CLI to interact with LLMs for shell tasks. Run without arguments for interactive mode.')
    .version(version || '0.0.1');

  // Keep the configure command
  program.addCommand(configureCommand);

  // Optionally, keep generate and explain for non-interactive use cases
  // If kept, they would use the Orchestrator directly as before.
  // For a purely interactive focus, these can be removed.
  // program.addCommand(generateCommand);
  // program.addCommand(explainCommand);

  // Add a note about interactive mode to the help output
  program.addHelpText(
    'after',
    `
Examples:
  $ ai-shell-js                    # Start interactive session
  $ ai-shell-js configure          # Configure LLM providers and settings
  `,
  );

  return program;
}
