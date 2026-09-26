# Testar o Bónus do Flyer (700 Kz) no device — end-to-end

> **Projecto:** `ndvjitfovhfngrzwtytd` (**staging**) — nunca `twfkzfpcxuzbydzuykwi` (produção).
> **Documento-irmão (web):** `docs/FLYER_BONUS_WEB_CHANGES.md` (o que o painel `/dashboard/flyer-submissions` faz).
> **Verificação de BD feita pelo web:** `C:\Users\juary\Downloads\atm-connect-angola\docs\VERIFICAR_FLYER_BONUS_STAGING.md`.

---

## 0. Pré-requisitos

| # | O quê | Como |
|---|---|---|
| 1 | Migração do flyer aplicada no staging | ✅ **já aplicada** (2026-09-26). Não repetir. |
| 2 | Policy de DELETE no bucket (opcional) | `20260926000001_flyer_photos_delete_policy.sql` no SQL editor — só para a foto órfã ser apagada quando o RPC recusa. O resto do fluxo funciona sem ela. |
| 3 | `.env` do mobile | **Não existe no repo** (só `.env.example`). Ver §1. |
| 4 | Dev client com as libs nativas | `expo-media-library` + `expo-asset` são código nativo → **obrigatório rebuild**: `eas build --platform android --profile development`. |
| 5 | Painel web | `/dashboard/flyer-submissions` (admin ou supervisor). |

## 1. Criar o `.env` (uma vez)

O `.env` do web (`atm-connect-angola\.env`) **já aponta para staging**. Copiar para
`atm-connect-mobile\.env`:

```
EXPO_PUBLIC_SUPABASE_URL=https://ndvjitfovhfngrzwtytd.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<valor de VITE_SUPABASE_PUBLISHABLE_KEY em atm-connect-angola\.env>
EXPO_PUBLIC_MAPBOX_TOKEN=<valor de VITE_MAPBOX_TOKEN no mesmo ficheiro>
EXPO_PUBLIC_ADMOB_REWARDED_ANDROID=ca-app-pub-3940256099942544/5224354917
EXPO_PUBLIC_ADMOB_REWARDED_IOS=ca-app-pub-3940256099942544/1712485313
EXPO_PUBLIC_ADMOB_BANNER_ANDROID=ca-app-pub-3940256099942544/6300978111
EXPO_PUBLIC_ADMOB_BANNER_IOS=ca-app-pub-3940256099942544/2934735716
EXPO_PUBLIC_ADMOB_INTERSTITIAL_ANDROID=ca-app-pub-3940256099942544/1033173712
EXPO_PUBLIC_ADMOB_INTERSTITIAL_IOS=ca-app-pub-3940256099942544/4411468910
```

> As chaves `sb_publishable_…` são suportadas pelo `@supabase/supabase-js@2.112.2` instalado.
> `.env` está no `.gitignore` — **nunca** commitar. O `.easignore` mantém-no no build (os `EXPO_PUBLIC_*` são inlined no bundle).
> Depois de criar/alterar: `npx expo start --dev-client --clear` (as vars são inlined no bundle → limpar a cache).

## 2. Conta de teste

As 10 contas demo foram criadas com **email real** (não com o email sintético do login por telefone,
`9xxxxxxxx@dinheiroemmao.ao`) → entrar pelo **separador "Email"** do ecrã de login:

| Email | Password | ATMs aprovados (Luanda) |
|---|---|---|
| `maria.lopes@demo.agent` | `Demo@2026` | Banco Económico (Av. 4 de Fevereiro, `-8.8137/13.2309`), Banco Millennium Atlântico (Rua Major Kanhangulo) |
| `joao.mendes@demo.agent` | `Demo@2026` | Banco BFA, Banco BPC |
| `pedro.santos@demo.agent` | `Demo@2026` | Benguela (Rua do Carmo, `-12.5789/13.4078`) |

> O `onboarding_seen` e os ATMs já vêm prontos (o seed marcou tudo), por isso o login cai
> directamente no painel de agente **com o card "Ganha um bónus de 700 Kz"** visível.
> As contas demo **não têm** `agent_earnings` (o seed só ajusta `agent_balance_kz`) → `totalViews = 0` (ver §6 para forçar o crédito).

## 3. Submeter (no telemóvel)

1. **Guardar o flyer** — card do bónus → "Ver como funciona" → "Continuar" → "Guardar o flyer no telemóvel".
   Confirma na galeria do telemóvel (`flyer-generic.png`).
2. **Escolher o ATM** — passo 3 lista os ATMs aprovados do agente, ordenados por distância (GPS do momento).
3. **Foto + GPS** — passo 4: "Tirar foto do flyer no ATM". A app pede a permissão de localização
   (se não estiver concedida) e mostra `GPS capturado ✓ (lat, lng)` + a distância calculada.
4. **Submeter** — "Submeter e receber 700 Kz".

O gate de **200 m é recalculado no servidor** (o cliente mente à vontade). Para testar sem estar
fisicamente junto do ATM, alterar `flyer_proximity_m` no painel web (ex.: `5000`) e depois repor `200`.

## 4. Rever no web

`/dashboard/flyer-submissions` → separador **"Por rever"**:

- A foto aparece (bucket privado → `createSignedUrl`; se não aparecer, o `photo_url` gravado não é um
  path relativo — o app grava `${user_id}/${timestamp}.jpg`).
- Colunas uteis: `distance_m` do agente, barra `views / flyer_views_unlock`, link WhatsApp ao agente.
- Realtime: a linha aparece sem recarregar (a tabela está na publication `supabase_realtime`).

## 5. Decidir

- **Aprovar** → `status='approved'`, notificação in-app `flyer_submission_approved` ao agente.
  Sem views suficientes fica `approved` (à espera do trigger). Com views suficientes passa logo a
  `rewarded` + `balance_transactions` (`reference_type='adjustment'`) + saldo +700 + notificação
  `flyer_bonus` (**esta vai com push**).
- **Rejeitar com motivo** → `status='rejected'`, notificação `flyer_submission_rejected`, e o slot
  do agente é libertado (pode submeter de novo — o mobile mostra o motivo e o formulário).

No telemóvel o estado actualiza-se **sem reiniciar a app** (realtime + refetch ao voltar ao ecrã).

## 6. Ver o crédito sem 30 views

Duas opções (a 1.ª é a mais limpa, sem SQL):

**A — Baixar o limiar + 1 view (SQL editor, staging):**

```sql
-- 1) limiar = 1 no painel web (Settings → "Views para desbloquear o bónus do flyer" = 1)
-- 2) dar 1 view ao agente demo (o critério é count(agent_earnings)):
--    o email está em auth.users — profiles não tem coluna email.
insert into public.agent_earnings (agent_id, atm_id, amount_kz)
select u.id,
       (select a.id from public.atms a
         where a.agent_id = u.id and a.status_approval = 'approved' limit 1),
       0.15
from auth.users u
where u.email = 'maria.lopes@demo.agent';
```

Aprovar no web → `rewarded` imediato, saldo +700.

**B — Usar um agente real** que já tenha `agent_earnings` (o `LOG.md` regista `855987c4`, `55875658`, …)
e o seu email/senha de teste.

Depois de testar: **repor `flyer_views_unlock = 30`** e apagar a linha de `agent_earnings` de teste.

## 7. Casos de erro a provocar (opcional)

| Provocar | Como | Resultado esperado |
|---|---|---|
| Longe do ATM | `flyer_proximity_m = 50` e submeter longe | `Estás a X metros do ATM — o máximo permitido é 50 m.` + foto apagada do bucket (se a policy de DELETE estiver aplicada) |
| 2.º pedido com pedido activo | submeter sem esperar pela aprovação | `Já tens um pedido de bónus do flyer em curso.` |
| ATM de outro agente | escolher um ATM que não é teu (o RPC valida) | `Escolhe um ATM que te pertença.` |
| Sem permissão de localização | negar a permissão no passo 4 | Alert "Localização necessária" e a foto não é gasta |
| Sem galeria (Android) | negar a permissão de fotos | O botão deve **guardar mesmo assim** (Android 13+ não exige `READ_MEDIA_IMAGES` para escrever) |

## 8. Verificação final (SQL, staging)

```sql
select id, status, amount_kz, distance_m, review_notes, created_at
from public.flyer_submissions order by created_at desc;

select description, amount_kz, reference_type, created_at
from public.balance_transactions
where description like '%flyer%' order by created_at desc;

select type, title, created_at from public.notifications
where type in ('flyer_bonus','flyer_submission_approved','flyer_submission_rejected')
order by created_at desc;
```

> Não apagar linhas `rewarded` (são referência de pagamento em `balance_transactions.reference_id`).
> No máximo pode-se limpar a **foto** do storage depois de testado.

> ⚠️ No repo web **nunca** `supabase db push` / `supabase link` / `--linked`: o `db:link` do
> `package.json` aponta para a **produção**. Para o staging usar sempre o project-ref explícito
> (`--project-ref ndvjitfovhfngrzwtytd`) ou a Management API.
