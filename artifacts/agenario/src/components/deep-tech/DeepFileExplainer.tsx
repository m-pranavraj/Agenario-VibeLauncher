import { useState } from "react";
import { FileCode, ChevronDown, ChevronRight, Loader2, Search, Shield, Zap, Palette, Lock, ExternalLink } from "lucide-react";
import { useIsLight } from "@/hooks/use-is-light";
import { motion, AnimatePresence } from "framer-motion";

interface FileInfo {
  path: string;
  type: "source" | "config" | "style" | "test" | "infra";
  summary: string;
  purpose: string;
  keyFunctions: string[];
  dependencies: string[];
  securityRelevance: "critical" | "high" | "medium" | "low";
  linesOfCode: number;
}

const MOCK_FILE_EXPLANATIONS: Record<string, FileInfo> = {};

function generateFileExplanation(path: string, content?: string): FileInfo {
  const ext = path.split(".").pop()?.toLowerCase() || "";
  const fileName = path.split("/").pop() || "";
  const isSource = ["ts", "tsx", "js", "jsx", "py", "go", "rb", "java"].includes(ext);
  const isConfig = ["json", "yaml", "yml", "toml", "env", "config"].includes(ext);
  const isStyle = ["css", "scss", "less", "tailwind"].includes(ext);
  const isTest = path.includes("test") || path.includes("spec") || path.includes("__tests__");
  const isInfra = path.includes("docker") || path.includes("deploy") || path.includes("k8s") || path.includes("ci");

  let type: FileInfo["type"] = "source";
  if (isConfig) type = "config";
  else if (isStyle) type = "style";
  else if (isTest) type = "test";
  else if (isInfra) type = "infra";

  // Generate meaningful purpose based on path patterns
  let purpose = "";
  let keyFunctions: string[] = [];
  let securityRelevance: FileInfo["securityRelevance"] = "medium";

  if (path.includes("auth") || path.includes("login") || path.includes("jwt") || path.includes("session")) {
    purpose = "Manages user authentication, authorization, and session lifecycle. Handles token issuance, validation, and refresh flows.";
    keyFunctions = ["authenticate()", "validateToken()", "refreshSession()", "authorize()"];
    securityRelevance = "critical";
  } else if (path.includes("api") || path.includes("route") || path.includes("controller") || path.includes("handler")) {
    purpose = "Defines API endpoints, request routing, input validation, and response formatting for the service layer.";
    keyFunctions = ["handleRequest()", "validateInput()", "formatResponse()", "parseParams()"];
    securityRelevance = "high";
  } else if (path.includes("db") || path.includes("model") || path.includes("schema") || path.includes("entity") || path.includes("migration")) {
    purpose = "Defines data models, database schemas, ORM mappings, and migration scripts for persistent storage.";
    keyFunctions = ["createRecord()", "query()", "migrate()", "validateSchema()"];
    securityRelevance = "high";
  } else if (path.includes("middleware") || path.includes("interceptor")) {
    purpose = "Implements request/response middleware pipeline for cross-cutting concerns like logging, rate limiting, and error handling.";
    keyFunctions = ["intercept()", "chain()", "rateLimit()", "logRequest()"];
    securityRelevance = "high";
  } else if (path.includes("ui") || path.includes("component") || path.includes("page") || path.includes("view")) {
    purpose = "Contains UI component definitions, page layouts, and user interface rendering logic for the frontend application.";
    keyFunctions = ["render()", "handleEvent()", "manageState()", "composeLayout()"];
    securityRelevance = "low";
  } else if (path.includes("util") || path.includes("helper") || path.includes("lib") || path.includes("common")) {
    purpose = "Provides shared utility functions, helper methods, and common library wrappers used across the codebase.";
    keyFunctions = ["format()", "validate()", "transform()", "sanitize()"];
    securityRelevance = "medium";
  } else if (path.includes("test") || path.includes("spec")) {
    purpose = "Contains automated test cases, test fixtures, and test configuration for unit, integration, and E2E testing.";
    keyFunctions = ["testCase()", "assert()", "mockService()", "setupFixture()"];
    securityRelevance = "low";
  } else if (path.includes("docker") || path.includes("deploy") || path.includes("k8s")) {
    purpose = "Defines containerization, deployment configuration, and infrastructure-as-code for production environments.";
    keyFunctions = ["buildImage()", "configureService()", "scale()", "healthCheck()"];
    securityRelevance = "high";
  } else if (isConfig) {
    purpose = "Contains application configuration, environment variables, and dependency definitions used at build and runtime.";
    keyFunctions = ["loadConfig()", "validateEnv()", "setDefaults()"];
    securityRelevance = "medium";
  } else if (isStyle) {
    purpose = "Defines visual styling, layout, theming, and responsive design rules for the user interface.";
    keyFunctions = ["applyTheme()", "responsiveLayout()", "animate()", "styleComponent()"];
    securityRelevance = "low";
  } else {
    purpose = `Core ${type} file that contributes to the application's ${path.includes("server") ? "backend" : "frontend"} functionality and business logic.`;
    keyFunctions = ["main()", "init()", "process()", "handleError()"];
    securityRelevance = "medium";
  }

  return {
    path,
    type,
    summary: `${fileName} — ${purpose.split(".")[0]}.`,
    purpose,
    keyFunctions,
    dependencies: [],
    securityRelevance,
    linesOfCode: 0,
  };
}

export function DeepFileExplainer({ files, scanId }: { files?: string[]; scanId?: number }) {
  const [expandedFile, setExpandedFile] = useState<string | null>(null);
  const [fileExplanations, setFileExplanations] = useState<Record<string, FileInfo>>({});
  const isLight = useIsLight();

  const fileList = files || [];

  const toggleFile = (path: string) => {
    if (expandedFile === path) {
      setExpandedFile(null);
      return;
    }
    setExpandedFile(path);
    if (!fileExplanations[path]) {
      const info = generateFileExplanation(path);
      setFileExplanations(prev => ({ ...prev, [path]: info }));
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "config": return <Zap className="w-3.5 h-3.5 text-amber-400" />;
      case "style": return <Palette className="w-3.5 h-3.5 text-pink-400" />;
      case "test": return <Shield className="w-3.5 h-3.5 text-emerald-400" />;
      case "infra": return <Lock className="w-3.5 h-3.5 text-blue-400" />;
      default: return <FileCode className="w-3.5 h-3.5 text-violet-400" />;
    }
  };

  const getSecurityColor = (level: string) => {
    switch (level) {
      case "critical": return { dot: "bg-red-500", text: isLight ? "text-red-600" : "text-red-400", bg: isLight ? "bg-red-50 border-red-200" : "bg-red-500/10 border-red-500/20" };
      case "high": return { dot: "bg-orange-500", text: isLight ? "text-orange-600" : "text-orange-400", bg: isLight ? "bg-orange-50 border-orange-200" : "bg-orange-500/10 border-orange-500/20" };
      case "medium": return { dot: "bg-amber-500", text: isLight ? "text-amber-600" : "text-amber-400", bg: isLight ? "bg-amber-50 border-amber-200" : "bg-amber-500/10 border-amber-500/20" };
      default: return { dot: "bg-blue-500", text: isLight ? "text-blue-600" : "text-blue-400", bg: isLight ? "bg-blue-50 border-blue-200" : "bg-blue-500/10 border-blue-500/20" };
    }
  };

  if (fileList.length === 0) {
    return (
      <div className={`rounded-2xl border p-6 text-center ${isLight ? "bg-white border-gray-200" : "bg-white/[0.02] border-white/8"}`}>
        <FileCode className={`w-8 h-8 mx-auto mb-2 ${isLight ? "text-gray-300" : "text-white/20"}`} />
        <p className={`text-xs ${isLight ? "text-gray-400" : "text-white/30"}`}>No files available for analysis</p>
      </div>
    );
  }

  return (
    <div className={`rounded-2xl border ${isLight ? "bg-white border-gray-200" : "bg-white/[0.02] border-white/8"}`}>
      <div className={`px-5 py-3 border-b ${isLight ? "border-gray-200" : "border-white/8"} flex items-center gap-2`}>
        <Search className={`w-3.5 h-3.5 ${isLight ? "text-gray-400" : "text-white/30"}`} />
        <span className={`text-xs font-medium ${isLight ? "text-gray-600" : "text-white/50"}`}>
          {fileList.length} files analyzed
        </span>
      </div>
      <div className="divide-y divide-white/5 max-h-[500px] overflow-y-auto">
        {fileList.map((filePath) => {
          const isExpanded = expandedFile === filePath;
          const info = fileExplanations[filePath];
          const secColor = info ? getSecurityColor(info.securityRelevance) : null;

          return (
            <div key={filePath}>
              <button
                onClick={() => toggleFile(filePath)}
                className={`w-full flex items-center gap-2 px-5 py-2.5 text-left hover:bg-white/[0.02] transition-colors ${
                  isExpanded ? (isLight ? "bg-gray-50" : "bg-white/[0.03]") : ""
                }`}
              >
                {isExpanded ? <ChevronDown className="w-3 h-3 text-white/30 shrink-0" /> : <ChevronRight className="w-3 h-3 text-white/30 shrink-0" />}
                {info && getTypeIcon(info.type)}
                <span className={`text-xs font-mono truncate flex-1 ${isLight ? "text-gray-700" : "text-white/70"}`}>{filePath}</span>
                {info && (
                  <span className={`w-1.5 h-1.5 rounded-full ${secColor?.dot}`} title={`${info.securityRelevance} security relevance`} />
                )}
              </button>

              <AnimatePresence>
                {isExpanded && info && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className={`overflow-hidden ${isLight ? "bg-gray-50" : "bg-white/[0.02]"}`}
                  >
                    <div className="px-5 pb-4 space-y-3">
                      {/* Security relevance badge */}
                      {secColor && (
                        <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border ${secColor.bg}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${secColor.dot}`} />
                          <span className={`text-[10px] font-medium ${secColor.text}`}>
                            {info.securityRelevance.charAt(0).toUpperCase() + info.securityRelevance.slice(1)} Security Relevance
                          </span>
                        </div>
                      )}

                      {/* Purpose */}
                      <div>
                        <p className={`text-[10px] font-medium mb-1 ${isLight ? "text-gray-500" : "text-white/40"}`}>Purpose</p>
                        <p className={`text-xs leading-relaxed ${isLight ? "text-gray-700" : "text-white/70"}`}>{info.purpose}</p>
                      </div>

                      {/* Key Functions */}
                      {info.keyFunctions.length > 0 && (
                        <div>
                          <p className={`text-[10px] font-medium mb-1 ${isLight ? "text-gray-500" : "text-white/40"}`}>Key Functions</p>
                          <div className="flex flex-wrap gap-1.5">
                            {info.keyFunctions.map((fn, i) => (
                              <code key={i} className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                                isLight ? "bg-gray-200 text-gray-700" : "bg-white/[0.06] text-white/60"
                              }`}>{fn}</code>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* File type badge */}
                      <div className="flex items-center gap-2">
                        <span className={`text-[9px] font-medium uppercase tracking-wider ${isLight ? "text-gray-400" : "text-white/30"}`}>Type: {info.type}</span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}
