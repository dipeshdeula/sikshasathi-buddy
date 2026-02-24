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

    const { studentName, masteryScores } = await req.json();

    const topicLines = Object.entries(masteryScores as Record<string, number>)
      .map(([topic, score]) => `- ${topic}: ${score}%`)
      .join("\n");

    const systemPrompt = `You are Navo Ai, an AI assistant for teachers in Nepal CDC curriculum schools.
Generate a concise weekly progress report for a parent about their child's academic performance.

STUDENT: ${studentName}
MASTERY SCORES:
${topicLines || "No mastery data available yet."}

Return a JSON object with:
{
  "reportText": "A 3-5 sentence summary of the student's weekly progress, mentioning strong and weak areas. Use simple language suitable for parents. Mention the student by name.",
  "interventionsText": "2-3 specific, actionable home interventions parents can do. Numbered list. Keep simple and practical for Nepal context."
}

IMPORTANT: Return ONLY valid JSON, no markdown code blocks.`;

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini",
        messages: [{ role: "system", content: systemPrompt }, { role: "user", content: `Generate the weekly report for ${studentName}.` }],
      }),
    });

    if (!response.ok) {
      const t = await response.text();
      throw new Error(`AI error: ${response.status} ${t}`);
    }

    const aiResult = await response.json();
    const content = aiResult.choices?.[0]?.message?.content || "";

    let parsed;
    try {
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
      parsed = JSON.parse(jsonMatch[1].trim());
    } catch {
      parsed = {
        reportText: `Weekly Progress Report for ${studentName}: Good effort this week.`,
        interventionsText: "1. Practice weak topics daily.\n2. Ask your child to explain what they learned.",
      };
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("generate-weekly-report error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
