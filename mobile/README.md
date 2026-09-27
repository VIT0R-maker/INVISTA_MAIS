# Invista+ Mobile · React Native + Expo

Aplicativo para Android/iOS com login Firebase, vínculo de terminal, consumo da API REST, atualização a cada 10 segundos enquanto está em primeiro plano, gesto de atualizar, Switch nativo para o LED, gráficos SVG e processamento estatístico no próprio dispositivo. Use a **mesma conta** da Web para acessar o terminal vinculado.

## Executar

Requer Node 24 e Expo Go compatível com SDK 57 (ou development build).

```sh
cd mobile
npm ci
cp .env.example .env
npm start
```

No PowerShell, use `Copy-Item .env.example .env` no lugar de `cp`. Leia o QR code com Expo Go. Computador e celular devem alcançar o servidor; a configuração padrão já aponta para `https://invista-chi.vercel.app`. Para backend local, use o IP LAN do computador em `EXPO_PUBLIC_API_URL`, nunca `localhost` no celular. Reinicie o Metro ao mudar `.env`.

`npm run android` abre um emulador Android configurado; `npm run ios` exige macOS/Xcode. `npm run web` permite inspecionar a mesma interface pelo navegador. A opção **Demonstração** funciona sem login e é explicitamente ilustrativa; não aciona hardware nem salva leituras.

## Validação e APK

```sh
npx expo install --check
npm run export
npx eas-cli build --platform android --profile preview
```

O último comando exige sua conta Expo e inicia um build EAS; o perfil preview produz APK. Não foi criado um APK nem publicado em lojas automaticamente. Exportar bundles verifica compilação JavaScript/Metro; não substitui o teste de toque/rede/LED em um smartphone. Os dados e o estado confirmado do LED vêm da API. O Switch não simula confirmação imediata.

Não coloque tokens Blynk, Gemini, ESP32 ou credenciais Firebase Admin em variáveis `EXPO_PUBLIC_*`. Elas são públicas no pacote do app. O cliente usa apenas os identificadores públicos Firebase e o ID token do usuário autenticado.

Referências: [Expo](https://docs.expo.dev/versions/latest/), [Firebase no Expo](https://docs.expo.dev/guides/using-firebase/).
