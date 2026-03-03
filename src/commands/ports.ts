import { spawn } from 'node:child_process';
import { log, note, spinner } from '@clack/prompts';
import pc from 'picocolors';

export type PortRow = {
  protocol: string;
  address: string;
  port: string;
  pid: string;
  processName: string;
  state: string;
};

type CmdResult = {
  code: number;
  stdout: string;
  stderr: string;
  error?: Error;
};

export type PortsCommandOptions = {
  sudo?: boolean;
};

async function runCommand(command: string, args: string[]): Promise<CmdResult> {
  return new Promise<CmdResult>((resolve) => {
    const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    child.on('error', (error: Error) => {
      resolve({ code: 1, stdout, stderr, error });
    });

    child.on('close', (code: number | null) => {
      resolve({ code: code ?? 1, stdout, stderr });
    });
  });
}

function withSudo(command: string, args: string[], useSudo: boolean): { command: string; args: string[]; label: string } {
  if (!useSudo) {
    return { command, args, label: `${command} ${args.join(' ')}`.trim() };
  }

  return {
    command: 'sudo',
    args: [command, ...args],
    label: `sudo ${command} ${args.join(' ')}`.trim()
  };
}

function isPermissionIssue(stderr: string): boolean {
  const message = stderr.toLowerCase();
  return (
    message.includes('permission') ||
    message.includes('operation not permitted') ||
    message.includes('not allowed') ||
    message.includes('a password is required')
  );
}

export function splitAddressPort(endpoint: string): { address: string; port: string } {
  if (!endpoint) {
    return { address: '-', port: '-' };
  }

  if (endpoint.startsWith('[')) {
    const closingIndex = endpoint.lastIndexOf(']');
    const address = closingIndex > -1 ? endpoint.slice(1, closingIndex) : endpoint;
    const portPart = closingIndex > -1 ? endpoint.slice(closingIndex + 1) : '';
    const port = portPart.startsWith(':') ? portPart.slice(1) : '-';
    return { address: address || '-', port: port || '-' };
  }

  const idx = endpoint.lastIndexOf(':');
  if (idx < 0) {
    return { address: endpoint, port: '-' };
  }

  const address = endpoint.slice(0, idx);
  const port = endpoint.slice(idx + 1);

  return {
    address: address || '-',
    port: port || '-'
  };
}

function parseProcessPart(text: string): { pid: string; processName: string } {
  const m = text.match(/\("([^\"]+)",pid=(\d+)/);
  if (!m) {
    return { pid: '-', processName: '-' };
  }

  return {
    processName: decodeHexEscapes(m[1]),
    pid: m[2]
  };
}

function decodeHexEscapes(text: string): string {
  return text.replace(/\\x([0-9A-Fa-f]{2})/g, (_match, hex: string) =>
    String.fromCharCode(parseInt(hex, 16))
  );
}

export function parseSs(output: string): PortRow[] {
  const rows: PortRow[] = [];

  for (const raw of output.split('\n')) {
    const line = raw.trim();
    if (!line) {
      continue;
    }

    if (line.toLowerCase().startsWith('netid ')) {
      continue;
    }

    const m = line.match(/^(\S+)\s+(\S+)\s+\S+\s+\S+\s+(\S+)\s+(\S+)\s*(.*)$/);
    if (!m) {
      continue;
    }

    const protocol = m[1].toUpperCase();
    if (!protocol.startsWith('TCP') && !protocol.startsWith('UDP')) {
      continue;
    }
    const state = m[2].toUpperCase();
    const local = m[3];
    const processPart = m[5] ?? '';
    const { address, port } = splitAddressPort(local);
    const { pid, processName } = parseProcessPart(processPart);

    rows.push({
      protocol,
      address,
      port,
      pid,
      processName,
      state
    });
  }

  return rows;
}

export function parseLsof(output: string): PortRow[] {
  const rows: PortRow[] = [];
  const lines = output.split('\n').filter((line) => line.trim().length > 0);

  for (let i = 1; i < lines.length; i += 1) {
    const line = lines[i];
    const parts = line.trim().split(/\s+/);

    if (parts.length < 2) {
      continue;
    }

    const processName = decodeHexEscapes(parts[0] ?? '-');
    const pid = parts[1] ?? '-';

    const protoMatch = line.match(/\b(TCP|UDP)\S*\b/i);
    const protocol = (protoMatch?.[1] ?? 'UNKNOWN').toUpperCase();

    const stateMatch = line.match(/\(([^)]+)\)\s*$/);
    const state = (stateMatch?.[1] ?? (protocol === 'UDP' ? 'UNCONN' : 'UNKNOWN')).toUpperCase();

    const endpointMatch = line.match(/\b(?:TCP|UDP)\S*\s+([^\s]+)/i);
    const endpoint = endpointMatch?.[1] ?? '';
    const localEndpoint = endpoint.split('->')[0] ?? endpoint;
    const { address, port } = splitAddressPort(localEndpoint);

    rows.push({
      protocol,
      address,
      port,
      pid,
      processName,
      state
    });
  }

  return rows;
}

function pad(text: string, width: number): string {
  const raw = text;
  if (raw.length >= width) {
    return raw;
  }

  return raw + ' '.repeat(width - raw.length);
}

function colorProtocol(protocol: string): string {
  if (protocol.startsWith('TCP')) {
    return pc.cyan(protocol);
  }

  if (protocol.startsWith('UDP')) {
    return pc.magenta(protocol);
  }

  return pc.gray(protocol);
}

function colorState(state: string): string {
  if (state === 'LISTEN') {
    return pc.green(state);
  }

  if (state === 'ESTABLISHED') {
    return pc.blue(state);
  }

  if (state === 'UNCONN') {
    return pc.yellow(state);
  }

  return pc.gray(state);
}

function renderTable(rows: PortRow[]): string {
  const headers = ['Protocol', 'Address', 'Port', 'PID', 'Process Name', 'State'];
  const matrix = rows.map((row) => [
    row.protocol,
    row.address,
    row.port,
    row.pid,
    row.processName,
    row.state
  ]);

  const widths = headers.map((header, col) => {
    const values = matrix.map((r) => r[col]);
    return Math.max(header.length, ...values.map((v) => v.length));
  });

  const headerLine = headers.map((h, i) => pc.bold(pad(h, widths[i]))).join('  ');
  const dividerLine = widths.map((w) => '-'.repeat(w)).join('  ');

  const body = rows
    .map((row) => {
      const values = [
        colorProtocol(row.protocol),
        row.address,
        row.port,
        row.pid,
        row.processName,
        colorState(row.state)
      ];

      const rawValues = [row.protocol, row.address, row.port, row.pid, row.processName, row.state];
      return values.map((v, i) => pad(v, widths[i] + (v.length - rawValues[i].length))).join('  ');
    })
    .join('\n');

  return `${headerLine}\n${dividerLine}\n${body}`;
}

export async function runPortsCommand(options: PortsCommandOptions = {}): Promise<void> {
  const useSudo = Boolean(options.sudo);
  const loading = spinner();
  loading.start(useSudo ? 'Collecting socket data with sudo...' : 'Collecting socket data...');

  const ssInvocation = withSudo('ss', ['-tulnp'], useSudo);
  const ssResult = await runCommand(ssInvocation.command, ssInvocation.args);
  let rows: PortRow[] = [];
  let source = ssInvocation.label;
  let permissionWarning = '';

  if (isPermissionIssue(ssResult.stderr)) {
    permissionWarning = ssResult.stderr.trim();
  }

  if (ssResult.code === 0 && ssResult.stdout.trim()) {
    rows = parseSs(ssResult.stdout);
  } else {
    // `lsof` truncates COMMAND by default; `+c 0` keeps the full process name.
    const lsofInvocation = withSudo('lsof', ['-nP', '-i', '+c', '0'], useSudo);
    const lsofResult = await runCommand(lsofInvocation.command, lsofInvocation.args);
    source = lsofInvocation.label;

    if (isPermissionIssue(lsofResult.stderr)) {
      permissionWarning = permissionWarning || lsofResult.stderr.trim();
    }

    if (lsofResult.code === 0 && lsofResult.stdout.trim()) {
      rows = parseLsof(lsofResult.stdout);
    }
  }

  loading.stop('Socket data collected');

  if (rows.length === 0) {
    log.warn('No ports found or insufficient permissions to inspect processes.');
    if (permissionWarning) {
      note(permissionWarning, 'Permission warning');
    }
    return;
  }

  const grouped = new Map<string, PortRow[]>();
  for (const row of rows) {
    const key = row.state || 'UNKNOWN';
    const bucket = grouped.get(key) ?? [];
    bucket.push(row);
    grouped.set(key, bucket);
  }

  const orderedStates = Array.from(grouped.keys()).sort((a, b) => a.localeCompare(b));

  log.info(`Source: ${source}`);
  for (const state of orderedStates) {
    const stateRows = grouped.get(state) ?? [];
    note(renderTable(stateRows), `${state} (${stateRows.length})`);
  }

  if (permissionWarning) {
    note(permissionWarning, 'Permission warning');
  }
}
