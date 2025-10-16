import { VertexAI, type GenerateContentResult } from "@google-cloud/vertexai";

async function main() {
  const vertexAI = new VertexAI({
    project: "cobalt-mind-474506-q5",
    location: "us-central1", // ✅ Valid region
    googleAuthOptions: { keyFile: "./keys/vertex-ai-agent-key.json" },

  });

  // Gemini model reference
  const model = vertexAI.getGenerativeModel({
    model: "projects/google/models/gemini-1.5-pro",
  });

  try {
    // Type-safe inference
    const result: GenerateContentResult = await model.generateContent("Hello Gemini!");

    // Optional chaining + fallback
    const text =
      result?.response?.candidates?.[0]?.content?.parts?.[0]?.text ??
      "⚠️ No response from model";

    console.log("Gemini says:", text);

  } catch (error) {
    console.error("❌ Vertex AI request failed:", error);
  }
}

main().catch(console.error);
