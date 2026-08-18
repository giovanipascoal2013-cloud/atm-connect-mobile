-- ============================================================
-- 20260818000001_fix_ad_commission_reference_type.sql
-- Fix: trg_ad_commission inseria reference_type='ad_view' em
-- balance_transactions, mas o constraint
-- balance_transactions_reference_type_check só permite
-- ('withdrawal','earning','adjustment','rejection').
-- → trigger falhava → create_ad_unlock dava rollback (0 unlocks).
-- Fix: usar 'earning' (mesmo valor do RPC legado consume_atm_view).
-- Aplicar no Supabase Staging: https://ndvjitfovhfngrzwtytd.supabase.co
-- Executar com o role postgres (SQL editor). Idempotente.
-- ============================================================

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

    -- 2. balance_transactions (credit) — reference_type 'earning' (único válido no CHECK)
    insert into public.balance_transactions (agent_id, type, amount_kz, description, reference_id, reference_type)
    values (v_agent_id, 'credit', v_commission_kz, 'Comissão por anúncio no ATM ' || v_bank_name, new.atm_id, 'earning');

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
