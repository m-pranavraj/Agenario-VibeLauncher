export interface UXRule {
  id: string;
  name: string;
  category: "friction" | "accessibility" | "cognitive_load" | "inconsistency";
  severity: "critical" | "high" | "medium" | "low";
  description: string;
  entropyWeight: number; // Impact on cognitive load score
  pattern?: RegExp;
}

export const UX_RULES: UXRule[] = [
  {
    id: "ux-cog-1",
    name: "High Visual Entropy (Hick's Law Violation)",
    category: "cognitive_load",
    severity: "high",
    description: "Too many distinct interactive elements on a single view, dramatically increasing decision time.",
    entropyWeight: 5.0,
  },
  {
    id: "ux-fric-1",
    name: "Dead End Flow",
    category: "friction",
    severity: "critical",
    description: "A page or state with no clear primary Call to Action (CTA) or navigation back.",
    entropyWeight: 8.0,
  },
  {
    id: "ux-a11y-1",
    name: "Missing ARIA Labels on Interactive Elements",
    category: "accessibility",
    severity: "high",
    description: "Buttons or links containing only icons without aria-labels.",
    entropyWeight: 3.0,
    pattern: /<button[^>]*>\s*<[A-Z][a-zA-Z0-9]*Icon[^>]*>\s*<\/button>/g,
  },
  {
    id: "ux-inc-1",
    name: "Inconsistent Design Tokens",
    category: "inconsistency",
    severity: "medium",
    description: "Mixing hardcoded hex colors with Tailwind/design-system variables.",
    entropyWeight: 2.0,
    pattern: /className=["'][^"']*text-\[#[0-9a-fA-F]{3,6}\][^"']*["']/g,
  }
];
