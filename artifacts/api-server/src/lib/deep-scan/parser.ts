import fs from "node:fs";
import path from "node:path";
import { createParser, getLanguage, getLanguageForFile } from "./init-wasm.js";
import type { CsgNode, CsgNodeType } from "./types.js";

export interface ParsedFile {
  filePath: string;
  relPath: string;
  language: string;
  tree: import("web-tree-sitter").Tree;
  content: string;
  lines: string[];
}

export interface AstEntity {
  id: string;
  type: CsgNodeType;
  name: string;
  file: string;
  line: number;
  column: number;
  endLine: number;
  endColumn: number;
  code: string;
  parentId: string | null;
  children: AstEntity[];
  meta: Record<string, unknown>;
}

const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  ".next",
  "dist",
  "build",
  ".cache",
  "coverage",
  ".turbo",
  "out",
  ".vercel",
  "vendor",
  "__pycache__",
  ".pnpm",
]);

const SKIP_EXTS = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".svg", ".ico",
  ".woff", ".woff2", ".ttf", ".eot",
  ".mp4", ".mp3", ".zip", ".tar", ".gz",
  ".lock", ".min.js", ".min.css",
  ".wasm", ".map",
]);

function shouldSkipFile(filePath: string): boolean {
  const base = path.basename(filePath);
  const ext = path.extname(filePath);
  if (SKIP_EXTS.has(ext)) return true;
  if (base.endsWith(".min.js") || base.endsWith(".min.css")) return true;
  if (base === "pnpm-lock.yaml" || base === "yarn.lock" || base === "package-lock.json") return true;
  return false;
}

function collectFiles(dir: string, maxFiles = 200): string[] {
  const results: string[] = [];
  function walk(current: string, depth: number): void {
    if (depth > 6 || results.length >= maxFiles) return;
    try {
      for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
        if (results.length >= maxFiles) break;
        const full = path.join(current, entry.name);
        if (entry.isDirectory()) {
          if (!SKIP_DIRS.has(entry.name)) walk(full, depth + 1);
        } else if (!shouldSkipFile(full)) {
          results.push(full);
        }
      }
    } catch {}
  }
  walk(dir, 0);
  return results;
}

export async function parseDirectory(
  dir: string,
  baseDir?: string,
): Promise<{
  parsedFiles: ParsedFile[];
  astEntities: AstEntity[];
  rawFindings: Array<{ file: string; line: number; message: string; severity: string }>;
}> {
  const allFiles = collectFiles(dir);
  const relBase = baseDir ?? dir;
  const parsedFiles: ParsedFile[] = [];
  const astEntities: AstEntity[] = [];
  const rawFindings: Array<{ file: string; line: number; message: string; severity: string }> = [];

  for (const filePath of allFiles) {
    const langName = getLanguageForFile(filePath);
    if (!langName) continue;

    try {
      const stat = fs.statSync(filePath);
      if (stat.size > 200_000) continue;

      const content = fs.readFileSync(filePath, "utf8");
      const lines = content.split("\n");
      const relPath = path.relative(relBase, filePath);

      const lang = await getLanguage(langName);
      if (!lang) {
        rawFindings.push({
          file: relPath,
          line: 0,
          message: `Could not load tree-sitter language: ${langName}`,
          severity: "info",
        });
        continue;
      }

      const parser = await createParser();
      parser.setLanguage(lang);
      const tree = parser.parse(content);

      if (tree) {
        parsedFiles.push({ filePath, relPath, language: langName, tree, content, lines });

        const entities = extractEntities(
          tree,
          content,
          relPath,
          langName,
        );
        astEntities.push(...entities);
      }
    } catch (err) {
      rawFindings.push({
        file: path.relative(relBase, filePath),
        line: 0,
        message: `Parse error: ${err instanceof Error ? err.message : String(err)}`,
        severity: "info",
      });
    }
  }

  return { parsedFiles, astEntities, rawFindings };
}

function extractEntities(
  tree: import("web-tree-sitter").Tree,
  content: string,
  filePath: string,
  language: string,
): AstEntity[] {
  const entities: AstEntity[] = [];
  const root = tree.rootNode;

  function getNodeText(node: { startPosition: { row: number; endPosition?: { row: number } }; endPosition: { row: number } }): string {
    const startLine = node.startPosition.row;
    const endLine = node.endPosition.row;
    return content.split("\n").slice(startLine, endLine + 1).join("\n");
  }

  function getNodeType(node: { type: string; parent?: { type: string } }): CsgNodeType {
    const t = node.type;
    if (t === "function_declaration" || t === "function" || t === "method_definition" ||
        t === "arrow_function" || t === "function_expression") return "function";
    if (t === "variable_declaration" || t === "lexical_declaration" || t === "variable_declarator") return "variable";
    if (t === "if_statement" || t === "conditional" || t === "ternary_expression" ||
        t === "switch_case" || t === "switch_statement") return "conditional";
    if (t === "call_expression" || t === "new_expression") return "expression";
    if (t === "assignment_expression" || t === "assignment") return "assignment";
    if (t === "import_statement" || t === "import" || t === "require_function") return "import";
    if (t === "return_statement") return "return";
    if (t === "string" || t === "number" || t === "boolean" || t === "null") return "literal";
    if (t === "catch_clause" || t === "try_statement") return "try_catch";
    if (t === "formal_parameter" || t === "parameter") return "parameter";
    return "expression";
  }

  function walk(node: { type: string; children: any[]; startPosition: { row: number; column: number }; endPosition: { row: number; column: number }; parent: any; childCount: number; namedChildCount: number }, parentId: string | null): void {
    const nodeType = getNodeType(node);
    const id = `${filePath}:${node.startPosition.row}:${node.startPosition.column}:${node.type}`;

    const entity: AstEntity = {
      id,
      type: nodeType,
      name: node.type,
      file: filePath,
      line: node.startPosition.row + 1,
      column: node.startPosition.column + 1,
      endLine: node.endPosition.row + 1,
      endColumn: node.endPosition.column + 1,
      code: "",
      parentId,
      children: [],
      meta: {},
    };

    entities.push(entity);

    for (let i = 0; i < node.childCount; i++) {
      const child = node.children[i];
      if (child) walk(child, id);
    }
  }

  for (let i = 0; i < root.childCount; i++) {
    const child = root.children[i];
    if (child) walk(child, null);
  }

  return entities;
}
