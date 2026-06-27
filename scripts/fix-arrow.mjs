import { readFileSync, writeFileSync } from 'fs';
const file = 'artifacts/agenario/src/pages/scan-results.tsx';
let content = readFileSync(file, 'utf8');

// From hex: c3 b0 c5 b8 e2 80 9c e2 80 9e = U+00F0 U+0178 U+201C U+201E
// Original: F0 9F 94 84 (U+1F504 = 🔄)
// 9F -> Ÿ U+0178 ✓
// 94 -> " U+201D (right double quote) ... wait hex shows e2 80 9c = U+201C (left double quote!)
// 9C (Win-1252) -> U+0153 (œ) ... but the hex shows U+201C
// Actually wait: our earlier pass replaced â€œ (U+00E2 U+20AC U+0153) with U+201C
// So 0x9C byte in win1252 -> œ (U+0153), then UTF-8 of œ is C5 93
// But hex shows e2 80 9c = U+201C (left dquote) which means 0x93 byte -> U+201C
// 0x93 in Win1252 -> U+201C ✓
// So F0 9F 94 84: F0->ð(U+F0), 9F->Ÿ(U+178), 94->"(U+201D), 84->„(U+201E)
// But wait hex shows 9c and 9e... let me recalculate:
// F0 = ð = U+00F0 ✓
// 9F = Ÿ = U+0178 ✓
// 94 -> " U+201D in win1252? No: 0x94 in win1252 = U+201D ✓
// 84 -> „ U+201E in win1252 ✓
// So arrowBad should be: U+00F0 U+0178 U+201D U+201E
// BUT hex shows: c3 b0 (U+00F0) c5 b8 (U+0178) e2 80 9c (U+201C) e2 80 9e (U+201E)
// U+201C not U+201D! So 0x94 got replaced with U+201C (left dquote) not U+201D (right dquote)!
// That happened because our earlier em-dash fix: 'â€œ' was U+00E2 U+20AC U+201C
// which is the mojibake for U+201C... and our fix4 script replaced U+201D context

const arrowBad = '\u00f0\u0178\u201c\u201e'; // hex: c3b0 c5b8 e2809c e2809e
const arrowGood = '\uD83D\uDD04'; // 🔄

const parts = content.split(arrowBad);
if (parts.length > 1) {
  console.log(`Fixed arrows [${parts.length-1}x]`);
  content = parts.join(arrowGood);
  writeFileSync(file, content, 'utf8');
} else {
  console.log('Not found');
  // Try a broader search
  const idx = content.indexOf('\u00f0\u0178');
  if (idx >= 0) {
    const snip = content.substring(idx, idx+10);
    console.log('Context:', JSON.stringify(snip), Buffer.from(snip).toString('hex'));
  }
}
