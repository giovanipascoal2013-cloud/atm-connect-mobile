# Próximos Passos — ATM Connect Mobile

> Ficheiro de handoff. Ler `LOG.md` para o histórico completo.
> Secção atual: **AdMob Rewarded Ads** (spec `docs/superpowers/specs/2026-08-13-admob-rewarded-ads-design.md`).
> Trabalho anterior (6 fases notificações/favoritos) já commitado em `main` — ver refs abaixo.

## Estado actual (2026-08-13)

Integração AdMob Rewarded Ads **implementada no código e verificada**, mas **NÃO commitada** e **NÃO testada em device**. Working tree com alterações unstaged/untracked (ver `git status`).

**Verificado:**
- `npx tsc --noEmit` → 0 erros
- `npx expo lint` → 0 erros / 0 warnings
- Migração `20260813000001_ad_unlocks.sql` corrigida contra o schema real do staging (agent_earnings sem `user_id`/`source`, balance_transactions sem `metadata`, `view_id` NOT NULL)
- Todos os ecrãs migrados de `useViews` → `useAdUnlocks`/`useAdMob`

## Passos por fazer (utilizador, no terminal)

1. **Instalar/atualizar dependências** (lockfile não tem `react-native-google-mobile-ads`; o agente não instala sozinho):
   ```bash
   npm install
   ```
2. **Aplicar a migração SQL no Supabase staging** (`ndvjitfovhfngrzwtytd` — SQL editor, role postgres). **Depende primeiro de `20260811000003_notifications_favorites_push.sql`** (cria `create_notification`, usado pelo trigger):
   - `20260811000001_fix_consume_atm_view_is_active.sql` (se ainda não aplicada)
   - `20260811000002_subscriptions_quarterly_policy_insert.sql` (se ainda não aplicada)
   - `20260811000003_notifications_favorites_push.sql`
   - `20260813000001_ad_unlocks.sql`
3. **Rebuild do dev client** e testar rewarded ads no Android:
   ```bash
   eas build --platform android --profile development
   ```
   > Expo Go/web **não** suporta AdMob → `showRewarded()` devolve `false` (decidido: **sem fallback grátis**, "tem de ver anúncio").
4. **Testes manuais sugeridos:**
   - Mapa → tocar ATM (sem premium) → "Ver anúncio para desbloquear" → ver anúncio (test ID) → detalhes desbloqueados por 24h.
   - Voltar ao mesmo ATM após as 24h → ver se o desbloqueio reactiva e se o agente recebe comissão (ver decisão pendente abaixo).
   - Perfil → card "Desbloqueios activos" (conta ATMs ativos; "Ilimitado" se premium).
   - `/my-views` → lista os `ad_unlocks` ativos com tempo restante.
   - Verificar no SQL editor: `select * from agent_earnings where source='ad_view'` e `agent_balance_kz` do agente incrementado.

## DECISÃO PENDENTE (bloqueia fecho do trigger)

> **RESOLVIDA (2026-08-13):** opção **(A) recomendada** escolhida — trigger mudado para `after insert or update` no SQL + guarda anti-duplicação (em UPDATE só paga se `expires_at` renovado). `20260813000001_ad_unlocks.sql` já atualizado.

O `createUnlock` (src/hooks/useAdUnlocks.ts) usa `upsert` com `onConflict: 'user_id,atm_id'` → em **re-watch do mesmo ATM após expirar**, a linha é **UPDATE**, não INSERT. O trigger `trg_ad_commission` é `after insert` → **o agente NÃO recebe comissão na 2ª visualização do mesmo ATM**.

## Passos por fazer (agente IA, quando retomado)

- [x] Resolver a decisão pendente do trigger acima — **opção A escolhida** (after insert or update + guarda anti-duplicação).
- [x] Eliminar `src/hooks/useViews.ts` (código morto) + limpar tipos legados (`atm_views`, `daily_view_usage`, `consume_atm_view`) do `src/lib/supabase-types.ts`.
- [x] Atualizar `LOG.md`: entrada de integração AdMob + **"Relatório do Estado da BD"**.
- [ ] Commit com mensagem conventional (ver refs git abaixo). Working tree: `M .env.example, app.json, app/(tabs)/map.tsx, app/(tabs)/profile.tsx, app/favorites/index.tsx, app/my-views/index.tsx, package.json, src/components/map/ATMDetailSheet.tsx, src/lib/supabase-types.ts, NEXT_STEPS.md, LOG.md` + untracked `20260813000001_ad_unlocks.sql, docs/superpowers/specs/2026-08-13-admob-rewarded-ads-design.md, src/hooks/useAdMob.ts, src/hooks/useAdUnlocks.ts` + **delete `src/hooks/useViews.ts`**.
- [ ] `git push` quando autorizado.

## Riscos / notas conhecidas

- **Vector de fraude (aceite no design):** RLS `ad_unlocks_insert_own` permite qualquer user autenticado inserir `ad_unlocks` directamente (sem ver anúncio), disparando comissão. Sem verificação SSV server-side por agora.
- **Plugin SDK 54:** GitHub invertase issue #835 — `react-native-google-mobile-ads` v16 pode dar erro de config plugin no SDK 54; workaround reportado `npx expo install --fix`.
- **Ficheiro SQL na raiz** (convenção do repo, não `supabase/migrations/`) — aplicar manualmente no SQL editor do staging.
- `.env` com test IDs (`EXPO_PUBLIC_ADMOB_REWARDED_ANDROID/IOS`) e App IDs de teste no `app.json`.

## Refs rápidas

- Git identity não configurada → usar nos commits:
  ```
  git -c user.name="Gio Pilav" -c user.email="giovanipascoal2013@gmail.com" commit ...
  ```
- Verificar: `npx tsc --noEmit` (0 erros) + `npx expo lint` (0 problemas).
- Projectos: **Produção** `dinmao` (`twfkzfpcxuzbydzuykwi`) / **Staging** (`ndvjitfovhfngrzwtytd`) — o app desenvolve contra staging.
- Versões SDK 54: `react-native-google-mobile-ads@^16.4.0` (já em package.json), `expo-notifications ~0.32.17`, `expo-device ~8.0.10`.
