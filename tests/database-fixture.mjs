import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
export async function createTestDatabase() {
  const db = new PGlite();
  try {
    // Disposable local Postgres only. No test records are sent to a connected project.
    await db.exec(`
      create role anon; create role authenticated; create role service_role bypassrls;
      create schema auth; create schema storage;
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      create function auth.role() returns text language sql stable as $$select nullif(current_setting('request.jwt.claim.role',true),'')$$;
      grant usage on schema auth,public,storage to anon,authenticated,service_role;
      create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}');
      create table public.profiles(id uuid primary key references auth.users(id),email text,full_name text,avatar_url text,role text check(role in ('student','academician','industry','institution')),created_at timestamptz default now(),updated_at timestamptz default now());
      grant all on public.profiles to authenticated,service_role;
      create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
      create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);
      alter table storage.objects enable row level security;
      grant select,insert,update,delete on storage.objects to authenticated;
      create function storage.foldername(name text) returns text[] language sql immutable as $$select string_to_array(name,'/')$$;
    `);
    await db.exec(
      await readFile(
        new URL(
          "../supabase/migrations/202609210001_real_platform.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    await db.exec(
      await readFile(
        new URL(
          "../supabase/migrations/202609210002_industry_assessments.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    await db.exec(
      await readFile(
        new URL(
          "../supabase/migrations/202609210003_assessment_gated_hiring.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    return db;
  } catch (error) {
    await db.close();
    throw error;
  }
}
