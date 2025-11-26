import { GoogleGenAI } from "@google/genai";
import { Student } from "../types";

// FIX: Per coding guidelines, initialize GoogleGenAI with apiKey from process.env.API_KEY.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateStudentFeedback = async (student: Student, performanceNote: string) => {
  // FIX: Removed API key check as per guidelines assuming it's pre-configured.
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
    // FIX: Removed API key check as per guidelines assuming it's pre-configured.
    try {
        const model = 'gemini-2.5-pro';
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
