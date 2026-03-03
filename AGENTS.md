# AGENTS.md

## Project
- Name: `sss` (supershell)
- Purpose: Node.js CLI toolkit with useful Unix/Linux utilities and polished terminal output
- Distribution: GitHub only (not npm)
- Platform: Unix-only

## Stack
- Runtime: Node.js + TypeScript
- CLI UI: `@clack/prompts`, `@clack/core`
- Command routing: `@bomb.sh/args`
- Entry command: `sss <command>`

## Repository Structure
- `package.json` (`bin`: `{ "sss": "./dist/cli.js" }`)
- `tsconfig.json`
- `src/cli.ts` (entry point + command router)
- `src/commands/*.ts` (one file per command)

## Implemented Command
### `sss ports`
- Shows bound addresses/ports and associated processes on the current machine
- Data source priority:
  1. Parse `ss` output
  2. Fallback to `lsof -i`
- Output columns:
  - Protocol
  - Address
  - Port
  - PID
  - Process Name
  - State
- UX requirements:
  - Group or highlight by state (`LISTEN`, `ESTABLISHED`, etc.)
  - Color-code protocol (`TCP`/`UDP`)
  - Handle permission-related PID visibility issues gracefully
  - Show a spinner while collecting data

## Development Rules
- TypeScript strict mode is required
- Keep each command in its own file under `src/commands/`
- Ensure `npm link` compatibility so `sss` is globally available after link
- Clear error and non-zero exit on Windows
