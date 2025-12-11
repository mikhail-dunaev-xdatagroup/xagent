import { GoogleGenAI } from "@google/genai";

const client = new GoogleGenAI({
  vertexai: true,
  project: "x-agent-480613",
  location: "global"
});

export async function askVertex(question: string) {
  const result = await client.models.generateContentStream({
    model: "gemini-3-pro-preview",
    contents: [{ role: "user", parts: [{ text: question }] }]
  });

  let text = "";
  for await (const chunk of result) {
    const part = chunk.candidates?.[0]?.content?.parts?.[0]?.text;
    if (part) text += part;
  }

  return text;
}
