import { VertexAI } from "@google-cloud/vertexai";

const vertexAI = new VertexAI({
  project: "x-agent-480613",
  location: "us-central1"
});

const generativeModel = vertexAI.getGenerativeModel({
  model: "gemini-2.5-pro"
});

export async function askVertex(question: string) {
  const stream = await generativeModel.generateContentStream({
    contents: [
      {
        role: "user",
        parts: [{ text: question }]
      }
    ]
  });

  const response = await stream.response;
  return response.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

askVertex('What is the capital of France?').then(console.log).catch(console.error);