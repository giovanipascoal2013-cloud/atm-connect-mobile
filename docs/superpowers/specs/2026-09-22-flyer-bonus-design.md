# Bónus do Flyer (700 Kz) — Design

**Data:** 2026-09-22 · **Estado:** aprovado + implementado (app mobile) · **Repo:** `atm-connect-mobile`
**Guia web:** `docs/FLYER_BONUS_WEB_CHANGES.md`

## 1. Objectivo

Dar aos agentes uma segunda forma de ganhar: **700 Kz** ao **imprimir e colar o flyer** (QR → `https://dinheiroemmao.com`) junto a um **ATM próprio aprovado**, com prova por **foto + GPS no momento**. O bónus é creditado **automaticamente** quando o agente atinge **30 views totais** (mesma métrica do dashboard). Um bónus **por agente**.

## 2. Decisões (brainstorming)

| Decisão | Escolha |
|---|---|
| Destino do QR | `https://dinheiroemmao.com` (QR estático, EC H, com logo central) |
| Arte | Flyer **estático**: `Design sem nome.png` → `assets/flyer-generic.png` (copiada já com o QR). Trocar destino = substituir o asset + regenerar QR (`scripts/generate-qr.mjs`, MODULE_SIZE configurável) |
| Submissão | **In-app** (não WhatsApp). Câmara + GPS no disparo (padrão `submit-atm.tsx`), upload `flyer-photos/{agentId}/{ts}.jpg` |
| Validação distância | **Servidor** (RPC `create_flyer_submission`): `haversine ≤ flyer_proximity_m (200)`. GPS do momento no row para auditoria |
| ATM alvo | **Apenas ATMs do agente com `status_approval='approved'`** (+ lat/lng presentes); ordenados por distância ao GPS actual; empty-state se 0 |
| Desbloqueio | `count(agent_earnings) ≥ 30` — "30 views" = total views do agente (igual a `stats.totalViews`) |
| Entregas | Crédito automático por trigger `trg_flyer_bonus_unlock` em `agent_earnings` + reavaliação no RPC de aprovação |
| 1 bónus/agente | Índice único parcial `agent_id WHERE status IN ('submitted','approved','rewarded')`; `rejected` liberta o slot |
| Estados | `submitted → approved → rewarded` (ou `rejected`) |
| Settings | `flyer_bonus_kz=700`, `flyer_proximity_m=200`, `flyer_views_unlock=30` (editáveis no web) |
| Notificações | `flyer_submission_approved/_rejected` (agente) + `flyer_bonus` (crédito, deep-link `/(tabs)/agent`); `info` para admin/supervisor em cada submissão |

## 3. Arquitectura

### Backend — migração `20260922000001_flyer_bonus.sql` (idempotente, raiz do repo)
- **`flyer_submissions`**: `id, agent_id→profiles(user_id)`, `atm_id→atms(id)`, `photo_url`, `latitude`, `longitude`, `distance_m`, `status CHECK('submitted','approved','rejected','rewarded')`, `amount_kz`, `obs`, `review_notes`, `created_at`.
- **RLS**: `select` own (agente) + `select` admin/supervisor via `has_role`. Sem INSERT/UPDATE own (criação só por RPC).
- **Bucket `flyer-photos`** (privado) + policies espelhadas de `atm-photos` (upload own pelo 1.º segmento do path = user id; select own; select admin/supervisor).
- **RPC `create_flyer_submission(p_atm_id, p_lat, p_lng, p_photo_url, p_obs?)`** SECURITY DEFINER: role agente; ATM próprio aprovado; lat/lng presentes; haversine no servidor vs `flyer_proximity_m`; dedupe por slot; insere; `notify_users_by_role` admin+supervisor.
- **`flyer_bonus_check(p_agent_id)`** (SECURITY DEFINER): lock `FOR UPDATE` da linha `approved/rewarded`; conta `agent_earnings`; lê `flyer_views_unlock`/`flyer_bonus_kz`; se ≥ limiar → `status='rewarded'`, `balance_transactions('credit','adjustment',…, reference_id=sub_id)`, `profiles.agent_balance_kz += bonus`, notificação `flyer_bonus`. **Anti-duplicação** pelo lock + `status='rewarded'`.
- **Trigger `trg_flyer_bonus_unlock`** AFTER INSERT OR UPDATE em `agent_earnings` → `flyer_bonus_check(new.agent_id)`.
- **RPC admin `approve_flyer_submission(p_submission_id, p_approve, p_reason?)`** SECURITY DEFINER (admin/supervisor): aprova → `approved` + notif + `flyer_bonus_check`; rejeita → `rejected` + `review_notes` + notif.
- Realtime para `flyer_submissions` (idempotente).

### Mobile (implementado)
- **`src/lib/flyer.ts`**: asset + `getFlyerAssetUri()`/`saveFlyerToLibrary()` (expo-asset + expo-media-library), `FLYER_PHOTO_BUCKET`, `FLYER_LANDING_URL`.
- **`src/hooks/useFlyerReward.ts`**: `useFlyerReward` (submissão do user + 3 settings com fallback) e `useFlyerAtms(userId)` (ATMs aprovados com distância ao GPS, ordenados).
- **`src/components/agent/FlyerPreviewModal.tsx`**: bottom-sheet com preview do flyer + 4 passos → `/agent/flyer`.
- **`app/agent/flyer.tsx`** (rota nova em `app/agent/_layout.tsx`): hero do flyer, "Como funciona" (5 passos), baixar (§1) → imprimir (§2) → escolher ATM (§3, radio com distâncias) → foto+GPS (§4, `CameraView` + `getCurrentPositionAsync({accuracy:1})`) → `create_flyer_submission`. Estados de submissão (`Em análise`/`Aprovado`/`Rejeitado`/`Bónus creditado`) + ProgressCard `X/30 views`. Apoio via WhatsApp (`suportWhatsAppUrl`).
- **`app/(tabs)/agent.tsx`**: cartão promocional "Ganha um bónus de 700 Kz" (abre o modal) + linha de estado/progresso quando existe submissão.
- **Notificações**: `flyer_bonus`, `flyer_submission_approved/_rejected` em `TYPE_META` (`app/notifications/index.tsx`) e `TYPE_HREF` (`src/hooks/useNotifications.ts`) → `/(tabs)/agent`.
- **Tipos**: `flyer_submissions` + 2 RPCs em `src/lib/supabase-types.ts`.
- **`app.json`**: plugin `expo-media-library` (photosPermission). Deps: `expo-media-library`, `expo-asset`.

## 4. Regras de negócio / limites

- 1 bónus por agente; pode resubmeter após rejeição.
- Comissão/views inalteradas; o bónus é um `adjustment` separado (não `earning`).
- ATM sem coordenadas → o RPC recusa com "submissão manual" (gap conhecido; revisão manual).
- **Cloud/integridade**: o crédito guarda `reference_id = flyer_submissions.id` em `balance_transactions` (auditável).

## 5. Verificação

- `npx tsc --noEmit` OK (0 erros) · `npx expo lint` OK (0 problemas).
- BD staging: aplicar migração `20260922000001_flyer_bonus.sql` (SQL editor) e actualizar relatório da BD no `LOG.md`.
- Web: seguir `docs/FLYER_BONUS_WEB_CHANGES.md`.

## 6. Pendente (utilizador)

1. Aplicar `20260922000001_flyer_bonus.sql` no staging.
2. Implementar a revisão web (`docs/FLYER_BONUS_WEB_CHANGES.md`).
3. Testar no dev client: baixar flyer → imprimir → escolher ATM → foto+GPS → submissão; aprovar no web; bater 30 views → crédito + notificação.