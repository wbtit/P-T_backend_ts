import { VertexAI } from "@google-cloud/vertexai";
import { AppError } from "../../../config/utils/AppError";

const vertexAI = new VertexAI({
  project: process.env.GCP_PROJECT_ID,
  location: process.env.GCP_LOCATION,
});

const model = vertexAI.getGenerativeModel({ model: "gemini-1.5-pro" });

export const getIntentFromGemini = async (query: string) => {
  const prompt = `
  You are an intent classifier for a task management system.
  Given the user's natural language query, return a JSON object:
  { "type": "<INTENT>", "projectId": null }

  Supported intents:
  -"GET_ALL_TASKS",
  -"GET_ALL_PROJECTS"
  User query: "${query}"
  `;

  const response = await model.generateContent(prompt);

  const candidates = response?.response?.candidates;
  const text = candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new AppError("Failed to parse Gemini response", 500);
  }

  try {
    return JSON.parse(text);
  } catch (err) {
    throw new AppError("Invalid JSON returned from Gemini", 500);
  }
};

export const summarizeWithGemini = async (role: string, data: any) => {
  const prompt = `
  Summarize this data for a ${role}.
  Use short natural language sentences.
  Data: ${JSON.stringify(data)}
  `;

  const response = await model.generateContent(prompt);

  const candidates = response?.response?.candidates;
  const text = candidates?.[0]?.content?.parts?.[0]?.text;

  return text || "No summary available.";
};
