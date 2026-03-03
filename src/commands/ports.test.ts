import { describe, expect, it } from 'vitest';
import { parseLsof, parseSs, splitAddressPort } from './ports.js';

describe('splitAddressPort', () => {
  it('splits IPv4 endpoint', () => {
    expect(splitAddressPort('127.0.0.1:3000')).toEqual({ address: '127.0.0.1', port: '3000' });
  });

  it('splits bracketed IPv6 endpoint', () => {
    expect(splitAddressPort('[::1]:443')).toEqual({ address: '::1', port: '443' });
  });

  it('handles wildcard and missing endpoint', () => {
    expect(splitAddressPort('*:22')).toEqual({ address: '*', port: '22' });
    expect(splitAddressPort('')).toEqual({ address: '-', port: '-' });
  });
});

describe('parseSs', () => {
  it('parses ss output rows with pid/process', () => {
    const input = [
      'Netid State  Recv-Q Send-Q Local Address:Port Peer Address:Port Process',
      'tcp   LISTEN 0      511    127.0.0.1:5432      0.0.0.0:* users:(("postgres",pid=123,fd=5))',
      'udp   UNCONN 0      0      0.0.0.0:68          0.0.0.0:* users:(("dhclient",pid=55,fd=6))'
    ].join('\n');

    expect(parseSs(input)).toEqual([
      {
        protocol: 'TCP',
        state: 'LISTEN',
        address: '127.0.0.1',
        port: '5432',
        pid: '123',
        processName: 'postgres'
      },
      {
        protocol: 'UDP',
        state: 'UNCONN',
        address: '0.0.0.0',
        port: '68',
        pid: '55',
        processName: 'dhclient'
      }
    ]);
  });
});

describe('parseLsof', () => {
  it('parses lsof output rows', () => {
    const input = [
      'COMMAND   PID USER   FD   TYPE DEVICE SIZE/OFF NODE NAME',
      'node     1001 me    20u  IPv4 0x01      0t0   TCP 127.0.0.1:3000 (LISTEN)',
      'dnsmasq   510 root   5u  IPv4 0x02      0t0   UDP *:53'
    ].join('\n');

    expect(parseLsof(input)).toEqual([
      {
        protocol: 'TCP',
        state: 'LISTEN',
        address: '127.0.0.1',
        port: '3000',
        pid: '1001',
        processName: 'node'
      },
      {
        protocol: 'UDP',
        state: 'UNCONN',
        address: '*',
        port: '53',
        pid: '510',
        processName: 'dnsmasq'
      }
    ]);
  });
});
