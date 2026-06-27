import { readFileSync, writeFileSync } from 'fs';

const file = 'artifacts/agenario/src/pages/scan-results.tsx';
let content = readFileSync(file, 'utf8');

// Check what's actually in the file around our problem strings
const idx = content.indexOf('Loading report');
const snip = content.substring(idx, idx+35);
console.log('Snippet:', JSON.stringify(snip));
console.log('Snippet hex:', Buffer.from(snip).toString('hex'));

// The hex shows: 4c6f6164696e67207265706f7274c3a2e282acc2a63c
// After "Loading report": c3 a2 e2 82 ac c2 a6
// This is the UTF-8 encoding of: U+00E2 U+20AC U+00A6
// Which is: â € ¦ (the Windows-1252 mojibake for U+2026 ELLIPSIS)

// Replacements: mojibake sequences -> correct chars
const replacements = [
  // ELLIPSIS U+2026: â€¦ (Windows-1252: e2->â, 80->€[cp1252], a6->¦)
  ['\u00e2\u20ac\u00a6', '\u2026'],
  // EM DASH U+2014: â€" (e2->â, 80->€, 94->")
  ['\u00e2\u20ac\u201d', '\u2014'],
  // LEFT DOUBLE QUOTE U+201C: â€œ (e2->â, 80->€, 9c->œ)
  ['\u00e2\u20ac\u0153', '\u201c'],
  // RIGHT SINGLE QUOTE / APOSTROPHE U+2019: â€™ (e2->â, 80->€, 99->™)
  ['\u00e2\u20ac\u2122', '\u2019'],
  // LEFT SINGLE QUOTE U+2018: â€˜ (e2->â, 80->€, 98->˜)
  ['\u00e2\u20ac\u02dc', '\u2018'],
  // MIDDLE DOT U+00B7: Â· (c2->Â, b7->·) 
  ['\u00c2\u00b7', '\u00b7'],
  // NON-BREAKING SPACE: Â  (c2->Â, a0-> )
  // RUPEE SIGN U+20B9: â‚¹ (e2->â, 82->‚, b9->¹) 
  ['\u00e2\u201a\u00b9', '\u20b9'],
  // MULTIPLICATION SIGN U+00D7: Ã— (c3->Ã, 97->—... wait)
  // Actually Ã— = U+00C3 U+00D7: Ã (c3 83) × (c3 97) ... hmm
  // Let me check: × is U+00D7, UTF-8: c3 97
  // When this byte sequence c3 97 is read as latin1: Ã (0xC3) × (0x97) -> mojibake Ã—
  // In UTF-8 the string Ã— is: c3 83 c3 97 (encoding of U+00C3 U+00D7)
  ['\u00c3\u00d7', '\u00d7'],
  // EN DASH U+2013: â€" ... let's check
  // Box-drawing chars in comments: â"€ 
  ['\u00e2\u2514\u0080', '\u2500'],
  // ARROW: â†' = U+2192
  ['\u00e2\u2020\u2019', '\u2192'],
];

let count = 0;
for (const [bad, good] of replacements) {
  const before = content.length;
  const parts = content.split(bad);
  if (parts.length > 1) {
    console.log(`Replacing "${bad}" (${Buffer.from(bad).toString('hex')}) -> "${good}" [${parts.length - 1} occurrences]`);
    content = parts.join(good);
    count += parts.length - 1;
  }
}

console.log(`Total replacements: ${count}`);
writeFileSync(file, content, 'utf8');
console.log('Done!');
