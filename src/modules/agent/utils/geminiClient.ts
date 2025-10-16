import { VertexAI } from "@google-cloud/vertexai";
import { AppError } from "../../../config/utils/AppError";

const vertexAI = new VertexAI({
  project: process.env.GCP_PROJECT_ID,
  location: process.env.GCP_LOCATION || "us-central1",
  googleAuthOptions: {
    keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
  },
});

// Use a public Gemini model
const model = vertexAI.getGenerativeModel({ model: "gemini-2.5-flash" });

/**
 * Get intent from Gemini based on natural language query.
 * This returns a JSON object for intent detection.
 */
export const getIntentFromGemini = async (query: string) => {
  const prompt = `
You are an intent classifier for a task management system.
Return ONLY valid JSON with the following format:
{"type": "<INTENT>", "projectId": null}

Supported intents:
- "GET_ALL_TASKS"
- "GET_ALL_PROJECTS"

User query: "${query}"
`;

  const response = await model.generateContent(prompt);
  const text = response?.response?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

  if (!text) throw new AppError("Failed to parse Gemini response", 500);

  try {
    return JSON.parse(
      text.replace(/```(?:json)?/g, "").trim() // strip markdown if present
    );
  } catch (err) {
    console.error("Gemini JSON parse error →", err, "\nRaw text:", text);
    throw new AppError("Invalid JSON returned from Gemini", 500);
  }
};

/**
 * Summarize data for a given role.
 * Returns engaging plain text, no JSON parsing needed.
 */
export const summarizeWithGemini = async (role: string, data: any, userMessage: string) => {
  const prompt = `
You are Vertex, an intelligent task management assistant.
Summarize the following data for a ${role} into 1-2 short, engaging sentences.
Use a friendly and professional tone.
Do NOT return JSON or markdown; return plain text only.

User query: "${userMessage}"

Data:
${JSON.stringify(data)}
`;

  const response = await model.generateContent(prompt);
  const text = response?.response?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

  return text || "No summary available.";
};
