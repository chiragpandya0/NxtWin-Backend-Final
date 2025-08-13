import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY });

export async function POST(req) {
  try {
    const { question, optionA, optionB, context, marketNews } = await req.json();
    if (!question || !optionA || !optionB) return NextResponse.json({ error: "missing_fields" }, { status: 400 });

    const prompt = `
You are a concise, objective market analyst. Given a question, two mutually exclusive options, contextual details, and recent market news, estimate the likelihood (as percentages) that each option is the better/true outcome. Use the context and market news to support your estimate. Output ONLY a JSON object with these keys:
{
  "optionA": "<text of optionA>",
  "optionB": "<text of optionB>",
  "optionA_percent": <number 0-100>,
  "optionB_percent": <number 0-100>,
  "winner": "A" | "B" | "Tie",
  "confidence": <number 0-1>,
  "reasoning": "<brief summary, 2-4 sentences>",
  "market_insights": ["short insight 1", "short insight 2"]
}
Do not include chain-of-thought. Be brief and factual.
Question: ${question}
OptionA: ${optionA}
OptionB: ${optionB}
Context: ${context ?? ""}
MarketNews: ${marketNews ?? ""}
`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-pro",
      contents: prompt,
      temperature: 0.0,
      maxOutputTokens: 800
    });

    const text = response?.text ?? (Array.isArray(response?.candidates) ? response.candidates[0]?.content : "");
    let parsed;
    try {
      parsed = JSON.parse(text.trim());
    } catch (e) {
      const m = text.match(/\{[\s\S]*\}/);
      if (m) parsed = JSON.parse(m[0]);
      else return NextResponse.json({ raw: text }, { status: 200 });
    }

    if (typeof parsed.optionA_percent === "number" && typeof parsed.optionB_percent === "number") {
      return NextResponse.json({ ok: true, data: parsed }, { status: 200 });
    } else {
      return NextResponse.json({ ok: false, raw: parsed }, { status: 200 });
    }
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}