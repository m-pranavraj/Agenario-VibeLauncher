import { readFileSync, writeFileSync } from 'fs';

const file = 'artifacts/agenario/src/pages/scan-results.tsx';
let content = readFileSync(file, 'utf8');

// Check remaining patterns
const remaining = [
  ['\u00c2\u00b7', '\u00b7', 'Â· middle dot'],      // Â·
  ['\u00c3\u00d7', '\u00d7', 'Ã× mult sign'],        // Ã×
  ['\u00e2\u2514\u0080', '\u2500', 'box-drawing ─'], // â"€
  ['\u00e2\u2020\u2019', '\u2192', 'arrow →'],       // â†'
];

let count = 0;
for (const [bad, good, label] of remaining) {
  const parts = content.split(bad);
  if (parts.length > 1) {
    console.log(`Replacing ${label} [${parts.length - 1} occurrences]`);
    content = parts.join(good);
    count += parts.length - 1;
  }
}

// Also check for the lock emoji
const lockMojibake = '\u00f0\u0178\u201d\u2019'; // ðŸ"™
if (content.includes(lockMojibake)) {
  console.log('Found lock emoji mojibake');
  content = content.split(lockMojibake).join('\uD83D\uDD12'); // 🔒
  count++;
}

// Check for ⚡ = â¡ mojibake
const zapMojibake = '\u00e2\u009a\u00a1';
const idx = content.indexOf(zapMojibake);
if (idx >= 0) {
  console.log('Found zap mojibake at', idx);
}

console.log(`Total replacements: ${count}`);
writeFileSync(file, content, 'utf8');

// Verify no more bad patterns
const leftover = content.match(/\u00c2\u00b7|\u00c3\u00d7/g);
console.log('Remaining Â· or Ã×:', leftover ? leftover.length : 0);

// Check a sample
const idxCheck = content.indexOf('Loading report');
console.log('Loading report snippet:', JSON.stringify(content.substring(idxCheck, idxCheck+30)));
