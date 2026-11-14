import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(request) {
  try {
    const body = await request.json();
    const profile = body.profile || body || {};
    const location = body.location || profile.trainingLocation || 'gym';
    const equipment = body.equipment || '';
    
    const daysPerWeek = profile.availableDaysPerWeek || 4;
    const isHome = location === 'home';
    const goal = profile.goal || 'Fitness';
    
    const bodyGoalsText = profile.bodyGoals 
      ? `Enlarge (Focus): ${profile.bodyGoals.enlarge?.join(', ') || 'None'}. Shrink (Burn): ${profile.bodyGoals.shrink?.join(', ') || 'None'}.`
      : 'None';

    const profileText = `
      Age: ${profile.age || 23}
      Gender: ${profile.gender || 'male'}
      Weight: ${profile.weight || 75} kg
      Goal: ${goal}
      Goal Pace / Speed: ${profile.goalPace || 'normal'} (slow, normal, fast, very_fast)
      Specific Body Goals: ${bodyGoalsText}
      Health Conditions/Injuries: ${profile.healthConditions ? profile.healthConditions.join(', ') : 'None'}
      Days Per Week: ${daysPerWeek}
      Location: ${isHome ? 'Home Workout' : 'Gym'}
      Equipment Available (if home): ${equipment || 'Bodyweight only'}
    `;

    const prompt = `You are an elite Sports Scientist and Master Hypertrophy Strength Coach.
Create a modern, science-based, highly personalized ${daysPerWeek}-day weekly workout split based STRICTLY on the athlete profile:
${profileText}

MANDATORY MODERN SPORTS SCIENCE PRINCIPLES:
1. OPTIMAL SPLIT STRUCTURE (Muscle Protein Synthesis lasts 24-48 hours, so muscles need 2x/week stimulation):
   - If ${daysPerWeek} === 4: STRICTLY use Upper / Lower Split (Saturday: Upper A, Sunday: Lower A, Monday: Rest, Tuesday: Upper B, Wednesday: Lower B, Thursday & Friday: Rest). NEVER use a 1x/week Bro-Split for 4 days.
   - If ${daysPerWeek} === 3: STRICTLY use Full Body Split (Saturday: Full Body A, Monday: Full Body B, Wednesday: Full Body C, with rest days in between). This stimulates every major muscle 3x/week for peak natural hypertrophy.
   - If ${daysPerWeek} === 2: STRICTLY use Full Body A and Full Body B (spaced 2-3 days apart).
   - If ${daysPerWeek} === 5: STRICTLY use Upper / Lower + Push / Pull / Legs (Hybrid Split: Upper Power, Lower Power, Rest, Push Hypertrophy, Pull Hypertrophy, Legs Hypertrophy, Rest).
   - If ${daysPerWeek} === 6: STRICTLY use Push A / Pull A / Legs A / Push B / Pull B / Legs B with biomechanical variation between day A and day B.

2. EXERCISE TIER HIERARCHY & REST PERIODS WITHIN EACH WORKOUT:
   - Tier 1 (Primary Heavy Compound - First exercise): Maximum CNS recruitment (e.g. Barbell Back Squat, Romanian Deadlift, Incline Dumbbell Bench Press, Barbell Bench Press, Lat Pulldown Wide, Overhead Press). 3-4 sets, 6-8 or 8-10 reps, 120s - 180s rest, rir: "RIR 1-2".
   - Tier 2 (Secondary Compound - Second/Third exercise): High mechanical tension with controlled stability (e.g. Bulgarian Split Squats, Chest Supported Cable Row, Seated Dumbbell Press, Leg Press). 3-4 sets, 8-10 or 10-12 reps, 90s - 120s rest, rir: "RIR 1-2".
   - Tier 3 (Isolation & Specialized Angles - Fourth/Fifth exercise): Targeting lengthened & shortened muscle positions (e.g. Cable Lateral Raise, Pec Deck Machine Fly, Seated Leg Curl, Leg Extension, Incline Dumbbell Biceps Curl, Overhead Cable Triceps Extension, Standing Calf Raise). 3 sets, 10-15 reps, 60s - 75s rest, rir: "RIR 0-1".
   - Tier 4 (Core / Postural Integrity - Optional finisher): Plank, Cable Rope Crunch, Cable Face Pull. Rest: 45s - 60s.

3. BIOMECHANICAL DIVERSITY & NO JUNK VOLUME:
   - NEVER program two redundant exercises with the same resistance angle in one workout (e.g. DO NOT do Flat Barbell Bench Press AND Flat Dumbbell Bench Press together).

4. FATIGUE MANAGEMENT & SCIENTIFIC CARDIO:
   - For fat loss, add 15-20 min Low-Impact Steady-State (LISS) cardio (e.g. Incline Treadmill Walking or Stationary Cycling) at the very end of non-rest days to preserve muscle and prevent the interference effect (do NOT program exhausting sprint HIIT after heavy strength lifts).

5. GENDER & GOAL SPECIALIZATION:
   - Female Athletes: Prioritize glutes, hamstrings, and toned posterior chain (Hip Thrust, Romanian Deadlift, Bulgarian Split Squats) with slightly higher rep stamina, plus posture/core toning.
   - Male Athletes: Prioritize V-taper aesthetic (Upper clavicular chest, lat width, lateral deltoids).
   - Health / Injuries: Replace any contraindicated movements (e.g. replace Barbell Squat with Leg Press or Goblet Squat if lower back/knee issues).

6. HOME WORKOUT CONSTRAINTS:
   - If location is Home, NEVER invent improvised household item exercises (DO NOT use words like "Backpack", "Water bottle", "Couch", "Towel", "Broom").
   - For bodyweight home: Push-ups, Diamond Push-ups, Wide Push-ups, Floor Reverse Push-up, Superman Holds, Glute Bridges, Pike Push-ups, Bench Dips, Bodyweight Squats, Bulgarian Split Squats, Lunges, Standing Calf Raise, Plank, Crunches.
   - If Dumbbells available at home: Dumbbell Romanian Deadlift, Dumbbell Goblet Squat, Dumbbell Floor Press, Dumbbell Shoulder Press, Dumbbell Lunges, Dumbbell Biceps Curl.
   - Every "englishName" MUST be a standard, recognizable exercise name so that animated GIF demonstrations load properly.

You MUST return a JSON object with this exact structure (no markdown tags, just raw JSON):
{
  "title": "Kurdish Title of the Split (e.g., کۆرسی زانستی ٤ ڕۆژە - سەرەوە / خوارەوە (Upper/Lower))",
  "goalDescription": "A 2-sentence Kurdish explanation of the scientific split, progressive overload, and injury precautions.",
  "daysPerWeek": ${daysPerWeek},
  "durationWeeks": 4,
  "totalDays": 28,
  "weeklyPlan": [
    // Array of exactly 7 objects (Saturday to Friday).
    // Exactly ${daysPerWeek} days must have isRestDay: false, and ${7 - daysPerWeek} days must have isRestDay: true (exercises: []).
    {
      "dayName": "شەممە",
      "dayKey": "saturday",
      "isRestDay": false,
      "focus": "Kurdish Focus (e.g., سەرەوە A - سنگ و پشت)",
      "estimatedCalories": 440,
      "duration": "٥٠ خولەک",
      "exercises": [
        {
          "name": "Kurdish Exercise Name",
          "englishName": "Standard English Exercise Name",
          "sets": 4,
          "reps": "8-10",
          "rest": "120s",
          "rir": "RIR 1-2",
          "muscle": "سنگ"
        }
      ]
    }
  ]
}

Ensure day names are: شەممە (sat), یەکشەممە (sun), دووشەممە (mon), سێشەممە (tue), چوارشەممە (wed), پێنجشەممە (thu), هەینی (fri).
Respond ONLY with the JSON. Do not wrap in \`\`\`json.`;

    
    const models = ['gemini-flash-lite-latest', 'gemini-2.5-flash', 'gemini-2.0-flash'];
    let response = null;
    let success = false;
    
    for (const model of models) {
      try {
        response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: { responseMimeType: 'application/json' }
        });
        success = true;
        break;
      } catch(e) {
        console.warn('Model failed:', model, e.message);
      }
    }
    
    if (!success) throw new Error('All models failed');
  

    let text = typeof response.text === 'function' ? response.text() : response.text || '';
    text = text.replace(/```json/gi, '').replace(/```/gi, '').trim();
    
    return NextResponse.json(JSON.parse(text));
  } catch (error) {
    console.error('Workout Generation API Error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
