-- ============================================================
-- 20260926000001_flyer_photos_delete_policy.sql
-- Policy de DELETE no bucket privado `flyer-photos` ( pasta do próprio agente ).
--
-- Porquê: quando o RPC `create_flyer_submission` recusa a submissão (distância
-- > flyer_proximity_m, ATM não aprovado, pedido já em curso), a foto já foi
-- enviada e ficava ÓRFÃ no bucket — a migração do flyer só cria policies de
-- INSERT e SELECT (igual ao `atm-photos`), logo o `storage.remove()` do app
-- era bloqueado pelo RLS. Sem isto, cada tentativa falhada deixava um ficheiro.
--
-- Âmbito restrito: só o próprio utilizador apaga ficheiros da sua pasta
-- (`<user_id>/...`) no bucket `flyer-photos`. Não toca em `atm-photos` nem em
-- linhas de `flyer_submissions`.
--
-- Aplicar no Supabase Staging: https://ndvjitfovhfngrzwtytd.supabase.co
-- Executar com o role postgres (SQL editor). Idempotente.
-- ============================================================

do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'Agents delete own flyer photos' and tablename = 'objects') then
    create policy "Agents delete own flyer photos"
      on storage.objects for delete to authenticated
      using (
        bucket_id = 'flyer-photos'
        and auth.uid()::text = (storage.foldername(name))[1]
      );
  end if;
end $$;

-- Verificação (deve devolver 1):
-- select count(*) from pg_policies
--  where policyname = 'Agents delete own flyer photos' and tablename = 'objects';
