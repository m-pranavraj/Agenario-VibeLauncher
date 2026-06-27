#!/usr/bin/env node
// Fix mojibake in scan-results.tsx
// These are UTF-8 encoded characters that were read as latin1 and then re-encoded

const fs = require('fs');

const files = [
  'artifacts/agenario/src/pages/scan-results.tsx',
];

// Map of mojibake byte sequences (as they appear in the file when read as UTF-8) to correct chars
// The bad encoding: UTF-8 text was read as latin-1 then each byte re-encoded as UTF-8
// So â€" in the file is: C3A2 E282 C294 in UTF-8 (encoding of â, €, " which are latin1 of e2,80,94)
// But what we actually see is the *string* â€" where each char is a valid UTF-8 code point
// The string bytes: c3a2 = â (U+00E2), e280 94 is NOT right...
// Let's go by the actual hex we found: c3a2 e2 82 ac c2a6 = â€¦ (3 mojibake chars for ellipsis)
// c3a2 = U+00E2 = â
// e282ac = U+20AC = € ... but that's the euro sign as UTF-8!
// Wait: e2 82 ac is the UTF-8 encoding of € (U+20AC)
// c2 a6 is U+00A6 = ¦ (broken bar)
// But the actual bytes in file: c3 a2 e2 82 ac c2 a6
// c3 a2 = U+00E2 in UTF-8 ... wait: c3 a2 is TWO bytes for a single character:
// c3 = 1100 0011, a2 = 1010 0010 -> U+00E2 = â
// e2 82 ac = U+20AC = €
// c2 a6 = U+00A6 = ¦

// The actual mojibake sequence for ELLIPSIS (U+2026):
// U+2026 bytes in UTF-8: e2 80 a6
// When read as latin1 and displayed: â (from e2) + \x80 (control) + ¦ (from a6)
// But when those latin1 chars are then re-encoded as UTF-8:
// â (U+00E2) -> c3 a2
// \x80 (U+0080) -> c2 80  (but files show e2 82 ac which is €)
// Hmm, let me look again at the hex: c3a2 e282ac c2a6

// Actually the "â€¦" is the classic UTF-8 mojibake for ELLIPSIS:
// Original: U+2026 = e2 80 a6 (UTF-8)
// Misread as Windows-1252: â (e2) + € (80 = \x80 maps to € in cp1252) + ¦ (a6)
// Re-encoded as UTF-8: â=c3a2, €=e282ac, ¦=c2a6 -> yes! that matches c3a2 e282ac c2a6

// So the pattern is Windows-1252 mojibake:
// e2 80 94 (em dash) -> â€" in Win1252 (â, €, ") -> UTF-8: c3a2 e282ac e2809d ? no...
// Let me just do it empirically from the hex I know

// From observed hex: "â€¦" = bytes c3 a2 e2 82 ac c2 a6
// This corresponds to U+2026 (ELLIPSIS) that was:
//   1. encoded as UTF-8: e2 80 a6
//   2. each byte interpreted as Windows-1252:
//      e2 -> â (U+00E2)
//      80 -> € (U+20AC) 
//      a6 -> ¦ (U+00A6)
//   3. re-encoded to UTF-8

const MOJIBAKE_MAP = [
  // Ellipsis U+2026: â€¦
  [Buffer.from('c3a2e282acc2a6', 'hex'), '\u2026'],
  // Em dash U+2014: â€"
  [Buffer.from('c3a2e2809dc3a2e2809c', 'hex'), null], // skip - need to check
  // Middle dot: Â· = c2 82 ... 
  // Let me handle the string-level replacements since we know the strings
];

// Simpler: just do string replacements on known patterns
const content = fs.readFileSync(files[0], 'utf8');

// Use regex to find and verify
const patterns = [
  /\u00e2\u20ac\u00a6/g,   // â€¦ = ellipsis mojibake (Win1252)
  /\u00e2\u20ac\u201d/g,   // â€" = em dash mojibake  
  /\u00c2\u00b7/g,          // Â· = middle dot mojibake
  /\u00e2\u20ac\u02dc/g,   // â€˜ = left single quote mojibake
  /\u00e2\u20ac\u2122/g,   // â€™ = right single quote mojibake
  /\u00e2\u20ac\u0153/g,   // â€œ = left double quote mojibake
  /\u00e2\u20ac\u009d/g,   // â€  = right double quote mojibake
  /\u00e2\u201a\u00b9/g,   // â‚¹ = rupee sign mojibake
  /\u00c3\u2014/g,          // Ã— = multiplication sign mojibake
];

let count = 0;
patterns.forEach(p => {
  const matches = content.match(p);
  if (matches) count += matches.length;
});

console.log(`Found ${count} total mojibake occurrences`);

// Check the "â€¦" pattern  
const idx = content.indexOf('\u00e2\u20ac\u00a6');
if (idx >= 0) {
  console.log('Found ellipsis mojibake at', idx);
  console.log('Context:', JSON.stringify(content.substring(idx - 10, idx + 15)));
}
const idx2 = content.indexOf('\u00e2\u20ac\u201d');
if (idx2 >= 0) {
  console.log('Found em-dash mojibake at', idx2);
}
