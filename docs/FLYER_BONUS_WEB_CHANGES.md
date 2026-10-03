# Alterações no Repo Web — Bónus do Flyer (700 Kz)

> ✅ **CUMPRIDA (2026-09-26).** Implementada no repo web no commit **`8409715 feat(web): painel de revisão/admin do bónus do flyer (700 Kz)`** — hoje HEAD do `atm-connect-angola` (`/dashboard/flyer-submissions`, `FlyerSubmissions.tsx`, `FlyerSubmissionDetailModal.tsx`, rota em `App.tsx`, nav em `DashboardLayout.tsx`). Verificação funcional: `atm-connect-angola\docs\VERIFICAR_FLYER_BONUS_STAGING.md` + `LOG.md:71-72` deste repo. Este ficheiro mantém-se como **referência histórica** do que foi pedido e como se fez — não há nada por fazer aqui.

> **Repo:** `C:\Users\juary\Downloads\atm-connect-angola` (Vite + React + Tailwind + TS).
> **Data:** 2026-09-22 — guia para implementar a revisão/administração do bónus do flyer.
> **Mobile:** já implementado no app (repo `atm-connect-mobile`) — esta checklist é a parte **web**.
> **BD:** aplicar primeiro a migração `20260922000001_flyer_bonus.sql` (decidida no design e presente no repo mobile) no SQL editor do staging **`ndvjitfovhfngrzwtytd`**.

---

## 1. Contexto do fluxo (para o admin web)

1. O agente **baixa o flyer no app**, imprime, cola junto a um **ATM próprio aprovado** e submete **foto + GPS pelo app** (distância ≤ 200 m, recalculada no servidor pelo RPC `create_flyer_submission`).
2. Cria uma linha em **`flyer_submissions`** com `status='submitted'` (1 bónus por agente — único nas linhas `submitted/approved/rewarded`). Notificação `info` é enviada a admin e supervisor (`notify_users_by_role`).
3. **O admin web revê a foto** e Aprova/Rejeita via RPC **`approve_flyer_submission(id, p_approve, p_reason)`**.
   - Aprovar → `status='approved'` (o agente é notificado `flyer_submission_approved`) e o RPC reavalia imediatamente `flyer_bonus_check`.
   - **O crédito é automático** quando `count(agent_earnings) >= flyer_views_unlock (30)`: trigger `trg_flyer_bonus_unlock` em `agent_earnings` ou a reavaliação na aprovação credita `balance_transactions` (`reference_type='adjustment'`) + `profiles.agent_balance_kz` + notificação `flyer_bonus`. **Aprovar nunca credita manualmente** — só liga o mecanismo de desbloqueio por views.
   - Rejeitar → `status='rejected'` (+ `review_notes` = motivo). Liberta o slot do agente (pode resubmeter).

**Tabela `flyer_submissions`:** `id, agent_id, atm_id, photo_url, latitude, longitude, distance_m, status('submitted','approved','rejected','rewarded'), amount_kz, obs, review_notes, created_at`.

## 2. Passos de implementação (por ficheiro)

### 2.1. BD — aplicar migração
Copiar `20260922000001_flyer_bonus.sql` do repo mobile e executar no SQL editor (staging). Cria:
`flyer_submissions` + RLS (own agent / admin+supervisor), índice único por agente activo, bucket **`flyer-photos`** + policies (espelho de `atm-photos`), RPCs `create_flyer_submission` / `approve_flyer_submission`, função `flyer_bonus_check`, trigger em `agent_earnings`, `app_settings` **`flyer_bonus_kz=700`, `flyer_proximity_m=200`, `flyer_views_unlock=30`**, realtime para `flyer_submissions`.

### 2.2. Tipos Supabase — `src/integrations/supabase/types.ts`
- Adicionar a tabela `flyer_submissions` na secção `Tables` (Row/Insert/Update + `Relationships` para `profiles.user_id` e `atms.id`).
- Adicionar na secção `Functions` (junto a `approve_pending_atm`):
  ```ts
  create_flyer_submission: {
    Args: { p_atm_id: string; p_lat: number; p_lng: number; p_photo_url: string; p_obs?: string };
    Returns: string;
  };
  approve_flyer_submission: {
    Args: { p_submission_id: string; p_approve: boolean; p_reason?: string };
    Returns: undefined;
  };
  ```

### 2.3. Nova página de revisão — `src/pages/dashboard/FlyerSubmissions.tsx` (novo ficheiro)
Modelar à **`PendingATMs.tsx`** (mesmos padrões de UI/UX, RPCs de approve/reject, modal de motivo na rejeição):

- **Query:**
  ```ts
  supabase.from('flyer_submissions').select(`
    id, agent_id, atm_id, photo_url, latitude, longitude, distance_m, status, amount_kz, obs, review_notes, created_at,
    agent:agent_id (user_id, nome),
    atm:atm_id (id, bank_name, address, cidade, provincia)
  `).order('created_at', { ascending: false })
  ```
  Renderizar as linhas `status='submitted'` e `'approved'` (pendentes de acção). `'rewarded'`/`'rejected'` podem ficar num separador "histórico".
- **Filtrar** por `status` (filtro de tabs como na PendingATMs).
- **Foto:** carregar com `createSignedUrl` (não é público — espelho da PendingATMs):
  ```ts
  supabase.storage.from('flyer-photos').createSignedUrl(row.photo_url, 3600)
  ```
  Mostrar num zoom modal. O admin deve ver **o flyer colado + o ATM** na mesma foto.
- **Aprovar:** `supabase.rpc('approve_flyer_submission', { p_submission_id: id, p_approve: true })` + `insert_audit_log` (p_action_type `flyer_approved`).
- **Rejeitar:** modal de motivo → `supabase.rpc('approve_flyer_submission', { p_submission_id: id, p_approve: false, p_reason })` + `insert_audit_log` (`flyer_rejected`).
- **Info útil na coluna:** `distance_m` do agente (⇒ `X m`) e `total views` do agente (abstrair via `UserDetailDialog` existente, opcional) para o admin saber se o bónus já vai desbloquear de imediato.

### 2.4. Rota — `src/App.tsx`
Adicionar junto ao bloco `/dashboard/atms/pending` (~linha 102):
```tsx
<Route path="/dashboard/flyer-submissions" element={
  <AuthGuard requiredRoles={["admin", "supervisor"]}>
    <DashboardLayout title="Flyers para aprovar" subtitle="Bónus de imprimir e colar o flyer">
      <FlyerSubmissions />
    </DashboardLayout>
  </AuthGuard>
} />
```
(confirmar o guard/utilizado pelas outras rotas `dashboard`.)

### 2.5. Navegação — `src/components/DashboardLayout.tsx`
Adicionar ao `navItems` (~linha 54, junto a "ATMs pendentes"):
```ts
{ label: 'Flyers pendentes', href: '/dashboard/flyer-submissions', icon: Megaphone, roles: ['admin', 'supervisor'] }
```
(importar o ícone `Megaphone`/`ClipboardList` de `lucide-react` — já usados.)

### 2.6. Configurações — `src/pages/dashboard/Settings.tsx` (opcional)
Expor as 3 novas chaves de `app_settings` (`flyer_bonus_kz`, `flyer_proximity_m`, `flyer_views_unlock`) no mesmo padrão das restantes, para a equipa poder ajustar valor/distância/limiar sem SQL.

### 2.7. Notificações web (opcional)
O app mobile mapeia `flyer_submission_approved` / `flyer_submission_rejected` / `flyer_bonus` (deep-link `/agent`). No web, se o `NotificationBell` renderizar icon/título por tipo, adicionar estes 3 tipos (fallback é inofensivo).

## 3. Regras de negócio (não contornar no web)

- **Não existem policies de INSERT/UPDATE na tabela** — a criação é exclusiva do RPC `create_flyer_submission` (o app chama-o). A revisão web usa **apenas** `approve_flyer_submission`.
- **Não creditar manualmente.** O crédito (700 Kz) é automático quando o agente atinge `flyer_views_unlock` views E a submissão estiver `approved`. Se o admin aprovar e o agente já tiver ≥ 30 views, o RPC credita de imediato (por isso não duplicar com outra lógica no web).
- **1 bónus por agente.** Uma linha `submitted/approved/rewarded` bloqueia novo pedido. Só `rejected` liberta. O web não deve apagar linhas `rewarded` (referência de pagamento em `balance_transactions.reference_id`).
- **Realtime** já está ligado a `flyer_submissions` na migração — a página pode usar `postgres_changes` para actualizar sem refresh.

## 4. Aceitação (checklist para testar no staging)

1. Aplicar a migração; confirmar: tabela + policies + bucket `flyer-photos` + RPCs + `app_settings` (3 chaves).
2. Admin vê a lista vazia (ou as submissões existentes).
3. No app mobile: agente com ≥1 ATM aprovado completa o fluxo → a linha aparece na página web com foto assinada.
4. Aprovar: agente notificado; se já tinha ≥ 30 views → `balance_transactions` + `agent_balance_kz` + notificação `flyer_bonus`. Se não → só fica `approved`.
5. Rejeitar com motivo: agente notificado; slot liberta (novo pedido possível).
6. Sem submissões activas e agente com 30 views → nenhum crédito (não há slot).