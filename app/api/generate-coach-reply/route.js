import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(request) {
  try {
    const { query, profile, recentMessages } = await request.json();

    const candidateModels = ['gemini-flash-lite-latest', 'gemini-2.5-flash', 'gemini-2.0-flash'];

    const prompt = `You are an elite, highly intelligent, and scientifically accurate AI Fitness & Nutrition Coach for a bodybuilding and fitness app.
You speak primarily in fluent, natural Kurdish (Sorani), using English only for scientific fitness terms (like Bulk, Cut, Hypertrophy, Deadlift, kcal).

Here is the user's profile:
- Name: ${profile.name || 'کاپتن'}
- Weight: ${profile.weight} kg
- Target Weight: ${profile.targetWeight} kg
- Goal: ${profile.goal}
- Daily Calories: ${profile.dailyCalories} kcal
- Health Conditions: ${profile.healthConditions?.length ? profile.healthConditions.join(', ') : 'None'}
- Current Workout Split: ${profile.availableDaysPerWeek} days/week
- Training Location: ${profile.trainingLocation === 'home' ? 'At Home (ماڵەوە)' : 'Gym (هۆڵی وەرزش)'}
- Available Equipment: ${profile.trainingLocation === 'home' ? (profile.homeEquipment?.length > 0 ? profile.homeEquipment.join(', ') : 'None (Bodyweight)') : 'Full Gym Equipment'}

Here is the recent conversation history:
${recentMessages.map(m => `${m.sender.toUpperCase()}: ${m.text}`).join('\n')}

The user just asked: "${query}"

Your task is to understand ANY question or command the user gives, regardless of how they phrase it, and figure out the best response and action.

Respond ONLY with pure JSON using this schema:
{
  "thought": "A short, scientific, inner thought in Kurdish explaining your reasoning before replying.",
  "reply": "Your main reply in natural, motivating Kurdish (Sorani) to the user. Use emojis. Keep it concise but fully answer their query or confirm their command.",
  "action": null OR {
    "type": "SWITCH_COURSE" | "CHANGE_GOAL" | "ADD_MEAL" | "ADD_HEALTH_CONDITION",
    "days": number (only for SWITCH_COURSE, e.g. 3, 4, 5, 6),
    "targetWeight": number (only for CHANGE_GOAL),
    "goal": "string describing new goal" (only for CHANGE_GOAL, e.g. "Fat Loss & Cut", "Clean Bulk"),
    "mealType": "breakfast" | "lunch" | "dinner" | "snack" (only for ADD_MEAL),
    "food": { "name": "string", "calories": number, "protein": number, "carbs": number, "fat": number } (only for ADD_MEAL),
    "condition": "string describing injury/pain" (only for ADD_HEALTH_CONDITION, e.g. "ئازاری پشت", "ئازاری ئەژنۆ", "ئازاری شان"),
    "title": "A short title for the action card in Kurdish",
    "description": "A short description of what the action does"
  },
  "suggestedReplies": ["string 1", "string 2", "string 3"] (3 suggested follow-up queries for the user)
}

Important Rules:
1. If the user asks to change their workout days (e.g., "Make it 5 days", "Change my program to 3 days"), return an action with type "SWITCH_COURSE" and the new 'days' number.
2. If the user wants to lose weight, burn fat, or bulk up, return an action with type "CHANGE_GOAL". Estimate a good 'targetWeight' based on their current weight.
3. If they talk about eating a specific food or want a meal suggestion, suggest it and return "ADD_MEAL".
4. If they complain about pain or injury, return "ADD_HEALTH_CONDITION".
5. For everything else (general questions, greetings, random fitness advice, unknown commands), answer it fully in the 'reply' field and set 'action' to null.
6. The JSON must be valid and NOT wrapped in markdown blocks like \`\`\`json.`;

    let lastError = null;
    for (const model of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          config: { responseMimeType: 'application/json' }
        });
        const rawText = typeof response.text === 'function' ? response.text() : (response.text || '');
        const cleanText = rawText.replace(/```json/gi, '').replace(/```/gi, '').trim();
        const data = JSON.parse(cleanText);
        return NextResponse.json(data);
      } catch (err) {
        console.warn(`Query model ${model} failed:`, err.message);
        lastError = err;
      }
    }
    throw lastError || new Error('Query failed');
  } catch (error) {
    console.error('Error generating AI coach reply:', error);
    return NextResponse.json({
      thought: 'هەڵەیەک ڕوویدا لە پەیوەندیکردن بە ڕاژەکار.',
      reply: 'ببورە کاپتن، کێشەیەک لە هێڵی ئینتەرنێت هەیە یان سێرڤەر وەڵام ناداتەوە. تکایە دووبارە هەوڵ بدەرەوە.',
      action: null,
      suggestedReplies: ['دووبارە هەوڵ بدەرەوە']
    }, { status: 500 });
  }
}
