export interface AIQualityRule {
  id: string;
  name: string;
  category: "hallucination" | "boilerplate" | "inconsistency" | "dead_code";
  severity: "critical" | "high" | "medium" | "low";
  description: string;
  pattern?: RegExp;
}

export const AI_QUALITY_RULES: AIQualityRule[] = [
  {
    id: "ai-hal-1",
    name: "Hallucinated Library Method",
    category: "hallucination",
    severity: "critical",
    description: "The AI generated code calling a method that does not exist on the imported library.",
  },
  {
    id: "ai-boil-1",
    name: "Generic AI Boilerplate Remnants",
    category: "boilerplate",
    severity: "low",
    description: "Leftover comments typical of LLM generation.",
    pattern: /\/\/ (?:Sure, here is the code|As an AI language model|TODO:|FIXME:)/gi,
  },
  {
    id: "ai-inc-1",
    name: "Prompt Boundary Inconsistency",
    category: "inconsistency",
    severity: "medium",
    description: "Two closely related files use entirely different architectural paradigms (e.g., one uses Redux, another uses Context) indicating disjointed AI generation.",
  }
];
