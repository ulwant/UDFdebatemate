create table if not exists public.motion_submissions (
  id uuid primary key default gen_random_uuid(),
  submitted_by uuid not null references auth.users(id) on delete cascade,
  draft jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  review_note text,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.motion_submissions enable row level security;

drop policy if exists "Members can create motion submissions" on public.motion_submissions;
create policy "Members can create motion submissions"
on public.motion_submissions for insert
with check (auth.uid() = submitted_by);

drop policy if exists "Members can read own motion submissions" on public.motion_submissions;
create policy "Members can read own motion submissions"
on public.motion_submissions for select
using (auth.uid() = submitted_by);

drop policy if exists "EB admin can manage motion submissions" on public.motion_submissions;
create policy "EB admin can manage motion submissions"
on public.motion_submissions for all
using (
  exists (
    select 1 from public.profiles
    where profiles.user_id = auth.uid()
      and profiles.system_role in ('eb', 'admin')
  )
)
with check (
  exists (
    select 1 from public.profiles
    where profiles.user_id = auth.uid()
      and profiles.system_role in ('eb', 'admin')
  )
);
