# LOG de Desenvolvimento — ATM Connect Mobile

## Estado Actual

### AdMob Rewarded Ads — integração completa + decisão do trigger (2026-08-13) 🚧 (tsc + lint OK; aguarda deps + SQL no staging + dev build)

Spec `docs/superpowers/specs/2026-08-13-admob-rewarded-ads-design.md`. Substitui o modelo "3 views/dia" por **1 rewarded ad = 1 ATM desbloqueado 24h** (sem limite diário). Premium continua sem anúncios.

- **Migração `20260813000001_ad_unlocks.sql`** (idempotente, raiz do repo — convenção): tabela `ad_unlocks` (unique `(user_id, atm_id)`, RLS select/insert/update/delete own), realtime publication, adaptação `agent_earnings` (`view_id` drop NOT NULL + colunas `user_id`/`source`), trigger `trg_ad_commission` que replica o pagamento do RPC legado (agent_earnings + balance_transactions + `agent_balance_kz` + notificação `ad_commission`, 0.15 Kz via `app_settings.agent_commission_free_view_kz`). Corrigida contra o schema real do staging (sem `metadata` em balance_transactions; usa `reference_id`/`reference_type`).
- **Decisão A (trigger):** `trg_ad_commission` passou a **`after insert or update`** com guarda anti-duplicação (em UPDATE só paga se `expires_at` renovado) — o agente recebe comissão em cada ad view, incluindo re-watch do mesmo ATM após expirar.
- **Novos hooks:** `src/hooks/useAdMob.ts` (load/show rewarded, degrade silencioso se não instalado/Expo Go/web) e `src/hooks/useAdUnlocks.ts` (Map atmId→expiresAt, hidratação no mount, realtime `postgres_changes`, `createUnlock` upsert 24h).
- **Ecrãs migrados de `useViews` → `useAdUnlocks`/`useAdMob`:** `map.tsx` (pill de views removida, `handleWatchAd`), `ATMDetailSheet.tsx` (CTA "Ver anúncio para desbloquear"), `my-views/index.tsx` (query `ad_unlocks`, "Os teus desbloqueios activos"), `profile.tsx` (card "Desbloqueios activos"; "Ilimitado" se premium), `favorites/index.tsx`.
- **Limpeza:** `src/hooks/useViews.ts` eliminado (código morto — sem usos) e tipos legados removidos de `src/lib/supabase-types.ts` (`atm_views`, `daily_view_usage`, `consume_atm_view`). Backend SQL legado mantém-se para histórico/analytics (spec §1).
- **Config:** `app.json` com plugin `react-native-google-mobile-ads` (App IDs oficiais de teste); `.env.example` com test IDs rewarded (`EXPO_PUBLIC_ADMOB_REWARDED_ANDROID/IOS`).
- **Verificação:** `npx tsc --noEmit` OK (0 erros) + `npx expo lint` OK (0 problemas).
- **Pendente (utilizador):** `npm install` (lockfile sem `react-native-google-mobile-ads`); aplicar SQL no staging (depende de `20260811000003_notifications_favorites_push.sql` para `create_notification`); `eas build --platform android --profile development` + testar rewarded ads no dev client.

---

### Migração SQL Fase 6 — notificações push + favoritos + realtime (2026-08-11) ✅ (executada no staging)

Fase 6 do design (`docs/superpowers/specs/2026-08-11-notifications-favorites-agentcards-design.md`).

- **`20260811000003_notifications_favorites_push.sql`** (idempotente): executado com sucesso no SQL editor do Supabase staging (`ndvjitfovhfngrzwtytd`). Backend completo de notificações in-app + push + favoritos + realtime ativo na base de dados.
- **Revisão e Correção de Erros (2026-08-12):** auditados e corrigidos 7 problemas no SQL (crash no trigger de referral com `NULL`, overflow `to_char` em valores ≥ 1M Kz, isolamento de exceções no `net.http_post` para não abortar transações de BD, consulta dinâmica do Vault `decrypted_secrets`, RLS em `push_log`, idempotência do `alter publication supabase_realtime`).
- **Conteúdo do ficheiro:**
  1. Extensões `pg_net` + `pgcrypto` (grant usage do schema net).
  2. `push_tokens` (PK `user_id` → `profiles`, RLS select/insert/update/delete own com check).
  3. `atm_favorites` (FK user+atm, unique (user_id, atm_id), índice, RLS own).
  4. RLS em `notifications` (select/update own) — a tabela já existia, faltavam policies.
  5. `push_log` (debug de envios com RLS ativado).
  6. `send_expo_push(user_id, title, message, type)` — SECURITY DEFINER, `pg_net.http_post` isolado contra excepções, token do Vault dinâmico.
  7. `create_notification(user_id, title, message, type, push)` — helper SECURITY DEFINER que insere na tabela + dispara push quando `push=true`.
  8. Triggers: `atm_status` (aprovado/rejeitado → push), `subscription_status` (push), `withdrawal_status` (push com formatação corrigida), `view_commission` (in-app sem auto-notificação), `atm_rating` (in-app), `referral_new` (in-app com fallback para `NULL`), `forum_reply` (in-app).
  9. **Realtime** — `alter publication supabase_realtime add table` com verificação idempotente (`DO $$`).

---

### Push remoto — `useNotifications` reescrito + plugin app.json (2026-08-11) 🚧 (tsc/lint OK; aguarda instalação de deps)

Fase 5 do design (`docs/superpowers/specs/2026-08-11-notifications-favorites-agentcards-design.md`).

- **`src/hooks/useNotifications.ts` reescrito:** pede permissão só com sessão; `getExpoPushTokenAsync({ projectId })` com projectId a partir de `Constants` (`extra.eas.projectId`); upsert em `push_tokens` (`onConflict: 'user_id'`); lazy-require de `expo-notifications`/`expo-device` (degrade silencioso se não instalados / Expo Go / web). Canal Android "default" (`setNotificationChannelAsync`).
  - Listener de resposta (toque) → deep-link por tipo (mapa TYPE_HREF idêntico ao ecrã `/notifications`).
  - **Cold start:** `getLastNotificationResponseAsync()` no arranque aplica o mesmo deep-link.
- **`src/lib/supabase-types.ts`:** tabela `push_tokens` (Row/Insert/Update + FK `user_id`→`profiles.user_id`).
- **`app.json`:** plugin `expo-notifications` (ícone `./assets/icon.png`, cor `#2F7BF0`).
- **Pendente (utilizador):**
  1. `npx expo install expo-notifications expo-device`
  2. Rebuild do dev client (EAS) para testar push (Expo Go não suporta push remoto).
- **Verificação:** `npx tsc --noEmit` OK (0 erros) + `npx expo lint` OK (0 problemas).

---

### Notificações in-app (2026-08-11) ✅ (tsc + lint OK)

Fase 4 do design (`docs/superpowers/specs/2026-08-11-notifications-favorites-agentcards-design.md`).

- **Novo `src/hooks/useInAppNotifications.ts`:** lista do próprio user (`notifications`, order `created_at desc`, limit 100), `unreadCount`, `markRead(id)`, `markAllRead()`, `refetch`. Realtime `postgres_changes` (INSERT na tabela `notifications` filtrado por `user_id`) para o badge quando a tabela estiver na realtime publication (migração na Fase 6).
- **Novo ecrã `app/notifications/`** (`_layout.tsx` + `index.tsx`): lista de cards com ícone por tipo, ponto de não lida, tempo relativo (`timeSince`), toque → `markRead` + deep-link por tipo. Cabeçalho "Marcar tudo como lido" quando há não lidas. Empty states (anónimos → "Inicia sessão"; sem notificações).
- **Sino no header do mapa** (`app/(tabs)/_layout.tsx`): `notifications-outline` branco + badge vermelho com `unreadCount` (9+ acima de 9) → `/notifications`. Junto com a estrela dos favoritos; botão "Entrar" mantém-se para anónimos.
- **Deep-links por tipo:** `atm_approved/atm_rejected/withdrawal_approved/withdrawal_rejected/view_commission` → `/(tabs)/agent`; `subscription_approved/subscription_rejected` → `/(tabs)/profile`; `atm_rating` → `/(tabs)/map`; `referral_new` → `/referrals`; `forum_reply` → `/(tabs)/forum`.
- **`.expo/types/router.d.ts`:** rota `/notifications` já adicionada manualmente (fase 3).
- **Verificação:** `npx tsc --noEmit` OK (0 erros) + `npx expo lint` OK (0 problemas).

---

### Favoritos de ATM (2026-08-11) ✅ (tsc + lint OK)

Fase 3 do design (`docs/superpowers/specs/2026-08-11-notifications-favorites-agentcards-design.md`).

- **`src/lib/supabase-types.ts`:** tabela `atm_favorites` (Row/Insert/Update + FKs para `atms.id` e `profiles.user_id`).
- **Novo `src/hooks/useFavorites.ts`:** `favoriteAtms` (join `atm_favorites` + `atms`, só `status_approval='approved'` e sem `deleted_at`), `isFavorite(atmId)`, `toggleFavorite` (optimistic insert/delete), `refetch`. Carrega ao login/montar.
- **Heart no `ATMDetailSheet`:** header (estados bloqueado e desbloqueado), preenchido se favorito (`#EA4335`). Só visível para logados.
- **Heart no `ATMList`:** botão absoluto no canto do card (com `onStartShouldSetResponder` para não propagar o tap ao card) + mini heart junto ao nome.
- **Estrela no header do mapa** (`app/(tabs)/_layout.tsx`): quando logado, `star-outline` branco → `/favorites` (o botão "Entrar" mantém-se para anónimos).
- **Novo ecrã `app/favorites/`** (`_layout.tsx` + `index.tsx`): reutiliza `ATMList`; empty state para anónimos ("Inicia sessão"); toque → `router.push({ pathname: '/(tabs)/map', params: { openAtm } })`.
- **`app/(tabs)/map.tsx`:** liga `useFavorites`; `useFocusEffect` abre o sheet do ATM quando chega `?openAtm=...` e limpa o param (`router.setParams`).
- **`.expo/types/router.d.ts`** (gitignored/gerado): adicionadas `/favorites` e `/notifications` manualmente para o tsc passar antes do dev server regenerar.
- **Verificação:** `npx tsc --noEmit` OK (0 erros) + `npx expo lint` OK (0 problemas).

---

### Fix dashboard do agente — cards invisíveis + hint levantamento (2026-08-11) ✅ (tsc + lint OK)

Implementado conforme `docs/superpowers/specs/2026-08-11-notifications-favorites-agentcards-design.md`.

- **`src/components/ui/AppCard.tsx`:** branch com `onPress` deixou de usar `Pressable` + style-callback + `transform: [{scale}]` + `borderCurve` (padrão que causava o fundo não-pintado no iOS/New Architecture, RN #54556/#52413) → agora `TouchableOpacity` com estilo plano (espelha o fix do `AppButton` 2026-08-08). Variante sem `onPress` (View) mantém `borderCurve`. O mesmo fix resolve automaticamente ATMList:43 e supervisor:55/70 (usam `AppCard` com `onPress`).
- **`app/(tabs)/agent.tsx` — `StatCard`:** valor monetário com `numberOfLines={1}` + `adjustsFontSizeToFit` (evita overflow, ex. "30,000 Kz"); novo prop `hint?: string`.
- **Card "Disponível":** com `availableBalance > 0` mostra `hint="Toca aqui para fazer levantamento"`; `onPress` mantém (abre `WithdrawalModal`).
- **Verificação:** `npx tsc --noEmit` OK (0 erros) + `npx expo lint` OK (0 problemas).

---

### Fix comissão 0.15 Kz não refletia no painel do agente (2026-08-11) ✅ (tsc + lint OK)

Reporte do utilizador: visualizou um ATM com uma conta de utilizador e, na conta do agente, a view incrementava mas "Total ganho" e "Disponível" ficavam a 0.

**Diagnóstico (leitura directa do staging, service_role):** o dinheiro estava correctamente na BD — o RPC `consume_atm_view` criou `agent_earnings` (0.15×3) + `balance_transactions` (credit 0.15) + `profiles.agent_balance_kz = 0.45` no agente testado (`cddcca6d`, Mingo Lopes). O bug era **de exibição**: `Math.round(0.45) = 0` truncava valores < 0.5 para 0.

**Alterações:**
- Novo `src/lib/format.ts` — `formatKz(n)` preserva decimais (`0.45`, `200.15`, `200`, `30,000`).
- Substituídos 7 `Math.round` monetários por `formatKz`: `agent.tsx` (Total ganho, Disponível, Já levantado), `ReferralCard.tsx`, `referrals/index.tsx` (total + badge), `WithdrawalModal.tsx` (saldo).
- Fix freshness do "Disponível": `useAgent.fetchData` passa a buscar `agent_balance_kz` fresco de `profiles` (antes lia o `profile` cacheado de `useAuth`).
- Lint cleanup em `agent.tsx`: removidos `profile` e `atmsError` não usados.
- **Verificação:** `npx tsc --noEmit` OK (0 erros) + `npx expo lint` OK (0 problemas).
- **Pendente (utilizador):** teste em Expo Go — visualizar ATM → painel do agente deve mostrar `0.15 Kz` / `0.45 Kz`.

**Observação (decisão):** agente ao visualizar o próprio ATM gera comissão para si (confirmado no teste 18:09). Decidido manter por agora; guarda SQL no RPC (não creditar quando `auth.uid() = atms.agent_id`) fica como follow-up antes da produção/AdMob real.

---

### Verificação views→Kz + preparação AdMob (2026-08-11) 🚧 (tsc/lint OK)

Verificação do sistema de consumo de views → atribuição de Kzs aos agentes com **leitura directa do staging** (service_role). Dev build EAS e dev client **confirmados a funcionar** (APK instalado, `expo start --dev-client` OK).

**Resultado da verificação — o fluxo funciona (dados reais):**
- `consume_atm_view` (freemium) cria `atm_views` + `agent_earnings` + incrementa `profiles.agent_balance_kz` + regista `balance_transactions`, tudo atómico.
- `daily_view_usage` regista o limite (3/dia) — ex.: user `778f337f` com `view_count: 3`.
- Ex.: agente `55875658` (António Liberal) com 3 views → `agent_earnings` 0.15×3 → `agent_balance_kz: 0.60`. Coerente.

**Problemas encontrados e acções:**
- 🔴 **Copy "50 Kz por view" vs BD paga 0.15 Kz** — corrigidos 4 ficheiros para `0.15 Kz` (`agent.tsx`, `profile.tsx`, `welcome.tsx`, `onboarding.tsx`). Decisão do utilizador: manter 0.15 Kz na BD.
- 🟠 **Bug latente re-view após 24h** — índice único parcial `(user_id, atm_id) WHERE is_active=true` + 12 views expiradas com `is_active=true` → rever o mesmo ATM após 24h daria 23505. Migração `20260811000001_fix_consume_atm_view_is_active.sql` criada (limpa `is_active` nas expiradas antes do INSERT). Decisão: corrigir no SQL.
- 🟠 **Premium nunca activa** — todas as `subscriptions` em `pending` (aprovadas por admin manualmente), policy de INSERT era admin-only. Migração `20260811000002_subscriptions_quarterly_policy_insert.sql` criada (CHECK quarterly + policy INSERT para o próprio user). Decisão: user cria `pending`, admin aprova.
- 🟡 **`profiles.role` não reflecte roles de agente** — roles reais em `user_roles`; `useAuth`/`useAgent` já usam `user_roles`, sem alteração necessária.

**Pendente (utilizador):** aplicar as 2 migrações SQL no Supabase staging e testar no dev client (re-view após 24h, criar sub `pending` + aprovação admin).

---

## Relatório do Estado da BD — Staging (`ndvjitfovhfngrzwtytd`)

> **Regra (AGENTS.md)**: após qualquer tarefa que opere a BD, actualizar este relatório no `LOG.md`.

_Actualizado: 2026-08-11 (leitura com service_role)_

| Tabela | Estado | Detalhes |
|---|---|---|
| `atm_views` | 15 rows | 15 expiradas com `is_active=true` (bug por corrigir); +3 views 11-08 (Atm Teste 2) |
| `agent_earnings` | 15 rows | `amount_kz = 0.15` (comissão actual) |
| `daily_view_usage` | 9 rows | limite 3/dia; ex. user `778f337f` = 3 (18-07 e 06-08) |
| `profiles.agent_balance_kz` | 20+ agentes | ex. `855987c4`=200.15, `55875658`=0.60, `7b9e265a`=0.30, `cddcca6d`=0.45 |
| `balance_transactions` | credits 0.15/view + adjustments demo (30000, 29450, 28200) | flow de earnings OK |
| `subscriptions` | 4 rows, **todas `pending`** | plan_type `monthly`, `price_kz=1500` (antigo), nunca aprovadas |
| `withdrawals` | 2 rows | 1 pending, 1 completed |

**`app_settings`:** `agent_commission_free_view_kz=0.15`, `daily_free_views_limit=3`, `min_withdrawal_amount=500`, `referral_commission_pct=20`, preços premium `290/700/1500` (quarterly aplicado 08-08), Monetag zones.

**Migrações aplicadas (staging):** freemium (`20260718*`), quarterly+onboarding (`20260808000001`). **Pendentes:** `20260811000001`, `20260811000002` e `20260811000003` (notificações push + favoritos + realtime) e `20260813000001` (**AdMob `ad_unlocks`** — após aplicar, verificar trigger `trg_ad_commission` em `after insert or update`, RLS own, realtime; `agent_earnings` com `source='ad_view'`).

### Merge do fix do dev build EAS na main + limpeza de scratch (2026-08-11) ✅

- Merged `fix/lockfile-dev-build` → `main` (fast-forward, 4 commits: `d7309ee`, `c964b05`, `406770a`, `933bc30`).
- Adicionados ao `.gitignore` (secção `# Agent work files`): `DEV_BUILD_FIX_PROMPT.md`, `errr.md`, `prompt_analise_ia.md`, `scratch_debug.mjs` (scratch preservados em disco, working tree limpo).
- Branch `fix/lockfile-dev-build` eliminado (local + remoto).

### Development Build EAS — fix do `npm ci` + lockfile (2026-08-09) ✅ (branch `fix/lockfile-dev-build`)

**Problema:** `eas build` falhava no `npm ci` com "Missing X from lock file" (`@expo/vector-icons`, `expo-font`, `expo-blur`, `expo-haptics`, `expo-linear-gradient`, `@emnapi/core@1.11.3`, `@emnapi/runtime@1.11.3`).

**Causas confirmadas:**
- `package-lock.json` stale (último update em `7801fb5`): faltavam 4 deps directas + transitivas (`expo-font`, `@emnapi/*`).
- `~/.npmrc` global do utilizador tem `package-lock=false` → o `npm install` local nunca escrevia o lock.
- Conflito `expo-font`: `@expo/vector-icons@15.1.1` resolvia `expo-font@>=14.0.4` para `57.0.1` (SDK 57) vs `expo@54` (SDK 54) exigir `~14.0.12`.
- Os `@emnapi/*` são deps/peers de packages opcionais de outras plataformas (`@unrs/resolver-binding-wasm32-wasi` → `@napi-rs/wasm-runtime@1.2.2` com peers `@emnapi/core/runtime@^1.7.1 || ^2.0.0-alpha.3` → `1.11.3`). O npm do Windows não os resolve no lock; o `npm ci` do EAS (Linux) exige-os.

**Alterações (commits `d7309ee` + `406770a` + actual):**
- `package.json`: adicionado `expo-font@~14.0.12` como dep directa (SDK 54) e `@emnapi/core@^1.10.0` / `@emnapi/runtime@^1.10.0` em `devDependencies` para forçar o registo no `package-lock.json` mesmo no Windows.
- `app.json`: adicionado plugin `expo-font`.
- `package-lock.json`: regenerado com sucesso (`npm install --package-lock=true`), incluindo `@emnapi/core` (1.11.3 / 1.10.0) e `@emnapi/runtime` em `node_modules`.
- `eas.json`: removido `installCommand: "npm install"` temporário do perfil `development` (fix já não necessário).

**Resultado:** ✅ `eas build --platform android --profile development` correu sem erros; APK instalado e `npx expo start --dev-client` funciona (dev client carregou o bundle correctamente).

**Ficheiros scratch ignorados no commit:** `DEV_BUILD_FIX_PROMPT.md`, `errr.md`, `prompt_analise_ia.md`, `scratch_debug.mjs`.

### Preparação Development Build Android (EAS) (2026-08-09) 🚧

- Commit `1ee6fcd` (fix painel de agente). Working tree limpo (só ficam untracked de scratch: `errr.md`, `prompt_analise_ia.md`, `scratch_debug.mjs`).
- Tudo pronto para o dev build: `expo-dev-client@~6.0.21` instalado, `eas.json` com perfil `development` (`developmentClient: true`), `app.json` com `projectId` + `owner: giopilav`, EAS CLI v21.0.2 global, sessão Expo activa.
- `.env` staging não está no `.easignore` → incluído no build (credenciais staging embutidas, correcto para dev).
- Diagnóstico de BD do agente confirmado (utilizador `...88008`): `user_roles: ['agent']`, 2 ATMs `approved` + 1 `rejected` — BD correcta; o fix é do lado do cliente.
- **Pendente (utilizador)**: `eas build --platform android --profile development` e depois `npx expo start --dev-client`.


### Fix painel de agente não desbloqueava — coluna `status_approval` em falta no `.select()` (2026-08-09) ✅

**Diagnóstico Final & Causa Raiz:**
- A consulta à BD no `useAgent.ts` executava `.select('id, bank_name, address, has_cash, has_paper, fila, status, obs, last_updated, agent_id')`.
- O PostgREST devolvia os registos correctamente (HTTP 200), mas como a coluna **`status_approval` não estava na string do `.select(...)`**, o objeto retornado em JS tinha `status_approval = undefined`.
- Na linha seguinte, o hook fazia `.filter((a) => a.status_approval === 'approved')`. Como `undefined === 'approved'` é `false`, **todos os ATMs eram descartados silenciosamente**, definindo `approvedAtms` para `[]` e `hasApprovedAtm` para `false`.

**Alterações:**
- **`src/hooks/useAgent.ts`**: Adicionado `status_approval` à string do `.select(...)`.
- **`app/(tabs)/agent.tsx`**: Removido bloco de debug temporário.

---

### Fix painel de agente não desbloqueava após aprovação — refetch no foco/foreground (2026-08-09) ✅ (tsc + lint OK)

Reporte do utilizador: submeteu um ATM pelo mobile, aprovou no web admin, mas o painel de agente continuava "Regista o teu primeiro ATM".

**Diagnóstico** (staging read-only + revisão de código):
- BD correcta: ATM aprovado com `agent_id` do utilizador; a query exacta do agente devolve os ATMs; RLS OK (o mapa mostra ATMs com sessão).
- Causa raiz: o ecrã de Agente **nunca refazia o fetch** ao voltar ao tab (após `router.back()` do submit) nem ao trazer a app ao primeiro plano — só no mount inicial e no pull-to-refresh. Por isso o estado "ATM em análise" nunca aparecia e o painel ficava stale mesmo após aprovação no web.

**Alterações:**
- **`src/hooks/useAgent.ts`**: `fetchData` aceita `{ silent }` (não liga o loading); exposto `refetchSilent`.
- **`app/(tabs)/agent.tsx`**: `useFocusEffect` (de `expo-router`) → `refetchSilent()` ao ganhar foco; `useEffect` com `AppState.addEventListener('change', ...)` → `refetchSilent()` quando a app volta a `active` (apanha aprovações feitas no web com a app em segundo plano).
- **Verificação**: `npx tsc --noEmit` OK (0 erros) + `npx expo lint` OK (0 problemas).
- **Pendente (utilizador)**: teste manual — submeter → voltar ao painel deve mostrar "ATM em análise"; aprovar no web → voltar à app deve desbloquear. Se mesmo num arranque a frio/pull-to-refresh continuar vazio, é questão de conta (sessão ≠ conta que submeteu).

### Logo do login circular + lista de secções do perfil agrupada (2026-08-09) ✅ (tsc + lint OK)

Pedidos do utilizador (brainstorming com visual companion):

- **`app/(auth)/login.tsx`** — o logo (`icon.png`) estava quadrado (46×46, `contain`) dentro de um balão circular 68×68. Agora a `<Image>` preenche o balão todo com `resizeMode: 'cover'` e o balão tem `overflow: 'hidden'` → logo recortado em círculo, preenchendo a forma redonda.
- **`app/(tabs)/profile.tsx`** — a listagem de secções (As minhas views, Upgrade Premium, Ranking, Referências, Apoio) passou de 5 `SectionLink` separados (cada um com borda + sombra) + card colapsável "Como usar o app" para **um único card agrupado estilo Settings**: linhas com ícone em círculo azul (`brand[50]`) + label + chevron, separadas por divisórias finas `colors.border`; "Como usar o app" expande inline. "Terminar sessão" mantém-se no fim.
- **Spec**: `docs/superpowers/specs/2026-08-09-login-logo-profile-sections-design.md`.
- **Verificação**: `npx tsc --noEmit` OK (0 erros) + `npx expo lint` OK (0 problemas).
- **Pendente (utilizador)**: teste visual em Expo Go.

### Pill compacta de desbloqueios no topo do mapa (2026-08-08) ✅ (tsc + lint OK)

O `viewsBadge` do mapa (antes com label longo "2 desbloqueios disponíveis") estava grande e quebrava a estética ao lado do SegmentedControl.

- **`app/(tabs)/map.tsx`**: substituído por **pill compacta** — ícone `eye` + apenas o número, azul brand (`brand[50]`/`brand[600]`), amarelo quando 0 restantes; **ao tocar** abre `/my-views`. Removido import de `Badge` (já não usado no mapa); adicionado `TouchableOpacity`.
- **Verificação**: `npx tsc --noEmit` OK (0 erros) + `npx expo lint` OK (0 problemas).
- **Pendente (utilizador)**: teste visual em Expo Go.

### Nova paleta do logo + componente LogoPin (2026-08-08) ✅ (tsc + lint OK)

Alinhamento da identidade visual à spec do logo (`er.md`): pin de localização azul 3D com nota de dinheiro verde.

- **`src/theme/tokens.ts`**: `brand` agora `#2F7BF0` (500), `#5B9BFB` (400), `#1C5FD1` (600); `accent` `#4CAF6B` (500), `#66C687` (400), `#399256` (600), `#EAF6EE` (50); `money` → `#4CAF6B`; `brandGradient` → `[#2F7BF0, #4CAF6B]`.
- **`tailwind.config.js`**: palete `brand`/`accent`/`money` sincronizada com os novos tokens.
- **Cores de status**: `useATMs.ts` e `MapFilters.tsx` — `cash #34A853 → #4CAF6B`, `locked #4285F4 → #2F7BF0` (no_cash/offline mantêm).
- **`MapboxWebView.tsx`**: clusters + user marker `#4285F4 → #2F7BF0`.
- **Varredura hex hardcoded**: `auth-callback`, `CityDropdown` (#1573D6/#F0F6FE), `ranking` (thumbs-up), `ATMDetailSheet` (dinheiro/like), `agent.tsx` (ganho #399256, warning via tokens, reputação).
- **`app.json`**: splash + adaptiveIcon background `#10B981 → #4CAF6B`.
- **`LogoPin.tsx`** (novo): pin gota azul 3D com nota de dinheiro, feito com `LinearGradient` + Views RN (sem imagem). Usado no ecrã de permissão negada (`map.tsx`) e no welcome de agente (`welcome.tsx`).
- **Verificação**: `npx tsc --noEmit` OK (0 erros) + `npx expo lint` OK (0 problemas).
- **Pendente (utilizador)**: teste visual em Expo Go; regenerar `assets/*.png` com a imagem do novo logo quando disponível.

### Copywriting em toda a app — reframing de bloqueio/views + tom "tu" (2026-08-08) ✅ (tsc + lint OK)

Ronda de copywriting (framing de perda → ganho) e padronização do tom em "tu", com base nas decisões de brainstorming anteriores. Lógica de negócio inalterada.

- **`ATMList.tsx`**: card bloqueado ganha chips teaser "Dinheiro · ?" e "Fila · ?" (cinza, sem revelar valor) — curiosidade em vez de porta fechada.
- **`ATMDetailSheet.tsx`**: CTA `Desbloquear (N restantes hoje)` → **"Ver disponibilidade de dinheiro"** (foca o resultado); contagem vira nota subtil "N desbloqueios restantes hoje"; `Limite diário de views atingido` → **"Acabaste os desbloqueios de hoje" + "Volta amanhã para mais"**.
- **`map.tsx`**: badge `2/3 views` → **"N desbloqueios disponíveis"**; `Limite atingido` → **"Continua amanhã"**.
- **`profile.tsx`**: "Views hoje" → **"Desbloqueios hoje"** (`N restantes`), "Free" → **"Plano gratuito"**, tom tu.
- **`my-views/index.tsx`**: título → **"Os teus desbloqueios de hoje"**, chip `expira X` → **"por mais X"**, EmptyState convidativo.
- **Auth**: `login.tsx` subtítulo hero → **"Encontra dinheiro perto de ti"**; register/reset-password tom tu.
- **`PremiumModal.tsx`**: "Upgrade Premium" → **"Sem limites. Sem esperas."**; "Agora não" → **"Mais tarde"**.
- **Agente**: `welcome.tsx` "Explorar o app primeiro" → **"Primeiro quero explorar"**; `agent.tsx` reputação "Fraco" → **"A melhorar"**, "A sua reputação" → **"A tua reputação"**, nota "Acumula 500 Kz para levantar"; `WithdrawalModal` **"Levantar os teus ganhos"** + sucesso reescrito; `ReferralCard` "Partilhe/Ganhe" → "Partilha/Ganha".
- **Ranking/Forum**: EmptyStates convidativos (oportunidade, não vazio).
- **Referências**: "código de referral" → **"código de convite"**, mensagem de partilha com benefício, EmptyState de acção.
- **Supervisor**: EmptyState pendentes → **"Está tudo em dia ✓"**.
- **Verificação**: `npx tsc --noEmit` OK (0 erros) + `npx expo lint` OK (0 problemas).
- **Pendente (utilizador)**: teste visual em Expo Go.

### Reframing do card bloqueado — copywriting + cor (2026-08-08) ✅ (tsc OK)

Redesign do card de ATM na listagem para eliminar a sensação de bloqueio e "morte" visual (cinza). Decisões tomadas em brainstorming com copywriting (framing de perda → ganho):

- **`src/components/map/ATMList.tsx`** — card bloqueado: ícone `lock-closed` + "Bloqueado" cinza → ícone `eye-outline` + **"Ver detalhes"** em azul `colors.brand[500]`; dot de estado do caso bloqueado de `#6B7280` → `colors.brand[500]`; endereço (`item.address`) passa de `colors.text.secondary` → `colors.money` (#10B981) em todos os cards.
- **`docs/superpowers/specs/2026-08-08-atm-list-copy-design.md`** — doc de design aprovado (Approach A: convite mínimo).
- **Fora de âmbito**: estado real (Com/Sem Dinheiro) continua no sheet desbloqueado; lógica de views/desbloqueio inalterada; CTA do sheet inalterado.
- **Verificação**: `npx tsc --noEmit` OK (0 erros).
- **Pendente (utilizador)**: teste visual em Expo Go.

### Fix botões invisíveis no iOS (Expo Go / New Architecture) (2026-08-08) ✅ (tsc + lint OK)

Novo reporte do utilizador: **todos os `AppButton`** (Criar Conta, Entrar, Registar ATM, Desbloquear, compra de view, CTA do welcome) estavam invisíveis mas clicáveis no iOS (Expo Go). A teoria anterior (`boxShadow` no `AppButton`, commit `3ea52ec`) estava errada — remover o sombreado do botão não resolveu.

- **Causa raiz**: `AppButton` usava `Pressable` + style-callback + `transform: [{scale}]` + `gap` + `borderCurve: 'continuous'`. No New Architecture do RN 0.81 (iOS) esta combinação é conhecida por falhar a pintura do fundo/conteúdo (ver issues RN #54556, #52413) — conteúdo invisível mas ainda a receber toques.
- **`src/components/ui/AppButton.tsx`** (reescrito, API idêntica): `Pressable` → `TouchableOpacity`; removidos `transform`, `gap` (usado `margin` nos ícones) e `borderCurve`; style plano com `backgroundColor`/cor de texto explícitas. Mantidos variant/size/icon/iconRight/haptic/loading/disabled/fullWidth/style.
- **`src/theme/tokens.ts`**: `shadows.card/raised/floating` deixaram de usar `boxShadow` → props clássicas (`shadowColor`/`shadowOffset`/`shadowOpacity`/`shadowRadius` + `elevation`), eliminando o risco de overlay translúcido no iOS em `AppCard`, `SegmentedControl`, `WithdrawalModal` e `MapFilters`.
- **Verificação**: `npx tsc --noEmit` OK (0 erros) + `npx expo lint` OK (0 problemas); grep confirma 0 ocorrências de `boxShadow`.
- **Pendente (utilizador)**: teste visual em iOS (Expo Go) — todos os botões devem aparecer.

### Transformação Freemium: Anúncios + Premium — Investigação e Plano (2026-08-08) 🚧

Novo modelo de negócio: **1 anúncio rewarded = 1 ATM por 24h (sem limite diário)**; subscrição premium **cancela anúncios** (acesso ilimitado). Substitui o modelo "3 views/dia".

- **Fase 0 — Baseline** ✅: `tsc` 0 erros + `lint` 0 problemas; commit `3ea52ec` (fixes da ronda 6: botões sem sombra, logo no login, barra azul no mapa, dashboard agente).
- **Fase 1 — Investigação do app** ✅: relatório de investigação (rotas, fluxo views/premium, navegação N1–N8, lógica L1–L12, histórico AdMob).
- **Fase 2 — Investigação da BD staging** ✅ (via REST, só leitura). Descobertas críticas:
  - 🔴 `subscriptions.plan_type` CHECK só `('monthly','annual')` — mobile insere `'quarterly'` → falha.
  - 🔴 Policy de INSERT em `subscriptions` é **só admin** — utilizador não cria a própria subscrição.
  - 🟠 BD tem preços 1500/13500; plano do produto 290/700/1500 (mobile usa 290/700/1500).
  - 🟠 Textos "50 Kz/view" vs BD paga 0.15 Kz; `atm_views.is_active` nunca desactivado.
- **Fase 3 — Spec** ✅ validada pelo utilizador. Decisões resolvidas: (a) preços alinhados ao plano **290/700/1500** na BD; (b) `expo-notifications`/`useNotifications` **removidos por agora**.
- **Fase 4 — Plano de implementação** ✅ (7 fases: preparação, backend staging, mock ad, core map/views, fixes, validação, AdMob real, adaptação produção).
- **Investigação do fluxo de agente** ✅ (pedido do utilizador, crucial). Conclusão: **a BD não é a causa** — trigger `handle_new_user` cria role + onboarding correctamente, `has_role`/RLS/bucket funcionam, `mailer_autoconfirm: true` (sessão imediata). O problema é **navegação no app**: (A) race entre `register.tsx → /agent/onboarding` e o root `_layout.tsx → /(tabs)/map` (quem correr por último ganha); (B) sem redirect pós-login (o gate só existe no separador Agente); (C) `onboarding_seen` marcado num `useEffect` no mount que pode falhar silenciosamente. Propostos fixes O1–O4 adicionados à Fase 4 do plano. Backfill opcional das 23 contas com `onboarding_seen:false`.

**Próximo passo**: Fase 1 do plano — escrever as 3 migrações SQL de staging (`consume_atm_view` sem limite diário, `subscriptions` quarterly + policy, `app_settings` 290/700/1500) para o utilizador aplicar no Supabase staging.

**Fase Actual**: 🚧 Fase 4 do plano criada — aguarda início da implementação
**Última Actualização**: 2026-08-08
**Branch Activa**: `main`
**Deploy**: N/A (desenvolvimento local / Expo Go)

### Onboarding de agente pós-registo — welcome → submit ATM (2026-08-08) ✅ (tsc + lint OK)

Implementado o design de onboarding pós-registo de agente (resolve O1 + O3/O4 do relatório de investigação):

- **Novo `app/agent/welcome.tsx`**: ecrã de boas-vindas logo após criar conta de agente — hero gradiente "Vamos registar o teu primeiro ATM", 3 passos (📷 Foto → 📍 GPS → 📋 Detalhes + submeter), botão único **"Continuar para registar um ATM"** → `/agent/submit-atm`; botão secundário "Explorar o app primeiro". Rota registada em `app/agent/_layout.tsx` (`headerShown: false`).
- **Fix O1 (race do pós-registo)**: novo `src/lib/navigation-flag.ts` com flag de módulo `pendingAgentRedirect`. `register.tsx` seta a flag **antes** de `router.replace('/agent/welcome')`; `app/_layout.tsx` (root) só redirecciona para `/(tabs)/map` se `!pendingAgentRedirect`, e limpa a flag automaticamente ao sair do grupo `(auth)`.
- **Fix O3/O4 (marcação fiável)**: `useAgentOnboarding.update` deixa de depender do estado `user` do hook — resolve o id via `supabase.auth.getUser()` se necessário (cobre a janela pós-signUp). `welcome.tsx` e `onboarding.tsx` marcam `onboarding_seen:true` no mount **e** no "Continuar".
- **Sem gate pós-login** (O2 removido, decisão do utilizador); **gate da tab Agente mantido** (`agent.tsx:55`) — já suprime com ATM pendente/aprovado, logo agentes com ATM em análise não voltam a ver onboarding.
- **Verificação**: `npx tsc --noEmit` OK (0 erros) + `npx expo lint` OK (0 problemas).
- **Pendente (utilizador)**: teste manual em Expo Go (registar agente → welcome → Continuar → submit-atm).
- **Backfill das 23 contas** com `onboarding_seen:false`: decisão de produto, não bloqueia.

### Correções 5ª ronda errr.txt — Info básica na listagem + botão desbloquear visível (2026-08-07) ✅ (tsc + lint OK)

Novos pedidos do utilizador (5ª leitura de `errr.txt`), implementados e validados com `npx tsc --noEmit` (0 erros) e `npx expo lint` (0 problemas):

- **Listagem mostra nome + info básica sempre** — `src/components/map/ATMList.tsx`: título passa a ser sempre `bank_name`, morada e `cidade, provincia` deixam de depender de `!locked`. Apenas dinheiro/estado ficam ocultos (rodapé mantém "Bloqueado" 🔒 com ponto cinza).
- **Botão de desbloquear invisível corrigido** — causa-raiz: `AppButton` `primary` aplica `shadows.raised` (`boxShadow`), que no iOS renderiza como overlay translúcido que desbota o azul `brand[500]` contra o fundo branco. `src/components/ui/AppButton.tsx`: novo prop `shadow` (default `true`; `false` omite o sombreado). `ATMDetailSheet.tsx`: CTAs do estado bloqueado com `size="lg"`, `shadow={false}` e `backgroundColor: colors.brand[600]` (azul sólido, contraste ≈5.1:1).
- **Layout do sheet bloqueado** — `maxHeight` `30%` → `42%` + conteúdo em `ScrollView` (evita clipping); acrescentada linha `cidade, provincia` junto à morada; ponto colorido do cabeçalho passou de cor real do status para cinza fixo `#6B7280` (elimina leak de informação antes do desbloqueio; removido uso de `getATMColor`).
- **Pendente (utilizador)**: teste visual em iOS (Expo Go) — listagem e botão de desbloquear.

**Fase Actual**: ✅ Correções 5ª ronda errr.txt — aguarda teste em dispositivo
**Última Actualização**: 2026-08-07
**Branch Activa**: `main`
**Deploy**: N/A (desenvolvimento local / Expo Go)

### Correções 4ª ronda errr.txt — WhatsApp, ordenação por proximidade, contraste (2026-08-07) ✅ (tsc + lint OK)

Novos pedidos do utilizador (4ª leitura de `errr.txt`), implementados e validados com `npx tsc --noEmit` (0 erros) e `npx expo lint` (0 problemas):

- **Botão de apoio ao cliente (WhatsApp)** — novo `src/lib/support.ts` (`SUPPORT_WHATSAPP_NUMBER`, `SUPPORT_DEFAULT_MESSAGE`, `supportWhatsAppUrl()` reutilizando `waLink`). `app/(tabs)/profile.tsx`: novo `SectionLink` "Apoio ao Cliente" (ícone `logo-whatsapp`) entre "Referências" e a secção de ajuda. Refactor de reutilização em `login.tsx`, `reset-password.tsx` e `PremiumModal.tsx` (número de WhatsApp deduplicado).
- **Fix ordenação por proximidade após login** — causa-raiz: a distância só era calculada no fetch e o sort por proximidade exigia `userLocation`; após login o navigator `(tabs)` remonta e a lista caía para a ordem alfabética do servidor. `useLocation.ts`: cache de última localização em módulo (`getCachedLocation`) para remounts instantâneos. `useATMs.ts`: distância reactiva num `useMemo` sobre `[atms, userLocation]`, sort `proximity` sempre aplicado por `distance ?? MAX_SAFE_INTEGER`, `.order('bank_name')` removido.
- **Revisão de contraste** — `text.tertiary` `#9CA3AF` → `#6B7280`; marcadores do mapa com stroke branco (`circle-stroke-width: 2`) para se destacarem do fundo escuro; `EmptyState` (ícone `brand[600]` + borda), `Badge neutral`, track do `SegmentedControl`, pills do mapa sólidas + borda, botão "Copiar" do `ReferralCard`, `AppButton secondary` (`brand[700]`), tint inactivo das tabs, círculos de ícone do Perfil e dot de bloqueado da lista.
- **Pendente (utilizador)**: teste visual em Expo Go / web (ordenação após login, botão WhatsApp, contraste).

**Fase Actual**: ✅ Correções 4ª ronda errr.txt — aguarda teste em dispositivo
**Última Actualização**: 2026-08-07
**Branch Activa**: `main`
**Deploy**: N/A (desenvolvimento local / Expo Go)

### Redesign UI — Design System + sweep completo (2026-08-07) ✅ (tsc + lint OK)

Reforma visual completa do app (palete alinhada ao logo: azul `#1573D6` dominante + teal `#10B981` subtil). Corre em **Expo Go / web**, sem novos módulos nativos. Validado com `npx tsc --noEmit` (0 erros) e `npx eslint .` (0 warnings).

**Fase 1 — Design System:**
- `src/theme/tokens.ts` (novo): `colors` brand/accent/money/surface/card/border/text, `brandGradient`, `radius`, `shadows`, `typography` (`money` tabular-nums).
- `src/components/ui/` (novo): `AppIcon` (Ionicons), `AppButton` (5 variantes + haptic + loading), `AppCard`, `Badge`, `EmptyState`, `SegmentedControl`, `Screen`.
- `tailwind.config.js`: palete `brand` actualizada para `#1573D6` (auth continua NativeWind).

**Fase 2 — Alto impacto:**
- `app/(tabs)/map.tsx` + `src/components/map/{MapFilters,ATMList,ATMDetailSheet,CityDropdown}.tsx`: SegmentedControl Mapa/Lista, badges, pills flutuantes (loading/empty/erro), cards com tokens.
- Auth (`login`, `register`, `reset-password`, `(auth)/_layout`): hero `LinearGradient` brand→teal, inputs com ícones, SegmentedControl Telefone/Email, províncias em chips, fundo surface.

**Fase 3 — Ecrãs secundários:**
- `profile`, `agent`, `forum`, `supervisor` (tabs) + `my-views`, `ranking`, `referrals`, `supervisor/pending` (stack): AppCard/AppButton/EmptyState/Badge, ícones em vez de emojis, headers brancos com tint brand (`headerShadowVisible: false`).
- `AgentATMCard`, `WithdrawalModal`, `ReferralCard`, `PremiumModal`, `AccountTypeSelector`, `ProvinceSelector`, `PostCard`: tokens + UI kit; `WithdrawalModal` usa `SegmentedControl` para IBAN/MCX.
- `agent/onboarding` e `agent/submit-atm`: gradiente de marca no hero do onboarding; submit com AppButton e tokens.

**Fase 4 — Polish:**
- Haptics nos botões de acção, empty states consistentes (`EmptyState`), `tabular-nums` em valores monetários (agent, ranking, my-views, referrals, supervisor, withdrawal).
- E-mails decorativos (👤💼📷📍🔗🏆⏳✅ etc.) substituídos por `AppIcon`; restantes emojis só em conteúdo funcional (steps do perfil).

**Verificação:** `npx tsc --noEmit` OK (0 erros) e `npx eslint .` OK (0 problemas) após limpeza de 9 warnings de imports não usados.
**Pendente (utilizador):** teste visual em Expo Go e web.

**Fase Actual**: ✅ Redesign UI (Fases 1-4) — aguarda teste visual em dispositivo
**Última Actualização**: 2026-08-07
**Branch Activa**: `main`
**Deploy**: N/A (desenvolvimento local / Expo Go)

### Anúncios AdMob adiados (integração removida 2026-08-07)

A integração de anúncios Google AdMob foi **removida por completo** e adiada para outra altura, por causar erros de build/web bundling (`react-native-google-mobile-ads` é nativo-only). O app voltou ao estado pré-AdMob (commit `4319769`). Mantém-se o `package-lock.json` sincronizado.

### Correções 3ª ronda errr.txt — Fórum admin-only + Onboarding gate + Foto ArrayBuffer (2026-08-07) 🚧

Fixes aos 3 problemas reportados na 3ª leitura de `errr.txt` (o PGRST202 e a foto partida persistiam após a 2ª ronda):

- **Fórum admin-only** — `app/(tabs)/forum.tsx`: botão "✏️ Criar post" (e modal) apenas para `isAdmin` (o web só mostra a RPC para admins). `src/hooks/useForum.ts`: erro devolvido em PT amigável ("Apenas administradores podem publicar mensagens") + `console.error` do original. Causa-raiz do PGRST202: a RPC `create_forum_post` não existe no **staging** e exigia role admin.
- **Onboarding de agente com gate pós-login** — `src/hooks/useAuth.ts`: exposto `isOnlyAgent` (= `isAgent && !isSupervisor`). Novo `src/hooks/useAgentOnboarding.ts` (espelha o hook do web): busca `agent_onboarding_progress` e cria a row com defaults se faltar. `app/(tabs)/agent.tsx`: se `isOnlyAgent && !onboarding_seen` → `router.replace('/agent/onboarding')` (com loading). `app/agent/onboarding.tsx`: marca `onboarding_seen: true` no mount. `app/(auth)/register.tsx`: agente sem sessão (confirmação de email) → aviso "Confirme o email... verá o onboarding" em vez de silêncio.
- **Foto corrompida no dashboard web** — `app/agent/submit-atm.tsx`: upload passou de `new File(photoUri)` (Blob) para `file.arrayBuffer()` enviado como `ArrayBuffer`. O supabase-js documenta que `Blob`/`File`/`FormData` **não funcionam correctamente em React Native** (objecto fica corrompido/vazio) — causa da foto partida em iOS e Android.
- **Pendente (utilizador)**: `npx tsc --noEmit` + `npx expo lint` + correr o SQL de `create_forum_post` no staging + teste em dispositivo.
- **Verificação**: edições aplicadas; aguarda tsc/lint (regra do projecto).

**Fase Actual**: Correções 3ª ronda errr.txt — aguarda tsc/lint + SQL staging + teste em dispositivo
**Última Actualização**: 2026-08-07
**Branch Activa**: `feature/freemium-model`
**Deploy**: N/A (desenvolvimento local / Expo Go)

### Correções 2ª ronda errr.txt — Onboarding + Filtros + Foto + Fórum (2026-08-07) ✅ (tsc OK)

Novos pedidos do utilizador (2ª ronda de `errr.txt`), implementados e validados com `npx tsc --noEmit` (0 erros):

- **Onboarding de agente pós-registo** — `app/agent/onboarding.tsx` (novo): página única com 4 secções (💼 O que é Agente, 💰 Como ganha dinheiro, 📷 Como registar um ATM, 🏦 Como levantar) + aviso de desbloqueio. Botão "Continuar para registar um ATM 📷" → `replace('/agent/submit-atm')` e "Explorar o app primeiro" → mapa. `app/agent/_layout.tsx` regista a rota (headerShown: false); `app/(auth)/register.tsx` redirecciona agentes recém-registados; `.expo/types/router.d.ts` actualizado manualmente (gitignored).
- **Dashboard do agente com gate de desbloqueio** — `src/hooks/useAgent.ts`: fetch inclui ATMs `approved` + `pending`, expõe `pendingCount` e `hasApprovedAtm`; `status_approval` removido da interface `AgentATM` (tipado localmente como `AgentATMRow` no fetch) para não contaminar o `updateATM`. `app/(tabs)/agent.tsx`: sem ATMs aprovados mostra "⏳ ATM em análise" (se pendentes) ou "📍 Regista o teu primeiro ATM" (se nenhum), com CTA "+ Submeter" e link "Rever como ganhar dinheiro"; o painel completo só aparece com ≥1 ATM aprovado.
- **Instruções no Perfil** — `app/(tabs)/profile.tsx`: secção colapsável "📘 Como usar o app" com guia de utilizador + bloco "Para agentes — como lucrar" (50 Kz/view, 20% referral, levantamento a partir de 500 Kz).
- **Foto corrompida no dashboard web** — `app/agent/submit-atm.tsx`: `takePictureAsync({ quality: 0.8 })` força JPEG (evita HEIC/iOS); upload passou de `fetch().blob()` para `File` de `expo-file-system` (SDK 54). `expo-file-system` instalado pelo utilizador (`npx expo install expo-file-system`).
- **Filtro de bancos removido** — `MapFilters.tsx` (chips de bancos eliminados), `map.tsx` (state `bank` removido), `useATMs.ts` (option/filtro/`banks` removidos).
- **Filtro de cidade em dropdown** — `src/components/map/CityDropdown.tsx` (novo): bottom-sheet com "Todas as cidades" por defeito, substitui os chips horizontais ao lado do toggle Proximidade/A-Z.
- **Teclado do fórum corrigido** — `app/(tabs)/forum.tsx`: `KeyboardAvoidingView` no ecrã (padding iOS) e dentro do modal de criar post (padding iOS / height Android — o `Modal` do RN não herda `adjustResize`); dismiss ao tocar fora (`TouchableWithoutFeedback` + `keyboardDismissMode="on-drag"`); `automaticallyAdjustKeyboardInsets`. `src/components/forum/PostCard.tsx`: novo prop `onCommentFocus` + `onFocus` mede o input e faz scroll da lista até 120 px do topo (via `measureInWindow` + scroll offset rastreado no `onScroll`).
- **⚠️ AdMob (filtro dinheiro → anúncio)**: adiado por decisão do utilizador.
- **⚠️ Subscrição**: mantida como está por decisão do utilizador.
- **Pendente**: `npx expo lint` + verificação em dispositivo (lista + proximidade, teclado do fórum, aprovação de fotos no web dashboard).
- **Verificação**: `npx tsc --noEmit` OK (0 erros).

**Fase Actual**: Correções 2ª ronda errr.txt — aguarda `npx expo lint` + teste em dispositivo
**Última Actualização**: 2026-08-07
**Branch Activa**: `feature/freemium-model`
**Deploy**: N/A (desenvolvimento local / Expo Go)

### Correções errr.txt (2026-08-07) ✅ (tsc OK)

Fixes aplicados aos problemas reportados pelo utilizador na primeira leitura de reportes:

- **1. Crash duplicate key 23505** — `src/hooks/useViews.ts`: `consumeView` apanha o erro `23505` (dupla inserção em `atm_views`) e devolve a view existente (`reused: true`) em vez de rebentar. `app/(tabs)/map.tsx`: guarda `unlocking` anti double-tap em `handleUnlock`.
- **2. SecureStore > 2048 bytes** — `src/lib/supabase.ts`: adaptador de storage com chunking byte-aware (~1024 B/parte + `.meta`), mantém escrita directa ≤2048. Elimina o warning de overflow.
- **3. Estado de caixa visível antes de desbloquear** — `ATMList.tsx` e `MapboxWebView.tsx` recebem `lockedIds`/`isPremium`/`isLoggedIn`; ATMs bloqueados aparecem como "🔒 Bloqueado" (bolinha cinza `#9CA3AF` / `LOCKED_COLOR`) na lista e nos marcadores até serem desbloqueados (ou o utilizador ser premium). `ATMMapView.tsx` repassa; `map.tsx` liga `unlockedIds`/`balance.isPremium`/`!!user`.
- **4. Botões de voltar em falta** — novo `src/components/navigation/HeaderBackButton.tsx` (`canGoBack() ? back : replace(fallback)`) aplicado a `my-views`, `ranking`, `referrals`, `supervisor` e `agent`.
- **5. Teclado não fecha ao tocar fora** — `keyboardShouldPersistTaps="handled"` nos ScrollView de `agent.tsx`, `profile.tsx`, `submit-atm.tsx`, `WithdrawalModal.tsx`, `forum.tsx`; `TouchableWithoutFeedback onPress={Keyboard.dismiss}` no mapa (`map.tsx`), modal de criar post (`forum.tsx`), bottom sheet de rejeição (`supervisor/pending.tsx`).
- **6. Placeholder invisível** — `placeholderTextColor="#9CA3AF"` adicionado a todos os `TextInput` que não tinham: `submit-atm.tsx` (4), `PostCard.tsx`, `WithdrawalModal.tsx` (5), `AgentATMCard.tsx`, `supervisor/pending.tsx`, `forum.tsx` (2), `profile.tsx` (4), `MapFilters.tsx`, `login.tsx` (3), `register.tsx` (5).
- **7. Subscrições mensal/trimestral/anual** — `PremiumModal.tsx`: planos novos **Mensal 290 Kz / Trimestral 700 Kz / Anual 1.500 Kz** (antes Mensal 1.500 / Anual 13.500). `plan_type: 'quarterly'` com expiração 90 dias; preço trimestral lido de `app_settings['premium_quarterly_price_kz']` (fallback 700). Link "👑 Upgrade Premium" adicionado ao perfil (`profile.tsx` + `PremiumModal`).
- **8. Role do agente/supervisor/admin lida de `user_roles`** — `useAuth.ts` passa a buscar `user_roles` (como o web app) e expõe `roles`, `role` e `isAdmin`/`isSupervisor`/`isAgent` derivados. Corrige agentes sem dashboard (o trigger grava o role em `user_roles`, não em `profiles.role`). `useAgent.ts` usa o `isAgent` do auth; `profile.tsx` mostra o role correcto.
- **⚠️ AdMob**: adiado por decisão do utilizador (requer dev build + IDs reais) — não alterado.
- **Verificação**: `npx tsc --noEmit` OK (0 erros).

**Fase Actual**: Correções `errr.txt` — aguarda `npx expo lint` + teste em dispositivo
**Última Actualização**: 2026-08-07
**Branch Activa**: `feature/freemium-model`
**Deploy**: N/A (desenvolvimento local / Expo Go)

### Fase 5 — Polish + Limpeza (2026-08-07) ✅

- **`src/components/ui/Skeleton.tsx` removido** + directoria `src/components/ui/` apagada — verificado via grep que não existiam imports em `app/` nem `src/` (código morto da Fase 7 original).
- **`src/lib/geocode.ts`**: `Array<{...}>` → `{...}[]` — resolve o warning do ESLint (`no-restricted-syntax` para `Array<T>`).
- **`app/referrals/index.tsx`**: "Ganhe ... teus" → "Ganha ... teus" (consistência PT).
- **Verificações de limpeza**:
  - Grep `Skeleton|components/ui` em `app`+`src` → 0 resultados (nenhuma referência quebrada).
  - Grep de erros de acentuação comuns em PT → 0 resultados.
  - Revisão manual de `app/agent/submit-atm.tsx` — textos PT consistentes, sem alterações necessárias.
  - Confirmado que `src/lib/distance.ts` continua em uso (`useATMs.ts` → `haversineDistance`) — mantido.
  - Nenhum ficheiro morto em `src/hooks/*.ts` nem `src/components/**/*.tsx`.
  - Assets todos referenciados no `app.json`.
- **⚠️ Backend a testar (staging)**: continua pendente — `get_agent_rating_stats`, `get_agent_referral_stats`, `request_withdrawal`, `notify_users_by_role` (admin/supervisor), upload ao bucket `atm-photos`, e permissões de insert em `atms` por agentes.

**Fase Actual**: ✅ Fase 5 Polish — aguarda tsc/lint final
**Última Actualização**: 2026-08-07
**Branch Activa**: `feature/freemium-model`
**Deploy**: N/A (desenvolvimento local / Expo Go)

### Fase 4 — Agent UX: reputação, referidos, levantamento, submeter ATM (2026-08-07) ✅ (câmera ligada)

- **`src/hooks/useAgent.ts`**: `fetchData` agora busca também `get_agent_rating_stats` e `app_settings['referral_commission_pct']`. Expostos `agentRating` (likes/dislikes/total), `commissionPct` (default 20) e `referralCode` (do profile).
- **`src/components/agent/WithdrawalModal.tsx`** (novo): modal bottom-sheet "Levantar Saldo" espelhando o web — 3 steps (form/processing/success), métodos IBAN e MCX Express, valor mínimo de `app_settings['min_withdrawal_amount']` (default 500), saldo como limite, pré-preenche IBAN/titular do perfil, aviso "IBAN não configurado" com link para o perfil, RPC `request_withdrawal` + `refreshProfile` no sucesso.
- **`src/components/agent/ReferralCard.tsx`** (novo): código de convite + botões Partilhar (RN `Share`) e Copiar (fallback `Alert`), comissão `%` de `app_settings`, stats via `get_agent_referral_stats`.
- **`app/(tabs)/agent.tsx`**: card "Disponível" clicável → abre `WithdrawalModal` (só com saldo > 0); secção "A sua reputação" (👍/👎, badge Excelente/Bom/Regular/Fraco por %); `ReferralCard`; botão "+ Submeter ATM" no header de ATMs + CTA "Submeter o primeiro" no empty state.
- **`src/lib/geocode.ts`** (novo, mobile): geocodificação reversa Mapbox espelhando o web (`reverseGeocode`), usando `EXPO_PUBLIC_MAPBOX_TOKEN`.
- **`app/agent/_layout.tsx` + `app/agent/submit-atm.tsx`** (novos): ecrã "Submeter ATM" com stepper Foto → GPS → Detalhes. **Passo de foto via `expo-camera` (`CameraView` + `useCameraPermissions`)**: pedido de permissão, captura com preview, e transição para GPS. GPS via `expo-location` + reverse geocode (preenche endereço/província/cidade). Form: nome, endereço, província (modal), cidade, coords, switches dinheiro/papel, observações. Submit: upload da foto para bucket `atm-photos`, insert em `atms` com `status_approval: 'pending'`, `agent_onboarding_progress`, notificações `notify_users_by_role` (admin+supervisor).
- **`app/app.json`**: adicionado plugin `expo-camera` com mensagem de permissão da câmara em PT.
- **`app/referrals/index.tsx`**: mostra comissão `%` de `app_settings` e botão "Partilhar código" (RN `Share`).
- **`app/ranking/index.tsx`**: validado — já integra `get_agent_ranking`, medalhas e % de aprovação. Sem alterações.
- **`.expo/types/router.d.ts`** (gerado): adicionada rota `/agent/submit-atm`.
- **✅ `expo-camera@~17.0.10` instalado pelo utilizador** (`npx expo install expo-camera`) — passo de foto ligado.
- **⚠️ Backend a testar (staging)**: `get_agent_rating_stats`, `get_agent_referral_stats`, `request_withdrawal`, `notify_users_by_role` (com role admin/supervisor), upload ao bucket `atm-photos`, e permissões de insert em `atms` por agentes.

**Fase Actual**: ✅ Fase 4 Agent UX — câmera ligada, aguarda tsc/lint
**Última Actualização**: 2026-08-07
**Branch Activa**: `feature/freemium-model`
**Deploy**: N/A (desenvolvimento local / Expo Go)

### Fase 3 — User UX: perfil, views, fórum, time.ts (2026-08-06) ✅

- **`src/lib/time.ts`** (novo): `timeSince` + `timeUntil`. Deduplicadas 6 implementações locais: `ATMList.tsx`, `ATMDetailSheet.tsx`, `AgentATMCard.tsx`, `PostCard.tsx`, `app/referrals/index.tsx`, `app/supervisor/pending.tsx`.
- **`src/hooks/useAuth.ts`**: exposto `refreshProfile` (re-fetch do perfil + premium).
- **`app/(tabs)/profile.tsx`** reescrito:
  - Telefone formatado (`formatPhone`) em vez do UUID a aparecer como "Email".
  - Role em PT: "Utilizador"/"Agente"/"Supervisor"/"Administrador".
  - Edição de perfil (nome, província com modal, cidade) com guardar → `profiles` + `refreshProfile`.
  - Agentes: edição de IBAN + titular da conta.
  - Estado Premium + saldo de views hoje (`useViews`).
  - Links: "As minhas views", "Ranking", "Referências". Ecrã de login para anónimos.
- **`app/my-views/`** (novo): `_layout.tsx` + `index.tsx` — lista de views activas (atm_views + atms), expiração (`timeUntil`), saldo de hoje (`balance.remaining/dailyLimit`), última actualização, link no perfil.
- **`src/hooks/useForum.ts`**: `createPost` via RPC `create_forum_post`.
- **`app/(tabs)/forum.tsx`**: província inicial sincronizada com o perfil (até o utilizador trocar), botão "Criar post" com modal (título + mensagem), CTA de login para anónimos.
- **`src/components/forum/PostCard.tsx`**: `timeSince` do helper + CTA "Inicia sessão para comentar" para anónimos.
- **`.expo/types/router.d.ts`** (gerado): adicionada rota `/my-views` às rotas tipadas (gitignored; o dev server regenera).
- **Pendente (utilizador)**: `npx tsc --noEmit` + `npx expo lint`.
- **⚠️ Backend a confirmar**: RPC `create_forum_post` só era usada por admins no web app — confirmar se utilizadores comuns podem criar posts (policy/security definer), senão o botão "Criar post" vai devolver erro para não-admins.

**Fase Actual**: ✅ Fase 3 User UX — aguarda tsc/lint
**Última Actualização**: 2026-08-06
**Branch Activa**: `feature/freemium-model`
**Deploy**: N/A (desenvolvimento local / Expo Go)

### Resumo

- ✅ Fase 1 CONCLUÍDA: projecto Expo, auth, protected routes, profile
- ✅ Fase 2 CONCLUÍDA: mapa com marcadores, filtros, clustering, detail sheet
- ✅ Fase 3 CONCLUÍDA: agent dashboard com gestão de ATMs, stats, ganhos
- ✅ Fase 4 CONCLUÍDA: sistema de views (freemium), modal premium, gating de detalhe ATM
- ✅ Fase 5 CONCLUÍDA: fórum com posts/comentários, ranking de agentes
- ✅ Fase 6 CONCLUÍDA: dashboard supervisor, aprovação/rejeição de ATMs, sistema de referrals
- ✅ Fase 7 CONCLUÍDA: push notifications (expo-notifications), skeleton loading, polish
- ⏳ **Revert SDK 57 → 54 + Mapbox WebView**: package.json revertido, componentes criados — pendente `npm install`
- ✅ `.env` aponta para Supabase Staging (`ndvjitfovhfngrzwtytd`)
- ⏳ Próximo: Fase 8 — Testes + Publicação (EAS Build)

---

### Fase 1 — Auth: erros PT, botão voltar, código de convite (2026-08-06)

- **`src/lib/errors.ts`**: `friendlyAuthError` agora traduz para PT — "User already registered" → "Esta conta já está registada. Faça login com o mesmo número e senha."; "Invalid login credentials" → "Telefone ou senha incorrectos. Verifique e tente novamente."; "Email not confirmed" e senha curta também traduzidos.
- **`app/(auth)/login.tsx`**: botão **voltar** no topo (`router.canGoBack() ? back : replace('/(tabs)/map')`); pré-preenche o telefone quando chega via param (`?telefone=...`), usado pelo alert do registo.
- **`app/(auth)/register.tsx`**: botão voltar no topo; **campo "Código de convite"** (opcional) com validação via RPC `validate_referral_code` (estados validando/válido/inválido, "Convidado por: Nome"); `invited_by` enviado no metadata do signUp; erro **"User already registered"** mostra alert com botão **"Ir para login"** (telefone pré-preenchido).
- **`src/hooks/useAuth.ts`**: `checkPremium` adiciona `.gt('expires_at', now)` — subscrições expiradas deixam de ser consideradas premium.
- **Verificacao pendente (pelo utilizador)**: `npx tsc --noEmit` + `npx expo lint`.

### Cleanup ESLint + Bug do mapa (2026-08-06)

- **Cleanup de 9 warnings ESLint** (`npx expo lint` → 0 problemas):
  - Removidos imports/variáveis mortas: `ForumPost` em `app/(tabs)/forum.tsx`, `pendingATMs` em `app/(tabs)/supervisor.tsx`, `Alert` em `AgentATMCard.tsx`, `FlatList` em `PostCard.tsx`.
  - `PremiumModal.tsx`: renomeado `type Step` → `PaymentStep` (resolvia `no-redeclare` com a função `Step`).
  - `useATMs.ts`: extraído `userLocation` do options e adicionado às deps do `fetchATMs` (antes congelava `null` da 1ª render — distância nunca calculada).
  - `useAuth.ts`: `checkPremium`/`fetchProfile` agora `useCallback`; `fetchProfile` nas deps do `useEffect` (evita stale closure).
  - `useNotifications.ts`: removido eslint-disable não usado; `require('expo-notifications')` anotado com `eslint-disable-next-line @typescript-eslint/no-require-imports` (lazy load intencional).
- **Bug do mapa sem marcadores** (feedback `123.txt`): diagnosticado via leitura à API staging — projecto **activo** (HTTP 200) e com ATMs `approved` + coordenadas válidas. Causa-raiz: `MapboxWebView` reconstruía todo o HTML a cada render e dependia de recarregamento do WebView; os handlers `updateData`/`centerOn` já existiam no HTML mas nunca eram chamados pelo RN.
  - `MapboxWebView.tsx`: HTML memoizado (`useMemo` [atms, userLocation]); sincronização dos dados por `injectJavaScript` em `onLoad` e quando `atms` muda; `centerOn` quando a localização chega; `onError` loga falhas.
  - `map.tsx`: passa a usar `error`/`refetch` de `useATMs` — overlay "Erro ao carregar ATMs" + botão "Tentar novamente"; mensagem de vazio separada.
- **Verificacao**: `npx tsc --noEmit` OK (0 erros); `npx expo lint` OK (0 problemas).

### Correcoes requisitadas (2026-08-06)

- **1. Registo sem email**: `app/(auth)/register.tsx` reescrito — campo de email removido; telefone (+244) + nome + provincia + senha + confirmar senha.
- **2. Cliente ou Agente no registo**: novo `src/components/auth/AccountTypeSelector.tsx` (Cliente/Agente, espelha o web app). O registo envia `account_type: 'user' | 'agent'` no metadata (o trigger `handle_new_user()` do backend já lê `raw_user_meta_data->>'account_type'` — antes enviava `role`, ignorado).
- **3. Homepage publica + login**: `app/_layout.tsx` deixou de forcar redirect para login; `app/index.tsx` → `<Redirect href="/(tabs)/map" />`; mapa visivel sem sessao. Login exigido para: desbloquear detalhes do ATM (`map.tsx` + `ATMDetailSheet.tsx` + `useViews.consumeView`), forum e area de agente. Botao "Entrar" no header do mapa quando `!user`.
- **4. Paleta Azul/Branco/Verde**: `tailwind.config.js` — `brand` agora azul (`#2094F3`/`#1A7ED6`), verde movido para `accent`/`money`. Sweep de cores azul em: `(tabs)/_layout`, `forum`, `profile`, `agent`, `supervisor`, `supervisor/pending`, `referrals/*`, `ranking/*`, `auth-callback`, `MapFilters`, `ProvinceSelector`, `ATMDetailSheet`, `AgentATMCard` (seleccao fila/estado + Guardar), `PostCard` (botao Enviar), `PremiumModal` (CTA Continuar + seleccao de plano). Verde `#10B981` mantido apenas para dinheiro/sucesso/estados (precos, ganhos, referral_code, toggles cash/papel, marcadores).
- **5. Erro "network failed"**: causa raiz = Supabase staging `ndvjitfovhfngrzwtytd` **pausado** (HTTP 000). Decisao do utilizador: manter staging e reativar no dashboard. Codigo corrigido para dar erro amigavel em PT via `src/lib/errors.ts` + `friendlyAuthError()`.
- **Extras**: `src/lib/phone.ts` ganhou `formatPhone`, `isValidPhone`, `phoneToEmail` (`9XXXXXXXX@dinheiroemao.ao`); login com toggle Telefone/Email; `reset-password.tsx` agora e ecra de suporte WhatsApp (244 933 986 318); `useViews.consumeView` exige login (seguranca).
- **Verificacao**: `npx tsc --noEmit` OK (0 erros). `npx expo lint` OK (0 erros, 9 warnings pre-existentes). ESLint instalado pelo utilizador (`eslint@^9`, `eslint-config-expo@~10`, `eslint.config.js` criado).
- **Pendente**: reactivar projecto Supabase staging `ndvjitfovhfngrzwtytd` no dashboard para login/registo funcionarem.

### Recriação .env (2026-08-06)

- `.env` recriado a partir de `.env.example` com credenciais staging (`ndvjitfovhfngrzwtytd`).
- Corrigido `[Error: supabaseUrl is required.]` no arranque do Metro (variáveis `EXPO_PUBLIC_SUPABASE_*` estavam ausentes).
- Validado com `npx tsc --noEmit` (sem erros) e `npx expo start` (Metro carrega o `.env` sem erros).

### Correcao Expo Go (2026-07-30)

- Dependencias alinhadas ao Expo SDK 54: React 19.1, React Native 0.81.5, Expo Router 6 e modulos Expo SDK 54.
- Adicionado `expo-linking`, peer dependency obrigatoria do Expo Router.
- Fixados `react-dom@19.1.0` e `react-native-web@0.21.x` para impedir conflito de peer na reinstalacao.
- Regenerado `package-lock.json` depois de remover a arvore mista de dependencias.
- Corrigido `global.css`: NativeWind 4/Tailwind 3 agora usa `@tailwind base`, `components` e `utilities`.
- Validado Node 22.16 com Metro 0.83.3: bundle Android de 1.404 modulos gerado em 165.311 ms.
- Validacao final com workers padrao e cache: bundle Android gerado em 26.081 ms, artefacto Hermes de 4,36 MB.
- `.nvmrc` actualizado para Node 22.16 e `engines.node` definido como `>=20.19`.
- `npx expo-doctor`: 18/18 verificacoes aprovadas.

**Fase Actual**: ✅ Fase 1 Auth (erros PT, voltar, código convite) — aguarda tsc/lint
**Última Actualização**: 2026-08-06
**Branch Activa**: `feature/freemium-model`
**Deploy**: N/A (desenvolvimento local / Expo Go)

### Resumo

- ✅ Fase 1 CONCLUÍDA: projecto Expo, auth, protected routes, profile
- ✅ Fase 2 CONCLUÍDA: mapa com marcadores, filtros, clustering, detail sheet
- ✅ Fase 3 CONCLUÍDA: agent dashboard com gestão de ATMs, stats, ganhos
- ✅ Fase 4 CONCLUÍDA: sistema de views (freemium), modal premium, gating de detalhe ATM
- ✅ Fase 5 CONCLUÍDA: fórum com posts/comentários, ranking de agentes
- ✅ Fase 6 CONCLUÍDA: dashboard supervisor, aprovação/rejeição de ATMs, sistema de referrals
- ✅ Fase 7 CONCLUÍDA: push notifications (expo-notifications), skeleton loading, polish
- ⏳ **Revert SDK 57 → 54 + Mapbox WebView**: package.json revertido, componentes criados — pendente `npm install`
- ✅ `.env` aponta para Supabase Staging (`ndvjitfovhfngrzwtytd`)
- ⏳ Próximo: Fase 8 — Testes + Publicação (EAS Build)

---

### Upgrade Expo SDK 54 → 57 (2026-07-20)

**Fixes pré-upgrade (React 19 compatibilidade):**

| Fix | Ficheiro | Alteração |
|---|---|---|
| **C1** | `src/hooks/useNotifications.ts:27-28` | `useRef<any>()` → `useRef<any>(null)` — React 19 exige argumento |
| **C2** | `app/(auth)/auth-callback.tsx:10-19` | Cleanup de `onAuthStateChange` subscription (memory leak) |
| **A2** | `app/_layout.tsx:24` | Adicionado `router` às deps do `useEffect` |
| **A3** | `app/(auth)/auth-callback.tsx:19` | Adicionado `router` às deps do `useEffect` |

**Alterações no package.json:**

| Package | De | Para | Razão |
|---|---|---|---|
| `expo` | `~54.0.0` | `~57.0.7` | SDK latest |
| `react` | `18.3.1` | `19.2.0` | Requerido por Expo 57 |
| `react-native` | `0.76.9` | `0.86.0` | Requerido por Expo 57 |
| `nativewind` | `^4.1.23` | `^4.2.6` | Latest v4 |
| `expo-router` | `~4.0.22` | `~5.0.7` | SDK 57 |
| `expo-constants` | `~17.0.8` | `~57.0.6` | SDK 57 |
| `expo-secure-store` | `~14.0.1` | `~14.0.4` | SDK 57 |
| `expo-status-bar` | `~2.0.1` | `~2.2.3` | SDK 57 |
| `react-native-gesture-handler` | `~2.20.2` | `~2.24.0` | SDK 57 |
| `react-native-safe-area-context` | `4.12.0` | `5.4.0` | SDK 57 |
| `react-native-screens` | `~4.4.0` | `~4.11.1` | SDK 57 |
| `@types/react` | `~18.3.12` | `~19.1.2` | React 19 |

**Removidos (desnecessários):**
- `connect` — Express middleware, sem uso em React Native
- `@react-navigation/drawer` — nunca importado
- `react-native-map-clustering` — nunca importado (clustering customizado)
- `@react-native-async-storage/async-storage` — nunca importado (SecureStore usado)
- `expo-image-picker` — nunca importado em nenhum ficheiro

**Assets criados:**
- `assets/icon.png` — 1024×1024 (logo do web app)
- `assets/adaptive-icon.png` — 1024×1024 (Android)
- `assets/favicon.png` — 512×512
- `assets/splash.png` — 1284×2778 (fundo #10B981 + logo centrado)

**Pendente**: `npm install` + verificação

---

### Fase 7 — Polish + Push Notifications (2026-07-19) ✅

**Ficheiros criados:**

- `src/hooks/useNotifications.ts` — Hook de push notifications com dynamic require (graceful degrade se expo-notifications não instalado), registo de permissões, token
- `src/components/ui/Skeleton.tsx` — Componente de loading skeleton animado (Skeleton, SkeletonCard, SkeletonMap)
- `app/_layout.tsx` — Actualizado com useNotifications no root layout

**Funcionalidades:**
- Push notifications via expo-notifications (dynamic import, sem crash se não instalado)
- Skeleton loading animado (pulse opacity 0.3→0.7)
- SkeletonCard e SkeletonMap para estados de loading
- Permissão de notificações pedida no arranque do app
- Preparado para receber notificações (ATM actualizado, subs aprovada, etc.)

**Notas:**
- Para activar push notifications em production: `expo-notifications` + `expo-device` precisam de `npx expo install`
- Push tokens precisam de coluna `push_token` na tabela `profiles` (futura migration)
- Actualmente funciona em Expo Go; para production precisa de EAS Build

---

### Fase 6 — Supervisor + Referrals (2026-07-19) ✅

**Ficheiros criados:**

- `src/hooks/useSupervisor.ts` — Hook com stats do supervisor, fetch de ATMs pendentes, aprovação via RPC `approve_pending_atm`, rejeição via RPC `reject_pending_atm`
- `app/(tabs)/supervisor.tsx` — Ecrã do supervisor com stat cards (ATMs, pendentes, agentes), links rápidos para pendentes e referrals
- `app/supervisor/_layout.tsx` — Layout stack para supervisor
- `app/supervisor/pending.tsx` — Lista de ATMs pendentes com detalhe, aprovação e rejeição com motivo
- `app/referrals/_layout.tsx` — Layout stack para referrals
- `app/referrals/index.tsx` — Ecrã de referrals com código, stats, lista de referidos com ganhos
- `app/(tabs)/_layout.tsx` — Actualizado com tab "Supervisor" (visível apenas para supervisores)
- `app/(tabs)/profile.tsx` — Link para referrals

**Funcionalidades:**
- Dashboard do supervisor com contagem de ATMs, pendentes, agentes
- Lista de ATMs pendentes com detalhe e acções
- Aprovação de ATM via RPC
- Rejeição de ATM com motivo
- Sistema de referrals com código do agente
- Ganhos de referral por utilizador referido
- Stats de referrals (total referidos, ganhos totais)
- Tab supervisor condicional (só para role supervisor/admin)

---

### Fase 5 — Fórum + Ranking (2026-07-19) ✅

**Ficheiros criados:**

- `src/hooks/useForum.ts` — Hook com fetch de posts por província (últimas 48h), fetch de comentários, adição de comentários, resolução de nomes de autores via profiles
- `src/components/forum/PostCard.tsx` — Card de post com ícone por tipo, título, mensagem, autor, timestamp, comentários expansíveis, input de comentário
- `src/components/forum/ProvinceSelector.tsx` — Selector de província com modal bottom sheet
- `app/(tabs)/forum.tsx` — Ecrã do fórum com lista de posts, refresh por província
- `app/ranking/_layout.tsx` — Layout stack para ranking
- `app/ranking/index.tsx` — Ecrã de ranking com leaderboard via RPC `get_agent_ranking`, medalhas (🥇🥈🥉), stats de aprovação
- `app/(tabs)/profile.tsx` — Actualizado com link para ranking e badge de premium

**Funcionalidades:**
- Fórum com posts das últimas 48h por província
- Comentários expansíveis com lazy loading
- Input de comentário para utilizadores autenticados
- Selector de província com modal
- Ranking de agentes via RPC (top 20, min. 3 avaliações)
- Medalhas para top 3, percentagem de aprovação
- Link para ranking no ecrã de perfil

---

### Fase 4 — Views + Premium (2026-07-19) ✅

**Ficheiros criados:**

- `src/hooks/useViews.ts` — Hook com fetch de saldo de views (diário via `daily_view_usage` + `app_settings`), premium check (via `subscriptions`), e `consumeView` via RPC `consume_atm_view`
- `src/components/premium/PremiumModal.tsx` — Modal premium com selecção de plano (mensal/anual), pagamento Multicaixa Express (entity 00930, referência gerada), envio de comprovativo via WhatsApp
- `src/components/map/ATMDetailSheet.tsx` — Actualizado com gating: premium vê directamente, free com views vê "Desbloquear", free sem views vê "Limite atingido" + upgrade
- `app/(tabs)/map.tsx` — Actualizado com `useViews`, `PremiumModal`, estado de unlock por ATM, badge de views restantes no topo

**Funcionalidades:**
- Sistema de views com 3 views/dia para free users (configurável via `app_settings`)
- Premium check via tabela `subscriptions` (status=active, expires_at > now)
- Consumo de view via RPC `consume_atm_view` (reutiliza view existente se <24h)
- Modal premium com 2 planos (Mensal 1.500 Kz, Anual 13.500 Kz ~25% desconto)
- Pagamento via Multicaixa Express (entity 00930, referência automática)
- Envio de comprovativo via WhatsApp
- Gating no ATMDetailSheet: locked/unlocked states
- Badge de views restantes no mapa
- Admin bypass (via RPC)

---

### Fase 3 — Agent Dashboard (2026-07-19) ✅

**Ficheiros criados:**

- `src/hooks/useAgent.ts` — Hook com fetch de ATMs do agente, stats (ganho total, views, saldo disponível), update de status/cash/paper/fila/obs
- `src/components/agent/AgentATMCard.tsx` — Card de ATM com Switch de cash/paper, picker de fila, picker de status, editor de observações
- `app/(tabs)/agent.tsx` — Ecrã do painel do agente com stat cards, lista de ATMs, access control por role
- `app/(tabs)/_layout.tsx` — Actualizado com tab "Agente" (visível apenas para agentes via `href={isAgent ? undefined : null}`)

**Funcionalidades:**
- Dashboard com 4 stat cards (ATMs, Views, Ganhos, Disponível)
- Secção de levantamentos já efectuados
- Lista de ATMs atribuídos ao agente
- Toggles para cash/paper com actualização instantânea
- Picker de fila (Pouca/Moderada/Muita)
- Picker de estado (Operacional/Sob Manutenção/Fora de Serviço)
- Editor de observações inline
- Indicador de tempo desde última actualização
- Pull-to-refresh
- Access control: ecrã "Acesso restrito" para não-agentes

**Correções:**
- Removido `.catch()` inválido em `useAgent.ts` (PromiseLike não suporta catch)

---

### Fase 2 — Mapa + ATMs (2026-07-19)

**Dependências adicionadas:**
- `react-native-maps` — Mapa nativo com Google provider
- `react-native-map-clustering` — Clustering de marcadores

**Ficheiros criados:**

- `src/hooks/useATMs.ts` — Fetch ATMs do Supabase, filtros por busca/banco/estado, ordenação por proximidade (haversine)
- `src/hooks/useLocation.ts` — Geolocalização do dispositivo com expo-location
- `src/components/map/ATMMapView.tsx` — Mapa principal com marcadores customizados, clustering por grelha, localização do utilizador
- `src/components/map/ATMMarker.tsx` — Marcador com cores por estado (verde/vermelho/cinza/azul)
- `src/components/map/MapFilters.tsx` — Barra de busca + chips de filtro (banco, estado)
- `src/components/map/ATMDetailSheet.tsx` — Bottom sheet com detalhes do ATM (dinheiro, papel, fila, última actualização, distância)
- `app/(tabs)/map.tsx` — Replaced placeholder with full map integration

**Funcionalidades:**
- Mapa Google Maps com marcadores colour-coded por estado
- Busca por nome, endereço, cidade
- Filtro por banco (BFA, BAI, BIC, etc.)
- Filtro por estado (com dinheiro, sem dinheiro, offline)
- Detalhe do ATM em bottom sheet
- Distância calculada por haversine
- Localização do utilizador com permissão

---

### Fase 1 — Setup + Auth (2026-07-19) ✅

**Ficheiros criados:**

- `package.json`, `app.json`, `tsconfig.json`, `babel.config.js`, `metro.config.js`
- `tailwind.config.js`, `nativewind-env.d.ts`, `global.css`
- `.env` — Credenciais staging
- `src/lib/supabase.ts` — Cliente Supabase com SecureStore adapter
- `src/lib/supabase-types.ts` — Tipos BD (copiado do web)
- `src/lib/phone.ts`, `src/lib/distance.ts`
- `src/constants/provinces.ts`
- `src/hooks/useAuth.ts` — Hook de autenticação
- `app/_layout.tsx` — Root layout com auth redirect
- `app/(auth)/` — Login, register, reset-password, auth-callback
- `app/(tabs)/` — Bottom tabs layout, forum (placeholder), profile
- `AGENTS.md`, `LOG.md`, `.gitignore`
