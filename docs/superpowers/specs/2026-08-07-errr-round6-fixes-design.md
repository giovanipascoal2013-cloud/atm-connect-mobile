# Design — Correções 6ª ronda errr.txt (botões invisíveis, logo/header, dashboard agente)

**Data**: 2026-08-07
**Branch**: `main`
**Estado**: aprovado pelo utilizador antes da implementação

## Contexto

Novos pedidos do utilizador na 6ª leitura de `errr.txt`:

1. Botões não aparecem como deve ser — desbloquear ATM, compra de view, submeter ATM e outros. O espaço é clicável e funciona, mas o botão não é visível.
2. Adicionar o logo na hero da página de login (em vez do ícone genérico) e a barra do topo da página inicial ("ATM Connect") deve ser azul com texto branco.
3. No dashboard do agente, quando já submeteu um ATM, deve aparecer a informação de que o ATM aguarda aprovação e a opção de registar mais ATMs; o onboarding não deve mais aparecer.

Decisões de clarificação:
- Barra azul **só no separador Mapa** (página inicial).
- Dashboard do agente: **mensagem + listar os ATMs pendentes** (nome/morada + selo "Em análise") + botão de registar mais.
- Fix dos botões: **abordagem A — sem sombra nos botões**.

## S1 — Botões primários sólidos (fix global)

Causa-raiz: `AppButton` `primary` aplicava `shadows.raised` (`boxShadow: rgba(16,24,40,0.10)…`). No iOS este sombreado renderiza como overlay translúcido que desbota o azul e torna o texto branco invisível. A 5ª ronda só corrigiu os 3 CTAs do `ATMDetailSheet` com `shadow={false}`; todos os restantes botões `primary` do app (PremiumModal, agente, submit-atm, login, fórum, perfil, etc.) continuavam afectados.

Fix:

- `src/components/ui/AppButton.tsx`: removida a aplicação de `shadows.raised` do estilo `primary` (linha `...(shadow && variant === 'primary' ? shadows.raised : {})`), removido o prop `shadow` (interface + destructuring) e o import `shadows` (fica só `colors`). Todos os botões `primary` passam a azul sólido — mesmo look da 5ª ronda.
- `src/components/map/ATMDetailSheet.tsx`: removidos os 3 `shadow={false}` agora obsoletos; mantidos `size="lg"` + `backgroundColor: colors.brand[600]` (contraste ≈5.1:1).

## S2 — Logo no login + barra azul do mapa

- `app/(auth)/login.tsx`: na hero, o `<AppIcon name="cash-outline" />` é substituído por `<Image source={require('../../assets/icon.png')} />` (logo 1024×1024 do web app, 46×46 `contain`) dentro do círculo branco existente.
- `app/(tabs)/_layout.tsx`: apenas no `Tabs.Screen` do **mapa** → `headerStyle: { backgroundColor: colors.brand[500] }`, `headerTintColor: '#FFFFFF'`, `headerTitleStyle` com cor branca, e o "Entrar" (headerRight) a branco. Os restantes separadores mantêm o header branco.

## S3 — Dashboard do agente com pendentes, sem onboarding

Causa-raiz: `app/(tabs)/agent.tsx` redireccionava para `/agent/onboarding` sempre que `onboarding_seen === false`, mesmo para agentes que já tinham submetido um ATM (pendente).

Fix:

- `src/hooks/useAgent.ts`: novo estado `pendingAtms` (ATMs com `status_approval === 'pending'`), preenchido no `fetchData` e exposto no retorno.
- `app/(tabs)/agent.tsx`:
  - Redirect para onboarding passa a exigir **nenhum ATM submetido**: `!onboarding_seen && pendingCount === 0 && !hasApprovedAtm`, e aguarda também o `loading` do `useAgent` (evita redireccionar antes dos dados de ATMs chegarem).
  - No ramo `!hasApprovedAtm && pendingCount > 0`: mantém a mensagem "ATM em análise", os passos seguintes e o botão "+ Registrar mais um ATM", e **lista os ATMs pendentes** (nome + morada + selo "Em análise" via `Badge` neutral).

## Ficheiros afectados

- `src/components/ui/AppButton.tsx`
- `src/components/map/ATMDetailSheet.tsx`
- `app/(auth)/login.tsx`
- `app/(tabs)/_layout.tsx`
- `src/hooks/useAgent.ts`
- `app/(tabs)/agent.tsx`

## Validação

- `npx tsc --noEmit` (0 erros) e `npx expo lint` (0 problemas).
- Teste visual em iOS (Expo Go): botões primários visíveis em todo o app, logo na hero do login, barra azul do mapa, dashboard do agente com ATMs pendentes.
