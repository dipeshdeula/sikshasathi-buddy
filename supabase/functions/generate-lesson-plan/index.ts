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

    const { subject, topic, unit, classLevel, durationType, learningOutcomes } = await req.json();

    const systemPrompt = `You are an expert Nepal CDC curriculum-aligned lesson planner for SikshaSathi.
Generate a detailed, practical lesson plan for Nepal's school system.

Your response must be a JSON object with exactly these fields:
{
  "objectives": "Detailed lesson objectives...",
  "homework": "Homework and assessment tasks..."
}

Guidelines:
- Write clear, specific, measurable learning objectives
- Align with Nepal CDC standards and Bloom's taxonomy
- Include Nepal-contextualized examples (markets, festivals, geography)
- Homework should include varied activities: practice problems, real-world applications, and reflection
- Adapt difficulty based on the class level (Low/Medium/High)
- Duration type affects scope: Daily (45 min), Weekly (5 sessions), Monthly (comprehensive)
IMPORTANT: Return ONLY valid JSON, no markdown.`;

    const userPrompt = `Create a ${durationType} lesson plan for:
- Subject: ${subject}
- Unit: ${unit}
- Topic: ${topic}
- Class Level: ${classLevel}
${learningOutcomes?.length ? `- CDC Learning Outcomes:\n${learningOutcomes.map((o: string) => `  • ${o}`).join('\n')}` : ''}`;

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      const t = await response.text();
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, please try again later." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      throw new Error(`AI error: ${response.status} ${t}`);
    }

    const aiResult = await response.json();
    const content = aiResult.choices?.[0]?.message?.content || "";

    let parsed;
    try {
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
      parsed = JSON.parse(jsonMatch[1].trim());
    } catch {
      parsed = { objectives: content, homework: "" };
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("generate-lesson-plan error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
