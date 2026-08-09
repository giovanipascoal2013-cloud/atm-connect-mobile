# Design — Logo do login + listagem de secções do perfil

**Data:** 2026-08-09
**Estado:** Aprovado

## Problema

1. **Logo do login quadrado dentro de círculo** — em `app/(auth)/login.tsx`, o logo usa a imagem `icon.png` (1024×1024, quadrada) a 46×46 com `resizeMode: contain`, dentro de um balão circular de 68×68. A imagem quadrada não preenche a forma circular.
2. **Listagem de secções do perfil pesada/repetitiva** — `app/(tabs)/profile.tsx` usa 5 cartões separados (`SectionLink`) + um card colapsável ("Como usar o app"), cada um com borda e sombra próprias. Visualmente pesado e "meio feio".

## Decisões (brainstorming)

- **Logo:** Opção **B** — manter `icon.png`, recortar a imagem em círculo para preencher o balão.
- **Perfil:** Lista **agrupada estilo Settings** — um único card com linhas separadas por divisórias finas e chevron.

## Alterações

### 1. Logo do login — `app/(auth)/login.tsx`

- A `<Image>` passa a preencher o balão todo (68×68) com `resizeMode: 'cover'`.
- O balão ganha `overflow: 'hidden'` → a imagem quadrada fica recortada em círculo, preenchendo a forma redonda.

### 2. Perfil — lista agrupada — `app/(tabs)/profile.tsx`

- Substituir os 5 `SectionLink` + `HelpSection` separados por **um único card agrupado** (`AppCard` com `padded={false}`).
- Cada secção é uma **linha**: ícone em círculo azul (`colors.brand[50]`/`brand[500]`) + label + chevron, separadas por divisórias finas (`colors.border`), sem sombra por linha.
- "Como usar o app" passa a ser uma linha que expande os passos inline (conteúdo `USER_STEPS`/`AGENT_STEPS` mantido).
- "Terminar sessão" mantém-se no fim da lista.

## Fora de âmbito

- Lógica de negócio inalterada (premium, views, navegação).
- Estrutura dos cards de estado/info no topo do perfil inalterada.
- `register.tsx` / `reset-password.tsx` não usam a imagem do logo — sem alterações.

## Verificação

- `npx tsc --noEmit`
- `npx expo lint`
