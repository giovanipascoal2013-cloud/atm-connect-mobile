-- ============================================================
-- 20260813000001_ad_unlocks.sql
-- AdMob Rewarded Ads — Tabela ad_unlocks e Trigger de Comissão (0.15 Kz)
-- Aplicar no Supabase Staging: https://ndvjitfovhfngrzwtytd.supabase.co
-- Executar com o role postgres (SQL editor). Idempotente.
--
-- DEPENDÊNCIA: requer a função public.create_notification(...) da migração
-- 20260811000003_notifications_favorites_push.sql (Fase 6). Aplicar essa primeiro.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Tabela ad_unlocks (1 unlock ativo por ATM por user)
-- ------------------------------------------------------------
create table if not exists public.ad_unlocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  atm_id uuid not null references public.atms(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz default now(),
  unique (user_id, atm_id)
);

create index if not exists ad_unlocks_user_idx on public.ad_unlocks(user_id);
create index if not exists ad_unlocks_expires_idx on public.ad_unlocks(expires_at);

alter table public.ad_unlocks enable row level security;

drop policy if exists "ad_unlocks_select_own" on public.ad_unlocks;
create policy "ad_unlocks_select_own"
  on public.ad_unlocks for select
  using (auth.uid() = user_id);

drop policy if exists "ad_unlocks_insert_own" on public.ad_unlocks;
create policy "ad_unlocks_insert_own"
  on public.ad_unlocks for insert
  with check (auth.uid() = user_id);

drop policy if exists "ad_unlocks_update_own" on public.ad_unlocks;
create policy "ad_unlocks_update_own"
  on public.ad_unlocks for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "ad_unlocks_delete_own" on public.ad_unlocks;
create policy "ad_unlocks_delete_own"
  on public.ad_unlocks for delete
  using (auth.uid() = user_id);

-- ------------------------------------------------------------
-- 2. Realtime publication (para badge/sync multi-device)
-- ------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'ad_unlocks'
  ) then
    alter publication supabase_realtime add table public.ad_unlocks;
  end if;
end $$;

-- ------------------------------------------------------------
-- 2.5 Adaptação de agent_earnings para ad views
--     (a tabela legada exige view_id NOT NULL → ad_unlocks não tem atm_views)
-- ------------------------------------------------------------
alter table public.agent_earnings
  alter column view_id drop not null,
  add column if not exists user_id uuid references public.profiles(user_id),
  add column if not exists source text;

-- ------------------------------------------------------------
-- 3. Trigger de comissão — trg_ad_commission
-- ------------------------------------------------------------
create or replace function public.trigger_ad_commission()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_agent_id uuid;
  v_bank_name text;
  v_commission_kz numeric;
begin
  -- Guarda anti-duplicação: em UPDATE só paga se o unlock foi renovado (expires_at estendido)
  if TG_OP = 'UPDATE' and new.expires_at <= old.expires_at then
    return new;
  end if;

  -- Busca agente e nome do ATM
  select at.agent_id, at.bank_name into v_agent_id, v_bank_name
  from public.atms at
  where at.id = new.atm_id;

  if v_agent_id is not null and v_agent_id <> new.user_id then
    -- Comissão por ad view (setting com fallback 0.15)
    select coalesce(value::numeric, 0.15) into v_commission_kz
    from public.app_settings
    where key = 'agent_commission_free_view_kz'
    limit 1;

    -- 1. agent_earnings (view_id NULL; ad_unlocks não cria atm_views)
    insert into public.agent_earnings (agent_id, atm_id, user_id, amount_kz, source)
    values (v_agent_id, new.atm_id, new.user_id, v_commission_kz, 'ad_view');

    -- 2. balance_transactions (credit)
    insert into public.balance_transactions (agent_id, type, amount_kz, description, reference_id, reference_type)
    values (v_agent_id, 'credit', v_commission_kz, 'Comissão por anúncio no ATM ' || v_bank_name, new.atm_id, 'ad_view');

    -- 3. Incrementa profiles.agent_balance_kz
    update public.profiles
    set agent_balance_kz = agent_balance_kz + v_commission_kz,
        updated_at = now()
    where user_id = v_agent_id;

    -- 4. Notificação in-app (tipo 'ad_commission')
    perform public.create_notification(
      v_agent_id,
      'Ganhaste 0,15 Kz via anúncio',
      'Alguém viu um anúncio para desbloquear o teu ATM «' || v_bank_name || '».',
      'ad_commission',
      false
    );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_ad_commission on public.ad_unlocks;
create trigger trg_ad_commission
  after insert or update on public.ad_unlocks
  for each row execute function public.trigger_ad_commission();
