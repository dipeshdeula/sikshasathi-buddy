import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error("Missing Supabase credentials");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) throw new Error("Missing authorization header");

    // Verify user
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || SUPABASE_SERVICE_ROLE_KEY;
    const anonClient = createClient(SUPABASE_URL, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await anonClient.auth.getUser(token);
    if (claimsError || !claimsData?.user) throw new Error("Unauthorized");

    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { uploadId } = await req.json();
    if (!uploadId) throw new Error("Missing uploadId");

    // Fetch the upload record
    const { data: upload, error: fetchErr } = await supabaseClient
      .from("cdc_uploads")
      .select("*")
      .eq("id", uploadId)
      .single();

    if (fetchErr || !upload) throw new Error("Upload not found");
    if (upload.status !== "analyzed") throw new Error(`Upload status is '${upload.status}', expected 'analyzed'`);

    const extractedData = upload.extracted_data as any;
    if (!extractedData) throw new Error("No extracted data found");

    const gradeData = extractedData.grade;
    const subjectData = extractedData.subject;
    const unitsData = extractedData.units || [];

    // Upsert grade
    let gradeId: string;
    const { data: existingGrade } = await supabaseClient
      .from("grades")
      .select("id")
      .eq("name", gradeData.name)
      .maybeSingle();

    if (existingGrade) {
      gradeId = existingGrade.id;
    } else {
      const { data: newGrade } = await supabaseClient
        .from("grades")
        .insert({ name: gradeData.name, level: gradeData.level || "Basic", academic_year: gradeData.academic_year || "2081" })
        .select("id")
        .single();
      gradeId = newGrade!.id;
    }

    // Upsert subject
    let subjectId: string;
    const { data: existingSubject } = await supabaseClient
      .from("subjects")
      .select("id")
      .eq("name", subjectData.name)
      .eq("grade_id", gradeId)
      .maybeSingle();

    if (existingSubject) {
      subjectId = existingSubject.id;
    } else {
      const { data: newSubject } = await supabaseClient
        .from("subjects")
        .insert({
          name: subjectData.name, code: subjectData.code || "", grade_id: gradeId,
          is_compulsory: subjectData.is_compulsory ?? true,
          total_hours_per_year: subjectData.total_hours_per_year || null,
        })
        .select("id")
        .single();
      subjectId = newSubject!.id;
    }

    // Insert units, topics, and metadata
    let totalTopics = 0;
    for (const unit of unitsData) {
      const { data: newUnit } = await supabaseClient
        .from("units")
        .insert({
          subject_id: subjectId,
          title: unit.title,
          description: unit.description || "",
          order_index: unit.order_index || 0,
          estimated_hours: unit.estimated_hours || null,
        })
        .select("id")
        .single();

      if (!newUnit) continue;

      for (const topic of (unit.topics || [])) {
        const { data: newTopic } = await supabaseClient
          .from("topics")
          .insert({
            unit_id: newUnit.id,
            title: topic.title,
            description: topic.description || "",
            order_index: topic.order_index || 0,
            estimated_minutes: topic.estimated_minutes || null,
            difficulty_level: topic.difficulty_level || "Medium",
          })
          .select("id")
          .single();

        if (!newTopic) continue;
        totalTopics++;

        const outcomes = (topic.learning_outcomes || []).map((lo: any) => ({
          topic_id: newTopic.id,
          outcome_text: lo.outcome_text,
          bloom_level: lo.bloom_level || null,
          competency_level: lo.competency_level || null,
        }));
        if (outcomes.length > 0) {
          await supabaseClient.from("learning_outcomes").insert(outcomes);
        }

        const guidelines = (topic.teaching_guidelines || []).map((tg: any) => ({
          topic_id: newTopic.id,
          guideline_text: tg.guideline_text,
          method_type: tg.method_type || null,
        }));
        if (guidelines.length > 0) {
          await supabaseClient.from("teaching_guidelines").insert(guidelines);
        }

        const indicators = (topic.assessment_indicators || []).map((ai: any) => ({
          topic_id: newTopic.id,
          indicator_text: ai.indicator_text,
          assessment_type: ai.assessment_type || null,
        }));
        if (indicators.length > 0) {
          await supabaseClient.from("assessment_indicators").insert(indicators);
        }
      }
    }

    // Update status to completed (approved)
    await supabaseClient.from("cdc_uploads").update({
      status: "completed",
    }).eq("id", uploadId);

    return new Response(JSON.stringify({
      success: true,
      grade: gradeData.name,
      subject: subjectData.name,
      units: unitsData.length,
      topics: totalTopics,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("approve-cdc error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
