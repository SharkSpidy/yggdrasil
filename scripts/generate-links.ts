/**
 * Run once (and again any time you add new members to data.txt):
 *
 *   npx tsx --env-file=.env.local scripts/generate-links.ts
 *
 * Needs SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the environment
 * (service role, NOT the anon key — this writes to a locked-down table).
 * Get both from Supabase: Project Settings -> API.
 *
 * Reads public/data.txt with the exact same parser the site uses, walks
 * every person AND every spouse, and inserts one row per person into
 * photo_submissions with a fresh random token — skipping anyone who
 * already has a row, so re-running this after adding new family members
 * doesn't reissue (and invalidate) links people already have.
 *
 * Writes upload-links.csv you can open in a spreadsheet and mail-merge.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { parseFamilyText } from "../src/data";
import type { Person } from "../src/types";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BASE_URL = process.env.SITE_BASE_URL ?? "https://your-domain.example";

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in the environment.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

interface LinkRow {
  person_id: string;
  person_name: string;
  token: string;
}

function collectEntries(root: Person): Array<{ personId: string; personName: string }> {
  const entries: Array<{ personId: string; personName: string }> = [];

  const walk = (person: Person) => {
    entries.push({ personId: person.id, personName: person.name });
    if (person.spouse) {
      entries.push({ personId: `${person.id}__spouse`, personName: person.spouse.name });
    }
    person.children?.forEach(walk);
  };

  walk(root);
  return entries;
}

function makeToken(): string {
  return randomBytes(9).toString("base64url"); // 12 url-safe chars
}

async function main() {
  const raw = readFileSync(new URL("../public/data.txt", import.meta.url), "utf-8");
  const root = parseFamilyText(raw);
  const entries = collectEntries(root);

  const { data: existingRows, error: fetchError } = await supabase
    .from("photo_submissions")
    .select("person_id, token, person_name");

  if (fetchError) {
    console.error("Could not read existing rows:", fetchError.message);
    process.exit(1);
  }

  const existing = new Map((existingRows ?? []).map((r) => [r.person_id, r]));
  const toInsert: LinkRow[] = entries
    .filter((e) => !existing.has(e.personId))
    .map((e) => ({ person_id: e.personId, person_name: e.personName, token: makeToken() }));

  if (toInsert.length > 0) {
    const { error: insertError } = await supabase.from("photo_submissions").insert(toInsert);
    if (insertError) {
      console.error("Insert failed:", insertError.message);
      process.exit(1);
    }
  }

  const allRows: LinkRow[] = [
    ...toInsert,
    ...[...existing.values()].map((r) => ({ person_id: r.person_id, person_name: r.person_name, token: r.token })),
  ];

  const csvLines = ["person_name,upload_link", ...allRows.map((r) => `"${r.person_name.replace(/"/g, '""')}",${BASE_URL}/upload/${r.token}`)];
  writeFileSync("upload-links.csv", csvLines.join("\n"), "utf-8");

  console.log(`${toInsert.length} new link(s) created, ${existing.size} already existed.`);
  console.log(`Wrote ${allRows.length} total links to upload-links.csv`);
}

main();
