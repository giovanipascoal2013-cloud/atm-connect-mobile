# Design — Reframing do card de ATM (copywriting + cor)

**Data:** 2026-08-08
**Estado:** Aprovado (Approach A)

## Problema

Na listagem de ATMs, os cards ainda não desbloqueados mostravam ícone de cadeado + texto "Bloqueado" a cinza (`#6B7280`). Isto provoca duas reacções negativas:

1. **Sensação de bloqueio** — o utilizador sente-se restringido durante o uso do app (framing de perda).
2. **App "morta"** — o cinza é a cor de inactividade em UX; demasiado cinza torna o app sem vida.

## Objectivo

- Reduzir a frustração percebida no card bloqueado.
- Tornar o app mais vivo.
- Manter intacta a lógica de negócio (3 views/dia para utilizadores free, premium vê tudo).

## Decisões (brainstorming)

- **Objectivo:** menos frustração + mais conversão Premium.
- **Card bloqueado:** teaser parcial (mostra essencial, esconde valor).
- **Texto do card:** "Ver detalhes" puro (acção convidativa, sem cadeado).
- **Abordagem escolhida:** A — Convite mínimo (mudança cirúrgica).

## Alterações — `src/components/map/ATMList.tsx`

1. **Linha de estado do card bloqueado** (antes `lock-closed` + "Bloqueado" cinza):
   - Ícone: `eye-outline`
   - Texto: "Ver detalhes"
   - Cor: azul brand `colors.brand[500]`

2. **Dot de estado** no caso bloqueado:
   - Cor: `#6B7280` (cinza) → `colors.brand[500]`

3. **Endereço** (`item.address`):
   - Cor: `colors.text.secondary` → `colors.money` (`#10B981`)
   - Aplicado a **todos** os cards (vida no app)

## Fora de âmbito

- Estado real (Com/Sem Dinheiro) permanece no sheet desbloqueado.
- Distância, tempo, cidade/província e CTA do sheet não mudam.
- Lógica de views/desbloqueio inalterada.

## Verificação

- `npx tsc --noEmit`
