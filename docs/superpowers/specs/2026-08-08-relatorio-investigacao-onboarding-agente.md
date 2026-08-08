# Relatório de Investigação — Fluxo de Agente: Registo → Onboarding → Submeter ATM

**Data**: 2026-08-08
**Pedido do utilizador**: investigar (com a BD) porque ao criar a conta de agente há problemas para encaminhar directamente para o onboarding e, sucessivamente, para o registo de ATMs.
**Método**: leitura do código mobile (`register.tsx`, `_layout.tsx`, `agent.tsx`, `onboarding.tsx`, `submit-atm.tsx`, `useAuth.ts`, `useAgentOnboarding.ts`) + consultas REST ao **staging** (`ndvjitfovhfngrzwtytd`, service role, só leitura) + migrações SQL do web app.

---

## 1. Conclusão principal

**A base de dados não é a causa.** O trigger `handle_new_user`, o RLS e o bucket de fotos funcionam correctamente no staging. O problema está no **fluxo de navegação do app mobile** (duas causas de raiz de código). A investigação à BD serviu para excluir as hipóteses de backend e confirmar que tudo do lado servidor está pronto para o fluxo funcionar.

## 2. Evidência da BD (staging)

| Verificação | Resultado | Prova |
|---|---|---|
| Confirmação de email | **`mailer_autoconfirm: true`** (confirmação DESLIGADA) | `GET /auth/v1/settings` |
| Trigger `handle_new_user` cria role | ✅ agentes recentes (Teste3–7, Teste888) têm `user_roles = ['agent']` | `user_roles` + `profiles` |
| Trigger cria `agent_onboarding_progress` | ✅ todos os agentes têm row com `onboarding_seen: false` à nascença | `agent_onboarding_progress` |
| Agentes sem row de onboarding | **0** (372 agentes / 373 rows) | cross-reference |
| RPC `has_role(_role, _user_id)` | ✅ **existe e funciona** (agent → `true`) | `POST /rest/v1/rpc/has_role` |
| Policy de insert em `atms` ("Agents can submit pending ATMs") | ✅ depende de `has_role(auth.uid(),'agent')` — função válida → insert permitido | migração `20260422…` + teste RPC |
| RPC `consume_atm_view(_atm_id)` | ✅ existe (ainda impõe limite diário `daily_view_usage` — a remover na transformação) | teste RPC |
| Bucket `atm-photos` | ✅ existe, privado | `GET /storage/v1/bucket` |
| RPCs `notify_users_by_role`, `approve_pending_atm`, `reject_pending_atm` | ✅ presentes | OpenAPI |

> ⚠️ Nota sobre `has_role`: a função **existe** mas tem parâmetros `_role`/`_user_id`. O PostgREST só a expõe com esses nomes exactos; a OpenAPI não lista o RPC (causou um falso negativo inicial). Para chamadas directas é preciso usar `{ _role, _user_id }`.

## 3. Causa de raiz A — Race condition no redireccionamento pós-registo

**Cenário**: com `mailer_autoconfirm: true`, o `signUp` devolve sessão imediatamente.

- `register.tsx:163-164`: após signUp de agente → `router.replace('/agent/onboarding')`.
- `app/_layout.tsx:19-21` (root layout): quando `user` fica definido e o segmento actual é `(auth)` → `router.replace('/(tabs)/map')`.

Ambas as navegações disparam quase ao mesmo tempo (a do root layout quando `fetchProfile` termina e `loading` passa a `false`). **Quem executar por último ganha** → por vezes o agente é atirado para o mapa em vez do onboarding. Resultado não-determinístico — condiz com "temos tido problemas para encaminhar directamente para o onboarding".

**Evidência no ar**: **23 agentes com `onboarding_seen: false`** no staging (registaram-se como agente e nunca completaram o onboarding). Alguns (Teste3, Teste4, Teste5, Teste22) têm `first_atm_submitted: true` com `onboarding_seen: false` — chegaram ao `submit-atm` sem o onboarding ficar marcado.

## 4. Causa de raiz B — Sem redireccionamento automático após cair no mapa

- O único gate para o onboarding vive no **separador Agente** (`app/(tabs)/agent.tsx:54-58`): só redirecciona quando o utilizador **abre esse separador**.
- Após o registo (race) ou após um login posterior, o agente aterra no **mapa** e nada o encaminha — a descoberta do onboarding depende de o utilizador tocar no separador Agente por iniciativa própria.

## 5. Causa de raiz C — `onboarding_seen` pode não ser gravado

`onboarding.tsx:58-62` marca `onboarding_seen: true` num `useEffect` no mount, mas:
- `useAgentOnboarding.update` devolve **silenciosamente** se `user` ainda não estiver definido no momento do mount (`useAgentOnboarding.ts:68` `if (!user) return`) — janela possível logo após o signUp (o `user` do hook pode ainda não estar preenchido quando o ecrã monta).
- `markedRef` impede nova tentativa — se falhar, nunca volta a tentar.
- As 23 contas com `onboarding_seen: false` são consistentes com este comportamento (o `router.replace('/agent/onboarding')` do registo monta o ecrã cedo demais).

## 6. Efeito na navegação "sucessivamente ao registo de ATMs"

- Do onboarding, "Continuar para registar um ATM" → `router.replace('/agent/submit-atm')` (`onboarding.tsx:65`) — correcto e com `HeaderBackButton` (`agent/_layout.tsx:20`).
- O insert em `atms` (`submit-atm.tsx:136-156`) usa `submitted_by`, `agent_id`, `status_approval: 'pending'` — a policy **permite** (has_role OK).
- Upload de foto para `atm-photos` — bucket existe.
- Logo, **se o onboarding for alcançado**, o registo de ATMs funciona. O elo fraco é só chegar lá.

## 7. Fixes propostos (a adicionar ao plano)

| # | Fix | Local | Prioridade |
|---|---|---|---|
| **O1** | **Eliminar a race do pós-registo**: flag/sinal que suprime o redirect do root layout enquanto o registo navega para o onboarding. Ex.: módulo `pendingAgentRedirect = true` em `register.tsx` antes do `router.replace('/agent/onboarding')`; `_layout.tsx` verifica `!pendingAgentRedirect` antes de `router.replace('/(tabs)/map')` | `register.tsx`, `app/_layout.tsx` | **Alta (crucial)** |
| **O2** | **Redireccionamento pós-login garantido**: no `(tabs)/_layout.tsx` (monta sempre após login), se o utilizador for agente com `onboarding_seen=false` e sem ATM aprovado/pendente → `router.replace('/agent/onboarding')`. Cobre login posterior e o cenário da race | `(tabs)/_layout.tsx` | **Alta (crucial)** |
| **O3** | **Tornar a marcação de `onboarding_seen` fiável**: em `useAgentOnboarding`, em vez de `if (!user) return`, aguardar/escalonar; e em `onboarding.tsx` marcar também no botão "Continuar" (evento), não só no mount | `useAgentOnboarding.ts`, `onboarding.tsx` | Média |
| **O4** | Corrigir a race de `markedRef` vs mount antecipado (parte do O3) | `onboarding.tsx` | Média |

## 8. Impacto no plano de transformação

- Nenhuma alteração de BD é necessária para este fluxo — as migrações do plano (Fase 1) mantêm-se.
- Adicionar os fixes **O1–O4** como tarefa na Fase 4 do `PLANO_AGENTE_ADS_PREMIUM.md` (dependência: independente do modelo de anúncios; pode ser feito em paralelo).
- As 23 contas com `onboarding_seen: false` no staging podem ser corrigidas com um backfill (marcar `true` ou limpar) — decisão de produto (não bloquear o trabalho de código).

## 9. Ficheiros envolvidos

`app/_layout.tsx`, `app/(auth)/register.tsx`, `app/(tabs)/agent.tsx`, `app/agent/onboarding.tsx`, `src/hooks/useAgentOnboarding.ts`, `app/(tabs)/_layout.tsx` (novo gate). BD: **nenhuma alteração**.
