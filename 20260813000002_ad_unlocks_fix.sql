-- ============================================================
-- 20260813000002_ad_unlocks_fix.sql
-- Sistema de anúncios — Fase 2 (B4/B5/B6)
-- Aplicar no Supabase Staging: https://ndvjitfovhfngrzwtytd.supabase.co
-- Executar com o role postgres (SQL editor). Idempotente.
--
-- ORDEM OBRIGATÓRIA: aplicar este SQL ANTES de rebuildar o app.
-- O app passa a criar unlocks via RPC (create_ad_unlock) e o INSERT
-- directo é revogado — sem o RPC o createUnlock falha.
-- ============================================================

-- ------------------------------------------------------------
-- 1. B6 + B4 — Trigger com mensagem dinâmica e guarda robusta do setting
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
  v_value text;
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
    -- Comissão por ad view (setting com fallback 0.15; valor vazio/não-numérico -> fallback)
    select value into v_value
    from public.app_settings
    where key = 'agent_commission_free_view_kz'
    limit 1;

    if v_value is null or v_value !~ '^[0-9]+(\.[0-9]+)?$' then
      v_commission_kz := 0.15;
    else
      v_commission_kz := v_value::numeric;
    end if;

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

    -- 4. Notificação in-app (tipo 'ad_commission') — mensagem reflecte o valor real
    perform public.create_notification(
      v_agent_id,
      'Ganhaste ' || to_char(v_commission_kz, 'FM0.00') || ' Kz via anúncio',
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

-- ------------------------------------------------------------
-- 2. B5 — RPC create_ad_unlock (criação/renovação 24h via server-side)
--     Fecha o buraco de comissão sem ver anúncio: o cliente deixa de
--     poder inserir ad_unlocks directamente.
-- ------------------------------------------------------------
create or replace function public.create_ad_unlock(p_atm_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null or p_atm_id is null then
    return false;
  end if;

  insert into public.ad_unlocks (user_id, atm_id, expires_at)
  values (v_user_id, p_atm_id, now() + interval '24 hours')
  on conflict (user_id, atm_id)
  do update set expires_at = excluded.expires_at;

  return true;
end;
$$;

revoke all on function public.create_ad_unlock(uuid) from public, anon;
grant execute on function public.create_ad_unlock(uuid) to authenticated;

-- ------------------------------------------------------------
-- 3. B5 — Revogar INSERT directo na tabela (só via RPC)
--     SELECT/UPDATE/DELETE own mantêm-se.
-- ------------------------------------------------------------
drop policy if exists "ad_unlocks_insert_own" on public.ad_unlocks;
