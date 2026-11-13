// Scientific Workout and Nutrition Engine for Kurd Fit

export function cleanJsonText(str) {
  if (!str) return '{}';
  let clean = str.replace(/```json/gi, '').replace(/```/gi, '').trim();
  const firstBrace = clean.indexOf('{');
  const firstBracket = clean.indexOf('[');
  if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
    const lastBrace = clean.lastIndexOf('}');
    if (lastBrace !== -1) clean = clean.substring(firstBrace, lastBrace + 1);
  } else if (firstBracket !== -1) {
    const lastBracket = clean.lastIndexOf(']');
    if (lastBracket !== -1) clean = clean.substring(firstBracket, lastBracket + 1);
  }
  return clean;
}

export function sanitizeWorkoutPlan(course, location = 'gym', equipment = '') {
  if (!course || !Array.isArray(course.weeklyPlan)) return course;
  
  const isHome = (location === 'home') || (course.trainingLocation === 'home') || (course.location === 'home');
  const eq = (equipment || course.homeEquipment || '').toLowerCase();
  const hasDumbbells = eq.includes('دەستەوانە') || eq.includes('دەمبڵ') || eq.includes('dumbbell');

  course.weeklyPlan.forEach(day => {
    if (!day || !Array.isArray(day.exercises)) return;

    let hasSeenBack = false;
    const seenExerciseKeys = new Set();
    const cleanList = [];

    day.exercises.forEach(ex => {
      if (!ex) return;
      const en = (ex.englishName || '').toLowerCase();
      const ku = (ex.name || '').toLowerCase();
      
      if (isHome && !hasDumbbells) {
        // ۱. قاچ و سکوات
        if (en.includes('squat') || ku.includes('سکوات')) {
          if (en.includes('bulgarian') || en.includes('split') || ku.includes('بولگاری')) {
            ex.englishName = 'Bulgarian Split Squats';
            ex.name = 'سکواتی بولگاری بە یەک پێ';
            ex.muscle = 'ڕان';
          } else {
            ex.englishName = 'Bodyweight Squats';
            ex.name = 'سکوات بە کێشی جەستە';
            ex.muscle = 'ڕان';
          }
        }
        // ۲. لانجز و هەنگاونان
        else if (en.includes('lunge') || ku.includes('هەنگاونان') || ku.includes('لانجز')) {
          ex.englishName = 'Bodyweight Lunges';
          ex.name = 'هەنگاونان بێ کێش (Lunges)';
          ex.muscle = 'قاچ';
        }
        // ۳. سمت و دیدلیفت / پردی سمت
        else if (en.includes('deadlift') || en.includes('romanian') || en.includes('glute') || en.includes('bridge') || en.includes('hip thrust') || ku.includes('دیدلیفت') || ku.includes('پرد')) {
          ex.englishName = 'Glute Bridges';
          ex.name = 'بەرزکردنەوەی حەوز لەسەر زەوی (Glute Bridges)';
          ex.muscle = 'سمت و پشت';
        }
        // ٤. بەرزبوونەوەی پوز
        else if (en.includes('calf') || ku.includes('پوز') || ku.includes('سۆڵە')) {
          ex.englishName = 'Bodyweight Standing Calf Raise';
          ex.name = 'بەرزبوونەوە لەسەر پەنجەی پێ (Standing Calf Raise)';
          ex.muscle = 'پوز';
        }
        // ٥. پشت (Back) - هیچ جۆرە دەرگا، پەیژە، مێز یان ئامێرێک لە ماڵەوە نییە:
        else if (en.includes('row') || en.includes('table') || en.includes('door') || en.includes('pull-up') || en.includes('chin-up') || en.includes('lat') || ku.includes('دەرگا') || ku.includes('مێز') || ku.includes('ڕاکێشان')) {
          if (hasSeenBack) {
            ex.englishName = 'Superman Holds';
            ex.name = 'ڕاهێنانی سوپەرمان لەسەر زەوی (Superman Holds)';
            ex.muscle = 'خوارەوەی پشت';
          } else {
            ex.englishName = 'Floor Reverse Push-up';
            ex.name = 'بەرزکردنەوەی جەستە بە ئەنیشک لەسەر زەوی (Reverse Push-up)';
            ex.muscle = 'پشت';
            hasSeenBack = true;
          }
        }
        // ٦. سوپەرمان
        else if (en.includes('superman') || en.includes('hyperextension') || ku.includes('سوپەرمان')) {
          ex.englishName = 'Superman Holds';
          ex.name = 'ڕاهێنانی سوپەرمان لەسەر زەوی (Superman Holds)';
          ex.muscle = 'خوارەوەی پشت';
        }
        // ٧. پایک بۆ شان
        else if (en.includes('pike') || (en.includes('shoulder') && !hasDumbbells) || ku.includes('پایک')) {
          ex.englishName = 'Pike Push-ups';
          ex.name = 'شناوی پایک بۆ شان (Pike Push-ups)';
          ex.muscle = 'شان';
        }
        // ٨. سک و بەرزکردنەوەی قاچ لەسەر زەوی
        else if (en.includes('leg raise') || en.includes('leg-hip') || ku.includes('بەرزکردنەوەی قاچ')) {
          ex.englishName = 'Lying Leg Raises';
          ex.name = 'بەرزکردنەوەی قاچ لەسەر زەوی بۆ سک';
          ex.muscle = 'سک';
        }
        // ٩. قۆڵ (Arms)
        else if (en.includes('dip') || ku.includes('دیپس')) {
          ex.englishName = 'Bench Dips';
          ex.name = 'پاشەملە لەسەر کورسی (Bench Dips)';
          ex.muscle = 'ترایسێپس';
        }
        else if (en.includes('curl') || ku.includes('قۆڵ') || ku.includes('بایسێپس')) {
          ex.englishName = 'Bodyweight Biceps Curl';
          ex.name = 'کێشانی قۆڵ بە بەرگری جەستە (Biceps Curl)';
          ex.muscle = 'بایسێپس';
        }
        // ١٠. ئەگەر بە هەڵە پاڵەپەستۆی دەمبڵ یان کورسی هۆڵ خرابووە ناو ماڵەوە:
        else if (en.includes('bench press') || en.includes('chest press') || ku.includes('پاڵەپەستۆی سنگ')) {
          ex.englishName = 'Push-ups';
          ex.name = 'شناو بە کێشی جەستە (Push-ups)';
          ex.muscle = 'سنگ';
        }
      } else if (isHome && hasDumbbells) {
        if (en.includes('backpack') && en.includes('squat')) {
          ex.englishName = 'Dumbbell Goblet Squat';
          ex.name = 'سکوات بە دەمبڵ (Goblet Squat)';
        } else if (en.includes('backpack') && en.includes('deadlift')) {
          ex.englishName = 'Dumbbell Romanian Deadlift';
          ex.name = 'دیدلیفت بە دەمبڵ بۆ پشت و سمت';
        } else if (en.includes('backpack') && en.includes('curl')) {
          ex.englishName = 'Dumbbell Biceps Curl';
          ex.name = 'قۆڵ دووسەر (بایسێپس) بە دەمبڵ';
        }
      }

      // ڕێگری لە دووبارەبوونەوەی هەمان ڕاهێنان لە یەک ڕۆژدا (Deduplication)
      const dedupeKey = (ex.englishName || ex.name || '').toLowerCase().trim();
      if (!seenExerciseKeys.has(dedupeKey)) {
        seenExerciseKeys.add(dedupeKey);
        cleanList.push(ex);
      }
    });

    day.exercises = cleanList;
  });

  return course;
}

const BODY_PART_MAP = {
  m1: { ku: 'سنگ', en: 'Chest' },
  m2: { ku: 'شان', en: 'Shoulders' },
  m3: { ku: 'پشت', en: 'Back' },
  m4: { ku: 'باڵ و قۆڵ', en: 'Arms (Biceps & Triceps)' },
  m5: { ku: 'ورگ و کەمەر', en: 'Abs & Waist' },
  m6: { ku: 'ڕان و قاچ', en: 'Legs (Quads & Hamstrings)' },
  m7: { ku: 'پوز', en: 'Calves' },
  f1: { ku: 'سنگ', en: 'Chest' },
  f2: { ku: 'کەمەر', en: 'Waist & Obliques' },
  f3: { ku: 'ورگ', en: 'Belly & Lower Abs' },
  f4: { ku: 'سمت و حەوز', en: 'Glutes & Hips' },
  f5: { ku: 'ڕان و قاچ', en: 'Legs & Thighs' },
  f6: { ku: 'باڵ', en: 'Arms' },
  f7: { ku: 'پشت', en: 'Back' }
};

export function resolveBodyGoalList(ids = [], lang = 'ku') {
  if (!Array.isArray(ids)) return [];
  return ids.map(id => {
    const found = BODY_PART_MAP[id];
    if (!found) return id;
    return lang === 'en' ? found.en : `${found.ku} (${found.en})`;
  });
}

if (typeof window !== "undefined") window.generateWorkoutDirectly = async (profile, targetDays, location = 'gym', equipment = '', lang = 'ku') => {
   const days = Number(targetDays) || Number(profile?.availableDaysPerWeek) || 4;
   const isHome = location === 'home';
   const enlargeList = resolveBodyGoalList(profile?.bodyGoals?.enlarge || [], lang);
   const shrinkList = resolveBodyGoalList(profile?.bodyGoals?.shrink || [], lang);
   const enlargeText = enlargeList.join(', ');
   const shrinkText = shrinkList.join(', ');
   const isFemale = profile?.gender === 'female' || profile?.gender === 'مێ' || profile?.gender === 'ئافرەت';
   const genderLabel = isFemale ? 'Female (ئافرەت)' : 'Male (پیاو)';
   const ageVal = Number(profile?.age) || 23;
   const weightVal = Number(profile?.weight) || 75;
   const heightVal = Number(profile?.height) || 175;
   const targetWeightVal = Number(profile?.targetWeight) || weightVal;
   const paceVal = profile?.goalPace || 'normal';
   const supplementsText = Array.isArray(profile?.supplements) && profile.supplements.length > 0 ? profile.supplements.join(', ') : 'None (Natural)';
   const langName = lang === 'en' ? 'English' : lang === 'ar' ? 'Arabic' : lang === 'fa' ? 'Persian' : 'Kurdish (Sorani)';

   const physique = profile?.physiqueAnalysis || null;
   const physiqueInfo = physique ? `
- AI Vision Physique Scan Findings:
  * Estimated Body Fat: ${physique.bodyFatPercentage || 'N/A'}%
  * Somatotype / Body Type: ${physique.bodyType || 'N/A'}
  * Visually Lagging Muscle Groups (TOP PRIORITY TO DEVELOP): ${(physique.laggingMuscles || []).join(', ') || 'None'}
  * Well-Developed Muscles: ${(physique.strongMuscles || []).join(', ') || 'Balanced'}
  * Posture & Symmetry Notes: ${physique.postureFeedback || 'Symmetric'}
` : '';

   const homeRules = isHome ? `
CRITICAL RULES FOR HOME WORKOUT:
- DO NOT invent improvised household items (NEVER use words like "Backpack", "Water bottle", "Couch", "Towel", "Broom").
- For Bodyweight Home Workout (no equipment):
  * Chest: Push-ups, Diamond Push-ups, Wide Push-ups
  * Back: Floor Reverse Push-up, Superman Holds, Glute Bridges
  * Shoulders: Pike Push-ups
  * Arms: Bench Dips, Diamond Push-ups, Bodyweight Biceps Curl
  * Legs & Glutes: Bodyweight Squats, Bulgarian Split Squats, Bodyweight Lunges, Glute Bridges, Bodyweight Standing Calf Raise
  * Core & Waist: Plank, Crunches, Russian Twists, Mountain Climbers, Lying Leg Raises
- NEVER duplicate the same exercise twice on the same day.
- NEVER use Doorway Rows, Table Inverted Rows, Gym Ladders, Barbells, or Gym Benches for home bodyweight.
` : '';

   const prompt = `You are an elite sports scientist and personal trainer.
Design a strictly personalized ${days}-day weekly workout program in ${langName} based on this exact athlete profile:
- Name: ${profile?.name || 'Athlete'}
- Gender: ${genderLabel}
- Age: ${ageVal} years old
- Current Weight: ${weightVal} kg | Height: ${heightVal} cm | Target Weight: ${targetWeightVal} kg
- Primary Goal: ${profile?.goal || (targetWeightVal > weightVal ? 'Muscle Gain' : targetWeightVal < weightVal ? 'Fat Loss' : 'Body Recomposition')}
- Progression Pace: ${paceVal}
- Supplements, Vitamins & Hormones Used: ${supplementsText}
- Priority Muscles to ENLARGE / Hypertrophy Focus: ${enlargeText || (isFemale ? 'Glutes, Legs & Toned Upper Body' : 'Balanced Chest, Back, Shoulders, Arms & Legs')}
- Priority Areas to SHRINK / Burn Fat & Tone: ${shrinkText || 'Core & Overall Body Fat'}
- Training Days: ${days} days per week (${7 - days} rest days)
- Location: ${isHome ? 'Home Workout' : 'Gym'}${equipment ? ` (Available Equipment: ${equipment})` : ''}
- Injuries / Health Conditions: ${(profile?.healthConditions || []).join(', ') || 'None'}
${physiqueInfo}
${homeRules}

PERSONALIZATION REQUIREMENTS:
1. You MUST tailor the weekly split, exercise selection, sets, reps, and rest periods directly to the athlete's gender (${genderLabel}), age (${ageVal}), weight (${weightVal}kg -> ${targetWeightVal}kg), supplements/hormones (${supplementsText}), and priority body goals (Enlarge: ${enlargeText || 'Balanced'}, Shrink: ${shrinkText || 'None'}).
2. Give extra volume (+1 exercise or +1 set) to the priority muscles in "Enlarge", and include targeted high-rep metabolic/core/toning exercises for areas in "Shrink". If the athlete uses Creatine, Pre-Workout, Proteins, or Hormones, optimize work volume and recovery accordingly.
${physique && physique.laggingMuscles && physique.laggingMuscles.length > 0 ? `3. AI PHYSIQUE SCAN VISUAL INTEGRATION: The athlete's physique was scanned by AI camera vision. Visually lagging muscle groups are: ${physique.laggingMuscles.join(', ')}. You MUST give direct priority to these lagging muscle groups across the training week (positioning them early in the workouts, adding targeted hypertrophic variation and adequate volume to bring up lagging areas).` : ''}
4. Strictly avoid any exercise that stresses the listed injuries (${(profile?.healthConditions || []).join(', ') || 'None'}).
5. In "rationale", write a clear 1-2 sentence explanation in ${langName} mentioning the athlete's weight (${weightVal}kg -> ${targetWeightVal}kg), supplements (${supplementsText}), and selected focus muscles (including any AI-scanned lagging muscles) so they see the program is custom-built for them.

Return ONLY a valid JSON object matching this exact structure:
{
  "id": "ai_course_${days}d_${Date.now()}",
  "title": "Personalized title in ${langName}",
  "englishSubtitle": "${days}-Day Custom AI Split",
  "daysPerWeek": ${days},
  "durationDays": ${profile?.targetDays || 45},
  "rationale": "Personalized scientific explanation in ${langName}",
  "weeklyPlan": [
    {
      "dayKey": "d1",
      "dayName": "Day name in ${langName}",
      "focus": "Focus muscles in ${langName}",
      "estimatedCalories": 440,
      "isRestDay": false,
      "exercises": [
        {
          "name": "Exercise name in ${langName}",
          "englishName": "Standard Exercise Name in English",
          "sets": 4,
          "reps": "10-12",
          "rest": "60s",
          "muscle": "Target muscle in ${langName}"
        }
      ]
    }
  ]
}
Note: "weeklyPlan" must have exactly 7 objects (Saturday d1 through Friday d7).
Exactly ${days} days must have isRestDay: false (each with 4-5 tailored exercises), and ${7 - days} days must have isRestDay: true (exercises: []).
RESPOND ONLY WITH PURE JSON. NO MARKDOWN.`;

   const resText = await window.callGeminiAPI(prompt);
   const cleaned = cleanJsonText(resText);
   let parsed = null;
   try {
     parsed = JSON.parse(cleaned);
   } catch {
     parsed = JSON.parse(cleaned.replace(/[\r\n]+/g, ' '));
   }
   if (parsed && Array.isArray(parsed.weeklyPlan) && parsed.weeklyPlan.length === 7) {
     parsed.trainingLocation = location;
     parsed.homeEquipment = equipment;
     parsed.isAiOnlineGenerated = true;
     const sanitized = sanitizeWorkoutPlan(parsed, location, equipment);
     sanitized.isAiOnlineGenerated = true;
     return sanitized;
   }
   throw new Error("Invalid format from AI");
};

if (typeof window !== "undefined") window.swapExerciseDirectly = async (profile, currentExercise, dayFocus = '', existingDayExercises = [], lang = 'ku') => {
   const langName = lang === 'en' ? 'English' : lang === 'ar' ? 'Arabic' : lang === 'fa' ? 'Persian' : 'Kurdish (Sorani)';
   const excludedNames = (existingDayExercises || [])
     .map(e => `${e.name || ''} (${e.englishName || ''})`)
     .join(', ');
   const prompt = `You are an elite strength and conditioning coach.
The athlete wants to replace this single exercise in today's workout:
- Current Exercise to Replace: "${currentExercise?.name || ''}" (${currentExercise?.englishName || ''})
- Target Muscle: "${currentExercise?.muscle || dayFocus || 'General'}"
- Day Focus: "${dayFocus}"
- Athlete Location: ${profile?.trainingLocation === 'home' ? 'Home Workout' : 'Gym'}
- Athlete Injuries: ${(profile?.healthConditions || []).join(', ') || 'None'}
- Athlete Supplements: ${(profile?.supplements || []).join(', ') || 'None'}
- STRICTLY EXCLUDED EXERCISES (already in today's workout or being replaced — DO NOT return any of these): ${excludedNames}

Choose ONE biomechanically effective replacement exercise targeting the same muscle group (or complementary muscle) that is NOT in the excluded list.
Return ONLY a valid JSON object (no markdown):
{
  "name": "Exercise name in ${langName}",
  "englishName": "Standard Exercise Name in English (e.g. Incline Dumbbell Press, Lat Pulldown, Cable Lateral Raise, Leg Press, Hammer Curl)",
  "sets": ${Number(currentExercise?.sets) || 4},
  "reps": "${currentExercise?.reps || '10-12'}",
  "rest": "${currentExercise?.rest || '60s'}",
  "muscle": "${currentExercise?.muscle || 'ماسولکەی ئامانج'}"
}`;
   const resText = await window.callGeminiAPI(prompt + "\nRESPOND ONLY IN PURE VALID JSON. NO MARKDOWN.");
   const cleaned = cleanJsonText(resText);
   const parsed = JSON.parse(cleaned);
   if (parsed && (parsed.name || parsed.englishName)) {
     return {
       name: parsed.name || parsed.englishName,
       englishName: parsed.englishName || parsed.name,
       sets: Number(parsed.sets) || Number(currentExercise?.sets) || 4,
       reps: String(parsed.reps || currentExercise?.reps || '10-12'),
       rest: String(parsed.rest || currentExercise?.rest || '60s'),
       muscle: parsed.muscle || currentExercise?.muscle || 'ماسولکە'
     };
   }
   throw new Error("Invalid replacement exercise from AI");
};

if (typeof window !== "undefined") window.generateCoachReplyDirectly = async (query, profile, recentMessages = [], lang = 'ku') => {
   const langName = lang === 'en' ? 'English' : lang === 'ar' ? 'Arabic' : lang === 'fa' ? 'Persian' : 'Kurdish (Sorani)';
   const compactProfile = {
     name: profile?.name || 'یاریزان',
     age: profile?.age || 23,
     gender: profile?.gender || 'male',
     weight: profile?.weight || 75,
     targetWeight: profile?.targetWeight || 80,
     height: profile?.height || 175,
     goal: profile?.goal || 'Fitness',
     goalCalories: profile?.goalCalories || profile?.dailyCalories || 2200,
     goalProtein: profile?.goalProtein || 150,
     daysPerWeek: profile?.availableDaysPerWeek || 4,
     location: profile?.trainingLocation || 'gym',
     injuries: profile?.healthConditions || [],
     supplements: profile?.supplements || []
   };
   const historyText = Array.isArray(recentMessages) && recentMessages.length > 0
     ? recentMessages.slice(-8).map(m => `${m.sender === 'user' ? 'User' : 'Coach'}: ${m.text}`).join('\n')
     : '';
   const systemInstruction = `You are the intelligent AI Coach inside the BQ GYM app.
You have unrestricted conversational intelligence: you can hold any kind of natural conversation, chat warmly like a real human mentor and friend, answer any question (sports, bodybuilding, nutrition, supplements, vitamins, hormones, health, recovery, lifestyle, motivation, general knowledge, or casual conversation), and give deeply accurate, helpful answers in ${langName}.
You also know the athlete's complete profile (including their weight, target weight, injuries, and exact supplements/vitamins/hormones: ${(compactProfile.supplements || []).join(', ') || 'None'}).
Always reply in ${langName} inside the JSON structure requested.`;

   const prompt = `Athlete Profile: ${JSON.stringify(compactProfile)}
${historyText ? `Conversation History:\n${historyText}\n` : ''}Athlete's new message: "${query}"

Respond naturally, thoroughly, and conversationally in ${langName} to whatever the athlete said or asked.
Return ONLY a valid JSON object (no markdown):
{"reply": "your complete, natural, helpful response in ${langName}", "thought": "brief reasoning in ${langName}", "suggestedReplies": ["short relevant follow-up 1 in ${langName}", "short relevant follow-up 2 in ${langName}"], "action": null}`;
   const resText = await window.callGeminiAPI(prompt, systemInstruction);
   const cleaned = cleanJsonText(resText);
   try {
     const parsed = JSON.parse(cleaned);
     if (parsed && parsed.reply) return parsed;
   } catch {
     try {
       const parsed2 = JSON.parse(cleaned.replace(/[\r\n]+/g, ' '));
       if (parsed2 && parsed2.reply) return parsed2;
     } catch {}
   }
   const replyMatch = String(resText || '').match(/"reply"\s*:\s*"([\s\S]*?)"(?=\s*,\s*"|\s*\})/);
   return {
     reply: replyMatch ? replyMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"') : String(resText || '').replace(/```json|```/gi, '').trim(),
     thought: '',
     suggestedReplies: [],
     action: null
   };
};




// ==================== مەکینەی زانستی داڕشتنی ئامانج و ڕێژەی پێویستی کالۆری بە سیستەمی پێشکەوتوو (AI Scientific Goal & Nutrition Engine) ====================
export function calculateScientificGoalByAi({ 
  weight = 78, 
  height = 178, 
  age = 23, 
  gender = 'male',
  targetWeight = 84, 
  targetDays = 45, 
  availableDaysPerWeek = 4, 
  trainingLocation = 'gym', 
  goal = '', 
  goalPace = 'normal',
  healthConditions = [],
  supplements = [],
  physiqueAnalysis = null
}) {
  const currentWeight = Number(weight) || 78;
  const currentHeight = Number(height) || 178;
  const currentAge = Number(age) || 23;
  const currentTargetWeight = Number(targetWeight) || (currentWeight + 6);
  const daysPerWeek = Number(availableDaysPerWeek) || 4;
  const pace = (goalPace && ['slow', 'normal', 'fast', 'very_fast'].includes(goalPace)) ? goalPace : 'normal';

  // ١. هەژمارکردنی BMR بە پێی ڕەگەز و یاسای زانستی Mifflin-St Jeor
  const isFemale = gender === 'female' || gender === 'مێ' || gender === 'ئافرەت';
  const bmr = isFemale
    ? (10 * currentWeight) + (6.25 * currentHeight) - (5 * currentAge) - 161
    : (10 * currentWeight) + (6.25 * currentHeight) - (5 * currentAge) + 5;

  // ٢. هاوکۆلکەی چاڵاکی بە پێی ڕۆژەکانی ڕاهێنانی کۆرس لە هەفتەدا (TDEE Activity Multiplier)
  let activityMultiplier = 1.55;
  if (daysPerWeek <= 2) activityMultiplier = 1.375;
  else if (daysPerWeek === 3) activityMultiplier = 1.45;
  else if (daysPerWeek === 4) activityMultiplier = 1.55;
  else if (daysPerWeek === 5) activityMultiplier = 1.65;
  else if (daysPerWeek >= 6) activityMultiplier = 1.75;

  if (trainingLocation === 'gym') {
    activityMultiplier += 0.05; // زیادبوونی سووتانی کالۆری لە هۆڵ بەهۆی مەشقی قورس
  }

  // کۆی خەرجی وزەی ڕۆژانەی یاریزان (TDEE)
  const tdee = Math.round(bmr * activityMultiplier);

  const conditions = healthConditions || [];
  const hasKnee = conditions.some(c => c.includes('ئەژنۆ') || c.toLowerCase().includes('knee'));
  const hasBack = conditions.some(c => c.includes('پشت') || c.toLowerCase().includes('back') || c.includes('دیسک'));

  const deltaKg = Math.abs(currentTargetWeight - currentWeight);
  let computedDays = Number(targetDays) || 45;

  // هەژمارکردنی کاتی پێویست بۆ گەیشتن بە ئامانج بەپێی خێرایی (Pace)
  if (deltaKg > 0) {
    const weeklyRateKg = pace === 'slow' ? 0.3 : pace === 'normal' ? 0.5 : pace === 'fast' ? 0.75 : 1.0;
    const minDays = pace === 'slow' ? 30 : pace === 'normal' ? 25 : pace === 'fast' ? 20 : 14;
    computedDays = Math.max(minDays, Math.round((deltaKg / weeklyRateKg) * 7));
  }

  let calculatedGoalName = goal;
  let calculatedCalories = 3100;
  let calculatedProtein = 165;
  let calculatedCarbs = 380;
  let calculatedFat = 75;

  if (currentTargetWeight > currentWeight) {
    // زیادکردنی کێش و گەشەی ماسولکە (Hypertrophy Bulk) بەپێی خێرایی
    let surplus = 400;
    let proteinPerKg = 2.2;
    if (pace === 'slow') {
      surplus = 220; // گەشەی پاک بە کەمترین چەوری
      proteinPerKg = 2.1;
    } else if (pace === 'normal') {
      surplus = 400; // ستاندارد
      proteinPerKg = 2.2;
    } else if (pace === 'fast') {
      surplus = 600; // خێرا
      proteinPerKg = 2.2;
    } else if (pace === 'very_fast') {
      surplus = 800; // زۆر خێرا بە قەبارەی گەورە
      proteinPerKg = 2.3;
    }

    calculatedCalories = tdee + surplus;

    if (!calculatedGoalName || calculatedGoalName.includes('دابەزاندن') || calculatedGoalName.includes('سوتاندن')) {
      calculatedGoalName = 'گەشەی ماسولکە';
    }

    calculatedProtein = Math.round(currentWeight * proteinPerKg);
    calculatedFat = Math.round((calculatedCalories * 0.24) / 9);
    calculatedCarbs = Math.max(60, Math.round((calculatedCalories - (calculatedProtein * 4) - (calculatedFat * 9)) / 4));
  } else if (currentTargetWeight < currentWeight) {
    // دابەزاندنی چەوری و کێش (Cutting / Fat Loss) بەپێی خێرایی
    let deficit = 500;
    let proteinPerKg = 2.3;
    if (pace === 'slow') {
      deficit = 300; // لەسەرخۆ بە پاراستنی تەواوی ماسولکە
      proteinPerKg = 2.2;
    } else if (pace === 'normal') {
      deficit = 500; // هاوسەنگ
      proteinPerKg = 2.3;
    } else if (pace === 'fast') {
      deficit = 700; // خێرا
      proteinPerKg = 2.4;
    } else if (pace === 'very_fast') {
      deficit = 900; // زۆر خێرا بە زۆرترین پرۆتین
      proteinPerKg = 2.5;
    }

    const safeFloor = isFemale ? Math.max(bmr * 0.85, 1250) : Math.max(bmr * 0.85, 1450);
    calculatedCalories = Math.max(Math.round(tdee - deficit), Math.round(safeFloor));

    if (!calculatedGoalName || calculatedGoalName.includes('زیادکردن') || calculatedGoalName.includes('گەشە')) {
      calculatedGoalName = 'سوتاندنی چەوری';
    }

    calculatedProtein = Math.round(currentWeight * proteinPerKg);
    calculatedFat = Math.round((calculatedCalories * 0.22) / 9);
    calculatedCarbs = Math.max(50, Math.round((calculatedCalories - (calculatedProtein * 4) - (calculatedFat * 9)) / 4));
  } else {
    // جێگیرکردنی کێش (Maintenance & Tone)
    let calAdjustment = 0;
    if (pace === 'fast') calAdjustment = -150;
    else if (pace === 'very_fast') calAdjustment = -250;
    calculatedCalories = Math.max(tdee + calAdjustment, 1500);

    if (!calculatedGoalName) {
      calculatedGoalName = 'جێگیرکردنی کێش';
    }
    calculatedProtein = Math.round(currentWeight * 2.1);
    calculatedFat = Math.round((calculatedCalories * 0.25) / 9);
    calculatedCarbs = Math.max(50, Math.round((calculatedCalories - (calculatedProtein * 4) - (calculatedFat * 9)) / 4));
  }

  // کارایی سەپلیمێنت و هۆرمۆن و پرۆتین لەسەر بڕی پرۆتین و کالۆری و ئاوی ڕۆژانە
  const suppList = Array.isArray(supplements) ? supplements.map(s => String(s).toLowerCase()) : [];
  const hasHormones = suppList.some(s => s.includes('test') || s.includes('تێستۆستیرۆن') || s.includes('هۆرمۆن') || s.includes('tren') || s.includes('deca') || s.includes('anavar') || s.includes('sarm') || s.includes('rad') || s.includes('mk-677') || s.includes('پێپتاید') || s.includes('ئینسۆلین') || s.includes('gh'));
  const hasCreatineOrPre = suppList.some(s => s.includes('creatine') || s.includes('کریاتین') || s.includes('pre') || s.includes('تاقە') || s.includes('وزە') || s.includes('c4'));
  const hasFatBurner = suppList.some(s => s.includes('carnitine') || s.includes('کارنیتین') || s.includes('clen') || s.includes('کلین') || s.includes('چەوری سووتێنەر') || s.includes('burner') || s.includes('yohimbine'));
  const hasMassGainer = suppList.some(s => s.includes('mass') || s.includes('گەینەر'));

  if (hasHormones) {
    // هۆرمۆن دروستکردنی پرۆتین لە ماسولکەدا بەرز دەکاتەوە
    calculatedProtein = Math.round(calculatedProtein * 1.15);
    if (currentTargetWeight > currentWeight) {
      calculatedCalories += 180;
    }
  }
  if (hasMassGainer && currentTargetWeight > currentWeight) {
    calculatedCalories += 150;
  }
  if (hasFatBurner && currentTargetWeight < currentWeight) {
    calculatedProtein = Math.max(calculatedProtein, Math.round(currentWeight * 2.4));
  }
  calculatedCarbs = Math.max(50, Math.round((calculatedCalories - (calculatedProtein * 4) - (calculatedFat * 9)) / 4));

  // بڕی ئاوی ڕۆژانە بەپێی کێش و سەپلیمێنت (کریاتین و هۆرمۆن ئاوی زیاتریان دەوێت)
  let baseWaterMl = Math.round(currentWeight * 38);
  if (hasCreatineOrPre) baseWaterMl += 600;
  if (hasHormones) baseWaterMl += 600;
  if (hasFatBurner) baseWaterMl += 400;
  const calculatedWaterMl = Math.max(2500, Math.min(6000, Math.round(baseWaterMl / 100) * 100));

  // کاتێک سکانی بینینی جەستە (AI Physique Vision) ئەنجامدراوە
  if (physiqueAnalysis && typeof physiqueAnalysis === 'object') {
    if (physiqueAnalysis.recommendedCalories && Number(physiqueAnalysis.recommendedCalories) >= 1200) {
      calculatedCalories = Math.round(Number(physiqueAnalysis.recommendedCalories));
    }
    if (physiqueAnalysis.recommendedProtein && Number(physiqueAnalysis.recommendedProtein) >= 60) {
      calculatedProtein = Math.round(Number(physiqueAnalysis.recommendedProtein));
    }
    calculatedCarbs = Math.max(50, Math.round((calculatedCalories - (calculatedProtein * 4) - (calculatedFat * 9)) / 4));
  }

  return {
    targetWeight: currentTargetWeight,
    targetDays: computedDays,
    goal: calculatedGoalName,
    goalPace: pace,
    goalCalories: calculatedCalories,
    goalProtein: calculatedProtein,
    goalCarbs: calculatedCarbs,
    goalFat: calculatedFat,
    goalWaterMl: calculatedWaterMl
  };
}

// ==================== مەکینەی زانستی داڕشتنی کۆرس بەپێی دۆخی ڕاستەقینەی بەکارهێنەر ====================
export function generateAiScientificProgram({ weight = 78, targetWeight = 84, targetDays = 45, age = 23, gender = 'male', goal = '', goalPace = 'normal', bodyGoals = { enlarge: [], shrink: [] }, healthConditions = [], physiqueAnalysis = null }, selectedDaysCount = 4, location = 'gym', equipment = '') {
  const conditions = healthConditions || [];
  const hasKnee = conditions.some(c => c.includes('ئەژنۆ') || c.toLowerCase().includes('knee'));
  const hasBack = conditions.some(c => c.includes('پشت') || c.toLowerCase().includes('back') || c.includes('دیسک'));
  const hasShoulder = conditions.some(c => c.includes('شان') || c.toLowerCase().includes('shoulder'));
  const isFemale = gender === 'female' || gender === 'مێ' || gender === 'ئافرەت';
  const isBulk = targetWeight > weight || goal.includes('زیادکردن') || goal.includes('گەشە') || goal.toLowerCase().includes('bulk');
  const isCut = targetWeight < weight || goal.includes('دابەزاندن') || goal.includes('سوتاندن') || goal.toLowerCase().includes('cut') || goal.toLowerCase().includes('loss');
  const pace = (goalPace && ['slow', 'normal', 'fast', 'very_fast'].includes(goalPace)) ? goalPace : 'normal';

  const enlargeIds = Array.isArray(bodyGoals?.enlarge) ? bodyGoals.enlarge : [];
  const shrinkIds = Array.isArray(bodyGoals?.shrink) ? bodyGoals.shrink : [];

  const lagging = (physiqueAnalysis?.laggingMuscles || []).map(m => String(m).toLowerCase());
  const lagChest = lagging.some(m => m.includes('سنگ') || m.includes('chest'));
  const lagDelts = lagging.some(m => m.includes('شان') || m.includes('delt') || m.includes('shoulder'));
  const lagBack = lagging.some(m => m.includes('پشت') || m.includes('back') || m.includes('lat'));
  const lagArms = lagging.some(m => m.includes('باڵ') || m.includes('قۆڵ') || m.includes('arm') || m.includes('bicep') || m.includes('tricep'));
  const lagLegs = lagging.some(m => m.includes('قاچ') || m.includes('ڕان') || m.includes('leg') || m.includes('quad'));
  const lagCore = lagging.some(m => m.includes('ورگ') || m.includes('کۆڕ') || m.includes('abs') || m.includes('core'));

  const wantChest = enlargeIds.some(x => x === 'm1' || x === 'f1' || String(x).includes('سنگ')) || lagChest;
  const wantShoulders = enlargeIds.some(x => x === 'm2' || String(x).includes('شان')) || lagDelts;
  const wantBack = enlargeIds.some(x => x === 'm3' || x === 'f7' || String(x).includes('پشت')) || lagBack;
  const wantArms = enlargeIds.some(x => x === 'm4' || x === 'f6' || String(x).includes('باڵ') || String(x).includes('قۆڵ')) || lagArms;
  const wantGlutes = enlargeIds.some(x => x === 'f4' || String(x).includes('سمت')) || (isFemale && !enlargeIds.length);
  const wantLegs = enlargeIds.some(x => x === 'm6' || x === 'f5' || String(x).includes('ڕان') || String(x).includes('قاچ')) || lagLegs;
  const wantCalves = enlargeIds.some(x => x === 'm7' || String(x).includes('پوز'));
  const shrinkCore = shrinkIds.some(x => ['m5', 'f2', 'f3'].includes(x) || String(x).includes('ورگ') || String(x).includes('کەمەر')) || isCut || lagCore;
  const shrinkLower = shrinkIds.some(x => ['m6', 'f4', 'f5'].includes(x));

  // ڕێکخستنی کاتی پشوو و سێت و دووبارە بەپێی خێرایی (Pace) و تەمەن
  const isSenior = Number(age) >= 42;
  const restSec = pace === 'slow' ? 90 : pace === 'normal' ? 60 : pace === 'fast' ? 45 : 35;
  const setsMain = isSenior ? 3 : (pace === 'slow' ? 3 : pace === 'very_fast' ? 5 : 4);
  const setsSec = pace === 'slow' ? 3 : pace === 'very_fast' ? 4 : 3;

  const repsMain = isBulk 
    ? (pace === 'very_fast' ? '6-8' : '8-10')
    : (pace === 'very_fast' ? '15-20' : pace === 'fast' ? '12-15' : '10-12');

  const repsSec = isBulk ? '10-12' : (pace === 'very_fast' ? '15-18' : '12-15');

  const cardioMins = pace === 'slow' ? 15 : pace === 'normal' ? 20 : pace === 'fast' ? 25 : 30;
  const isHome = location === 'home';
  const hasDumbbells = equipment.toLowerCase().includes('دەستەوانە') || equipment.toLowerCase().includes('دەمبڵ') || equipment.toLowerCase().includes('dumbbell');
  const hasBands = equipment.toLowerCase().includes('لاستیک') || equipment.toLowerCase().includes('قایش') || equipment.toLowerCase().includes('band');

  const cardioEx = isHome ? {
    name: hasKnee ? 'مارشی خێرا لە شوێنی خۆت (' + cardioMins + ' خولەک)' : 'چیاڕەوی خێرا و کاردیۆ (Mountain Climbers)',
    englishName: hasKnee ? 'Low Impact High Knees March' : 'Mountain Climbers',
    sets: 3,
    reps: '45s',
    rest: '30s',
    muscle: 'کاردیۆ و سوتاندنی چەوری'
  } : hasKnee ? {
    name: 'پاسکیلی وەستاو (' + cardioMins + ' خولەک - پاراستنی ئەژنۆ)',
    englishName: 'Stationary Bike',
    sets: 1,
    reps: cardioMins + ' خولەک',
    rest: restSec + 's',
    muscle: 'کاردیۆ و سوتاندنی چەوری'
  } : (pace === 'fast' || pace === 'very_fast') ? {
    name: 'ڕاهێنانی ڕاکردن بە تەرمیل (' + cardioMins + ' خولەک ئینتێرڤاڵ)',
    englishName: 'Treadmill Interval Running',
    sets: 1,
    reps: cardioMins + ' خولەک',
    rest: restSec + 's',
    muscle: 'کاردیۆ و چەوری سوتاندن'
  } : {
    name: 'پیاسەی خێرا بە لێژی لەسەر تەرمیل (' + cardioMins + ' خولەک)',
    englishName: 'Walking on Incline Treadmill',
    sets: 1,
    reps: cardioMins + ' خولەک',
    rest: restSec + 's',
    muscle: 'کاردیۆ و سوتاندنی چەوری'
  };

  const coreBurnEx = isHome ? {
    name: 'پێچکردنی ڕووسی بۆ تواندنەوەی چەوری کەمەر و ورگ',
    englishName: 'Russian Twists',
    sets: 4,
    reps: '20',
    rest: '30s',
    muscle: 'ورگ و کەمەر'
  } : {
    name: 'کڕانچی سک بە کێبڵ + بەرزکردنەوەی قاچ بۆ تواندنەوەی ورگ',
    englishName: 'Cable Rope Crunch',
    sets: 4,
    reps: '15-20',
    rest: '40s',
    muscle: 'ورگ و کەمەر'
  };

  const attachCustomFinishers = (list, dayType, shouldCardio) => {
    const out = [...list];
    if (dayType === 'push' && wantChest) {
      out.push(isHome
        ? { name: 'شناوی خاو بە تەرکیزی سنگ (Tempo Push-ups)', englishName: 'Push-ups', sets: setsMain + 1, reps: '12-15', rest: restSec + 's', muscle: 'سنگ (تەرکیزی تایبەت)' }
        : { name: 'پێک دێک فلای بە ئامێر بۆ پڕکردنەوەی ناوەڕاستی سنگ', englishName: 'Pec Deck Machine Fly', sets: setsMain, reps: '12-15', rest: restSec + 's', muscle: 'سنگ (تەرکیزی تایبەت)' }
      );
    }
    if (dayType === 'pull' && wantBack) {
      out.push(isHome
        ? { name: 'ڕاهێنانی سوپەرمان بە ڕاگرتن بۆ توندکردنی پشت', englishName: 'Superman Holds', sets: setsMain, reps: '15', rest: restSec + 's', muscle: 'پشت (تەرکیزی تایبەت)' }
        : { name: 'ڕاکێشانی کێبڵ بە دەسکی تەسک (Close-Grip Pulldown)', englishName: 'Close Grip Lat Pulldown', sets: setsMain, reps: '10-12', rest: restSec + 's', muscle: 'پانیی پشت (تەرکیزی تایبەت)' }
      );
    }
    if ((dayType === 'arms' || dayType === 'push' || dayType === 'pull') && wantArms && out.length < 5) {
      out.push(isHome
        ? { name: hasDumbbells ? 'کۆنسێنترەیشن کێرڵ بە دەمبڵ بۆ لووتکەی باڵ' : 'پاشەملەی چڕ لەسەر کورسی (Bench Dips)', englishName: hasDumbbells ? 'Dumbbell Concentration Curl' : 'Bench Dips', sets: setsMain, reps: '12-15', rest: restSec + 's', muscle: 'باڵ و قۆڵ (تەرکیزی تایبەت)' }
        : { name: 'پریچەر کێرڵ بە ئامێر یان باڕی EZ بۆ گەورەکردنی باڵ', englishName: 'EZ Bar Preacher Curl', sets: setsMain, reps: '10-12', rest: restSec + 's', muscle: 'باڵ و قۆڵ (تەرکیزی تایبەت)' }
      );
    }
    if (dayType === 'legs' && wantGlutes) {
      out.unshift(isHome
        ? { name: 'هیپ ثرەست / بەرزکردنەوەی حەوز بە تەرکیزی سمت', englishName: 'Glute Bridges', sets: setsMain + 1, reps: '15-20', rest: restSec + 's', muscle: 'سمت و حەوز (تەرکیزی تایبەت)' }
        : { name: 'باڕبێڵ هیپ ثرەست بۆ گەورەکردن و فۆڕمکردنی سمت', englishName: 'Barbell Hip Thrust', sets: setsMain + 1, reps: '10-12', rest: restSec + 's', muscle: 'سمت و حەوز (تەرکیزی تایبەت)' }
      );
    }
    if (dayType === 'legs' && wantCalves) {
      out.push(isHome
        ? { name: 'بەرزبوونەوەی پوز بە یەک پێ بە چڕی بەرز', englishName: 'Bodyweight Standing Calf Raise', sets: 5, reps: '20', rest: '35s', muscle: 'پوز (تەرکیزی تایبەت)' }
        : { name: 'سۆڵە بە دانیشتنەوە بە ئامێر (Seated Calf Raise)', englishName: 'Seated Calf Raise', sets: 5, reps: '15-20', rest: '40s', muscle: 'پوز (تەرکیزی تایبەت)' }
      );
    }
    if (shrinkCore && (dayType === 'arms' || dayType === 'full' || dayType === 'pull')) {
      out.push(coreBurnEx);
    }
    if (shouldCardio && (isCut || shrinkCore || shrinkLower)) {
      out.push(cardioEx);
    }
    return out;
  };

  const paceCalBonus = pace === 'slow' ? -30 : pace === 'normal' ? 0 : pace === 'fast' ? 40 : 80;
  const chestSets = wantChest ? setsMain + 1 : setsMain;
  const backSets = wantBack ? setsMain + 1 : setsMain;
  const legSets = (wantLegs || wantGlutes) ? setsMain + 1 : setsMain;
  const armSets = wantArms ? setsMain + 1 : setsMain;
  const shoulderSets = wantShoulders ? setsMain + 1 : setsSec;

  // Push Day
  const exPush = isHome ? [
    { name: hasDumbbells ? 'پاڵەپەستۆی سنگ بە دەمبڵ لەسەر زەوی' : 'شناو (Push-ups)', englishName: hasDumbbells ? 'Floor Dumbbell Press' : 'Push-ups', sets: chestSets, reps: repsMain, rest: restSec + 's', muscle: 'سنگ' },
    { name: hasBands ? 'فڕینی سنگ بە لاستیک' : 'شناوی فراوان', englishName: hasBands ? 'Band Chest Fly' : 'Wide Push-ups', sets: setsSec, reps: '12-15', rest: restSec + 's', muscle: 'سنگ' },
    { name: hasDumbbells ? 'شان پرێس بە دەمبڵ' : 'شناوی پایک (Pike Push-ups)', englishName: hasDumbbells ? 'Dumbbell Shoulder Press' : 'Pike Push-ups', sets: shoulderSets, reps: repsSec, rest: restSec + 's', muscle: 'شان' },
    { name: hasDumbbells ? 'پاشەملە بە دەمبڵ' : 'شناوی دایمۆند (Diamond Push-ups)', englishName: hasDumbbells ? 'Dumbbell Triceps Extension' : 'Diamond Push-ups', sets: armSets, reps: '12', rest: restSec + 's', muscle: 'ترایسێپس' }
  ] : [
    { name: 'پاڵەپەستۆی سنگ بە دەمبڵ لەسەر کورسی لار', englishName: 'Incline Dumbbell Bench Press', sets: chestSets, reps: repsMain, rest: restSec + 's', muscle: 'سنگ (سەرەوە)' },
    { name: 'فڕینی سنگ بە کێبڵ لە ڕاوەستانەوە', englishName: 'Standing Cable Chest Fly', sets: setsSec, reps: '12-15', rest: restSec + 's', muscle: 'سنگ' },
    { name: hasShoulder ? 'شان بەرزکردنەوە بۆ لا تەنیشت بە کێبڵ (بێ فشار لەسەر جومگە)' : 'دەمبڵ شۆڵدەر پرێس بە دانیشتنەوە', englishName: hasShoulder ? 'Cable Lateral Raise' : 'Seated Dumbbell Shoulder Press', sets: shoulderSets, reps: '10-12', rest: restSec + 's', muscle: 'شان' },
    { name: 'پاشەملە بە کێبڵ بە پەت', englishName: 'Triceps Rope Pushdown', sets: armSets, reps: '12', rest: restSec + 's', muscle: 'ترایسێپس' }
  ];

  // Pull Day
  const exPull = isHome ? [
    { name: hasDumbbells ? 'پاروو بە دەمبڵ بە چەمانەوە' : 'بەرزکردنەوەی جەستە بە ئەنیشک لەسەر زەوی (Reverse Push-up)', englishName: hasDumbbells ? 'Bent Over Dumbbell Row' : 'Floor Reverse Push-up', sets: backSets, reps: repsSec, rest: restSec + 's', muscle: 'پشت' },
    { name: hasBands ? 'ڕاکێشانی لاستیک بۆ پشت' : 'ڕاهێنانی سوپەرمان لەسەر زەوی (Superman Holds)', englishName: hasBands ? 'Band Rows' : 'Superman Holds', sets: setsSec, reps: repsSec, rest: restSec + 's', muscle: 'خوارەوەی پشت' },
    { name: 'پردی سمت لەسەر زەوی (Glute Bridges)', englishName: 'Glute Bridges', sets: setsSec, reps: '15', rest: restSec + 's', muscle: 'سمت و پشت' },
    { name: hasDumbbells ? 'قۆڵ دووسەر بە دەمبڵ' : 'کێشانی قۆڵ بە بەرگری جەستە لە دانیشتنەوە', englishName: hasDumbbells ? 'Dumbbell Biceps Curl' : 'Bodyweight Biceps Curl', sets: armSets, reps: repsSec, rest: restSec + 's', muscle: 'بایسێپس' }
  ] : [
    { name: 'ڕاکێشانی کێبڵ بۆ سەر سنگ بە فراوانی', englishName: 'Lat Pulldown Wide Grip', sets: backSets, reps: repsSec, rest: restSec + 's', muscle: 'پشت (لاتس)' },
    { name: hasBack ? 'پاروو بە کێبڵ بە پاڵپشتی سنگ' : 'پاروو بە دەمبڵ بە تاک دەست', englishName: hasBack ? 'Chest Supported Cable Row' : 'Single Arm Dumbbell Row', sets: backSets, reps: '10', rest: restSec + 's', muscle: 'ناوەڕاستی پشت' },
    { name: 'کۆکردنەوەی پشتی شان بە کێبڵ (Face Pull)', englishName: 'Cable Face Pull', sets: setsSec, reps: '15', rest: restSec + 's', muscle: 'پشتی شان' },
    { name: 'قۆڵ دووسەر بە باڕی EZ لەسەر کورسی لار', englishName: 'Incline Dumbbell Biceps Curl', sets: armSets, reps: repsSec, rest: restSec + 's', muscle: 'بایسێپس' }
  ];

  // Legs Day
  const exLegs = isHome ? [
    { name: hasDumbbells ? 'سکوات بە دەمبڵ (Goblet Squat)' : 'سکوات بە کێشی جەستە', englishName: hasDumbbells ? 'Dumbbell Goblet Squat' : 'Bodyweight Squat', sets: legSets, reps: hasKnee ? '12-15' : repsMain, rest: restSec + 's', muscle: 'ڕان' },
    { name: hasDumbbells ? 'هەنگاونان بە دەمبڵ (Lunges)' : 'سکواتی بولگاری بە یەک پێ', englishName: hasDumbbells ? 'Dumbbell Lunges' : 'Bulgarian Split Squats', sets: legSets, reps: '12-15', rest: restSec + 's', muscle: isFemale ? 'سمت و قاچ' : 'قاچ' },
    { name: 'بەرزکردنەوەی حەوز لەسەر زەوی (Glute Bridges)', englishName: 'Glute Bridges', sets: wantGlutes ? setsMain + 1 : setsSec, reps: '15-20', rest: restSec + 's', muscle: 'سمت' },
    { name: hasDumbbells ? 'بەرزبوونەوە لەسەر پەنجەی پێ بە دەمبڵ' : 'بەرزبوونەوەی پوز', englishName: hasDumbbells ? 'Dumbbell Calf Raises' : 'Bodyweight Standing Calf Raise', sets: wantCalves ? setsMain + 1 : setsMain, reps: '15-20', rest: restSec + 's', muscle: 'پوز' }
  ] : [
    { 
      name: hasKnee ? 'قاچ پرێس (پێیەکان بەرز بۆ پاراستنی ئەژنۆ)' : 'سکوات بە باڕبێڵ لەسەر شان', 
      englishName: hasKnee ? 'Leg Press (High Stance - Knee Safe)' : 'Barbell Back Squat', 
      sets: legSets, 
      reps: hasKnee ? '12-15' : repsMain, 
      rest: restSec + 's',
      muscle: 'چوار سەرەی ڕان' 
    },
    { 
      name: 'ڕاکێشانی پشتی قاچ بە دانیشتنەوە', 
      englishName: 'Seated Leg Curl', 
      sets: setsSec, 
      reps: '12-15', 
      rest: restSec + 's',
      muscle: 'پشتی ڕان' 
    },
    { 
      name: hasKnee ? 'دابەزین لەسەر ستیپ بۆ بەهێزکردنی ماسولکەی VMOی ئەژنۆ' : (hasBack ? 'قاچ پرێس بە کێشی مامناوەند (پاراستنی پشت)' : 'ڕۆمانیەن دێدلیفت بە دەمبڵ'), 
      englishName: hasKnee ? 'VMO Step Downs (Knee Rehab)' : (hasBack ? 'Leg Press Machine' : 'Dumbbell Romanian Deadlift'), 
      sets: legSets, 
      reps: hasKnee ? '15 هەر لایەک' : repsSec, 
      rest: restSec + 's',
      muscle: hasKnee ? 'پاراستنی ئەژنۆ' : 'پشتی قاچ و سمت' 
    },
    { 
      name: hasKnee ? 'سۆڵە بە وەستان لەسەر ستیپ' : 'لێگ ئێکس تێنشن بە ئامێر', 
      englishName: hasKnee ? 'Standing Calf Raise' : 'Leg Extension Machine', 
      sets: setsMain, 
      reps: '12-15', 
      rest: restSec + 's',
      muscle: hasKnee ? 'سۆڵەی پێ' : 'چوار سەرەی ڕان' 
    }
  ];

  // Shoulders & Arms
  const exShouldersArms = isHome ? [
    { name: hasDumbbells ? 'شان بەرزکردنەوە بۆ لا تەنیشت بە دەمبڵ' : 'شناوی پایک بۆ شان (Pike Push-ups)', englishName: hasDumbbells ? 'Dumbbell Lateral Raise' : 'Pike Push-ups', sets: shoulderSets, reps: '12-15', rest: restSec + 's', muscle: 'تەنیشتی شان' },
    { name: hasDumbbells ? 'هامر کێرڵ بە دەمبڵ' : 'کێشانی قۆڵ بە بەرگری جەستە', englishName: hasDumbbells ? 'Dumbbell Hammer Curl' : 'Bodyweight Biceps Curl', sets: armSets, reps: repsSec, rest: restSec + 's', muscle: 'بایسێپس' },
    { name: hasDumbbells ? 'ترایسێپس بە پشتەسەر بە دەمبڵ' : 'پاشەملە لەسەر کورسی (Bench Dips)', englishName: hasDumbbells ? 'Dumbbell Triceps Extension' : 'Bench Dips', sets: armSets, reps: '12-15', rest: restSec + 's', muscle: 'ترایسێپس' },
    { name: 'پلانکی زانستی بۆ بەهێزکردنی ماسولکەی سک', englishName: 'Scientific Plank Hold', sets: setsSec, reps: '60s', rest: restSec + 's', muscle: 'سک' }
  ] : [
    { name: 'شان بەرزکردنەوە بۆ لا تەنیشت بە کێبڵ', englishName: 'Cable Lateral Raise', sets: shoulderSets, reps: '12-15', rest: restSec + 's', muscle: 'تەنیشتی شان' },
    { name: 'هامر کێرڵ بە دەمبڵ بۆ ئەستوورکردنی قۆڵ', englishName: 'Dumbbell Hammer Curl', sets: armSets, reps: repsSec, rest: restSec + 's', muscle: 'بایسێپس و براکیالیس' },
    { name: 'ترایسێپس بە پشتەسەر بە کێبڵ', englishName: 'Overhead Cable Triceps Extension', sets: armSets, reps: '12', rest: restSec + 's', muscle: 'ترایسێپس' },
    { name: 'پلانکی زانستی بۆ بەهێزکردنی ماسولکەی سک', englishName: 'Scientific Plank Hold', sets: setsSec, reps: '60s', rest: restSec + 's', muscle: 'سک' }
  ];

  // Full Body A
  const exFullBodyA = isHome ? [
    { name: 'شناو (Push-ups)', englishName: 'Push-ups', sets: chestSets, reps: repsMain, rest: restSec + 's', muscle: 'سنگ' },
    { name: 'بەرزکردنەوەی جەستە بە ئەنیشک لەسەر زەوی (Reverse Push-up)', englishName: 'Floor Reverse Push-up', sets: backSets, reps: repsSec, rest: restSec + 's', muscle: 'پشت' },
    { name: 'سکوات بە کێشی جەستە', englishName: 'Bodyweight Squat', sets: legSets, reps: '15-20', rest: restSec + 's', muscle: 'قاچ' },
    { name: 'پلانکی سک', englishName: 'Core Plank Hold', sets: setsSec, reps: '45s', rest: restSec + 's', muscle: 'سک' }
  ] : [
    { name: 'پاڵەپەستۆی سنگ بە دەمبڵ', englishName: 'Flat Dumbbell Press', sets: chestSets, reps: repsMain, rest: restSec + 's', muscle: 'سنگ' },
    { name: 'ڕاکێشانی کێبڵ بۆ پشت', englishName: 'Lat Pulldown', sets: backSets, reps: repsSec, rest: restSec + 's', muscle: 'پشت' },
    { name: hasKnee ? 'قاچ پرێس بە مەودای بێ فشار' : 'سکوات بە دەمبڵ', englishName: hasKnee ? 'Leg Press Safe Range' : 'Goblet Squat', sets: legSets, reps: '12', rest: restSec + 's', muscle: 'قاچ' },
    { name: 'پلانکی سک', englishName: 'Core Plank Hold', sets: setsSec, reps: '45s', rest: restSec + 's', muscle: 'سک' }
  ];

  // Full Body B
  const exFullBodyB = isHome ? [
    { name: 'شناوی پایک (Pike Push-ups)', englishName: 'Pike Push-ups', sets: shoulderSets, reps: repsSec, rest: restSec + 's', muscle: 'شان' },
    { name: 'سوپەرمان (Superman Holds)', englishName: 'Superman Holds', sets: backSets, reps: '15', rest: restSec + 's', muscle: 'پشت' },
    { name: 'هەنگاونان بێ کێش (Lunges)', englishName: 'Bodyweight Lunges', sets: legSets, reps: '12-15', rest: restSec + 's', muscle: 'قاچ' },
    { name: 'پاشەملە لەسەر کورسی (Bench Dips)', englishName: 'Bench Dips', sets: armSets, reps: '12-15', rest: restSec + 's', muscle: 'قۆڵ' }
  ] : [
    { name: 'شان پرێس بە دەمبڵ', englishName: 'Seated Dumbbell Press', sets: shoulderSets, reps: '10', rest: restSec + 's', muscle: 'شان' },
    { name: 'پاروو بە کێبڵ بە دانیشتنەوە', englishName: 'Seated Cable Row', sets: backSets, reps: repsSec, rest: restSec + 's', muscle: 'پشت' },
    { name: 'ڕاکێشانی پشتی قاچ بە دانیشتنەوە', englishName: 'Seated Leg Curl', sets: legSets, reps: '12', rest: restSec + 's', muscle: 'پشتی قاچ' },
    { name: 'قۆڵ بایسێپس کێرڵ', englishName: 'Dumbbell Biceps Curl', sets: armSets, reps: '12', rest: restSec + 's', muscle: 'قۆڵ' }
  ];

  const finalPush = attachCustomFinishers(exPush, 'push', pace !== 'slow');
  const finalPull = attachCustomFinishers(exPull, 'pull', true);
  const finalLegs = attachCustomFinishers(exLegs, 'legs', pace === 'fast' || pace === 'very_fast');
  const finalArms = attachCustomFinishers(exShouldersArms, 'arms', true);
  const finalFullA = attachCustomFinishers(exFullBodyA, 'full', true);
  const finalFullB = attachCustomFinishers(exFullBodyB, 'full', pace !== 'slow');

  let weeklyPlan = [];
  let courseTitle = '';
  let englishSubtitle = '';
  let rationale = '';

  const legsDayTitle = hasKnee ? 'قاچی پارێزراو (Legs Safe Range)' : (wantGlutes ? 'قاچ و سمت (Glutes & Legs Focus)' : 'قاچ و سۆڵە (Legs Power)');

  const enlargeNamesKu = resolveBodyGoalList(enlargeIds, 'ku').join('، ');
  const shrinkNamesKu = resolveBodyGoalList(shrinkIds, 'ku').join('، ');
  const customFocusSummary = [
    `کێش: ${weight}کگ ← ${targetWeight}کگ`,
    enlargeNamesKu ? `گەورەکردنی (${enlargeNamesKu})` : '',
    shrinkNamesKu ? `تواندنەوەی (${shrinkNamesKu})` : '',
    conditions.length > 0 ? `پاراستنی (${conditions.join('، ')})` : ''
  ].filter(Boolean).join(' • ');

  const paceRationale = pace === 'slow'
    ? 'ڕێڕەوی لەسەرخۆ و بەردەوام: پشووی ٩٠ چرکە لە نێوان سێتەکان.'
    : pace === 'normal'
    ? 'ڕێڕەوی هاوسەنگ: پشووی ٦٠ چرکە و چڕیی ستاندارد.'
    : pace === 'fast'
    ? 'ڕێڕەوی خێرا و چالاک: پشووی ٤٥ چرکە و کاردیۆی زیاتر.'
    : 'ڕێڕەوی زۆر خێرا و چڕ: پشووی ٣٥ چرکە بە فرە سێت و کاردیۆی بەردەوام.';

  if (selectedDaysCount === 2) {
    courseTitle = `کۆرسی تایبەت (${selectedDaysCount} ڕۆژە) • ${isBulk ? 'زیادکردنی ماسولکە' : isCut ? 'سوتاندنی چەوری' : 'ڕێکخستنی جەستە'}`;
    englishSubtitle = 'Custom Full Body Split (' + pace.toUpperCase() + ')';
    rationale = `داڕێژراو بەپێی زانیارییەکانت (${customFocusSummary}). ` + paceRationale;
    weeklyPlan = [
      { dayKey: 'd1', dayName: 'شەممە', focus: 'تەواوی جەستە A (Full Body Power)', estimatedCalories: 480 + paceCalBonus, isRestDay: false, exercises: finalFullA },
      { dayKey: 'd2', dayName: 'یەکشەممە', focus: 'پشووی زانستی و چاکبوونەوە', isRestDay: true },
      { dayKey: 'd3', dayName: 'دووشەممە', focus: 'پشووی هایدرەیشن', isRestDay: true },
      { dayKey: 'd4', dayName: 'سێشەممە', focus: 'تەواوی جەستە B (Full Body Hypertrophy)', estimatedCalories: 470 + paceCalBonus, isRestDay: false, exercises: finalFullB },
      { dayKey: 'd5', dayName: 'چوارشەممە', focus: 'پشوو', isRestDay: true },
      { dayKey: 'd6', dayName: 'پێنجشەممە', focus: 'پشوو', isRestDay: true },
      { dayKey: 'd7', dayName: 'هەینی', focus: 'پشوو', isRestDay: true }
    ];
  } else if (selectedDaysCount === 3) {
    courseTitle = `کۆرسی تایبەت (${selectedDaysCount} ڕۆژە) • ${isBulk ? 'زیادکردنی ماسولکە' : isCut ? 'سوتاندنی چەوری' : 'ڕێکخستنی جەستە'}`;
    englishSubtitle = 'Custom 3-Day Split (' + pace.toUpperCase() + ')';
    rationale = `داڕێژراو بەپێی زانیارییەکانت (${customFocusSummary}). ` + paceRationale;
    weeklyPlan = [
      { dayKey: 'd1', dayName: 'شەممە', focus: 'سنگ، شان و ترایسێپس (Push Focus)', estimatedCalories: 450 + paceCalBonus, isRestDay: false, exercises: finalPush },
      { dayKey: 'd2', dayName: 'یەکشەممە', focus: 'پشووی زانستی', isRestDay: true },
      { dayKey: 'd3', dayName: 'دووشەممە', focus: 'پشت، باڵ و کۆر (Pull & Core)', estimatedCalories: 430 + paceCalBonus, isRestDay: false, exercises: finalPull },
      { dayKey: 'd4', dayName: 'سێشەممە', focus: 'پشوو', isRestDay: true },
      { dayKey: 'd5', dayName: 'چوارشەممە', focus: legsDayTitle, estimatedCalories: 460 + paceCalBonus, isRestDay: false, exercises: finalLegs },
      { dayKey: 'd6', dayName: 'پێنجشەممە', focus: 'پشوو', isRestDay: true },
      { dayKey: 'd7', dayName: 'هەینی', focus: 'پشوو', isRestDay: true }
    ];
  } else if (selectedDaysCount === 5) {
    courseTitle = `کۆرسی تایبەت (${selectedDaysCount} ڕۆژە) • ${isBulk ? 'زیادکردنی ماسولکە' : isCut ? 'سوتاندنی چەوری' : 'ڕێکخستنی جەستە'}`;
    englishSubtitle = 'Custom 5-Day Pro Split (' + pace.toUpperCase() + ')';
    rationale = `داڕێژراو بەپێی زانیارییەکانت (${customFocusSummary}). ` + paceRationale;
    weeklyPlan = [
      { dayKey: 'd1', dayName: 'شەممە', focus: 'سنگ و سێ سەر (Push)', estimatedCalories: 440 + paceCalBonus, isRestDay: false, exercises: finalPush },
      { dayKey: 'd2', dayName: 'یەکشەممە', focus: 'پشت و دوو سەر (Pull)', estimatedCalories: 450 + paceCalBonus, isRestDay: false, exercises: finalPull },
      { dayKey: 'd3', dayName: 'دووشەممە', focus: 'پشووی چاکبوونەوە', isRestDay: true },
      { dayKey: 'd4', dayName: 'سێشەممە', focus: legsDayTitle, estimatedCalories: 490 + paceCalBonus, isRestDay: false, exercises: finalLegs },
      { dayKey: 'd5', dayName: 'چوارشەممە', focus: 'شان و باڵ (Shoulders & Arms)', estimatedCalories: 430 + paceCalBonus, isRestDay: false, exercises: finalArms },
      { dayKey: 'd6', dayName: 'پێنجشەممە', focus: isFemale ? 'سمت، قاچ و کەمەر (Lower & Core Sculpt)' : 'تەرکیزی ماسولکە لاوازەکان و سک', estimatedCalories: 440 + paceCalBonus, isRestDay: false, exercises: isFemale ? finalLegs : finalFullB },
      { dayKey: 'd7', dayName: 'هەینی', focus: 'پشووی هەفتانە', isRestDay: true }
    ];
  } else if (selectedDaysCount === 6) {
    courseTitle = `کۆرسی تایبەت (${selectedDaysCount} ڕۆژە) • ${isBulk ? 'زیادکردنی ماسولکە' : isCut ? 'سوتاندنی چەوری' : 'ڕێکخستنی جەستە'}`;
    englishSubtitle = 'Custom PPL x2 Pro (' + pace.toUpperCase() + ')';
    rationale = `داڕێژراو بەپێی زانیارییەکانت (${customFocusSummary}). ` + paceRationale;
    weeklyPlan = [
      { dayKey: 'd1', dayName: 'شەممە', focus: 'ڕۆژی Push A (سنگ و سێ سەر)', estimatedCalories: 440 + paceCalBonus, isRestDay: false, exercises: finalPush },
      { dayKey: 'd2', dayName: 'یەکشەممە', focus: 'ڕۆژی Pull A (پشت و دوو سەر)', estimatedCalories: 450 + paceCalBonus, isRestDay: false, exercises: finalPull },
      { dayKey: 'd3', dayName: 'دووشەممە', focus: 'ڕۆژی Legs A (' + legsDayTitle + ')', estimatedCalories: 480 + paceCalBonus, isRestDay: false, exercises: finalLegs },
      { dayKey: 'd4', dayName: 'سێشەممە', focus: 'ڕۆژی Push B (شان و قۆڵ)', estimatedCalories: 430 + paceCalBonus, isRestDay: false, exercises: finalArms },
      { dayKey: 'd5', dayName: 'چوارشەممە', focus: 'ڕۆژی Pull B (پشت و باڵ)', estimatedCalories: 440 + paceCalBonus, isRestDay: false, exercises: finalPull },
      { dayKey: 'd6', dayName: 'پێنجشەممە', focus: 'ڕۆژی Legs B (' + legsDayTitle + ')', estimatedCalories: 470 + paceCalBonus, isRestDay: false, exercises: finalLegs },
      { dayKey: 'd7', dayName: 'هەینی', focus: 'پشووی هەفتانە', isRestDay: true }
    ];
  } else {
    courseTitle = `کۆرسی تایبەت (٤ ڕۆژە) • ${isBulk ? 'زیادکردنی ماسولکە' : isCut ? 'سوتاندنی چەوری' : 'ڕێکخستنی جەستە'}`;
    englishSubtitle = 'Custom 4-Day Split (' + pace.toUpperCase() + ')';
    rationale = `داڕێژراو بەپێی زانیارییەکانت (${customFocusSummary}). ` + paceRationale;
    weeklyPlan = [
      { dayKey: 'd1', dayName: 'شەممە', focus: 'سنگ و سێ سەر (Push Day)', estimatedCalories: 430 + paceCalBonus, isRestDay: false, exercises: finalPush },
      { dayKey: 'd2', dayName: 'یەکشەممە', focus: 'پشت و دوو سەر (Pull Day)', estimatedCalories: 450 + paceCalBonus, isRestDay: false, exercises: finalPull },
      { dayKey: 'd3', dayName: 'دووشەممە', focus: 'پشووی زانستی و هایدرەیشن', isRestDay: true },
      { dayKey: 'd4', dayName: 'سێشەممە', focus: legsDayTitle, estimatedCalories: 480 + paceCalBonus, isRestDay: false, exercises: finalLegs },
      { dayKey: 'd5', dayName: 'چوارشەممە', focus: 'شان، قۆڵ و کۆر (Shoulders & Arms)', estimatedCalories: 420 + paceCalBonus, isRestDay: false, exercises: finalArms },
      { dayKey: 'd6', dayName: 'پێنجشەممە', focus: 'پشووی زانستی و گەشەی ماسولکە', isRestDay: true },
      { dayKey: 'd7', dayName: 'هەینی', focus: 'پشووی هەفتانە و چاکبوونەوە', isRestDay: true }
    ];
  }

  if (physiqueAnalysis?.laggingMuscles && physiqueAnalysis.laggingMuscles.length > 0) {
    rationale = `ئەم بەرنامەیە بە شیکاری بینینی جەستە (AI Physique Vision) و بە لەبەرچاوگرتنی ماسولکە دواکەوتووەکانت (${physiqueAnalysis.laggingMuscles.join('، ')}) دارێژراوە. ` + rationale;
  }

  return {
    id: 'ai_course_' + selectedDaysCount + 'd_' + Date.now(),
    title: courseTitle,
    englishSubtitle: englishSubtitle,
    goalPace: pace,
    trainingLocation: location,
    homeEquipment: equipment,
    restIntervalSeconds: restSec,
    daysPerWeek: selectedDaysCount,
    durationDays: targetDays || 45,
    rationale: rationale,
    weeklyPlan: weeklyPlan
  };
}

export const MALE_BODY_PARTS = [
  { id: 'm1', ku: 'سنگ', en: 'Chest', ar: 'الصدر', fa: 'سینه' },
  { id: 'm2', ku: 'شان', en: 'Shoulders', ar: 'الأكتاف', fa: 'شانه‌ها' },
  { id: 'm3', ku: 'پشت', en: 'Back', ar: 'الظهر', fa: 'پشت' },
  { id: 'm4', ku: 'باڵ و قۆڵ', en: 'Arms', ar: 'الذراعين', fa: 'بازوها' },
  { id: 'm5', ku: 'ورگ و کەمەر', en: 'Abs & Waist', ar: 'البطن والخصر', fa: 'شکم و پهلو' },
  { id: 'm6', ku: 'ڕان و قاچ', en: 'Legs', ar: 'الأرجل والفخذين', fa: 'پاها و ران‌ها' },
  { id: 'm7', ku: 'پوز', en: 'Calves', ar: 'بطات الساق', fa: 'ساق پا' }
];
export const FEMALE_BODY_PARTS = [
  { id: 'f1', ku: 'سنگ', en: 'Chest', ar: 'الصدر', fa: 'سینه' },
  { id: 'f2', ku: 'کەمەر', en: 'Waist', ar: 'الخصر', fa: 'کمر و پهلو' },
  { id: 'f3', ku: 'ورگ', en: 'Belly', ar: 'البطن', fa: 'شکم' },
  { id: 'f4', ku: 'سمت و حەوز', en: 'Glutes & Hips', ar: 'الأرداف والمؤخرة', fa: 'باسن و ران' },
  { id: 'f5', ku: 'ڕان و قاچ', en: 'Legs', ar: 'الأرجل', fa: 'پاها' },
  { id: 'f6', ku: 'باڵ', en: 'Arms', ar: 'الذراعين', fa: 'بازوها' },
  { id: 'f7', ku: 'پشت', en: 'Back', ar: 'الظهر', fa: 'پشت' }
];

export const DEFAULT_7_DAY_DIET = [
  // ڕۆژی ١: شەممە
  {
    breakfast: [
      { id: 'd0_1', name: 'هێلکەی کوڵاو', englishName: 'Boiled Eggs', calories: 210, protein: 18, carbs: 2, fat: 15, quantity: 3, unit: 'دانە', isEaten: false },
      { id: 'd0_2', name: 'شۆڤان بە شیر و گوێز', englishName: 'Oats with Milk & Walnuts', calories: 320, protein: 14, carbs: 48, fat: 8, quantity: 1, unit: 'قاپ', isEaten: false }
    ],
    lunch: [
      { id: 'd0_3', name: 'سنگی مریشکی برژاو', englishName: 'Grilled Chicken Breast', calories: 330, protein: 58, carbs: 0, fat: 6, quantity: 200, unit: 'گرام', isEaten: false },
      { id: 'd0_4', name: 'برنجی کوردی بە کەم چەوری', englishName: 'Kurdish White Rice', calories: 280, protein: 5, carbs: 62, fat: 2, quantity: 1, unit: 'قاپ', isEaten: false },
      { id: 'd0_5', name: 'زەڵاتەی سەوزی وەرزی', englishName: 'Fresh Green Salad', calories: 45, protein: 2, carbs: 8, fat: 1, quantity: 1, unit: 'قاپ', isEaten: false }
    ],
    snack: [
      { id: 'd0_6', name: 'مۆز و بادەم', englishName: 'Banana & Almonds', calories: 190, protein: 4, carbs: 28, fat: 8, quantity: 1, unit: 'دانە', isEaten: false }
    ],
    dinner: [
      { id: 'd0_7', name: 'ماسی سلمۆن لەگەڵ زەڵاتە', englishName: 'Salmon Fillet & Green Salad', calories: 410, protein: 38, carbs: 8, fat: 22, quantity: 180, unit: 'گرام', isEaten: false }
    ]
  },
  // ڕۆژی ٢: یەکشەممە
  {
    breakfast: [
      { id: 'd1_1', name: 'ئۆملێتی هێلکە و پەنیری لۆفاتی کوردی', englishName: 'Egg Omelet with Low Fat Cheese', calories: 240, protein: 22, carbs: 4, fat: 12, quantity: 1, unit: 'قاپ', isEaten: false },
      { id: 'd1_2', name: 'نانی تیری / هەورامی', englishName: 'Thin Kurdish Flatbread', calories: 190, protein: 6, carbs: 40, fat: 1, quantity: 1, unit: 'نان', isEaten: false }
    ],
    lunch: [
      { id: 'd1_3', name: 'گۆشتی سووری نەرمەی برژاو (بێ چەوری)', englishName: 'Lean Grilled Beef', calories: 360, protein: 46, carbs: 0, fat: 16, quantity: 180, unit: 'گرام', isEaten: false },
      { id: 'd1_4', name: 'پەتاتەی کوڵاو بە زەیتی زەیتوون', englishName: 'Boiled Potato with Olive Oil', calories: 220, protein: 4, carbs: 46, fat: 3, quantity: 1, unit: 'قاپ', isEaten: false }
    ],
    snack: [
      { id: 'd1_5', name: 'سێو لەگەڵ کەرەی فستق', englishName: 'Apple with Peanut Butter', calories: 180, protein: 5, carbs: 22, fat: 9, quantity: 1, unit: 'دانە', isEaten: false }
    ],
    dinner: [
      { id: 'd1_6', name: 'سنگی مریشکی برژاو لەگەڵ سەوزەوات', englishName: 'Grilled Chicken with Steamed Veggies', calories: 340, protein: 48, carbs: 12, fat: 7, quantity: 180, unit: 'گرام', isEaten: false },
      { id: 'd1_7', name: 'ماستی ماڵەوەی کوردی', englishName: 'Homemade Kurdish Yogurt', calories: 95, protein: 7, carbs: 8, fat: 4, quantity: 1, unit: 'قاپ', isEaten: false }
    ]
  },
  // ڕۆژی ٣: دووشەممە
  {
    breakfast: [
      { id: 'd2_1', name: 'هێلکەی تێکدراو بە تەماتە (مەنمەن)', englishName: 'Scrambled Eggs with Tomatoes', calories: 230, protein: 17, carbs: 6, fat: 14, quantity: 3, unit: 'هێلکە', isEaten: false },
      { id: 'd2_2', name: 'نانی جۆ', englishName: 'Barley Bread', calories: 180, protein: 6, carbs: 36, fat: 2, quantity: 1, unit: 'نان', isEaten: false }
    ],
    lunch: [
      { id: 'd2_3', name: 'ماسی قزل ئالا (برژاو لە فڕن)', englishName: 'Baked Trout Fish', calories: 340, protein: 42, carbs: 0, fat: 15, quantity: 200, unit: 'گرام', isEaten: false },
      { id: 'd2_4', name: 'برنجی کوردی بە کەم چەوری', englishName: 'Kurdish White Rice', calories: 280, protein: 5, carbs: 62, fat: 2, quantity: 1, unit: 'قاپ', isEaten: false }
    ],
    snack: [
      { id: 'd2_5', name: 'ماستی یۆنانی بە هەنگوین و گوێز', englishName: 'Greek Yogurt with Honey & Walnuts', calories: 210, protein: 15, carbs: 18, fat: 8, quantity: 1, unit: 'قاپ', isEaten: false }
    ],
    dinner: [
      { id: 'd2_6', name: 'زەڵاتەی دەوڵەمەند بە سنگی مریشک', englishName: 'Chicken Caesar Fitness Salad', calories: 320, protein: 40, carbs: 10, fat: 12, quantity: 1, unit: 'قاپ', isEaten: false }
    ]
  },
  // ڕۆژی ٤: سێشەممە
  {
    breakfast: [
      { id: 'd3_1', name: 'شۆڤان بە مۆز و دارچین', englishName: 'Oatmeal with Banana & Cinnamon', calories: 310, protein: 14, carbs: 54, fat: 6, quantity: 1, unit: 'قاپ', isEaten: false },
      { id: 'd3_2', name: 'هێلکەی کوڵاو', englishName: 'Boiled Eggs', calories: 140, protein: 12, carbs: 1, fat: 10, quantity: 2, unit: 'دانە', isEaten: false }
    ],
    lunch: [
      { id: 'd3_3', name: 'سنگی مریشک بە لیمۆ و بەهارات', englishName: 'Lemon Herb Chicken Breast', calories: 350, protein: 55, carbs: 2, fat: 8, quantity: 220, unit: 'گرام', isEaten: false },
      { id: 'd3_4', name: 'پەتاتەی برژاو لە فڕن', englishName: 'Oven Baked Potato', calories: 210, protein: 4, carbs: 48, fat: 1, quantity: 1, unit: 'قاپ', isEaten: false }
    ],
    snack: [
      { id: 'd3_5', name: 'میوەی فرێش و مشتێک بادەم', englishName: 'Fresh Fruit & Almonds', calories: 175, protein: 4, carbs: 24, fat: 7, quantity: 1, unit: 'قاپ', isEaten: false }
    ],
    dinner: [
      { id: 'd3_6', name: 'گۆشتی قیمەی نەرمە لەگەڵ تەماتە و باینجان', englishName: 'Lean Minced Meat with Eggplant & Tomatoes', calories: 360, protein: 38, carbs: 14, fat: 14, quantity: 1, unit: 'قاپ', isEaten: false }
    ]
  },
  // ڕۆژی ٥: چوارشەممە
  {
    breakfast: [
      { id: 'd4_1', name: 'هێلکەی کوڵاو', englishName: 'Boiled Eggs', calories: 210, protein: 18, carbs: 2, fat: 15, quantity: 3, unit: 'دانە', isEaten: false },
      { id: 'd4_2', name: 'پەنیری سپی کەم خوێ لەگەڵ خەیار و تەماتە', englishName: 'Low Salt White Cheese with Veggies', calories: 160, protein: 12, carbs: 6, fat: 9, quantity: 80, unit: 'گرام', isEaten: false },
      { id: 'd4_3', name: 'نانی تیری', englishName: 'Kurdish Flatbread', calories: 190, protein: 6, carbs: 40, fat: 1, quantity: 1, unit: 'نان', isEaten: false }
    ],
    lunch: [
      { id: 'd4_4', name: 'فەسیلەی مریشک یان قەلی برژاو', englishName: 'Grilled Turkey or Chicken Breast', calories: 330, protein: 56, carbs: 0, fat: 6, quantity: 200, unit: 'گرام', isEaten: false },
      { id: 'd4_5', name: 'برنجی کوردی کەم ڕۆن', englishName: 'Kurdish Rice', calories: 280, protein: 5, carbs: 62, fat: 2, quantity: 1, unit: 'قاپ', isEaten: false }
    ],
    snack: [
      { id: 'd4_6', name: 'سمووسی میوە لەگەڵ شیری کەم چەوری', englishName: 'Fruit Smoothie with Low Fat Milk', calories: 200, protein: 9, carbs: 36, fat: 2, quantity: 1, unit: 'پەرداخ', isEaten: false }
    ],
    dinner: [
      { id: 'd4_7', name: 'ماسی سلمۆن لەگەڵ برۆکلی کوڵاو', englishName: 'Grilled Salmon with Steamed Broccoli', calories: 390, protein: 36, carbs: 8, fat: 20, quantity: 180, unit: 'گرام', isEaten: false }
    ]
  },
  // ڕۆژی ٦: پێنجشەممە
  {
    breakfast: [
      { id: 'd5_1', name: 'ئۆملێت لەگەڵ سپێناخ و قارچک', englishName: 'Spinach & Mushroom Omelet', calories: 250, protein: 20, carbs: 5, fat: 16, quantity: 3, unit: 'هێلکە', isEaten: false },
      { id: 'd5_2', name: 'نانی جۆ', englishName: 'Barley Bread', calories: 180, protein: 6, carbs: 36, fat: 2, quantity: 1, unit: 'نان', isEaten: false }
    ],
    lunch: [
      { id: 'd5_3', name: 'کەبابی گۆشتی سووری نەرمەی فڕن (بێ چەوری)', englishName: 'Lean Oven-Baked Beef Kebab', calories: 370, protein: 44, carbs: 4, fat: 17, quantity: 180, unit: 'گرام', isEaten: false },
      { id: 'd5_4', name: 'برنجی سپی کوردی', englishName: 'White Rice', calories: 280, protein: 5, carbs: 62, fat: 2, quantity: 1, unit: 'قاپ', isEaten: false }
    ],
    snack: [
      { id: 'd5_5', name: 'پرتەقاڵ لەگەڵ بادەم', englishName: 'Orange with Raw Almonds', calories: 160, protein: 4, carbs: 20, fat: 7, quantity: 1, unit: 'دانە', isEaten: false }
    ],
    dinner: [
      { id: 'd5_6', name: 'سنگی مریشکی برژاو لەگەڵ قارچک و لیمۆ', englishName: 'Grilled Chicken with Sautéed Mushrooms', calories: 330, protein: 48, carbs: 6, fat: 8, quantity: 180, unit: 'گرام', isEaten: false }
    ]
  },
  // ڕۆژی ٧: هەینی
  {
    breakfast: [
      { id: 'd6_1', name: 'هێلکەی کوڵاو', englishName: 'Boiled Eggs', calories: 210, protein: 18, carbs: 2, fat: 15, quantity: 3, unit: 'دانە', isEaten: false },
      { id: 'd6_2', name: 'هەنگوینی سروشتی لەگەڵ گوێز', englishName: 'Raw Honey with Kurdish Walnuts', calories: 170, protein: 3, carbs: 24, fat: 8, quantity: 1, unit: 'کەوچک', isEaten: false },
      { id: 'd6_3', name: 'نانی هەورامی', englishName: 'Traditional Flatbread', calories: 190, protein: 6, carbs: 40, fat: 1, quantity: 1, unit: 'نان', isEaten: false }
    ],
    lunch: [
      { id: 'd6_4', name: 'مریشکی برژاوی کوردی (بێ پێست)', englishName: 'Roasted Kurdish Chicken (Skinless)', calories: 360, protein: 54, carbs: 0, fat: 10, quantity: 220, unit: 'گرام', isEaten: false },
      { id: 'd6_5', name: 'برنج لەگەڵ شلەی نۆک / سەوزەوات', englishName: 'Rice with Chickpea Stew', calories: 310, protein: 9, carbs: 64, fat: 3, quantity: 1, unit: 'قاپ', isEaten: false }
    ],
    snack: [
      { id: 'd6_6', name: 'شلیک یان میوەی وەرزی لەگەڵ چای سەوز', englishName: 'Fresh Strawberries with Green Tea', calories: 110, protein: 2, carbs: 24, fat: 0.5, quantity: 1, unit: 'قاپ', isEaten: false }
    ],
    dinner: [
      { id: 'd6_7', name: 'ماسی تۆنەی بێ ڕۆن لەگەڵ زەڵاتە و لیمۆ', englishName: 'Tuna Salad with Lemon & Greens', calories: 310, protein: 42, carbs: 8, fat: 6, quantity: 1, unit: 'قاپ', isEaten: false }
    ]
  }
];

// ==================== خشتە و فەرهەنگەکانی فرەزمانی بۆ ناوی ڕۆژەکان، خواردن و ڕاهێنان ====================
export const DAY_NAMES = {
  ku: ['شەممە', 'یەکشەممە', 'دووشەممە', 'سێشەممە', 'چوارشەممە', 'پێنجشەممە', 'هەینی'],
  en: ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
  ar: ['السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'],
  fa: ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه']
};

export const DAY_SHORT_NAMES = {
  ku: ['شەم', 'یەک', 'دوو', 'سێش', 'چوا', 'پێن', 'هەی'],
  en: ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
  ar: ['سبت', 'أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة'],
  fa: ['شنبه', 'یک', 'دو', 'سه', 'چهار', 'پنج', 'جمعه']
};

export const COMMON_DIET_FOODS = [
  // Proteins & Meats
  { en: 'grilled chicken breast', ku: 'سنگی مریشکی برژاو', ar: 'صدر دجاج مشوي', fa: 'سینه مرغ کبابی' },
  { en: 'chicken breast', ku: 'سنگی مریشک', ar: 'صدر دجاج', fa: 'سینه مرغ' },
  { en: 'chicken thighs', ku: 'ڕانی مریشک', ar: 'أفخاذ دجاج', fa: 'ران مرغ' },
  { en: 'chicken', ku: 'مریشک', ar: 'دجاج', fa: 'مرغ' },
  { en: 'boiled eggs', ku: 'هێلکەی کوڵاو', ar: 'بيض مسلوق', fa: 'تخم‌مرغ آب‌پز' },
  { en: 'boiled egg', ku: 'هێلکەی کوڵاو', ar: 'بيضة مسلوقة', fa: 'تخم‌مرغ آب‌پز' },
  { en: 'scrambled eggs', ku: 'هێلکەی تێکدراو (مەقلی)', ar: 'بيض مخفوق', fa: 'تخم‌مرغ نیمرو' },
  { en: 'egg whites', ku: 'سپێنەی هێلکە', ar: 'بياض البيض', fa: 'سفیده تخم‌مرغ' },
  { en: 'egg white', ku: 'سپێنەی هێلکە', ar: 'بياض البيض', fa: 'سفیده تخم‌مرغ' },
  { en: 'eggs', ku: 'هێلکە', ar: 'بيض', fa: 'تخم‌مرغ' },
  { en: 'egg', ku: 'هێلکە', ar: 'بيضة', fa: 'تخم‌مرغ' },
  { en: 'omelet', ku: 'ئۆملێت', ar: 'أومليت بيض', fa: 'املت' },
  { en: 'omelette', ku: 'ئۆملێت', ar: 'أومليت بيض', fa: 'املت' },
  { en: 'canned tuna', ku: 'تۆنەی قوتوو بە ئاو', ar: 'تونة معلبة بالماء', fa: 'کنسرو تن ماهی' },
  { en: 'tuna salad', ku: 'زەڵاتەی تونا', ar: 'سلطة تونة', fa: 'سالاد تن ماهی' },
  { en: 'tuna', ku: 'ماسی تونا', ar: 'سمك تونة', fa: 'ماهی تن' },
  { en: 'grilled salmon', ku: 'ماسی سەلمۆنی برژاو', ar: 'سلمون مشوي', fa: 'ماهی سالمون کبابی' },
  { en: 'salmon', ku: 'ماسی سەلمۆن', ar: 'سمك سلمون', fa: 'ماهی سالمون' },
  { en: 'fish', ku: 'ماسی', ar: 'سمك', fa: 'ماهی' },
  { en: 'ground beef', ku: 'گۆشتی قیمەی مانگا', ar: 'لحم مفروم قليل الدهن', fa: 'گوشت چرخ‌کرده' },
  { en: 'lean beef', ku: 'گۆشتی سووری مانگا', ar: 'لحم بقري خالي من الدهن', fa: 'گوشت لخم گاو' },
  { en: 'beef steak', ku: 'ستەیکی گۆشت', ar: 'ستيك بقري', fa: 'استیک گوشت' },
  { en: 'steak', ku: 'ستەیک', ar: 'ستيك', fa: 'استیک' },
  { en: 'beef', ku: 'گۆشتی سوور', ar: 'لحم بقري', fa: 'گوشت گاو' },
  { en: 'turkey breast', ku: 'سنگی قەلی برژاو', ar: 'صدر رومي مشوي', fa: 'سینه بوقلمون' },
  { en: 'turkey', ku: 'گۆشتی قەل', ar: 'لحم رومي', fa: 'گوشت بوقلمون' },
  { en: 'whey protein', ku: 'وەی پڕۆتین', ar: 'واي بروتين', fa: 'پروتئین وی' },
  { en: 'protein powder', ku: 'پڕۆتین باودەر', ar: 'بودرة بروتين', fa: 'پودر پروتئین' },
  { en: 'protein shake', ku: 'پڕۆتین شێک', ar: 'مخفوق البروتين', fa: 'شیک پروتئین' },
  { en: 'protein bar', ku: 'پڕۆتین باڕ', ar: 'لوح بروتين', fa: 'پروتئین بار' },
  { en: 'greek yogurt', ku: 'ماستی یۆنانی کەم چەوری', ar: 'زبادي يوناني قليل الدسم', fa: 'ماست یونانی کم‌چرب' },
  { en: 'cottage cheese', ku: 'پەنیری کەم چەوری', ar: 'جبن قريش قليل الدسم', fa: 'پنیر کوتاژ کم‌چرب' },
  { en: 'cheese', ku: 'پەنیر', ar: 'جبن', fa: 'پنیر' },
  { en: 'yogurt', ku: 'ماست', ar: 'زبادي', fa: 'ماست' },
  { en: 'milk', ku: 'شیر', ar: 'حليب', fa: 'شیر' },
  { en: 'skim milk', ku: 'شیری بێ چەوری', ar: 'حليب خالي الدسم', fa: 'شیر بدون چربی' },
  { en: 'almond milk', ku: 'شیری بادەم', ar: 'حليب اللوز', fa: 'شیر بادام' },

  // Carbs & Grains
  { en: 'cooked oatmeal', ku: 'شۆڤانی کوڵاو', ar: 'شوفان مطبوخ', fa: 'جو دوسر پخته' },
  { en: 'oatmeal with honey', ku: 'شۆڤان لەگەڵ هەنگوین', ar: 'شوفان بالعسل', fa: 'جو دوسر با عسل' },
  { en: 'oatmeal with berries', ku: 'شۆڤان لەگەڵ میوە', ar: 'شوفان بالتوت', fa: 'جو دوسر با توت' },
  { en: 'oatmeal', ku: 'شۆڤانی کوڵاو', ar: 'شوفان', fa: 'جو دوسر' },
  { en: 'oats', ku: 'شۆڤان', ar: 'شوفان', fa: 'جو دوسر' },
  { en: 'white rice', ku: 'برنجی سپی', ar: 'أرز أبيض', fa: 'برنج سفید' },
  { en: 'brown rice', ku: 'برنجی قاوەیی', ar: 'أرز بني', fa: 'برنج قهوه‌ای' },
  { en: 'basmati rice', ku: 'برنجی بەسمەتی', ar: 'أرز بسمتي', fa: 'برنج باسماتی' },
  { en: 'rice', ku: 'برنج', ar: 'أرز', fa: 'برنج' },
  { en: 'boiled potato', ku: 'پەتاتەی کوڵاو', ar: 'بطاطا مسلوقة', fa: 'سیب‌زمینی آب‌پز' },
  { en: 'baked potato', ku: 'پەتاتەی برژاو', ar: 'بطاطا مشوية', fa: 'سیب‌زمینی تنوری' },
  { en: 'sweet potato', ku: 'پەتاتەی شیرین', ar: 'بطاطا حلوة', fa: 'سیب‌زمینی شیرین' },
  { en: 'potato', ku: 'پەتاتە', ar: 'بطاطا', fa: 'سیب‌زمینی' },
  { en: 'potatoes', ku: 'پەتاتە', ar: 'بطاطا', fa: 'سیب‌زمینی' },
  { en: 'whole wheat bread', ku: 'نانی گەنمی تەواو', ar: 'خبز قمح كامل', fa: 'نان سبوس‌دار' },
  { en: 'whole grain bread', ku: 'نانی گەنم', ar: 'خبز حبوب كاملة', fa: 'نان غلات کامل' },
  { en: 'whole wheat toast', ku: 'تۆستی گەنم', ar: 'توست أسمر', fa: 'نان تست قهوه‌ای' },
  { en: 'toast', ku: 'نانی تۆست', ar: 'خبز توست', fa: 'نان تست' },
  { en: 'pita bread', ku: 'نانی عەرەبی', ar: 'خبز بيتا عربي', fa: 'نان پیتا' },
  { en: 'bread', ku: 'نان', ar: 'خبز', fa: 'نان' },
  { en: 'whole wheat pasta', ku: 'مەعکەرۆنیی گەنم', ar: 'معكرونة قمح كامل', fa: 'ماکارونی سبوس‌دار' },
  { en: 'pasta', ku: 'مەعکەرۆنی', ar: 'معكرونة', fa: 'ماکارونی' },
  { en: 'quinoa', ku: 'کینوا', ar: 'كينوا', fa: 'کینوا' },
  { en: 'bulgur', ku: 'ساوار / ساوەر', ar: 'برغل', fa: 'بلغور' },
  { en: 'lentils', ku: 'نیسک', ar: 'عدس', fa: 'عدس' },
  { en: 'lentil soup', ku: 'شۆربای نیسک (نیسکێنە)', ar: 'شوربة عدس', fa: 'سوپ عدس' },
  { en: 'chickpeas', ku: 'نۆک', ar: 'حمص حب', fa: 'نخود' },
  { en: 'hummus', ku: 'حومس بە تەحین', ar: 'حمص بطحينة', fa: 'حمص' },
  { en: 'black beans', ku: 'فاسۆلیای ڕەش', ar: 'فاصولياء سوداء', fa: 'لوبیا سیاه' },
  { en: 'beans', ku: 'فاسۆلیا', ar: 'فاصولياء', fa: 'لوبیا' },

  // Vegetables & Salads
  { en: 'mixed salad', ku: 'زەڵاتەی سەوزەی تێکەڵ', ar: 'سلطة خضراء مشكلة', fa: 'سالاد فصل مخلوط' },
  { en: 'green salad', ku: 'زەڵاتەی سەوزە', ar: 'سلطة خضراء', fa: 'سالاد سبز' },
  { en: 'salad', ku: 'زەڵاتە', ar: 'سلطة', fa: 'سالاد' },
  { en: 'steamed vegetables', ku: 'سەوزەی هەڵمکراو', ar: 'خضار مطبوخة على البخار', fa: 'سبزیجات بخارپز' },
  { en: 'steamed broccoli', ku: 'برۆکلیی هەڵمکراو', ar: 'بروكلي على البخار', fa: 'بروکلی بخارپز' },
  { en: 'broccoli', ku: 'برۆکلی', ar: 'بروكلي', fa: 'بروکلی' },
  { en: 'spinach', ku: 'سپێناخ', ar: 'سبانخ', fa: 'اسفناج' },
  { en: 'cucumber', ku: 'خەیار', ar: 'خيار', fa: 'خیار' },
  { en: 'tomato', ku: 'تەماتە', ar: 'طماطم', fa: 'گوجه‌فرنگی' },
  { en: 'tomatoes', ku: 'تەماتە', ar: 'طماطم', fa: 'گوجه‌فرنگی' },
  { en: 'lettuce', ku: 'خاس', ar: 'خس', fa: 'کاهو' },
  { en: 'carrots', ku: 'گێزەر', ar: 'جزر', fa: 'هویج' },
  { en: 'carrot', ku: 'گێزەر', ar: 'جزر', fa: 'هویج' },
  { en: 'bell pepper', ku: 'بیبەری شیرین', ar: 'فلفل رومي حلو', fa: 'فلفل دلمه‌ای' },
  { en: 'peppers', ku: 'بیبەر', ar: 'فلفل', fa: 'فلفل' },
  { en: 'mushrooms', ku: 'قارچک', ar: 'فطر / مشروم', fa: 'قارچ' },
  { en: 'asparagus', ku: 'ئەسپاراگۆس', ar: 'هليون', fa: 'مارچوبه' },
  { en: 'green beans', ku: 'فاسۆلیای سەوز', ar: 'فاصولياء خضراء', fa: 'لوبیا سبز' },

  // Fruits
  { en: 'banana', ku: 'مۆز', ar: 'موز', fa: 'موز' },
  { en: 'apple', ku: 'سێو', ar: 'تفاح', fa: 'سیب' },
  { en: 'orange', ku: 'پرتەقاڵ', ar: 'برتقال', fa: 'پرتقال' },
  { en: 'strawberries', ku: 'شلک', ar: 'فراولة', fa: 'توت‌فرنگی' },
  { en: 'blueberries', ku: 'تووی شین (بلوبێری)', ar: 'توت أزرق', fa: 'بلوبری' },
  { en: 'berries', ku: 'توو و شلک', ar: 'توت مشكل', fa: 'انواع توت' },
  { en: 'dates', ku: 'خورما', ar: 'تمر', fa: 'خرما' },
  { en: 'watermelon', ku: 'شووتی', ar: 'بطيخ أحمر', fa: 'هندوانه' },
  { en: 'grapes', ku: 'ترێ', ar: 'عنب', fa: 'انگور' },
  { en: 'pineapple', ku: 'ئاناناس', ar: 'أناناس', fa: 'آناناس' },
  { en: 'grapefruit', ku: 'گرەیپفرووت', ar: 'جريب فروت', fa: 'گریپ‌فروت' },
  { en: 'kiwi', ku: 'کیوی', ar: 'كيوي', fa: 'کیوی' },

  // Fats & Nuts
  { en: 'almonds', ku: 'بادەم', ar: 'لوز نيء', fa: 'بادام خام' },
  { en: 'walnuts', ku: 'گوێز', ar: 'جوز نيء', fa: 'گردو خام' },
  { en: 'cashews', ku: 'کاشیو (گازۆ)', ar: 'كاجو', fa: 'بادام هندی' },
  { en: 'peanuts', ku: 'فستقی عەبید', ar: 'فول سوداني', fa: 'بادام زمینی' },
  { en: 'peanut butter', ku: 'کەرەی فستق', ar: 'زبدة الفول السوداني', fa: 'کره بادام زمینی' },
  { en: 'almond butter', ku: 'کەرەی بادەم', ar: 'زبدة اللوز', fa: 'کره بادام' },
  { en: 'olive oil', ku: 'زەیتی زەیتوون', ar: 'زيت زيتون بكر', fa: 'روغن زیتون فرابکر' },
  { en: 'extra virgin olive oil', ku: 'زەیتی زەیتوونی ئەسڵی', ar: 'زيت زيتون بكر ممتاز', fa: 'روغن زیتون طبیعی' },
  { en: 'avocado', ku: 'ئەڤۆکادۆ', ar: 'أفوكادو', fa: 'آووکادو' },
  { en: 'chia seeds', ku: 'تۆوی چیا', ar: 'بذور الشيا', fa: 'دانه چیا' },
  { en: 'flax seeds', ku: 'تۆوی کەتان', ar: 'بذور الكتان', fa: 'تخم کتان' },
  { en: 'pumpkin seeds', ku: 'تۆوی کولەکە', ar: 'بذور القرع', fa: 'تخم کدو' },
  { en: 'coconut oil', ku: 'ڕۆنی گوێزی هیند', ar: 'زيت جوز الهند', fa: 'روغن نارگیل' },

  // Others & Drinks
  { en: 'honey', ku: 'هەنگوین', ar: 'عسل نحل طبيعي', fa: 'عسل طبیعی' },
  { en: 'green tea', ku: 'چای سەوز', ar: 'شاي أخضر', fa: 'چای سبز' },
  { en: 'black coffee', ku: 'قاوەی ڕەشی بێ شەکر', ar: 'قهوة سوداء سادة', fa: 'قهوه سیاه تلخ' },
  { en: 'coffee', ku: 'قاوە', ar: 'قهوة', fa: 'قهوه' },
  { en: 'tea', ku: 'چا', ar: 'شاي', fa: 'چای' },
  { en: 'water', ku: 'ئاو', ar: 'ماء', fa: 'آب' }
];

// ==================== کەتەلۆگی تەواوی سەپلیمێنت، پڕۆتین، تاقە، ڤیتامین، دەرمان و هۆرمۆن ====================
export const MASTER_SUPPLEMENTS_CATALOG = [
  // ١. پرۆتین و گەینەر (Proteins & Gainers)
  { id: 'supp_whey', category: 'proteins', name: 'وەی پڕۆتین (Whey Protein)', en: 'Whey Protein', icon: '🥤', desc: 'پڕۆتینی خێرا هەرس بۆ گەشە و چاکبوونەوەی ماسولکە' },
  { id: 'supp_iso', category: 'proteins', name: 'وەی ئایزۆلەیت (Whey Isolate)', en: 'Whey Isolate', icon: '⚡', desc: 'پڕۆتینی خاوێن بێ چەوری و شەکر بۆ وشککردنەوە' },
  { id: 'supp_casein', category: 'proteins', name: 'پڕۆتینی کەزین (Casein Protein)', en: 'Casein Protein', icon: '🌙', desc: 'پڕۆتینی خاو هەرس بۆ کاتی خەو و پاراستنی ماسولکە' },
  { id: 'supp_mass', category: 'proteins', name: 'ماس گەینەر (Mass Gainer)', en: 'Mass Gainer', icon: '💪', desc: 'بەرزکردنەوەی کالۆری و کێش و قەبارەی ماسولکە' },
  { id: 'supp_hydro', category: 'proteins', name: 'هایدرۆ وەی (Hydro Whey)', en: 'Hydrolyzed Whey', icon: '🔬', desc: 'خێراترین جۆری پڕۆتین بۆ هەڵمژینی دەستبەجێ' },
  { id: 'supp_beef_pro', category: 'proteins', name: 'پڕۆتینی گۆشتی مانگا (Beef Protein)', en: 'Beef Protein Isolate', icon: '🥩', desc: 'پڕۆتینی بێ لاکتۆز و دەوڵەمەند بە ترشە ئەمینیەکان' },
  { id: 'supp_vegan_pro', category: 'proteins', name: 'پڕۆتینی ڕووەکی (Plant Protein)', en: 'Plant Protein', icon: '🌱', desc: 'پڕۆتینی سروشتی لە نۆک و برنج بۆ هەرسی ئاسان' },
  { id: 'supp_protein_bar', category: 'proteins', name: 'پڕۆتین بار (Protein Bar)', en: 'Protein Bar', icon: '🍫', desc: 'ژەمە سووکی دەوڵەمەند بە پڕۆتین' },

  // ٢. کریاتین و ئەمینۆ و چاکبوونەوە (Creatine, Amino & Recovery)
  { id: 'supp_creatine_mono', category: 'amino', name: 'کریاتین مۆنۆهایدرەیت (Creatine Monohydrate)', en: 'Creatine Monohydrate', icon: '🔋', desc: 'زیادکردنی هێز و قەبارە و وزەی ATP لە ماسولکەدا' },
  { id: 'supp_creatine_hcl', category: 'amino', name: 'کریاتین HCl (Creatine HCl)', en: 'Creatine HCl', icon: '🧪', desc: 'کریاتینی چڕ بەبێ گلدانەوەی ئاوی ژێر پێست' },
  { id: 'supp_bcaa', category: 'amino', name: 'بی سی ئەی ئەی (BCAA)', en: 'BCAA', icon: '🧬', desc: 'کەمکردنەوەی هیلاکی و پاراستنی ماسولکە لە کاتی مەشق' },
  { id: 'supp_eaa', category: 'amino', name: 'ئی ئەی ئەی (EAA - ترشە ئەمینیەکان)', en: 'EAA Essential Amino Acids', icon: '💧', desc: 'تەواوی ٩ ترشە ئەمینیە بنەڕەتییەکان بۆ دروستکردنی ماسولکە' },
  { id: 'supp_glutamine', category: 'amino', name: 'گلوتامین (L-Glutamine)', en: 'L-Glutamine', icon: '🛡️', desc: 'خێراکردنی چاکبوونەوە و کەمکردنەوەی ئازاری ماسولکە' },
  { id: 'supp_hmb', category: 'amino', name: 'ئێچ ئێم بی (HMB)', en: 'HMB', icon: '🧱', desc: 'ڕێگری لە سووتانی ماسولکە لە کاتی ڕێجیمی توند' },
  { id: 'supp_collagen', category: 'amino', name: 'کۆلاجین (Collagen Peptides)', en: 'Collagen Peptides', icon: '🦴', desc: 'بەهێزکردنی جومگەکان و بەستەرەکان و پێست' },
  { id: 'supp_dextrose', category: 'amino', name: 'کاربۆهایدراتی پاش مەشق (Vitargo / Dextrose)', en: 'Post-Workout Carbs (Vitargo)', icon: '⚡', desc: 'پڕکردنەوەی خێرای گلایکۆجینی ماسولکە' },

  // ٣. تاقە و پێش ڕاهێنان (Pre-Workout & Energy / Pump)
  { id: 'supp_preworkout', category: 'energy', name: 'پری-وۆرکاوت / تاقە (Pre-Workout)', en: 'Pre-Workout', icon: '🔥', desc: 'زیادکردنی تاقە و تەرکیز و پەمپی ماسولکە پێش ڕاهێنان' },
  { id: 'supp_citrulline', category: 'energy', name: 'سیترۆلین مالەیت (L-Citrulline Malate)', en: 'Citrulline Malate', icon: '🩸', desc: 'فراوانکردنی دەمارەکان و پەمپی بەهێزی خوێن بۆ ماسولکە' },
  { id: 'supp_beta_alanine', category: 'energy', name: 'بێتا ئەلانین (Beta-Alanine)', en: 'Beta-Alanine', icon: '⚡', desc: 'زیادکردنی بەرگەگرتن و دواخستنی سووتانەوەی ماسولکە' },
  { id: 'supp_arginine', category: 'energy', name: 'ئارجینین (L-Arginine / AAKG)', en: 'L-Arginine', icon: '💥', desc: 'زیادکردنی نایتریک ئۆکساید و دەرکەوتنی دەمارەکان' },
  { id: 'supp_caffeine', category: 'energy', name: 'حەبی کافایین (Caffeine Pills 200mg)', en: 'Caffeine Pills', icon: '☕', desc: 'وریایی مێشک و وزەی خێرا بۆ مەشقی قورس' },
  { id: 'supp_electrolytes', category: 'energy', name: 'ئەلیکترۆلایت و خوێی کانزایی (Electrolytes)', en: 'Electrolytes', icon: '💦', desc: 'ڕێگری لە گرژبوونی ماسولکە و پاراستنی هایدرەیشن' },
  { id: 'supp_taurine', category: 'energy', name: 'تۆرین (Taurine)', en: 'Taurine', icon: '🐂', desc: 'باشترکردنی گرژبوونی ماسولکە و تەرکیزی دەمارەکان' },

  // ٤. ڤیتامین و کانزاکان (Vitamins & Minerals)
  { id: 'supp_multivitamin', category: 'vitamins', name: 'مەڵتی ڤیتامین (Multivitamin)', en: 'Multivitamin', icon: '💊', desc: 'تەواوکەری گشتی ڤیتامین و کانزاکانی جەستە' },
  { id: 'supp_omega3', category: 'vitamins', name: 'ئۆمێگا ٣ / زەیتی ماسی (Omega-3 Fish Oil)', en: 'Omega-3 Fish Oil', icon: '🐟', desc: 'تەندروستی دڵ و کەمکردنەوەی هەوکردنی جومگەکان' },
  { id: 'supp_vit_d3', category: 'vitamins', name: 'ڤیتامین D3 + K2 (Vitamin D3)', en: 'Vitamin D3 + K2', icon: '☀️', desc: 'بەهێزکردنی ئێسک و بەرگری و هۆرمۆنی سروشتی' },
  { id: 'supp_zinc', category: 'vitamins', name: 'زینک (Zinc)', en: 'Zinc', icon: '🛡️', desc: 'پشتگیری هۆرمۆنی تێستۆستیرۆن و کۆئەندامی بەرگری' },
  { id: 'supp_magnesium', category: 'vitamins', name: 'مەگنیسیۆم (Magnesium Glycinate)', en: 'Magnesium', icon: '💤', desc: 'خاوکردنەوەی ماسولکە و باشترکردنی خەوی شەوانە' },
  { id: 'supp_zma', category: 'vitamins', name: 'زێد ئێم ئەی (ZMA)', en: 'ZMA (Zinc, Magnesium, B6)', icon: '🌙', desc: 'چاکبوونەوەی شەوانە و ڕێکخستنی هۆرمۆن' },
  { id: 'supp_vit_c', category: 'vitamins', name: 'ڤیتامین C (Vitamin C 1000mg)', en: 'Vitamin C', icon: '🍊', desc: 'دژە ئۆکسان و کەمکردنەوەی کۆرتیزۆڵ پاش ڕاهێنان' },
  { id: 'supp_vit_b', category: 'vitamins', name: 'ڤیتامین بی کۆمپلێکس (Vitamin B-Complex)', en: 'Vitamin B-Complex', icon: '⚡', desc: 'گۆڕینی خۆراک بۆ وزە و بەهێزکردنی دەمارەکان' },
  { id: 'supp_iron', category: 'vitamins', name: 'ئاسن (Iron Supplement)', en: 'Iron', icon: '🩸', desc: 'گواستنەوەی ئۆکسجین لە خوێندا و نەهێشتنی بێهێزی' },
  { id: 'supp_joint', category: 'vitamins', name: 'پارێزەری جومگە (Glucosamine & MSM)', en: 'Joint Support (Glucosamine)', icon: '🦵', desc: 'پاراستن و نەرمکردنی جومگەکان لە ژێر کێشی قورس' },

  // ٥. چەوری سووتێنەر و دەرمان و گیایی (Fat Burners, Adaptogens & Medications)
  { id: 'supp_carnitine', category: 'medications', name: 'ئێڵ-کارنیتین (L-Carnitine)', en: 'L-Carnitine', icon: '🔥', desc: 'گواستنەوەی ترشە چەورییەکان بۆ سووتاندن وەک وزە' },
  { id: 'supp_cla', category: 'medications', name: 'سی ئێڵ ئەی (CLA)', en: 'CLA', icon: '🌿', desc: 'یارمەتیدانی کەمکردنەوەی چەوری کەمەر و ورگ' },
  { id: 'supp_thermo', category: 'medications', name: 'چەوری سووتێنەر (Thermogenic Fat Burner / Lipo-6)', en: 'Thermogenic Fat Burner', icon: '🌶️', desc: 'بەرزکردنەوەی پلەی گەرمی و خێرایی میتابۆلیزم' },
  { id: 'supp_ashwagandha', category: 'medications', name: 'ئەشواگاندا (Ashwagandha)', en: 'Ashwagandha', icon: '🌱', desc: 'کەمکردنەوەی سترێس و کۆرتیزۆڵ و زیادکردنی هێز' },
  { id: 'supp_tribulus', category: 'medications', name: 'تریبیولەس / تێست بوستەر (Tribulus / Test Booster)', en: 'Tribulus Terrestris', icon: '🦁', desc: 'هانده‌ری سروشتی هۆرمۆنی نێرینە و چالاکی' },
  { id: 'supp_yohimbine', category: 'medications', name: 'یۆهیمبین (Yohimbine HCl)', en: 'Yohimbine HCl', icon: '💊', desc: 'تایبەت بە تواندنەوەی چەورییە سەرسەختەکان' },
  { id: 'supp_clen', category: 'medications', name: 'کلینبوتیرۆڵ (Clenbuterol)', en: 'Clenbuterol', icon: '⚠️', desc: 'سووتێنەری بەهێزی چەوری و پارێزەری ماسولکە' },
  { id: 'supp_t3', category: 'medications', name: 'تی ٣ / غودە (T3 Liothyronine)', en: 'T3 Liothyronine', icon: '🔬', desc: 'خێراکردنی بەرزی زیندەچالاکی لە کاتی وشککردنەوە' },
  { id: 'supp_metformin', category: 'medications', name: 'مێتفۆرمین / ڕێکخەری شەکرە (Metformin / Berberine)', en: 'Metformin / Berberine', icon: '🩺', desc: 'باشترکردنی هەستیاری ئینسۆلین و سوودوەرگرتن لە کاربۆهایدرات' },
  { id: 'supp_liver_support', category: 'medications', name: 'پارێزەری جگەر و گورچیلە (TUDCA / NAC / Milk Thistle)', en: 'Liver & Kidney Support (TUDCA / NAC)', icon: '🛡️', desc: 'پاککردنەوە و پاراستنی ئەندامەکانی ناوەوە' },

  // ٦. هۆرمۆن و سارمس و پێپتاید (Hormones, SARMs & Peptides)
  { id: 'supp_test', category: 'hormones', name: 'تێستۆستیرۆن (Testosterone Enanthate / Cypionate / Prop)', en: 'Testosterone', icon: '💉', desc: 'بنەمای زیادکردنی قەبارەی ماسولکە و هێز و چاکبوونەوەی خێرا' },
  { id: 'supp_sustanon', category: 'hormones', name: 'سۆستانۆن (Sustanon 250)', en: 'Sustanon 250', icon: '💉', desc: 'تێکەڵەی ٤ جۆر تێستۆستیرۆن بۆ گەشەی بەردەوام' },
  { id: 'supp_deca', category: 'hormones', name: 'دیکا دورابۆلین / نادرۆلۆن (Deca / NPP)', en: 'Nandrolone (Deca / NPP)', icon: '💪', desc: 'زیادکردنی قەبارەی ماسولکە و نەرمکردنی جومگەکان' },
  { id: 'supp_primobolan', category: 'hormones', name: 'پریمۆبۆلان (Primobolan)', en: 'Primobolan', icon: '👑', desc: 'گەشەی ماسولکەی زۆر خاوێن بە کەمترین زیانی لاوەکی' },
  { id: 'supp_masteron', category: 'hormones', name: 'ماستیرۆن (Masteron)', en: 'Masteron', icon: '💎', desc: 'ڕەقبوونی ماسولکە و وشککردنەوەی پێش پاڵەوانێتی' },
  { id: 'supp_boldenone', category: 'hormones', name: 'بۆڵدینۆن (Boldenone / Equipoise)', en: 'Boldenone', icon: '🐎', desc: 'زیادکردنی ئیشتیها و خڕۆکە سوورەکان و بەرگەگرتن' },
  { id: 'supp_tren', category: 'hormones', name: 'ترینبۆلۆن (Trenbolone Acetate / Enanthate)', en: 'Trenbolone', icon: '🔥', desc: 'بەهێزترین هۆرمۆن بۆ گۆڕینی خۆراک بۆ ماسولکە و سووتاندنی چەوری' },
  { id: 'supp_anavar', category: 'hormones', name: 'ئەناڤار (Anavar / Oxandrolone)', en: 'Anavar (Oxandrolone)', icon: '💊', desc: 'زیادکردنی هێز و ماسولکەی ساف بەبێ ئاو گلدانەوە' },
  { id: 'supp_dianabol', category: 'hormones', name: 'دایانابۆڵ (Dianabol)', en: 'Dianabol', icon: '💥', desc: 'زیادکردنی خێرای کێش و قەبارە و هێزی تەقینەوەیی' },
  { id: 'supp_winstrol', category: 'hormones', name: 'وینسترۆڵ (Winstrol / Stanozolol)', en: 'Winstrol', icon: '⚡', desc: 'وشککردنەوەی ئاوی ژێر پێست و دەرخستنی وردەکاری ماسولکە' },
  { id: 'supp_anadrol', category: 'hormones', name: 'ئانادرۆڵ (Anadrol / Oxymetholone)', en: 'Anadrol', icon: '🦍', desc: 'بەرزترین قەبارە و پڕبوونی ماسولکە لە کۆرسی قەبارەدا' },
  { id: 'supp_hgh', category: 'hormones', name: 'هۆرمۆنی گەشە / جی ئێچ (HGH Somatropin)', en: 'HGH Growth Hormone', icon: '🧬', desc: 'نوێکردنەوەی خانەکان و سووتاندنی چەوری و گەشەی ڕیشاڵەکان' },
  { id: 'supp_mk677', category: 'hormones', name: 'ئێم کەی ٦٧٧ (MK-677 Ibutamoren)', en: 'MK-677 Ibutamoren', icon: '🌙', desc: 'زیادکردنی هۆرمۆنی گەشە و ئیشتیها و قووڵکردنی خەو' },
  { id: 'supp_rad140', category: 'hormones', name: 'ڕاد ١٤٠ / لیگاندرۆڵ (SARMs: RAD-140 / LGD-4033)', en: 'SARMs (RAD-140 / LGD-4033)', icon: '🧪', desc: 'سارمس بۆ بەئامانجگرتنی وەرگرەکانی ماسولکە و ئێسک' },
  { id: 'supp_bpc157', category: 'hormones', name: 'پێپتایدی چاکبوونەوە (BPC-157 / TB-500)', en: 'Peptides (BPC-157 / TB-500)', icon: '🩹', desc: 'چارەسەری خێرای پێکان و هەوکردنی ژێ و جومگەکان' }
];

// ==================== کەتەلۆگی ڕاهێنانە جێگرەوەکان بەپێی ماسولکە (Alternative Exercises Catalog) ====================
export const ALTERNATIVE_EXERCISES_CATALOG = [
  // سنگ (Chest)
  { name: 'بێنج پرێس بە باربێڵ (Barbell Bench Press)', englishName: 'Barbell Bench Press', muscle: 'سنگ', group: 'chest', sets: 4, reps: '8-10', rest: '60s' },
  { name: 'بێنج پرێس بە دەمبڵ (Dumbbell Bench Press)', englishName: 'Dumbbell Bench Press', muscle: 'سنگ', group: 'chest', sets: 4, reps: '10-12', rest: '60s' },
  { name: 'سەرەوەی سنگ بە دەمبڵ (Incline Dumbbell Press)', englishName: 'Incline Dumbbell Press', muscle: 'سنگ', group: 'chest', sets: 4, reps: '10-12', rest: '60s' },
  { name: 'سەرەوەی سنگ بە باربێڵ (Incline Barbell Press)', englishName: 'Incline Barbell Press', muscle: 'سنگ', group: 'chest', sets: 4, reps: '8-10', rest: '60s' },
  { name: 'فلای سنگ بە کێبڵ (Cable Crossover Fly)', englishName: 'Cable Crossover', muscle: 'سنگ', group: 'chest', sets: 3, reps: '12-15', rest: '45s' },
  { name: 'پێک دێک فلای بە ئامێر (Pec Deck Machine Fly)', englishName: 'Pec Deck Machine Fly', muscle: 'سنگ', group: 'chest', sets: 3, reps: '12-15', rest: '45s' },
  { name: 'سنگ پرێس بە ئامێر (Machine Chest Press)', englishName: 'Machine Chest Press', muscle: 'سنگ', group: 'chest', sets: 4, reps: '10-12', rest: '60s' },
  { name: 'فلای سنگ بە دەمبڵ (Dumbbell Fly)', englishName: 'Dumbbell Fly', muscle: 'سنگ', group: 'chest', sets: 3, reps: '12-15', rest: '45s' },
  { name: 'ئۆرزی سنگ بە بار (Chest Dips)', englishName: 'Chest Dips', muscle: 'سنگ', group: 'chest', sets: 3, reps: '10-12', rest: '60s' },
  { name: 'شناو لەسەر زەوی (Push-ups)', englishName: 'Push-ups', muscle: 'سنگ', group: 'chest', sets: 4, reps: '15-20', rest: '45s' },

  // پشت (Back)
  { name: 'ڕاکێشانی کێبڵ بۆ سنگ (Lat Pulldown)', englishName: 'Lat Pulldown', muscle: 'پشت', group: 'back', sets: 4, reps: '10-12', rest: '60s' },
  { name: 'پاروو بە کێبڵ بە دانیشتنەوە (Seated Cable Row)', englishName: 'Seated Cable Row', muscle: 'پشت', group: 'back', sets: 4, reps: '10-12', rest: '60s' },
  { name: 'بارفیکس / خۆهەڵواسین (Pull-ups)', englishName: 'Pull-ups', muscle: 'پشت', group: 'back', sets: 4, reps: '8-12', rest: '60s' },
  { name: 'پاروو بە باربێڵ بە چەمانەوە (Barbell Bent-Over Row)', englishName: 'Barbell Bent Over Row', muscle: 'پشت', group: 'back', sets: 4, reps: '8-10', rest: '60s' },
  { name: 'مشار بە دەمبڵ تاک دەست (One-Arm Dumbbell Row)', englishName: 'One-Arm Dumbbell Row', muscle: 'پشت', group: 'back', sets: 4, reps: '10-12', rest: '60s' },
  { name: 'تی-بار ڕۆو (T-Bar Row)', englishName: 'T-Bar Row', muscle: 'پشت', group: 'back', sets: 4, reps: '10-12', rest: '60s' },
  { name: 'ڕاکێشانی کێبڵ بە دەستی ڕێک (Straight-Arm Pulldown)', englishName: 'Straight-Arm Pulldown', muscle: 'پشت', group: 'back', sets: 3, reps: '12-15', rest: '45s' },
  { name: 'پشتگیری سنگ لەسەر کورسی بە دەمبڵ (Chest-Supported Row)', englishName: 'Chest Supported Dumbbell Row', muscle: 'پشت', group: 'back', sets: 4, reps: '10-12', rest: '60s' },
  { name: 'دێدلیفت بە باربێڵ (Barbell Deadlift)', englishName: 'Barbell Deadlift', muscle: 'پشت', group: 'back', sets: 4, reps: '6-8', rest: '90s' },

  // شان (Shoulders)
  { name: 'شان پرێس بە دەمبڵ (Seated Dumbbell Shoulder Press)', englishName: 'Seated Dumbbell Press', muscle: 'شان', group: 'shoulders', sets: 4, reps: '10-12', rest: '60s' },
  { name: 'شان پرێس بە باربێڵ (Overhead Barbell Press)', englishName: 'Overhead Barbell Press', muscle: 'شان', group: 'shoulders', sets: 4, reps: '8-10', rest: '60s' },
  { name: 'بەرزکردنەوەی تەنیشت بە دەمبڵ (Dumbbell Lateral Raise)', englishName: 'Dumbbell Lateral Raise', muscle: 'شان', group: 'shoulders', sets: 4, reps: '12-15', rest: '45s' },
  { name: 'بەرزکردنەوەی پێشەوەی شان (Dumbbell Front Raise)', englishName: 'Dumbbell Front Raise', muscle: 'شان', group: 'shoulders', sets: 3, reps: '12-15', rest: '45s' },
  { name: 'ڕاکێشانی پەت بۆ دەموچاو (Face Pull)', englishName: 'Cable Face Pull', muscle: 'شان', group: 'shoulders', sets: 4, reps: '15', rest: '45s' },
  { name: 'پشتی شان بە ئامێر (Reverse Pec Deck)', englishName: 'Reverse Pec Deck', muscle: 'شان', group: 'shoulders', sets: 3, reps: '12-15', rest: '45s' },
  { name: 'ئاڕنۆڵد پرێس (Arnold Dumbbell Press)', englishName: 'Arnold Press', muscle: 'شان', group: 'shoulders', sets: 4, reps: '10-12', rest: '60s' },
  { name: 'کۆڵەمە بە دەمبڵ (Dumbbell Shrugs)', englishName: 'Dumbbell Shrugs', muscle: 'شان', group: 'shoulders', sets: 4, reps: '12-15', rest: '45s' },

  // قاچ و سمت (Legs & Glutes)
  { name: 'سکوات بە باربێڵ (Barbell Squat)', englishName: 'Barbell Squat', muscle: 'قاچ', group: 'legs', sets: 4, reps: '8-10', rest: '75s' },
  { name: 'لێگ پرێس بە ئامێر (Leg Press)', englishName: 'Leg Press', muscle: 'قاچ', group: 'legs', sets: 4, reps: '10-12', rest: '60s' },
  { name: 'درێژکردنی پێشەوەی قاچ (Leg Extension)', englishName: 'Leg Extension', muscle: 'قاچ', group: 'legs', sets: 4, reps: '12-15', rest: '45s' },
  { name: 'ڕاکێشانی پشتی قاچ (Seated / Lying Leg Curl)', englishName: 'Seated Leg Curl', muscle: 'پشتی قاچ', group: 'legs', sets: 4, reps: '12-15', rest: '45s' },
  { name: 'دێدلیفتی ڕۆمانی بۆ پشتی قاچ (Romanian Deadlift)', englishName: 'Romanian Deadlift', muscle: 'پشتی قاچ', group: 'legs', sets: 4, reps: '10-12', rest: '60s' },
  { name: 'سکواتی بولگاری بۆ قاچ و سمت (Bulgarian Split Squat)', englishName: 'Bulgarian Split Squat', muscle: 'سمت و قاچ', group: 'legs', sets: 3, reps: '10-12', rest: '60s' },
  { name: 'هیپ ترەست بۆ گەورەکردنی سمت (Barbell Hip Thrust)', englishName: 'Barbell Hip Thrust', muscle: 'سمت', group: 'legs', sets: 4, reps: '10-12', rest: '60s' },
  { name: 'گۆبلێت سکوات بە دەمبڵ (Goblet Squat)', englishName: 'Goblet Squat', muscle: 'قاچ', group: 'legs', sets: 4, reps: '12-15', rest: '60s' },
  { name: 'هەنگاونان بە دەمبڵ (Dumbbell Lunges)', englishName: 'Dumbbell Lunges', muscle: 'قاچ', group: 'legs', sets: 3, reps: '12', rest: '60s' },
  { name: 'بەرزبوونەوە لەسەر پەنجەی پێ بۆ پوز (Standing Calf Raise)', englishName: 'Standing Calf Raise', muscle: 'پوز', group: 'legs', sets: 4, reps: '15-20', rest: '45s' },

  // قۆڵ و باڵ (Arms: Biceps & Triceps)
  { name: 'جەڵەوی بایسێپس بە باربێڵ (Barbell Biceps Curl)', englishName: 'Barbell Biceps Curl', muscle: 'قۆڵ', group: 'arms', sets: 4, reps: '10-12', rest: '45s' },
  { name: 'بایسێپس بە دەمبڵ بە وەستانەوە (Dumbbell Biceps Curl)', englishName: 'Dumbbell Biceps Curl', muscle: 'قۆڵ', group: 'arms', sets: 4, reps: '10-12', rest: '45s' },
  { name: 'چەکوش کێرڵ بە دەمبڵ (Hammer Curl)', englishName: 'Hammer Curl', muscle: 'قۆڵ', group: 'arms', sets: 3, reps: '12', rest: '45s' },
  { name: 'پریچەر کێرڵ لەسەر مێز (Preacher Curl)', englishName: 'EZ-Bar Preacher Curl', muscle: 'قۆڵ', group: 'arms', sets: 3, reps: '10-12', rest: '45s' },
  { name: 'ترایسێپس بە پەت لەسەر کێبڵ (Triceps Rope Pushdown)', englishName: 'Triceps Rope Pushdown', muscle: 'پاشەملە', group: 'arms', sets: 4, reps: '12-15', rest: '45s' },
  { name: 'ترایسێپس لە پشت سەر بە دەمبڵ (Overhead Triceps Extension)', englishName: 'Overhead Dumbbell Triceps Extension', muscle: 'پاشەملە', group: 'arms', sets: 3, reps: '12', rest: '45s' },
  { name: 'تێکشکێنەری کەللەسەر بە بار (Skull Crushers)', englishName: 'EZ-Bar Skullcrusher', muscle: 'پاشەملە', group: 'arms', sets: 3, reps: '10-12', rest: '45s' },
  { name: 'پاشەملە لەسەر کورسی (Bench Dips)', englishName: 'Bench Dips', muscle: 'پاشەملە', group: 'arms', sets: 3, reps: '12-15', rest: '45s' },

  // سک و کاردیۆ (Core & Cardio)
  { name: 'کڕانچی سک بە کێبڵ (Cable Rope Crunch)', englishName: 'Cable Rope Crunch', muscle: 'ورگ و کەمەر', group: 'core', sets: 4, reps: '15-20', rest: '40s' },
  { name: 'بەرزکردنەوەی قاچ بە هەڵواسراوی (Hanging Leg Raise)', englishName: 'Hanging Leg Raise', muscle: 'ورگ و کەمەر', group: 'core', sets: 4, reps: '12-15', rest: '40s' },
  { name: 'پڵانکی جێگیر بۆ توندکردنەوەی سک (Plank Hold)', englishName: 'Plank', muscle: 'ورگ و کەمەر', group: 'core', sets: 3, reps: '60s', rest: '30s' },
  { name: 'پێچکردنی ڕووسی بۆ کەمەر (Russian Twists)', englishName: 'Russian Twists', muscle: 'ورگ و کەمەر', group: 'core', sets: 4, reps: '20', rest: '30s' },
  { name: 'چیاڕەوی خێرا (Mountain Climbers)', englishName: 'Mountain Climbers', muscle: 'کاردیۆ و سک', group: 'core', sets: 3, reps: '45s', rest: '30s' },
  { name: 'ڕۆیشتن لەسەر تەرمیلی لێژ (Incline Treadmill Walk)', englishName: 'Walking on Incline Treadmill', muscle: 'کاردیۆ', group: 'core', sets: 1, reps: '20 خولەک', rest: '60s' },
  { name: 'پاسکیلی وەستاو (Stationary Bike)', englishName: 'Stationary Bike', muscle: 'کاردیۆ', group: 'core', sets: 1, reps: '20 خولەک', rest: '60s' }
];
