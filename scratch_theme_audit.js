const fs = require('fs');

const page = fs.readFileSync('app/page.js', 'utf8');
const lines = page.split('\n');

lines.forEach((l, idx) => {
  if (l.includes("theme ===") || l.includes("theme !==") || l.includes("'light'") || l.includes("'dark'")) {
    if (l.includes('theme') && (l.includes('===') || l.includes('!==') || l.includes('?'))) {
      console.log(`${idx + 1}: ${l.trim()}`);
    }
  }
});
