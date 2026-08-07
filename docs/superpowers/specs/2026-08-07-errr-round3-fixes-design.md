# Design — Correções 3ª ronda `errr.txt` (Fórum + Onboarding + Foto)

> Data: 2026-08-07 · Aprovado pelo utilizador · Implementado após aprovação.

## Problemas

1. **Fórum — PGRST202**: `app` chama a RPC `create_forum_post(p_provincia, p_title, p_message, p_type)` com `p_type: 'admin'`, mas a função não existe no schema do Supabase **staging**. Mesmo que existisse, o web app restringe a criação de posts a administradores (o botão só aparece para `isAdmin`), e a RPC valida `has_role(auth.uid(), 'admin')` para `p_type = 'admin'`. O mobile mostrava "Criar post" para qualquer utilizador autenticado.
2. **Onboarding de agente**: o redirect pós-registo em `app/(auth)/register.tsx` só funcionava se `signUp` devolvesse `session`. Se a confirmação de email estiver activa no staging, `session` é `null` → o agente caía no "Conta criada! Agora pode entrar." sem onboarding nem encaminhamento. Não existia gate pós-login (o web usa `AgentOnboardingGate` + marca `onboarding_seen`).
3. **Foto do ATM corrompida no dashboard web**: upload usado `new File(photoUri)` (expo-file-system), que implementa `Blob`. O supabase-js documenta que `Blob`/`File`/`FormData` **não funcionam correctamente em React Native** e recomenda enviar `ArrayBuffer` a partir dos bytes do ficheiro. Resultado: objecto criado corrompido/vazio, foto partida na aprovação (iOS e Android).

## Soluções (App — sem novas dependências)

### 1. Fórum — só admins criam posts
- `app/(tabs)/forum.tsx`: botão "✏️ Criar post" e modal de criação apenas para `isAdmin` (de `useAuth`). Não-admins não vêem o botão (igual ao `ForumWidget` do web).
- `src/hooks/useForum.ts`: `createPost` mantém a RPC `create_forum_post` com `p_type: 'admin'`; erro devolvido em PT amigável ("Apenas administradores podem publicar mensagens") com `console.error` do erro original.
- **Backend (staging)** — SQL a correr pelo utilizador no dashboard: criar a função `public.create_forum_post` (SECURITY DEFINER, validação de admin). Script no ficheiro `docs/superpowers/specs/2026-08-07-errr-round3-fixes-design.md` (secção Backend).

### 2. Foto do ATM — upload via `ArrayBuffer`
- `app/agent/submit-atm.tsx`: no `submit`, ler os bytes do ficheiro (`file.arrayBuffer()`) e enviar como corpo do upload:
  ```ts
  const file = new File(photoUri)
  const arrayBuffer = await file.arrayBuffer()
  await supabase.storage.from('atm-photos').upload(path, arrayBuffer, { contentType: 'image/jpeg', upsert: false })
  ```
- Mantém `takePictureAsync({ quality: 0.8 })` (JPEG) e path `${user.id}/${Date.now()}.jpg`.

### 3. Onboarding de agente — gate pós-login
- `src/hooks/useAuth.ts`: expor `isOnlyAgent` (= `isAgent && !isSupervisor`).
- `src/hooks/useAgentOnboarding.ts` (novo): busca `agent_onboarding_progress` do agente; se não existir row, cria com defaults (`onboarding_seen: false`). Expõe `{ progress, loading, update, refresh }` (espelha `useAgentOnboarding` do web).
- `app/(tabs)/agent.tsx`: se `isOnlyAgent && !onboarding.onboarding_seen` → `router.replace('/agent/onboarding')`; mostra loading enquanto `onboardingLoading`.
- `app/agent/onboarding.tsx`: no mount marca `update({ onboarding_seen: true })` (ref para não repetir).
- `app/(auth)/register.tsx`: para agente sem sessão → `Alert` "Confirme o email... verá o onboarding de agente" e segue para login; com sessão mantém redirect para `/agent/onboarding`.

## Verificação
- Utilizador corre `npx tsc --noEmit` e `npx expo lint`.
- Teste em dispositivo (Expo Go): registar agente → onboarding → submeter ATM (foto legível no dashboard web); fórum admin vs não-admin.

## Ficheiros alterados
- `app/(tabs)/forum.tsx`
- `src/hooks/useForum.ts`
- `app/agent/submit-atm.tsx`
- `src/hooks/useAuth.ts`
- `src/hooks/useAgentOnboarding.ts` (novo)
- `app/(tabs)/agent.tsx`
- `app/agent/onboarding.tsx`
- `app/(auth)/register.tsx`

---

## Backend — SQL para criar no staging (`create_forum_post`)

> Depende da função `public.has_role(_user_id UUID, _role app_role)` (já existente). Correr no SQL Editor do projecto staging `ndvjitfovhfngrzwtytd`.

```sql
-- Criação da RPC de fórum (admins) no staging
CREATE OR REPLACE FUNCTION public.create_forum_post(
  p_provincia TEXT,
  p_title TEXT,
  p_message TEXT,
  p_type TEXT DEFAULT 'system',
  p_reference_type TEXT DEFAULT NULL,
  p_reference_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  IF p_type = 'admin' AND NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can create admin posts';
  END IF;

  INSERT INTO public.forum_posts (provincia, title, message, type, reference_type, reference_id, created_by)
  VALUES (p_provincia, p_title, p_message, p_type, p_reference_type, p_reference_id, auth.uid())
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;
```

> Confirmar também no staging: tabela `agent_onboarding_progress` existe e o trigger `handle_new_user()` cria a row por defeito (`onboarding_seen = false`).
