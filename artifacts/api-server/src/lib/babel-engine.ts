import { logger } from "./logger.js";
import { buildCSG, bfsForward, bfsBackward, tarjanSCC, type CSG, type CSGNode } from "./csg-builder.js";

export interface BabelEngineResult {
  irTopologyHash: string;
  crossBoundaryTaints: string[];
  polyglotScore: number;
  sanitizationCoverage: number;
  boundaryIntegrity: number;
  totalBoundaries: number;
  sanitizedBoundaries: number;
  unsanitizedBoundaries: number;
  insight: string;
}

const SANITIZER_PATTERNS = [
  /\b(escape|sanitize|encode|purify|validate|cleanse|strip|neutralize)\b/gi,
  /\b(DOMPurify|sanitizeHtml|xss|csrf|antiXSS|escapeHtml)\b/gi,
];

const SOURCE_SINKS: Array<{ source: RegExp; sink: RegExp; boundary: string; severity: number }> = [
  { source: /req\.(body|query|params)|request\.(body|query)|Input\(|stdin|readFile|fetch\(|http\.get|axios\.get/, sink: /\b(eval|exec|Function|setTimeout|setInterval|child_process|spawn|execSync)\b/, boundary: "User-Input-to-Code-Execution", severity: 10 },
  { source: /req\.(body|query|params)|request\.(body|query)|Input\(|stdin|readFile|fetch\(|http\.get/, sink: /\b(SQL|query|execute|raw\(|createQueryBuilder|findOne|findMany|insert|update|delete)\b/, boundary: "User-Input-to-SQL", severity: 10 },
  { source: /req\.(body|query|params)|request\.(body|query)|Input\(|stdin/, sink: /\b(res\.(send|json|render)|response\.(send|json)|write\(|console\.log)\b/, boundary: "User-Input-to-Response", severity: 5 },
  { source: /fetch\(|http\.(get|post)|axios\.(get|post)|WebSocket|socket\.(emit|on)/, sink: /\b(eval|Function|innerHTML|dangerouslySetInnerHTML|document\.write)\b/, boundary: "Network-to-Code-Execution", severity: 9 },
  { source: /readFile|fs\.(read|write|create)|path\.join|__dirname|process\.env/, sink: /\b(eval|exec|Function|spawn|execSync)\b/, boundary: "FileSystem-to-Code-Execution", severity: 10 },
  { source: /req\.(body|query|params)|Cookie|cookie|session/, sink: /\b(auth|login|authenticate|verifyToken|jwt|sign)\b/, boundary: "User-Input-to-Auth", severity: 8 },
];

function computeCanonicalHash(nodes: CSGNode[], edges: any[]): string {
  const nodeIds = nodes.map(n => `${n.type}:${n.label}:${n.filePath}`).sort().join("|");
  const edgeKeys = edges.map(e => `${e.from}->${e.to}:${e.type}`).sort().join("|");
  const raw = `${nodeIds}::${edgeKeys}`;
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    const char = raw.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).padStart(16, "0");
  const checksum = Buffer.from(raw).toString("base64").slice(0, 16).replace(/[+/=]/g, "").toUpperCase();
  return `IR-${hex}-${checksum}`;
}

export function runBabelEngine(keyFiles: Array<{ path: string; content: string }>, csg: CSG): BabelEngineResult {
  const allContent = keyFiles.map(f => f.content).join("\n");
  const sanitizerRegex = new RegExp(SANITIZER_PATTERNS.map(p => p.source).join("|"), "gi");

  const sanitizerNodes = [...csg.nodes.values()].filter(n => {
    const content = keyFiles.find(f => f.path === n.filePath)?.content ?? "";
    return sanitizerRegex.test(content) && (n.type === "function" || n.type === "source");
  });

  const totalTaints: string[] = [];
  let unsanitizedCount = 0;
  let sanitizedCount = 0;

  for (const boundary of SOURCE_SINKS) {
    const sourceNodes = [...csg.nodes.values()].filter(n => {
      const content = keyFiles.find(f => f.path === n.filePath)?.content ?? "";
      return boundary.source.test(n.label) || boundary.source.test(content);
    });

    for (const source of sourceNodes) {
      const reachable = bfsForward(csg, [source.id], ["calls", "handles", "data_flow", "queries"], 15);
      const sinkNodes = [...csg.nodes.values()].filter(n =>
        reachable.has(n.id) && boundary.sink.test(n.label),
      );

      for (const sink of sinkNodes) {
        const path = reachable.has(sink.id);
        const sanitized = sanitizerNodes.some(s => reachable.has(s.id));

        if (path) {
          totalTaints.push(`${source.filePath}:${source.lineStart} → ${sink.filePath}:${sink.lineStart} [${boundary.boundary}]`);

          if (sanitized) {
            sanitizedCount++;
          } else {
            unsanitizedCount++;
          }
        }
      }
    }
  }

  const totalBoundaries = unsanitizedCount + sanitizedCount;
  const sanitizationCoverage = totalBoundaries > 0 ? Math.round((sanitizedCount / totalBoundaries) * 100) : 100;
  const boundaryIntegrity = totalBoundaries > 0 ? Math.round((1 - unsanitizedCount / totalBoundaries) * 100) : 100;
  const polyglotScore = Math.max(0, Math.min(100, boundaryIntegrity - unsanitizedCount * 5));

  const irTopologyHash = computeCanonicalHash([...csg.nodes.values()], [...csg.edges.values()]);

  let insight = "";
  if (unsanitizedCount === 0 && totalBoundaries > 0) {
    insight = `All ${totalBoundaries} cross-boundary taint paths are sanitized. Polyglot integrity is high.`;
  } else if (unsanitizedCount > 0) {
    insight = `${unsanitizedCount} unsanitized cross-boundary taint path(s) detected across ${totalBoundaries} total boundaries. Highest risk: ${totalTaints[0] ?? "none"}.`;
  } else {
    insight = "No cross-boundary taint paths detected in the scanned files.";
  }

  logger.info({ totalTaints: totalTaints.length, unsanitizedCount, irTopologyHash }, "Babel Engine complete");

  return {
    irTopologyHash,
    crossBoundaryTaints: totalTaints.slice(0, 50),
    polyglotScore,
    sanitizationCoverage,
    boundaryIntegrity,
    totalBoundaries,
    sanitizedBoundaries: sanitizedCount,
    unsanitizedBoundaries: unsanitizedCount,
    insight,
  };
}
