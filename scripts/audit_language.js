const fs = require('fs');

const content = fs.readFileSync('D:/PRV/Apps/GYM 4/app/page.js', 'utf8');
const lines = content.split('\n');

const kurdishCharRegex = /[\u0600-\u06FF]/;
const findings = [];
const enOnlyChecks = [];

lines.forEach((line, idx) => {
  const lineNum = idx + 1;
  // Skip TRANSLATIONS definition (around lines 500-1150)
  if (lineNum >= 501 && lineNum <= 1145) return;
  // Skip comment lines
  const trimmed = line.trim();
  if (trimmed.startsWith('//') || trimmed.startsWith('/*')) return;

  if (kurdishCharRegex.test(line)) {
    // Check if it's ternary checking only 'en'
    if (line.includes("currentLangConfig.code === 'en'") && !line.includes("'ar'") && !line.includes("'fa'")) {
      enOnlyChecks.push({ lineNum, line: trimmed });
    }
    // Check lines that have NO language checks and NO t(...) calls
    if (!line.includes('t(') && !line.includes('currentLangConfig') && !line.includes('language ===')) {
      findings.push({ lineNum, line: trimmed });
    }
  }
});

console.log('Total hardcoded lines with no localization:', findings.length);
console.log('Lines that only check en vs ku (missing ar & fa):', enOnlyChecks.length);

console.log('\n--- Sample of lines that only check en vs ku: ---');
enOnlyChecks.slice(0, 15).forEach(f => console.log(f.lineNum + ': ' + f.line));

console.log('\n--- Sample of hardcoded lines: ---');
findings.slice(0, 30).forEach(f => console.log(f.lineNum + ': ' + f.line));
