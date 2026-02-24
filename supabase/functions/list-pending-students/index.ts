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

    // Verify caller is a teacher
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .single();
    if (!roleData || roleData.role !== "TEACHER") throw new Error("Only teachers can list pending students");

    // Get all unverified profiles
    const { data: unverified } = await adminClient
      .from("profiles")
      .select("id, full_name, is_verified, preferred_class_level, preferred_section")
      .eq("is_verified", false);

    if (!unverified || !unverified.length) {
      return new Response(JSON.stringify([]), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Filter to only STUDENT role
    const ids = unverified.map(u => u.id);
    const { data: roles } = await adminClient
      .from("user_roles")
      .select("user_id, role")
      .in("user_id", ids);

    const studentIds = new Set(
      (roles || []).filter(r => r.role === "STUDENT").map(r => r.user_id)
    );

    const result = unverified
      .filter(u => studentIds.has(u.id))
      .map(u => ({
        id: u.id,
        name: u.full_name,
        is_verified: u.is_verified,
        preferred_class_level: u.preferred_class_level,
        preferred_section: u.preferred_section,
      }));

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
