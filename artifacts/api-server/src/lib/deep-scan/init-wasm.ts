import { createRequire } from "node:module";
import path from "node:path";

const _require = createRequire(import.meta.url);

let initialized = false;
let ParserClass: any;
let LanguageClass: typeof import("web-tree-sitter").Language;

const WASM_PATHS: Record<string, string> = {
  javascript: "tree-sitter-javascript/tree-sitter-javascript.wasm",
  tsx: "tree-sitter-typescript/tree-sitter-tsx.wasm",
  typescript: "tree-sitter-typescript/tree-sitter-typescript.wasm",
  python: "tree-sitter-python/tree-sitter-python.wasm",
  go: "tree-sitter-go/tree-sitter-go.wasm",
  rust: "tree-sitter-rust/tree-sitter-rust.wasm",
};

function resolveWasmPath(relativePath: string): string {
  try {
    const pkgJson = _require.resolve(relativePath.replace(/\.wasm$/, ""));
    return pkgJson;
  } catch {
    try {
      const pkgDir = path.dirname(
        _require.resolve(relativePath.split("/")[0] + "/package.json"),
      );
      const wasmFile = relativePath.split("/")[1];
      return path.join(pkgDir, wasmFile);
    } catch {
      try {
        const pkgDir = path.dirname(
          _require.resolve(
            path.join("..", "..", relativePath.split("/")[0], "package.json"),
          ),
        );
        const wasmFile = relativePath.split("/")[1];
        return path.join(pkgDir, wasmFile);
      } catch {
        return relativePath;
      }
    }
  }
}

export async function ensureWasmInit(): Promise<void> {
  if (initialized) return;

  const ts = await import("web-tree-sitter");
  ParserClass = ts.default;
  LanguageClass = ts.Language;

  const wasmPath = resolveWasmPath("web-tree-sitter/web-tree-sitter.wasm");
  await ParserClass.init({
    locateFile(scriptName: string) {
      return scriptName === "tree-sitter.wasm" ? wasmPath : scriptName;
    },
  });

  initialized = true;
}

export async function createParser(): Promise<any> {
  await ensureWasmInit();
  return new ParserClass();
}

const languageCache = new Map<string, import("web-tree-sitter").Language>();

export async function getLanguage(
  langName: string,
): Promise<import("web-tree-sitter").Language | null> {
  if (languageCache.has(langName)) {
    return languageCache.get(langName)!;
  }

  const wasmRelPath = WASM_PATHS[langName];
  if (!wasmRelPath) return null;

  try {
    await ensureWasmInit();
    const wasmPath = resolveWasmPath(wasmRelPath);
    const lang = await LanguageClass.load(wasmPath);
    languageCache.set(langName, lang);
    return lang;
  } catch (err) {
    return null;
  }
}

export function getLanguageForFile(
  filePath: string,
): string | null {
  const ext = path.extname(filePath).toLowerCase();
  const base = path.basename(filePath).toLowerCase();

  if (base === "package.json") return null;

  switch (ext) {
    case ".js":
    case ".jsx":
    case ".mjs":
    case ".cjs":
      return "javascript";
    case ".ts":
      return "typescript";
    case ".tsx":
      return "tsx";
    case ".py":
      return "python";
    case ".go":
      return "go";
    case ".rs":
      return "rust";
    default:
      return null;
  }
}
