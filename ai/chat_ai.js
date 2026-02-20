import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

export default async function gemini(prompt) {
  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
  });

  const res = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt
  });

  console.log(res.text);
  return res.text;
}
