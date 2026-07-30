# Correcao do Expo Go

## Alteracoes efectuadas

```diff
--- package.json (antes)
+++ package.json (depois)
@@ dependencies @@
- expo-constants: ~17.0.8
+ expo-constants: ~18.0.13
  # Expo SDK 54 carrega esta versao; evita duas versoes nativas do modulo.

- expo-dev-client: ^57.0.7
+ expo-dev-client: ~6.0.21
  # Mantido compativel com SDK 54; Expo Go nao usa development client.

+ expo-linking: ~8.0.12
  # Peer dependency obrigatoria do expo-router 6.

- expo-location: ~18.0.7
+ expo-location: ~19.0.8
  # Alinha o modulo nativo de localizacao ao runtime do Expo Go SDK 54.

- expo-router: ~4.0.17
+ expo-router: ~6.0.24
  # Alinha o router ao SDK 54 e ao React Native 0.81.

- expo-secure-store: ~14.0.1
+ expo-secure-store: ~15.0.8
- expo-splash-screen: ~0.29.22
+ expo-splash-screen: ~31.0.13
- expo-status-bar: ~2.0.1
+ expo-status-bar: ~3.0.9
  # Modulos Expo actualizados para a mesma geracao do SDK.

- react: 18.3.1
+ react: 19.1.0
- react-native: 0.76.7
+ react-native: 0.81.5
+ react-dom: 19.1.0
+ react-native-web: ^0.21.0
  # Par exigido pelo Expo SDK 54 e pelo Expo Go instalado.
  # Os peers web ficam presos a mesma versao do React e evitam ERESOLVE no npm.

- react-native-gesture-handler: ~2.20.2
+ react-native-gesture-handler: ~2.28.0
- react-native-reanimated: ~3.16.1
+ react-native-reanimated: ~4.1.1
- react-native-safe-area-context: 4.12.0
+ react-native-safe-area-context: ~5.6.0
- react-native-screens: ~4.4.0
+ react-native-screens: ~4.16.0
- react-native-webview: 13.12.5
+ react-native-webview: 13.15.0
  # Evita incompatibilidade entre JavaScript do projecto e modulos nativos do Expo Go.

@@ devDependencies @@
- @types/react: ~18.3.12
+ @types/react: ~19.1.10
  # Tipos correspondentes ao React 19.
```

## Documentos afectados

- `package.json`: manifesto alinhado ao Expo SDK 54.
- `package-lock.json`: sera regenerado pela reinstalacao limpa para fixar a arvore compativel.
- `global.css`: usa as directivas esperadas pelo NativeWind 4 com Tailwind CSS 3.
- `LOG.md`: regista a correcao e as validacoes finais.
- `.nvmrc`: fixa Node `22.16.0`, ambiente em que o bundle foi validado.

```diff
++ global.css
- @import "tailwindcss";
+ @tailwind base;
+ @tailwind components;
+ @tailwind utilities;
  # O projecto usa Tailwind CSS 3. A directiva @import pertence ao setup do Tailwind 4
  # e impedia o transformador NativeWind/Metro de avancar alem do primeiro modulo.

++ .nvmrc
+ 22.16.0
  # Regista a versao exacta usada na validacao do bundle Android.

++ package.json
+ engines.node: >=20.19
  # Expo SDK 54 requer Node 20.19 ou superior; Node 22 e aceite.
```

## Como executar depois da validacao

```powershell
npm install
npx expo start --clear
```

Validado com Node `v22.16.0`. O primeiro bundle com cache vazio pode demorar alguns minutos; os seguintes reutilizam o cache do Metro.

## Validacao executada

- `npx expo install --check`: dependencias actualizadas.
- `npx expo-doctor`: 18/18 verificacoes aprovadas.
- Metro: `@expo/metro@54.2.0` com `metro@0.83.3`, sem duplicados.
- Primeiro bundle Android com cache vazio e um worker: 1.404 modulos em 165.311 ms.
- Bundle Android com configuracao padrao do Metro: 1.404 modulos em 26.081 ms.
- Artefacto Hermes: 4,36 MB.

Abra o QR code no Expo Go actualizado. Nao use `--dev-client`; esse modo e apenas para uma build de desenvolvimento instalada separadamente.
