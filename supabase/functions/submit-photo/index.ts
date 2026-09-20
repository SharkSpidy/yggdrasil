// Deploy: supabase functions deploy submit-photo
//
// Public POST endpoint the upload page calls with { token, file }. The
// browser has already cropped the image to a square (see cropImage.ts) —
// this function just validates, stores it in the *private* pending bucket,
// and flips the row to "uploaded" so it shows up for your review. Nothing
// here is visible on the live site until you approve it.
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, json } from "../_shared/cors.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const PENDING_BUCKET = "photos-pending";
const MAX_BYTES = 6 * 1024 * 1024; // 6MB — plenty for a compressed square JPEG

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return json({ error: "Expected multipart form data" }, 400);
  }

  const token = form.get("token");
  const file = form.get("file");

  if (typeof token !== "string" || !token) return json({ error: "Missing token" }, 400);
  if (!(file instanceof File)) return json({ error: "Missing file" }, 400);
  if (!file.type.startsWith("image/")) return json({ error: "File must be an image" }, 400);
  if (file.size > MAX_BYTES) return json({ error: "Image is too large (max 6MB)" }, 400);

  const { data: row, error: lookupError } = await supabase
    .from("photo_submissions")
    .select("person_id")
    .eq("token", token)
    .maybeSingle();

  if (lookupError || !row) return json({ error: "This link isn't valid." }, 404);

  const path = `${row.person_id}.jpg`;
  const bytes = new Uint8Array(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from(PENDING_BUCKET)
    .upload(path, bytes, { contentType: "image/jpeg", upsert: true });

  if (uploadError) {
    console.error(uploadError);
    return json({ error: "Upload failed, please try again." }, 500);
  }

  await supabase
    .from("photo_submissions")
    .update({ storage_path: path, status: "uploaded", updated_at: new Date().toISOString() })
    .eq("token", token);

  return json({ ok: true });
});
