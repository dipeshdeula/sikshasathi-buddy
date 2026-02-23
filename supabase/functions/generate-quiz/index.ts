import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured");

    const { topic, numQuestions, subject, learningOutcomes } = await req.json();

    const systemPrompt = `You are an expert quiz generator for Nepal CDC curriculum (SikshaSathi).
Generate quiz questions for the given topic.

Return a JSON array of question objects with this structure:
[
  {
    "qtype": "mcq",
    "difficulty": "easy|medium|hard",
    "prompt": "Question text",
    "optionsJson": ["Option A", "Option B", "Option C", "Option D"],
    "answerKey": "A",
    "explanation": "Why this is the correct answer"
  }
]

Rules:
- Mix difficulties: ~30% easy, ~40% medium, ~30% hard
- Include mix of question types: mostly MCQ, some true/false
- For true_false: optionsJson should be ["True", "False"]
- Use Nepal-contextualized examples where possible
- Explanations should be educational
IMPORTANT: Return ONLY valid JSON array, no markdown.`;

    const userPrompt = `Generate ${numQuestions || 5} quiz questions about:
- Topic: ${topic}
${subject ? `- Subject: ${subject}` : ''}
${learningOutcomes?.length ? `- Learning Outcomes:\n${learningOutcomes.map((o: string) => `  • ${o}`).join('\n')}` : ''}`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      const t = await response.text();
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      throw new Error(`AI error: ${response.status} ${t}`);
    }

    const aiResult = await response.json();
    const content = aiResult.choices?.[0]?.message?.content || "[]";

    let parsed;
    try {
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
      parsed = JSON.parse(jsonMatch[1].trim());
    } catch {
      parsed = [];
    }

    return new Response(JSON.stringify({ questions: parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("generate-quiz error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
