-- Cyfra — metas compartidas: el dueño de una meta genera un link de
-- invitacion (de un solo uso) para que otra persona, con su propia cuenta
-- de Cyfra, se conecte y pueda tambien aportar a la misma meta. El dueño
-- sigue siendo el unico que puede editarla, eliminarla o invitar a mas
-- gente; un colaborador solo puede ver la meta y depositar/retirar.

create type public.goal_invite_status as enum (
  'PENDING',
  'ACCEPTED',
  'REVOKED'
);

create table public.goal_collaborators (
  id                 uuid primary key default gen_random_uuid(),
  goal_id            uuid not null references public.savings_goals (id) on delete cascade,
  user_id            uuid not null references public.profiles (id) on delete cascade,
  invited_by_user_id uuid not null references public.profiles (id) on delete cascade,
  created_at         timestamptz not null default now(),
  unique (goal_id, user_id)
);

create index goal_collaborators_user_id_idx on public.goal_collaborators (user_id);

create table public.goal_invites (
  id                  uuid primary key default gen_random_uuid(),
  goal_id             uuid not null references public.savings_goals (id) on delete cascade,
  token               text not null unique,
  created_by_user_id  uuid not null references public.profiles (id) on delete cascade,
  status              public.goal_invite_status not null default 'PENDING',
  accepted_by_user_id uuid references public.profiles (id) on delete set null,
  created_at          timestamptz not null default now(),
  accepted_at         timestamptz
);

create index goal_invites_goal_id_idx on public.goal_invites (goal_id);

alter table public.goal_collaborators enable row level security;

-- Both the goal's owner and its collaborators can see who's collaborating;
-- writes only ever happen through the NestJS backend (service role) when
-- an invite is accepted, so there's no insert/delete policy here.
create policy "goal_collaborators_select_related"
  on public.goal_collaborators for select
  using (
    auth.uid() = user_id
    or auth.uid() in (select user_id from public.savings_goals where id = goal_id)
  );

alter table public.goal_invites enable row level security;

-- Invites are only ever read/written by the backend (service role) — the
-- accept flow needs to look up a token before the accepting user has any
-- relationship to the goal yet, which no per-row auth.uid() policy can
-- express safely.
