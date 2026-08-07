# Design — Remoção da integração AdMob (adiar anúncios) (2026-08-07)

## Problema

A integração AdMob (commit `de0e2c7`) causou problemas de build/bundling (módulo nativo
`react-native-google-mobile-ads` quebra o web bundling e exige rebuild do dev client).
Decisão do utilizador: **adiar a integração dos anúncios** e remover por completo a
configuração AdMob do projecto, deixando o app como estava antes.

## Objectivo

O app fica **exactamente como no commit `4319769`** (estado pré-AdMob), com uma única
excepção mantida: o `package-lock.json` **continua sincronizado e commitado** (melhoria
legítima do commit `1bb5670`, não é revertido). Nenhuma outra funcionalidade é tocada.

## Abordagem

Reversão via git reverse patches + ajustes manuais:

1. `git revert --no-commit de0e2c7 437cfd9` — aplica a inversão exacta do AdMob sem commitar:
   - Apaga os 4 ficheiros novos: `src/lib/ads.ts`, `src/hooks/useInterstitial.ts`,
     `src/components/ads/AdBanner.tsx`, `src/components/ads/NativeAdCard.tsx`
   - Reverto `app.json` (remove plugin `react-native-google-mobile-ads` + App IDs),
     `app/(tabs)/map.tsx` (banner, 2 interstitials), `app/_layout.tsx` (init),
     `src/components/map/ATMList.tsx` (native ad), `.env.example` (volta aos placeholders
     `ca-app-pub-xxx/xxx`), `LOG.md` (remove a secção AdMob), `package.json` (remove a dep).
2. `.env` (ignorado pelo git) — remover manualmente as 6 linhas `EXPO_PUBLIC_ADMOB_*`.
3. Regenerar lock — `npm install --package-lock-only --package-lock=true --no-audit --no-fund`
   (remove o módulo do lock, mantém as restantes deps sincronizadas).
4. Verificar — `git status` deve mostrar só o esperado; `git diff 4319769 -- <ficheiros>`
   limpo (state pré-AdMob).
5. `LOG.md` — nota curta no topo: "Anúncios AdMob adiados (integração removida 2026-08-07)".
6. Commit único — `revert: adiar integração AdMob`.

## Resultado final

- `package.json` e `package-lock.json` sem `react-native-google-mobile-ads`, restantes deps intactas.
- `app.json` sem plugin AdMob.
- `.env` / `.env.example` sem chaves AdMob efectivas (`.env.example` com placeholders).
- Código app sem qualquer referência a anúncios.

## Verificação (utilizador executa)

- `npx tsc --noEmit` e `npx expo lint` — sem erros (o LSP deixa de reportar
  "Cannot find module 'react-native-google-mobile-ads'").
- `npx expo start --dev-client` — app abre normalmente; o dev client actual serve, **sem rebuild**.
- `npx expo start --web` — volta a funcionar sem o erro de web bundling.

## Fora de âmbito

- Não reverter `1bb5670` (sincronização do lock mantém-se).
- `react-native-google-mobile-ads` pode permanecer em `node_modules` local (inofensivo;
  não é importado). Correr `npm install` depois remove-o, se desejado.
- Nenhuma outra funcionalidade é alterada.
