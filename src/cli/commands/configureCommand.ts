import { Command } from 'commander';

import { Orchestrator } from '../../core/orchestrator';

export const configureCommand = new Command('configure')
  .alias('config')
  .description('Configure settings for ai-shell-js, including API keys and LLM providers.')
  .action(async () => {
    const orchestrator = new Orchestrator();
    await orchestrator.handleConfigureCommand();
  });
