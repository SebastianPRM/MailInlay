import { defineConfig } from "tsup"

export default defineConfig([
  {
    tsconfig: "tsconfig.sdk.json",
    entry: { react: "src/react/index.ts" },
    format: ["esm"],
    dts: true,
    clean: true,
    splitting: false,
    sourcemap: true,
    banner: { js: '"use client";' },
    external: ["react", "react-dom"],
  },
  {
    tsconfig: "tsconfig.sdk.json",
    entry: { next: "src/next/index.ts" },
    format: ["esm"],
    dts: true,
    clean: false,
    splitting: false,
    sourcemap: true,
    platform: "node",
  },
])
