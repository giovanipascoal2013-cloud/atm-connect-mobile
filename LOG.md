# LOG de Desenvolvimento — ATM Connect Mobile

## Estado Actual

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

**Fase Actual**: ✅ Análise e Configuração Expo Go Completa
**Última Actualização**: 2026-07-21
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
