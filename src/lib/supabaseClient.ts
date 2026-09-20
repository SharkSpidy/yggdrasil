import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  // Not fatal — the tree still renders with placeholder photos — but the
  // upload flow and approved-photo lookup are no-ops without these.
  console.warn("VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are not set — photo features are disabled.");
}

export const supabase = SUPABASE_URL && SUPABASE_ANON_KEY ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

const FUNCTIONS_BASE = SUPABASE_URL ? `${SUPABASE_URL}/functions/v1` : "";

/** Calls one of the Edge Functions in supabase/functions, attaching the
 *  anon key the platform expects on every function invocation (this is
 *  just the public key — the functions do their own token-based auth
 *  on top of it using the service-role key server-side). */
async function callFunction<T>(name: string, init: RequestInit = {}): Promise<T> {
  if (!FUNCTIONS_BASE || !SUPABASE_ANON_KEY) throw new Error("Supabase is not configured.");

  const res = await fetch(`${FUNCTIONS_BASE}/${name}`, {
    ...init,
    headers: {
      ...init.headers,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      apikey: SUPABASE_ANON_KEY,
    },
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.error ?? `Request failed (${res.status})`);
  return body as T;
}

export interface ResolveLinkResult {
  personName: string;
  status: "pending" | "uploaded" | "approved" | "rejected";
}

export function resolveUploadLink(token: string): Promise<ResolveLinkResult> {
  return callFunction<ResolveLinkResult>(`resolve-upload-link?token=${encodeURIComponent(token)}`);
}

export function submitPhoto(token: string, file: Blob): Promise<{ ok: true }> {
  const form = new FormData();
  form.set("token", token);
  form.set("file", file, "photo.jpg");
  return callFunction<{ ok: true }>("submit-photo", { method: "POST", body: form });
}

const APPROVED_BUCKET = "photos-approved";

/** Every id in here has a live, approved photo. Called once on app load
 *  (and again on a slow interval) so newly-approved photos show up without
 *  a redeploy. */
export async function fetchApprovedPhotoMap(): Promise<Record<string, string>> {
  if (!supabase) return {};

  const { data, error } = await supabase.storage.from(APPROVED_BUCKET).list("", { limit: 1000 });
  if (error || !data) return {};

  const map: Record<string, string> = {};
  for (const file of data) {
    if (!file.name.toLowerCase().endsWith(".jpg")) continue;
    const personId = file.name.slice(0, -4);
    const { data: pub } = supabase.storage.from(APPROVED_BUCKET).getPublicUrl(file.name);
    map[personId] = pub.publicUrl;
  }
  return map;
}
