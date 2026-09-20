/**
 * Usage:
 *   npx tsx --env-file=.env.local scripts/approve.ts g3-014
 *   npx tsx --env-file=.env.local scripts/approve.ts g3-014 reject
 *
 * Needs SUPABASE_URL and ADMIN_SECRET in the environment. ADMIN_SECRET must
 * match whatever you set with `supabase secrets set ADMIN_SECRET=...`.
 *
 * Before approving, go look at the pending photo first — Supabase Dashboard
 * -> Storage -> photos-pending -> <personId>.jpg.
 */
const SUPABASE_URL = process.env.SUPABASE_URL;
const ADMIN_SECRET = process.env.ADMIN_SECRET;

const [personId, action] = process.argv.slice(2);

if (!SUPABASE_URL || !ADMIN_SECRET) {
  console.error("Missing SUPABASE_URL or ADMIN_SECRET in the environment.");
  process.exit(1);
}
if (!personId) {
  console.error("Usage: tsx scripts/approve.ts <personId> [reject]");
  process.exit(1);
}

const res = await fetch(`${SUPABASE_URL}/functions/v1/approve-photo`, {
  method: "POST",
  headers: {
    "content-type": "application/json",
    "x-admin-secret": ADMIN_SECRET,
  },
  body: JSON.stringify({ personId, action: action === "reject" ? "reject" : "approve" }),
});

const body = await res.json();
if (!res.ok) {
  console.error("Failed:", body.error ?? res.statusText);
  process.exit(1);
}
console.log(body);
