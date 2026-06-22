export interface ArchitectureRule {
  id: string;
  name: string;
  category: "circular_dependency" | "god_module" | "layer_violation" | "coupling";
  severity: "critical" | "high" | "medium" | "low";
  description: string;
}

export const ARCHITECTURE_RULES: ArchitectureRule[] = [
  {
    id: "arch-circ-1",
    name: "Circular Dependency Detected",
    category: "circular_dependency",
    severity: "high",
    description: "Module A imports Module B which imports Module A, creating a fragile initialization loop.",
  },
  {
    id: "arch-god-1",
    name: "God Module (High Fan-in & Fan-out)",
    category: "god_module",
    severity: "medium",
    description: "A single file handles too many responsibilities (e.g., routing + business logic + db access).",
  },
  {
    id: "arch-layer-1",
    name: "Layer Violation (UI Accessing DB directly)",
    category: "layer_violation",
    severity: "critical",
    description: "A React component directly executing raw database queries without an abstraction layer or API.",
  }
];
