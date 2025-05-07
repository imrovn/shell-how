#!/usr/bin/env bun
// src/index.ts
import dotenv from 'dotenv';

import { setupCLI } from './cli';
// This will primarily set up the 'configure' command now
import { InteractiveSession } from './interactiveSession';

dotenv.config();

/**
 * Main function to set up and run the CLI application.
 * It prioritizes an interactive session if no specific commands are given.
 */
async function main() {
  const program = setupCLI(); // Sets up commands like 'configure'

  // If arguments are passed beyond 'bun src/index.ts' (or the executable name)
  // and the first argument is a known command, let Commander handle it.
  // Otherwise, start interactive session.
  const args = process.argv.slice(2); // Remove 'bun' and 'src/index.ts'

  // Check if a specific command (like 'configure') is being invoked
  const knownCommands = program.commands.map((cmd) => cmd.name()).concat(program.commands.map((cmd) => cmd.alias()));
  if (args.length > 0 && knownCommands.includes(args[0])) {
    try {
      await program.parseAsync(process.argv);
    } catch (error) {
      console.error('An error occurred while running the command:', error);
      process.exit(1);
    }
  } else if (args.length > 0 && (args[0] === '-h' || args[0] === '--help')) {
    program.outputHelp(); // Show help if -h or --help is explicitly passed without a command
  } else if (args.length > 0) {
    // If some args are passed but not a known command, it might be an attempt to use old generate/explain
    console.log('Unknown command or arguments. Starting interactive session.');
    console.log("Use 'ai-shell-js configure' for settings, or just 'ai-shell-js' for interactive mode.");
    const session = new InteractiveSession();
    await session.start();
  } else {
    // No arguments, or arguments that don't match a command: start interactive mode
    const session = new InteractiveSession();
    await session.start();
  }
}

main();
