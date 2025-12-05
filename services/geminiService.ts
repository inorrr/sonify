
import { GoogleGenAI, Type } from "@google/genai";
import { SoundBlueprint, SoundGenre } from "../types";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const MODEL_NAME = "gemini-2.5-flash";

/**
 * Converts a File object to a Base64 string required by Gemini.
 */
const fileToGenerativePart = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      // Remove the Data-URL prefix (e.g., "data:image/jpeg;base64,")
      const base64Data = result.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

/**
 * Analyzes the image and returns a structured Sound Blueprint.
 */
export const generateSoundBlueprint = async (imageFile: File, genre: SoundGenre): Promise<SoundBlueprint> => {
  try {
    const base64Image = await fileToGenerativePart(imageFile);

    const prompt = `
      You are an expert sound designer and composer. 
      Analyze the provided image and create a 'Sound Blueprint' that translates the visual content into a sonic experience.
      
      Constraint: The musical style MUST be '${genre}'.
      
      Consider:
      - Lighting: Bright images might sound airy/high-pitched; dark images might sound deep/low.
      - Complexity: Busy images imply dense rhythms; minimal images imply sparse, long notes.
      - Emotion: Translate the mood (melancholy, joy, chaos, peace) into harmonic choices.
      - Environment: Is it indoor (tight reverb) or outdoor (vast echo)?
      
      Return STRICT JSON conforming to the schema.
    `;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: imageFile.type,
              data: base64Image
            }
          },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            emotional_tone: { type: Type.STRING, description: "A short adjective describing the mood." },
            tempo_bpm: { type: Type.NUMBER, description: "BPM between 40 and 160." },
            pitch_range: { type: Type.STRING, enum: ['low', 'mid', 'high', 'wide'] },
            harmonic_complexity: { type: Type.STRING, enum: ['simple', 'complex', 'dissonant'] },
            sonic_palette: { 
              type: Type.STRING, 
              enum: ['warm_synth', 'glassy_digital', 'distorted', 'retro_8bit', 'organic_wind'],
              description: "The fundamental sound texture based on the genre."
            },
            timbre_brightness: { type: Type.NUMBER, description: "0.0 (dark/muffled) to 1.0 (sharp/bright)" },
            rhythm_density: { type: Type.NUMBER, description: "0.0 (sparse/ambient) to 1.0 (hectic/busy)" },
            spatial_reverb: { type: Type.NUMBER, description: "0.0 (dry/close) to 1.0 (huge/distant)" },
            chaos_factor: { type: Type.NUMBER, description: "0.0 (predictable) to 1.0 (random/glitchy)" },
            key_elements: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING },
              description: "3-5 key sonic textures to include (e.g., 'birds', 'traffic drone', 'soft piano')." 
            },
            scene_description: { type: Type.STRING, description: "A one sentence poetic description of the scene." }
          },
          required: [
            "emotional_tone", "tempo_bpm", "pitch_range", "harmonic_complexity", 
            "sonic_palette", "timbre_brightness", "rhythm_density", "spatial_reverb", 
            "chaos_factor", "key_elements", "scene_description"
          ]
        }
      }
    });

    if (!response.text) {
      throw new Error("No response from Gemini.");
    }

    const blueprint = JSON.parse(response.text) as SoundBlueprint;
    return blueprint;

  } catch (error) {
    console.error("Gemini Analysis Failed:", error);
    throw error;
  }
};
