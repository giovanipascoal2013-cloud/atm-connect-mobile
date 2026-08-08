# Design — Onboarding de agente pós-registo (welcome → submit ATM)

**Data**: 2026-08-08
**Referência**: `docs/superpowers/specs/2026-08-08-relatorio-investigacao-onboarding-agente.md`
**Objectivo**: garantir que, ao criar uma conta de agente, o utilizador é reencaminhado de forma determinística para um novo ecrã de boas-vindas curto e, ao pressionar "Continuar", é levado para o fluxo de submissão de ATM (`/agent/submit-atm`).

---

## 1. Decisões de produto (validadas pelo utilizador)

- **Novo ecrã de boas-vindas** aparece **logo após a criação da conta de agente** — focado em dar continuidade para o `submit-atm`.
- O **onboarding do dashboard** (`app/agent/onboarding.tsx`, 4 secções "como ganhar/registar/levantar") **mantém-se** e fica acessível pelo dashboard ("Rever como ganhar dinheiro").
- **Sem gate pós-login** (O2 removido): o welcome só aparece imediatamente após o registo; logins posteriores não têm redireccionamento automático.
- **Gate da tab Agente mantido** (`app/(tabs)/agent.tsx:55`): continua a redireccionar agentes com `onboarding_seen=false` e sem ATMs (cobre os 23 agentes antigos). Já suprime o redirect quando `pendingCount > 0` ou `hasApprovedAtm`.
- **Continuidade pelo dashboard**: um agente que criou a conta mas não terminou o ATM pode submeter depois pelo dashboard; com ATM `pending` o dashboard mostra "ATM em análise" e **não volta a mostrar onboarding**.
- **Backfill das 23 contas** com `onboarding_seen=false`: decisão de produto posterior, **não bloqueia**.

## 2. Arquitectura

```
Cria conta (agente) → signUp devolve sessão (autoconfirm)
  → register.tsx seta pendingAgentRedirect=true
  → router.replace('/agent/welcome')
  → welcome.tsx (marca onboarding_seen=true no mount e no onPress)
  → "Continuar para registar um ATM" → router.replace('/agent/submit-atm')
```

### Fix O1 — eliminar a race do pós-registo

- Novo módulo `src/lib/navigation-flag.ts` com flag de módulo `pendingAgentRedirect` + getters/setters.
- `register.tsx`: `setPendingAgentRedirect(true)` **antes** do `router.replace('/agent/welcome')`.
- `app/_layout.tsx` (root): o redirect para `/(tabs)/map` só dispara se `user && inAuthGroup && !getPendingAgentRedirect()`. Quando o segmento deixa de ser `(auth)`, a flag é limpa automaticamente (auto-reset para não afectar logins futuros).

### Novo ecrã `app/agent/welcome.tsx`

- Rota no stack do agente (`app/agent/_layout.tsx`), `headerShown: false`.
- Hero com gradiente da marca + título "Vamos registar o teu primeiro ATM".
- 3 passos curtos: 📷 Foto → 📍 GPS preenche a morada → 📋 Detalhes e submeter.
- Botão único **"Continuar para registar um ATM"** → `router.replace('/agent/submit-atm')`.
- Botão secundário "Explorar o app primeiro" → `router.replace('/(tabs)/map')`.
- Marca `onboarding_seen: true` no mount **e** no `onPress` (redundância segura).

### Fix O3/O4 — marcação fiável de `onboarding_seen`

- `useAgentOnboarding.update` (`src/hooks/useAgentOnboarding.ts`): em vez de `if (!user) return`, obtém o `user` via `supabase.auth.getUser()` quando o estado do hook ainda não está preenchido (janela logo após signUp).
- `onboarding.tsx` (antigo): marca também no botão "Continuar" (além do mount).

## 3. Ficheiros envolvidos

| Ficheiro | Alteração |
|---|---|
| `src/lib/navigation-flag.ts` | **Novo** — flag de módulo `pendingAgentRedirect` |
| `app/agent/welcome.tsx` | **Novo** — ecrã de boas-vindas pós-registo |
| `app/agent/_layout.tsx` | Regista rota `welcome` |
| `app/(auth)/register.tsx` | Seta flag + destino `/agent/welcome` |
| `app/_layout.tsx` | Respeita a flag no redirect para o mapa + auto-reset |
| `src/hooks/useAgentOnboarding.ts` | `update` resolve user via `getUser()` se necessário |
| `app/agent/onboarding.tsx` | Marca `onboarding_seen` também no "Continuar" |

BD: **nenhuma alteração**.

## 4. Testes

- `npx tsc --noEmit` (0 erros) ✅
- `npx expo lint` (0 problemas) ✅
- Manual (Expo Go): registar agente → welcome → Continuar → submit-atm; re-entrada pós-login → mapa (sem redirect); agente com ATM pendente → dashboard "ATM em análise".
