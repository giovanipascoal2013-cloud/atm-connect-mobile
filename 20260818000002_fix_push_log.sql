-- ============================================================
-- 20260818000002_fix_push_log.sql
-- Diagnóstico/robustez do push:
--   1. send_expo_push regista em push_log o caso "sem token" (-2) — antes era invisível.
--   2. Captura o request_id do pg_net e grava a resposta REAL do Expo
--      (status_code + body com o ticket ok/DeviceNotRegistered) via refresh_push_log().
--   3. create_notification isola o push em bloco exception — uma falha de push
--      nunca faz rollback da notificação in-app.
-- Aplicar no Supabase Staging: https://ndvjitfovhfngrzwtytd.supabase.co
-- Executar com o role postgres (SQL editor). Idempotente.
-- ============================================================

-- ------------------------------------------------------------
-- 0. Novas colunas em push_log (request id do pg_net + body real)
-- ------------------------------------------------------------
alter table public.push_log add column if not exists request_id bigint;
alter table public.push_log add column if not exists response_body text;

-- ------------------------------------------------------------
-- 1. send_expo_push (REWRITE) — loga "sem token", captura request_id
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
  v_request_id bigint;
begin
  select token, platform into v_token, v_platform
  from public.push_tokens
  where user_id = p_user_id
  limit 1;

  if v_token is null then
    insert into public.push_log (user_id, type, payload, response_status)
    values (p_user_id, p_type, jsonb_build_object('error', 'no_push_token'), -2);
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
    v_request_id := net.http_post(
      url := v_url,
      headers := v_headers,
      body := v_body
    );
  exception when others then
    insert into public.push_log (user_id, type, payload, response_status)
    values (p_user_id, p_type, v_body, -1);
    return;
  end;

  insert into public.push_log (user_id, type, payload, response_status, request_id)
  values (p_user_id, p_type, v_body, 200, v_request_id);
end;
$$;

revoke all on function public.send_expo_push(uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.send_expo_push(uuid, text, text, text) to postgres, service_role;

-- ------------------------------------------------------------
-- 2. refresh_push_log() — cola a resposta REAL do Expo ao push_log
--    (o pg_net responde de forma assíncrona; correr após o envio)
-- ------------------------------------------------------------
create or replace function public.refresh_push_log()
returns void
language plpgsql
security definer
set search_path = public, net, extensions
as $$
begin
  update public.push_log pl
  set response_status = r.status_code,
      response_body   = r.content
  from net._http_response r
  where r.id = pl.request_id
    and pl.request_id is not null
    and pl.response_body is null;
end;
$$;

revoke all on function public.refresh_push_log() from public, anon, authenticated;
grant execute on function public.refresh_push_log() to postgres, service_role;

-- ------------------------------------------------------------
-- 3. create_notification (REWRITE) — push isolado em exception
--    para uma falha do push nunca reverter a notificação in-app.
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
    begin
      perform public.send_expo_push(p_user_id, p_title, p_message, p_type);
    exception when others then
      null; -- push falhou (ex.: pg_net fora do ar) — não reverter a notificação in-app
    end;
  end if;
end;
$$;

revoke all on function public.create_notification(uuid, text, text, text, boolean) from public, anon, authenticated;
grant execute on function public.create_notification(uuid, text, text, text, boolean) to postgres, service_role;

-- ============================================================
-- FIM. Verificar com:
--   select * from public.push_log order by created_at desc;
--   select public.refresh_push_log();
--   select user_id, type, response_status, left(response_body, 120) as body
--   from public.push_log order by created_at desc;
-- ============================================================