-- ============================================================
-- 20261003000001_anon_ad_unlocks.sql
-- Desbloqueio de ATMs por visitante ANÓNIMO (device_id), pagando a mesma
-- comissão de 0,15 Kz ao agente dono do ATM que o caminho registado paga.
--
-- CONTEXTO
--   O mapa JÁ abre sem login (app/index.tsx -> /(tabs)/map sem gate) e o
--   role anon JÁ consegue ler `atms` (policy "Anyone can view ATMs",
--   migration 20260317063541 do repo web). O bloqueio era duplo:
--     (1) cliente  — isLocked exigia isLoggedIn (ATMList.tsx),
--         o detalhe offering "Entrar para ver detalhes", e handleWatchAd
--         fazia push para /(auth)/login;
--     (2) servidor — ad_unlocks.user_id é NOT NULL com FK a profiles
--         (20260813000001:16-17) e create_ad_unlock só tem
--         `grant execute` a `authenticated` (401 para anon, confirmado
--         por probe ao staging).
--
-- DECISÃO
--   Tabela NOVA e separada. `ad_unlocks` fica INTOCADA — puro aditivo,
--   zero regresso no caminho registado. O primary key (device_id, atm_id)
--   faz o papel do unique (user_id, atm_id): trava a dupla comissão no
--   servidor, que o cliente não pode cumprir.
--
--   A tabela NÃO entra na publication supabase_realtime (ao contrário das
--   outras deste projecto): não há policy de SELECT porque o estado vive no
--   dispositivo (expo-secure-store) e o único leitor é o próprio cliente.
--
-- BÓNUS DO FLYER — NÃO REQUER ALTERAÇÃO
--   As views anónimas contam para as 30 views do bónus: flyer_bonus_check
--   conta agent_earnings sem filtrar por user_id nem por source
--   (20260922000001_flyer_bonus.sql:291-293), e este trigger insere lá
--   uma linha por view. O pagamento continua dependente de o admin
--   aprovar a submissão do flyer — flyer_bonus_check sai em
--   `v_sub_id is null` (linha 287) enquanto o status for 'submitted'.
--
-- RISCO ACEITE (B15)
--   p_device_id vem do cliente e NÃO é validado: um atacante pode forjar
--   um id novo por pedido e gerar comissões ilimitadas para um ATM agente.
--   Gravidade real = 0 enquanto os AdMob IDs forem de teste. Fix
--   definitivo: AdMob Server-Side Verification (SSV) — validar o payload
--   `rewarded` numa Edge Function antes de chamar credit_ad_commission.
--
-- Aplicar no Supabase Staging: https://ndvjitfovhfngrzwtytd.supabase.co
-- Executar com o role postgres (SQL editor). Idempotente.
-- DEPENDÊNCIAS (ambas já aplicadas no staging):
--   20260813000001_ad_unlocks.sql        — ad_unlocks + trigger_ad_commission
--   20260818000001_fix_ad_commission_... — reference_type='earning'
-- ============================================================

-- ------------------------------------------------------------
-- 1. credit_ad_commission — núcleo partilhado pelos dois triggers
--    Extrai as 4 escritas que viviam dentro de trigger_ad_commission
--    (20260818000001:49-69) para não duplicar a lógica de pagamento.
--    p_viewer_user_id = NULL quando o visitante é anónimo.
--    p_source         = 'ad_view' (registado) | 'ad_view_anon' (anónimo)
-- ------------------------------------------------------------
create or replace function public.credit_ad_commission(
  p_agent_id uuid,
  p_atm_id uuid,
  p_viewer_user_id uuid,
  p_source text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_bank_name text;
  v_commission_kz numeric;
  v_value text;
begin
  -- Sem dono do ATM não há a quem creditar
  if p_agent_id is null then
    return;
  end if;

  -- O visitante não gera comissão ao dono do seu próprio ATM.
  -- Mesma guarda que vivia em trigger_ad_commission (20260818000001:35).
  -- Com p_viewer_user_id NULL a comparação dá NULL (falsy), logo o
  -- anónimo nunca é confundido com o próprio dono.
  if p_agent_id = p_viewer_user_id then
    return;
  end if;

  select at.bank_name into v_bank_name
  from public.atms at
  where at.id = p_atm_id;

  -- Comissão por ad view (setting com fallback 0.15; vazio/não-numérico -> fallback)
  select value into v_value
  from public.app_settings
  where key = 'agent_commission_free_view_kz'
  limit 1;

  if v_value is null or v_value !~ '^[0-9]+(\.[0-9]+)?$' then
    v_commission_kz := 0.15;
  else
    v_commission_kz := v_value::numeric;
  end if;

  -- 1. agent_earnings (view_id NULL; nem ad_unlocks nem anon_ad_unlocks
  --    criam atm_views). user_id NULL no caso anónimo — a coluna é
  --    nullable (20260813000001:68) e source não tem CHECK.
  insert into public.agent_earnings (agent_id, atm_id, user_id, amount_kz, source)
  values (p_agent_id, p_atm_id, p_viewer_user_id, v_commission_kz, p_source);

  -- 2. balance_transactions (credit) — reference_type 'earning' (único válido
  --    no CHECK: withdrawal/earning/adjustment/rejection)
  insert into public.balance_transactions (agent_id, type, amount_kz, description, reference_id, reference_type)
  values (p_agent_id, 'credit', v_commission_kz, 'Comissão por anúncio no ATM ' || v_bank_name, p_atm_id, 'earning');

  -- 3. Incrementa profiles.agent_balance_kz
  update public.profiles
  set agent_balance_kz = agent_balance_kz + v_commission_kz,
      updated_at = now()
  where user_id = p_agent_id;

  -- 4. Notificação in-app (tipo 'ad_commission') — mensagem reflecte o valor real
  perform public.create_notification(
    p_agent_id,
    'Ganhaste ' || to_char(v_commission_kz, 'FM0.00') || ' Kz via anúncio',
    'Alguém viu um anúncio para desbloquear o teu ATM «' || v_bank_name || '».',
    'ad_commission',
    false
  );
end;
$$;

-- ------------------------------------------------------------
-- 2. trigger_ad_commission — refactorizado para usar o núcleo partilhado.
--    Comportamento IDÊNTICO ao de 20260818000001 (verificado nos testes).
-- ------------------------------------------------------------
create or replace function public.trigger_ad_commission()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_agent_id uuid;
begin
  -- Guarda anti-duplicação (B11): em UPDATE só paga se o unlock foi renovado
  if TG_OP = 'UPDATE' and new.expires_at <= old.expires_at then
    return new;
  end if;

  select at.agent_id into v_agent_id
  from public.atms at
  where at.id = new.atm_id;

  perform public.credit_ad_commission(v_agent_id, new.atm_id, new.user_id, 'ad_view');
  return new;
end;
$$;

drop trigger if exists trg_ad_commission on public.ad_unlocks;
create trigger trg_ad_commission
  after insert or update on public.ad_unlocks
  for each row execute function public.trigger_ad_commission();

-- ------------------------------------------------------------
-- 3. Tabela anon_ad_unlocks — desbloqueios por dispositivo
-- ------------------------------------------------------------
create table if not exists public.anon_ad_unlocks (
  device_id uuid not null,
  atm_id uuid not null references public.atms(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  primary key (device_id, atm_id)
);

create index if not exists anon_ad_unlocks_expires_idx
  on public.anon_ad_unlocks (expires_at);

alter table public.anon_ad_unlocks enable row level security;

-- Sem policies de propósito:
--   - sem SELECT para anon  → o estado do unlock vive no dispositivo;
--   - sem INSERT/UPDATE/DELETE → escrita só via create_ad_unlock_anon
--     (SECURITY DEFINER, contorna RLS). Mesmo padrão de segurança que o
--     B5 aplicou a ad_unlocks (20260813000002).

-- ------------------------------------------------------------
-- 4. trigger_anon_ad_commission — comissão da view anónima
-- ------------------------------------------------------------
create or replace function public.trigger_anon_ad_commission()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_agent_id uuid;
begin
  -- Mesma guarda anti-duplicação do caminho registado
  if TG_OP = 'UPDATE' and new.expires_at <= old.expires_at then
    return new;
  end if;

  select at.agent_id into v_agent_id
  from public.atms at
  where at.id = new.atm_id;

  -- viewer NULL: é um visitante anónimo, logo nunca é o dono do ATM
  perform public.credit_ad_commission(v_agent_id, new.atm_id, null, 'ad_view_anon');
  return new;
end;
$$;

drop trigger if exists trg_anon_ad_commission on public.anon_ad_unlocks;
create trigger trg_anon_ad_commission
  after insert or update on public.anon_ad_unlocks
  for each row execute function public.trigger_anon_ad_commission();

-- ------------------------------------------------------------
-- 5. RPC create_ad_unlock_anon — desbloqueio por dispositivo.
--    Devolve o expires_at EFECTIVO para o cliente sincronizar o estado
--    local a partir do servidor (não estimar 24 h no cliente).
--
--    `grant execute` SÓ a anon: uma sessão autenticada não pode criar
--    linhas anónimas, o que impede dois caminhos de comissão para a
--    mesma sessão.
-- ------------------------------------------------------------
create or replace function public.create_ad_unlock_anon(
  p_device_id uuid,
  p_atm_id uuid
)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  v_expires_at timestamptz;
begin
  if p_device_id is null then
    raise exception 'Identificador de dispositivo em falta.';
  end if;

  if p_atm_id is null or not exists (
    select 1
    from public.atms at
    where at.id = p_atm_id
      and at.status_approval = 'approved'
      and at.deleted_at is null
  ) then
    raise exception 'ATM não encontrado ou indisponível.';
  end if;

  -- Auto-poda das linhas expiradas DESTE dispositivo (bounded, sem cron)
  delete from public.anon_ad_unlocks
  where device_id = p_device_id
    and expires_at <= now();

  -- O upsert renova o TTL: o trigger vê new.expires_at > old.expires_at e
  -- paga a comissão. É o mesmo comportamento de renovação do
  -- create_ad_unlock registado — rever o anúncio conta como nova view.
  insert into public.anon_ad_unlocks (device_id, atm_id, expires_at)
  values (p_device_id, p_atm_id, now() + interval '24 hours')
  on conflict (device_id, atm_id)
  do update set expires_at = excluded.expires_at
  returning expires_at into v_expires_at;

  return v_expires_at;
end;
$$;

revoke all on function public.create_ad_unlock_anon(uuid, uuid) from public, anon;
grant execute on function public.create_ad_unlock_anon(uuid, uuid) to anon;

-- ============================================================
-- FIM. Verificar (ver docs/superpowers/specs/2026-10-03-anon-atm-viewing-plan.md,
-- tarefa T2) com BEGIN…ROLLBACK — sem resíduos.
-- ============================================================
