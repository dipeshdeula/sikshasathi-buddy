import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) throw new Error("Unauthorized");

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .single();
    if (!roleData || roleData.role !== "TEACHER") throw new Error("Only teachers can verify students");

    const { student_id, class_id, class_level, section } = await req.json();
    if (!student_id) throw new Error("Missing student_id");

    // Update profile: verified + optional class info
    const profileUpdate: Record<string, any> = { is_verified: true };
    if (class_level) profileUpdate.preferred_class_level = class_level;
    if (section) profileUpdate.preferred_section = section;

    await adminClient.from("profiles").update(profileUpdate).eq("id", student_id);

    // If class_id provided, verify teacher owns it and add student
    if (class_id) {
      const { data: classData } = await adminClient
        .from("classes")
        .select("id")
        .eq("id", class_id)
        .eq("teacher_id", caller.id)
        .single();
      if (!classData) throw new Error("You don't own this class");

      // Insert (ignore duplicate)
      const { error: linkErr } = await adminClient
        .from("class_students")
        .insert({ class_id, student_id });
      if (linkErr && !linkErr.message.includes("duplicate")) throw linkErr;
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
