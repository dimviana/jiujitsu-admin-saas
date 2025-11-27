import { GoogleGenAI } from "@google/genai";
import { Student } from "../types";

export const generateStudentFeedback = async (student: Student, performanceNote: string) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
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
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const model = 'gemini-2.5-flash'; // Using flash for this task
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

export const generateWorkoutPlan = async (student: Student, goal: string, equipment: string) => {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const model = 'gemini-2.5-flash';
        const prompt = `
            Create a personalized physical conditioning workout plan for a Jiu-Jitsu student.
            
            Student Profile:
            Name: ${student.name}
            Rank: ${student.beltId}
            Goal: ${goal}
            Available Equipment: ${equipment}

            Structure the response as a list of exercises with sets and reps.
            Include a brief explanation of why this plan suits their Jiu-Jitsu game.
            Output in Portuguese.
        `;

        const response = await ai.models.generateContent({
            model,
            contents: prompt,
        });
        
        return response.text;
    } catch (error) {
        console.error("Error generating workout plan:", error);
        return "Não foi possível gerar o plano de treino no momento.";
    }
};