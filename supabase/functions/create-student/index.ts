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

    // Verify the caller is a teacher
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) throw new Error("Unauthorized");

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Check caller is a teacher
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .single();
    if (!roleData || roleData.role !== "TEACHER") throw new Error("Only teachers can create students");

    const { full_name, email, password, class_id } = await req.json();
    if (!full_name || !email || !password || !class_id) throw new Error("Missing required fields");

    // Verify the teacher owns this class
    const { data: classData } = await adminClient
      .from("classes")
      .select("id")
      .eq("id", class_id)
      .eq("teacher_id", caller.id)
      .single();
    if (!classData) throw new Error("You don't own this class");

    // Create the student auth user via admin API
    const { data: newUser, error: createErr } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name, role: "STUDENT" },
    });
    if (createErr) throw createErr;

    // Mark as verified (teacher-created students are auto-verified)
    await adminClient
      .from("profiles")
      .update({ is_verified: true })
      .eq("id", newUser.user.id);

    // Add student to class
    const { error: linkErr } = await adminClient
      .from("class_students")
      .insert({ class_id, student_id: newUser.user.id });
    if (linkErr) throw linkErr;

    return new Response(JSON.stringify({ success: true, student_id: newUser.user.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
