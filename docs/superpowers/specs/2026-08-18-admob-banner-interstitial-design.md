# Spec — AdMob Banners + Interstitial (2026-08-18)

## Objectivo
Além do rewarded ad (desbloquear ATM), adicionar **banners adaptáveis** (receita passiva) e **interstitial** (frequência controlada). Ocultos para utilizadores premium.

## Decisões
- **Banners:** `BannerAd` com `LARGE_ANCHORED_ADAPTIVE_BANNER`, `requestNonPersonalizedAdsOnly: true` (coerente com o rewarded).
  - Colocação: fundo do **mapa/lista**, rodapé do **sheet de detalhes**, fundo de **favoritos** e **fórum**.
  - O sheet cobre o banner do mapa quando aberto (o sheet tem o seu próprio banner — sem sobreposição/duplicação).
- **Interstitial:** pré-load no mount; gatilho = **cada 4.ª abertura de detalhe** (`INTERSTITIAL_EVERY = 4`), **máx 1/sessão** (flag module-level), nunca para premium; reload 1s após CLOSED; degrada silencioso se sem fill/erro.

## Ficheiros
| Ficheiro | Acção |
|---|---|
| `src/lib/ads.ts` (novo) | Unit IDs por formato+plataforma: env estático (`EXPO_PUBLIC_ADMOB_*`) com fallback a test IDs oficiais Google |
| `src/components/ads/AdBanner.tsx` (novo) | Wrapper `BannerAd`; `null` em web/sem unit; esconde-se se `isPremium` |
| `src/hooks/useAdInterstitial.ts` (novo) | Pré-load, `show()` guardado, cap 1/sessão, reload pós-CLOSED/ERROR |
| `app/(tabs)/map.tsx` | `AdBanner` no fundo + contador `detailOpensRef` → interstitial no 4.º detalhe |
| `src/components/map/ATMDetailSheet.tsx` | `AdBanner` no rodapé (estados bloqueado/desbloqueado) |
| `app/favorites/index.tsx` | `AdBanner` por baixo da `ATMList` |
| `app/(tabs)/forum.tsx` | `AdBanner` no fundo |
| `.env` / `.env.example` | `EXPO_PUBLIC_ADMOB_BANNER_ANDROID/IOS`, `EXPO_PUBLIC_ADMOB_INTERSTITIAL_ANDROID/IOS` (test IDs) |

## Test IDs (oficiais Google)
| Formato | Android | iOS |
|---|---|---|
| Banner | `ca-app-pub-3940256099942544/6300978111` | `ca-app-pub-3940256099942544/2934735716` |
| Interstitial | `ca-app-pub-3940256099942544/1033173712` | `ca-app-pub-3940256099942544/4411468910` |

> App IDs (teste) já configurados em `app.json` — banners/interstitials usam o mesmo App ID.

## Não alterado
- Fluxo rewarded (desbloquear ATM).
- BD (sem migrações/RPCs).
- Lógica premium (`useAuth().isPremium`).

## Verificação
- `npx tsc --noEmit` OK; `npx expo lint` OK.
- Manual (dev client, **sem rebuild** — nativo já compilado, só recarregar):
  1. Mapa/lista: banner visível no fundo (free), oculto (premium).
  2. Detalhe: banner no rodapé do sheet.
  3. Favoritos e fórum: banner no fundo.
  4. Abrir detalhes 4× → interstitial aparece (1/sessão); se fechar app e reabrir, volta a contar.

## Pendente (produção)
- Substituir App IDs + Unit IDs de teste pelos reais da conta AdMob.
- Considerar UMP/consentimento (GDPR) se o público-alvo o exigir.
