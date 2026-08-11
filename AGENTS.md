# Instruções para Agentes IA — ATM Connect Mobile (Expo)

## Workflow Obrigatório ao Iniciar

1. **Ler `LOG.md`** — saber estado actual, o que já foi feito, o que falta
2. **Carregar skills adequadas** (ver tabela abaixo) conforme a tarefa
3. **Executar tarefa**
4. **Actualizar `LOG.md`** com o que foi feito
5. **Fazer commit** com mensagem descritiva (conventional commit)

> **Regra do relatório da BD**: qualquer tarefa que opere ou altere a base de dados (migrações SQL, RPCs, policies, dados) deve actualizar a secção **"Relatório do Estado da BD"** no `LOG.md` (contagens, valores, estado de migrações). Consultar antes de operar a BD e actualizar depois.

## Ambiente

> **ATENÇÃO**: Este projecto usa **Supabase Staging** para desenvolvimento, NÃO produção.

| Projecto | Ref | Ambiente | URL |
|---|---|---|---|
| `dinmao` | `twfkzfpcxuzbydzuykwi` | **Produção** | `https://twfkzfpcxuzbydzuykwi.supabase.co` |
| `giovanipascoal2013@gmail.com` | `ndvjitfovhfngrzwtytd` | **Staging** | `https://ndvjitfovhfngrzwtytd.supabase.co` |

> **Regra**: O app nativo desenvolve contra staging. As credenciais staging estão no `.env`.

## Credenciais e Tokens

| Plataforma | Token / Credencial | Localização |
|---|---|---|
| **Supabase** | URL + anon key (staging) | `.env` |
| **Mapbox** | Token público | `.env` → `EXPO_PUBLIC_MAPBOX_TOKEN` |
| **AdMob** | Test IDs | `.env` → `EXPO_PUBLIC_ADMOB_*` |
| **Expo** | Token de acesso | `.env` → `EXPO_TOKEN` (nunca em código) |

## Comandos

> **REGRA OBRIGATÓRIA**: O agente NÃO deve instalar dependências (`npm install`, `npx expo install`, etc.) nem executar comandos de terminal longos/persistentes (dev server, builds, lint que instala coisas) de forma autónoma. Quando for necessário, **indicar ao utilizador o comando exacto para ele executar manualmente** no seu terminal e aguardar confirmação.

```bash
# Desenvolvimento
npx expo start              # Dev server
npx expo start --android    # Android only
npx expo start --ios        # iOS only

# TypeScript
npx tsc --noEmit            # Type check

# Build
eas build --platform android --profile preview
eas build --platform ios --profile preview

# Lint
npx expo lint
```

## Skills por Contexto

| Contexto / Tarefa | Skill a Carregar |
|---|---|
| Planear qualquer tarefa ou fase | `project-planner` |
| Fazer commits git | `git-commit` |
| Gerir GitHub Issues | `github-issues` |
| Layouts adaptáveis / responsivos | `responsive-design` |
| Melhorar performance React | `vercel-react-best-practices` |
| Ecrãs nativos / componentes Expo | `building-native-ui` |
| NativeWind / Tailwind no mobile | `expo-tailwind-setup` |
| Desenvolvimento Expo | `expo-dev-client` |
| Testes com browser (web) | `webapp-testing` |

## Arquitectura

```
apps/mobile/
  app/                    ← Expo Router (file-based routing)
    _layout.tsx           ← Root layout (providers, splash, auth redirect)
    (auth)/               ← Auth stack (login, register, reset)
    (tabs)/               ← Bottom tabs (map, forum, profile)
  src/
    components/           ← Componentes React Native
    hooks/                ← Custom hooks
    lib/                  ← Utilitários (supabase, phone, distance)
    constants/            ← Constantes (provinces, etc.)
    types/                ← Tipos TypeScript
  .env                    ← Variáveis de ambiente (staging)
  tailwind.config.js      ← Config NativeWind
  nativewind-env.d.ts     ← Tipos NativeWind
```

## Convenções

- **Styling**: NativeWind v4 (Tailwind classes no React Native)
- **Navegação**: Expo Router (file-based routing)
- **Estado**: React hooks + Context
- **Backend**: Supabase (mesmo que o web app)
- **Storage**: expo-secure-store (em vez de localStorage)
- **Brand**: Primary `#2F7BF0` (azul do logo), Verde `#4CAF6B` (dinheiro/sucesso, `colors.money`), Danger `#EF4444`, Info `#3B82F6`
