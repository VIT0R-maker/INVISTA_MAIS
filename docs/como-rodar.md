# Como rodar o Invista+

## O que tem em cada pasta

| Pasta | O que é | Tecnologia |
| --- | --- | --- |
| raiz (`server.js`, `lib/`) | API REST, usada pelo site, pelo app e pelo ESP32 | Node.js + Express |
| `web/` | Site (dashboard, estatísticas, simulação, scanner) | React + Vite |
| `mobile/` | App do celular | React Native + Expo |
| `iot/` | Firmware do ESP32, circuito do Wokwi e guia do Blynk | C++ (Arduino) |
| `docs/` | OpenAPI, notebook de estatística, requisitos e este guia | |
| `index.html`, `login.html`, `cadastro.html` | Versão antiga do scanner (continua funcionando) | HTML + JS |

## Programas necessários

| Programa | Para quê |
| --- | --- |
| [Node.js 24](https://nodejs.org) | API, site e app |
| [Git](https://git-scm.com) e [VS Code](https://code.visualstudio.com) | Baixar e editar o projeto |
| [Java 21 ou mais novo](https://adoptium.net) | Só para os emuladores do Firebase |
| [Python 3](https://www.python.org) | Só para o notebook de estatística |
| App **Expo Go** no celular (Play Store ou App Store) | Rodar o app mobile |

## 1. Baixar e instalar

```sh
git clone https://github.com/magreisz/INVISTA_MAIS.git
cd INVISTA_MAIS
npm run instalar-tudo
```

Abra a pasta no VS Code (`code .`). Use o terminal integrado (Ctrl + ') e abra um terminal novo para cada comando que fica rodando.

## 2. Rodar tudo no computador, sem senhas (modo emulador)

É o jeito mais simples de desenvolver e de gravar a demonstração. Os emuladores do Firebase fazem o papel do login e do banco na sua máquina.

**Terminal 1: emuladores**

```sh
npm run emuladores
```

O painel dos emuladores abre em <http://127.0.0.1:4000>. Lá dá para ver usuários e documentos do banco.

**Terminal 2: API**

Copie `.env.emulador.example` para `.env` (no Windows: `copy .env.emulador.example .env`) e rode:

```sh
npm start
```

A API responde em <http://localhost:3000>. A documentação interativa fica em <http://localhost:3000/api/docs>.

**Terminal 3: site**

Crie o arquivo `web/.env` com a linha `VITE_FIREBASE_EMULADOR=true` e rode:

```sh
npm run web
```

Abra <http://localhost:5173>, crie uma conta e cadastre um cofrinho. Para ter dados na estatística, gere depósitos simulados com o ID mostrado no cadastro:

```sh
npm run simular -- ID_DO_COFRINHO 60
```

Os dados dos emuladores somem quando eles são fechados. Para guardar entre uma execução e outra, acrescente `--import=./dados-emulador --export-on-exit` ao comando `emuladores` no `package.json`.

## 3. App no celular

1. Descubra o IP do computador na rede Wi-Fi (no Windows: `ipconfig`, linha "Endereço IPv4").
2. Crie `mobile/.env` com o IP no lugar de `192.168.0.10`:

```sh
EXPO_PUBLIC_API_URL=http://192.168.0.10:3000
EXPO_PUBLIC_FIREBASE_EMULADOR=192.168.0.10:9099
```

3. Com os emuladores e a API rodando, execute `npm run mobile` e leia o QR code com o Expo Go. O celular precisa estar no mesmo Wi-Fi. Se o Windows perguntar sobre o firewall, permita o acesso.

Para usar o app com o servidor publicado, deixe só `EXPO_PUBLIC_API_URL=https://invistaai-ochre.vercel.app` e remova a linha do emulador.

Sem celular, `npm --prefix mobile run web` abre o app no navegador.

## 4. Rodar com o Firebase de verdade

1. No console do Firebase do projeto, vá em **Configurações do projeto → Contas de serviço → Gerar nova chave privada**.
2. Copie `.env.example` para `.env` e preencha `FIREBASE_CLIENT_EMAIL` e `FIREBASE_PRIVATE_KEY` com os dados do arquivo baixado.
3. Opcional: `GEMINI_API_KEY` (Mentor IA), `EMAIL_USER` e `EMAIL_PASS` (relatório por e-mail) e `BLYNK_SERVER`.
4. Rode `npm start` e `npm run web` (sem o `web/.env` do emulador).

Nunca faça commit do `.env` nem do arquivo da chave privada.

## 5. Cofrinho (ESP32, Wokwi e Blynk)

O passo a passo completo está em [`iot/README.md`](../iot/README.md). Em resumo:

1. No Blynk, crie o template com os datastreams V0 a V9 e o dashboard.
2. Crie o dispositivo no Blynk e copie o token.
3. No site, cadastre o cofrinho com esse token e anote o ID e a chave.
4. Preencha `iot/firmware/cofrinho/secrets.h` e rode no Wokwi ou grave no ESP32.

## 6. Estatística (notebook)

```sh
python -m venv .venv
.venv\Scripts\activate
pip install pandas scipy matplotlib notebook
jupyter notebook docs/estatistica/analise_cofrinho.ipynb
```

No macOS ou Linux, ative o ambiente com `source .venv/bin/activate`.

Para analisar dados reais, use o botão **Baixar CSV** na tela de estatísticas do site, salve como `docs/estatistica/depositos.csv` e execute o notebook de novo (menu Run → Run All Cells).

## 7. Testes

```sh
npm test
npm --prefix web run build
```

`npm test` roda os testes da API, da estatística e do processamento do app.

## 8. Publicar

| Parte | Onde | Como |
| --- | --- | --- |
| API | Vercel (projeto atual) | Deploy da raiz do repositório com as variáveis do `.env.example` |
| Site | Vercel (novo projeto) | Root Directory `web`, variável `VITE_API_URL` com a URL da API; depois inclua a URL do site em `CORS_ORIGINS` na API |
| Regras do banco | Firebase | Publicar `firestore.rules` no console |
| App | Expo Go | Para a apresentação basta o Expo Go; para gerar APK: `npx eas build -p android --profile preview` (precisa de conta Expo) |
