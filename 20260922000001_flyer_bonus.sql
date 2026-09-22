-- ============================================================
-- 20260922000001_flyer_bonus.sql
-- Bónus "Ganha um bónus de 700 Kz ao imprimir e colar o nosso flyer".
-- Fluxo (aprovado em design): o agente baixa o flyer, imprime e cola junto
-- a um ATM PRÓPRIO APROVADO, fotografa pelo app com GPS no momento e o
-- bónus é creditado automaticamente quando o total de views do agente
-- atinge flyer_views_unlock (30 por defeito). A validação de distância
-- (≤ flyer_proximity_m, 200 m por defeito) é RECALCULADA no servidor
-- (RPC SECURITY DEFINER).
-- Aplicar no Supabase Staging: https://ndvjitfovhfngrzwtytd.supabase.co
-- Executar com o role postgres (SQL editor). Idempotente.
-- ORDEM: aplicar ANTES de testar o fluxo no app.
-- ============================================================

-- ------------------------------------------------------------
-- 0. app_settings — valores do bónus (editáveis via painel web)
-- ------------------------------------------------------------
insert into public.app_settings (key, value, description)
values
  ('flyer_bonus_kz', '700', 'Bónus em Kz por imprimir e colar o flyer (creditado quando o agente atinge flyer_views_unlock views)'),
  ('flyer_proximity_m', '200', 'Distância máxima (metros) do GPS da foto ao ATM aprovado'),
  ('flyer_views_unlock', '30', 'Total de views do agente necessárias para desbloquear o bónus do flyer')
on conflict (key) do update
set value = excluded.value,
    description = excluded.description,
    updated_at = now();

-- ------------------------------------------------------------
-- 1. Tabela flyer_submissions (uma submissão activa por agente)
-- ------------------------------------------------------------
create table if not exists public.flyer_submissions (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.profiles(user_id) on delete cascade,
  atm_id uuid not null references public.atms(id),
  photo_url text not null,
  latitude double precision not null,
  longitude double precision not null,
  distance_m double precision not null,
  status text not null default 'submitted'
    check (status in ('submitted', 'approved', 'rejected', 'rewarded')),
  amount_kz numeric(12, 2) not null default 0,
  obs text,
  review_notes text,
  created_at timestamptz not null default now()
);

create index if not exists flyer_submissions_agent_id_idx
  on public.flyer_submissions (agent_id);
create index if not exists flyer_submissions_status_idx
  on public.flyer_submissions (status);

-- 1 bónus por agente: em 'submitted'/'approved'/'rewarded' nunca há 2 linhas.
-- 'rejected' fica de fora para permitir nova submissão.
create unique index if not exists flyer_submissions_active_agent_unique
  on public.flyer_submissions (agent_id)
  where status in ('submitted', 'approved', 'rewarded');

-- RLS: o agente vê as PRÓPRIAS submissões; admin/supervisor vêem todas.
alter table public.flyer_submissions enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'flyer_submissions_select_own' and tablename = 'flyer_submissions') then
    create policy "flyer_submissions_select_own"
      on public.flyer_submissions for select to authenticated
      using (agent_id = auth.uid());
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'flyer_submissions_select_admin' and tablename = 'flyer_submissions') then
    create policy "flyer_submissions_select_admin"
      on public.flyer_submissions for select to authenticated
      using (has_role(auth.uid(), 'admin'::app_role) or has_role(auth.uid(), 'supervisor'::app_role));
  end if;
end $$;

-- Criação apenas via RPC (segurança): sem policies de INSERT/UPDATE/DELETE own.

-- ------------------------------------------------------------
-- 2. Bucket flyer-photos (privado) — policies espelhadas de atm-photos
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('flyer-photos', 'flyer-photos', false)
on conflict (id) do nothing;

do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'Agents upload own flyer photos' and tablename = 'objects') then
    create policy "Agents upload own flyer photos"
      on storage.objects for insert to authenticated
      with check (
        bucket_id = 'flyer-photos'
        and auth.uid()::text = (storage.foldername(name))[1]
      );
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'Agents view own flyer photos' and tablename = 'objects') then
    create policy "Agents view own flyer photos"
      on storage.objects for select to authenticated
      using (
        bucket_id = 'flyer-photos'
        and auth.uid()::text = (storage.foldername(name))[1]
      );
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'Admins view all flyer photos' and tablename = 'objects') then
    create policy "Admins view all flyer photos"
      on storage.objects for select to authenticated
      using (
        bucket_id = 'flyer-photos'
        and (has_role(auth.uid(), 'admin'::app_role) or has_role(auth.uid(), 'supervisor'::app_role))
      );
  end if;
end $$;

-- ------------------------------------------------------------
-- 3. RPC create_flyer_submission — submissão com GPS do momento
--    Valida ATM PRÓPRIO aprovado + distância ≤ flyer_proximity_m (servidor)
-- ------------------------------------------------------------
create or replace function public.create_flyer_submission(
  p_atm_id uuid,
  p_lat double precision,
  p_lng double precision,
  p_photo_url text,
  p_obs text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_agent_id uuid;
  v_lat double precision;
  v_lng double precision;
  v_bank text;
  v_proximity_m numeric;
  v_prox_value text;
  v_distance_m double precision;
  v_agent_ok boolean;
  v_new_id uuid;
begin
  if v_user is null then
    raise exception 'Não autenticado.';
  end if;
  if p_atm_id is null or p_photo_url is null or p_photo_url = '' then
    raise exception 'Dados incompletos.';
  end if;
  if p_lat is null or p_lng is null then
    raise exception 'Localização (GPS) em falta.';
  end if;

  -- Deve ser agente
  select exists (
    select 1 from public.user_roles ur
    where ur.user_id = v_user and ur.role = 'agent'::app_role
  ) into v_agent_ok;

  if not v_agent_ok then
    raise exception 'Apenas agentes podem submeter o bónus do flyer.';
  end if;

  -- 1 bónus por agente
  if exists (
    select 1 from public.flyer_submissions fs
    where fs.agent_id = v_user
      and fs.status in ('submitted', 'approved', 'rewarded')
  ) then
    raise exception 'Já tens um pedido de bónus do flyer em curso.';
  end if;

  -- ATM PRÓPRIO aprovado (e não eliminado)
  select at.agent_id into v_agent_id
  from public.atms at
  where at.id = p_atm_id
    and at.status_approval = 'approved'
    and at.deleted_at is null;

  if v_agent_id is null then
    raise exception 'ATM não encontrado ou não aprovado.';
  end if;
  if v_agent_id <> v_user then
    raise exception 'Escolhe um ATM que te pertença.';
  end if;

  select at.latitude, at.longitude, at.bank_name into v_lat, v_lng, v_bank
  from public.atms at
  where at.id = p_atm_id;

  if v_lat is null or v_lng is null then
    raise exception 'Este ATM não tem coordenadas registadas — submissão manual.';
  end if;

  -- Distância recalculada no servidor (haversine, metros)
  v_distance_m := 6371000 * 2 * asin(
    sqrt(
      power(sin(radians((p_lat - v_lat) / 2)), 2)
      + cos(radians(v_lat)) * cos(radians(p_lat))
        * power(sin(radians((p_lng - v_lng) / 2)), 2)
    )
  );

  -- Limite de proximidade (setting com fallback 200)
  select value into v_prox_value
  from public.app_settings
  where key = 'flyer_proximity_m'
  limit 1;

  if v_prox_value is null or v_prox_value !~ '^[0-9]+(\.[0-9]+)?$' then
    v_proximity_m := 200;
  else
    v_proximity_m := v_prox_value::numeric;
  end if;

  if v_distance_m > v_proximity_m then
    raise exception 'Estás a % metros do ATM — o máximo permitido é % m.', round(v_distance_m)::int, round(v_proximity_m)::int;
  end if;

  insert into public.flyer_submissions
    (agent_id, atm_id, photo_url, latitude, longitude, distance_m, status, amount_kz, obs)
  values
    (v_user, p_atm_id, p_photo_url, p_lat, p_lng, v_distance_m, 'submitted', 0, p_obs)
  returning id into v_new_id;

  -- Notifica admin + supervisor para rever
  perform public.notify_users_by_role(
    'admin',
    'Novo flyer para aprovar',
    'Um agente submeteu uma foto do flyer junto ao ATM «' || v_bank || '». Reveja a fila de aprovações.',
    'info'
  );
  perform public.notify_users_by_role(
    'supervisor',
    'Novo flyer para aprovar',
    'Um agente submeteu uma foto do flyer junto ao ATM «' || v_bank || '». Reveja a fila de aprovações.',
    'info'
  );

  return v_new_id;
end;
$$;

revoke all on function public.create_flyer_submission(uuid, double precision, double precision, text, text) from public, anon;
grant execute on function public.create_flyer_submission(uuid, double precision, double precision, text, text) to authenticated;

-- ------------------------------------------------------------
-- 4. Núcleo do crédito — flyer_bonus_check(agent_id)
--    Reutilizado pelo trigger de agent_earnings E na aprovação:
--    quando o total de views >= flyer_views_unlock e há submissão
--    'approved', credita o bónus (uma única vez) + notifica flyer_bonus.
-- ------------------------------------------------------------
create or replace function public.flyer_bonus_check(p_agent_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sub_id uuid;
  v_status text;
  v_atm_id uuid;
  v_bank text;
  v_total_views integer;
  v_unlock numeric;
  v_unlock_value text;
  v_bonus numeric;
  v_bonus_value text;
begin
  if p_agent_id is null then
    return;
  end if;

  -- Bloqueia a linha para impedir crédito duplo em concorrência
  select fs.id, fs.status, fs.atm_id
    into v_sub_id, v_status, v_atm_id
  from public.flyer_submissions fs
  where fs.agent_id = p_agent_id
    and fs.status in ('approved', 'rewarded')
  order by fs.created_at desc
  limit 1
  for update of fs;

  if v_sub_id is null or v_status = 'rewarded' then
    return;
  end if;

  select count(*) into v_total_views
  from public.agent_earnings ae
  where ae.agent_id = p_agent_id;

  -- Limiar (fallback 30) + valor do bónus (fallback 700)
  select value into v_unlock_value
  from public.app_settings where key = 'flyer_views_unlock' limit 1;
  if v_unlock_value is null or v_unlock_value !~ '^[0-9]+(\.[0-9]+)?$' then
    v_unlock := 30;
  else
    v_unlock := v_unlock_value::numeric;
  end if;

  select value into v_bonus_value
  from public.app_settings where key = 'flyer_bonus_kz' limit 1;
  if v_bonus_value is null or v_bonus_value !~ '^[0-9]+(\.[0-9]+)?$' then
    v_bonus := 700;
  else
    v_bonus := v_bonus_value::numeric;
  end if;

  if v_total_views < v_unlock then
    return;
  end if;

  select at.bank_name into v_bank from public.atms at where at.id = v_atm_id;

  -- Marca como pago ANTES de creditar (uma única vez)
  update public.flyer_submissions
  set status = 'rewarded', amount_kz = v_bonus,
      review_notes = 'Creditado automaticamente (' || v_total_views || ' views)'
  where id = v_sub_id;

  insert into public.balance_transactions
    (agent_id, type, amount_kz, description, reference_id, reference_type)
  values
    (p_agent_id, 'credit', v_bonus,
     'Bónus por imprimir e colar o flyer no ATM «' || coalesce(v_bank, '') || '»',
     v_sub_id, 'adjustment');

  update public.profiles
  set agent_balance_kz = agent_balance_kz + v_bonus,
      updated_at = now()
  where user_id = p_agent_id;

  perform public.create_notification(
    p_agent_id,
    'Bónus do flyer: ' || to_char(v_bonus, 'FM0.00') || ' Kz',
    'Atingiste ' || v_total_views || ' views. Bónus por imprimir e colar o flyer creditado no teu saldo.',
    'flyer_bonus',
    true
  );
end;
$$;

-- ------------------------------------------------------------
-- 4b. Trigger — quando o agente ganha views (agent_earnings), reavalia o bónus
-- ------------------------------------------------------------
create or replace function public.trg_flyer_bonus_unlock_fn()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.flyer_bonus_check(new.agent_id);
  return new;
end;
$$;

drop trigger if exists trg_flyer_bonus_unlock on public.agent_earnings;
create trigger trg_flyer_bonus_unlock
  after insert or update on public.agent_earnings
  for each row execute function public.trg_flyer_bonus_unlock_fn();

-- ------------------------------------------------------------
-- 5. RPC admin approve_flyer_submission (Aprovar/Rejeitar)
--    Ao aprovar, reavalia o crédito imediatamente (caso o agente já
--    tenha as views suficientes).
-- ------------------------------------------------------------
create or replace function public.approve_flyer_submission(
  p_submission_id uuid,
  p_approve boolean,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin uuid := auth.uid();
  v_agent uuid;
  v_bank text;
begin
  if v_admin is null then
    raise exception 'Não autenticado.';
  end if;

  if not (has_role(v_admin, 'admin'::app_role) or has_role(v_admin, 'supervisor'::app_role)) then
    raise exception 'Sem permissões para aprovar flyers.';
  end if;

  select fs.agent_id into v_agent
  from public.flyer_submissions fs
  where fs.id = p_submission_id;

  if v_agent is null then
    raise exception 'Submissão não encontrada.';
  end if;

  if p_approve then
    update public.flyer_submissions
    set status = 'approved',
        review_notes = coalesce(p_reason, review_notes)
    where id = p_submission_id;

    perform public.create_notification(
      v_agent,
      'Flyer aprovado',
      'A tua foto do flyer foi aprovada. Assim que atingires as views necessárias, o bónus é creditado automaticamente.',
      'flyer_submission_approved',
      false
    );

    -- Crédito imediato se o agente já tiver as views (o trigger não dispara aqui)
    perform public.flyer_bonus_check(v_agent);
  else
    update public.flyer_submissions
    set status = 'rejected',
        review_notes = coalesce(p_reason, 'Rejeitado')
    where id = p_submission_id;

    perform public.create_notification(
      v_agent,
      'Flyer rejeitado',
      coalesce(p_reason, 'A tua foto do flyer não foi aprovada. Podes tentar de novo.'),
      'flyer_submission_rejected',
      false
    );
  end if;
end;
$$;

revoke all on function public.approve_flyer_submission(uuid, boolean, text) from public, anon;
grant execute on function public.approve_flyer_submission(uuid, boolean, text) to authenticated;

-- ------------------------------------------------------------
-- 6. Realtime (idempotente) — painel web / actualizações em tempo real
-- ------------------------------------------------------------
do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'flyer_submissions'
    ) then
      alter publication supabase_realtime add table public.flyer_submissions;
    end if;
  end if;
end $$;