# Design — Correções 5ª ronda errr.txt (info básica na listagem, botão desbloquear visível)

**Data**: 2026-08-07
**Branch**: `main`
**Estado**: aprovado pelo utilizador antes da implementação

## Contexto

Novos pedidos do utilizador na 5ª leitura de `errr.txt`:

1. Na listagem de ATMs não aparece o nome do ATM nem as informações básicas (morada, cidade) quando o ATM está bloqueado. Apenas a informação de dinheiro/estado deve ficar oculta até desbloquear.
2. No card que abre ao clicar num ATM, o botão de desbloquear está lá mas não está visível (confunde-se com o fundo).

Decisões de clarificação:
- Botão "sem contraste" (não cortado); testado em **iOS (Expo Go)**.
- Em vez de acrescentar campos novos ao card, o utilizador pediu: **no card do ATM bloqueado mostrar também o endereço**.

## S1 — Listagem de ATMs: nome + info básica sempre visíveis

`src/components/map/ATMList.tsx`:

- Título passa a ser sempre `item.bank_name` (removido `locked ? 'ATM bloqueado'`).
- Morada `item.address` sempre visível (removida condição `!locked &&`).
- Linha `cidade, provincia` sempre visível (removida condição `!locked &&`).
- O rodapé mantém "Bloqueado" 🔒 com ponto cinza quando bloqueado — apenas dinheiro/estado ficam ocultos.

## S2 — Sheet do ATM bloqueado: botão visível + info básica

### S2.1 — Botão "invisível"

Causa-raiz: `AppButton` `primary` aplica `shadows.raised` (`boxShadow: rgba(16,24,40,0.10)…`). No iOS este sombreado renderiza como overlay translúcido que desbota o azul `brand[500]`, fazendo o botão confundir-se com o fundo branco.

Fix:

- `src/components/ui/AppButton.tsx`: novo prop opcional `shadow` (default `true`). Quando `false`, omite `shadows.raised` — o botão fica sólido.
- `src/components/map/ATMDetailSheet.tsx`: os CTAs do estado bloqueado ("Entrar para ver detalhes", "Ver Detalhes", "Desbloquear (n restantes)") passam a `size="lg"`, `shadow={false}` e `style={{ backgroundColor: colors.brand[600] }}` — azul sólido `#1163C0`, contraste ≈ 5.1:1 sobre fundo branco.

### S2.2 — Layout do estado bloqueado

- `maxHeight` do sheet bloqueado `30%` → `42%` e o conteúdo passa a estar dentro de um `ScrollView` (evita clipping do CTA).
- Cabeçalho bloqueado: acrescentada linha `cidade, provincia` junto à morada (consistência com a listagem).
- O ponto colorido junto ao nome passava a cor real do status (`getATMColor`) — **leak** de informação antes do desbloqueio. Agora é cinza fixo `#6B7280`. Removido o uso de `getATMColor` no ficheiro.

## Ficheiros afectados

- `src/components/ui/AppButton.tsx`
- `src/components/map/ATMList.tsx`
- `src/components/map/ATMDetailSheet.tsx`

## Validação

- `npx tsc --noEmit` (0 erros) e `npx expo lint` (0 problemas).
- Teste visual em iOS (Expo Go): listagem mostra nome/morada/cidade em ATMs bloqueados; botão de desbloquear visível (azul sólido) no sheet bloqueado.
