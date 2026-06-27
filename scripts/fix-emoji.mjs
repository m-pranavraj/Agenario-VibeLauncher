import { readFileSync, writeFileSync } from 'fs';

const file = 'artifacts/agenario/src/pages/scan-results.tsx';
let content = readFileSync(file, 'utf8');

// Emoji mojibake map: mojibake string -> correct emoji
// Each emoji was UTF-8 encoded, then bytes read as Latin-1 (or Windows-1252), then re-encoded as UTF-8
// Common pattern: 4-byte emoji (U+1XXXX) encodes as F0 9X XX XX in UTF-8
// Read as Win-1252: F0->ð, 9X->Å/š/etc, XX->... 

// Let's identify each one by the hex bytes
const checks = [
  ['ðŸŸ¢', '🟢'],    // green circle
  ['ðŸ"µ', '🔵'],    // blue circle  
  ['âšª', '⚪'],     // white circle
  ['ðŸŸ¡', '🟡'],    // yellow circle
  ['ðŸŸ ', '🟠'],    // orange circle
  ['ðŸ©·', '🩷'],    // pink heart
  ['ðŸŒŠ', '🌊'],    // wave
  ['ðŸ¤–', '🤖'],    // robot
  ['ðŸ"´', '🔴'],    // red circle
  ['ðŸ'³', '💳'],    // credit card
  ['ðŸ—„', '🗄'],    // file cabinet
  ['ðŸ"'', '🔒'],    // lock (already fixed? check)
  ['ðŸ"', '🔐'],    // locked with key
  ['ðŸ"§', '📧'],    // email
  ['ðŸ'¬', '💬'],    // speech bubble
  ['ðŸ"¦', '📦'],    // box
  ['ðŸ""', '🔓'],    // unlocked
  ['ðŸ§¹', '🧹'],    // broom
  ['ðŸ'¡', '💡'],    // lightbulb
  ['ðŸš€', '🚀'],    // rocket
  ['âš ï¸', '⚠️'],   // warning (already fixed)
  ['ðŸŽ¯', '🎯'],    // dart
  ['ðŸ"‹', '📋'],    // clipboard
  ['ðŸ§ ', '🧠'],    // brain
  ['ðŸ"¸', '📸'],    // camera
  ['ðŸŽ‰', '🎉'],    // party
  ['ðŸ"—', '🔗'],    // link
  ['âš¡', '⚡'],     // zap (already fixed?)
  ['ðŸ"„', '🔄'],    // arrows
  ['ðŸ"', '🔍'],    // magnifying glass
];

let count = 0;
for (const [bad, good] of checks) {
  const parts = content.split(bad);
  if (parts.length > 1) {
    console.log(`Replacing "${bad}" -> "${good}" [${parts.length - 1} times]`);
    content = parts.join(good);
    count += parts.length - 1;
  }
}

console.log(`Total: ${count} emoji replacements`);
writeFileSync(file, content, 'utf8');
