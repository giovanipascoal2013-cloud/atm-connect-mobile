# LOG de Desenvolvimento — ATM Connect Mobile

## Estado Actual

### Correções 4ª ronda errr.txt — WhatsApp, ordenação por proximidade, contraste (2026-08-07) ✅ (tsc + lint OK)

Novos pedidos do utilizador (4ª leitura de `errr.txt`), implementados e validados com `npx tsc --noEmit` (0 erros) e `npx expo lint` (0 problemas):

- **Botão de apoio ao cliente (WhatsApp)** — novo `src/lib/support.ts` (`SUPPORT_WHATSAPP_NUMBER`, `SUPPORT_DEFAULT_MESSAGE`, `supportWhatsAppUrl()` reutilizando `waLink`). `app/(tabs)/profile.tsx`: novo `SectionLink` "Apoio ao Cliente" (ícone `logo-whatsapp`) entre "Referências" e a secção de ajuda. Refactor de reutilização em `login.tsx`, `reset-password.tsx` e `PremiumModal.tsx` (número de WhatsApp deduplicado).
- **Fix ordenação por proximidade após login** — causa-raiz: a distância só era calculada no fetch e o sort por proximidade exigia `userLocation`; após login o navigator `(tabs)` remonta e a lista caía para a ordem alfabética do servidor. `useLocation.ts`: cache de última localização em módulo (`getCachedLocation`) para remounts instantâneos. `useATMs.ts`: distância reactiva num `useMemo` sobre `[atms, userLocation]`, sort `proximity` sempre aplicado por `distance ?? MAX_SAFE_INTEGER`, `.order('bank_name')` removido.
- **Revisão de contraste** — `text.tertiary` `#9CA3AF` → `#6B7280`; marcadores do mapa com stroke branco (`circle-stroke-width: 2`) para se destacarem do fundo escuro; `EmptyState` (ícone `brand[600]` + borda), `Badge neutral`, track do `SegmentedControl`, pills do mapa sólidas + borda, botão "Copiar" do `ReferralCard`, `AppButton secondary` (`brand[700]`), tint inactivo das tabs, círculos de ícone do Perfil e dot de bloqueado da lista.
- **Spec**: `docs/superpowers/specs/2026-08-07-errr-round4-fixes-design.md`.
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

A integração de anúncios Google AdMob foi **removida por completo** e adiada para outra altura, por causar erros de build/web bundling (`react-native-google-mobile-ads` é nativo-only). O app voltou ao estado pré-AdMob (commit `4319769`). Mantém-se o `package-lock.json` sincronizado. Design de remoção: `docs/superpowers/specs/2026-08-07-remove-admob-integration-design.md`.

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

Fixes aplicados aos problemas reportados em `errr.txt` (também cobrem "Missing/not working" do `.tmp-create-agent.mjs`):

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
