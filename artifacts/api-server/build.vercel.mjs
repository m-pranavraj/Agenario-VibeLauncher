/**
 * Vercel-specific build script.
 * Bundles src/vercel.ts (serverless-http wrapper) to ../../api/handler.mjs
 * at the workspace root. vercel.json points @vercel/node at that file.
 */
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build as esbuild } from "esbuild";
import esbuildPluginPino from "esbuild-plugin-pino";
import { rm, mkdir } from "node:fs/promises";

globalThis.require = createRequire(import.meta.url);

const artifactDir = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(artifactDir, "../..");
const apiDir = path.resolve(workspaceRoot, "api");

await rm(apiDir, { recursive: true, force: true });
await mkdir(apiDir, { recursive: true });

const external = [
  "*.node", "sharp", "better-sqlite3", "sqlite3", "canvas", "bcrypt",
  "argon2", "fsevents", "re2", "farmhash", "xxhash-addon", "bufferutil",
  "utf-8-validate", "ssh2", "cpu-features", "dtrace-provider", "isolated-vm",
  "lightningcss", "pg-native", "oracledb", "mongodb-client-encryption",
  "nodemailer", "handlebars", "knex", "typeorm", "protobufjs",
  "onnxruntime-node", "@tensorflow/*", "@prisma/client", "@mikro-orm/*",
  "@grpc/*", "@swc/*", "@aws-sdk/*", "@azure/*", "@opentelemetry/*",
  "@google-cloud/*", "@google/*", "googleapis", "firebase-admin",
  "adm-zip", "playwright", "playwright-core", "puppeteer",
  "puppeteer-core", "electron",
];

await esbuild({
  entryPoints: [path.resolve(artifactDir, "src/vercel.ts")],
  platform: "node",
  bundle: true,
  format: "esm",
  outdir: apiDir,
  outExtension: { ".js": ".mjs" },
  logLevel: "info",
  external,
  sourcemap: "linked",
  plugins: [esbuildPluginPino({ transports: ["pino-pretty"] })],
  banner: {
    js: `import { createRequire as __bannerCrReq } from 'node:module';
import __bannerPath from 'node:path';
import __bannerUrl from 'node:url';

globalThis.require = __bannerCrReq(import.meta.url);
globalThis.__filename = __bannerUrl.fileURLToPath(import.meta.url);
globalThis.__dirname = __bannerPath.dirname(globalThis.__filename);
`,
  },
  define: { "process.env.NODE_ENV": '"production"' },
});

// esbuild names it vercel.mjs — rename to handler.mjs for vercel.json routing
import { rename } from "node:fs/promises";
const src = path.resolve(apiDir, "vercel.mjs");
const dst = path.resolve(apiDir, "handler.mjs");
await rename(src, dst).catch(() => {}); // ignore if already named handler.mjs

console.log(`✓ Vercel handler bundled → ${dst}`);
