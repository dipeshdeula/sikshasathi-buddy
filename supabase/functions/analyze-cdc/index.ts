import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
    if (!OPENROUTER_API_KEY) throw new Error("OPENROUTER_API_KEY is not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) throw new Error("Missing authorization header");

    // User client for RLS validation
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) throw new Error("Unauthorized: " + (userError?.message || "no user"));

    // Admin client for service operations
    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { uploadId, fileContent, gradeName, subjectName } = await req.json();
    if (!fileContent || !uploadId) throw new Error("Missing fileContent or uploadId");

    // Update status to processing
    await supabaseClient.from("cdc_uploads").update({ status: "processing" }).eq("id", uploadId);

    const systemPrompt = `You are an expert curriculum analyst for the Nepal CDC (Curriculum Development Center) education system.
You will receive text content extracted from a CDC curriculum document.

Your task is to extract and structure the curriculum into the following hierarchy:
- Grade/Class Level
- Subject
- Units (with order)
- Topics within each unit (with order, estimated minutes, difficulty level)
- Learning Outcomes for each topic
- Teaching Guidelines for each topic
- Assessment Indicators for each topic

Return a JSON object with this EXACT structure:
{
  "grade": { "name": "Grade 7", "level": "Basic", "academic_year": "2081" },
  "subject": { "name": "Mathematics", "code": "MATH7", "is_compulsory": true, "total_hours_per_year": 160 },
  "units": [
    {
      "title": "Unit Name",
      "description": "Brief description",
      "order_index": 1,
      "estimated_hours": 20,
      "topics": [
        {
          "title": "Topic Name",
          "description": "Brief description",
          "order_index": 1,
          "estimated_minutes": 45,
          "difficulty_level": "Easy|Medium|Hard",
          "learning_outcomes": [
            { "outcome_text": "Student will be able to...", "bloom_level": "Remember|Understand|Apply|Analyze|Evaluate|Create", "competency_level": "Basic|Intermediate|Advanced" }
          ],
          "teaching_guidelines": [
            { "guideline_text": "Use real-world examples...", "method_type": "Discussion|Activity|Demonstration|Practice|Project" }
          ],
          "assessment_indicators": [
            { "indicator_text": "Can solve problems involving...", "assessment_type": "Formative|Summative|Diagnostic" }
          ]
        }
      ]
    }
  ]
}

If the grade or subject is provided by the user, use those values. Otherwise, infer from the document.
Extract as much detail as possible. If information is missing, make reasonable inferences based on Nepal CDC standards.
IMPORTANT: Return ONLY valid JSON, no markdown code blocks or extra text.`;

    const userPrompt = `${gradeName ? `Grade/Class: ${gradeName}\n` : ""}${subjectName ? `Subject: ${subjectName}\n` : ""}\n\nCDC Document Content:\n${fileContent}`;

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
      const errText = await response.text();
      if (response.status === 429) {
        await supabaseClient.from("cdc_uploads").update({ status: "error", error_message: "Rate limited. Please try again later." }).eq("id", uploadId);
        return new Response(JSON.stringify({ error: "Rate limited" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (response.status === 402) {
        await supabaseClient.from("cdc_uploads").update({ status: "error", error_message: "AI credits exhausted." }).eq("id", uploadId);
        return new Response(JSON.stringify({ error: "Payment required" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      throw new Error(`AI gateway error: ${response.status} ${errText}`);
    }

    const aiResult = await response.json();
    const content = aiResult.choices?.[0]?.message?.content || "";

    let extractedData;
    try {
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
      extractedData = JSON.parse(jsonMatch[1].trim());
    } catch (parseErr) {
      await supabaseClient.from("cdc_uploads").update({
        status: "error",
        error_message: "Failed to parse AI response. Try uploading clearer content.",
        extracted_data: { raw: content },
      }).eq("id", uploadId);
      return new Response(JSON.stringify({ error: "Parse error", raw: content }), { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Store extracted data in cdc_uploads but do NOT write to curriculum tables yet.
    // Teacher must approve first via the approve-cdc function.
    const gradeData = extractedData.grade;
    const subjectData = extractedData.subject;
    const unitsData = extractedData.units || [];
    const totalTopics = unitsData.reduce((sum: number, u: any) => sum + (u.topics?.length || 0), 0);

    await supabaseClient.from("cdc_uploads").update({
      status: "analyzed",
      extracted_data: extractedData,
      grade_name: gradeData?.name || null,
      subject_name: subjectData?.name || null,
      processed_at: new Date().toISOString(),
    }).eq("id", uploadId);

    return new Response(JSON.stringify({
      success: true,
      grade: gradeData?.name,
      subject: subjectData?.name,
      units: unitsData.length,
      topics: totalTopics,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("analyze-cdc error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
