// Deploy: supabase functions deploy approve-photo
// Set a secret first:  supabase secrets set ADMIN_SECRET=<pick-something-long>
//
// You (the admin) call this after eyeballing a pending upload — see
// scripts/approve.ts for a one-line CLI, or just curl it. It copies the
// image from the private "photos-pending" bucket into the public
// "photos-approved" bucket and marks the row approved; that's the only
// thing that makes a photo visible on the live tree.
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, json } from "../_shared/cors.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const PENDING_BUCKET = "photos-pending";
const APPROVED_BUCKET = "photos-approved";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  if (req.headers.get("x-admin-secret") !== Deno.env.get("ADMIN_SECRET")) {
    return json({ error: "Unauthorized" }, 401);
  }

  const { personId, action } = await req.json().catch(() => ({}));
  if (typeof personId !== "string" || !personId) return json({ error: "Missing personId" }, 400);

  if (action === "reject") {
    await supabase.storage.from(PENDING_BUCKET).remove([`${personId}.jpg`]);
    await supabase
      .from("photo_submissions")
      .update({ status: "rejected", updated_at: new Date().toISOString() })
      .eq("person_id", personId);
    return json({ ok: true, action: "rejected" });
  }

  const path = `${personId}.jpg`;
  const { data: file, error: downloadError } = await supabase.storage.from(PENDING_BUCKET).download(path);
  if (downloadError || !file) return json({ error: "No pending photo for that person." }, 404);

  const { error: uploadError } = await supabase.storage
    .from(APPROVED_BUCKET)
    .upload(path, new Uint8Array(await file.arrayBuffer()), { contentType: "image/jpeg", upsert: true });

  if (uploadError) {
    console.error(uploadError);
    return json({ error: "Could not publish photo." }, 500);
  }

  await supabase
    .from("photo_submissions")
    .update({ status: "approved", updated_at: new Date().toISOString() })
    .eq("person_id", personId);

  await supabase.storage.from(PENDING_BUCKET).remove([path]);

  return json({ ok: true, action: "approved" });
});
