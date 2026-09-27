# Invista+ · Web, Mobile e IoT

Scanner fundamentalista de ações e FIIs da B3, agora integrado a um terminal financeiro ESP32: **potenciômetro de perfil de risco, botão de registro de consultas e LED de sinalização**. Web em React, aplicativo React Native/Expo, API Express e Firestore. O Mentor Gemini aparece somente após uma busca bem-sucedida, depois de todos os indicadores, e recebe o snapshot assinado da consulta.

- **Aplicação:** https://invista-chi.vercel.app
- **API interativa:** https://invista-chi.vercel.app/api/docs
- **Contrato OpenAPI:** [docs/openapi.json](docs/openapi.json)
- **Matriz acadêmica e roteiro de apresentação:** [docs/REQUISITOS-PI.md](docs/REQUISITOS-PI.md)
- **Circuito, firmware e configuração Wokwi+Blynk:** [firmware/README.md](firmware/README.md)
- **Aplicativo e instruções Expo:** [mobile/README.md](mobile/README.md)

## Como usar

1. Em **Terminal IoT**, entre na conta Firebase já usada no Invista+ e vincule o terminal com o código privado definido no servidor.
2. Configure o ESP32/Wokwi e o dispositivo Blynk conforme o guia. Leituras aparecem no histórico e alimentam os indicadores estatísticos.
3. O Switch envia o comando pelo Blynk V2. O estado mostrado vem da próxima leitura do ESP32; envio aceito não significa execução confirmada.
4. Em **Analisar ativos**, pesquise um ticker e escolha o perfil. Se o terminal estiver online, é possível aplicar o perfil selecionado pelo potenciômetro. Os favoritos são persistidos por conta.
5. Ao final dos indicadores, peça um resumo ao Gemini ou faça uma pergunta financeira. A chave fica no servidor. Até 30 solicitações/dia por conta, com intervalo mínimo de 5 segundos.

A opção **Explorar demonstração** é pública e usa 60 amostras ilustrativas identificadas. Não representa uma conexão real com hardware, não grava no banco e não aciona o LED.

## Executar a Web e a API localmente

Requer Node 24. No diretório raiz:

```sh
npm ci
cp .env.example .env
npm run build
npm start
```

No PowerShell: use `Copy-Item .env.example .env`. Preencha as variáveis privadas no arquivo. Abra http://localhost:3000. Para desenvolvimento com recarregamento, execute `npm run dev` (backend) e `npm run dev:web` (Vite) em terminais separados.

### Configuração

| Variável | Uso |
|---|---|
| FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY | Conta de serviço do mesmo projeto do login; autenticação Admin e Firestore |
| GEMINI_API_KEY, GEMINI_MODEL | Mentor Gemini; modelo padrão definido em lib/mentor.js |
| IOT_DEVICE_ID | ID único deste terminal, padrão terminal-01 |
| IOT_DEVICE_TOKEN | Segredo exclusivo para envio de telemetria |
| IOT_PAIRING_CODE | Código privado usado uma vez para associar o terminal à conta |
| BLYNK_AUTH_TOKEN | Auth Token do dispositivo Blynk |
| BLYNK_SERVER | Host regional Blynk, padrão blynk.cloud |
| IOT_STORAGE | firestore em produção; file opcional só em desenvolvimento |

Variáveis marcadas Sensitive na Vercel não são recuperáveis em texto pela listagem da API. Para execução local com Firebase Admin, forneça a conta de serviço localmente; nenhum segredo é exportado pela aplicação. Sem Admin, rotas autenticadas ficam indisponíveis. O armazenamento em arquivo é uma ferramenta de desenvolvimento, não substitui o Firestore na entrega acadêmica ou na Vercel.

`shared/firebase-config.js` contém somente os identificadores públicos Firebase. Configure login por e-mail/senha e os domínios autorizados (localhost, domínio Vercel e GitHub Pages). As regras `firestore.rules` negam acesso direto a dispositivos/telemetria; os clientes passam pela API, que verifica o dono. A conta Admin deve poder acessar o Firestore. Consultas usam índices de campo único, sem índice composto adicional.

## Dados e análise estatística

Coleções: `iotDevices/{id}` (dono, metadados, última leitura e último comando), `iotDevices/{id}/telemetry/{sessionId-sequence}` (histórico), `users/{uid}` (favoritos), `mentorUsage/{hashUid}` (cota diária). O sistema usa a chave sessão+sequência para deduplicação; conteúdo diferente com a mesma chave retorna 409.

Os gráficos mostram risco ao longo do tempo, distribuição dos perfis e dispersão/regressão. Os indicadores incluem média, moda, mediana, desvio amostral, assimetria, excesso de curtose, probabilidades empíricas e intervalo de Wilson 95%. A janela é limitada a 1.000 amostras na interface; truncamento é indicado. CSV exporta o conjunto exibido. O app calcula os indicadores localmente usando o mesmo módulo matemático da API.

Dados de interação não são previsões financeiras. Amostras temporais podem ser autocorrelacionadas; a inferência é exploratória. O scanner depende de dados de terceiros que podem atrasar ou bloquear consultas. As estimativas Graham/Bazin e as cores não são recomendações de compra/venda.

## Simulador de API

Depois de vincular o terminal e configurar `IOT_DEVICE_TOKEN`:

```sh
npm run simulate
```

Envia 30 leituras em intervalos de 10 segundos com origem `simulator`. Variáveis opcionais: `IOT_API_URL`, `SIMULATOR_SAMPLES`. Essa ferramenta testa ingestão e estatística; o requisito Wokwi+Blynk é demonstrado com o firmware e os serviços conectados.

## Testes e publicação

```sh
npm test
npm run docs:validate
npm run build
cd mobile
npm ci
npx expo install --check
npm run export
```

Firmware: `python -m platformio run -d firmware`. CI valida Web/API, mobile e firmware em jobs separados. Os testes cobrem autenticação, isolamento entre contas, validação, idempotência, persistência local, paginação com horários iguais, integração HTTP Blynk simulada, fórmulas estatísticas e o Mentor.

Na Vercel, o projeto `invista` constrói o frontend Vite e executa `api/index.js` como função Node. As variáveis ficam no projeto, nunca no bundle. Deploys devem usar o repositório Git; não envie arquivos .env ou config.h.

O GitHub Pages pode publicar `dist` pelo workflow Pages (Settings → Pages → Source: GitHub Actions) e consumir a API Vercel. Se a conta ainda usar publicação da raiz por branch, `index.html` redireciona para o endereço atualizado da aplicação. GitHub Pages não executa backend.

## Estrutura

- `web/`: dashboard React e scanner.
- `mobile/`: aplicativo Expo Android/iOS/Web.
- `firmware/`: ESP32, circuito Wokwi, bibliotecas e configuração Blynk.
- `lib/`: API, Firestore, ingestão, Gemini e análise financeira.
- `shared/`: estatística, configuração pública e amostra demonstrativa.
- `docs/`: OpenAPI, matriz de requisitos e evidências de validação.
- `legacy/index.html`: referência da interface anterior, usada por testes do controlador de Mentor; não é a página publicada.

O antigo envio de relatório por e-mail e a sincronização sem autenticação do protótipo foram descontinuados (HTTP 410). O novo botão registra consultas e o endpoint autenticado de favoritos substitui a sincronização legada.
