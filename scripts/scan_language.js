const fs = require('fs');
const page = fs.readFileSync('app/page.js', 'utf8');

console.log('=== Checking usage of currentLangConfig, language, isRtl ===');

const occurrences = [];
const lines = page.split('\n');
lines.forEach((l, i) => {
  if (l.includes('currentLangConfig') || l.includes('language') || l.includes('isRtl')) {
    occurrences.push({ line: i + 1, text: l.trim() });
  }
});
console.log('Total occurrences:', occurrences.length);
occurrences.forEach(o => {
  console.log('L' + o.line + ': ' + o.text.substring(0, 110));
});
