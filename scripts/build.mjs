import { build } from "esbuild";
import { chmod } from "node:fs/promises";

await build({
    entryPoints: ["src/cli.ts"],
    outfile: "dist/sss",
    bundle: true,
    platform: "node",
    format: "esm",
    target: ["node18"],
    sourcemap: true,
    banner: { js: "#!/usr/bin/env node" },
    // Optional: keep these external if you *don't* want them bundled
    // external: ["fsevents"]
});

await chmod("dist/sss", 0o755);
