-- ============================================================
-- 20260813000003_ad_unlocks_sec.sql
-- Sistema de anúncios — Fase 4 / B11 (segurança)
-- Aplicar no Supabase Staging: https://ndvjitfovhfngrzwtytd.supabase.co
-- Executar com o role postgres (SQL editor). Idempotente.
--
-- Fecha o buraco de comissão infinita sem anúncios:
-- um utilizador podia fazer UPDATE à própria linha de ad_unlocks
-- (policy ad_unlocks_update_own) estendendo expires_at para o futuro,
-- e o trigger trg_ad_commission pagava comissão ao agente sempre que
-- new.expires_at > old.expires_at — repetidamente, sem ver anúncio.
--
-- A renovação legítima continua a funcionar: o RPC create_ad_unlock
-- (SECURITY DEFINER, owner postgres) contorna RLS e faz o upsert 24h.
-- ============================================================

drop policy if exists "ad_unlocks_update_own" on public.ad_unlocks;

-- SELECT/DELETE own mantêm-se; a única forma de criar/renovar um unlock
-- é via RPC create_ad_unlock (que requer o fluxo de anúncio no cliente).
