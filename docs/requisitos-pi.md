# Requisitos do PI (4º semestre DSM) e onde cada um é atendido

Tema do semestre: solução IoT com visualização de dados (dashboard) multiplataforma, web e mobile.

Legenda: ✅ implementado · ⏳ pendente

## Objetivo geral

| Requisito | Onde | Status |
| --- | --- | --- |
| Linguagens para web e mobile | API em Node.js, firmware em C++, web em React, app em React Native (Expo) | ⏳ web React e app |
| Coleta e envio de dados IoT para web e mobile | `iot/firmware`, `POST /api/dispositivos/{id}/depositos`, `GET .../estado` | ✅ API · ⏳ telas |
| Front-end para visualizar os dados | Dashboards web e mobile | ⏳ |
| Back-end para receber e processar os dados | `lib/cofrinho.js`, `lib/estatistica.js` | ✅ |
| Integração com banco de dados | Firestore: `dispositivos`, `depositos`, `eventos`, `users` | ✅ |
| Controle de versão | GitHub, commits de todos os integrantes | ⏳ repositório na org FatecFranca |

## Laboratório de Desenvolvimento Web (disciplina-chave)

| Requisito | Onde | Status |
| --- | --- | --- |
| API RESTful | Recursos, verbos e códigos HTTP em `lib/cofrinho.js` e `lib/favoritos.js` | ✅ |
| Documentação OpenAPI | `docs/openapi.yaml` e `/api/docs` | ✅ |
| API integrada ao banco (persistência e consulta) | CRUD de dispositivos e favoritos; consultas por período | ✅ |
| Front-end em React integrado à API | `web/` | ⏳ |

## Internet das Coisas e Aplicações

| Requisito | Onde | Status |
| --- | --- | --- |
| Sensores analógicos | LDR (GPIO 34) e potenciômetro (GPIO 35) | ✅ |
| Sensores digitais | Botão (GPIO 4) e chave da tampa (GPIO 27) | ✅ |
| Acionamento de atuadores | Servo, LED RGB e buzzer via Blynk (V5 a V8) e `PATCH .../atuadores` | ✅ |
| Persistência e protocolos de comunicação | Blynk (TLS), HTTPS/REST, I2C (OLED), Firestore | ✅ |
| Dashboard para consolidação dos dados | Web Dashboard do Blynk (`iot/README.md`) | ⏳ montar no console |

## Estatística

| Requisito | Onde | Status |
| --- | --- | --- |
| Média, moda, mediana, desvio padrão | `lib/estatistica.js` → `GET .../estatisticas` | ✅ |
| Assimetria e curtose | Pearson 1 e 2, Fisher, Bowley; curtose percentílica e por momentos | ✅ |
| Probabilidades | Depósito por dia da semana; chance de atingir a meta (normal) | ✅ |
| Regressão | Tendência do saldo e calibração peso × saldo | ✅ |
| Inferência | IC 95% da média e teste t de Welch | ✅ |
| Gráficos e interpretação dos dados do projeto | Notebook com dados reais + simulados | ⏳ |

## Programação para Dispositivos Móveis I

| Requisito | Onde | Status |
| --- | --- | --- |
| Consumir a API com dados dos sensores | App React Native usando `/estado`, `/depositos`, `/estatisticas` | ⏳ |
| Widgets para mudar o estado dos atuadores | Switch (trava), seletor de cor, slider (brilho), botão (buzzer) → `PATCH .../atuadores` | ⏳ |
| Processamento dos dados recebidos | Média móvel, projeção da meta, saldo convertido em cotas | ⏳ |
| Apresentação gráfica | Gráficos de saldo, depósitos por dia e simulação | ⏳ |

## Problema social

| Item | Onde | Status |
| --- | --- | --- |
| Problema ligado à sociedade (educação financeira de crianças e famílias, ODS 4 e 8) | README, seção "Problema e impacto social" | ✅ |
| Benefício para pessoas reais | Piloto com famílias voluntárias | ⏳ |

## Entrega

| Item | Status |
| --- | --- |
| Repositório na organização github.com/FatecFranca, com commits de todos | ⏳ |
| Vídeo de até 5 min no YouTube, público, com fala de todos | ⏳ |
| Link do vídeo e documentos no README | ⏳ |
| Entrega pelo formulário até 1 mês antes do fim das aulas | ⏳ |
