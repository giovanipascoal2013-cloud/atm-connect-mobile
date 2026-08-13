# Verificação das Migrações AdMob — Staging

> Correr no SQL editor do Supabase **Staging** (`ndvjitfovhfngrzwtytd`) com role `postgres`.
> Aplicar primeiro `20260813000001_ad_unlocks.sql` e só depois correr o bloco 3 deste script.

```sql
-- ============================================================
-- Verificação Staging — ndvjitfovhfngrzwtytd (SQL editor)
-- Confirma: migração 0001, 0002 e estado do trigger AdMob
-- ============================================================

-- 1) MIGRAÇÃO 20260811000001 — consume_atm_view com fix do is_active
select proname, pg_get_functiondef(oid) as def
from pg_proc
where proname = 'consume_atm_view'
  and pronamespace = 'public'::regnamespace;

-- 2) MIGRAÇÃO 20260811000002 — subscriptions quarterly
-- 2a) CHECK constraint no plan_type (deve incluir 'quarterly')
select conname, pg_get_constraintdef(oid)
from pg_constraint
where conrelid = 'public.subscriptions'::regclass
  and contype = 'c';

-- 2b) Policies de INSERT na subscriptions (deve existir policy para o próprio user)
select policyname, cmd
from pg_policies
where schemaname = 'public' and tablename = 'subscriptions'
order by policyname;

-- 3) MIGRAÇÃO 20260813000001 — ad_unlocks (aplicar ANTES desta verificação)
-- 3a) Tabela existe?
select to_regclass('public.ad_unlocks') as ad_unlocks_table;

-- 3b) Colunas de agent_earnings (view_id nullable + user_id + source)
select column_name, is_nullable
from information_schema.columns
where table_schema = 'public' and table_name = 'agent_earnings'
order by ordinal_position;

-- 3c) Trigger trg_ad_commission — DEVE ser AFTER INSERT + UPDATE
select t.tgname,
       case t.tgtype & 2 when 2 then 'BEFORE' else 'AFTER' end as timing,
       case t.tgtype & 4 when 4 then 'INSERT' else '' end ||
       case t.tgtype & 8 when 8 then ' UPDATE' else '' end ||
       case t.tgtype & 16 when 16 then ' DELETE' else '' end as events
from pg_trigger t
where t.tgrelid = 'public.ad_unlocks'::regclass
  and not t.tgisinternal;

-- 3d) Função do trigger — confirmar guarda anti-duplicação (TG_OP='UPDATE' → expires_at)
select pg_get_functiondef('public.trigger_ad_commission()'::regprocedure);

-- 3e) RLS activa + policies ad_unlocks (select/insert/update/delete own)
select relrowsecurity from pg_class where oid = 'public.ad_unlocks'::regclass;
select policyname, cmd
from pg_policies
where schemaname = 'public' and tablename = 'ad_unlocks'
order by policyname;

-- 3f) Realtime publication
select schemaname, tablename
from pg_publication_tables
where pubname = 'supabase_realtime' and tablename = 'ad_unlocks';
```

## Como ler os resultados

| Bloco | O que deve mostrar | OK |
|---|---|---|
| **1** | Função `consume_atm_view` com fix que limpa `is_active` nas expiradas antes do INSERT + índice único parcial `(user_id, atm_id) WHERE is_active=true` | ✔ |
| **2a** | CHECK do `plan_type` a incluir `monthly, quarterly, annual` | ✔ |
| **2b** | Policy de INSERT própria (nome tipo `subscriptions_insert_own`) | ✔ |
| **3a** | `ad_unlocks` devolve o nome da tabela (agora é `NULL`/vazio = não aplicada) | ✔ |
| **3b** | `view_id` = `YES` (nullable) + `user_id` e `source` presentes | ✔ |
| **3c** | `events` contém `INSERT UPDATE` (não só `INSERT`) | ✔ |
| **3d** | Corpo com `if TG_OP = 'UPDATE' and new.expires_at <= old.expires_at then return new;` | ✔ |
| **3e** | 4 policies own (select/insert/update/delete) + `relrowsecurity` = `t` | ✔ |
| **3f** | Linha `public \| ad_unlocks` na `supabase_realtime` | ✔ |