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

    const { subject, topic, unit, classLevel, teachingGuidelines, assessmentIndicators } = await req.json();

    const systemPrompt = `You are an expert Nepal CDC curriculum teaching guide generator for Navo Ai.
Generate a comprehensive teaching guideline for a Nepal school teacher.

Your response must be a JSON object with exactly these fields:
{
  "teachingScript": "Detailed step-by-step teaching script with timings...",
  "boardwork": "Board layout with ASCII art showing how to organize the board...",
  "referenceLinks": "Reference materials, textbook chapters, online resources...",
  "presentationContent": "Slide-by-slide presentation outline in markdown format..."
}

Guidelines:
- Teaching script should be minute-by-minute with teacher dialogue and student activities
- Include Nepal-specific examples and context
- Boardwork should be a visual ASCII layout
- Reference links should include Nepal CDC resources
- Presentation should be structured as slides
IMPORTANT: Return ONLY valid JSON, no markdown code blocks.`;

    const userPrompt = `Create a teacher guideline for:
- Subject: ${subject}
- Unit: ${unit}
- Topic: ${topic}
- Class Level: ${classLevel}
${teachingGuidelines?.length ? `- CDC Teaching Guidelines:\n${teachingGuidelines.map((g: string) => `  • ${g}`).join('\n')}` : ''}
${assessmentIndicators?.length ? `- Assessment Indicators:\n${assessmentIndicators.map((a: string) => `  • ${a}`).join('\n')}` : ''}`;

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
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
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
      parsed = { teachingScript: content, boardwork: "", referenceLinks: "", presentationContent: "" };
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("generate-teacher-guideline error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
