import { useMemo } from "react";
import { useIsLight } from "@/hooks/use-is-light";

type DiagramType = "architecture" | "security" | "dataflow" | "dependency" | "compliance";

interface MermaidDiagramProps {
  type: DiagramType;
  title?: string;
  data?: Record<string, any>;
  findings?: Array<{ title: string; severity: string; category: string }>;
}

function generateArchitectureMermaid(data?: Record<string, any>): string {
  return `graph TB
    Client["🌐 Client Browser"] --> CDN["CDN / Edge"]
    CDN --> LB["Load Balancer"]
    LB --> API["API Server"]
    LB --> WS["WebSocket Server"]
    API --> Auth["Auth Service"]
    API --> Cache["Redis Cache"]
    API --> DB["PostgreSQL DB"]
    API --> Queue["Message Queue"]
    Queue --> Worker["Background Workers"]
    Worker --> DB
    Worker --> ExtAPI["External APIs"]
    Auth --> DB
    subgraph Monitoring
      Logger["Log Aggregator"] --> Monitor["Monitoring Dashboard"]
    end
    API -.-> Logger
    Worker -.-> Logger
    style Client fill:#6d28d9,color:#fff
    style API fill:#2563eb,color:#fff
    style DB fill:#059669,color:#fff
    style Auth fill:#d97706,color:#fff`;
}

function generateSecurityMermaid(findings?: Array<{ title: string; severity: string; category: string }>): string {
  const crit = findings?.filter(f => f.severity === "critical" || f.severity === "high") || [];
  const medium = findings?.filter(f => f.severity === "medium") || [];
  const low = findings?.filter(f => f.severity === "low" || f.severity === "info") || [];

  return `graph LR
    subgraph Findings[Scan Findings]
      direction LR
      C["Critical/High: ${crit.length}"]
      M["Medium: ${medium.length}"]
      L["Low/Info: ${low.length}"]
    end
    subgraph Categories
      S["Security"]
      P["Performance"]
      U["UX/UI"]
      CP["Compliance"]
    end
    C --> S
    M --> S
    M --> P
    M --> U
    L --> U
    L --> CP
    C --> CP
    style C fill:#dc2626,color:#fff
    style M fill:#f59e0b,color:#fff
    style L fill:#3b82f6,color:#fff
    style S fill:#7c3aed,color:#fff
    style P fill:#10b981,color:#fff
    style U fill:#ec4899,color:#fff
    style CP fill:#f97316,color:#fff`;
}

function generateDataflowMermaid(): string {
  return `flowchart LR
    User["👤 User Input"] --> Validate["Input Validation"]
    Validate --> Sanitize["Sanitization Layer"]
    Sanitize --> Route["Route Handler"]
    Route --> AuthZ["Authorization Check"]
    AuthZ --> BizLogic["Business Logic"]
    BizLogic --> ORM["ORM / Data Layer"]
    BizLogic --> CacheLayer["Cache Layer"]
    ORM --> DB[(Database)]
    CacheLayer --> Cache[(Redis)]
    BizLogic --> Response["Response Formatter"]
    Response --> User
    
    subgraph Security[Security Boundary]
      Validate
      AuthZ
      Sanitize
    end
    
    style Security fill:#7c3aed15,stroke:#7c3aed,stroke-dasharray: 5 5
    style Validate fill:#ef4444,color:#fff
    style AuthZ fill:#f59e0b,color:#fff
    style DB fill:#059669,color:#fff`;
}

function generateDependencyMermaid(): string {
  return `graph TD
    App["app.tsx"] --> Components["components/"]
    App --> Pages["pages/"]
    App --> Lib["lib/"]
    Pages --> Components
    Pages --> Lib
    Components --> UI["ui/"]
    Components --> Hooks["hooks/"]
    Lib --> API["api/"]
    Lib --> Utils["utils/"]
    API --> Server["api-server/"]
    Server --> Routes["routes/"]
    Server --> Services["services/"]
    Server --> Models["models/"]
    Services --> Models
    
    style App fill:#6d28d9,color:#fff
    style Pages fill:#2563eb,color:#fff
    style Components fill:#7c3aed,color:#fff
    style Server fill:#059669,color:#fff
    style Models fill:#d97706,color:#fff`;
}

function generateComplianceMermaid(): string {
  return `graph LR
    subgraph Standards
      GDPR["GDPR Art. 5, 17, 20, 30"]
      CCPA["CCPA §1798.100"]
      HIPAA["HIPAA §164.312"]
      PCI["PCI-DSS 3.4, 4.1"]
      SOC2["SOC2 TSC"]
    end
    subgraph Controls
      Enc["Encryption"]
      Audit["Audit Logging"]
      Consent["Consent Mgmt"]
      Access["Access Control"]
      Retention["Data Retention"]
    end
    GDPR --> Consent
    GDPR --> Retention
    CCPA --> Consent
    HIPAA --> Enc
    HIPAA --> Audit
    PCI --> Enc
    SOC2 --> Audit
    SOC2 --> Access
    
    style GDPR fill:#2563eb,color:#fff
    style CCPA fill:#7c3aed,color:#fff
    style HIPAA fill:#059669,color:#fff
    style PCI fill:#dc2626,color:#fff
    style SOC2 fill:#d97706,color:#fff`;
}

const DIAGRAM_GENERATORS: Record<DiagramType, (data?: Record<string, any>, findings?: Array<{ title: string; severity: string; category: string }>) => string> = {
  architecture: generateArchitectureMermaid,
  security: (_d, findings) => generateSecurityMermaid(findings),
  dataflow: () => generateDataflowMermaid(),
  dependency: () => generateDependencyMermaid(),
  compliance: () => generateComplianceMermaid(),
};

export function MermaidDiagram({ type, title, data, findings }: MermaidDiagramProps) {
  const isLight = useIsLight();

  const mermaidCode = useMemo(() => {
    const generator = DIAGRAM_GENERATORS[type] || DIAGRAM_GENERATORS.architecture;
    return generator(data, findings);
  }, [type, data, findings]);

  const bgColor = isLight ? "#ffffff" : "#0a0a0a";
  const textColor = isLight ? "#1a1a2e" : "#e0e0e0";

  const mermaidUrl = useMemo(() => {
    const encoded = encodeURIComponent(
      `%%{init: {'theme': '${isLight ? "base" : "dark"}', 'themeVariables': { 'background': '${bgColor}', 'primaryColor': '#7c3aed', 'primaryTextColor': '${textColor}', 'primaryBorderColor': '#7c3aed50', 'lineColor': '#7c3aed80', 'secondaryColor': '#1e1e2e', 'tertiaryColor': '#2d2d3d', 'fontFamily': 'JetBrains Mono, monospace' }}}%%\n${mermaidCode}`
    );
    return `https://mermaid.ink/img/${encoded}?bgColor=${bgColor.replace("#", "")}`;
  }, [mermaidCode, isLight, bgColor, textColor]);

  return (
    <div className="w-full">
      {title && (
        <p className="text-xs font-medium text-white/50 mb-2 uppercase tracking-wider">{title}</p>
      )}
      <div className={`rounded-xl border overflow-hidden ${isLight ? "bg-white border-gray-200" : "bg-black/40 border-white/8"}`}>
        <div className="p-3">
          <img
            src={mermaidUrl}
            alt={title || `${type} diagram`}
            className="w-full h-auto"
            style={{ maxHeight: "500px", objectFit: "contain" }}
            onError={(e) => {
              const target = e.currentTarget;
              target.style.display = "none";
              if (target.nextElementSibling) {
                (target.nextElementSibling as HTMLElement).style.display = "block";
              }
            }}
          />
          <pre className="hidden text-[8px] font-mono text-white/30 whitespace-pre overflow-x-auto p-2 max-h-[300px]">{mermaidCode}</pre>
        </div>
        <div className={`px-3 py-1.5 border-t flex items-center justify-between ${isLight ? "border-gray-200 bg-gray-50" : "border-white/8 bg-white/[0.02]"}`}>
          <span className={`text-[9px] ${isLight ? "text-gray-400" : "text-white/30"}`}>Interactive Architecture Diagram</span>
          <a
            href={`https://mermaid.live/edit#base64=${btoa(mermaidCode)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[9px] text-violet-400 hover:text-violet-300 underline"
          >
            Edit
          </a>
        </div>
      </div>
    </div>
  );
}
