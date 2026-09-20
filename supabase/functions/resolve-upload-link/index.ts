// Deploy: supabase functions deploy resolve-upload-link
//
// Public GET endpoint the upload page calls first, to turn a secret token
// into "hi, you're uploading a photo for <name>" (or a clear error if the
// link is wrong/expired). Uses the service-role key server-side so the
// underlying table never has to be readable from the browser.
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, json } from "../_shared/cors.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "GET") return json({ error: "Method not allowed" }, 405);

  const token = new URL(req.url).searchParams.get("token");
  if (!token) return json({ error: "Missing token" }, 400);

  const { data, error } = await supabase
    .from("photo_submissions")
    .select("person_name, status")
    .eq("token", token)
    .maybeSingle();

  if (error || !data) return json({ error: "This link isn't valid." }, 404);

  return json({ personName: data.person_name, status: data.status });
});
