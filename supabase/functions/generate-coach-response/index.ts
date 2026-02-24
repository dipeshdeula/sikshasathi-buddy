import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
    if (!OPENROUTER_API_KEY) throw new Error("OPENROUTER_API_KEY is not configured");

    const { topic, question, showAnswer, conversationHistory } = await req.json();

    const topicContext = topic && topic !== 'General'
      ? `about "${topic}"`
      : 'on any subject the student asks about';

    const systemPrompt = showAnswer
      ? `You are Navo Ai AI Coach for Nepal CDC curriculum students.
The student asked to see the full answer. Provide a clear, complete explanation ${topicContext}.
Use Nepal-contextualized examples where possible. Be educational and thorough.
Format with markdown for clarity.`
      : `You are Navo Ai AI Coach — a friendly, encouraging learning assistant for Nepal CDC curriculum students.

${topic && topic !== 'General' ? `TOPIC: ${topic}` : 'The student has not selected a specific topic. Answer whatever they ask about.'}

Your approach:
1. NEVER give the full answer directly — guide the student step by step
2. Start with a simplified explanation using Nepal-contextualized examples (markets in Kathmandu, momos, local scenarios)
3. Provide 2-3 progressive hints that build understanding
4. Suggest 2-3 practice questions at the end
5. Use emojis sparingly for friendliness (🤔, 💡, 🎯, 🥟)
6. Keep language simple — these are school students
7. Format with markdown for readability

Return a JSON object with this structure:
{
  "explanation": "Your main guided explanation (markdown formatted)",
  "hints": ["Hint 1", "Hint 2", "Hint 3"],
  "practiceQuestions": ["Question 1", "Question 2", "Question 3"]
}

IMPORTANT: Return ONLY valid JSON, no markdown code blocks.`;

    const messages: any[] = [
      { role: "system", content: systemPrompt },
    ];

    // Include conversation history for context
    if (conversationHistory && Array.isArray(conversationHistory)) {
      for (const msg of conversationHistory.slice(-6)) {
        messages.push({ role: msg.role === 'coach' ? 'assistant' : 'user', content: msg.content });
      }
    }

    messages.push({ role: "user", content: question });

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini",
        messages,
      }),
    });

    if (!response.ok) {
      const t = await response.text();
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please wait a moment and try again." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI error: ${response.status} ${t}`);
    }

    const aiResult = await response.json();
    const content = aiResult.choices?.[0]?.message?.content || "";

    if (showAnswer) {
      return new Response(JSON.stringify({
        explanation: content,
        hints: [],
        practiceQuestions: [],
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Parse structured response
    let parsed;
    try {
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
      parsed = JSON.parse(jsonMatch[1].trim());
    } catch {
      // Fallback: treat entire content as explanation
      parsed = {
        explanation: content,
        hints: [],
        practiceQuestions: [],
      };
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("generate-coach-response error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
