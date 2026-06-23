/**
 * SBOM Generator (Software Bill of Materials)
 * ─────────────────────────────────────────────────────────────────────────
 * Generates CycloneDX-compatible SBOM (Software Bill of Materials) from
 * package.json dependencies. This is a critical enterprise feature that
 * Aikido and Snyk prominently feature, and is increasingly required by:
 * - US Executive Order 14028 (federal software supply chain)
 * - EU Cyber Resilience Act
 * - Enterprise procurement requirements
 *
 * Competitor coverage: Aikido (CycloneDX ✅, SPDX ✅), Snyk (SBOM ✅)
 */

export interface SBOMComponent {
  type: "library";
  "bom-ref": string;
  name: string;
  version: string;
  purl: string;
  licenses?: Array<{ license: { id: string } }>;
  externalReferences?: Array<{ type: string; url: string }>;
}

export interface CycloneDXSBOM {
  bomFormat: "CycloneDX";
  specVersion: "1.4";
  version: number;
  serialNumber: string;
  metadata: {
    timestamp: string;
    tools: Array<{ vendor: string; name: string; version: string }>;
    component: { type: string; name: string; version: string };
  };
  components: SBOMComponent[];
}

export interface SBOMResult {
  sbom: CycloneDXSBOM;
  totalComponents: number;
  componentsByType: Record<string, number>;
  spdxLicenses: string[];
}

// ── Known license mappings for common npm packages ──────────────────────
const KNOWN_LICENSES: Record<string, string> = {
  "react": "MIT",
  "react-dom": "MIT",
  "next": "MIT",
  "express": "MIT",
  "typescript": "Apache-2.0",
  "zod": "MIT",
  "prisma": "Apache-2.0",
  "@prisma/client": "Apache-2.0",
  "axios": "MIT",
  "lodash": "MIT",
  "moment": "MIT",
  "date-fns": "MIT",
  "stripe": "MIT",
  "openai": "Apache-2.0",
  "tailwindcss": "MIT",
  "@supabase/supabase-js": "MIT",
  "drizzle-orm": "Apache-2.0",
  "@clerk/nextjs": "MIT",
  "lucide-react": "ISC",
  "framer-motion": "MIT",
  "vite": "MIT",
  "vitest": "MIT",
  "eslint": "MIT",
  "prettier": "MIT",
  "cors": "MIT",
  "helmet": "MIT",
  "jsonwebtoken": "MIT",
  "bcrypt": "MIT",
  "bcryptjs": "MIT",
  "dotenv": "BSD-2-Clause",
  "@anthropic-ai/sdk": "MIT",
  "better-sqlite3": "MIT",
};

// ── Packages known to have restrictive licenses ───────────────────────
const RESTRICTIVE_LICENSE_PACKAGES: Record<string, { license: string; risk: "critical" | "high" | "medium" }> = {
  "sequelize": { license: "MIT", risk: "medium" }, // MIT but often confused
  "node-red": { license: "Apache-2.0", risk: "medium" },
  "mongodb": { license: "SSPL-1.0", risk: "critical" }, // MongoDB SSPL is restrictive
  "elasticsearch": { license: "SSPL-1.0", risk: "critical" },
  "kibana": { license: "SSPL-1.0", risk: "critical" },
};

function generatePURL(name: string, version: string): string {
  const cleanVersion = version.replace(/^[\^~>=<]/, "");
  if (name.startsWith("@")) {
    const [scope, pkg] = name.slice(1).split("/");
    return `pkg:npm/%40${scope}/${pkg}@${cleanVersion}`;
  }
  return `pkg:npm/${name}@${cleanVersion}`;
}

function generateBomRef(name: string, version: string): string {
  const cleanName = name.replace(/[^a-zA-Z0-9-_]/g, "-");
  const cleanVersion = version.replace(/[^a-zA-Z0-9.-]/g, "");
  return `${cleanName}-${cleanVersion}`;
}

export function generateSBOM(
  packageJson: Record<string, unknown>,
  appName?: string,
): SBOMResult {
  const deps = {
    ...(packageJson.dependencies as Record<string, string> ?? {}),
  };
  const devDeps = {
    ...(packageJson.devDependencies as Record<string, string> ?? {}),
  };

  const allDeps = { ...deps, ...devDeps };
  const components: SBOMComponent[] = [];
  const spdxLicenses: string[] = [];

  for (const [name, version] of Object.entries(allDeps)) {
    const cleanVersion = String(version).replace(/^[\^~>=<]/, "").split(" ")[0];
    const license = KNOWN_LICENSES[name] || "UNKNOWN";

    if (license !== "UNKNOWN" && !spdxLicenses.includes(license)) {
      spdxLicenses.push(license);
    }

    const component: SBOMComponent = {
      type: "library",
      "bom-ref": generateBomRef(name, cleanVersion),
      name,
      version: cleanVersion,
      purl: generatePURL(name, cleanVersion),
    };

    if (license !== "UNKNOWN") {
      component.licenses = [{ license: { id: license } }];
    }

    component.externalReferences = [
      { type: "website", url: `https://www.npmjs.com/package/${name}/v/${cleanVersion}` },
    ];

    components.push(component);
  }

  const appVersion = String(packageJson.version ?? "1.0.0");
  const name = String(packageJson.name ?? appName ?? "application");

  const sbom: CycloneDXSBOM = {
    bomFormat: "CycloneDX",
    specVersion: "1.4",
    version: 1,
    serialNumber: `urn:uuid:agenario-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    metadata: {
      timestamp: new Date().toISOString(),
      tools: [
        {
          vendor: "Agenario",
          name: "Agenario Security Scanner",
          version: "1.0.0",
        },
      ],
      component: {
        type: "application",
        name,
        version: appVersion,
      },
    },
    components,
  };

  const totalComponents = components.length;
  const componentsByType = { library: totalComponents };

  return {
    sbom,
    totalComponents,
    componentsByType,
    spdxLicenses: [...new Set(spdxLicenses)],
  };
}

/**
 * Checks for restrictive/incompatible licenses in dependencies
 * Returns findings for packages with GPL, AGPL, SSPL, or other restrictive licenses
 */
export interface LicenseFinding {
  id: string;
  severity: "critical" | "high" | "medium" | "low";
  title: string;
  description: string;
  evidence: string;
  filePath: string;
  lineNumber: number;
  codeSnippet: string;
  fixPrompt: string;
  confidence: number;
  category: "license";
  packageName: string;
  license: string;
}

const RESTRICTIVE_LICENSES_SET = new Set([
  "GPL-2.0", "GPL-3.0", "AGPL-3.0", "AGPL-1.0",
  "GPL-2.0-only", "GPL-3.0-only",
  "AGPL-3.0-only", "AGPL-3.0-or-later",
  "SSPL-1.0",  // MongoDB Server Side Public License
  "BUSL-1.1",  // Business Source License
]);

const COPYLEFT_LICENSES_SET = new Set([
  "LGPL-2.0", "LGPL-2.1", "LGPL-3.0",
  "LGPL-2.1-only", "LGPL-3.0-only",
  "MPL-2.0", "CDDL-1.0", "EPL-2.0",
  "EUPL-1.2", "OSL-3.0",
]);

export function scanLicenseCompliance(
  packageJson: Record<string, unknown>,
  filePath = "package.json",
): LicenseFinding[] {
  const findings: LicenseFinding[] = [];
  let idx = 0;

  const allDeps = {
    ...(packageJson.dependencies as Record<string, string> ?? {}),
    ...(packageJson.devDependencies as Record<string, string> ?? {}),
  };

  for (const [pkgName, version] of Object.entries(allDeps)) {
    const knownLicense = KNOWN_LICENSES[pkgName];

    // Check packages we know have restrictive licenses
    if (pkgName in RESTRICTIVE_LICENSE_PACKAGES) {
      const { license, risk } = RESTRICTIVE_LICENSE_PACKAGES[pkgName];
      findings.push({
        id: `LIC-${++idx}`,
        severity: risk,
        title: `Restrictive License: "${pkgName}" (${license})`,
        description: `Package "${pkgName}" uses the ${license} license. ${
          license === "SSPL-1.0"
            ? "SSPL (Server Side Public License) requires you to open-source ALL software used to provide your service as a service, which is incompatible with closed-source SaaS applications."
            : license === "AGPL-3.0"
            ? "AGPL-3.0 requires you to distribute your source code if users interact with your service over a network, which may conflict with your business model."
            : "This license may have restrictions that conflict with your commercial use case."
        }`,
        evidence: `${filePath}: "${pkgName}": "${version}"`,
        filePath,
        lineNumber: 0,
        codeSnippet: `"${pkgName}": "${version}"`,
        fixPrompt: `Review whether "${pkgName}" (${license}) is compatible with your license. Consider alternatives:\n- Consult with a legal professional about license compatibility\n- Find MIT or Apache-2.0 licensed alternatives\n- Purchase a commercial license if available`,
        confidence: 90,
        category: "license",
        packageName: pkgName,
        license,
      });
    }

    if (knownLicense && COPYLEFT_LICENSES_SET.has(knownLicense)) {
      findings.push({
        id: `LIC-${++idx}`,
        severity: "medium",
        title: `Copyleft License: "${pkgName}" (${knownLicense})`,
        description: `Package "${pkgName}" uses the ${knownLicense} copyleft license. Copyleft licenses may require you to open-source derivative works, which could affect your commercial codebase.`,
        evidence: `${filePath}: "${pkgName}": "${version}"`,
        filePath,
        lineNumber: 0,
        codeSnippet: `"${pkgName}": "${version}"`,
        fixPrompt: `Assess ${knownLicense} compatibility with your project. For commercial use, verify you're compliant or find MIT/Apache-2.0 alternatives.`,
        confidence: 80,
        category: "license",
        packageName: pkgName,
        license: knownLicense,
      });
    }
  }

  return findings;
}
