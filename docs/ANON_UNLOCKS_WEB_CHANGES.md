# Alterações no Repo Web — Desbloqueio Anónimo por Anúncio

> **Mobile:** `C:\Users\juary\Downloads\atm-connect-mobile`, branch `feat/anon-ad-unlocks` — **código pronto e commitado**, migração `20261003000001_anon_ad_unlocks.sql` **aplicada no staging** em 2026-10-03.
> **Web:** `C:\Users\juary\Downloads\atm-connect-angola` (Vite + React + Tailwind + TS).
> **Data:** 2026-10-03 — este documento substitui a referência obsoleta que ficou na spec `2026-10-03-anon-atm-viewing-design.md` §10 (ver §2).
> **Objectivo:** listar, com evidência no código, o que a view anónima **obriga** a mudar no repo web — e o que **não** precisa de mudar.

---

## 1. O que mudou no mobile (para o web fazer sentido)

Antes, desbloquear um ATM exigia **login**: `ad_unlocks.user_id` é `NOT NULL` com FK a `profiles`, e a RPC `create_ad_unlock` só tem `EXECUTE` a `authenticated` (401 confirmado por probe ao staging).

Agora o visitante **sem login** vê o mapa, abre um ATM e desbloqueia **vendo um anúncio**:

| Objecto (novo) | Detalhe |
|---|---|
| Tabela `anon_ad_unlocks` | `device_id uuid`, `atm_id uuid` → FK `atms(id)`, `expires_at`, `created_at`; **PK composta `(device_id, atm_id)`**. RLS ligado **sem nenhuma policy** (o estado vive no dispositivo, em `expo-secure-store`; o servidor nunca o lê). Sem realtime. |
| RPC `create_ad_unlock_anon(p_device_id uuid, p_atm_id uuid) → timestamptz` | `EXECUTE` **só ao role `anon`** (uma sessão autenticada não cria linhas anónimas). Devolve o `expires_at` efectivo e faz auto-poda das linhas expiradas do próprio dispositivo. |
| `credit_ad_commission(agent, atm, viewer, source)` | função partilhada por `trg_ad_commission` (registado) e `trg_anon_ad_commission` (anónimo); aceita `source='ad_view' | 'ad_view_anon'`. |
| `agent_earnings` | passa a receber `user_id = NULL` e `source = 'ad_view_anon'` (colunas já existiam desde `20260813000001_ad_unlocks.sql`; a FK a `profiles` é que passa a poder ser nula **no conteúdo**, não no schema). |
| `balance_transactions` | `reference_type='earning'` (o único válido no CHECK), como no caminho registado. |

`ad_unlocks` fica **intocada** — o caminho do utilizador registado não muda em nada.

---

## 2. A nota obsoleta (e onde ela estava)

A spec `docs/superpowers/specs/2026-10-03-anon-atm-viewing-design.md` §10 item 2 pedia *"Dashboard de admin do flyer (`atm-connect-angola`) … Nota detalhada com as queries a escrever em `docs/` para o repo web"*. **Isso já está feito:**

- A nota detalhada é **`docs/FLYER_BONUS_WEB_CHANGES.md`** (neste repo, 2026-09-22) — foi ela que orientou a implementação.
- Implementada no repo web no commit **`8409715 feat(web): painel de revisão/admin do bónus do flyer (700 Kz)`** — hoje é o **HEAD** do `atm-connect-angola`: `src/pages/dashboard/FlyerSubmissions.tsx`, `src/components/FlyerSubmissionDetailModal.tsx`, rota em `src/App.tsx`, entradas em `src/components/DashboardLayout.tsx`.
- Evidência funcional: `atm-connect-angola\docs\VERIFICAR_FLYER_BONUS_STAGING.md` (checklist 10/10 + teste `BEGIN…ROLLBACK` aprovar/rejeitar), resumida no `LOG.md:71-72` deste repo.

A spec foi escrita em 2026-10-03 sem reconciliar com o commit `8409715` — daí a referência morta. **Nada do dashboard do flyer está pendente.**

---

## 3. Impacto no repo web — verificado no código

**Nada quebra.** Não há nenhuma query no repo web que descarte linhas de `agent_earnings` por `user_id IS NULL`.

| Ficheiro | Query | Efeito com linhas anónimas |
|---|---|---|
| `src/pages/FinanceDashboard.tsx:41` | `agent_earnings.select('*')` + `calcKpi(..., 'amount_kz')` | ✅ as comissões anónimas **entram** nos KPIs de receita. O mapa `profilesMap` só é aplicado às compras (`purchases`), não às comissões → sem `undefined` novo. |
| `src/pages/AgentDashboard.tsx:76` | `agent_earnings.select('amount_kz').eq('agent_id', user.id)` | ✅ soma por `agent_id` → o **saldo do agente inclui** as comissões anónimas (coerente com o que o app mostra). |
| `src/pages/dashboard/FlyerSubmissions.tsx:110` | `count(agent_earnings)` vs `flyer_views_unlock` | ✅ as views anónimas **contam** para as 30 — igual ao `flyer_bonus_check` no servidor. |
| `src/hooks/useUnlockState.ts:21,55` | `ad_unlocks` filtrado por `user_id` + realtime | ⚠️ o **funil web só conhece unlocks de registados** — ver §4.2. |
| joins `inner` em `agent_earnings` | — | ✅ **não existe nenhum** no repo web. |
| RLS de `agent_earnings` | policies existentes | ✅ a inserção é feita pelo trigger `SECURITY DEFINER`; as policies de leitura (admin/supervisor) não são affected. |

---

## 4. O que falta mesmo (decisões + 2 linhas de código)

### 4.1 Tipos do Supabase desactualizados — `src/integrations/supabase/types.ts`

O dump gerado está **muito atrás** da BD:

- `agent_earnings.Row` = `{ agent_id, amount_kz, atm_id, created_at, id, view_id }` — **não tem `user_id` nem `source`** (colunas adicionadas em `20260813000001_ad_unlocks.sql`). O TypeScript diz `user_id: string` numa coluna que agora pode ser `null`: qualquer código novo que leia `user_id` compila errado.
- Não existe `anon_ad_unlocks` nem `create_ad_unlock_anon`.

**O que fazer:**

```ts
// agent_earnings
Row: { agent_id: string; amount_kz: number; atm_id: string; created_at: string;
       id: string; view_id: string | null; user_id: string | null; source: string | null }

// anon_ad_unlocks
anon_ad_unlocks: {
  Row: { device_id: string; atm_id: string; expires_at: string; created_at: string };
  Insert: { device_id: string; atm_id: string; expires_at: string; created_at?: string };
  Update: { device_id: string; atm_id: string; expires_at: string; created_at?: string };
  Relationships: [{ foreignKeyName: "anon_ad_unlocks_atm_id_fkey"; columns: ["atm_id"];
    isOneToOne: false; referencedRelation: "atms"; referencedColumns: ["id"] }];
}

// Functions
create_ad_unlock_anon: { Args: { p_device_id: string; p_atm_id: string }; Returns: string };
```

> ⚠️ **Cuidado ao regenerar:** o `db:link` do repo web aponta para **PRODUÇÃO** (`dinmao`), onde `anon_ad_unlocks` **ainda não existe** (ver §6). Um `supabase gen types` a partir do link de produção **apaga** o que estiver à mão. Ou regenera contra o **staging** (`--db-url`), ou edita à mão como acima.

### 4.2 O funil web não vê unlocks anónimos — `src/hooks/useUnlockState.ts`

`adUnlockedIds` alimenta `src/pages/Index.tsx:306-311` (`unlockedIds` → ATM bloqueado/desbloqueado na home). Como só lê `ad_unlocks`, **um visitante anónimo vê o site sem unlocks** — o que é correcto (o web não tem anúncio), mas significa que o número de unlocks do funil **subestima** o real.

Três opções, com recomendação:

| Opção | O que implica | Avaliação |
|---|---|---|
| **A. Aceitar** (recomendado agora) | nada a mudar; documentar que o funil web mede só registados | ✅ zero risco, honesto. O funil web→app **depende** do login para medir conversión. |
| B. Contar anónimos num dashboard | RPC nova `count_ad_unlocks_total()` a somar as duas tabelas | só quando houver monetização real |
| C. Desbloquear também no web | `device_id` no browser + `create_ad_unlock_anon` + rewarded ad no web | **não recomendado** — `localStorage` forjável ainda mais easily que o `device_id` nativo, sem `expo-secure-store` a proteger |

### 4.3 Bug latente para quem escrever joins no futuro

`agent_earnings.user_id` pode ser `null`. **Nunca** fazer `select('*, profile:user_id!inner(nome)')` — as linhas anónimas desaparecem silenciosamente das listagens (KPIs por `sum` não sofrem, listagens sim). Para mostrar "quem viu", usar `agent_id` (sempre preenchido) ou um `left join`.

---

## 5. SSV do AdMob — o follow-up **obrigatório** antes dos IDs reais

É o único item desta lista que é **bloqueante para a monetização**. Riscos que resolve: **B14** (RPC chamável sem prova de ad) e **B15** (`device_id` forjável — aceito, gravidade 0 com IDs de teste).

**Onde vive:** `atm-connect-angola\supabase\functions\` (o repo mobile não tem `supabase/`). Fluxo alvo:

```
AdMob ──(SSV, server-to-server)──▶ Edge Function verify_admob_ssv
                                      │ valida o payload contra a AdMob API
                                      │ (query param transaction_id, expected reward)
                                      ▼
                                   RPCcreate_ad_unlock[_anon]  -- com trusted => true
                                      (o cliente deixa de poder chamar directamente)
```

Trabalhos:

1. Edge Function com verificação do payload `rewarded` (a AdMob assina; a validação tem de ser feita contra a API da AdMob, não apenas pela forma do payload).
2. RPC nova (ou `service_role`-only) para o unlock verificado — **o caminho actual `create_ad_unlock` / `create_ad_unlock_anon` tem de deixar de aceitar chamadas do cliente** quando isto entrar, senão o SSV é apenas cosmético.
3. `EXPO_PUBLIC_ADMOB_*` reais em `.env` + `app.json` (bloqueados pelo pagamento dos **25 USD** da Google Play Developer).
4. `NEXT_STEPS.md` do repo mobile tem o quadro completo (itens 2, 3 e 4).

---

## 6. Promoção para produção (não esquecer)

`anon_ad_unlocks` / `create_ad_unlock_anon` / `credit_ad_commission` estão **só no staging** (`ndvjitfovhfngrzwtytd`). Para o build com IDs reais:

- aplicar `20261003000001_anon_ad_unlocks.sql` em **produção** (`twfkzfpcxuzbydzuykwi`) **com backup** — a migração refactoriza `trigger_ad_commission`, que está em produção desde 2026-08-13;
- a migração refactorizada só liga a trigger depois de criar a tabela nova, por isso a ordem interna do ficheiro respeitada;
- deixar cópia canónica em `atm-connect-angola\sql\pending\` (o `db:link` do repo web aponta para produção, daí a convenção — é onde está a cópia do flyer, `20260922000001_flyer_bonus.sql`).

---

## 7. Ordem de trabalho sugerida

| # | Onde | Tarefa | Bloqueia monetização? |
|---|---|---|---|
| 1 | web | `types.ts`: `anon_ad_unlocks` + `create_ad_unlock_anon` + `agent_earnings.user_id/source` nullable (à mão ou `--db-url` do staging) | não |
| 2 | web | documentar em `NEXT_STEPS.md`/README que o funil mede só registados (opção A) | não |
| 3 | mobile | `npx expo lint` + walkthrough T12 no device (build de preview) | não |
| 4 | BD | aplicar a migração em **produção** com backup | **sim** |
| 5 | web | Edge Function de SSV + RPC `service_role` + fechar o caminho do cliente | **sim** |
| 6 | mobile+web | IDs AdMob reais (25 USD) | **sim** |

---

## 8. Referências

- Spec e plano (mobile): `docs/superpowers/specs/2026-10-03-anon-atm-viewing-{design,plan}.md`
- Migração: `20261003000001_anon_ad_unlocks.sql` (raiz do repo mobile) · relatório da BD em `LOG.md` ("Relatório do Estado da BD")
- Nota do bónus do flyer (web, **já implementada**): `docs/FLYER_BONUS_WEB_CHANGES.md` · commit web `8409715`
- Verificação do flyer no staging: `atm-connect-angola\docs\VERIFICAR_FLYER_BONUS_STAGING.md`
- Riscos B14/B15: `LOG.md` §Riscos · spec §7