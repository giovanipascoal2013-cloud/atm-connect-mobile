# Design — Correções 4ª ronda errr.txt (WhatsApp, ordenação, contraste)

**Data**: 2026-08-07
**Branch**: `main`
**Estado**: aprovado pelo utilizador antes da implementação

## Contexto

Novos pedidos do utilizador na 4ª leitura de `errr.txt`:

1. Adicionar botão de apoio ao cliente que encaminha para o WhatsApp da empresa.
2. A listagem de ATMs por proximidade deixa de funcionar após login — os ATMs aparecem em ordem alfabética mesmo com o toggle em "Proximidade".
3. Alguns elementos de UI confundem-se com o ambiente de fundo (contraste baixo).

## S1 — Botão "Apoio ao Cliente" (WhatsApp) no Perfil

Decisão do utilizador: botão **só no Perfil**.

- Novo `src/lib/support.ts`: constantes `SUPPORT_WHATSAPP_NUMBER` (`+244933986318`) e `SUPPORT_DEFAULT_MESSAGE`, e função `supportWhatsAppUrl(prefill?)` reutilizando `waLink()` de `src/lib/phone.ts`.
- `app/(tabs)/profile.tsx`: novo `SectionLink` "Apoio ao Cliente" (ícone `logo-whatsapp`) entre "Referências" e a secção de ajuda, abrindo o URL via `Linking.openURL`.
- Refactor de reutilização: `login.tsx`, `reset-password.tsx` e `PremiumModal.tsx` passam a usar a constante/função partilhada, removendo o número de WhatsApp duplicado.

## S2 — Fix da ordenação por proximidade

Causa-raiz:

- Em `src/hooks/useATMs.ts`, a distância só era calculada no momento do fetch (e só se `userLocation` existisse) e a ordenação por proximidade só corria quando `userLocation` existia. Sem localização (ex.: após login, quando o navigator `(tabs)` é desmontado e o mapa remonta), a lista mantinha a ordem do servidor `.order('bank_name')` = alfabética.
- Bug secundário: `(a.distance || 0)` tratava `undefined` como `0`, mantendo a ordem alfabética mesmo com distâncias ausentes.

Fix:

- `src/hooks/useLocation.ts`: cache de última localização em módulo (`cachedLocation`) + `getCachedLocation()`; o estado inicial do hook usa o cache e cada fix preenche o cache. Remounts pós-login restauram a localização instantaneamente.
- `src/hooks/useATMs.ts`:
  - Removido `.order('bank_name')` da query.
  - Distância calculada reactivamente num `useMemo` sobre `[atms, userLocation]` (`withDistance`).
  - `proximity` ordena sempre por `distance ?? Number.MAX_SAFE_INTEGER` (sem depender de `userLocation` na condição do sort).

## S3 — Revisão de contraste

Decisão do utilizador: revisão ampla geral.

- `src/theme/tokens.ts`: `text.tertiary` `#9CA3AF` → `#6B7280` (afeta +100 usos; texto/metadados legíveis ~4.6:1).
- `MapboxWebView.tsx`: marcadores não-agrupados ganham `circle-stroke-width: 2` + `circle-stroke-color: #ffffff` — separa-os do fundo escuro (`dark-v11`).
- `EmptyState.tsx`: ícone `brand[400]` → `brand[600]`; círculo ganha borda `brand[100]`.
- `Badge.tsx`: `neutral` → bg `#E9ECEF`/fg `#4B5563`; `brand`/`success` fg escurecidos para `brand[700]`/`accent[700]`.
- `SegmentedControl.tsx`: track `#F1F3F5` → `#E9ECEF` + borda `#E5E7EB`.
- `map.tsx`: pills flutuantes sólidas `#FFFFFF` (erro `#FEE2E2`) com borda `colors.border`.
- `ReferralCard.tsx`: botão "Copiar" bg `#E9ECEF` + borda `#E5E7EB`.
- `AppButton.tsx`: variante `secondary` fg `brand[600]` → `brand[700]`.
- `(tabs)/_layout.tsx`: tint inativo `#9CA3AF` → `#6B7280`.
- `profile.tsx`: círculo de ícone dos `SectionLink` ganha borda `brand[100]`.
- `ATMList.tsx`: dot de bloqueado `#9CA3AF` → `#6B7280`.

## Ficheiros afectados

- `src/lib/support.ts` (novo)
- `src/hooks/useLocation.ts`, `src/hooks/useATMs.ts`
- `app/(tabs)/profile.tsx`, `app/(tabs)/map.tsx`, `app/(tabs)/_layout.tsx`
- `app/(auth)/login.tsx`, `app/(auth)/reset-password.tsx`
- `src/components/premium/PremiumModal.tsx`, `src/components/ui/EmptyState.tsx`, `src/components/ui/Badge.tsx`, `src/components/ui/SegmentedControl.tsx`, `src/components/ui/AppButton.tsx`
- `src/components/map/MapboxWebView.tsx`, `src/components/map/ATMList.tsx`
- `src/components/agent/ReferralCard.tsx`
- `src/theme/tokens.ts`

## Validação

- `npx tsc --noEmit` (0 erros) e `npx expo lint` (0 problemas).
- Teste visual em Expo Go / web: ordenação por proximidade após login, botão WhatsApp no Perfil, contraste de marcadores/pills/badges.
