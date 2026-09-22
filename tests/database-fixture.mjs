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
    await db.exec(
      await readFile(
        new URL(
          "../supabase/migrations/202609220001_student_foundation.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    await db.exec(
      await readFile(
        new URL(
          "../supabase/migrations/202609220002_skill_taxonomy.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    await db.exec(
      await readFile(
        new URL(
          "../supabase/migrations/202609220003_learning_goals.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    await db.exec(
      await readFile(
        new URL(
          "../supabase/migrations/202609220004_application_tracking.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    await db.exec(
      await readFile(
        new URL(
          "../supabase/migrations/202609220005_internship_supervision.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    await db.exec(
      await readFile(
        new URL(
          "../supabase/migrations/202609220006_internship_reports.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    await db.exec(
      await readFile(
        new URL(
          "../supabase/migrations/202609220007_completion_certificates.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    await db.exec(
      await readFile(
        new URL(
          "../supabase/migrations/202609220008_learning_programs.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    await db.exec(
      await readFile(
        new URL(
          "../supabase/migrations/202609220009_recruitment_workflow.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    await db.exec(
      await readFile(
        new URL(
          "../supabase/migrations/202609220010_notifications.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    await db.exec(
      await readFile(
        new URL(
          "../supabase/migrations/202609220011_collaboration_workspaces.sql",
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

// Disposable database helper; caller is the opportunity owner.
export async function completeTestInternship(db, app) {
  const owner = (await db.query("select auth.uid() id")).rows[0].id;
  const student = (
    await db.query("select applicant_id from applications where id=$1", [app])
  ).rows[0].applicant_id;
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
    student,
  ]);
  const path = `${student}/${app}/${crypto.randomUUID()}.pdf`;
  await db.query(
    "insert into storage.objects(bucket_id,name) values('internship-reports',$1)",
    [path],
  );
  const report = (
    await db.query(
      "select submit_internship_report($1,'Final','Final work','Completed and documented project work',$2) id",
      [app, path],
    )
  ).rows[0].id;
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
    owner,
  ]);
  await db.query(
    "select review_internship_report($1,'Approved','Reviewed the final project deliverables')",
    [report],
  );
  await db.query("select complete_reviewed_internship($1)", [app]);
}
