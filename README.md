# sss (supershell)

A Unix-only Node.js CLI toolkit with useful shell utilities and polished terminal output.

## Install

Install directly from GitHub with npm:

```bash
npm install -g github:<OWNER>/<REPO>
```

Example:

```bash
npm install -g github:coolguy/sss
```

Install a specific tagged version:

```bash
npm install -g github:<OWNER>/<REPO>#v0.1.0
```

After install:

```bash
sss --help
sss ports
```

## Local development

```bash
npm install
npm run build
npm link
```

Then `sss` is available globally on your machine via `npm link`.

## Commands

- `sss ports`: show bound addresses/ports and associated processes
