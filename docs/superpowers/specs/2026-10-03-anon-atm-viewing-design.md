# Ver ATMs sem login (anónimo + anúncio) — Design

**Data:** 2026-10-03 · **Estado:** aprovado (brainstorming), por implementar · **Repo:** `atm-connect-mobile`
**BD alvo:** Supabase **staging** `ndvjitfovhfngrzwtytd`

## 1. Objectivo

**Reduzir a fricção no acesso aos ATMs:** ver e desbloquear um ATM **sem login** — basta ver um anúncio. O login passa a ser exigido apenas para **subscrever (premium)** ou **gerir ATMs (ser agente)**, mais as acções que exigem identidade (favoritos, voto, posts, perfil).

Consequência de negócio: as views anónimas **continuam a pagar a comissão de 0,15 Kz ao agente** dono do ATM, pelo que o bónus do flyer (700 Kz / 30 views) mantém a sua economia.

## 2. Decisões (brainstorming)

| Decisão | Escolha |
|---|---|
| Identidade do visitante anónimo | **`device_id`** = UUID v4 gerado uma vez e guardado em `expo-secure-store`. Persiste entre arranques, perde-se ao desinstalar |
| Tabela do unlock anónimo | **Tabela nova `anon_ad_unlocks`**, separada. `ad_unlocks` **intocada** (puro aditivo, zero regresso no caminho registado) |
| Alternativas descartadas | (a) alargar `ad_unlocks` → `user_id` nullable quebra o `unique(user_id,atm_id)` (Postgres trata NULLs como distintos) e exige 2.º RPC só para leitura; (b) Supabase **Anonymous Auth** → `handle_new_user` polui `profiles`/`user_roles`/`agent_onboarding_progress` e obriga a filtrar "contas sem telefone" em todas as agregações do **repo web** (`get_agent_count`, `batch_agent_stats`, ranking, supervisor) |
| Comissão em views anónimas | **Sim, contam** para as 30 views do flyer — `flyer_bonus_check` conta `agent_earnings` sem filtro de `source` |
| Pagamento do bónus do flyer | **Só depois de o admin aprovar o flyer.** Já garantido: `flyer_bonus_check` sai em `v_sub_id is null` enquanto a submissão estiver `submitted` |
| Views anteriores à aprovação | **Contam.** `agent_earnings` já as contém quando o admin aprova; `approve_flyer_submission` chama `flyer_bonus_check` logo a seguir |
| Risco de fraude (B15) | **Aceitado** (opção 1): `device_id` é do cliente, não é validado. Gravidade real hoje = 0 (AdMob IDs são de teste). Mitigação: 0,15 Kz/unidade |
| SSV (AdMob Server-Side Verification) | **Nota de follow-up**, não implementado. Resolve B14 + B15. Pré-requisito antes de IDs reais |
| Gate das acções sem identidade | **Soft gate**: `Alert` com "Inicia sessão para…" + botão "Entrar". Nunca esconder o botão (mesmo padrão de `app/(tabs)/forum.tsx:81-91`) |
| Nudge de registo | **Sim**, no fim do detalhe de um ATM desbloqueado, dispensável, "Criar conta" → `/(auth)/register` |
| Ranking | Ícone de troféu **sempre** no header do mapa (já é público no servidor) — é o funil de descoberta para "quero ser agente" |
| TTL do unlock | **24 h**, igual ao `create_ad_unlock` existente |

## 3. Estado actual verificado (probes ao staging)

| Verificação | Resultado |
|---|---|
| `anon` → `GET /rest/v1/atms` | **200** (policy `"Anyone can view ATMs" … TO anon, authenticated`, `atm-connect-angola\supabase\migrations\20260317063541_*.sql:15-16`) |
| `anon` → `GET /rest/v1/profiles` | 200 mas **1 row só** (perfil demo) — sem fuga de IBAN/saldos |
| `anon` → `GET /rest/v1/app_settings`, `user_roles` | 0 rows |
| `anon` → `GET /rest/v1/forum_posts` | 200 (253 posts) |
| `anon` → `rpc get_agent_rating_stats` | **200** |
| `anon` → `rpc get_agent_ranking` | **200** |
| `anon` → `rpc create_ad_unlock` | **401** ← bloqueador de BD |
| `anon` → `rpc vote_agent` | **409** |
| `.env` → 6 AdMob IDs | **Todos IDs de teste do Google** (`ca-app-pub-3940256099942544/…`) |

**Bloqueios client-side:** `src/components/map/ATMList.tsx:151-157` (`isLocked` exige `isLoggedIn`), `src/components/map/ATMDetailSheet.tsx:243-252` ("Entrar para ver detalhes"), `app/(tabs)/map.tsx:106-109` e `:140-143` (push para login), `src/hooks/useAdUnlocks.ts:80` (`createUnlock` devolve `false` sem user).
**Bloqueio BD:** `ad_unlocks.user_id NOT NULL` com FK a `profiles` (`20260813000001_ad_unlocks.sql:16-17`).

O mapa **já abre sem login**: `app/index.tsx:4` redirecciona para `/(tabs)/map` sem gate, e `app/_layout.tsx:32-36` só tem o redirect inverso (login → mapa).

## 4. Fronteira

**Público (sem login, sem alteração de BD):** mapa e lista de ATMs · detalhe completo do ATM (nome, morada, cidade/província, estado, dinheiro/papel, fila, distância, "actualizado há") · ver likes/dislikes do agente · leitura do fórum · ranking de agentes.

**Continua a exigir login (inalterado):** submeter ATM · painel de agente · flyer · saldo e saques · subscrição premium · favoritos · "as minhas views" · notificações · referrals · votar (`vote_agent`) · criar posts.

## 5. Arquitectura

### 5.1 Backend — `20261003000001_anon_ad_unlocks.sql`

Raiz do repo (convenção do projecto), **idempotente**, para aplicar no SQL editor do staging com o role `postgres`.

- **Tabela `anon_ad_unlocks`**: `device_id uuid not null`, `atm_id uuid not null references atms(id) on delete cascade`, `expires_at timestamptz not null`, `created_at timestamptz not null default now()`, **`primary key (device_id, atm_id)`**.
  O PK faz o papel do `unique (user_id, atm_id)` de `ad_unlocks` — **trava a dupla comissão no servidor**, que o cliente não pode cumprir.
  RLS ligado, **sem policies**: não há `SELECT` para `anon` (o estado vive no dispositivo), nem `INSERT`/`UPDATE`/`DELETE` directos — só via RPC.
- **`credit_ad_commission(p_agent_id, p_atm_id, p_viewer_user_id, p_source)`** SECURITY DEFINER — extrai as 4 escritas hoje dentro de `trigger_ad_commission` (`20260813000001_ad_unlocks.sql:74-128`): `agent_earnings`, `balance_transactions` (`reference_type='earning'`), `profiles.agent_balance_kz += `, e `create_notification('ad_commission')`; mantém a leitura de `app_settings.agent_commission_free_view_kz` (fallback `0.15`) e a guarda `v_agent_id <> p_viewer`.
  **Refactoriza `trigger_ad_commission`** para chamar esta função — elimina a duplicação em vez de a perpetuar.
- **Trigger `trigger_anon_ad_commission`** AFTER INSERT OR UPDATE em `anon_ad_unlocks`, com a guarda anti-duplicação `TG_OP='UPDATE' and new.expires_at <= old.expires_at → return new`; escreve `source='ad_view_anon'` e `user_id = NULL` em `agent_earnings` (coluna já nullable, `20260813000001_ad_unlocks.sql:68`; sem CHECK constraint em `source`).
- **RPC `create_ad_unlock_anon(p_device_id uuid, p_atm_id uuid) RETURNS timestamptz`** SECURITY DEFINER:
  1. valida `p_device_id` não nulo e `p_atm_id` existente com `status_approval='approved'` e `deleted_at is null` (senão `raise exception`);
  2. auto-poda: `delete from anon_ad_unlocks where device_id = p_device_id and expires_at <= now()`;
  3. upsert de 24 h em `(device_id, atm_id)`;
  4. devolve o `expires_at` efectivo — **para o cliente sincronizar o estado local a partir do servidor**.
  `revoke all … from public, anon` e `grant execute … to anon`. Sem `authenticated` — o caminho registado continua no `create_ad_unlock`.
- **`anon_ad_unlocks` NÃO entra na publication `supabase_realtime`** (ao contrário das outras tabelas deste projecto): não há policy de `SELECT` e o único leitor é o próprio dispositivo, via SecureStore. Sem subscription não há tráfego de replicação.
- **Sem alterações a:** `ad_unlocks`, `create_ad_unlock`, `ad_unlocks` policies, `flyer_submissions`, `flyer_bonus_check`, `trg_flyer_bonus_unlock`, policies de `atms`.

`agent_earnings.source` distingue as origens para auditoria (`'ad_view'` vs `'ad_view_anon'`) e para contar fraude B15.

### 5.2 Mobile

| Ficheiro | Mudança |
|---|---|
| **`src/lib/device.ts`** (novo) | `getDeviceId()` — lê `atm_connect_device_id` de SecureStore; se ausente gera v4 (`try { require('expo-crypto').randomUUID() } catch { fallback Math.random() }`), grava e devolve. Mesmo padrão defensivo de `useAdMob.ts:14-25` |
| **`src/lib/ad-unlocks-store.ts`** (novo) | Persistência SecureStore do mapa `{ [atmId]: expiresAt }` do modo anónimo: `readAll()` (poda os expirados), `write(atmId, expiresAt)`, `clear()`. Separado do hook para o hook não crescer demasiado |
| **`src/hooks/useAdUnlocks.ts`** | **Modo duplo.** Sem `user` → store local (o `fetchUnlocks` actual já sai cedo, `useAdUnlocks.ts:20-24`). Com `user` → caminho actual via BD + realtime, que passa a ser **autoritativo**; os unlocks anónimos locais descartam-se no login (aceitável: sem risco de contagem dupla, e o DB tem o PK que trava duplicados). `createUnlock` **mantém a assinatura `Promise<boolean>`** (só o `map.tsx` a consome) e bifurca internamente: `user` → `create_ad_unlock`; senão `getDeviceId()` + `create_ad_unlock_anon` e persiste o `expires_at` devolvido pelo servidor |
| **`src/components/map/ATMDetailSheet.tsx`** | Sai `onLogin`; entra `onCreateAccount`. **Mantém-se `isLoggedIn`, mas só para o nudge** (é o único sítio que precisa de saber se há sessão). No estado locked (`:243-265`) **unifica** as duas branches em **sempre** "Ver anúncio para desbloquear" + a linha "Ao ver o anúncio desbloqueias este ATM. O dono do ATM ganha por cada visita.". No unlocked, o coração (`:107` e `:232`) passa a aparecer para **todos** — o toque é que faz soft gate. Novo **card de nudge** no fim do `ScrollView`, só quando `!isLoggedIn && unlocked && showNudge`, dispensável (estado em memória, repõe a cada arranque) |
| **`src/components/map/ATMList.tsx:151-157`** | `isLocked` deixa de exigir login: `if (isPremium) return false; return !lockedIds?.has(atm.id)`. Sai a prop `isLoggedIn` (o lock é o único sítio que a usava) |
| **`src/components/map/MapboxWebView.tsx:28`** | **Mesmo bug de âmbito, 2.º sítio:** `buildGeoJSON` usava `!(isLoggedIn && lockedIds?.has(atm.id))`. Sem isto o anónimo desbloqueia e o **marcador continua cinzento**. Sai o parâmetro `isLoggedIn` de `buildGeoJSON`/`buildHTML`/`MapboxWebView` e das `useMemo` |
| **`src/components/map/ATMMapView.tsx`** / **`app/favorites/index.tsx:52`** | Só repassa props: remove `isLoggedIn` |
| **`app/(tabs)/map.tsx`** | `handleWatchAd` (`:104-136`) perde o `router.push('/(auth)/login')`. `handleVote` (`:138-157`) e o favorito passam por `requireAuth(motivo)` — **soft gate** (Alert "Cria a tua conta" com *Criar conta* / *Entrar* / *Agora não*) em vez de navegação. Estados novos `showNudge` (uma vez por sessão) e `handleCreateAccount`. Sai `isLoggedIn` do `ATMMapView`/`ATMList`. `fetchRating` (`:65-77`) fica como está — `get_agent_rating_stats` responde a `anon` com `_user_id` omitido (verificado: `{"likes":0,"dislikes":0,"total":0,"user_vote":null}`), logo o bloco de voto renderiza para anónimos |
| **`app/(tabs)/_layout.tsx:58-95`** | `headerRight` do mapa: **ícone de troféu sempre** → `/ranking` (público); estrela + sino **só com `user`**; "Entrar" para anónimos |
| **`app/ranking/_layout.tsx:20`** | O `HeaderBackButton` tem `fallback="/(tabs)/profile"`, que é login-gated. Como o ranking passa a ser alcançável a partir do mapa, o `fallback` passa a `/(tabs)/map` ( só importa em deep-link frio, quando não há histórico para `router.back()`) |
| **`src/lib/supabase-types.ts`** | Tipos de `anon_ad_unlocks` (Row/Insert) + assinatura de `create_ad_unlock_anon`, para o `tsc` passar |

**Soft gate** (replica `app/(tabs)/forum.tsx:81-91`): `Alert.alert('Cria a tua conta', motivo, [{ text: 'Agora não', style: 'cancel' }, { text: 'Criar conta', onPress: → /(auth)/register }, { text: 'Entrar', onPress: → /(auth)/login }])`. Vive em `map.tsx` (`requireAuth`), não no componente — o componente só reporta a intenção. O nudge usa "Criar conta" → `/(auth)/register` via `onCreateAccount`.

**Dependência nova:** `expo-crypto` (não está no `package.json` nem no `package-lock.json`). Sem módulo nativo novo, o rebuild já pendente (lottie + media-library) cobre-o.

## 6. Regras de negócio / limites

- Unlock anónimo expira em **24 h**; TTL igual ao do utilizador registado.
- Um `device_id` × ATM só pode ter **um** unlock activo (PK) — a **renovação** (rever anúncio antes de expirar) é paga ao agente, tal como no caminho registado.
- O visitante **não paga** comissão ao agente se o ATM for dele próprio (mesma guarda `v_agent_id <> p_viewer`).
- Sem sessão, o premium não existe: `isPremium` é `false`, o interstitial (`INTERSTITIAL_EVERY = 4`, `map.tsx:25`) aplica-se normalmente e os banners mostram-se sempre.
- Perder o `device_id` (desinstalar) **não** cria comissão dupla: o upsert encontra a linha e o trigger não renova se `expires_at` não avançou. O visitante só vê o ATM bloqueado de novo.

## 7. Risco aceite

**B15 — `device_id` forjável.** O cliente inventa o `device_id` e manda-o; o servidor não o valida. Um atacante pode gerar um ID novo por pedido e criar comissões ilimitadas para um ATM agente. É **pior** que o **B14** já documentado (`LOG.md:181`, que exigia pelo menos falsificar uma chamada autenticada): agora nem é preciso login, e o PK não trava nada porque cada ID forjado é novo.

- **Gravidade hoje = 0**: os 6 AdMob IDs no `.env` são **IDs de teste do Google**, portanto não há receita real a explorar.
- **Mitigação actual**: valor unitário baixo (0,15 Kz). O atacante só ganha se coludir com um agente para sacar dinheiro real.
- **Mitigação definitiva (follow-up)**: **SSV do AdMob** — `showRewarded` envia o payload `rewarded` para uma Edge Function, que valida com a AdMob API antes de `credit_ad_commission`. Resolve B14 **e** B15 de uma vez. Exige conta AdMob com SSV activo e um backend sempre-on. **Obrigatório antes de substituir os IDs de teste por IDs reais.**

## 8. Verificação

**BD (staging, `BEGIN…ROLLBACK` — sem resíduos):**

1. `create_ad_unlock_anon` com device+ATM válidos devolve `expires_at`.
2. Um `UPDATE` em `anon_ad_unlocks` que **não** renova `expires_at` **não** cria `agent_earnings` (a guarda anti-duplicação do B11 continua a valer). 2.ª chamada ao RPC com o mesmo `device_id` **não duplica a linha** (o PK faz upsert) e **renova + paga** — comportamento pretendido, igual ao `create_ad_unlock` registado.
3. `device_id` **diferente** paga comissão (nova linha `source='ad_view_anon'`, `balance_transactions`, `agent_balance_kz`, notificação).
4. ATM do próprio visitante **não** paga.
5. ATM `pending` ou com `deleted_at` é **rejeitado**.
6. `agent_earnings` aceita `user_id IS NULL` com `source='ad_view_anon'`.
7. `anon` **não** consegue `SELECT` em `anon_ad_unlocks`.
8. `flyer_bonus_check` **não** credita sem `flyer_submissions.status='approved'`, e credita o valor correcto quando as views (incl. anónimas) chegam ao limiar.

**Cliente (executado pelo utilizador — o `AGENTS.md` proíbe ao agente):** `npx tsc --noEmit` · `npx expo lint`.

**Walkthrough no device:** abrir sem login → ver ATMs no mapa e na lista → abrir detalhe → "Ver anúncio para desbloquear" → desbloquear → ver voto e coração → tocar → soft gate → dispensar/aceitar o nudge → abrir o ranking pelo header. Depois login: o caminho registado tem de estar inalterado (unlocks via BD, favoritos, voto).

## 9. Fora de âmbito

SSV do AdMob · substituir os IDs de teste por IDs reais · dashboard de admin do flyer no repo web · qualquer refactor do UI do premium.

## 10. Notas de follow-up

1. **SSV do AdMob** — ver §7.
2. **Dashboard de admin do flyer** (`atm-connect-angola`, painel web): lista de agentes que aderiram à colocação do flyer, submissões por estado (`submitted`/`approved`/`rejected`/`rewarded`), progresso de `count(agent_earnings)` vs `flyer_views_unlock`, e acção de aprovar/rejeitar. Hoje só é possível linha a linha no SQL editor. Nota detalhada com as queries a escrever em `docs/` para o repo web.

## 11. Ordem de execução

1. Esta spec → commit `docs(spec)`.
2. Escrever `20261003000001_anon_ad_unlocks.sql`; utilizador aplica no SQL editor do staging.
3. Verificação SQL com `BEGIN…ROLLBACK` (blocos de §8).
4. Utilizador: `npx expo install expo-crypto` e `npm install --package-lock=true` (regra do `AGENTS.md`: o agente não instala deps).
5. Código cliente (12 ficheiros de §5.2).
6. Utilizador: `npx tsc --noEmit` e `npx expo lint`.
7. `LOG.md`: entrada da feature + secção **"Relatório do Estado da BD"** (regra do `AGENTS.md`) + risco **B15** em §7.
8. Commits convencionais separados, com `package.json` + `package-lock.json` **sempre juntos**.

## 12. Pendente (utilizador)

1. Aplicar `20261003000001_anon_ad_unlocks.sql` no staging (SQL editor, role `postgres`).
2. `npx expo install expo-crypto` → `npm install --package-lock=true`.
3. `npx tsc --noEmit` e `npx expo lint`.
4. `eas build --platform android --profile preview` e walkthrough no device (passos de §8).
