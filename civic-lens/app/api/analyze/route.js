import Groq from "groq-sdk";
import { NextResponse } from "next/server";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY, 
});

export async function POST(request) {
  try {
    const { text, task, question } = await request.json(); // Accepted inputs: text, task, question

    if (!text) {
      return NextResponse.json({ error: "No text provided" }, { status: 400 });
    }

    let systemPrompt = "";
    let userContent = text;

    // 🧠 TASK 1: ANALYZE (The default view)
    if (task === "analyze") {
      systemPrompt = `
        You are CivicLens, an expert Nigerian Legal Assistant.
        Analyze the provided document text.
        1. Cross-reference with the 1999 Constitution and relevant acts (ACJA, Police Act).
        2. Output sections: 📘 Plain English Summary, 🇳🇬 Constitutional Rights Check, 🗣️ Pidgin Breakdown, 🪜 Immediate Action Plan, ⚠️ Red Flags.
        3. Be concise.
      `;
    } 
    // ✍️ TASK 2: DRAFT REPLY (The Letter Writer)
    else if (task === "draft_reply") {
      systemPrompt = `
        You are a Nigerian Lawyer.
        Draft a formal, polite, but firm RESPONSE LETTER to the document provided.
        - Cite relevant laws (like ACJA 2015 for bail).
        - Use standard formal formatting.
        - Keep it defensive but respectful.
      `;
    } 
    // 💬 TASK 3: Q&A (The Consultant)
    else if (task === "question") {
      systemPrompt = `
        You are a Nigerian Legal Consultant.
        The user has uploaded a document (text below) and asked a specific question about it.
        
        USER QUESTION: "${question}"
        
        INSTRUCTIONS:
        - Answer the question DIRECTLY based on the document text and Nigerian Law.
        - If the user asks if something is legal, give a clear "Yes" or "No" and cite the law.
        - Keep the answer under 3 sentences.
        - Speak in simple English.
      `;
    }

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.5,
      max_tokens: 1024,
    });

    const output = chatCompletion.choices[0]?.message?.content || "Error generating output.";

    return NextResponse.json({ analysis: output });

  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}