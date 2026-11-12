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

    const prompt = `You are a world-class professional personal trainer and AI Fitness Coach.
Create a highly personalized ${daysPerWeek}-day weekly workout split based STRICTLY on the user's profile:
${profileText}

If they are female, select exercises appropriate for female anatomy and their specific body goals (e.g., glutes focus, waist shrinking).
If they are male, select exercises appropriate for their goals (e.g., chest/shoulder width).
If they have injuries (e.g., back, knee), REPLACE dangerous exercises with safe alternatives (e.g., replace barbell squats with leg press or bulgarian split squats if bad back).
If they are at Home, ONLY use the equipment they have (or bodyweight).

CRITICAL RULES FOR HOME WORKOUTS:
- If location is Home, NEVER invent improvised household item exercises (DO NOT use words like "Backpack", "Water bottle", "Couch", "Towel", "Broom").
- For bodyweight home workouts, ONLY use pure floor & furniture exercises (NO gym bars, NO ladders):
  * Chest: Push-ups, Diamond Push-ups, Wide Push-ups
  * Back: Floor Reverse Push-up, Superman Holds, Glute Bridges
  * Shoulders: Pike Push-ups, Plank Shoulder Taps
  * Arms: Bench Dips, Diamond Push-ups, Bodyweight Biceps Curl
  * Legs: Bodyweight Squats, Bulgarian Split Squats, Bodyweight Lunges, Glute Bridges, Bodyweight Standing Calf Raise
  * Core: Plank, Crunches, Mountain Climbers, Lying Leg Raises, Russian Twists
- If the user has Dumbbells at home, use real dumbbell exercise names: Dumbbell Biceps Curl, Dumbbell Floor Press, Dumbbell Shoulder Press, Dumbbell Goblet Squat, Dumbbell Romanian Deadlift, Dumbbell Lunges.
- Every "englishName" MUST strictly be a standard, recognizable exercise name so that animated GIF demonstrations load properly and are never empty.

If their goal involves losing weight or fat (e.g. Cut, Weight Loss, Shrink), you MUST add a Cardio exercise (e.g., Treadmill Running, Cycling, Elliptical) for 15-20 minutes at the VERY END of the exercises array for EVERY non-rest day.

Goal Pace / Speed Instructions:
- 'slow': 3 sets per exercise, 90s rest interval between sets, gentle/light cardio (12-15 min) for 1-2 days to preserve joints & all muscle.
- 'normal': 3-4 sets per exercise, 60s rest interval, moderate cardio (15-20 min) 2-3 days (standard balanced pace).
- 'fast': 4 sets per exercise, 45s rest interval, active cardio (20-25 min) 3-4 days to boost metabolic burn.
- 'very_fast': 4-5 sets per exercise, 35s rest interval, interval cardio (25-30 min) for all non-rest days for maximum calorie burn.

You MUST return a JSON object with this exact structure (no markdown tags, just raw JSON):
{
  "title": "Kurdish Title of the Split (e.g., خشتەی ٤ ڕۆژە - سەرەوە/خوارەوە)",
  "goalDescription": "A 2-sentence Kurdish explanation of how this specific program helps their exact goal and respects their injuries.",
  "daysPerWeek": ${daysPerWeek},
  "durationWeeks": 4,
  "totalDays": 28,
  "weeklyPlan": [
    // Array of exactly 7 objects (from Saturday to Friday). 
    // If daysPerWeek is 4, then 4 days must have isRestDay: false, and 3 must have isRestDay: true.
    {
      "dayName": "شەممە",
      "dayKey": "saturday",
      "isRestDay": false,
      "focus": "Kurdish Focus (e.g., سنگ و قۆڵ)",
      "estimatedCalories": 400,
      "duration": "٤٥ خولەک",
      "exercises": [
        {
          "name": "Kurdish Exercise Name",
          "englishName": "English Exercise Name",
          "sets": 4,
          "reps": "8-10",
          "rest": "60 چرکە",
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
