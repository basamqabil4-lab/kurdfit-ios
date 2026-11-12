import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(request) {
  try {
    const { profile, dietType, goalCalories } = await request.json();
    
    const profileText = profile ? `
      Name: ${profile.name || 'User'}
      Age: ${profile.age || 23}
      Gender: ${profile.gender || 'male'}
      Weight: ${profile.weight || 75} kg
      Target Goal: ${profile.goal || 'Fitness'}
      Target Weight: ${profile.targetWeight || 80} kg
      Health Conditions: ${profile.healthConditions ? profile.healthConditions.join(', ') : 'None'}
    ` : '';

    const customRules = `
    IMPORTANT DIETARY RULES FROM THE USER:
    1. Goal matching: Calculate macros perfectly. If losing weight, caloric deficit; if gaining weight, caloric surplus.
    2. Meal Distribution: Provide exactly 3 to 5 small to medium meals to speed up digestion and stabilize blood sugar. (I require 4 arrays: breakfast, lunch, snack, dinner. You can put multiple items in snack to act as 2 snacks).
    3. Balanced Macros per main meal:
       - Protein: Chicken breast, eggs, fish, lean red meat, legumes. Builds muscle, increases satiety.
       - Complex Carbs: Oats, brown rice, sweet potatoes, whole wheat bread. Provides long-lasting energy.
       - Healthy Fats: Olive oil, nuts (almonds, walnuts), avocado. Crucial for vitamins and heart/brain health.
       - Fiber & Vitamins: Dark leafy greens and fruits. Vital for digestion.
    4. Must exclude artificial sugar, sodas, artificial juices, and sweets completely.
    5. Add a recommendation note somewhere (or just respect it in the foods) to drink 2-3 liters of water, sleep 7-8 hours, and walk/workout 3-4 days a week.\n
    KETO DIET SPECIFIC RULES (Only apply if dietType is 'keto'):
    1. Macronutrients: MUST be 70-75% Fats, 20% Protein, and strictly 5-10% Carbohydrates.
    2. Allowed Foods: Red meat, chicken, fish, eggs, butter, olive oil, avocado, nuts, and low-carb vegetables (spinach, broccoli, cauliflower).
    3. FORBIDDEN Foods: Sugar, sweets, bread, rice, potatoes, pasta, legumes, and almost all fruits (except very small amounts of berries/strawberries).
    4. Note for the plan: Remind the user about the initial "Keto Flu" (weakness/headache) and the fact that explosive lifting energy might be lower due to depleted glycogen.

    `;

    const prompt = `You are an expert Clinical Nutritionist and AI Dietitian. 
Generate a healthy 7-day Kurdish diet plan strictly matching approximately ${goalCalories || 2200} kcal per day.
The user profile is: ${profileText}
The diet style requested is: ${dietType || 'balanced'}

${customRules}

You MUST output an array of exactly 7 objects (one for each day of the week).
Each day object must have 4 meal arrays: "breakfast", "lunch", "snack", "dinner".
Inside each meal array, provide the food items.
Each food item MUST follow this exact structure:
{
  "id": "unique-id-string",
  "name": "Kurdish Name (e.g. سنگی مریشکی برژاو)",
  "englishName": "English Name",
  "calories": number,
  "protein": number,
  "carbs": number,
  "fat": number,
  "icon": "emoji (e.g. 🍗)",
  "quantity": 1,
  "unit": "قاپ / گرام / دانە"
}

Ensure the total calories for all meals in a single day add up closely to the target ${goalCalories || 2200} kcal.
Adjust macros depending on if the goal is weight loss, muscle gain, and the diet style (${dietType}).
Respond ONLY with the JSON array of 7 day objects. Do not wrap in markdown.`;

    const candidateModels = ['gemini-flash-lite-latest', 'gemini-2.5-flash', 'gemini-2.0-flash'];

    for (const model of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: { responseMimeType: 'application/json' }
        });

        const rawText = typeof response.text === 'function' ? response.text() : (response.text || '');
        const cleanText = rawText.replace(/```json/gi, '').replace(/```/gi, '').trim();
        const data = JSON.parse(cleanText);
        
        if (Array.isArray(data) && data.length === 7) {
          return NextResponse.json(data);
        }
      } catch (err) {
        console.warn(`Plan generator model ${model} failed:`, err.message);
      }
    }
    
    return NextResponse.json({ error: 'All models failed' }, { status: 500 });
  } catch (error) {
    console.error('Error generating plan with AI:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
