import { GoogleGenAI } from "@google/genai";

// Note: In a real production app, this key should be secured via backend proxy.
// For this demo, we assume the user might provide it or it's available in env.
const apiKey = process.env.API_KEY || ''; 

let ai: GoogleGenAI | null = null;

if (apiKey) {
  ai = new GoogleGenAI({ apiKey });
}

export const generateLyricsOrVibe = async (artist: string, title: string): Promise<string> => {
  if (!ai) return "Gemini API Key not configured. Cannot generate insights.";

  try {
    const model = 'gemini-3-flash-preview';
    const prompt = `
      I am listening to the song "${title}" by "${artist || 'Unknown Artist'}".
      Please provide a brief, poetic description of the vibe of this song, 
      followed by the likely lyrics (or a creative interpretation if instrumental).
      Keep the vibe description under 50 words. Format nicely.
    `;

    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
    });

    return response.text || "No details found.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Could not retrieve info from Gemini.";
  }
};
