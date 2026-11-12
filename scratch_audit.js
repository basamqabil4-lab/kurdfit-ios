const fs = require('fs');

const page = fs.readFileSync('app/page.js', 'utf8');
const css = fs.readFileSync('app/globals.css', 'utf8');

const lines = page.split('\n');

console.log('=== GYM 4 CODE AUDIT REPORT ===');

// 1. Text color audit
let hardcodedWhiteText = [];
lines.forEach((l, idx) => {
  if (l.match(/color:\s*['"](#ffffff|#fff|white)['"]/i)) {
    // Check if it is inside a gradient button (which has white text on purple/blue background)
    const isButton = l.includes('button') || l.includes('accent-gradient') || l.includes('background:');
    if (!isButton) {
      hardcodedWhiteText.push({ line: idx + 1, code: l.trim().slice(0, 100) });
    }
  }
});
console.log(`Found ${hardcodedWhiteText.length} lines with potentially hardcoded white text.`);
hardcodedWhiteText.slice(0, 25).forEach(x => console.log(`  L${x.line}: ${x.code}`));

// 2. Background audit in light mode
let darkBgHardcoded = [];
lines.forEach((l, idx) => {
  if (l.includes('rgba(0,0,0') || l.includes('rgba(20,') || l.includes('rgba(28,') || l.includes('rgba(32,')) {
    darkBgHardcoded.push({ line: idx + 1, code: l.trim().slice(0, 100) });
  }
});
console.log(`\nFound ${darkBgHardcoded.length} lines with inline dark rgba backgrounds that might clash in light mode.`);
darkBgHardcoded.slice(0, 20).forEach(x => console.log(`  L${x.line}: ${x.code}`));

// 3. Tab and View Audit
console.log('\n=== TABS AND FEATURES AUDIT ===');
const tabs = ['home', 'workout', 'nutrition', 'profile', 'coach'];
tabs.forEach(t => {
  const match = page.includes(`activeTab === '${t}'`);
  console.log(`- Tab '${t}' present: ${match}`);
});

// 4. Modals and Drawers
console.log('\n=== MODALS AND DRAWERS AUDIT ===');
const modals = [
  'showHomeMealsModal',
  'showScanModal',
  'showSettingsModal',
  'showNotificationsModal',
  'showGoalModal',
  'showEditProfileModal',
  'showNewCourseModal',
  'showAiFoodModal',
  'showAiDietModal',
  'showResetModal',
  'selectedFoodForPortion'
];
modals.forEach(m => {
  const count = (page.match(new RegExp(m, 'g')) || []).length;
  console.log(`- Modal '${m}': ${count} references`);
});
