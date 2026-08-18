# Próximos Passos — ATM Connect Mobile

> Ficheiro de handoff. Ler `LOG.md` para o histórico completo.
> Secção atual: **AdMob completo (rewarded + banners + interstitial)** — ver spec `docs/superpowers/specs/2026-08-18-admob-banner-interstitial-design.md`.

## Estado actual (2026-08-18)

Monetização AdMob **implementada, commitada e testada** no dev client. Working tree limpo; `main` sincronizada com `origin/main`.

**Feito e verificado:**
- ✅ **Rewarded ads** (desbloquear ATM por 24h) — `src/hooks/useAdMob.ts`, ecrãs migrados de `useViews`.
- ✅ **Comissão do agente** por ad view — trigger `trg_ad_commission` com `reference_type='earning'` (fix `20260818000001`, BD staging aplicada) — antes rebentava o CHECK constraint.
- ✅ **Banners adaptáveis** (mapa/lista, sheet de detalhes, favoritos, fórum) + **interstitial** (cada 4.º detalhe, máx 1/sessão) — `src/components/ads/AdBanner.tsx`, `src/hooks/useAdInterstitial.ts`, `src/lib/ads.ts`.
- ✅ Ocultos para premium (`useAuth().isPremium`).
- ✅ `npx tsc --noEmit` → 0 erros; `npx expo lint` → 0 problemas.
- ✅ **Sem pendências de BD** (ver "Relatório do Estado da BD" no `LOG.md`).

## Passos por fazer (utilizador, no terminal)

1. **Testar em device (dev client):**
   - Banner no mapa, sheet de detalhes, favoritos e fórum (visível para free, oculto para premium).
   - Interstitial ao abrir o 4.º detalhe (1/sessão; reseta ao reiniciar app).
   - Fluxo rewarded completo: ver anúncio → desbloquear → agente recebe comissão (`select * from agent_earnings where source='ad_view'`).
   - `npx expo start --dev-client`
2. **IDs AdMob reais (BLOQUEADO — aguardar pagamento):** pagar os **25 USD** da inscrição **Google Play Developer** → criar conta **AdMob** → criar App + ad units **rewarded / banner / interstitial** → substituir:
   - `app.json` → `plugins.react-native-google-mobile-ads` `androidAppId`/`iosAppId` (testes)
   - `.env` → `EXPO_PUBLIC_ADMOB_REWARDED_*`, `EXPO_PUBLIC_ADMOB_BANNER_*`, `EXPO_PUBLIC_ADMOB_INTERSTITIAL_*`
3. **Consentimento (UMP/GDPR):** avaliar se o público inclui EEE/Reino Unido → integrar `react-native-google-mobile-ads` consent flow.
4. **SSV anti-fraude (decisão pendente):** o RPC `create_ad_unlock` não prova que o anúncio foi visto — um cliente malicioso pode chamá-lo e gerar comissões sem ads. Fix real = **AdMob Server-Side Verification**. **Aceite como risco até monetizar a sério.**
5. **Build de produção:** `eas build --platform android --profile production` (quando houver IDs reais) e submeter ao Play.

## Riscos / notas conhecidas

- **Vector de fraude (aceite no design):** RPC `create_ad_unlock` é executável por qualquer `authenticated` sem prova de ad view. Ver §4 acima (SSV).
- **Test IDs no código:** todos os IDs actuais são `ca-app-pub-3940256099942544/*` (testes) — NUNCA publicar sem trocar.
- **`.env` está no `.gitignore`** (não é versionado; só `.env.example`).
- **Ficheiros SQL na raiz** (convenção do repo, não `supabase/migrations/`) — aplicar manualmente no SQL editor do staging.
- **Kotlin metadata (AdMob):** `react-native-google-mobile-ads` está **pinado** em `16.3.4` (não usar `^`) — 16.4.0 arrasta `play-services-ads 25.4.0` com Kotlin 2.3.0 incompatível com o Expo SDK 54 (Kotlin 2.1.20).

## Refs rápidas

- Verificar: `npx tsc --noEmit` (0 erros) + `npx expo lint` (0 problemas).
- Git identity já configurada localmente (`Gio Pilav <giovanipascoal2013@gmail.com>`).
- Projectos: **Produção** `dinmao` (`twfkzfpcxuzbydzuykwi`) / **Staging** (`ndvjitfovhfngrzwtytd`) — o app desenvolve contra staging.
- Backend web app: `C:\Users\Gio Pilav\Downloads\atm-connect-angola` (constraints/schema de `balance_transactions` etc.).
