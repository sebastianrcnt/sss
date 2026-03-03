#!/usr/bin/env node
import { parse } from '@bomb.sh/args';
import { intro, log, outro } from '@clack/prompts';
import { runPortsCommand } from './commands/ports.js';

type ParsedArgs = {
  _: Array<string | number>;
  help?: boolean;
};

function usage(): void {
  log.message('Usage: sss <command>');
  log.message('');
  log.message('Commands:');
  log.message('  ports    Show bound addresses/ports and related processes');
}

async function main(): Promise<void> {
  if (process.platform === 'win32') {
    log.error('sss is Unix-only. Windows is not supported.');
    process.exit(1);
  }

  const args = parse(process.argv.slice(2), {
    boolean: ['help'],
    alias: { h: 'help' }
  }) as ParsedArgs;

  const command = String(args._[0] ?? '');

  if (args.help || !command) {
    intro('sss - supershell');
    usage();
    outro('Done');
    return;
  }

  switch (command) {
    case 'ports':
      await runPortsCommand();
      return;
    default:
      log.error(`Unknown command: ${command}`);
      usage();
      process.exit(1);
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  log.error(`Unexpected error: ${message}`);
  process.exit(1);
});
