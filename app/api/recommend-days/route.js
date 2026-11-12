import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(request) {
  try {
    const { profile } = await request.json();
    
    const goal = profile.goal || 'Fitness';
    const profileText = `
      Age: ${profile.age || 23}
      Gender: ${profile.gender || 'male'}
      Weight: ${profile.weight || 75} kg
      Target Weight: ${profile.targetWeight || 80} kg
      Goal: ${goal}
      Health Conditions/Injuries: ${profile.healthConditions ? profile.healthConditions.join(', ') : 'None'}
    `;

    const prompt = `You are an expert sports scientist and AI fitness coach.
Based on the following user profile, determine the optimal number of days per week they should workout (between 3 and 6).
Profile:
${profileText}

Respond with a JSON object containing:
1. "recommendedDays": A number between 3 and 6.
2. "reason": A short 1-sentence explanation in Kurdish (Sorani) explaining WHY this number of days is perfect for them based on their specific weight, goals, or injuries. 
Do not use markdown formatting.`;

    
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
    console.error('Days Recommendation API Error:', error);
    return NextResponse.json({ recommendedDays: 4, reason: 'بەپێی زانیارییەکانت، ٤ ڕۆژ مامناوەند و گونجاوە.' });
  }
}
