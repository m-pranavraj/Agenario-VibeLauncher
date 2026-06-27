import crypto from "crypto";
import type { CombinedSemanticGraph, CsgNode, CsgEdge } from "./types.js";
import { REGULATION_RULES, type ComplianceRule, type ComplianceFinding, type DataClassification, type RegulationFramework } from "./compliance-rules.js";

export interface ProvenancePath {
  nodes: CsgNode[];
  edges: CsgEdge[];
  dataType: DataClassification;
  confidence: number;
}

const DATA_CLASSIFICATION_PATTERNS: Record<DataClassification, RegExp[]> = {
  pii: [
    /email/i, /e-?mail/i, /mail/i, /phone/i, /telephone/i,
    /address/i, /firstName/i, /lastName/i, /fullName/i, /name/i,
    /dob/i, /birth/i, /birthday/i, /date_of_birth/i,
    /social.?security/i, /ssn/i, /passport/i,
    /driver.?licen[cs]e/i, /national.?id/i, /tax.?id/i,
    /ip.?address/i, /user.?agent/i,
  ],
  phi: [
    /health/i, /medical/i, /patient/i, /diagnosis/i,
    /treatment/i, /prescription/i, /medication/i, /dosage/i,
    /symptom/i, /condition/i, /allergy/i, /clinical/i,
    /lab.?result/i, /test.?result/i, /doctor/i,
    /phi/i, /ehr/i, /emr/i, /hipaa/i,
    /protected.?health/i, /health.?record/i,
  ],
  pci: [
    /card.?number/i, /credit.?card/i, /debit.?card/i,
    /pan/i, /cvv/i, /cvc/i, /ccv/i, /card.?code/i,
    /expir/i, /payment/i, /charge/i, /transaction/i,
    /stripe.?token/i, /braintree/i,
    /cardholder/i, /cc_number/i, /ccNumber/i,
  ],
  financial: [
    /balance/i, /account/i, /transaction/i, /payment/i,
    /billing/i, /invoice/i, /refund/i, /payout/i,
    /revenue/i, /salary/i, /wage/i, /income/i,
    /bank.?account/i, /routing/i, /swift/i, /iban/i,
    /amount/i, /price/i, /cost/i, /fee/i,
  ],
  credentials: [
    /password/i, /passwd/i, /secret/i, /token/i,
    /api.?key/i, /apikey/i, /auth.?token/i,
    /jwt/i, /session.?id/i, /access.?token/i,
    /refresh.?token/i, /private.?key/i, /secret.?key/i,
    /credential/i, /login/i, /oauth/i,
  ],
  session: [
    /session/i, /cookie/i, /csrf/i, /xsrf/i,
    /csrf.?token/i, /xsrf.?token/i,
    /connect\.sid/i, /sessionToken/i,
  ],
  consent: [
    /consent/i, /opt.?in/i, /opt.?out/i, /gdpr/i,
    /cookie.?consent/i, /privacy.?preference/i,
    /marketing.?consent/i, /data.?consent/i,
    /ccpa/i, /lgpd/i,
  ],
  personal: [
    /profile/i, /preference/i, /setting/i, /config/i,
    /photo/i, /avatar/i, /picture/i, /image/i,
    /gender/i, /language/i, /timezone/i, /locale/i,
    /biography/i, /about/i, /description/i,
    /education/i, /occupation/i, /employer/i,
  ],
  biometric: [
    /fingerprint/i, /face.?id/i, /facial.?recognition/i,
    /voice.?print/i, /iris/i, /retina/i,
    /biometric/i, /biometrics/i,
    /dna/i, /genetic/i, /gait/i,
  ],
  location: [
    /latitude/i, /longitude/i, /lat/i, /lng/i,
    /location/i, /geo/i, /gps/i, /coordinates/i,
    /city/i, /state/i, /country/i, /zip.?code/i,
    /postal.?code/i, /timezone/i, /region/i,
  ],
};

export function traceDataProvenance(
  graph: CombinedSemanticGraph,
): ProvenancePath[] {
  const paths: ProvenancePath[] = [];
  const dataSinks = findDataSinks(graph);

  for (const sink of dataSinks) {
    const provenance = traceBackward(graph, sink);
    if (provenance) {
      paths.push(provenance);
    }
  }

  return deduplicateProvenancePaths(paths);
}

function findDataSinks(graph: CombinedSemanticGraph): CsgNode[] {
  const sinks: CsgNode[] = [];

  for (const node of graph.nodes.values()) {
    const code = node.code;
    if (!code) continue;

    const isDatabaseWrite = /\.(create|save|insert|update|upsert)\s*\(/i.test(code) ||
      /db\..*\.\w+\s*\(/i.test(code) ||
      /prisma\..*\.\w+\s*\(/i.test(code);

    const isApiCall = /(fetch|axios|got|request)\.?\s*\(/i.test(code) ||
      /\.post\s*\(/i.test(code) ||
      /stripe\./i.test(code);

    const isFileWrite = /writeFile|appendFile|createWriteStream/i.test(code);

    const isLogging = /logger\.\w+|console\.log|console\.error/i.test(code);

    const isResponse = /res\.(send|json|render)\(/i.test(code);

    if (isDatabaseWrite || isApiCall || isFileWrite || isLogging || isResponse) {
      sinks.push(node);
    }
  }

  return sinks;
}

function traceBackward(
  graph: CombinedSemanticGraph,
  sink: CsgNode,
): ProvenancePath | null {
  const visited = new Set<string>();
  const pathNodes: CsgNode[] = [sink];
  const pathEdges: CsgEdge[] = [];
  const classifications = new Set<DataClassification>();
  let current = sink;
  let depth = 0;

  visited.add(current.id);

  while (depth < 15) {
    const adj = graph.adjacency.get(current.id);
    if (!adj || adj.in.length === 0) break;

    let bestPrev: CsgNode | null = null;
    let bestEdge: CsgEdge | null = null;
    let bestScore = -1;

    for (const edge of adj.in) {
      if (edge.type !== "data_flow" && edge.type !== "assigns" && edge.type !== "imports") continue;
      const prevNode = graph.nodes.get(edge.sourceId);
      if (!prevNode || visited.has(prevNode.id)) continue;

      const score = scoreProvenanceNode(prevNode, edge);
      if (score > bestScore) {
        bestScore = score;
        bestPrev = prevNode;
        bestEdge = edge;
      }
    }

    if (!bestPrev || !bestEdge) break;

    visited.add(bestPrev.id);
    pathNodes.unshift(bestPrev);
    pathEdges.unshift(bestEdge);

    const nodeClass = classifyDataNode(bestPrev);
    if (nodeClass) classifications.add(nodeClass);

    current = bestPrev;
    depth++;
  }

  if (classifications.size === 0) return null;

  const primaryType = selectPrimaryClassification(classifications);
  const confidence = calculateProvenanceConfidence(classifications, pathEdges);

  return {
    nodes: pathNodes,
    edges: pathEdges,
    dataType: primaryType,
    confidence,
  };
}

function scoreProvenanceNode(node: CsgNode, edge: CsgEdge): number {
  let score = 0;

  if (edge.confidence > 0.9) score += 3;
  else if (edge.confidence > 0.7) score += 2;
  else score += 1;

  if (classifyDataNode(node)) score += 2;

  if (node.type === "variable" && node.name.length > 2) score += 1;
  if (node.type === "function") score -= 1;

  if (node.code && /req\.|body\.|query\.|params\./.test(node.code)) score += 3;

  return score;
}

function classifyDataNode(node: CsgNode): DataClassification | null {
  const code = node.code || "";
  const name = node.name || "";

  for (const [dataType, patterns] of Object.entries(DATA_CLASSIFICATION_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(code) || pattern.test(name)) {
        return dataType as DataClassification;
      }
    }
  }

  return null;
}

function selectPrimaryClassification(classifications: Set<DataClassification>): DataClassification {
  const priority: DataClassification[] = [
    "pci", "phi", "credentials", "biometric",
    "pii", "financial", "consent", "session",
    "location", "personal",
  ];

  for (const p of priority) {
    if (classifications.has(p)) return p;
  }

  return "personal";
}

function calculateProvenanceConfidence(
  classifications: Set<DataClassification>,
  edges: CsgEdge[],
): number {
  let confidence = 0.7;

  confidence += Math.min(0.2, classifications.size * 0.05);

  const avgEdgeConf = edges.length > 0
    ? edges.reduce((s, e) => s + e.confidence, 0) / edges.length
    : 0.5;
  confidence += avgEdgeConf * 0.1;

  return Math.round(Math.min(0.99, Math.max(0.1, confidence)) * 100) / 100;
}

function deduplicateProvenancePaths(paths: ProvenancePath[]): ProvenancePath[] {
  const seen = new Set<string>();
  return paths.filter((p) => {
    const key = `${p.dataType}:${p.nodes.map((n) => n.id).join(",")}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function matchComplianceRules(
  provenancePaths: ProvenancePath[],
  fileContents: { file: string; content: string; lines: string[] }[],
): ComplianceFinding[] {
  const findings: ComplianceFinding[] = [];

  for (const path of provenancePaths) {
    for (const rule of REGULATION_RULES) {
      if (!rule.dataClassification.includes(path.dataType)) continue;

      const finding = checkRuleAgainstPath(rule, path, fileContents);
      if (finding) findings.push(finding);
    }
  }

  for (const fc of fileContents) {
    for (const rule of REGULATION_RULES) {
      if (rule.detectionType === "provenance") continue;

      const finding = checkRuleByPattern(rule, fc);
      if (finding) findings.push(finding);
    }
  }

  return deduplicateFindings(findings);
}

function checkRuleAgainstPath(
  rule: ComplianceRule,
  path: ProvenancePath,
  fileContents: { file: string; content: string; lines: string[] }[],
): ComplianceFinding | null {
  if (path.confidence < 0.4) return null;

  const lastNode = path.nodes[path.nodes.length - 1];

  const requiredControlsFound = checkRequiredControls(rule, fileContents);

  if (requiredControlsFound >= rule.requiredControls.length * 0.5) return null;

  const provenanceFiles = [...new Set(path.nodes.map((n) => n.file))];

  return {
    id: `COMP-${rule.id}-${crypto.randomUUID().slice(0, 8)}`,
    ruleId: rule.id,
    framework: rule.framework,
    clause: rule.clause,
    title: rule.title,
    description: rule.description,
    severity: rule.severity,
    dataClassification: path.dataType,
    file: lastNode.file,
    line: lastNode.line,
    column: lastNode.column,
    code: lastNode.code.substring(0, 300),
    provenancePath: provenanceFiles,
    riskLevel: rule.severity === "critical" ? "critical" : rule.severity === "high" ? "high" : "medium",
    penaltyEstimateEur: rule.penaltyMaxEur,
    requiredControls: rule.requiredControls,
    fixAdvice: rule.fixAdvice,
  };
}

function checkRuleByPattern(
  rule: ComplianceRule,
  file: { file: string; content: string; lines: string[] },
): ComplianceFinding | null {
  const content = file.content;

  if (rule.detectionType === "missing_implementation") {
    const hasImplementation = checkImplementationExists(content, rule.patterns);
    if (hasImplementation) return null;

    return {
      id: `COMP-${rule.id}-${crypto.randomUUID().slice(0, 8)}`,
      ruleId: rule.id,
      framework: rule.framework,
      clause: rule.clause,
      title: rule.title,
      description: rule.description,
      severity: rule.severity,
      dataClassification: rule.dataClassification[0] ?? "personal",
      file: file.file,
      line: 0,
      column: 0,
      code: "",
      provenancePath: [file.file],
      riskLevel: rule.severity === "critical" ? "critical" : "medium",
      penaltyEstimateEur: rule.penaltyMaxEur,
      requiredControls: rule.requiredControls,
      fixAdvice: rule.fixAdvice,
    };
  }

  if (rule.detectionType === "pattern" || rule.detectionType === "config_check") {
    return checkPatternInContent(rule, file);
  }

  return null;
}

function checkImplementationExists(content: string, patterns: string[]): boolean {
  for (const pattern of patterns) {
    try {
      const re = new RegExp(pattern, "i");
      if (re.test(content)) return true;
    } catch {}
  }
  return false;
}

function checkPatternInContent(
  rule: ComplianceRule,
  file: { file: string; content: string; lines: string[] },
): ComplianceFinding | null {
  const content = file.content;

  for (const pattern of rule.patterns) {
    try {
      const re = new RegExp(pattern, "i");
      const match = re.exec(content);
      if (match) {
        const idx = match.index;
        const lineNum = content.substring(0, idx).split("\n").length;

      const ctxPatterns = (rule as any).contextPatterns;
      const exclPatterns = (rule as any).excludePatterns;
      if (ctxPatterns && ctxPatterns.length > 0) {
        const hasContext = checkImplementationExists(content, ctxPatterns);
        if (hasContext) continue;
      }
      if (exclPatterns && exclPatterns.length > 0) {
        const hasExclusion = checkImplementationExists(content, exclPatterns);
        if (hasExclusion) continue;
      }

        const lineContent = file.lines[lineNum - 1]?.trim() ?? "";

        return {
          id: `COMP-${rule.id}-${crypto.randomUUID().slice(0, 8)}`,
          ruleId: rule.id,
          framework: rule.framework,
          clause: rule.clause,
          title: rule.title,
          description: rule.description,
          severity: rule.severity,
          dataClassification: rule.dataClassification[0] ?? "personal",
          file: file.file,
          line: lineNum,
          column: idx - content.lastIndexOf("\n", idx - 1),
          code: lineContent.substring(0, 300),
          provenancePath: [file.file],
          riskLevel: rule.severity === "critical" ? "critical" : "medium",
          penaltyEstimateEur: rule.penaltyMaxEur,
          requiredControls: rule.requiredControls,
          fixAdvice: rule.fixAdvice,
        };
      }
    } catch {}
  }

  return null;
}

function checkRequiredControls(
  rule: ComplianceRule,
  fileContents: { file: string; content: string }[],
): number {
  let found = 0;
  for (const control of rule.requiredControls) {
    for (const fc of fileContents) {
      try {
        const re = new RegExp(control.replace(/_/g, "[_-]?"), "i");
        if (re.test(fc.content)) {
          found++;
          break;
        }
      } catch {}
    }
  }
  return found;
}

function deduplicateFindings(findings: ComplianceFinding[]): ComplianceFinding[] {
  const seen = new Map<string, ComplianceFinding>();

  for (const f of findings) {
    const key = `${f.ruleId}:${f.file}:${f.line}`;
    if (!seen.has(key) || f.severity === "critical") {
      seen.set(key, f);
    }
  }

  return Array.from(seen.values());
}

export function getFrameworkBreakdown(
  findings: ComplianceFinding[],
): Record<string, { count: number; severity: string; maxPenalty: number }> {
  const breakdown: Record<string, { count: number; severity: string; maxPenalty: number }> = {};

  for (const f of findings) {
    if (!breakdown[f.framework]) {
      breakdown[f.framework] = { count: 0, severity: "low", maxPenalty: 0 };
    }
    breakdown[f.framework].count++;
    breakdown[f.framework].maxPenalty = Math.max(
      breakdown[f.framework].maxPenalty,
      f.penaltyEstimateEur ?? 0,
    );

    const sevOrder = ["low", "medium", "high", "critical"];
    const currentSev = sevOrder.indexOf(breakdown[f.framework].severity);
    const findingSev = sevOrder.indexOf(f.severity);
    if (findingSev > currentSev) {
      breakdown[f.framework].severity = f.severity;
    }
  }

  return breakdown;
}

export function estimateTotalPenalty(findings: ComplianceFinding[]): {
  totalMaxEur: number;
  byFramework: Record<string, number>;
} {
  const byFramework: Record<string, number> = {};
  let totalMaxEur = 0;

  for (const f of findings) {
    const penalty = f.penaltyEstimateEur ?? 0;
    byFramework[f.framework] = (byFramework[f.framework] ?? 0) + penalty;
    totalMaxEur += penalty;
  }

  return { totalMaxEur, byFramework };
}
