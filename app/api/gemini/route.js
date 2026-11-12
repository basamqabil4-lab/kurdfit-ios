import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

const DEFAULT_SERVER_KEY = process.env.GEMINI_API_KEY;

export async function POST(request) {
  try {
    const { prompt, systemInstruction, base64Image, customModels, customApiKey } = await request.json();

    const activeKey = customApiKey || DEFAULT_SERVER_KEY;
    if (!activeKey) {
      return NextResponse.json({ error: 'Gemini API key is not configured on server' }, { status: 500 });
    }

    const ai = new GoogleGenAI({ apiKey: activeKey });
    const modelsToTry = (Array.isArray(customModels) && customModels.length > 0)
      ? customModels
      : ['gemini-flash-lite-latest', 'gemini-2.5-flash', 'gemini-2.0-flash'];

    let lastError = null;

    for (const model of modelsToTry) {
      try {
        const parts = [{ text: prompt }];
        if (base64Image) {
          const cleanData = base64Image.replace(/^data:image\/\w+;base64,/, '');
          parts.push({
            inlineData: {
              mimeType: 'image/jpeg',
              data: cleanData
            }
          });
        }

        const contents = [{ role: 'user', parts }];
        const config = {};
        if (systemInstruction) {
          config.systemInstruction = { parts: [{ text: systemInstruction }] };
        }

        const response = await ai.models.generateContent({
          model,
          contents,
          config
        });

        if (response && response.text) {
          return NextResponse.json({ text: response.text });
        }
      } catch (err) {
        console.warn(`[API /api/gemini] Attempt with ${model} failed:`, err?.message || err);
        lastError = err;
      }
    }

    return NextResponse.json(
      { error: lastError?.message || 'Failed to generate response from Gemini API' },
      { status: 502 }
    );
  } catch (error) {
    console.error('[API /api/gemini] Unexpected error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
