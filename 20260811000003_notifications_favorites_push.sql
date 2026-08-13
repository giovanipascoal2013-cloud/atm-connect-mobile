-- ============================================================
-- 20260811000003_notifications_favorites_push.sql
-- Fase 6 — Notificações (in-app + push) e Favoritos de ATM
-- Aplicar no Supabase Staging: https://ndvjitfovhfngrzwtytd.supabase.co
-- Executar com o role postgres (SQL editor). Idempotente.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Extensões
-- ------------------------------------------------------------
create extension if not exists pg_net;
create extension if not exists pgcrypto;

-- pg_net: garantir que o schema net é acessível
grant usage on schema net to postgres;

-- ------------------------------------------------------------
-- 2. Tabela push_tokens (1 token por conta — MVP)
-- ------------------------------------------------------------
create table if not exists public.push_tokens (
  user_id uuid primary key references public.profiles(user_id) on delete cascade,
  token text not null,
  platform text,
  updated_at timestamptz default now()
);

alter table public.push_tokens enable row level security;

drop policy if exists "push_tokens_select_own" on public.push_tokens;
create policy "push_tokens_select_own"
  on public.push_tokens for select
  using (auth.uid() = user_id);

drop policy if exists "push_tokens_insert_own" on public.push_tokens;
create policy "push_tokens_insert_own"
  on public.push_tokens for insert
  with check (auth.uid() = user_id);

drop policy if exists "push_tokens_update_own" on public.push_tokens;
create policy "push_tokens_update_own"
  on public.push_tokens for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "push_tokens_delete_own" on public.push_tokens;
create policy "push_tokens_delete_own"
  on public.push_tokens for delete
  using (auth.uid() = user_id);

-- ------------------------------------------------------------
-- 3. Tabela atm_favorites
-- ------------------------------------------------------------
create table if not exists public.atm_favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  atm_id uuid not null references public.atms(id) on delete cascade,
  created_at timestamptz default now(),
  unique (user_id, atm_id)
);

create index if not exists atm_favorites_user_idx on public.atm_favorites(user_id);

alter table public.atm_favorites enable row level security;

drop policy if exists "atm_favorites_select_own" on public.atm_favorites;
create policy "atm_favorites_select_own"
  on public.atm_favorites for select
  using (auth.uid() = user_id);

drop policy if exists "atm_favorites_insert_own" on public.atm_favorites;
create policy "atm_favorites_insert_own"
  on public.atm_favorites for insert
  with check (auth.uid() = user_id);

drop policy if exists "atm_favorites_delete_own" on public.atm_favorites;
create policy "atm_favorites_delete_own"
  on public.atm_favorites for delete
  using (auth.uid() = user_id);

-- ------------------------------------------------------------
-- 4. RLS na tabela notifications (existente)
-- ------------------------------------------------------------
alter table public.notifications enable row level security;

drop policy if exists "notifications_select_own" on public.notifications;
create policy "notifications_select_own"
  on public.notifications for select
  using (auth.uid() = user_id);

drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own"
  on public.notifications for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ------------------------------------------------------------
-- 5. Tabela push_log (debug)
-- ------------------------------------------------------------
create table if not exists public.push_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  type text,
  payload jsonb,
  response_status integer,
  created_at timestamptz default now()
);

alter table public.push_log enable row level security;

-- ------------------------------------------------------------
-- 6. send_expo_push(user_id, title, message, type)
--    SECURITY DEFINER: lê tokens do user, POST via pg_net.
--    EXPO_ACCESS_TOKEN opcional no Vault (envia com Bearer).
-- ------------------------------------------------------------
create or replace function public.send_expo_push(
  p_user_id uuid,
  p_title text,
  p_message text,
  p_type text
)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_token text;
  v_platform text;
  v_body jsonb;
  v_url text := 'https://exp.host/--/api/v2/push/send';
  v_access_token text;
  v_headers jsonb := '{"Content-Type": "application/json"}'::jsonb;
begin
  select token, platform into v_token, v_platform
  from public.push_tokens
  where user_id = p_user_id
  limit 1;

  if v_token is null then
    return;
  end if;

  v_body := jsonb_build_object(
    'to', v_token,
    'title', p_title,
    'body', p_message,
    'sound', 'default',
    'data', jsonb_build_object('type', p_type)
  );

  -- token opcional do Vault (SQL dinâmico para não falhar a compilação se a extensão vault não existir)
  begin
    execute 'select decrypted_secret from vault.decrypted_secrets where name = ''EXPO_ACCESS_TOKEN'' limit 1' into v_access_token;
  exception when others then
    v_access_token := null;
  end;

  if v_access_token is not null and v_access_token <> '' then
    v_headers := v_headers || jsonb_build_object('Authorization', 'Bearer ' || v_access_token);
  end if;

  -- Chamada pg_net isolada em bloco exception para falhas HTTP/rede não abortarem transacções de BD (ex: aprovações)
  begin
    perform net.http_post(
      url := v_url,
      headers := v_headers,
      body := v_body
    );
  exception when others then
    insert into public.push_log (user_id, type, payload, response_status)
    values (p_user_id, p_type, v_body, -1);
    return;
  end;

  insert into public.push_log (user_id, type, payload, response_status)
  values (p_user_id, p_type, v_body, 200);
end;
$$;

revoke all on function public.send_expo_push(uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.send_expo_push(uuid, text, text, text) to postgres, service_role;

-- ------------------------------------------------------------
-- 7. Helper create_notification (SECURITY DEFINER)
--    Insere em notifications e, no tipo de push, dispara push.
-- ------------------------------------------------------------
create or replace function public.create_notification(
  p_user_id uuid,
  p_title text,
  p_message text,
  p_type text,
  p_push boolean default false
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (user_id, title, message, type, read)
  values (p_user_id, p_title, p_message, p_type, false);

  if p_push then
    perform public.send_expo_push(p_user_id, p_title, p_message, p_type);
  end if;
end;
$$;

revoke all on function public.create_notification(uuid, text, text, text, boolean) from public, anon, authenticated;
grant execute on function public.create_notification(uuid, text, text, text, boolean) to postgres, service_role;

-- ------------------------------------------------------------
-- 8. Triggers
-- ------------------------------------------------------------

-- 8.1 ATMs aprovado/rejeitado
create or replace function public.trigger_atm_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status_approval = 'approved' and old.status_approval is distinct from 'approved' then
    if new.agent_id is not null then
      perform public.create_notification(
        new.agent_id,
        'ATM aprovado',
        'O teu ATM «' || new.bank_name || '» foi aprovado e já aparece no mapa.',
        'atm_approved',
        true
      );
    end if;
  elsif new.status_approval = 'rejected' and old.status_approval is distinct from 'rejected' then
    if new.agent_id is not null then
      perform public.create_notification(
        new.agent_id,
        'ATM rejeitado',
        'O teu ATM «' || new.bank_name || '» foi rejeitado: ' || coalesce(new.rejection_reason, 'sem motivo indicado') || '.',
        'atm_rejected',
        true
      );
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_atm_status on public.atms;
create trigger trg_atm_status
  after update of status_approval on public.atms
  for each row execute function public.trigger_atm_status();

-- 8.2 Subscrições aprovada/rejeitada
create or replace function public.trigger_subscription_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'approved' and old.status is distinct from 'approved' then
    perform public.create_notification(
      new.user_id,
      'Premium ativo',
      'A tua subscrição foi aprovada. Aproveita sem limites!',
      'subscription_approved',
      true
    );
  elsif new.status = 'rejected' and old.status is distinct from 'rejected' then
    perform public.create_notification(
      new.user_id,
      'Subscrição rejeitada',
      'A tua subscrição não foi aprovada. Contacta o apoio.',
      'subscription_rejected',
      true
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_subscription_status on public.subscriptions;
create trigger trg_subscription_status
  after update of status on public.subscriptions
  for each row execute function public.trigger_subscription_status();

-- 8.3 Levantamentos aprovado/rejeitado
create or replace function public.trigger_withdrawal_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'approved' and old.status is distinct from 'approved' then
    perform public.create_notification(
      new.agent_id,
      'Levantamento aprovado',
      'Recebeste ' || to_char(new.amount_kz, 'FM999G999G999') || ' Kz.',
      'withdrawal_approved',
      true
    );
  elsif new.status = 'rejected' and old.status is distinct from 'rejected' then
    perform public.create_notification(
      new.agent_id,
      'Levantamento rejeitado',
      coalesce(new.rejection_reason, 'Sem motivo indicado') || '.',
      'withdrawal_rejected',
      true
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_withdrawal_status on public.withdrawals;
create trigger trg_withdrawal_status
  after update of status on public.withdrawals
  for each row execute function public.trigger_withdrawal_status();

-- 8.4 Comissão de view (só in-app)
create or replace function public.trigger_view_commission()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_agent_id uuid;
  v_bank_name text;
begin
  select at.agent_id, at.bank_name into v_agent_id, v_bank_name
  from public.atms at
  where at.id = new.atm_id;

  if v_agent_id is not null and v_agent_id <> new.user_id then
    perform public.create_notification(
      v_agent_id,
      'Ganhaste 0,15 Kz',
      'Uma pessoa viu o teu ATM «' || v_bank_name || '».',
      'view_commission',
      false
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_view_commission on public.atm_views;
create trigger trg_view_commission
  after insert on public.atm_views
  for each row execute function public.trigger_view_commission();

-- 8.5 Avaliação de ATM (só in-app)
create or replace function public.trigger_atm_rating()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_bank_name text;
begin
  select at.bank_name into v_bank_name
  from public.atms at
  where at.id = new.atm_id;

  if new.agent_id is not null and new.agent_id <> new.user_id then
    perform public.create_notification(
      new.agent_id,
      'Nova avaliação',
      'O teu ATM «' || v_bank_name || '» recebeu uma avaliação.',
      'atm_rating',
      false
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_atm_rating on public.agent_ratings;
create trigger trg_atm_rating
  after insert on public.agent_ratings
  for each row execute function public.trigger_atm_rating();

-- 8.6 Novo convidado (referral, só in-app)
create or replace function public.trigger_referral_new()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nome text;
begin
  if new.invited_by is not null then
    v_nome := coalesce(new.nome, new.telefone, 'Um novo utilizador');
    perform public.create_notification(
      new.invited_by,
      'Novo convidado',
      v_nome || ' registou-se com o teu código.',
      'referral_new',
      false
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_referral_new on public.profiles;
create trigger trg_referral_new
  after insert on public.profiles
  for each row execute function public.trigger_referral_new();

-- 8.7 Resposta no fórum (só in-app)
create or replace function public.trigger_forum_reply()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
  v_owner_name text;
begin
  select fp.created_by into v_owner
  from public.forum_posts fp
  where fp.id = new.post_id;

  if v_owner is not null and v_owner <> new.user_id then
    select coalesce(p.nome, p.telefone) into v_owner_name
    from public.profiles p
    where p.user_id = new.user_id;

    perform public.create_notification(
      v_owner,
      'Nova resposta',
      coalesce(v_owner_name, 'Alguém') || ' respondeu ao teu post.',
      'forum_reply',
      false
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_forum_reply on public.forum_comments;
create trigger trg_forum_reply
  after insert on public.forum_comments
  for each row execute function public.trigger_forum_reply();

-- ------------------------------------------------------------
-- 9. Realtime publication (badge in-app + favoritos)
-- ------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;

  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'atm_favorites'
  ) then
    alter publication supabase_realtime add table public.atm_favorites;
  end if;
end $$;

-- ============================================================
-- FIM. Verificar com:
-- select count(*) from public.push_tokens;
-- select count(*) from public.atm_favorites;
-- Vault opcional: insert into vault.secrets (name, secret)
--   values ('EXPO_ACCESS_TOKEN', '<token>')
--   on conflict (name) do update set secret = excluded.secret;
-- ============================================================