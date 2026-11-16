create schema if not exists feiya_private;
revoke all on schema feiya_private from public, anon;
grant usage on schema feiya_private to authenticated;

-- Feiya account roles are assigned only through privileged deployment tools.
create table if not exists public.feiya_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  role text not null check (role in ('user','admin'))
);
create table if not exists public.feiya_workspaces (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  revision bigint not null default 0,
  payload jsonb not null default '{"sessions":[],"beans":[],"records":[]}'::jsonb,
  updated_at timestamptz not null default now(),
  check (octet_length(payload::text) <= 20000000)
);
alter table public.feiya_profiles enable row level security;
alter table public.feiya_workspaces enable row level security;
revoke all on public.feiya_profiles,public.feiya_workspaces from anon, authenticated;
grant select on public.feiya_profiles,public.feiya_workspaces to authenticated;
drop policy if exists profile_self on public.feiya_profiles;
create policy profile_self on public.feiya_profiles for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists workspace_self on public.feiya_workspaces;
create policy workspace_self on public.feiya_workspaces for select to authenticated using (owner_id = (select auth.uid()) and exists (select 1 from public.feiya_profiles p where p.user_id=auth.uid()));
create or replace function feiya_private.feiya_save_workspace(expected_revision bigint, document jsonb)
returns bigint language plpgsql security definer set search_path = '' as $$
declare next_revision bigint; actor uuid := auth.uid();
begin
 if actor is null or not exists(select 1 from public.feiya_profiles where user_id=actor) then raise exception 'access_denied' using errcode='42501'; end if;
 if document is null or jsonb_typeof(document->'sessions') is distinct from 'array' or jsonb_typeof(document->'beans') is distinct from 'array' or jsonb_typeof(document->'records') is distinct from 'array' then raise exception 'invalid_document'; end if;
 if octet_length(document::text)>20000000 then raise exception 'document_too_large'; end if;
 insert into public.feiya_workspaces(owner_id) values(actor) on conflict do nothing;
 update public.feiya_workspaces set payload=jsonb_build_object('sessions',document->'sessions','beans',document->'beans','records',document->'records'), revision=revision+1,updated_at=now() where owner_id=actor and revision=expected_revision returning revision into next_revision;
 if next_revision is null then raise exception 'revision_conflict' using errcode='40001'; end if;
 return next_revision;
end $$;
create or replace function feiya_private.feiya_admin_review()
returns table(username text,owner_id uuid,revision bigint,payload jsonb,updated_at timestamptz)
language plpgsql security definer set search_path = '' as $$
begin
 if auth.uid() is null or not exists(select 1 from public.feiya_profiles p where p.user_id=auth.uid() and p.role='admin') then raise exception 'admin_required' using errcode='42501'; end if;
 return query select p.username,w.owner_id,w.revision,w.payload,w.updated_at from public.feiya_workspaces w join public.feiya_profiles p on p.user_id=w.owner_id order by w.updated_at desc;
end $$;
revoke all on function feiya_private.feiya_save_workspace(bigint,jsonb) from public,anon;
revoke all on function feiya_private.feiya_admin_review() from public,anon;
grant execute on function feiya_private.feiya_save_workspace(bigint,jsonb) to authenticated;
grant execute on function feiya_private.feiya_admin_review() to authenticated;

create or replace function public.feiya_save_workspace(expected_revision bigint, document jsonb)
returns bigint language sql security invoker set search_path = '' as $$
 select feiya_private.feiya_save_workspace(expected_revision, document);
$$;
create or replace function public.feiya_admin_review()
returns table(username text,owner_id uuid,revision bigint,payload jsonb,updated_at timestamptz)
language sql security invoker set search_path = '' as $$
 select * from feiya_private.feiya_admin_review();
$$;
revoke all on function public.feiya_save_workspace(bigint,jsonb) from public,anon;
revoke all on function public.feiya_admin_review() from public,anon;
grant execute on function public.feiya_save_workspace(bigint,jsonb) to authenticated;
grant execute on function public.feiya_admin_review() to authenticated;
