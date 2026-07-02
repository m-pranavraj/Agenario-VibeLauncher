import { useMemo } from "react";
import { Shield, AlertTriangle, Lock } from "lucide-react";

interface DataFlowNode {
  id: string;
  label: string;
  type: "source" | "storage" | "process" | "sink" | "boundary" | "subject";
}

interface DataFlowEdge {
  source: string;
  target: string;
  label?: string;
  sensitive?: boolean;
}

interface TrustBoundary {
  id: string;
  name: string;
  level: number;
}

interface AttackTreeNode {
  id: string;
  name: string;
  likelihood?: "high" | "medium" | "low" | "critical";
  impact?: "high" | "medium" | "low" | "critical";
  children?: AttackTreeNode[];
}

interface MermaidComplianceDiagramProps {
  complianceResults?: Array<{
    framework: string;
    findings?: string[];
    status: string;
  }>;
  dataFlowDiagram?: { nodes: DataFlowNode[]; edges: DataFlowEdge[] };
  taintPaths?: Array<{ source: string; sinks: { name: string }[] }>;
  trustBoundaries?: TrustBoundary[];
  attackTree?: AttackTreeNode;
  diagramType?: "dataflow" | "trustboundary" | "attacktree" | "all";
  height?: number;
}

function buildDataFlowMermaid(
  nodes: DataFlowNode[],
  edges: DataFlowEdge[],
  taintPaths: Array<{ source: string; sinks: { name: string }[] }>
): string {
  const lines: string[] = ["flowchart LR"];
  const nodeSet = new Set<string>();
  nodes.forEach((n) => {
    nodeSet.add(n.id);
    let shape = `[${n.label}]`;
    if (n.type === "boundary") shape = `[/${n.label}/]`;
    else if (n.type === "subject") shape = `((${n.label}))`;
    else if (n.type === "source") shape = `>${n.label}]`;
    else if (n.type === "sink") shape = `[${n.label}]`;
    const styleMap: Record<string, string> = {
      source: "fill:#fef3c7,stroke:#f59e0b,color:#92400e,stroke-width:2px",
      storage: "fill:#dbeafe,stroke:#3b82f6,color:#1e3a8a,stroke-width:2px",
      process: "fill:#d1fae5,stroke:#10b981,color:#065f46,stroke-width:2px",
      sink: "fill:#fee2e2,stroke:#ef4444,color:#7f1d1d,stroke-width:2px",
      boundary: "fill:#f3e8ff,stroke:#8b5cf6,color:#4c1d95,stroke-width:2px,stroke-dasharray: 5 5",
      subject: "fill:#fce7f3,stroke:#ec4899,color:#831843,stroke-width:2px",
    };
    lines.push(`  ${n.id}${shape}`);
    if (styleMap[n.type]) {
      lines.push(`  style ${n.id} ${styleMap[n.type]}`);
    }
  });

  taintPaths.forEach((tp, i) => {
    if (!nodeSet.has(tp.source)) {
      lines.push(`  tp-src-${i}>${tp.source}]`);
      lines.push(`  style tp-src-${i} fill:#fef3c7,stroke:#f59e0b,color:#92400e,stroke-width:2px`);
    }
    tp.sinks.forEach((s, j) => {
      if (!nodeSet.has(tp.source) && !nodeSet.has(s.name)) {
        lines.push(`  tp-snk-${i}-${j}>${s.name}]`);
        lines.push(`  style tp-snk-${i}-${j} fill:#fee2e2,stroke:#ef4444,color:#7f1d1d,stroke-width:2px`);
      }
    });
  });

  edges.forEach((e) => {
    const sensitive = e.sensitive ? "stroke:#ef4444,stroke-width:2px" : "stroke:#6366f1,stroke-width:1px";
    lines.push(`  ${e.source} -->|${e.label || ""}| ${e.target}`);
    lines.push(`  linkStyle ${lines.length - 2} ${sensitive}`);
  });
  return lines.join("\n");
}

function buildTrustBoundaryMermaid(boundaries: TrustBoundary[]): string {
  const lines: string[] = ["flowchart TD"];
  const colors = ["#fef3c7", "#dbeafe", "#d1fae5", "#fee2e2"];
  boundaries.forEach((b, i) => {
    lines.push(`  ${b.id}[${b.name}]`);
    const col = colors[Math.min(b.level, colors.length - 1)];
    lines.push(`  style ${b.id} fill:${col},stroke:#6366f1,color:#1e1b4b,stroke-width:1.5px`);
  });
  boundaries.forEach((b, i) => {
    if (i > 0) {
      lines.push(`  ${boundaries[i - 1].id} -.->|crosses boundary| ${b.id}`);
      lines.push(`  linkStyle ${lines.length - 2} stroke:#f97316,stroke-width:1.5px,stroke-dasharray: 4 2`);
    }
  });
  return lines.join("\n");
}

function buildAttackTreeMermaid(tree: AttackTreeNode, depth = 0): string {
  const lines: string[] = depth === 0 ? ["flowchart TD"] : [];
  const prefix = "  ";
  const likelihoodColor: Record<string, string> = { high: "#ef4444", medium: "#eab308", low: "#22c55e", critical: "#dc2626" };
  const impactColor: Record<string, string> = { high: "#ef4444", medium: "#eab308", low: "#22c55e", critical: "#dc2626" };

  function addNode(node: AttackTreeNode, parentId?: string) {
    const col = likelihoodColor[node.likelihood || "medium"];
    const imp = impactColor[node.impact || "medium"];
    const nodeLabel = node.name.replace(/[()]/g, "").slice(0, 60);
    lines.push(`${prefix}${node.id}[${nodeLabel} :${node.likelihood?.toUpperCase() || "MED"}]`);
    lines.push(`${prefix}style ${node.id} fill:#0f172a,stroke:${col},color:${col},stroke-width:2px`);

    if (parentId) {
      lines.push(`${prefix}${parentId} --> ${node.id}`);
      lines.push(`${prefix}linkStyle ${lines.length - 2} stroke:${imp},stroke-width:1.5px`);
    }

    (node.children || []).forEach((child) => addNode(child, node.id));
  }

  addNode(tree);
  return lines.join("\n");
}

function MermaidBlock({
  title,
  diagram,
  isLight,
  icon,
  badgeColor,
}: {
  title: string;
  diagram: string;
  isLight: boolean;
  icon: any;
  badgeColor: string;
}) {
  const lines = diagram.split("\n");
  const [Icon] = [icon];

  return (
    <div className={`rounded-xl border overflow-hidden ${isLight ? "bg-white border-gray-200" : "bg-[#0a0a0f] border-white/10"}`}>
      <div className={`px-4 py-2.5 border-b flex items-center gap-2.5 ${isLight ? "border-gray-100 bg-gray-50/50" : "border-white/[0.06] bg-white/[0.02]"}`}>
        <div className="w-6 h-6 rounded flex items-center justify-center" style={{ background: `${badgeColor}15`, border: `1px solid ${badgeColor}30` }}>
          <Icon className="w-3.5 h-3.5" style={{ color: badgeColor }} />
        </div>
        <h4 className={`text-xs font-bold font-['Syne'] ${isLight ? "text-gray-900" : "text-white"}`}>{title}</h4>
        <span className="ml-auto text-[9px] font-mono text-white/25">Mermaid</span>
      </div>
      <div className={`p-4 overflow-x-auto ${isLight ? "bg-white" : "bg-[#080c14]"}`}>
        <pre className="text-[10px] font-mono leading-relaxed whitespace-pre">
          {lines.map((line, i) => (
            <div
              key={i}
              className={`
                ${line.trimStart().startsWith("flowchart") ? "text-violet-400 font-bold" : ""}
                ${line.trimStart().startsWith("subgraph") ? "text-sky-400" : ""}
                ${line.includes("-->") && !line.includes("--->") ? "text-indigo-300" : ""}
                ${line.includes("-.->") ? "text-amber-300" : ""}
                ${line.includes("linkStyle") ? "text-purple-400" : ""}
                ${line.includes("style ") && !line.includes("linkStyle") ? "text-fuchsia-400" : ""}
                ${!line.trim() ? "h-2" : ""}
                ${line.trimStart().startsWith("#") ? "text-slate-500" : ""}
                text-slate-400
              `}
            >
              {line || "\u00A0"}
            </div>
          ))}
        </pre>
      </div>
    </div>
  );
}

export function MermaidComplianceDiagram({
  complianceResults = [],
  dataFlowDiagram,
  taintPaths = [],
  trustBoundaries = [],
  attackTree,
  diagramType = "all",
  height = 600,
}: MermaidComplianceDiagramProps) {
  const isLight = false;

  const diagrams = useMemo(() => {
    const result: Array<{ title: string; code: string; icon: any; color: string }> = [];

    const gdpr = complianceResults.find((r) => r.framework.toLowerCase().includes("gdpr") || r.framework.toLowerCase().includes("gdpr"));
    const frameworks = complianceResults.length > 0 ? complianceResults : [{ framework: "GDPR", findings: [], status: "partial" }];

    if (diagramType === "dataflow" || diagramType === "all") {
      const dfNodes: DataFlowNode[] = [];
      const dfEdges: DataFlowEdge[] = [];

      if (dataFlowDiagram) {
        dfNodes.push(...dataFlowDiagram.nodes);
        dfEdges.push(...dataFlowDiagram.edges);
      } else {
        const subjectNodes: DataFlowNode[] = [
          { id: "user", label: "User (Data Subject)", type: "subject" },
          { id: "browser", label: "Browser / Client", type: "source" },
          { id: "backend", label: "API Gateway", type: "process" },
          { id: "db", label: "Database (Storage)", type: "storage" },
          { id: "3rdparty", label: "3rd Party Processor", type: "sink" },
          { id: "auth", label: "Auth Service", type: "process" },
        ];
        (taintPaths.length > 0 ? taintPaths : [{ source: "browser", sinks: [{ name: "3rdparty" }] }]).forEach((tp) => {
          if (tp.source === "browser" && dfNodes.find((n) => n.id === "browser")) {
            dfEdges.push({ source: "browser", target: "backend", label: "POST /submit", sensitive: true });
            dfEdges.push({ source: "backend", target: "db", label: "persist()", sensitive: true });
            dfEdges.push({ source: "backend", target: "3rdparty", label: "webhook()", sensitive: true });
            dfEdges.push({ source: "browser", target: "auth", label: "auth()", sensitive: false });
          }
        });

        dfNodes.push(...subjectNodes);
        dfNodes.push({ id: "gdpr-boundary", label: "🔒 GDPR Boundary", type: "boundary" });
        dfEdges.push({ source: "user", target: "browser", label: "consent", sensitive: false });
        dfEdges.push({ source: "db", target: "gdpr-boundary", label: "rightToErasure", sensitive: true });
        dfEdges.push({ source: "3rdparty", target: "gdpr-boundary", label: "DPA required", sensitive: true });
      }

      const dfMermaid = buildDataFlowMermaid(dfNodes, dfEdges, taintPaths);
      result.push({
        title: "GDPR Data Flow Diagram",
        code: dfMermaid,
        icon: Shield,
        color: "#60a5fa",
      });
    }

    if (diagramType === "trustboundary" || diagramType === "all") {
      const tbDefault: TrustBoundary[] = [
        { id: "public", name: "🌐 Public Internet (Untrusted)", level: 0 },
        { id: "dmz", name: "DMZ / Edge (Reverse Proxy)", level: 1 },
        { id: "internal", name: "Internal Network (Trusted)", level: 2 },
        { id: "sealed", name: "🔒 Sealed Vault (DB + Secrets)", level: 3 },
      ];
      const boundaries = trustBoundaries.length > 0 ? trustBoundaries : tbDefault;
      const tbMermaid = buildTrustBoundaryMermaid(boundaries);
      result.push({
        title: "Trust Boundary Diagram",
        code: tbMermaid,
        icon: Lock,
        color: "#f59e0b",
      });
    }

    if (diagramType === "attacktree" || diagramType === "all") {
      const defaultTree: AttackTreeNode = {
        id: "root",
        name: "Compromise Application",
        likelihood: "medium",
        impact: "high",
        children: [
          {
            id: "auth-bypass",
            name: "Auth Bypass",
            likelihood: "high",
            impact: "high",
            children: [
              { id: "jwt-bypass", name: "JWT Secret Leak", likelihood: "high", impact: "high" },
              { id: "sql-injection", name: "SQL Injection in Login", likelihood: "medium", impact: "high" },
            ],
          },
          {
            id: "data-exfil",
            name: "Data Exfiltration",
            likelihood: "medium",
            impact: "high",
            children: [
              { id: "id-all", name: "IDOR: List All Records", likelihood: "high", impact: "high" },
              { id: "xss-exfil", name: "Stored XSS Cookie Theft", likelihood: "medium", impact: "medium" },
            ],
          },
          {
            id: "rce",
            name: "Remote Code Execution",
            likelihood: "low",
            impact: "critical",
            children: [
              { id: "deserial", name: "Unsafe Deserialization", likelihood: "low", impact: "critical" },
              { id: "ssti", name: "SSTI in Template", likelihood: "medium", impact: "high" },
            ],
          },
        ],
      };
      const tree = attackTree || defaultTree;
      const atMermaid = buildAttackTreeMermaid(tree);
      result.push({
        title: "Attack Tree",
        code: atMermaid,
        icon: AlertTriangle,
        color: "#ef4444",
      });
    }

    return result;
  }, [complianceResults, dataFlowDiagram, taintPaths, trustBoundaries, attackTree, diagramType]);

  const gdprResult = complianceResults.find((r) => r.framework.toLowerCase().includes("gdpr") || r.framework.toLowerCase().includes("gdpr"));
  const gdprPass = gdprResult ? gdprResult.status === "pass" : false;
  const gdprPartial = gdprResult ? gdprResult.status === "partial" : true;

  return (
    <div className={`rounded-2xl border overflow-hidden ${false ? "bg-white border-gray-200" : "bg-[#0a0a0f] border-white/10"}`}>
      <div className={`px-5 py-3.5 border-b flex items-center gap-3 bg-white/[0.02] border-white/[0.06]`}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-indigo-500/15 border border-indigo-500/25">
          <Shield className="w-4 h-4 text-indigo-400" />
        </div>
        <div>
          <h3 className="text-sm font-bold font-['Syne'] text-white">Compliance Diagrams</h3>
          <p className="text-[10px] text-white/40">
            {diagrams.length} diagram{diagrams.length !== 1 ? "s" : ""} · GDPR status:
            <span className={gdprPass ? "text-green-400 ml-1" : gdprPartial ? "text-amber-400 ml-1" : "text-red-400 ml-1"}>
              {gdprPass ? "Compliant" : gdprPartial ? "Partial" : "Non-compliant"}
            </span>
          </p>
        </div>
      </div>

      <div className={`p-4 space-y-4 ${isLight ? "bg-gray-50/30" : "bg-[#080c14]"}`}>
        {diagrams.map((diag, i) => (
          <MermaidBlock
            key={i}
            title={diag.title}
            diagram={diag.code}
            isLight={isLight}
            icon={diag.icon}
            badgeColor={diag.color}
          />
        ))}

        {diagrams.length === 0 && (
          <div className="text-center py-8">
            <p className="text-xs text-white/25">No compliance data available — run analysis to generate diagrams</p>
          </div>
        )}
      </div>
    </div>
  );
}
