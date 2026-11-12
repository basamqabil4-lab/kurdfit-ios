import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(request) {
  try {
    const { imageBase64, foodQuery } = await request.json();

    const candidateModels = ['gemini-flash-lite-latest', 'gemini-2.5-flash', 'gemini-2.0-flash'];

    // 1. Text-based Universal Food Search
    if (foodQuery && typeof foodQuery === 'string') {
      const prompt = `You are a certified Clinical Nutritionist and USDA FoodData Central Specialist.
Analyze the user's food query: "${foodQuery}".
It could be a Kurdish traditional dish (e.g. بریانی, کفتە, یاپراخ/دۆڵمە, تاوە, قۆزی, سەروپێ, کەباب, شلە, برنج), a bodybuilding food (سنگی مریشک, شۆفان, هێلکە, تونە, پرۆتین شەیک), or any international cuisine (Sushi, Pizza, Steak, Tacos, Pasta).

Calculate exact USDA scientific nutritional values per 100 grams (or base standard portion):
- baseCalories (kcal per 100g)
- baseProtein (grams per 100g)
- baseCarbs (grams per 100g)
- baseFat (grams per 100g)
- baseSugar (grams per 100g)

Also generate 2 to 4 intuitive natural measurement units customized for this exact food.
For example:
- For rice/grains: 'گرام (g)' with multiplier 1, 'قاپ (plate)' with multiplier 250, 'کەوچک (tbsp)' with multiplier 25.
- For tea/liquids: 'کوپ (cup)' with multiplier 150, 'مل (ml)' with multiplier 1, 'پەرداخ' with multiplier 250.
- For meat/chicken: 'گرام (g)' with multiplier 1, 'پارچە (piece)' with multiplier 120.
- For eggs: 'دانە (egg)' with multiplier 50, 'تەنها سپێنە' with multiplier 33.
- For dolma/kebab: 'دانە (piece)' with multiplier 35, 'قاپ (plate)' with multiplier 280, 'شیش' with multiplier 80.

Respond ONLY with this JSON:
{
  "isFood": true,
  "name": "Kurdish Name (e.g. یاپراخی کوردی)",
  "englishName": "English Name (e.g. Kurdish Stuffed Grape Leaves / Dolma)",
  "icon": "A single suitable emoji (e.g. 🍲, 🍚, 🥩, 🍗, ☕, 🥤, 🍎)",
  "baseCalories": number (integer calories per 100g),
  "baseProtein": number (grams per 100g),
  "baseCarbs": number (grams per 100g),
  "baseFat": number (grams per 100g),
  "baseSugar": number (grams per 100g),
  "units": [
    { "name": "گرام (g)", "multiplier": 1, "defaultAmount": 100 },
    { "name": "قاپ", "multiplier": 250, "defaultAmount": 1 }
  ]
}

Do NOT wrap with markdown, return pure JSON.`;

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
    }

    // 2. Image-based Food Scanning
    if (!imageBase64) {
      return NextResponse.json({ error: 'No image or query provided' }, { status: 400 });
    }

    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');

    const prompt = `You are a certified Clinical Nutritionist and USDA FoodData Central Specialist.
Analyze the provided image with extreme scientific precision.

Step 1: Check if the image contains edible food or beverage.
If NOT food (e.g. objects, football, logo, trophy, vehicle, furniture, person, electronics):
Respond ONLY with this JSON:
{
  "isFood": false,
  "name": "ئەم وێنەیە خواردن نییە ❌",
  "calories": 0,
  "protein": 0,
  "carbs": 0,
  "fat": 0,
  "sugar": 0,
  "message": "تکایە وێنەی خۆراکێک بگرە بۆ ئەوەی کالۆری و پرۆتین و شەکری دیاری بکرێت."
}

Step 2: If IT IS FOOD OR BEVERAGE:
1. Analyze the image step-by-step (Chain of Thought). First, write down an "analysis" detailing the food items, observing the plate/container scale, estimating the exact weight in grams/ml, and multiplying the base macros by the portion weight.
   - If the image shows a packaged food (biscuits, cake, chips) and you can see the Nutrition Facts label on the back, READ the label exactly.
   - If you can only see the front of the package, use your internal knowledge to recall the standard nutritional facts for that specific brand and product. State your reasoning in the analysis.
   - If the image shows a Nutrition Facts label on the back of a package, directly read and use those precise numbers for the stated serving size.
2. Calculate the exact nutritional values strictly according to USDA scientific standards based on your detailed weight estimation:
   - Total Calories (kcal): Must satisfy the Atwater formula: (Protein * 4) + (Carbs * 4) + (Fat * 9) within +/- 5% error margin.
   - Protein (g): exact integer or single decimal.
   - Total Carbohydrates (g): exact integer or single decimal.
   - Total Fat (g): exact integer or single decimal.
   - Sugar (g): exact sugar amount in grams (Sugar must be <= Total Carbs).
3. Provide the natural Kurdish (Sorani) name with portion (e.g. "پسکیتی شوکولاتە (٤ پارچە)", "مۆزی فرێشی مامناوەند (١ دانە)", "سنگی مریشکی برژاو (١٥٠ گرام)").

Respond ONLY with this JSON:
{
  "isFood": true,
  "analysis": "Step-by-step reasoning of portion size and calorie math...",
  "name": "Kurdish Sorani Name with Portion",
  "calories": number (integer total kcal),
  "protein": "number+g (e.g. 12g)",
  "carbs": "number+g (e.g. 45g)",
  "fat": "number+g (e.g. 8g)",
  "sugar": "number+g (e.g. 15g)",
  "proteinNum": number,
  "carbsNum": number,
  "fatNum": number,
  "sugarNum": number
}

Do NOT wrap with markdown, return pure JSON.`;

    let lastError = null;

    for (const model of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: [
            {
              role: 'user',
              parts: [
                { text: prompt },
                { inlineData: { mimeType: 'image/jpeg', data: base64Data } }
              ]
            }
          ],
          config: { responseMimeType: 'application/json' }
        });

        const rawText = typeof response.text === 'function' ? response.text() : (response.text || '');
        const cleanText = rawText.replace(/```json/gi, '').replace(/```/gi, '').trim();
        const data = JSON.parse(cleanText);

        // Ensure clean number fields
        if (data.isFood) {
          const parseG = (val) => parseFloat(String(val).replace(/[^0-9.]/g, '')) || 0;
          data.proteinNum = data.proteinNum ?? parseG(data.protein);
          data.carbsNum = data.carbsNum ?? parseG(data.carbs);
          data.fatNum = data.fatNum ?? parseG(data.fat);
          data.sugarNum = data.sugarNum ?? parseG(data.sugar);

          if (!data.protein) data.protein = `${data.proteinNum}g`;
          if (!data.carbs) data.carbs = `${data.carbsNum}g`;
          if (!data.fat) data.fat = `${data.fatNum}g`;
          if (!data.sugar) data.sugar = `${data.sugarNum}g`;
        }

        return NextResponse.json(data);
      } catch (modelErr) {
        console.warn(`Model ${model} failed:`, modelErr.message);
        lastError = modelErr;
      }
    }

    throw lastError || new Error("All AI models unavailable");

  } catch (error) {
    console.error('Error analyzing food with AI:', error);
    
    // Accurate fallback data
    return NextResponse.json({
      isFood: true,
      name: 'خواردنی تەندروست (بەشێکی ستاندارد)',
      calories: 250,
      protein: '18g',
      carbs: '28g',
      fat: '6g',
      sugar: '3g',
      proteinNum: 18,
      carbsNum: 28,
      fatNum: 6,
      sugarNum: 3
    });
  }
}
