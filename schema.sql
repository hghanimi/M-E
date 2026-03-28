-- ============================================================
--  schema.sql
--  Run this ONCE in your Supabase SQL Editor:
--  https://supabase.com/dashboard → your project → SQL Editor
-- ============================================================


-- ── 1. portfolio_data ────────────────────────────────────────────────────
--  Holds exactly ONE row (id = 1).  The pipeline overwrites it on every run.
--  The public frontend reads this via the anon key + Supabase Realtime.

create table if not exists public.portfolio_data (
    id          bigint primary key,          -- always 1
    data        jsonb  not null,             -- the full anonymised portfolio JSON
    updated_at  timestamptz default now()    -- timestamp of last pipeline run
);

-- Enable Row Level Security
alter table public.portfolio_data enable row level security;

-- Allow anyone (including the public website) to read the single row.
-- Only the service-role key (pipeline) can write to this table.
drop policy if exists "Public read-only access" on public.portfolio_data;

create policy "Public read-only access"
    on public.portfolio_data
    for select
    using (true);


-- ── 2. processed_files ───────────────────────────────────────────────────
--  Tracks which storage bucket files have already been ingested so the
--  pipeline never processes the same document twice.

create table if not exists public.processed_files (
    file_name    text        primary key,
    processed_at timestamptz default now()
);

-- Only the pipeline (service-role key) needs to access this table.
alter table public.processed_files enable row level security;

-- No public policy needed — the pipeline uses the service-role key which
-- bypasses RLS entirely.


-- ── 3. Enable Realtime for portfolio_data ────────────────────────────────
--  This makes the Cloudflare Pages frontend auto-update whenever the
--  pipeline upserts new data — no page refresh or re-deployment needed.

do $$
begin
    if not exists (
        select 1
        from pg_publication_tables
        where pubname = 'supabase_realtime'
          and schemaname = 'public'
          and tablename = 'portfolio_data'
    ) then
        alter publication supabase_realtime add table public.portfolio_data;
    end if;
end $$;


-- ── 4. Seed an empty row so the frontend always has something to read ────

insert into public.portfolio_data (id, data, updated_at)
values (
    1,
    '{
        "total_beneficiaries_reached": 0,
        "thematic_areas": [],
        "summary_STAR_studies": [],
        "geographic_countries": [],
        "tool_expertise": [],
        "donor_list": []
    }'::jsonb,
    now()
)
on conflict (id) do nothing;
