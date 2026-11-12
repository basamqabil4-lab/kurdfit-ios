const fs = require('fs');
const path = require('path');
const p = fs.readFileSync(path.join(__dirname, '../app/page.js'), 'utf8');

const modals = [
  'showAiFoodModal',
  'showNotificationsModal',
  'showNewCourseModal',
  'showAiDietModal',
  'showSettingsModal',
  'showAuthModal',
  'showEditProfileModal',
  'showGoalModal',
  'showHomeMealsModal',
  'showScanModal',
  'showResetModal',
  'selectedFoodForPortion'
];

modals.forEach(m => {
  const searchPattern = m + ' &&';
  const idx = p.indexOf(searchPattern);
  if (idx !== -1) {
    const chunk = p.substring(idx, idx + 1200);
    // Find inner modal container (first div inside backdrop)
    const contentMatch = chunk.match(/className=["']([^"']*(?:modal-content|bottom-sheet)[^"']*)["']([^>]*>)/);
    console.log('=== ' + m + ' ===');
    if (contentMatch) {
      console.log('Classes:', contentMatch[1]);
      console.log('Attributes/Styles:', contentMatch[2].substring(0, 250));
    } else {
      console.log('No modal-content match, looking for first child:');
      const innerMatch = chunk.match(/<div\s+className=["']([^"']*)["'][^>]*style=\{([^}]*)\}/);
      if (innerMatch) {
        console.log('Class:', innerMatch[1], 'Style:', innerMatch[2]);
      }
    }
    console.log('-------------------------------------------');
  }
});
