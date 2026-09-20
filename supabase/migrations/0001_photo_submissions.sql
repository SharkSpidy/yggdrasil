-- Run this once in Supabase: Dashboard -> SQL Editor -> New query -> paste -> Run.

create extension if not exists pgcrypto;

create table if not exists photo_submissions (
  id uuid primary key default gen_random_uuid(),
  person_id text not null,          -- matches Person.id from data.ts, or "<id>__spouse"
  person_name text not null,        -- shown on the upload page ("Hi, Ajit!")
  token text not null unique,       -- the secret in the link you send out
  storage_path text,                -- filled in once they upload, e.g. "g3-014.jpg"
  status text not null default 'pending'
    check (status in ('pending', 'uploaded', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists photo_submissions_token_idx on photo_submissions (token);
create index if not exists photo_submissions_status_idx on photo_submissions (status);

-- Lock this table down completely from the browser. Nobody gets to read or
-- write it with the public anon key — only the Edge Functions below, which
-- use the *service role* key (server-side only, never shipped to the site).
alter table photo_submissions enable row level security;
-- No policies are created, which means: zero access for anon/authenticated.
-- Everything goes through the three Edge Functions instead.
