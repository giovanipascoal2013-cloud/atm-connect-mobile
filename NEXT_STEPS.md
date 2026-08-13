# Próximos Passos — ATM Connect Mobile

> Ficheiro de handoff criado em 2026-08-11 para continuar o trabalho da spec
> `docs/superpowers/specs/2026-08-11-notifications-favorites-agentcards-design.md`.
> Ler `LOG.md` para o histórico completo.

## Estado

As **6 fases da spec estão implementadas e commitadas** em `main` (6 commits à frente de `origin/main`, working tree limpo):

`fc70923` → `ad88850` (dashboard) → `a261e14` (favoritos) → `071808b` (in-app) → `f9c8e91` (push) → `5546247` (migração SQL Fase 6).

## Passos por fazer (utilizador, no terminal)

1. **Aplicar as 3 migrações SQL no Supabase staging** (`ndvjitfovhfngrzwtytd` — SQL editor, role postgres), por ordem:
   - `20260811000001_fix_consume_atm_view_is_active.sql` (bug re-view após 24h)
   - `20260811000002_subscriptions_quarterly_policy_insert.sql` (subs quarterlha + policy)
   - `20260811000003_notifications_favorites_push.sql` (push_tokens, atm_favorites, RLS notifications, triggers, realtime)
2. **Instalar deps de push** (ver regra: o agente não instala deps sozinho):
   ```bash
   npx expo install expo-notifications expo-device
   ```
3. **Rebuild do dev client** e testar push real:
   ```bash
   eas build --platform android --profile development
   ```
   > Expo Go **não** suporta push remoto. In-app + favoritos funcionam em Expo Go.
4. **Testes manuais sugeridos:**
   - Favoritos: heart no sheet/lista + estrela no header → ecrã `/favorites` → tocar abre o ATM no mapa.
   - Notificações in-app: ver alterar um ATM/adicionar avaliação no web → sino com badge → ecrã `/notifications` → deep-link para o ecrã certo.
   - Push: tocar na notificação em cold start e em background → deep-link correto.

## Passos por fazer (agente IA, quando retomado)

- [ ] Depois de o utilizador aplicar as migrações: **atualizar o "Relatório do Estado da BD"** no `LOG.md` (regra AGENTS.md) — `push_tokens`, `atm_favorites`, RLS `notifications`, triggers, realtime.
- [ ] Verificar `git push` quando o utilizador autorizar.
- [ ] Se o SQL 20260811000003 falhar no staging: depurar (nomes de colunas, publicação realtime já contém as tabelas, etc.).

## Refs rápidas

- Git identity não configurada → usar nos commits:
  ```
  git -c user.name="Gio Pilav" -c user.email="giovanipascoal2013@gmail.com" commit ...
  ```
- Verificar: `npx tsc --noEmit` (0 erros) + `npx expo lint` (0 problemas).
- Versões SDK 54: `expo-notifications ~0.32.17`, `expo-device ~8.0.10`.
- Projectos: **Produção** `dinmao` (`twfkzfpcxuzbydzuykwi`) / **Staging** (`ndvjitfovhfngrzwtytd`) — o app desenvolve contra staging.