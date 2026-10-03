# Ver ATMs sem login — Plano de Implementação

**Data:** 2026-10-03 · **Spec:** `docs/superpowers/specs/2026-10-03-anon-atm-viewing-design.md` · **Repo:** `atm-connect-mobile`

> A skill `writing-plans` não está disponível nesta instalação; este documento cumpre o papel dela — tarefas ordenadas, com código exacto e um gate de verificação por tarefa.

> **Actualização de 2026-10-03 (pós-implementação):** T0–T11 executados, migração `20261003000001` **aplicada no staging** ✅. As "notas de follow-up" de T11 item 4 (linha 926) e o "fora de âmbito" (linha 961) falavam do *dashboard de admin do flyer no repo web* — **já implementado** no `atm-connect-angola` (`8409715`); a nota original é `docs/FLYER_BONUS_WEB_CHANGES.md`. Os follow-ups **verdadeiros** (tipos do web desactualizados, funil web cego a unlocks anónimos, SSV obrigatório antes dos IDs reais, promoção para produção) estão em **`docs/ANON_UNLOCKS_WEB_CHANGES.md`**.

## Convenção de commits

Commits convencionais separados, um por grupo de tarefas. `package.json` + `package-lock.json` **sempre juntos** (regra do `AGENTS.md`). O `m.md` não versionado na raiz **nunca** entra.

## Mapa de dependências

```
T1 migração SQL ──► T2 verificação SQL (precisa da migração aplicada)
                        │
T3 device.ts ──┐       │
T4 store.ts  ──┤       │
T5 types.ts  ──┼──► T6 useAdUnlocks ──► T7 ATMList ──► T8 ATMDetailSheet ──► T9 map.tsx
               │                                                        └──► T10 (tabs)/_layout
               └────────────────────────────────────────────────────► T11 LOG.md
                                                                          └──► T12 verificação final
```

---

## T0 — Pré-requisito (executa o utilizador)

```bash
npx expo install expo-crypto
npm install --package-lock=true
```

**Gate:** `git status` tem de mostrar `package.json` **e** `package-lock.json` modificados. Se o lock não mudar, o `npm install --package-lock=true` correu fora da raiz do repo ou o `.npmrc` local não foi lido — o EAS falha depois com `EUSAGE`.

`expo-crypto` traz `randomUUID()`. O código tem fallback `Math.random()` para não rebentar se faltar o módulo, mas **instala-o**.

---

## T1 — Migração `20261003000001_anon_ad_unlocks.sql`

Ficheiro novo na **raiz** do repo (convenção do projecto — não há `supabase/migrations/` aqui). Idempotente. Aplicar no SQL editor do **staging** com o role `postgres`.

```sql
-- ============================================================
-- 20261003000001_anon_ad_unlocks.sql
-- Desbloqueio de ATMs por visitante ANÓNIMO (device_id), com a mesma
-- comissão de 0,15 Kz ao agente dono do ATM que o caminho registado paga.
--
-- CONTEXTO: o mapa já abre sem login e `anon` já lê `atms` (policy
-- "Anyone can view ATMs"), mas `ad_unlocks.user_id` é NOT NULL com FK a
-- profiles e `create_ad_unlock` só tem `grant execute` a `authenticated`.
-- Logo o anónimo nunca conseguia desbloquear → via-se para /login.
--
-- DECISÃO: tabela NOVA e separada. `ad_unlocks` fica intocada — zero
-- regresso no caminho registado. O primary key (device_id, atm_id) faz o
-- papel do unique(user_id, atm_id): trava a dupla comissão no servidor,
-- que o cliente não pode cumprir.
--
-- Aplicar no Supabase Staging: https://ndvjitfovhfngrzwtytd.supabase.co
-- Executar com o role postgres (SQL editor). Idempotente.
-- DEPENDÊNCIA: pressupõe 20260813000001 (ad_unlocks + trigger_ad_commission)
--               e 20260818000001 (reference_type='earning'). Ambas aplicadas.
-- ============================================================

-- ------------------------------------------------------------
-- 1. credit_ad_commission — núcleo partilhado pelos dois triggers
--    Extrai as 4 escritas que hoje vivem dentro de trigger_ad_commission
--    (20260818000001:49-69) para não duplicar a lógica de pagamento.
-- ------------------------------------------------------------
create or replace function public.credit_ad_commission(
  p_agent_id uuid,
  p_atm_id uuid,
  p_viewer_user_id uuid,   -- NULL quando o visitante é anónimo
  p_source text            -- 'ad_view' (registado) | 'ad_view_anon' (anónimo)
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

  -- O visitante não gera comissão ao dono do seu próprio ATM
  -- (mesma guarda que vivia em trigger_ad_commission:35)
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
  --    criam atm_views). user_id NULL no caso anónimo — a coluna é nullable.
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
--    Comportamento IDÊNTICO ao de 20260818000001.
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
  -- Guarda anti-duplicação: em UPDATE só paga se o unlock foi renovado
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
--    NÃO entra na publication supabase_realtime: não há policy de SELECT
--    (o estado vive no dispositivo, via SecureStore) e o único leitor é
--    o próprio cliente — sem subscription não há tráfego de replicação.
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

-- Sem policies: nem SELECT para anon (o estado é local), nem
-- INSERT/UPDATE/DELETE directos — escrita só via RPC SECURITY DEFINER.

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
--    Grant só a anon: uma sessão autenticada não pode criar linhas
--    anónimas (evita dois caminhos de comissão para a mesma sessão).
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
```

**Notas de implementação SQL:**
- `credit_ad_commission` recebe `p_viewer_user_id uuid`. No caminho anónimo passa `null`; a guarda `p_agent_id = p_viewer_user_id` é `false` quando `p_viewer_user_id` é `NULL` (NULL no SQL nunca iguala), logo o anónimo nunca é visto como o próprio dono. Comportamento correcto.
- O `on conflict … do update set expires_at = excluded.expires_at` **estende** o TTL, o que faz o trigger de `UPDATE` disparar com `new.expires_at > old.expires_at` e pagar a comissão. É o comportamento pretendido (rever anúncio = nova comissão), igual ao `create_ad_unlock` registado.
- **Risco aceite (B15):** `p_device_id` é do cliente e não é validado. Ver §7 da spec.

**Commit:** `feat(db): desbloqueio anonimo por device_id com comissao ao agente`

---

## T2 — Verificação SQL (9 blocos, `BEGIN…ROLLBACK`)

Correr cada bloco no SQL editor do staging **dentro de `begin; … rollback;`** para não deixar resíduos. Substituir `<ATM>` por um ATM `approved` com `agent_id` não nulo e `<AGENT>` pelo seu `agent_id`; `<DEVICE_A>`/`<DEVICE_B>` por UUIDs inventados.

**T1 — o RPC devolve `expires_at` e cria a linha**
```sql
begin;
select public.create_ad_unlock_anon('<DEVICE_A>', '<ATM>') as expires;
select device_id, atm_id, expires_at > now() as futuro from public.anon_ad_unlocks;
rollback;
```
Esperado: `expires` ≈ `now() + 24h`; 1 linha; `futuro = true`.

**T2 — a guarda anti-duplicação bloqueia um `UPDATE` que não renova**
```sql
begin;
select public.create_ad_unlock_anon('<DEVICE_A>', '<ATM>');
-- UPDATE que NÃO renova: simula o trigger a ver um expires_at inalterado
update public.anon_ad_unlocks set expires_at = expires_at where device_id='<DEVICE_A>' and atm_id='<ATM>';
select count(*) as earnings from public.agent_earnings where atm_id='<ATM>' and source='ad_view_anon';
rollback;
```
Esperado: `earnings = 0`. Este é o B11 reincidente (o bug que gerava comissões infinitas sem anúncio): a guarda `TG_OP='UPDATE' and new.expires_at <= old.expires_at → return` tem de continuar a valer no caminho anónimo.

**T2b — 2.ª chamada com o MESMO `device_id` não duplica a LINHA (mas renova e paga)**
```sql
begin;
select public.create_ad_unlock_anon('<DEVICE_A>', '<ATM>');
select public.create_ad_unlock_anon('<DEVICE_A>', '<ATM>');   -- renova
select count(*) as linhas from public.anon_ad_unlocks where device_id='<DEVICE_A>' and atm_id='<ATM>';
select count(*) as earnings from public.agent_earnings where atm_id='<ATM>' and source='ad_view_anon';
rollback;
```
Esperado: `linhas = 1` (o `on conflict` do PK faz upsert, não insere), `earnings = 2` — **duas comissões, e está certo**: rever o anúncio antes de expirar é uma renovação legítima, exactamente como no `create_ad_unlock` registado. O que o PK impede é a linha duplicada, não a renovação.

**T3 — `device_id` DIFERENTE paga comissão**
```sql
begin;
select public.create_ad_unlock_anon('<DEVICE_A>', '<ATM>');
select public.create_ad_unlock_anon('<DEVICE_B>', '<ATM>');
select source, user_id is null as user_null, amount_kz from public.agent_earnings where atm_id='<ATM>' order by created_at;
select type, amount_kz, reference_type from public.balance_transactions where reference_id='<ATM>' and reference_type='earning';
select agent_balance_kz from public.profiles where user_id='<AGENT>';
rollback;
```
Esperado: 2 linhas em `agent_earnings` com `source='ad_view_anon'` e `user_null = true`; 2 `balance_transactions` `credit`/`earning`; saldo +0,30 face ao inicial.

**T4 — ATM do próprio visitante NÃO paga**
```sql
begin;
-- <ATM_OWN> = um ATM approved cujo agent_id = <AGENT>
select public.create_ad_unlock_anon('<DEVICE_A>', '<ATM_OWN>');
select count(*) as earnings from public.agent_earnings where atm_id='<ATM_OWN>';
rollback;
```
Esperado: `earnings = 0`.

**T5 — ATM `pending` ou com `deleted_at` é rejeitado**
```sql
begin;
select public.create_ad_unlock_anon('<DEVICE_A>', '<ATM_PENDING>');
rollback;
```
Esperado: `ERROR: ATM não encontrado ou indisponível.`
(Se não houver um `pending` disponível, testar com um `uuid` inexistente — o mesmo `raise exception`.)

**T6 — `agent_earnings` aceita `user_id IS NULL` com `source='ad_view_anon'`** — já implícito em T3 (`user_null = true`). Confirmar que não há CHECK em `source`:
```sql
select conname, pg_get_constraintdef(oid) from pg_constraint
where conrelid = 'public.agent_earnings'::regclass and contype = 'c';
```
Esperado: nenhuma constrainte `source`.

**T7 — `anon` NÃO consegue `SELECT` em `anon_ad_unlocks`** (via REST, fora da transação — precisa de linhas):
```powershell
# com anon key do .env
Invoke-WebRequest "$env:EXPO_PUBLIC_SUPABASE_URL/rest/v1/anon_ad_unlocks?select=*" -Headers @{apikey=$env:EXPO_PUBLIC_SUPABASE_ANON_KEY; Authorization="Bearer $env:EXPO_PUBLIC_SUPABASE_ANON_KEY"}
```
Esperado: `200 []` (RLS activo, zero policies) — **nunca** as linhas criadas acima.

**T8 — `flyer_bonus_check` só paga com `flyer_submissions.approved`**
```sql
-- 8a. sem submissão aprovada
begin;
select public.create_ad_unlock_anon('<DEVICE_A>', '<ATM>');
select count(*) as rewarded from public.flyer_submissions where agent_id='<AGENT>' and status='rewarded';
rollback;
```
Esperado: `rewarded = 0`.

```sql
-- 8b. com submissão approved e ≥ flyer_views_unlock views (incl. anónimas)
begin;
insert into public.flyer_submissions (agent_id, atm_id, photo_url, latitude, longitude, distance_m, status)
values ('<AGENT>', '<ATM>', 'x/y.jpg', 0, 0, 0, 'approved');
select public.create_ad_unlock_anon('<DEVICE_A>', '<ATM>');  -- 1 view
-- repetir até count(agent_earnings) >= flyer_views_unlock
select public.flyer_bonus_check('<AGENT>');
select status, amount_kz from public.flyer_submissions where agent_id='<AGENT>';
select agent_balance_kz from public.profiles where user_id='<AGENT>';
rollback;
```
Esperado: `status = 'rewarded'`, `amount_kz = 700.00`, saldo aumentando em 700 (+ as comissões).

**Gate T2:** os 9 blocos passam **e** `select count(*) from public.anon_ad_unlocks;` volta a `0` (nada ficou de fora dos `ROLLBACK`).

---

## T3 — `src/lib/device.ts` (novo)

```ts
import * as SecureStore from 'expo-secure-store'

const DEVICE_ID_KEY = 'atm_connect_device_id'

let cached: string | null = null

function formatUuidV4(bytes: number[]): string {
  const b = [...bytes]
  b[6] = (b[6] & 0x0f) | 0x40  // versão 4
  b[8] = (b[8] & 0x3f) | 0x80  // variante RFC 4122
  const hex = b.map((n) => (n & 0xff).toString(16).padStart(2, '0'))
  return (
    hex.slice(0, 4).join('') + '-' +
    hex.slice(4, 6).join('') + '-' +
    hex.slice(6, 8).join('') + '-' +
    hex.slice(8, 10).join('') + '-' +
    hex.slice(10, 16).join('')
  )
}

function randomUuidV4(): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Crypto = require('expo-crypto')
    if (typeof Crypto?.randomUUID === 'function') {
      return Crypto.randomUUID() as string
    }
  } catch {
    // expo-crypto indisponível (Expo Go / web) — cai no fallback
  }
  const bytes: number[] = []
  for (let i = 0; i < 16; i++) bytes.push(Math.floor(Math.random() * 256))
  return formatUuidV4(bytes)
}

export async function getDeviceId(): Promise<string> {
  if (cached) return cached

  try {
    const existing = await SecureStore.getItemAsync(DEVICE_ID_KEY)
    if (existing) {
      cached = existing
      return existing
    }
  } catch (e) {
    console.warn('[device] leitura falhou:', e instanceof Error ? e.message : String(e))
  }

  const generated = randomUuidV4()
  try {
    await SecureStore.setItemAsync(DEVICE_ID_KEY, generated)
  } catch (e) {
    // Sem persistência o id muda a cada arranque. O primary key no servidor
    // ainda impede comissão dupla dentro da mesma sessão.
    console.warn('[device] gravação falhou:', e instanceof Error ? e.message : String(e))
  }
  cached = generated
  return generated
}
```

**Gate:** `npx tsc --noEmit` sem erros.

---

## T4 — `src/lib/ad-unlocks-store.ts` (novo)

```ts
import * as SecureStore from 'expo-secure-store'
import { getDeviceId } from './device'

const KEY_PREFIX = 'atm_connect_unlocks_'
const keyFor = (deviceId: string) => `${KEY_PREFIX}${deviceId}`

function warn(scope: string, e: unknown) {
  console.warn(`[ad-unlocks] ${scope}:`, e instanceof Error ? e.message : String(e))
}

export async function readAnonUnlocks(): Promise<Map<string, string>> {
  const out = new Map<string, string>()
  try {
    const deviceId = await getDeviceId()
    const raw = await SecureStore.getItemAsync(keyFor(deviceId))
    if (!raw) return out
    const parsed = JSON.parse(raw) as Record<string, string>
    const now = Date.now()
    Object.entries(parsed).forEach(([atmId, expiresAt]) => {
      if (new Date(expiresAt).getTime() > now) out.set(atmId, expiresAt)
    })
  } catch (e) {
    warn('readAnonUnlocks', e)
  }
  return out
}

export async function writeAnonUnlock(atmId: string, expiresAt: string): Promise<void> {
  try {
    const deviceId = await getDeviceId()
    const current = await readAnonUnlocks()
    current.set(atmId, expiresAt)
    const serialised = JSON.stringify(Object.fromEntries(current))
    if (serialised.length <= 2048) {
      await SecureStore.setItemAsync(keyFor(deviceId), serialised)
    } else {
      // Só guarda os mais recentes para não rebentar o limite do SecureStore
      // (ver o adaptador com chunking em src/lib/supabase.ts:49-90).
      const trimmed = Object.fromEntries(
        [...current.entries()]
          .sort((a, b) => new Date(b[1]).getTime() - new Date(a[1]).getTime())
          .slice(0, 30)
      )
      await SecureStore.setItemAsync(keyFor(deviceId), JSON.stringify(trimmed))
    }
  } catch (e) {
    warn('writeAnonUnlock', e)
  }
}

export async function clearAnonUnlocks(): Promise<void> {
  try {
    const deviceId = await getDeviceId()
    await SecureStore.deleteItemAsync(keyFor(deviceId))
  } catch (e) {
    warn('clearAnonUnlocks', e)
  }
}
```

**Nota:** a chave inclui o `device_id` para que dois dispositivos nunca partilham o mesmo slot do SecureStore.

---

## T5 — `src/lib/supabase-types.ts`

Adicionar o tipo da tabela e a assinatura do RPC, seguindo o formato já existente no ficheiro para `ad_unlocks`.

```ts
anon_ad_unlocks: {
  Row: { device_id: string; atm_id: string; expires_at: string; created_at: string }
  Insert: { device_id: string; atm_id: string; expires_at: string; created_at?: string }
  Update: { device_id?: string; atm_id?: string; expires_at?: string; created_at?: string }
  Relationships: []
}
```

E nas `Functions`, junto de `create_ad_unlock`:
```ts
create_ad_unlock_anon: {
  Args: { p_device_id: string; p_atm_id: string }
  Returns: string
}
```

**Gate:** `npx tsc --noEmit` sem erros.

---

## T6 — `src/hooks/useAdUnlocks.ts` (modo duplo)

**Interface nova:**
```ts
export interface UseAdUnlocksResult {
  unlocks: Map<string, string> // atmId -> expiresAt (ISO)
  hasValidUnlock: (atmId: string) => boolean
  createUnlock: (atmId: string) => Promise<{ ok: boolean; expiresAt?: string }>
  loading: boolean
  refetch: () => Promise<void>
}
```

**Imports a adicionar:**
```ts
import { getDeviceId } from '../lib/device'
import { readAnonUnlocks, writeAnonUnlock } from '../lib/ad-unlocks-store'
```

**`fetchUnlocks` — sem `user` passa a ler o store local** (hoje sai cedo com `Map` vazio, `useAdUnlocks.ts:20-24`):
```ts
const fetchUnlocks = useCallback(async () => {
  if (!user) {
    setUnlocks(await readAnonUnlocks())
    setLoading(false)
    return
  }
  // ... resto igual (query a ad_unlocks) ...
}, [user])
```

**A subscription de realtime** (`useAdUnlocks.ts:55-67`) continua sob `if (!user) return` — inalterada, porque o modo anónimo não tem subscription.

**`createUnlock` — bifurca:**
```ts
const createUnlock = useCallback(
  async (atmId: string): Promise<{ ok: boolean; expiresAt?: string }> => {
    try {
      if (user) {
        const { data, error } = await supabase.rpc('create_ad_unlock', { p_atm_id: atmId })
        if (error || data !== true) {
          console.error('Error creating ad_unlock:', error?.message ?? 'RPC returned false')
          return { ok: false }
        }
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        setUnlocks((prev) => {
          const next = new Map(prev)
          next.set(atmId, expiresAt)
          return next
        })
        return { ok: true, expiresAt }
      }

      const deviceId = await getDeviceId()
      const { data, error } = await supabase.rpc('create_ad_unlock_anon', {
        p_device_id: deviceId,
        p_atm_id: atmId,
      })
      if (error || !data) {
        console.error('Error creating anon ad_unlock:', error?.message ?? 'RPC sem retorno')
        return { ok: false }
      }
      // expires_at vem do servidor — não estimar 24 h no cliente
      const expiresAt = String(data)
      await writeAnonUnlock(atmId, expiresAt)
      setUnlocks((prev) => {
        const next = new Map(prev)
        next.set(atmId, expiresAt)
        return next
      })
      return { ok: true, expiresAt }
    } catch (e) {
      console.error('Failed to create ad_unlock:', e)
      return { ok: false }
    }
  },
  [user]
)
```

**Nota de comportamento:** no login, `fetchUnlocks` passa a ler a BD e os unlocks anónimos locais deixam de contar (não há merge). É deliberado — a BD é autoritativa e o PK/`unique` do servidor é o que impede dupla comissão.

**Todos os consumidores de `createUnlock` têm de ser actualizados** (agora `map.tsx:121`) — erro de compilação do `tsc` se algum ficar com o booleano.

---

## T7 — `ATMList.tsx` + `MapboxWebView.tsx` + `ATMMapView.tsx` (+ `favorites/index.tsx`)

> **Correcção de âmbito (achada na implementação, ausente na spec):** o lock `!(isLoggedIn && lockedIds?.has(atm.id))` está em **três** sítios, não num. A spec só listava o `ATMList`. Sem corrigir o `MapboxWebView.buildGeoJSON` (linha 28), o visitante anónimo desbloqueia o ATM e o **marcador no mapa continua cinzento** — o bug mais visível da feature. O `ATMMapView` só repassa props; o `app/favorites/index.tsx:52` tem de deixar de passar `isLoggedIn`.

**1. `isLocked` deixa de exigir login** (linha 151-157):
```ts
const isLocked = useCallback(
  (atm: ATMWithDistance) => {
    if (isPremium) return false
    return !lockedIds?.has(atm.id)
  },
  [isPremium, lockedIds]
)
```

**2. Remover `isLoggedIn`** da destructuring (linha 148) e da interface `ATMListProps` (linha 22) — deixa de ser usado em lado nenhum do componente. `map.tsx` tem de parar de o passar.

**Gate:** `npx tsc --noEmit` — o único erro esperado é o de `map.tsx` a passar a prop removida, que se resolve em T9.

---

## T8 — `src/components/map/ATMDetailSheet.tsx`

**Nota de implementação (desvIO do plano, mantida no registo):** o soft gate acabou por ficar **inteiro em `map.tsx`** (`requireAuth` em `handleVote`/`handleToggleFavorite`) e **não** no componente. Passar `onRequireAuth(motivo)` ao `ATMDetailSheet` dava uma prop morta — o sheet já só recebe `onVote`/`onToggleFavorite`, que são os callbacks que disparam o gate. A unica prop nova que sobreviveu e `onCreateAccount: () => void` (o botao "Criar conta" do nudge vai directo a `/(auth)/register`, sem Alert). O `isLoggedIn` mantem-se no sheet **apenas** para a condicao do nudge.
**Refinamento face à spec:** a spec §5.2 diz "sai `isLoggedIn`", mas §2 exige nunca esconder o botão. Mantém-se `isLoggedIn` (é preciso para decidir a visibilidade do nudge) e sai `onLogin`, que é substituído por `onRequireAuth`.

**1. Nova assinatura:**
```ts
interface ATMDetailSheetProps {
  atm: ATMWithDistance | null
  visible: boolean
  unlocked: boolean
  unlocking: boolean
  isLoggedIn: boolean
  userVote?: 'like' | 'dislike' | null
  agentRating?: { likes: number; dislikes: number } | null
  isFavorite?: boolean
  onToggleFavorite?: () => void
  onVote?: (value: 'like' | 'dislike') => void
  onClose: () => void
  onWatchAd: () => void
  adLoading?: boolean
  onRequireAuth: (motivo: string) => void
  showNudge?: boolean
  onDismissNudge?: () => void
  onCreateAccount?: () => void
}
```

**2. Unificar o estado locked** — substituir as duas branches de `ATMDetailSheet.tsx:243-265` por um único botão:
```tsx
<AppButton
  label={adLoading ? 'A carregar anúncio...' : 'Ver anúncio para desbloquear'}
  onPress={onWatchAd}
  fullWidth
  size="lg"
  style={{ backgroundColor: colors.brand[600] }}
  loading={unlocking || adLoading}
  disabled={adLoading}
  icon="play-circle-outline"
  haptic
/>
```
A `bank_name`/`address`/`cidade` do estado locked (linhas 221-241) e o coração (linhas 232-240) **mantêm-se** — o visitante anónimo vê o nome e a morada antes de desbloquear, que é o objectivo de reduzir a fricção.

**3. Coração do estado unlocked** (linha 107-115) — visível para todos, toque com soft gate:
```tsx
{onToggleFavorite && (
  <TouchableOpacity
    onPress={() => (isLoggedIn ? onToggleFavorite() : onRequireAuth('Inicia sessão para guardar ATMs favoritos.'))}
    hitSlop={10}
    style={{ padding: 2 }}
  >
    <AppIcon name={isFavorite ? 'heart' : 'heart-outline'} size={22} color={isFavorite ? '#EA4335' : colors.text.secondary} />
  </TouchableOpacity>
)}
```
(Igual no estado locked, linha 232.)

**4. Botões de voto** (linhas 160-197) — soft gate:
```tsx
onPress={() => (isLoggedIn ? onVote?.('like') : onRequireAuth('Inicia sessão para avaliar a fiabilidade dos agentes.'))}
```
e o mesmo para `'dislike'`.

O bloco de voto está dentro de `atm.agent_id && agentRating` (linha 154) — como `get_agent_rating_stats` já responde a `anon`, o bloco passa a aparecer para anónimos. Confirmar em T12.

**5. Card de nudge** — no fim do `ScrollView` unlocked, antes do `</ScrollView>` da linha 218:
```tsx
{showNudge && (
  <View
    style={{
      backgroundColor: colors.brand[50],
      borderRadius: 12,
      padding: 14,
      marginTop: 14,
    }}
  >
    <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text.primary, marginBottom: 4 }}>
      Guarda os teus ATMs favoritos
    </Text>
    <Text style={{ fontSize: 13, color: colors.text.secondary, lineHeight: 19 }}>
      Cria uma conta grátis para guardar favoritos, ver o histórico de views e, se quiseres, submeter o teu próprio ATM e ganhar por cada vista.
    </Text>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12 }}>
      <AppButton
        label="Criar conta"
        onPress={() => onCreateAccount?.()}
        size="sm"
        style={{ backgroundColor: colors.brand[600] }}
        icon="person-add-outline"
        haptic
      />
      <TouchableOpacity onPress={() => onDismissNudge?.()} hitSlop={8}>
        <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text.secondary }}>Agora não</Text>
      </TouchableOpacity>
    </View>
  </View>
)}
```

**Gate:** `npx tsc --noEmit` — erros esperados apenas nas props que `map.tsx` ainda não passa.

---

## T9 — `app/(tabs)/map.tsx`

**1. Imports:** já tem `Alert` (linha 5). Precisa de `useState` para o nudge — já importado (linha 1).

**2. Novo estado + soft gate**, depois do `useState` de `userVote` (linha 46):
```tsx
const [showNudge, setShowNudge] = useState(false)

const handleRequireAuth = useCallback((motivo: string) => {
  Alert.alert('Inicia sessão', motivo, [
    { text: 'Cancelar', style: 'cancel' },
    { text: 'Entrar', onPress: () => router.push('/(auth)/login') },
  ])
}, [router])

const handleToggleFavorite = useCallback((atmId: string) => {
  if (!user) {
    handleRequireAuth('Inicia sessão para guardar ATMs favoritos.')
    return
  }
  void toggleFavorite(atmId)
}, [user, handleRequireAuth, toggleFavorite])
```

**3. `handleWatchAd`** (linha 104-136) — sai o `router.push('/(auth)/login')` (linhas 106-109); o `createUnlock` passa a devolver `{ ok }`:
```tsx
const handleWatchAd = useCallback(async () => {
  if (!selectedATM) return
  if (unlocking || adLoading) return
  if (!isLoaded) {
    loadRewarded()
    return
  }
  setUnlocking(true)
  try {
    const watched = await showRewarded()
    if (watched) {
      const { ok } = await createUnlock(selectedATM.id)
      if (ok) {
        setUnlocked(true)
        if (!user) setShowNudge(true)
      } else {
        Alert.alert(
          'Não foi possível desbloquear',
          'Viste o anúncio, mas ocorreu um erro ao aplicar o desbloqueio. Tenta de novo.'
        )
      }
    }
  } catch (e) {
    console.warn('Watch ad error:', e)
  } finally {
    setUnlocking(false)
  }
}, [selectedATM, user, unlocking, adLoading, isLoaded, showRewarded, createUnlock, loadRewarded])
```

**4. `handleVote`** (linha 138-157) — trocar o push por soft gate:
```tsx
if (!user) {
  handleRequireAuth('Inicia sessão para avaliar a fiabilidade dos agentes.')
  return
}
```

**5. `handleCloseSheet`** (linha 159-162) — não limpar o nudge ao fechar (o estado vive no ecrã, não no ATM):
```tsx
const handleCloseSheet = () => {
  setSheetVisible(false)
  setUnlocked(false)
}
```
Isto é o que já está — **manter como está**.

**6. `ATMList`** (linha 237-250): trocar `onToggleFavorite={(atmId) => { void toggleFavorite(atmId) }}` por `onToggleFavorite={handleToggleFavorite}` e remover `isLoggedIn={!!user}`.

**7. `ATMDetailSheet`** (linha 280-295) — props novas:
```tsx
<ATMDetailSheet
  atm={selectedATM}
  visible={sheetVisible}
  unlocked={unlocked || isPremium || (selectedATM ? hasValidUnlock(selectedATM.id) : false)}
  unlocking={unlocking}
  isLoggedIn={!!user}
  userVote={userVote}
  agentRating={agentRating}
  isFavorite={selectedATM ? isFavorite(selectedATM.id) : false}
  onToggleFavorite={() => { if (selectedATM) handleToggleFavorite(selectedATM.id) }}
  onVote={handleVote}
  onClose={handleCloseSheet}
  onWatchAd={handleWatchAd}
  adLoading={adLoading}
  onRequireAuth={handleRequireAuth}
  showNudge={showNudge}
  onDismissNudge={() => setShowNudge(false)}
  onCreateAccount={() => router.push('/(auth)/register')}
/>
```

**Gate:** `npx tsc --noEmit` limpo. `npx expo lint` limpo.

---

## T10 — `app/(tabs)/_layout.tsx` + `app/ranking/_layout.tsx`

**1. `headerRight` do mapa** (linhas 58-95) — troféu sempre, estrela+sino só com `user`, "Entrar" para anónimos:
```tsx
headerRight: () => (
  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16 }}>
    <TouchableOpacity onPress={() => router.push('/ranking')} style={{ padding: 4 }} hitSlop={8}>
      <AppIcon name="trophy-outline" size={22} color="#FFFFFF" />
    </TouchableOpacity>
    {user && (
      <>
        <TouchableOpacity onPress={() => router.push('/favorites')} style={{ padding: 4 }} hitSlop={8}>
          <AppIcon name="star-outline" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push('/notifications')} style={{ padding: 4 }} hitSlop={8}>
          <View>
            <AppIcon name="notifications-outline" size={22} color="#FFFFFF" />
            {unreadCount > 0 && (
              <View style={{ position: 'absolute', top: -4, right: -6, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 }}>
                <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </>
    )}
    {!user && (
      <TouchableOpacity onPress={() => router.push('/(auth)/login')} style={{ paddingHorizontal: 8 }}>
        <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Entrar</Text>
      </TouchableOpacity>
    )}
  </View>
),
```

`trophy-outline` e `trophy` são nomes válidos de `Ionicons` (`AppIconName` é `ComponentProps<typeof Ionicons>['name']`, `src/components/ui/AppIcon.tsx:4`), portanto o `tsc` valida-os.

**2. `app/ranking/_layout.tsx:20`** — o `fallback` aponta para `/(tabs)/profile`, que é login-gated. Como o ranking passa a ser alcançável a partir do mapa, mudar para o mapa:
```tsx
headerLeft: () => <HeaderBackButton fallback="/(tabs)/map" color={colors.text.primary} />,
```

**Gate:** `npx tsc --noEmit` + `npx expo lint` limpos.

---

## T11 — `LOG.md`

**1. Entrada da feature** no topo da secção de entries (formato `YYYY-MM-DD`, como as existentes), a descrever: o que mudou, os 12 ficheiros, a migração, e o facto de o mapa **já** abrir sem login (o bloqueio era cliente + o `grant execute` do RPC).

**2. Actualizar o "Relatório do Estado da BD"** (regra do `AGENTS.md`) — nova linha na tabela:
```
| **`anon_ad_unlocks`** | **0 rows** | tabela nova (device_id, atm_id, expires_at, created_at), PK (device_id, atm_id), RLS ligado **sem policies** (escrita só via RPC), **fora** da publication supabase_realtime; trigger `trg_anon_ad_commission` AFTER INSERT OR UPDATE → `credit_ad_commission`; RPC `create_ad_unlock_anon(uuid,uuid)` SECURITY DEFINER, `grant execute` só a `anon`, devolve `expires_at`, auto-poda expirados do próprio device |
```
E na lista de migrações aplicadas, acrescentar `20261003000001_anon_ad_unlocks.sql` com a data de aplicação e ✅.

**3. Risco B15** — entrada própria, a seguir ao B14 (`LOG.md:181`):
> **B15 — `device_id` forjável (risco aceite).** `create_ad_unlock_anon` confia no `p_device_id` enviado pelo cliente. Um atacante pode gerar um ID novo por pedido e criar comissões ilimitadas para um ATM agente; o PK `(device_id, atm_id)` não trava nada porque cada ID forjado é novo. Pior que o B14 (que exigia falsificar uma chamada autenticada) — nem login é preciso. **Gravidade real = 0 enquanto os AdMob IDs forem de teste** (os 6 no `.env` são `ca-app-pub-3940256099942544/…`, conta de teste do Google). Mitigação actual: 0,15 Kz/unidade. **Fix definitivo: AdMob SSV** — o `showRewarded` manda o payload `rewarded` para uma Edge Function que valida com a AdMob API antes de `credit_ad_commission`. Obrigatório antes de substituir os IDs de teste por IDs reais.

**4. Notas de follow-up** — as duas de §10 da spec: SSV, e o dashboard de admin do flyer no repo web (esta última com pointer para uma nota em `docs/` do repo `atm-connect-angola`).

**Commit:** `docs(log): view anonima por anuncio + risco B15`

---

## T12 — Verificação final

**Cliente (executa o utilizador):**
```bash
npx tsc --noEmit
npx expo lint
```
Zero erros / zero problemas.

**Walkthrough no device (utilizador, `eas build --platform android --profile preview`):**

1. Abrir a app **sem login** → o mapa carrega ATMs (não fica vazio).
2. Lista: os ATMs aparecem como "🔒 Bloqueado / Ver detalhes", **não** "Entrar".
3. Tocar num ATM → o detalhe mostra nome, morada e **"Ver anúncio para desbloquear"** (não "Entrar para ver detalhes").
4. Premir o botão → o rewarded corre → o ATM desbloqueia e mostram-se estado, dinheiro/papel, fila, distância e "actualizado há".
5. O **nudge** aparece no fim do detalhe → dispensar com "Agora não" ou premir "Criar conta" (vai a `/(auth)/register`).
6. Tocar no **coração** → `Alert` "Inicia sessão para guardar ATMs favoritos." com Cancelar/Entrar.
7. Tocar nos **votos** → `Alert` "Inicia sessão para avaliar a fiabilidade dos agentes."
8. O bloco de likes/dislikes **é visível** para anónimos (confirma que `get_agent_rating_stats` devolve 200 sem sessão).
9. **Troféu** no header do mapa → abre `/ranking` com a lista de agentes; voltar funciona.
10. Fechar a app e reabrir **sem login** → o ATM continua desbloqueado (o `device_id` e o unlock persistente no SecureStore).
11. **Login** com uma conta de agente → confirmar que: os unlocks passam a vir da BD, o coração e o voto funcionam, o saldo do agente foi creditado com as comissões anónimas, e o "Ranking" da perfil continua acessível.

**BD:** repetir `select count(*) from public.anon_ad_unlocks;` e confirmar que só há linhas dos dispositivos de teste (não zero — esperado).

---

## Fora de âmbito (reiterado)

SSV do AdMob · substituir IDs de teste por IDs reais · dashboard de admin do flyer no repo web · refactor do UI premium · `atm_views` (o sistema legado de views por saldo/dia continua intocado e sem uso pelo app).

---

## Commits

| Ordem | Mensagem | Ficheiros |
|---|---|---|
| 1 | `docs(spec): ver ATMs sem login — anonimo por anuncio com comissao ao agente` | spec (já feito) |
| 2 | `chore(deps): expo-crypto para o device_id do visitante anonimo` | `package.json` + `package-lock.json` |
| 3 | `feat(db): desbloqueio anonimo por device_id com comissao ao agente` | `20261003000001_anon_ad_unlocks.sql` |
| 4 | `feat(anon): desbloquear ATMs sem login — device id, store local e tipos` | `src/lib/device.ts`, `src/lib/ad-unlocks-store.ts`, `src/lib/supabase-types.ts` |
| 5 | `feat(anon): unlock anonimo por device_id no hook de ads` | `src/hooks/useAdUnlocks.ts` |
| 6 | `feat(anon): ver ATMs sem login — lista, detalhe, soft gate e ranking no header` | `ATMList.tsx`, `ATMDetailSheet.tsx`, `map.tsx`, `(tabs)/_layout.tsx`, `ranking/_layout.tsx` |
| 7 | `docs(log): view anonima por anuncio + risco B15` | `LOG.md` |
