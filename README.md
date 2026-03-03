# sss (supershell)

A Unix-only Node.js CLI toolkit with useful shell utilities and polished terminal output.

## Install

Install globally from GitHub:

```bash
npm i -g https://github.com/sebastianrcnt/sss/tarball/main
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
