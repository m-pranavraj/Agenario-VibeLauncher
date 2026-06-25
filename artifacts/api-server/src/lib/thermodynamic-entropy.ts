import { logger } from "./logger.js";

export interface ThermodynamicEntropy {
  bitErasures: number;
  minimumHeatJoules: number;
  minimumHeatEv: number;
  actualEnergyEstimateJoules: number;
  efficiencyRatio: number;
  heatPerOperation: number;
  totalMemoryWrites: number;
  totalAllocations: number;
  entropySources: Array<{ file: string; line: number; operation: string; bitsErased: number }>;
  comparisonToLandauer: {
    modernCpuRatio: number;
    brainRatio: number;
    theoreticalMinimum: number;
  };
  insight: string;
}

const BOLTZMANN_CONSTANT = 1.380649e-23;
const ROOM_TEMPERATURE_K = 300;
const LANDUAER_LIMIT_JOULE = BOLTZMANN_CONSTANT * ROOM_TEMPERATURE_K * Math.LN2;

const MEMORY_WRITE_PATTERNS = [
  { pattern: /\b(let|const|var)\s+\w+\s*=\s*(?:new\s+Array|new\s+Object|new\s+Map|new\s+Set|\[\]|\{\})/gi, bitsErased: 64, name: "variable_reassignment" },
  { pattern: /\b(delete|splice|pop|shift|unshift|push)\b/gi, bitsErased: 32, name: "destructive_operation" },
  { pattern: /\b(Object\.assign|Object\.defineProperty|Object\.freeze|Object\.seal)\b/gi, bitsErased: 128, name: "object_mutation" },
  { pattern: /\b(Array\.from|Array\.splice|Array\.fill|\.map\(.*=>\s*null\))\b/gi, bitsErased: 256, name: "bulk_allocation" },
  { pattern: /\b(new\s+\w+\([^)]*\))\b/g, bitsErased: 512, name: "heap_allocation" },
  { pattern: /\b(gc|collect\(|finalize|destructor)\b/gi, bitsErased: 1024, name: "garbage_collection" },
  { pattern: /\b(JSON\.parse|JSON\.stringify)\b/gi, bitsErased: 128, name: "serialization" },
];

const HEAVY_COMPUTATION = /\b(sort|filter|reduce|map)\b.*\b(\d{4,}|\.length)\b/gi;

export function runThermodynamicEntropy(keyFiles: Array<{ path: string; content: string }>): ThermodynamicEntropy {
  const entropySources: ThermodynamicEntropy["entropySources"] = [];
  let totalBitsErased = 0;
  let totalAllocations = 0;

  for (const file of keyFiles) {
    const lines = file.content.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;

      for (const pat of MEMORY_WRITE_PATTERNS) {
        const regex = new RegExp(pat.pattern.source, pat.pattern.flags);
        if (regex.test(line)) {
          const count = (line.match(regex) ?? []).length;
          const bits = pat.bitsErased * count;
          totalBitsErased += bits;
          totalAllocations += count;
          entropySources.push({
            file: file.path,
            line: lineNum,
            operation: pat.name,
            bitsErased: bits,
          });
        }
      }

      if (HEAVY_COMPUTATION.test(line)) {
        totalBitsErased += 2048;
        totalAllocations += 1;
        entropySources.push({
          file: file.path,
          line: lineNum,
          operation: "heavy_computation",
          bitsErased: 2048,
        });
      }
    }
  }

  const minimumHeatJoules = totalBitsErased * LANDUAER_LIMIT_JOULE;
  const minimumHeatEv = minimumHeatJoules / 1.602176634e-19;
  const actualEnergyEstimateJoules = minimumHeatJoules * 1e9;

  const efficiencyRatio = actualEnergyEstimateJoules > 0
    ? minimumHeatJoules / actualEnergyEstimateJoules
    : 0;

  const heatPerOperation = totalAllocations > 0 ? actualEnergyEstimateJoules / totalAllocations : 0;

  const modernCpuRatio = actualEnergyEstimateJoules > 0 ? actualEnergyEstimateJoules / (LANDUAER_LIMIT_JOULE * 1e9) : Infinity;
  const brainRatio = actualEnergyEstimateJoules > 0 ? actualEnergyEstimateJoules / 12 : Infinity;

  const totalMemoryWrites = entropySources.length;

  let insight = "";
  if (totalBitsErased === 0) {
    insight = "No significant memory erasures detected. Codebase operates near Landauer limit.";
  } else if (efficiencyRatio < 1e-12) {
    insight = `Extreme thermodynamic inefficiency. ${totalBitsErased.toLocaleString()} bit erasures at ${(actualEnergyEstimateJoules).toExponential(2)} J — ${modernCpuRatio.toExponential(2)}× above Landauer limit. Modern CPUs are ~10^9× less efficient than theoretical minimum.`;
  } else {
    insight = `${totalBitsErased.toLocaleString()} bit erasures, ${totalAllocations} operations. Minimum heat (Landauer): ${minimumHeatJoules.toExponential(2)} J. Actual estimate: ${actualEnergyEstimateJoules.toExponential(2)} J. Efficiency: ${(efficiencyRatio * 100).toExponential(2)}% of theoretical optimum.`;
  }

  logger.info({ totalBitsErased, minimumHeatJoules: minimumHeatJoules.toExponential(2), efficiencyRatio }, "Thermodynamic Entropy complete");

  return {
    bitErasures: totalBitsErased,
    minimumHeatJoules,
    minimumHeatEv: Math.round(minimumHeatEv),
    actualEnergyEstimateJoules,
    efficiencyRatio,
    heatPerOperation,
    totalMemoryWrites,
    totalAllocations,
    entropySources: entropySources.slice(0, 50),
    comparisonToLandauer: {
      modernCpuRatio: Math.min(1e15, modernCpuRatio),
      brainRatio: Math.min(1e15, brainRatio),
      theoreticalMinimum: LANDUAER_LIMIT_JOULE,
    },
    insight,
  };
}
