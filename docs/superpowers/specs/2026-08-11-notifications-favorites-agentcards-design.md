# Design — Notificações + Favoritos de ATM + Fix Dashboard do Agente

**Data:** 2026-08-11
**Estado:** Proposta para aprovação (nada implementado ainda)
**Stack:** Expo SDK 54 / RN 0.81.5 / Expo Router / NativeWind / Supabase Staging (`ndvjitfovhfngrzwtytd`)

---

## 1. Visão Geral

Três frentes independentes no mesmo plano:

1. **Sistema de notificações** — centro in-app (funciona em Expo Go) + push remoto (exige dev client) para os eventos importantes de admin.
2. **Favoritos de ATM** — o utilizador guarda ATMs e acede-lhes rapidamente; o desbloqueio mantém a lógica normal de views/premium.
3. **Fix do dashboard do agente** — cards de "Total ganho"/"Disponível" com fundo a desaparecer quando o agente começa a receber valores + texto "Toca aqui para fazer levantamento".

---

## 2. Base de Dados (migrações SQL — o utilizador aplica no staging)

### 2.1 Nova tabela `push_tokens`
```sql
create table if not exists public.push_tokens (
  user_id uuid primary key references public.profiles(user_id) on delete cascade,
  token text not null,
  platform text,
  updated_at timestamptz default now()
);
```
- RLS: SELECT/INSERT/UPDATE/DELETE apenas do próprio user (`auth.uid() = user_id`).
- **Limitação (MVP):** PK = `user_id` significa 1 token por conta. Multi-device exigiria PK `id` + `unique(user_id, token)` — fora de âmbito agora.

### 2.1.1 Realtime publication (obrigatório)
```sql
alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.atm_favorites;
```
Sem isto, `postgres_changes` no cliente (badge de notificações / favoritos) não entrega nada.

### 2.2 Nova tabela `atm_favorites`
```sql
create table if not exists public.atm_favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  atm_id uuid not null references public.atms(id) on delete cascade,
  created_at timestamptz default now(),
  unique (user_id, atm_id)
);
```
- RLS: SELECT/INSERT/DELETE apenas do próprio user.

### 2.3 RLS em `notifications`
- Garantir SELECT e UPDATE(`read`) para o próprio user (colunas: `user_id`, `title`, `message`, `type`, `read`, `created_at`).

### 2.4 Triggers de notificação (helper `create_notification`)
Helper `SECURITY DEFINER` que insere em `notifications` e, nos tipos de push, chama `send_expo_push`.

| Evento | Tipo | Canal |
|---|---|---|
| `atms.status_approval` → `approved` | `atm_approved` | notif + push |
| `atms.status_approval` → `rejected` | `atm_rejected` | notif + push |
| `subscriptions.status` → `approved` | `subscription_approved` | notif + push |
| `subscriptions.status` → `rejected` | `subscription_rejected` | notif + push |
| `withdrawals.status` → `approved` | `withdrawal_approved` | notif + push |
| `withdrawals.status` → `rejected` | `withdrawal_rejected` | notif + push |
| `atm_views` insert | `view_commission` | só in-app |
| `agent_ratings` insert | `atm_rating` | só in-app |
| `forum_comments` insert | `forum_reply` | só in-app |
| `profiles` insert com `invited_by` | `referral_new` | só in-app |

### 2.5 `send_expo_push(user_id, title, message, type)`
- `SECURITY DEFINER`, lê os tokens de `push_tokens` do user.
- POST para `https://exp.host/--/api/v2/push/send` via `pg_net` (`net.http_post`) — assíncrono.
- Se existir `EXPO_ACCESS_TOKEN` no Vault, envia com header `Authorization: Bearer`; senão envia sem token (funciona para dev/staging).
- Regista o pedido em `push_log`.

**Pré-requisitos na migração:**
```sql
create extension if not exists pg_net;
-- garantir acesso da função ao Vault
grant usage on schema vault to postgres; -- owner da função SECURITY DEFINER
-- na função: set search_path = public;
insert into vault.secrets (name, secret) values ('EXPO_ACCESS_TOKEN', '<token>')
  on conflict (name) do update set secret = excluded.secret; -- opcional, setup manual

### 2.6 Nova tabela `push_log` (debug)
- `id`, `user_id`, `type`, `payload` (jsonb), `response_status`, `created_at`.

### 2.7 Textos de notificação (PT, tom tu)
- `atm_approved`: "ATM aprovado" / "O teu ATM «{bank_name}» foi aprovado e já aparece no mapa."
- `atm_rejected`: "ATM rejeitado" / "O teu ATM «{bank_name}» foi rejeitado: {motivo}."
- `subscription_approved`: "Premium ativo" / "A tua subscrição foi aprovada. Aproveita sem limites!"
- `subscription_rejected`: "Subscrição rejeitada" / "A tua subscrição não foi aprovada. Contacta o apoio."
- `withdrawal_approved`: "Levantamento aprovado" / "Recebeste {valor} Kz."
- `withdrawal_rejected`: "Levantamento rejeitado" / "{motivo}."
- `view_commission`: "Ganhaste 0.15 Kz" / "Uma pessoa viu o teu ATM «{bank_name}»."
- `atm_rating`: "Nova avaliação" / "O teu ATM «{bank_name}» recebeu uma avaliação."
- `referral_new`: "Novo convidado" / "{nome} registou-se com o teu código."
- `forum_reply`: "Nova resposta" / "{nome} respondeu ao teu post."

> **Risco a validar na implementação:** se o web admin já insere notificações ao aprovar, pode haver duplicação (trigger + web). Confirma-se no staging; se duplicar, desactivar o `notify_user` do web para esses 3 eventos (follow-up no repo web).

---

## 3. Cliente — Notificações

- **Instalar (utilizador executa):** `npx expo install expo-notifications expo-device`
- **`app.json`:** plugin `expo-notifications` (ícone `./assets/icon.png`, cor `#2F7BF0`).
- **`src/hooks/useNotifications.ts` reescrito:**
  - Pede permissão apenas com sessão iniciada.
  - `getExpoPushTokenAsync()` e upsert em `push_tokens` (`user_id`, `token`, `platform`).
  - Em Expo Go/emulador o token não existe → degrada sem crash (in-app continua).
  - Listener de resposta (toque) → deep-link por tipo.
  - **Cold start (app morto):** no arranque com sessão, chamar `getLastNotificationResponseAsync()` — se devolver resposta com `data.type`, aplicar o mesmo deep-link. Sem isto o toque numa notificação não navega quando o app está fechado.
- **Novo `src/hooks/useInAppNotifications.ts`:**
  - Lista de `notifications` do próprio user (order `created_at desc`).
  - `unreadCount`, `markRead(id)`, `markAllRead()`.
  - Realtime (`postgres_changes` em `notifications`) para badge em tempo real.
- **Novo ecrã `app/notifications/`** (`_layout.tsx` + `index.tsx`):
  - Ícone por tipo, ponto de não lida, toque → marca lida + navega. Empty state convidativo.
- **Sino no header do mapa** (`app/(tabs)/_layout.tsx`, `headerRight` quando logado): ícone `notifications-outline` + badge com `unreadCount` → `router.push('/notifications')`.

### Deep-links por tipo
| Tipo | Rota |
|---|---|
| `atm_approved`, `atm_rejected`, `withdrawal_approved`, `withdrawal_rejected`, `view_commission` | `/(tabs)/agent` |
| `subscription_approved`, `subscription_rejected` | `/(tabs)/profile` |
| `atm_rating` | `/(tabs)/map` |
| `referral_new` | `/referrals` |
| `forum_reply` | `/(tabs)/forum` |

---

## 4. Cliente — Favoritos

- **Novo `src/hooks/useFavorites.ts`:**
  - `favoriteIds: Set<string>`, `toggleFavorite(atmId)` (optimistic insert/delete), `favorites` (join `atm_favorites` + `atms`), `isFavorite(atmId)`.
  - Realtime/fetch ao montar e após login.
- **Heart no `ATMDetailSheet`:** ícone no canto do header (estados bloqueado e desbloqueado), preenchido se favorito.
- **Heart no card do `ATMList`:** ao lado do nome do banco (não conflita com o `onPress` do card).
- **Estrela no header do mapa** (ao lado do sino, quando logado) → `/favorites`.
- **Novo ecrã `app/favorites/`** (`_layout.tsx` + `index.tsx`):
  - Reutiliza o estilo do `ATMList`; mostra estado bloqueado/desbloqueado.
  - Tocar num favorito → `router.push({ pathname: '/(tabs)/map', params: { openAtm: atm.id } })`; o `map.tsx` abre o sheet desse ATM ao ganhar foco.
  - Desbloqueio normal: consome view / premium ilimitado. Empty state convidativo.
- **Lógica de desbloqueio mantida num só sítio** (mapa), sem duplicação.

---

## 5. Cliente — Fix Dashboard do Agente

### 5.1 Causa raiz
`AppCard` com `onPress` usa `Pressable` + style-callback + `transform: [{scale}]` + `borderCurve: 'continuous'` (`src/components/ui/AppCard.tsx:25-32`) — o mesmo padrão que causou o bug dos botões invisíveis no iOS/New Architecture (RN #54556/#52413) e já removido do `AppButton`. O card "Disponível" só fica clicável quando `availableBalance > 0` → ao receber valores passa a renderizar como `Pressable` com transform → fundo deixa de ser pintado. Mesmo padrão afecta cards da lista de ATMs (`ATMList.tsx:43`) e do supervisor.

### 5.2 Alterações
- **`src/components/ui/AppCard.tsx`:** branch com `onPress` → `TouchableOpacity` com estilo plano (sem `transform`, sem `borderCurve`, sem style-callback). Variante sem `onPress` (View) inalterada. Espelha o fix do `AppButton` (2026-08-08).
- **`app/(tabs)/agent.tsx` — `StatCard`:**
  - `numberOfLines={1}` + `adjustsFontSizeToFit` no valor monetário (evita overflow, ex. "30,000 Kz").
  - Novo prop `hint?: string` renderizado por baixo do valor.
- **Card "Disponível":** quando `availableBalance > 0` → `hint="Toca aqui para fazer levantamento"` (tom tu). Mantém o card âmbar "Acumula 500 Kz para levantar" quando saldo = 0.

---

## 6. Tipos e Config

- Estender `src/lib/supabase-types.ts`: tabelas `push_tokens`, `atm_favorites`, `push_log`.
- `app.json`: plugin `expo-notifications`.
- **Rebuild do dev client** (EAS) necessário para testar push; Expo Go testa in-app, favoritos e cards.

---

## 7. Testes e Verificação

1. Criar rotas novas (`app/notifications/`, `app/favorites/`) **antes** do `tsc`: com `experiments.typedRoutes` ligado, `router.push('/notifications')`/`'/favorites'` só passam no tipo depois do dev server regenerar `.expo/types/router.d.ts`. Ordem: `npx expo start` → `npx tsc --noEmit` → `npx expo lint`.
2. **Expo Go:** sino + badge, centro in-app, deep-links; favoritos (heart no sheet/lista, estrela, lista, desbloqueio); cards do dashboard do agente (fundo estável ao receber valores).
3. **Dev client:** push nos 3 eventos de admin (ex.: aprovar ATM no web admin → push chega); toque em notificação em cold start navega.
4. **BD:** aplicar migrações no staging (incl. `pg_net`, Vault, realtime publication); actualizar secção **"Relatório do Estado da BD"** no `LOG.md`.

---

## 8. Fora de Âmbito

- Alterações no repositório web (envio de push a partir do web admin) — follow-up se necessário.
- Guarda SQL do RPC `consume_atm_view` (agente não credita a si próprio) — follow-up antes da produção/AdMob.
- Migrações SQL pendentes anteriores (`20260811000001`, `20260811000002`) — o utilizador aplica em separado.
- AdMob — fica para depois (esta tarefa é anterior ao AdMob, conforme pedido).
