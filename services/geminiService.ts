import { GoogleGenAI } from "@google/genai";
import { Student } from "../types";

// Read API Key from Vite environment variables (compatible with REACT_APP_ prefix)
// Using safe access with optional chaining to prevent runtime crashes
// Cast import.meta to any to avoid TS error when vite types aren't globally available
const apiKey = (import.meta as any).env?.REACT_APP_API_KEY || (typeof process !== 'undefined' && process.env?.REACT_APP_API_KEY) || ""; 
const ai = new GoogleGenAI({ apiKey });

export const generateStudentFeedback = async (student: Student, performanceNote: string) => {
  if (!apiKey) return "Chave de API não configurada. Verifique o arquivo .env";
  try {
    const model = 'gemini-2.5-flash';
    const prompt = `
      Act as a world-class Brazilian Jiu-Jitsu professor.
      Analyze the following student:
      Name: ${student.name}
      Rank: ${student.beltId} belt with ${student.stripes} stripes.
      Competitor: ${student.isCompetitor ? 'Yes' : 'No'}.
      
      Recent Performance Note: ${performanceNote}

      Provide a constructive, 3-bullet point feedback plan for this student to reach the next level.
      Keep it encouraging but technical.
      Output in Portuguese.
    `;

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
    });
    
    return response.text;
  } catch (error) {
    console.error("Error generating feedback:", error);
    return "Não foi possível gerar o feedback da IA no momento.";
  }
};

export const generateClassPlan = async (level: string, focus: string) => {
    if (!apiKey) return { warmup: "Erro API Key", drill: "Erro API Key", sparring: "Erro API Key" };
    try {
        const model = 'gemini-2.5-flash';
        const prompt = `
            Create a Jiu-Jitsu class plan (90 minutes).
            Level: ${level}
            Technique Focus: ${focus}
            
            Structure:
            1. Warm-up (15 min)
            2. Technique drill (45 min)
            3. Specific Training / Sparring (30 min)

            Output as a JSON object with keys: warmup, drill, sparring.
            Language: Portuguese.
        `;

        const response = await ai.models.generateContent({
            model,
            contents: prompt,
            config: { responseMimeType: "application/json" }
        });
        
        return JSON.parse(response.text || '{}');
    } catch (error) {
        console.error("Error generating class plan:", error);
        return null;
    }
}