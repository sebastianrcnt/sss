import { parse } from '@bomb.sh/args';
import { intro, log, outro } from '@clack/prompts';
import { runPortsCommand } from './commands/ports.js';

type ParsedArgs = {
  _: Array<string | number>;
  help?: boolean;
};

type PortsArgs = {
  _: Array<string | number>;
  help?: boolean;
  sudo?: boolean;
};

function usage(): void {
  log.message('Usage: sss <command>');
  log.message('');
  log.message('Commands:');
  log.message('  ports    Show bound addresses/ports and related processes');
}

function portsUsage(): void {
  log.message('Usage: sss ports [--sudo]');
  log.message('');
  log.message('Options:');
  log.message('  -s, --sudo    Run socket inspection via sudo for better PID/process visibility');
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
    case 'ports': {
      const portsArgs = parse(process.argv.slice(3), {
        boolean: ['help', 'sudo'],
        alias: { h: 'help', s: 'sudo' }
      }) as PortsArgs;

      if (portsArgs.help) {
        portsUsage();
        return;
      }

      await runPortsCommand({ sudo: Boolean(portsArgs.sudo) });
      return;
    }
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
