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

    const { title, description, subjectArea, action, moduleTitle, moduleContent } = await req.json();

    let systemPrompt: string;
    let userPrompt: string;

    if (action === "generate_module_content") {
      systemPrompt = `You are an expert educational content creator for SikshaSathi self-learning platform.
Generate comprehensive learning content for a specific module within a learning path.

Return a JSON object with:
{
  "content": "Full lesson content in markdown format, covering theory, key concepts, formulas, and explanations",
  "examples": ["Real-world application example 1", "Example 2", "Example 3"],
  "references": ["Reference/resource link or book 1", "Reference 2", "Reference 3"]
}

Make content engaging, practical, and suitable for self-study. Include Nepal-contextualized examples where appropriate.
IMPORTANT: Return ONLY valid JSON, no markdown fences.`;

      userPrompt = `Generate detailed learning content for this module:
- Module Title: ${moduleTitle}
- Part of Learning Path: ${title}
- Subject Area: ${subjectArea || 'General'}
${moduleContent ? `- Additional context: ${moduleContent}` : ''}`;
    } else {
      systemPrompt = `You are an expert educational curriculum designer for SikshaSathi self-learning platform.
Create a comprehensive, structured learning roadmap for a student who wants to self-study a topic.

Return a JSON object with:
{
  "roadmap": [
    {
      "title": "Module title",
      "description": "Brief description of what this module covers",
      "order_index": 0
    }
  ],
  "estimated_duration": "e.g. 2-3 weeks",
  "prerequisites": ["prerequisite 1", "prerequisite 2"],
  "learning_goals": ["goal 1", "goal 2", "goal 3"]
}

Guidelines:
- Create 5-10 logical modules progressing from fundamentals to advanced
- Each module should be completable in 30-60 minutes
- Include practical application modules
- Add a review/assessment module at the end
- Contextualize for Nepal's educational system where relevant
IMPORTANT: Return ONLY valid JSON, no markdown fences.`;

      userPrompt = `Create a self-learning roadmap for:
- Topic: ${title}
- Description: ${description || 'No additional description'}
- Subject Area: ${subjectArea || 'General'}`;
    }

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
      // Strip markdown fences if present
      let cleaned = content
        .replace(/```json\s*/gi, "")
        .replace(/```\s*/g, "")
        .trim();

      // Find JSON boundaries
      const jsonStart = cleaned.search(/[\{\[]/);
      const jsonEnd = Math.max(cleaned.lastIndexOf('}'), cleaned.lastIndexOf(']'));

      if (jsonStart === -1 || jsonEnd === -1) throw new Error("No JSON found");

      cleaned = cleaned.substring(jsonStart, jsonEnd + 1);

      // Fix common issues
      cleaned = cleaned
        .replace(/,\s*}/g, "}")
        .replace(/,\s*]/g, "]")
        .replace(/[\x00-\x1F\x7F]/g, (ch) => ch === '\n' || ch === '\t' ? ch : "");

      parsed = JSON.parse(cleaned);
    } catch (parseErr) {
      console.error("JSON parse failed:", parseErr, "Raw content:", content.substring(0, 500));
      parsed = { error: "Failed to parse AI response" };
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("generate-learning-path error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
